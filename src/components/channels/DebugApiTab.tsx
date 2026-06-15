import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RU_API_MAPPING, getMongoFilterForApi, getBadgeColor } from '../../features/channels/data/ruApiMapping';
import { RU_API_DOCS } from '../../features/channels/data/ruApiDocs';
import ruApiUsageIndex from '../../features/channels/data/ruApiUsage.generated.json';
import {
  fetchChannelsDistributionRuApis,
  fetchChannelsIngressList,
  fetchChannelsIngressById,
  fetchChannelsDistributionRuCallBodies,
  fetchChannelsDebugRuApis,
  fetchChannelsOAuthRuApis,
  fetchChannelsOAuthRuCallBodies,
  resolveChannelsOwnerNames,
} from '../../services/channelsDashboardApi';
import {
  getChannelDebugDateQuery,
  getChannelDebugDatePresetLabel,
  getMonitoringRuApisHoursHint,
} from '../../features/channels/utils/channelDebugDateRange';
import { onChannelsRefresh } from '../../utils/channelsRefresh';
import { UnifiedApiCallTable, UnifiedApiCallDetail } from '../unified';
import { getDebugApiRowId, mapDebugRowsToUnifiedCalls } from '../../utils/debugApiRowMapper';

const DEBUG_PAGE_SIZE = 20;

const DATE_PRESETS = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'yesterday', label: 'Hier' },
  { id: 'last7days', label: '7 jours' },
  { id: 'all', label: 'Tout' },
];

const REST_LIST = RU_API_MAPPING.rest || [];
const REST_NAME_SET = new Set(REST_LIST.map((a) => a.name));

/** Toute action d’audit REST (Mongo `action`) — deep-links du type ?type=push&api=RU_REST_… */
function isRestChannelAction(name) {
  return Boolean(name && (REST_NAME_SET.has(name) || name.startsWith('RU_REST_')));
}

function resolveDebugApiEntry(apiName) {
  const combined = [
    ...RU_API_MAPPING.pull,
    ...RU_API_MAPPING.push,
    ...RU_API_MAPPING.oauth,
    ...RU_API_MAPPING.webhooks,
    ...REST_LIST,
  ];
  const found = combined.find((a) => a.name === apiName);
  if (found) return found;
  if (isRestChannelAction(apiName)) {
    return {
      name: apiName,
      collection: 'ChannelRuApiCall',
      service: 'srv-channels',
      visibleIn: 'Debug',
      category: 'REST RU',
    };
  }
  return null;
}

/**
 * Onglet Debug — audit ChannelRuApiCall (XML + proxy REST RU) et webhooks ingress.
 * Clic ligne → détail JSON/XML.
 */
