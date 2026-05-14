import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ActionToast, useActionToast } from '../components/ActionToast';
import {
  LISTING_TAB_META,
  createEmptyListing,
  getStoredListings,
  saveStoredListings,
  type ListingFormData,
  type ListingRecord,
} from '../data/catalogueMock';
import {
  Panel,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

type ListingTabKey = keyof ListingFormData;
type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'switch'
  | 'tags'
  | 'date'
  | 'time'
  | 'email'
  | 'tel'
  | 'url';

interface FieldSchema {
  label: string;
  path: string;
  type: FieldType;
  required?: boolean;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
}

interface SectionSchema {
  title: string;
  description?: string;
  fields: FieldSchema[];
}

const FIELD_OPTIONS = {
  listingType: [
    { value: 'Villa', label: 'Villa' },
    { value: 'Riad', label: 'Riad' },
    { value: 'Apartment', label: 'Appartement' },
    { value: 'Loft', label: 'Loft' },
    { value: 'House', label: 'Maison' },
    { value: 'Studio', label: 'Studio' },
  ],
  listingStatus: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Brouillon' },
  ],
  currency: [
    { value: 'EUR', label: 'EUR' },
    { value: 'MAD', label: 'MAD' },
    { value: 'USD', label: 'USD' },
  ],
  channel: [
    { value: 'airbnb', label: 'Airbnb' },
    { value: 'booking', label: 'Booking.com' },
    { value: 'direct', label: 'Direct' },
    { value: 'vrbo', label: 'Vrbo' },
  ],
  syncMode: [
    { value: '1-way', label: 'Sync 1-way' },
    { value: '2-way', label: 'Sync 2-way' },
    { value: 'manual', label: 'Manuel' },
  ],
  depositMethod: [
    { value: 'Card pre-authorization', label: 'Pré-autorisation CB' },
    { value: 'Cash', label: 'Espèces' },
    { value: 'Bank transfer', label: 'Virement' },
  ],
  accessType: [
    { value: 'Smart lock', label: 'Serrure connectée' },
    { value: 'Lockbox', label: 'Boîte à clés' },
    { value: 'Meet and greet', label: 'Accueil physique' },
  ],
  defaultRoomType: [
    { value: 'Entire home', label: 'Logement entier' },
    { value: 'Private room', label: 'Chambre privée' },
    { value: 'Suite', label: 'Suite' },
  ],
} as const;

