/**
 * Unified API Icons - Icônes par type d'action
 */

import React from 'react';

/**
 * Mapping icônes par action
 */
const UNIFIED_ICONS: Record<string, string> = {
  // ========================================
  // AirROI APIs
  // ========================================
  'GET /api/listings': '📨',
  'POST /api/listings': '➕',
  'PATCH /api/listings': '✏️',
  'DELETE /api/listings': '🗑️',
  'GET /api/pricing': '💰',
  'POST /api/pricing': '💵',
  'PATCH /api/calendar': '📅',
  'GET /api/reviews': '⭐',

  // ========================================
  // RU Pull (GET)
  // ========================================
  PullListOwnerBlock: '📥',
  PullListOwnerProp: '🏠',
  LocationDetails: '📍',
  PullReservations: '📋',
  PullOwnerDetails: '👤',

  // ========================================
  // RU Push (POST)
  // ========================================
  PutBlock: '🔒',
  RemoveBlock: '🔓',
  NotificationReport: '📢',
  PushProperty: '🏘️',
  CancelReservation: '❌',

  // ========================================
  // RU OAuth
  // ========================================
  OAuth: '🔑',
  OAuthToken: '🎟️',
  OAuthRefresh: '🔄',

  // ========================================
  // RU REST (Messaging)
  // ========================================
  RU_REST_GET_api_messaging: '💬',
  RU_REST_POST_api_messaging: '📤',

  // ========================================
  // RU Webhooks
  // ========================================
  LNM_PutConfirmedReservation_RQ: '✅',
  LNM_CancelReservation_RQ: '❌',
  LNM_GetLeads_RQ: '🎯',
  LNM_PutReview_RQ: '⭐',

  // ========================================
  // Ingress HTTP
  // ========================================
  'POST /webhook': '✉️',
  'GET /health': '❤️',
  'POST /api/channels': '🔗',
};

/**
 * Récupérer icône pour une action
 */
export function getIconForAction(action: string): string {
  // Match exact
  if (UNIFIED_ICONS[action]) {
    return UNIFIED_ICONS[action];
  }

  // Match par pattern (ex: RU_REST_GET_api_messaging_...)
  if (action.startsWith('RU_REST_GET')) return '💬';
  if (action.startsWith('RU_REST_POST')) return '📤';
  if (action.startsWith('RU_REST_PUT')) return '✏️';
  if (action.startsWith('RU_REST_DELETE')) return '🗑️';

  // Match par prefix HTTP method
  if (action.startsWith('GET ')) return '📨';
  if (action.startsWith('POST ')) return '📤';
  if (action.startsWith('PUT ')) return '✏️';
  if (action.startsWith('PATCH ')) return '🔧';
  if (action.startsWith('DELETE ')) return '🗑️';

  // Default
  return '📝';
}

/**
 * Composant icône
 */
export function ApiActionIcon({ action, size = 'base' }: { action: string; size?: 'sm' | 'base' | 'lg' }) {
  const icon = getIconForAction(action);

  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span className={`inline-block ${sizeClasses[size]}`} title={action}>
      {icon}
    </span>
  );
}
