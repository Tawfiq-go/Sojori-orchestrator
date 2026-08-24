export type ContractSignatureConfigValue = {
  enabled: boolean;
  autoSendAfterRegistration: boolean;
  documentType: 'stay_contract' | 'moroccan_police_form';
  signerPolicy: 'primary_guest' | 'each_traveler';
  templateId: string;
  establishmentNotice: string;
};

/** Effective source on compiled orchestration `contractSignature.origin`. */
export type ContractSignatureOrigin = 'listing' | 'owner' | 'default';

export const DEFAULT_ESTABLISHMENT_NOTICE =
  "La direction n'est pas responsable des objets de valeur laissés dans les chambres.";

export const DEFAULT_CONTRACT_SIGNATURE: ContractSignatureConfigValue = {
  enabled: false,
  autoSendAfterRegistration: false,
  documentType: 'stay_contract',
  signerPolicy: 'primary_guest',
  templateId: 'hotel_guest_sheet_v1',
  establishmentNotice: DEFAULT_ESTABLISHMENT_NOTICE,
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
    establishmentNotice:
      typeof rec.establishmentNotice === 'string'
        ? rec.establishmentNotice.trim()
        : DEFAULT_CONTRACT_SIGNATURE.establishmentNotice,
  };
}

export function parseContractSignatureOrigin(raw: unknown): ContractSignatureOrigin {
  if (raw === 'listing' || raw === 'owner' || raw === 'default') return raw;
  return 'default';
}

export function contractSignatureOriginLabel(origin: ContractSignatureOrigin): string {
  if (origin === 'listing') return 'Surcharge logement';
  if (origin === 'owner') return 'héritée du propriétaire';
  return 'Valeurs par défaut';
}
