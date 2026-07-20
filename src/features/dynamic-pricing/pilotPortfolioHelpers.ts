import type { PortfolioRow } from './_tokens';
import { DEFAULT_PRICING_MODES } from './bien/PricingControls';

type PilotConfig = NonNullable<PortfolioRow['pilotConfig']>;

export type PilotModeChipKind = 'pr' | 'eq' | 'ag' | 'off';

function pc(row: PortfolioRow): PilotConfig | null | undefined {
  return row.pilotConfig;
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n)} %`;
}

function extractOccupancyBands(c: PilotConfig | null | undefined) {
  const bands = Array.isArray(c?.occupancyBands) ? c!.occupancyBands! : [];
  const low = bands.find((b) => Number(b.max) <= 50) ?? bands[0];
  const high = bands.find((b) => Number(b.min) >= 50) ?? bands[1];
  return {
    enabled: c?.occupancyBandsEnabled !== false,
    lowMax: low ? Math.round(Number(low.max) || 30) : 30,
    lowAdj: low && typeof low.adjustment === 'number' ? low.adjustment : -10,
    highMin: high ? Math.round(Number(high.min) || 70) : 70,
    highAdj: high && typeof high.adjustment === 'number' ? high.adjustment : 15,
  };
}

function modeMultiplier(c: PilotConfig | null | undefined, modeId: string): number {
  const preset = DEFAULT_PRICING_MODES.find((m) => m.id === modeId);
  const custom = c?.modes?.find((m) => m.id === modeId);
  if (custom && Number.isFinite(custom.multiplier)) return custom.multiplier;
  return preset?.multiplier ?? 1;
}

export function pilotModeDisplay(row: PortfolioRow): {
  kind: PilotModeChipKind;
  label: string;
  multiplier: string;
} {
  const c = pc(row);
  if (!row.aiEnabled || c?.modeEnabled === false) {
    return { kind: 'off', label: 'OFF', multiplier: '—' };
  }
  const modeId = c?.activeModeId ?? c?.mode ?? 'equilibre';
  const mult = modeMultiplier(c, modeId);
  const map: Record<string, { kind: PilotModeChipKind; label: string }> = {
    prudent: { kind: 'pr', label: 'Prudent' },
    equilibre: { kind: 'eq', label: 'Équilibré' },
    agressif: { kind: 'ag', label: 'Agressif' },
  };
  const m = map[modeId] ?? { kind: 'eq' as const, label: modeId };
  return {
    ...m,
    multiplier: `×${mult.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`,
  };
}

export function pilotBaseDisplay(row: PortfolioRow): { label: string; detail?: string } {
  const c = pc(row);
  if (c?.pricingBaseSource === 'manual_base') {
    const mad = c.manualBasePriceMad;
    return {
      label: 'Fixe',
      detail: mad != null ? `${Math.round(mad)} MAD` : undefined,
    };
  }
  return { label: 'Marché' };
}

export function pilotScopeDisplay(row: PortfolioRow): { label: string; muted: boolean } {
  if (!row.aiEnabled) return { label: '—', muted: true };
  const applyPrice = row.pilotConfig?.applyPrice !== false;
  const applyMinStay = row.pilotConfig?.applyMinStay !== false;
  if (applyPrice && applyMinStay) return { label: 'P+MS', muted: false };
  if (applyPrice) return { label: 'Prix', muted: false };
  if (applyMinStay) return { label: 'MS', muted: false };
  return { label: '—', muted: true };
}

export function pilotOccEstimateDisplay(row: PortfolioRow): string {
  const occ = row.estimateSummary?.occupancyP50;
  if (occ != null && Number.isFinite(occ)) {
    const pct = occ <= 1 ? occ * 100 : occ;
    return `${pct.toFixed(1)}%`;
  }
  return '—';
}

export function pilotOccupancyBandsDisplay(row: PortfolioRow): {
  enabled: boolean;
  summary: string;
} {
  const c = pc(row);
  const b = extractOccupancyBands(c);
  if (!b.enabled) return { enabled: false, summary: 'OFF' };
  return {
    enabled: true,
    summary: `<${b.lowMax}% ${fmtPct(b.lowAdj)} · >${b.highMin}% ${fmtPct(b.highAdj)}`,
  };
}

export function pilotLastMinuteDisplay(row: PortfolioRow): {
  enabled: boolean;
  summary: string;
} {
  const c = pc(row);
  if (c?.lastMinuteEnabled === false) return { enabled: false, summary: 'OFF' };
  const from = c?.lastMinuteFromDays ?? 1;
  const to = c?.lastMinuteToDays ?? c?.lastMinuteWindowDays ?? 7;
  const pct = c?.lastMinuteDiscountPct ?? -15;
  return {
    enabled: true,
    summary: `J+${from}→${to} · ${fmtPct(pct)}`,
  };
}

export function pilotGapBlockDisplay(row: PortfolioRow): {
  enabled: boolean;
  summary: string;
} {
  const c = pc(row);
  if (c?.gapBlockEnabled === false) return { enabled: false, summary: 'OFF' };
  const nights = c?.gapBlockMinNights ?? 2;
  return { enabled: true, summary: `ref. ${nights} n.` };
}

export function pilotMinStayDisplay(row: PortfolioRow): string {
  const c = pc(row);
  const base = c?.minStayPlancher ?? 1;
  const delta = c?.minStayDelta ?? 0;
  if (delta !== 0) return `${base} (+${delta})`;
  return String(base);
}

export function pilotEventsDisplay(row: PortfolioRow): {
  label: string;
  active: boolean;
} {
  const c = pc(row);
  const count = c?.events?.length ?? c?.eventsCount ?? 0;
  if (c?.eventsEnabled === false) return { label: 'OFF', active: false };
  if (count === 0) return { label: '0', active: false };
  return { label: String(count), active: true };
}

export function estimationPipelineMeta(row: PortfolioRow): string | null {
  if (row.perfMeta?.source === 'airroi_snapshot') return 'Snapshot';
  if (row.hasRevenueEstimate) return 'Estimate';
  if (row.hasAirroiSnapshot) return 'Snapshot';
  return null;
}

export function compsPipelineMeta(row: PortfolioRow): string | null {
  const count = row.airroiCompsCount ?? row.airroiComps?.length ?? 0;
  if (count > 0) return `${count} comps`;
  if (row.pilotConfig?.autoCompsEnabled) return 'AUTO lun.';
  return null;
}
