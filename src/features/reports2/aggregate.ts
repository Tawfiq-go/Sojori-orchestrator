import type { PerfReservation } from './performanceApi';

/**
 * Agregation LCD : par mois, par proprietaire, par bien.
 *
 * Deux differences de fond avec l'hotel :
 *
 *  - **L'occupation se lit au mois**, pas au jour. Le gestionnaire couvre un
 *    loyer ou justifie une commission sur un cycle mensuel ; savoir que le
 *    12 mars etait plein ne lui sert a rien.
 *  - **Les nuitees d'un sejour a cheval sont reparties** entre les mois
 *    qu'il traverse. Les rattacher au seul mois de depart gonflerait un mois
 *    et vider ait l'autre.
 */

const DAY_MS = 86_400_000;

/** Cle « YYYY-MM » d'une date. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Nombre de jours du mois d'une cle « YYYY-MM ». */
export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Repartit les nuitees d'un sejour sur les mois traverses.
 *
 * Une nuitee appartient au mois de la nuit passee, donc au jour d'arrivee :
 * un sejour du 30 juin au 2 juillet compte 1 nuit en juin, 1 en juillet.
 * La nuit du depart n'existe pas.
 */
export function nightsByMonth(arrival: string, departure: string): Map<string, number> {
  const out = new Map<string, number>();
  const a = new Date(arrival);
  const d = new Date(departure);
  if (Number.isNaN(a.getTime()) || Number.isNaN(d.getTime()) || d <= a) return out;

  const start = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  for (let t = start; t < end; t += DAY_MS) {
    const k = monthKey(new Date(t));
    out.set(k, (out.get(k) || 0) + 1);
  }
  return out;
}

export type MonthCell = {
  key: string;
  nights: number;
  revenue: number;
  cleaning: number;
  otaCommission: number;
  reservations: number;
  /** Vrai des qu'une part du mois est encore a venir. */
  future: boolean;
};

/**
 * Serie mensuelle du portefeuille.
 *
 * `today` decide de la frontiere realise / carnet : un mois est marque
 * `future` des lors qu'il n'est pas entierement passe. Cette frontiere est
 * ce que l'ecran materialise par un trait — elle ne doit pas etre deduite
 * de la presence de donnees, sans quoi un mois creux passerait pour futur.
 */
export function monthlySeries(
  rows: PerfReservation[],
  opts: { from: string; to: string; today?: Date },
): MonthCell[] {
  const today = opts.today ?? new Date();
  const cells = new Map<string, MonthCell>();

  const from = new Date(opts.from);
  const to = new Date(opts.to);
  for (
    let y = from.getUTCFullYear(), m = from.getUTCMonth();
    y < to.getUTCFullYear() || (y === to.getUTCFullYear() && m <= to.getUTCMonth());
    m === 11 ? ((y += 1), (m = 0)) : (m += 1)
  ) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    // Un mois est « futur » des qu'il n'est pas entierement ecoule.
    const lastDay = new Date(Date.UTC(y, m + 1, 0));
    cells.set(key, {
      key,
      nights: 0,
      revenue: 0,
      cleaning: 0,
      otaCommission: 0,
      reservations: 0,
      future: lastDay.getTime() >= Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      ),
    });
  }

  for (const r of rows) {
    if (!r.arrivalDate || !r.departureDate) continue;
    const spread = nightsByMonth(r.arrivalDate, r.departureDate);
    const total = [...spread.values()].reduce((s, x) => s + x, 0);
    if (!total) continue;

    for (const [key, nights] of spread) {
      const cell = cells.get(key);
      if (!cell) continue;
      // Le revenu suit les nuitees : un sejour a cheval ne doit pas
      // s'imputer en entier sur son mois de depart.
      const share = nights / total;
      cell.nights += nights;
      cell.revenue += (r.grossRevenue || 0) * share;
      cell.cleaning += (r.cleaningFee || 0) * share;
      cell.otaCommission += (r.otaCommission || 0) * share;
      cell.reservations += share;
    }
  }

  return [...cells.values()];
}

export type UnitRow = {
  listingId: string;
  listingName: string;
  nights: number;
  revenue: number;
  cleaning: number;
  otaCommission: number;
  reservations: number;
};

/** Regroupement par bien sur une plage de mois donnee. */
export function byUnit(rows: PerfReservation[], months: Set<string>): UnitRow[] {
  const map = new Map<string, UnitRow>();
  for (const r of rows) {
    if (!r.arrivalDate || !r.departureDate) continue;
    const id = r.listingId || '';
    if (!id) continue;
    const spread = nightsByMonth(r.arrivalDate, r.departureDate);
    const total = [...spread.values()].reduce((s, x) => s + x, 0);
    if (!total) continue;

    let nights = 0;
    for (const [k, v] of spread) if (months.has(k)) nights += v;
    if (!nights) continue;
    const share = nights / total;

    const cur = map.get(id) || {
      listingId: id,
      listingName: r.listingName || id,
      nights: 0,
      revenue: 0,
      cleaning: 0,
      otaCommission: 0,
      reservations: 0,
    };
    cur.nights += nights;
    cur.revenue += (r.grossRevenue || 0) * share;
    cur.cleaning += (r.cleaningFee || 0) * share;
    cur.otaCommission += (r.otaCommission || 0) * share;
    cur.reservations += share;
    map.set(id, cur);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

/**
 * Taux d'occupation mensuel d'un bien.
 *
 * `null` quand le denominateur est inconnu — jamais 0, qui se lirait comme
 * « vide » alors qu'il signifie « indeterminable ».
 */
export function occupancy(
  nights: number,
  monthKeys: string[],
  opts?: { units?: number; blockedDays?: number },
): number | null {
  const units = opts?.units ?? 1;
  if (units <= 0) return null;
  // Capacite = jours du mois x nombre de biens. Un portefeuille de 6 biens
  // sur un mois de 30 jours offre 180 nuits, pas 30.
  const gross = monthKeys.reduce((s, k) => s + daysInMonth(k), 0) * units;
  // Les jours bloques sortent du denominateur : un appartement retire de la
  // vente n'est pas une occasion manquee, il n'etait pas a vendre.
  const capacity = gross - (opts?.blockedDays ?? 0);
  if (capacity <= 0) return null;
  return Math.min(1, nights / capacity);
}
