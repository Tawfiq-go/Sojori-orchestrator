import type {
  ListingChannelConnection,
  ListingFormData,
  ListingRecord,
  ListingStatus,
  ListingType,
} from '../data/catalogueMock';
import { createEmptyListing } from '../data/catalogueMock';
import type { ListingChannelsSnapshot } from '../types/listings.types';
import { amenityNameToDisplay } from './amenityDisplayName';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function pickFirstString(source: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = asString(source[key]).trim();
    if (value) return value;
  }
  return '';
}

function firstLocalized(desc: unknown, field: keyof UnknownRecord): string {
  if (!Array.isArray(desc) || desc.length === 0) return '';
  const first = asRecord(desc[0]);
  const v = first[field];
  return typeof v === 'string' ? v : '';
}

function deriveStatus(raw: UnknownRecord): ListingStatus {
  if (raw.staging === true || raw.draft === true) return 'draft';
  if (raw.active === false) return 'inactive';
  return 'active';
}

const LISTING_TYPES: ListingType[] = ['Villa', 'Riad', 'Apartment', 'Loft', 'House', 'Studio'];

function coerceListingType(value: unknown): ListingType {
  const v = asString(value).trim();
  if (LISTING_TYPES.includes(v as ListingType)) return v as ListingType;
  const lower = v.toLowerCase();
  const found = LISTING_TYPES.find((t) => t.toLowerCase() === lower);
  return found || 'Apartment';
}

function formatHourPair(start: unknown, end: unknown): string {
  const s = asNumber(start);
  const e = asNumber(end);
  if (s === null && e === null) return '';
  return `${s ?? '?'}h → ${e ?? '?'}h`;
}

function imageUrlFromListingImage(img: unknown): string {
  const r = asRecord(img);
  return (
    pickFirstString(r, ['urlOptimized', 'url', 'urlThumbnail', 'urlOriginal']) ||
    asString(r.src).trim()
  );
}

function collectGalleryUrls(raw: UnknownRecord): string[] {
  const images = raw.listingImages;
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => imageUrlFromListingImage(img))
    .filter((url) => url.startsWith('http') || url.startsWith('//'));
}

function mapOtaChannels(raw: UnknownRecord): ListingChannelConnection[] {
  const snap = asRecord(raw.otaChannelsSnapshot);
  const channels = Array.isArray(snap.channels) ? snap.channels : [];
  const updated = snap.updatedAt ? asString(snap.updatedAt) : '';

  const toStatus = (status: string): ListingChannelConnection['status'] => {
    const s = status.toLowerCase();
    if (s.includes('error') || s.includes('fail') || s.includes('offline')) return 'disconnected';
    if (s.includes('pend') || s.includes('wait') || s.includes('sync')) return 'pending';
    return 'synced';
  };

  return channels.map((item, index) => {
    const c = asRecord(item);
    const name = pickFirstString(c, ['channelName', 'name']) || `Canal ${index + 1}`;
    const status = toStatus(pickFirstString(c, ['status', 'contentStatus', 'ariStatus']) || 'synced');
    const lastSync = updated ? new Date(updated).toLocaleString('fr-FR') : '—';
    return {
      id: pickFirstString(c, ['channelId', '_id']) || `ota-${index}`,
      name,
      status,
      lastSync,
    };
  });
}

function mapDistributionSync(raw: UnknownRecord): { mode: string; notes: string } {
  const dist = asRecord(raw.distribution);
  return {
    mode: pickFirstString(dist, ['syncMode']) || 'manual',
    notes: pickFirstString(dist, ['notes']) || pickFirstString(asRecord(raw.distribution), ['notes']),
  };
}

function firstRoomType(raw: UnknownRecord): UnknownRecord {
  const rts = raw.roomTypes;
  if (!Array.isArray(rts) || rts.length === 0) return {};
  return asRecord(rts[0]);
}

function additionalFeeByCategory(raw: UnknownRecord, needle: string): number | null {
  const fees = raw.additionalFees;
  if (!Array.isArray(fees)) return null;
  const lower = needle.toLowerCase();
  for (const fee of fees) {
    const f = asRecord(fee);
    const cat = asString(f.category).toLowerCase();
    if (cat.includes(lower)) {
      const n = asNumber(f.value);
      if (n !== null) return n;
    }
  }
  return null;
}

