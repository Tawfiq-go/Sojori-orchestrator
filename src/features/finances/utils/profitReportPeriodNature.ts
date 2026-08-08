export type ProfitPeriodNature = 'etat' | 'projection';

export function normalizePeriodNature(raw?: unknown, reportName?: string): ProfitPeriodNature {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'etat' || s === 'état' || s === 'actual' || s === 'state') return 'etat';
  if (s === 'projection' || s === 'forecast') return 'projection';
  if (reportName && /projection/i.test(reportName)) return 'projection';
  return 'etat';
}

export function periodNatureLabel(nature: ProfitPeriodNature): string {
  return nature === 'projection' ? 'Projection' : 'État';
}

export function periodNatureHint(nature: ProfitPeriodNature): string {
  return nature === 'projection'
    ? 'Séjours confirmés sur la période (dont départs futurs) — pas un cash flow'
    : 'État à date sur la période — cash flow (encaissements) à venir';
}
