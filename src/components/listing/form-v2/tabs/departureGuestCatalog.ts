/**
 * Instructions départ listing — consignes, checklist voyageur, taxes.
 * Source de vérité WhatsApp / snapshot (pas un pull MEWS live).
 */

export type DepartureTaxCalculationMode = 'per_stay' | 'per_night' | 'per_person_per_night'

export type DepartureTaxCollectionMode =
  | 'on_table'
  | 'hand_to_pm'
  | 'cash_on_departure'
  | 'included_in_price'

export type DepartureChecklistItem = {
  id: string
  labelFr: string
  labelEn: string
  enabled: boolean
}

export type DepartureTaxItem = {
  id: string
  labelFr: string
  labelEn: string
  enabled: boolean
  amount: number
  currency: 'MAD' | 'EUR'
  calculationMode: DepartureTaxCalculationMode
  collectionMode: DepartureTaxCollectionMode
}

export type DepartureGuestConfig = {
  instructions: string
  checklist: DepartureChecklistItem[]
  taxes: DepartureTaxItem[]
  exemptChildren: boolean
  exemptBelowAge: number
}

export const DEPARTURE_CHECKLIST_DEFAULTS: DepartureChecklistItem[] = [
  {
    id: 'trash',
    labelFr: 'Sortir les poubelles',
    labelEn: 'Take out the trash',
    enabled: true,
  },
  {
    id: 'dishes',
    labelFr: 'Vaisselle faite / lave-vaisselle lancé',
    labelEn: 'Do the dishes / start the dishwasher',
    enabled: true,
  },
  {
    id: 'windows',
    labelFr: 'Fermer fenêtres et volets',
    labelEn: 'Close windows and shutters',
    enabled: true,
  },
  {
    id: 'lights',
    labelFr: 'Éteindre lumières, clim et chauffage',
    labelEn: 'Turn off lights, AC and heating',
    enabled: true,
  },
  {
    id: 'keys',
    labelFr: 'Laisser les clés à l’endroit indiqué',
    labelEn: 'Leave the keys where indicated',
    enabled: true,
  },
  {
    id: 'belongings',
    labelFr: 'Vérifier n’avoir rien oublié',
    labelEn: 'Check you have not left anything behind',
    enabled: true,
  },
]

export const DEPARTURE_TAX_DEFAULTS: DepartureTaxItem[] = [
  {
    id: 'city_tax',
    labelFr: 'Taxe de séjour',
    labelEn: 'Tourist tax',
    enabled: false,
    amount: 15,
    currency: 'MAD',
    calculationMode: 'per_person_per_night',
    collectionMode: 'on_table',
  },
  {
    id: 'tourism_promotion',
    labelFr: 'Taxe de promotion touristique',
    labelEn: 'Tourism promotion tax',
    enabled: false,
    amount: 11,
    currency: 'MAD',
    calculationMode: 'per_person_per_night',
    collectionMode: 'on_table',
  },
]

const PRESET_CHECKLIST_IDS = new Set(DEPARTURE_CHECKLIST_DEFAULTS.map((row) => row.id))
const PRESET_TAX_IDS = new Set(DEPARTURE_TAX_DEFAULTS.map((row) => row.id))

export function isDepartureChecklistPresetId(id: string): boolean {
  return PRESET_CHECKLIST_IDS.has(id)
}

export function isDepartureTaxPresetId(id: string): boolean {
  return PRESET_TAX_IDS.has(id)
}

export function defaultDepartureGuest(): DepartureGuestConfig {
  return {
    instructions: '',
    checklist: DEPARTURE_CHECKLIST_DEFAULTS.map((row) => ({ ...row })),
    taxes: DEPARTURE_TAX_DEFAULTS.map((row) => ({ ...row })),
    exemptChildren: true,
    exemptBelowAge: 12,
  }
}

function asAmount(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(9999, Math.round(n * 100) / 100)
}

function asAge(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(18, Math.floor(n)))
}

function asCalculationMode(value: unknown, fallback: DepartureTaxCalculationMode): DepartureTaxCalculationMode {
  return value === 'per_stay' || value === 'per_night' || value === 'per_person_per_night'
    ? value
    : fallback
}

function asCollectionMode(value: unknown, fallback: DepartureTaxCollectionMode): DepartureTaxCollectionMode {
  if (value === 'cash_on_arrival') return 'cash_on_departure'
  return value === 'on_table' ||
    value === 'hand_to_pm' ||
    value === 'cash_on_departure' ||
    value === 'included_in_price'
    ? value
    : fallback
}

function asCurrency(value: unknown, fallback: 'MAD' | 'EUR'): 'MAD' | 'EUR' {
  return value === 'EUR' ? 'EUR' : value === 'MAD' ? 'MAD' : fallback
}

