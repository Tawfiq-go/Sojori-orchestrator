/**
 * Semaine ménage — logique pure (aucun import React / axios) : testable
 * node:test. Écran 1 du doc « desktop mobile whatsapp » : villas × 7 jours,
 * un chip par ménage avec ses crédits, l'en-tête de colonne compare la charge
 * à la capacité de l'équipe. La question de l'écran : « quel jour va déborder ? ».
 *
 * Source : GET /tasks/menage/semaine (srv-fulltask).
 */

/* ── Types de l'endpoint ───────────────────────────────────────────────── */

export type SemaineCellKind = 'turnover' | 'arrival' | 'departure' | 'stay' | 'empty';
export type SemaineMenageState = 'a_assigner' | 'assigne' | 'fait';
export type SemaineCell = {
  villaId: string;
  kind: SemaineCellKind;
  menage: { label: string; creditsMin: number; state: SemaineMenageState } | null;
  blocked: boolean;
};
export type SemaineVilla = { id: string; title: string };
export type SemaineDay = {
  ymd: string;
  capacityMin: number;
  fdmCount: number;
  chargeMin: number;
  assignedMin: number;
  doneMin: number;
  loadRatio: number | null;
  tension: boolean;
  cells: SemaineCell[];
};
export type SemaineData = {
  start: string;
  villas: SemaineVilla[];
  days: SemaineDay[];
  totals: { chargeMin: number; capacityMin: number; tensionDays: number };
};

/* ── Formats ───────────────────────────────────────────────────────────── */

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

/** « Sam 29 » — en-tête de colonne. */
export function dayHeaderLabel(ymd: string): string {
  const d = ymdToDate(ymd);
  return `${JOURS[d.getDay()]} ${d.getDate()}`;
}

/** Milliers à la française : « 1 020 » (espace fine insécable). */
export function formatCredits(n: number): string {
  const v = Math.round(n);
  const s = String(Math.abs(v));
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return v < 0 ? `-${grouped}` : grouped;
}

/** Charge totale d'un jour (à faire + assigné) — le numérateur de l'en-tête. */
export function dayLoadMin(day: Pick<SemaineDay, 'chargeMin' | 'assignedMin'>): number {
  return (day.chargeMin || 0) + (day.assignedMin || 0);
}

/** « 165 / 900 » — charge totale vs capacité. */
export function dayLoadLabel(day: Pick<SemaineDay, 'chargeMin' | 'assignedMin' | 'capacityMin'>): string {
  return `${formatCredits(dayLoadMin(day))} / ${formatCredits(day.capacityMin || 0)}`;
}

/** Remplissage % de la capacité, borné 0..100 (le débordement se lit via tension). */
export function dayLoadPct(day: Pick<SemaineDay, 'chargeMin' | 'assignedMin' | 'capacityMin'>): number {
  const cap = day.capacityMin || 0;
  if (cap <= 0) return dayLoadMin(day) > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (dayLoadMin(day) / cap) * 100));
}

/** « 27 août au 2 septembre » — titre de la semaine (mois omis s'il ne change pas). */
export function weekTitle(days: Array<Pick<SemaineDay, 'ymd'>>): string {
  if (days.length === 0) return '';
  const a = ymdToDate(days[0].ymd);
  const b = ymdToDate(days[days.length - 1].ymd);
  const ma = MOIS[a.getMonth()];
  const mb = MOIS[b.getMonth()];
  if (days.length === 1) return `${a.getDate()} ${ma}`;
  return ma === mb
    ? `${a.getDate()} au ${b.getDate()} ${mb}`
    : `${a.getDate()} ${ma} au ${b.getDate()} ${mb}`;
}

/* ── Grille ────────────────────────────────────────────────────────────── */

export type SemaineGridRow = {
  villa: SemaineVilla;
  /** Une case par jour (dans l'ordre de days) — null si absente de la réponse. */
  cells: Array<SemaineCell | null>;
  /** Bloquée tous les jours sans aucun ménage → une seule case sur 7 (façon doc). */
  blockedAll: boolean;
};

/** Villas × jours — cases retrouvées par villaId, ligne « bloquée toute la semaine » détectée. */
export function buildSemaineGrid(data: Pick<SemaineData, 'villas' | 'days'>): SemaineGridRow[] {
  return data.villas.map((villa) => {
    const cells = data.days.map(
      (day) => day.cells.find((c) => c.villaId === villa.id) ?? null,
    );
    const blockedAll =
      cells.length > 0 && cells.every((c) => c != null && c.blocked && c.menage == null);
    return { villa, cells, blockedAll };
  });
}

/* ── Fusion multi-listings & résolution réseau ─────────────────────────── */

/**
 * Fusionne les réponses de plusieurs listings (« Tous les biens ») : villas
 * concaténées ; jours réunis par ymd — charges sommées, capacité = max (même
 * équipe), tension recalculée ; totaux recalculés sur les jours fusionnés.
 */
export function mergeSemaineData(list: SemaineData[]): SemaineData | null {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  const villas: SemaineVilla[] = list.flatMap((d) => d.villas ?? []);
  const byYmd = new Map<string, SemaineDay>();
  for (const data of list) {
    for (const day of data.days ?? []) {
      const prev = byYmd.get(day.ymd);
      if (!prev) {
        byYmd.set(day.ymd, { ...day, cells: [...day.cells] });
      } else {
        prev.chargeMin += day.chargeMin || 0;
        prev.assignedMin += day.assignedMin || 0;
        prev.doneMin += day.doneMin || 0;
        prev.capacityMin = Math.max(prev.capacityMin, day.capacityMin || 0);
        prev.fdmCount = Math.max(prev.fdmCount, day.fdmCount || 0);
        prev.cells.push(...day.cells);
      }
    }
  }
  const days = [...byYmd.values()].sort((a, b) => a.ymd.localeCompare(b.ymd));
  for (const day of days) {
    const load = dayLoadMin(day);
    day.loadRatio = day.capacityMin > 0 ? load / day.capacityMin : null;
    day.tension = day.capacityMin > 0 ? load > day.capacityMin : day.tension;
  }
  return {
    start: list[0].start,
    villas,
    days,
    totals: {
      chargeMin: days.reduce((s, d) => s + dayLoadMin(d), 0),
      capacityMin: days.reduce((s, d) => s + (d.capacityMin || 0), 0),
      tensionDays: days.filter((d) => d.tension).length,
    },
  };
}

export type SemaineFetchResult = { ok: true; data: SemaineData } | { ok: false; notFound: boolean };

export type SemaineState =
  | { state: 'ok'; data: SemaineData }
  | { state: 'empty' }
  | { state: 'unavailable' }
  | { state: 'error' };

/**
 * Les 3 chemins réseau : nominal (au moins un succès avec des villas),
 * vide, indisponible (tous en 404 — backend pas encore déployé), erreur.
 */
export function resolveSemaineFetch(results: SemaineFetchResult[]): SemaineState {
  const successes = results.filter((r): r is Extract<SemaineFetchResult, { ok: true }> => r.ok);
  if (successes.length > 0) {
    const merged = mergeSemaineData(successes.map((r) => r.data));
    if (!merged || (merged.villas?.length ?? 0) === 0) return { state: 'empty' };
    return { state: 'ok', data: merged };
  }
  if (results.length > 0 && results.every((r) => !r.ok && r.notFound)) {
    return { state: 'unavailable' };
  }
  return { state: 'error' };
}
