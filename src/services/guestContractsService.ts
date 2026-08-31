import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type { GuestContractSummary } from './guestContractUi';

export type {
  GuestContractLinkDelivery,
  GuestContractStatus,
  GuestContractSummary,
  GuestContractTraveler,
} from './guestContractUi';
export { missingSigners, needsNewSigningVersion, pickContractForType } from './guestContractUi';

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

function unwrapCaught<T>(err: unknown): { success: false; message: string } {
  const data = (err as { response?: { data?: { success?: boolean; error?: string; message?: string } } })
    ?.response?.data;
  if (data) {
    const body = unwrap<T>(data);
    return { success: false, message: body.message || 'Erreur contrat voyageur' };
  }
  return {
    success: false,
    message: err instanceof Error ? err.message : 'Erreur contrat voyageur',
  };
}

class GuestContractsService {
  async list(reservationId: string) {
    const url = `${RESERVATIONS_API}/${encodeURIComponent(reservationId)}/guest-contracts`;
    const response = await apiClient.get(url);
    return unwrap<GuestContractSummary[]>(response.data);
  }

  async ensure(
    reservationId: string,
    force = false,
    opts?: { ensureAll?: boolean; documentType?: 'stay_contract' | 'moroccan_police_form' },
  ) {
    const url = `${RESERVATIONS_API}/${encodeURIComponent(reservationId)}/guest-contracts/ensure`;
    const response = await apiClient.post(url, {
      force,
      actorType: 'staff',
      ensureAll: opts?.ensureAll === true,
      ...(opts?.documentType ? { documentType: opts.documentType } : {}),
    });
    return unwrap<{
      skipped?: boolean;
      contract?: GuestContractSummary;
      contracts?: GuestContractSummary[];
    }>(response.data);
  }

  async regenerate(contractId: string, forceNewVersion = false) {
    const url = `${RESERVATIONS_API}/guest-contracts/${encodeURIComponent(contractId)}/regenerate`;
    try {
      const response = await apiClient.post(url, { forceNewVersion });
      return unwrap<{ contract?: GuestContractSummary; contracts?: GuestContractSummary[] }>(
        response.data,
      );
    } catch (err) {
      return unwrapCaught<GuestContractSummary>(err);
    }
  }

  async supersede(contractId: string) {
    const url = `${RESERVATIONS_API}/guest-contracts/${encodeURIComponent(contractId)}/supersede`;
    try {
      const response = await apiClient.post(url, { reason: 'staff_deleted' });
      return unwrap<GuestContractSummary>(response.data);
    } catch (err) {
      return unwrapCaught<GuestContractSummary>(err);
    }
  }

  async createAccessToken(contractId: string, signerId?: string) {
    const url = `${RESERVATIONS_API}/guest-contracts/${encodeURIComponent(contractId)}/access-token`;
    try {
      const response = await apiClient.post(url, signerId ? { signerId } : {});
      return unwrap<{ token: string; url: string; expiresAt: string; signerId: string }>(response.data);
    } catch (err) {
      return unwrapCaught<{ token: string; url: string; expiresAt: string; signerId: string }>(err);
    }
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

  async retryLinkDelivery(contractId: string, deliveryId: string) {
    const url = `${RESERVATIONS_API}/guest-contracts/${encodeURIComponent(contractId)}/link-deliveries/${encodeURIComponent(deliveryId)}/retry`;
    const response = await apiClient.post(url, {});
    return unwrap<{
      id: string;
      status: string;
      recipientMasked?: string;
      sentAt?: string | null;
      lastError?: string | null;
    }>(response.data);
  }
}

export const guestContractsService = new GuestContractsService();
export default guestContractsService;
