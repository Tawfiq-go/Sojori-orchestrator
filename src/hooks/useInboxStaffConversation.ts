import { useCallback, useState } from 'react';
import { format, addDays } from 'date-fns';
import messagesService from '../services/messagesService';
import tasksService from '../services/tasksService';
import { staffOutboundExchange } from '../services/staffConversationMapper';
import type { Conversation, MessageExchange } from '../types/messages.types';
import type { ReservationTask } from '../types/reservationTask.types';
import {
  findStaffByPhone,
  mapSearchTaskToReservationTask,
} from '../components/unified-inbox/inboxTaskMappers';
import { mergeStaffExchanges } from '../services/staffConversationMapper';
import type { TasksStaffMember } from '../types/tasks.types';

export function useInboxStaffConversation() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageExchange[]>([]);
  const [tasks, setTasks] = useState<ReservationTask[]>([]);
  const [matchedStaff, setMatchedStaff] = useState<TasksStaffMember | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const appendOutboundMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const exchange = staffOutboundExchange(trimmed);
    setMessages((prev) => [...prev, exchange]);
    setActiveConversation((prev) => {
      if (!prev) return prev;
      const staff = [...(prev.staff_exchanges || prev.recent_exchanges || []), exchange];
      return {
        ...prev,
        last_message_time: exchange.timestamp,
        messages_count: (prev.messages_count || 0) + 1,
        exchanges_count: (prev.exchanges_count || 0) + 1,
        staff_exchanges: staff,
        recent_exchanges: staff.slice(-5),
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
      const staff = prev.staff_exchanges || prev.recent_exchanges || [];
      if (!staff.length) return prev;
      const trimmed = staff.slice(0, -1);
      const last = trimmed[trimmed.length - 1];
      return {
        ...prev,
        staff_exchanges: trimmed,
        recent_exchanges: trimmed.slice(-5),
        messages_count: Math.max(0, (prev.messages_count || 1) - 1),
        exchanges_count: Math.max(0, (prev.exchanges_count || 1) - 1),
        last_message_time: last?.timestamp || prev.last_message_time,
      };
    });
  }, []);

  const refreshStaffMessages = useCallback(async (phone?: string) => {
    const targetPhone = phone || activeConversation?.phone;
    if (!targetPhone) return;
    try {
      const messagesResponse = await messagesService.getConversationMessages(targetPhone, {
        limit: 50,
        inbox: 'staff',
      });
      const fetched = messagesResponse.data?.exchanges || [];
      if (fetched.length > 0) {
        setMessages((prev) => mergeStaffExchanges(prev, fetched));
        setActiveConversation((prev) => {
          if (!prev || prev.phone !== targetPhone) return prev;
          const merged = mergeStaffExchanges(
            prev.staff_exchanges || prev.recent_exchanges || [],
            fetched,
          );
          const last = merged[merged.length - 1];
          return {
            ...prev,
            staff_exchanges: merged,
            recent_exchanges: merged.slice(-5),
            messages_count: merged.length,
            exchanges_count: merged.length,
            last_message_time: last?.timestamp || prev.last_message_time,
          };
        });
      }
    } catch (err) {
      console.error('❌ Erreur refresh staff messages:', err);
    }
  }, [activeConversation?.phone]);

  const selectStaffConversation = useCallback(async (conv: Conversation) => {
    setActiveConversation(conv);
    setLoadingMessages(true);
    setLoadingTasks(true);
    const seed =
      conv.staff_exchanges?.length
        ? conv.staff_exchanges
        : conv.recent_exchanges?.length
          ? conv.recent_exchanges
          : [];
    setMessages(seed);
    setTasks([]);
    setMatchedStaff(null);

    try {
      const [messagesResponse, staffResult] = await Promise.all([
        messagesService.getConversationMessages(conv.phone, { limit: 50, inbox: 'staff' }),
        tasksService.getStaff({ limit: 500 }),
      ]);

      const fetched = messagesResponse.data?.exchanges || [];
      if (fetched.length > 0) {
        setMessages((prev) => mergeStaffExchanges(prev.length ? prev : seed, fetched));
      } else if (seed.length === 0) {
        setMessages([]);
      }

      const staffMember = findStaffByPhone(staffResult.staff || [], conv.phone);
      setMatchedStaff(staffMember || null);

      if (staffMember?.staffCode) {
        const start = format(addDays(new Date(), -14), 'yyyy-MM-dd');
        const end = format(addDays(new Date(), 30), 'yyyy-MM-dd');
        const tasksResult = await tasksService.getTasks({
          staffCodes: [staffMember.staffCode],
          dateType: 'startDate',
          dateStart: start,
          dateEnd: end,
          limit: 100,
          page: 0,
          sortField: 'startDate',
          sortDirection: 'asc',
        });
        setTasks((tasksResult.tasks || []).map((t) => mapSearchTaskToReservationTask(t as Record<string, unknown>)));
      }
    } catch (err) {
      console.error('❌ Erreur chargement staff inbox:', err);
    } finally {
      setLoadingMessages(false);
      setLoadingTasks(false);
    }
  }, []);

  return {
    activeConversation,
    messages,
    tasks,
    matchedStaff,
    loadingMessages,
    loadingTasks,
    selectStaffConversation,
    appendOutboundMessage,
    removeLastOutboundMessage,
    refreshStaffMessages,
    setActiveConversation,
  };
}
