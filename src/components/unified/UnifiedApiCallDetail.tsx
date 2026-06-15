/**
 * Unified API Call Detail - Vue détaillée d'un appel API
 * Mode Business: JSON enrichi + résumé business
 * Mode Debug: XML/JSON brut avec syntax highlighting
 */

import React, { useState } from 'react';
import type { UnifiedApiCall, ViewMode } from '../../types/unified-api-call';
import { HttpStatusBadge, DurationBadge, SizeBadge } from './UnifiedApiStatus';

/**
 * Props de la vue détaillée
 */
interface UnifiedApiCallDetailProps {
  call: UnifiedApiCall;
  viewMode: ViewMode;
}

/**
 * Vue détaillée avec mode business vs debug
 */
export function UnifiedApiCallDetail({ call, viewMode }: UnifiedApiCallDetailProps) {
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'metadata'>('response');

  return (
    <div className="space-y-4">
      {/* Header: Métadonnées principales */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">ID:</span>
            <span className="font-mono text-xs text-slate-600">{call.id}</span>
          </div>

          {viewMode === 'debug' && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Source:</span>
              <span className="font-mono text-xs text-slate-600">{call.source}</span>
            </div>
          )}

          {call.correlationId && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Correlation ID:</span>
              <span className="font-mono text-xs text-slate-600">{call.correlationId}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {call.httpStatus && <HttpStatusBadge httpStatus={call.httpStatus} />}
          <DurationBadge durationMs={call.durationMs} />
        </div>
      </div>

      {/* Tabs: Request / Response / Metadata */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4">
          <TabButton active={activeTab === 'request'} onClick={() => setActiveTab('request')}>
            Request
            {call.request.size && (
              <span className="ml-2 text-xs opacity-70">({formatBytes(call.request.size)})</span>
            )}
          </TabButton>

          <TabButton active={activeTab === 'response'} onClick={() => setActiveTab('response')}>
            Response
            {call.response.size && (
              <span className="ml-2 text-xs opacity-70">({formatBytes(call.response.size)})</span>
            )}
          </TabButton>

          <TabButton active={activeTab === 'metadata'} onClick={() => setActiveTab('metadata')}>
            Metadata
          </TabButton>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded border border-slate-200">
        {activeTab === 'request' && <ContentPanel content={call.request} viewMode={viewMode} />}
        {activeTab === 'response' && <ContentPanel content={call.response} viewMode={viewMode} />}
        {activeTab === 'metadata' && <MetadataPanel call={call} viewMode={viewMode} />}
      </div>
    </div>
  );
}

/**
 * Bouton de tab
 */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Panel de contenu (Request ou Response)
 */
function ContentPanel({ content, viewMode }: { content: UnifiedApiCall['request']; viewMode: ViewMode }) {
  const [showRaw, setShowRaw] = useState(false);

  // Mode Business: Afficher enrichi si disponible, sinon brut
  if (viewMode === 'business' && content.enriched) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Business Data (Enriched)</span>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-blue-600 hover:text-blue-700 underline"
          >
            {showRaw ? 'Hide Raw' : 'Show Raw'}
          </button>
        </div>

        {showRaw ? (
          <CodeBlock code={content.content} format={content.format} />
        ) : (
          <EnrichedView data={content.enriched} />
        )}
      </div>
    );
  }

  // Mode Debug: Toujours afficher brut
  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          Raw Data ({content.format.toUpperCase()})
        </span>
        {content.size && <SizeBadge bytes={content.size} />}
      </div>
      <CodeBlock code={content.content} format={content.format} />
    </div>
  );
}

/**
 * Affichage du JSON enrichi (mode business)
 */
function EnrichedView({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 bg-slate-50 p-3 rounded">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-start gap-3">
          <span className="text-sm font-semibold text-slate-600 min-w-[120px]">{key}:</span>
          <span className="text-sm text-slate-900 font-mono break-all">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Code block avec syntax highlighting basique
 */
function CodeBlock({ code, format }: { code: string | object; format: string }) {
  const codeString = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

  return (
    <div className="relative">
      <pre className="bg-slate-900 text-slate-100 p-4 rounded overflow-x-auto text-xs font-mono max-h-96">
        <code>{codeString}</code>
      </pre>

      <CopyButton text={codeString} />
    </div>
  );
}

/**
 * Bouton de copie
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}

/**
 * Panel de metadata
 */
function MetadataPanel({ call, viewMode }: { call: UnifiedApiCall; viewMode: ViewMode }) {
  const metadata: Record<string, unknown> = {};

  // Context business (si mode business)
  if (viewMode === 'business') {
    if (call.ownerId) metadata['Owner ID'] = call.ownerId;
    if (call.ownerName) metadata['Owner Name'] = call.ownerName;
    if (call.listingId) metadata['Listing ID'] = call.listingId;
    if (call.listingName) metadata['Listing Name'] = call.listingName;
    if (call.reservationId) metadata['Reservation ID'] = call.reservationId;
    if (call.reservationCode) metadata['Reservation Code'] = call.reservationCode;
    if (call.channel) metadata['Channel'] = call.channel;
    if (call.triggeredBy) metadata['Triggered By'] = call.triggeredBy;
  }

  // Metadata technique (toujours)
  if (call.metadata) {
    Object.entries(call.metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        metadata[key] = value;
      }
    });
  }

  return (
    <div className="p-4">
      <div className="mb-3 text-sm font-semibold text-slate-700">Metadata</div>
      {Object.keys(metadata).length === 0 ? (
        <div className="text-sm text-slate-500">No metadata available</div>
      ) : (
        <div className="space-y-2 bg-slate-50 p-3 rounded">
          {Object.entries(metadata).map(([key, value]) => (
            <div key={key} className="flex items-start gap-3">
              <span className="text-sm font-semibold text-slate-600 min-w-[150px]">{key}:</span>
              <span className="text-sm text-slate-900 font-mono break-all">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Helpers
 */

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