export function DebugApiTab({ hideTypeNav = false }: { hideTypeNav?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || 'pull';
  const apiParam = searchParams.get('api') || '';
  const docIdParam = searchParams.get('docId') || '';
  const [infoApiName, setInfoApiName] = useState(null);

  /**
   * Onglet effectif : si `api` est une action REST (`RU_REST_*`), on affiche/charge la liste REST
   * même si l’URL a encore `type=push` (liens partagés / bookmarks).
   */
  const effectiveType = isRestChannelAction(apiParam) ? 'rest' : typeParam;

  // Single-document deep-link state
  const [singleDoc, setSingleDoc] = useState(null);
  const [singleDocLoading, setSingleDocLoading] = useState(false);
  const [singleDocError, setSingleDocError] = useState(null);

  // État pour les appels de l'API sélectionnée
  const [apiCalls, setApiCalls] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  /** Fenêtre Mongo / ingress : aujourd’hui, hier, 7 j calendaires Casablanca, ou tout l’historique. */
  const [datePreset, setDatePreset] = useState('last7days');
  const [expandedId, setExpandedId] = useState(null);
  const [bodiesById, setBodiesById] = useState({});
  const [bodyLoadingId, setBodyLoadingId] = useState(null);

  /** Cache ownerIds → display names (persiste entre les pages/APIs). */
  const [ownerNamesCache, setOwnerNamesCache] = useState({});

  const setType = (newType) => {
    const next = new URLSearchParams(searchParams);
    next.set('type', newType);
    next.delete('api'); // Reset API selection
    setSearchParams(next);
    setApiCalls(null);
    setExpandedId(null);
  };

  const selectApi = (apiName) => {
    const next = new URLSearchParams(searchParams);
    next.set('api', apiName);
    setSearchParams(next);
    setPage(1);
    setExpandedId(null);
  };

  const changeDatePreset = (id) => {
    setDatePreset(id);
    setPage(1);
    setExpandedId(null);
  };

  const fetchApiCalls = useCallback(async (apiName) => {
    const api = resolveDebugApiEntry(apiName);
    if (!api) return;

    setLoading(true);
    setError(null);

    const dateQ = getChannelDebugDateQuery(datePreset);
    const ruHoursHint = getMonitoringRuApisHoursHint(datePreset);

    try {
      let result;

      // OAuth white-label (RuCallApi srv-user) — monitoring agrégé user
      if (effectiveType === 'oauth' && api.collection === 'RuCallApi' && api.service === 'srv-user') {
        result = await fetchChannelsOAuthRuApis({
          page,
          limit: DEBUG_PAGE_SIZE,
          hours: ruHoursHint,
        });
      } else if (api.collection === 'RuCallApi') {
        setError(
          `⛔ API "${api.name}" : RuCallApi legacy (hors OAuth srv-user).\n\n✅ Le flux XML RU audité est ChannelRuApiCall sur srv-channels — mettre à jour ruApiMapping.js si ce flux a été migré.`,
        );
        setApiCalls(null);
        setLoading(false);
        return;
      } else if (api.collection === 'ChannelRuApiCall') {
        // Channel Manager : même route que l’onglet Distribution (filtres orchestration / listing)
        if (api.category === 'Channel Manager') {
          result = await fetchChannelsDistributionRuApis({
            page,
            limit: DEBUG_PAGE_SIZE,
            ...dateQ,
            action: api.name,
          });
        } else {
          // Calendrier, dictionnaires, listings, réservations, etc. — ChannelRuApiCall via ru-debug-apis
          result = await fetchChannelsDebugRuApis({
            page,
            limit: DEBUG_PAGE_SIZE,
            ...dateQ,
            action: api.name,
          });
        }
      } else if (api.collection === 'ChannelBookingIngress') {
        // Webhooks (ingress) — filtrer par `ruEventKey` (NewMessage, ModifiedMessage, etc.)
        result = await fetchChannelsIngressList({
          ...dateQ,
          page,
          limit: DEBUG_PAGE_SIZE,
          ruEventKey: api.name,
          kind: api.field === 'ruMessaging' ? 'messaging' : 'reservations',
        });
      }

      if (result && result.data) {
        // Les fonctions API retournent une réponse Axios avec result.data qui contient {success, data, error}
        const responseData = result.data;

        if (responseData.success) {
          setApiCalls(responseData.data || {});
        } else {
          console.error('API Error:', responseData);
          setError(responseData.error || 'Erreur lors du chargement');
          setApiCalls(null);
        }
      } else {
        console.error('Invalid response:', result);
        setError('Réponse invalide du serveur');
        setApiCalls(null);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      const cfg = err.config;
      const reqUrl = cfg ? `${cfg.baseURL || ''}${cfg.url || ''}`.replace(/([^:])\/{2,}/g, '$1/') : '';
      const st = err.response?.status;
      let msg = err.response?.data?.error || err.message || 'Erreur réseau';
      if (st === 404 && reqUrl) {
        msg = `${msg} (${reqUrl})`;
      }
      setError(msg);
      setApiCalls(null);
    } finally {
      setLoading(false);
    }
  }, [page, effectiveType, datePreset]);

  /** Résoudre les noms d'owner à partir des items chargés. */
  useEffect(() => {
    if (!apiCalls?.items?.length) return;
    const unknownIds = [];
    for (const row of apiCalls.items) {
      const oid = row.auditContext?.ownerId || (row.auditContext?.ownerIds?.[0]);
      if (oid && !ownerNamesCache[oid]) unknownIds.push(oid);
    }
    const unique = [...new Set(unknownIds)];
    if (unique.length === 0) return;
    resolveChannelsOwnerNames(unique)
      .then((res) => {
        if (res.data?.success && res.data.data?.owners) {
          setOwnerNamesCache((prev) => ({ ...prev, ...res.data.data.owners }));
        }
      })
      .catch(() => {});
  }, [apiCalls]);

  /** Chargement au deep-link (?tab=Debug&api=…) — y compris ?type=push&api=RU_REST_… */
  useEffect(() => {
    if (docIdParam) return; // docId mode takes over
    if (!apiParam) {
      setApiCalls(null);
      setError(null);
      return;
    }
    if (!resolveDebugApiEntry(apiParam)) {
      setApiCalls(null);
      setError(null);
      return;
    }
    fetchApiCalls(apiParam);
  }, [apiParam, typeParam, fetchApiCalls, docIdParam]);

  useEffect(
    () =>
      onChannelsRefresh(() => {
        if (apiParam && !docIdParam) void fetchApiCalls(apiParam);
      }),
    [apiParam, docIdParam, fetchApiCalls],
  );

  /** Deep-link vers un document unique (?docId=…) */
  useEffect(() => {
    if (!docIdParam) {
      setSingleDoc(null);
      setSingleDocError(null);
      return;
    }
    let cancelled = false;
    setSingleDocLoading(true);
    setSingleDocError(null);
    setSingleDoc(null);

    const isWebhook = effectiveType === 'webhooks';
    const fetcher = isWebhook
      ? fetchChannelsIngressById(docIdParam)
      : fetchChannelsDistributionRuCallBodies(docIdParam);

    fetcher
      .then((result) => {
        if (cancelled) return;
        const d = result?.data;
        if (d?.success && d.data) {
          setSingleDoc(d.data);
        } else {
          setSingleDocError(d?.error || 'Document introuvable');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setSingleDocError(err.response?.data?.error || err.message || 'Erreur réseau');
      })
      .finally(() => {
        if (!cancelled) setSingleDocLoading(false);
      });
    return () => { cancelled = true; };
  }, [docIdParam, effectiveType]);

  const onDetailToggle = useCallback(async (rowId, row, api) => {
    if (expandedId === rowId) {
      setExpandedId(null);
      return;
    }

    const cached = bodiesById[rowId];
    if (
      cached &&
      cached.error == null &&
      (cached.requestXml != null ||
        cached.responseJson != null ||
        cached.requestPayload != null ||
        cached.ingressMeta != null)
    ) {
      setExpandedId(rowId);
      return;
    }

    setBodyLoadingId(rowId);
    try {
      // Utiliser les fonctions API existantes pour fetch les détails
      let result;
      const docId = row._id || row.id;
      console.log('[DebugApiTab] Fetching details:', { rowId, docId, row_id: row._id, row_id2: row.id, api: api?.name, category: api?.category });

      if (docId) {
        if (api.collection === 'RuCallApi' && api.category === 'OAuth PMS') {
          result = await fetchChannelsOAuthRuCallBodies(docId);
        } else if (api.collection === 'RuCallApi') {
          setBodiesById((prev) => ({
            ...prev,
            [rowId]: { error: 'RuCallApi non-OAuth : détail non exposé ici — migrer vers ChannelRuApiCall si applicable.' },
          }));
          setExpandedId(rowId);
          setBodyLoadingId(null);
          return;
        } else if (api.collection === 'ChannelRuApiCall') {
          result = await fetchChannelsDistributionRuCallBodies(docId);
        } else if (api.collection === 'ChannelBookingIngress') {
          result = await fetchChannelsIngressById(docId);
        }
      } else {
        console.warn('[DebugApiTab] No row._id found:', { row, rowId });
      }

      if (result && result.data) {
        const responseData = result.data;
        if (responseData.success && responseData.data) {
          const d = responseData.data;
          const normalized =
            api.collection === 'ChannelBookingIngress'
              ? {
                  requestPayload: d.parsedData ?? d.ruMessaging ?? null,
                  requestXml: typeof d.rawBody === 'string' ? d.rawBody : '',
                  responseJson: null,
                  responseXml: null,
                  ingressMeta: {
                    channel: d.channel,
                    ruEventKey: d.ruEventKey,
                    correlationId: d.correlationId,
                    publishOk: d.publishOk,
                    domainIntentPublished: d.domainIntentPublished,
                  },
                }
              : d;
          setBodiesById((prev) => ({ ...prev, [rowId]: normalized }));
          setExpandedId(rowId);
        } else {
          setBodiesById((prev) => ({ ...prev, [rowId]: { error: responseData.error || responseData.message || 'Erreur lors du chargement' } }));
          setExpandedId(rowId);
        }
      } else {
        const errMsg = result?.data?.error || result?.data?.message || 'Réponse invalide du serveur';
        console.error('[DebugApiTab] Invalid response structure:', { result, rowId, api: api?.name });
        setBodiesById((prev) => ({ ...prev, [rowId]: { error: errMsg } }));
        setExpandedId(rowId);
      }
    } catch (e) {
      console.error('[DebugApiTab] Error fetching body:', {
        error: e,
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        rowId,
        api: api?.name
      });
      setBodiesById((prev) => ({ ...prev, [rowId]: { error: e.response?.data?.error || e.response?.data?.message || e.message || 'Erreur inconnue' } }));
      setExpandedId(rowId);
    } finally {
      setBodyLoadingId(null);
    }
  }, [expandedId, bodiesById]);

  const copyFilter = (api) => {
    const filter = getMongoFilterForApi(api.name, api.collection);
    navigator.clipboard.writeText(JSON.stringify(filter, null, 2));
    alert('Filtre MongoDB copié !');
  };

  const currentApis =
    effectiveType === 'pull'
      ? RU_API_MAPPING.pull
      : effectiveType === 'push'
        ? RU_API_MAPPING.push
        : effectiveType === 'oauth'
          ? RU_API_MAPPING.oauth
          : effectiveType === 'rest'
            ? REST_LIST
            : RU_API_MAPPING.webhooks;

  const PRIORITY = {
    // Calendar (high)
    Push_PutPrices_RQ: 100,
    Push_PutAvbUnits_RQ: 95,
    Pull_ListReservations_RQ: 90,
    // Listing sync (high)
    Push_PutProperty_RQ: 85,
    Push_PutBuilding_RQ: 80,
    Push_PutComposition_RQ: 75,
    Push_PutDescription_RQ: 70,
    Push_PutImage_RQ: 65,
    Push_PutLocation_RQ: 60,
    // Reservations (mid/high)
    Push_PutConfirmedReservationMulti_RQ: 70,
    Push_ConfirmReservation_RQ: 65,
    Push_CancelReservation_RQ: 65,
    Pull_GetReservationDetails_RQ: 60,
    Pull_GetLeads_RQ: 55,
    // Owner / Users (mid)
    Pull_ListMyUsers_RQ: 55,
    Push_CreateUser_RQ: 55,
    Push_FillCompanyDetails_RQ: 50,
    Push_ArchiveUser_RQ: 45,
    LNM_PutHandlerUrl_RQ: 45,
  };

  const usage = ruApiUsageIndex?.usage || {};

  const decoratedApis = (currentApis || [])
    .map((api) => {
      const hasDoc = Boolean(api?.name && RU_API_DOCS[api.name]);
      // "Soon" = action listée mais pas utilisée dans le code (scan auto backend+front+docs/RU).
      // On ne marque pas Soon pour OAuth/Webhooks/REST (toujours intégrés).
      const integrated = usage?.[api.name]?.integrated !== false;
      const soon = api.collection === 'ChannelRuApiCall' && integrated === false;

      const prio = PRIORITY[api.name] || 0;
      return { ...api, soon, hasDoc, prio, integrated };
    })
    .sort((a, b) => {
      // 1) intégrées d'abord (soon = false)
      if (a.soon !== b.soon) return a.soon ? 1 : -1;
      // 2) ordre d'importance
      if ((b.prio || 0) !== (a.prio || 0)) return (b.prio || 0) - (a.prio || 0);
      // 3) catégorie puis nom
      const ca = String(a.category || '');
      const cb = String(b.category || '');
      if (ca !== cb) return ca.localeCompare(cb);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  const selectedApiObj = currentApis.find((a) => a.name === apiParam) || resolveDebugApiEntry(apiParam);

  const unifiedDebugCalls = useMemo(() => {
    if (!apiCalls?.items?.length) return [];
    return mapDebugRowsToUnifiedCalls(apiCalls.items, bodiesById, selectedApiObj, ownerNamesCache);
  }, [apiCalls?.items, bodiesById, selectedApiObj, ownerNamesCache]);

  const clearDocId = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('docId');
    setSearchParams(next);
  };

  // Single-document deep-link view
  if (docIdParam) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clearDocId}
            className="px-3 py-1.5 rounded border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Retour à la liste
          </button>
          <span className="text-xs text-slate-500 font-mono">docId: {docIdParam}</span>
          {apiParam && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-600">{apiParam}</span>}
        </div>

        {singleDocLoading && (
          <div className="text-center py-8">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="mt-2 text-sm text-slate-600">Chargement du document…</p>
          </div>
        )}

        {singleDocError && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">
            <strong>Erreur:</strong> {singleDocError}
          </div>
        )}

        {singleDoc && !singleDocLoading && (
          <div className="space-y-3">
            {/* Metadata cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {singleDoc.ruEventKey && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Event Key</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 mt-0.5">{singleDoc.ruEventKey}</div>
                </div>
              )}
              {singleDoc.action && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Action</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 mt-0.5">{singleDoc.action}</div>
                </div>
              )}
              {singleDoc.correlationId && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Correlation ID</div>
                  <div className="font-mono text-[10px] text-slate-700 mt-0.5 break-all">{singleDoc.correlationId}</div>
                </div>
              )}
              {singleDoc.channel && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Channel</div>
                  <div className="text-xs font-semibold text-slate-900 mt-0.5">{singleDoc.channel}</div>
                </div>
              )}
              {singleDoc.publishOk != null && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Publish</div>
                  <div className={`text-xs font-semibold mt-0.5 ${singleDoc.publishOk ? 'text-green-700' : 'text-red-700'}`}>
                    {singleDoc.publishOk ? 'OK' : 'FAIL'}
                  </div>
                </div>
              )}
              {singleDoc.status && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Status</div>
                  <div className={`text-xs font-semibold mt-0.5 ${singleDoc.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {singleDoc.status}
                  </div>
                </div>
              )}
              {singleDoc.domainIntentPublished && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Domain Intent</div>
                  <div className="font-mono text-xs text-slate-900 mt-0.5">{singleDoc.domainIntentPublished}</div>
                </div>
              )}
              {singleDoc.createdAt && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="text-[10px] text-slate-500 uppercase">Date</div>
                  <div className="text-xs text-slate-900 mt-0.5">{new Date(singleDoc.createdAt).toLocaleString()}</div>
                </div>
              )}
            </div>

            {/* Enrichment / ACK info */}
            {singleDoc.enrichment && (
              <div className="bg-white border border-slate-200 rounded p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Enrichissement (mapping Sojori)</div>
                <pre className="text-[10px] bg-slate-50 border border-slate-100 rounded p-2 max-h-[200px] overflow-auto">
                  {JSON.stringify(singleDoc.enrichment, null, 2)}
                </pre>
              </div>
            )}

            {/* Parsed data / payload */}
            {singleDoc.parsedData && (
              <div className="bg-white border border-slate-200 rounded p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Parsed Data (JSON)</div>
                <pre className="text-[9px] bg-slate-50 border border-slate-100 rounded p-2 max-h-[300px] overflow-auto">
                  {JSON.stringify(singleDoc.parsedData, null, 2)}
                </pre>
              </div>
            )}

            {singleDoc.canonicalRuBookingV2 && (
              <div className="bg-white border border-slate-200 rounded p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Canonical Booking V2</div>
                <pre className="text-[9px] bg-slate-50 border border-slate-100 rounded p-2 max-h-[300px] overflow-auto">
                  {JSON.stringify(singleDoc.canonicalRuBookingV2, null, 2)}
                </pre>
              </div>
            )}

            {/* Raw XML */}
            {singleDoc.rawBody && (
              <div className="bg-white border border-slate-200 rounded p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">XML brut</div>
                <pre className="text-[9px] bg-slate-50 border border-slate-100 rounded p-2 max-h-[300px] overflow-auto whitespace-pre-wrap break-all">
                  {singleDoc.rawBody}
                </pre>
              </div>
            )}

            {/* For ChannelRuApiCall: request/response XML */}
            {singleDoc.requestXml && (
              <div className="bg-white border border-slate-200 rounded p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">XML Requête</div>
                <pre className="text-[9px] bg-slate-50 border border-slate-100 rounded p-2 max-h-[300px] overflow-auto whitespace-pre-wrap break-all">
                  {singleDoc.requestXml}
                </pre>
              </div>
            )}
            {singleDoc.responseXml && (
              <div className="bg-white border border-slate-200 rounded p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">XML Réponse</div>
                <pre className="text-[9px] bg-slate-50 border border-slate-100 rounded p-2 max-h-[300px] overflow-auto whitespace-pre-wrap break-all">
                  {singleDoc.responseXml}
                </pre>
              </div>
            )}
            {singleDoc.requestPayload && (
              <div className="bg-white border border-slate-200 rounded p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Payload</div>
                <pre className="text-[9px] bg-slate-50 border border-slate-100 rounded p-2 max-h-[300px] overflow-auto">
                  {JSON.stringify(singleDoc.requestPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-slate-600 bg-orange-50/80 border border-orange-100 rounded-lg px-3 py-2 leading-relaxed">
        <strong className="text-orange-900">Debug RU</strong> — ① choisir le type (<span className="font-mono">Pull / Push / OAuth…</span>) dans
        la barre orange au-dessus · ② cliquer une API ci-dessous · ③ consulter les appels à droite (clic ligne = détail XML).
      </div>

      {!hideTypeNav && (
        <div className="flex gap-2 flex-wrap channels-tabs-container">
          <button
            type="button"
            onClick={() => setType('pull')}
            className={`channels-tab-button ${effectiveType === 'pull' ? 'channels-tab-button-active' : 'channels-tab-button-inactive'}`}
          >
            Pull ({RU_API_MAPPING.pull.length})
          </button>
          <button
            type="button"
            onClick={() => setType('push')}
            className={`channels-tab-button ${effectiveType === 'push' ? 'channels-tab-button-active' : 'channels-tab-button-inactive'}`}
          >
            Push ({RU_API_MAPPING.push.length})
          </button>
          <button
            type="button"
            onClick={() => setType('oauth')}
            className={`channels-tab-button ${effectiveType === 'oauth' ? 'channels-tab-button-active' : 'channels-tab-button-inactive'}`}
          >
            OAuth ({RU_API_MAPPING.oauth.length})
          </button>
          <button
            type="button"
            onClick={() => setType('webhooks')}
            className={`channels-tab-button ${effectiveType === 'webhooks' ? 'channels-tab-button-active' : 'channels-tab-button-inactive'}`}
          >
            Webhooks ({RU_API_MAPPING.webhooks.length})
          </button>
          <button
            type="button"
            onClick={() => setType('rest')}
            className={`channels-tab-button ${effectiveType === 'rest' ? 'channels-tab-button-active' : 'channels-tab-button-inactive'}`}
          >
            REST ({REST_LIST.length})
          </button>
        </div>
      )}

      {/* Liste API (gauche) + appels (droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,30%)_1fr] gap-3 items-start">
        <div className="space-y-2 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 px-0.5">
            ② API · {effectiveType.toUpperCase()}
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
            {decoratedApis.map((api) => {
              const badgeColor = getBadgeColor(api);
              const isSelected = apiParam === api.name;
              const badgeClass =
                badgeColor === 'green'
                  ? 'bg-green-100 text-green-800'
                  : badgeColor === 'orange'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800';

              // NOTE: avoid nested <button> (invalid HTML) so the inner "i" never triggers selection.
              return (
                <div
                  key={api.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectApi(api.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') selectApi(api.name);
                  }}
                  className={`w-full text-left border rounded p-2 transition-all cursor-pointer select-none ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-mono text-xs font-semibold text-slate-900">
                      {api.soon ? `(Soon) ${api.name}` : api.name}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setInfoApiName(api.name);
                      }}
                      onMouseDown={(e) => {
                        // extra safety: prevent outer onClick on some browsers
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="w-6 h-6 rounded border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50"
                      title="Informations (docs/RU)"
                      aria-label={`Informations ${api.name}`}
                    >
                      i
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${badgeClass}`}>{api.category}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">
                    📦 {api.collection} → {api.service}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau appels */}
        <div className="space-y-2 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 px-0.5">
            ③ Appels MongoDB
            {apiParam ? (
              <span className="ml-2 font-mono normal-case text-slate-700">{apiParam}</span>
            ) : null}
          </div>
          <div className="bg-white border border-slate-200 rounded-lg min-h-[280px] p-3">
          {infoApiName && (() => {
            const u = usage?.[infoApiName];
            const integrated = u?.integrated !== false;
            const hits = typeof u?.hits === 'number' ? u.hits : null;
            const src = u?.source ? String(u.source) : 'unknown';
            return (
            <div className="border border-slate-200 bg-white rounded p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Informations (docs/RU)</div>
                  <div className="font-mono text-sm font-bold text-slate-900 mt-1">{infoApiName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoApiName(null)}
                  className="px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  Fermer
                </button>
              </div>

              <div className="mt-3 text-sm text-slate-700 leading-relaxed">
                {RU_API_DOCS[infoApiName]?.summary ? (
                  <div>{RU_API_DOCS[infoApiName].summary}</div>
                ) : (
                  <div className="text-slate-600">
                    <strong>(Doc Soon)</strong> Description non encore copiée depuis <span className="font-mono">docs/RU</span> vers
                    <span className="font-mono"> ruApiDocs.js</span>.
                  </div>
                )}
              </div>

              <div className="mt-4 border border-slate-100 rounded p-3 bg-slate-50 text-xs">
                <div className="font-semibold text-slate-700">Usage (scan code)</div>
                <div className="mt-2 text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">Intégrée :</span>{' '}
                    {integrated ? (
                      <span className="text-green-700 font-semibold">oui</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">non (Soon)</span>
                    )}
                  </div>
                  {hits !== null && (
                    <div>
                      <span className="font-semibold text-slate-700">Occurrences texte :</span> {hits}{' '}
                      <span className="text-slate-500">
                        (compte les chaînes exactes dans <span className="font-mono">sojori-production/apps</span>,{' '}
                        <span className="font-mono">packages</span>, <span className="font-mono">sojori-dashboard/src</span>,{' '}
                        <span className="font-mono">docs/RU</span> — peut inclure docs)
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-700">Source :</span> <span className="font-mono">{src}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="border border-slate-100 rounded p-3 bg-slate-50">
                  <div className="font-semibold text-slate-700">Deep-link Debug</div>
                  <div className="font-mono mt-1 text-[11px] text-slate-600 break-all">
                    {`${window.location.origin}/channels?tab=Debug&type=${typeParam || 'pull'}&api=${encodeURIComponent(
                      infoApiName,
                    )}`}
                  </div>
                </div>
                <div className="border border-slate-100 rounded p-3 bg-slate-50">
                  <div className="font-semibold text-slate-700">Astuce</div>
                  <div className="mt-1 text-slate-600">
                    Clique sur l’API (à gauche) pour afficher les appels MongoDB. Clique sur <span className="font-semibold">i</span> pour la doc.
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Si la "page i" est ouverte, on n’affiche pas le tableau d’appels en dessous */}
          {infoApiName ? null : (
            <>
              {!apiParam && (
                <div className="text-center py-10 text-slate-500">
                  <p className="text-sm font-semibold text-slate-700">Aucune API sélectionnée</p>
                  <p className="text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                    Choisis une API dans la colonne de gauche (ex.{' '}
                    <span className="font-mono text-slate-600">Pull_ListReservations_RQ</span>) pour afficher les
                    derniers appels enregistrés.
                  </p>
                </div>
              )}

              {apiParam && loading && (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  <p className="mt-2 text-sm text-slate-600">Chargement...</p>
                </div>
              )}

              {apiParam && error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">
                  <strong>Erreur:</strong> {error}
                </div>
              )}

              {apiParam && !loading && !error && apiCalls && (
                <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-slate-700">
                  {selectedApiObj?.name} ({apiCalls.pagination?.total ?? apiCalls.total ?? apiCalls.items?.length ?? 0}{' '}
                  appels)
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Période</span>
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => changeDatePreset(p.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                        datePreset === p.id
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {selectedApiObj && (
                <button
                  onClick={() => copyFilter(selectedApiObj)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  📋 Copier filtre MongoDB
                </button>
              )}

              {apiCalls.items && apiCalls.items.length > 0 && (
                <div className="bg-white rounded border border-slate-200 overflow-hidden">
                  <UnifiedApiCallTable
                    calls={unifiedDebugCalls}
                    viewMode="debug"
                    compact
                    showBusinessContext={false}
                    expandedCallId={expandedId}
                    loadingCallId={bodyLoadingId}
                    onExpandChange={(callId) => {
                      if (!callId) {
                        setExpandedId(null);
                        return;
                      }
                      const idx = apiCalls.items.findIndex((row, i) => getDebugApiRowId(row, i) === callId);
                      const row = apiCalls.items[idx];
                      if (row) onDetailToggle(callId, row, selectedApiObj);
                    }}
                    renderDetail={(call) => {
                      const body = bodiesById[call.id];
                      if (bodyLoadingId === call.id) {
                        return <div className="text-center text-sm text-slate-500 py-4">Chargement…</div>;
                      }
                      if (body?.error) {
                        return <div className="text-xs text-red-600 p-2">{body.error}</div>;
                      }
                      const hasContent =
                        body &&
                        (body.requestXml ||
                          body.responseXml ||
                          body.requestPayload != null ||
                          body.responseJson != null ||
                          body.rawBody ||
                          body.ingressMeta);
                      if (!hasContent) {
                        return <div className="text-center text-sm text-slate-500 py-4">Chargement…</div>;
                      }
                      return <UnifiedApiCallDetail call={call} viewMode="debug" />;
                    }}
                  />
                </div>
              )}

              {apiCalls.items && apiCalls.items.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Aucun appel sur la période « {getChannelDebugDatePresetLabel(datePreset)} ».
                  {datePreset !== 'all' ? ' Essaie « Tout » ou élargis les dates.' : ''}
                </div>
              )}

              {(() => {
                const total = apiCalls.pagination?.total ?? apiCalls.total ?? 0;
                const pages = Math.max(1, Math.ceil(total / DEBUG_PAGE_SIZE));
                if (!apiCalls.items || total <= DEBUG_PAGE_SIZE) return null;
                return (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded border border-slate-200 font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Précédent
                    </button>
                    <span className="text-slate-600 tabular-nums">
                      Page {page} / {pages} — {total} ligne{total > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1 rounded border border-slate-200 font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Suivant
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
