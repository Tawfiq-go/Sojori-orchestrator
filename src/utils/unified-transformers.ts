/**
 * Transformers - Convert source-specific types to UnifiedApiCall
 */

import type { UnifiedApiCall } from '../types/unified-api-call';

/**
 * ========================================
 * AirROI Transformer
 * ========================================
 */
export interface AirroiCall {
  id: string;
  createdAt: Date;
  endpoint: string;
  endpointLabel?: string;
  requestPayload: unknown;
  responsePayload: unknown;
  responseStatus: number;
  durationMs: number;
  costUsd?: number;
  success: boolean;
  triggeredBy?: string;
  errorMessage?: string;
}

export function transformAirroiCall(airroi: AirroiCall): UnifiedApiCall {
  return {
    id: airroi.id,
    source: 'airroi',
    timestamp: airroi.createdAt,
    action: airroi.endpoint,
    request: {
      format: 'json',
      content: airroi.requestPayload,
      size: JSON.stringify(airroi.requestPayload || {}).length,
    },
    response: {
      format: 'json',
      content: airroi.responsePayload,
      size: JSON.stringify(airroi.responsePayload || {}).length,
    },
    status: airroi.success ? 'success' : 'error',
    httpStatus: airroi.responseStatus,
    durationMs: airroi.durationMs,
    triggeredBy: airroi.triggeredBy,
    metadata: {
      costUsd: airroi.costUsd,
      endpointLabel: airroi.endpointLabel,
      errorMessage: airroi.errorMessage,
    },
  };
}

/**
 * ========================================
 * RU API Transformer
 * ========================================
 */
export interface RuApiCall {
  id: string;
  createdAt: Date;
  action: string;
  requestXml: string;
  responseXml: string;
  responseJson?: Record<string, unknown>; // Enrichi (business mode)
  status: 'success' | 'failed' | 'error';
  statusCode?: string; // RU status code ('0' = success)
  responseMsg?: string;
  httpStatus?: number;
  responseTime: number; // ms
  ownerId?: string;
  ownerName?: string;
  listingId?: string;
  listingName?: string;
  orchestrationId?: string;
  reservationId?: string;
  reservationCode?: string;
  channel?: string;
  triggeredBy?: string;
}

export function transformRuApiCall(ru: RuApiCall, enriched = false): UnifiedApiCall {
  const isSuccess = ru.status === 'success' && (ru.statusCode === '0' || !ru.statusCode);

  return {
    id: ru.id,
    source: 'ru-api',
    timestamp: ru.createdAt,
    action: ru.action,

    // Request: toujours XML brut
    request: {
      format: 'xml',
      content: ru.requestXml,
      size: ru.requestXml.length,
    },

    // Response: XML brut + JSON enrichi si business mode
    response: {
      format: 'xml',
      content: ru.responseXml,
      size: ru.responseXml.length,
      enriched: enriched ? ru.responseJson : undefined, // ← enrichissement conditionnel
    },

    status: isSuccess ? 'success' : 'error',
    httpStatus: ru.httpStatus || (isSuccess ? 200 : 400),
    durationMs: ru.responseTime,

    // Context business
    ownerId: ru.ownerId,
    ownerName: ru.ownerName,
    listingId: ru.listingId,
    listingName: ru.listingName,
    reservationId: ru.reservationId,
    reservationCode: ru.reservationCode,
    channel: ru.channel,
    triggeredBy: ru.triggeredBy,
    correlationId: ru.orchestrationId,

    metadata: {
      ruStatusCode: ru.statusCode,
      ruMessage: ru.responseMsg,
    },
  };
}

/**
 * ========================================
 * RU Webhook Transformer
 * ========================================
 */
export interface RuWebhook {
  id: string;
  timestamp: Date;
  event: string; // LNM_PutConfirmedReservation_RQ, etc.
  xmlData: string; // Request XML from RU
  responseXml?: string; // Our response to RU
  parsedData?: {
    reservationId?: string;
    reservationCode?: string;
    dateFrom?: string;
    dateTo?: string;
    propertyId?: string;
    [key: string]: unknown;
  };
  webhook_status: 'processed' | 'failed';
  processingTime?: number;
  errorMessage?: string;
  ipAddress?: string;
  signature?: string;
}

export function transformRuWebhook(webhook: RuWebhook, enriched = false): UnifiedApiCall {
  const isSuccess = webhook.webhook_status === 'processed';

  return {
    id: webhook.id,
    source: 'ru-webhook',
    timestamp: webhook.timestamp,
    action: webhook.event,

    // Request: XML from RU
    request: {
      format: 'xml',
      content: webhook.xmlData,
      size: webhook.xmlData.length,
      enriched: enriched ? webhook.parsedData : undefined, // ← enrichissement conditionnel
    },

    // Response: Our XML response to RU
    response: {
      format: 'xml',
      content: webhook.responseXml || '<Success>true</Success>',
      size: webhook.responseXml?.length || 0,
    },

    status: isSuccess ? 'success' : 'error',
    httpStatus: isSuccess ? 200 : 500,
    durationMs: webhook.processingTime || 0,

    // Context business (from parsed data)
    reservationId: webhook.parsedData?.reservationId,
    reservationCode: webhook.parsedData?.reservationCode,
    listingId: webhook.parsedData?.propertyId,

    metadata: {
      eventType: webhook.event,
      ipSource: webhook.ipAddress,
      ruSignature: webhook.signature,
      errorMessage: webhook.errorMessage,
    },
  };
}

/**
 * ========================================
 * Ingress HTTP Transformer
 * ========================================
 */
export interface IngressHttp {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  responseStatus: number;
  responseBody: string;
  processingTime: number;
  ipAddress: string;
  userAgent?: string;
  correlationId?: string;
}

export function transformIngressHttp(ingress: IngressHttp): UnifiedApiCall {
  const isSuccess = ingress.responseStatus >= 200 && ingress.responseStatus < 300;

  return {
    id: ingress.id,
    source: 'ingress',
    timestamp: ingress.timestamp,
    action: `${ingress.method} ${ingress.path}`,

    // Request: HTTP raw
    request: {
      format: 'http',
      content: `${ingress.method} ${ingress.path}\n${Object.entries(ingress.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')}\n\n${ingress.body}`,
      size: ingress.body.length,
    },

    // Response: HTTP raw
    response: {
      format: 'http',
      content: `HTTP/1.1 ${ingress.responseStatus}\n\n${ingress.responseBody}`,
      size: ingress.responseBody.length,
    },

    status: isSuccess ? 'success' : 'error',
    httpStatus: ingress.responseStatus,
    durationMs: ingress.processingTime,

    correlationId: ingress.correlationId,

    metadata: {
      method: ingress.method,
      path: ingress.path,
      headers: ingress.headers,
      ipSource: ingress.ipAddress,
      userAgent: ingress.userAgent,
    },
  };
}

/**
 * ========================================
 * Batch Transformers
 * ========================================
 */

export function transformAirroiCalls(calls: AirroiCall[]): UnifiedApiCall[] {
  return calls.map(transformAirroiCall);
}

export function transformRuApiCalls(calls: RuApiCall[], enriched = false): UnifiedApiCall[] {
  return calls.map((call) => transformRuApiCall(call, enriched));
}

export function transformRuWebhooks(webhooks: RuWebhook[], enriched = false): UnifiedApiCall[] {
  return webhooks.map((webhook) => transformRuWebhook(webhook, enriched));
}

export function transformIngressHttpCalls(calls: IngressHttp[]): UnifiedApiCall[] {
  return calls.map(transformIngressHttp);
}
