/**
 * Fil d’échanges WA / OTA — scroll via ModalScrollColumn (docs/scroll).
 */
import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { T } from '../../components/calendar-v3/_shared';
import type { ReservationRow } from '../../components/calendar-views/_shared';
import { ModalScrollColumn } from '../../components/common/ModalScrollColumn';
import messagesService from '../../services/messagesService';
import type { MessageExchange } from '../../types/messages.types';
import {
  extractOtaMessagesFromApiResponse,
  mapOtaApiMessagesToInbox,
} from '../../components/unified-inbox/inboxOtaMappers';
import type { Message } from '../../types/unifiedInbox.types';
import type { ChangeEvent, KeyboardEvent } from 'react';

export type PlanningThreadChannel = 'wa' | 'ota';

type Bubble = {
  id: string;
  from: 'guest' | 'host';
  text: string;
  time: string;
};

function fmtTime(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function exchangesToBubbles(exchanges: MessageExchange[]): Bubble[] {
  const out: Bubble[] = [];
  exchanges.forEach((ex, i) => {
    const user = String(ex.user_message || '').trim();
    const ai = String(ex.ai_response || '').trim();
    const t = fmtTime(ex.timestamp);
    if (user) {
      out.push({ id: `u-${i}-${ex.message_id || ''}`, from: 'guest', text: user, time: t });
    }
    if (ai) {
      out.push({
        id: `a-${i}-${ex.message_id || ''}`,
        from: 'host',
        text: ai,
        time: t,
      });
    }
  });
  return out;
}

function otaToBubbles(messages: Message[]): Bubble[] {
  return messages
    .filter((m) => m.type !== 'day-separator' && String(m.text || '').trim())
    .map((m) => ({
      id: String(m.id),
      from: m.from === 'you' || m.from === 'sojori' ? 'host' : 'guest',
      text: String(m.text || '').trim(),
      time: m.time || '',
    }));
}

function scrollThreadToBottom() {
  const el = document.querySelector('.planning-thread-scroll') as HTMLElement | null;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

export function PlanningThreadComposer({
  channel,
  reservation,
  onSent,
}: {
  channel: PlanningThreadChannel;
  reservation: ReservationRow;
  onSent?: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const phone = String(reservation.lastWa?.phone || '').trim();
  const threadId = reservation.lastOta?.threadId;
  const accent = channel === 'wa' ? '#128C4B' : '#003580';
  const canSend = channel === 'wa' ? Boolean(phone) : Boolean(threadId);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (channel === 'wa') {
        if (!phone) throw new Error('Pas de numéro WhatsApp');
        await messagesService.sendMessage({ phone, message: text }, 'guest');
      } else {
        if (!threadId) throw new Error('Pas de fil OTA');
        await messagesService.sendOTAMessage(String(threadId), text);
      }
      setDraft('');
      toast.success('Message envoyé');
      onSent?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-end', width: '100%' }}>
      <Box
        component="textarea"
        value={draft}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
        placeholder={
          canSend
            ? channel === 'wa'
              ? 'Répondre sur WhatsApp…'
              : 'Répondre sur OTA…'
            : 'Fil non disponible'
        }
        disabled={!canSend || sending}
        rows={2}
        sx={{
          flex: 1,
          resize: 'none',
          border: `1px solid ${T.border}`,
          borderRadius: '10px',
          px: 1.25,
          py: 1,
          fontSize: 12.5,
          fontFamily: 'inherit',
          bgcolor: T.bg1,
          color: T.text,
          outline: 'none',
          '&:focus': { borderColor: accent },
        }}
      />
      <Box
        component="button"
        type="button"
        disabled={!canSend || sending || !draft.trim()}
        onClick={() => void send()}
        sx={{
          height: 40,
          px: 1.5,
          borderRadius: '10px',
          border: 0,
          bgcolor: accent,
          color: '#fff',
          fontWeight: 700,
          fontSize: 12.5,
          fontFamily: 'inherit',
          cursor: !canSend || sending || !draft.trim() ? 'not-allowed' : 'pointer',
          opacity: !canSend || sending || !draft.trim() ? 0.45 : 1,
          flexShrink: 0,
        }}
      >
        {sending ? '…' : 'Envoyer'}
      </Box>
    </Box>
  );
}

export default function PlanningThreadPanel({
  channel,
  reservation,
  active,
  reloadToken = 0,
}: {
  channel: PlanningThreadChannel;
  reservation: ReservationRow;
  /** Drawer ouvert — active le listener wheel ModalScrollColumn. */
  active: boolean;
  /** Incrémenter après envoi pour recharger sans scrollIntoView sauvage. */
  reloadToken?: number;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = String(reservation.lastWa?.phone || '').trim();
  const threadId = reservation.lastOta?.threadId;
  const mongoId = reservation.reservationId;
  const accent = channel === 'wa' ? '#128C4B' : '#003580';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (channel === 'wa') {
        if (!phone) {
          setBubbles([]);
          setError('Pas de numéro WhatsApp lié.');
          return;
        }
        const detail = await messagesService.getConversationMessages(phone, {
          limit: 80,
          scope: mongoId ? 'reservation' : 'phone',
          reservationId: mongoId || undefined,
          inbox: 'guest',
        });
        const exchanges =
          detail?.status === 'success'
            ? detail.data?.exchanges || []
            : (detail as { data?: { exchanges?: MessageExchange[] }; exchanges?: MessageExchange[] })
                ?.data?.exchanges ||
              (detail as { exchanges?: MessageExchange[] })?.exchanges ||
              [];
        setBubbles(exchangesToBubbles(Array.isArray(exchanges) ? exchanges : []));
        return;
      }

      if (!threadId) {
        setBubbles([]);
        setError('Pas de fil OTA lié.');
        return;
      }
      const payload = await messagesService.getOTAMessages(String(threadId));
      const raw = extractOtaMessagesFromApiResponse(payload);
      const mapped = mapOtaApiMessagesToInbox(raw, reservation.guestName || 'Guest');
      setBubbles(otaToBubbles(mapped));
    } catch (e) {
      setBubbles([]);
      setError(e instanceof Error ? e.message : 'Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  }, [channel, phone, threadId, mongoId, reservation.guestName]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  // Pin bas après chargement — scrollTop sur la colonne, jamais scrollIntoView (page/drawer).
  useEffect(() => {
    if (loading) return;
    const id = window.requestAnimationFrame(() => scrollThreadToBottom());
    return () => window.cancelAnimationFrame(id);
  }, [loading, bubbles.length, channel]);

  return (
    <ModalScrollColumn
      active={active}
      className="planning-thread-scroll"
      wrapperSx={{ flex: 1, minHeight: 0, bgcolor: T.bg2, borderRadius: '10px', border: `1px solid ${T.border}` }}
      innerSx={{ px: 1, py: 1.25 }}
    >
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={22} sx={{ color: accent }} />
        </Box>
      )}
      {!loading && error && (
        <Typography sx={{ fontSize: 12.5, color: '#c81e1e', px: 1, py: 2 }}>{error}</Typography>
      )}
      {!loading && !error && bubbles.length === 0 && (
        <Typography sx={{ fontSize: 12.5, color: T.text3, px: 1, py: 2, textAlign: 'center' }}>
          Aucun message dans ce fil
        </Typography>
      )}
      {!loading &&
        bubbles.map((b) => {
          const mine = b.from === 'host';
          return (
            <Box
              key={b.id}
              sx={{
                display: 'flex',
                justifyContent: mine ? 'flex-end' : 'flex-start',
                mb: 0.75,
              }}
            >
              <Box
                sx={{
                  maxWidth: '88%',
                  px: 1.25,
                  py: 0.85,
                  borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  bgcolor: mine ? accent : T.bg1,
                  color: mine ? '#fff' : T.text,
                  border: mine ? 0 : `1px solid ${T.border}`,
                }}
              >
                <Typography sx={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                  {b.text}
                </Typography>
                {b.time ? (
                  <Typography
                    sx={{
                      mt: 0.35,
                      fontSize: 10,
                      opacity: 0.75,
                      fontFamily: '"Geist Mono", monospace',
                      textAlign: 'right',
                    }}
                  >
                    {b.time}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          );
        })}
    </ModalScrollColumn>
  );
}
