export type StayVerifyPer = 'reservation' | 'person' | 'adult';

export type StayVerifyItem = {
  id: string;
  labelFr: string;
  labelEn: string;
  enabled: boolean;
  qty: number;
  per: StayVerifyPer;
};

export type StayVerifyPhotos = {
  include: boolean;
  source: 'none' | 'fixed' | 'fdm';
  fixedUrls: string[];
};

export type StayVerifyConfig = {
  items: StayVerifyItem[];
  photos: StayVerifyPhotos;
};

export const STAY_VERIFY_DEFAULT_ITEMS: StayVerifyItem[] = [
  { id: 'tv', labelFr: 'Télé', labelEn: 'TV', enabled: true, qty: 1, per: 'reservation' },
  { id: 'oven', labelFr: 'Four', labelEn: 'Oven', enabled: true, qty: 1, per: 'reservation' },
  { id: 'fridge', labelFr: 'Frigo', labelEn: 'Fridge', enabled: true, qty: 1, per: 'reservation' },
  { id: 'coffee', labelFr: 'Café', labelEn: 'Coffee maker', enabled: true, qty: 1, per: 'reservation' },
  { id: 'towel_large', labelFr: 'Grande serviette', labelEn: 'Bath towel', enabled: true, qty: 2, per: 'person' },
  { id: 'towel_small', labelFr: 'Petite serviette', labelEn: 'Hand towel', enabled: true, qty: 1, per: 'person' },
  { id: 'bathrobe', labelFr: 'Peignoir', labelEn: 'Bathrobe', enabled: true, qty: 1, per: 'adult' },
  { id: 'slippers', labelFr: 'Chaussons', labelEn: 'Slippers', enabled: false, qty: 1, per: 'person' },
];

const PRESET_IDS = new Set(STAY_VERIFY_DEFAULT_ITEMS.map((row) => row.id));

export function isStayVerifyPresetId(id: string): boolean {
  return PRESET_IDS.has(id);
}

export function defaultStayVerify(): StayVerifyConfig {
  return {
    items: STAY_VERIFY_DEFAULT_ITEMS.map((row) => ({ ...row })),
    photos: { include: false, source: 'none', fixedUrls: [] },
  };
}

function asQty(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(99, Math.floor(n));
}

function asPer(value: unknown, fallback: StayVerifyPer): StayVerifyPer {
  return value === 'person' || value === 'adult' || value === 'reservation'
    ? value
    : fallback;
}

export function normalizeStayVerify(raw: unknown): StayVerifyConfig {
  const fallback = defaultStayVerify();
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  const incoming = Array.isArray(o.items) ? o.items : [];
  const byId = new Map(fallback.items.map((row) => [row.id, { ...row }]));
  const extras: StayVerifyItem[] = [];
  for (const row of incoming) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = String(r.id || '').trim().slice(0, 64);
    if (!id) continue;
    const preset = byId.get(id);
    const item: StayVerifyItem = {
      id,
      labelFr: String(r.labelFr || preset?.labelFr || id).trim().slice(0, 80),
      labelEn: String(r.labelEn || r.labelFr || preset?.labelEn || id).trim().slice(0, 80),
      enabled: r.enabled !== false,
      qty: asQty(r.qty, preset?.qty ?? 1),
      per: asPer(r.per, preset?.per ?? 'reservation'),
    };
    if (preset) byId.set(id, item);
    else extras.push(item);
  }
  const photosRaw = o.photos && typeof o.photos === 'object' ? (o.photos as Record<string, unknown>) : {};
  const include = photosRaw.include === true;
  const sourceRaw = String(photosRaw.source || 'none');
  const source: StayVerifyPhotos['source'] =
    !include ? 'none' : sourceRaw === 'fixed' || sourceRaw === 'fdm' ? sourceRaw : 'none';
  const fixedUrls =
    include && source === 'fixed'
      ? (Array.isArray(photosRaw.fixedUrls) ? photosRaw.fixedUrls : [])
          .map((u) => String(u || '').trim())
          .filter((u) => /^https:\/\//i.test(u))
          .slice(0, 8)
      : [];
  return {
    items: [...fallback.items.map((p) => byId.get(p.id) || p), ...extras],
    photos: { include, source, fixedUrls },
  };
}
