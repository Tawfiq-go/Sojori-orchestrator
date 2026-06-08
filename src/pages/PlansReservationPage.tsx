import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAuth } from '../hooks/useAuth';
import { canSelectOwnerInAdminFilter } from '../utils/taskScope.utils';
import PlanReservationPage from '../features/planReservation/PlanReservationPage';
import {
  buildPlanViewModel,
  buildReservationViewFromSummary,
  type FulltaskPlanDoc,
  type PlanListSummaryDoc,
} from '../features/planReservation/buildPlanViewModel';
import type { Reservation, ReservationPlan } from '../features/planReservation/types';
import * as fulltaskApi from '../services/fulltaskApi';
import tasksService from '../services/fulltaskTasksService';
import {
  loadUiPlanListOrdersByOwner,
  uiPlanListOrderForPlan,
  type UiPlanListOrderCache,
} from '../utils/uiPlanListOrderByOwner';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import { ownerDisplayNameFromId } from '../utils/ownerDisplay.utils';
import { getOwnersAllPages } from '../features/staff/services/serverApi.task';

export default function PlansReservationPage() {
  const { user } = useAuth();
  const showAdminConfigSource = useMemo(
    () => canSelectOwnerInAdminFilter(user),
    [user],
  );
  const { owners: adminOwners } = useAdminOwnerFilter();
  const { ownerKey: scopedOwnerKey, ownerDisplayName: scopedOwnerName } = useFulltaskConfigOwner();
  const [ownerRows, setOwnerRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    let cancelled = false;
    getOwnersAllPages({ search_text: '' })
      .then((rows) => {
        if (!cancelled) setOwnerRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setOwnerRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ownersForLabels = adminOwners.length > 0 ? adminOwners : ownerRows;

  const resolveOwnerDisplayName = useCallback(
    (ownerId?: string) => {
      const id = String(ownerId ?? '').trim();
      if (!id) return '—';
      const fromList = ownerDisplayNameFromId(id, ownersForLabels);
      if (fromList && fromList !== '—' && fromList !== id) return fromList;
      if (scopedOwnerKey === id && scopedOwnerName) return scopedOwnerName;
      return fromList;
    },
    [ownersForLabels, scopedOwnerKey, scopedOwnerName],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [summariesById, setSummariesById] = useState<Record<string, PlanListSummaryDoc>>({});
  const [plans, setPlans] = useState<Record<string, ReservationPlan>>({});
  const [staffNames, setStaffNames] = useState<Record<string, string>>({});
  const [orderByOwner, setOrderByOwner] = useState<UiPlanListOrderCache>({});
  const [loading, setLoading] = useState(true);
  const [planLoadingId, setPlanLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedId = searchParams.get('reservationId') || undefined;

  const loadPlanDetail = useCallback(
    async (
      reservationId: string,
      names: Record<string, string>,
      ownerCache: UiPlanListOrderCache,
      ownerId?: string,
    ) => {
      setPlanLoadingId(reservationId);
      try {
        const ownerKeys = ownerId ? [ownerId] : [];
        const mergedCache =
          ownerKeys.length > 0
            ? { ...ownerCache, ...(await loadUiPlanListOrdersByOwner(ownerKeys)) }
            : ownerCache;

        const planRes = await fulltaskApi.getPlan(reservationId);
        const raw = planRes?.data ?? planRes;
        if (!raw || typeof raw !== 'object' || !(raw as FulltaskPlanDoc).reservationId) {
          return;
        }
        const planDoc = raw as FulltaskPlanDoc;
        if (planDoc.status === 'annule' || planDoc.status === 'archive') {
          setReservations((prev) => prev.filter((r) => r.id !== reservationId));
          setPlans((prev) => {
            const next = { ...prev };
            delete next[reservationId];
            return next;
          });
          setSummariesById((prev) => {
            const next = { ...prev };
            delete next[reservationId];
            return next;
          });
          return;
        }
        if (ownerKeys.length > 0) {
          setOrderByOwner((prev) => ({ ...prev, ...mergedCache }));
        }
        setPlans((prev) => ({
          ...prev,
          [reservationId]: buildPlanViewModel(
            planDoc,
            names,
            uiPlanListOrderForPlan(planDoc, mergedCache),
          ),
        }));
      } catch {
        /* garde liste si GET échoue */
      } finally {
        setPlanLoadingId((cur) => (cur === reservationId ? null : cur));
      }
    },
    [],
  );

  const loadList = useCallback(async (): Promise<Record<string, PlanListSummaryDoc>> => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, staffRes, listingRows] = await Promise.all([
        fulltaskApi.listPlansSummary({ limit: 300 }),
        fulltaskApi.listStaff(),
        (tasksService as { getListings: () => Promise<{ _id: string; name: string }[]> }).getListings(),
      ]);

      const summaries: PlanListSummaryDoc[] = [];
      const plansPayload = plansRes?.data ?? plansRes;
      if (Array.isArray(plansPayload)) summaries.push(...(plansPayload as PlanListSummaryDoc[]));

      const namesMap: Record<string, string> = {};
      for (const l of listingRows || []) {
        if (l._id) namesMap[l._id] = l.name || 'Logement';
      }

      const names: Record<string, string> = {};
      const staffList = staffRes?.data ?? staffRes?.staff ?? staffRes;
      if (Array.isArray(staffList)) {
        for (const s of staffList) {
          const id = String(s._id || s.id || '');
          const label = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.name || id;
          if (id) names[id] = label;
        }
      }
      setStaffNames(names);

      const byId: Record<string, PlanListSummaryDoc> = {};
      const viewResa: Reservation[] = [];
      for (const s of summaries) {
        if (!s.reservationId || s.status === 'annule' || s.status === 'archive') continue;
        byId[s.reservationId] = s;
        viewResa.push(
          buildReservationViewFromSummary(s, namesMap[s.listingId] || 'Logement'),
        );
      }
      viewResa.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());

      setSummariesById(byId);
      setReservations(viewResa);
      setPlans({});
      return byId;
    } catch (e) {
      setReservations([]);
      setSummariesById({});
      setPlans({});
      setError(e instanceof Error ? e.message : 'Erreur chargement');
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId || plans[selectedId] || planLoadingId === selectedId) return;
    const summary = summariesById[selectedId];
    let cancelled = false;
    (async () => {
      await loadPlanDetail(selectedId, staffNames, orderByOwner, summary?.ownerId);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, plans, planLoadingId, staffNames, orderByOwner, summariesById, loadPlanDetail]);

  const handleSelect = useCallback(
    async (id: string) => {
      setSearchParams({ reservationId: id });
      if (plans[id]) return;
      const summary = summariesById[id];
      await loadPlanDetail(id, staffNames, orderByOwner, summary?.ownerId);
    },
    [setSearchParams, plans, staffNames, orderByOwner, summariesById, loadPlanDetail],
  );

  const applyPlanDoc = useCallback(
    (planDoc: FulltaskPlanDoc) => {
      const reservationId = planDoc.reservationId;
      setPlans((prev) => ({
        ...prev,
        [reservationId]: buildPlanViewModel(
          planDoc,
          staffNames,
          uiPlanListOrderForPlan(planDoc, orderByOwner),
        ),
      }));
    },
    [staffNames, orderByOwner],
  );

  const handlePlanUpdated = useCallback(
    (planDoc?: FulltaskPlanDoc) => {
      if (planDoc?.reservationId) applyPlanDoc(planDoc);
    },
    [applyPlanDoc],
  );

  const handlePlanRefetch = useCallback(async () => {
    const byId = await loadList();
    if (selectedId) {
      await loadPlanDetail(selectedId, staffNames, orderByOwner, byId[selectedId]?.ownerId);
    }
  }, [loadList, selectedId, staffNames, orderByOwner, loadPlanDetail]);

  const planCount = reservations.length;

  return (
    <DashboardWrapper breadcrumb={['Tâches', 'Orchestration', 'Plans réservation']} compactMain>
      {!loading && (
        <div
          style={{
            margin: '0 0 10px',
            padding: '8px 14px',
            background: 'rgba(6,115,179,0.08)',
            border: '1px solid rgba(6,115,179,0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: '#0673b3',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span>
            <b>Plans</b> : liste légère ({planCount}) · détail chargé au clic
          </span>
          <Link
            to="/tasks/orchestration-config"
            style={{ color: '#0673b3', fontWeight: 700, fontFamily: 'Geist Mono, monospace' }}
          >
            ⚙️ Orchestration config →
          </Link>
        </div>
      )}
      {loading && (
        <div style={{ padding: 24, color: 'var(--t3, #7a756c)' }}>Chargement des plans…</div>
      )}
      {error && !loading && (
        <div style={{ padding: '8px 14px 0', color: '#c46506', fontSize: 12 }}>{error}</div>
      )}
      {!loading && !error && reservations.length === 0 && (
        <div style={{ padding: 24, color: 'var(--t3, #7a756c)', fontSize: 13 }}>
          Aucun plan en base. Configurez l&apos;orchestration sur{' '}
          <Link to="/tasks/orchestration-config">Orchestration config</Link>, puis créez une réservation
          (ou rejouez <code>create.reservation</code>) pour générer un plan.
        </div>
      )}
      {!loading && reservations.length > 0 && (
        <PlanReservationPage
          reservations={reservations}
          plans={plans}
          initialId={selectedId}
          planLoadingId={planLoadingId}
          showAdminConfigSource={showAdminConfigSource}
          resolveOwnerDisplayName={resolveOwnerDisplayName}
          onSelect={handleSelect}
          onPlanUpdated={handlePlanUpdated}
          onPlanRefetch={handlePlanRefetch}
          listTitle="Plans"
        />
      )}
    </DashboardWrapper>
  );
}
