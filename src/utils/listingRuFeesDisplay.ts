type FeeRow = {
  feeTaxType?: string;
  discriminatorId?: string;
  value?: number;
  category?: string;
  ruName?: string;
};

export type RuFeesTableRow = {
  kind: string;
  typeLabel: string;
  nameFr: string;
  nameRu: string;
  calcLabel: string;
  value: number;
  collectLabel: string;
};

const DISCRIMINATOR_FR: Record<string, string> = {
  '1': 'Montant par séjour',
  '2': 'Par nuit',
  '5': 'Par personne (séjour)',
  '6': 'Montant par personne et par nuit',
  '7': 'Par personne/semaine',
  '8': 'Par semaine',
};

export const RU_FEE_META: Record<string, { typeLabel: string; nameFr: string; nameRu: string }> = {
  cleaning: { typeLabel: 'Frais', nameFr: 'Frais de nettoyage', nameRu: 'CleaningFee' },
  city_tax: { typeLabel: 'Taxe', nameFr: 'Taxe de séjour', nameRu: 'TouristTax' },
  resort_fee: { typeLabel: 'Frais', nameFr: "Taxe d'établissement", nameRu: 'ResortFee' },
};

const FEE_META = RU_FEE_META;

function metaForFee(row: FeeRow) {
  const key = String(row.feeTaxType || '').trim();
  const ruName = String(row.ruName || '').trim();
  if (FEE_META[key]) return FEE_META[key];
  const ruLower = ruName.toLowerCase();
  if (ruLower.includes('clean')) return FEE_META.cleaning;
  if (ruLower.includes('tourist')) return FEE_META.city_tax;
  if (ruLower.includes('resort')) return FEE_META.resort_fee;
  const cat = String(row.category || '').toLowerCase();
  return {
    typeLabel: cat === 'tax' ? 'Taxe' : 'Frais',
    nameFr: ruName || key || 'Autre',
    nameRu: ruName || key,
  };
}

export function ruFeeCalcLabel(discriminatorId?: string): string {
  return DISCRIMINATOR_FR[String(discriminatorId || '1')] || 'Montant par séjour';
}

/** Tableau aligné Rentals United (Frais et taxes). */
export function buildRuFeesTableRows(values: Record<string, unknown>): RuFeesTableRow[] {
  const rows: RuFeesTableRow[] = [];
  const seen = new Set<string>();
  const push = (row: FeeRow, kind: string) => {
    if (seen.has(kind)) return;
    seen.add(kind);
    const meta = metaForFee({ ...row, feeTaxType: kind });
    rows.push({
      kind,
      typeLabel: meta.typeLabel,
      nameFr: meta.nameFr,
      nameRu: meta.nameRu,
      calcLabel: ruFeeCalcLabel(row.discriminatorId),
      value: Number(row.value ?? 0),
      collectLabel: 'Lors de la réservation',
    });
  };

  const additional = Array.isArray(values.additionalFees) ? values.additionalFees : [];
  for (const raw of additional) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as FeeRow;
    const kind = String(row.feeTaxType || '').trim();
    if (!kind) continue;
    push(row, kind);
  }

  if (!seen.has('cleaning') && values.cleaningFeeEnabled === true) {
    push(
      {
        feeTaxType: 'cleaning',
        discriminatorId: String(values.cleaningFeeDiscriminator || '1'),
        value: Number(values.cleaningFee ?? 0),
        category: 'fee',
        ruName: 'CleaningFee',
      },
      'cleaning',
    );
  }
  if (!seen.has('city_tax') && values.cityTaxEnabled === true) {
    push(
      {
        feeTaxType: 'city_tax',
        discriminatorId: String(values.cityTaxDiscriminator || '6'),
        value: Number(values.cityTaxPerAdult ?? values.cityTaxPerAdultPerNight ?? 0),
        category: 'tax',
        ruName: 'TouristTax',
      },
      'city_tax',
    );
  }

  return rows.sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr'));
}

const KNOWN_EDITABLE_FEE_TYPES = new Set(['cleaning', 'city_tax']);

/** Frais RU importés hors ménage / taxe (ex. resort_fee) — éditables + supprimables. */
export type OtherRuFeeRow = RuFeesTableRow & {
  enabled: boolean;
  discriminatorId: string;
};

