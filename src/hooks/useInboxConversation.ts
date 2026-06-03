import { useCallback, useState } from 'react';
import messagesService from '../services/messagesService';
import tasksService from '../services/tasksService';
import reservationsService from '../services/reservationsService';
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
      const [messagesResponse, tasksResponse, reservationRow] = await Promise.all([
        messagesService.getConversationMessages(conv.phone, {
          limit: 50,
          reservationId: conv.reservation_mongo_id ?? undefined,
        }),
        resaNum
          ? tasksService.getTasksByReservation(resaNum, false)
          : Promise.resolve({ success: false, data: { reservationId: '', total: 0, tasks: [] } }),
        resaNum ? reservationsService.getByReservationNumber(resaNum) : Promise.resolve(null),
      ]);

      if (messagesResponse.status === 'success') {
        setMessages(messagesResponse.data.exchanges);
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

      if (tasksResponse.success) {
        setTasks(tasksResponse.data.tasks);
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
    setActiveConversation,
  };
}
