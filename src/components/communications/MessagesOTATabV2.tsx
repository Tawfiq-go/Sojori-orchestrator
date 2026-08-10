import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import { InboxFullscreenLayer } from '../unified-inbox/InboxFullscreen';
import { useInboxFullscreen } from '../unified-inbox/useInboxFullscreen';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import { useCommsHubChrome } from './CommsHubChromeContext';
import messagesService from '../../services/messagesService';
import {
  fetchInboxResas,
  initiateWhatsAppForResa,
} from '../../services/inboxResasService';
import type { Thread } from '../../types/unifiedInbox.types';
import { useInboxOTAConversation } from '../../hooks/useInboxOTAConversation';
import { useInboxRealtimeRefresh } from '../../hooks/useInboxRealtimeRefresh';
import {
  bumpOtaThreadAfterSend,
  filterOtaActiveReservationsOnly,
  filterOtaInboxDefault,
  findOtaThreadByLinkKey,
  mapApiItemToOtaThread,
  mapOtaRowToThread,
  mapOtaThreadDetailToRow,
  mergeOtaThreadPages,
  clearOtaGhostPreview,
  type OtaThreadRow,
} from '../unified-inbox/inboxOtaMappers';
import {
  applyOtaChannelFilter,
  applyOtaInboxView,
  buildOtaAdvancedApiParams,
  buildOtaGlobalSearchParams,
  countOtaFilters,
  hasActiveOtaAdvancedSearch,
  type OtaAdvancedSearch,
  type OtaChannelFilter,
  type OtaInboxView,
} from '../unified-inbox/otaThreadFilters';
import OtaInboxFilters from '../unified-inbox/OtaInboxFilters';
import { T } from '../unified-inbox/_tokens';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import {
  buildOtaThreadContextForAi,
  getLastGuestMessageFromInbox,
  getLastGuestOriginalLanguageFromInbox,
} from '../../services/communicationsAi.helpers';
import { formatThreadWhen, normalizeBookingSource } from '../unified-inbox/inboxFormat';
import {
  getCachedOtaInbox,
  invalidateOtaInboxCache,
  setCachedOtaInbox,
} from '../../utils/otaInboxCache';
import { openOtaPlatformExternal } from '../../utils/otaPlatformLinks';
import { last9Phone, otaInboxUrl, waInboxUrl } from '../../utils/commsDeepLinks';

const OTA_VIEW_CHIPS: Array<{
  id: OtaInboxView;
  label: string;
  countKey: keyof ReturnType<typeof countOtaFilters>;
  urgent?: boolean;
  title?: string;
}> = [
  { id: 'exchanges', label: 'Échanges', countKey: 'exchanges' },
  { id: 'unreplied', label: 'Non rép.', countKey: 'unreplied', urgent: true },
  { id: 'created_today', label: 'Créé auj', countKey: 'created_today' },
  {
    id: 'stay',
    label: 'Séjour',
    countKey: 'stay',
    title: 'En cours → À venir → Terminées récemment',
  },
  { id: 'arr_today', label: 'Arr auj', countKey: 'arr_today' },
  { id: 'dep_today', label: 'Dép auj', countKey: 'dep_today' },
  { id: 'arr_tomorrow', label: 'Arr dem', countKey: 'arr_tomorrow' },
  { id: 'dep_tomorrow', label: 'Dép dem', countKey: 'dep_tomorrow' },
];

const OTA_CHANNEL_CHIPS: Array<{ id: OtaChannelFilter; label: string }> = [
  { id: 'ab', label: 'Airbnb' },
  { id: 'bk', label: 'Booking' },
  { id: 'direct', label: 'Direct' },
];
const OTA_INBOX_PAGE_SIZE = 50;

function inboxCursorFromRows(rows: OtaThreadRow[]): string | undefined {
  if (!rows.length) return undefined;
  const oldest = rows[rows.length - 1];
  const t = oldest.lastMessageTime || oldest.threadUpdatedAt || oldest.threadCreatedAt;
  return t ? new Date(t).toISOString() : undefined;
}

const EMPTY_ADVANCED: OtaAdvancedSearch = { stayPeriod: 'all' };

type OtaSearchMode = 'none' | 'global' | 'advanced' | 'unreplied';

const GLOBAL_SEARCH_MIN_LEN = 2;
const GLOBAL_SEARCH_DEBOUNCE_MS = 500;

function mapApiThreads(response: unknown): OtaThreadRow[] {
  const r = response as Record<string, unknown>;
  const items =
    (r?.threads as unknown[]) ||
    ((r?.data as Record<string, unknown>)?.threads as unknown[]) ||
    (Array.isArray(r?.data) ? (r.data as unknown[]) : []);
  return (Array.isArray(items) ? items : []).map(mapApiItemToOtaThread);
}

