/** Cartes de types ménage (onglet listing Ménage) — logique pure de vue :
 *  paliers lecture seule, « réel 30 j », sous-titres. Testable node:test. */

import {
  baremeVerdict,
  type BaremeLevel,
  type BaremeNature,
  type BaremeViewState,
} from './menageBareme';

export type FrequencyTierVue = {
  startDay: number;
  endDay: number;
  numberOfCleaning: number;
};

/** Paliers ménage inclus depuis le doc listing (`frequency`) — parse tolérant. */
export function parseFrequencyTiers(raw: unknown): FrequencyTierVue[] {
  if (!Array.isArray(raw)) return [];
  const out: FrequencyTierVue[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const startDay = Number(o.startDay);
    const endDay = Number(o.endDay);
    const numberOfCleaning = Number(o.numberOfCleaning);
    if (!Number.isFinite(startDay) || !Number.isFinite(endDay) || !Number.isFinite(numberOfCleaning)) {
      continue;
    }
    if (startDay < 1 || endDay < startDay || numberOfCleaning < 0) continue;
    out.push({ startDay, endDay, numberOfCleaning });
  }
  return out;
}

/** « 1–7 nuits » / « 7 nuits » pour un palier. */
export function formatTierRange(tier: FrequencyTierVue): string {
  if (tier.startDay === tier.endDay) return `${tier.startDay} nuits`;
  return `${tier.startDay}–${tier.endDay} nuits`;
}

export type Real30j = {
  avgMin: number;
  /** ok = écart ≤ 15 % (✓ teal) · ecart = confirmé/tendance (valeur en or) · neutral = trop peu de données. */
  tone: 'ok' | 'ecart' | 'neutral';
};

/** Réel 30 j d'un geste/niveau depuis l'état barème — null si pas de données. */
export function real30j(
  view: BaremeViewState | null,
  nature: BaremeNature,
  level: BaremeLevel,
): Real30j | null {
  if (!view || view.kind !== 'rows') return null;
  const row = view.rows.find(r => r.nature === nature && r.level === level);
  if (!row || row.avgRealMin == null || row.count <= 0) return null;
  const verdict = baremeVerdict(row);
  const tone =
    verdict.kind === 'juste' ? 'ok' : verdict.kind === 'ecart' || verdict.kind === 'tendance' ? 'ecart' : 'neutral';
  return { avgMin: row.avgRealMin, tone };
}

/** « Normal 45 min · Grand 70 min » depuis un track menageOps. */
export function levelDurationsSubtitle(track: {
  normal: { durationMinutes: number };
  grand: { durationMinutes: number };
}): string {
  return `Normal ${track.normal.durationMinutes} min · Grand ${track.grand.durationMinutes} min`;
}
