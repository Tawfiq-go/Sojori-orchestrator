import type { LandlordContract, LandlordContractType } from '../types';

/** Base réellement utilisée pour le % commission PM. */
export function contractUsesGrossBase(contract?: LandlordContract): boolean {
  if (!contract?.type) return false;
  if (contract.type === 'percent_with_ota') return contract.revenueBase === 'gross';
  return false;
}

export function contractBaseShortLabel(contract?: LandlordContract): 'brut' | 'net après OTA' {
  return contractUsesGrossBase(contract) ? 'brut' : 'net après OTA';
}

/** UI formulaire : 2 modes % — net (percent_without_ota) ou brut (percent_with_ota + gross). */
export function formContractTypeFromStored(lc: LandlordContract): LandlordContractType {
  if (lc.type === 'fixed') return 'fixed';
  if (lc.type === 'percent_without_ota') return 'percent_without_ota';
  if (lc.type === 'percent_with_ota' && lc.revenueBase === 'gross') return 'percent_with_ota';
  return 'percent_without_ota';
}

export function buildStoredLandlordContract(
  formType: LandlordContractType,
  commissionPercent: number,
  fixedAmount: number,
  fixedPeriod: LandlordContract['fixedPeriod'],
  currency: string,
  notes?: string,
): LandlordContract {
  const base: LandlordContract = { currency, notes: notes || undefined };
  if (formType === 'fixed') {
    return { ...base, type: 'fixed', fixedAmount, fixedPeriod };
  }
  if (formType === 'percent_without_ota') {
    return {
      ...base,
      type: 'percent_without_ota',
      commissionPercent,
      revenueBase: 'net_after_ota',
    };
  }
  return {
    ...base,
    type: 'percent_with_ota',
    commissionPercent,
    revenueBase: 'gross',
  };
}