export default function MessagesOTATabV2() {
  const navigate = useNavigate();
  const { setLeading, setSubBar } = useCommsHubChrome();
  /** Liste inbox : actives seulement (Tout / canaux) */
  const [inboxRows, setInboxRows] = useState<OtaThreadRow[]>(
    () => filterOtaInboxDefault(getCachedOtaInbox() ?? []),
  );
  /** Résultats recherche BD (avancée = toutes resa ; non répondu = actives seulement) */
  const [searchRows, setSearchRows] = useState<OtaThreadRow[]>([]);
  const [searchMode, setSearchMode] = useState<OtaSearchMode>('none');

  const [loading, setLoading] = useState(() => !getCachedOtaInbox());
  const [tableReady, setTableReady] = useState(() => Boolean(getCachedOtaInbox()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inboxHasMore, setInboxHasMore] = useState(false);
  const [inboxLoadingMore, setInboxLoadingMore] = useState(false);
  const loadRequestIdRef = useRef(0);
  const prevSearchTermRef = useRef('');
  const globalSearchRequestIdRef = useRef(0);
  const globalSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [globalSearchPending, setGlobalSearchPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [searchTerm, setSearchTerm] = useState('');
  const [otaChannelFilter, setOtaChannelFilter] = useState<OtaChannelFilter>('all');
  const [otaView, setOtaView] = useState<OtaInboxView>(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'unreplied' || v === 'exchanges' || v === 'created_today' || v === 'stay') {
      return v as OtaInboxView;
    }
    return 'exchanges';
  });
  const [otaAdvancedDraft, setOtaAdvancedDraft] = useState<OtaAdvancedSearch>(EMPTY_ADVANCED);
  const [appliedAdvanced, setAppliedAdvanced] = useState<OtaAdvancedSearch>(EMPTY_ADVANCED);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');
  const [aiSourceDraft, setAiSourceDraft] = useState('');
  const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);
  const [pendingAiDraft, setPendingAiDraft] = useState<string | null>(null);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [whatsappGuest, setWhatsappGuest] = useState<{
    kind: 'loading' | 'actif' | 'jamais' | 'nonum';
    phone: string;
  } | null>(null);
  const [initiatingWhatsApp, setInitiatingWhatsApp] = useState(false);
  const fullscreenCtl = useInboxFullscreen();

  const inbox = useInboxOTAConversation();
  /* Référence stable : `inbox` change à chaque render et relancerait l'effet deep link. */
  const { selectOtaThread } = inbox;

  const loadInbox = useCallback(async (opts?: { skipCache?: boolean }) => {
    if (!scopeFetchReady) {
      setInboxRows([]);
      setLoading(false);
      setTableReady(false);
      return;
    }
    const requestId = ++loadRequestIdRef.current;
    const cached = !opts?.skipCache ? getCachedOtaInbox() : null;
    const hasCache = Boolean(cached);

    if (hasCache && cached) {
      setInboxRows(filterOtaInboxDefault(cached));
      setSearchRows([]);
      setSearchMode('none');
      setTableReady(true);
      setIsRefreshing(true);
      setLoading(false);
    } else {
      setLoading(true);
      setTableReady(false);
    }
    setLoadError(null);

    try {
      const response = await messagesService.getOTAThreads({
        page: 0,
        limit: OTA_INBOX_PAGE_SIZE,
        ownerId: requestOwnerId || undefined,
      });
      if (requestId !== loadRequestIdRef.current) return;

      const pageRows = filterOtaInboxDefault(mapApiThreads(response));
      const hasMore = Boolean((response as { hasMore?: boolean })?.hasMore);
      setInboxHasMore(hasMore);
      setInboxRows(pageRows);
      setSearchRows([]);
      setSearchMode('none');
      setCachedOtaInbox(pageRows);
      setTableReady(true);
    } catch (err: unknown) {
      if (requestId !== loadRequestIdRef.current) return;
      if (!hasCache) {
        console.error('❌ Erreur chargement threads OTA:', err);
        setLoadError(err instanceof Error ? err.message : 'Erreur de chargement');
        setInboxRows([]);
        setInboxHasMore(false);
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [scopeFetchReady, requestOwnerId]);

  const loadMoreInbox = useCallback(async () => {
    if (inboxLoadingMore || !inboxHasMore || searchMode !== 'none') return;
    setInboxLoadingMore(true);
    try {
      let cursor: string | undefined;
      setInboxRows((prev) => {
        cursor = inboxCursorFromRows(prev);
        return prev;
      });
      if (!cursor) {
        setInboxHasMore(false);
        return;
      }
      const response = await messagesService.getOTAThreads({
        page: 0,
        limit: OTA_INBOX_PAGE_SIZE,
        cursor,
        ownerId: requestOwnerId || undefined,
      });
      const pageRows = filterOtaInboxDefault(mapApiThreads(response));
      const hasMore = Boolean((response as { hasMore?: boolean })?.hasMore);
      setInboxHasMore(hasMore);
      setInboxRows((prev) => mergeOtaThreadPages(prev, pageRows));
    } catch (err) {
      console.error('❌ Erreur pagination OTA:', err);
    } finally {
      setInboxLoadingMore(false);
    }
  }, [inboxHasMore, inboxLoadingMore, requestOwnerId, searchMode]);

  const loadServerSearch = useCallback(
    async (opts: {
      advanced?: OtaAdvancedSearch;
      channelFilter?: OtaChannelFilter;
      unrepliedOnly?: boolean;
      globalQuery?: string;
      mode: 'global' | 'advanced' | 'unreplied';
    }) => {
      const advanced = opts.advanced ?? appliedAdvanced;
      const channel = opts.channelFilter ?? otaChannelFilter;
      const unreplied = opts.unrepliedOnly ?? false;

      const requestId =
        opts.mode === 'global' ? ++globalSearchRequestIdRef.current : ++loadRequestIdRef.current;

      try {
        setLoading(true);
        setLoadError(null);
        const globalParams =
          opts.mode === 'global' && opts.globalQuery
            ? buildOtaGlobalSearchParams(opts.globalQuery, {
                channelFilter: channel,
                ownerId: requestOwnerId || undefined,
              })
            : {};
        const apiParams =
          opts.mode === 'global'
            ? globalParams
            : buildOtaAdvancedApiParams(advanced, {
                channelFilter: channel,
                unrepliedOnly: unreplied || opts.mode === 'unreplied',
              });

        const response = await messagesService.getOTAThreads({
          page: 0,
          limit: OTA_INBOX_PAGE_SIZE,
          ownerId: requestOwnerId || undefined,
          ...apiParams,
        });

        if (opts.mode === 'global' && requestId !== globalSearchRequestIdRef.current) return;

        let rows = mapApiThreads(response);
        // Recherche globale / avancée : peut inclure completed / annulées. Non répondu : actives seulement.
        if (opts.mode === 'unreplied') {
          rows = filterOtaActiveReservationsOnly(rows);
        }

        setSearchRows(rows);
        setSearchMode(opts.mode);
      } catch (err: unknown) {
        if (opts.mode === 'global' && requestId !== globalSearchRequestIdRef.current) return;
        console.error('❌ Erreur recherche OTA:', err);
        setLoadError(err instanceof Error ? err.message : 'Erreur de recherche');
        setSearchRows([]);
      } finally {
        if (opts.mode === 'global') {
          if (requestId === globalSearchRequestIdRef.current) {
            setGlobalSearchPending(false);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    },
    [appliedAdvanced, otaChannelFilter, requestOwnerId],
  );

  useEffect(() => {
    const q = searchTerm.trim();
    const prev = prevSearchTermRef.current.trim();
    prevSearchTermRef.current = searchTerm;

    if (globalSearchDebounceRef.current) {
      clearTimeout(globalSearchDebounceRef.current);
      globalSearchDebounceRef.current = null;
    }

    if (!q) {
      setGlobalSearchPending(false);
      if (prev.length >= GLOBAL_SEARCH_MIN_LEN) {
        setSearchRows([]);
        setSearchMode('none');
        void loadInbox({ skipCache: true });
      } else {
        setSearchMode((mode) => (mode === 'global' ? 'none' : mode));
        if (prev.length > 0) setSearchRows([]);
      }
      return;
    }

    if (q.length < GLOBAL_SEARCH_MIN_LEN) {
      setGlobalSearchPending(false);
      setSearchMode((mode) => {
        if (mode === 'global') {
          setSearchRows([]);
          return 'none';
        }
        return mode;
      });
      return;
    }

    setGlobalSearchPending(true);
    globalSearchDebounceRef.current = setTimeout(() => {
      void loadServerSearch({ mode: 'global', globalQuery: q });
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => {
      if (globalSearchDebounceRef.current) {
        clearTimeout(globalSearchDebounceRef.current);
        globalSearchDebounceRef.current = null;
      }
    };
  }, [searchTerm, loadServerSearch, loadInbox]);

  useInboxRealtimeRefresh(
    'ota',
    () => loadInbox({ skipCache: true }),
    () => {
      if (inbox.activeRow) void inbox.refreshOtaMessages();
    },
  );

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (inbox.activeRow) {
      setTaskCounts((prev) => ({
        ...prev,
        [inbox.activeRow!.threadId]: inbox.tasks.length,
      }));
    }
  }, [inbox.tasks, inbox.activeRow]);

  useEffect(() => {
    const row = inbox.activeRow;
    if (!row) {
      setWhatsappGuest(null);
      return;
    }
    const phoneDigits = String(
      inbox.reservation?.guestPhone || row.guestPhone || '',
    ).replace(/\D/g, '');
    const resaNum = String(
      inbox.reservation?.reservationNumber || row.reservationNumber || '',
    ).trim();
    if (!phoneDigits && !resaNum) {
      setWhatsappGuest({ kind: 'nonum', phone: '' });
      return;
    }

    let cancelled = false;
    setWhatsappGuest({ kind: 'loading', phone: phoneDigits });

    void (async () => {
      try {
        const search = phoneDigits || resaNum;
        const convRes = await messagesService.getConversations({
          search,
          limit: 40,
          hasReservation: true,
          owner_id: requestOwnerId || undefined,
          silent: true,
        });
        if (cancelled) return;
        const list =
          convRes?.status === 'success'
            ? (convRes.data.conversations as Array<{
                phone?: string;
                reservation_number?: string;
                reservation_id?: string;
              }>)
            : [];
        const phoneTail = last9Phone(phoneDigits);
        const resaNeedle = resaNum.toUpperCase();
        const match = list.find((c) => {
          if (phoneTail.length >= 9 && last9Phone(String(c.phone || '')) === phoneTail) {
            return true;
          }
          if (!resaNeedle) return false;
          const num = String(c.reservation_number || c.reservation_id || '')
            .trim()
            .toUpperCase();
          return num === resaNeedle;
        });
        if (match) {
          setWhatsappGuest({
            kind: 'actif',
            phone: String(match.phone || phoneDigits).replace(/\D/g, ''),
          });
          return;
        }
        setWhatsappGuest({
          kind: phoneDigits ? 'jamais' : 'nonum',
          phone: phoneDigits,
        });
      } catch {
        if (cancelled) return;
        setWhatsappGuest({
          kind: phoneDigits ? 'jamais' : 'nonum',
          phone: phoneDigits,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    inbox.activeRow,
    inbox.reservation?.guestPhone,
    inbox.reservation?.reservationNumber,
    requestOwnerId,
  ]);

  const initiateWhatsAppForActive = useCallback(async () => {
    const reservationNumber = String(
      inbox.reservation?.reservationNumber || inbox.activeRow?.reservationNumber || '',
    ).trim();
    if (!reservationNumber) {
      window.alert('N° de réservation manquant — impossible d’initier WhatsApp.');
      return;
    }
    setInitiatingWhatsApp(true);
    try {
      const rows = await fetchInboxResas(requestOwnerId || undefined);
      const match = rows.find(
        (r) => String(r.reservationNumber || '').toUpperCase() === reservationNumber.toUpperCase(),
      );
      if (!match) {
        window.alert(
          `Réservation ${reservationNumber} introuvable côté Résas pour initier WhatsApp. Les messages OTA restent ouverts.`,
        );
        return;
      }
      const result = await initiateWhatsAppForResa(match.id);
      if (result.success) {
        const phone = (match.phone || whatsappGuest?.phone || '').replace(/\D/g, '');
        setWhatsappGuest({ kind: 'actif', phone });
        navigate(waInboxUrl({ phone, reservationNumber }));
        return;
      }
      window.alert(
        result.notWhatsApp
          ? 'Ce numéro ne semble pas avoir WhatsApp.'
          : result.error || 'Envoi WhatsApp impossible — tu restes sur le fil OTA.',
      );
    } catch {
      window.alert('Erreur initiation WhatsApp — tu restes sur le fil OTA.');
    } finally {
      setInitiatingWhatsApp(false);
    }
  }, [
    inbox.activeRow,
    inbox.reservation,
    requestOwnerId,
    whatsappGuest?.phone,
    navigate,
  ]);

  /** WA depuis OTA : ne jamais envoyer vers Résas (ça ferme le fil OTA). */
  const openWhatsAppForActive = useCallback(() => {
    const row = inbox.activeRow;
    const phone =
      whatsappGuest?.phone ||
      inbox.reservation?.guestPhone ||
      row?.guestPhone ||
      '';
    const reservationNumber =
      inbox.reservation?.reservationNumber || row?.reservationNumber || '';

    if (whatsappGuest?.kind === 'actif') {
      navigate(waInboxUrl({ phone, reservationNumber }));
      return;
    }
    if (whatsappGuest?.kind === 'jamais') {
      // Initier sur place — pas de navigation Résas qui fait perdre les messages OTA
      void initiateWhatsAppForActive();
      return;
    }
    if (whatsappGuest?.kind === 'nonum' || (!phone && !reservationNumber)) {
      window.alert('Pas de numéro WhatsApp pour ce voyageur.');
      return;
    }
    // loading / inconnu : tenter l’onglet WA sans passer par Résas
    navigate(waInboxUrl({ phone, reservationNumber }));
  }, [inbox.activeRow, inbox.reservation, whatsappGuest, navigate, initiateWhatsAppForActive]);

  const handleChannelFilterChange = useCallback(
    (filter: OtaChannelFilter) => {
      setOtaChannelFilter(filter);
      if (searchMode === 'global' && searchTerm.trim().length >= GLOBAL_SEARCH_MIN_LEN) {
        void loadServerSearch({ mode: 'global', globalQuery: searchTerm.trim(), channelFilter: filter });
      } else if (searchMode === 'advanced') {
        void loadServerSearch({ mode: 'advanced', channelFilter: filter });
      }
    },
    [searchMode, searchTerm, loadServerSearch],
  );

  const handleAdvancedSearch = useCallback(() => {
    setAppliedAdvanced(otaAdvancedDraft);
    setAdvancedExpanded(false);
    void loadServerSearch({ advanced: otaAdvancedDraft, mode: 'advanced' });
  }, [otaAdvancedDraft, loadServerSearch]);

  const handleResetAdvanced = useCallback(() => {
    setOtaAdvancedDraft(EMPTY_ADVANCED);
    setAppliedAdvanced(EMPTY_ADVANCED);
    setAdvancedExpanded(false);
    if (searchMode === 'advanced') {
      setSearchRows([]);
      setSearchMode('none');
    }
  }, [searchMode]);

  const handleResetAllFilters = useCallback(() => {
    setSearchTerm('');
    setOtaChannelFilter('all');
    setOtaView('exchanges');
    setOtaAdvancedDraft(EMPTY_ADVANCED);
    setAppliedAdvanced(EMPTY_ADVANCED);
    setAdvancedExpanded(false);
    setSearchRows([]);
    setSearchMode('none');
    invalidateOtaInboxCache();
    void loadInbox({ skipCache: true });
  }, [loadInbox]);

  /** Compteurs sur la liste affichée (inbox ou résultats recherche) */
  const otaGlobalQueryActive = searchTerm.trim().length >= GLOBAL_SEARCH_MIN_LEN;
  const advancedActive = hasActiveOtaAdvancedSearch(appliedAdvanced);

  const otaBaseRows = useMemo(() => {
    if (otaGlobalQueryActive || searchMode !== 'none') return searchRows;
    return inboxRows;
  }, [otaGlobalQueryActive, searchMode, searchRows, inboxRows]);

  const otaFilterCounts = useMemo(() => {
    const scoped = applyOtaChannelFilter(otaBaseRows, otaChannelFilter);
    return countOtaFilters(scoped);
  }, [otaBaseRows, otaChannelFilter]);

  const activeKeyword = useMemo(() => {
    const kw = appliedAdvanced.messageText?.trim();
    if (searchMode === 'advanced' && kw) return kw;
    return '';
  }, [searchMode, appliedAdvanced.messageText]);

  const keywordMatchTotal = useMemo(() => {
    if (!activeKeyword) return null;
    return searchRows.reduce((sum, row) => sum + (row.messageMatchCount ?? 0), 0);
  }, [activeKeyword, searchRows]);

  const otaFiltersActive = useMemo(
    () =>
      otaGlobalQueryActive ||
      searchMode === 'advanced' ||
      otaChannelFilter !== 'all' ||
      otaView !== 'exchanges' ||
      advancedActive,
    [otaGlobalQueryActive, searchMode, otaChannelFilter, otaView, advancedActive],
  );

  const displayRows = useMemo(
    () => applyOtaInboxView(otaBaseRows, otaView, otaChannelFilter),
    [otaBaseRows, otaView, otaChannelFilter],
  );

  const formattedThreads: Thread[] = useMemo(
    () =>
      displayRows.map((row) => {
        const base = mapOtaRowToThread(row, taskCounts[row.threadId]);
        return {
          ...base,
          time: base.time || formatThreadWhen(row.lastMessageTime),
        };
      }),
    [displayRows, taskCounts],
  );

  /* Même chrome que WhatsApp : titre + search + Avancé (leading) ; chips (subBar). */
  useEffect(() => {
    setLeading(
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          width: '100%',
          maxWidth: 640,
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 800,
            color: T.text,
            flexShrink: 0,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}
        >
          🏨 OTA
        </Typography>
        <Box
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            fontWeight: 700,
            px: 0.75,
            py: '2px',
            borderRadius: 999,
            bgcolor: T.airbnbBg,
            color: '#c0353a',
            flexShrink: 0,
          }}
        >
          {displayRows.length}
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: '8px',
            py: '4px',
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: '8px',
            '&:focus-within': {
              borderColor: T.primary,
              boxShadow: `0 0 0 2px ${T.primaryTint}`,
            },
          }}
        >
          <Box sx={{ fontSize: 12, color: T.text3, lineHeight: 1 }}>🔍</Box>
          <Box
            component="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Résa, listing, voyageur, tél…"
            sx={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: 0,
              font: 'inherit',
              fontSize: 11.5,
              color: T.text,
              bgcolor: 'transparent',
              '&::placeholder': { color: T.text4 },
            }}
          />
          {otaFiltersActive && (
            <Box
              component="button"
              type="button"
              title="Réinitialiser filtres"
              onClick={handleResetAllFilters}
              sx={{
                border: 0,
                bgcolor: 'transparent',
                color: T.text3,
                fontSize: 12,
                cursor: 'pointer',
                p: 0,
                lineHeight: 1,
                '&:hover': { color: T.error },
              }}
            >
              ✕
            </Box>
          )}
        </Box>
        <Box
          component="button"
          type="button"
          title="Recherche avancée"
          onClick={() => setAdvancedExpanded((v) => !v)}
          sx={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.35,
            px: '8px',
            py: '5px',
            border: `1px solid ${advancedExpanded || advancedActive ? T.primary : T.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 10.5,
            fontWeight: advancedExpanded || advancedActive ? 700 : 650,
            color: advancedExpanded || advancedActive ? T.primaryDeep : T.text2,
            bgcolor: advancedExpanded || advancedActive ? T.primaryTint : T.bg1,
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
            '&:hover': { bgcolor: T.primaryTint },
          }}
        >
          Avancé {advancedExpanded ? '▲' : '▼'}
        </Box>
      </Box>,
    );
  }, [
    setLeading,
    displayRows.length,
    searchTerm,
    otaFiltersActive,
    handleResetAllFilters,
    advancedExpanded,
    advancedActive,
  ]);

  useEffect(() => {
    const chip = (
      id: string,
      label: string,
      active: boolean,
      count: number | undefined,
      onClick: () => void,
      opts?: { urgent?: boolean; title?: string },
    ) => (
      <Box
        key={id}
        component="button"
        type="button"
        title={opts?.title || label}
        onClick={onClick}
        sx={{
          px: 1.15,
          py: 0.55,
          borderRadius: '8px',
          border: `1px solid ${active ? T.green : T.border}`,
          bgcolor: active ? T.greenBg : T.bg1,
          color: active ? '#0e8c4d' : opts?.urgent && (count ?? 0) > 0 ? T.error : T.text3,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          lineHeight: 1.25,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {label}
        {typeof count === 'number' && (
          <Box
            component="span"
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10.5,
              fontWeight: 800,
              opacity: count > 0 || active ? 1 : 0.45,
            }}
          >
            {count}
          </Box>
        )}
      </Box>
    );

    setSubBar(
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
        {advancedExpanded && (
          <OtaInboxFilters
            hubAdvancedOnly
            channelFilter={otaChannelFilter}
            counts={otaFilterCounts}
            onChannelFilterChange={handleChannelFilterChange}
            unrepliedOnly={false}
            onUnrepliedOnlyChange={() => undefined}
            advanced={otaAdvancedDraft}
            onAdvancedChange={setOtaAdvancedDraft}
            onAdvancedSubmit={handleAdvancedSearch}
            onAdvancedReset={handleResetAdvanced}
            serverSearchActive={searchMode === 'advanced'}
            loading={loading || globalSearchPending}
            expanded
            onToggleExpanded={() => setAdvancedExpanded(false)}
            searchResultCount={searchMode === 'advanced' ? searchRows.length : null}
            keywordMatchTotal={keywordMatchTotal}
            activeKeyword={activeKeyword}
          />
        )}
        <Box
          sx={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {OTA_VIEW_CHIPS.map((f) =>
            chip(
              f.id,
              f.label,
              otaView === f.id,
              otaFilterCounts[f.countKey],
              () => {
                if (otaView === f.id && f.id !== 'exchanges') setOtaView('exchanges');
                else setOtaView(f.id);
              },
              { urgent: f.urgent, title: f.title },
            ),
          )}
          <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: T.border, mx: '2px', flexShrink: 0 }} />
          {OTA_CHANNEL_CHIPS.map((f) =>
            chip(
              f.id,
              f.label,
              otaChannelFilter === f.id,
              otaFilterCounts[f.id],
              () =>
                handleChannelFilterChange(otaChannelFilter === f.id ? 'all' : f.id),
            ),
          )}
        </Box>
      </Box>,
    );
  }, [
    setSubBar,
    otaView,
    otaChannelFilter,
    otaFilterCounts,
    advancedExpanded,
    otaAdvancedDraft,
    handleAdvancedSearch,
    handleResetAdvanced,
    handleChannelFilterChange,
    loading,
    globalSearchPending,
    searchMode,
    searchRows.length,
    keywordMatchTotal,
    activeKeyword,
  ]);

  useEffect(
    () => () => {
      setLeading(null);
      setSubBar(null);
    },
    [setLeading, setSubBar],
  );

  // Fil chargé vide → liste alignée (plus de Q/A fantôme type « 28 mai »).
  useEffect(() => {
    if (!inbox.activeRow || inbox.loadingMessages) return;
    if (inbox.messages.length > 0) return;
    const tid = String(inbox.activeRow.threadId);
    setInboxRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        if (String(r.threadId) !== tid) return r;
        if (!r.lastRealMessage && !r.lastGuestMessage && !r.lastMessage) return r;
        changed = true;
        return clearOtaGhostPreview(r);
      });
      return changed ? next : prev;
    });
  }, [inbox.activeRow, inbox.loadingMessages, inbox.messages.length]);

  const activeThread: Thread | null = useMemo(() => {
    if (!inbox.activeRow) return null;
    const base = mapOtaRowToThread(inbox.activeRow, inbox.tasks.length);
    const phone =
      inbox.reservation?.guestPhone ||
      inbox.activeRow.guestPhone ||
      base.phone ||
      undefined;
    const emptyFil = !inbox.loadingMessages && inbox.messages.length === 0;
    return {
      ...base,
      ...(emptyFil
        ? {
            preview: 'Aucun message',
            lastMessageKind: undefined,
            programmedAuto: undefined,
            time: '',
          }
        : {}),
      phone,
      unread: inbox.activeRow.unreadCount ?? 0,
      listingName:
        inbox.reservation?.listingName ??
        inbox.activeRow.listingName ??
        base.listingName,
      guestsLabel: inbox.reservation?.guestsLabel ?? base.guestsLabel,
      guestsCompact: inbox.reservation?.guestsCompact ?? base.guestsCompact,
      reservationNumber:
        inbox.reservation?.reservationNumber ??
        inbox.activeRow.reservationNumber ??
        base.reservationNumber,
      reservationCreatedDisplay:
        inbox.reservation?.reservationCreatedDisplay ?? base.reservationCreatedDisplay,
      presenceLabel: inbox.reservation?.presenceLabel ?? base.presenceLabel,
      registrationRegistered: inbox.reservation?.registrationRegistered,
      registrationTotal: inbox.reservation?.registrationTotal,
      arrivalTimeChosen: inbox.reservation?.arrivalTimeChosen,
      arrivalTimeLabel: inbox.reservation?.arrivalTimeLabel,
      departureTimeChosen: inbox.reservation?.departureTimeChosen,
      departureTimeLabel: inbox.reservation?.departureTimeLabel,
      arrivalDeclared: inbox.reservation?.arrivalDeclared,
      departureDeclared: inbox.reservation?.departureDeclared,
      guestFlag: base.guestFlag,
      taskCount: inbox.tasks.length,
      tasks: inbox.tasks,
      tasksLoading: inbox.loadingTasks,
    };
  }, [
    inbox.activeRow,
    inbox.tasks,
    inbox.loadingTasks,
    inbox.reservation,
    inbox.loadingMessages,
    inbox.messages.length,
  ]);

  const otaPlatform = inbox.activeRow
    ? normalizeBookingSource(inbox.activeRow.channel)
    : 'Airbnb';

  const [searchParams] = useSearchParams();
  const deepLinkThread = searchParams.get('thread');
  const deepLinkReservation =
    searchParams.get('reservation') || searchParams.get('res') || null;
  const otaDeepLinkedRef = useRef<string | null>(null);
  const otaDeepLinkFetchRef = useRef<string | null>(null);

  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'unreplied' || v === 'exchanges' || v === 'created_today' || v === 'stay') {
      setOtaView(v as OtaInboxView);
    }
  }, [searchParams]);

  const handleSelect = async (row: OtaThreadRow) => {
    setComposerDraft('');
    setAiSourceDraft('');
    // Marquer le deep-link avant navigate — évite un 2e selectOtaThread (clignotement).
    const linkKey = `thread:${String(row.threadId).trim()}`;
    otaDeepLinkedRef.current = linkKey;
    await selectOtaThread(row);
    navigate(
      otaInboxUrl({
        threadId: row.threadId,
        reservationNumber: row.reservationNumber || undefined,
      }),
      { replace: true },
    );
  };

  useEffect(() => {
    if (!scopeFetchReady) return;
    const linkKey = deepLinkThread
      ? `thread:${deepLinkThread.trim()}`
      : deepLinkReservation
        ? `res:${deepLinkReservation.trim().toUpperCase()}`
        : null;
    if (!linkKey) return;
    if (otaDeepLinkedRef.current === linkKey) return;

    const byReservation = (rows: OtaThreadRow[]) => {
      if (!deepLinkReservation) return undefined;
      const needle = deepLinkReservation.trim().toUpperCase();
      return rows.find(
        (r) => String(r.reservationNumber || '').trim().toUpperCase() === needle,
      );
    };

    if (deepLinkThread) {
      const key = deepLinkThread.trim();
      const fromList =
        findOtaThreadByLinkKey(otaBaseRows, key) ?? findOtaThreadByLinkKey(inboxRows, key);

      if (fromList) {
        otaDeepLinkedRef.current = linkKey;
        setComposerDraft('');
        setAiSourceDraft('');
        void selectOtaThread(fromList);
        return;
      }

      if (loading) return;
      if (otaDeepLinkFetchRef.current === key) return;
      otaDeepLinkFetchRef.current = key;

      void (async () => {
        try {
          const res = await messagesService.getOTAMessages(key);
          const row = mapOtaThreadDetailToRow(res);
          if (!row) return;

          otaDeepLinkedRef.current = linkKey;
          setInboxRows((prev) => {
            const exists = prev.some((r) => String(r.threadId) === String(row.threadId));
            if (exists) return prev;
            const merged = [row, ...prev];
            setCachedOtaInbox(merged);
            return merged;
          });
          setComposerDraft('');
          setAiSourceDraft('');
          // `res` contient déjà les messages : on les réutilise au lieu de refetcher.
          await selectOtaThread(row, { preloadedResponse: res });
        } catch (err) {
          console.warn('[OTA] deep link: thread introuvable', key, err);
          otaDeepLinkFetchRef.current = null;
          // Fallback : code résa dans la liste déjà chargée
          const byRes = byReservation(otaBaseRows) ?? byReservation(inboxRows);
          if (byRes) {
            otaDeepLinkedRef.current = linkKey;
            setComposerDraft('');
            setAiSourceDraft('');
            void selectOtaThread(byRes);
          }
        }
      })();
      return;
    }

    // Deep link par code résa seul (ex. depuis Résas sans threadId)
    if (loading) return;
    const byRes = byReservation(otaBaseRows) ?? byReservation(inboxRows);
    if (!byRes) return;
    otaDeepLinkedRef.current = linkKey;
    setComposerDraft('');
    setAiSourceDraft('');
    void selectOtaThread(byRes);
  }, [
    deepLinkThread,
    deepLinkReservation,
    otaBaseRows,
    inboxRows,
    loading,
    scopeFetchReady,
    selectOtaThread,
  ]);

  const otaThreadContext = useMemo(
    () => buildOtaThreadContextForAi(inbox.messages),
    [inbox.messages],
  );

  const otaLastGuestMessage = useMemo(
    () => getLastGuestMessageFromInbox(inbox.messages),
    [inbox.messages],
  );

  const otaPreferredLanguage = useMemo(
    () => getLastGuestOriginalLanguageFromInbox(inbox.messages),
    [inbox.messages],
  );

  const handleOtaSend = useCallback(
    async (
      text: string,
      opts?: {
        aiAssisted?: boolean;
        generationId?: string;
        replyMode?: 'manual' | 'ai_assisted' | 'ai_generated';
      },
    ) => {
      if (!inbox.activeRow) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const row = inbox.activeRow;
      const generationId = opts?.generationId || pendingGenerationId || undefined;
      let replyMode = opts?.replyMode;
      if (!replyMode && generationId) {
        replyMode =
          pendingAiDraft &&
          pendingAiDraft.replace(/\s+/g, ' ').trim().toLowerCase() ===
            trimmed.replace(/\s+/g, ' ').trim().toLowerCase()
            ? 'ai_generated'
            : 'ai_assisted';
      } else if (!replyMode && opts?.aiAssisted) {
        replyMode = 'ai_assisted';
      }
      inbox.appendOutboundMessage(trimmed);
      try {
        const sendRes = await messagesService.sendOTAMessage(row.threadId, trimmed, {
          aiAssisted: Boolean(generationId) || opts?.aiAssisted === true,
          replyMode,
          generationId,
        });
        if (generationId) {
          const messageId = Number(sendRes?.result?.ID ?? sendRes?.messageId);
          if (Number.isFinite(messageId) && messageId > 0) {
            try {
              const { linkOtaAiGenerationAudit } = await import(
                '../../services/communicationsAiService'
              );
              await linkOtaAiGenerationAudit(generationId, {
                messageId,
                finalBody: trimmed,
              });
            } catch (linkErr) {
              console.warn('[OTA] generation audit link failed', linkErr);
            }
          }
        }
        setPendingGenerationId(null);
        setPendingAiDraft(null);
        setInboxRows((prev) => {
          const bumped = bumpOtaThreadAfterSend(prev, row.threadId, trimmed, row);
          setCachedOtaInbox(bumped);
          return bumped;
        });
        void inbox.refreshOtaMessages(row);
      } catch (err) {
        inbox.removeLastOutboundMessage();
        throw err;
      }
    },
    [inbox, pendingGenerationId, pendingAiDraft],
  );

  const [markingOtaStatus, setMarkingOtaStatus] = useState(false);

  const applyOtaMessageStatusLocal = useCallback(
    (threadId: string, messageStatus: 'responded' | 'ignored') => {
      const patch = (rows: OtaThreadRow[]) =>
        rows.map((r) =>
          String(r.threadId) === String(threadId)
            ? {
                ...r,
                messageStatus,
                unreadCount: messageStatus === 'responded' ? 0 : r.unreadCount,
              }
            : r,
        );
      setInboxRows((prev) => {
        const next = patch(prev);
        setCachedOtaInbox(next);
        return next;
      });
      setSearchRows((prev) => patch(prev));
      inbox.setActiveRow((prev) =>
        prev && String(prev.threadId) === String(threadId)
          ? {
              ...prev,
              messageStatus,
              unreadCount: messageStatus === 'responded' ? 0 : prev.unreadCount,
            }
          : prev,
      );
    },
    [inbox],
  );

  const handleMarkOtaThreadStatus = useCallback(
    async (status: 'responded' | 'ignored') => {
      const row = inbox.activeRow;
      if (!row) return;
      setMarkingOtaStatus(true);
      try {
        await messagesService.updateOTAThreadMessageStatus(row.threadId, status);
        applyOtaMessageStatusLocal(row.threadId, status);
      } catch (err) {
        console.error('[OTA] mark thread status failed', err);
        throw err;
      } finally {
        setMarkingOtaStatus(false);
      }
    },
    [inbox.activeRow, applyOtaMessageStatusLocal],
  );

  // Ne pas bloquer la liste pendant un refresh arrière-plan (évite le clignotement au clic / deep-link).
  const showBlockingSpinner = loading && !tableReady;

  const inboxBody = (
    <>
      <ThreadsList
          threads={formattedThreads}
          channels={[
            { id: 'ab', label: 'OTA', icon: '🏨', color: '#FF5A5F', count: displayRows.length },
          ]}
          listTitle="Messages OTA"
          mode="ota"
          activeThreadId={activeThread?.id ?? null}
          searchTerm={searchTerm}
          loading={showBlockingSpinner}
          otaListTotalCount={displayRows.length}
          loadError={loadError}
          onRetryLoad={() => void loadInbox({ skipCache: true })}
          otaChannelFilter={otaChannelFilter}
          onOtaChannelFilterChange={handleChannelFilterChange}
          otaFilterCounts={otaFilterCounts}
          otaView={otaView}
          otaAdvancedSearch={otaAdvancedDraft}
          onOtaAdvancedSearchChange={setOtaAdvancedDraft}
          onOtaAdvancedSearchSubmit={handleAdvancedSearch}
          onOtaAdvancedSearchReset={handleResetAdvanced}
          otaServerSearchActive={searchMode === 'advanced'}
          otaGlobalSearchActive={otaGlobalQueryActive}
          otaSearchPending={globalSearchPending}
          otaAdvancedExpanded={advancedExpanded}
          onOtaAdvancedExpandedChange={setAdvancedExpanded}
          otaSearchResultCount={searchMode === 'advanced' ? searchRows.length : null}
          otaActiveKeyword={activeKeyword}
          otaKeywordMatchTotal={keywordMatchTotal}
          otaFiltersActive={otaFiltersActive}
          onOtaResetAll={handleResetAllFilters}
          onOtaLoadMore={() => void loadMoreInbox()}
          otaHasMore={inboxHasMore && searchMode === 'none' && !otaGlobalQueryActive}
          otaLoadingMore={inboxLoadingMore}
          hideListHeader
          compactToolbar
          ultraCompact
          showFullscreenEnter={!fullscreenCtl.fullscreen}
          onEnterFullscreen={fullscreenCtl.enter}
          onSelectThread={(thread) => {
            const row = displayRows.find((r) => r.threadId === thread.id);
            if (row) void handleSelect(row);
          }}
          onSearchChange={setSearchTerm}
        />
        {activeThread ? (
          <>
            <ConversationThread
              thread={activeThread}
              messages={inbox.messages}
              loadingMessages={inbox.loadingMessages}
              messagesLoadError={inbox.messagesLoadError}
              messagesTotal={inbox.messagesTotal}
              highlightKeyword={activeKeyword}
              quickTemplates={[]}
              quickReplies={[]}
              otaPlatform={otaPlatform}
              composerValue={composerDraft}
              onComposerValueChange={setComposerDraft}
              onSendMessage={handleOtaSend}
              onSelectTemplate={async (tpl) => {
                if (tpl.text) await handleOtaSend(tpl.text);
              }}
              onAISuggestion={(draft) => {
                setAiSourceDraft(draft);
                setShowAIModal(true);
              }}
              whatsappGuestKind={whatsappGuest?.kind ?? null}
              onOpenWhatsApp={openWhatsAppForActive}
              otaMessageStatus={inbox.activeRow?.messageStatus}
              onMarkOtaThreadStatus={handleMarkOtaThreadStatus}
              markingOtaThreadStatus={markingOtaStatus}
            />
            <ConversationDetails
              thread={activeThread}
              type="ota"
              reservation={inbox.reservation ?? undefined}
              whatsappGuest={whatsappGuest}
              onOpenWhatsApp={openWhatsAppForActive}
              onInitiateWhatsApp={() => void initiateWhatsAppForActive()}
              initiatingWhatsApp={initiatingWhatsApp}
              onAction={(action) => {
                if (action === 'view-platform') {
                  const opened = openOtaPlatformExternal({
                    platform: otaPlatform || inbox.reservation?.otaPlatform || inbox.activeRow?.channel,
                    otaCode: inbox.reservation?.otaCode || inbox.activeRow?.otaCode,
                    reservationNumber:
                      inbox.reservation?.reservationNumber || inbox.activeRow?.reservationNumber,
                    threadId: inbox.activeRow?.threadId,
                  });
                  if (!opened) {
                    console.warn('[MessagesOTA] no external OTA URL for', otaPlatform);
                  }
                }
              }}
            />
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
              gridColumn: { xs: '1', lg: '2' },
            }}
          >
            <Typography sx={{ fontSize: 48 }}>📨</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>
              {showBlockingSpinner && !tableReady ? 'Chargement des messages OTA…' : 'Sélectionnez un message OTA'}
            </Typography>
            {!showBlockingSpinner && displayRows.length === 0 && (
              <Typography sx={{ fontSize: 13, color: t.text3 }}>
                Aucun résultat — élargissez les critères ou réinitialisez les filtres avancés.
              </Typography>
            )}
          </Box>
        )}
    </>
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {isRefreshing && (
        <Box
          sx={{
            position: 'fixed',
            top: 72,
            right: 16,
            zIndex: 1200,
            bgcolor: 'rgba(255,90,95,0.92)',
            color: '#fff',
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Mise à jour OTA…
        </Box>
      )}
      {/* fillViewport : reste dans la page (pas de hauteur fixe qui déborde en bas). */}
      {!fullscreenCtl.fullscreen && <InboxLayout fillViewport>{inboxBody}</InboxLayout>}
      <InboxFullscreenLayer
        open={fullscreenCtl.fullscreen}
        onClose={fullscreenCtl.exit}
        label="Inbox Messages OTA plein écran"
      >
        {inboxBody}
      </InboxFullscreenLayer>

      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={(text, meta) => {
          setComposerDraft(text);
          setPendingGenerationId(meta?.generationId || null);
          setPendingAiDraft(meta?.generationId ? text : null);
          setShowAIModal(false);
        }}
        onSendSuggestion={async (text, meta) => {
          await handleOtaSend(text, {
            aiAssisted: true,
            generationId: meta?.generationId,
            replyMode: meta?.replyMode || 'ai_generated',
          });
          setComposerDraft('');
          setShowAIModal(false);
        }}
        context={{
          threadContext: otaThreadContext,
          lastGuestMessage: otaLastGuestMessage,
          preferredLanguage: otaPreferredLanguage || undefined,
          draft: aiSourceDraft,
          guestName: inbox.activeRow?.guestName,
          reservationNumber: inbox.reservation?.reservationNumber,
          reservationMongoId: inbox.rawReservation
            ? String(
                (inbox.rawReservation as { _id?: string })._id ||
                  (inbox.rawReservation as { id?: string }).id ||
                  '',
              )
            : undefined,
          guestPhone:
            inbox.reservation?.guestPhone || inbox.activeRow?.guestPhone || undefined,
          listingName:
            inbox.reservation?.listingName || inbox.activeRow?.listingName || undefined,
          threadId: inbox.activeRow?.threadId,
          channelName: otaPlatform,
          type: 'ota',
        }}
      />

    </Box>
  );
}
