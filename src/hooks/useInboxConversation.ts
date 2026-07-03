import { useCallback, useState } from 'react';
import messagesService from '../services/messagesService';
import tasksService from '../services/tasksService';
import reservationsService from '../services/reservationsService';
import { outboundInboxExchange } from '../components/unified-inbox/inboxMessages';
import type { Conversation, MessageExchange } from '../types/messages.types';
import type { InboxReservationData } from '../types/inboxReservation.types';
import type { ReservationTask } from '../types/reservationTask.types';
import type { Reservation } from '../types/reservations.types';
import {
  getConversationReservationNumber,
  mapConversationOnlyToInboxData,
  mapReservationToInboxData,
} from '../components/unified-inbox/inboxReservationEnrichment';

export function useInboxConversation() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageExchange[]>([]);
  const [tasks, setTasks] = useState<ReservationTask[]>([]);
  const [reservation, setReservation] = useState<InboxReservationData | null>(null);
  const [rawReservation, setRawReservation] = useState<Reservation | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingReservation, setLoadingReservation] = useState(false);

  const appendOutboundMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const exchange = outboundInboxExchange(trimmed);
    setMessages((prev) => [...prev, exchange]);
    setActiveConversation((prev) => {
      if (!prev) return prev;
      const recent = [...(prev.recent_exchanges || []), exchange];
      return {
        ...prev,
        last_message_time: exchange.timestamp,
        messages_count: (prev.messages_count || 0) + 1,
        exchanges_count: (prev.exchanges_count || 0) + 1,
        recent_exchanges: recent.slice(-5),
      };
    });
  }, []);

  const removeLastOutboundMessage = useCallback(() => {
    setMessages((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      if (!last.ai_response || last.user_message) return prev;
      return prev.slice(0, -1);
    });
    setActiveConversation((prev) => {
      if (!prev) return prev;
      const recent = (prev.recent_exchanges || []).slice(0, -1);
      const last = recent[recent.length - 1];
      return {
        ...prev,
        recent_exchanges: recent,
        messages_count: Math.max(0, (prev.messages_count || 1) - 1),
        exchanges_count: Math.max(0, (prev.exchanges_count || 1) - 1),
        last_message_time: last?.timestamp || prev.last_message_time,
      };
    });
  }, []);

  const refreshMessages = useCallback(async (conv?: Conversation) => {
    const target = conv || activeConversation;
    if (!target) return;
    try {
      const messagesResponse = await messagesService.getConversationMessages(target.phone, {
        limit: 50,
        scope: 'phone',
      });
      if (messagesResponse.status === 'success') {
        setMessages(messagesResponse.data.exchanges || []);
      }
    } catch (err) {
      console.error('❌ Erreur refresh messages:', err);
    }
  }, [activeConversation]);

  const selectConversation = useCallback(async (conv: Conversation) => {
    setActiveConversation(conv);
    setLoadingMessages(true);
    setLoadingTasks(true);
    setLoadingReservation(true);
    setMessages([]);
    setTasks([]);
    setReservation(mapConversationOnlyToInboxData(conv));
    setRawReservation(null);

    const resaNum = getConversationReservationNumber(conv);

    try {
      const [messagesResult, tasksResult, reservationResult] = await Promise.allSettled([
        messagesService.getConversationMessages(conv.phone, {
          limit: 50,
          scope: 'phone',
        }),
        resaNum
          ? tasksService.getTasksByReservation(resaNum, false)
          : Promise.resolve({ success: false, data: { reservationId: '', total: 0, tasks: [] } }),
        resaNum ? reservationsService.getByReservationNumber(resaNum) : Promise.resolve(null),
      ]);

      const messagesResponse = messagesResult.status === 'fulfilled' ? messagesResult.value : null;
      const tasksResponse = tasksResult.status === 'fulfilled' ? tasksResult.value : null;
      const reservationRow = reservationResult.status === 'fulfilled' ? reservationResult.value : null;

      if (messagesResponse?.status === 'success') {
        setMessages(messagesResponse.data.exchanges || []);
        if (messagesResponse.data.user_context) {
          const ctx = messagesResponse.data.user_context;
          setReservation((prev) => ({
            ...prev!,
            checkInDate: ctx.checkin_date || prev?.checkInDate,
            checkOutDate: ctx.checkout_date || prev?.checkOutDate,
            listingName: ctx.listing_name || prev?.listingName,
            reservationNumber: ctx.reservation_number || prev?.reservationNumber,
          }));
        }
      }

      if (tasksResponse?.success) {
        setTasks(tasksResponse.data.tasks);
      }

      if (reservationResult.status === 'rejected' && resaNum) {
        console.warn('[inbox] reservation lookup failed (non-blocking)', resaNum, reservationResult.reason);
      }

      if (reservationRow) {
        setRawReservation(reservationRow);
        setReservation(mapReservationToInboxData(reservationRow, conv));
      }
    } catch (err) {
      console.error('❌ Erreur chargement conversation inbox:', err);
    } finally {
      setLoadingMessages(false);
      setLoadingTasks(false);
      setLoadingReservation(false);
    }
  }, []);

  return {
    activeConversation,
    messages,
    tasks,
    reservation,
    rawReservation,
    loadingMessages,
    loadingTasks,
    loadingReservation,
    selectConversation,
    appendOutboundMessage,
    removeLastOutboundMessage,
    refreshMessages,
    setActiveConversation,
  };
}