function taskAuto(raw: UnknownRecord, fragment: string): boolean {
  const tasks = raw.tasks;
  if (!Array.isArray(tasks)) return false;
  const frag = fragment.toLowerCase();
  return tasks.some((t) => {
    const tr = asRecord(t);
    const name = asString(tr.taskName).toLowerCase();
    const auto = tr.taskCreatedAutomatically === true;
    return auto && name.includes(frag);
  });
}

function accessSummary(raw: UnknownRecord): { type: string; keypad: string; lockbox: string; parking: string; notes: string } {
  const details = raw.accessDetails;
  if (!Array.isArray(details) || details.length === 0) {
    return { type: '', keypad: '', lockbox: '', parking: '', notes: '' };
  }
  const d0 = asRecord(details[0]);
  const acc = d0.access;
  let keypad = '';
  let lockbox = '';
  const texts: string[] = [];
  if (Array.isArray(acc)) {
    for (const entry of acc) {
      const e = asRecord(entry);
      const typ = asString(e.type).toLowerCase();
      if ('code' in e && asString(e.code)) {
        if (typ.includes('lock') || typ.includes('box')) lockbox = asString(e.code);
        else keypad = asString(e.code);
      }
      if ('txt' in e) {
        const txt = e.txt;
        if (Array.isArray(txt)) texts.push(...txt.map((x) => asString(x)));
        else texts.push(asString(txt));
      }
    }
  }
  return {
    type: asString(d0.type) || asString(d0.name) || 'Meet and greet',
    keypad,
    lockbox,
    parking: texts.join('\n'),
    notes: texts.join('\n'),
  };
}

export interface ClientServicesPayload {
  transport?: unknown[];
  grocery?: unknown[];
  custom?: unknown[];
  support?: unknown[];
  hasConciergeServices?: boolean;
  hasSupportCategories?: boolean;
}

/**
 * Construit un `ListingRecord` (formulaire orchestrateur) à partir du document listing srv-listing
 * (`GET /listings/by-id/:id`) + optionnellement snapshot canaux + client-services.
 */
