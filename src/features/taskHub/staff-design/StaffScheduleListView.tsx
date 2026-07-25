/**
 * Horaires — liste staff × jours (L→D).
 * Édition via panneau flottant (portal) pour ne pas être coupé par le scroll du tableau.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import type { Staff } from './types';
import {
  DAY_DISPLAY_ORDER,
  DAY_FULL_LABELS,
  DAY_LABELS,
  initials,
} from './staffDesignConstants';
import './staffScheduleList.css';

type DayWindow = { start: string; end: string };

const PRESETS: { label: string; windows: DayWindow[] }[] = [
  { label: '8–17', windows: [{ start: '08:00', end: '17:00' }] },
  { label: '8–12', windows: [{ start: '08:00', end: '12:00' }] },
  { label: '14–18', windows: [{ start: '14:00', end: '18:00' }] },
  {
    label: '8–12+14–18',
    windows: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  },
  { label: '24/24', windows: [{ start: '00:00', end: '23:59' }] },
];

function normalizeHm(raw: string, fallback: string): string {
  const m = String(raw || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function sanitizeWindows(windows: DayWindow[]): DayWindow[] {
  const out: DayWindow[] = [];
  for (const w of windows || []) {
    const start = normalizeHm(w.start, '08:00');
    let end = normalizeHm(w.end, '17:00');
    if (end <= start && !(start === '00:00' && end === '23:59')) {
      end = '17:00';
      if (end <= start) end = '23:59';
    }
    out.push({ start, end });
  }
  return out;
}

function staffDayWindows(s: Staff): Partial<Record<number, DayWindow[]>> {
  const dw = s.schedule?.dayWindows;
  if (dw && Object.keys(dw).length) {
    const cleaned: Partial<Record<number, DayWindow[]>> = {};
    for (const [k, windows] of Object.entries(dw)) {
      const list = sanitizeWindows(windows || []);
      if (list.length) cleaned[Number(k)] = list;
    }
    return cleaned;
  }
  const out: Partial<Record<number, DayWindow[]>> = {};
  const tw = sanitizeWindows(s.schedule?.timeWindows || [{ start: '08:00', end: '17:00' }]);
  for (const d of s.schedule?.daysOfWeek || []) {
    out[d] = tw.map((w) => ({ ...w }));
  }
  return out;
}

function labelWindows(windows: DayWindow[] | undefined): string {
  if (!windows?.length) return 'Off';
  if (windows.length === 1) {
    const w = windows[0];
    if (w.start === '00:00' && (w.end === '23:59' || w.end === '24:00')) return '24/24';
    return `${w.start.slice(0, 5)}–${w.end.slice(0, 5)}`;
  }
  return windows.map((w) => `${w.start.slice(0, 2)}h`).join('+');
}

function scheduleFromDayWindows(dayWindows: Partial<Record<number, DayWindow[]>>): Staff['schedule'] {
  const cleaned: Partial<Record<number, DayWindow[]>> = {};
  for (const [k, windows] of Object.entries(dayWindows)) {
    const list = sanitizeWindows(windows || []);
    if (list.length) cleaned[Number(k)] = list;
  }
  const daysOfWeek = Object.keys(cleaned)
    .map(Number)
    .sort((a, b) => a - b);
  const timeWindows = [
    ...new Map(
      daysOfWeek
        .flatMap((d) => cleaned[d] || [])
        .map((w) => [`${w.start}:${w.end}`, w] as const),
    ).values(),
  ];
  return { daysOfWeek, timeWindows, dayWindows: cleaned };
}

type OpenEditor = {
  staffId: string;
  day: number;
  top: number;
  left: number;
};

type Props = {
  staff: Staff[];
  loading?: boolean;
  onSaveSchedule: (staffId: string, schedule: Staff['schedule']) => Promise<void>;
  onOpenConfig?: () => void;
};

export default function StaffScheduleListView({
  staff,
  loading,
  onSaveSchedule,
  onOpenConfig,
}: Props) {
  const [q, setQ] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<number, DayWindow[]>>>>({});
  const [openCell, setOpenCell] = useState<OpenEditor | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = staff.filter((s) => s.status !== 'off');
    if (!needle) return list;
    return list.filter(
      (s) =>
        s.fullName.toLowerCase().includes(needle) ||
        (s.whatsappE164 || s.phoneE164 || '').includes(needle),
    );
  }, [staff, q]);

  const dayWindowsFor = (s: Staff): Partial<Record<number, DayWindow[]>> => {
    return drafts[s._id] ?? staffDayWindows(s);
  };

  const setDayWindows = (staffId: string, base: Staff, day: number, windows: DayWindow[]) => {
    const current = { ...dayWindowsFor(base) };
    if (!windows.length) delete current[day];
    else current[day] = sanitizeWindows(windows);
    setDrafts((d) => ({ ...d, [staffId]: current }));
  };

  const dirtyIds = useMemo(() => new Set(Object.keys(drafts)), [drafts]);

  const openStaff = openCell ? staff.find((s) => s._id === openCell.staffId) : null;
  const openWindows = openStaff ? dayWindowsFor(openStaff)[openCell!.day] : undefined;
  const openOn = Boolean(openWindows?.length);

  useEffect(() => {
    if (!openCell) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCell(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCell]);

  const openDayEditor = (s: Staff, day: number, el: HTMLElement) => {
    if (openCell?.staffId === s._id && openCell.day === day) {
      setOpenCell(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const panelW = 280;
    const panelH = 320;
    let left = rect.left + rect.width / 2 - panelW / 2;
    let top = rect.bottom + 8;
    left = Math.max(12, Math.min(left, window.innerWidth - panelW - 12));
    if (top + panelH > window.innerHeight - 12) {
      top = Math.max(12, rect.top - panelH - 8);
    }
    setOpenCell({ staffId: s._id, day, top, left });
  };

  const handleSaveRow = async (s: Staff) => {
    const dayWindows = dayWindowsFor(s);
    const schedule = scheduleFromDayWindows(dayWindows);
    setSavingId(s._id);
    try {
      await onSaveSchedule(s._id, schedule);
      setDrafts((d) => {
        const next = { ...d };
        delete next[s._id];
        return next;
      });
      setOpenCell(null);
      toast.success(`Horaires · ${s.fullName}`);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur enregistrement');
    } finally {
      setSavingId(null);
    }
  };

  const applyPresetAllActive = (s: Staff, windows: DayWindow[]) => {
    const current = { ...dayWindowsFor(s) };
    const days = Object.keys(current).map(Number);
    const targets = days.length ? days : [...DAY_DISPLAY_ORDER].slice(0, 5);
    for (const d of targets) {
      current[d] = windows.map((w) => ({ ...w }));
    }
    setDrafts((d) => ({ ...d, [s._id]: current }));
  };

  const editorPortal =
    openCell && openStaff
      ? createPortal(
          <>
            <button
              type="button"
              className="staff-sched-backdrop"
              aria-label="Fermer"
              onClick={() => setOpenCell(null)}
            />
            <div
              ref={panelRef}
              className="staff-sched-float"
              style={{ top: openCell.top, left: openCell.left }}
              role="dialog"
              aria-label={`Horaires ${DAY_FULL_LABELS[openCell.day]}`}
            >
              <div className="staff-sched-pop-h">
                <div>
                  <strong>{DAY_FULL_LABELS[openCell.day]}</strong>
                  <div className="staff-sched-float-sub">{openStaff.fullName}</div>
                </div>
                <div className="planning-onoff">
                  <span className={!openOn ? 'on' : ''}>Off</span>
                  <div
                    className={`toggle${openOn ? ' on' : ''}`}
                    onClick={() =>
                      setDayWindows(
                        openStaff._id,
                        openStaff,
                        openCell.day,
                        openOn ? [] : [{ start: '08:00', end: '17:00' }],
                      )
                    }
                    role="switch"
                    aria-checked={openOn}
                    onKeyDown={() => {}}
                  />
                  <span className={openOn ? 'on' : ''}>On</span>
                </div>
              </div>

              {openOn ? (
                <>
                  <div className="staff-sched-presets">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          setDayWindows(openStaff._id, openStaff, openCell.day, p.windows)
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {(openWindows || []).map((w, idx) => (
                    <div key={idx} className="staff-sched-slot">
                      <input
                        type="time"
                        value={w.start}
                        onChange={(e) => {
                          const next = [...(openWindows || [])];
                          next[idx] = { ...next[idx], start: e.target.value };
                          setDayWindows(openStaff._id, openStaff, openCell.day, next);
                        }}
                      />
                      <span>→</span>
                      <input
                        type="time"
                        value={w.end}
                        onChange={(e) => {
                          const next = [...(openWindows || [])];
                          next[idx] = { ...next[idx], end: e.target.value };
                          setDayWindows(openStaff._id, openStaff, openCell.day, next);
                        }}
                      />
                      <button
                        type="button"
                        className="x"
                        onClick={() => {
                          const next = (openWindows || []).filter((_, i) => i !== idx);
                          setDayWindows(openStaff._id, openStaff, openCell.day, next);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="staff-sched-float-actions">
                    <button
                      type="button"
                      className="staff-sched-add"
                      onClick={() =>
                        setDayWindows(openStaff._id, openStaff, openCell.day, [
                          ...(openWindows || []),
                          { start: '14:00', end: '18:00' },
                        ])
                      }
                    >
                      + Créneau
                    </button>
                    <button
                      type="button"
                      className="staff-sched-add"
                      onClick={() =>
                        applyPresetAllActive(
                          openStaff,
                          openWindows || [{ start: '08:00', end: '17:00' }],
                        )
                      }
                    >
                      → Jours actifs
                    </button>
                  </div>
                </>
              ) : (
                <p className="staff-sched-off-hint">
                  Jour off — activez le toggle pour définir les créneaux.
                </p>
              )}

              <div className="staff-sched-float-foot">
                <button type="button" className="ghost" onClick={() => setOpenCell(null)}>
                  Fermer
                </button>
                <button
                  type="button"
                  className="prim"
                  disabled={!dirtyIds.has(openStaff._id) || savingId === openStaff._id}
                  onClick={() => void handleSaveRow(openStaff)}
                >
                  {savingId === openStaff._id ? '…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="staff-sched-root">
      <div className="staff-sched-hero">
        <div>
          <h1>
            Horaires <span className="badge">{rows.length} membres</span>
          </h1>
          <p className="sub">
            1) Cliquez une case jour (L→D) · 2) Off/On + créneaux · 3) Enregistrer la ligne.
          </p>
        </div>
        <div className="staff-sched-toolbar">
          <input
            className="staff-sched-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un membre…"
          />
          {onOpenConfig ? (
            <button type="button" className="staff-sched-link" onClick={onOpenConfig}>
              Config Équipe →
            </button>
          ) : null}
        </div>
      </div>

      {loading && staff.length === 0 ? (
        <p className="staff-sched-empty">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="staff-sched-empty">Aucun membre actif.</p>
      ) : (
        <div className="staff-sched-table-wrap">
          <table className="staff-sched-table">
            <thead>
              <tr>
                <th className="staff-sched-col-name">Membre</th>
                {DAY_DISPLAY_ORDER.map((d) => (
                  <th key={d} title={DAY_FULL_LABELS[d]}>
                    {DAY_LABELS[d]}
                  </th>
                ))}
                <th className="staff-sched-col-action"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const dw = dayWindowsFor(s);
                const dirty = dirtyIds.has(s._id);
                const saving = savingId === s._id;
                return (
                  <tr key={s._id} className={dirty ? 'dirty' : ''}>
                    <td className="staff-sched-col-name">
                      <div className="staff-sched-identity">
                        <span className="staff-sched-av">{initials(s.fullName)}</span>
                        <div>
                          <div className="nm">{s.fullName}</div>
                          <div className="ph">{s.whatsappE164 || s.phoneE164}</div>
                        </div>
                      </div>
                    </td>
                    {DAY_DISPLAY_ORDER.map((day) => {
                      const windows = dw[day];
                      const on = Boolean(windows?.length);
                      const open = openCell?.staffId === s._id && openCell.day === day;
                      return (
                        <td key={day} className="staff-sched-day-td">
                          <button
                            type="button"
                            className={`staff-sched-day-cell${on ? ' on' : ''}${open ? ' open' : ''}`}
                            onClick={(e) => openDayEditor(s, day, e.currentTarget)}
                          >
                            {labelWindows(windows)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="staff-sched-col-action">
                      <button
                        type="button"
                        className="staff-sched-save"
                        disabled={!dirty || saving}
                        onClick={() => void handleSaveRow(s)}
                      >
                        {saving ? '…' : dirty ? 'Enregistrer' : 'OK'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editorPortal}
    </div>
  );
}
