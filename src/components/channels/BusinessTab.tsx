/**
 * BusinessTab — APIs, HTTP Logs, Hooks, Owner/Listing stats (legacy ChannelsHubPage Business)
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { onChannelsRefresh } from '../../utils/channelsRefresh';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Home,
  KeyRound,
  UserRound,
  XCircle,
} from 'lucide-react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import {
  fetchBusinessListingStats,
  fetchBusinessOwnerStats,
  fetchChannelsCalendarRuApis,
  fetchChannelsCalendarRuCallBodies,
  fetchChannelsDistributionRuApis,
  fetchChannelsDistributionRuCallBodies,
  fetchChannelsHttpAccessLogs,
  fetchChannelsIngressById,
  fetchChannelsLeadsRuApis,
  fetchChannelsListingRuApis,
  fetchChannelsListingRuCallBodies,
  fetchChannelsMessagingRuApis,
  fetchChannelsOAuthRuApis,
  fetchChannelsOAuthRuCallBodies,
  fetchChannelsOverview,
  fetchChannelsOverviewSummarySafe,
  fetchChannelsOverviewReviews,
  fetchChannelsOwnerRuApis,
  fetchChannelsOwnerRuCallBodies,
} from '../../services/channelsDashboardApi';
import {
  overviewViewFromApiSeg,
  overviewViewFromHookSeg,
  parseMrSeg,
} from '../../utils/channelsSharedUtils';
import type { IngressOverviewRow } from '../../utils/ingressRowHelpers';
import { IngressOverviewSection } from './IngressOverviewSection';
import { formatCasablancaDate } from '../../utils/dateFormatting';
import {
  listingIdFromChannelOtaRow,
  prettyJson,
  resolveBusinessViewTab,
  ruCalendarStatusBadgeClass,
  summarizeCalendarRuRow,
  summarizeListingRuRow,
} from '../../utils/businessTabHelpers';
import {
  buildCalendarModificationRecap,
  recapLinesFromRequestPayload,
} from '../../utils/calendarRecapHelpers';
import { buildListingRuRecap } from '../../utils/listingRecapHelpers';
import { CalendarRuRecapModal, type CalendarRuRecapView } from './CalendarRuRecapModal';
import { ListingRuRecapModal, type ListingRuRecapView } from './ListingRuRecapModal';

const LIMIT = 25;

type RuBody = {
  error?: string;
  requestXml?: string;
  responseXml?: string;
  requestPayload?: unknown;
  responseJson?: unknown;
  auditContext?: unknown;
  rawBody?: string;
  ruMessaging?: unknown;
  parsedData?: unknown;
};

type RuRow = Record<string, unknown> & {
  _id?: string;
  action?: string;
  status?: string;
  createdAt?: string;
  timestamp?: string;
  error?: string;
  responseMsg?: string;
  responseTime?: number;
  statusCode?: number;
};

function patchParams(base: URLSearchParams, p: Record<string, string | undefined>) {
  const n = new URLSearchParams(base);
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) n.delete(k);
    else n.set(k, v);
  }
  return n;
}

function chLink(sp: URLSearchParams) {
  const q = sp.toString();
  return q ? `/channels?${q}` : '/channels';
}

function errMsg(e: unknown) {
  const x = e as { response?: { data?: { error?: string } }; message?: string };
  return x.response?.data?.error || x.message || 'Erreur réseau';
}

function Pag({
  page,
  prevOff,
  nextOff,
  onPrev,
  onNext,
}: {
  page: number;
  prevOff: boolean;
  nextOff: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <button
        type="button"
        disabled={prevOff}
        onClick={onPrev}
        style={{
          height: 24,
          padding: '0 8px',
          borderRadius: 4,
          border: `1px solid ${T.border}`,
          background: T.bg,
          color: T.text,
          fontSize: 12,
          cursor: prevOff ? 'not-allowed' : 'pointer',
          opacity: prevOff ? 0.4 : 1
        }}
      >
        <ChevronLeft size={12} />
      </button>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.text, padding: '0 8px' }}>{page}</span>
      <button
        type="button"
        disabled={nextOff}
        onClick={onNext}
        style={{
          height: 24,
          padding: '0 8px',
          borderRadius: 4,
          border: `1px solid ${T.border}`,
          background: T.bg,
          color: T.text,
          fontSize: 12,
          cursor: nextOff ? 'not-allowed' : 'pointer',
          opacity: nextOff ? 0.4 : 1
        }}
      >
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

function useRuBodies(
  fetchBody: (id: string) => Promise<{ data?: { success?: boolean; data?: RuBody; error?: string } }>,
) {
  const [expandId, setExpandId] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, RuBody>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const loadBody = async (id: string) => {
    if (!id) return;
    const cached = bodies[id];
    if (cached && cached.error == null && (cached.requestXml != null || cached.requestPayload != null)) {
      return;
    }
    setLoadingId(id);
    try {
      const { data } = await fetchBody(id);
      if (!data?.success) throw new Error(data?.error || 'Fetch failed');
      setBodies((p) => ({ ...p, [id]: data.data || {} }));
    } catch (e) {
      setBodies((p) => ({ ...p, [id]: { error: errMsg(e) } }));
    } finally {
      setLoadingId(null);
    }
  };

  const toggle = async (id: string) => {
    if (!id) return;
    if (expandId === id) {
      setExpandId(null);
      return;
    }
    const cached = bodies[id];
    if (cached && cached.error == null && (cached.requestXml != null || cached.requestPayload != null)) {
      setExpandId(id);
      return;
    }
    await loadBody(id);
    setExpandId(id);
  };

  return { expandId, bodies, loadingId, toggle, setExpandId, loadBody };
}

function RuBodyPanels({ body, mode }: { body: RuBody; mode: 'calendar' | 'listing' | 'user' | 'oauth' }) {
  if (body.error != null) {
    return <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{String(body.error)}</div>;
  }
  if (mode === 'calendar') {
    return (
      <div className="space-y-3">
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">Contexte audit (JSON)</div>
          <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[220px] overflow-auto">{prettyJson(body.auditContext)}</pre>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">Corps JSON (requestPayload)</div>
          <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[280px] overflow-auto">{prettyJson(body.requestPayload)}</pre>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">XML requête</div>
          <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[320px] overflow-auto whitespace-pre-wrap break-all">{body.requestXml || '—'}</pre>
        </div>
        {body.responseXml ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">XML réponse RU</div>
            <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[220px] overflow-auto whitespace-pre-wrap break-all">{String(body.responseXml).slice(0, 120000)}</pre>
          </div>
        ) : null}
      </div>
    );
  }
  if (mode === 'listing') {
    return (
      <div className="space-y-3">
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">requestPayload + auditContext</div>
          <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[220px] overflow-auto">{prettyJson({ requestPayload: body.requestPayload, auditContext: body.auditContext })}</pre>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">Réponse listing (JSON)</div>
          <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[280px] overflow-auto">{prettyJson(body.responseJson)}</pre>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">XML audit (requête)</div>
          <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[160px] overflow-auto whitespace-pre-wrap break-all">{body.requestXml || '—'}</pre>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">Payload / JSON</div>
        <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[280px] overflow-auto">{prettyJson(body.requestPayload ?? body.responseJson)}</pre>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, textTransform: "uppercase", letterSpacing: "0.01em", marginBottom: 0, padding: "3px 6px", background: T.bg2, borderRadius: 3, display: "inline-block" }} className=" mb-1.5">XML requête</div>
        <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[280px] overflow-auto whitespace-pre-wrap break-all">{body.requestXml || '—'}</pre>
      </div>
    </div>
  );
}

export function BusinessTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const businessBiz = (searchParams.get('biz') || 'api').toLowerCase();
  const viewTab = resolveBusinessViewTab(businessBiz);
  const apiSeg = parseMrSeg(searchParams.get('api'));
  const hookSeg = parseMrSeg(searchParams.get('hook'));
  const docId = searchParams.get('docId') || '';

  const hoursFromUrl = Number(searchParams.get('hours'));
  const [hours, setHours] = useState(
    Number.isFinite(hoursFromUrl) && hoursFromUrl > 0 ? hoursFromUrl : 72,
  );
  const setSp = (patch: Record<string, string | undefined>) => setSearchParams(patchParams(searchParams, patch));

  useEffect(() => {
    const next = patchParams(searchParams, {});
    let changed = false;
    const b = (next.get('biz') || '').toLowerCase();
    if (!b) {
      next.set('biz', 'api');
      if (!next.get('api')) next.set('api', 'm');
      changed = true;
    }
    if (b === 'logapi' && next.get('api') !== 'g') {
      next.set('api', 'g');
      changed = true;
    }
    if (b === 'hooks' && !next.get('hook')) {
      next.set('hook', 'm');
      changed = true;
    }
    if (b === 'api' && next.get('api') === 'g') {
      next.set('api', 'm');
      changed = true;
    }
    if (changed) setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [overviewPage, setOverviewPage] = useState(1);
  const [calendarPage, setCalendarPage] = useState(1);
  const [listingPage, setListingPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [oauthPage, setOauthPage] = useState(1);
  const [distPage, setDistPage] = useState(1);
  const [httpPage, setHttpPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [messagingPage, setMessagingPage] = useState(1);
  const [leadsPage, setLeadsPage] = useState(1);
  const [hookPage, setHookPage] = useState(1);

  const [overviewList, setOverviewList] = useState<{ items?: IngressOverviewRow[]; total?: number; limit?: number } | null>(null);
  const [overviewSummary, setOverviewSummary] = useState<Record<string, unknown> | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [calendarList, setCalendarList] = useState<{ items?: RuRow[]; pagination?: { total?: number } } | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const calBodies = useRuBodies((id) => fetchChannelsCalendarRuCallBodies(id));

  const [listingList, setListingList] = useState<{ items?: RuRow[]; pagination?: { total?: number } } | null>(null);
  const [listingLoading, setListingLoading] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);
  const listBodies = useRuBodies((id) => fetchChannelsListingRuCallBodies(id));

  const [userList, setUserList] = useState<{ items?: RuRow[]; pagination?: { total?: number } } | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const userBodies = useRuBodies((id) => fetchChannelsOwnerRuCallBodies(id));

  const [oauthList, setOauthList] = useState<{ items?: RuRow[]; pagination?: { total?: number } } | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const oauthBodies = useRuBodies((id) => fetchChannelsOAuthRuCallBodies(id));

  const [distList, setDistList] = useState<{ items?: RuRow[]; pagination?: { total?: number } } | null>(null);
  const [distLoading, setDistLoading] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);
  const distBodies = useRuBodies((id) => fetchChannelsDistributionRuCallBodies(id));

  const [calendarRecapModal, setCalendarRecapModal] = useState<{ row: RuRow; rowId: string } | null>(null);
  const [listingRecapModal, setListingRecapModal] = useState<{ row: RuRow; rowId: string } | null>(null);

  const [httpData, setHttpData] = useState<{ items?: unknown[]; pagination?: { total?: number } } | null>(null);
  const [httpLoading, setHttpLoading] = useState(false);
  const [httpError, setHttpError] = useState<string | null>(null);

  const [reviewsList, setReviewsList] = useState<{ items?: unknown[]; total?: number } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [messagingRuList, setMessagingRuList] = useState<{ items?: RuRow[]; pagination?: { total?: number } } | null>(null);
  const [messagingRuLoading, setMessagingRuLoading] = useState(false);
  const [messagingRuError, setMessagingRuError] = useState<string | null>(null);
  const messagingBodies = useRuBodies((id) => fetchChannelsDistributionRuCallBodies(id));

  const [leadsRuList, setLeadsRuList] = useState<{ items?: RuRow[]; pagination?: { total?: number } } | null>(null);
  const [leadsRuLoading, setLeadsRuLoading] = useState(false);
  const [leadsRuError, setLeadsRuError] = useState<string | null>(null);
  const leadsBodies = useRuBodies((id) => fetchChannelsDistributionRuCallBodies(id));

  const [hookList, setHookList] = useState<{ items?: IngressOverviewRow[]; total?: number } | null>(null);
  const [hookSummary, setHookSummary] = useState<Record<string, unknown> | null>(null);
  const [hookLoading, setHookLoading] = useState(false);
  const [hookError, setHookError] = useState<string | null>(null);

  const [msgExpanded, setMsgExpanded] = useState<string | null>(null);
  const [msgDetail, setMsgDetail] = useState<Record<string, RuBody>>({});

  const [bizOwners, setBizOwners] = useState<unknown[]>([]);
  const [bizOwnersLoading, setBizOwnersLoading] = useState(false);
  const [bizOwnersError, setBizOwnersError] = useState<string | null>(null);

  const [bizListings, setBizListings] = useState<unknown[]>([]);
  const [bizListingsLoading, setBizListingsLoading] = useState(false);
  const [bizListingsError, setBizListingsError] = useState<string | null>(null);

  const [apiDoc, setApiDoc] = useState<RuBody | null>(null);
  const [apiDocLoading, setApiDocLoading] = useState(false);
  const [apiDocError, setApiDocError] = useState<string | null>(null);

  const [hookDoc, setHookDoc] = useState<Record<string, unknown> | null>(null);
  const [hookDocLoading, setHookDocLoading] = useState(false);
  const [hookDocError, setHookDocError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    const view = overviewViewFromApiSeg(apiSeg);
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const [listRes, summary] = await Promise.all([
        fetchChannelsOverview({ hours, page: overviewPage, limit: LIMIT, view }),
        fetchChannelsOverviewSummarySafe({ hours, view }),
      ]);
      const { data } = listRes;
      if (!data?.success) {
        setOverviewError('Failed to load overview list');
        setOverviewList(null);
        setOverviewSummary(null);
      } else {
        setOverviewList(data.data);
        setOverviewSummary(summary);
      }
    } catch (e) {
      setOverviewError(errMsg(e));
      setOverviewList(null);
      setOverviewSummary(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [hours, overviewPage, apiSeg]);

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    setCalendarError(null);
    try {
      const { data } = await fetchChannelsCalendarRuApis({ hours, page: calendarPage, limit: LIMIT });
      if (!data?.success) {
        setCalendarError('Impossible de charger les appels RU calendrier');
        setCalendarList(null);
      } else {
        setCalendarList(data.data);
        calBodies.setExpandId(null);
      }
    } catch (e) {
      setCalendarError(errMsg(e));
      setCalendarList(null);
    } finally {
      setCalendarLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, calendarPage]);

  const loadListing = useCallback(async () => {
    setListingLoading(true);
    setListingError(null);
    try {
      const { data } = await fetchChannelsListingRuApis({ hours, page: listingPage, limit: LIMIT });
      if (!data?.success) {
        setListingError('Impossible de charger les appels listing RU (ChannelRuApiCall)');
        setListingList(null);
      } else {
        setListingList(data.data);
        listBodies.setExpandId(null);
      }
    } catch (e) {
      setListingError(errMsg(e));
      setListingList(null);
    } finally {
      setListingLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, listingPage]);

  const loadUser = useCallback(async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const { data } = await fetchChannelsOwnerRuApis({ hours, page: userPage, limit: LIMIT });
      if (!data?.success) {
        setUserError('Impossible de charger les appels owner RU');
        setUserList(null);
      } else {
        setUserList(data.data);
        userBodies.setExpandId(null);
      }
    } catch (e) {
      setUserError(errMsg(e));
      setUserList(null);
    } finally {
      setUserLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, userPage]);

  const loadOAuth = useCallback(async () => {
    setOauthLoading(true);
    setOauthError(null);
    try {
      const { data } = await fetchChannelsOAuthRuApis({ hours, page: oauthPage, limit: LIMIT });
      if (!data?.success) {
        setOauthError('Impossible de charger OAuth PMS');
        setOauthList(null);
      } else {
        setOauthList(data.data);
        oauthBodies.setExpandId(null);
      }
    } catch (e) {
      setOauthError(errMsg(e));
      setOauthList(null);
    } finally {
      setOauthLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, oauthPage]);

  const loadDistribution = useCallback(async () => {
    setDistLoading(true);
    setDistError(null);
    try {
      const { data } = await fetchChannelsDistributionRuApis({ hours, page: distPage, limit: LIMIT });
      if (!data?.success) {
        setDistError('Impossible de charger les appels distribution RU (ChannelRuApiCall · srv-channels)');
        setDistList(null);
      } else {
        setDistList(data.data);
        distBodies.setExpandId(null);
      }
    } catch (e) {
      setDistError(errMsg(e));
      setDistList(null);
    } finally {
      setDistLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, distPage]);

  const loadHttp = useCallback(async () => {
    setHttpLoading(true);
    setHttpError(null);
    try {
      const { data } = await fetchChannelsHttpAccessLogs({ hours, page: httpPage, limit: LIMIT });
      if (!data?.success) {
        setHttpError('Impossible de charger les logs HTTP');
        setHttpData(null);
      } else setHttpData(data.data);
    } catch (e) {
      setHttpError(errMsg(e));
      setHttpData(null);
    } finally {
      setHttpLoading(false);
    }
  }, [hours, httpPage]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const { data } = await fetchChannelsOverviewReviews({ hours, page: reviewsPage, limit: LIMIT });
      if (!data?.success) {
        setReviewsError('Failed to load reviews');
        setReviewsList(null);
      } else setReviewsList(data.data);
    } catch (e) {
      setReviewsError(errMsg(e));
      setReviewsList(null);
    } finally {
      setReviewsLoading(false);
    }
  }, [hours, reviewsPage]);

  const loadMessagingRu = useCallback(async () => {
    setMessagingRuLoading(true);
    setMessagingRuError(null);
    try {
      const { data } = await fetchChannelsMessagingRuApis({ hours, page: messagingPage, limit: LIMIT });
      if (!data?.success) {
        setMessagingRuError('Impossible de charger les appels messagerie RU');
        setMessagingRuList(null);
      } else {
        setMessagingRuList(data.data);
        messagingBodies.setExpandId(null);
      }
    } catch (e) {
      setMessagingRuError(errMsg(e));
      setMessagingRuList(null);
    } finally {
      setMessagingRuLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, messagingPage]);

  const loadLeadsRu = useCallback(async () => {
    setLeadsRuLoading(true);
    setLeadsRuError(null);
    try {
      const { data } = await fetchChannelsLeadsRuApis({ hours, page: leadsPage, limit: LIMIT });
      if (!data?.success) {
        setLeadsRuError('Impossible de charger les appels leads RU');
        setLeadsRuList(null);
      } else {
        setLeadsRuList(data.data);
        leadsBodies.setExpandId(null);
      }
    } catch (e) {
      setLeadsRuError(errMsg(e));
      setLeadsRuList(null);
    } finally {
      setLeadsRuLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, leadsPage]);

  const loadHooks = useCallback(async () => {
    const view = overviewViewFromHookSeg(hookSeg);
    setHookLoading(true);
    setHookError(null);
    try {
      const [listRes, summary] = await Promise.all([
        fetchChannelsOverview({ hours, page: hookPage, limit: LIMIT, view }),
        fetchChannelsOverviewSummarySafe({ hours, view }),
      ]);
      const { data } = listRes;
      if (!data?.success) {
        setHookError('Failed to load hooks overview');
        setHookList(null);
        setHookSummary(null);
      } else {
        setHookList(data.data);
        setHookSummary(summary);
      }
    } catch (e) {
      setHookError(errMsg(e));
      setHookList(null);
      setHookSummary(null);
    } finally {
      setHookLoading(false);
    }
  }, [hours, hookPage, hookSeg]);

  const loadBizOwners = useCallback(async () => {
    setBizOwnersLoading(true);
    setBizOwnersError(null);
    try {
      const { data } = await fetchBusinessOwnerStats({ hours });
      if (!data?.success) {
        setBizOwnersError(data?.error || 'Impossible de charger les stats owner');
        setBizOwners([]);
      } else setBizOwners(data.data?.items || []);
    } catch (e) {
      setBizOwnersError(errMsg(e));
      setBizOwners([]);
    } finally {
      setBizOwnersLoading(false);
    }
  }, [hours]);

  const loadBizListings = useCallback(async () => {
    setBizListingsLoading(true);
    setBizListingsError(null);
    try {
      const { data } = await fetchBusinessListingStats({ hours });
      if (!data?.success) {
        setBizListingsError(data?.error || 'Impossible de charger les stats listing');
        setBizListings([]);
      } else setBizListings(data.data?.items || []);
    } catch (e) {
      setBizListingsError(errMsg(e));
      setBizListings([]);
    } finally {
      setBizListingsLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    if (viewTab !== 'Api' || docId) return;
    if (apiSeg === 'c') loadCalendar();
    else if (apiSeg === 'l') loadListing();
    else if (apiSeg === 'u') loadUser();
    else if (apiSeg === 'o') loadOAuth();
    else if (apiSeg === 'g') loadHttp();
    else if (apiSeg === 'rev') loadReviews();
    else if (apiSeg === 'd') loadDistribution();
    else if (apiSeg === 'm') {
      void loadMessagingRu();
      void loadOverview();
    } else if (apiSeg === 'lead') {
      void loadLeadsRu();
      void loadOverview();
    } else if (apiSeg === 'r') void loadOverview();
  }, [
    viewTab,
    apiSeg,
    docId,
    loadOverview,
    loadCalendar,
    loadListing,
    loadUser,
    loadOAuth,
    loadHttp,
    loadReviews,
    loadDistribution,
    loadMessagingRu,
    loadLeadsRu,
  ]);

  useEffect(() => {
    const h = Number(searchParams.get('hours'));
    if (Number.isFinite(h) && h > 0 && h !== hours) setHours(h);
  }, [searchParams, hours]);

  useEffect(() => {
    if (viewTab === 'Hook') setHookPage(1);
  }, [hookSeg, viewTab]);

  useEffect(
    () =>
      onChannelsRefresh(() => {
        if (viewTab === 'BizOwner') void loadBizOwners();
        else if (viewTab === 'BizListing') void loadBizListings();
        else if (viewTab === 'Hook') void loadHooks();
        else if (viewTab === 'Api' && !docId) {
          if (apiSeg === 'c') void loadCalendar();
          else if (apiSeg === 'l') void loadListing();
          else if (apiSeg === 'u') void loadUser();
          else if (apiSeg === 'o') void loadOAuth();
          else if (apiSeg === 'g') void loadHttp();
          else if (apiSeg === 'rev') void loadReviews();
          else if (apiSeg === 'd') void loadDistribution();
          else if (apiSeg === 'm') {
            void loadMessagingRu();
            void loadOverview();
          } else if (apiSeg === 'lead') {
            void loadLeadsRu();
            void loadOverview();
          } else if (apiSeg === 'r') void loadOverview();
        }
      }),
    [
      viewTab,
      docId,
      apiSeg,
      loadBizOwners,
      loadBizListings,
      loadHooks,
      loadOverview,
      loadCalendar,
      loadListing,
      loadUser,
      loadOAuth,
      loadHttp,
      loadReviews,
      loadDistribution,
      loadMessagingRu,
      loadLeadsRu,
    ],
  );

  const calendarRuRecapView = useMemo((): CalendarRuRecapView | null => {
    if (!calendarRecapModal?.rowId) return null;
    const { row, rowId } = calendarRecapModal;
    const body = calBodies.bodies[rowId];
    const merged = {
      ...row,
      requestPayload: row.requestPayload ?? body?.requestPayload,
      auditContext: (row.auditContext ?? body?.auditContext) as Record<string, unknown> | undefined,
    };
    return {
      rowId,
      merged,
      sum: summarizeCalendarRuRow(merged),
      recap: buildCalendarModificationRecap(merged),
    };
  }, [calendarRecapModal, calBodies.bodies]);

  /** Charger requestPayload pour le récap si la liste ne l’inclut pas (comme legacy ChannelsHubPage). */
  useEffect(() => {
    const id = calendarRecapModal?.rowId;
    const row = calendarRecapModal?.row;
    if (!id || !row) return;
    const cached = calBodies.bodies[id];
    if (cached?.error) return;
    const payloadHasRecapLines = (p: unknown) =>
      p && typeof p === 'object' && recapLinesFromRequestPayload(p).length > 0;
    if (payloadHasRecapLines(cached?.requestPayload)) return;
    if (payloadHasRecapLines(row.requestPayload)) return;
    if (buildCalendarModificationRecap(row).detailLines.length > 0) return;
    void calBodies.loadBody(id);
  }, [calendarRecapModal, calBodies.bodies, calBodies.loadBody]);

  const listingRuRecapView = useMemo((): ListingRuRecapView | null => {
    if (!listingRecapModal?.rowId) return null;
    const { row, rowId } = listingRecapModal;
    const body = listBodies.bodies[rowId];
    const merged = {
      ...row,
      requestPayload: row.requestPayload ?? body?.requestPayload,
      auditContext: (row.auditContext ?? body?.auditContext) as Record<string, unknown> | undefined,
      responseMsg: row.responseMsg ?? body?.responseJson,
    };
    return {
      rowId,
      merged,
      sum: summarizeListingRuRow(merged),
      recap: buildListingRuRecap(merged),
    };
  }, [listingRecapModal, listBodies.bodies]);

  useEffect(() => {
    const id = listingRecapModal?.rowId;
    const row = listingRecapModal?.row;
    if (!id || !row) return;
    const cached = listBodies.bodies[id];
    if (cached?.error) return;
    if (cached?.requestPayload || row.requestPayload) return;
    if (buildListingRuRecap(row).detailLines.length > 1) return;
    void listBodies.loadBody(id);
  }, [listingRecapModal, listBodies.bodies, listBodies.loadBody]);

  useEffect(() => {
    if (viewTab !== 'Hook') return;
    if (docId) {
      setHookDocLoading(true);
      setHookDocError(null);
      fetchChannelsIngressById(docId)
        .then(({ data }) => {
          if (data?.success && data.data) setHookDoc(data.data);
          else setHookDocError(data?.error || 'Document introuvable');
        })
        .catch((e) => setHookDocError(errMsg(e)))
        .finally(() => setHookDocLoading(false));
    } else loadHooks();
  }, [viewTab, docId, loadHooks]);

  useEffect(() => {
    if (viewTab === 'BizOwner') loadBizOwners();
  }, [viewTab, loadBizOwners]);

  useEffect(() => {
    if (viewTab === 'BizListing') loadBizListings();
  }, [viewTab, loadBizListings]);

  useEffect(() => {
    if (viewTab !== 'Api' || !docId) {
      setApiDoc(null);
      return;
    }
    setApiDocLoading(true);
    setApiDocError(null);
    fetchChannelsDistributionRuCallBodies(docId)
      .then(({ data }) => {
        if (data?.success && data.data) setApiDoc(data.data);
        else setApiDocError(data?.error || 'Document introuvable');
      })
      .catch((e) => setApiDocError(errMsg(e)))
      .finally(() => setApiDocLoading(false));
  }, [viewTab, docId]);

  const overviewKind = overviewViewFromApiSeg(apiSeg);
  const hookView = overviewViewFromHookSeg(hookSeg);
  const tableView =
    overviewKind === 'messaging' ? 'messaging' : overviewKind === 'leads' ? 'leads' : 'reservations';

  const hookBanner =
    hookView === 'messaging'
      ? 'Webhooks messagerie RU — lecture métier (listing, owner, type événement, publish).'
      : hookView === 'leads'
        ? 'Webhooks leads (LNM_PutLeadReservation) — guest, dates, listing, owner.'
        : 'Webhooks réservations — création / modification / annulation, Sojori #, check-in/out, listing, owner.';

  const bizBtn = (active: boolean) => ({
    padding: '6px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.15s ease-in-out',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    ...(active ? {
      background: T.primary,
      color: '#FFFFFF',
      boxShadow: `0 2px 4px ${T.primaryTint}`,
    } : {
      background: 'transparent',
      color: T.text2,
    })
  });

  const apiBtn = (seg: string) => bizBtn(apiSeg === seg && businessBiz !== 'logapi' || (seg === 'g' && businessBiz === 'logapi'));

  const resetApiPages = () => {
    setOverviewPage(1);
    setCalendarPage(1);
    setListingPage(1);
    setUserPage(1);
    setOauthPage(1);
    setHttpPage(1);
    setReviewsPage(1);
    setMessagingPage(1);
    setLeadsPage(1);
    setDistPage(1);
  };

  const loadMsgDetail = async (id: string) => {
    if (msgDetail[id]) {
      setMsgExpanded(msgExpanded === id ? null : id);
      return;
    }
    try {
      const { data } = await fetchChannelsIngressById(id);
      if (!data?.success) throw new Error(data?.error || 'Fetch failed');
      setMsgDetail((p) => ({ ...p, [id]: data.data }));
      setMsgExpanded(id);
    } catch (e) {
      setMsgDetail((p) => ({ ...p, [id]: { error: errMsg(e) } }));
      setMsgExpanded(id);
    }
  };

  const renderRuTable = (
    rows: RuRow[],
    cols: number,
    mode: 'calendar' | 'listing' | 'user' | 'oauth',
    bodies: ReturnType<typeof useRuBodies>,
  ) => (
    <tbody>
      {rows.map((row, idx) => {
        const ts = (row.createdAt || row.timestamp) as string | undefined;
        const err = String(row.error || row.responseMsg || '');
        const rowId = String(row._id || `${row.action}-${idx}`);
        const body = bodies.bodies[rowId];
        const expanded = bodies.expandId === rowId;
        const loadingBody = bodies.loadingId === rowId;
        const sum = mode === 'calendar' ? summarizeCalendarRuRow(row as Parameters<typeof summarizeCalendarRuRow>[0]) : null;
        return (
          <Fragment key={rowId}>
            <tr className="border-t border-slate-100 align-top">
              <td className="px-2 py-2 text-xs text-slate-700 whitespace-nowrap">
                <div className="flex flex-col gap-1 min-w-0">
                  <button
                    type="button"
                    disabled={loadingBody}
                    onClick={() => bodies.toggle(rowId)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      padding: '4px 6px',
                      border: `1px solid ${T.border}`,
                      borderRadius: 4,
                      background: T.bg2,
                      fontSize: 11,
                      lineHeight: 1.25,
                      cursor: loadingBody ? 'wait' : 'pointer',
                      opacity: loadingBody ? 0.65 : 1,
                      color: T.text
                    }}
                  >
                    {loadingBody ? '…' : expanded ? '▲ Masquer' : '▼ XML / JSON'}
                  </button>
                  <div className="text-[11px] text-slate-600">{ts ? new Date(ts).toLocaleString() : '—'}</div>
                </div>
              </td>
              <td className="px-2 py-2 text-xs font-mono truncate" title={String(row.action || '')}>{String(row.action || '—')}</td>
              <td className="px-2 py-2 text-xs">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    ...(() => {
                      const status = String(row.status || '').toLowerCase();
                      if (status.includes('success') || status.includes('ok')) {
                        return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
                      }
                      if (status.includes('error') || status.includes('fail')) {
                        return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
                      }
                      if (status.includes('warn')) {
                        return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
                      }
                      return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
                    })()
                  }}
                >
                  {String(row.status || '—')}
                </span>
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-xs">{row.responseTime != null ? String(row.responseTime) : '—'}</td>
              {mode === 'calendar' && sum ? (
                <>
                  <td className="px-2 py-2 font-mono text-[10px]">{sum.propertyId != null ? String(sum.propertyId) : '—'}</td>
                  <td className="px-2 py-2 text-xs line-clamp-2">{sum.listingLabel || '—'}</td>
                  <td className="px-2 py-2 text-xs line-clamp-2">{sum.ownerLabel || '—'}</td>
                  <td className="px-2 py-2 text-xs font-mono">{sum.rabbitSchemaDisplay}</td>
                  <td className="px-2 py-2 text-xs line-clamp-3">{sum.source}</td>
                  <td className="px-2 py-2 text-xs font-mono line-clamp-2">{sum.priceHint}</td>
                  <td className="px-2 py-2 text-xs truncate">{sum.ranges}</td>
                </>
              ) : mode === 'listing' ? (
                <td className="px-2 py-2 font-mono text-[10px]">{listingIdFromChannelOtaRow(row as Parameters<typeof listingIdFromChannelOtaRow>[0])}</td>
              ) : (
                <td className="px-2 py-2 font-mono text-[10px]">{row.statusCode != null ? String(row.statusCode) : '—'}</td>
              )}
              <td className="px-2 py-2 text-xs text-slate-600 line-clamp-3" title={err}>{err.slice(0, 200)}{err.length > 200 ? '…' : ''}</td>
            </tr>
            {expanded && (
              <tr style={{ background: T.bg2, borderTop: "none", animation: "expandFade 0.2s ease-out" }}>
                <td colSpan={cols} style={{ padding: "8px 12px" }}>
                  {loadingBody ? (
                    <div className="py-3 text-center text-xs text-slate-500">Chargement…</div>
                  ) : body !== undefined ? (
                    <RuBodyPanels body={body} mode={mode} />
                  ) : null}
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </tbody>
  );

  const renderCalendarRuTable = (rows: RuRow[]) => (
    <tbody>
      {rows.map((row, idx) => {
        const ts = (row.createdAt || row.timestamp) as string | undefined;
        const err = String(row.error || row.responseMsg || '');
        const rowId = String(row._id || `${row.action}-${idx}`);
        const body = calBodies.bodies[rowId];
        const mergedRow = {
          ...row,
          requestPayload: row.requestPayload ?? body?.requestPayload,
          auditContext: row.auditContext ?? body?.auditContext,
        };
        const sum = summarizeCalendarRuRow(mergedRow as Parameters<typeof summarizeCalendarRuRow>[0]);
        const recap = buildCalendarModificationRecap(mergedRow);
        const expanded = calBodies.expandId === rowId;
        const loadingBody = calBodies.loadingId === rowId;
        return (
          <Fragment key={rowId}>
            <tr className="border-t border-slate-100 align-top">
              <td className="px-2 py-2 text-xs text-slate-700 whitespace-nowrap">
                <div className="flex flex-col gap-1 min-w-0">
                  <button
                    type="button"
                    disabled={loadingBody}
                    onClick={() => calBodies.toggle(rowId)}
                    className="channels-expand-button channels-expand-button-inline"
                  >
                    {loadingBody ? '…' : expanded ? '▲ Masquer' : '▼ JSON / XML'}
                  </button>
                  <div className="whitespace-nowrap text-[11px] text-slate-600 font-medium">
                    {ts ? new Date(ts).toLocaleString() : '—'}
                  </div>
                </div>
              </td>
              <td className="px-2 py-2 text-xs font-mono truncate" title={String(row.action || '')}>
                {String(row.action || '—')}
              </td>
              <td className="px-2 py-2 text-xs">
                <span className={`channels-badge text-xs ${ruCalendarStatusBadgeClass(String(row.status || ''))}`}>
                  {String(row.status || '—')}
                </span>
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-xs">{row.responseTime != null ? String(row.responseTime) : '—'}</td>
              <td className="px-2 py-2 font-mono text-[10px]">{sum.propertyId != null ? String(sum.propertyId) : '—'}</td>
              <td className="px-2 py-2 text-xs line-clamp-2" title={sum.listingLabel}>{sum.listingLabel || '—'}</td>
              <td className="px-2 py-2 text-xs line-clamp-2" title={sum.ownerLabel}>{sum.ownerLabel || '—'}</td>
              <td className="px-2 py-2 text-xs font-mono" title={sum.rabbitSchemaVersion != null ? `schéma ${sum.rabbitSchemaDisplay}` : ''}>
                {sum.rabbitSchemaDisplay}
              </td>
              <td className="px-2 py-2 text-xs line-clamp-3" title={sum.sourceTitle || sum.source}>{sum.source}</td>
              <td className="px-2 py-2 text-xs font-mono line-clamp-2" title={sum.priceHint}>{sum.priceHint}</td>
              <td className="px-2 py-2 text-xs truncate" title={sum.ranges}>{sum.ranges}</td>
              <td className="px-2 py-2 text-xs align-top">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="line-clamp-2 text-[11px]" title={recap.shortLine}>{recap.shortLine}</span>
                  <button type="button" className="channels-ru-recap-table-btn" onClick={() => setCalendarRecapModal({ row, rowId })}>
                    Récap
                  </button>
                </div>
              </td>
              <td className="px-2 py-2 text-xs text-slate-600 line-clamp-3" title={err}>
                {err.slice(0, 120)}
                {err.length > 120 ? '…' : ''}
              </td>
            </tr>
            {expanded && (
              <tr className="channels-expanded-row">
                <td colSpan={13} className="channels-expanded-content">
                  {loadingBody ? (
                    <div className="py-3 text-center text-xs text-slate-500">Chargement…</div>
                  ) : body !== undefined ? (
                    <RuBodyPanels body={body} mode="calendar" />
                  ) : null}
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </tbody>
  );

  const renderListingRuTable = (rows: RuRow[]) => (
    <tbody>
      {rows.map((row, idx) => {
        const ts = (row.createdAt || row.timestamp) as string | undefined;
        const err = String(row.error || row.responseMsg || '');
        const rowId = String(row._id || `${row.action}-${idx}`);
        const body = listBodies.bodies[rowId];
        const mergedRow = {
          ...row,
          requestPayload: row.requestPayload ?? body?.requestPayload,
          auditContext: row.auditContext ?? body?.auditContext,
        };
        const sum = summarizeListingRuRow(mergedRow as Parameters<typeof summarizeListingRuRow>[0]);
        const recap = buildListingRuRecap(mergedRow);
        const expanded = listBodies.expandId === rowId;
        const loadingBody = listBodies.loadingId === rowId;
        return (
          <Fragment key={rowId}>
            <tr className="border-t border-slate-100 align-top">
              <td className="px-2 py-2 text-xs text-slate-700 whitespace-nowrap">
                <div className="flex flex-col gap-1 min-w-0">
                  <button
                    type="button"
                    disabled={loadingBody}
                    onClick={() => listBodies.toggle(rowId)}
                    className="channels-expand-button channels-expand-button-inline"
                  >
                    {loadingBody ? '…' : expanded ? '▲ Masquer' : '▼ JSON / XML'}
                  </button>
                  <div className="whitespace-nowrap text-[11px] text-slate-600 font-medium">
                    {ts ? new Date(ts).toLocaleString() : '—'}
                  </div>
                </div>
              </td>
              <td className="px-2 py-2 text-xs font-mono truncate" title={String(row.action || '')}>
                {String(row.action || '—')}
              </td>
              <td className="px-2 py-2 text-xs">
                <span className={`channels-badge text-xs ${ruCalendarStatusBadgeClass(String(row.status || ''))}`}>
                  {String(row.status || '—')}
                </span>
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-xs">{row.responseTime != null ? String(row.responseTime) : '—'}</td>
              <td className="px-2 py-2 font-mono text-[10px]" title={sum.listingId}>{sum.listingLabel || sum.listingId || '—'}</td>
              <td className="px-2 py-2 font-mono text-[10px]">{sum.propertyId != null ? String(sum.propertyId) : '—'}</td>
              <td className="px-2 py-2 text-xs line-clamp-2" title={sum.route}>{sum.route}</td>
              <td className="px-2 py-2 text-xs align-top">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="line-clamp-2 text-[11px]" title={recap.shortLine}>{recap.shortLine}</span>
                  <button type="button" className="channels-ru-recap-table-btn" onClick={() => setListingRecapModal({ row, rowId })}>
                    Récap
                  </button>
                </div>
              </td>
              <td className="px-2 py-2 text-xs text-slate-600 line-clamp-3" title={err}>
                {err.slice(0, 120)}
                {err.length > 120 ? '…' : ''}
              </td>
            </tr>
            {expanded && (
              <tr className="channels-expanded-row">
                <td colSpan={9} className="channels-expanded-content">
                  {loadingBody ? (
                    <div className="py-3 text-center text-xs text-slate-500">Chargement…</div>
                  ) : body !== undefined ? (
                    <RuBodyPanels body={body} mode="listing" />
                  ) : null}
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </tbody>
  );

  return (
    <div className="space-y-3">

      {/* API doc deep-link */}
      {viewTab === 'Api' && docId && (
        <div className="space-y-3">
          <button type="button" className="px-3 py-1.5 rounded border border-slate-300 text-sm font-semibold" onClick={() => setSp({ docId: undefined })}>← Retour</button>
          {apiDocLoading && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32, color: T.text3, fontSize: 14 }}><div style={{ border: "3px solid " + T.bg2, borderTop: "3px solid " + T.primary, borderRadius: "50%", width: 24, height: 24, animation: "spin 0.8s linear infinite", marginRight: 12 }} /> Chargement…</div>}
          {apiDocError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{apiDocError}</div>}
          {apiDoc && !apiDocLoading && (
            <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className="">{prettyJson(apiDoc)}</pre>
          )}
        </div>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'm' && (
        <>
          {messagingRuError && (
            <div style={{ padding: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, color: '#B91C1C', fontSize: 13 }}>{messagingRuError}</div>
          )}
          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
            <strong>API RU</strong> (pull REST) · <code className="font-mono">RU_REST_GET_api_messaging_*</code>. Webhooks ci-dessous (ingress).
          </div>
          {messagingRuLoading && !messagingRuList && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: T.text3 }}>Chargement API messagerie…</div>
          )}
          {messagingRuList && (
            <>
              <div className="flex justify-between text-xs bg-white border rounded px-3 py-1.5">
                <span>API messagerie · {messagingRuList.pagination?.total ?? '—'}</span>
                <Pag page={messagingPage} prevOff={messagingPage <= 1} nextOff={(messagingRuList.items?.length || 0) < LIMIT} onPrev={() => setMessagingPage((p) => Math.max(1, p - 1))} onNext={() => setMessagingPage((p) => p + 1)} />
              </div>
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="channels-table-scroll overflow-auto max-h-[50vh]">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="channels-sticky-thead"><tr>{['Date', 'Action', 'Statut', 'ms', 'Code', 'Message'].map((h) => <th key={h} className="text-left px-2 py-2 font-medium">{h}</th>)}</tr></thead>
                    {renderRuTable(messagingRuList.items || [], 6, 'user', messagingBodies)}
                  </table>
                </div>
              </div>
            </>
          )}
          <div className="text-xs font-semibold text-slate-600 pt-2">Webhooks messagerie (ingress)</div>
        </>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'lead' && (
        <>
          {leadsRuError && (
            <div style={{ padding: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, color: '#B91C1C', fontSize: 13 }}>{leadsRuError}</div>
          )}
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <strong>API RU</strong> · <code className="font-mono">Pull_GetLeads_RQ</code>, <code className="font-mono">LNM_PutLeadReservation_RQ</code>.
          </div>
          {leadsRuLoading && !leadsRuList && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: T.text3 }}>Chargement API leads…</div>
          )}
          {leadsRuList && (
            <>
              <div className="flex justify-between text-xs bg-white border rounded px-3 py-1.5">
                <span>API leads · {leadsRuList.pagination?.total ?? '—'}</span>
                <Pag page={leadsPage} prevOff={leadsPage <= 1} nextOff={(leadsRuList.items?.length || 0) < LIMIT} onPrev={() => setLeadsPage((p) => Math.max(1, p - 1))} onNext={() => setLeadsPage((p) => p + 1)} />
              </div>
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="channels-table-scroll overflow-auto max-h-[50vh]">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="channels-sticky-thead"><tr>{['Date', 'Action', 'Statut', 'ms', 'Code', 'Message'].map((h) => <th key={h} className="text-left px-2 py-2 font-medium">{h}</th>)}</tr></thead>
                    {renderRuTable(leadsRuList.items || [], 6, 'user', leadsBodies)}
                  </table>
                </div>
              </div>
            </>
          )}
          <div className="text-xs font-semibold text-slate-600 pt-2">Ingress leads (LNM)</div>
        </>
      )}

      {viewTab === 'Api' && !docId && (apiSeg === 'r' || apiSeg === 'm' || apiSeg === 'lead') && (
        <IngressOverviewSection
          view={tableView}
          list={overviewList}
          loading={overviewLoading}
          error={overviewError}
          summary={overviewSummary as Parameters<typeof IngressOverviewSection>[0]['summary']}
          page={overviewPage}
          limit={LIMIT}
          onPagePrev={() => setOverviewPage((p) => Math.max(1, p - 1))}
          onPageNext={() => setOverviewPage((p) => p + 1)}
          detailLink={(rowId) =>
            chLink(patchParams(searchParams, { tab: 'Business', biz: 'hooks', hook: apiSeg === 'lead' ? 'lead' : apiSeg === 'r' ? 'r' : 'm', docId: rowId }))
          }
          msgDetail={msgDetail}
          msgExpanded={msgExpanded}
          onToggleMsgDetail={loadMsgDetail}
        />
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'g' && (
        <>
          {httpError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{httpError}</div>}
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">Journal HTTP srv-channels (Mongo logapis) — hors / et /health.</div>
          {httpData && (
            <>
              <div className="flex justify-between text-xs bg-white border border-slate-200 rounded px-3 py-1.5 items-center">
                <span>{httpData.pagination?.total ?? '—'} entrées · logapis</span>
                <Pag page={httpPage} prevOff={httpPage <= 1} nextOff={(httpData.items?.length || 0) < LIMIT} onPrev={() => setHttpPage((p) => Math.max(1, p - 1))} onNext={() => setHttpPage((p) => p + 1)} />
              </div>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="channels-table-scroll overflow-auto max-h-[78vh]">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="channels-sticky-thead"><tr>
                      {['Date', 'Méthode', 'Chemin', 'Cat.', 'HTTP', 'ms', 'Snippet'].map((h) => <th key={h} className="text-left px-2 py-2 font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(httpData.items as Record<string, unknown>[] || []).map((row) => (
                        <tr key={String(row._id)} className="border-t border-slate-100">
                          <td className="px-2 py-2 text-xs whitespace-nowrap">{row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '—'}</td>
                          <td className="px-2 py-2 text-xs font-mono">{String(row.method || '—')}</td>
                          <td className="px-2 py-2 text-xs font-mono break-all">{String(row.path || '—')}</td>
                          <td className="px-2 py-2 text-xs">{String(row.category || '—')}</td>
                          <td className="px-2 py-2 text-right text-xs">{String(row.statusCode ?? '—')}</td>
                          <td className="px-2 py-2 text-right text-xs">{row.durationMs != null ? String(row.durationMs) : '—'}</td>
                          <td className="px-2 py-2 text-xs"><pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className=" max-h-[120px] overflow-auto text-[10px]">{row.snippetRequest ? String(row.snippetRequest).slice(0, 2000) : '—'}</pre></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'c' && calendarError && (
        <div style={{ padding: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, color: '#B91C1C', fontSize: 13 }}>
          {calendarError}
        </div>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'c' && !calendarLoading && !calendarError && calendarList && (calendarList.items?.length ?? 0) === 0 && (
        <div className="text-sm text-slate-500 p-4 border rounded bg-white text-center">Aucun appel calendrier RU sur la période.</div>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'c' && calendarList && (calendarList.items?.length ?? 0) > 0 && (
        <>
          <div className="flex justify-between text-xs bg-white border rounded px-3 py-1.5 items-center">
            <span className="flex gap-2 items-center"><CalendarDays size={11} /> Calendrier RU · {calendarList.pagination?.total ?? '—'}</span>
            <Pag page={calendarPage} prevOff={calendarPage <= 1} nextOff={(calendarList.items?.length || 0) < LIMIT} onPrev={() => setCalendarPage((p) => Math.max(1, p - 1))} onNext={() => setCalendarPage((p) => p + 1)} />
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="channels-table-scroll overflow-auto max-h-[78vh]">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="channels-sticky-thead channels-calendar-ru-thead text-slate-700"><tr>
                  {['Quand + détail', 'Action', 'Statut', 'ms', 'Prop', 'Listing', 'Owner', 'Queue', 'Source', 'Prix', 'Plages', 'Modifs', 'Réponse'].map((h) => (
                    <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                {renderCalendarRuTable(calendarList.items || [])}
              </table>
            </div>
          </div>
        </>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'l' && listingError && (
        <div style={{ padding: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, color: '#B91C1C', fontSize: 13 }}>
          {listingError}
        </div>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'l' && !listingLoading && !listingError && listingList && (listingList.items?.length ?? 0) === 0 && (
        <div className="text-sm text-slate-500 p-4 border rounded bg-white text-center space-y-2">
          <p>Aucun appel listing RU sur la période (Pull/Push propriété, sync OTA, import).</p>
          <p className="text-xs text-slate-400">
            APIs : Pull_ListProperties, Pull_ListSpecProp, Push_PutProperty, Push_PutDescription, ListingOtaSync, etc.
          </p>
          <Link to={chLink(patchParams(searchParams, { tab: 'Import' }))} className="text-indigo-600 font-semibold text-sm hover:underline">
            Importer depuis RU →
          </Link>
        </div>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'l' && listingList && (listingList.items?.length ?? 0) > 0 && (
        <>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950 leading-relaxed">
            <span className="inline-flex items-center gap-1 font-semibold"><Home size={11} /> Listing RU</span>
            {' '}— ChannelRuApiCall (Pull/Push propriété, sync canal, import). Pas calendrier / réservations.
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs bg-white border border-slate-200 rounded px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <span>{listingList.pagination?.total ?? '—'} résultats</span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="channels-badge channels-badge-neutral text-xs">srv-channels</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to={chLink(patchParams(searchParams, { tab: 'Import' }))}
                className="text-indigo-600 font-semibold hover:underline whitespace-nowrap"
              >
                Import RU →
              </Link>
              <Pag
                page={listingPage}
                prevOff={listingPage <= 1}
                nextOff={(listingList.items?.length || 0) < LIMIT}
                onPrev={() => setListingPage((p) => Math.max(1, p - 1))}
                onNext={() => setListingPage((p) => p + 1)}
              />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="channels-table-scroll overflow-auto max-h-[78vh]">
              <table className="w-full text-sm min-w-[960px]">
                <thead className="channels-sticky-thead channels-calendar-ru-thead text-slate-700">
                  <tr>
                    {['Date', 'Action', 'Statut', 'ms', 'Listing', 'Property RU', 'Route', 'Récap', 'Message'].map((h) => (
                      <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {renderListingRuTable(listingList.items || [])}
              </table>
            </div>
          </div>
        </>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'u' && (
        <>
          {userError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{userError}</div>}
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
            Owner RU · <code className="font-mono">Push_CreateUser</code>, <code className="font-mono">Push_FillCompanyDetails</code>, <code className="font-mono">Pull_ListMyUsers</code>…
          </div>
          {userLoading && !userList && <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: T.text3 }}>Chargement owner RU…</div>}
          {!userLoading && !userError && userList && (userList.items?.length ?? 0) === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">Aucun appel owner RU sur la période.</div>
          )}
          {userList && (userList.items?.length ?? 0) > 0 && (
            <>
              <div className="flex justify-between text-xs bg-white border rounded px-3 py-1.5"><span>Owner RU · {userList.pagination?.total ?? '—'}</span><Pag page={userPage} prevOff={userPage <= 1} nextOff={(userList.items?.length || 0) < LIMIT} onPrev={() => setUserPage((p) => Math.max(1, p - 1))} onNext={() => setUserPage((p) => p + 1)} /></div>
              <div className="bg-white rounded-lg border overflow-hidden"><div className="channels-table-scroll overflow-auto max-h-[78vh]">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="channels-sticky-thead"><tr>{['Date', 'Action', 'Statut', 'ms', 'Code', 'Message'].map((h) => <th key={h} className="text-left px-2 py-2 font-medium">{h}</th>)}</tr></thead>
                  {renderRuTable(userList.items || [], 6, 'user', userBodies)}
                </table>
              </div></div>
            </>
          )}
        </>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'd' && (
        <>
          {distError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{distError}</div>}
          <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">
            Distribution RU · ChannelRuApiCall (CM_Pull, etc.) — srv-channels
          </div>
          {distList && (
            <>
              <div className="flex justify-between text-xs bg-white border rounded px-3 py-1.5 items-center">
                <span>Distribution RU · {distList.pagination?.total ?? '—'}</span>
                <Pag page={distPage} prevOff={distPage <= 1} nextOff={(distList.items?.length || 0) < LIMIT} onPrev={() => setDistPage((p) => Math.max(1, p - 1))} onNext={() => setDistPage((p) => p + 1)} />
              </div>
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-auto max-h-[78vh]">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="channels-sticky-thead text-slate-700">
                      <tr>
                        {['Date', 'Action', 'Statut', 'ms', 'Code', 'Message'].map((h) => (
                          <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    {renderRuTable(distList.items || [], 6, 'user', distBodies)}
                  </table>
                </div>
              </div>
            </>
          )}
          {distLoading && !distList && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: T.text3 }}>Chargement distribution…</div>
          )}
          {!distLoading && !distError && distList && (distList.items?.length ?? 0) === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Aucun appel distribution (Pull_ListSalesChannels, CM_Pull_PropertiesStatus…) sur la période.
            </div>
          )}
        </>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'o' && (
        <>
          {oauthError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{oauthError}</div>}
          <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">
            OAuth PMS · <code className="font-mono">GetMasterToken</code>, <code className="font-mono">GetUserToken</code> (RuCallApi srv-user)
          </div>
          {oauthLoading && !oauthList && <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: T.text3 }}>Chargement OAuth…</div>}
          {!oauthLoading && !oauthError && oauthList && (oauthList.items?.length ?? 0) === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">Aucun token OAuth sur la période.</div>
          )}
          {oauthList && (oauthList.items?.length ?? 0) > 0 && (
            <>
              <div className="flex justify-between text-xs bg-white border rounded px-3 py-1.5"><span className="inline-flex gap-1 items-center"><KeyRound size={11} /> OAuth PMS</span><Pag page={oauthPage} prevOff={oauthPage <= 1} nextOff={(oauthList.items?.length || 0) < LIMIT} onPrev={() => setOauthPage((p) => Math.max(1, p - 1))} onNext={() => setOauthPage((p) => p + 1)} /></div>
              <div className="bg-white rounded-lg border overflow-hidden"><div className="channels-table-scroll overflow-auto max-h-[78vh]">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="channels-sticky-thead"><tr>{['Date', 'Action', 'Statut', 'ms', 'Code', 'Message'].map((h) => <th key={h} className="text-left px-2 py-2 font-medium">{h}</th>)}</tr></thead>
                  {renderRuTable(oauthList.items || [], 6, 'oauth', oauthBodies)}
                </table>
              </div></div>
            </>
          )}
        </>
      )}

      {viewTab === 'Api' && !docId && apiSeg === 'rev' && reviewsList && (
        <>
          {reviewsError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{reviewsError}</div>}
          <div className="flex justify-between text-xs bg-white border rounded px-3 py-1.5"><span>{reviewsList.total} reviews</span><Pag page={reviewsPage} prevOff={reviewsPage <= 1} nextOff={(reviewsList.items?.length || 0) < LIMIT} onPrev={() => setReviewsPage((p) => Math.max(1, p - 1))} onNext={() => setReviewsPage((p) => p + 1)} /></div>
          <div className="bg-white rounded-lg border overflow-hidden"><div className="channels-table-scroll overflow-auto">
            <table className="w-full text-xs">
              <thead className="channels-sticky-thead"><tr>{['Date', 'Action', 'Owner', 'Statut', 'ms', 'Message', 'Correlation'].map((h) => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {(reviewsList.items as Record<string, unknown>[] || []).map((row) => (
                  <tr key={String(row.id)} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.createdAt ? formatCasablancaDate(String(row.createdAt), 'dd/MM HH:mm:ss') : '—'}</td>
                    <td className="px-3 py-2"><span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }} data-variant="neutral text-[10px]">{String(row.action || '').replace(/^RU_REST_GET_api_/, '')}</span></td>
                    <td className="px-3 py-2">{String(row.ownerName || '—')}</td>
                    <td className="px-3 py-2">{String(row.status || '—')}</td>
                    <td className="px-3 py-2 text-right">{row.responseTime != null ? String(row.responseTime) : '—'}</td>
                    <td className="px-3 py-2 truncate max-w-[200px]">{String(row.responseMsg || '').slice(0, 60) || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{String(row.correlationId || '').slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </>
      )}

      {viewTab === 'Hook' && docId && (
        <div className="space-y-3">
          <button type="button" className="px-3 py-1.5 rounded border text-sm font-semibold" onClick={() => setSp({ docId: undefined })}>← Retour</button>
          {hookDocLoading && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32, color: T.text3, fontSize: 14 }}>Chargement…</div>}
          {hookDocError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{hookDocError}</div>}
          {hookDoc && <pre style={{ background: T.bg, color: T.text, padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", fontSize: 10, lineHeight: 1.3, overflow: "auto", border: `1px solid ${T.border}`, maxHeight: 180 }} className="">{prettyJson(hookDoc)}</pre>}
        </div>
      )}

      {viewTab === 'Hook' && !docId && (
        <IngressOverviewSection
          view={hookView}
          list={hookList}
          loading={hookLoading}
          error={hookError}
          summary={hookSummary as Parameters<typeof IngressOverviewSection>[0]['summary']}
          page={hookPage}
          limit={LIMIT}
          banner={hookBanner}
          onPagePrev={() => setHookPage((p) => Math.max(1, p - 1))}
          onPageNext={() => setHookPage((p) => p + 1)}
          detailLink={(rowId) =>
            chLink(patchParams(searchParams, { tab: 'Business', biz: 'hooks', hook: hookSeg, docId: rowId }))
          }
          msgDetail={msgDetail}
          msgExpanded={msgExpanded}
          onToggleMsgDetail={loadMsgDetail}
        />
      )}

      {viewTab === 'BizOwner' && (
        <div className="space-y-2">
          <div className="bg-white border rounded px-3 py-2 flex gap-2 items-center">
            <select style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 12, cursor: "pointer" }} className=" h-7 text-xs" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              <option value={6}>6h</option><option value={24}>24h</option><option value={72}>3j</option><option value={168}>7j</option>
            </select>
            <span className="text-xs font-semibold"><UserRound size={13} className="inline" /> Agrégation par Owner</span>
          </div>
          {bizOwnersError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{bizOwnersError}</div>}
          {bizOwners.length > 0 && (
            <div className="bg-white border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0"><tr>{['Owner', 'Total', 'Succès', 'Échecs', 'Taux', 'ms moy', 'Dernière activité', 'APIs'].map((h) => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {(bizOwners as Record<string, unknown>[]).map((row) => (
                    <tr key={String(row.ownerId)} className="border-t border-slate-100">
                      <td className="px-3 py-2"><div className="font-medium">{String(row.ownerName)}</div><div className="text-[10px] font-mono text-slate-400">{String(row.ownerId || '').slice(-8)}</div></td>
                      <td className="px-3 py-2 text-right font-semibold">{String(row.totalCalls)}</td>
                      <td className="px-3 py-2 text-right text-green-700">{String(row.successCount)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{String(row.failedCount)}</td>
                      <td className="px-3 py-2 text-right">{String(row.successRate)}%</td>
                      <td className="px-3 py-2 text-right">{row.avgResponseTime != null ? String(row.avgResponseTime) : '—'}</td>
                      <td className="px-3 py-2">{row.lastActivityAt ? formatCasablancaDate(String(row.lastActivityAt), 'dd/MM HH:mm') : '—'}</td>
                      <td className="px-3 py-2 flex flex-wrap gap-1">{(row.actions as string[] || []).slice(0, 8).map((a) => <span key={a} style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }} data-variant="neutral text-[10px]">{a.replace(/^(Push_|Pull_|RU_REST_)/, '')}</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!bizOwnersLoading && bizOwners.length === 0 && !bizOwnersError && <div className="text-sm text-slate-500 p-4 border rounded bg-white text-center">Aucun appel API avec owner identifié.</div>}
        </div>
      )}

      {viewTab === 'BizListing' && (
        <div className="space-y-2">
          <div className="bg-white border rounded px-3 py-2 flex gap-2 items-center">
            <select style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 12, cursor: "pointer" }} className=" h-7 text-xs" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              <option value={6}>6h</option><option value={24}>24h</option><option value={72}>3j</option><option value={168}>7j</option>
            </select>
            <span className="text-xs font-semibold"><Home size={13} className="inline" /> Agrégation par Listing</span>
          </div>
          {bizListingsError && <div style={{ padding: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, color: "#B91C1C", fontSize: 13 }}>{bizListingsError}</div>}
          {bizListings.length > 0 && (
            <div className="bg-white border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0"><tr>{['Listing', 'Owner', 'Total', 'Succès', 'Échecs', 'Taux', 'ms moy', 'Dernière activité', 'APIs'].map((h) => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {(bizListings as Record<string, unknown>[]).map((row) => (
                    <tr key={String(row.listingId)} className="border-t border-slate-100">
                      <td className="px-3 py-2"><div className="font-medium">{String(row.listingName)}</div><div className="text-[10px] font-mono text-slate-400">{String(row.listingId || '').slice(-8)}</div></td>
                      <td className="px-3 py-2">{String(row.ownerName || '—')}</td>
                      <td className="px-3 py-2 text-right font-semibold">{String(row.totalCalls)}</td>
                      <td className="px-3 py-2 text-right text-green-700">{String(row.successCount)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{String(row.failedCount)}</td>
                      <td className="px-3 py-2 text-right">{String(row.successRate)}%</td>
                      <td className="px-3 py-2 text-right">{row.avgResponseTime != null ? String(row.avgResponseTime) : '—'}</td>
                      <td className="px-3 py-2">{row.lastActivityAt ? formatCasablancaDate(String(row.lastActivityAt), 'dd/MM HH:mm') : '—'}</td>
                      <td className="px-3 py-2 flex flex-wrap gap-1">{(row.actions as string[] || []).slice(0, 6).map((a) => <span key={a} style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }} data-variant="neutral text-[10px]">{a}</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!bizListingsLoading && bizListings.length === 0 && !bizListingsError && <div className="text-sm text-slate-500 p-4 border rounded bg-white text-center">Aucun appel API avec listing identifié.</div>}
        </div>
      )}

      {(overviewLoading || calendarLoading || listingLoading || userLoading || oauthLoading || distLoading || httpLoading || reviewsLoading || hookLoading) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: T.text3, fontSize: 14 }}>
          <div style={{ border: `3px solid ${T.bg2}`, borderTop: `3px solid ${T.primary}`, borderRadius: '50%', width: 24, height: 24, animation: 'spin 0.8s linear infinite', marginRight: 12 }} />
          Chargement…
        </div>
      )}

      <CalendarRuRecapModal
        view={calendarRuRecapView}
        bodyLoading={calBodies.loadingId === calendarRuRecapView?.rowId}
        onClose={() => setCalendarRecapModal(null)}
        onOpenJsonXml={(id) => void calBodies.toggle(id)}
      />
      <ListingRuRecapModal
        view={listingRuRecapView}
        bodyLoading={listBodies.loadingId === listingRuRecapView?.rowId}
        onClose={() => setListingRecapModal(null)}
        onOpenJsonXml={(id) => void listBodies.toggle(id)}
      />
    </div>
  );
}
