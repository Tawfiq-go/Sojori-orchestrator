/**
 * Onglet Résumé — KPIs alignés backend srv-channels /kpi (legacy ChannelsHubPage tab=Sum)
 */
import { Fragment, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { tokens as T } from '../dashboard/DashboardV2.components';
import {
  fetchChannelsKpi,
  fetchChannelsKpiFilters,
  fetchChannelsKpiActionDetails,
  fetchChannelsConsumptionHints,
} from '../../services/channelsDashboardApi';
import {
  actionToApiSeg,
  changeColorClass,
  pctChange,
  prettyRuEventKey,
} from '../../utils/channelsSharedUtils';

type KpiData = {
  windowHours?: number;
  total: number;
  publishedOk: number;
  publishedFailed: number;
  publishUnknown?: number;
  webhooksByType?: Array<{
    type: string;
    today: number;
    yesterday: number;
    todayOk: number;
    todayFail: number;
  }>;
  apiCallsComparison?: Record<
    string,
    {
      cron: number;
      cronSuccess: number;
      cronFailed: number;
      nonCron: number;
      nonCronSuccess: number;
      nonCronFailed: number;
    }
  >;
  apiCallsTopActions?: Array<{
    action: string;
    count: number;
    success: number;
    failed: number;
    isCron: boolean;
  }>;
  apiCallsByTrigger?: Array<{ trigger: string; count: number }>;
};

export function SummaryTab() {
  const [hours, setHours] = useState(72);
  const [ownerId, setOwnerId] = useState('');
  const [listingId, setListingId] = useState('');
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState('');
  const [hints, setHints] = useState<unknown>(null);
  const [filterOwners, setFilterOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [filterListings, setFilterListings] = useState<Array<{ id: string; name: string; owner?: string }>>([]);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [actionDetails, setActionDetails] = useState<Record<string, unknown[] | null>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadFilters = useCallback(async () => {
    try {
      const { data } = await fetchChannelsKpiFilters();
      if (data?.success && data.data) {
        setFilterOwners(Array.isArray(data.data.owners) ? data.data.owners : []);
        setFilterListings(Array.isArray(data.data.listings) ? data.data.listings : []);
      }
    } catch (error) {
      console.error('[SummaryTab] Error loading filters:', error);
    }
  }, []);

  const loadKpi = useCallback(async () => {
    setKpiLoading(true);
    setKpiError('');
    try {
      const [kpiRes, hintsRes] = await Promise.all([
        fetchChannelsKpi({
          hours,
          ownerId: ownerId || undefined,
          listingId: listingId || undefined,
        }),
        fetchChannelsConsumptionHints(),
      ]);
      if (kpiRes.data?.success) {
        setKpi(kpiRes.data.data as KpiData);
      } else {
        setKpiError(kpiRes.data?.error || 'Erreur KPI');
        setKpi(null);
      }
      if (hintsRes.data?.success) {
        setHints(hintsRes.data.data);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setKpiError(err.response?.data?.error || err.message || 'Erreur réseau');
      setKpi(null);
    } finally {
      setKpiLoading(false);
    }
  }, [hours, ownerId, listingId]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    void loadKpi();
  }, [loadKpi]);

  const loadActionDetails = async (key: string, isWebhook: boolean) => {
    setActionLoading((p) => ({ ...p, [key]: true }));
    try {
      const { data } = await fetchChannelsKpiActionDetails({
        hours,
        ownerId: ownerId || undefined,
        listingId: listingId || undefined,
        limit: 15,
        ...(isWebhook ? { webhookType: key } : { action: key }),
      });
      console.log('[SummaryTab] Action details response:', { key, isWebhook, success: data?.success, dataLength: Array.isArray(data?.data) ? data.data.length : 'not array', data: data?.data });

      if (data?.success) {
        // Handle both array and object with items property
        let items: unknown[] = [];
        if (Array.isArray(data.data)) {
          items = data.data;
        } else if (data.data && typeof data.data === 'object' && 'items' in data.data) {
          items = Array.isArray((data.data as { items?: unknown }).items)
            ? ((data.data as { items: unknown[] }).items)
            : [];
        }
        console.log('[SummaryTab] Extracted items:', { key, itemsLength: items.length });
        setActionDetails((p) => ({ ...p, [key]: items }));
      } else {
        console.warn('[SummaryTab] Invalid action details response:', { key, data });
        setActionDetails((p) => ({ ...p, [key]: [] }));
      }
    } catch (error) {
      console.error('[SummaryTab] Error loading action details:', error);
      setActionDetails((p) => ({ ...p, [key]: [] }));
    } finally {
      setActionLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const toggleWebhook = (type: string) => {
    if (expandedWebhook === type) {
      setExpandedWebhook(null);
      return;
    }
    setExpandedWebhook(type);
    if (!actionDetails[type]) void loadActionDetails(type, true);
  };

  const toggleAction = (action: string) => {
    if (expandedAction === action) {
      setExpandedAction(null);
      return;
    }
    setExpandedAction(action);
    if (!actionDetails[action]) void loadActionDetails(action, false);
  };

  const ac = kpi?.apiCallsComparison || {};
  const td = ac.today || {};
  const yd = ac.yesterday || {};
  const todayTotal = (td.cron || 0) + (td.nonCron || 0);
  const yesterdayTotal = (yd.cron || 0) + (yd.nonCron || 0);
  const todayFailed = (td.cronFailed || 0) + (td.nonCronFailed || 0);
  const yesterdayFailed = (yd.cronFailed || 0) + (yd.nonCronFailed || 0);
  const webhookTd = (kpi?.webhooksByType || []).reduce((s, r) => s + (r.today || 0), 0);
  const webhookYd = (kpi?.webhooksByType || []).reduce((s, r) => s + (r.yesterday || 0), 0);

  const cardStyle: CSSProperties = {
    padding: '14px 16px',
    background: T.bg2,
    borderRadius: 8,
    border: `1px solid ${T.border}`,
  };

  const renderDetailRows = (items: unknown[] | null | undefined, isWebhook: boolean, colSpan: number) => {
    if (items === null || items === undefined) {
      return (
        <tr>
          <td colSpan={colSpan} style={{ padding: 12, fontSize: 12, color: T.text3 }}>
            Chargement…
          </td>
        </tr>
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return (
        <tr>
          <td colSpan={colSpan} style={{ padding: 12, fontSize: 12, color: T.text3 }}>
            Aucun appel
          </td>
        </tr>
      );
    }
    return items.map((raw) => {
      const it = raw as Record<string, unknown>;
      const ok = isWebhook ? it.publishOk : it.status === 'success';
      const debugLink = isWebhook
        ? `/channels?tab=Debug&type=webhooks&api=${encodeURIComponent(String(it.ruEventKey || ''))}&docId=${encodeURIComponent(String(it.id || ''))}`
        : `/channels?tab=Debug&type=pull&api=${encodeURIComponent(String(it.action || ''))}&docId=${encodeURIComponent(String(it.id || ''))}`;
      const bizLink = isWebhook
        ? `/channels?tab=Business&biz=hooks&hook=r&docId=${encodeURIComponent(String(it.id || ''))}`
        : `/channels?tab=Business&biz=api&api=${actionToApiSeg(String(it.action || ''))}&docId=${encodeURIComponent(String(it.id || ''))}`;
      return (
        <tr key={String(it.id)} style={{ borderTop: `1px solid ${T.border}` }}>
          <td style={{ padding: '8px 10px', fontSize: 11, color: T.text2 }}>
            {it.createdAt ? new Date(String(it.createdAt)).toLocaleString('fr-FR') : '—'}
          </td>
          <td style={{ padding: '8px 10px', fontSize: 11 }}>{String(it.ownerName || it.ownerId || '—')}</td>
          <td style={{ padding: '8px 10px', fontSize: 11 }}>{String(it.listingName || it.listingId || '—')}</td>
          <td style={{ padding: '8px 10px', fontSize: 11, color: ok ? '#059669' : '#dc2626' }}>
            {ok ? 'OK' : String(it.status || 'Err')}
          </td>
          {!isWebhook && (
            <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right' }}>
              {it.responseTimeMs != null ? String(it.responseTimeMs) : '—'}
            </td>
          )}
          <td style={{ padding: '8px 10px', fontSize: 11 }}>
            <Link to={debugLink} style={{ color: T.primary, marginRight: 8 }}>
              Debug
            </Link>
            <Link to={bizLink} style={{ color: '#4f46e5' }}>
              Business
            </Link>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-3">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', ...cardStyle }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>Filtres</span>
        <select
          value={String(hours)}
          onChange={(e) => setHours(Number(e.target.value))}
          style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${T.border}` }}
        >
          <option value="24">24h</option>
          <option value="48">48h</option>
          <option value="72">72h</option>
          <option value="168">7 jours</option>
          <option value="720">30 jours</option>
        </select>
        <select
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${T.border}`, minWidth: 160 }}
        >
          <option value="">Tous les owners</option>
          {filterOwners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${T.border}`, minWidth: 180 }}
        >
          <option value="">Tous les listings</option>
          {filterListings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.owner ? ` (${l.owner})` : ''}
            </option>
          ))}
        </select>
        {(ownerId || listingId) && (
          <button
            type="button"
            onClick={() => {
              setOwnerId('');
              setListingId('');
            }}
            style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 0, cursor: 'pointer' }}
          >
            Réinitialiser
          </button>
        )}
        <button
          type="button"
          onClick={() => void loadKpi()}
          disabled={kpiLoading}
          style={{
            marginLeft: 'auto',
            padding: '6px 16px',
            borderRadius: 6,
            border: 0,
            background: T.primary,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: kpiLoading ? 'not-allowed' : 'pointer',
            opacity: kpiLoading ? 0.6 : 1,
          }}
        >
          {kpiLoading ? 'Chargement…' : 'Actualiser'}
        </button>
      </div>

      {kpiError && (
        <div style={{ padding: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C', fontSize: 13 }}>
          {kpiError}
        </div>
      )}

      {kpiLoading && !kpi && (
        <div style={{ padding: 40, textAlign: 'center', color: T.text3 }}>Chargement des métriques…</div>
      )}

      {kpi && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 11, color: T.text3, textTransform: 'uppercase' }}>Webhooks reçus</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.text }}>{kpi.total}</div>
              <div style={{ fontSize: 11, color: T.text3 }}>
                Hier {webhookYd}{' '}
                <span style={{ color: changeColorClass(webhookTd, webhookYd), fontWeight: 700 }}>
                  {pctChange(webhookTd, webhookYd)}
                </span>
              </div>
            </div>
            <div style={{ ...cardStyle, background: '#ECFDF5' }}>
              <div style={{ fontSize: 11, color: '#065F46' }}>Succès</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#065F46' }}>{kpi.publishedOk}</div>
              <div style={{ fontSize: 10, color: T.text3 }}>
                {kpi.total > 0 ? Math.round((kpi.publishedOk / kpi.total) * 100) : 0}% taux succès
              </div>
            </div>
            <div style={{ ...cardStyle, background: '#FEF2F2' }}>
              <div style={{ fontSize: 11, color: '#B91C1C' }}>Échecs</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#B91C1C' }}>{kpi.publishedFailed}</div>
              {(kpi.publishUnknown || 0) > 0 && (
                <div style={{ fontSize: 10, color: T.text3 }}>+ {kpi.publishUnknown} inconnus</div>
              )}
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 11, color: T.text3 }}>API calls (total)</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{todayTotal}</div>
              <div style={{ fontSize: 11, color: T.text3 }}>
                Hier {yesterdayTotal}{' '}
                <span style={{ color: changeColorClass(todayTotal, yesterdayTotal), fontWeight: 700 }}>
                  {pctChange(todayTotal, yesterdayTotal)}
                </span>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 11, color: '#dc2626' }}>API échecs</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626' }}>{todayFailed}</div>
              <div style={{ fontSize: 11, color: T.text3 }}>
                Hier {yesterdayFailed}{' '}
                <span style={{ color: changeColorClass(todayFailed, yesterdayFailed, true), fontWeight: 700 }}>
                  {pctChange(todayFailed, yesterdayFailed)}
                </span>
              </div>
            </div>
          </div>

          {/* Webhooks table */}
          <div style={{ ...cardStyle, borderColor: '#c7d2fe' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#312e81', marginBottom: 10 }}>Webhooks reçus (temps réel)</div>
            {(kpi.webhooksByType || []).length === 0 ? (
              <span style={{ fontSize: 12, color: T.text3 }}>Aucun webhook aujourd&apos;hui / hier</span>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: T.text3, borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ width: 24 }} />
                    <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Auj.</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>OK</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Err</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Hier</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {(kpi.webhooksByType || []).map((row) => (
                    <Fragment key={row.type}>
                      <tr
                        style={{ cursor: 'pointer', background: expandedWebhook === row.type ? T.primaryTint : undefined }}
                        onClick={() => toggleWebhook(row.type)}
                      >
                        <td style={{ padding: 8 }}>{expandedWebhook === row.type ? '▼' : '▶'}</td>
                        <td style={{ padding: 8, fontWeight: 600 }}>{prettyRuEventKey(row.type)}</td>
                        <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>{row.today}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#059669' }}>{row.todayOk}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#dc2626' }}>{row.todayFail}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>{row.yesterday}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: changeColorClass(row.today, row.yesterday) }}>
                          {pctChange(row.today, row.yesterday)}
                        </td>
                      </tr>
                      {expandedWebhook === row.type && (
                        <tr>
                          <td colSpan={7} style={{ background: T.bg2, padding: 0 }}>
                            <table style={{ width: '100%' }}>
                              <tbody>
                                {renderDetailRows(
                                  actionLoading[row.type] ? null : actionDetails[row.type],
                                  true,
                                  6,
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Direct API */}
          <div style={{ ...cardStyle, borderColor: '#fde68a' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e', marginBottom: 8 }}>
              API hors Cron (Direct) — {td.nonCron || 0} auj. · {td.nonCronSuccess || 0} ok · {td.nonCronFailed || 0} err
            </div>
            <ActionTable
              rows={(kpi.apiCallsTopActions || []).filter((r) => !r.isCron)}
              expandedAction={expandedAction}
              onToggle={toggleAction}
              actionDetails={actionDetails}
              actionLoading={actionLoading}
              renderDetailRows={renderDetailRows}
            />
          </div>

          {/* Cron API */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.text2, marginBottom: 8 }}>
              API via Cron — {td.cron || 0} auj.
            </div>
            <ActionTable
              rows={(kpi.apiCallsTopActions || []).filter((r) => r.isCron)}
              expandedAction={expandedAction}
              onToggle={toggleAction}
              actionDetails={actionDetails}
              actionLoading={actionLoading}
              renderDetailRows={renderDetailRows}
              showDataCol
            />
          </div>

          {/* Triggers */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Par source (trigger)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(kpi.apiCallsByTrigger || []).map((row) => (
                <span
                  key={row.trigger}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: T.bg2,
                    border: `1px solid ${T.border}`,
                    fontSize: 11,
                  }}
                >
                  {row.trigger} <strong>{row.count}</strong>
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {hints != null && (
        <div style={{ ...cardStyle, background: '#FFFBEB' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>Hints de consommation</div>
          <pre style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', color: '#78350F' }}>{JSON.stringify(hints, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function ActionTable({
  rows,
  expandedAction,
  onToggle,
  actionDetails,
  actionLoading,
  renderDetailRows,
  showDataCol,
}: {
  rows: Array<{ action: string; count: number; success: number; failed: number }>;
  expandedAction: string | null;
  onToggle: (a: string) => void;
  actionDetails: Record<string, unknown[] | null>;
  actionLoading: Record<string, boolean>;
  renderDetailRows: (items: unknown[] | null | undefined, isWebhook: boolean, colSpan: number) => React.ReactNode;
  showDataCol?: boolean;
}) {
  const T = { border: '#e2e8f0', text3: '#94a3b8', primaryTint: '#fff7ed' };
  if (rows.length === 0) return <span style={{ fontSize: 12, color: T.text3 }}>Aucun appel</span>;
  const colSpan = showDataCol ? 6 : 5;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ color: T.text3, borderBottom: `1px solid ${T.border}` }}>
          <th style={{ width: 24 }} />
          <th style={{ textAlign: 'left', padding: 8 }}>Action</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Total</th>
          <th style={{ textAlign: 'right', padding: 8 }}>OK</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Err</th>
          {showDataCol && <th style={{ textAlign: 'right', padding: 8 }}>Données</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Fragment key={row.action}>
            <tr
              style={{ cursor: 'pointer', background: expandedAction === row.action ? T.primaryTint : undefined }}
              onClick={() => onToggle(row.action)}
            >
              <td style={{ padding: 8 }}>{expandedAction === row.action ? '▼' : '▶'}</td>
              <td style={{ padding: 8, fontWeight: 600 }}>{prettyRuEventKey(row.action)}</td>
              <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>{row.count}</td>
              <td style={{ padding: 8, textAlign: 'right', color: '#059669' }}>{row.success}</td>
              <td style={{ padding: 8, textAlign: 'right', color: '#dc2626' }}>{row.failed}</td>
              {showDataCol && (
                <td style={{ padding: 8, textAlign: 'right', fontSize: 10 }}>
                  {row.success > 0 ? 'oui' : 'vide'}
                </td>
              )}
            </tr>
            {expandedAction === row.action && (
              <tr>
                <td colSpan={colSpan} style={{ background: '#f8fafc' }}>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      {renderDetailRows(actionLoading[row.action] ? null : actionDetails[row.action], false, colSpan)}
                    </tbody>
                  </table>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