const TAB_SCHEMAS: Record<ListingTabKey, SectionSchema[]> = {
  basic: [
    {
      title: 'Identification',
      description: 'Les informations fondamentales de l’annonce.',
      fields: [
        { label: 'Nom de la propriété', path: 'basic.name', type: 'text', required: true },
        { label: 'Type de propriété', path: 'basic.type', type: 'select', options: [...FIELD_OPTIONS.listingType], required: true },
        { label: 'Propriétaire', path: 'basic.ownerName', type: 'text', required: true },
        { label: 'Statut', path: 'basic.status', type: 'select', options: [...FIELD_OPTIONS.listingStatus], required: true },
        { label: 'Chambres', path: 'basic.bedrooms', type: 'number', required: true, min: 0 },
        { label: 'Salles de bain', path: 'basic.bathrooms', type: 'number', required: true, min: 0 },
        { label: 'Capacité', path: 'basic.guests', type: 'number', required: true, min: 1 },
        { label: 'Surface (m²)', path: 'basic.surface', type: 'number', required: true, min: 1 },
        { label: 'Lits', path: 'basic.beds', type: 'number', required: true, min: 1 },
      ],
    },
    {
      title: 'Description',
      fields: [
        { label: 'Description courte', path: 'basic.shortDescription', type: 'textarea', required: true },
        { label: 'Description longue', path: 'basic.longDescription', type: 'textarea', required: true },
      ],
    },
  ],
  address: [
    {
      title: 'Adresse complète',
      fields: [
        { label: 'Rue', path: 'address.street', type: 'text', required: true },
        { label: 'Code postal', path: 'address.postalCode', type: 'text', required: true },
        { label: 'Ville', path: 'address.city', type: 'text', required: true },
        { label: 'Région', path: 'address.region', type: 'text', required: true },
        { label: 'Pays', path: 'address.country', type: 'text', required: true },
        { label: 'Code pays', path: 'address.countryCode', type: 'text', required: true },
        { label: 'Latitude', path: 'address.latitude', type: 'text', required: true },
        { label: 'Longitude', path: 'address.longitude', type: 'text', required: true },
        { label: 'Repère / landmark', path: 'address.accessLandmark', type: 'textarea', required: true },
      ],
    },
  ],
  media: [
    {
      title: 'Bibliothèque média',
      fields: [
        { label: 'Photo cover', path: 'media.coverPhoto', type: 'url', required: true },
        { label: 'Nombre de photos', path: 'media.galleryCount', type: 'number', required: true, min: 1 },
        { label: 'Notes photo', path: 'media.photoNotes', type: 'textarea', required: true },
        { label: 'URL video tour', path: 'media.videoTourUrl', type: 'url' },
      ],
    },
  ],
  equipment: [
    {
      title: 'Équipements clés',
      fields: [
        { label: 'Highlights (séparés par virgule)', path: 'equipment.highlights', type: 'tags', required: true },
        { label: 'Cuisine équipée', path: 'equipment.kitchen', type: 'switch' },
        { label: 'Piscine', path: 'equipment.pool', type: 'switch' },
        { label: 'Parking', path: 'equipment.parking', type: 'switch' },
        { label: 'WiFi', path: 'equipment.wifi', type: 'switch' },
        { label: 'Climatisation', path: 'equipment.airConditioning', type: 'switch' },
        { label: 'Notes sécurité', path: 'equipment.safetyNotes', type: 'textarea', required: true },
      ],
    },
  ],
  pricing: [
    {
      title: 'Tarification de base',
      fields: [
        { label: 'Prix de base', path: 'pricing.basePrice', type: 'number', required: true, min: 0 },
        { label: 'Frais de ménage', path: 'pricing.cleaningFee', type: 'number', required: true, min: 0 },
        { label: 'Multiplicateur week-end', path: 'pricing.weekendMultiplier', type: 'number', required: true, min: 1 },
        { label: 'Séjour minimum', path: 'pricing.minStay', type: 'number', required: true, min: 1 },
        { label: 'Devise', path: 'pricing.currency', type: 'select', options: [...FIELD_OPTIONS.currency], required: true },
        { label: 'Taxe de séjour', path: 'pricing.cityTax', type: 'number', required: true, min: 0 },
        { label: 'Frais animaux', path: 'pricing.petFee', type: 'number', min: 0 },
      ],
    },
  ],
  extras: [
    {
      title: 'Frais supplémentaires',
      fields: [
        { label: 'Early check-in', path: 'extras.earlyCheckInFee', type: 'number', required: true, min: 0 },
        { label: 'Late check-out', path: 'extras.lateCheckOutFee', type: 'number', required: true, min: 0 },
        { label: 'Transfert aéroport', path: 'extras.airportTransferFee', type: 'number', min: 0 },
        { label: 'Baby kit', path: 'extras.babyKitFee', type: 'number', min: 0 },
        { label: 'Extra guest fee', path: 'extras.extraGuestFee', type: 'number', min: 0 },
        { label: 'Notes extras', path: 'extras.notes', type: 'textarea', required: true },
      ],
    },
  ],
  channels: [
    {
      title: 'Configuration OTA',
      fields: [
        { label: 'Canal préféré', path: 'channels.preferredChannel', type: 'select', options: [...FIELD_OPTIONS.channel], required: true },
        { label: 'Mode de sync', path: 'channels.syncMode', type: 'select', options: [...FIELD_OPTIONS.syncMode], required: true },
        { label: 'Instant book autorisé', path: 'channels.allowInstantBook', type: 'switch' },
        { label: 'Notes canaux', path: 'channels.channelNotes', type: 'textarea', required: true },
      ],
    },
  ],
  licenses: [
    {
      title: 'Conformité & licences',
      fields: [
        { label: 'Licence tourisme', path: 'licenses.tourismLicense', type: 'text', required: true },
        { label: 'Numéro TVA', path: 'licenses.vatNumber', type: 'text', required: true },
        { label: 'Police assurance', path: 'licenses.insurancePolicy', type: 'text', required: true },
        { label: 'Expiration', path: 'licenses.expiresAt', type: 'date', required: true },
        { label: 'Notes licences', path: 'licenses.licensingNotes', type: 'textarea', required: true },
      ],
    },
  ],
  automsg: [
    {
      title: 'Messages automatiques',
      fields: [
        { label: 'Messages actifs', path: 'automsg.enabled', type: 'switch' },
        { label: 'Confirmation réservation', path: 'automsg.bookingConfirmation', type: 'textarea', required: true },
        { label: 'Rappel avant arrivée', path: 'automsg.preArrivalReminder', type: 'textarea', required: true },
        { label: 'Check-in séjour', path: 'automsg.stayCheckIn', type: 'textarea', required: true },
        { label: 'Avant départ', path: 'automsg.preDeparture', type: 'textarea', required: true },
        { label: 'Merci / review', path: 'automsg.thankYou', type: 'textarea', required: true },
      ],
    },
  ],
  whatsapp: [
    {
      title: 'Menu WhatsApp',
      fields: [
        { label: 'Titre menu', path: 'whatsapp.menuTitle', type: 'text', required: true },
        { label: 'Template accueil', path: 'whatsapp.welcomeTemplate', type: 'text', required: true },
        { label: 'Quick replies', path: 'whatsapp.quickReplies', type: 'tags', required: true },
        { label: 'Auto-reply actif', path: 'whatsapp.autoReplyEnabled', type: 'switch' },
        { label: 'Numéro escalation', path: 'whatsapp.escalationNumber', type: 'tel', required: true },
      ],
    },
  ],
  concierge: [
    {
      title: 'Services concierge',
      fields: [
        { label: 'Concierge active', path: 'concierge.enabled', type: 'switch' },
        { label: 'Transfert aéroport', path: 'concierge.airportTransfer', type: 'switch' },
        { label: 'Livraison courses', path: 'concierge.groceryDelivery', type: 'switch' },
        { label: 'Chef privé', path: 'concierge.chefService', type: 'switch' },
        { label: 'Guide local', path: 'concierge.localGuide', type: 'switch' },
        { label: 'Notes concierge', path: 'concierge.conciergeNotes', type: 'textarea', required: true },
      ],
    },
  ],
  services: [
    {
      title: 'Services additionnels',
      fields: [
        { label: 'Petit déjeuner', path: 'services.breakfast', type: 'switch' },
        { label: 'Spa', path: 'services.spa', type: 'switch' },
        { label: 'Housekeeping', path: 'services.housekeeping', type: 'switch' },
        { label: 'Babysitting', path: 'services.babysitting', type: 'switch' },
        { label: 'Location véhicule', path: 'services.carRental', type: 'switch' },
        { label: 'Notes services', path: 'services.serviceNotes', type: 'textarea', required: true },
      ],
    },
  ],
  support: [
    {
      title: 'Support client',
      fields: [
        { label: 'Téléphone support', path: 'support.phone', type: 'tel', required: true },
        { label: 'Email support', path: 'support.email', type: 'email', required: true },
        { label: 'Horaires support', path: 'support.hours', type: 'time', required: true, helperText: 'Format libre accepté' },
        { label: 'Protocole urgence', path: 'support.emergencyProtocol', type: 'textarea', required: true },
        { label: 'Notes support', path: 'support.supportNotes', type: 'textarea', required: true },
      ],
    },
  ],
  cleaning: [
    {
      title: 'Instructions ménage',
      fields: [
        { label: 'Checklist standard', path: 'cleaning.standardChecklist', type: 'textarea', required: true },
        { label: 'Rotation linge', path: 'cleaning.linenChange', type: 'text', required: true },
        { label: 'Stockage consommables', path: 'cleaning.suppliesStorage', type: 'text', required: true },
        { label: 'Contrôle qualité', path: 'cleaning.qualityControl', type: 'text', required: true },
        { label: 'Notes ménage', path: 'cleaning.cleaningNotes', type: 'textarea', required: true },
      ],
    },
  ],
  autotasks: [
    {
      title: 'Tâches automatiques',
      fields: [
        { label: 'Créer tâche ménage', path: 'autotasks.createCleaningTask', type: 'switch' },
        { label: 'Créer tâche maintenance', path: 'autotasks.createMaintenanceTask', type: 'switch' },
        { label: 'Créer tâche welcome pack', path: 'autotasks.createWelcomePackTask', type: 'switch' },
        { label: 'Assigner équipe par défaut', path: 'autotasks.assignDefaultTeam', type: 'switch' },
        { label: 'Notes tâches auto', path: 'autotasks.taskNotes', type: 'textarea', required: true },
      ],
    },
  ],
  roomtypes: [
    {
      title: 'Gestion des types de chambres',
      fields: [
        { label: 'Mode multi-room', path: 'roomtypes.multiRoomEnabled', type: 'switch' },
        { label: 'Room type par défaut', path: 'roomtypes.defaultRoomType', type: 'select', options: [...FIELD_OPTIONS.defaultRoomType], required: true },
        { label: 'Inventaire chambres', path: 'roomtypes.roomInventory', type: 'textarea', required: true },
        { label: 'Matrice occupation', path: 'roomtypes.occupancyMatrix', type: 'text', required: true },
        { label: 'Notes room types', path: 'roomtypes.roomtypeNotes', type: 'textarea', required: true },
      ],
    },
  ],
  deposit: [
    {
      title: 'Caution',
      fields: [
        { label: 'Caution activée', path: 'deposit.enabled', type: 'switch' },
        { label: 'Montant caution', path: 'deposit.amount', type: 'number', required: true, min: 0 },
        { label: 'Méthode', path: 'deposit.method', type: 'select', options: [...FIELD_OPTIONS.depositMethod], required: true },
        { label: 'Délai remboursement (jours)', path: 'deposit.refundDelayDays', type: 'number', required: true, min: 0 },
        { label: 'Notes caution', path: 'deposit.depositNotes', type: 'textarea', required: true },
      ],
    },
  ],
  rules: [
    {
      title: 'Sécurité & conformité',
      fields: [
        { label: 'Fumeur autorisé', path: 'rules.smokingAllowed', type: 'switch' },
        { label: 'Évènements autorisés', path: 'rules.eventsAllowed', type: 'switch' },
        { label: 'Enfants autorisés', path: 'rules.childrenAllowed', type: 'switch' },
        { label: 'Animaux autorisés', path: 'rules.petAllowed', type: 'switch' },
        { label: 'Notes sécurité', path: 'rules.securityNotes', type: 'textarea', required: true },
      ],
    },
  ],
  houserules: [
    {
      title: 'Règlement intérieur',
      fields: [
        { label: 'Fenêtre check-in', path: 'houserules.checkInWindow', type: 'text', required: true },
        { label: 'Fenêtre check-out', path: 'houserules.checkOutWindow', type: 'text', required: true },
        { label: 'Heures calmes', path: 'houserules.quietHours', type: 'text', required: true },
        { label: 'Instructions poubelles', path: 'houserules.trashInstructions', type: 'textarea', required: true },
        { label: 'Texte house rules', path: 'houserules.houseRulesText', type: 'textarea', required: true },
      ],
    },
  ],
  access: [
    {
      title: 'Instructions accès',
      fields: [
        { label: 'Type d’accès', path: 'access.accessType', type: 'select', options: [...FIELD_OPTIONS.accessType], required: true },
        { label: 'Code keypad', path: 'access.keypadCode', type: 'text', required: true },
        { label: 'Code lockbox', path: 'access.lockboxCode', type: 'text' },
        { label: 'Instructions parking', path: 'access.parkingInstructions', type: 'textarea', required: true },
        { label: 'Notes accès', path: 'access.accessNotes', type: 'textarea', required: true },
      ],
    },
  ],
  wifi: [
    {
      title: 'Configuration WiFi',
      fields: [
        { label: 'SSID', path: 'wifi.ssid', type: 'text', required: true },
        { label: 'Mot de passe', path: 'wifi.password', type: 'text', required: true },
        { label: 'Débit / speed', path: 'wifi.speed', type: 'text', required: true },
        { label: 'Backup network', path: 'wifi.backupNetwork', type: 'text' },
        { label: 'Notes WiFi', path: 'wifi.wifiNotes', type: 'textarea', required: true },
      ],
    },
  ],
  iot: [
    {
      title: 'Appareils connectés',
      fields: [
        { label: 'Smart lock', path: 'iot.smartLock', type: 'switch' },
        { label: 'Thermostat connecté', path: 'iot.thermostat', type: 'switch' },
        { label: 'Noise sensor', path: 'iot.noiseSensor', type: 'switch' },
        { label: 'Caméra extérieure', path: 'iot.cameraOutdoor', type: 'switch' },
        { label: 'Notes devices', path: 'iot.deviceNotes', type: 'textarea', required: true },
      ],
    },
  ],
};

