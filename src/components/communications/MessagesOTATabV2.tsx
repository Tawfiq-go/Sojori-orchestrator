import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import messagesService from '../../services/messagesService';
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
  type OtaThreadRow,
} from '../unified-inbox/inboxOtaMappers';
import {
  applyOtaInboxFilters,
  buildOtaAdvancedApiParams,
  buildOtaGlobalSearchParams,
  countOtaFilters,
  countOtaStayQuickFilters,
  hasActiveOtaAdvancedSearch,
  sortOtaThreadsByActivity,
  type OtaAdvancedSearch,
  type OtaChannelFilter,
  type OtaStayQuickFilter,
} from '../unified-inbox/otaThreadFilters';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { OTA_QUICK_REPLIES, OTA_QUICK_TEMPLATES } from '../unified-inbox/inboxMessages';
import {
  buildOtaThreadContextForAi,
  getLastGuestMessageFromInbox,
} from '../../services/communicationsAi.helpers';
import { formatThreadWhen, normalizeBookingSource } from '../unified-inbox/inboxFormat';
import {
  getCachedOtaInbox,
  invalidateOtaInboxCache,
  setCachedOtaInbox,
} from '../../utils/otaInboxCache';

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
  /** Liste inbox : actives seulement (Tout / canaux) */
  const [inboxRows, setInboxRows] = useState<OtaThreadRow[]>(() => getCachedOtaInbox() ?? []);
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
  const [otaStayQuickFilter, setOtaStayQuickFilter] = useState<OtaStayQuickFilter>('none');
  const [otaUnrepliedOnly, setOtaUnrepliedOnly] = useState(false);
  const [otaAdvancedDraft, setOtaAdvancedDraft] = useState<OtaAdvancedSearch>(EMPTY_ADVANCED);
  const [appliedAdvanced, setAppliedAdvanced] = useState<OtaAdvancedSearch>(EMPTY_ADVANCED);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');
  const [aiSourceDraft, setAiSourceDraft] = useState('');
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const inbox = useInboxOTAConversation();

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
      setInboxRows(cached);
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

  const handleChannelFilterChange = (filter: OtaChannelFilter) => {
    setOtaChannelFilter(filter);
    if (searchMode === 'global' && searchTerm.trim().length >= GLOBAL_SEARCH_MIN_LEN) {
      void loadServerSearch({ mode: 'global', globalQuery: searchTerm.trim(), channelFilter: filter });
    } else if (searchMode === 'advanced') {
      void loadServerSearch({ mode: 'advanced', channelFilter: filter, unrepliedOnly: otaUnrepliedOnly });
    } else if (searchMode === 'unreplied') {
      void loadServerSearch({ mode: 'unreplied', channelFilter: filter, unrepliedOnly: true });
    }
  };

  const handleUnrepliedOnlyChange = (on: boolean) => {
    setOtaUnrepliedOnly(on);
    if (on) {
      void loadServerSearch({ mode: 'unreplied', unrepliedOnly: true });
      return;
    }
    if (searchMode === 'unreplied' && !hasActiveOtaAdvancedSearch(appliedAdvanced)) {
      setSearchRows([]);
      setSearchMode('none');
    }
  };

  const handleAdvancedSearch = () => {
    setAppliedAdvanced(otaAdvancedDraft);
    setAdvancedExpanded(false);
    void loadServerSearch({ advanced: otaAdvancedDraft, mode: 'advanced', unrepliedOnly: otaUnrepliedOnly });
  };

  const handleResetAdvanced = () => {
    setOtaAdvancedDraft(EMPTY_ADVANCED);
    setAppliedAdvanced(EMPTY_ADVANCED);
    setSearchTerm('');
    setOtaChannelFilter('all');
    setOtaStayQuickFilter('none');
    setOtaUnrepliedOnly(false);
    setAdvancedExpanded(false);
    invalidateOtaInboxCache();
    void loadInbox({ skipCache: true });
  };

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setOtaChannelFilter('all');
    setOtaStayQuickFilter('none');
    setOtaUnrepliedOnly(false);
    setOtaAdvancedDraft(EMPTY_ADVANCED);
    setAppliedAdvanced(EMPTY_ADVANCED);
    setAdvancedExpanded(false);
    setSearchRows([]);
    setSearchMode('none');
    invalidateOtaInboxCache();
    void loadInbox({ skipCache: true });
  };

  /** Compteurs sur la liste affichée (inbox ou résultats recherche) */
  const otaGlobalQueryActive = searchTerm.trim().length >= GLOBAL_SEARCH_MIN_LEN;

  const otaBaseRows = useMemo(() => {
    if (otaGlobalQueryActive || searchMode !== 'none') return searchRows;
    return inboxRows;
  }, [otaGlobalQueryActive, searchMode, searchRows, inboxRows]);

  const otaFilterCounts = useMemo(() => countOtaFilters(otaBaseRows), [otaBaseRows]);

  const otaStayQuickCounts = useMemo(() => {
    const scoped = applyOtaInboxFilters(otaBaseRows, otaChannelFilter, otaUnrepliedOnly, 'none');
    return countOtaStayQuickFilters(scoped);
  }, [otaBaseRows, otaChannelFilter, otaUnrepliedOnly]);

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
      searchMode !== 'none' ||
      otaChannelFilter !== 'all' ||
      otaStayQuickFilter !== 'none' ||
      otaUnrepliedOnly ||
      hasActiveOtaAdvancedSearch(appliedAdvanced),
    [
      otaGlobalQueryActive,
      searchMode,
      otaChannelFilter,
      otaStayQuickFilter,
      otaUnrepliedOnly,
      appliedAdvanced,
    ],
  );

  const displayRows = useMemo(() => {
    const rows = applyOtaInboxFilters(
      otaBaseRows,
      otaChannelFilter,
      otaUnrepliedOnly,
      otaStayQuickFilter,
    );
    return sortOtaThreadsByActivity(rows);
  }, [otaBaseRows, otaChannelFilter, otaUnrepliedOnly, otaStayQuickFilter]);

  const formattedThreads: Thread[] = useMemo(
    () =>
      displayRows.map((row) => ({
        ...mapOtaRowToThread(row, taskCounts[row.threadId]),
        time: formatThreadWhen(row.lastMessageTime),
      })),
    [displayRows, taskCounts],
  );

  const activeThread: Thread | null = useMemo(() => {
    if (!inbox.activeRow) return null;
    const base = mapOtaRowToThread(inbox.activeRow, inbox.tasks.length);
    return {
      ...base,
      unread: inbox.activeRow.unreadCount ?? 0,
      listingName:
        inbox.reservation?.listingName ??
        inbox.activeRow.listingName ??
        base.listingName,
      guestsLabel: inbox.reservation?.guestsLabel ?? base.guestsLabel,
      reservationCreatedDisplay:
        inbox.reservation?.reservationCreatedDisplay ?? base.reservationCreatedDisplay,
      taskCount: inbox.tasks.length,
      tasks: inbox.tasks,
      tasksLoading: inbox.loadingTasks,
    };
  }, [inbox.activeRow, inbox.tasks, inbox.loadingTasks, inbox.reservation]);

  const otaPlatform = inbox.activeRow
    ? normalizeBookingSource(inbox.activeRow.channel)
    : 'Airbnb';

  const handleSelect = async (row: OtaThreadRow) => {
    setComposerDraft('');
    setAiSourceDraft('');
    await inbox.selectOtaThread(row);
  };

  const [searchParams] = useSearchParams();
  const deepLinkThread = searchParams.get('thread');
  const otaDeepLinkedRef = useRef<string | null>(null);
  const otaDeepLinkFetchRef = useRef<string | null>(null);

  useEffect(() => {
    if (!deepLinkThread || !scopeFetchReady) return;
    if (otaDeepLinkedRef.current === deepLinkThread) return;

    const key = deepLinkThread.trim();
    const fromList =
      findOtaThreadByLinkKey(otaBaseRows, key) ?? findOtaThreadByLinkKey(inboxRows, key);

    if (fromList) {
      otaDeepLinkedRef.current = key;
      setComposerDraft('');
      setAiSourceDraft('');
      void inbox.selectOtaThread(fromList);
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

        otaDeepLinkedRef.current = key;
        setInboxRows((prev) => {
          const exists = prev.some((r) => String(r.threadId) === String(row.threadId));
          if (exists) return prev;
          const merged = [row, ...prev];
          setCachedOtaInbox(merged);
          return merged;
        });
        setComposerDraft('');
        setAiSourceDraft('');
        await inbox.selectOtaThread(row);
      } catch (err) {
        console.warn('[OTA] deep link: thread introuvable', key, err);
        otaDeepLinkFetchRef.current = null;
      }
    })();
  }, [deepLinkThread, otaBaseRows, inboxRows, loading, scopeFetchReady, inbox]);

  const otaThreadContext = useMemo(
    () => buildOtaThreadContextForAi(inbox.messages),
    [inbox.messages],
  );

  const otaLastGuestMessage = useMemo(
    () => getLastGuestMessageFromInbox(inbox.messages),
    [inbox.messages],
  );

  const handleOtaSend = useCallback(
    async (text: string) => {
      if (!inbox.activeRow) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const row = inbox.activeRow;
      inbox.appendOutboundMessage(trimmed);
      try {
        await messagesService.sendOTAMessage(row.threadId, trimmed);
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
    [inbox],
  );

  const showBlockingSpinner = (loading && !tableReady) || (tableReady && isRefreshing);

  return (
    <>
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
      <InboxLayout>
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
          otaUnrepliedOnly={otaUnrepliedOnly}
          onOtaUnrepliedOnlyChange={handleUnrepliedOnlyChange}
          onOtaToutReset={handleResetAllFilters}
          otaFilterCounts={otaFilterCounts}
          otaStayQuickFilter={otaStayQuickFilter}
          onOtaStayQuickFilterChange={setOtaStayQuickFilter}
          otaStayQuickCounts={otaStayQuickCounts}
          otaAdvancedSearch={otaAdvancedDraft}
          onOtaAdvancedSearchChange={setOtaAdvancedDraft}
          onOtaAdvancedSearchSubmit={handleAdvancedSearch}
          onOtaAdvancedSearchReset={handleResetAdvanced}
          otaServerSearchActive={searchMode === 'advanced'}
          otaUnrepliedSearchActive={searchMode === 'unreplied'}
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
              quickTemplates={OTA_QUICK_TEMPLATES}
              quickReplies={OTA_QUICK_REPLIES}
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
            />
            <ConversationDetails
              thread={activeThread}
              type="ota"
              reservation={inbox.reservation ?? undefined}
              onAction={(action) => {
                if (action === 'view-platform') {
                  console.log('Ouvrir sur', otaPlatform);
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
      </InboxLayout>

      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={(text) => {
          setComposerDraft(text);
          setShowAIModal(false);
        }}
        onSendSuggestion={async (text) => {
          await handleOtaSend(text);
          setComposerDraft('');
          setShowAIModal(false);
        }}
        context={{
          threadContext: otaThreadContext,
          lastGuestMessage: otaLastGuestMessage,
          draft: aiSourceDraft,
          guestName: inbox.activeRow?.guestName,
          reservationNumber: inbox.reservation?.reservationNumber,
          channelName: otaPlatform,
          type: 'ota',
        }}
      />
    </>
  );
}
