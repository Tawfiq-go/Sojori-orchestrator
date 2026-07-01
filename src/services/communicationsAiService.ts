import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

const COMMS_AI_BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/fulltask/communications-ai`;

export type CommunicationsAiKind = 'ota_message' | 'review' | 'lead' | 'whatsapp';

export interface CommunicationsAiDraftRequest {
  kind: CommunicationsAiKind;
  threadContext?: string;
  draft?: string;
  targetLanguage?: string;
  guestLanguage?: string;
  dashboardLanguage?: string;
  reservationId?: string;
  channelName?: string;
  ota?: string;
  guestName?: string;
  reviewContent?: string;
  isRatingOnly?: boolean;
  rating?: number;
  regenerate?: boolean;
}

export interface CommunicationsAiDraftResponse {
  success: boolean;
  responseClient?: string;
  responseAdmin?: string;
  provider?: string;
  guestLanguage?: string;
  dashboardLanguage?: string;
  message?: string;
}

export async function generateCommunicationsAiDraft(
  body: CommunicationsAiDraftRequest,
): Promise<CommunicationsAiDraftResponse> {
  const { data } = await apiClient.post<CommunicationsAiDraftResponse>(
    `${COMMS_AI_BASE}/communications-generate`,
    body,
    { timeout: 120_000 },
  );
  return data;
}
