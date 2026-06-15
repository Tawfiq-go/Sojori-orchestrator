/**
 * Logs AirROI — Design moderne inspiré de /reservations
 * Interface épurée pour audit appels API marché & listings
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Search, ChevronDown, ChevronUp, Clock, DollarSign } from 'lucide-react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAuth } from '../hooks/useAuth';
import type { MockUser } from '../data/mockAuth';
import { formatCasablancaDate } from '../utils/dateFormatting';
import {
  fetchSojoriAirroiApis,
  fetchSojoriAirroiCallDetail,
} from '../services/sojoriLogsDashboardApi';
import { resolveAirroiRowRecap } from '../utils/airroiCallRecap';
import '../styles/channels-hub.css';

const PAGE_SIZE = 50;

const DATE_PRESETS = [
  { id: 'today', label: "Aujourd'hui", hours: 24 },
  { id: 'week', label: '7 jours', hours: 168 },
  { id: 'month', label: '30 jours', hours: 720 },
  { id: 'all', label: 'Tout', period: 'all' as const },
];

const ENDPOINT_GROUPS = [
  { id: 'all', label: 'Tous les endpoints', icon: '📊' },
  { id: 'pricing', label: 'Pricing & comparables', icon: '💰', endpoints: ['GET /listings/comparables', 'GET /listings/future/rates'] },
  { id: 'markets', label: 'Métriques marché', icon: '📈', endpoints: ['POST /markets/metrics/all', 'POST /markets/summary', 'GET /markets/search'] },
  { id: 'listings', label: 'Listings', icon: '🏠', endpoints: ['GET /listings', 'GET /listings/metrics/all', 'POST /listings/batch'] },
  { id: 'search', label: 'Recherche', icon: '🔍', endpoints: ['POST /listings/search/market', 'POST /listings/search/polygon', 'POST /listings/search/radius'] },
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

function StatusBadge({ ok, http }: { ok: boolean; http: number }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
      ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {ok ? 'OK' : 'ERR'}
      <span className="text-slate-500">·</span>
      <span className="font-mono">{http}</span>
    </div>
  );
}

export function SojoriLogsAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const sessionOwnerId = useMemo(() => resolveOwnerIdFromSession(user), [user]);
  const platformAdmin = isPlatformAdmin(user?.role);

  const [groupFilter, setGroupFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [listData, setListData] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const dateQuery = useMemo(() => {
    const preset = DATE_PRESETS.find((p) => p.id === datePreset) || DATE_PRESETS[1];
    if ('period' in preset && preset.period === 'all') return { period: 'all' as const };
    return { hours: preset.hours };
  }, [datePreset]);

  const ownerFilter = platformAdmin && !sessionOwnerId ? undefined : sessionOwnerId || undefined;

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[AirROI Logs] Loading with params:', { page, limit: PAGE_SIZE, ownerId: ownerFilter, ...dateQuery });
      const { data: body } = await fetchSojoriAirroiApis({
        page,
        limit: PAGE_SIZE,
        // Ne pas filtrer par endpoint dans l'API — on filtre côté client
        ownerId: ownerFilter,
        ...dateQuery,
      });
      console.log('[AirROI Logs] API response:', body);
      // body = { success: true, data: { items: [...], pagination: {...}, availableEndpoints: [...] } }
      setListData(body?.success && body.data ? body.data : null);
    } catch (err) {
      console.error('[AirROI Logs] Error loading:', err);
    } finally {
      setLoading(false);
    }
  }, [page, ownerFilter, dateQuery]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const { data } = await fetchSojoriAirroiCallDetail(id);
      setDetail(data?.success ? data : null);
    } catch (err) {
      console.error('Error loading detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const allItems = listData?.items || [];

  // Filtrage côté client par groupe d'endpoints
  const items = useMemo(() => {
    if (groupFilter === 'all') return allItems;
    const group = ENDPOINT_GROUPS.find(g => g.id === groupFilter);
    if (!group || !group.endpoints) return allItems;
    return allItems.filter((item: any) =>
      group.endpoints?.some(ep => item.endpoint === ep)
    );
  }, [allItems, groupFilter]);

  const total = items.length;
  const successCount = items.filter((i: any) => i.success).length;
  const errorCount = items.filter((i: any) => !i.success).length;
  const avgMs = items.length ? Math.round(items.reduce((acc: number, i: any) => acc + (i.durationMs || 0), 0) / items.length) : 0;
  const totalCost = items.reduce((acc: number, i: any) => acc + (i.costUsd || 0), 0).toFixed(2);

  return (
    <DashboardWrapper breadcrumb={['Logs API', 'AirROI']}>
      <div className="min-h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-[1600px] mx-auto space-y-3">

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Logs AirROI</h1>
                <p className="text-xs text-slate-500 mt-0.5">API marché & listings — {total} appels</p>
              </div>
              <button
                onClick={loadList}
                disabled={loading}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>

            {/* Stats KPI */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">Total :</span>
                <span className="font-bold text-slate-900">{total}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-bold text-green-700">{successCount}</span>
                <span className="text-slate-500 text-xs">OK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="font-bold text-red-700">{errorCount}</span>
                <span className="text-slate-500 text-xs">erreurs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-900">{avgMs}ms</span>
                <span className="text-slate-500 text-xs">moy.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-900">${totalCost}</span>
                <span className="text-slate-500 text-xs">coût total</span>
              </div>
            </div>

            {/* Filtres */}
            <div className="px-4 py-3 flex flex-wrap items-center gap-3">
              {/* Période */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Période</span>
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setDatePreset(p.id); setPage(1); }}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                      datePreset === p.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-slate-200" />

              {/* Groupes endpoints */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Type</span>
                {ENDPOINT_GROUPS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setGroupFilter(g.id); setPage(1); }}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                      groupFilter === g.id
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{g.icon}</span>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-3 py-2 text-left font-semibold">Endpoint</th>
                    <th className="px-3 py-2 text-left font-semibold">Résumé</th>
                    <th className="px-3 py-2 text-center font-semibold">Statut</th>
                    <th className="px-3 py-2 text-right font-semibold">Durée</th>
                    <th className="px-3 py-2 text-right font-semibold">Coût</th>
                    <th className="px-3 py-2 text-left font-semibold">Trigger</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {loading && items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                        Chargement...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Aucun appel API trouvé
                      </td>
                    </tr>
                  ) : (
                    items.map((row: any) => {
                      const isExpanded = expandedId === row._id;
                      const ok = row.success || false;
                      const recap = resolveAirroiRowRecap(row);

                      return (
                        <React.Fragment key={row._id}>
                          <tr
                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => toggleExpand(row._id)}
                          >
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              {formatCasablancaDate(row.createdAt)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-900">{row.endpointLabel || row.endpoint}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{row.endpoint}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-600 max-w-md truncate">
                              {recap}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StatusBadge ok={ok} http={row.responseStatus || 0} />
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">
                              {row.durationMs || 0}ms
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">
                              ${(row.costUsd || 0).toFixed(3)}
                            </td>
                            <td className="px-3 py-2 text-slate-600 text-[11px]">
                              {row.triggeredBy || '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="px-4 py-4 bg-slate-50 border-b border-slate-200">
                                {detailLoading ? (
                                  <div className="text-center py-4 text-slate-500">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-500" />
                                  </div>
                                ) : detail ? (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-xs font-bold text-slate-700 mb-2">Request</div>
                                      <pre className="text-[10px] bg-white border border-slate-200 rounded p-3 overflow-x-auto">
                                        {JSON.stringify(detail.requestPayload || {}, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-700 mb-2">Response</div>
                                      <pre className="text-[10px] bg-white border border-slate-200 rounded p-3 overflow-x-auto max-h-64 overflow-y-auto">
                                        {JSON.stringify(detail.responsePayload || {}, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-slate-500">Détails non disponibles</div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="text-xs text-slate-600">
                  Page {page} — {items.length} sur {total} appels
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={items.length < PAGE_SIZE}
                    className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardWrapper>
  );
}

export default SojoriLogsAdminPage;
