// ════════════════════════════════════════════════════════════════════
// TasksKanbanPage.tsx — Vue Kanban redesignée par Claude Design
// Nouvelle vue : 4 colonnes (CREATED, ASSIGNED, IN_PROGRESS, COMPLETED)
// Drag & drop natif HTML5 pour changer le statut des tâches
// Intègre: sidebar, scope user, owner selection
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import KanbanView from '../components/calendar-views/KanbanView';
import type { TaskItem, TaskStatus } from '../components/calendar-views/_shared';
import tasksService, { resolveTasksUserScope } from '../services/tasksService';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { getStoredOwners } from '../data/catalogueMock';

export default function TasksKanbanPage() {
  const { user, loading: authLoading } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [adminOwnerId, setAdminOwnerId] = useState('');

  const ownerOptions = useMemo(
    () =>
      getStoredOwners()
        .filter((o) => o.role === 'owner')
        .map((o) => ({ id: o.id, name: o.name })),
    [],
  );

  const planningOwnerId = useMemo(() => {
    if (scope.canAccessAllOwners) {
      return adminOwnerId.trim() === '' ? undefined : adminOwnerId;
    }
    return scope.ownerId;
  }, [scope.canAccessAllOwners, scope.ownerId, adminOwnerId]);

  // Fetch all tasks (pas de filtre de date pour Kanban - vue globale)
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!scope.canAccessAllOwners && !scope.ownerId) {
          throw new Error('Impossible de déterminer le ownerId de la session.');
        }

        // Récupérer toutes les tâches non terminées + les complétées récentes
        const result = await tasksService.getTasks({
          limit: 500,
          page: 0,
          sortField: 'startDate',
          sortDirection: 'asc',
          ownerId: planningOwnerId,
        });

        if (result.success && result.data) {
          setRawTasks(result.data);
        } else {
          setError('Erreur lors du chargement des tâches');
        }
      } catch (err: any) {
        console.error('[TasksKanbanPage] Error fetching tasks:', err);
        setError(err?.message || 'Erreur réseau');
      } finally {
        setIsLoading(false);
      }
    };

    if (authLoading) return;
    fetchTasks();
  }, [planningOwnerId, scope.canAccessAllOwners, scope.ownerId, authLoading]);

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
      const result = await tasksService.updateTaskStatus(taskId, newStatus);

      if (result.success) {
        toast.success(`✅ Tâche déplacée vers "${newStatus}"`);

        // Update local state
        setRawTasks(prev => prev.map(t =>
          t._id === taskId ? { ...t, taskStatus: newStatus } : t
        ));
      } else {
        toast.error(result.message || 'Erreur lors du déplacement');
      }
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
