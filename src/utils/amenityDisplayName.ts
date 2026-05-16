function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

/** Même logique que le dashboard (AmenitiesByCategories getDisplayName). */
export function amenityNameToDisplay(name: unknown, currentLang: 'fr' | 'en' = 'fr'): string {
  if (name == null) return '';
  if (typeof name === 'string') return name.trim();
  if (!isRecord(name)) return '';
  const upperLang = currentLang.toUpperCase();
  const lowerLang = currentLang.toLowerCase();
  const fromUpper = asString(name[upperLang]).trim();
  if (fromUpper) return fromUpper;
  const fromLower = asString(name[lowerLang]).trim();
  if (fromLower) return fromLower;
  const en = asString(name.EN).trim() || asString(name.en).trim();
  if (en) return en;
  const first = Object.values(name).find((v) => asString(v).trim());
  return first ? asString(first).trim() : '';
}
