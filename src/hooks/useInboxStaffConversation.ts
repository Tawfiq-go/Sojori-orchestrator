import { useCallback, useState } from 'react';
import { format, addDays } from 'date-fns';
import messagesService from '../services/messagesService';
import tasksService from '../services/tasksService';
import type { Conversation, MessageExchange } from '../types/messages.types';
import type { ReservationTask } from '../types/reservationTask.types';
import {
  findStaffByPhone,
  mapSearchTaskToReservationTask,
} from '../components/unified-inbox/inboxTaskMappers';
import type { TasksStaffMember } from '../types/tasks.types';

export function useInboxStaffConversation() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageExchange[]>([]);
  const [tasks, setTasks] = useState<ReservationTask[]>([]);
  const [matchedStaff, setMatchedStaff] = useState<TasksStaffMember | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const selectStaffConversation = useCallback(async (conv: Conversation) => {
    setActiveConversation(conv);
    setLoadingMessages(true);
    setLoadingTasks(true);
    setMessages([]);
    setTasks([]);
    setMatchedStaff(null);

    try {
      const [messagesResponse, staffResult] = await Promise.all([
        messagesService.getConversationMessages(conv.phone, { limit: 50 }),
        tasksService.getStaff({ limit: 500 }),
      ]);

      if (messagesResponse.status === 'success') {
        setMessages(messagesResponse.data.exchanges);
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
    setActiveConversation,
  };
}
