import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

export type OcrDocumentType = 'passport' | 'national_id';

export type OcrBenchmarkCategory =
  | 'production_baseline'
  | 'fast_candidate'
  | 'balanced_candidate'
  | 'quality_candidate'
  | 'specialized_ocr';

export type OcrBenchmarkCompareScope = 'standard' | 'all';

export interface OcrBenchmarkProvider {
  provider: string;
  modelIds: string[];
  model: string;
  displayName: string;
  category: OcrBenchmarkCategory;
  pricingAvailable: boolean;
  freeTierEligible?: boolean;
  requiresPaidAccess?: boolean;
  description: string;
  credentialConfigured: boolean;
  credentialStatus: string;
  enabled: boolean;
}

export interface OcrReferenceValues {
  first_name?: string;
  last_name?: string;
  document_number?: string;
  nationality?: string;
  birth_date?: string;
  expiry_date?: string;
  gender?: string;
  issuing_country?: string;
}

export interface OcrExtractedFields {
  document_type?: string;
  observed_document_type?: string;
  first_name?: string;
  last_name?: string;
  document_number?: string;
  nationality?: string;
  issuing_country?: string;
  residence_country?: string;
  gender?: string;
  birth_date?: string;
  place_of_birth?: string;
  document_issued_at?: string;
  document_issued_on?: string;
  document_expiry_date?: string;
  personal_number?: string;
  mrz_line1?: string;
  mrz_line2?: string;
  mrz_line3?: string;
}

export interface OcrBenchmarkRunMetrics {
  success: boolean;
  extracted: OcrExtractedFields | null;
  reliabilityPass: boolean;
  completenessPercent: number;
  accuracyPercent: number | null;
  mrzDetected: boolean;
  mrzChecksumValid: boolean | null;
  imageBytesBefore: number;
  imageBytesAfter: number;
  prepMs: number;
  providerLatencyMs: number;
  parseMs: number;
  backendTotalMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  estimatedCostUsd: number | null;
  costLabel: string;
  costFreeTierEligible?: boolean;
  paidTierEquivalentUsd?: number | null;
  ocrConfigNote?: string;
  under4s: boolean;
  underWhatsappBudget: boolean;
  promptCacheStatus?: 'cold' | 'warm' | 'unknown';
  error?: string;
  provider: string;
  model: string;
}

export interface OcrLatencyAgg {
  min: number | null;
  max: number | null;
  avg: number | null;
  p50: number | null;
  p95: number | null;
  successRate: number;
}

export interface OcrBenchmarkResult {
  modelId: string;
  provider: string;
  model: string;
  displayName: string;
  category: OcrBenchmarkCategory;
  credentialStatus: string;
  runs: OcrBenchmarkRunMetrics[];
  aggregated: {
    successRate: number;
    apiLatency: OcrLatencyAgg;
    backendTotal: OcrLatencyAgg;
    avgEstimatedCostUsd: number | null;
    completenessPercent: number | null;
    accuracyPercent: number | null;
    reliabilityRate: number;
  };
  lastRun: OcrBenchmarkRunMetrics | null;
}

export interface OcrBenchmarkSingleResponse {
  mode: 'single';
  metricScope: string;
  whatsappTimingNotice: string;
  roundTripMs: number;
  runCount: number;
  expectedDocumentType: OcrDocumentType;
  result: OcrBenchmarkResult;
}

export interface OcrBenchmarkCompareResponse {
  mode: 'compare';
  compareScope?: OcrBenchmarkCompareScope;
  metricScope: string;
  whatsappTimingNotice: string;
  roundTripMs: number;
  runCount: number;
  expectedDocumentType: OcrDocumentType;
  results: OcrBenchmarkResult[];
}

const OCR_PRODUCTION_BASE = `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/ocr-benchmark`;

const WHATSAPP_TIMING_NOTICE =
  'Mesure le cœur OCR backend uniquement — hors téléchargement Meta, décryptage Flow et latence réseau WhatsApp.';

