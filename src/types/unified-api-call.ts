/**
 * Unified API Call Types - Single interface pour toutes sources
 * (AirROI, RU APIs, RU Webhooks, Ingress HTTP)
 */

export type ApiCallSource = 'airroi' | 'ru-api' | 'ru-webhook' | 'ingress';

export type ApiCallStatus = 'success' | 'error' | 'warning';

export type ContentFormat = 'json' | 'xml' | 'http' | 'text';

export interface ApiCallContent {
  format: ContentFormat;
  content: string | object;
  size?: number;
  /** Pour JSON enrichi (business mode uniquement) */
  enriched?: Record<string, unknown>;
}

export interface UnifiedApiCall {
  /** ID unique du call */
  id: string;

  /** Source du call */
  source: ApiCallSource;

  /** Timestamp de l'appel */
  timestamp: Date;

  /** Action/Endpoint (adapté selon source) */
  action: string;

  /** Request (ce qu'on envoie ou ce qu'on reçoit si webhook) */
  request: ApiCallContent;

  /** Response (ce qu'on obtient ou ce qu'on renvoie si webhook) */
  response: ApiCallContent;

  /** Status global */
  status: ApiCallStatus;

  /** HTTP status code */
  httpStatus?: number;

  /** Durée en ms */
  durationMs: number;

  // ========================================
  // Context Business (optionnel selon source)
  // ========================================

  /** Owner ID */
  ownerId?: string;

  /** Owner name (enrichi) */
  ownerName?: string;

  /** Listing ID */
  listingId?: string;

  /** Listing name (enrichi) */
  listingName?: string;

  /** Reservation ID */
  reservationId?: string;

  /** Reservation code (enrichi) */
  reservationCode?: string;

  /** Channel (airbnb, booking, ru, etc.) */
  channel?: string;

  /** Triggered by (cron, event, manual, etc.) */
  triggeredBy?: string;

  /** Correlation ID pour tracer */
  correlationId?: string;

  // ========================================
  // Metadata source-specific
  // ========================================

  /** Metadata flexible selon source */
  metadata: {
    // AirROI
    costUsd?: number;
    endpointLabel?: string;

    // RU API
    ruStatusCode?: string; // '0' = success RU
    ruMessage?: string;

    // RU Webhook
    ipSource?: string;
    ruSignature?: string;
    eventType?: string;

    // Ingress HTTP
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    userAgent?: string;

    // Autres
    [key: string]: unknown;
  };
}

/**
 * Mode d'affichage
 */
export type ViewMode = 'business' | 'debug';

/**
 * Config colonnes selon mode
 */
export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  visible: boolean;
  render?: (call: UnifiedApiCall) => React.ReactNode;
}