export function getOtherRuAdditionalFees(values: Record<string, unknown>): OtherRuFeeRow[] {
  const additional = Array.isArray(values.additionalFees) ? values.additionalFees : [];
  const rows: OtherRuFeeRow[] = [];
  for (const raw of additional) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as FeeRow & { enabled?: boolean };
    const kind = String(row.feeTaxType || '').trim();
    if (!kind || KNOWN_EDITABLE_FEE_TYPES.has(kind)) continue;
    const value = Number(row.value ?? 0);
    const enabled = row.enabled === true || (row.enabled !== false && value > 0);
    if (!enabled && value <= 0) continue;
    const meta = metaForFee({ ...row, feeTaxType: kind });
    rows.push({
      kind,
      typeLabel: meta.typeLabel,
      nameFr: meta.nameFr,
      nameRu: meta.nameRu,
      calcLabel: ruFeeCalcLabel(row.discriminatorId),
      value,
      collectLabel: 'Lors de la réservation',
      enabled,
      discriminatorId: String(row.discriminatorId || '1'),
    });
  }
  return rows.sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr'));
}

/** Fusionne ménage + taxe + autres frais pour update-property. */
export function buildAdditionalFeesSavePayload(values: Record<string, unknown>): Array<{
  feeTaxType: string;
  discriminatorId: string;
  value: number;
  category: string;
  ruName: string;
}> {
  const out: Array<{
    feeTaxType: string;
    discriminatorId: string;
    value: number;
    category: string;
    ruName: string;
  }> = [];

  if (values.cleaningFeeEnabled === true) {
    out.push({
      feeTaxType: 'cleaning',
      discriminatorId: String(values.cleaningFeeDiscriminator || '1'),
      value: Number(values.cleaningFee ?? 0),
      category: 'fee',
      ruName: 'CleaningFee',
    });
  }
  if (values.cityTaxEnabled === true) {
    out.push({
      feeTaxType: 'city_tax',
      discriminatorId: String(values.cityTaxDiscriminator || '6'),
      value: Number(values.cityTaxPerAdult ?? values.cityTaxPerAdultPerNight ?? 0),
      category: 'tax',
      ruName: 'TouristTax',
    });
  }

  const additional = Array.isArray(values.additionalFees) ? values.additionalFees : [];
  for (const raw of additional) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as FeeRow & { enabled?: boolean };
    const kind = String(row.feeTaxType || '').trim();
    if (!kind || KNOWN_EDITABLE_FEE_TYPES.has(kind)) continue;
    const enabled = row.enabled === true || (row.enabled !== false && Number(row.value ?? 0) > 0);
    if (!enabled) continue;
    const value = Number(row.value ?? 0);
    if (value <= 0) continue;
    const meta = metaForFee({ ...row, feeTaxType: kind });
    out.push({
      feeTaxType: kind,
      discriminatorId: String(row.discriminatorId || '1'),
      value,
      category: String(row.category || (meta.typeLabel === 'Taxe' ? 'tax' : 'fee')),
      ruName: String(row.ruName || meta.nameRu),
    });
  }
  return out;
}

/** Ligne récap RU pour un frais éditable (ménage / taxe). */
export function buildRuFeeSummaryLine(
  feeTaxType: 'cleaning' | 'city_tax',
  enabled: boolean,
  discriminatorId: string | undefined,
  value: number | undefined,
  currency: string,
): string {
  if (!enabled) {
    return 'Désactivé — non inclus dans le XML envoyé à Rentals United.';
  }
  const meta = RU_FEE_META[feeTaxType];
  const amount = Number(value ?? 0);
  return `RU → ${meta.nameRu} · ${ruFeeCalcLabel(discriminatorId)} · ${amount} ${currency} · Lors de la réservation`;
}

export function formatDepositRuLabel(amount: number | undefined, currency = 'MAD'): string {
  const n = Number(amount ?? 0);
  return `${n.toFixed(2)} ${currency}`;
}

export function formatCancellationPolicySummary(
  policies: Array<{ from?: number; to?: number; value?: number }> | undefined,
): string {
  if (!Array.isArray(policies) || policies.length === 0) return 'Non définie';
  return policies
    .map((p) => {
      const from = Number(p.from ?? 0);
      const to = Number(p.to ?? 0);
      const val = Number(p.value ?? 0);
      return `${from}–${to} j avant arrivée : ${val}% pénalité`;
    })
    .join(' · ');
}