function normalizeChecklistItem(
  raw: unknown,
  fallback?: DepartureChecklistItem,
): DepartureChecklistItem | null {
  if (!raw || typeof raw !== 'object') return fallback ? { ...fallback } : null
  const o = raw as Record<string, unknown>
  const id = String(o.id || fallback?.id || '')
    .trim()
    .slice(0, 64)
  if (!id) return null
  const preset = DEPARTURE_CHECKLIST_DEFAULTS.find((row) => row.id === id)
  const base = fallback || preset
  return {
    id,
    labelFr: String(o.labelFr || base?.labelFr || id)
      .trim()
      .slice(0, 80),
    labelEn: String(o.labelEn || o.labelFr || base?.labelEn || id)
      .trim()
      .slice(0, 80),
    enabled: o.enabled !== false,
  }
}

function normalizeTaxItem(raw: unknown, fallback?: DepartureTaxItem): DepartureTaxItem | null {
  if (!raw || typeof raw !== 'object') return fallback ? { ...fallback } : null
  const o = raw as Record<string, unknown>
  const id = String(o.id || fallback?.id || '')
    .trim()
    .slice(0, 64)
  if (!id) return null
  const preset = DEPARTURE_TAX_DEFAULTS.find((row) => row.id === id)
  const base = fallback || preset
  return {
    id,
    labelFr: String(o.labelFr || base?.labelFr || id)
      .trim()
      .slice(0, 80),
    labelEn: String(o.labelEn || o.labelFr || base?.labelEn || id)
      .trim()
      .slice(0, 80),
    enabled: o.enabled === true,
    amount: asAmount(o.amount ?? o.perAdultPerNight, base?.amount ?? 0),
    currency: asCurrency(o.currency, base?.currency ?? 'MAD'),
    calculationMode: asCalculationMode(o.calculationMode, base?.calculationMode ?? 'per_person_per_night'),
    collectionMode: asCollectionMode(o.collectionMode, base?.collectionMode ?? 'on_table'),
  }
}

function instructionsFromListing(listing: Record<string, unknown> | undefined, nested: string): string {
  if (nested.trim()) return nested.trim().slice(0, 4000)
  const mc = listing?.messageCheckout
  if (Array.isArray(mc)) {
    const first = String(mc[0] || mc[1] || '').trim()
    if (first) return first.slice(0, 4000)
  }
  return ''
}

function taxesFromLegacyListing(listing: Record<string, unknown> | undefined): DepartureTaxItem[] {
  const fallback = defaultDepartureGuest().taxes
  if (!listing) return fallback
  const city = fallback.find((t) => t.id === 'city_tax')!
  const tpt = fallback.find((t) => t.id === 'tourism_promotion')!
  const cityEnabled = listing.cityTaxEnabled === true
  const tptEnabled = listing.tourismPromotionTaxEnabled === true
  return [
    {
      ...city,
      enabled: cityEnabled,
      amount: asAmount(listing.cityTaxPerAdultPerNight, city.amount),
      currency: asCurrency(listing.cityTaxCurrency, city.currency),
      calculationMode: asCalculationMode(listing.cityTaxCalculationMode, city.calculationMode),
      collectionMode: asCollectionMode(listing.cityTaxCollectionMode, city.collectionMode),
    },
    {
      ...tpt,
      enabled: tptEnabled,
      amount: asAmount(listing.tourismPromotionTaxPerAdultPerNight, tpt.amount),
      currency: asCurrency(listing.tourismPromotionTaxCurrency, tpt.currency),
      calculationMode: asCalculationMode(
        listing.tourismPromotionTaxCalculationMode,
        tpt.calculationMode,
      ),
      collectionMode: asCollectionMode(listing.tourismPromotionTaxCollectionMode, tpt.collectionMode),
    },
  ]
}

/**
 * Hydrate depuis `departureGuest` + champs listing existants (messageCheckout / cityTax*).
 */
