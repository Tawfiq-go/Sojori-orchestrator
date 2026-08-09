// ════════════════════════════════════════════════════════════════════
// TeamWeekView — planning équipe : lignes staff (groupées par owner),
// colonnes 15 jours, tâches en chips compactes. Première vue de /tasks/team.
// Données : fetchTaskNewPlanning (résas + tâches fulltask) re-pivotées
// staff × jour — aucun endpoint dédié.
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Divider, Menu, MenuItem, ListItemText } from '@mui/material';
import { addDays, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import {
  fetchTaskNewPlanning,
  type PlanningListingRow,
} from '../../../services/planningFulltaskMerge';
import * as fulltaskApi from '../../../services/fulltaskApi';
import { normalizeOwnerId } from '../../../utils/fulltaskMappers';
import type { Staff } from './types';
import { labelForTaskTypeId } from './fulltaskTaskTypes';
import './teamWeekView.css';

const WINDOW_DAYS = 15;

const CANCELLED_STATUSES = new Set(['CANCELLED_ADMIN', 'CANCELLED_CUSTOMER', 'ARCHIVED']);
const MAX_CHIPS_COLLAPSED = 3;

/** Parcours staff (comme WhatsApp) — dérivé du statut legacy planning. */
type Lifecycle =
  | 'waiting_accept'
  | 'waiting_start'
  | 'waiting_finish'
  | 'finished'
  | 'none';

type TeamTask = {
  taskId: string | null;
  reservationId: string;
  listingId: string;
  day: string;
  time: string;
  label: string;
  /** Type fulltask granulaire (receive_arrival, checkout_cleaning…). */
  taskType: string;
  kind: 'cleaning' | 'arrival' | 'departure' | 'service' | 'other';
  listingName: string;
  guestName: string;
  staffId: string | null;
  done: boolean;
  lifecycle: Lifecycle;
  ownerId: string;
};

function lifecycleFromStatus(status: string, hasStaff: boolean): Lifecycle {
  if (!hasStaff) return 'none';
  const s = String(status || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'DONE') return 'finished';
  if (s === 'IN_PROGRESS' || s === 'DOING') return 'waiting_finish';
  if (s === 'ACCEPTED' || s === 'CONFIRMED') return 'waiting_start';
  if (
    s === 'ASSIGNED' ||
    s === 'CREATED' ||
    s === 'PENDING_PARTNER' ||
    s === 'NEW'
  ) {
    return 'waiting_accept';
  }
  return 'waiting_accept';
}

function lifecycleCurrentShort(lc: Lifecycle): string {
  switch (lc) {
    case 'waiting_accept':
      return 'En attente accept.';
    case 'waiting_start':
      return 'Acceptée';
    case 'waiting_finish':
      return 'En cours';
    case 'finished':
      return 'Terminée';
    default:
      return 'À assigner';
  }
}

/** Badge chip : prochaine action claire. */
function lifecycleNextShort(lc: Lifecycle): string {
  switch (lc) {
    case 'waiting_accept':
      return '→ Accepter';
    case 'waiting_start':
      return '→ Commencer';
    case 'waiting_finish':
      return '→ Terminer';
    case 'finished':
      return 'OK';
    default:
      return '→ Assigner';
  }
}

function lifecycleNextAction(lc: Lifecycle): string | null {
  switch (lc) {
    case 'waiting_accept':
      return 'Accepter';
    case 'waiting_start':
      return 'Commencer';
    case 'waiting_finish':
      return 'Terminer';
    default:
      return null;
  }
}

type RowDef = {
  key: string;
  staff?: Staff;
  unassigned?: boolean;
  total: number;
  byDay: Map<string, TeamTask[]>;
};

type SectionDef = {
  ownerId: string;
  label: string;
  rows: RowDef[];
  taskCount: number;
};

function taskLabel(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('cleaning') || c.includes('menage')) return 'Ménage';
  if (c === 'registration') return 'Enregistrement';
  if (c.includes('arrival') || c === 'check_in') return 'Check-in';
  if (c.includes('departure') || c === 'check_out') return 'Check-out';
  if (c === 'transport') return 'Navette';
  if (c === 'groceries') return 'Courses';
  if (c === 'concierge') return 'Conciergerie';
  if (c === 'support') return 'Support';
  if (c === 'service_client') return 'Service client';
  return category || 'Tâche';
}

function taskKind(type: string): TeamTask['kind'] {
  if (type === 'cleaning') return 'cleaning';
  if (type === 'arrival' || type === 'registration') return 'arrival';
  if (type === 'departure') return 'departure';
  if (type === 'transport' || type === 'concierge' || type === 'support') return 'service';
  return 'other';
}

function pivotTasks(listings: PlanningListingRow[], dayMin: string, dayMax: string): TeamTask[] {
  const out: TeamTask[] = [];
  for (const listing of listings) {
    for (const resa of listing.reservations || []) {
      for (const it of resa.timeline || []) {
        if (it.isTask === false) continue;
        const status = String(it.status || 'CREATED');
        if (CANCELLED_STATUSES.has(status)) continue;
        if (!it.scheduledFor) continue;
        const dt = new Date(it.scheduledFor);
        if (Number.isNaN(dt.getTime())) continue;
        const day = format(dt, 'yyyy-MM-dd');
        if (day < dayMin || day > dayMax) continue;
        const data = (it.data || {}) as Record<string, unknown>;
        // scheduledFor porte l'heure métier (inferTaskPlannedIso) ; minuit UTC
        // subsiste seulement quand aucune heure n'est connue → pas d'affichage.
        const dayLevel = dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0;
        const staffId = it.staffId ? String(it.staffId) : null;
        const lifecycle = lifecycleFromStatus(status, Boolean(staffId));
        const taskType = String(
          it.category || data.type || it.type || '',
        ).toLowerCase();
        out.push({
          taskId: data.taskId ? String(data.taskId) : null,
          reservationId: resa.reservationId,
          listingId: String(listing.listingId || ''),
          day,
          time: dayLevel ? '' : format(dt, 'HH:mm'),
          label: taskLabel(String(it.category || it.type || '')),
          taskType,
          kind: taskKind(String(it.type || '')),
          listingName: listing.listingName || 'Sans nom',
          guestName: resa.guestName || '',
          staffId,
          done: lifecycle === 'finished',
          lifecycle,
          ownerId: normalizeOwnerId(data.ownerId) || '',
        });
      }
    }
  }
  out.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return out;
}

type ListingOpt = { id: string; name: string; cityId?: string; city?: string };
type CityOpt = { id: string; name: string };

