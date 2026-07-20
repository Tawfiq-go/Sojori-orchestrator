import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Reservation, ReservationPlan, PlanListQuery } from '../features/planReservation/types';
import { applyPlanListQuery } from '../features/planReservation/applyPlanListQuery';
import * as fulltaskApi from '../services/fulltaskApi';
import tasksService from '../services/fulltaskTasksService';
import {
  loadUiPlanListOrdersByOwner,
  uiPlanListOrderForPlan,
  type UiPlanListOrderCache,
} from '../utils/uiPlanListOrderByOwner';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
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
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
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
  const [totalCount, setTotalCount] = useState(0);
  const [summariesById, setSummariesById] = useState<Record<string, PlanListSummaryDoc>>({});
  const [plans, setPlans] = useState<Record<string, ReservationPlan>>({});
  const [staffNames, setStaffNames] = useState<Record<string, string>>({});
  const [orderByOwner, setOrderByOwner] = useState<UiPlanListOrderCache>({});
  const [loading, setLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [planLoadingId, setPlanLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState<PlanListQuery>({
    filters: [],
    search: '',
    sort: 'arrival_asc',
    listingId: '',
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [listHasMore, setListHasMore] = useState(false);
  const [listingOptions, setListingOptions] = useState<{ id: string; name: string }[]>([]);

  const listingNamesRef = useRef<Record<string, string>>({});
  const hasLoadedRef = useRef(false);
  const listSeqRef = useRef(0);

  const selectedId = searchParams.get('reservationId') || undefined;

  const loadPlanDetail = useCallback(
    async (
      reservationId: string,
      names: Record<string, string>,
      ownerCache: UiPlanListOrderCache,
      ownerId?: string,
      opts?: { keepArchived?: boolean },
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
        if (planDoc.status === 'annule') {
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
        if (
          (planDoc.status === 'archive' || planDoc.status === 'archived') &&
          !opts?.keepArchived
        ) {
          setReservations((prev) => prev.filter((r) => r.id !== reservationId));
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

  const loadList = useCallback(
    async (query: PlanListQuery, opts?: { silent?: boolean }): Promise<Record<string, PlanListSummaryDoc>> => {
      const seq = ++listSeqRef.current;
      if (opts?.silent) {
        setListRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const appliedSearch = query.search.trim();
        const listingIdsForSearch =
          appliedSearch.length > 0
            ? Object.entries(listingNamesRef.current)
                .filter(([, name]) => name.toLowerCase().includes(appliedSearch.toLowerCase()))
                .map(([id]) => id)
            : undefined;

        const includeArchived = query.filters.includes('archived');
        const ownerScope = requestOwnerId || undefined;
        const page = Math.max(1, query.page ?? 1);
        const [plansRes, staffRes, listingRows] = await Promise.all([
          fulltaskApi.listPlansSummary({
            limit: 100,
            page,
            filters: query.filters.length ? query.filters.join(',') : undefined,
            search: appliedSearch || undefined,
            listingIds: listingIdsForSearch?.length ? listingIdsForSearch.join(',') : undefined,
            listingId: query.listingId?.trim() || undefined,
            sort: query.sort,
            includeReservationId: selectedId || undefined,
            ownerId: ownerScope,
            includeArchived: includeArchived || undefined,
          }),
          fulltaskApi.listStaff(),
          (tasksService as { getListings: () => Promise<{ _id: string; name: string }[]> }).getListings(),
        ]);

        if (seq !== listSeqRef.current) return {};

        const namesMap: Record<string, string> = {};
        const options: { id: string; name: string }[] = [];
        for (const l of listingRows || []) {
          if (l._id) {
            namesMap[l._id] = l.name || 'Logement';
            options.push({ id: l._id, name: l.name || 'Logement' });
          }
        }
        options.sort((a, b) => a.name.localeCompare(b.name));
        listingNamesRef.current = namesMap;
        setListingOptions(options);

        const summaries: PlanListSummaryDoc[] = [];
        const plansPayload = plansRes?.data ?? plansRes;
        if (Array.isArray(plansPayload)) summaries.push(...(plansPayload as PlanListSummaryDoc[]));

        const meta = plansRes?.meta as
          | { total?: number; hasMore?: boolean; serverFiltered?: boolean; page?: number; limit?: number }
          | undefined;

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
        let viewResa: Reservation[] = [];
        for (const s of summaries) {
          if (!s.reservationId || s.status === 'annule') continue;
          const isArchived = s.status === 'archive' || s.status === 'archived' || Boolean(s.archived);
          if (isArchived && !includeArchived) continue;
          byId[s.reservationId] = s;
          viewResa.push(buildReservationViewFromSummary(s, namesMap[s.listingId] || 'Logement'));
        }

        // Fallback client si API distante n’a pas encore pagination/filtres (meta.total absent).
        if (!meta || typeof meta.total !== 'number') {
          viewResa = applyPlanListQuery(viewResa, query, selectedId);
        }

        setSummariesById(byId);
        setReservations(viewResa);
        setTotalCount(typeof meta?.total === 'number' ? meta.total : viewResa.length);
        setListHasMore(Boolean(meta?.hasMore));

        hasLoadedRef.current = true;
        return byId;
      } catch (e) {
        if (seq !== listSeqRef.current) return {};
        setReservations([]);
        setSummariesById({});
        if (!opts?.silent) {
          setPlans({});
        }
        setError(e instanceof Error ? e.message : 'Erreur chargement');
        return {};
      } finally {
        if (seq === listSeqRef.current) {
          if (opts?.silent) {
            setListRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [selectedId, requestOwnerId],
  );

  useEffect(() => {
    if (!scopeFetchReady) return;
    loadList(listQuery, { silent: hasLoadedRef.current });
  }, [listQuery, loadList, scopeFetchReady]);

  useEffect(() => {
    if (!selectedId || plans[selectedId] || planLoadingId === selectedId) return;
    const summary = summariesById[selectedId];
    let cancelled = false;
    (async () => {
      await loadPlanDetail(selectedId, staffNames, orderByOwner, summary?.ownerId, {
        keepArchived: listQuery.filters.includes('archived'),
      });
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, plans, planLoadingId, staffNames, orderByOwner, summariesById, loadPlanDetail, listQuery.filters]);

  const handleSelect = useCallback(
    async (id: string) => {
      setSearchParams({ reservationId: id });
      if (plans[id]) return;
      const summary = summariesById[id];
      await loadPlanDetail(id, staffNames, orderByOwner, summary?.ownerId, {
        keepArchived: listQuery.filters.includes('archived'),
      });
    },
    [setSearchParams, plans, staffNames, orderByOwner, summariesById, loadPlanDetail, listQuery.filters],
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
    const byId = await loadList(listQuery, { silent: true });
    if (selectedId) {
      await loadPlanDetail(selectedId, staffNames, orderByOwner, byId[selectedId]?.ownerId, {
        keepArchived: listQuery.filters.includes('archived'),
      });
    }
  }, [loadList, listQuery, selectedId, staffNames, orderByOwner, loadPlanDetail]);

  const handleSearchSubmit = useCallback(() => {
    setListQuery((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }));
  }, [searchInput]);

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setListQuery({ filters: [], search: '', sort: 'arrival_asc', listingId: '', page: 1 });
  }, []);

  const hasActiveQuery =
    listQuery.filters.length > 0 ||
    Boolean(listQuery.search.trim()) ||
    Boolean(listQuery.listingId?.trim());
  const showPlanLayout =
    !loading && !error && (totalCount > 0 || reservations.length > 0 || hasActiveQuery);

  return (
    <DashboardWrapper breadcrumb={['Tâches', 'Orchestration', 'Plans réservation']} compactMain>
      {!loading && showAdminConfigSource && (
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
            <b>Plans</b> : liste API ({totalCount || reservations.length}) · détail chargé au clic
            {hasActiveQuery ? ' · filtre serveur actif' : ''}
          </span>
          <Link
            to="/orchestration/config"
            style={{ color: '#0673b3', fontWeight: 700, fontFamily: 'Geist Mono, monospace' }}
          >
            ⚙️ Orchestration config →
          </Link>
        </div>
      )}
      {loading && reservations.length === 0 && (
        <div style={{ padding: 24, color: 'var(--t3, #7a756c)' }}>Chargement des plans…</div>
      )}
      {error && !loading && (
        <div style={{ padding: '8px 14px 0', color: '#c46506', fontSize: 12 }}>{error}</div>
      )}
      {!loading && !error && totalCount === 0 && reservations.length === 0 && !hasActiveQuery && (
        <div style={{ padding: 24, color: 'var(--t3, #7a756c)', fontSize: 13 }}>
          {showAdminConfigSource ? (
            <>
              Aucun plan en base. Configurez l&apos;orchestration sur{' '}
              <Link to="/orchestration/config">Orchestration config</Link>, puis créez une réservation
              (ou rejouez <code>create.reservation</code>) pour générer un plan.
            </>
          ) : (
            <>
              Aucun plan pour le moment. Les plans de séjour apparaissent automatiquement lorsque vous
              recevez une nouvelle réservation confirmée.
            </>
          )}
        </div>
      )}
      {showPlanLayout && (
        <PlanReservationPage
          reservations={reservations}
          totalCount={totalCount || reservations.length}
          plans={plans}
          initialId={selectedId}
          planLoadingId={planLoadingId}
          showAdminConfigSource={showAdminConfigSource}
          resolveOwnerDisplayName={resolveOwnerDisplayName}
          onSelect={handleSelect}
          onPlanUpdated={handlePlanUpdated}
          onPlanRefetch={handlePlanRefetch}
          listTitle="Plans"
          listQuery={listQuery}
          searchInput={searchInput}
          listRefreshing={listRefreshing}
          listingOptions={listingOptions}
          listHasMore={listHasMore}
          onFiltersChange={(filters) => setListQuery((prev) => ({ ...prev, filters, page: 1 }))}
          onSortChange={(sort) => setListQuery((prev) => ({ ...prev, sort, page: 1 }))}
          onSearchInputChange={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          onClearFilters={handleClearFilters}
          onListingIdChange={(listingId) => setListQuery((prev) => ({ ...prev, listingId, page: 1 }))}
          onPageChange={(page) => setListQuery((prev) => ({ ...prev, page }))}
        />
      )}
    </DashboardWrapper>
  );
}
