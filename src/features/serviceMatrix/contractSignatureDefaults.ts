export type ContractSignatureConfigValue = {
  enabled: boolean;
  autoSendAfterRegistration: boolean;
  documentType: 'stay_contract' | 'moroccan_police_form';
  signerPolicy: 'primary_guest' | 'each_traveler';
  templateId: string;
};

export const DEFAULT_CONTRACT_SIGNATURE: ContractSignatureConfigValue = {
  enabled: false,
  autoSendAfterRegistration: false,
  documentType: 'stay_contract',
  signerPolicy: 'primary_guest',
  templateId: 'stay_contract_placeholder',
};

export function parseContractSignature(raw: unknown): ContractSignatureConfigValue {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONTRACT_SIGNATURE };
  const rec = raw as Record<string, unknown>;
  return {
    enabled: rec.enabled === true,
    autoSendAfterRegistration: rec.autoSendAfterRegistration === true,
    documentType: rec.documentType === 'moroccan_police_form' ? 'moroccan_police_form' : 'stay_contract',
    signerPolicy: rec.signerPolicy === 'each_traveler' ? 'each_traveler' : 'primary_guest',
    templateId:
      typeof rec.templateId === 'string' && rec.templateId.trim()
        ? rec.templateId.trim()
        : DEFAULT_CONTRACT_SIGNATURE.templateId,
  };
}
