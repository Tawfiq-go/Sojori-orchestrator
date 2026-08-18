export type GuestContractStatus =
  | 'pending_generation'
  | 'ready'
  | 'viewed'
  | 'partially_signed'
  | 'finalizing'
  | 'signed'
  | 'declined'
  | 'superseded'
  | 'failed';

export type GuestContractTraveler = {
  travelerIndex: number;
  firstName: string;
  lastName: string;
  signerId: string;
};

export type GuestContractSummary = {
  id: string;
  reservationId: string;
  status: GuestContractStatus;
  version: number;
  documentType: string;
  signerPolicy: string;
  unsignedSha256?: string | null;
  signedSha256?: string | null;
  evidenceSha256?: string | null;
  signatureCount?: number;
  requiredSignerCount?: number;
  expectedSignerIds?: string[];
  missingSignerIds?: string[];
  nextSignerId?: string | null;
  travelers?: GuestContractTraveler[];
  signatures?: Array<{ signerId: string; signerName: string; travelerIndex: number | null }>;
  establishmentName?: string;
  reservationNumber?: string;
};

export function missingSigners(contract: GuestContractSummary): GuestContractTraveler[] {
  const missing = new Set(contract.missingSignerIds ?? []);
  const travelers = contract.travelers ?? [];
  if (contract.signerPolicy === 'each_traveler') {
    return travelers.filter(t => missing.has(t.signerId));
  }
  if (missing.has('primary')) {
    const first = travelers[0];
    return [
      {
        signerId: 'primary',
        travelerIndex: 0,
        firstName: first?.firstName || '',
        lastName: first?.lastName || '',
      },
    ];
  }
  return [];
}
