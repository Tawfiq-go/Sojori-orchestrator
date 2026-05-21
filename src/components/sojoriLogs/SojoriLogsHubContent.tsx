import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { MockUser } from '../../data/mockAuth';
import { formatCasablancaDate } from '../../utils/dateFormatting';
import {
  fetchSojoriAirroiApis,
  fetchSojoriAirroiCallDetail,
} from '../../services/channelsDashboardApi';
import { SOJORI_LOG_TAB_ALL } from '../../data/airroiLogTabs';
import { resolveAirroiRowRecap } from '../../utils/airroiCallRecap';
import { SojoriLogsToolbar } from './SojoriLogsToolbar';
import { SojoriLogsEndpointTabs } from './SojoriLogsEndpointTabs';

const PAGE_SIZE = 20;

const DATE_PRESETS = [
  { id: 'today', label: "Aujourd'hui", hours: 24 },
  { id: 'last7days', label: '7 jours', hours: 168 },
  { id: 'last30days', label: '30 jours', hours: 720 },
  { id: 'all', label: 'Tout', period: 'all' as const },
];

function resolveOwnerIdFromSession(user: MockUser | null): string {
  if (!user) return '';
  const role = String(user.role || '').toLowerCase();
  if (role === 'owner') return String(user.id || '');
  return '';
}

function isPlatformAdmin(role: string | undefined): boolean {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'superadmin';
}

function statusBadgeClass(ok: boolean) {
  return ok
    ? 'bg-green-50 text-green-700 border border-green-200'
    : 'bg-red-50 text-red-700 border border-red-200';
}

