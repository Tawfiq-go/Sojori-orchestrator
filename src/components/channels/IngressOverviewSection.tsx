/**
 * Tableau ingress enrichi (webhooks) — partagé API overview + Hooks.
 */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import { pickMessagingField, prettyJson } from '../../utils/businessTabHelpers';
import {
  extractGuestLabel,
  extractListingOwner,
  extractRuReservationId,
  extractStayDates,
  ingressEventCategory,
  publishOkLabel,
  type IngressOverviewRow,
} from '../../utils/ingressRowHelpers';
import { BUSINESS_CONTEXT_HEADERS, extractIngressBusinessContext } from '../../utils/businessRowContext';
import { BusinessContextCells } from './BusinessContextCells';
import { prettyRuEventKey } from '../../utils/channelsSharedUtils';

type Summary = {
  total?: number;
  mappedCount?: number;
  publishOk?: number;
  publishFail?: number;
  byEventKey?: { key: string; count: number }[];
};

type Props = {
  view: 'messaging' | 'reservations' | 'leads' | 'reviews';
  list: { items?: IngressOverviewRow[]; total?: number } | null;
  loading: boolean;
  error: string | null;
  summary: Summary | null;
  page: number;
  limit: number;
  onPagePrev: () => void;
  onPageNext: () => void;
  detailLink: (rowId: string) => string;
  msgDetail: Record<string, { error?: string; rawBody?: string; ruMessaging?: unknown }>;
  msgExpanded: string | null;
  onToggleMsgDetail: (id: string) => void;
  banner?: string;
};

function PublishBadge({ publishOk }: { publishOk: boolean | null | undefined }) {
  const label = publishOkLabel(publishOk);
  if (label === 'OK') {
    return (
      <span className="channels-badge channels-badge-success text-xs inline-flex items-center gap-0.5">
        <CheckCircle2 size={11} /> OK
      </span>
    );
  }
  if (label === 'Fail') {
    return (
      <span className="channels-badge channels-badge-error text-xs inline-flex items-center gap-0.5">
        <XCircle size={11} /> Fail
      </span>
    );
  }
  return (
    <span className="channels-badge channels-badge-neutral text-xs inline-flex items-center gap-0.5">
      <HelpCircle size={11} /> —
    </span>
  );
}

function SummaryBar({ summary, view }: { summary: Summary | null; view: string }) {
  if (!summary || summary.total == null) return null;
  const mappedPct =
    summary.total > 0 && summary.mappedCount != null
      ? Math.round((summary.mappedCount / summary.total) * 100)
      : null;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 flex flex-wrap gap-x-4 gap-y-1">
      <span>
        <strong>{summary.total}</strong> webhooks
      </span>
      {mappedPct != null && view !== 'messaging' && view !== 'reviews' && (
        <span>
          <strong>{summary.mappedCount}</strong> mappés Sojori ({mappedPct}%)
        </span>
      )}
      <span className="text-green-700">Publiés OK: {summary.publishOk ?? 0}</span>
      <span className="text-red-600">Échecs: {summary.publishFail ?? 0}</span>
      {(summary.byEventKey || []).slice(0, 5).map((b) => (
        <span key={b.key} className="text-slate-600">
          {prettyRuEventKey(b.key)}: {b.count}
        </span>
      ))}
    </div>
  );
}

