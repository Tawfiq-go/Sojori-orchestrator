// Types & catalogues ménage (FR)

export type TimeSlot = {
  start: number;
  end: number;
  type?: string;
  price?: number;
  default?: boolean;
};

export type FrequencyTier = {
  startDay: number;
  endDay: number;
  numberOfCleaning: number;
};

export type PaidCleaningServiceType = {
  id: string;
  enabled: boolean;
  labelFr: string;
  descriptionFr: string;
  icon: string;
  duration: number;
  price: number;
  currency: string;
  timeslotMode: 'dynamic' | 'timeslot';
  timeslots: TimeSlot[];
  displayOrder: number;
};

export type IncludedCleaningExtra = {
  id: string;
  enabled: boolean;
  labelFr: string;
  descriptionFr: string;
  price: number;
  icon: string;
};

/** Libellé fixe menu WhatsApp (PM ne modifie pas · i18n plus tard) */
export const PAID_CLEANING_WA_MENU_LABEL_FR = 'Ménage payant';

/** Mode message WA — géré côté plateforme, toujours standard à la persistance */
export const PAID_CLEANING_WHATSAPP_MESSAGE_MODE = 'standard' as const;

export type PaidCleaningConfig = {
  enabled: boolean;
  frequency: 'all_days' | 'per_week';
  perWeekCount?: number;
  availableWeekdays: number[];
  whatsappMessageMode: typeof PAID_CLEANING_WHATSAPP_MESSAGE_MODE;
  serviceTypes: PaidCleaningServiceType[];
};

export type CleaningListingConfig = {
  freeCleaningEnabled: boolean;
  frequency: FrequencyTier[];
  TS_CLEAN: TimeSlot[];
  includedDescriptionFr: string;
  includedExtras: IncludedCleaningExtra[];
  paidCleaningConfig: PaidCleaningConfig;
};

export const DEFAULT_FREQUENCY: FrequencyTier[] = [
  { startDay: 1, endDay: 7, numberOfCleaning: 2 },
  { startDay: 8, endDay: 14, numberOfCleaning: 3 },
  { startDay: 15, endDay: 21, numberOfCleaning: 4 },
  { startDay: 22, endDay: 30, numberOfCleaning: 6 },
];

export const DEFAULT_TS_CLEAN: TimeSlot[] = [
  { start: 10, end: 12, price: 0, default: true },
  { start: 14, end: 16, price: 0 },
  { start: 16, end: 18, price: 0 },
];

export const DEFAULT_SLOT_LABELS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

export const PAID_CLEANING_CATALOG: Omit<PaidCleaningServiceType, 'enabled' | 'displayOrder' | 'timeslots'>[] = [
  {
    id: 'simple',
    labelFr: 'Ménage simple',
    descriptionFr: 'Nettoyage surfaces et sols',
    icon: '🧹',
    duration: 2,
    price: 150,
    currency: 'MAD',
    timeslotMode: 'timeslot',
  },
  {
    id: 'complet',
    labelFr: 'Ménage complet',
    descriptionFr: 'Nettoyage complet du logement',
    icon: '🧼',
    duration: 4,
    price: 350,
    currency: 'MAD',
    timeslotMode: 'timeslot',
  },
  {
    id: 'serviettes',
    labelFr: 'Ménage + serviettes',
    descriptionFr: 'Ménage complet avec changement serviettes',
    icon: '🛁',
    duration: 4,
    price: 400,
    currency: 'MAD',
    timeslotMode: 'timeslot',
  },
  {
    id: 'linge',
    labelFr: 'Ménage + linge',
    descriptionFr: 'Ménage avec draps et serviettes',
    icon: '🛏️',
    duration: 5,
    price: 450,
    currency: 'MAD',
    timeslotMode: 'timeslot',
  },
  {
    id: 'express',
    labelFr: 'Ménage express',
    descriptionFr: 'Rafraîchissement rapide (2h)',
    icon: '⚡',
    duration: 2,
    price: 120,
    currency: 'MAD',
    timeslotMode: 'dynamic',
  },
];

export const INCLUDED_EXTRA_ICON_PICKER = [
  '🛁', '🛏️', '🧴', '🧹', '👔', '🧺', '☕', '🧽', '✨', '🎁',
];

