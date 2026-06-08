// ⚡ PERFORMANCE: Composant TaskRow optimisé avec React.memo
// Évite les re-renders inutiles quand d'autres tâches changent
import { memo } from 'react';
import type { TaskListItem } from '../../types/tasks.types';

interface TaskRowProps {
  task: TaskListItem;
  onClick?: (task: TaskListItem) => void;
  onStatusChange?: (task: TaskListItem, newStatus: string) => void;
  onAssign?: (task: TaskListItem) => void;
  // Ajoutez d'autres props nécessaires
}

/**
 * Comparateur personnalisé pour React.memo
 * Ne re-render que si les propriétés critiques de la tâche changent
 */
const arePropsEqual = (prev: TaskRowProps, next: TaskRowProps): boolean => {
  // Compare les propriétés critiques qui affectent le rendu
  return (
    prev.task._id === next.task._id &&
    prev.task.taskStatus === next.task.taskStatus &&
    prev.task.startDate === next.task.startDate &&
    prev.task.assignedStaffCode === next.task.assignedStaffCode &&
    prev.task.taskTitle === next.task.taskTitle &&
    prev.task.emergency === next.task.emergency &&
    prev.onClick === next.onClick &&
    prev.onStatusChange === next.onStatusChange &&
    prev.onAssign === next.onAssign
  );
};

export const TaskRowOptimized = memo<TaskRowProps>(
  ({ task, onClick, onStatusChange, onAssign }) => {
    // Implémentation du rendu de la ligne
    // Pour l'instant, c'est un placeholder - vous devrez copier le rendu réel
    return null;
  },
  arePropsEqual,
);

TaskRowOptimized.displayName = 'TaskRowOptimized';
