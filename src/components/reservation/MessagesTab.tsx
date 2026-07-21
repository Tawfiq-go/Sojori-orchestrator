/**
 * Onglet Messages d'une réservation — WhatsApp / OTA / Lead / Avis
 * UI inspirée de /communications?section=guest&tab=whatsapp
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import messagesService from '../../services/messagesService';
import ConversationThread from '../unified-inbox/ConversationThread';
import ReviewCenterPanel from '../unified-inbox/ReviewCenterPanel';
import {
  buildInboxMessages,
  outboundInboxExchange,
  WA_QUICK_TEMPLATES,
  OTA_QUICK_TEMPLATES,
  OTA_QUICK_REPLIES,
} from '../unified-inbox/inboxMessages';
import { mapConversationToThread } from '../unified-inbox/inboxMappers';
import {
  mapApiItemToOtaThread,
  mapOtaRowToThread,
  extractOtaMessagesFromApiResponse,
  mapOtaApiMessagesToInbox,
  buildOtaPreviewFallbackMessages,
  type OtaThreadRow,
} from '../unified-inbox/inboxOtaMappers';
import { mapReviewApiRows, type ReviewRow } from '../communications/reviewMappers';
import type { Conversation, MessageExchange } from '../../types/messages.types';
import type { Message, Thread } from '../../types/unifiedInbox.types';

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  wa: '#25D366',
  ota: '#FF5A5F',
  lead: '#0673b3',
  review: '#c46506',
};

type ChannelId = 'whatsapp' | 'ota' | 'lead' | 'review';

interface MessagesTabProps {
  reservationDetails: any;
}

function extractConversations(payload: unknown): Conversation[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.data)) return p.data as Conversation[];
  if (Array.isArray(p.conversations)) return p.conversations as Conversation[];
  const nested = p.data as Record<string, unknown> | undefined;
  if (nested && Array.isArray(nested.conversations)) return nested.conversations as Conversation[];
  return [];
}

function extractThreadItems(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const r = payload as Record<string, unknown>;
  if (Array.isArray(r.threads)) return r.threads;
  const data = r.data as Record<string, unknown> | unknown[] | undefined;
  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.threads)) {
    return data.threads as unknown[];
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(r.reviews)) return r.reviews;
  return [];
}

function emptyThread(name: string, channel: Thread['channel'], color: string): Thread {
  return {
    id: 'empty',
    name,
    channel,
    channelColor: color,
    preview: '',
    time: '',
    unread: 0,
    avatarColor: color,
  };
}

export function MessagesTab({ reservationDetails }: MessagesTabProps) {
  const navigate = useNavigate();
  const reservationNumber =
    String(reservationDetails?.reservationNumber || reservationDetails?.reservation_number || '').trim();
  const mongoId = String(reservationDetails?._id || reservationDetails?.id || '').trim();
  const guestPhone = String(
    reservationDetails?.phone || reservationDetails?.guestPhone || '',
  ).replace(/\s/g, '');
  const guestName =
    reservationDetails?.guestName ||
    `${reservationDetails?.guestFirstName || ''} ${reservationDetails?.guestLastName || ''}`.trim() ||
    'Voyageur';

  const [channel, setChannel] = useState<ChannelId>('whatsapp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [waConv, setWaConv] = useState<Conversation | null>(null);
  const [waExchanges, setWaExchanges] = useState<MessageExchange[]>([]);
  const [waPhone, setWaPhone] = useState('');

  const [otaRow, setOtaRow] = useState<OtaThreadRow | null>(null);
  const [otaMessages, setOtaMessages] = useState<Message[]>([]);

  const [leadRow, setLeadRow] = useState<OtaThreadRow | null>(null);
  const [leadMessages, setLeadMessages] = useState<Message[]>([]);

  const [review, setReview] = useState<ReviewRow | null>(null);
  const [reviewReply, setReviewReply] = useState('');
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState('');

  const counts = useMemo(
    () => ({
      whatsapp: waExchanges.length,
      ota: otaMessages.filter((m) => m.type !== 'day-separator').length,
      lead: leadMessages.filter((m) => m.type !== 'day-separator').length,
      review: review ? 1 : 0,
    }),
    [waExchanges, otaMessages, leadMessages, review],
  );

  const loadAll = useCallback(async () => {
    if (!reservationNumber && !guestPhone && !mongoId) {
      setLoading(false);
      setError('Réservation sans numéro ni téléphone — impossible de charger les messages.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [waRes, otaRes, leadRes, reviewRes] = await Promise.allSettled([
        reservationNumber
          ? messagesService.getByReservation(reservationNumber)
          : Promise.resolve(null),
        reservationNumber
          ? messagesService.getOTAThreads({ reservationNumber, limit: 10 })
          : Promise.resolve(null),
        reservationNumber
          ? messagesService.getLeads({ search: reservationNumber, limit: 10 })
          : Promise.resolve(null),
        messagesService.getReviews({
          reservationNumber: reservationNumber || undefined,
          reservationId: mongoId || reservationNumber || undefined,
          limit: 10,
        }),
      ]);

      // ── WhatsApp ──
      let phone = guestPhone;
      let conv: Conversation | null = null;
      if (waRes.status === 'fulfilled' && waRes.value) {
        const list = extractConversations(waRes.value);
        conv = list[0] || null;
        if (conv?.phone) phone = conv.phone;
      }
      if (!phone && conv?.phone) phone = conv.phone;
      setWaPhone(phone);
      setWaConv(conv);

      if (phone) {
        try {
          const detail = await messagesService.getConversationMessages(phone, {
            limit: 80,
            scope: mongoId ? 'reservation' : 'phone',
            reservationId: mongoId || undefined,
            inbox: 'guest',
          });
          const exchanges =
            detail?.status === 'success'
              ? detail.data?.exchanges || []
              : (detail as any)?.data?.exchanges || (detail as any)?.exchanges || [];
          setWaExchanges(Array.isArray(exchanges) ? exchanges : []);
          if (!conv && detail?.data) {
            setWaConv({
              phone,
              name: guestName,
              recent_exchanges: exchanges.slice(-3),
              unread_count: 0,
              messages_count: exchanges.length,
              exchanges_count: exchanges.length,
            } as Conversation);
          }
        } catch {
          // fallback: use recent_exchanges from search
          setWaExchanges(conv?.recent_exchanges || []);
        }
      } else {
        setWaExchanges([]);
      }

      // ── OTA ──
      let ota: OtaThreadRow | null = null;
      if (otaRes.status === 'fulfilled' && otaRes.value) {
        const rows = extractThreadItems(otaRes.value).map(mapApiItemToOtaThread);
        ota = rows[0] || null;
      }
      setOtaRow(ota);
      if (ota?.threadId) {
        try {
          const msgsPayload = await messagesService.getOTAMessages(String(ota.threadId));
          const raw = extractOtaMessagesFromApiResponse(msgsPayload);
          const mapped = mapOtaApiMessagesToInbox(raw, ota.guestName || guestName);
          setOtaMessages(mapped.length ? mapped : buildOtaPreviewFallbackMessages(ota));
        } catch {
          setOtaMessages(buildOtaPreviewFallbackMessages(ota));
        }
      } else {
        setOtaMessages([]);
      }

      // ── Lead ──
      let lead: OtaThreadRow | null = null;
      if (leadRes.status === 'fulfilled' && leadRes.value) {
        const rows = extractThreadItems(leadRes.value).map(mapApiItemToOtaThread);
        lead = rows[0] || null;
      }
      setLeadRow(lead);
      if (lead?.threadId) {
        try {
          const msgsPayload = await messagesService.getLeadMessages(String(lead.threadId));
          const raw = extractOtaMessagesFromApiResponse(msgsPayload);
          const mapped = mapOtaApiMessagesToInbox(raw, lead.guestName || guestName);
          setLeadMessages(mapped.length ? mapped : buildOtaPreviewFallbackMessages(lead));
        } catch {
          setLeadMessages(buildOtaPreviewFallbackMessages(lead));
        }
      } else {
        setLeadMessages([]);
      }

      // ── Reviews ──
      let rev: ReviewRow | null = null;
      if (reviewRes.status === 'fulfilled' && reviewRes.value) {
        const items = extractThreadItems(reviewRes.value);
        const mapped = mapReviewApiRows(items as any[]);
        rev = mapped[0] || null;
      }
      setReview(rev);
      setReviewReply(rev?.response || '');

      // Default channel: first with content
      const order: ChannelId[] = ['whatsapp', 'ota', 'lead', 'review'];
      const has: Record<ChannelId, boolean> = {
        whatsapp: Boolean(phone || (conv && (conv.recent_exchanges?.length || 0) > 0)),
        ota: Boolean(ota),
        lead: Boolean(lead),
        review: Boolean(rev),
      };
      // Prefer channel with actual messages once loaded — pick later via effect; initial:
      const first = order.find((c) => has[c]);
      if (first) setChannel(first);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des messages');
    } finally {
      setLoading(false);
    }
  }, [reservationNumber, guestPhone, mongoId, guestName]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const waThread = useMemo((): Thread => {
    if (waConv) {
      return { ...mapConversationToThread(waConv, { channel: 'wa', channelColor: T.wa }), active: true };
    }
    return {
      ...emptyThread(guestName, 'wa', T.wa),
      phone: waPhone || guestPhone,
      reservationNumber,
      listingName: reservationDetails?.listing?.name,
      active: true,
    };
  }, [waConv, guestName, waPhone, guestPhone, reservationNumber, reservationDetails]);

  const otaThread = useMemo((): Thread => {
    if (otaRow) return { ...mapOtaRowToThread(otaRow), active: true };
    return { ...emptyThread(guestName, 'ab', T.ota), active: true };
  }, [otaRow, guestName]);

  const leadThread = useMemo((): Thread => {
    if (leadRow) return { ...mapOtaRowToThread(leadRow), active: true };
    return { ...emptyThread(guestName, 'ab', T.lead), active: true };
  }, [leadRow, guestName]);

  const reviewThread = useMemo((): Thread => {
    if (!review) return emptyThread(guestName, 'ab', T.review);
    return {
      id: review.threadId,
      name: review.guestName,
      channel: 'ab',
      channelColor: T.review,
      preview: review.reviewText?.slice(0, 80) || '',
      time: '',
      unread: 0,
      avatarColor: T.review,
      listingName: review.listingName,
      reservationNumber: review.reservationNumber,
      checkInDate: review.checkInDate,
      checkOutDate: review.checkOutDate,
      active: true,
    };
  }, [review, guestName]);

  const formattedWa = useMemo(() => buildInboxMessages(waExchanges, false), [waExchanges]);

  const handleSendWa = async (text: string) => {
    const phone = waPhone || guestPhone;
    if (!phone || !text.trim()) return;
    setSending(true);
    const optimistic = outboundInboxExchange(text.trim());
    setWaExchanges((prev) => [...prev, optimistic]);
    try {
      await messagesService.sendMessage({ phone, message: text.trim() }, 'guest');
      toast.success('Message WhatsApp envoyé');
    } catch (err) {
      setWaExchanges((prev) => prev.slice(0, -1));
      toast.error(err instanceof Error ? err.message : 'Échec envoi WhatsApp');
    } finally {
      setSending(false);
    }
  };

  const handleSendOta = async (text: string) => {
    if (!otaRow?.threadId || !text.trim()) return;
    setSending(true);
    try {
      await messagesService.sendOTAMessage(String(otaRow.threadId), text.trim());
      toast.success('Message OTA envoyé');
      const msgsPayload = await messagesService.getOTAMessages(String(otaRow.threadId));
      const raw = extractOtaMessagesFromApiResponse(msgsPayload);
      setOtaMessages(mapOtaApiMessagesToInbox(raw, otaRow.guestName || guestName));
      setComposer('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec envoi OTA');
    } finally {
      setSending(false);
    }
  };

  const handleSendLead = async (text: string) => {
    if (!leadRow?.threadId || !text.trim()) return;
    setSending(true);
    try {
      await messagesService.sendLeadMessage(String(leadRow.threadId), text.trim());
      toast.success('Message lead envoyé');
      const msgsPayload = await messagesService.getLeadMessages(String(leadRow.threadId));
      const raw = extractOtaMessagesFromApiResponse(msgsPayload);
      setLeadMessages(mapOtaApiMessagesToInbox(raw, leadRow.guestName || guestName));
      setComposer('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec envoi lead');
    } finally {
      setSending(false);
    }
  };

  const handlePublishReview = async () => {
    if (!review?.threadId || !reviewReply.trim()) return;
    setSending(true);
    try {
      await messagesService.replyToReview(String(review.threadId), reviewReply.trim());
      toast.success('Réponse à l’avis publiée');
      setReview((r) => (r ? { ...r, response: reviewReply.trim(), replied: true } : r));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec publication avis');
    } finally {
      setSending(false);
    }
  };

  const channels: Array<{ id: ChannelId; label: string; icon: string; color: string; count: number; available: boolean }> = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: '💬',
      color: T.wa,
      count: counts.whatsapp,
      available: Boolean(waPhone || guestPhone || waConv),
    },
    {
      id: 'ota',
      label: 'OTA',
      icon: '🏨',
      color: T.ota,
      count: counts.ota,
      available: Boolean(otaRow),
    },
    {
      id: 'lead',
      label: 'Lead',
      icon: '📩',
      color: T.lead,
      count: counts.lead,
      available: Boolean(leadRow),
    },
    {
      id: 'review',
      label: 'Avis',
      icon: '⭐',
      color: T.review,
      count: counts.review,
      available: Boolean(review),
    },
  ];

  const openInComms = () => {
    if (channel === 'whatsapp' && (waPhone || guestPhone)) {
      navigate(`/communications?section=guest&tab=whatsapp&phone=${encodeURIComponent(waPhone || guestPhone)}`);
      return;
    }
    if (channel === 'ota' && otaRow?.threadId) {
      navigate(`/communications?section=guest&tab=ota&thread=${encodeURIComponent(String(otaRow.threadId))}`);
      return;
    }
    if (channel === 'lead') {
      navigate('/communications?section=guest&tab=leads');
      return;
    }
    if (channel === 'review') {
      navigate('/communications?section=guest&tab=reviews');
      return;
    }
    navigate('/communications?section=guest&tab=whatsapp');
  };

  if (loading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', bgcolor: T.bg0 }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 1.5, fontSize: 13, color: T.text3 }}>
          Chargement WhatsApp · OTA · Lead · Avis…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: { xs: 'auto', md: 'min(70vh, 720px)' }, bgcolor: T.bg0, minHeight: 420 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          px: 1.5,
          py: 1.25,
          bgcolor: T.bg1,
          borderBottom: `1px solid ${T.border}`,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
          {channels.map((c) => (
            <Chip
              key={c.id}
              clickable
              onClick={() => setChannel(c.id)}
              label={`${c.icon} ${c.label}${c.count ? ` · ${c.count}` : ''}`}
              sx={{
                fontWeight: 700,
                fontSize: 12,
                height: 30,
                bgcolor: channel === c.id ? c.color : T.bg2,
                color: channel === c.id ? '#fff' : c.available ? T.text2 : T.text4,
                opacity: c.available || channel === c.id ? 1 : 0.55,
                border: channel === c.id ? 'none' : `1px solid ${T.border}`,
                '&:hover': { bgcolor: channel === c.id ? c.color : T.primaryTint },
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {reservationNumber ? (
            <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
              {reservationNumber}
            </Typography>
          ) : null}
          <Button
            size="small"
            startIcon={<OpenInNew sx={{ fontSize: 14 }} />}
            onClick={openInComms}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 11.5, color: T.primaryDeep }}
          >
            Ouvrir Communications
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="warning" sx={{ m: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {channel === 'whatsapp' && (
          waPhone || guestPhone || formattedWa.length > 0 ? (
            <ConversationThread
              thread={waThread}
              messages={formattedWa}
              quickTemplates={WA_QUICK_TEMPLATES}
              onSendMessage={handleSendWa}
              onSelectTemplate={(t) => {
                if (t.text) void handleSendWa(t.text);
              }}
              composerValue={composer}
              onComposerValueChange={setComposer}
              threadMode="whatsapp"
              whatsappBusinessLine="Guest WhatsApp"
              loadingMessages={sending}
            />
          ) : (
            <EmptyState
              icon="💬"
              title="Pas de conversation WhatsApp"
              hint="Aucun téléphone guest / fil trouvé pour cette réservation."
            />
          )
        )}

        {channel === 'ota' && (
          otaRow ? (
            <ConversationThread
              thread={otaThread}
              messages={otaMessages}
              quickTemplates={OTA_QUICK_TEMPLATES}
              quickReplies={OTA_QUICK_REPLIES}
              onSendMessage={handleSendOta}
              onSelectTemplate={(t) => {
                if (t.text) void handleSendOta(t.text);
              }}
              composerValue={composer}
              onComposerValueChange={setComposer}
              threadMode="ota"
              otaPlatform={otaRow.channel || 'OTA'}
              loadingMessages={sending}
            />
          ) : (
            <EmptyState
              icon="🏨"
              title="Pas de fil OTA"
              hint="Aucun thread Airbnb / Booking lié à ce numéro de réservation."
            />
          )
        )}

        {channel === 'lead' && (
          leadRow ? (
            <ConversationThread
              thread={leadThread}
              messages={leadMessages}
              quickTemplates={OTA_QUICK_TEMPLATES}
              onSendMessage={handleSendLead}
              onSelectTemplate={(t) => {
                if (t.text) void handleSendLead(t.text);
              }}
              composerValue={composer}
              onComposerValueChange={setComposer}
              threadMode="ota"
              otaPlatform="Lead"
              loadingMessages={sending}
            />
          ) : (
            <EmptyState
              icon="📩"
              title="Pas de lead"
              hint="Aucune demande pré-réservation associée."
            />
          )
        )}

        {channel === 'review' && (
          review ? (
            <ReviewCenterPanel
              thread={reviewThread}
              reviewText={review.reviewText}
              replyText={reviewReply}
              onReplyChange={setReviewReply}
              onPublish={() => void handlePublishReview()}
              sending={sending}
              otaPlatform={review.channel || 'Airbnb'}
              reservation={{
                guestName: review.guestName,
                listingName: review.listingName,
                reservationNumber: review.reservationNumber,
                checkInDate: review.checkInDate,
                checkOutDate: review.checkOutDate,
                reviewRating: review.rating,
                reviewReplied: review.replied,
              } as any}
            />
          ) : (
            <EmptyState
              icon="⭐"
              title="Pas d’avis"
              hint="Aucun avis voyageur pour cette réservation pour le moment."
            />
          )
        )}
      </Box>
    </Box>
  );
}

function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  return (
    <Box sx={{ p: 5, textAlign: 'center', flex: 1 }}>
      <Typography sx={{ fontSize: 36, mb: 1 }}>{icon}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.text2 }}>{title}</Typography>
      <Typography sx={{ fontSize: 12.5, color: T.text3, mt: 0.5, maxWidth: 360, mx: 'auto' }}>
        {hint}
      </Typography>
    </Box>
  );
}