export function SojoriLogsHubContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const endpointTab = searchParams.get('ep') || SOJORI_LOG_TAB_ALL;
  const { user } = useAuth();

  const sessionOwnerId = useMemo(() => resolveOwnerIdFromSession(user), [user]);
  const platformAdmin = isPlatformAdmin(user?.role);

  const [datePreset, setDatePreset] = useState('last7days');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listData, setListData] = useState<{
    items?: Array<Record<string, unknown>>;
    pagination?: { total?: number; page?: number; limit?: number };
    availableEndpoints?: Array<{ endpoint?: string; label?: string }>;
  } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const setEndpointTab = (ep: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('ep', ep);
    setSearchParams(next, { replace: false });
    setPage(1);
    setExpandedId(null);
    setDetail(null);
  };

  const dateQuery = useMemo(() => {
    const preset = DATE_PRESETS.find((p) => p.id === datePreset) || DATE_PRESETS[1];
    if ('period' in preset && preset.period === 'all') return { period: 'all' as const };
    return { hours: preset.hours };
  }, [datePreset]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ownerId = sessionOwnerId || undefined;
      const { data: body } = await fetchSojoriAirroiApis({
        page,
        limit: PAGE_SIZE,
        endpoint: endpointTab === SOJORI_LOG_TAB_ALL ? undefined : endpointTab,
        ownerId: platformAdmin && !ownerId ? undefined : ownerId,
        ...dateQuery,
      });
      if (!body?.success) {
        setError(body?.error || 'Erreur chargement des logs API');
        setListData(null);
        return;
      }
      setListData(body.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err?.response?.data?.error || err?.message || 'Erreur réseau');
      setListData(null);
    } finally {
      setLoading(false);
    }
  }, [page, endpointTab, sessionOwnerId, platformAdmin, dateQuery]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const { data: body } = await fetchSojoriAirroiCallDetail(id);
      setDetail(body?.success ? body.data : null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const items = (listData?.items || []) as Array<{
    id: string;
    createdAt?: string;
    endpoint?: string;
    endpointLabel?: string;
    responseStatus?: number;
    durationMs?: number;
    costUsd?: number;
    success?: boolean;
    triggeredBy?: string;
    recap?: string;
    errorMessage?: string | null;
    requestPayload?: Record<string, unknown> | null;
  }>;
  const pagination = listData?.pagination || { total: 0, page: 1, limit: PAGE_SIZE };
  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / (pagination.limit || PAGE_SIZE)));

  return (
    <div className="space-y-2">
      <SojoriLogsToolbar onRefresh={loadList} loading={loading} />

      <SojoriLogsEndpointTabs
        activeId={endpointTab}
        onSelect={setEndpointTab}
        availableEndpoints={listData?.availableEndpoints}
      />

      <div className="channels-filters-bar">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Période</span>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setDatePreset(p.id);
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                datePreset === p.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-500">
            Owner :{' '}
            {sessionOwnerId ? (
              <span className="font-mono text-slate-700">{sessionOwnerId}</span>
            ) : platformAdmin ? (
              'tous (admin)'
            ) : (
              '—'
            )}
          </span>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium w-[30px]" />
                <th className="text-left px-2 py-1.5 font-medium">Date</th>
                <th className="text-left px-2 py-1.5 font-medium">Endpoint</th>
                <th className="text-left px-2 py-1.5 font-medium min-w-[220px]">Récap</th>
                <th className="text-left px-2 py-1.5 font-medium">HTTP</th>
                <th className="text-right px-2 py-1.5 font-medium">ms</th>
                <th className="text-right px-2 py-1.5 font-medium">$</th>
                <th className="text-left px-2 py-1.5 font-medium">Statut</th>
                <th className="text-left px-2 py-1.5 font-medium">Trigger</th>
              </tr>
            </thead>
            <tbody>
              {loading && !items.length ? (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-slate-400">
                    Chargement…
                  </td>
                </tr>
              ) : null}
              {!loading && !items.length ? (
                <tr>
                  <td colSpan={9} className="px-2 py-8 text-center text-slate-400">
                    Aucun appel API pour ce filtre.
                  </td>
                </tr>
              ) : null}
              {items.map((row) => {
                const expanded = expandedId === row.id;
                const recapText = resolveAirroiRowRecap(row as Record<string, unknown>);
                return (
                  <React.Fragment key={row.id}>
                    <tr className="border-t border-slate-100 hover:bg-orange-50/30 cursor-pointer">
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-slate-500 hover:text-orange-600 p-0.5 rounded"
                          onClick={() => openDetail(row.id)}
                          aria-expanded={expanded}
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-slate-700 whitespace-nowrap">
                        {row.createdAt ? formatCasablancaDate(row.createdAt, 'dd/MM HH:mm:ss') : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="font-medium text-slate-800 text-[11px]">{row.endpointLabel || row.endpoint}</div>
                        {row.endpoint && (
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">{row.endpoint}</div>
                        )}
                      </td>
                      <td
                        className="px-2 py-1.5 text-[11px] text-slate-700 sojori-logs-recap-cell"
                        title={recapText}
                      >
                        <span className={row.success ? 'text-slate-700' : 'text-red-700'}>{recapText}</span>
                      </td>
                      <td className="px-2 py-1.5 tabular-nums">{row.responseStatus ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{row.durationMs ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {row.costUsd != null ? Number(row.costUsd).toFixed(2) : '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusBadgeClass(Boolean(row.success))}`}
                        >
                          {row.success ? 'OK' : 'ERR'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[10px] text-slate-500 truncate max-w-[100px]" title={row.triggeredBy}>
                        {row.triggeredBy || '—'}
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={9} className="px-2 py-3 bg-slate-50">
                          {detailLoading ? (
                            <span className="text-xs text-slate-500">Chargement détail…</span>
                          ) : detail ? (
                            <div className="space-y-2">
                              {typeof detail.recap === 'string' && detail.recap ? (
                                <p className="text-xs text-slate-800 m-0 leading-snug border-l-2 border-orange-500 pl-2">
                                  {detail.recap}
                                </p>
                              ) : null}
                              <pre className="text-[10px] font-mono whitespace-pre-wrap break-all m-0 text-slate-700 max-h-80 overflow-auto border border-slate-200 rounded p-2 bg-white">
                                {JSON.stringify(
                                  {
                                    requestPayload: detail.requestPayload,
                                    responseStatus: detail.responseStatus,
                                    errorMessage: detail.errorMessage,
                                  },
                                  null,
                                  2,
                                )}
                              </pre>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">Détail indisponible</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span>
          {pagination.total ?? 0} appel(s) — page {pagination.page ?? page}/{totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            className="channels-btn-secondary disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            className="channels-btn-primary disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
