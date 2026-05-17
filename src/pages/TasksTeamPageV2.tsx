// ════════════════════════════════════════════════════════════════════
// TasksTeamPageV2.tsx — Vue Équipe redesignée par Claude Design
// Remplace TasksTeamPage.tsx avec le nouveau TeamView
// Intègre: sidebar, scope user, owner selection
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { format, addDays } from 'date-fns';
import { DashboardWrapper } from '../components/DashboardWrapper';
import TeamView from '../components/calendar-views/TeamView';
import type { TaskItem, StaffMember } from '../components/calendar-views/_shared';
import tasksService, { resolveTasksUserScope } from '../services/tasksService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getStoredOwners } from '../data/catalogueMock';

export default function TasksTeamPageV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [daysCount] = useState(14);
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [rawStaff, setRawStaff] = useState<any[]>([]);
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

  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      const isFirstLoad = rawTasks.length === 0 && rawStaff.length === 0;
      if (isFirstLoad) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        if (!scope.canAccessAllOwners && !scope.ownerId) {
          throw new Error('Impossible de déterminer le ownerId de la session.');
        }

        const endDateStr = format(addDays(startDate, daysCount), 'yyyy-MM-dd');
        const startDateStr = format(startDate, 'yyyy-MM-dd');

        // Fetch tasks avec ownerId
        const tasksResult = await tasksService.getTasks({
          limit: 500,
          page: 0,
          dateType: 'startDate',
          dateStart: startDateStr,
          dateEnd: endDateStr,
          sortField: 'startDate',
          sortDirection: 'asc',
          ownerId: planningOwnerId,
        });

        // Fetch staff avec ownerId
        const staffResult = await tasksService.getStaff({
          limit: 500,
          ownerId: planningOwnerId,
        });

        console.log('[TasksTeamPageV2] ✅ Tasks result:', tasksResult);
        console.log('[TasksTeamPageV2] ✅ Staff result:', staffResult);

        // ✅ FIX: getTasks retourne { tasks, pagination }, pas { success, data }
        if (tasksResult.tasks) {
          setRawTasks(tasksResult.tasks);
        } else {
          setError('Erreur lors du chargement des tâches');
          return;
        }

        // ✅ FIX: getStaff retourne { staff, pagination }, pas { success, data }
        if (staffResult.staff) {
          setRawStaff(staffResult.staff);
        } else {
          setError('Erreur lors du chargement du staff');
          return;
        }
      } catch (err: any) {
        console.error('[TasksTeamPageV2] Error fetching data:', err);
        setError(err?.message || 'Erreur réseau');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchData();
  }, [startDate, daysCount, planningOwnerId, scope.canAccessAllOwners, scope.ownerId]);

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

  // Transform API data to StaffMember[] format
  const staff: StaffMember[] = useMemo(() => {
    return rawStaff.map((s: any) => ({
      _id: s._id || '',
      staffCode: s.staffCode || '',
      username: s.username || s.name || 'Staff',
      memberRole: s.memberRole || 'Staff',
    }));
  }, [rawStaff]);

  // Handlers
  const handleTaskClick = (task: TaskItem) => {
    console.log('[TasksTeamPageV2] Task clicked:', task);
    // TODO: Ouvrir drawer détail tâche
    // navigate(`/tasks/${task._id}`);
  };

  // Navigation temporelle
  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  const shiftDays = (delta: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + delta);
    setStartDate(d);
  };

  const handleDateChange = (newDate: Date) => {
    newDate.setHours(0, 0, 0, 0);
    setStartDate(newDate);
  };

  return (
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Équipe & planning']}>
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
          <Box sx={{ position: 'relative' }}>
            {/* Indicateur de chargement discret pendant navigation */}
            {isRefreshing && (
              <Box sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 100,
                bgcolor: 'rgba(184,133,26,0.9)',
                color: '#fff',
                px: 2,
                py: 1,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                boxShadow: '0 4px 12px rgba(20,17,10,0.15)',
              }}>
                <CircularProgress size={14} sx={{ color: '#fff' }} />
                Chargement...
              </Box>
            )}

            {/* TeamView component - Design Claude (inclut déjà header + KPI + filtres) */}
            <TeamView
              startDate={startDate}
              daysCount={daysCount}
              staff={staff}
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onGoToday={goToday}
              onPrevDay={() => shiftDays(-1)}
              onNextDay={() => shiftDays(1)}
              onPrevWeek={() => shiftDays(-7)}
              onNextWeek={() => shiftDays(7)}
              onDateChange={handleDateChange}
            />
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
