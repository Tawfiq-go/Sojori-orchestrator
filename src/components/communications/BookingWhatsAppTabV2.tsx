import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Chip, Stack } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import {
  type BookingInboxExchange,
  bufferToBase64,
  fetchBookingInboxMediaBlob,
  getBookingInboxMessages,
  getBookingInboxThreads,
  sendBookingInboxAudio,
  sendBookingInboxMessage,
  suggestBookingInboxAi,
} from '../../services/bookingInboxService';
import { staffOutboundExchange } from '../../services/staffConversationMapper';
import { findConversationByThreadId } from '../../utils/conversationThreadId';
import type { Conversation } from '../../types/messages.types';
import type { Message, QuickTemplate, Thread } from '../../types/unifiedInbox.types';
import { mapConversationToThread } from '../unified-inbox/inboxMappers';
import { buildInboxMessages } from '../unified-inbox/inboxMessages';
import { formatThreadWhen } from '../unified-inbox/inboxFormat';

const TEMPLATES: QuickTemplate[] = [
  { id: 'b1', label: '✅ Bien reçu', icon: '✅', text: 'Bien reçu, on s’en occupe.' },
  { id: 'b2', label: '📅 Dates', icon: '📅', text: 'Quelles dates vous intéressent ?' },
  { id: 'b3', label: '💰 Budget', icon: '💰', text: 'Quel budget MAD / nuit avez-vous ?' },
  { id: 'b4', label: '💳 Paiement 4h', icon: '💳', text: 'Voici le lien : vous avez 4 heures pour payer par carte bancaire.' },
  { id: 'b5', label: '🌍 Langue', icon: '🌍', text: 'LANGUE' },
];

function enrichBookingMessages(
  base: Message[],
  exchanges: BookingInboxExchange[],
  audioUrls: Record<string, string>,
): Message[] {
  // map day-separators + user/ai by index from buildInboxMessages order
  let exchangeIdx = -1;
  return base.map((msg) => {
    if (msg.type === 'day-separator' || msg.type === 'system-note') return msg;
    if (String(msg.id).startsWith('user-') || String(msg.id).startsWith('ai-')) {
      const n = Number(String(msg.id).replace(/^(user|ai)-/, ''));
      if (!Number.isNaN(n)) exchangeIdx = n;
    }
    const ex = exchanges[exchangeIdx];
    if (!ex) return msg;
    const mediaId = ex.media_id;
    const tags = ex.tags || [];
    const isAudio = ex.type === 'audio' || tags.includes('audio') || Boolean(mediaId);
    return {
      ...msg,
      tags: tags.length ? tags : isAudio ? ['audio'] : undefined,
      contentType: isAudio ? 'audio' : msg.contentType,
      audioUrl: mediaId ? audioUrls[mediaId] || null : null,
      audioCaption: ex.transcript || ex.summary || null,
    };
  });
}

