/**
 * Ouvre le même TaskDetailDrawer que /tasks (par taskId fulltask).
 */
import { Suspense, useCallback, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import { lazyWithReload } from '../../../utils/lazyWithReload';
import tasksService from '../../../services/fulltaskTasksService';
import type { TaskListItem } from '../../../types/tasks.types';

const TaskDetailDrawer = lazyWithReload(() => import('../components/TaskDetailDrawer'));

export function useTaskDetailDrawer(opts?: { onSuccess?: (taskId: string) => void }) {
  const [task, setTask] = useState<TaskListItem | null>(null);
  const [loading, setLoading] = useState(false);

  const openTaskById = useCallback(async (taskId: string) => {
    const id = String(taskId || '').trim();
    if (!id) return;
    setLoading(true);
    try {
      const item = await tasksService.fetchTaskListItem(id);
      setTask(item);
    } catch {
      toast.error('Impossible d’ouvrir cette tâche.');
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => setTask(null), []);

  const drawer =
    task || loading ? (
      <Suspense fallback={<CircularProgress size={28} sx={{ position: 'fixed', top: 24, right: 24, zIndex: 1400 }} />}>
        {task ? (
          <TaskDetailDrawer
            task={task}
            onClose={close}
            onSuccess={() => {
              const id = String(task._id || '');
              if (id) {
                void tasksService.fetchTaskListItem(id).then(setTask).catch(() => {});
                opts?.onSuccess?.(id);
              }
            }}
          />
        ) : null}
      </Suspense>
    ) : null;

  return { openTaskById, close, drawer, loading, task };
}
