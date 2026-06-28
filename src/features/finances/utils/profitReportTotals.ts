import type { ProfitMetric } from '../types';

const LANDLORD_FLOW_KEYS = [
  'gross_revenue',
  'extras',
  'ota_commission',
  'expenses_landlord',
  'pm_fee',
] as const;

const PM_FLOW_KEYS = ['expenses_pm'] as const;

export function profitLandlordFlowMetrics(metrics: ProfitMetric[]): ProfitMetric[] {
  const byKey = new Map(metrics.map((m) => [m.key, m]));
  return LANDLORD_FLOW_KEYS.map((k) => byKey.get(k)).filter((m): m is ProfitMetric => !!m);
}

export function profitPmFlowMetrics(metrics: ProfitMetric[]): ProfitMetric[] {
  const byKey = new Map(metrics.map((m) => [m.key, m]));
  return PM_FLOW_KEYS.map((k) => byKey.get(k)).filter((m): m is ProfitMetric => !!m);
}

/** Totaux reversement propriétaire + marge PM (recalcule les anciens snapshots). */
export function resolveProfitReportTotals(metrics: ProfitMetric[]): {
  netLandlord: number;
  netPm: number;
  legacyFormula: boolean;
} {
  const get = (key: string) => metrics.find((m) => m.key === key)?.value ?? 0;
  const gross = get('gross_revenue');
  const extras = get('extras');
  const ota = Math.abs(get('ota_commission'));
  const expPm = Math.abs(get('expenses_pm'));
  const expLl = Math.abs(get('expenses_landlord'));
  const pmFee = Math.abs(get('pm_fee'));

  const netPmStored = metrics.find((m) => m.key === 'net_to_pm');
  if (netPmStored) {
    return {
      netLandlord: get('net_to_landlord'),
      netPm: netPmStored.value,
      legacyFormula: false,
    };
  }

  const netLandlord = gross + extras - ota - expLl - pmFee;
  const netPm = pmFee - expPm;
  return { netLandlord, netPm, legacyFormula: true };
}
