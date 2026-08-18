import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type { GuestContractSummary } from './guestContractUi';

export type {
  GuestContractStatus,
  GuestContractSummary,
  GuestContractTraveler,
} from './guestContractUi';
export { missingSigners } from './guestContractUi';

const RESERVATIONS_API = MICROSERVICE_BASE_URL.SRV_RESERVATION;

export type GuestContractEvidenceSummary = {
  contractId: string;
  documentType: string;
  templateVersion: string;
  sourceSnapshotHash: string;
  unsignedSha256: string | null;
  signedSha256: string | null;
  evidenceSha256: string | null;
  signers: Array<{
    signerId: string;
    travelerIndex: number | null;
    declaredName: string;
    signedAt: string;
    consentVersion: string;
    signaturePngSha256: string | null;
  }>;
  signatureCount: number;
};

function unwrap<T>(body: { success?: boolean; data?: T; error?: string; message?: string } | undefined): {
  success: boolean;
  data?: T;
  message?: string;
} {
  if (body?.success && body.data !== undefined) return { success: true, data: body.data };
  return { success: false, message: body?.error || body?.message || 'Erreur contrat voyageur' };
}

class GuestContractsService {
  async list(reservationId: string) {
    const url = `${RESERVATIONS_API}/${encodeURIComponent(reservationId)}/guest-contracts`;
    const response = await apiClient.get(url);
    return unwrap<GuestContractSummary[]>(response.data);
  }

  async ensure(reservationId: string, force = false) {
    const url = `${RESERVATIONS_API}/${encodeURIComponent(reservationId)}/guest-contracts/ensure`;
    const response = await apiClient.post(url, { force, actorType: 'staff' });
    return unwrap<{ skipped?: boolean; contract?: GuestContractSummary }>(response.data);
  }

  async regenerate(contractId: string, forceNewVersion = false) {
    const url = `${RESERVATIONS_API}/guest-contracts/${encodeURIComponent(contractId)}/regenerate`;
    const response = await apiClient.post(url, { forceNewVersion });
    return unwrap<{ contract?: GuestContractSummary }>(response.data);
  }

  async createAccessToken(contractId: string, signerId?: string) {
    const url = `${RESERVATIONS_API}/guest-contracts/${encodeURIComponent(contractId)}/access-token`;
    const response = await apiClient.post(url, signerId ? { signerId } : {});
    return unwrap<{ token: string; url: string; expiresAt: string; signerId: string }>(response.data);
  }

  async documentUrl(contractId: string, variant: 'unsigned' | 'signed') {
    const url = `${RESERVATIONS_API}/guest-contracts/${encodeURIComponent(contractId)}/document-url`;
    const response = await apiClient.get(url, { params: { variant } });
    return unwrap<{ url: string; variant: string; sha256: string; expiresInSeconds: number }>(response.data);
  }

  async evidence(contractId: string) {
    const url = `${RESERVATIONS_API}/guest-contracts/${encodeURIComponent(contractId)}/evidence`;
    const response = await apiClient.get(url);
    return unwrap<GuestContractEvidenceSummary>(response.data);
  }
}

export const guestContractsService = new GuestContractsService();
export default guestContractsService;