export const INCLUDED_EXTRA_CATALOG: Omit<IncludedCleaningExtra, 'enabled'>[] = [
  {
    id: 'serviettes',
    labelFr: 'Changement serviettes',
    descriptionFr: 'En supplément du ménage inclus',
    price: 80,
    icon: '🛁',
  },
  {
    id: 'linge',
    labelFr: 'Changement draps',
    descriptionFr: 'Hors cycle ménage inclus',
    price: 120,
    icon: '🛏️',
  },
  {
    id: 'produits',
    labelFr: 'Kit produits accueil',
    descriptionFr: 'Gel douche, shampoing, café…',
    price: 50,
    icon: '🧴',
  },
];

export function mapListingToCleaningConfig(raw: Record<string, unknown>): CleaningListingConfig {
  const paid = (raw.paidCleaningConfig as PaidCleaningConfig) || {};
  const serviceTypes = Array.isArray(paid.serviceTypes)
    ? paid.serviceTypes.map((s: Record<string, unknown>, i: number) => {
        const name = (s.name as { fr?: string }) || {};
        const desc = (s.description as { fr?: string }) || {};
        return {
          id: String(s.id || `paid_${i}`),
          enabled: s.enabled !== false,
          labelFr: name.fr || 'Service',
          descriptionFr: desc.fr || '',
          icon: String((s as { icon?: string }).icon || '🧹'),
          duration: Number(s.duration) || 2,
          price: Number(s.price) || 0,
          currency: String(s.currency || 'MAD'),
          timeslotMode: (s.timeslotMode as 'dynamic' | 'timeslot') || 'timeslot',
          timeslots: Array.isArray(s.timeslots) ? (s.timeslots as TimeSlot[]) : [],
          displayOrder: Number(s.displayOrder) || i,
        };
      })
    : PAID_CLEANING_CATALOG.map((c, i) => ({
        ...c,
        enabled: true,
        timeslots: [],
        displayOrder: i,
      }));

  const extrasRaw = raw.includedCleaningExtras as IncludedCleaningExtra[] | undefined;
  const includedExtras = Array.isArray(extrasRaw)
    ? extrasRaw
    : [];

  const desc = raw.includedCleaningDescription as { fr?: string } | undefined;

  return {
    freeCleaningEnabled: raw.orchestration_cleaning_free !== false,
    frequency:
      Array.isArray(raw.frequency) && raw.frequency.length > 0
        ? (raw.frequency as FrequencyTier[])
        : DEFAULT_FREQUENCY,
    TS_CLEAN:
      Array.isArray(raw.TS_CLEAN) && raw.TS_CLEAN.length > 0
        ? (raw.TS_CLEAN as TimeSlot[])
        : DEFAULT_TS_CLEAN,
    includedDescriptionFr:
      desc?.fr ||
      'Ménage inclus pendant votre séjour selon la durée de votre réservation.',
    includedExtras,
    paidCleaningConfig: {
      enabled: !!paid.enabled,
      frequency: paid.frequency === 'per_week' ? 'per_week' : 'all_days',
      perWeekCount: paid.perWeekCount ?? 2,
      availableWeekdays: Array.isArray(paid.availableWeekdays) ? paid.availableWeekdays : [0, 1, 2, 3, 4, 5, 6],
      whatsappMessageMode: PAID_CLEANING_WHATSAPP_MESSAGE_MODE,
      serviceTypes,
    },
  };
}

export function mapCleaningConfigToListingPatch(
  cfg: CleaningListingConfig,
  opts?: { preservePaidEnabled?: boolean },
): Record<string, unknown> {
  return {
    frequency: cfg.frequency,
    TS_CLEAN: cfg.TS_CLEAN,
    includedCleaningDescription: { fr: cfg.includedDescriptionFr, en: cfg.includedDescriptionFr, ar: '' },
    includedCleaningExtras: cfg.includedExtras,
    paidCleaningConfig: {
      enabled: opts?.preservePaidEnabled ?? true,
      frequency: cfg.paidCleaningConfig.frequency,
      perWeekCount: cfg.paidCleaningConfig.perWeekCount,
      availableWeekdays: cfg.paidCleaningConfig.availableWeekdays,
      whatsappMessageMode: PAID_CLEANING_WHATSAPP_MESSAGE_MODE,
      serviceTypes: cfg.paidCleaningConfig.serviceTypes.map((s, i) => ({
        id: s.id,
        enabled: s.enabled,
        name: { fr: s.labelFr, en: s.labelFr, ar: s.labelFr },
        description: { fr: s.descriptionFr, en: s.descriptionFr, ar: '' },
        duration: s.duration,
        price: s.price,
        currency: s.currency || 'MAD',
        timeslotMode: s.timeslotMode,
        timeslots: s.timeslots,
        displayOrder: i,
      })),
    },
  };
}
