/**
 * Rack ménage — logique pure (aucun import React / axios) : testable node:test.
 *
 * Mappe la réponse `/plans/day-plan` (srv-fulltask, steps + chains) vers les
 * lignes du rack : une ligne par bien, la FENÊTRE départ→arrivée en hachuré,
 * le bloc de ménage posé dedans, le retard rendu GÉOMÉTRIQUE (le bloc dépasse
 * la fenêtre). Tri par urgence : fenêtre la plus serrée d'abord — jamais par
 * numéro de villa. Pas de vocabulaire PMS (Dirty/Clean/Inspected) : les états
 * sont « à faire / en cours / terminé / en retard ».
 */
import type { DayPlanChain, DayPlanResponse, DayPlanStep } from '../../services/fulltaskApi';

/* ── Constantes d'axe et de métier ─────────────────────────────────────── */
export const AXIS_DEFAULT_START_MIN = 8 * 60; // 8h
export const AXIS_DEFAULT_END_MIN = 17 * 60; // 17h
export const AXIS_MIN_START = 6 * 60; // jamais avant 6h
export const AXIS_MAX_END = 22 * 60; // jamais après 22h
/** Durée ménage de repli quand la chain ne la fournit pas. */
export const DEFAULT_CLEANING_MINUTES = 120;
/** Aligné backend dayPlanService TIGHT_SLACK_MINUTES. */
export const TIGHT_SLACK_MINUTES = 30;
/** Marge avant de déclarer « en retard » un ménage pas commencé après son heure. */
export const LATE_GRACE_MINUTES = 15;

export type RackAxis = { startMin: number; endMin: number };
export type RackBlockStatus = 'plan' | 'doing' | 'done' | 'late';

export type RackMarker = { min: number; estimated: boolean };
export type RackWindow = { startMin: number; endMin: number; tight: boolean };

export type RackBlock = {
  startMin: number;
  endMin: number;
  status: RackBlockStatus;
  /** Pas de staff assigné (et pas fini) — style « à assigner » du rack. */
  unassigned: boolean;
  staffName: string | null;
  /** « Ménage », « Ménage à blanc »… — partie tâche du titre backend. */
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
  block: RackBlock | null;
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

/* ── Extraction des steps ──────────────────────────────────────────────── */

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

/* ── Construction du modèle ────────────────────────────────────────────── */

/**
 * @param plan   réponse getDayPlan (steps + chains)
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
    let block: RackBlock | null = null;
    const cleaning = entry.cleaning;
    if (cleaning) {
      const startMarker = stepMin(cleaning) ?? departure;
      const startMin = startMarker ? startMarker.min : (arrival?.min ?? 12 * 60) - duration;
      const raw = String(cleaning.taskStatus || '').toLowerCase();
      const done = raw === 'done' || cleaning.state === 'done';
      const doing = !done && DOING_STATUSES.has(raw);
      const staffName = cleaning.staffName || null;

      let endMin = startMin + duration;
      const status: RackBlockStatus = done ? 'done' : doing ? 'doing' : 'plan';

      if (!done && nowMin != null) {
        if (doing) {
          // Toujours en cours après la fin prévue : le bloc s'étire jusqu'à maintenant.
          endMin = Math.max(endMin, nowMin);
        } else if (nowMin > startMin + LATE_GRACE_MINUTES) {
          // Pas commencé après l'heure : au mieux il finira à maintenant + durée.
          endMin = nowMin + duration;
        }
      }

      block = {
        startMin,
        endMin,
        status,
        unassigned: !done && !staffName,
        staffName,
        taskLabel: taskLabelOf(cleaning),
        statusLabel: done ? 'terminé' : doing ? 'en cours' : 'prévu',
        taskId: cleaning.taskId,
      };
    }

    /* ── Fenêtre départ → arrivée ── */
    let window: RackWindow | null = null;
    if (arrival && (departure || block)) {
      const startMin = departure ? departure.min : Math.min(block ? block.startMin : arrival.min, arrival.min);
      if (arrival.min > startMin) {
        const slack = arrival.min - startMin - duration;
        const tight = chain
          ? chain.status === 'tight' || chain.status === 'broken'
          : slack < TIGHT_SLACK_MINUTES;
        window = { startMin, endMin: arrival.min, tight };
      }
    }

    /* ── Retard : géométrique (le bloc dépasse la fenêtre) ── */
    if (block && window && block.status !== 'done') {
      const overflow = block.endMin > window.endMin;
      const notStartedLate =
        block.status === 'plan' && nowMin != null && nowMin > window.startMin + LATE_GRACE_MINUTES;
      if (overflow || notStartedLate) {
        block.status = 'late';
        block.statusLabel = notStartedLate ? 'pas commencé' : 'déborde la fenêtre';
      }
    }
    // Hors fenêtre : un ménage planifié pas commencé bien après son heure = en retard aussi.
    if (block && !window && block.status === 'plan' && nowMin != null && nowMin > block.startMin + LATE_GRACE_MINUTES) {
      block.status = 'late';
      block.statusLabel = 'pas commencé';
    }

    /* ── Sous-titre ── */
    let subtitle: string;
    if (window && arrival) {
      const est = (departure?.estimated || arrival.estimated) ? '≈ ' : '';
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

    const critical = Boolean(
      block && window && block.status !== 'done' && (block.status === 'late' || block.unassigned),
    );

    rows.push({
      listingId,
      listingName: entry.name,
      subtitle,
      critical,
      window,
      departure,
      arrival,
      block,
    });
  }

  rows.sort((a, b) => urgencyKey(a) - urgencyKey(b) || a.listingName.localeCompare(b.listingName));

  /* ── Compteurs ── */
  const counters: RackCounters = {
    aFaire: 0,
    enCours: 0,
    termines: 0,
    enRetard: 0,
    departs: plan.stats?.departures ?? rows.filter((r) => r.departure).length,
    arrivees: plan.stats?.arrivals ?? rows.filter((r) => r.arrival).length,
  };
  for (const row of rows) {
    if (!row.block) continue;
    if (row.block.status === 'done') counters.termines += 1;
    else if (row.block.status === 'doing') counters.enCours += 1;
    else if (row.block.status === 'late') counters.enRetard += 1;
    else counters.aFaire += 1;
  }

  /* ── Axe : 8h→17h par défaut, étendu si les données le justifient ── */
  const mins: number[] = [];
  for (const row of rows) {
    if (row.departure) mins.push(row.departure.min);
    if (row.arrival) mins.push(row.arrival.min);
    if (row.window) mins.push(row.window.startMin, row.window.endMin);
    if (row.block) mins.push(row.block.startMin, row.block.endMin);
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

/**
 * Clé de tri par urgence — jamais par numéro de villa :
 *   0 · fenêtre pas terminée → marge restante croissante (la plus serrée d'abord)
 *   1 · ménage sans fenêtre pas terminé (en cours avant prévu, puis par heure)
 *   2 · lignes sans ménage (mouvements seuls)
 *   3 · terminés
 */
export function urgencyKey(row: RackRow): number {
  const b = row.block;
  if (row.window && b && b.status !== 'done') {
    const slack = row.window.endMin - row.window.startMin - (b.endMin - b.startMin);
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
