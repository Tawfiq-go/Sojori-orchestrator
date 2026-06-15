/**
 * Map DebugApiTab Mongo rows + lazy-loaded bodies → UnifiedApiCall (mode debug, sans enrichissement).
 */

import type { UnifiedApiCall } from '../types/unified-api-call';
import { transformRuApiCall, transformRuWebhook } from './unified-transformers';

export type DebugApiBody = {
  error?: string;
  requestXml?: string;
  responseXml?: string;
  requestPayload?: unknown;
  responseJson?: unknown;
  rawBody?: string;
  ingressMeta?: {
    channel?: string;
    ruEventKey?: string;
    correlationId?: string;
    publishOk?: boolean;
    domainIntentPublished?: boolean;
  };
};

export type DebugApiRow = Record<string, unknown> & {
  _id?: string;
  id?: string;
  action?: string;
  status?: string;
  createdAt?: string;
  timestamp?: string;
  error?: string;
  responseMsg?: string;
  responseTime?: number;
  statusCode?: number | string;
  auditContext?: {
    ownerId?: string;
    ownerIds?: string[];
  };
};

export type DebugApiMeta = {
  collection?: string;
  category?: string;
  name?: string;
};

export function getDebugApiRowId(row: DebugApiRow, idx = 0): string {
  return String(row._id || row.id || `${row.action ?? 'row'}-${idx}`);
}

function toDate(value: string | undefined): Date {
  if (value) return new Date(value);
  return new Date();
}

function normalizeRuStatus(status: string | undefined): 'success' | 'error' {
  const s = String(status || '').toLowerCase();
  if (s === 'success' || s === 'ok') return 'success';
  return 'error';
}

function bodyToRequestContent(body: DebugApiBody | undefined): string {
  if (body?.requestXml) return body.requestXml;
  if (body?.rawBody) return body.rawBody;
  if (body?.requestPayload != null) {
    return typeof body.requestPayload === 'string'
      ? body.requestPayload
      : JSON.stringify(body.requestPayload, null, 2);
  }
  return '';
}

function bodyToResponseContent(body: DebugApiBody | undefined): string {
  if (body?.responseXml) return body.responseXml;
  if (body?.responseJson != null) {
    return typeof body.responseJson === 'string'
      ? body.responseJson
      : JSON.stringify(body.responseJson, null, 2);
  }
  return '';
}

/**
 * Convertit une ligne Debug + body optionnel en UnifiedApiCall (enriched=false).
 */
export function mapDebugRowToUnifiedCall(
  row: DebugApiRow,
  body: DebugApiBody | undefined,
  api: DebugApiMeta | null,
  ownerNamesCache: Record<string, string> = {},
  rowIndex = 0,
): UnifiedApiCall {
  const id = getDebugApiRowId(row, rowIndex);
  const isIngress = api?.collection === 'ChannelBookingIngress';

  if (isIngress) {
    const webhook = transformRuWebhook(
      {
        id,
        timestamp: toDate(row.createdAt || row.timestamp),
        event: String(row.action || api?.name || 'webhook'),
        xmlData: bodyToRequestContent(body),
        responseXml: body?.responseXml,
        webhook_status: normalizeRuStatus(row.status) === 'success' ? 'processed' : 'failed',
        processingTime: Number(row.responseTime || 0),
        errorMessage: String(row.error || row.responseMsg || body?.error || ''),
        ipAddress: body?.ingressMeta?.channel,
      },
      false,
    );

    if (body?.ingressMeta) {
      webhook.metadata = {
        ...webhook.metadata,
        channel: body.ingressMeta.channel,
        ruEventKey: body.ingressMeta.ruEventKey,
        correlationId: body.ingressMeta.correlationId,
        publishOk: body.ingressMeta.publishOk,
        domainIntentPublished: body.ingressMeta.domainIntentPublished,
      };
      webhook.correlationId = body.ingressMeta.correlationId;
    }

    return webhook;
  }

  const ownerId = row.auditContext?.ownerId || row.auditContext?.ownerIds?.[0];
  const ownerName = ownerId ? ownerNamesCache[ownerId] || ownerId : undefined;
  const requestContent = bodyToRequestContent(body);
  const responseContent = bodyToResponseContent(body);

  return transformRuApiCall(
    {
      id,
      createdAt: toDate(row.createdAt || row.timestamp),
      action: String(row.action || api?.name || ''),
      requestXml: requestContent,
      responseXml: responseContent,
      status: normalizeRuStatus(row.status),
      statusCode: row.statusCode != null ? String(row.statusCode) : undefined,
      responseMsg: String(row.responseMsg || row.error || body?.error || ''),
      responseTime: Number(row.responseTime || 0),
      ownerId,
      ownerName,
      channel: 'ru',
    },
    false,
  );
}

export function mapDebugRowsToUnifiedCalls(
  rows: DebugApiRow[],
  bodiesById: Record<string, DebugApiBody>,
  api: DebugApiMeta | null,
  ownerNamesCache: Record<string, string> = {},
): UnifiedApiCall[] {
  return rows.map((row, idx) => {
    const rowId = getDebugApiRowId(row, idx);
    return mapDebugRowToUnifiedCall(row, bodiesById[rowId], api, ownerNamesCache, idx);
  });
}
