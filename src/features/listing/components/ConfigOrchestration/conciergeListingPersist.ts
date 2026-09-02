import { listingsService } from '../../../../services/listingsService';

export type RoomServiceBreakfastTimeMode = 'shared' | 'per_traveler';

/** Toutes les formules sont inclus. with_supplement = flag ; facturation plus tard. */
export type RoomServiceBreakfastSupplementMode = 'none' | 'with_supplement';

export type RoomServiceBreakfastConfig = {
  enabled: boolean;
  entitlement: 'per_traveler' | 'per_reservation';
  start: 'arrival' | 'j_plus_1';
  endInclusive: boolean;
  includedServiceIds: string[];
  defaultTime?: string;
  timeWindow?: { from: string; to: string };
  timeMode?: RoomServiceBreakfastTimeMode;
  guestMustSelectDays: boolean;
  supplementMode: RoomServiceBreakfastSupplementMode;
};

export type ConciergeServicesSlice = {
  transportServices?: unknown[];
  groceryServices?: unknown[];
  customServices?: unknown[];
  conciergeSource?: 'own' | 'partner';
  /** Toujours null côté owner — Sojori résout par ville. */
  conciergePartnerId?: string | null;
  /** Ids PartnerService cochés sur le listing (absent / [] = aucune expérience guest). */
  enabledExperienceIds?: string[];
  roomServiceBreakfast?: RoomServiceBreakfastConfig | null;
};

export type ConciergeServicesArrays = {
  transportServices: unknown[];
  groceryServices: unknown[];
  customServices: unknown[];
  conciergeSource?: 'own' | 'partner';
  conciergePartnerId?: string | null;
  enabledExperienceIds?: string[] | null;
  roomServiceBreakfast?: RoomServiceBreakfastConfig | null;
};

function normalizeBreakfast(raw: unknown): RoomServiceBreakfastConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  return {
    enabled: Boolean(b.enabled),
    entitlement: b.entitlement === 'per_reservation' ? 'per_reservation' : 'per_traveler',
    start: b.start === 'arrival' ? 'arrival' : 'j_plus_1',
    endInclusive: Boolean(b.endInclusive),
    includedServiceIds: (Array.isArray(b.includedServiceIds) ? b.includedServiceIds : [])
      .map(String)
      .filter(Boolean),
    defaultTime:
      typeof b.defaultTime === 'string' && b.defaultTime.trim()
        ? b.defaultTime.trim().slice(0, 8)
        : '09:00',
    timeWindow: (() => {
      const tw = b.timeWindow as { from?: string; to?: string } | undefined;
      const from =
        typeof tw?.from === 'string' && tw.from.trim() ? tw.from.trim().slice(0, 8) : '07:00';
      const to = typeof tw?.to === 'string' && tw.to.trim() ? tw.to.trim().slice(0, 8) : '11:00';
      return { from, to };
    })(),
    timeMode: b.timeMode === 'per_traveler' ? 'per_traveler' : 'shared',
    guestMustSelectDays: b.guestMustSelectDays !== false,
    supplementMode: b.supplementMode === 'with_supplement' ? 'with_supplement' : 'none',
  };
}

/** Read current listing_concierge_services (source of truth for WhatsApp snapshot). */
export async function fetchListingConciergeArrays(
  listingId: string,
): Promise<ConciergeServicesArrays> {
  const res = await listingsService.getListingConciergeConfig(listingId);
  const doc = (res.data || {}) as ConciergeServicesSlice & {
    enabledExperienceIds?: unknown;
    roomServiceBreakfast?: unknown;
  };
  const enabledRaw = doc.enabledExperienceIds;
  const enabledExperienceIds =
    enabledRaw === undefined || enabledRaw === null
      ? []
      : (Array.isArray(enabledRaw) ? enabledRaw : []).map(String).filter(Boolean);
  return {
    transportServices: Array.isArray(doc.transportServices) ? doc.transportServices : [],
    groceryServices: Array.isArray(doc.groceryServices) ? doc.groceryServices : [],
    customServices: Array.isArray(doc.customServices) ? doc.customServices : [],
    conciergeSource: doc.conciergeSource === 'partner' ? 'partner' : 'own',
    conciergePartnerId: doc.conciergePartnerId ?? null,
    enabledExperienceIds,
    roomServiceBreakfast: normalizeBreakfast(doc.roomServiceBreakfast),
  };
}

/**
 * PUT concierge-config merging with existing arrays so one tab cannot wipe another.
 * Only keys present in `slice` are updated; others are kept from Mongo.
 */
export async function persistListingConciergeSlice(
  listingId: string,
  slice: ConciergeServicesSlice,
): Promise<ConciergeServicesArrays> {
  const existing = await fetchListingConciergeArrays(listingId);
  const body: ConciergeServicesSlice = {
    transportServices:
      slice.transportServices !== undefined ? slice.transportServices : existing.transportServices,
    groceryServices:
      slice.groceryServices !== undefined ? slice.groceryServices : existing.groceryServices,
    customServices:
      slice.customServices !== undefined ? slice.customServices : existing.customServices,
  };
  if (slice.conciergeSource !== undefined) {
    body.conciergeSource = slice.conciergeSource;
    body.conciergePartnerId =
      slice.conciergeSource === 'partner' ? (slice.conciergePartnerId ?? null) : null;
  } else if (slice.conciergePartnerId !== undefined) {
    body.conciergePartnerId = slice.conciergePartnerId;
  }
  if (slice.enabledExperienceIds !== undefined) {
    body.enabledExperienceIds = slice.enabledExperienceIds;
  }
  if (slice.roomServiceBreakfast !== undefined) {
    body.roomServiceBreakfast = slice.roomServiceBreakfast;
  } else if (existing.roomServiceBreakfast) {
    body.roomServiceBreakfast = existing.roomServiceBreakfast;
  }
  const res = await listingsService.updateListingConciergeServices(listingId, body);
  if (res.error) throw new Error(res.error);
  return {
    transportServices: body.transportServices as unknown[],
    groceryServices: body.groceryServices as unknown[],
    customServices: body.customServices as unknown[],
    conciergeSource: body.conciergeSource ?? existing.conciergeSource,
    conciergePartnerId: body.conciergePartnerId ?? null,
    enabledExperienceIds:
      body.enabledExperienceIds !== undefined
        ? body.enabledExperienceIds
        : existing.enabledExperienceIds,
    roomServiceBreakfast:
      body.roomServiceBreakfast !== undefined
        ? body.roomServiceBreakfast
        : (existing.roomServiceBreakfast ?? null),
  };
}
