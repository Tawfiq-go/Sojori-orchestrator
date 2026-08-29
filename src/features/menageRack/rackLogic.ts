/**
 * Rack ménage — logique pure (aucun import React / axios) : testable node:test.
 *
 * Deux sources vers le même modèle de rack :
 *  1. buildRackModelFromEndpoint — GET /tasks/menage/rack (srv-fulltask, dédié
 *     hôtel Mews/NOMMOS) : lignes par chambre, fenêtres éventuellement OUVERTES
 *     d'un côté (départ seul / arrivée seule), chrono réel startedHm/completedHm.
 *  2. buildRackModel — GET /plans/day-plan (steps + chains d'orchestration) :
 *     REPLI quand l'endpoint rack n'est pas disponible (« données limitées »).
 *
 * Invariants communs : une ligne par bien/chambre, la FENÊTRE départ→arrivée en
 * hachuré, le bloc de ménage posé dedans, le retard rendu GÉOMÉTRIQUE (le bloc
 * dépasse la fenêtre). Tri par urgence : fenêtre la plus serrée d'abord — jamais
 * par numéro de villa. Pas de vocabulaire PMS (Dirty/Clean/Inspected) : les
 * états sont « à faire / en cours / terminé / en retard ».
 */
import type { DayPlanChain, DayPlanResponse, DayPlanStep } from '../../services/fulltaskApi';

/* ── Constantes d'axe et de métier ─────────────────────────────────────── */
export const AXIS_DEFAULT_START_MIN = 8 * 60; // 8h
export const AXIS_DEFAULT_END_MIN = 17 * 60; // 17h
export const AXIS_MIN_START = 6 * 60; // jamais avant 6h
export const AXIS_MAX_END = 22 * 60; // jamais après 22h
/** Durée ménage de repli quand la source ne la fournit pas. */
export const DEFAULT_CLEANING_MINUTES = 120;
/** Aligné backend dayPlanService TIGHT_SLACK_MINUTES. */
export const TIGHT_SLACK_MINUTES = 30;
/** Marge avant de déclarer « en retard » un ménage pas commencé après son heure. */
export const LATE_GRACE_MINUTES = 15;

export type RackAxis = { startMin: number; endMin: number };
export type RackBlockStatus = 'plan' | 'doing' | 'done' | 'late';

export type RackMarker = { min: number; estimated: boolean };
export type RackWindow = {
  startMin: number;
  endMin: number;
  tight: boolean;
  /** Fenêtre ouverte à gauche : arrivée seule — hachure atténuée depuis le bord. */
  openStart?: boolean;
  /** Fenêtre ouverte à droite : départ seul — hachure atténuée jusqu'au bord. */
  openEnd?: boolean;
};

export type RackBlock = {
  startMin: number;
  endMin: number;
  status: RackBlockStatus;
  /** Pas de staff assigné (et pas fini) — style « à assigner » du rack. */
  unassigned: boolean;
  staffName: string | null;
  /** « Ménage », « À blanc »… — libellé de la tâche. */
  taskLabel: string;
  /** « en cours », « pas commencé », « terminé »… — suffixe du label. */
  statusLabel: string;
  taskId?: string;
};

export type RackRow = {
  listingId: string;
  listingName: string;
  /** « 11h → 15h · 4h », « départ 10h → libre », « client sur place »… */
  subtitle: string;
  /** Ligne à fond rougi : fenêtre en danger (retard ou sans personne). */
  critical: boolean;
  window: RackWindow | null;
  departure: RackMarker | null;
  arrival: RackMarker | null;
  blocks: RackBlock[];
};

export type RackCounters = {
  aFaire: number;
  enCours: number;
  termines: number;
  enRetard: number;
  departs: number;
  arrivees: number;
};

export type RackModel = {
  rows: RackRow[];
  counters: RackCounters;
  axis: RackAxis;
};

/* ── Types de l'endpoint rack (GET /tasks/menage/rack) ─────────────────── */

export type RackEndpointTaskStatus = 'todo' | 'doing' | 'done' | 'unassigned';
export type RackEndpointTask = {
  label: string;
  status: RackEndpointTaskStatus;
  hm: string | null;
  durationMin: number | null;
  staffName: string | null;
  startedHm?: string | null;
  completedHm?: string | null;
};
export type RackEndpointRow = {
  id: string;
  roomName: string;
  kind: 'turnover' | 'arrival' | 'departure' | 'stay' | 'empty';
  occLabel?: string | null;
  window?: { startHm: string | null; endHm: string | null } | null;
  tasks?: RackEndpointTask[];
};