export async function fetchOcrBenchmarkProviders(): Promise<OcrBenchmarkProvider[]> {
  const res = await apiClient.get(`${OCR_PRODUCTION_BASE}/providers`);
  if (res.data?.success === false) {
    throw new Error(res.data.error || 'Providers OCR indisponibles');
  }
  return res.data?.data?.providers ?? [];
}

type RunPayload = {
  imageBase64: string;
  mimeType: string;
  expectedDocumentType: OcrDocumentType;
  modelId: string;
  runCount: 1 | 3 | 5;
  reference?: OcrReferenceValues;
  clientStartedAt?: number;
};

async function postProductionRun(payload: RunPayload): Promise<OcrBenchmarkSingleResponse> {
  const res = await apiClient.post(`${OCR_PRODUCTION_BASE}/run`, {
    ...payload,
    clientStartedAt: payload.clientStartedAt ?? Date.now(),
  });
  if (res.data?.success === false) {
    throw new Error(res.data.error || 'Échec benchmark OCR');
  }
  return res.data.data as OcrBenchmarkSingleResponse;
}

export async function runOcrBenchmark(input: {
  imageBase64: string;
  mimeType: string;
  expectedDocumentType: OcrDocumentType;
  modelId: string;
  runCount: 1 | 3 | 5;
  reference?: OcrReferenceValues;
  clientStartedAt?: number;
}): Promise<OcrBenchmarkSingleResponse> {
  const payload: RunPayload = {
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
    expectedDocumentType: input.expectedDocumentType,
    modelId: input.modelId,
    runCount: input.runCount,
    reference: input.reference,
    clientStartedAt: input.clientStartedAt,
  };
  return postProductionRun(payload);
}

export async function compareOcrModels(input: {
  imageBase64: string;
  mimeType: string;
  expectedDocumentType: OcrDocumentType;
  runCount: 1 | 3 | 5;
  reference?: OcrReferenceValues;
  clientStartedAt?: number;
  providers: OcrBenchmarkProvider[];
  compareScope?: OcrBenchmarkCompareScope;
}): Promise<OcrBenchmarkCompareResponse> {
  const clientStartedAt = input.clientStartedAt ?? Date.now();
  const compareScope = input.compareScope ?? 'standard';
  const qualityIds = new Set(
    input.providers.filter((p) => p.category === 'quality_candidate').map((p) => p.modelIds[0]),
  );
  const enabled = input.providers.filter((p) => {
    if (!p.enabled) return false;
    if (compareScope === 'standard' && qualityIds.has(p.modelIds[0])) return false;
    return true;
  });
  const results: OcrBenchmarkResult[] = [];

  for (const provider of enabled) {
    const modelId = provider.modelIds[0]!;
    const single = await runOcrBenchmark({
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
      expectedDocumentType: input.expectedDocumentType,
      modelId,
      runCount: input.runCount,
      reference: input.reference,
    });
    results.push(single.result);
  }

  return {
    mode: 'compare',
    compareScope,
    metricScope: 'ocr_backend_core',
    whatsappTimingNotice: WHATSAPP_TIMING_NOTICE,
    roundTripMs: Date.now() - clientStartedAt,
    runCount: input.runCount,
    expectedDocumentType: input.expectedDocumentType,
    results,
  };
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
      if (!match) {
        reject(new Error('Lecture image impossible'));
        return;
      }
      resolve({ mimeType: match[1]!, base64: match[2]! });
    };
    reader.onerror = () => reject(new Error('Lecture image impossible'));
    reader.readAsDataURL(file);
  });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(2)} Mo`;
}

export const CATEGORY_LABELS: Record<OcrBenchmarkCategory, string> = {
  production_baseline: 'Baseline prod.',
  fast_candidate: 'Rapide',
  balanced_candidate: 'Équilibré',
  quality_candidate: 'Qualité',
  specialized_ocr: 'OCR spécialisé',
};

export const CATEGORY_ORDER: OcrBenchmarkCategory[] = [
  'production_baseline',
  'fast_candidate',
  'balanced_candidate',
  'quality_candidate',
  'specialized_ocr',
];
