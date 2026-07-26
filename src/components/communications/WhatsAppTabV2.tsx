import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import ConversationAnalysisModal from './ConversationAnalysisModal';
import { useCommsHubChrome } from './CommsHubChromeContext';
import { T } from '../unified-inbox/_tokens';
import messagesService from '../../services/messagesService';
import { initiateWhatsAppForResa } from '../../services/inboxResasService';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import type { Conversation } from '../../types/messages.types';
import type { Thread } from '../../types/unifiedInbox.types';
import { useInboxConversation } from '../../hooks/useInboxConversation';
import { useInboxRealtimeRefresh } from '../../hooks/useInboxRealtimeRefresh';
import { mapConversationToThread } from '../unified-inbox/inboxMappers';
import { enrichThreadFromReservation } from '../unified-inbox/inboxReservationEnrichment';
import { buildWhatsappThreadContextForAi, getLastGuestMessageFromExchanges } from '../../services/communicationsAi.helpers';
import { buildInboxMessages, outboundInboxExchange } from '../unified-inbox/inboxMessages';
import { formatThreadWhenExact } from '../unified-inbox/inboxFormat';
import WaAdvancedSearchPanel from '../unified-inbox/WaAdvancedSearchPanel';
import {
  applyWaAdvancedSearch,
  applyWaChannelFilter,
  applyWaInboxView,
  countWaFilters,
  EMPTY_WA_ADVANCED,
  hasActiveWaAdvancedSearch,
  type WaAdvancedSearch,
  type WaChannelFilter,
  type WaInboxView,
} from '../unified-inbox/waThreadFilters';
import { findConversationByThreadId } from '../../utils/conversationThreadId';

const WA_INBOX_LIMIT = 150;
const GLOBAL_SEARCH_MIN_LEN = 2;
const GLOBAL_SEARCH_DEBOUNCE_MS = 500;

function isOtaChannel(ch?: string): boolean {
  const c = (ch || '').toLowerCase();
  if (!c || c.includes('whatsapp') || c === 'wa') return false;
  return c.includes('airbnb') || c.includes('booking') || c.includes('vrbo') || c === 'ab' || c === 'bk';
}

function normalizeConversations(raw: Conversation[]): Conversation[] {
  return raw
    .filter((c) => !isOtaChannel(c.channel_name))
    .map((c) => ({
      ...c,
      reservation_number: c.reservation_number || c.reservation_id,
    }));
}

