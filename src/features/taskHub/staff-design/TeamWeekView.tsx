// ════════════════════════════════════════════════════════════════════
// TeamWeekView — planning équipe : lignes staff (groupées par owner),
// colonnes 15 jours, tâches en chips compactes. Première vue de /tasks/team.
// Données : fetchTaskNewPlanning (résas + tâches fulltask) re-pivotées
// staff × jour — aucun endpoint dédié.
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MenuItem, ListItemText } from '@mui/material';
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
import './teamWeekView.css';

const WINDOW_DAYS = 15;
const CANCELLED_STATUSES = new Set(['CANCELLED_ADMIN', 'CANCELLED_CUSTOMER', 'ARCHIVED']);
const MAX_CHIPS_COLLAPSED = 3;

type TeamTask = {
  taskId: string | null;
  reservationId: string;
  listingId: string;
  day: string;
  time: string;
  label: string;
  kind: 'cleaning' | 'arrival' | 'departure' | 'service' | 'other';
  listingName: string;
  guestName: string;
  staffId: string | null;
  done: boolean;
  ownerId: string;
};

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
        out.push({
          taskId: data.taskId ? String(data.taskId) : null,
          reservationId: resa.reservationId,
          listingId: String(listing.listingId || ''),
          day,
          time: dayLevel ? '' : format(dt, 'HH:mm'),
          label: taskLabel(String(it.category || it.type || '')),
          kind: taskKind(String(it.type || '')),
          listingName: listing.listingName || 'Sans nom',
          guestName: resa.guestName || '',
          staffId: it.staffId ? String(it.staffId) : null,
          done: status === 'COMPLETED',
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
  const [error, setError] = useState<string | null>(null);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [cityFilterId, setCityFilterId] = useState<string>('');
  const [listingFilterId, setListingFilterId] = useState<string>('');
  const [assignMenu, setAssignMenu] = useState<{
    anchor: HTMLElement;
    task: TeamTask;
  } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropStaffId, setDropStaffId] = useState<string | null>(null);
  const [dropDeniedStaffId, setDropDeniedStaffId] = useState<string | null>(null);
  const dragMovedRef = useRef(false);
  const dragTaskRef = useRef<TeamTask | null>(null);
  const requestIdRef = useRef(0);

  const days = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(startDate, i)),
    [startDate],
  );
  const dayKeys = useMemo(() => days.map((d) => format(d, 'yyyy-MM-dd')), [days]);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
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
      } else {
        setError(result.message || 'Erreur chargement planning équipe');
      }
    } catch (e: unknown) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [startDate, filterOwnerId]);

  useEffect(() => {
    void load();
  }, [load]);

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
    const active = staff.filter((s) => s.status === 'active');
    if (listingFilterId && selectedListing) {
      return active.filter((s) =>
        staffMatchesListingAccess(s, selectedListing.id, selectedListing.cityId),
      );
    }
    if (cityFilterId) {
      return active.filter((s) => staffMatchesCityAccess(s, cityFilterId, listingsInCity));
    }
    return active;
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
      if (bucket.unassigned.total > 0) rows.push(bucket.unassigned);
      rows.push(...staffRows);
      const taskCount = rows.reduce((acc, r) => acc + r.total, 0);
      if (rows.length === 0) continue;
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

  const toggleCell = (key: string) => {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const staffCanReceiveTask = useCallback(
    (s: Staff, t: TeamTask): boolean => {
      if (t.ownerId && normalizeOwnerId(s.ownerId) && normalizeOwnerId(s.ownerId) !== t.ownerId) {
        return false;
      }
      const listing = listingsById.get(String(t.listingId));
      const listingId = listing?.id || String(t.listingId || '');
      const cityId = listing?.cityId;
      if (!listingId) return false;
      return staffMatchesListingAccess(s, listingId, cityId);
    },
    [listingsById],
  );

  const assignCandidates = useMemo(() => {
    if (!assignMenu) return [];
    return eligibleStaff.filter((s) => staffCanReceiveTask(s, assignMenu.task));
  }, [assignMenu, eligibleStaff, staffCanReceiveTask]);

  const clearDragState = () => {
    dragTaskRef.current = null;
    setDragTaskId(null);
    setDropStaffId(null);
    setDropDeniedStaffId(null);
  };

  const handleAssign = async (staffId: string, task?: TeamTask) => {
    const target = task || assignMenu?.task;
    if (!target?.taskId || assigning) return;
    if (target.staffId && String(target.staffId) === String(staffId)) {
      setAssignMenu(null);
      clearDragState();
      return;
    }
    const receiver = staff.find((s) => String(s._id) === String(staffId));
    if (!receiver || !staffCanReceiveTask(receiver, target)) {
      toast.error(
        `Pas de permission sur ${target.listingName || 'cette annonce'} pour ce staff`,
      );
      clearDragState();
      return;
    }
    const taskId = target.taskId;
    const prevStaffId = target.staffId;
    // Optimistic : déplacer le chip sans refetch planning (évite reload ~1s+)
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, staffId } : t)),
    );
    setAssignMenu(null);
    clearDragState();
    setAssigning(true);
    try {
      await fulltaskApi.assignTask(taskId, staffId);
      toast.success(prevStaffId ? 'Tâche réassignée' : 'Tâche assignée');
    } catch (e: unknown) {
      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, staffId: prevStaffId } : t)),
      );
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur assignation');
    } finally {
      setAssigning(false);
    }
  };

  const onChipClick = (t: TeamTask, e: React.MouseEvent<HTMLElement>) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    if (t.taskId) {
      setAssignMenu({ anchor: e.currentTarget as HTMLElement, task: t });
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
      toast.error(`Pas de permission sur ${task.listingName || 'cette annonce'} pour ce staff`);
      clearDragState();
      return;
    }
    void handleAssign(staffId, task);
  };

  const renderChip = (t: TeamTask, i: number) => (
    <button
      key={`${t.taskId || t.reservationId}-${i}`}
      type="button"
      draggable={Boolean(t.taskId) && !t.done}
      className={`twv-chip twv-chip--${t.kind}${t.done ? ' twv-chip--done' : ''}${!t.staffId ? ' twv-chip--unassigned' : ''}${dragTaskId && t.taskId === dragTaskId ? ' twv-chip--dragging' : ''}`}
      title={`${t.label} · ${t.listingName}${t.guestName ? ` · ${t.guestName}` : ''}${t.done ? ' · terminée' : ''}${t.taskId ? ' — glisser vers un staff pour assigner' : ''}`}
      onClick={(e) => onChipClick(t, e)}
      onDragStart={(e) => onChipDragStart(t, e)}
      onDrag={(e) => {
        if (e.clientX !== 0 || e.clientY !== 0) dragMovedRef.current = true;
      }}
      onDragEnd={() => {
        clearDragState();
      }}
    >
      {t.time && <span className="twv-chip-time">{t.time} </span>}
      {t.label}
      <span className="twv-chip-listing">{t.listingName}</span>
    </button>
  );

  const renderCell = (row: RowDef, dayKey: string) => {
    const list = row.byDay.get(dayKey) || [];
    if (!list.length) return null;
    const cellKey = `${row.key}|${dayKey}`;
    const expanded = expandedCells.has(cellKey);
    const visible = expanded ? list : list.slice(0, MAX_CHIPS_COLLAPSED);
    const hidden = list.length - visible.length;
    return (
      <>
        {visible.map(renderChip)}
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
    return (
      <tr
        key={row.key}
        className={`twv-row${row.unassigned ? ' twv-row--unassigned' : ''}${!row.unassigned && row.total === 0 ? ' twv-row--idle' : ''}${isDropTarget ? ' twv-row--drop' : ''}${isDropDenied ? ' twv-row--drop-denied' : ''}${dimWhileDrag ? ' twv-row--no-access' : ''}`}
        onDragOver={sid ? (e) => onStaffDragOver(sid, e) : undefined}
        onDragLeave={
          sid
            ? () => {
                setDropStaffId((cur) => (cur === sid ? null : cur));
                setDropDeniedStaffId((cur) => (cur === sid ? null : cur));
              }
            : undefined
        }
        onDrop={sid ? (e) => onStaffDrop(sid, e) : undefined}
      >
        <td className="twv-staff-cell">
          {row.unassigned ? (
            <div className="twv-staff">
              <span className="twv-avatar twv-avatar--warn">!</span>
              <span>
                <span className="twv-staff-name twv-staff-name--warn">À assigner</span>
                <span className="twv-staff-sub">{row.total} tâche{row.total > 1 ? 's' : ''} sans staff</span>
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
              </span>
            </button>
          )}
        </td>
        {dayKeys.map((dk) => (
          <td key={dk} className={`twv-day-cell${dk === todayKey ? ' twv-today' : ''}`}>
            {renderCell(row, dk)}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="twv-root">
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
            {unassignedTotal > 0 && (
              <span className="twv-summary-warn"> · {unassignedTotal} à assigner</span>
            )}
            {(listingFilterId || cityFilterId) && (
              <span> · {eligibleStaff.length} staff autorisé{eligibleStaff.length > 1 ? 's' : ''}</span>
            )}
          </span>
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
          Filtrez par ville ou annonce (accès ville = toutes les annonces de la ville) · glissez une tâche sur un staff
        </div>
      )}

      {error && <div className="twv-error">{error}</div>}
      {loading && <div className="twv-loading">Chargement du planning équipe…</div>}

      {!loading && !error && (
        <div className="twv-scroll">
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
      )}

      <Menu
        anchorEl={assignMenu?.anchor || null}
        open={Boolean(assignMenu)}
        onClose={() => setAssignMenu(null)}
      >
        <MenuItem disabled dense>
          <ListItemText
            primary="Assigner à…"
            secondary={assignMenu ? `${assignMenu.task.label} · ${assignMenu.task.listingName}` : ''}
          />
        </MenuItem>
        {assignCandidates.map((s) => (
          <MenuItem key={s._id} dense disabled={assigning} onClick={() => void handleAssign(String(s._id))}>
            {s.fullName}
          </MenuItem>
        ))}
        {assignCandidates.length === 0 && (
          <MenuItem disabled dense>
            {listingFilterId || cityFilterId || assignMenu?.task.listingId
              ? 'Aucun staff autorisé pour ce filtre'
              : 'Aucun staff disponible pour ce PM'}
          </MenuItem>
        )}
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
