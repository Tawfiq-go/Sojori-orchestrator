import type { ProfitMetric } from '../types';

/** Ordre affichage classique (PM portefeuille). Landlord détail : lignes custom côté page. */
const LANDLORD_FLOW_KEYS = [
  'gross_revenue',
  'cleaning_to_pm',
  'extras',
  'ota_commission',
  'expenses_landlord',
  'pm_fee',
] as const;

const PM_FLOW_KEYS = [
  'pm_commission_income',
  'cleaning_retained_pm', // extras = ménages OTA récupérés
  'city_tax_collected',
  'staff_salaries',
  'checkout_cleaning_cost',
  'expenses_pm',
] as const;

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

  const cleaning = Math.abs(get('cleaning_to_pm') || get('cleaning_retained_pm'));
  const staff = Math.abs(get('staff_salaries'));

  const netPmStored = metrics.find((m) => m.key === 'net_to_pm');
  if (netPmStored) {
    return {
      netLandlord: get('net_to_landlord'),
      netPm: netPmStored.value,
      legacyFormula: false,
    };
  }

  const netLandlord = gross + extras - ota - cleaning - expLl - pmFee;
  const netPm = pmFee + cleaning - expPm - staff;
  return { netLandlord, netPm, legacyFormula: true };
}
