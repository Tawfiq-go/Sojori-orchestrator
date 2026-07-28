/**
 * Vue staff — PM / owner agit comme un membre (accepter → commencer → terminer).
 * Statuts : attente acceptation · attente début · attente fin · terminé.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../../services/fulltaskApi';
import type { Staff } from './types';
import {
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
} from './fulltaskTaskTypes';
import { initials } from './staffDesignConstants';
import './staffRoleView.css';

type ListingOpt = { id: string; name: string };

export type StaffRoleTask = {
  _id: string;
  taskCode?: string;
  type?: string;
  status?: string;
  listingId?: string;
  guestName?: string;
  scheduledDate?: string;
  scheduledAt?: string;
  payload?: Record<string, unknown>;
  requestNote?: string;
};

type BucketId =
  | 'waiting_accept'
  | 'waiting_start'
  | 'waiting_finish'
  | 'finished'
  | 'other';

const BUCKETS: {
  id: BucketId;
  title: string;
  hint: string;
}[] = [
  {
    id: 'waiting_accept',
    title: 'Attente acceptation',
    hint: 'Accepter ou refuser comme le staff',
  },
  {
    id: 'waiting_start',
    title: 'Attente début',
    hint: 'Acceptée — démarrer l’exécution',
  },
  {
    id: 'waiting_finish',
    title: 'Attente fin',
    hint: 'En cours — terminer + checklist',
  },
  {
    id: 'finished',
    title: 'Terminé',
    hint: 'Clôturées',
  },
];

function todayInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bucketForStatus(status: string): BucketId {
  const s = String(status || '').toLowerCase();
  if (s === 'pending_partner' || s === 'new') return 'waiting_accept';
  if (s === 'confirmed') return 'waiting_start';
  if (s === 'doing') return 'waiting_finish';
  if (s === 'done') return 'finished';
  return 'other';
}

function statusLabel(status: string): string {
  switch (String(status || '').toLowerCase()) {
    case 'pending_partner':
    case 'new':
      return 'Attente acceptation';
    case 'confirmed':
      return 'Attente début';
    case 'doing':
      return 'Attente fin';
    case 'done':
      return 'Terminé';
    case 'rejected':
      return 'Refusé';
    case 'cancelled':
      return 'Annulé';
    case 'waiting_guest':
      return 'Attente client';
    default:
      return status || '—';
  }
}

function formatDay(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

function checklistItems(task: StaffRoleTask): { label: string; done?: boolean; required?: boolean }[] {
  const raw = task.payload?.checklist;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (!c || typeof c !== 'object') return null;
      const o = c as Record<string, unknown>;
      const label = String(o.label || o.title || o.name || '').trim();
      if (!label) return null;
      return {
        label,
        done: o.done === true,
        required: o.required === true,
      };
    })
    .filter(Boolean) as { label: string; done?: boolean; required?: boolean }[];
}

type Props = {
  staff: Staff[];
  listings?: ListingOpt[];
  loading?: boolean;
};

export default function StaffRoleView({ staff, listings = [], loading }: Props) {
  const [staffId, setStaffId] = useState('');
  const [range, setRange] = useState<'day' | 'week'>('week');
  const [date, setDate] = useState(todayInputValue);
  const [tasks, setTasks] = useState<StaffRoleTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [refreshingTasks, setRefreshingTasks] = useState(false);
  const [hasTasksOnce, setHasTasksOnce] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openChecklistId, setOpenChecklistId] = useState<string | null>(null);

  const activeStaff = useMemo(
    () => staff.find((s) => s._id === staffId) || null,
    [staff, staffId],
  );

  const listingName = useCallback(
    (listingId?: string) => {
      if (!listingId) return '—';
      const hit = listings.find((l) => String(l.id) === String(listingId));
      return hit?.name || listingId;
    },
    [listings],
  );

  const loadTasks = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!staffId) {
        setTasks([]);
        setHasTasksOnce(false);
        return;
      }
      const silent = Boolean(opts?.silent) || hasTasksOnce;
      if (silent) setRefreshingTasks(true);
      else setLoadingTasks(true);
      try {
        const res =
          range === 'day'
            ? await fulltaskApi.listStaffTasksToday(staffId, date)
            : await fulltaskApi.listStaffTasksWeek(staffId, date);
        if (!res?.success) {
          toast.error(res?.error || 'Impossible de charger les tâches');
          if (!silent) setTasks([]);
          return;
        }
        setTasks((res.data || []) as StaffRoleTask[]);
        setHasTasksOnce(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur chargement tâches');
        if (!silent) setTasks([]);
      } finally {
        setLoadingTasks(false);
        setRefreshingTasks(false);
      }
    },
    [staffId, range, date, hasTasksOnce],
  );

  useEffect(() => {
    setHasTasksOnce(false);
    void loadTasks({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, range, date]);

  useEffect(() => {
    if (staffId && staff.some((s) => s._id === staffId)) return;
    if (staff.length === 1) setStaffId(staff[0]._id);
  }, [staff, staffId]);

  const grouped = useMemo(() => {
    const map: Record<BucketId, StaffRoleTask[]> = {
      waiting_accept: [],
      waiting_start: [],
      waiting_finish: [],
      finished: [],
      other: [],
    };
    for (const t of tasks) {
      map[bucketForStatus(String(t.status))].push(t);
    }
    return map;
  }, [tasks]);

  const runAction = async (
    taskId: string,
    action: 'accept' | 'reject' | 'start' | 'complete',
  ) => {
    if (!staffId) return;
    const prevTasks = tasks;
    const nextStatus =
      action === 'accept'
        ? 'confirmed'
        : action === 'start'
          ? 'doing'
          : action === 'complete'
            ? 'done'
            : null;
    setBusyId(taskId);
    // Optimistic — pas de reload plein écran
    if (action === 'reject') {
      setTasks((list) => list.filter((t) => t._id !== taskId));
    } else if (nextStatus) {
      setTasks((list) =>
        list.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t)),
      );
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
      if (res?.success === false) {
        throw new Error(res?.error || 'Action refusée');
      }
      const labels = {
        accept: 'Acceptée',
        reject: 'Refusée',
        start: 'Démarrée',
        complete: 'Terminée',
      } as const;
      toast.success(labels[action]);
      void loadTasks({ silent: true });
    } catch (e) {
      setTasks(prevTasks);
      toast.error(e instanceof Error ? e.message : 'Erreur action');
    } finally {
      setBusyId(null);
    }
  };

  const renderCard = (t: StaffRoleTask) => {
    const type = String(t.type || '');
    const emoji = FULLTASK_TASK_TYPE_EMOJI[type as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '📋';
    const label = labelForTaskTypeId(type) || type;
    const status = String(t.status || '');
    const bucket = bucketForStatus(status);
    const busy = busyId === t._id;
    const checklist = checklistItems(t);
    const openCk = openChecklistId === t._id;

    return (
      <article key={t._id} className={`srv-card srv-card--${bucket}`}>
        <div className="srv-card-top">
          <span className="srv-card-type">
            {emoji} {label}
          </span>
          <span className={`srv-status srv-status--${bucket}`}>{statusLabel(status)}</span>
        </div>
        <div className="srv-card-code">{t.taskCode || t._id.slice(-8)}</div>
        <div className="srv-card-listing" title={listingName(t.listingId)}>
          {listingName(t.listingId)}
        </div>
        <div className="srv-card-meta">
          <span>{formatDay(t.scheduledDate)}</span>
          {t.guestName ? <span>· {t.guestName}</span> : null}
        </div>

        {checklist.length > 0 ? (
          <div className="srv-checklist-block">
            <button
              type="button"
              className="srv-checklist-toggle"
              onClick={() => setOpenChecklistId(openCk ? null : t._id)}
            >
              Checklist ({checklist.filter((c) => c.done).length}/{checklist.length})
              {openCk ? ' ▾' : ' ▸'}
            </button>
            {openCk ? (
              <ul className="srv-checklist">
                {checklist.map((c, i) => (
                  <li key={`${t._id}-ck-${i}`} className={c.done ? 'done' : ''}>
                    <span className="srv-ck-mark">{c.done ? '✓' : '○'}</span>
                    {c.label}
                    {c.required ? <em>requis</em> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="srv-card-actions">
          {bucket === 'waiting_accept' ? (
            <>
              <button
                type="button"
                className="srv-btn primary"
                disabled={busy}
                onClick={() => void runAction(t._id, 'accept')}
              >
                {busy ? '…' : 'Accepter'}
              </button>
              <button
                type="button"
                className="srv-btn ghost"
                disabled={busy}
                onClick={() => void runAction(t._id, 'reject')}
              >
                Refuser
              </button>
            </>
          ) : null}
          {bucket === 'waiting_start' ? (
            <button
              type="button"
              className="srv-btn primary"
              disabled={busy}
              onClick={() => void runAction(t._id, 'start')}
            >
              {busy ? '…' : 'Commencer'}
            </button>
          ) : null}
          {bucket === 'waiting_finish' ? (
            <button
              type="button"
              className="srv-btn primary"
              disabled={busy}
              onClick={() => void runAction(t._id, 'complete')}
            >
              {busy ? '…' : 'Terminer'}
            </button>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <div className="srv-root">
      <div className="srv-toolbar">
        <div className="srv-toolbar-left">
          <label className="srv-field">
            <span>Agir en tant que</span>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              disabled={loading || staff.length === 0}
            >
              <option value="">— Choisir un staff —</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="srv-field">
            <span>Période</span>
            <select value={range} onChange={(e) => setRange(e.target.value as 'day' | 'week')}>
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
            </select>
          </label>
          <label className="srv-field">
            <span>{range === 'day' ? 'Date' : 'Semaine du'}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button
            type="button"
            className="srv-btn ghost"
            disabled={!staffId || loadingTasks || refreshingTasks}
            onClick={() => void loadTasks({ silent: hasTasksOnce })}
          >
            {refreshingTasks ? '…' : 'Actualiser'}
          </button>
        </div>
        {activeStaff ? (
          <div className="srv-banner">
            <span className="srv-banner-av">{initials(activeStaff.fullName)}</span>
            <div>
              <strong>Rôle · {activeStaff.fullName}</strong>
              <p>
                Même parcours que WhatsApp : accepter → commencer → terminer. Les absents restent
                bloqués à l’assignation.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {!staffId ? (
        <p className="srv-empty">Choisissez un membre pour voir ses tâches et agir à sa place.</p>
      ) : loadingTasks && !hasTasksOnce ? (
        <p className="srv-empty">Chargement des tâches…</p>
      ) : tasks.length === 0 ? (
        <p className="srv-empty">Aucune tâche assignée sur cette période.</p>
      ) : (
        <div className={`srv-board${refreshingTasks ? ' srv-board--refreshing' : ''}`}>
          {BUCKETS.map((b) => (
            <section key={b.id} className="srv-col">
              <header className="srv-col-head">
                <h3>{b.title}</h3>
                <span className="srv-col-count">{grouped[b.id].length}</span>
              </header>
              <p className="srv-col-hint">{b.hint}</p>
              <div className="srv-col-body">
                {grouped[b.id].length === 0 ? (
                  <p className="srv-col-empty">—</p>
                ) : (
                  grouped[b.id].map(renderCard)
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {staffId && grouped.other.length > 0 ? (
        <div className="srv-other">
          <h4>Autres ({grouped.other.length})</h4>
          <div className="srv-other-grid">{grouped.other.map(renderCard)}</div>
        </div>
      ) : null}
    </div>
  );
}