const REQUIRED_FIELDS: Record<ListingTabKey, string[]> = Object.fromEntries(
  Object.entries(TAB_SCHEMAS).map(([key, sections]) => [
    key,
    sections.flatMap((section) =>
      section.fields.filter((field) => field.required).map((field) => field.path),
    ),
  ]),
) as Record<ListingTabKey, string[]>;

const fieldPathGet = (source: Record<string, any>, path: string) => {
  return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), source);
};

const fieldPathSet = (source: Record<string, any>, path: string, value: unknown) => {
  const keys = path.split('.');
  const clone = structuredClone(source);
  let cursor: Record<string, any> = clone;

  keys.slice(0, -1).forEach((key) => {
    if (!cursor[key]) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });

  cursor[keys[keys.length - 1]] = value;
  return clone;
};

const isFilled = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return value >= 0;
  }
  return String(value ?? '').trim().length > 0;
};

const computeTabCompletion = (listing: ListingRecord, tabKey: ListingTabKey) => {
  const required = REQUIRED_FIELDS[tabKey];
  if (required.length === 0) {
    return 100;
  }

  const filled = required.filter((path) => isFilled(fieldPathGet(listing.form, path))).length;
  return Math.round((filled / required.length) * 100);
};

const syncListingMeta = (listing: ListingRecord): ListingRecord => {
  const next = structuredClone(listing);
  next.name = next.form.basic.name;
  next.city = next.form.address.city;
  next.country = next.form.address.country;
  next.countryCode = next.form.address.countryCode;
  next.ownerName = next.form.basic.ownerName;
  next.type = next.form.basic.type;
  next.status = next.form.basic.status;
  next.adr = next.form.pricing.basePrice;
  next.sizeLabel = `${next.form.address.city.toUpperCase()} · ${next.form.basic.bedrooms}ch · ${next.form.basic.surface}m²`;
  next.updatedAt = new Date().toISOString();
  return next;
};