const WA_VIEW_CHIPS: Array<{
  id: WaInboxView;
  label: string;
  countKey: keyof ReturnType<typeof countWaFilters>;
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

const WA_CHANNEL_CHIPS: Array<{ id: WaChannelFilter; label: string }> = [
  { id: 'ab', label: 'Airbnb' },
  { id: 'bk', label: 'Booking' },
  { id: 'no_resa', label: 'Sans résa' },
];

export default function WhatsAppTabV2() {
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const { setLeading, setSubBar } = useCommsHubChrome();
  const [inboxConversations, setInboxConversations] = useState<Conversation[]>([]);
  const [searchConversations, setSearchConversations] = useState<Conversation[]>([]);
  const [searchMode, setSearchMode] = useState<'none' | 'global'>('none');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [advancedDraft, setAdvancedDraft] = useState<WaAdvancedSearch>(EMPTY_WA_ADVANCED);
  const [appliedAdvanced, setAppliedAdvanced] = useState<WaAdvancedSearch>(EMPTY_WA_ADVANCED);
  const [globalSearchPending, setGlobalSearchPending] = useState(false);
  const [waChannelFilter, setWaChannelFilter] = useState<WaChannelFilter>('all');
  const [waView, setWaView] = useState<WaInboxView>('exchanges');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');
  const [sendingGuestMenuCode, setSendingGuestMenuCode] = useState<string | null>(null);
  const [aiSourceDraft, setAiSourceDraft] = useState('');
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [inboxFullscreen, setInboxFullscreen] = useState(false);
  const [initiatingWhatsApp, setInitiatingWhatsApp] = useState(false);

  useEffect(() => {
    if (!inboxFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInboxFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [inboxFullscreen]);

  const globalSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globalSearchRequestIdRef = useRef(0);
  const loadRequestIdRef = useRef(0);

  const inbox = useInboxConversation();

  const loadInbox = useCallback(async () => {
    if (!scopeFetchReady) {
      setInboxConversations([]);
      setLoading(false);
      return;
    }
    const requestId = ++loadRequestIdRef.current;
    try {
      setLoading(true);
      setLoadError(null);
      const response = await messagesService.getConversations({
        filter: 'smart',
        limit: WA_INBOX_LIMIT,
        owner_id: requestOwnerId || undefined,
      });
      if (requestId !== loadRequestIdRef.current) return;
      if (response.status === 'success') {
        setInboxConversations(normalizeConversations(response.data.conversations));
        setSearchConversations([]);
        setSearchMode('none');
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'Erreur chargement conversations';
      setLoadError(message);
      console.error('❌ Erreur chargement conversations:', err);
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }, [scopeFetchReady, requestOwnerId]);

  const loadServerSearch = useCallback(async (query: string) => {
    if (!scopeFetchReady) return;
    const requestId = ++globalSearchRequestIdRef.current;
    try {
      setSearchLoading(true);
      const response = await messagesService.getConversations({
        filter: 'smart',
        limit: WA_INBOX_LIMIT,
        search: query,
        owner_id: requestOwnerId || undefined,
      });
      if (requestId !== globalSearchRequestIdRef.current) return;
      if (response.status === 'success') {
        setSearchConversations(normalizeConversations(response.data.conversations));
        setSearchMode('global');
      } else {
        setSearchConversations([]);
      }
    } catch (err) {
      if (requestId !== globalSearchRequestIdRef.current) return;
      console.error('❌ Erreur recherche WhatsApp:', err);
      setSearchConversations([]);
    } finally {
      if (requestId === globalSearchRequestIdRef.current) {
        setGlobalSearchPending(false);
        setSearchLoading(false);
      }
    }
  }, [scopeFetchReady, requestOwnerId]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useInboxRealtimeRefresh(
    'whatsapp',
    () => loadInbox(),
    () => {
      if (inbox.activeConversation) void inbox.refreshMessages();
    },
  );

  useEffect(() => {
    const q = searchTerm.trim();
    if (globalSearchDebounceRef.current) {
      clearTimeout(globalSearchDebounceRef.current);
      globalSearchDebounceRef.current = null;
    }

    if (!q) {
      setGlobalSearchPending(false);
      setSearchMode((mode) => {
        if (mode === 'global') {
          setSearchConversations([]);
          return 'none';
        }
        return mode;
      });
      return;
    }

    if (q.length < GLOBAL_SEARCH_MIN_LEN) {
      setGlobalSearchPending(false);
      return;
    }

    setGlobalSearchPending(true);
    globalSearchDebounceRef.current = setTimeout(() => {
      void loadServerSearch(q);
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => {
      if (globalSearchDebounceRef.current) {
        clearTimeout(globalSearchDebounceRef.current);
        globalSearchDebounceRef.current = null;
      }
    };
  }, [searchTerm, loadServerSearch]);

  const waGlobalQueryActive = searchTerm.trim().length >= GLOBAL_SEARCH_MIN_LEN;
  const advancedActive = hasActiveWaAdvancedSearch(appliedAdvanced);

  const baseConversations = useMemo(() => {
    const source =
      waGlobalQueryActive || searchMode !== 'none' ? searchConversations : inboxConversations;
    return applyWaAdvancedSearch(source, appliedAdvanced);
  }, [
    waGlobalQueryActive,
    searchMode,
    searchConversations,
    inboxConversations,
    appliedAdvanced,
  ]);

  const waFilterCounts = useMemo(() => {
    const scoped = applyWaChannelFilter(baseConversations, waChannelFilter);
    return countWaFilters(scoped);
  }, [baseConversations, waChannelFilter]);

  const waFiltersActive = useMemo(
    () =>
      waGlobalQueryActive ||
      waChannelFilter !== 'all' ||
      waView !== 'exchanges' ||
      advancedActive,
    [waGlobalQueryActive, waChannelFilter, waView, advancedActive],
  );

  const displayConversations = useMemo(
    () => applyWaInboxView(baseConversations, waView, waChannelFilter),
    [baseConversations, waView, waChannelFilter],
  );

  const handleAdvancedSubmit = useCallback(() => {
    setAppliedAdvanced(advancedDraft);
    const kw = advancedDraft.messageText?.trim() || '';
    if (kw.length >= GLOBAL_SEARCH_MIN_LEN) {
      setSearchTerm(kw);
      void loadServerSearch(kw);
    } else if (!kw && searchMode === 'global' && !searchTerm.trim()) {
      setSearchConversations([]);
      setSearchMode('none');
    }
    setAdvancedExpanded(false);
  }, [advancedDraft, loadServerSearch, searchMode, searchTerm]);

  const handleAdvancedReset = useCallback(() => {
    const wasKw = appliedAdvanced.messageText?.trim();
    setAdvancedDraft(EMPTY_WA_ADVANCED);
    setAppliedAdvanced(EMPTY_WA_ADVANCED);
    if (wasKw && searchTerm.trim() === wasKw) {
      setSearchTerm('');
      setSearchConversations([]);
      setSearchMode('none');
    }
  }, [appliedAdvanced.messageText, searchTerm]);

  const handleResetAllFilters = useCallback(() => {
    setSearchTerm('');
    setWaChannelFilter('all');
    setWaView('exchanges');
    setSearchConversations([]);
    setSearchMode('none');
    setAdvancedDraft(EMPTY_WA_ADVANCED);
    setAppliedAdvanced(EMPTY_WA_ADVANCED);
    setAdvancedExpanded(false);
  }, []);

  /* Même chrome que Demandes : titre + recherche (leading) ; tous les filtres en chips (subBar). */
  useEffect(() => {
    setLeading(
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          width: '100%',
          maxWidth: 560,
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
          💬 WhatsApp
        </Typography>
        <Box
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            fontWeight: 700,
            px: 0.75,
            py: '2px',
            borderRadius: 999,
            bgcolor: T.greenBg,
            color: '#0e8c4d',
            flexShrink: 0,
          }}
        >
          {displayConversations.length}
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
          {waFiltersActive && (
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
    displayConversations.length,
    searchTerm,
    waFiltersActive,
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
          <WaAdvancedSearchPanel
            advanced={advancedDraft}
            onChange={setAdvancedDraft}
            onSubmit={handleAdvancedSubmit}
            onReset={handleAdvancedReset}
            loading={searchLoading || globalSearchPending}
            resultCount={advancedActive ? displayConversations.length : null}
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
          {WA_VIEW_CHIPS.map((f) =>
            chip(
              f.id,
              f.label,
              waView === f.id,
              waFilterCounts[f.countKey],
              () => {
                if (waView === f.id && f.id !== 'exchanges') setWaView('exchanges');
                else setWaView(f.id);
              },
              { urgent: f.urgent, title: f.title },
            ),
          )}
          <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: T.border, mx: '2px', flexShrink: 0 }} />
          {WA_CHANNEL_CHIPS.map((f) =>
            chip(
              f.id,
              f.label,
              waChannelFilter === f.id,
              waFilterCounts[f.id],
              () => setWaChannelFilter(waChannelFilter === f.id ? 'all' : f.id),
            ),
          )}
        </Box>
      </Box>,
    );
  }, [
    setSubBar,
    waView,
    waChannelFilter,
    waFilterCounts,
    advancedExpanded,
    advancedDraft,
    handleAdvancedSubmit,
    handleAdvancedReset,
    searchLoading,
    globalSearchPending,
    advancedActive,
    displayConversations.length,
  ]);

  useEffect(
    () => () => {
      setLeading(null);
      setSubBar(null);
    },
    [setLeading, setSubBar],
  );

  const handleSelect = async (conv: Conversation) => {
    setComposerDraft('');
    setAiSourceDraft('');
    await inbox.selectConversation(conv);
  };

  const [searchParams] = useSearchParams();
  const deepLinkPhone = searchParams.get('phone');
  const deepLinkReservation =
    searchParams.get('reservation') || searchParams.get('res') || null;
  const waDeepLinkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const phoneDigits = (deepLinkPhone || '').replace(/\D/g, '');
    const linkKey = phoneDigits
      ? `phone:${phoneDigits}`
      : deepLinkReservation
        ? `res:${deepLinkReservation}`
        : null;
    if (!linkKey) return;
    if (waDeepLinkedRef.current === linkKey) return;

    let conv: Conversation | undefined;
    if (phoneDigits) {
      const needleTail = phoneDigits.slice(-9);
      conv = displayConversations.find((c) => {
        const pDigits = (c.phone || '').replace(/\D/g, '');
        if (pDigits === phoneDigits) return true;
        if (needleTail.length >= 9 && pDigits.slice(-9) === needleTail) return true;
        return false;
      });
    }
    if (!conv && deepLinkReservation) {
      const resNeedle = deepLinkReservation.trim().toUpperCase();
      conv = displayConversations.find((c) => {
        const num = String(c.reservation_number || c.reservation_id || '').trim().toUpperCase();
        return num === resNeedle;
      });
    }

    if (!conv) return;
    waDeepLinkedRef.current = linkKey;
    void handleSelect(conv);
  }, [deepLinkPhone, deepLinkReservation, displayConversations, loading]);

  const bumpConversationPreview = useCallback((phone: string, text: string) => {
    const exchange = outboundInboxExchange(text);
    const bump = (list: Conversation[]) => {
      const idx = list.findIndex((c) => c.phone === phone);
      if (idx < 0) return list;
      const conv = list[idx];
      const recent = [...(conv.recent_exchanges || []), exchange];
      const updated: Conversation = {
        ...conv,
        last_message_time: exchange.timestamp,
        messages_count: (conv.messages_count || 0) + 1,
        exchanges_count: (conv.exchanges_count || 0) + 1,
        recent_exchanges: recent.slice(-5),
      };
      return [updated, ...list.filter((_, i) => i !== idx)];
    };
    setInboxConversations((prev) => bump(prev));
    setSearchConversations((prev) => bump(prev));
  }, []);

  const revertConversationPreview = useCallback((phone: string) => {
    const revert = (list: Conversation[]) => {
      const idx = list.findIndex((c) => c.phone === phone);
      if (idx < 0) return list;
      const conv = list[idx];
      const recent = (conv.recent_exchanges || []).slice(0, -1);
      const last = recent[recent.length - 1];
      const updated: Conversation = {
        ...conv,
        recent_exchanges: recent,
        messages_count: Math.max(0, (conv.messages_count || 1) - 1),
        exchanges_count: Math.max(0, (conv.exchanges_count || 1) - 1),
        last_message_time: last?.timestamp || conv.last_message_time,
      };
      return list.map((c, i) => (i === idx ? updated : c));
    };
    setInboxConversations((prev) => revert(prev));
    setSearchConversations((prev) => revert(prev));
  }, []);

  const handleGuestSend = useCallback(
    async (text: string) => {
      if (!inbox.activeConversation) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const phone = inbox.activeConversation.phone;
      const conv = inbox.activeConversation;
      inbox.appendOutboundMessage(trimmed);
      bumpConversationPreview(phone, trimmed);
      try {
        await messagesService.sendMessage({ phone, message: trimmed });
        void inbox.refreshMessages(conv);
      } catch (err) {
        inbox.removeLastOutboundMessage();
        revertConversationPreview(phone);
        throw err;
      }
    },
    [inbox, bumpConversationPreview, revertConversationPreview],
  );

  const handleGuestSendMenu = useCallback(
    async (menuCode: string) => {
      if (!inbox.activeConversation) return;
      const phone = inbox.activeConversation.phone;
      const conv = inbox.activeConversation;
      setSendingGuestMenuCode(menuCode);
      try {
        await messagesService.sendMenuCode({ phone, menuCode });
        void inbox.refreshMessages(conv);
      } finally {
        setSendingGuestMenuCode(null);
      }
    },
    [inbox],
  );

  const initiateWhatsAppForActive = useCallback(async () => {
    const conv = inbox.activeConversation;
    if (!conv) return;
    const resaId = conv.reservation_mongo_id || '';
    if (!resaId) {
      window.alert('Réservation introuvable pour initier WhatsApp.');
      return;
    }
    setInitiatingWhatsApp(true);
    try {
      const result = await initiateWhatsAppForResa(String(resaId));
      if (!result.success) {
        window.alert(
          result.notWhatsApp
            ? 'Ce numéro ne semble pas avoir WhatsApp.'
            : result.error || 'Envoi impossible',
        );
        return;
      }
      void loadInbox();
      void inbox.refreshMessages(conv);
    } finally {
      setInitiatingWhatsApp(false);
    }
  }, [inbox, loadInbox]);

  const waShellGuest = useMemo(() => {
    const conv = inbox.activeConversation;
    if (!conv) return null;
    const empty = conv.provisional === true || (conv.messages_count || 0) === 0;
    if (!empty) return null;
    const phone = (conv.phone || '').replace(/\D/g, '');
    if (!phone) return { kind: 'nonum' as const, phone: '' };
    return { kind: 'jamais' as const, phone };
  }, [inbox.activeConversation]);

  useEffect(() => {
    if (inbox.activeConversation) {
      setTaskCounts((prev) => ({
        ...prev,
        [inbox.activeConversation!.phone]: inbox.tasks.length,
      }));
    }
  }, [inbox.tasks, inbox.activeConversation]);

  const formattedThreads: Thread[] = useMemo(
    () =>
      displayConversations.map((conv) => {
        const base = mapConversationToThread(conv, { channel: 'wa', channelColor: '#25D366' });
        return {
          ...base,
          // time + lastMessageKind / A déjà posés par mapConversationToThread (owner preview)
          time: base.time || formatThreadWhenExact(conv.last_message_time),
          taskCount: taskCounts[conv.phone],
        };
      }),
    [displayConversations, taskCounts],
  );

  const activeThread: Thread | null = useMemo(() => {
    if (!inbox.activeConversation) return null;
    const base = mapConversationToThread(inbox.activeConversation, {
      channel: 'wa',
      channelColor: '#25D366',
    });
    return enrichThreadFromReservation(
      {
        ...base,
        preview: '',
        unread: 0,
        guestPresence: 'En ligne',
        taskCount: inbox.tasks.length,
        tasks: inbox.tasks,
        tasksLoading: inbox.loadingTasks,
      },
      inbox.activeConversation,
      inbox.reservation,
      inbox.rawReservation,
    );
  }, [inbox.activeConversation, inbox.tasks, inbox.loadingTasks, inbox.reservation, inbox.rawReservation]);

  const formattedMessages = buildInboxMessages(inbox.messages, false);
  const unreadTotal = inboxConversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  if (loading && inboxConversations.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: t.primary }} />
      </Box>
    );
  }

  const inboxBody = (
    <>
      <ThreadsList
        threads={formattedThreads}
        channels={[{ id: 'wa', label: 'WhatsApp', icon: '💬', color: '#25D366', count: displayConversations.length }]}
        listTitle="WhatsApp"
        mode="whatsapp"
        activeThreadId={activeThread?.id ?? null}
        searchTerm={searchTerm}
        loading={searchLoading || globalSearchPending}
        waListTotalCount={displayConversations.length}
        waGlobalSearchActive={waGlobalQueryActive}
        waSearchPending={globalSearchPending}
        waChannelFilter={waChannelFilter}
        onWaChannelFilterChange={setWaChannelFilter}
        waFilterCounts={waFilterCounts}
        waView={waView}
        onWaViewChange={setWaView}
        waFiltersInHub
        hideListHeader
        waFiltersActive={waFiltersActive}
        onWaResetAll={handleResetAllFilters}
        compactToolbar
        ultraCompact
        showFullscreenEnter={!inboxFullscreen}
        onEnterFullscreen={() => setInboxFullscreen(true)}
        onSelectThread={(thread) => {
          const conv = findConversationByThreadId(displayConversations, String(thread.id));
          if (conv) void handleSelect(conv);
        }}
        loadError={loadError}
        onRetryLoad={() => void loadInbox()}
        onSearchChange={setSearchTerm}
      />
      {activeThread ? (
        <>
          <ConversationThread
            thread={activeThread}
            threadMode="whatsapp"
            messages={formattedMessages}
            loadingMessages={inbox.loadingMessages}
            quickTemplates={[]}
            guestMenuDispatch={[]}
            sendingGuestMenuCode={sendingGuestMenuCode}
            onSendGuestMenu={handleGuestSendMenu}
            composerValue={composerDraft}
            onComposerValueChange={setComposerDraft}
            onSendMessage={handleGuestSend}
            onSelectTemplate={async (tpl) => {
              if (tpl.text) await handleGuestSend(tpl.text);
            }}
            onAISuggestion={(draft) => {
              setAiSourceDraft(draft);
              setShowAIModal(true);
            }}
            onAIAnalysis={() => setShowAnalysisModal(true)}
          />
          <ConversationDetails
            thread={activeThread}
            type="whatsapp"
            reservation={inbox.reservation ?? undefined}
            whatsappGuest={waShellGuest}
            onInitiateWhatsApp={() => void initiateWhatsAppForActive()}
            initiatingWhatsApp={initiatingWhatsApp}
            onAction={(action) => {
              if (action === 'view-full-reservation' && inbox.reservation?.reservationNumber) {
                window.open(`/reservations/${inbox.reservation.reservationNumber}`, '_blank');
              }
            }}
          />
        </>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, gridColumn: { xs: '1', lg: '2' } }}>
          <Typography sx={{ fontSize: 48 }}>💬</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>
            Sélectionnez une conversation
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            {unreadTotal} non lues · choisissez un guest
          </Typography>
        </Box>
      )}
    </>
  );

  const inboxFullscreenLayer =
    inboxFullscreen && typeof document !== 'undefined'
      ? createPortal(
          <Box
            role="dialog"
            aria-modal="true"
            aria-label="Inbox WhatsApp plein écran"
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              bgcolor: '#f6f5f1',
              display: 'flex',
              flexDirection: 'column',
              p: { xs: 0.5, md: 0.75 },
              boxSizing: 'border-box',
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <InboxLayout fillViewport fullscreen>
                {inboxBody}
              </InboxLayout>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setInboxFullscreen(false)}
              title="Quitter le plein écran (Échap)"
              aria-label="Quitter le plein écran"
              sx={{
                position: 'fixed',
                right: { xs: 10, md: 14 },
                bottom: { xs: 10, md: 14 },
                zIndex: 10000,
                width: 36,
                height: 36,
                borderRadius: '99px',
                border: '1px solid rgba(20,17,10,0.12)',
                bgcolor: 'rgba(255,255,255,0.94)',
                boxShadow: '0 4px 16px rgba(20,17,10,0.14)',
                color: '#7a756c',
                fontSize: 22,
                fontWeight: 300,
                lineHeight: 1,
                cursor: 'pointer',
                fontFamily: 'inherit',
                p: 0,
              }}
            >
              ×
            </Box>
          </Box>,
          document.body,
        )
      : null;

  if (inboxConversations.length === 0 && searchMode === 'none' && !searchTerm.trim()) {
    return (
      <InboxLayout fillViewport>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2, gridColumn: '1 / -1' }}>
          <Typography sx={{ fontSize: 48 }}>💬</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Aucune conversation</Typography>
        </Box>
      </InboxLayout>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!inboxFullscreen && (
        <InboxLayout fillViewport>
          {inboxBody}
        </InboxLayout>
      )}

      {inboxFullscreenLayer}

      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={(text) => {
          setComposerDraft(text);
          setShowAIModal(false);
        }}
        context={{
          threadContext: buildWhatsappThreadContextForAi(inbox.messages),
          lastGuestMessage: getLastGuestMessageFromExchanges(inbox.messages),
          draft: aiSourceDraft,
          guestName: inbox.activeConversation?.name,
          reservationNumber: inbox.reservation?.reservationNumber,
          type: 'whatsapp',
        }}
      />

      {inbox.activeConversation && (
        <ConversationAnalysisModal
          open={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          phone={inbox.activeConversation.phone}
          reservationId={inbox.activeConversation.reservation_mongo_id || undefined}
          reservationNumber={
            inbox.reservation?.reservationNumber ||
            inbox.activeConversation.reservation_number ||
            undefined
          }
          guestName={inbox.activeConversation.name}
          onUseReply={(text) => setComposerDraft(text)}
        />
      )}
    </Box>
  );
}
