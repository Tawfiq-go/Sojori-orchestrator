// ════════════════════════════════════════════════════════════════════
// TasksKanbanPage.tsx — Vue Kanban redesignée par Claude Design
// Nouvelle vue : 4 colonnes (CREATED, ASSIGNED, IN_PROGRESS, COMPLETED)
// Drag & drop natif HTML5 pour changer le statut des tâches
// Intègre: sidebar, scope user, owner selection
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import KanbanView from '../components/calendar-views/KanbanView';
import type { TaskItem, TaskStatus } from '../components/calendar-views/_shared';
import tasksService from '../services/fulltaskTasksService';
import { usePmTasksScope } from '../hooks/usePmTasksScope';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useSocketIO } from '../hooks/useSocketIO';
import { SOCKET_EVENTS, DEFAULT_ROOMS } from '../constants/socketEvents';

export default function TasksKanbanPage() {
  const { loading: authLoading } = useAuth();
  const scope = usePmTasksScope();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawTasks, setRawTasks] = useState<any[]>([]);

  // Fetch all tasks (pas de filtre de date pour Kanban - vue globale)
  const fetchTasks = useCallback(async (opts?: { silent?: boolean }) => {
    if (!scope.scopeFetchReady) {
      setRawTasks([]);
      if (!opts?.silent) setIsLoading(false);
      return;
    }
    if (!opts?.silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      if (!scope.canAccessAllOwners && !scope.ownerId) {
        throw new Error('Impossible de déterminer le ownerId de la session.');
      }

      const result = await tasksService.getTasks({
        limit: 500,
        page: 0,
        sortField: 'startDate',
        sortDirection: 'asc',
        ownerId: scope.ownerId,
      });

      if (result.success && result.data) {
        setRawTasks(result.data);
      } else if (!opts?.silent) {
        setError('Erreur lors du chargement des tâches');
      }
    } catch (err: any) {
      console.error('[TasksKanbanPage] Error fetching tasks:', err);
      if (!opts?.silent) setError(err?.message || 'Erreur réseau');
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, [scope.ownerId, scope.canAccessAllOwners, scope.scopeFetchReady]);

  useEffect(() => {
    if (authLoading) return;
    void fetchTasks();
  }, [fetchTasks, authLoading]);

  // ─── Temps réel (socket.io) ───────────────────────────────────────
  const socketRooms = useMemo(() => {
    if (!scope.ownerId) return [DEFAULT_ROOMS.TASK_ADMIN_ROOM];
    return [`room_task_${scope.ownerId}`];
  }, [scope.ownerId]);

  useSocketIO({
    rooms: socketRooms,
    enabled: scope.scopeFetchReady && !authLoading,
    onReconnect: () => { void fetchTasks({ silent: true }); },
    handlers: {
      [SOCKET_EVENTS.NEW_TASK]: (task: any) => {
        setRawTasks(prev => {
          if (prev.some((t) => t._id === task._id)) return prev;
          return [task, ...prev];
        });
      },
      [SOCKET_EVENTS.UPDATE_TASK]: (task: any) => {
        setRawTasks(prev => prev.map((t) => (t._id === task._id ? { ...t, ...task } : t)));
      },
    },
  });

  // Transform API data to TaskItem[] format
  const tasks: TaskItem[] = useMemo(() => {
    return rawTasks.map((t: any) => ({
      _id: t._id || '',
      itemNumber: t.itemNumber || '',
      name: t.name || '',
      type: t.type || null,
      subType: t.subType,
      startDate: t.startDate || '',
      taskStatus: t.taskStatus || 'CREATED',
      staffId: t.staffId || null,
      staffName: t.staffName || null,
      staffCode: t.staffCode || null,
      listingId: t.listingId || '',
      listingName: t.listingName || '',
      reservationNumber: t.reservationNumber,
      guestName: t.guestName,
      emergency: t.emergency,
    }));
  }, [rawTasks]);

  // Handlers
  const handleTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    console.log('[TasksKanbanPage] Moving task:', taskId, 'to status:', newStatus);

    try {
      // Appeler l'API pour mettre à jour le statut
      await tasksService.updateTaskStatus(taskId, newStatus);
      toast.success(`Tâche déplacée vers "${newStatus}"`);
      setRawTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, taskStatus: newStatus } : t)),
      );
    } catch (err: any) {
      console.error('[TasksKanbanPage] Error updating task status:', err);
      toast.error(err?.message || 'Erreur lors du déplacement');
    }
  };

  const handleTaskClick = (task: TaskItem) => {
    console.log('[TasksKanbanPage] Task clicked:', task);
    // TODO: Ouvrir drawer détail tâche
    // navigate(`/tasks/${task._id}`);
  };

  const handleNewTask = () => {
    console.log('[TasksKanbanPage] New task button clicked');
    // TODO: Ouvrir dialog création tâche
    toast.info('🚧 Dialog création tâche à implémenter');
  };

  return (
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Kanban']}>
      <Box sx={{ bgcolor: '#f6f5f1', minHeight: '100vh' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && error && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {!isLoading && !error && (
          <Box>
            {/* KanbanView component - Design Claude */}
            <KanbanView
              tasks={tasks}
              onTaskMove={handleTaskMove}
              onTaskClick={handleTaskClick}
              onNewTask={handleNewTask}
            />
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
