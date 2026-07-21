import type { CalendarDay } from '../bien/YearlyCalendar';
import { defaultOccupancyForCity } from '../cityScope';

export type AnnualPotentialBand = {
  p25: number;
  p50: number;
  p75: number;
  currency: 'MAD';
};

/** Revenu annuel projeté : ADR estimation × occupation marché ville × 365j. */
export function annualRevenueFromEstimateAdr(adrMad: number, occupancy: number): number {
  if (adrMad <= 0 || occupancy <= 0) return 0;
  return Math.round(adrMad * 365 * occupancy);
}

/** ADR médian sur la grille estimation (§04). */
export function medianAdrFromMarketDayPrices(
  days: Array<Pick<CalendarDay, 'recommendedPrice'>>,
): number {
  const priced = days.filter((d) => d.recommendedPrice > 0);
  if (priced.length === 0) return 0;
  const sum = priced.reduce((s, d) => s + d.recommendedPrice, 0);
  return Math.round(sum / priced.length);
}

/** Revenu annuel projeté à partir de la grille estimation (ADR jour × occupation). */
export function annualRevenueFromMarketDayPrices(
  days: Array<Pick<CalendarDay, 'recommendedPrice'>>,
  occupancy: number,
): number {
  const priced = days.filter((d) => d.recommendedPrice > 0);
  if (priced.length === 0 || occupancy <= 0) return 0;

  const sumDaily = priced.reduce((s, d) => s + d.recommendedPrice, 0);
  const horizonScale = priced.length >= 360 ? 1 : 365 / priced.length;
  return Math.round(sumDaily * occupancy * horizonScale);
}

export function bandFromP50(p50: number): AnnualPotentialBand {
  const base = Math.max(0, Math.round(p50));
  return {
    p25: Math.round(base * 0.72),
    p50: base,
    p75: Math.round(base * 1.28),
    currency: 'MAD',
  };
}

export function potentialFromEstimateSummary(est: {
  revenueP25Mad: number;
  revenueP50Mad: number;
  revenueP75Mad: number;
}): AnnualPotentialBand {
  return {
    p25: est.revenueP25Mad,
    p50: est.revenueP50Mad,
    p75: est.revenueP75Mad,
    currency: 'MAD',
  };
}

export type MarketProjection = {
  revenueMad: number;
  adrMad: number;
  occupancy: number;
  /** Estimation marché exploitable pour TTM / pacing auto. */
  ready: boolean;
  /** Au moins une source estimate / grille présente (même si champs incomplets). */
  hasEstimateSource: boolean;
};

/**
 * Dérive revenu · ADR · occ. pour §02 TTM & pacing — aligné sur le potentiel quand possible.
 * Remplissage auto dès qu’une estimation existe ; vide seulement si pas d’estimation du tout.
 */
export function resolveMarketProjection(input: {
  potentialP50Mad: number;
  hasPotential: boolean;
  hasRevenueEstimate?: boolean;
  hasGrilleDays?: boolean;
  estAdrMad?: number;
  estOcc?: number;
  estRevenueP50Mad?: number;
  grilleAdrMad?: number;
  compsMedianAdr?: number;
  compsMedianOcc?: number;
  cityOcc?: number;
  cityOccUsable?: boolean;
  /** Marrakech / Casablanca — occ. par défaut si estimate sans occupancy. */
  cityKey?: string;
}): MarketProjection {
  const hasEstimateSource = Boolean(
    input.hasPotential ||
      input.hasRevenueEstimate ||
      input.hasGrilleDays ||
      (input.estAdrMad && input.estAdrMad > 0) ||
      (input.estRevenueP50Mad && input.estRevenueP50Mad > 0),
  );

  let occ =
    (input.cityOccUsable && input.cityOcc && input.cityOcc > 0 ? input.cityOcc : 0) ||
    (input.estOcc && input.estOcc > 0 ? input.estOcc : 0) ||
    (input.compsMedianOcc && input.compsMedianOcc > 0 ? input.compsMedianOcc : 0) ||
    0;

  let adr =
    (input.estAdrMad && input.estAdrMad > 0 ? input.estAdrMad : 0) ||
    (input.grilleAdrMad && input.grilleAdrMad > 0 ? input.grilleAdrMad : 0) ||
    (input.compsMedianAdr && input.compsMedianAdr > 0 ? input.compsMedianAdr : 0) ||
    0;

  let revenue =
    input.hasPotential && input.potentialP50Mad > 0 ? input.potentialP50Mad : 0;

  if (revenue <= 0 && input.estRevenueP50Mad && input.estRevenueP50Mad > 0) {
    revenue = input.estRevenueP50Mad;
  }
  if (revenue <= 0 && adr > 0 && occ > 0) {
    revenue = annualRevenueFromEstimateAdr(adr, occ);
  }

  if (occ <= 0 && revenue > 0 && adr > 0) {
    occ = revenue / (adr * 365);
  }
  if (adr <= 0 && revenue > 0 && occ > 0) {
    adr = Math.round(revenue / (365 * occ));
  }
  if (revenue <= 0 && adr > 0 && occ > 0) {
    revenue = annualRevenueFromEstimateAdr(adr, occ);
  }

  if (occ <= 0 && revenue > 0 && adr <= 0 && input.cityKey) {
    const defOcc = defaultOccupancyForCity(input.cityKey);
    if (defOcc > 0) {
      occ = defOcc;
      adr = Math.round(revenue / (365 * occ));
    }
  }

  const ready = hasEstimateSource && revenue > 0 && adr > 0 && occ > 0;

  return {
    revenueMad: Math.round(revenue),
    adrMad: Math.round(adr),
    occupancy: occ,
    ready,
    hasEstimateSource,
  };
}
