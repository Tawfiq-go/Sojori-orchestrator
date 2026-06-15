/**
 * Unified API Call Table - Tableau unifié pour toutes sources (AirROI, RU, Webhooks, Ingress)
 * Supporte 2 modes: business (enrichi) et debug (brut)
 */

import React, { useState } from 'react';
import type { UnifiedApiCall, ViewMode } from '../../types/unified-api-call';
import { ApiActionIcon } from './UnifiedApiIcons';
import { ContextBadges } from './UnifiedApiBadges';
import { StatusBadge, HttpStatusBadge, DurationBadge, SizeBadge } from './UnifiedApiStatus';
import { UnifiedApiCallDetail } from './UnifiedApiCallDetail';

/**
 * Props du tableau unifié
 */
interface UnifiedApiCallTableProps {
  /** Liste des appels API unifiés */
  calls: UnifiedApiCall[];

  /** Mode d'affichage: business (enrichi) ou debug (brut) */
  viewMode: ViewMode;

  /** Callback lors du clic sur une ligne */
  onCallClick?: (call: UnifiedApiCall) => void;

  /** Afficher les colonnes de contexte business (owner, listing, etc.) */
  showBusinessContext?: boolean;

  /** Expansion contrôlée (lazy-load externe) */
  expandedCallId?: string | null;
  onExpandChange?: (callId: string | null, call: UnifiedApiCall) => void;

  /** ID en cours de chargement (détail) */
  loadingCallId?: string | null;

  /** Rendu custom du panneau détail (sinon UnifiedApiCallDetail) */
  renderDetail?: (call: UnifiedApiCall) => React.ReactNode;

  /** Rendu compact (style Channels / Logs Sojori) */
  compact?: boolean;
}

/**
 * Tableau unifié avec colonnes adaptatives selon mode
 */
export function UnifiedApiCallTable({
  calls,
  viewMode,
  onCallClick,
  showBusinessContext = true,
  expandedCallId: controlledExpandedId,
  onExpandChange,
  loadingCallId,
  renderDetail,
  compact = false,
}: UnifiedApiCallTableProps) {
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
  const isControlled = controlledExpandedId !== undefined || onExpandChange != null;
  const expandedCallId = isControlled ? (controlledExpandedId ?? null) : internalExpandedId;

  const toggleExpand = (call: UnifiedApiCall) => {
    const nextId = expandedCallId === call.id ? null : call.id;
    if (onExpandChange) {
      onExpandChange(nextId, call);
      return;
    }
    setInternalExpandedId(nextId);
  };

  /**
   * Configuration des colonnes selon mode
   */
  const columns = getColumnsForMode(viewMode, showBusinessContext);

  return (
    <div className={`overflow-x-auto ${compact ? 'unified-api-table-compact' : ''}`}>
      <table className={`w-full ${compact ? 'text-xs sl-table' : 'min-w-full divide-y divide-slate-200'}`}>
        {/* Header */}
        <thead className={compact ? 'bg-slate-50 text-slate-700 border-b border-slate-200' : 'bg-slate-50'}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={
                  compact
                    ? 'text-left px-2 py-1.5 font-medium'
                    : `px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider ${col.width || ''}`
                }
              >
                {col.label}
              </th>
            ))}
            <th className="px-3 py-3 w-12" aria-label="Actions" />
          </tr>
        </thead>

        {/* Body */}
        <tbody className={compact ? '' : 'bg-white divide-y divide-slate-100'}>
          {calls.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-500">
                Aucun appel API trouvé
              </td>
            </tr>
          ) : (
            calls.map((call) => (
              <React.Fragment key={call.id}>
                {/* Ligne principale */}
                <tr
                  className={
                    compact
                      ? 'border-t border-slate-100 hover:bg-orange-50/30 cursor-pointer'
                      : 'hover:bg-slate-50 cursor-pointer transition-colors'
                  }
                  onClick={() => {
                    toggleExpand(call);
                    onCallClick?.(call);
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={compact ? 'px-2 py-1.5' : 'px-3 py-3 text-sm text-slate-900'}>
                      {col.render(call)}
                    </td>
                  ))}
                  <td className={compact ? 'px-2 py-1.5 text-right' : 'px-3 py-3 text-right'}>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(call);
                      }}
                    >
                      {loadingCallId === call.id ? '⋯' : expandedCallId === call.id ? '▼' : '▶'}
                    </button>
                  </td>
                </tr>

                {/* Ligne détail (expandable) */}
                {expandedCallId === call.id && (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-4 bg-slate-50">
                      {renderDetail ? (
                        renderDetail(call)
                      ) : loadingCallId === call.id ? (
                        <div className="text-center text-sm text-slate-500 py-4">Chargement…</div>
                      ) : (
                        <UnifiedApiCallDetail call={call} viewMode={viewMode} />
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Configuration des colonnes selon mode
 */
function getColumnsForMode(viewMode: ViewMode, showBusinessContext: boolean) {
  const baseColumns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      width: 'w-40',
      render: (call: UnifiedApiCall) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">{formatTime(call.timestamp)}</span>
          <span className="text-xs text-slate-500">{formatDate(call.timestamp)}</span>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      width: 'w-64',
      render: (call: UnifiedApiCall) => (
        <div className="flex items-center gap-2">
          <ApiActionIcon action={call.action} size="base" />
          <span className="font-mono text-xs truncate" title={call.action}>
            {call.action}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-48',
      render: (call: UnifiedApiCall) => (
        <StatusBadge status={call.status} httpStatus={call.httpStatus} />
      ),
    },
  ];

  // Mode Business: colonnes contextuelles
  if (viewMode === 'business' && showBusinessContext) {
    baseColumns.push({
      key: 'context',
      label: 'Context',
      width: 'w-80',
      render: (call: UnifiedApiCall) => <ContextBadges call={call} />,
    });
  }

  // Mode Debug: colonnes techniques
  if (viewMode === 'debug') {
    baseColumns.push(
      {
        key: 'source',
        label: 'Source',
        width: 'w-32',
        render: (call: UnifiedApiCall) => (
          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-mono">
            {call.source}
          </span>
        ),
      },
      {
        key: 'sizes',
        label: 'Req/Res Size',
        width: 'w-40',
        render: (call: UnifiedApiCall) => (
          <div className="flex gap-1">
            {call.request.size && <SizeBadge bytes={call.request.size} />}
            <span className="text-slate-300">→</span>
            {call.response.size && <SizeBadge bytes={call.response.size} />}
          </div>
        ),
      }
    );
  }

  // Colonne commune: durée
  baseColumns.push({
    key: 'duration',
    label: 'Duration',
    width: 'w-28',
    render: (call: UnifiedApiCall) => <DurationBadge durationMs={call.durationMs} />,
  });

  return baseColumns;
}

/**
 * Helpers de formatage
 */

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
