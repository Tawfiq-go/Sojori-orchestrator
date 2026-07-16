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
const MAX_CHIPS_COLLAPSED = 2;

type TeamTask = {
  taskId: string | null;
  reservationId: string;
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
        // Minuit UTC = tâche planifiée à la journée : pas d'heure à afficher.
        const dayLevel = dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0;
        out.push({
          taskId: data.taskId ? String(data.taskId) : null,
          reservationId: resa.reservationId,
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

type Props = {
  staff: Staff[];
  filterOwnerId?: string;
  ownerOptions: Array<{ id: string; label: string }>;
  onOpenStaff?: (staffId: string) => void;
};

export default function TeamWeekView({ staff, filterOwnerId, ownerOptions, onOpenStaff }: Props) {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(() => startOfDay(new Date()));
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [assignMenu, setAssignMenu] = useState<{
    anchor: HTMLElement;
    task: TeamTask;
  } | null>(null);
  const [assigning, setAssigning] = useState(false);
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

  const sections = useMemo<SectionDef[]>(() => {
    const staffById = new Map(staff.map((s) => [String(s._id), s]));
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

    for (const s of staff) {
      const oid = normalizeOwnerId(s.ownerId) || '';
      const bucket = ensureOwner(oid);
      bucket.staffRows.set(String(s._id), {
        key: String(s._id),
        staff: s,
        total: 0,
        byDay: new Map(),
      });
    }

    for (const t of tasks) {
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
  }, [staff, tasks, ownerOptions]);

  const showSectionHeaders = sections.length > 1;
  const totalTasks = tasks.length;
  const unassignedTotal = useMemo(
    () => tasks.filter((t) => !t.staffId).length,
    [tasks],
  );

  const toggleCell = (key: string) => {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const assignCandidates = useMemo(() => {
    if (!assignMenu) return [];
    const t = assignMenu.task;
    return staff.filter((s) => {
      if (t.ownerId && normalizeOwnerId(s.ownerId) && normalizeOwnerId(s.ownerId) !== t.ownerId) {
        return false;
      }
      return s.status === 'active';
    });
  }, [assignMenu, staff]);

  const handleAssign = async (staffId: string) => {
    if (!assignMenu?.task.taskId || assigning) return;
    setAssigning(true);
    try {
      await fulltaskApi.assignTask(assignMenu.task.taskId, staffId);
      toast.success('Tâche assignée');
      setAssignMenu(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur assignation');
    } finally {
      setAssigning(false);
    }
  };

  const onChipClick = (t: TeamTask, e: React.MouseEvent<HTMLElement>) => {
    if (!t.staffId && t.taskId) {
      setAssignMenu({ anchor: e.currentTarget as HTMLElement, task: t });
      return;
    }
    if (t.reservationId) navigate(`/reservations/${encodeURIComponent(t.reservationId)}`);
  };

  const renderChip = (t: TeamTask, i: number) => (
    <button
      key={`${t.taskId || t.reservationId}-${i}`}
      type="button"
      className={`twv-chip twv-chip--${t.kind}${t.done ? ' twv-chip--done' : ''}${!t.staffId ? ' twv-chip--unassigned' : ''}`}
      title={`${t.label} · ${t.listingName}${t.guestName ? ` · ${t.guestName}` : ''}${t.done ? ' · terminée' : ''}${!t.staffId ? ' — cliquer pour assigner' : ''}`}
      onClick={(e) => onChipClick(t, e)}
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

  const renderRow = (row: RowDef) => (
    <tr key={row.key} className={`twv-row${row.unassigned ? ' twv-row--unassigned' : ''}${!row.unassigned && row.total === 0 ? ' twv-row--idle' : ''}`}>
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
            title="Ouvrir la fiche dans l'annuaire"
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
                {row.total > 0 ? `${row.total} sur 15 j` : 'Libre'}
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

  return (
    <div className="twv-root">
      <div className="twv-toolbar">
        <div className="twv-toolbar-left">
          <span className="twv-range">
            {format(days[0], 'd MMM', { locale: fr })} → {format(days[WINDOW_DAYS - 1], 'd MMM', { locale: fr })}
          </span>
          <span className="twv-summary">
            {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
            {unassignedTotal > 0 && (
              <span className="twv-summary-warn"> · {unassignedTotal} à assigner</span>
            )}
          </span>
        </div>
        <div className="twv-toolbar-nav">
          <button type="button" onClick={() => setStartDate((d) => addDays(d, -7))} aria-label="Semaine précédente">‹</button>
          <button type="button" onClick={() => setStartDate(startOfDay(new Date()))}>Aujourd'hui</button>
          <button type="button" onClick={() => setStartDate((d) => addDays(d, 7))} aria-label="Semaine suivante">›</button>
        </div>
      </div>

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
                    Aucun staff — créez votre équipe dans l'onglet Annuaire.
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
          <MenuItem disabled dense>Aucun staff disponible pour ce PM</MenuItem>
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
