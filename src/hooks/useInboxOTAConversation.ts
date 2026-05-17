import { useCallback, useState } from 'react';
import messagesService from '../services/messagesService';
import tasksService from '../services/tasksService';
import reservationsService from '../services/reservationsService';
import type { Message } from '../types/unifiedInbox.types';
import type { InboxReservationData } from '../types/inboxReservation.types';
import type { ReservationTask } from '../types/reservationTask.types';
import type { Reservation } from '../types/reservations.types';
import {
  mapOtaApiMessagesToInbox,
  mapOtaRowToReservation,
  type OtaThreadRow,
} from '../components/unified-inbox/inboxOtaMappers';
import { mapReservationToInboxData } from '../components/unified-inbox/inboxReservationEnrichment';
export function useInboxOTAConversation() {
  const [activeRow, setActiveRow] = useState<OtaThreadRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<ReservationTask[]>([]);
  const [reservation, setReservation] = useState<InboxReservationData | null>(null);
  const [rawReservation, setRawReservation] = useState<Reservation | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const selectOtaThread = useCallback(async (row: OtaThreadRow) => {
    setActiveRow(row);
    setLoadingMessages(true);
    setLoadingTasks(true);
    setMessages([]);
    setTasks([]);
    setReservation(mapOtaRowToReservation(row));
    setRawReservation(null);

    const resaNum = row.reservationNumber?.trim();

    try {
      let rawMessages = row.preloadedMessages || [];
      if (rawMessages.length === 0) {
        const msgRes = await messagesService.getOTAMessages(row.threadId);
        rawMessages = msgRes.data?.messages || msgRes.messages || [];
      } else if (rawMessages.length < 30) {
        const msgRes = await messagesService.getOTAMessages(row.threadId);
        const fromApi = msgRes.data?.messages || msgRes.messages || [];
        if (fromApi.length > rawMessages.length) rawMessages = fromApi;
      }

      setMessages(mapOtaApiMessagesToInbox(rawMessages, row.guestName));

      const [tasksResponse, reservationRow] = await Promise.all([
        resaNum
          ? tasksService.getTasksByReservation(resaNum, false)
          : Promise.resolve({ success: false, data: { reservationId: '', total: 0, tasks: [] } }),
        resaNum ? reservationsService.getByReservationNumber(resaNum) : Promise.resolve(null),
      ]);

      if (tasksResponse.success) {
        setTasks(tasksResponse.data.tasks);
      }

      if (reservationRow) {
        setRawReservation(reservationRow);
        setReservation(mapReservationToInboxData(reservationRow));
      }
    } catch (err) {
      console.error('❌ Erreur chargement thread OTA:', err);
    } finally {
      setLoadingMessages(false);
      setLoadingTasks(false);
    }
  }, []);

  return {
    activeRow,
    messages,
    tasks,
    reservation,
    rawReservation,
    loadingMessages,
    loadingTasks,
    selectOtaThread,
    setActiveRow,
  };
}
