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
  /** Demande au backend de détecter la langue du message client (si inconnue côté UI). */
  detectClientLanguage?: boolean;
  dashboardLanguage?: string;
  reservationId?: string;
  reservationMongoId?: string;
  channelName?: string;
  ota?: string;
  guestName?: string;
  guestPhone?: string;
  listingName?: string;
  currentGuestMessage?: string;
  threadId?: string | number;
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
  targetLanguage?: string;
  dashboardLanguage?: string;
  message?: string;
  generationId?: string;
  promptVersion?: string;
  contextVersion?: string;
  model?: string;
  whatsappContextStatus?: string;
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

export type OtaAiInspectorPayload = {
  generationId: string;
  source?: string;
  mode?: string;
  promptVersion?: string;
  contextVersion?: string;
  channelName?: string;
  whatsappContextStatus?: string;
  draftClient?: string;
  draftStaff?: string;
  staffInstruction?: string;
  linkedMessageId?: number | null;
  finalReplyMode?: string | null;
  processingTrace?: import('../types/messages.types').ProcessingTrace | null;
  aiPrompt?: import('../types/messages.types').AiPromptAudit | null;
  aiUsage?: import('../types/messages.types').AiUsageAudit | null;
  createdAt?: string | null;
  success?: boolean;
};

export async function fetchOtaAiGenerationAudit(
  generationId: string,
): Promise<{ success: boolean; generation?: OtaAiInspectorPayload; error?: string }> {
  const { data } = await apiClient.get<{
    success: boolean;
    generation?: OtaAiInspectorPayload;
    error?: string;
  }>(`${COMMS_AI_BASE}/ota-generation/${encodeURIComponent(generationId)}`, {
    timeout: 30_000,
  });
  return data;
}

export async function linkOtaAiGenerationAudit(
  generationId: string,
  body: { messageId: number; finalBody: string },
): Promise<{ success: boolean; replyMode?: string }> {
  const { data } = await apiClient.post<{ success: boolean; replyMode?: string }>(
    `${COMMS_AI_BASE}/ota-generation/${encodeURIComponent(generationId)}/link`,
    body,
    { timeout: 30_000 },
  );
  return data;
}

// ─── Analyse IA de conversation (agent analyste — sibling du brouillon IA) ───

export type ConversationAnalysisSeverity = 'critical' | 'important' | 'info';

export interface ConversationAnalysisProblem {
  title: string;
  severity: ConversationAnalysisSeverity;
  channel: string;
  evidence?: string;
  consequence?: string;
}

export interface ConversationAnalysisAction {
  title: string;
  recommendation: string;
  deadline?: string;
  relatedProblem?: string;
}

export interface ConversationAnalysisReply {
  label: string;
  channel: string;
  responseClient: string;
  responseAdmin?: string;
}

export interface ConversationAnalysisRequest {
  phone: string;
  reservationId?: string;
  reservationNumber?: string;
  targetLanguage?: string;
  regenerate?: boolean;
}

export interface ConversationAnalysisResult {
  success: boolean;
  summary?: string;
  problems?: ConversationAnalysisProblem[];
  actions?: ConversationAnalysisAction[];
  suggestedReplies?: ConversationAnalysisReply[];
  channelsAnalyzed?: { whatsapp: number; ota: number };
  model?: string;
  cached?: boolean;
  message?: string;
}

/**
 * Analyse IA d'une conversation (WhatsApp slice 1) — le backend récupère
 * l'historique lui-même : on n'envoie que les identifiants, pas le transcript.
 */
export async function analyzeConversation(
  body: ConversationAnalysisRequest,
): Promise<ConversationAnalysisResult> {
  const { data } = await apiClient.post<ConversationAnalysisResult>(
    `${COMMS_AI_BASE}/conversation-analysis`,
    body,
    { timeout: 120_000 },
  );
  return data;
}
