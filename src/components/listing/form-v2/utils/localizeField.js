/** Extrait une chaîne depuis un champ API string ou { fr, en, ar }. */
export function localizeField(value, fallback = '') {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const fr = value.fr;
    const en = value.en;
    const ar = value.ar;
    if (typeof fr === 'string' && fr) return fr;
    if (typeof en === 'string' && en) return en;
    if (typeof ar === 'string' && ar) return ar;
    const first = Object.values(value).find((v) => typeof v === 'string' && v);
    return typeof first === 'string' ? first : fallback;
  }
  return String(value);
}
