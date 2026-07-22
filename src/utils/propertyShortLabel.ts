/**
 * Libellé compact pour axes / listes denses (ex. 100 biens) :
 * 2 premières lettres/chiffres du nom, majuscules. Collision → AN2, AN3…
 */
export function propertyShortLabel(name: string, usedCounts?: Map<string, number>): string {
  const compact = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  const base = (compact.slice(0, 2) || '??').toUpperCase();
  if (!usedCounts) return base;
  const n = (usedCounts.get(base) ?? 0) + 1;
  usedCounts.set(base, n);
  return n === 1 ? base : `${base}${n}`;
}

export function withPropertyShortLabels<T extends { property: string }>(
  rows: T[],
): Array<T & { shortLabel: string }> {
  const used = new Map<string, number>();
  return rows.map((row) => ({
    ...row,
    shortLabel: propertyShortLabel(row.property, used),
  }));
}