/** Aligné srv-fulltask `staffMatchesListingAccess`. */
function hasAllAccess(ids: string[] | undefined): boolean {
  if (!ids?.length) return false;
  return ids.some((id) => {
    const s = String(id).trim();
    return s === 'All' || s === 'ALL';
  });
}

function staffMatchesListingAccess(
  s: Staff,
  listingId: string,
  listingCityId?: string | null,
): boolean {
  const listingIds = s.allowedListingIds || [];
  const cityIds = s.allowedCityIds || [];
  if (!listingIds.length && !cityIds.length) return true;
  if (hasAllAccess(listingIds)) return true;
  const listingKey = String(listingId || '').trim();
  if (listingKey && listingIds.some((id) => String(id) === listingKey)) return true;
  if (hasAllAccess(cityIds)) return true;
  const cityKey = String(listingCityId || '').trim();
  if (cityKey && cityIds.some((id) => String(id) === cityKey)) return true;
  return false;
}

function staffMatchesCityAccess(s: Staff, cityId: string, listingsInCity: ListingOpt[]): boolean {
  const listingIds = s.allowedListingIds || [];
  const cityIds = s.allowedCityIds || [];
  if (!listingIds.length && !cityIds.length) return true;
  if (hasAllAccess(listingIds) || hasAllAccess(cityIds)) return true;
  if (cityIds.some((id) => String(id) === String(cityId))) return true;
  return listingsInCity.some((l) => listingIds.some((id) => String(id) === String(l.id)));
}

/**
 * Annonces réellement accessibles à un staff, en libellés — affiché sous son
 * nom dans le planning. « Toutes » quand l'accès n'est pas restreint (sentinel
 * All, ou ni listing ni ville configurés = accès large historique).
 */
function staffListingLabels(
  s: Staff,
  listings: ListingOpt[],
): { labels: string[]; all: boolean } {
  const listingIds = s.allowedListingIds || [];
  const cityIds = s.allowedCityIds || [];
  if ((!listingIds.length && !cityIds.length) || hasAllAccess(listingIds) || hasAllAccess(cityIds)) {
    return { labels: [], all: true };
  }
  const labels = listings
    .filter((l) =>
      staffMatchesListingAccess(s, String(l.id), l.cityId != null ? String(l.cityId) : null),
    )
    .map((l) => l.name);
  return { labels, all: false };
}

function staffMatchesTaskType(s: Staff, taskType: string): boolean {
  const types = (s.allowedTaskTypes || []).map(String).filter(Boolean);
  if (!taskType) return true;
  if (!types.length) return false;
  return types.includes(taskType);
}

/** null = OK ; sinon message refus assignation. */
function staffAssignBlockReason(
  s: Staff,
  t: TeamTask,
  listingsById: Map<string, ListingOpt>,
): string | null {
  if (t.ownerId && normalizeOwnerId(s.ownerId) && normalizeOwnerId(s.ownerId) !== t.ownerId) {
    return `${s.fullName} n’appartient pas au même PM que cette tâche`;
  }
  const listing = listingsById.get(String(t.listingId));
  const listingId = listing?.id || String(t.listingId || '');
  const cityId = listing?.cityId;
  if (!listingId) return 'Annonce introuvable pour cette tâche';
  if (!staffMatchesListingAccess(s, listingId, cityId)) {
    return `${s.fullName} n’a pas accès à « ${t.listingName || 'cette annonce'} »`;
  }
  if (!staffMatchesTaskType(s, t.taskType)) {
    const typeLabel = labelForTaskTypeId(t.taskType) || t.label || t.taskType;
    const types = (s.allowedTaskTypes || []).map(String).filter(Boolean);
    if (!types.length) {
      return `${s.fullName} n’a aucun type de tâche activé — activez « ${typeLabel} » dans Config Équipe`;
    }
    return `${s.fullName} n’a pas le type « ${typeLabel} » — activez-le dans Config Équipe`;
  }
  return null;
}

type Props = {
  staff: Staff[];
  listings?: ListingOpt[];
  cities?: CityOpt[];
  filterOwnerId?: string;
  ownerOptions: Array<{ id: string; label: string }>;
  onOpenStaff?: (staffId: string) => void;
};