export default function BookingWhatsAppTabV2() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<BookingInboxExchange[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiSourceDraft, setAiSourceDraft] = useState('');
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const objectUrlsRef = useRef<string[]>([]);

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getBookingInboxThreads({
        limit: 50,
        search: searchTerm || undefined,
      });
      setConversations(res.data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  const hydrateAudio = useCallback(async (exchanges: BookingInboxExchange[]) => {
    const ids = [
      ...new Set(
        exchanges.map((e) => e.media_id).filter((id): id is string => Boolean(id?.trim())),
      ),
    ];
    const next: Record<string, string> = {};
    await Promise.all(
      ids.map(async (id) => {
        try {
          const blob = await fetchBookingInboxMediaBlob(id);
          const url = URL.createObjectURL(blob);
          objectUrlsRef.current.push(url);
          next[id] = url;
        } catch {
          // media expired or unavailable — keep transcript only
        }
      }),
    );
    setAudioUrls(next);
  }, []);

  const selectConversation = async (conv: Conversation) => {
    setActive(conv);
    setComposerDraft('');
    setLoadingMessages(true);
    setAudioUrls({});
    try {
      const res = await getBookingInboxMessages(conv.phone, 80);
      const exchanges = res.data.exchanges || [];
      setMessages(exchanges);
      void hydrateAudio(exchanges);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = useCallback(
    async (text: string) => {
      if (!active) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const phone = active.phone;
      const optimistic = staffOutboundExchange(trimmed) as BookingInboxExchange;
      optimistic.sent_by_admin = true;
      optimistic.tags = ['admin'];
      setMessages((prev) => [...prev, optimistic]);
      try {
        await sendBookingInboxMessage(phone, trimmed);
        const refreshed = await getBookingInboxMessages(phone, 80);
        setMessages(refreshed.data.exchanges || []);
        void hydrateAudio(refreshed.data.exchanges || []);
        void loadThreads();
      } catch (err) {
        setMessages((prev) => prev.slice(0, -1));
        throw err;
      }
    },
    [active, hydrateAudio, loadThreads],
  );

  const handleRecordVoice = useCallback(async () => {
    if (!active) return;
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (!blob.size || !active) return;
        const ab = await blob.arrayBuffer();
        const b64 = bufferToBase64(ab);
        try {
          await sendBookingInboxAudio({
            to: active.phone,
            audioBase64: b64,
            mimeType: 'audio/webm',
            filename: 'admin-voice.webm',
            caption: 'Note vocale Admin',
          });
          const refreshed = await getBookingInboxMessages(active.phone, 80);
          setMessages(refreshed.data.exchanges || []);
          void hydrateAudio(refreshed.data.exchanges || []);
          void loadThreads();
        } catch (err) {
          console.error('[Inbox Resa] send audio failed', err);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error('[Inbox Resa] mic denied', err);
      setRecording(false);
    }
  }, [active, hydrateAudio, loadThreads, recording]);

  const conversationTags = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => (m.tags || []).forEach((t) => set.add(t)));
    return [...set];
  }, [messages]);

  const formattedThreads: Thread[] = useMemo(
    () =>
      conversations.map((conv) => {
        const base = mapConversationToThread(conv, {
          channel: 'wa',
          channelColor: '#0D9488',
          isStaff: false,
        });
        return {
          ...base,
          time: formatThreadWhen(conv.last_message_time),
        };
      }),
    [conversations],
  );

  const activeThread: Thread | null = useMemo(() => {
    if (!active) return null;
    const base = mapConversationToThread(active, {
      channel: 'wa',
      channelColor: '#0D9488',
      isStaff: false,
    });
    return {
      ...base,
      preview: '',
      unread: 0,
      guestPresence: active.language
        ? `Langue: ${active.language} · Admin (sans owner)`
        : 'Admin (sans owner)',
    };
  }, [active]);

  const formattedMessages = useMemo(
    () => enrichBookingMessages(buildInboxMessages(messages, false), messages, audioUrls),
    [messages, audioUrls],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: t.primary }} />
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <InboxLayout>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 2,
            gridColumn: '1 / -1',
          }}
        >
          <Typography sx={{ fontSize: 48 }}>🧾</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Aucune conversation résa</Typography>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            Les messages du numéro booking apparaîtront ici (Admin — sans owner).
          </Typography>
        </Box>
      </InboxLayout>
    );
  }

  return (
    <>
      <InboxLayout>
        <ThreadsList
          threads={formattedThreads}
          channels={[
            {
              id: 'wa',
              label: 'Resa',
              icon: '🧾',
              color: '#0D9488',
              count: conversations.length,
            },
          ]}
          listTitle="Inbox Resa"
          mode="whatsapp"
          activeThreadId={activeThread?.id ?? null}
          searchTerm={searchTerm}
          onSelectThread={(thread) => {
            const conv = findConversationByThreadId(conversations, String(thread.id));
            if (conv) void selectConversation(conv);
          }}
          onSearchChange={setSearchTerm}
        />
        {activeThread ? (
          <>
            <ConversationThread
              thread={activeThread}
              messages={formattedMessages}
              loadingMessages={loadingMessages}
              quickTemplates={TEMPLATES}
              composerValue={composerDraft}
              onComposerValueChange={setComposerDraft}
              onSendMessage={handleSend}
              onSelectTemplate={async (tpl) => {
                if (tpl.text) await handleSend(tpl.text);
              }}
              onAISuggestion={(draft) => {
                setAiSourceDraft(draft);
                setShowAIModal(true);
                if (active?.phone) {
                  void suggestBookingInboxAi({ to: active.phone, draft })
                    .then((s) => {
                      if (s.text) setAiSourceDraft(s.text);
                    })
                    .catch(() => undefined);
                }
              }}
              onRecordVoice={() => void handleRecordVoice()}
              recordingVoice={recording}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {conversationTags.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ px: 1.5, pt: 1.5 }}>
                  {conversationTags.map((tag) => (
                    <Chip
                      key={tag}
                      size="small"
                      label={tag}
                      sx={{
                        height: 22,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: 'rgba(13,148,136,0.12)',
                        color: '#0f766e',
                      }}
                    />
                  ))}
                </Stack>
              )}
              <ConversationDetails thread={activeThread} type="guest" />
            </Box>
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
            <Typography sx={{ fontSize: 48 }}>🧾</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>
              Sélectionnez une conversation Resa
            </Typography>
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
          await handleSend(text);
          setShowAIModal(false);
        }}
        context={{
          type: 'staff',
          channelName: 'Inbox Resa',
          guestName: active?.guest_name || active?.phone,
          draft: aiSourceDraft,
          lastGuestMessage: [...messages]
            .reverse()
            .find((m) => m.user_message?.trim())?.user_message,
          threadContext: messages
            .map((ex) => {
              const parts: string[] = [];
              if (ex.user_message?.trim()) parts.push(`Client: ${ex.user_message.trim()}`);
              if (ex.ai_response?.trim()) {
                parts.push(
                  `${ex.sent_by_admin ? 'Admin' : 'Bot'}: ${ex.ai_response.trim()}`,
                );
              }
              return parts.join('\n');
            })
            .filter(Boolean)
            .join('\n'),
        }}
      />
    </>
  );
}
