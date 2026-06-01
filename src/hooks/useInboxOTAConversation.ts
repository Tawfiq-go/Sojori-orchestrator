import { useCallback, useState } from 'react';
import messagesService from '../services/messagesService';
import tasksService from '../services/tasksService';
import reservationsService from '../services/reservationsService';
import type { Message } from '../types/unifiedInbox.types';
import type { InboxReservationData } from '../types/inboxReservation.types';
import type { ReservationTask } from '../types/reservationTask.types';
import type { Reservation } from '../types/reservations.types';
import {
  buildOtaPreviewFallbackMessages,
  extractOtaMessagesFromApiResponse,
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
  const [messagesLoadError, setMessagesLoadError] = useState<string | null>(null);
  const [messagesTotal, setMessagesTotal] = useState(0);

  const selectOtaThread = useCallback(async (row: OtaThreadRow) => {
    setActiveRow(row);
    setLoadingMessages(true);
    setLoadingTasks(true);
    setMessages([]);
    setTasks([]);
    setMessagesLoadError(null);
    setMessagesTotal(0);
    setReservation(mapOtaRowToReservation(row));
    setRawReservation(null);

    const resaNum = row.reservationNumber?.trim();
    const threadKey = String(row.threadId);

    try {
      let rawMessages: any[] = [];
      const msgRes = await messagesService.getOTAMessages(threadKey);
      rawMessages = extractOtaMessagesFromApiResponse(msgRes);
      const total =
        typeof (msgRes as { total?: number })?.total === 'number'
          ? (msgRes as { total: number }).total
          : rawMessages.length;
      setMessagesTotal(total);

      let mapped = mapOtaApiMessagesToInbox(rawMessages, row.guestName);
      if (mapped.length === 0 && row.lastMessage?.trim()) {
        mapped = buildOtaPreviewFallbackMessages(row);
      }
      setMessages(mapped);

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
      const fallback = buildOtaPreviewFallbackMessages(row);
      if (fallback.length > 0) {
        setMessages(fallback);
        setMessagesLoadError(
          'Historique complet indisponible — aperçu Rental United affiché. Lance une sync messages si besoin.',
        );
      } else {
        setMessagesLoadError('Impossible de charger les messages de ce fil.');
      }
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
    messagesLoadError,
    messagesTotal,
    selectOtaThread,
    setActiveRow,
  };
}