export function normalizeDepartureGuest(
  raw: unknown,
  listing?: Record<string, unknown>,
): DepartureGuestConfig {
  const fallback = defaultDepartureGuest()
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const incomingChecklist = Array.isArray(o.checklist) ? o.checklist : []
  const byCheck = new Map<string, DepartureChecklistItem>()
  for (const preset of fallback.checklist) byCheck.set(preset.id, { ...preset })
  for (const row of incomingChecklist) {
    const item = normalizeChecklistItem(row, byCheck.get(String((row as { id?: unknown })?.id || '')))
    if (item) byCheck.set(item.id, item)
  }
  const extraChecks = incomingChecklist
    .map((row) => normalizeChecklistItem(row))
    .filter((item): item is DepartureChecklistItem => Boolean(item && !PRESET_CHECKLIST_IDS.has(item.id)))

  const incomingTaxes = Array.isArray(o.taxes) ? o.taxes : []
  const legacyTaxes = taxesFromLegacyListing(listing)
  const byTax = new Map<string, DepartureTaxItem>()
  for (const preset of legacyTaxes) byTax.set(preset.id, { ...preset })
  for (const row of incomingTaxes) {
    const item = normalizeTaxItem(row, byTax.get(String((row as { id?: unknown })?.id || '')))
    if (item) byTax.set(item.id, item)
  }
  const extraTaxes = incomingTaxes
    .map((row) => normalizeTaxItem(row))
    .filter((item): item is DepartureTaxItem => Boolean(item && !PRESET_TAX_IDS.has(item.id)))

  const instructions = instructionsFromListing(listing, String(o.instructions || ''))
  const exemptChildren =
    o.exemptChildren !== undefined
      ? o.exemptChildren !== false
      : listing?.cityTaxExemptChildren !== false
  const exemptBelowAge = asAge(
    o.exemptBelowAge ?? listing?.cityTaxExemptBelowAge,
    fallback.exemptBelowAge,
  )

  return {
    instructions,
    checklist: [...fallback.checklist.map((p) => byCheck.get(p.id) || p), ...extraChecks],
    taxes: [...legacyTaxes.map((p) => byTax.get(p.id) || p), ...extraTaxes],
    exemptChildren,
    exemptBelowAge,
  }
}

export function mapDepartureGuestToListingPatch(cfg: DepartureGuestConfig): Record<string, unknown> {
  const city = cfg.taxes.find((t) => t.id === 'city_tax')
  const tpt = cfg.taxes.find((t) => t.id === 'tourism_promotion')
  const instructions = cfg.instructions.trim()
  return {
    departureGuest: cfg,
    messageCheckout: instructions ? [instructions, instructions] : [],
    cityTaxEnabled: city?.enabled === true,
    cityTaxPerAdultPerNight: city?.amount ?? 0,
    cityTaxCurrency: city?.currency ?? 'MAD',
    cityTaxCalculationMode: city?.calculationMode ?? 'per_person_per_night',
    cityTaxCollectionMode: city?.collectionMode ?? 'on_table',
    cityTaxExemptChildren: cfg.exemptChildren,
    cityTaxExemptBelowAge: cfg.exemptBelowAge,
    tourismPromotionTaxEnabled: tpt?.enabled === true,
    tourismPromotionTaxPerAdultPerNight: tpt?.amount ?? 0,
    tourismPromotionTaxCurrency: tpt?.currency ?? 'MAD',
    tourismPromotionTaxCalculationMode: tpt?.calculationMode ?? 'per_person_per_night',
    tourismPromotionTaxCollectionMode: tpt?.collectionMode ?? 'on_table',
    tourismPromotionTaxExemptChildren: cfg.exemptChildren,
    tourismPromotionTaxExemptBelowAge: cfg.exemptBelowAge,
  }
}

export function computeDepartureTaxTotal(
  tax: Pick<DepartureTaxItem, 'enabled' | 'amount' | 'calculationMode'>,
  adults: number,
  nights: number,
): number {
  if (!tax.enabled) return 0
  const a = Math.max(1, adults || 1)
  const n = Math.max(1, nights || 1)
  switch (tax.calculationMode) {
    case 'per_stay':
      return tax.amount
    case 'per_night':
      return tax.amount * n
    default:
      return tax.amount * a * n
  }
}

export function departureGuestForSnapshot(listing: Record<string, unknown>): {
  instructions: string
  checklist: Array<{ id: string; labelFr: string; labelEn: string }>
  taxes: Array<{
    id: string
    labelFr: string
    labelEn: string
    enabled: boolean
    amount: number
    currency: string
    calculationMode: string
    collectionMode: string
  }>
  exemptChildren: boolean
  exemptBelowAge: number
} {
  const cfg = normalizeDepartureGuest(listing.departureGuest, listing)
  return {
    instructions: cfg.instructions,
    checklist: cfg.checklist
      .filter((row) => row.enabled)
      .map((row) => ({ id: row.id, labelFr: row.labelFr, labelEn: row.labelEn })),
    taxes: cfg.taxes.map((row) => ({
      id: row.id,
      labelFr: row.labelFr,
      labelEn: row.labelEn,
      enabled: row.enabled,
      amount: row.amount,
      currency: row.currency,
      calculationMode: row.calculationMode,
      collectionMode: row.collectionMode,
    })),
    exemptChildren: cfg.exemptChildren,
    exemptBelowAge: cfg.exemptBelowAge,
  }
}
