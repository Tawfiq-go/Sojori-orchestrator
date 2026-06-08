// ════════════════════════════════════════════════════════════════════
// KanbanView.tsx — 4 colonnes par statut · drag & drop natif HTML5
// • Created · Assigned · In Progress · Completed
// • Stats footer (non assignées, retards, complétées, taux, temps moyen)
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Button, IconButton } from '@mui/material';
import { T, type TaskItem, type TaskStatus, TASK_CHIP_STYLES, initialsFrom, SOJORI_KEYFRAMES } from './_shared';

const STAFF_COLOR_BY_INDEX = [
  'linear-gradient(135deg,#a5f3fc,#0e7490)',
  'linear-gradient(135deg,#86efac,#16a34a)',
  'linear-gradient(135deg,#fde68a,#d97706)',
  'linear-gradient(135deg,#ddd6fe,#7c3aed)',
  'linear-gradient(135deg,#fda4af,#ec4899)',
];

const COLUMNS: { id: TaskStatus; name: string; tone: 'neutral' | 'info' | 'warning' | 'success' }[] = [
  { id: 'CREATED',     name: 'Créées',      tone: 'neutral' },
  { id: 'ASSIGNED',    name: 'Assignées',   tone: 'info' },
  { id: 'IN_PROGRESS', name: 'En cours',    tone: 'warning' },
  { id: 'COMPLETED',   name: 'Terminées',   tone: 'success' },
];

export interface KanbanViewProps {
  tasks: TaskItem[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (t: TaskItem) => void;
  onNewTask?: () => void;
}

export default function KanbanView({ tasks, onTaskMove, onTaskClick, onNewTask }: KanbanViewProps) {
  const [dragged, setDragged] = useState<TaskItem | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = { CREATED: [], ASSIGNED: [], IN_PROGRESS: [], COMPLETED: [] };
    tasks.forEach(t => { (map[t.taskStatus] ||= []).push(t); });
    return map;
  }, [tasks]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const unassigned = tasks.filter(t => !t.staffId && t.taskStatus !== 'COMPLETED').length;
    const late = tasks.filter(t => (t.startDate || '').slice(0, 10) < today && t.taskStatus !== 'COMPLETED').length;
    const completedToday = tasks.filter(t => t.taskStatus === 'COMPLETED' && (t.startDate || '').slice(0, 10) === today).length;
    const rate = tasks.length ? Math.round((grouped.COMPLETED.length / tasks.length) * 100) : 0;
    return { unassigned, late, total: tasks.length, completedToday, rate };
  }, [tasks, grouped]);

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto', p: { xs: 2, md: '20px 24px' } }}>
      <style>{SOJORI_KEYFRAMES}</style>

      <Stack direction="row" alignItems="baseline" gap={1.75} sx={{ mb: 1.75 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em' }}>Kanban Tâches</Typography>
        <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
          {tasks.length} tâches · drag pour changer de statut
        </Typography>
        <Stack direction="row" gap={1} sx={{ ml: 'auto' }}>
          <Button sx={{ ...btnGhost }}>⚙ Filtres</Button>
          <Button onClick={onNewTask} sx={{ ...btnPrim }}>+ Nouvelle tâche</Button>
        </Stack>
      </Stack>

      <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mb: 1.75, alignItems: 'center' }}>
        <Typography sx={{ ml: 'auto', fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
          Glisser-déposer entre colonnes pour changer le statut
        </Typography>
      </Stack>

      {/* 4 columns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.75 }}>
        {COLUMNS.map(col => (
          <Column
            key={col.id} col={col}
            tasks={grouped[col.id]}
            isDropTarget={dropTarget === col.id}
            onDragOver={() => setDropTarget(col.id)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={() => {
              if (dragged && dragged.taskStatus !== col.id) onTaskMove?.(dragged._id, col.id);
              setDragged(null); setDropTarget(null);
            }}
            onTaskDragStart={setDragged}
            onTaskClick={onTaskClick}
          />
        ))}
      </Box>

      {/* Stats footer */}
      <Stack direction="row" gap={1.75} flexWrap="wrap" sx={{
        mt: 1.75, p: '12px 16px', bgcolor: T.bg1, border: `1px solid ${T.border}`,
        borderRadius: 1.4,
      }}>
        <Stat value={stats.unassigned} label="Non assignées" tone="error" />
        <Sep />
        <Stat value={stats.late} label="En retard" tone="warning" />
        <Sep />
        <Stat value={stats.total} label="Total tâches" />
        <Sep />
        <Stat value={stats.completedToday} label="Complétées auj." tone="success" />
        <Sep />
        <Stat value={`${stats.rate}%`} label="Taux complétion" />
      </Stack>
    </Box>
  );
}

