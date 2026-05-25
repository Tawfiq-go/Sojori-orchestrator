import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import PlanReservationPage from '../features/planReservation/PlanReservationPage';
import {
  buildPlanViewModel,
  buildReservationView,
  type FulltaskPlanDoc,
} from '../features/planReservation/buildPlanViewModel';
import type { Reservation, ReservationPlan } from '../features/planReservation/types';
import type { Reservation as ApiReservation } from '../types/reservations.types';
import * as fulltaskApi from '../services/fulltaskApi';
import tasksService from '../services/fulltaskTasksService';
import reservationsService from '../services/reservationsService';

function planToApiReservation(plan: FulltaskPlanDoc): ApiReservation {
  return {
    id: plan.reservationId,
    guestName: plan.guestName || 'Invité',
    arrivalDate: plan.checkIn,
    departureDate: plan.checkOut,
    reservationNumber: plan.reservationCode,
    sojoriId: plan.listingId,
    numberOfGuests: 1,
    adults: 1,
  } as ApiReservation;
}

export default function PlansReservationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [plans, setPlans] = useState<Record<string, ReservationPlan>>({});
  const [staffNames, setStaffNames] = useState<Record<string, string>>({});
  const [uiPlanListOrder, setUiPlanListOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedId = searchParams.get('reservationId') || undefined;

  const mergeDeepLink = useCallback(
    async (
      resaList: Reservation[],
      planRecord: Record<string, ReservationPlan>,
      planMap: Record<string, FulltaskPlanDoc>,
      listingNames: Record<string, string>,
      names: Record<string, string>,
      deepId: string,
    ): Promise<{ reservations: Reservation[]; plans: Record<string, ReservationPlan> }> => {
      if (resaList.some((r) => r.id === deepId) && planRecord[deepId]) {
        return { reservations: resaList, plans: planRecord };
      }

      let planDoc: FulltaskPlanDoc | null = planMap[deepId] ?? null;
      if (!planDoc) {
        try {
          const planRes = await fulltaskApi.getPlan(deepId);
          const raw = planRes?.data ?? planRes;
          if (raw && typeof raw === 'object' && (raw as FulltaskPlanDoc).reservationId) {
            planDoc = raw as FulltaskPlanDoc;
          }
        } catch {
          planDoc = null;
        }
      }

      if (!planDoc) {
        return { reservations: resaList, plans: planRecord };
      }

      let apiResa: ApiReservation | null = null;
      try {
        apiResa = await reservationsService.getById(deepId);
      } catch {
        apiResa = null;
      }
      if (!apiResa) apiResa = planToApiReservation(planDoc);

      const listingName = listingNames[planDoc.listingId] || listingNames[String(apiResa.sojoriId)] || 'Logement';
      const viewResa = buildReservationView(apiResa, planDoc, listingName);
      let deepOrder: string[] = [];
      try {
        const orchRaw = await fulltaskApi.getOrchestrationConfig('global');
        const doc = (orchRaw as { data?: { uiPlanListOrder?: string[] } })?.data ?? orchRaw;
        if (Array.isArray((doc as { uiPlanListOrder?: string[] })?.uiPlanListOrder)) {
          deepOrder = (doc as { uiPlanListOrder: string[] }).uiPlanListOrder;
        }
      } catch {
        deepOrder = [];
      }
      const nextPlans = {
        ...planRecord,
        [deepId]: buildPlanViewModel(
          planDoc,
          names,
          deepOrder.length ? deepOrder : planDoc.uiPlanListOrder,
        ),
      };
      const without = resaList.filter((r) => r.id !== deepId);
      return {
        reservations: [viewResa, ...without],
        plans: nextPlans,
      };
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, staffRes, listingRows, orchRes] = await Promise.all([
        fulltaskApi.listPlans({ limit: 300 }),
        fulltaskApi.listStaff(),
        (tasksService as { getListings: () => Promise<{ _id: string; name: string }[]> }).getListings(),
        fulltaskApi.getOrchestrationConfig('global').catch(() => null),
      ]);

      const orchDoc = (orchRes as { data?: { uiPlanListOrder?: string[] } } | null)?.data ?? orchRes;
      const planListOrder = Array.isArray(
        (orchDoc as { uiPlanListOrder?: string[] } | null)?.uiPlanListOrder,
      )
        ? (orchDoc as { uiPlanListOrder: string[] }).uiPlanListOrder
        : [];
      setUiPlanListOrder(planListOrder);

      const planDocs: FulltaskPlanDoc[] = [];
      const plansPayload = plansRes?.data ?? plansRes;
      if (Array.isArray(plansPayload)) planDocs.push(...plansPayload);

      const listingNames: Record<string, string> = {};
      for (const l of listingRows || []) {
        if (l._id) listingNames[l._id] = l.name || 'Logement';
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

      const viewPlans: Record<string, ReservationPlan> = {};
      const viewResa: Reservation[] = [];

      const enrichedResas = await Promise.all(
        planDocs.map(async (planDoc) => {
          const rid = planDoc?.reservationId;
          if (!rid || planDoc.status === 'annule' || planDoc.status === 'archive') return null;
          let apiResa = planToApiReservation(planDoc);
          try {
            const full = await reservationsService.getById(rid);
            if (full) {
              apiResa = {
                ...apiResa,
                ...full,
                id: rid,
                reservationNumber:
                  full.reservationNumber?.trim() ||
                  planDoc.reservationCode?.trim() ||
                  apiResa.reservationNumber,
                guestName: full.guestName || planDoc.guestName || apiResa.guestName,
              };
            }
          } catch {
            /* plan seul si srv-reservations indisponible */
          }
          return { planDoc, apiResa };
        }),
      );

      for (const row of enrichedResas) {
        if (!row) continue;
        const { planDoc, apiResa } = row;
        const rid = planDoc.reservationId;
        const listingName = listingNames[planDoc.listingId] || 'Logement';
        viewPlans[rid] = buildPlanViewModel(
          planDoc,
          names,
          planListOrder.length ? planListOrder : planDoc.uiPlanListOrder,
        );
        viewResa.push(buildReservationView(apiResa, planDoc, listingName));
      }

      viewResa.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());

      let finalResa = viewResa;
      let finalPlans = viewPlans;
      if (selectedId) {
        const planMap: Record<string, FulltaskPlanDoc> = {};
        for (const p of planDocs) {
          if (p.reservationId) planMap[p.reservationId] = p;
        }
        const merged = await mergeDeepLink(
          viewResa,
          viewPlans,
          planMap,
          listingNames,
          names,
          selectedId,
        );
        finalResa = merged.reservations;
        finalPlans = merged.plans;
      }

      setReservations(finalResa);
      setPlans(finalPlans);
    } catch (e) {
      setReservations([]);
      setPlans({});
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [selectedId, mergeDeepLink]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlanArchived = useCallback(
    (id: string) => {
      setPlans((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setSearchParams({});
    },
    [setSearchParams],
  );

  const handleSelect = useCallback(
    async (id: string) => {
      setSearchParams({ reservationId: id });
      try {
        const planRes = await fulltaskApi.getPlan(id);
        const raw = planRes?.data ?? planRes;
          if (raw && typeof raw === 'object' && (raw as FulltaskPlanDoc).reservationId) {
            const planDoc = raw as FulltaskPlanDoc;
            if (planDoc.status === 'annule' || planDoc.status === 'archive') {
              setPlans((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              });
              setReservations((prev) => prev.filter((r) => r.id !== id));
              return;
            }
            const order = uiPlanListOrder.length ? uiPlanListOrder : planDoc.uiPlanListOrder;
            setPlans((prev) => ({
              ...prev,
              [id]: buildPlanViewModel(planDoc, staffNames, order),
            }));
          }
      } catch {
        /* garde le plan liste si GET échoue */
      }
    },
    [setSearchParams, staffNames, uiPlanListOrder],
  );

  const planCount = Object.keys(plans).length;

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
            <b>Plans</b> : uniquement les réservations avec un plan srv-fulltask ({planCount}). Filtre par
            résa :{' '}
            <code style={{ fontFamily: 'Geist Mono, monospace' }}>?reservationId=…</code>
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
          onSelect={handleSelect}
          onPlanRefetch={load}
          onPlanArchived={handlePlanArchived}
          listTitle="Plans"
        />
      )}
    </DashboardWrapper>
  );
}
