import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ReviewCenterPanel from '../unified-inbox/ReviewCenterPanel';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import messagesService from '../../services/messagesService';
import type { Thread } from '../../types/unifiedInbox.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import { otaChannelColor, otaChannelFromName } from '../unified-inbox/inboxMappers';
import { formatThreadWhen, normalizeBookingSource } from '../unified-inbox/inboxFormat';

interface ReviewRow {
  id: string;
  threadId: string;
  guestName: string;
  listingName: string;
  channel: string;
  reservationNumber: string;
  lastMessageTime?: string;
  rating: number;
  reviewText: string;
  response?: string;
  replied: boolean;
  checkInDate?: string;
  checkOutDate?: string;
}

function parseReview(messages: any[]) {
  let rating = 5;
  let message = '';
  let response = '';
  for (const msg of messages || []) {
    const body = msg?.body;
    if (!body) continue;
    try {
      const data = typeof body === 'string' ? JSON.parse(body) : body;
      if (data.Rating != null) rating = Number(data.Rating) || rating;
      if (data.Message) message = message || String(data.Message);
      if (data.Response) response = String(data.Response);
    } catch {
      const plain = String(body).replace(/<[^>]+>/g, ' ').trim();
      if (plain.length > 12) message = message || plain;
    }
  }
  return { rating, message, response };
}

export default function ReviewsTabV2() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [active, setActive] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    void loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await messagesService.getReviews({ limit: 50, msgLimit: 30 });
      const threadsData = response.threads || response.data || [];
      const formatted: ReviewRow[] = threadsData.map((item: any) => {
        const threadData = item.thread || item;
        const reservation = item.reservation || {};
        const messages = item.messages || [];
        const review = parseReview(messages);
        let channel = threadData.communicationChannel || reservation.channelName || 'Airbnb';
        if (channel.toLowerCase().includes('booking')) channel = 'Booking.com';
        else if (channel.toLowerCase().includes('airbnb')) channel = 'Airbnb';
        return {
          id: threadData._id,
          threadId: threadData.threadId,
          guestName: reservation.guestName || threadData.recipientName || 'Guest',
          listingName: reservation.listingName || 'Listing',
          channel,
          reservationNumber: reservation.reservationNumber || '—',
          lastMessageTime: threadData.lastMessageAt,
          rating: review.rating,
          reviewText: review.message || threadData.preview || '',
          response: review.response,
          replied: !!review.response,
          checkInDate: reservation.arrivalDate,
          checkOutDate: reservation.departureDate,
        };
      });
      setRows(formatted);
    } catch (err) {
      console.error('❌ reviews:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePublish = async () => {
    if (!active || !replyText.trim()) return;
    setSending(true);
    try {
      await messagesService.replyToReview(active.threadId, replyText.trim());
      const updated = { ...active, replied: true, response: replyText.trim() };
      setActive(updated);
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
              onPublish={handlePublish}
              onAISuggestion={() => setShowAIModal(true)}
              sending={sending}
              otaPlatform={normalizeBookingSource(active.channel)}
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
        context={{
          guestName: active?.guestName,
          reviewText: active?.reviewText,
          rating: active?.rating,
          type: 'reviews',
        }}
      />
    </>
  );
}