export function IngressOverviewSection({
  view,
  list,
  loading,
  error,
  summary,
  page,
  limit,
  onPagePrev,
  onPageNext,
  detailLink,
  msgDetail,
  msgExpanded,
  onToggleMsgDetail,
  banner,
}: Props) {
  if (error) {
    return (
      <div style={{ padding: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, color: '#B91C1C', fontSize: 13 }}>
        {error}
      </div>
    );
  }
  if (loading && !list) {
    return <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: T.text3 }}>Chargement…</div>;
  }
  if (!list) return null;

  const items = list.items || [];
  const prevOff = page <= 1;
  const nextOff = items.length < limit;

  return (
    <div className="space-y-2">
      {banner && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-950">{banner}</div>
      )}
      <SummaryBar summary={summary} view={view} />
      <div className="flex items-center justify-between text-xs text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5">
        <span>{list.total ?? '—'} résultats · interprétation métier (ingress enrichi)</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={prevOff}
            className="px-2 py-0.5 rounded border text-xs disabled:opacity-40"
            onClick={onPagePrev}
          >
            ←
          </button>
          <span>p.{page}</span>
          <button
            type="button"
            disabled={nextOff}
            className="px-2 py-0.5 rounded border text-xs disabled:opacity-40"
            onClick={onPageNext}
          >
            →
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="channels-table-scroll channels-table-unbounded w-full">
          <table className="w-full text-sm min-w-[960px]">
            {view === 'messaging' || view === 'reviews' ? (
              <>
                <thead className="channels-sticky-thead">
                  <tr>
                    {['Date', ...BUSINESS_CONTEXT_HEADERS, 'Type', view === 'reviews' ? 'Canal' : 'Guest', 'Thread', 'Aperçu', 'Publish', 'Détail'].map((h) => (
                      <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap text-xs">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const rid = String(row.id);
                    const m = row.ruMessaging || {};
                    const data = m.data || {};
                    const lo = extractListingOwner(row);
                    const biz = extractIngressBusinessContext(row);
                    const threadId = pickMessagingField(data, ['ThreadID', 'threadId', 'ThreadId', 'ID']);
                    const guest = pickMessagingField(data, ['GuestName', 'guestName', 'CustomerName', 'Name']) || '—';
                    const channel = pickMessagingField(data, ['CommunicationChannel', 'communicationChannel']) || '—';
                    const preview = pickMessagingField(data, ['Body', 'body', 'Text', 'message', 'Content', 'Preview']) || '';
                    const detail = msgDetail[rid];
                    return (
                      <Fragment key={rid}>
                        <tr className="border-t border-slate-100 align-top">
                          <td className="px-2 py-2 text-xs whitespace-nowrap">
                            {row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '—'}
                          </td>
                          <BusinessContextCells {...biz} ownerTitle={lo.ownerName} listingTitle={lo.listingName} />
                          <td className="px-2 py-2 text-xs">{ingressEventCategory(row.ruEventKey)}</td>
                          <td className="px-2 py-2 text-xs truncate max-w-[120px]">{view === 'reviews' ? String(channel) : String(guest)}</td>
                          <td className="px-2 py-2 font-mono text-[10px]">{threadId ? String(threadId) : '—'}</td>
                          <td className="px-2 py-2 text-xs max-w-[200px] truncate">{String(preview).slice(0, 80)}</td>
                          <td className="px-2 py-2">
                            <PublishBadge publishOk={row.publishOk} />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <button
                              type="button"
                              className="text-slate-600 text-xs font-semibold hover:text-indigo-700 mr-2"
                              onClick={() => onToggleMsgDetail(rid)}
                            >
                              {msgExpanded === rid ? '▲' : '▼'}
                            </button>
                            <Link to={detailLink(rid)} className="text-indigo-600 text-xs font-semibold hover:underline">
                              XML
                            </Link>
                          </td>
                        </tr>
                        {msgExpanded === rid && detail && (
                          <tr className="channels-expanded-row">
                            <td colSpan={10} className="channels-expanded-content p-2">
                              <pre className="text-[10px] overflow-auto max-h-32">{detail.rawBody || prettyJson(detail.ruMessaging)}</pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </>
            ) : view === 'leads' ? (
              <>
                <thead className="channels-sticky-thead">
                  <tr>
                    {['Date', ...BUSINESS_CONTEXT_HEADERS, 'Type', 'Guest', 'Email', 'Tél', 'Check-in', 'Check-out', 'Publish', 'Détail'].map((h) => (
                      <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap text-xs">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const rid = String(row.id);
                    const lo = extractListingOwner(row);
                    const biz = extractIngressBusinessContext(row);
                    const stay = extractStayDates(row);
                    const pd = (row.parsedData || row.canonicalRuBookingV2 || {}) as Record<string, Record<string, unknown>>;
                    const guest = (pd.guest || {}) as Record<string, string>;
                    const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ').trim() || '—';
                    return (
                      <tr key={rid} className="border-t border-slate-100 align-top">
                        <td className="px-2 py-2 text-xs whitespace-nowrap">
                          {row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '—'}
                        </td>
                        <BusinessContextCells {...biz} ownerTitle={lo.ownerName} listingTitle={lo.listingName} />
                        <td className="px-2 py-2 text-xs">{ingressEventCategory(row.ruEventKey)}</td>
                        <td className="px-2 py-2 text-xs truncate">{guestName}</td>
                        <td className="px-2 py-2 text-xs truncate">{guest.email || '—'}</td>
                        <td className="px-2 py-2 font-mono text-[11px]">{guest.phone || '—'}</td>
                        <td className="px-2 py-2 text-xs">{stay.checkIn}</td>
                        <td className="px-2 py-2 text-xs">{stay.checkOut}</td>
                        <td className="px-2 py-2">
                          <PublishBadge publishOk={row.publishOk} />
                        </td>
                        <td className="px-2 py-2">
                          <Link to={detailLink(rid)} className="text-indigo-600 text-xs font-semibold hover:underline">
                            XML
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            ) : (
              <>
                <thead className="channels-sticky-thead">
                  <tr>
                    {[
                      'Date',
                      ...BUSINESS_CONTEXT_HEADERS,
                      'Type',
                      'Check-in',
                      'Check-out',
                      'Client',
                      '€',
                      'OTA',
                      'RU ID',
                      'Map',
                      'Publish',
                      'Détail',
                    ].map((h) => (
                      <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap text-xs">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const rid = String(row.id);
                    const lo = extractListingOwner(row);
                    const biz = extractIngressBusinessContext(row);
                    const stay = extractStayDates(row);
                    const c = (row.canonicalRuBookingV2 || {}) as Record<string, Record<string, unknown>>;
                    const money = c.money || {};
                    const ota = c.ota || {};
                    return (
                      <tr key={rid} className="border-t border-slate-100 align-top">
                        <td className="px-2 py-2 text-xs whitespace-nowrap">
                          {row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '—'}
                        </td>
                        <BusinessContextCells {...biz} ownerTitle={lo.ownerName} listingTitle={lo.listingName} />
                        <td className="px-2 py-2 text-xs whitespace-nowrap">{ingressEventCategory(row.ruEventKey)}</td>
                        <td className="px-2 py-2 text-xs">{stay.checkIn}</td>
                        <td className="px-2 py-2 text-xs">{stay.checkOut}</td>
                        <td className="px-2 py-2 text-xs truncate max-w-[100px]">{extractGuestLabel(row)}</td>
                        <td className="px-2 py-2 text-right text-xs">
                          {money.ruPrice != null ? String(money.ruPrice) : money.clientPrice != null ? String(money.clientPrice) : '—'}
                        </td>
                        <td className="px-2 py-2 text-xs truncate">{String(ota.vendor || '—')}</td>
                        <td className="px-2 py-2 font-mono text-[10px]">{extractRuReservationId(row)}</td>
                        <td className="px-2 py-2 text-center">
                          {lo.mapped ? (
                            <span className="channels-badge channels-badge-success text-xs">OK</span>
                          ) : (
                            <span className="channels-badge channels-badge-neutral text-xs">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <PublishBadge publishOk={row.publishOk} />
                        </td>
                        <td className="px-2 py-2">
                          <Link to={detailLink(rid)} className="text-indigo-600 text-xs font-semibold hover:underline">
                            XML
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
      {items.length === 0 && !loading && (
        <div className="text-sm text-slate-500 p-4 border rounded bg-white text-center">Aucun webhook sur la période.</div>
      )}
    </div>
  );
}