export function mapApiListingToListingRecord(
  rawListing: UnknownRecord,
  channelsSnapshot?: ListingChannelsSnapshot | null,
  clientServices?: ClientServicesPayload | null,
): ListingRecord {
  const shell = createEmptyListing();
  const id = pickFirstString(rawListing, ['_id', 'id']) || shell.id;
  const rt = firstRoomType(rawListing);
  const descBlock = rawListing.description;
  const longDesc =
    firstLocalized(descBlock, 'value') ||
    pickFirstString(rawListing, ['description']) ||
    firstLocalized(descBlock, 'notes');
  const shortDesc = firstLocalized(descBlock, 'headline') || pickFirstString(rawListing, ['name']);

  const owner = asRecord(rawListing.owner);
  const ownerName =
    [asString(owner.firstName).trim(), asString(owner.lastName).trim()].filter(Boolean).join(' ') ||
    pickFirstString(rawListing, ['ownerName']) ||
    shell.ownerName;
  const ownerId = pickFirstString(rawListing, ['ownerId']) || asString(owner._id) || shell.ownerId;

  const galleryUrls = collectGalleryUrls(rawListing);
  const dist = mapDistributionSync(rawListing);
  const access = accessSummary(rawListing);
  const lic = asRecord(rawListing.licenceInfo);
  const deposit = asRecord(rawListing.deposit);
  const secDep = asRecord(rawListing.securityDeposit);

  const basePrice =
    asNumber(rt.basePrice) ??
    asNumber(rt.minimumPrice) ??
    asNumber(rawListing.basePrice) ??
    shell.form.pricing.basePrice;
  const cleaningFee =
    additionalFeeByCategory(rawListing, 'clean') ??
    asNumber(rawListing.extra) ??
    shell.form.pricing.cleaningFee;

  const channexId = pickFirstString(rawListing, ['channexListingId']);
  const channelManager = pickFirstString(rawListing, ['channelManager']) || (channexId ? 'channex' : 'direct');

  let channels: ListingChannelConnection[] = mapOtaChannels(rawListing);
  if (channels.length === 0 && channelsSnapshot?.roomTypes?.length) {
    channels = channelsSnapshot.roomTypes.map((rtRow, i) => ({
      id: rtRow.id || `rt-${i}`,
      name: rtRow.name,
      status: rtRow.ratePlans.length ? 'synced' : 'pending',
      lastSync: channelsSnapshot.channexListingId ? 'Channex' : '—',
    }));
  }

  const form: ListingFormData = {
    ...shell.form,
    basic: {
      ...shell.form.basic,
      name: pickFirstString(rawListing, ['name']) || shell.form.basic.name,
      type: coerceListingType(rawListing.propertyType || rawListing.propertyTypeId),
      bedrooms: asNumber(rt.bedroomsNumber) ?? shell.form.basic.bedrooms,
      bathrooms: asNumber(rt.bathroomsNumber) ?? shell.form.basic.bathrooms,
      guests: asNumber(rt.personCapacityMax || rawListing.personCapacityMax) ?? shell.form.basic.guests,
      surface: asNumber(rt.surface) ?? asNumber(rawListing.surface) ?? shell.form.basic.surface,
      beds: asNumber(rt.bedsNumber) ?? shell.form.basic.beds,
      shortDescription: shortDesc || shell.form.basic.shortDescription,
      longDescription: longDesc || shell.form.basic.longDescription,
      ownerId,
      ownerName,
      status: deriveStatus(rawListing),
    },
    address: {
      ...shell.form.address,
      street: pickFirstString(rawListing, ['address']) || shell.form.address.street,
      postalCode: pickFirstString(rawListing, ['zipcode', 'postalCode']) || shell.form.address.postalCode,
      city: pickFirstString(rawListing, ['city']) || shell.form.address.city,
      region: pickFirstString(rawListing, ['state', 'region']) || shell.form.address.region,
      country: pickFirstString(rawListing, ['country']) || shell.form.address.country,
      countryCode: pickFirstString(rawListing, ['countryCode']) || shell.form.address.countryCode,
      latitude: String(asNumber(rawListing.lat) ?? shell.form.address.latitude),
      longitude: String(asNumber(rawListing.lng) ?? shell.form.address.longitude),
      accessLandmark:
        firstLocalized(rawListing.howToArrive, 'value') ||
        pickFirstString(rawListing, ['place']) ||
        shell.form.address.accessLandmark,
    },
    media: {
      ...shell.form.media,
      coverPhoto: galleryUrls[0] || shell.form.media.coverPhoto,
      galleryCount: galleryUrls.length || (Array.isArray(rawListing.listingImages) ? rawListing.listingImages.length : 1),
      photoNotes:
        (Array.isArray(rawListing.listingImages)
          ? rawListing.listingImages
              .map((img) => asString(asRecord(img).caption || asRecord(img).bookingEngineCaption))
              .filter(Boolean)
              .join(' · ')
          : '') || shell.form.media.photoNotes,
    },
    equipment: {
      ...shell.form.equipment,
      highlights: (() => {
        const refs = rawListing.listingAmenitiesIds;
        if (!Array.isArray(refs)) return shell.form.equipment.highlights;
        const names = refs
          .map((ref) => {
            const r = asRecord(ref);
            const data = asRecord(r.amenityData);
            const fromData = amenityNameToDisplay(data.name);
            if (fromData) return fromData;
            return pickFirstString(data, ['name']);
          })
          .filter(Boolean);
        return names.length ? names : shell.form.equipment.highlights;
      })(),
    },
    pricing: {
      ...shell.form.pricing,
      basePrice,
      cleaningFee,
      weekendMultiplier: shell.form.pricing.weekendMultiplier,
      minStay: asNumber(rawListing.minNights) ?? shell.form.pricing.minStay,
      currency: pickFirstString(rawListing, ['currencyCode', 'currency']) || shell.form.pricing.currency,
      cityTax: rawListing.cityTaxEnabled
        ? asNumber(rawListing.cityTaxPerAdultPerNight) ?? shell.form.pricing.cityTax
        : shell.form.pricing.cityTax,
      petFee: additionalFeeByCategory(rawListing, 'pet') ?? shell.form.pricing.petFee,
    },
    extras: {
      ...shell.form.extras,
      notes: pickFirstString(asRecord(rawListing.distribution), ['notes']) || shell.form.extras.notes,
    },
    channels: {
      ...shell.form.channels,
      preferredChannel: channelManager || shell.form.channels.preferredChannel,
      syncMode: dist.mode === 'full' ? '2-way' : dist.mode === 'partial' ? '1-way' : 'manual',
      allowInstantBook: rawListing.onlineCheckIn === true || shell.form.channels.allowInstantBook,
      channelNotes: dist.notes || shell.form.channels.channelNotes,
    },
    availability: {
      ...shell.form.availability,
      maxNights: asNumber(rawListing.maxNights) ?? shell.form.availability.maxNights,
      preparationHoursBeforeArrival:
        asNumber(rawListing.preparationTimeBeforeArrivalInHours) ??
        shell.form.availability.preparationHoursBeforeArrival,
    },
    orchestration: {
      ...shell.form.orchestration,
      registration: rawListing.orchestration_registration === true,
      chooseArrival: rawListing.orchestration_choose_arrival === true,
      chooseDeparture: rawListing.orchestration_choose_departure === true,
      declareArrival: rawListing.orchestration_declare_arrival === true,
      declareDeparture: rawListing.orchestration_declare_departure === true,
      transport: rawListing.orchestration_transport === true,
      grocery: rawListing.orchestration_grocery === true,
      custom: rawListing.orchestration_custom === true,
      support: rawListing.orchestration_support === true,
      cleaningFree: rawListing.orchestration_cleaning_free === true,
      cleaningPaid: rawListing.orchestration_cleaning_paid === true,
    },
    licenses: {
      tourismLicense: pickFirstString(lic, ['licenceNumber']) || shell.form.licenses.tourismLicense,
      vatNumber: lic.isVATRegistered ? 'Oui (TVA)' : shell.form.licenses.vatNumber,
      insurancePolicy: shell.form.licenses.insurancePolicy,
      expiresAt: lic.expirationDate
        ? new Date(asString(lic.expirationDate)).toISOString().slice(0, 10)
        : shell.form.licenses.expiresAt,
      licensingNotes: JSON.stringify(
        {
          isExempt: lic.isExempt,
          licenceType: lic.licenceType,
          businessTax: asRecord(lic.businessTaxLicenceInfo),
          tot: asRecord(lic.totRegistrationLicenceInfo),
        },
        null,
        2,
      ),
    },
    automsg: {
      ...shell.form.automsg,
      bookingConfirmation: Array.isArray(rawListing.messageCheckin)
        ? rawListing.messageCheckin.map((x) => asString(x)).join('\n')
        : shell.form.automsg.bookingConfirmation,
      preArrivalReminder: shell.form.automsg.preArrivalReminder,
      stayCheckIn: Array.isArray(rawListing.messageCheckin)
        ? rawListing.messageCheckin.join('\n')
        : shell.form.automsg.stayCheckIn,
      preDeparture: Array.isArray(rawListing.messageCheckout)
        ? rawListing.messageCheckout.join('\n')
        : shell.form.automsg.preDeparture,
    },
    whatsapp: {
      ...shell.form.whatsapp,
      menuTitle: 'Menu WhatsApp (services)',
      welcomeTemplate: Array.isArray(rawListing.whatsappServiceSettings)
        ? rawListing.whatsappServiceSettings
            .map((s) => asString(asRecord(s).serviceName))
            .filter(Boolean)
            .join(', ') || shell.form.whatsapp.welcomeTemplate
        : shell.form.whatsapp.welcomeTemplate,
      quickReplies: Array.isArray(rawListing.whatsappServiceSettings)
        ? rawListing.whatsappServiceSettings.map((s) => asString(asRecord(s).serviceName)).filter(Boolean)
        : shell.form.whatsapp.quickReplies,
    },
    concierge: {
      ...shell.form.concierge,
      enabled: Boolean(
        rawListing.orchestration_transport ||
          rawListing.orchestration_grocery ||
          rawListing.orchestration_custom,
      ),
      airportTransfer: rawListing.orchestration_transport === true,
      groceryDelivery: rawListing.orchestration_grocery === true,
      chefService: false,
      localGuide: rawListing.orchestration_custom === true,
      conciergeNotes: clientServices?.hasConciergeServices
        ? `Services actifs (API): transport ${clientServices.transport?.length ?? 0}, courses ${clientServices.grocery?.length ?? 0}, perso ${clientServices.custom?.length ?? 0}.`
        : shell.form.concierge.conciergeNotes,
    },
    services: {
      ...shell.form.services,
      serviceNotes: Array.isArray(rawListing.services)
        ? rawListing.services.map((s) => (typeof s === 'string' ? s : JSON.stringify(s))).join('\n')
        : shell.form.services.serviceNotes,
    },
    support: {
      ...shell.form.support,
      phone: pickFirstString(rawListing, ['arrivalPhone']) || shell.form.support.phone,
      email: pickFirstString(rawListing, ['arrivalEmail']) || shell.form.support.email,
      hours: pickFirstString(rawListing, ['timeZoneName']) || shell.form.support.hours,
      emergencyProtocol: rawListing.orchestration_support
        ? 'Orchestration support activée (WhatsApp).'
        : shell.form.support.emergencyProtocol,
      supportNotes: clientServices?.hasSupportCategories
        ? `Catégories support (API): ${(clientServices.support ?? []).length}.`
        : shell.form.support.supportNotes,
    },
    cleaning: {
      ...shell.form.cleaning,
      standardChecklist: rawListing.paidCleaningConfig
        ? JSON.stringify(rawListing.paidCleaningConfig, null, 2)
        : shell.form.cleaning.standardChecklist,
      linenChange: Array.isArray(rawListing.frequency)
        ? rawListing.frequency.map((f) => JSON.stringify(f)).join('\n')
        : shell.form.cleaning.linenChange,
    },
    autotasks: {
      ...shell.form.autotasks,
      createCleaningTask: taskAuto(rawListing, 'clean'),
      createMaintenanceTask: taskAuto(rawListing, 'maint'),
      createWelcomePackTask: taskAuto(rawListing, 'welcome'),
      assignDefaultTeam: taskAuto(rawListing, 'assign'),
    },
    roomtypes: {
      ...shell.form.roomtypes,
      multiRoomEnabled: asString(rawListing.propertyUnit).toLowerCase() === 'multi',
      defaultRoomType: pickFirstString(rt, ['roomTypeName', 'name']) || shell.form.roomtypes.defaultRoomType,
      roomInventory: Array.isArray(rawListing.roomTypes)
        ? `Room types: ${rawListing.roomTypes.length}`
        : shell.form.roomtypes.roomInventory,
    },
    deposit: {
      ...shell.form.deposit,
      enabled: asNumber(deposit.value) != null && (asNumber(deposit.value) ?? 0) > 0,
      amount: asNumber(deposit.value) ?? asNumber(secDep.value) ?? shell.form.deposit.amount,
    },
    rules: {
      ...shell.form.rules,
    },
    houserules: {
      ...shell.form.houserules,
      checkInWindow: formatHourPair(rawListing.checkInTimeStart, rawListing.checkInTimeEnd),
      checkOutWindow:
        rawListing.checkOutTime != null
          ? `Avant ${asNumber(rawListing.checkOutTime) ?? '?'}h`
          : shell.form.houserules.checkOutWindow,
      houseRulesText: firstLocalized(descBlock, 'houseRules') || shell.form.houserules.houseRulesText,
    },
    access: {
      ...shell.form.access,
      accessType: access.type || shell.form.access.accessType,
      keypadCode: access.keypad || shell.form.access.keypadCode,
      lockboxCode: access.lockbox || shell.form.access.lockboxCode,
      parkingInstructions: access.parking || shell.form.access.parkingInstructions,
    },
    wifi: {
      ...shell.form.wifi,
      ssid: pickFirstString(rawListing, ['wifiUsername']) || shell.form.wifi.ssid,
      password: pickFirstString(rawListing, ['wifiPassword']) || shell.form.wifi.password,
    },
    iot: { ...shell.form.iot },
  };

  const updatedAt =
    pickFirstString(rawListing, ['updatedAt', 'createdAt']) || new Date().toISOString();

  return {
    ...shell,
    id,
    name: form.basic.name,
    city: form.address.city,
    country: form.address.country,
    countryCode: form.address.countryCode,
    ownerId,
    ownerName,
    type: form.basic.type,
    status: form.basic.status,
    channels,
    form,
    updatedAt,
    adr: basePrice,
    galleryImageUrls: galleryUrls.length ? galleryUrls : undefined,
    rawApiDocument: rawListing as Record<string, unknown>,
  };
}
