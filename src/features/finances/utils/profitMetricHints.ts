import type { LandlordContract, ProfitMetric } from '../types';
import { contractUsesGrossBase } from './contractCommissionBase';

function fmtMoneyHint(amount: number, currency: string): string {
  return `${Math.abs(amount).toLocaleString('fr-FR')} ${currency}`;
}

function pmFeeHintFromContract(
  contract: LandlordContract | undefined,
  grossWithExtras: number,
  ota: number,
  currency: string,
): string | undefined {
  if (!contract?.type) return 'contrat PM non défini — commission = 0';
  if (contract.type === 'fixed') {
    const amt = Number(contract.fixedAmount) || 0;
    return `forfait ${amt.toLocaleString('fr-FR')} ${contract.currency || currency}`;
  }
  const pct = Number(contract.commissionPercent) || 0;
  const onGross = contractUsesGrossBase(contract);
  const base = onGross ? grossWithExtras : grossWithExtras - ota;
  const baseDesc = onGross ? 'brut résas + extras' : 'net après OTA (incl. extras)';
  return `${pct} % × ${fmtMoneyHint(base, currency)} (${baseDesc})`;
}

/** Hint affiché sous chaque ligne P&L (snapshot ou recalcul pour anciens rapports). */
export function resolveProfitMetricHint(
  metric: ProfitMetric,
  ctx: {
    contract?: LandlordContract;
    currency: string;
    metrics: ProfitMetric[];
    pmExpenseCount: number;
    landlordExpenseCount: number;
    extrasCount: number;
  },
): string | undefined {
  if (metric.hint) return metric.hint;

  const gross = ctx.metrics.find((m) => m.key === 'gross_revenue')?.value ?? 0;
  const extras = ctx.metrics.find((m) => m.key === 'extras')?.value ?? 0;
  const ota = Math.abs(ctx.metrics.find((m) => m.key === 'ota_commission')?.value ?? 0);
  const grossWithExtras = gross + extras;

  switch (metric.key) {
    case 'extras':
      return ctx.extrasCount > 0
        ? `${ctx.extrasCount} ligne(s) · inclus dans la base commission PM`
        : undefined;
    case 'expenses_pm':
      return ctx.pmExpenseCount > 0
        ? `${ctx.pmExpenseCount} dépense(s) payée(s) par le PM · déduites de la marge PM`
        : 'aucune dépense ledger payée par le PM';
    case 'expenses_landlord':
      return ctx.landlordExpenseCount > 0
        ? `${ctx.landlordExpenseCount} dépense(s) · déduites du reversement propriétaire`
        : undefined;
    case 'pm_fee':
      return pmFeeHintFromContract(ctx.contract, grossWithExtras, ota, ctx.currency);
    default:
      return undefined;
  }
}
