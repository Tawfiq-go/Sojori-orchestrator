import { useEffect, useState } from 'react';
import { getStaffDayTimeline, type DayTimelineTask } from '../../../services/fulltaskApi';
import { pillLabelForType } from './staffDesignConstants';
import type { Staff } from './types';

const START_HOUR = 8;
const END_HOUR = 20;
const SPAN_HOURS = END_HOUR - START_HOUR;

function hourFromScheduledAt(scheduledAt?: string): number | null {
  if (!scheduledAt) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(scheduledAt);
  if (!m) return null;
  const h = Number(m[1]) + Number(m[2]) / 60;
  return Number.isFinite(h) ? h : null;
}

function statusColor(status: string): string {
  if (status === 'done') return '#0d8a4f';
  if (status === 'doing') return '#1d4ed8';
  if (status === 'cancelled' || status === 'rejected') return '#9aa3ad';
  return '#b45309';
}

/** Planning horizontal 8h–20h, une ligne par staff — tâches du jour positionnées par heure prévue. */
export default function DayTimeline({ staff }: { staff: Staff[] }) {
  const [tasks, setTasks] = useState<DayTimelineTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStaffDayTimeline()
      .then((rows) => {
        if (!cancelled) setTasks(rows);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byStaff = new Map<string, DayTimelineTask[]>();
  tasks.forEach((t) => {
    if (!byStaff.has(t.assignedTo)) byStaff.set(t.assignedTo, []);
    byStaff.get(t.assignedTo)!.push(t);
  });

  const activeStaff = staff.filter((s) => byStaff.has(s._id) && s.status !== 'off');

  const hourMarks = Array.from({ length: SPAN_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="day-timeline">
      <div className="day-timeline-h">
        <span style={{ width: 140, flexShrink: 0 }} />
        <div className="day-timeline-hours">
          {hourMarks.map((h) => (
            <span key={h} style={{ left: `${((h - START_HOUR) / SPAN_HOURS) * 100}%` }}>
              {h}h
            </span>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: 'var(--t3)', fontSize: 12.5 }}>Chargement…</p>}
      {!loading && activeStaff.length === 0 && (
        <p style={{ color: 'var(--t3)', fontSize: 12.5 }}>Aucune tâche planifiée aujourd'hui.</p>
      )}

      {activeStaff.map((s) => {
        const staffTasks = byStaff.get(s._id) ?? [];
        return (
          <div key={s._id} className="day-timeline-row">
            <div className="day-timeline-name" title={s.fullName}>
              {s.fullName}
            </div>
            <div className="day-timeline-track">
              {staffTasks.map((t) => {
                const startHour = hourFromScheduledAt(t.scheduledAt) ?? START_HOUR;
                const clampedStart = Math.min(Math.max(startHour, START_HOUR), END_HOUR - 0.1);
                const widthHours = Math.max(t.estimatedMinutes / 60, 0.25);
                const leftPct = ((clampedStart - START_HOUR) / SPAN_HOURS) * 100;
                const widthPct = Math.min((widthHours / SPAN_HOURS) * 100, 100 - leftPct);
                const meta = pillLabelForType(t.type);
                return (
                  <div
                    key={t._id}
                    className="day-timeline-task"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      background: statusColor(t.status),
                    }}
                    title={`${meta?.label ?? t.type} · ${t.guestName ?? ''} · ${t.estimatedMinutes} min`}
                  >
                    {meta?.emoji ?? '•'} {meta?.label ?? t.type}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
