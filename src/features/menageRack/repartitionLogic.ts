/**
 * Répartition ménage — logique pure (aucun import React / axios) : testable
 * node:test. Écran 3 des docs de conception (version crédits) : une colonne
 * par femme de ménage avec jauge de crédits (1 crédit = 1 minute), la colonne
 * « À assigner » en tête de lecture. V1 lecture seule.
 *
 * Source : GET /tasks/menage/repartition (srv-fulltask).
 */
import { durationLabel } from './rackLogic';

/* ── Types de l'endpoint ───────────────────────────────────────────────── */

export type RepartitionTaskStatus = 'todo' | 'doing' | 'done';
export type RepartitionTask = {
  roomName: string;
  label: string;
  status: RepartitionTaskStatus;
  hm: string | null;
  durationMin: number;
};
export type RepartitionColumn = {
  id: string;
  name: string;
  worksToday: boolean;
  capacityMin: number;
  assignedMin: number;
  remainingMin: number;
  overCapacity: boolean;
  tasks: RepartitionTask[];
};
export type RepartitionUnassigned = {
  id: string;
  roomName: string;
  label: string;
  durationMin: number;
};
export type RepartitionData = {
  date: string;
  capacityMin: number;
  columns: RepartitionColumn[];
  unassigned: RepartitionUnassigned[];
  totals: { assignedMin: number; unassignedMin: number; doneMin: number };
};

/* ── Jauges & formats ──────────────────────────────────────────────────── */

/** Remplissage de la jauge de crédits, borné 0..100 (le dépassement se lit via overCapacity). */
export function gaugePct(assignedMin: number, capacityMin: number): number {
  if (capacityMin <= 0) return assignedMin > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (assignedMin / capacityMin) * 100));
}

/** Minutes → libellé heures (« 3h15 », « 45 min », « 0 min »). */
export function minutesLabel(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '0 min';
  return durationLabel(Math.round(min));
}

/** « 195 / 300 » — jauge de crédits façon doc (1 crédit = 1 minute). */
export function creditsLabel(assignedMin: number, capacityMin: number): string {
  return `${Math.round(assignedMin)} / ${Math.round(capacityMin)}`;
}

/* ── Tri ───────────────────────────────────────────────────────────────── */

/**
 * Ordre de lecture des colonnes : celles qui travaillent aujourd'hui d'abord
 * (dépassements en tête — c'est là qu'on agit), les (repos) à la fin.
 */
export function sortRepartitionColumns(columns: RepartitionColumn[]): RepartitionColumn[] {
  return [...columns].sort((a, b) => {
    if (a.worksToday !== b.worksToday) return a.worksToday ? -1 : 1;
    if (a.overCapacity !== b.overCapacity) return a.overCapacity ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Ménages d'une colonne : par heure croissante, heures inconnues à la fin, terminés en bas. */
export function sortColumnTasks(tasks: RepartitionTask[]): RepartitionTask[] {
  return [...tasks].sort((a, b) => {
    const doneA = a.status === 'done' ? 1 : 0;
    const doneB = b.status === 'done' ? 1 : 0;
    if (doneA !== doneB) return doneA - doneB;
    if (a.hm == null && b.hm == null) return a.roomName.localeCompare(b.roomName);
    if (a.hm == null) return 1;
    if (b.hm == null) return -1;
    return a.hm.localeCompare(b.hm) || a.roomName.localeCompare(b.roomName);
  });
}

/* ── Fusion multi-listings & résolution réseau ─────────────────────────── */

/**
 * Fusionne les réponses de plusieurs listings (« Tous les biens ») : colonnes
 * réunies par personne (id) — minutes additionnées, capacité = max (une même
 * personne n'a qu'un plafond), tâches concaténées ; non-assignés et totaux sommés.
 */
export function mergeRepartitionData(list: RepartitionData[]): RepartitionData | null {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  const byId = new Map<string, RepartitionColumn>();
  const unassigned: RepartitionUnassigned[] = [];
  const totals = { assignedMin: 0, unassignedMin: 0, doneMin: 0 };
  let capacityMin = 0;
  for (const data of list) {
    capacityMin = Math.max(capacityMin, data.capacityMin || 0);
    totals.assignedMin += data.totals?.assignedMin ?? 0;
    totals.unassignedMin += data.totals?.unassignedMin ?? 0;
    totals.doneMin += data.totals?.doneMin ?? 0;
    unassigned.push(...(data.unassigned ?? []));
    for (const col of data.columns ?? []) {
      const prev = byId.get(col.id);
      if (!prev) {
        byId.set(col.id, { ...col, tasks: [...col.tasks] });
      } else {
        prev.assignedMin += col.assignedMin;
        prev.capacityMin = Math.max(prev.capacityMin, col.capacityMin);
        prev.remainingMin = prev.capacityMin - prev.assignedMin;
        prev.overCapacity = prev.assignedMin > prev.capacityMin;
        prev.worksToday = prev.worksToday || col.worksToday;
        prev.tasks.push(...col.tasks);
      }
    }
  }
  return {
    date: list[0].date,
    capacityMin,
    columns: [...byId.values()],
    unassigned,
    totals,
  };
}

export type RepartitionFetchResult =
  | { ok: true; data: RepartitionData }
  | { ok: false; notFound: boolean };

export type RepartitionState =
  | { state: 'ok'; data: RepartitionData }
  | { state: 'empty' }
  | { state: 'unavailable' }
  | { state: 'error' };

/**
 * Résout les 3 chemins réseau : nominal (au moins un succès avec du contenu),
 * vide (succès sans colonnes ni non-assignés), indisponible (tous en 404 —
 * backend pas encore déployé), erreur (le reste).
 */
export function resolveRepartitionFetch(results: RepartitionFetchResult[]): RepartitionState {
  const successes = results.filter((r): r is Extract<RepartitionFetchResult, { ok: true }> => r.ok);
  if (successes.length > 0) {
    const merged = mergeRepartitionData(successes.map((r) => r.data));
    if (!merged || ((merged.columns?.length ?? 0) === 0 && (merged.unassigned?.length ?? 0) === 0)) {
      return { state: 'empty' };
    }
    return { state: 'ok', data: merged };
  }
  if (results.length > 0 && results.every((r) => !r.ok && r.notFound)) {
    return { state: 'unavailable' };
  }
  return { state: 'error' };
}
