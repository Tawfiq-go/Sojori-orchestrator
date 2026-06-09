/** Taxe de séjour — champs listing (srv-listing) + textes messages voyageur. */

export type CityTaxCurrency = 'MAD' | 'EUR';

/** Comment expliquer le calcul dans {cityTax} / {cityTaxBreakdown} — pas le mode de paiement. */
export type CityTaxCalculationMode = 'per_stay' | 'per_night' | 'per_person_per_night';

/** Comment le PM souhaite recevoir la taxe. */
export type CityTaxCollectionMode =
  | 'on_table'
  | 'hand_to_pm'
  | 'cash_on_departure'
  | 'included_in_price';

export type CityTaxConfig = {
  enabled: boolean;
  amount: number;
  currency: CityTaxCurrency;
  calculationMode: CityTaxCalculationMode;
  exemptChildren: boolean;
  exemptBelowAge: number;
  collectionMode: CityTaxCollectionMode;
  /** Texte libre taxe — variables {total} {currency} {formula} */
  instructionText: string;
};

export const DEFAULT_CITY_TAX: CityTaxConfig = {
  enabled: false,
  amount: 15,
  currency: 'MAD',
  calculationMode: 'per_person_per_night',
  exemptChildren: true,
  exemptBelowAge: 12,
  collectionMode: 'on_table',
  instructionText: '',
};

export const CITY_TAX_COLLECTION_OPTIONS: {
  id: CityTaxCollectionMode;
  label: string;
  help: string;
}[] = [
  { id: 'on_table', label: 'Sur la table', help: 'Ex. déposer sur la table du salon' },
  { id: 'hand_to_pm', label: 'En main propre', help: 'Remettre au gestionnaire à l\'arrivée ou au départ' },
  { id: 'cash_on_departure', label: 'Espèces au départ', help: 'Régler en espèces avant de partir' },
  { id: 'included_in_price', label: 'Déjà incluse', help: 'Rien à régler — taxe incluse dans le prix' },
];

function asCalculationMode(v: unknown): CityTaxCalculationMode {
  if (v === 'per_stay' || v === 'per_night' || v === 'per_person_per_night') return v;
  return 'per_person_per_night';
}

function asCollectionMode(v: unknown): CityTaxCollectionMode {
  if (
    v === 'on_table' ||
    v === 'hand_to_pm' ||
    v === 'cash_on_departure' ||
    v === 'included_in_price' ||
    v === 'cash_on_arrival'
  ) {
    return v === 'cash_on_arrival' ? 'cash_on_departure' : v;
  }
  return 'on_table';
}

export function mapListingToCityTaxConfig(raw: Record<string, unknown>): CityTaxConfig {
  const enabled = raw.cityTaxEnabled === true;
  const amount =
    typeof raw.cityTaxPerAdultPerNight === 'number'
      ? raw.cityTaxPerAdultPerNight
      : DEFAULT_CITY_TAX.amount;
  const currency = raw.cityTaxCurrency === 'EUR' ? 'EUR' : 'MAD';
  const exemptChildren = raw.cityTaxExemptChildren !== false;
  const exemptBelowAge =
    typeof raw.cityTaxExemptBelowAge === 'number'
      ? Math.max(0, Math.min(18, raw.cityTaxExemptBelowAge))
      : DEFAULT_CITY_TAX.exemptBelowAge;
  return {
    enabled,
    amount: Math.max(0, amount),
    currency,
    calculationMode: asCalculationMode(raw.cityTaxCalculationMode),
    exemptChildren,
    exemptBelowAge,
    collectionMode: asCollectionMode(raw.cityTaxCollectionMode),
    instructionText: String(raw.cityTaxInstructionText ?? ''),
  };
}

export function mapCityTaxToListingPatch(cfg: CityTaxConfig): Record<string, unknown> {
  return {
    cityTaxEnabled: cfg.enabled,
    cityTaxPerAdultPerNight: cfg.amount,
    cityTaxCurrency: cfg.currency,
    cityTaxCalculationMode: cfg.calculationMode,
    cityTaxExemptChildren: cfg.exemptChildren,
    cityTaxExemptBelowAge: cfg.exemptBelowAge,
    cityTaxCollectionMode: cfg.collectionMode,
    cityTaxInstructionText: cfg.instructionText.trim(),
  };
}

