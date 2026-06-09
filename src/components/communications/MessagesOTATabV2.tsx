import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  filterOtaActiveReservationsOnly,
  mapApiItemToOtaThread,
  mapOtaRowToThread,
  type OtaThreadRow,
} from '../unified-inbox/inboxOtaMappers';
import {
  applyOtaInboxFilters,
  buildOtaAdvancedApiParams,
  countOtaFilters,
  hasActiveOtaAdvancedSearch,
  sortOtaThreadsByActivity,
  type OtaAdvancedSearch,
  type OtaChannelFilter,
} from '../unified-inbox/otaThreadFilters';
import { OTA_QUICK_REPLIES, OTA_QUICK_TEMPLATES } from '../unified-inbox/inboxMessages';
import { formatThreadWhen, normalizeBookingSource } from '../unified-inbox/inboxFormat';

const EMPTY_ADVANCED: OtaAdvancedSearch = { stayPeriod: 'all' };

type OtaSearchMode = 'none' | 'advanced' | 'unreplied';

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
  const [inboxRows, setInboxRows] = useState<OtaThreadRow[]>([]);
  /** Résultats recherche BD (avancée = toutes resa ; non répondu = actives seulement) */
  const [searchRows, setSearchRows] = useState<OtaThreadRow[]>([]);
  const [searchMode, setSearchMode] = useState<OtaSearchMode>('none');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [otaChannelFilter, setOtaChannelFilter] = useState<OtaChannelFilter>('all');
  const [otaUnrepliedOnly, setOtaUnrepliedOnly] = useState(false);
  const [otaAdvancedDraft, setOtaAdvancedDraft] = useState<OtaAdvancedSearch>(EMPTY_ADVANCED);
  const [appliedAdvanced, setAppliedAdvanced] = useState<OtaAdvancedSearch>(EMPTY_ADVANCED);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const inbox = useInboxOTAConversation();

  const loadInbox = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await messagesService.getOTAThreads({ page: 0, limit: 500 });
      setInboxRows(filterOtaActiveReservationsOnly(mapApiThreads(response)));
      setSearchRows([]);
      setSearchMode('none');
    } catch (err: unknown) {
      console.error('❌ Erreur chargement threads OTA:', err);
      setLoadError(err instanceof Error ? err.message : 'Erreur de chargement');
      setInboxRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadServerSearch = useCallback(
    async (opts: {
      advanced?: OtaAdvancedSearch;
      channelFilter?: OtaChannelFilter;
      unrepliedOnly?: boolean;
      mode: 'advanced' | 'unreplied';
    }) => {
      const advanced = opts.advanced ?? appliedAdvanced;
      const channel = opts.channelFilter ?? otaChannelFilter;
      const unreplied = opts.unrepliedOnly ?? false;

      try {
        setLoading(true);
        setLoadError(null);
        const apiParams = buildOtaAdvancedApiParams(advanced, {
          channelFilter: channel,
          unrepliedOnly: unreplied || opts.mode === 'unreplied',
        });

        const response = await messagesService.getOTAThreads({
          page: 0,
          limit: 500,
          ...apiParams,
        });

        let rows = mapApiThreads(response);
        // Avancée seule : peut inclure completed / annulées. Non répondu : actives seulement.
        if (opts.mode !== 'advanced') {
          rows = filterOtaActiveReservationsOnly(rows);
        }

        setSearchRows(rows);
        setSearchMode(opts.mode);
      } catch (err: unknown) {
        console.error('❌ Erreur recherche OTA:', err);
        setLoadError(err instanceof Error ? err.message : 'Erreur de recherche');
        setSearchRows([]);
      } finally {
        setLoading(false);
      }
    },
    [appliedAdvanced, otaChannelFilter],
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
    if (searchMode === 'advanced') {
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
    setOtaChannelFilter('all');
    setOtaUnrepliedOnly(false);
    setAdvancedExpanded(false);
    void loadInbox();
  };

  const handleToutReset = () => {
    setOtaChannelFilter('all');
    setOtaUnrepliedOnly(false);
    if (searchMode !== 'none') {
      setSearchRows([]);
      setSearchMode('none');
    }
  };

  /** Compteurs toujours sur l'inbox actif (hors completed/annulée) */
  const otaFilterCounts = useMemo(() => countOtaFilters(inboxRows), [inboxRows]);

  const otaBaseRows = useMemo(
    () => (searchMode !== 'none' ? searchRows : inboxRows),
    [searchMode, searchRows, inboxRows],
  );

  const displayRows = useMemo(() => {
    const rows = applyOtaInboxFilters(otaBaseRows, otaChannelFilter, otaUnrepliedOnly);
    return sortOtaThreadsByActivity(rows);
  }, [otaBaseRows, otaChannelFilter, otaUnrepliedOnly]);

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
    await inbox.selectOtaThread(row);
  };

  return (
    <>
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
          loading={loading}
          otaListTotalCount={displayRows.length}
          loadError={loadError}
          onRetryLoad={() => void loadInbox()}
          otaChannelFilter={otaChannelFilter}
          onOtaChannelFilterChange={handleChannelFilterChange}
          otaUnrepliedOnly={otaUnrepliedOnly}
          onOtaUnrepliedOnlyChange={handleUnrepliedOnlyChange}
          onOtaToutReset={handleToutReset}
          otaFilterCounts={otaFilterCounts}
          otaAdvancedSearch={otaAdvancedDraft}
          onOtaAdvancedSearchChange={setOtaAdvancedDraft}
          onOtaAdvancedSearchSubmit={handleAdvancedSearch}
          onOtaAdvancedSearchReset={handleResetAdvanced}
          otaServerSearchActive={searchMode === 'advanced'}
          otaUnrepliedSearchActive={searchMode === 'unreplied'}
          otaAdvancedExpanded={advancedExpanded}
          onOtaAdvancedExpandedChange={setAdvancedExpanded}
          otaSearchResultCount={searchMode === 'advanced' ? searchRows.length : null}
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
              quickTemplates={OTA_QUICK_TEMPLATES}
              quickReplies={OTA_QUICK_REPLIES}
              otaPlatform={otaPlatform}
              onSendMessage={async (text) => {
                if (!inbox.activeRow) return;
                await messagesService.sendOTAMessage(inbox.activeRow.threadId, text.trim());
                await handleSelect(inbox.activeRow);
              }}
              onSelectTemplate={(tpl) => {
                if (tpl.text && inbox.activeRow) {
                  void messagesService.sendOTAMessage(inbox.activeRow.threadId, tpl.text);
                }
              }}
              onAISuggestion={() => setShowAIModal(true)}
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
              {loading ? 'Recherche en cours…' : 'Sélectionnez un message OTA'}
            </Typography>
            {!loading && displayRows.length === 0 && (
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
          if (inbox.activeRow) {
            void messagesService.sendOTAMessage(inbox.activeRow.threadId, text);
          }
        }}
        context={{
          conversationHistory: [],
          guestName: inbox.activeRow?.guestName,
          reservationNumber: inbox.reservation?.reservationNumber,
          type: 'ota',
        }}
      />
    </>
  );
}
