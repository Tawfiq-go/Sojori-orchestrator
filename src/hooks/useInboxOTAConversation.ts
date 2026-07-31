import { useCallback, useRef, useState } from 'react';
import messagesService from '../services/messagesService';
import tasksService from '../services/tasksService';
import reservationsService from '../services/reservationsService';
import type { Message } from '../types/unifiedInbox.types';
import type { InboxReservationData } from '../types/inboxReservation.types';
import type { ReservationTask } from '../types/reservationTask.types';
import type { Reservation } from '../types/reservations.types';
import {
  buildOtaPreviewFallbackMessages,
  clearOtaGhostPreview,
  extractOtaMessagesFromApiResponse,
  mapOtaApiMessagesToInbox,
  mapOtaRowToReservation,
  type OtaThreadRow,
} from '../components/unified-inbox/inboxOtaMappers';
import { mapReservationToInboxData } from '../components/unified-inbox/inboxReservationEnrichment';

type CachedThread = {
  messages: Message[];
  total: number;
};

export type SelectOtaThreadOptions = {
  /**
   * Réponse `getOTAMessages` déjà récupérée par l'appelant (deep link `?thread=`).
   * Évite un second appel identique — sinon le fil se charge visiblement deux fois.
   */
  preloadedResponse?: unknown;
};

/** Cache session — ouverture style WhatsApp Web (instant si déjà vu). */
const otaMessagesCache = new Map<string, CachedThread>();

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
  const selectGenRef = useRef(0);
  const activeThreadIdRef = useRef<string | null>(null);

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
    setMessages((prev) => {
      const next = [...prev, msg];
      const key = activeThreadIdRef.current;
      if (key) {
        const prevCache = otaMessagesCache.get(key);
        otaMessagesCache.set(key, {
          messages: next,
          total: Math.max(prevCache?.total || 0, next.length),
        });
      }
      return next;
    });
  }, []);

  const removeLastOutboundMessage = useCallback(() => {
    setMessages((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      if (last.from !== 'you' || !String(last.id).startsWith('local-')) return prev;
      const next = prev.slice(0, -1);
      const key = activeThreadIdRef.current;
      if (key) {
        const prevCache = otaMessagesCache.get(key);
        otaMessagesCache.set(key, {
          messages: next,
          total: prevCache?.total || next.length,
        });
      }
      return next;
    });
  }, []);

  const refreshOtaMessages = useCallback(async (row?: OtaThreadRow) => {
    const target = row || activeRow;
    if (!target) return;
    const threadKey = String(target.threadId);
    try {
      const msgRes = await messagesService.getOTAMessages(threadKey);
      if (activeThreadIdRef.current !== threadKey) return;
      const rawMessages = extractOtaMessagesFromApiResponse(msgRes);
      // API OK + 0 msg = fil vraiment vide — ne pas inventer un aperçu RU fantôme.
      const mapped = mapOtaApiMessagesToInbox(rawMessages, target.guestName);
      const total =
        typeof (msgRes as { total?: number })?.total === 'number'
          ? (msgRes as { total: number }).total
          : mapped.length;
      otaMessagesCache.set(threadKey, { messages: mapped, total });
      setMessages(mapped);
      setMessagesTotal(total);
      if (mapped.length === 0) {
        setActiveRow((prev) =>
          prev && String(prev.threadId) === threadKey ? clearOtaGhostPreview(prev) : prev,
        );
      }
    } catch (err) {
      console.error('❌ Erreur refresh OTA messages:', err);
    }
  }, [activeRow]);

  const selectOtaThread = useCallback(async (row: OtaThreadRow, opts?: SelectOtaThreadOptions) => {
    const threadKey = String(row.threadId);
    const sameThread = activeThreadIdRef.current === threadKey;
    const gen = ++selectGenRef.current;
    const cached = otaMessagesCache.get(threadKey);
    const preloaded = opts?.preloadedResponse;
    const hasPreloaded = preloaded != null;

    activeThreadIdRef.current = threadKey;
    setActiveRow(row);
    setMessagesLoadError(null);
    setReservation(mapOtaRowToReservation(row));

    if (!sameThread) {
      setRawReservation(null);
      setTasks([]);
      if (cached?.messages?.length) {
        // WhatsApp Web : cache → affichage immédiat, refresh silencieux
        setMessages(cached.messages);
        setMessagesTotal(cached.total);
      } else {
        // Pas de cache → panneau vide + spinner (pas d’aperçu partiel)
        setMessages([]);
        setMessagesTotal(0);
      }
    }
    // Messages déjà en main (deep link) : pas de spinner, le fil s'affiche d'un coup.
    setLoadingMessages(!hasPreloaded);
    setLoadingTasks(true);

    const resaNum = row.reservationNumber?.trim();

    try {
      const msgRes = hasPreloaded ? preloaded : await messagesService.getOTAMessages(threadKey);
      if (gen !== selectGenRef.current) return;

      const rawMessages = extractOtaMessagesFromApiResponse(msgRes);
      const total =
        typeof (msgRes as { total?: number })?.total === 'number'
          ? (msgRes as { total: number }).total
          : rawMessages.length;

      // Succès API vide = pas de fallback lastMessage (évite Q « 28 mai » alors que le fil est vide).
      const mapped = mapOtaApiMessagesToInbox(rawMessages, row.guestName);

      otaMessagesCache.set(threadKey, { messages: mapped, total });
      setMessages(mapped);
      setMessagesTotal(total);
      setLoadingMessages(false);
      if (mapped.length === 0) {
        setActiveRow((prev) =>
          prev && String(prev.threadId) === threadKey ? clearOtaGhostPreview(prev) : prev,
        );
      }

      const [tasksResponse, reservationRow] = await Promise.all([
        resaNum
          ? tasksService.getTasksByReservation(resaNum, false)
          : Promise.resolve({ success: false, data: { reservationId: '', total: 0, tasks: [] } }),
        resaNum ? reservationsService.getByReservationNumber(resaNum) : Promise.resolve(null),
      ]);

      if (gen !== selectGenRef.current) return;

      if (tasksResponse.success) {
        setTasks(tasksResponse.data.tasks);
      }

      if (reservationRow) {
        setRawReservation(reservationRow);
        setReservation(mapReservationToInboxData(reservationRow));
      }
    } catch (err) {
      if (gen !== selectGenRef.current) return;
      console.error('❌ Erreur chargement thread OTA:', err);
      if (!cached?.messages?.length) {
        const fallback = buildOtaPreviewFallbackMessages(row);
        if (fallback.length > 0) {
          setMessages(fallback);
          setMessagesLoadError(
            'Historique complet indisponible — aperçu Rental United affiché. Lance une sync messages si besoin.',
          );
        } else {
          setMessagesLoadError('Impossible de charger les messages de ce fil.');
        }
      }
    } finally {
      if (gen === selectGenRef.current) {
        setLoadingMessages(false);
        setLoadingTasks(false);
      }
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