/* ─── Column ─── */
function Column({ col, tasks, isDropTarget, onDragOver, onDragLeave, onDrop, onTaskDragStart, onTaskClick }: {
  col: typeof COLUMNS[0]; tasks: TaskItem[]; isDropTarget: boolean;
  onDragOver: () => void; onDragLeave: () => void; onDrop: () => void;
  onTaskDragStart: (t: TaskItem) => void; onTaskClick?: (t: TaskItem) => void;
}) {
  const toneMap = {
    neutral: { dot: T.borderStrong, badge: 'rgba(20,17,10,0.10)', badgeC: T.text },
    info:    { dot: T.info,         badge: T.infoTint,            badgeC: T.info },
    warning: { dot: T.warning,      badge: T.warningTint,         badgeC: T.warning },
    success: { dot: T.success,      badge: T.successTint,         badgeC: T.success },
  }[col.tone];

  return (
    <Box sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
      display: 'flex', flexDirection: 'column', minHeight: 580,
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)', overflow: 'hidden',
    }}>
      <Stack direction="row" alignItems="center" gap={1.125} sx={{
        p: '12px 14px', borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2, flexShrink: 0,
      }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: toneMap.dot }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.005em' }}>{col.name}</Typography>
        <Box sx={{
          fontFamily: '"Geist Mono", monospace', fontSize: 10.5, fontWeight: 700,
          bgcolor: toneMap.badge, color: toneMap.badgeC,
          px: 1, borderRadius: 999, letterSpacing: '0.04em',
        }}>{tasks.length}</Box>
        <IconButton size="small" sx={{ ml: 'auto', width: 24, height: 24, color: T.text3, fontSize: 14 }}>+</IconButton>
      </Stack>

      <Box
        onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.preventDefault(); onDrop(); }}
        sx={{
          flex: 1, p: 1.25, display: 'flex', flexDirection: 'column', gap: 1,
          overflowY: 'auto', overscrollBehavior: 'contain',
          bgcolor: isDropTarget ? T.primaryTint : 'transparent', transition: 'background 0.15s',
        }}>
        {tasks.map((t, i) => (
          <TaskCard key={t._id} task={t} staffIndex={i}
            onDragStart={() => onTaskDragStart(t)} onClick={() => onTaskClick?.(t)} />
        ))}
        {tasks.length === 0 && (
          <Box sx={{
            p: '30px 14px', textAlign: 'center', color: T.text4, fontSize: 11.5,
            border: `2px dashed ${T.borderStrong}`, borderRadius: 1.25, bgcolor: T.bg2, m: 'auto 0',
          }}>
            <Box sx={{ fontSize: 24, mb: 0.75, opacity: 0.5 }}>📋</Box>
            Aucune tâche
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ─── Task card ─── */
function TaskCard({ task, staffIndex, onDragStart, onClick }: {
  task: TaskItem; staffIndex: number; onDragStart: () => void; onClick?: () => void;
}) {
  const type = task.type || 'task';
  const style = TASK_CHIP_STYLES[type] || TASK_CHIP_STYLES.task;
  const isUnassigned = !task.staffId && task.taskStatus !== 'COMPLETED';
  const today = new Date().toISOString().slice(0, 10);
  const isLate = (task.startDate || '').slice(0, 10) < today && task.taskStatus !== 'COMPLETED';
  const isPriority = isLate || task.emergency === 'urgent';
  const time = task.startDate ? new Date(task.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const isCompleted = task.taskStatus === 'COMPLETED';

  return (
    <Box draggable onDragStart={onDragStart} onClick={onClick}
      sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.4,
        p: '10px 12px', cursor: 'grab', transition: 'all 0.15s', position: 'relative',
        opacity: isCompleted ? 0.75 : 1,
        ...(isPriority ? { borderLeft: `3px solid ${T.error}` } : {}),
        '&:hover': { borderColor: T.borderStrong, boxShadow: '0 4px 10px -2px rgba(20,17,10,0.08)', transform: 'translateY(-1px)' },
      }}>
      {isPriority && (
        <Box sx={{
          position: 'absolute', top: 8, right: 8, width: 6, height: 6,
          borderRadius: '50%', bgcolor: T.error, animation: 'sojori-pulse-error 1.8s infinite',
        }} />
      )}

      <Stack direction="row" alignItems="center" gap={0.875} sx={{ mb: 0.75 }}>
        <Box sx={{ fontSize: 14, flexShrink: 0 }}>{style.emoji}</Box>
        <Typography sx={{
          fontSize: 9, fontFamily: '"Geist Mono", monospace', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: style.color,
        }}>{style.label}</Typography>
        <Box sx={{
          ml: 'auto', fontFamily: '"Geist Mono", monospace', fontSize: 9.5, fontWeight: 700,
          color: isLate ? T.error : T.text3,
          bgcolor: isLate ? T.errorTint : T.bg2,
          px: 0.875, borderRadius: 0.625, letterSpacing: '0.04em',
        }}>{isCompleted ? `✓ ${time}` : isLate ? 'En retard' : time}</Box>
      </Stack>

      <Typography sx={{
        fontSize: 13, fontWeight: 700, lineHeight: 1.25, mb: 0.5,
        letterSpacing: '-0.005em',
      }}>{task.name || `${style.label} ${task.listingName}`}</Typography>

      <Typography sx={{ fontSize: 11, color: T.text3, mb: 1 }}>
        <Box component="span" sx={{ fontWeight: 600, color: T.text2 }}>{task.listingName}</Box>
        {task.guestName && <> · {task.guestName}</>}
        {task.reservationNumber && <> · #{task.reservationNumber}</>}
      </Typography>

      <Stack direction="row" alignItems="center" gap={0.75} sx={{
        pt: 1, borderTop: `1px dashed ${T.border}`,
      }}>
        <Box sx={{
          width: 22, height: 22, borderRadius: '50%', color: '#fff',
          fontFamily: '"Geist Mono", monospace', fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(20,17,10,0.10)', flexShrink: 0,
          background: isUnassigned
            ? `linear-gradient(135deg, #fca5a5, ${T.error})`
            : STAFF_COLOR_BY_INDEX[staffIndex % STAFF_COLOR_BY_INDEX.length],
        }}>{isUnassigned ? '⚠' : initialsFrom(task.staffName || task.staffCode)}</Box>
        <Typography sx={{
          fontSize: 11, fontWeight: 600, color: isUnassigned ? T.error : T.text2,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{isUnassigned ? 'Non assigné' : task.staffName}</Typography>
      </Stack>
    </Box>
  );
}

/* ─── Stats ─── */
function Stat({ value, label, tone }: { value: string | number; label: string; tone?: 'success' | 'warning' | 'error' }) {
  const c = tone === 'success' ? T.success : tone === 'warning' ? T.warning : tone === 'error' ? T.error : T.text;
  return (
    <Stack>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 18, fontWeight: 800,
        color: c, letterSpacing: '-0.02em',
      }}>{value}</Typography>
      <Typography sx={{
        fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace',
        textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
      }}>{label}</Typography>
    </Stack>
  );
}
function Sep() { return <Box sx={{ width: 1, bgcolor: T.border }} />; }

const btnPrim = {
  px: 1.75, py: 1, borderRadius: 1.125, fontSize: 12.5, fontWeight: 600, textTransform: 'none',
  background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`, color: '#1a1408',
  boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
  '&:hover': { filter: 'brightness(1.05)' },
};
const btnGhost = {
  px: 1.75, py: 1, borderRadius: 1.125, fontSize: 12.5, fontWeight: 600, textTransform: 'none',
  bgcolor: T.bg1, color: T.text, border: `1px solid ${T.border}`,
};
