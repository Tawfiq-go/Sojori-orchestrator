/**
 * Priorité affichage planning : une réservation Sojori « gagne » contre un
 * CalendarBlock (Import initial ou blocage manuel) sur les jours en commun.
 * Les segments de blocage restants (hors séjour) restent visibles.
 *
 * Plages en demi-ouvert [start, end) — yyyy-MM-dd.
 */

export type IsoHalfOpen = { start: string; end: string };

export function isoPlusDays(iso: string, days: number): string {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Bloc calendrier : dateFrom / dateTo inclusifs → [start, end). */
export function inclusiveBlockToHalfOpen(dateFrom: string, dateToInclusive: string): IsoHalfOpen {
  return {
    start: String(dateFrom).slice(0, 10),
    end: isoPlusDays(String(dateToInclusive), 1),
  };
}

export function rangesOverlap(a: IsoHalfOpen, b: IsoHalfOpen): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Retire chaque cut des segments ; conserve uniquement les parties libres. */
export function subtractCutsFromRange(
  range: IsoHalfOpen,
  cuts: IsoHalfOpen[],
): IsoHalfOpen[] {
  let segs: IsoHalfOpen[] = range.start < range.end ? [range] : [];
  for (const cut of cuts) {
    if (!(cut.start < cut.end)) continue;
    const next: IsoHalfOpen[] = [];
    for (const s of segs) {
      if (!rangesOverlap(s, cut)) {
        next.push(s);
        continue;
      }
      if (cut.start > s.start) next.push({ start: s.start, end: cut.start });
      if (cut.end < s.end) next.push({ start: cut.end, end: s.end });
    }
    segs = next;
  }
  return segs.filter((s) => s.start < s.end);
}

/**
 * Pour un listing : transforme les blocs en segments [start,end) qui
 * ne chevauchent aucune réservation (arrivée inclusive, départ exclusif).
 */
export function freeBlockSegmentsAfterReservations(params: {
  blockDateFrom: string;
  blockDateToInclusive: string;
  reservations: Array<{ arrivalDate?: string | null; departureDate?: string | null }>;
}): IsoHalfOpen[] {
  const block = inclusiveBlockToHalfOpen(params.blockDateFrom, params.blockDateToInclusive);
  const cuts: IsoHalfOpen[] = [];
  for (const r of params.reservations) {
    const start = String(r.arrivalDate || '').slice(0, 10);
    const end = String(r.departureDate || '').slice(0, 10);
    if (start && end && start < end) cuts.push({ start, end });
  }
  return subtractCutsFromRange(block, cuts);
}
