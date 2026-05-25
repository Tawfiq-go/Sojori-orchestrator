import type { TaskType } from '../components/tasks/AddTaskModal/types';
import {
  FULLTASK_TASK_TYPES,
  FULLTASK_TASK_TYPE_EMOJI,
  FULLTASK_TASK_TYPE_LABELS,
  type FulltaskTaskTypeId,
} from '../features/taskHub/staff-design/fulltaskTaskTypes';

/** Mapping UI legacy (étape 2) ← types srv-fulltask */
export const FULLTASK_TO_LEGACY_TASK_TYPE: Record<FulltaskTaskTypeId, TaskType> = {
  arrival_choose: 'ARRIVAL',
  departure_choose: 'DEPARTURE',
  cleaning_free: 'CLEANING',
  arrival_declare: 'ARRIVAL',
  departure_declare: 'DEPARTURE',
  registration: 'REGISTRATION',
  cleaning_paid: 'CLEANING',
  checkout_cleaning: 'CLEANING',
  transport: 'TRANSPORT',
  groceries: 'GROCERIES',
  concierge: 'CUSTOM',
  support: 'SUPPORT',
  service_client: 'SUPPORT',
};

export const FULLTASK_TYPE_SELECT_OPTIONS = FULLTASK_TASK_TYPES.map((id) => ({
  id,
  label: FULLTASK_TASK_TYPE_LABELS[id],
  emoji: FULLTASK_TASK_TYPE_EMOJI[id] || '📋',
}));

export function resolveFulltaskTypeId(
  fulltaskTypeId: string | null | undefined,
  legacyType: TaskType | null | undefined,
): FulltaskTaskTypeId {
  if (fulltaskTypeId && FULLTASK_TASK_TYPES.includes(fulltaskTypeId as FulltaskTaskTypeId)) {
    return fulltaskTypeId as FulltaskTaskTypeId;
  }
  const entry = Object.entries(FULLTASK_TO_LEGACY_TASK_TYPE).find(([, leg]) => leg === legacyType);
  return (entry?.[0] as FulltaskTaskTypeId) || 'support';
}
