// ════════════════════════════════════════════════════════════════════
// TasksSection.tsx — section "📋 Tâches liées" (drop-in)
// Groupe par urgency : 🔥 Urgent / 📋 À venir / ✅ Terminées
// Supporte 9 types : ménage, arrivée, départ, conciergerie, support,
// transport, enregistrement, maintenance, other.
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Collapse, Skeleton } from '@mui/material';
import { T, formatDeadline } from './_tokens';
import type { ReservationTask } from '../../types/reservationTask.types';
import TaskCard from './TaskCard';

export interface TasksSectionProps {
  tasks?: ReservationTask[];
  loading?: boolean;
  title?: string;
  /** grouped = WA (Urgent/À venir/Terminées), flat = OTA */
  layout?: 'grouped' | 'flat';
  onContactStaff?: (t: ReservationTask) => void;
  onViewDetails?: (t: ReservationTask) => void;
  onAssign?: (t: ReservationTask) => void;
}

function isUrgent(t: ReservationTask) {
  const u = formatDeadline(t.deadline || t.scheduledFor).urgency;
  const s = (t.status || '').toUpperCase();
  return (u === 'urgent' || u === 'late') && s !== 'COMPLETED' && s !== 'CANCELLED';
}
function isDone(t: ReservationTask) {
  const s = (t.status || '').toUpperCase();
  return s === 'COMPLETED' || s === 'CANCELLED';
}

interface GroupProps {
  label: string;
  emoji: string;
  tasks: ReservationTask[];
  defaultOpen?: boolean;
  tone: 'urgent' | 'upcoming' | 'done';
  onContactStaff?: (t: ReservationTask) => void;
  onViewDetails?: (t: ReservationTask) => void;
  onAssign?: (t: ReservationTask) => void;
}

function Group({ label, emoji, tasks, defaultOpen, tone, ...handlers }: GroupProps) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  if (tasks.length === 0) return null;
  const cnt = { urgent: { bg: T.errorTint, c: T.error }, upcoming: { bg: T.primaryTint, c: T.primaryDeep }, done: { bg: T.successTint, c: T.success } }[tone];

  return (
    <Box sx={{ mb: 1 }}>
      <Stack
        direction="row"
        gap={0.875}
        onClick={() => setOpen((o) => !o)}
        sx={{ py: 0.625, cursor: 'pointer', userSelect: 'none', alignItems: 'center' }}
      >
        <Box sx={{
          fontSize: 9, color: T.text3, width: 10, textAlign: 'center', lineHeight: 1,
          transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s',
        }}>▶</Box>
        <Box sx={{ fontSize: 12, lineHeight: 1 }}>{emoji}</Box>
        <Typography sx={{
          fontSize: 10, fontWeight: 700, color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{label}</Typography>
        <Box sx={{
          ml: 'auto', fontFamily: '"Geist Mono", monospace', fontSize: 9, fontWeight: 700,
          background: cnt.bg, color: cnt.c, px: 0.875, py: '1px', borderRadius: 999,
          letterSpacing: '0.04em',
        }}>{tasks.length}</Box>
      </Stack>
      <Collapse in={open} timeout={200}>
        <Stack gap={0.75} sx={{ pt: 0.75 }}>
          {tasks.map(t => <TaskCard key={t.taskId} task={t} {...handlers} />)}
        </Stack>
      </Collapse>
    </Box>
  );
}

export default function TasksSection({
  tasks = [], loading, title = 'Tâches liées', layout = 'grouped', ...handlers
}: TasksSectionProps) {
  const grouped = useMemo(() => {
    const urgent: ReservationTask[] = [];
    const upcoming: ReservationTask[] = [];
    const done: ReservationTask[] = [];
    const byDate = (a: ReservationTask, b: ReservationTask) =>
      (a.deadline || a.scheduledFor || '').localeCompare(b.deadline || b.scheduledFor || '');
    tasks.forEach(t => {
      if (isDone(t)) done.push(t);
      else if (isUrgent(t)) urgent.push(t);
      else upcoming.push(t);
    });
    urgent.sort(byDate); upcoming.sort(byDate); done.sort((a, b) => byDate(b, a));
    return { urgent, upcoming, done };
  }, [tasks]);

  const showHeader = title.trim().length > 0;

  const header = showHeader ? (
    <Stack direction="row" gap={0.875} sx={{ alignItems: 'center',  mb: 1.25 }}>
      <Box sx={{ fontSize: 12 }}>📋</Box>
      <Typography sx={{
        fontSize: 10.5, fontWeight: 700, color: T.text2,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: '"Geist Mono", monospace',
      }}>{title}</Typography>
      {tasks.length > 0 && (
        <Box sx={{
          ml: 'auto', fontFamily: '"Geist Mono", monospace', fontSize: 9.5, fontWeight: 700,
          color: T.primaryDeep, background: T.primaryTint, px: 0.875, py: '1px',
          borderRadius: 999, letterSpacing: '0.04em',
        }}>{tasks.length}</Box>
      )}
    </Stack>
  ) : null;

  if (loading) return <Box>{header}<Stack gap={0.875}>{[1,2].map(i => <Skeleton key={i} variant="rounded" height={80} sx={{ bgcolor: T.bg2, borderRadius: 1.125 }} />)}</Stack></Box>;

  if (tasks.length === 0) return (
    <Box>{header}
      <Box sx={{
        p: 2, textAlign: 'center', fontSize: 11.5, color: T.text4,
        border: `1px dashed ${T.border}`, borderRadius: 1.25, background: T.bg2,
      }}>
        <Box sx={{ fontSize: 22, mb: 0.625, opacity: 0.5 }}>📭</Box>
        Aucune tâche liée à cette réservation
      </Box>
    </Box>
  );

  if (layout === 'flat') {
    return (
      <Box>
        {header}
        <Stack gap={0.75}>
          {tasks.map((t) => (
            <TaskCard key={t.taskId} task={t} {...handlers} />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>{header}
      <Group label="Urgent" emoji="🔥" tone="urgent" tasks={grouped.urgent} defaultOpen {...handlers} />
      <Group label="À venir" emoji="📋" tone="upcoming" tasks={grouped.upcoming} defaultOpen {...handlers} />
      <Group label="Terminées" emoji="✅" tone="done" tasks={grouped.done} defaultOpen={false} {...handlers} />
    </Box>
  );
}
