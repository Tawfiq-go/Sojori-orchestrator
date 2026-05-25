/** Taxe de séjour — champs listing (srv-listing) + textes messages voyageur. */

export type CityTaxCurrency = 'MAD' | 'EUR';

/** Comment expliquer le calcul dans {cityTax} / {cityTaxBreakdown} — pas le mode de paiement. */
export type CityTaxCalculationMode = 'per_stay' | 'per_night' | 'per_person_per_night';

export type CityTaxConfig = {
  enabled: boolean;
  amount: number;
  currency: CityTaxCurrency;
  calculationMode: CityTaxCalculationMode;
  exemptChildren: boolean;
  exemptBelowAge: number;
};

export const DEFAULT_CITY_TAX: CityTaxConfig = {
  enabled: false,
  amount: 15,
  currency: 'MAD',
  calculationMode: 'per_person_per_night',
  exemptChildren: true,
  exemptBelowAge: 12,
};

function asCalculationMode(v: unknown): CityTaxCalculationMode {
  if (v === 'per_stay' || v === 'per_night' || v === 'per_person_per_night') return v;
  return 'per_person_per_night';
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

/** Aperçu local (2 adultes · 3 nuits) — aligné srv-orchestrator listing-message-fields. */
export function previewCityTaxBreakdown(
  cfg: CityTaxConfig,
  adults = 2,
  nights = 3,
): { total: string; formula: string } {
  if (!cfg.enabled) {
    return { total: 'Inclus', formula: 'Taxe désactivée' };
  }
  const a = Math.max(1, adults);
  const n = Math.max(1, nights);
  const rate = cfg.amount;
  const cur = cfg.currency;
  let total = rate;
  let formula = '';
  switch (cfg.calculationMode) {
    case 'per_stay':
      formula = `Forfait séjour : ${rate} ${cur}`;
      break;
    case 'per_night':
      total = rate * n;
      formula = `${n} nuit(s) × ${rate} ${cur}/nuit`;
      break;
    default:
      total = rate * a * n;
      formula = `${a} adulte(s) × ${n} nuit(s) × ${rate} ${cur}/adulte/nuit`;
  }
  return { total: `${total} ${cur}`, formula: `${formula} = ${total} ${cur}` };
}
