/**
 * Monitor → AI → Usage — stats par cas d'usage IA et par modèle.
 */
import apiClient from './apiClient';
import { channelsDashboardAxiosConfig } from '../utils/channelsAxiosConfig';

const PRICING_DASHBOARD = '/api/v1/admin/pricing-dashboard';

export type AiModality = 'text' | 'voice_stt' | 'voice_tts' | 'image';

export interface WindowStats {
  calls: number;
  successCount: number;
  failedCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  avgTotalTokens: number;
  avgCostUsd: number;
  minTotalTokens: number;
  maxTotalTokens: number;
  minCostUsd: number;
  maxCostUsd: number;
}

export interface MergedModelRow {
  useCaseId: string;
  useCaseLabel: string;
  service: string;
  modality: AiModality;
  triggeredBy: string;
  provider: string;
  llmModel: string;
  windows: {
    h24: WindowStats;
    d7: WindowStats;
    d30: WindowStats;
    month: WindowStats;
  };
  catalogOnly: boolean;
}

export interface MergedUseCase {
  id: string;
  label: string;
  service: string;
  description?: string;
  modality: AiModality;
  modalityLabel: string;
  models: MergedModelRow[];
  totals: {
    h24: WindowStats;
    d7: WindowStats;
    d30: WindowStats;
    month: WindowStats;
  };
  topModelD30?: { llmModel: string; provider: string; calls: number };
}

export interface ModalityTotals {
  modality: AiModality;
  label: string;
  windows: {
    h24: WindowStats;
    d7: WindowStats;
    d30: WindowStats;
    month: WindowStats;
  };
  useCaseCount: number;
}

export interface RecentAiCall {
  id: string;
  triggeredBy: string;
  provider: string;
  llmModel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  success: boolean;
  errorMessage?: string;
  ownerId?: string;
  createdAt: string;
}

export interface AiUsageBreakdownResponse {
  success: boolean;
  data: {
    useCases: MergedUseCase[];
    byModality: ModalityTotals[];
    globalTotals: {
      h24: WindowStats;
      d7: WindowStats;
      d30: WindowStats;
      month: WindowStats;
    };
    recentCalls: RecentAiCall[];
    recentTotal: number;
    serviceErrors: Record<string, string>;
  };
}

export function fetchAiUsageBreakdown(query: {
  triggeredBy?: string;
  provider?: string;
  llmModel?: string;
  callsPage?: number;
  callsLimit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (query.triggeredBy) params.set('triggeredBy', query.triggeredBy);
  if (query.provider) params.set('provider', query.provider);
  if (query.llmModel) params.set('llmModel', query.llmModel);
  if (query.callsPage) params.set('callsPage', String(query.callsPage));
  if (query.callsLimit) params.set('callsLimit', String(query.callsLimit));

  const qs = params.toString();
  return apiClient.get<AiUsageBreakdownResponse>(
    `${PRICING_DASHBOARD}/ai-usage-breakdown${qs ? `?${qs}` : ''}`,
    { ...channelsDashboardAxiosConfig(), timeout: 60000 },
  );
}
