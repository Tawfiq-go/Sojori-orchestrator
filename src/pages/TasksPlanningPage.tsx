/**
 * Vue Séjour (planning) — redesign « Sojori · Atelier 2026 ».
 * Tokens alignés sur DashboardV2.components (ambre #b8851a, neutres chauds,
 * violet AI #7c3aed). Pas de changement de logique : useEffect, service,
 * normalisation, scope user et props enfants restent identiques.
 *
 * Changements design :
 *  - Bandeau « Aujourd'hui » : passe par <TasksStayTodayOpsBar> redessiné.
 *  - Bloc principal : surface plate (border tokens.border, ombre 0 1px 2px),
 *    radius 12 (au lieu de 8), sans box-shadow lourd.
 *  - Toolbar planning : intégrée dans le même conteneur (chrome unifié).
 *  - États : loading + error harmonisés (typo, couleur tokens.text3).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as t } from '../components/dashboard/DashboardV2.components';
import {
  TasksStayPlanningToolbar,
  TasksStayTodayOpsBar,
} from '../components/tasks/TasksStayPlanningChrome';
import { TasksStayGrid, normalizePlanningListings } from '../components/tasks/TasksStayGrid';
import { getStoredOwners } from '../data/catalogueMock';
import { useAuth } from '../hooks/useAuth';
import listingsService from '../services/listingsService';
import tasksService, { resolveTasksUserScope } from '../services/tasksService';
import type { PlanningListingRow } from '../types/tasksPlanning.types';

/** Garde-fou : n’afficher que les listings actifs côté Sojori (srv-listing). */
async function fetchActiveListingIdSet(): Promise<Set<string>> {
  const ids = new Set<string>();
  const limit = 200;
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page * limit < total) {
    const res = await listingsService.getListingsForCalendar(page, limit, { active: true });
    if (!res.success || !res.data?.length) break;
    for (const row of res.data) {
      const id = row?._id ?? row?.id;
      if (id) ids.add(String(id));
    }
    total = res.total ?? res.data.length;
    if (res.data.length < limit) break;
    page += 1;
  }

  return ids;
}

function filterActivePlanningListings(
  rows: PlanningListingRow[],
  activeIds: Set<string> | null,
): PlanningListingRow[] {
  if (activeIds && activeIds.size > 0) {
    return rows.filter((l) => {
      const id = String(l.listingId || '');
      return id && activeIds.has(id);
    });
  }
  return rows.filter((l) => l.active !== false);
}

export function TasksPlanningPage() {
  const { user } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);
  const [currentStart, setCurrentStart] = useState(() => new Date());
  const startDate = format(currentStart, 'yyyy-MM-dd');
  const endDate = format(addDays(currentStart, 30), 'yyyy-MM-dd');

  const [adminOwnerId, setAdminOwnerId] = useState('');
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);

  const [rawListings, setRawListings] = useState<PlanningListingRow[]>([]);
  const [activeListingIds, setActiveListingIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadActiveIds = useCallback(async () => {
    try {
      const ids = await fetchActiveListingIdSet();
      setActiveListingIds(ids);
    } catch {
      setActiveListingIds(null);
    }
  }, []);

  useEffect(() => {
    void loadActiveIds();
  }, [loadActiveIds, planningOwnerId, scope.ownerId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!scope.canAccessAllOwners && !scope.ownerId) {
        throw new Error('Impossible de déterminer le ownerId de la session.');
      }
      const res = await tasksService.getReservationPlanning({
        startDate,
        endDate,
        ownerId: planningOwnerId,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Réponse planning invalide');
      }
      setRawListings(res.data.listings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement planning');
      setRawListings([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, planningOwnerId, scope.canAccessAllOwners, scope.ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeListings = useMemo(() => {
    if (activeListingIds === null) return [];
    return filterActivePlanningListings(rawListings, activeListingIds);
  }, [rawListings, activeListingIds]);

  const isPageLoading = loading || activeListingIds === null;

  const filteredForGrid = useMemo(() => {
    if (!selectedListingIds.length) return activeListings;
    return activeListings.filter((l) => selectedListingIds.includes(String(l.listingId || '')));
  }, [activeListings, selectedListingIds]);

  const normalized = useMemo(() => normalizePlanningListings(filteredForGrid), [filteredForGrid]);

  const planningWindowDays = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
    } catch {
      return 31;
    }
  }, [startDate, endDate]);

  const goToToday = () => setCurrentStart(new Date());
  const goPrevDay = () => setCurrentStart((d) => subDays(d, 1));
  const goNextDay = () => setCurrentStart((d) => addDays(d, 1));
  const goPrevWeek = () => setCurrentStart((d) => subDays(d, 7));
  const goNextWeek = () => setCurrentStart((d) => addDays(d, 7));

  return (
    <DashboardWrapper breadcrumb={[]}>
      <Box sx={{ p: { xs: 1.5, md: 2.5 }, pb: 3, bgcolor: t.bg0 }}>
        {!isPageLoading && activeListings.length > 0 && (
          <TasksStayTodayOpsBar listings={activeListings} planningWindowDays={planningWindowDays} />
        )}

        {isPageLoading && (
          <Paper sx={{ p: 3, border: `1px solid ${t.border}`, bgcolor: t.bg1, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', color: t.text3 }}>
              <CircularProgress size={18} sx={{ color: t.primary }} />
              <Typography sx={{ fontSize: 13 }}>Chargement du planning…</Typography>
            </Stack>
          </Paper>
        )}

        {!isPageLoading && error && (
          <Alert severity="error" sx={{ borderRadius: 1.5, fontSize: 13 }}>{error}</Alert>
        )}

        {!isPageLoading && !error && (
          <Box
            sx={{
              bgcolor: t.bg1,
              borderRadius: 1.5,
              border: `1px solid ${t.border}`,
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
              width: '100%',
              minWidth: 0,
            }}
          >
            <TasksStayPlanningToolbar
              startDate={startDate}
              endDate={endDate}
              onGoToday={goToToday}
              onPrevDay={goPrevDay}
              onNextDay={goNextDay}
              onPrevWeek={goPrevWeek}
              onNextWeek={goNextWeek}
              showOwnerFilter={scope.canAccessAllOwners}
              ownerSelectValue={adminOwnerId}
              ownerOptions={ownerOptions}
              onOwnerChange={setAdminOwnerId}
              allListings={activeListings}
              selectedListingIds={selectedListingIds}
              onSelectedListingsChange={setSelectedListingIds}
            />
            <TasksStayGrid listings={normalized} startDate={startDate} endDate={endDate} />
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