export default function TeamWeekView({
  staff,
  listings = [],
  cities = [],
  filterOwnerId,
  ownerOptions,
  onOpenStaff,
}: Props) {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(() => startOfDay(new Date()));
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  /** Refresh partiel — ne masque pas la grille (assign / accept / nav). */
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [cityFilterId, setCityFilterId] = useState<string>('');
  const [listingFilterId, setListingFilterId] = useState<string>('');
  const [taskMenu, setTaskMenu] = useState<{
    anchor: HTMLElement;
    task: TeamTask;
  } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [acting, setActing] = useState(false);
  /**
   * Mettre en avant un statut staff :
   * waiting_start = acceptée, pas encore commencée ni terminée.
   */
  const [focusLifecycle, setFocusLifecycle] = useState<
    'all' | 'waiting_accept' | 'waiting_start' | 'waiting_finish'
  >('all');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropStaffId, setDropStaffId] = useState<string | null>(null);
  /** Badge de statut (mode enrichi) survolé pendant un drag — surlignage visuel de la cible. */
  const [dropBadge, setDropBadge] = useState<{
    key: string;
    to: 'waiting_start' | 'waiting_finish' | 'finished';
  } | null>(null);
  const [dropDeniedStaffId, setDropDeniedStaffId] = useState<string | null>(null);
  const [dropUnassignKey, setDropUnassignKey] = useState<string | null>(null);
  const dragMovedRef = useRef(false);
  const dragTaskRef = useRef<TeamTask | null>(null);
  const requestIdRef = useRef(0);

  const days = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(startDate, i)),
    [startDate, WINDOW_DAYS],
  );
  const dayKeys = useMemo(() => days.map((d) => format(d, 'yyyy-MM-dd')), [days]);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true || hasLoadedOnce;
      const requestId = ++requestIdRef.current;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }
      try {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(addDays(startDate, WINDOW_DAYS - 1), 'yyyy-MM-dd');
        const result = await fetchTaskNewPlanning({
          startDate: startStr,
          endDate: endStr,
          ownerId: filterOwnerId,
        });
        if (requestId !== requestIdRef.current) return;
        if (result.success && result.data) {
          setTasks(pivotTasks(result.data.listings || [], startStr, endStr));
          setError(null);
          setHasLoadedOnce(true);
        } else {
          if (!silent) setError(result.message || 'Erreur chargement planning équipe');
          else toast.error(result.message || 'Erreur refresh planning');
        }
      } catch (e: unknown) {
        if (requestId !== requestIdRef.current) return;
        const msg = e instanceof Error ? e.message : 'Erreur réseau';
        if (!silent) setError(msg);
        else toast.error(msg);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [startDate, filterOwnerId, hasLoadedOnce],
  );

  useEffect(() => {
    void load({ silent: hasLoadedOnce });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on période / owner only
  }, [startDate, filterOwnerId, WINDOW_DAYS]);

  const listingsById = useMemo(() => {
    const m = new Map<string, ListingOpt>();
    for (const l of listings) m.set(String(l.id), l);
    return m;
  }, [listings]);

  const cityOptions = useMemo(
    () => [...cities].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [cities],
  );

  const listingsInCity = useMemo(() => {
    if (!cityFilterId) return listings;
    const cityName = (cityOptions.find((c) => c.id === cityFilterId)?.name || '').trim().toLowerCase();
    return listings.filter((l) => {
      if (String(l.cityId || '') === cityFilterId) return true;
      if (cityName && String(l.city || '').trim().toLowerCase() === cityName) return true;
      return false;
    });
  }, [listings, cityFilterId, cityOptions]);

  const listingOptions = useMemo(() => {
    const src = cityFilterId ? listingsInCity : listings;
    return [...src].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [listings, listingsInCity, cityFilterId]);

  // Si l’annonce filtrée n’est plus dans la ville choisie → reset
  useEffect(() => {
    if (!listingFilterId || !cityFilterId) return;
    const ok = listingsInCity.some((l) => String(l.id) === listingFilterId);
    if (!ok) setListingFilterId('');
  }, [listingFilterId, cityFilterId, listingsInCity]);

  const selectedListing = useMemo(
    () => (listingFilterId ? listingsById.get(listingFilterId) : undefined),
    [listingsById, listingFilterId],
  );

  const filteredTasks = useMemo(() => {
    let rows = tasks;
    if (cityFilterId) {
      const ids = new Set(listingsInCity.map((l) => String(l.id)));
      rows = rows.filter((t) => ids.has(String(t.listingId)));
    }
    if (listingFilterId) {
      rows = rows.filter((t) => String(t.listingId) === listingFilterId);
    }
    return rows;
  }, [tasks, cityFilterId, listingFilterId, listingsInCity]);

  const eligibleStaff = useMemo(() => {
    // Actifs + inactifs (off) — comme avant ; le crash Config était taskTypeModes objet, pas ce filtre.
    const base = staff.filter((s) => s.status === 'active' || s.status === 'off');
    if (listingFilterId && selectedListing) {
      return base.filter((s) =>
        staffMatchesListingAccess(s, selectedListing.id, selectedListing.cityId),
      );
    }
    if (cityFilterId) {
      return base.filter((s) => staffMatchesCityAccess(s, cityFilterId, listingsInCity));
    }
    return base;
  }, [staff, listingFilterId, selectedListing, cityFilterId, listingsInCity]);

  const scopeLabel = useMemo(() => {
    if (listingFilterId && selectedListing) return selectedListing.name;
    if (cityFilterId) return cityOptions.find((c) => c.id === cityFilterId)?.name || 'Ville';
    return null;
  }, [listingFilterId, selectedListing, cityFilterId, cityOptions]);

  const sections = useMemo<SectionDef[]>(() => {
    const staffById = new Map(eligibleStaff.map((s) => [String(s._id), s]));
    const ownerLabel = (oid: string) => {
      if (!oid) return 'Autres';
      return ownerOptions.find((o) => o.id === oid)?.label || 'PM';
    };

    const byOwner = new Map<string, { staffRows: Map<string, RowDef>; unassigned: RowDef }>();
    const ensureOwner = (oid: string) => {
      let bucket = byOwner.get(oid);
      if (!bucket) {
        bucket = {
          staffRows: new Map(),
          unassigned: { key: `un-${oid}`, unassigned: true, total: 0, byDay: new Map() },
        };
        byOwner.set(oid, bucket);
      }
      return bucket;
    };

    for (const s of eligibleStaff) {
      const oid = normalizeOwnerId(s.ownerId) || '';
      const bucket = ensureOwner(oid);
      bucket.staffRows.set(String(s._id), {
        key: String(s._id),
        staff: s,
        total: 0,
        byDay: new Map(),
      });
    }

    for (const t of filteredTasks) {
      if (t.staffId && staffById.has(t.staffId)) {
        const s = staffById.get(t.staffId) as Staff;
        const bucket = ensureOwner(normalizeOwnerId(s.ownerId) || '');
        const row = bucket.staffRows.get(t.staffId);
        if (!row) continue;
        row.total += 1;
        const list = row.byDay.get(t.day) || [];
        list.push(t);
        row.byDay.set(t.day, list);
      } else {
        const bucket = ensureOwner(t.ownerId);
        bucket.unassigned.total += 1;
        const list = bucket.unassigned.byDay.get(t.day) || [];
        list.push(t);
        bucket.unassigned.byDay.set(t.day, list);
      }
    }

    const result: SectionDef[] = [];
    for (const [oid, bucket] of byOwner.entries()) {
      const staffRows = [...bucket.staffRows.values()].sort((a, b) => b.total - a.total);
      const rows: RowDef[] = [];
      // Toujours en tête : drop cible pour désassigner (glisser vers le haut)
      rows.push(bucket.unassigned);
      rows.push(...staffRows);
      if (staffRows.length === 0 && bucket.unassigned.total === 0) continue;
      const taskCount = rows.reduce((acc, r) => acc + r.total, 0);
      result.push({ ownerId: oid, label: ownerLabel(oid), rows, taskCount });
    }
    result.sort((a, b) => b.taskCount - a.taskCount);
    return result;
  }, [eligibleStaff, filteredTasks, ownerOptions]);

  const showSectionHeaders = sections.length > 1;
  const totalTasks = filteredTasks.length;
  const unassignedTotal = useMemo(
    () => filteredTasks.filter((t) => !t.staffId).length,
    [filteredTasks],
  );

  const lifecycleCounts = useMemo(() => {
    let waiting_accept = 0;
    let waiting_start = 0;
    let waiting_finish = 0;
    for (const t of filteredTasks) {
      if (!t.staffId) continue;
      if (t.lifecycle === 'waiting_accept') waiting_accept += 1;
      else if (t.lifecycle === 'waiting_start') waiting_start += 1;
      else if (t.lifecycle === 'waiting_finish') waiting_finish += 1;
    }
    return { waiting_accept, waiting_start, waiting_finish };
  }, [filteredTasks]);

  const toggleCell = (key: string) => {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const staffCanReceiveTask = useCallback(
    (s: Staff, t: TeamTask): boolean => !staffAssignBlockReason(s, t, listingsById),
    [listingsById],
  );

  const refuseAssign = useCallback(
    (s: Staff | undefined, t: TeamTask) => {
      if (!s) {
        toast.error('Staff introuvable');
        return;
      }
      const reason = staffAssignBlockReason(s, t, listingsById);
      toast.error(reason || `Impossible d’assigner à ${s.fullName}`);
    },
    [listingsById],
  );

  const assignCandidates = useMemo(() => {
    if (!taskMenu) return [];
    return eligibleStaff.filter((s) => staffCanReceiveTask(s, taskMenu.task));
  }, [taskMenu, eligibleStaff, staffCanReceiveTask]);

  const clearDragState = () => {
    dragTaskRef.current = null;
    setDragTaskId(null);
    setDropStaffId(null);
    setDropDeniedStaffId(null);
    setDropUnassignKey(null);
  };

  const canUnassignTask = (t: TeamTask) =>
    Boolean(t.taskId && t.staffId && t.lifecycle === 'waiting_accept');

  const handleUnassign = async (task?: TeamTask) => {
    const target = task || taskMenu?.task;
    if (!target?.taskId || assigning) return;
    if (!canUnassignTask(target)) {
      toast.error('Désassignation seulement si assignée et pas encore acceptée');
      clearDragState();
      setTaskMenu(null);
      return;
    }
    const taskId = target.taskId;
    const prevStaffId = target.staffId;
    const prevLc = target.lifecycle;
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === taskId
          ? { ...t, staffId: null, lifecycle: 'none' as Lifecycle, done: false }
          : t,
      ),
    );
    setTaskMenu(null);
    clearDragState();
    setAssigning(true);
    try {
      await fulltaskApi.assignTask(taskId, null);
      toast.success('Tâche désassignée');
      void load({ silent: true });
    } catch (e: unknown) {
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === taskId
            ? {
                ...t,
                staffId: prevStaffId,
                lifecycle: prevLc,
                done: prevLc === 'finished',
              }
            : t,
        ),
      );
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur désassignation');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssign = async (staffId: string, task?: TeamTask) => {
    const target = task || taskMenu?.task;
    if (!target?.taskId || assigning) return;
    if (target.staffId && String(target.staffId) === String(staffId)) {
      setTaskMenu(null);
      clearDragState();
      return;
    }
    const receiver = staff.find((s) => String(s._id) === String(staffId));
    if (!receiver || !staffCanReceiveTask(receiver, target)) {
      refuseAssign(receiver, target);
      clearDragState();
      return;
    }
    const taskId = target.taskId;
    const prevStaffId = target.staffId;
    const prevLc = target.lifecycle;
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === taskId
          ? { ...t, staffId, lifecycle: 'waiting_accept' as Lifecycle, done: false }
          : t,
      ),
    );
    setTaskMenu(null);
    clearDragState();
    setAssigning(true);
    try {
      await fulltaskApi.assignTask(taskId, staffId);
      toast.success(prevStaffId ? 'Tâche réassignée' : 'Tâche assignée');
    } catch (e: unknown) {
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === taskId
            ? {
                ...t,
                staffId: prevStaffId,
                lifecycle: prevLc,
                done: prevLc === 'finished',
              }
            : t,
        ),
      );
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur assignation');
    } finally {
      setAssigning(false);
    }
  };

  const patchLifecycleLocal = (taskId: string, lifecycle: Lifecycle) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.taskId === taskId
          ? { ...t, lifecycle, done: lifecycle === 'finished' }
          : t,
      ),
    );
  };

  const handleStaffAction = async (
    action: 'accept' | 'reject' | 'start' | 'complete',
  ) => runStaffAction(taskMenu?.task, action);

  /** Cœur de l'action accepter/refuser/démarrer/terminer — cible explicite,
   * réutilisé par le menu contextuel (taskMenu) et le drop sur badge de statut. */
  const runStaffAction = async (
    target: TeamTask | undefined,
    action: 'accept' | 'reject' | 'start' | 'complete',
  ) => {
    if (!target?.taskId || !target.staffId || acting) return;
    const taskId = target.taskId;
    const staffId = target.staffId;
    const prev = target.lifecycle;
    const nextLc: Lifecycle | null =
      action === 'accept'
        ? 'waiting_start'
        : action === 'start'
          ? 'waiting_finish'
          : action === 'complete'
            ? 'finished'
            : null;

    setTaskMenu(null);
    setActing(true);
    if (action === 'reject') {
      setTasks((prevTasks) => prevTasks.filter((t) => t.taskId !== taskId));
    } else if (nextLc) {
      patchLifecycleLocal(taskId, nextLc);
    }
    try {
      let res: { success?: boolean; error?: string };
      if (action === 'accept') {
        res = await fulltaskApi.acceptTask(taskId, staffId);
      } else if (action === 'reject') {
        res = await fulltaskApi.rejectTask(taskId, staffId);
      } else if (action === 'start') {
        res = await fulltaskApi.patchTaskStatus(taskId, 'doing');
      } else {
        res = await fulltaskApi.completeTask(taskId, staffId);
      }
      if (res?.success === false) throw new Error(res?.error || 'Action refusée');
      const ok = {
        accept: 'Acceptée',
        reject: 'Refusée',
        start: 'Démarrée',
        complete: 'Terminée',
      } as const;
      toast.success(ok[action]);
    } catch (e: unknown) {
      if (action === 'reject') {
        void load({ silent: true });
      } else {
        patchLifecycleLocal(taskId, prev);
      }
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur action');
    } finally {
      setActing(false);
    }
  };

  /**
   * Glisser une chip vers un badge de statut (▶️/⏳/✅) = changement rapide
   * superviseur, sans passer par le menu. Une seule étape à la fois — pas de
   * saut (attente début → terminé direct), même logique/rollback que
   * handleStaffAction pour rester cohérent avec le menu contextuel.
   */
  const badgeDropAction = (
    from: Lifecycle,
    to: 'waiting_start' | 'waiting_finish' | 'finished',
  ): 'accept' | 'start' | 'complete' | null => {
    if (to === 'waiting_start' && from === 'waiting_accept') return 'accept';
    if (to === 'waiting_finish' && from === 'waiting_start') return 'start';
    if (to === 'finished' && from === 'waiting_finish') return 'complete';
    return null;
  };

  const onStatusBadgeDragOver = (
    to: 'waiting_start' | 'waiting_finish' | 'finished',
    e: React.DragEvent,
  ) => {
    const dragTask = dragTaskRef.current;
    const action = dragTask ? badgeDropAction(dragTask.lifecycle, to) : null;
    e.preventDefault();
    e.dataTransfer.dropEffect = action ? 'move' : 'none';
  };

  const onStatusBadgeDrop = (
    to: 'waiting_start' | 'waiting_finish' | 'finished',
    e: React.DragEvent,
  ) => {
    e.preventDefault();
    const task = resolveDragTask(e);
    clearDragState();
    if (!task?.taskId || !task.staffId) return;
    const action = badgeDropAction(task.lifecycle, to);
    if (!action) {
      toast.error('Étape suivante uniquement (pas de saut de statut).');
      return;
    }
    void runStaffAction(task, action);
  };

  const onChipClick = (t: TeamTask, e: React.MouseEvent<HTMLElement>) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    if (t.taskId) {
      setTaskMenu({ anchor: e.currentTarget as HTMLElement, task: t });
      return;
    }
    if (t.reservationId && !t.reservationId.startsWith('orphan-')) {
      navigate(`/reservations/${encodeURIComponent(t.reservationId)}`);
    }
  };

  const onChipDragStart = (t: TeamTask, e: React.DragEvent) => {
    if (!t.taskId || t.done) {
      e.preventDefault();
      return;
    }
    dragMovedRef.current = false;
    dragTaskRef.current = t;
    setDragTaskId(t.taskId);
    setDropDeniedStaffId(null);
    e.dataTransfer.setData('text/task-id', t.taskId);
    e.dataTransfer.setData('application/json', JSON.stringify(t));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onStaffDragOver = (staffId: string, e: React.DragEvent) => {
    e.preventDefault();
    const dragTask = dragTaskRef.current;
    const receiver = staff.find((s) => String(s._id) === String(staffId));
    const allowed = Boolean(dragTask && receiver && staffCanReceiveTask(receiver, dragTask));
    if (!allowed) {
      e.dataTransfer.dropEffect = 'none';
      setDropStaffId(null);
      setDropDeniedStaffId(staffId);
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDropDeniedStaffId(null);
    setDropStaffId(staffId);
  };

  const onStaffDrop = (staffId: string, e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    let task: TeamTask | undefined;
    try {
      task = raw ? (JSON.parse(raw) as TeamTask) : undefined;
    } catch {
      task = undefined;
    }
    const tid = e.dataTransfer.getData('text/task-id') || dragTaskId;
    if (!task && tid) {
      task = dragTaskRef.current?.taskId === tid
        ? dragTaskRef.current
        : filteredTasks.find((x) => x.taskId === tid);
    }
    if (!task?.taskId) {
      clearDragState();
      return;
    }
    const receiver = staff.find((s) => String(s._id) === String(staffId));
    if (!receiver || !staffCanReceiveTask(receiver, task)) {
      refuseAssign(receiver, task);
      clearDragState();
      return;
    }
    void handleAssign(staffId, task);
  };

  const resolveDragTask = (e: React.DragEvent): TeamTask | undefined => {
    const raw = e.dataTransfer.getData('application/json');
    let task: TeamTask | undefined;
    try {
      task = raw ? (JSON.parse(raw) as TeamTask) : undefined;
    } catch {
      task = undefined;
    }
    const tid = e.dataTransfer.getData('text/task-id') || dragTaskId;
    if (!task && tid) {
      task =
        dragTaskRef.current?.taskId === tid
          ? dragTaskRef.current
          : filteredTasks.find((x) => x.taskId === tid);
    }
    return task;
  };

  const onUnassignDragOver = (rowKey: string, e: React.DragEvent) => {
    e.preventDefault();
    const dragTask = dragTaskRef.current;
    if (!dragTask?.staffId) {
      e.dataTransfer.dropEffect = 'none';
      setDropUnassignKey(null);
      return;
    }
    if (!canUnassignTask(dragTask)) {
      e.dataTransfer.dropEffect = 'none';
      setDropUnassignKey(null);
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDropStaffId(null);
    setDropDeniedStaffId(null);
    setDropUnassignKey(rowKey);
  };

  const onUnassignDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const task = resolveDragTask(e);
    if (!task?.taskId) {
      clearDragState();
      return;
    }
    void handleUnassign(task);
  };

  const renderChip = (t: TeamTask, i: number) => {
    // Sans staff = toujours « à assigner » (évite badge « → Accepter » fantôme)
    const lc: Lifecycle = t.staffId ? t.lifecycle : 'none';
    const next = lifecycleNextShort(lc);
    const tip = [
      t.label,
      t.listingName,
      t.guestName || null,
      `Statut : ${lifecycleCurrentShort(lc)}`,
      lifecycleNextAction(lc)
        ? `Prochaine étape : ${lifecycleNextAction(lc)}`
        : !t.staffId
          ? 'Prochaine étape : Assigner un staff'
          : null,
      t.taskId
        ? canUnassignTask(t)
          ? 'Clic = actions · glisser vers le haut (« À assigner ») = désassigner'
          : 'Clic = actions · glisser = assigner'
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <button
        key={`${t.taskId || t.reservationId}-${i}`}
        type="button"
        draggable={Boolean(t.taskId) && !t.done}
        className={`twv-chip twv-chip--${t.kind} twv-chip--lc-${lc}${t.done ? ' twv-chip--done' : ''}${!t.staffId ? ' twv-chip--unassigned' : ''}${dragTaskId && t.taskId === dragTaskId ? ' twv-chip--dragging' : ''}`}
        title={tip}
        onClick={(e) => onChipClick(t, e)}
        onDragStart={(e) => onChipDragStart(t, e)}
        onDrag={(e) => {
          if (e.clientX !== 0 || e.clientY !== 0) dragMovedRef.current = true;
        }}
        onDragEnd={() => {
          clearDragState();
        }}
      >
        <span className="twv-chip-head">
          {t.time ? <span className="twv-chip-time">{t.time}</span> : null}
          {next ? (
            <span className={`twv-chip-lc twv-chip-lc--${lc}`}>{next}</span>
          ) : null}
        </span>
        {t.label}
        <span className="twv-chip-listing">{t.listingName}</span>
        {lc !== 'finished' && lc !== 'none' ? (
          <span className="twv-chip-status">{lifecycleCurrentShort(lc)}</span>
        ) : null}
      </button>
    );
  };

  const renderCell = (row: RowDef, dayKey: string) => {
    const raw = row.byDay.get(dayKey) || [];
    const list =
      focusLifecycle === 'all' || row.unassigned
        ? raw
        : raw.filter((t) => t.lifecycle === focusLifecycle);
    if (!list.length) {
      if (focusLifecycle !== 'all' && !row.unassigned && raw.length > 0) {
        return <span className="twv-cell-dimmed">{raw.length}</span>;
      }
      return null;
    }
    const cellKey = `${row.key}|${dayKey}`;
    const expanded = expandedCells.has(cellKey);

    // À assigner : compact = nombre du jour ; clic = ouvrir chips (glisser / choisir)
    if (row.unassigned && !expanded) {
      return (
        <button
          type="button"
          className="twv-day-count"
          onClick={() => toggleCell(cellKey)}
          title={`${list.length} tâche${list.length > 1 ? 's' : ''} — clic pour afficher et assigner`}
        >
          {list.length}
        </button>
      );
    }

    // 3 colonnes kanban DANS la cellule (À démarrer / En cours / Terminé).
    // Chaque colonne est une zone de dépôt large — glisser une tâche d'une
    // colonne à la suivante change son statut. La ligne « À assigner » garde
    // l'affichage compact (pas de statut staff à piloter).
    if (!row.unassigned) {
      const COLS = [
        { to: 'waiting_start' as const, emoji: '▶️', label: 'À démarrer', cls: 'waiting-start' },
        { to: 'waiting_finish' as const, emoji: '⏳', label: 'En cours', cls: 'waiting-finish' },
        { to: 'finished' as const, emoji: '✅', label: 'Terminé', cls: 'finished' },
      ];
      return (
        <div className="twv-cell-kanban">
          {COLS.map((col) => {
            const colTasks = list.filter((t) =>
              col.to === 'waiting_start'
                ? t.lifecycle === 'waiting_start' || t.lifecycle === 'waiting_accept'
                : t.lifecycle === col.to,
            );
            const isDrop = dropBadge?.key === cellKey && dropBadge.to === col.to;
            return (
              <div
                key={col.to}
                className={`twv-kcol twv-kcol--${col.cls}${isDrop ? ' twv-kcol--drop' : ''}`}
                onDragOver={(e) => {
                  onStatusBadgeDragOver(col.to, e);
                  setDropBadge({ key: cellKey, to: col.to });
                }}
                onDragLeave={() =>
                  setDropBadge((cur) =>
                    cur?.key === cellKey && cur.to === col.to ? null : cur,
                  )
                }
                onDrop={(e) => {
                  onStatusBadgeDrop(col.to, e);
                  setDropBadge(null);
                }}
                title={`${col.label} — déposer une tâche ici`}
              >
                <div className="twv-kcol-h">
                  {col.emoji} {colTasks.length}
                </div>
                {colTasks.map(renderChip)}
              </div>
            );
          })}
        </div>
      );
    }

    const visible =
      row.unassigned || expanded ? list : list.slice(0, MAX_CHIPS_COLLAPSED);
    const hidden = list.length - visible.length;
    return (
      <>
        {visible.map(renderChip)}
        {row.unassigned ? (
          <button type="button" className="twv-more" onClick={() => toggleCell(cellKey)}>
            réduire
          </button>
        ) : (
          <>
            {hidden > 0 && (
              <button type="button" className="twv-more" onClick={() => toggleCell(cellKey)}>
                +{hidden} autres
              </button>
            )}
            {expanded && list.length > MAX_CHIPS_COLLAPSED && (
              <button type="button" className="twv-more" onClick={() => toggleCell(cellKey)}>
                réduire
              </button>
            )}
          </>
        )}
      </>
    );
  };

  const dragTask = useMemo(() => {
    if (!dragTaskId) return null;
    return (
      tasks.find((t) => t.taskId === dragTaskId) ||
      dragTaskRef.current ||
      null
    );
  }, [dragTaskId, tasks]);

  const renderRow = (row: RowDef) => {
    const sid = row.staff ? String(row.staff._id) : '';
    const canReceive =
      !dragTask || !row.staff ? true : staffCanReceiveTask(row.staff, dragTask);
    const isDropTarget = Boolean(sid && dropStaffId === sid);
    const isDropDenied = Boolean(sid && dropDeniedStaffId === sid);
    const dimWhileDrag = Boolean(dragTask && row.staff && !canReceive);
    const unassignDropOk =
      Boolean(row.unassigned && dropUnassignKey === row.key);
    const unassignDropDenied =
      Boolean(
        row.unassigned &&
          dragTask?.staffId &&
          !canUnassignTask(dragTask) &&
          dragTaskId,
      );
    return (
      <tr
        key={row.key}
        className={`twv-row${row.unassigned ? ' twv-row--unassigned' : ''}${!row.unassigned && row.total === 0 ? ' twv-row--idle' : ''}${!row.unassigned && row.staff?.status === 'off' ? ' twv-row--off' : ''}${isDropTarget || unassignDropOk ? ' twv-row--drop' : ''}${isDropDenied || unassignDropDenied ? ' twv-row--drop-denied' : ''}${dimWhileDrag ? ' twv-row--no-access' : ''}${focusLifecycle !== 'all' ? ' twv-row--focused' : ''}`}
        onDragOver={
          sid
            ? (e) => onStaffDragOver(sid, e)
            : row.unassigned
              ? (e) => onUnassignDragOver(row.key, e)
              : undefined
        }
        onDragLeave={
          sid
            ? () => {
                setDropStaffId((cur) => (cur === sid ? null : cur));
                setDropDeniedStaffId((cur) => (cur === sid ? null : cur));
              }
            : row.unassigned
              ? () => setDropUnassignKey((cur) => (cur === row.key ? null : cur))
              : undefined
        }
        onDrop={
          sid
            ? (e) => onStaffDrop(sid, e)
            : row.unassigned
              ? (e) => onUnassignDrop(e)
              : undefined
        }
      >
        <td className="twv-staff-cell">
          {row.unassigned ? (
            <div className="twv-staff">
              <span className="twv-avatar twv-avatar--warn">!</span>
              <span>
                <span className="twv-staff-name twv-staff-name--warn">À assigner</span>
                <span className="twv-staff-sub">
                  {row.total > 0
                    ? `${row.total} · clic jour = liste · dépôt = désassigner`
                    : dragTask?.staffId && canUnassignTask(dragTask)
                      ? 'Déposer ici pour désassigner'
                      : 'Déposer une tâche non acceptée ici'}
                </span>
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="twv-staff twv-staff--btn"
              onClick={() => row.staff && onOpenStaff?.(String(row.staff._id))}
              title={
                dimWhileDrag
                  ? 'Pas de permission sur cette annonce'
                  : 'Glisser une tâche ici pour assigner · clic = annuaire'
              }
            >
              <span className={`twv-avatar twv-av-${row.staff?.avatarColor || 1}`}>
                {(row.staff?.fullName || '?')
                  .split(/\s+/)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <span>
                <span className="twv-staff-name">{row.staff?.fullName}</span>
                <span className="twv-staff-sub">
                  {dimWhileDrag
                    ? 'Sans accès listing'
                    : row.total > 0
                      ? `${row.total} tâche${row.total > 1 ? 's' : ''}`
                      : listingFilterId || cityFilterId
                        ? 'Autorisé · libre'
                        : 'Libre'}
                </span>
                {row.staff
                  ? (() => {
                      const access = staffListingLabels(row.staff, listings);
                      const text = access.all
                        ? 'Toutes les annonces'
                        : access.labels.length
                          ? access.labels.join(' · ')
                          : 'Aucune annonce';
                      return (
                        <span className="twv-staff-listings" title={text}>
                          🏠 {text}
                        </span>
                      );
                    })()
                  : null}
              </span>
            </button>
          )}
        </td>
        {dayKeys.map((dk, i) => (
          <td
            key={dk}
            className={`twv-day-cell${dk === todayKey ? ' twv-today' : ''}${
              [0, 6].includes(days[i].getDay()) ? ' twv-weekend' : ''
            }`}
          >
            {renderCell(row, dk)}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="twv-root twv-enriched">
      <div className="twv-toolbar">
        <div className="twv-toolbar-left">
          <label className="twv-listing-filter">
            <span>Ville</span>
            <select
              value={cityFilterId}
              onChange={(e) => {
                setCityFilterId(e.target.value);
                setListingFilterId('');
              }}
            >
              <option value="">Toutes les villes</option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="twv-listing-filter">
            <span>Annonce</span>
            <select
              value={listingFilterId}
              onChange={(e) => setListingFilterId(e.target.value)}
            >
              <option value="">
                {cityFilterId ? 'Toutes les annonces de la ville' : 'Toutes les annonces'}
              </option>
              {listingOptions.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
          <span className="twv-range">
            {format(days[0], 'd MMM', { locale: fr })} → {format(days[WINDOW_DAYS - 1], 'd MMM', { locale: fr })}
          </span>
          <span className="twv-summary">
            {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
            {unassignedTotal > 0 ? (
              <span className="twv-summary-warn"> · {unassignedTotal} à assigner</span>
            ) : null}
            {(listingFilterId || cityFilterId) && (
              <span> · {eligibleStaff.length} staff autorisé{eligibleStaff.length > 1 ? 's' : ''}</span>
            )}
          </span>
          <div className="twv-focus-bar" role="group" aria-label="Mettre en avant un statut">
            <button
              type="button"
              className={`twv-focus-chip${focusLifecycle === 'all' ? ' on' : ''}`}
              onClick={() => setFocusLifecycle('all')}
            >
              Tous
            </button>
            <button
              type="button"
              className={`twv-focus-chip twv-focus-chip--accept${focusLifecycle === 'waiting_accept' ? ' on' : ''}`}
              onClick={() =>
                setFocusLifecycle((v) =>
                  v === 'waiting_accept' ? 'all' : 'waiting_accept',
                )
              }
              title="Assignées — pas encore acceptées"
            >
              À accepter
              {lifecycleCounts.waiting_accept > 0 ? (
                <span>{lifecycleCounts.waiting_accept}</span>
              ) : null}
            </button>
            <button
              type="button"
              className={`twv-focus-chip twv-focus-chip--start${focusLifecycle === 'waiting_start' ? ' on' : ''}`}
              onClick={() =>
                setFocusLifecycle((v) =>
                  v === 'waiting_start' ? 'all' : 'waiting_start',
                )
              }
              title="Acceptées — prochaine étape : commencer"
            >
              À démarrer
              {lifecycleCounts.waiting_start > 0 ? (
                <span>{lifecycleCounts.waiting_start}</span>
              ) : null}
            </button>
            <button
              type="button"
              className={`twv-focus-chip twv-focus-chip--finish${focusLifecycle === 'waiting_finish' ? ' on' : ''}`}
              onClick={() =>
                setFocusLifecycle((v) =>
                  v === 'waiting_finish' ? 'all' : 'waiting_finish',
                )
              }
              title="En cours — prochaine étape : terminer"
            >
              À terminer
              {lifecycleCounts.waiting_finish > 0 ? (
                <span>{lifecycleCounts.waiting_finish}</span>
              ) : null}
            </button>
          </div>
        </div>
        <div className="twv-toolbar-nav">
          <button type="button" onClick={() => setStartDate((d) => addDays(d, -7))} aria-label="7 jours précédents">‹</button>
          <button type="button" onClick={() => setStartDate(startOfDay(new Date()))}>Aujourd'hui</button>
          <button type="button" onClick={() => setStartDate((d) => addDays(d, 7))} aria-label="7 jours suivants">›</button>
        </div>
      </div>

      {listingFilterId || cityFilterId ? (
        <div className="twv-staff-strip">
          <span className="twv-staff-strip-label">
            Staff · {scopeLabel || 'filtre'}
          </span>
          {eligibleStaff.length === 0 ? (
            <span className="twv-staff-strip-empty">
              Aucun staff avec permission sur {listingFilterId ? 'cette annonce' : 'cette ville'}
            </span>
          ) : (
            eligibleStaff.map((s) => {
              const sid = String(s._id);
              const canReceive = !dragTask || staffCanReceiveTask(s, dragTask);
              const dim = Boolean(dragTask && !canReceive);
              return (
              <button
                key={s._id}
                type="button"
                className={`twv-staff-pill${dropStaffId === sid ? ' twv-staff-pill--drop' : ''}${dropDeniedStaffId === sid ? ' twv-staff-pill--drop-denied' : ''}${dim ? ' twv-staff-pill--no-access' : ''}`}
                title={dim ? 'Pas de permission sur cette annonce' : 'Déposer une tâche ici pour assigner'}
                onClick={() => onOpenStaff?.(sid)}
                onDragOver={(e) => onStaffDragOver(sid, e)}
                onDragLeave={() => {
                  setDropStaffId((cur) => (cur === sid ? null : cur));
                  setDropDeniedStaffId((cur) => (cur === sid ? null : cur));
                }}
                onDrop={(e) => onStaffDrop(sid, e)}
              >
                <span className={`twv-avatar twv-av-${s.avatarColor || 1}`}>
                  {(s.fullName || '?')
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                {s.fullName}
              </button>
              );
            })
          )}
          <span className="twv-staff-strip-hint">Glisser une tâche → staff pour assigner / réassigner</span>
        </div>
      ) : (
        <div className="twv-staff-strip twv-staff-strip--hint">
          Filtrez ville/annonce · clic tâche = accepter / commencer / terminer · glisser = assigner · glisser vers « À assigner » = désassigner (si pas encore acceptée)
        </div>
      )}

      {error && !hasLoadedOnce ? <div className="twv-error">{error}</div> : null}
      {loading && !hasLoadedOnce ? (
        <div className="twv-loading">Chargement du planning équipe…</div>
      ) : null}
      {refreshing ? (
        <div className="twv-refreshing" aria-live="polite">
          Mise à jour…
        </div>
      ) : null}

      {hasLoadedOnce || (!loading && !error) ? (
        <div className={`twv-scroll${refreshing ? ' twv-scroll--refreshing' : ''}`}>
          <table className="twv-table">
            <thead>
              <tr>
                <th className="twv-staff-cell twv-head">Staff</th>
                {days.map((d, i) => (
                  <th key={dayKeys[i]} className={`twv-head twv-day-head${dayKeys[i] === todayKey ? ' twv-today' : ''}${[0, 6].includes(d.getDay()) ? ' twv-weekend' : ''}`}>
                    <span className="twv-day-dow">{format(d, 'EEE', { locale: fr })}</span>
                    <span className="twv-day-num">{format(d, 'd')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <FragmentSection
                  key={section.ownerId || 'autres'}
                  section={section}
                  showHeader={showSectionHeaders}
                  colSpan={WINDOW_DAYS + 1}
                  renderRow={renderRow}
                />
              ))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={WINDOW_DAYS + 1} className="twv-empty">
                    {listingFilterId || cityFilterId
                      ? 'Aucun staff autorisé ni tâche pour ce filtre sur la période.'
                      : "Aucun staff — créez votre équipe dans l'onglet Annuaire."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <Menu
        anchorEl={taskMenu?.anchor || null}
        open={Boolean(taskMenu)}
        onClose={() => setTaskMenu(null)}
        MenuListProps={{ dense: true }}
      >
        {taskMenu ? (
          <MenuItem disabled dense sx={{ opacity: '1 !important', whiteSpace: 'normal' }}>
            <ListItemText
              primary={`${taskMenu.task.label}${taskMenu.task.time ? ` · ${taskMenu.task.time}` : ''}`}
              secondary={
                <>
                  <span style={{ display: 'block' }}>
                    {taskMenu.task.listingName}
                    {taskMenu.task.guestName ? ` · ${taskMenu.task.guestName}` : ''}
                  </span>
                  <span style={{ display: 'block', marginTop: 4, fontWeight: 700, color: '#1a1a1a' }}>
                    Statut : {lifecycleCurrentShort(taskMenu.task.lifecycle)}
                  </span>
                  {lifecycleNextAction(taskMenu.task.lifecycle) ? (
                    <span style={{ display: 'block', color: '#166534', fontWeight: 700 }}>
                      Prochaine étape : {lifecycleNextAction(taskMenu.task.lifecycle)}
                    </span>
                  ) : taskMenu.task.lifecycle === 'finished' ? (
                    <span style={{ display: 'block', color: '#64748b' }}>Aucune action restante</span>
                  ) : !taskMenu.task.staffId ? (
                    <span style={{ display: 'block', color: '#b45309', fontWeight: 700 }}>
                      Prochaine étape : Assigner un staff
                    </span>
                  ) : null}
                </>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </MenuItem>
        ) : null}
        {taskMenu?.task.staffId && taskMenu.task.lifecycle === 'waiting_accept' ? (
          <>
            <MenuItem
              dense
              disabled={acting}
              onClick={() => void handleStaffAction('accept')}
              sx={{ fontWeight: 700, color: '#166534' }}
            >
              → Accepter (prochaine étape)
            </MenuItem>
            <MenuItem
              dense
              disabled={acting}
              onClick={() => void handleStaffAction('reject')}
            >
              Refuser
            </MenuItem>
            <MenuItem
              dense
              disabled={assigning || acting}
              onClick={() => void handleUnassign()}
              sx={{ fontWeight: 700, color: '#b45309' }}
            >
              Désassigner (↖ vers « À assigner »)
            </MenuItem>
            <Divider />
          </>
        ) : null}
        {taskMenu?.task.staffId && taskMenu.task.lifecycle === 'waiting_start' ? (
          <>
            <MenuItem
              dense
              disabled={acting}
              onClick={() => void handleStaffAction('start')}
              sx={{ fontWeight: 700, color: '#166534' }}
            >
              → Commencer (prochaine étape)
            </MenuItem>
            <Divider />
          </>
        ) : null}
        {taskMenu?.task.staffId && taskMenu.task.lifecycle === 'waiting_finish' ? (
          <>
            <MenuItem
              dense
              disabled={acting}
              onClick={() => void handleStaffAction('complete')}
              sx={{ fontWeight: 700, color: '#166534' }}
            >
              → Terminer (prochaine étape)
            </MenuItem>
            <Divider />
          </>
        ) : null}
        {taskMenu?.task.lifecycle !== 'finished' ? (
          <MenuItem disabled dense>
            <ListItemText
              primary={taskMenu?.task.staffId ? 'Réassigner à…' : 'Assigner à…'}
            />
          </MenuItem>
        ) : null}
        {taskMenu?.task.lifecycle !== 'finished'
          ? assignCandidates.map((s) => (
              <MenuItem
                key={s._id}
                dense
                disabled={assigning || acting}
                onClick={() => void handleAssign(String(s._id))}
              >
                {s.fullName}
              </MenuItem>
            ))
          : null}
        {taskMenu?.task.lifecycle !== 'finished' && assignCandidates.length === 0 ? (
          <MenuItem disabled dense>
            {taskMenu?.task.taskType
              ? `Aucun staff avec type « ${labelForTaskTypeId(taskMenu.task.taskType) || taskMenu.task.taskType} » + accès annonce`
              : listingFilterId || cityFilterId || taskMenu?.task.listingId
                ? 'Aucun staff autorisé pour ce filtre'
                : 'Aucun staff disponible pour ce PM'}
          </MenuItem>
        ) : null}
      </Menu>
    </div>
  );
}

function FragmentSection({
  section,
  showHeader,
  colSpan,
  renderRow,
}: {
  section: SectionDef;
  showHeader: boolean;
  colSpan: number;
  renderRow: (row: RowDef) => ReactElement;
}) {
  return (
    <>
      {showHeader && (
        <tr className="twv-section">
          <td colSpan={colSpan}>
            {section.label} — {section.rows.filter((r) => !r.unassigned).length} staff · {section.taskCount} tâche{section.taskCount > 1 ? 's' : ''}
          </td>
        </tr>
      )}
      {section.rows.map(renderRow)}
    </>
  );
}
