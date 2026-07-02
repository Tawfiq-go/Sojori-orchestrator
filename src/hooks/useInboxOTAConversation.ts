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

  const appendOutboundMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg: Message = {
      id: `local-${Date.now()}`,
      from: 'you',
      text: trimmed,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const removeLastOutboundMessage = useCallback(() => {
    setMessages((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      if (last.from !== 'you' || !String(last.id).startsWith('local-')) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const refreshOtaMessages = useCallback(async (row?: OtaThreadRow) => {
    const target = row || activeRow;
    if (!target) return;
    try {
      const msgRes = await messagesService.getOTAMessages(String(target.threadId));
      const rawMessages = extractOtaMessagesFromApiResponse(msgRes);
      let mapped = mapOtaApiMessagesToInbox(rawMessages, target.guestName);
      if (mapped.length === 0 && target.lastMessage?.trim()) {
        mapped = buildOtaPreviewFallbackMessages(target);
      }
      if (mapped.length > 0) {
        setMessages((prev) => (mapped.length >= prev.length ? mapped : prev));
      }
    } catch (err) {
      console.error('❌ Erreur refresh OTA messages:', err);
    }
  }, [activeRow]);

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
    appendOutboundMessage,
    removeLastOutboundMessage,
    refreshOtaMessages,
    setActiveRow,
  };
}