export const CITY_TAX_CALCULATION_OPTIONS: {
  id: CityTaxCalculationMode;
  label: string;
  help: string;
  amountSuffix: string;
}[] = [
  {
    id: 'per_person_per_night',
    label: 'Par personne · par nuit',
    help: 'Ex. 2 adultes × 3 nuits × 15 MAD',
    amountSuffix: 'AD / NUIT',
  },
  {
    id: 'per_night',
    label: 'Par nuit',
    help: 'Montant fixe multiplié par le nombre de nuits',
    amountSuffix: '/ NUIT',
  },
  {
    id: 'per_stay',
    label: 'Par séjour',
    help: 'Forfait unique pour toute la réservation',
    amountSuffix: '/ SÉJOUR',
  },
];

function computeTotal(cfg: CityTaxConfig, adults: number, nights: number): number {
  const a = Math.max(1, adults);
  const n = Math.max(1, nights);
  const rate = cfg.amount;
  switch (cfg.calculationMode) {
    case 'per_stay':
      return rate;
    case 'per_night':
      return rate * n;
    default:
      return rate * a * n;
  }
}

function formulaLabel(cfg: CityTaxConfig, adults: number, nights: number, total: number): string {
  const a = Math.max(1, adults);
  const n = Math.max(1, nights);
  const cur = cfg.currency;
  switch (cfg.calculationMode) {
    case 'per_stay':
      return `forfait ${total} ${cur}`;
    case 'per_night':
      return `${n} nuit(s) × ${cfg.amount} ${cur}/nuit`;
    default:
      return `${a} adulte(s) × ${n} nuit(s) × ${cfg.amount} ${cur}`;
  }
}

/** Aperçu local (2 adultes · 3 nuits) — aligné srv-listing departurePackage. */
export function previewCityTaxBreakdown(
  cfg: CityTaxConfig,
  adults = 2,
  nights = 3,
): { total: string; formula: string } {
  if (!cfg.enabled) {
    return { total: 'Inclus', formula: 'Taxe désactivée' };
  }
  const total = computeTotal(cfg, adults, nights);
  const cur = cfg.currency;
  return { total: `${total} ${cur}`, formula: formulaLabel(cfg, adults, nights, total) };
}

/** Paragraphe taxe pour aperçu message départ. */
export function buildCityTaxParagraphPreview(
  cfg: CityTaxConfig,
  adults = 2,
  nights = 3,
): string {
  if (!cfg.enabled) return '';

  const total = computeTotal(cfg, adults, nights);
  const cur = cfg.currency;
  const formula = formulaLabel(cfg, adults, nights, total);
  const custom = cfg.instructionText.trim();
  if (custom) {
    return custom
      .replace(/\{total\}/g, String(total))
      .replace(/\{currency\}/g, cur)
      .replace(/\{formula\}/g, formula);
  }

  switch (cfg.collectionMode) {
    case 'included_in_price':
      return 'Taxe de séjour : déjà incluse dans votre réservation — rien à régler.';
    case 'hand_to_pm':
      return `Taxe de séjour : remettre en main propre au gestionnaire ${total} ${cur} (${formula}).`;
    case 'cash_on_departure':
      return `Taxe de séjour : régler en espèces ${total} ${cur} avant votre départ (${formula}).`;
    case 'on_table':
    default:
      return `Taxe de séjour : déposer ${total} ${cur} sur la table du salon (${formula}).`;
  }
}

export function buildDepartureMessagePreview(opts: {
  guestFirstName?: string;
  listingName?: string;
  checkoutTime?: string | number;
  globalInstructions: string;
  cityTax: CityTaxConfig;
}): string {
  const firstName = opts.guestFirstName?.trim() || 'Ahmed';
  const listingName = opts.listingName?.trim() || 'Votre logement';
  const h =
    opts.checkoutTime != null && opts.checkoutTime !== ''
      ? typeof opts.checkoutTime === 'number'
        ? `${opts.checkoutTime}h00`
        : String(opts.checkoutTime)
      : '11h00';
  const instructions = opts.globalInstructions.trim() || '—';
  const taxParagraph = buildCityTaxParagraphPreview(opts.cityTax);
  const lines = [
    `Bonjour ${firstName},`,
    '',
    `Votre départ de ${listingName} approche : demain à ${h}.`,
    '',
    'Avant de partir, merci de :',
    instructions,
  ];
  if (taxParagraph) {
    lines.push('', taxParagraph);
  }
  lines.push(
    '',
    'Une question ? https://wa.me/212773745388?text=Bonjour,+ma+réservation+est+SJ-XXXX',
    '',
    'Équipe Sojori',
  );
  return lines.join('\n');
}
