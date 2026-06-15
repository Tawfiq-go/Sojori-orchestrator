/**
 * Unified API Status - Badge de statut avec couleurs sémantiques
 */

import React from 'react';
import type { UnifiedApiCall } from '../../types/unified-api-call';

/**
 * Props pour le badge de statut
 */
interface StatusBadgeProps {
  status: UnifiedApiCall['status'];
  httpStatus?: number;
  durationMs?: number;
}

/**
 * Configuration des couleurs par statut
 */
const STATUS_CONFIG = {
  success: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '✗',
  },
  warning: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: '⚠',
  },
};

/**
 * Badge de statut avec HTTP status et durée optionnels
 */
export function StatusBadge({ status, httpStatus, durationMs }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2">
      {/* Badge principal */}
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}
      >
        <span>{config.icon}</span>
        <span className="capitalize">{status}</span>
      </span>

      {/* HTTP Status (si disponible) */}
      {httpStatus !== undefined && (
        <span className="text-xs text-slate-500 font-mono">{httpStatus}</span>
      )}

      {/* Durée (si disponible) */}
      {durationMs !== undefined && (
        <span className="text-xs text-slate-400">{formatDuration(durationMs)}</span>
      )}
    </div>
  );
}

/**
 * Indicateur visuel minimaliste (pour tableaux denses)
 */
export function StatusIndicator({ status }: { status: UnifiedApiCall['status'] }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${config.bg} ${config.text}`}
      title={status}
    >
      {config.icon}
    </span>
  );
}

/**
 * Badge HTTP status avec couleur sémantique
 */
export function HttpStatusBadge({ httpStatus }: { httpStatus: number }) {
  const getColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-50 text-green-700 border-green-200';
    if (status >= 300 && status < 400) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status >= 400 && status < 500) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (status >= 500) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-semibold ${getColor(httpStatus)}`}
    >
      {httpStatus}
    </span>
  );
}

/**
 * Badge de durée avec couleur selon performance
 */
export function DurationBadge({ durationMs }: { durationMs: number }) {
  const getColor = (ms: number) => {
    if (ms < 1000) return 'bg-green-50 text-green-700';
    if (ms < 3000) return 'bg-yellow-50 text-yellow-700';
    if (ms < 10000) return 'bg-orange-50 text-orange-700';
    return 'bg-red-50 text-red-700';
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${getColor(durationMs)}`}>
      {formatDuration(durationMs)}
    </span>
  );
}

/**
 * Badge de taille (pour request/response)
 */
export function SizeBadge({ bytes }: { bytes: number }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-slate-600 text-xs font-mono">
      {formatBytes(bytes)}
    </span>
  );
}

/**
 * Helpers
 */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
