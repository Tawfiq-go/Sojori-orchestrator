/** Extrait nom / adresse / GPS du listing (form values ou API). */
export type ListingPropertyPlace = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildListingAddress(raw: Record<string, unknown>): string {
  const street = String(raw.address || raw.street || '').trim();
  const cityCountry = [raw.city, raw.region, raw.country]
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .join(', ');
  const line = String(raw.locationLine || '').trim();
  if (street && cityCountry) return `${street} — ${cityCountry}`;
  if (street) return street;
  if (cityCountry) return cityCountry;
  if (line) return line;
  return '';
}

export function listingPropertyFromValues(raw: Record<string, unknown>): ListingPropertyPlace {
  const name = String(raw.name || raw.listingName || 'Logement').trim() || 'Logement';
  const address = buildListingAddress(raw) || '—';
  const lat = num(raw.lat ?? raw.latitude);
  const lng = num(raw.lng ?? raw.longitude);
  return { name, address, lat, lng };
}

export function formatPropertyShort(p: ListingPropertyPlace): string {
  return p.name;
}

export function formatPropertyLine(p: ListingPropertyPlace): string {
  const addr = (p.address && p.address !== '—') ? p.address : '';
  return addr ? `${p.name} — ${addr}` : p.name;
}

/** Détecte un libellé auto-rempli par le logement (à ne pas garder en mode « Autre »). */
export function isAutoPropertyPlaceLabel(value: string, property: ListingPropertyPlace): boolean {
  const v = value.trim();
  if (!v) return false;
  const line = formatPropertyLine(property);
  const short = formatPropertyShort(property);
  if (v === line || v === short) return true;
  if (property.name && v.startsWith(property.name)) return true;
  const addr = property.address && property.address !== '—' ? property.address : '';
  if (addr && v.includes(addr)) return true;
  return false;
}

export function sanitizeFreePlaceLabel(value: string, property: ListingPropertyPlace): string {
  return isAutoPropertyPlaceLabel(value, property) ? '' : value.trim();
}