/* ── Helpers temps ─────────────────────────────────────────────────────── */

/** 'HH:mm' → minutes depuis minuit, null si invalide. */
export function parseHm(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** minutes → « 10h » / « 10h30 » (affichage ops maison). */
export function hmLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** minutes de durée → « 4h » / « 1h30 » / « 45 min ». */
export function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Position % sur l'axe, bornée 0..100. */
export function pctOf(min: number, axis: RackAxis): number {
  const span = axis.endMin - axis.startMin;
  if (span <= 0) return 0;
  const p = ((min - axis.startMin) / span) * 100;
  return Math.max(0, Math.min(100, p));
}

/** Graduations horaires de l'axe (heures rondes). */
export function hoursOf(axis: RackAxis): Array<{ min: number; label: string; pct: number }> {
  const out: Array<{ min: number; label: string; pct: number }> = [];
  const first = Math.ceil(axis.startMin / 60) * 60;
  for (let m = first; m <= axis.endMin; m += 60) {
    out.push({ min: m, label: `${m / 60}h`, pct: pctOf(m, axis) });
  }
  return out;
}

/* ── Briques partagées ─────────────────────────────────────────────────── */

/** Retard géométrique : applique le statut « late » à un bloc vis-à-vis de sa fenêtre. */
function applyLateness(block: RackBlock, window: RackWindow | null, nowMin: number | null): void {
  if (block.status === 'done') return;
  if (window && !window.openEnd) {
    const overflow = block.endMin > window.endMin;
    /* « Pas commencé » se juge sur le plus tardif de : ouverture de fenêtre
       (départ) et heure prévue du ménage — une fenêtre ouverte à gauche a un
       début sentinelle, seul l'horaire du bloc compte alors. */
    const startRef = Math.max(window.openStart ? 0 : window.startMin, block.startMin);
    const notStartedLate =
      block.status === 'plan' && nowMin != null && nowMin > startRef + LATE_GRACE_MINUTES;
    if (overflow || notStartedLate) {
      const wasNotStarted = block.status === 'plan';
      block.status = 'late';
      block.statusLabel = wasNotStarted && notStartedLate ? 'pas commencé' : 'déborde la fenêtre';
      return;
    }
  }
  // Hors fenêtre fermée : un ménage planifié pas commencé bien après son heure = en retard aussi.
  if (
    (!window || window.openEnd) &&
    block.status === 'plan' &&
    nowMin != null &&
    nowMin > block.startMin + LATE_GRACE_MINUTES
  ) {
    block.status = 'late';
    block.statusLabel = 'pas commencé';
  }
}

/** Bloc le plus urgent d'une ligne (late > doing > plan > done). */
export function primaryBlock(row: RackRow): RackBlock | null {
  const sev: Record<RackBlockStatus, number> = { late: 0, doing: 1, plan: 2, done: 3 };
  let best: RackBlock | null = null;
  for (const b of row.blocks) {
    if (!best || sev[b.status] < sev[best.status] || (sev[b.status] === sev[best.status] && b.startMin < best.startMin)) {
      best = b;
    }
  }
  return best;
}

function computeCritical(row: Pick<RackRow, 'blocks' | 'window'>): boolean {
  if (!row.window || row.window.openEnd) return false;
  return row.blocks.some((b) => b.status !== 'done' && (b.status === 'late' || b.unassigned));
}

function finalizeModel(
  rows: RackRow[],
  nowMin: number | null,
  stats?: { departures?: number; arrivals?: number },
): RackModel {
  rows.sort((a, b) => urgencyKey(a) - urgencyKey(b) || a.listingName.localeCompare(b.listingName));

  const counters: RackCounters = {
    aFaire: 0,
    enCours: 0,
    termines: 0,
    enRetard: 0,
    departs: stats?.departures ?? rows.filter((r) => r.departure).length,
    arrivees: stats?.arrivals ?? rows.filter((r) => r.arrival).length,
  };
  for (const row of rows) {
    for (const b of row.blocks) {
      if (b.status === 'done') counters.termines += 1;
      else if (b.status === 'doing') counters.enCours += 1;
      else if (b.status === 'late') counters.enRetard += 1;
      else counters.aFaire += 1;
    }
  }

  /* Axe : 8h→17h par défaut, étendu si les données le justifient.
     Les bords OUVERTS de fenêtre n'étendent pas l'axe. */
  const mins: number[] = [];
  for (const row of rows) {
    if (row.departure) mins.push(row.departure.min);
    if (row.arrival) mins.push(row.arrival.min);
    if (row.window) {
      if (!row.window.openStart) mins.push(row.window.startMin);
      if (!row.window.openEnd) mins.push(row.window.endMin);
    }
    for (const b of row.blocks) mins.push(b.startMin, b.endMin);
  }
  if (nowMin != null) mins.push(nowMin);
  let startMin = AXIS_DEFAULT_START_MIN;
  let endMin = AXIS_DEFAULT_END_MIN;
  for (const m of mins) {
    if (m < startMin) startMin = Math.floor(m / 60) * 60;
    if (m > endMin) endMin = Math.ceil(m / 60) * 60;
  }
  startMin = Math.max(AXIS_MIN_START, startMin);
  endMin = Math.min(AXIS_MAX_END, endMin);

  return { rows, counters, axis: { startMin, endMin } };
}

/* ── Source 1 : endpoint rack dédié ────────────────────────────────────── */

/**
 * Modèle du rack depuis GET /tasks/menage/rack (une réponse par listing —
 * passer les rows concaténées, éventuellement préfixées par bien).
 *
 * Sémantique fenêtres : turnover = [checkOut, checkIn] ; départ seul =
 * [checkOut, ouvert[ ; arrivée seule = ]ouvert, checkIn] ; stay/empty = null.
 * Chrono réel (startedHm/completedHm) prioritaire sur l'heure prévue.
 */
export function buildRackModelFromEndpoint(
  rows: RackEndpointRow[],
  nowMin: number | null,
): RackModel {
  const out: RackRow[] = [];

  for (const row of rows) {
    const startHm = parseHm(row.window?.startHm);
    const endHm = parseHm(row.window?.endHm);

    let window: RackWindow | null = null;
    let departure: RackMarker | null = null;
    let arrival: RackMarker | null = null;

    if (row.kind === 'turnover' && startHm != null && endHm != null && endHm > startHm) {
      window = { startMin: startHm, endMin: endHm, tight: false };
      departure = { min: startHm, estimated: false };
      arrival = { min: endHm, estimated: false };
    } else if (row.kind === 'departure' && startHm != null) {
      window = { startMin: startHm, endMin: AXIS_MAX_END, tight: false, openEnd: true };
      departure = { min: startHm, estimated: false };
    } else if (row.kind === 'arrival' && endHm != null) {
      window = { startMin: AXIS_MIN_START, endMin: endHm, tight: false, openStart: true };
      arrival = { min: endHm, estimated: false };
    }

    /* ── Blocs ── */
    const blocks: RackBlock[] = [];
    for (const task of row.tasks ?? []) {
      const duration = task.durationMin && task.durationMin > 0 ? task.durationMin : DEFAULT_CLEANING_MINUTES;
      const started = parseHm(task.startedHm);
      const completed = parseHm(task.completedHm);
      const planned = parseHm(task.hm) ?? started ?? window?.startMin ?? 12 * 60;

      const done = task.status === 'done';
      const doing = task.status === 'doing';
      const unassigned = !done && (task.status === 'unassigned' || !task.staffName);

      let startMin: number;
      let endMin: number;
      if (done) {
        // Chrono réel quand il existe : le bloc dessine ce qui s'est passé.
        endMin = completed ?? (started != null ? started + duration : planned + duration);
        startMin = started ?? Math.max(0, endMin - duration);
      } else if (doing) {
        startMin = started ?? planned;
        endMin = Math.max(startMin + duration, nowMin ?? startMin + duration);
      } else {
        startMin = planned;
        endMin = startMin + duration;
        if (nowMin != null && nowMin > startMin + LATE_GRACE_MINUTES) {
          // Pas commencé après l'heure : au mieux il finira à maintenant + durée.
          endMin = nowMin + duration;
        }
      }
      if (endMin <= startMin) endMin = startMin + Math.max(15, duration);

      const block: RackBlock = {
        startMin,
        endMin,
        status: done ? 'done' : doing ? 'doing' : 'plan',
        unassigned,
        staffName: task.staffName || null,
        taskLabel: task.label || 'Ménage',
        statusLabel: done ? 'terminé' : doing ? 'en cours' : 'prévu',
      };
      applyLateness(block, window, nowMin);
      blocks.push(block);
    }

    /* ── Fenêtre serrée : la somme des ménages tient-elle ? ── */
    if (window && !window.openStart && !window.openEnd) {
      const needed = blocks
        .filter((b) => b.status !== 'done')
        .reduce((sum, b) => sum + (b.endMin - b.startMin), 0);
      const span = window.endMin - window.startMin;
      window.tight = needed > 0 ? span - needed < TIGHT_SLACK_MINUTES : span < TIGHT_SLACK_MINUTES;
    }

    /* ── Sous-titre ── */
    let subtitle: string;
    if (row.kind === 'turnover' && window) {
      subtitle = `${hmLabel(window.startMin)} → ${hmLabel(window.endMin)} · ${durationLabel(window.endMin - window.startMin)}`;
    } else if (row.kind === 'departure' && departure) {
      subtitle = `départ ${hmLabel(departure.min)} → libre`;
    } else if (row.kind === 'arrival' && arrival) {
      subtitle = `arrivée ${hmLabel(arrival.min)}`;
    } else {
      subtitle = row.occLabel || (row.kind === 'stay' ? 'client sur place' : 'libre');
    }

    out.push({
      listingId: row.id,
      listingName: row.roomName,
      subtitle,
      critical: computeCritical({ blocks, window }),
      window,
      departure,
      arrival,
      blocks,
    });
  }

  return finalizeModel(out, nowMin);
}

/* ── Source 2 (repli) : day-plan orchestration ─────────────────────────── */

function stepMin(step: DayPlanStep): RackMarker | null {
  const real = parseHm(step.time);
  if (real != null) return { min: real, estimated: false };
  const est = parseHm(step.estimatedTime);
  if (est != null) return { min: est, estimated: true };
  return null;
}

function taskLabelOf(step: DayPlanStep): string {
  // title backend = « Ménage · Nom du bien » — on garde la partie tâche.
  const t = String(step.title || '');
  const idx = t.indexOf('·');
  const label = (idx > 0 ? t.slice(0, idx) : t).trim();
  return label || 'Ménage';
}

const DOING_STATUSES = new Set(['doing', 'in_progress', 'in-progress', 'started', 'processing']);

/**
 * Modèle du rack depuis getDayPlan (steps + chains) — REPLI quand l'endpoint
 * rack n'est pas déployé. Ne voit que ce que l'orchestration connaît.
 *
 * @param nowMin minutes depuis minuit pour « maintenant » — null si le rack
 *               affiche un autre jour (pas de trait, pas de retard projeté).
 */
export function buildRackModel(
  plan: Pick<DayPlanResponse, 'steps' | 'chains'> & { stats?: DayPlanResponse['stats'] },
  nowMin: number | null,
): RackModel {
  const byListing = new Map<
    string,
    { name: string; departure?: DayPlanStep; arrival?: DayPlanStep; cleaning?: DayPlanStep }
  >();

  for (const step of plan.steps || []) {
    if (step.kind !== 'departure' && step.kind !== 'arrival' && step.kind !== 'cleaning') continue;
    const key = String(step.listingId || step.listingName || step.id);
    let entry = byListing.get(key);
    if (!entry) {
      entry = { name: step.listingName || key };
      byListing.set(key, entry);
    }
    if (step.kind === 'departure' && !entry.departure) entry.departure = step;
    if (step.kind === 'arrival' && !entry.arrival) entry.arrival = step;
    if (step.kind === 'cleaning') {
      // Priorité au ménage rattaché à une chain (turnover du jour).
      if (!entry.cleaning || (step.chainId && !entry.cleaning.chainId)) entry.cleaning = step;
    }
  }

  const chainByListing = new Map<string, DayPlanChain>();
  for (const chain of plan.chains || []) {
    const key = String(chain.listingId);
    if (!chainByListing.has(key)) chainByListing.set(key, chain);
  }

  const rows: RackRow[] = [];

  for (const [listingId, entry] of byListing) {
    const chain = chainByListing.get(listingId);
    const departure = entry.departure ? stepMin(entry.departure) : null;
    const arrival = entry.arrival ? stepMin(entry.arrival) : null;

    const duration =
      (chain?.cleaningDurationMinutes && chain.cleaningDurationMinutes > 0
        ? chain.cleaningDurationMinutes
        : null) ?? DEFAULT_CLEANING_MINUTES;

    /* ── Bloc ménage ── */
    const blocks: RackBlock[] = [];
    const cleaning = entry.cleaning;
    if (cleaning) {
      const startMarker = stepMin(cleaning) ?? departure;
      const startMin = startMarker ? startMarker.min : (arrival?.min ?? 12 * 60) - duration;
      const raw = String(cleaning.taskStatus || '').toLowerCase();
      const done = raw === 'done' || cleaning.state === 'done';
      const doing = !done && DOING_STATUSES.has(raw);
      const staffName = cleaning.staffName || null;

      let endMin = startMin + duration;
      if (!done && nowMin != null) {
        if (doing) {
          // Toujours en cours après la fin prévue : le bloc s'étire jusqu'à maintenant.
          endMin = Math.max(endMin, nowMin);
        } else if (nowMin > startMin + LATE_GRACE_MINUTES) {
          // Pas commencé après l'heure : au mieux il finira à maintenant + durée.
          endMin = nowMin + duration;
        }
      }

      blocks.push({
        startMin,
        endMin,
        status: done ? 'done' : doing ? 'doing' : 'plan',
        unassigned: !done && !staffName,
        staffName,
        taskLabel: taskLabelOf(cleaning),
        statusLabel: done ? 'terminé' : doing ? 'en cours' : 'prévu',
        taskId: cleaning.taskId,
      });
    }

    /* ── Fenêtre départ → arrivée ── */
    let window: RackWindow | null = null;
    if (arrival && (departure || blocks.length)) {
      const startMin = departure
        ? departure.min
        : Math.min(blocks[0] ? blocks[0].startMin : arrival.min, arrival.min);
      if (arrival.min > startMin) {
        const slack = arrival.min - startMin - duration;
        const tight = chain
          ? chain.status === 'tight' || chain.status === 'broken'
          : slack < TIGHT_SLACK_MINUTES;
        window = { startMin, endMin: arrival.min, tight };
      }
    }

    /* ── Retard : géométrique (le bloc dépasse la fenêtre) ── */
    for (const block of blocks) applyLateness(block, window, nowMin);

    /* ── Sous-titre ── */
    let subtitle: string;
    if (window && arrival) {
      const est = departure?.estimated || arrival.estimated ? '≈ ' : '';
      subtitle = `${est}${hmLabel(window.startMin)} → ${hmLabel(window.endMin)} · ${durationLabel(window.endMin - window.startMin)}`;
    } else if (departure) {
      subtitle = `${departure.estimated ? '≈ ' : ''}départ ${hmLabel(departure.min)} → libre`;
    } else if (arrival) {
      subtitle = `${arrival.estimated ? '≈ ' : ''}arrivée ${hmLabel(arrival.min)}`;
    } else if (cleaning?.listingOccupancy === 'occupied') {
      subtitle = 'client sur place';
    } else {
      subtitle = "pas d'arrivée aujourd'hui";
    }

    rows.push({
      listingId,
      listingName: entry.name,
      subtitle,
      critical: computeCritical({ blocks, window }),
      window,
      departure,
      arrival,
      blocks,
    });
  }

  return finalizeModel(rows, nowMin, plan.stats);
}

/**
 * Clé de tri par urgence — jamais par numéro de villa :
 *   0 · fenêtre FERMÉE pas terminée → marge restante croissante (la plus serrée d'abord)
 *   1 · ménage sans fenêtre fermée pas terminé (en cours avant prévu, puis par heure)
 *   2 · lignes sans ménage (mouvements seuls, séjours)
 *   3 · terminés
 */
export function urgencyKey(row: RackRow): number {
  const b = primaryBlock(row);
  const closedWindow = row.window && !row.window.openEnd ? row.window : null;
  if (closedWindow && b && b.status !== 'done') {
    const slack = closedWindow.endMin - closedWindow.startMin - (b.endMin - b.startMin);
    // late avant tight avant large — offset garde le groupe en tête.
    const lateBoost = b.status === 'late' ? -10_000 : 0;
    return 0 + (lateBoost + slack + 20_000) / 100_000; // ∈ (0, 1)
  }
  if (b && b.status !== 'done') {
    const doingBoost = b.status === 'doing' ? 0 : b.status === 'late' ? -500 : 1_000;
    return 1 + (doingBoost + b.startMin + 10_000) / 100_000;
  }
  if (!b) {
    const t = row.departure?.min ?? row.arrival?.min ?? 24 * 60;
    return 2 + t / 100_000;
  }
  return 3 + b.startMin / 100_000;
}
