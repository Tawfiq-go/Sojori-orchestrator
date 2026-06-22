/** Villes Sojori actives pour permissions staff (aligné admin usedInSojoriSysytem). */
const ACTIVE_CITY_NAMES = new Set(['casablanca', 'marrakech', 'rabat']);

function normalizeCityName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function filterStaffSelectableCities<T extends { name: string; usedInSojoriSysytem?: boolean }>(
  cities: T[],
): T[] {
  const flagged = cities.filter((c) => c.usedInSojoriSysytem === true);
  if (flagged.length > 0) return flagged;
  return cities.filter((c) => ACTIVE_CITY_NAMES.has(normalizeCityName(c.name)));
}
