/**
 * Équipe ménage — logique pure (aucun import React / axios) : testable
 * node:test. Écran 8 du doc « écrans web complémentaires » : qui travaille
 * quand, quelle capacité, qui appeler. Ni note, ni score de productivité —
 * interdits par le doc.
 *
 * Source : GET /tasks/menage/equipe + PATCH …/equipe/:staffId/capacity.
 */
import type { SemaineDay } from './semaineLogic';
import { dayLoadMin } from './semaineLogic';

/* ── Types de l'endpoint ───────────────────────────────────────────────── */

export type EquipePayMode = 'per_task' | 'hourly' | 'monthly' | 'unknown';
export type EquipeRow = {
  id: string;
  name: string;
  phone: string;
  lang: string;
  taskTypes: string[];
  /** Jours travaillés — ISO 1..7 (lundi=1 … dimanche=7 ; 0 accepté = dimanche). */
  workDays: number[];
  hourStart: string;
  hourEnd: string;
  payMode: EquipePayMode;
  amount: number;
  capacityMin: number;
  /** Présence sur les 7 ymds de la réponse. */
  presence: boolean[];
};
export type EquipeDay = { ymd: string; fdmCount: number; capacityMin: number };
export type EquipeData = { ymds: string[]; rows: EquipeRow[]; days: EquipeDay[] };

/* ── Capacité ──────────────────────────────────────────────────────────── */

export const CAPACITY_MIN = 30;
export const CAPACITY_MAX = 720;
export const CAPACITY_DEFAULT = 300;

/** Borne un plafond de crédits comme le serveur (30–720), entiers. */
export function clampCapacity(v: number): number {
  if (!Number.isFinite(v)) return CAPACITY_DEFAULT;
  return Math.max(CAPACITY_MIN, Math.min(CAPACITY_MAX, Math.round(v)));
}

/** Capacité de la semaine = somme des capacités jour (minutes). */
export function weekCapacityMin(days: Array<Pick<EquipeDay, 'capacityMin'>>): number {
  return days.reduce((sum, d) => sum + (d.capacityMin || 0), 0);
}

/**
 * Mise à jour OPTIMISTE du plafond d'une personne — retourne un nouveau
 * tableau (l'ancien sert de rollback si le PATCH échoue).
 */
export function applyCapacityPatch(
  rows: EquipeRow[],
  staffId: string,
  capacityMin: number,
): EquipeRow[] {
  return rows.map((r) => (r.id === staffId ? { ...r, capacityMin: clampCapacity(capacityMin) } : r));
}

/* ── Jours travaillés ──────────────────────────────────────────────────── */

export const WEEKDAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** workDays (ISO 1..7, 0 toléré = dimanche) → 7 drapeaux L·M·M·J·V·S·D. */
export function workDayFlags(workDays: number[]): boolean[] {
  const flags = new Array<boolean>(7).fill(false);
  for (const d of workDays || []) {
    if (d >= 1 && d <= 7) flags[d - 1] = true;
    else if (d === 0) flags[6] = true;
  }
  return flags;
}

/* ── Formats ───────────────────────────────────────────────────────────── */

/** Salaire affiché tel quel — « Non connu » si inconnu, jamais de calcul. */
export function payLabel(payMode: EquipePayMode, amount: number): string {
  if (payMode === 'unknown' || !Number.isFinite(amount) || amount <= 0) return 'Non connu';
  const n = Math.round(amount);
  if (payMode === 'per_task') return `${n} MAD / ménage`;
  if (payMode === 'hourly') return `${n} MAD / h`;
  if (payMode === 'monthly') return `${n} MAD / mois`;
  return 'Non connu';
}

/** « 09:00 » → « 9h » / « 09:30 » → « 9h30 » ; plage « 9h – 18h ». */
export function hoursLabel(hourStart: string, hourEnd: string): string {
  const one = (v: string): string | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim());
    if (!m) return null;
    return m[2] === '00' ? `${Number(m[1])}h` : `${Number(m[1])}h${m[2]}`;
  };
  const a = one(hourStart);
  const b = one(hourEnd);
  if (!a || !b) return '—';
  return `${a} – ${b}`;
}

const JOURS_FULL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « samedi » — nom complet du jour d'un ymd. */
export function dayFullName(ymd: string): string {
  return JOURS_FULL[new Date(`${ymd}T12:00:00`).getDay()];
}

/** Lien WhatsApp : wa.me + chiffres seuls. */
export function waLink(phone: string): string | null {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

/* ── Le trou (jour en tension) — depuis la Semaine ─────────────────────── */

export type EquipeHole = { ymd: string; missingMin: number };

/**
 * Pire jour en tension de la semaine : charge − capacité maximum.
 * null si aucun jour ne déborde.
 */
export function holeFromSemaine(
  days: Array<Pick<SemaineDay, 'ymd' | 'chargeMin' | 'assignedMin' | 'capacityMin' | 'tension'>>,
): EquipeHole | null {
  let worst: EquipeHole | null = null;
  for (const day of days || []) {
    if (!day.tension) continue;
    const missing = dayLoadMin(day) - (day.capacityMin || 0);
    if (missing > 0 && (!worst || missing > worst.missingMin)) {
      worst = { ymd: day.ymd, missingMin: missing };
    }
  }
  return worst;
}

/* ── Fusion multi-listings & résolution réseau ─────────────────────────── */

/**
 * Fusionne les réponses de plusieurs listings : même équipe → personnes
 * dédupliquées par id ; jours réunis par ymd (capacité / effectif = max).
 */
export function mergeEquipeData(list: EquipeData[]): EquipeData | null {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  const rowsById = new Map<string, EquipeRow>();
  const daysByYmd = new Map<string, EquipeDay>();
  for (const data of list) {
    for (const row of data.rows ?? []) {
      if (!rowsById.has(row.id)) rowsById.set(row.id, row);
    }
    for (const day of data.days ?? []) {
      const prev = daysByYmd.get(day.ymd);
      if (!prev) daysByYmd.set(day.ymd, { ...day });
      else {
        prev.capacityMin = Math.max(prev.capacityMin, day.capacityMin || 0);
        prev.fdmCount = Math.max(prev.fdmCount, day.fdmCount || 0);
      }
    }
  }
  const days = [...daysByYmd.values()].sort((a, b) => a.ymd.localeCompare(b.ymd));
  return {
    ymds: list[0].ymds?.length ? list[0].ymds : days.map((d) => d.ymd),
    rows: [...rowsById.values()],
    days,
  };
}

export type EquipeFetchResult = { ok: true; data: EquipeData } | { ok: false; notFound: boolean };

export type EquipeState =
  | { state: 'ok'; data: EquipeData }
  | { state: 'empty' }
  | { state: 'unavailable' }
  | { state: 'error' };

/** Les 3 chemins réseau : nominal / vide (aucune personne) / 404 partout / erreur. */
export function resolveEquipeFetch(results: EquipeFetchResult[]): EquipeState {
  const successes = results.filter((r): r is Extract<EquipeFetchResult, { ok: true }> => r.ok);
  if (successes.length > 0) {
    const merged = mergeEquipeData(successes.map((r) => r.data));
    if (!merged || (merged.rows?.length ?? 0) === 0) return { state: 'empty' };
    return { state: 'ok', data: merged };
  }
  if (results.length > 0 && results.every((r) => !r.ok && r.notFound)) {
    return { state: 'unavailable' };
  }
  return { state: 'error' };
}
