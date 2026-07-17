import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ReviewCenterPanel from '../unified-inbox/ReviewCenterPanel';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import messagesService from '../../services/messagesService';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { useInboxRealtimeRefresh } from '../../hooks/useInboxRealtimeRefresh';
import type { Thread } from '../../types/unifiedInbox.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import { otaChannelColor, otaChannelFromName } from '../unified-inbox/inboxMappers';
import { formatThreadWhen, normalizeBookingSource, isAirbnbReviewReplyWindowExpired, airbnbReviewReplyWindowLabel } from '../unified-inbox/inboxFormat';
import { mapReviewApiRows, type ReviewRow } from './reviewMappers';

const GLOBAL_SEARCH_MIN_LEN = 2;
const GLOBAL_SEARCH_DEBOUNCE_MS = 500;

export default function ReviewsTabV2() {
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [active, setActive] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchPending, setSearchPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAIModal, setShowAIModal] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);
  const prevSearchTermRef = useRef('');

  const loadReviews = useCallback(async (opts?: { search?: string; forSearch?: boolean }) => {
    if (!scopeFetchReady) {
      setRows([]);
      setLoading(false);
      setSearchPending(false);
      return;
    }
    const requestId = ++searchRequestIdRef.current;
    try {
      setLoadError(null);
      if (opts?.forSearch) setSearchPending(true);
      else setLoading(true);

      const params: {
        limit: number;
        msgLimit: number;
        reservationNumber?: string;
        ownerId?: string;
      } = {
        limit: 50,
        msgLimit: 30,
        ownerId: requestOwnerId || undefined,
      };
      const q = opts?.search?.trim();
      if (q) params.reservationNumber = q;

      const response = await messagesService.getReviews(params);
      if (requestId !== searchRequestIdRef.current) return;

      const threadsData = response.threads || response.data || [];
      setRows(mapReviewApiRows(threadsData));
    } catch (err) {
      if (requestId === searchRequestIdRef.current) {
        console.error('❌ reviews:', err);
        setLoadError(err instanceof Error ? err.message : 'Impossible de charger les avis.');
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        if (opts?.forSearch) setSearchPending(false);
        else setLoading(false);
      }
    }
  }, [scopeFetchReady, requestOwnerId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useInboxRealtimeRefresh('reviews', () => loadReviews());

  useEffect(() => {
    const q = searchTerm.trim();
    const prev = prevSearchTermRef.current.trim();
    prevSearchTermRef.current = searchTerm;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    if (!q) {
      setSearchPending(false);
      if (prev.length >= GLOBAL_SEARCH_MIN_LEN) {
        void loadReviews();
      }
      return;
    }

    if (q.length < GLOBAL_SEARCH_MIN_LEN) {
      setSearchPending(false);
      return;
    }

    setSearchPending(true);
    searchDebounceRef.current = setTimeout(() => {
      void loadReviews({ search: q, forSearch: true });
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [searchTerm, loadReviews]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'replied') return r.replied;
      if (filter === 'unreplied') return !r.replied;
      if (filter === 'airbnb') return r.channel.toLowerCase().includes('airbnb');
      if (filter === 'booking') return r.channel.toLowerCase().includes('booking');
      if (filter === '5stars') return r.rating >= 4.5;
      if (filter === 'low') return r.rating <= 3;
      return true;
    });
  }, [rows, filter]);

  const threads: Thread[] = useMemo(
    () =>
      filtered.map((r) => {
        const ch = otaChannelFromName(r.channel);
        return {
          id: r.threadId,
          name: r.guestName,
          channel: ch,
          channelColor: otaChannelColor(ch),
          preview: r.reviewText.slice(0, 80) || 'Avis',
          time: formatThreadWhen(r.lastMessageTime),
          unread: r.replied ? 0 : 1,
          avatarColor: '',
          listingName: r.listingName,
          reservationNumber: r.reservationNumber,
          stayBadge: `${r.rating}★`,
        };
      }),
    [filtered],
  );

  const activeThread = active ? threads.find((th) => th.id === active.threadId) ?? null : null;

  const reviewsGlobalSearchActive = searchTerm.trim().length >= GLOBAL_SEARCH_MIN_LEN;

  const airbnbReplyWindowClosed =
    active != null && isAirbnbReviewReplyWindowExpired(active.checkOutDate, active.channel);
  const airbnbReplyWindowReason = airbnbReplyWindowClosed
    ? `La fenêtre de réponse Airbnb est terminée (14 jours après le départ, soit jusqu'au ${airbnbReviewReplyWindowLabel(active?.checkOutDate) || '—'}).`
    : undefined;

  const reservation: InboxReservationData | undefined = active
    ? {
        reservationNumber: active.reservationNumber,
        listingName: active.listingName,
        bookingSource: normalizeBookingSource(active.channel),
        otaPlatform: normalizeBookingSource(active.channel),
        reviewRating: active.rating,
        reviewReplied: active.replied,
        reviewResponse: active.response,
        checkInDate: active.checkInDate,
        checkOutDate: active.checkOutDate,
      }
    : undefined;

  const handlePublish = async (overrideText?: string) => {
    const text = (overrideText ?? replyText).trim();
    if (!active || !text || airbnbReplyWindowClosed) return;
    setSending(true);
    try {
      await messagesService.replyToReview(active.threadId, text);
      const updated = { ...active, replied: true, response: text };
      setActive(updated);
      setReplyText(text);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: t.primary }} />
      </Box>
    );
  }

  return (
    <>
      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          action={(
            <Button color="inherit" size="small" onClick={() => void loadReviews()}>
              Réessayer
            </Button>
          )}
        >
          Impossible de charger les avis Booking/Airbnb : {loadError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Tous' },
          { id: 'unreplied', label: 'À répondre' },
          { id: 'replied', label: 'Répondu' },
          { id: 'airbnb', label: 'Airbnb' },
          { id: 'booking', label: 'Booking' },
          { id: '5stars', label: '5★' },
          { id: 'low', label: '≤3★' },
        ].map((f) => (
          <Box
            key={f.id}
            component="button"
            onClick={() => setFilter(f.id)}
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: '6px',
              border: `1px solid ${filter === f.id ? '#FF5A5F' : t.border}`,
              bgcolor: filter === f.id ? 'rgba(255,90,95,0.12)' : t.bg1,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: filter === f.id ? '#c0353a' : t.text3,
            }}
          >
            {f.label}
          </Box>
        ))}
      </Box>

      <InboxLayout>
        <ThreadsList
          threads={threads}
          channels={[{ id: 'ab', label: 'Avis', icon: '⭐', color: '#FF5A5F', count: rows.length }]}
          listTitle="Avis"
          mode="ota"
          activeThreadId={activeThread?.id ?? null}
          searchTerm={searchTerm}
          loading={loading}
          otaGlobalSearchActive={reviewsGlobalSearchActive}
          otaSearchPending={searchPending}
          onSelectThread={(th) => {
            const row = filtered.find((r) => r.threadId === th.id);
            if (row) {
              setActive(row);
              setReplyText(row.response || '');
            }
          }}
          onSearchChange={setSearchTerm}
        />
        {activeThread && active ? (
          <>
            <ReviewCenterPanel
              thread={activeThread}
              reservation={reservation}
              reviewText={active.reviewText}
              replyText={replyText}
              onReplyChange={setReplyText}
              onPublish={() => handlePublish()}
              onAISuggestion={() => setShowAIModal(true)}
              sending={sending}
              otaPlatform={normalizeBookingSource(active.channel)}
              replyDisabled={airbnbReplyWindowClosed}
              replyDisabledReason={airbnbReplyWindowReason}
            />
            <ConversationDetails
              thread={activeThread}
              type="reviews"
              reservation={reservation}
              onAction={() => handlePublish()}
            />
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: { xs: '1', lg: '2 / 4' } }}>
            <Typography sx={{ color: t.text3 }}>Sélectionnez un avis</Typography>
          </Box>
        )}
      </InboxLayout>

      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={setReplyText}
        onSendSuggestion={(text) => handlePublish(text)}
        context={{
          guestName: active?.guestName,
          reviewContent: active?.reviewText,
          draft: replyText,
          rating: active?.rating,
          type: 'reviews',
        }}
      />
    </>
  );
}