function TabsRail({
  activeTab,
  onChange,
  completions,
}: {
  activeTab: ListingTabKey;
  onChange: (key: ListingTabKey) => void;
  completions: Record<ListingTabKey, number>;
}) {
  let currentGroup = '';

  return (
    <Box
      sx={{
        width: 270,
        bgcolor: t.bg1,
        borderRight: `1px solid ${t.border}`,
        overflow: 'auto',
        p: 2,
      }}
    >
      <TextField placeholder="Rechercher un onglet..." size="small" fullWidth sx={{ mb: 2 }} />

      {LISTING_TAB_META.map((tab) => {
        const showGroupHeader = tab.group !== currentGroup;
        currentGroup = tab.group;
        const completion = completions[tab.key];
        const isComplete = completion === 100;

        return (
          <Box key={tab.key}>
            {showGroupHeader && (
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.text3,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  mt: 2,
                  mb: 1,
                  px: 1.5,
                }}
              >
                {tab.group}
              </Typography>
            )}

            <Box
              onClick={() => onChange(tab.key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                bgcolor: activeTab === tab.key ? t.primaryTint : 'transparent',
                borderLeft:
                  activeTab === tab.key ? `3px solid ${t.primary}` : '3px solid transparent',
                transition: 'all 0.15s',
                '&:hover': {
                  bgcolor: activeTab === tab.key ? t.primaryTint : t.bg2,
                },
              }}
            >
              <Box sx={{ fontSize: 16 }}>{tab.icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500 }}>
                  {tab.label}
                </Typography>
                <Typography sx={{ fontSize: 11, color: t.text3 }}>{completion}%</Typography>
              </Box>
              {isComplete ? (
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: t.successTint,
                    color: t.success,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  ✓
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: completion > 0 ? t.warning : t.text4,
                  }}
                />
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: any;
  onChange: (value: any) => void;
}) {
  const commonProps = {
    fullWidth: true,
    size: 'small' as const,
    helperText: field.helperText,
  };

  if (field.type === 'switch') {
    return (
      <FormControlLabel
        control={<Switch checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />}
        label={field.label}
      />
    );
  }

  if (field.type === 'tags') {
    return (
      <TextField
        {...commonProps}
        label={field.label}
        value={Array.isArray(value) ? value.join(', ') : ''}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
      />
    );
  }

  if (field.type === 'select') {
    return (
      <TextField
        {...commonProps}
        select
        label={field.label}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {(field.options || []).map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      {...commonProps}
      type={
        field.type === 'textarea'
          ? 'text'
          : field.type === 'number'
            ? 'number'
            : field.type
      }
      label={field.label}
      value={value ?? ''}
      onChange={(event) =>
        onChange(
          field.type === 'number'
            ? Number(event.target.value || 0)
            : event.target.value,
        )
      }
      multiline={field.type === 'textarea'}
      rows={field.type === 'textarea' ? 4 : undefined}
    />
  );
}

function TabContent({
  listing,
  tabKey,
  onChange,
}: {
  listing: ListingRecord;
  tabKey: ListingTabKey;
  onChange: (path: string, value: unknown) => void;
}) {
  const sections = TAB_SCHEMAS[tabKey];

  return (
    <Stack spacing={2.5}>
      {tabKey === 'media' && (
        <Panel sx={{ p: 2.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>
            Aperçu galerie mock
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1.25,
            }}
          >
            {Array.from({ length: Math.max(4, Number(listing.form.media.galleryCount || 0)) }).map(
              (_, index) => (
                <Box
                  key={`media-${index}`}
                  sx={{
                    height: 90,
                    borderRadius: '10px',
                    border: `1px dashed ${t.borderStrong}`,
                    bgcolor: t.bg2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: t.text3,
                    fontSize: 12,
                  }}
                >
                  Photo {index + 1}
                </Box>
              ),
            )}
          </Box>
        </Panel>
      )}

      {tabKey === 'channels' && (
        <Panel sx={{ p: 2.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>
            État de synchronisation OTA
          </Typography>
          <Stack spacing={1.25}>
            {listing.channels.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: t.text3 }}>
                Aucun canal connecté. Utilisez le bouton "Connecter canal" après sauvegarde.
              </Typography>
            ) : (
              listing.channels.map((channel) => (
              <Stack
                key={channel.id}
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: '8px',
                  bgcolor: t.bg2,
                  border: `1px solid ${t.border}`,
                }}
              >
                  <Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{channel.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: t.text3 }}>
                      Dernière sync: {channel.lastSync}
                    </Typography>
                  </Box>
                  <Chip size="small" label={channel.status} />
                </Stack>
              ))
            )}
          </Stack>
        </Panel>
      )}

      {sections.map((section) => (
        <Panel key={section.title} sx={{ p: 2.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>{section.title}</Typography>
          {section.description && (
            <Typography sx={{ fontSize: 12, color: t.text3, mb: 2 }}>
              {section.description}
            </Typography>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            {section.fields.map((field) => (
              <Box
                key={field.path}
                sx={{
                  gridColumn: field.type === 'textarea' || field.type === 'tags' ? '1 / -1' : 'auto',
                }}
              >
                <FormField
                  field={field}
                  value={fieldPathGet(listing.form, field.path)}
                  onChange={(value) => onChange(field.path, value)}
                />
              </Box>
            ))}
          </Box>
        </Panel>
      ))}
    </Stack>
  );
}

export function NewListingFormPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useActionToast();
  const storedListings = getStoredListings();
  const existingListing = storedListings.find((item) => item.id === id);
  const isCreateMode = !id || id === 'new';
  const [listing, setListing] = useState<ListingRecord>(existingListing || createEmptyListing());
  const [activeTab, setActiveTab] = useState<ListingTabKey>('basic');

  const tabCompletions = useMemo(() => {
    return Object.fromEntries(
      LISTING_TAB_META.map((tab) => [tab.key, computeTabCompletion(listing, tab.key)]),
    ) as Record<ListingTabKey, number>;
  }, [listing]);

  const globalCompletion = useMemo(() => {
    const values = Object.values(tabCompletions);
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [tabCompletions]);

  const activeTabMeta = LISTING_TAB_META.find((item) => item.key === activeTab);
  const currentIndex = LISTING_TAB_META.findIndex((item) => item.key === activeTab);

  const persistListing = (nextListing: ListingRecord, message: string) => {
    const synced = syncListingMeta(nextListing);
    const currentListings = getStoredListings();
    const nextListings = currentListings.some((item) => item.id === synced.id)
      ? currentListings.map((item) => (item.id === synced.id ? synced : item))
      : [synced, ...currentListings];

    saveStoredListings(nextListings);
    setListing(synced);
    showToast(message);

    if (isCreateMode && id !== synced.id) {
      navigate(`/listings/${synced.id}`, { replace: true });
    }
  };

  const updateField = (path: string, value: unknown) => {
    setListing((prev) => fieldPathSet(prev, `form.${path}`, value) as ListingRecord);
  };

  const saveCurrentTab = () => {
    persistListing(listing, `Onglet "${activeTabMeta?.label}" sauvegardé`);
  };

  const goToSiblingTab = (delta: number) => {
    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= LISTING_TAB_META.length) {
      return;
    }
    persistListing(listing, `Progression sauvegardée sur "${activeTabMeta?.label}"`);
    setActiveTab(LISTING_TAB_META[nextIndex].key);
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', listing.name]}>
      <Box
        sx={{
          display: 'flex',
          height: 'calc(100vh - 56px)',
          overflow: 'hidden',
          ml: -3,
          mr: -3,
          mt: -3,
        }}
      >
        <TabsRail activeTab={activeTab} onChange={setActiveTab} completions={tabCompletions} />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box
            sx={{
              p: 2,
              bgcolor: t.bg1,
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: 11, color: t.text3 }}>Listings</Typography>
              <Typography sx={{ fontSize: 11, color: t.text3 }}>›</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{listing.name}</Typography>
              <Typography sx={{ fontSize: 11, color: t.text3 }}>›</Typography>
              <Typography sx={{ fontSize: 13 }}>{activeTabMeta?.label}</Typography>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Chip
                size="small"
                label={`${globalCompletion}% complet`}
                sx={{ fontWeight: 700, bgcolor: t.primaryTint, color: t.primary }}
              />
              <Button sx={btnGhostSx} onClick={() => showToast('Preview mock ouvert', 'info')}>
                Preview
              </Button>
              <Button sx={btnGhostSx} onClick={() => showToast('Suggestions IA mock générées', 'info')}>
                + AI assist
              </Button>
              <Button
                sx={btnPrimarySx}
                onClick={() => {
                  persistListing(listing, 'Annonce sauvegardée avant publication');
                  showToast('Annonce prête à être publiée', 'success');
                }}
              >
                Publish →
              </Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <TabContent listing={listing} tabKey={activeTab} onChange={updateField} />
          </Box>

          <Box
            sx={{
              bgcolor: t.bg1,
              borderTop: `1px solid ${t.border}`,
              p: 2,
            }}
          >
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Divider orientation="vertical" flexItem />
                <Typography sx={{ fontSize: 12, color: t.text3 }}>
                  Dernière mise à jour : {new Date(listing.updatedAt).toLocaleString('fr-FR')}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1.5}>
                <Button sx={btnGhostSx} onClick={() => navigate('/listings')}>
                  Retour liste
                </Button>
                <Button sx={btnGhostSx} disabled={currentIndex === 0} onClick={() => goToSiblingTab(-1)}>
                  ← Précédent
                </Button>
                <Button sx={btnGhostSx} onClick={saveCurrentTab}>
                  Sauvegarder
                </Button>
                <Button
                  sx={btnPrimarySx}
                  disabled={currentIndex === LISTING_TAB_META.length - 1}
                  onClick={() => goToSiblingTab(1)}
                >
                  Sauvegarder & continuer →
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>

      </Box>

      <ActionToast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </DashboardWrapper>
  );
}
