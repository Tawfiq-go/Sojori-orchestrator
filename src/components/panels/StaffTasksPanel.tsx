// ════════════════════════════════════════════════════════════════════
// Sojori — StaffTasksPanel (Drawer droit 400px)
// Liste tâches d'un staff avec filtres rapides + click → détail
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import {
  Drawer, Box, Stack, Typography, IconButton, Avatar, Chip, Button,
  Divider, Tooltip,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e', primaryTint: 'rgba(230,176,34,0.08)',
  ai: '#8b5cf6', aiTint: 'rgba(139,92,246,0.10)',
  success: '#10b981', successTint: 'rgba(16,185,129,0.10)',
  warning: '#f59e0b', warningTint: 'rgba(245,158,11,0.10)',
  error: '#ef4444', errorTint: 'rgba(239,68,68,0.10)',
  info: '#06b6d4', infoTint: 'rgba(6,182,212,0.10)',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170', text4: '#b8b09b',
  bg1: '#fff', bg2: '#f5f3ec', bg3: '#ebe7da', border: 'rgba(26,20,8,0.08)',
};

const AVA_BG: Record<string, string> = {
  Y: '#ec4899', H: '#06b6d4', M: '#d97706', F: '#16a34a', K: '#8b5cf6',
};

type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'overdue';

export interface StaffTask {
  id: string;
  emoji: string;
  type: string;
  title: string;
  listing: string;
  datetime: string;
  status: TaskStatus;
  priority: 'high' | 'med' | 'low';
}

const STATUS_META: Record<TaskStatus, { label: string; bg: string; color: string }> = {
  todo:    { label: 'À faire',  bg: T.infoTint,    color: '#0e7490' },
  doing:   { label: 'En cours', bg: T.warningTint, color: '#b45309' },
  review:  { label: 'Review',   bg: T.aiTint,      color: T.ai },
  done:    { label: 'Complété', bg: T.successTint, color: '#047857' },
  overdue: { label: 'Retard',   bg: T.errorTint,   color: '#b91c1c' },
};

const MOCK_TASKS: StaffTask[] = [
  { id: 't1', emoji: '🧹', type: 'Ménage',      title: 'Pré-arrivée Villa Belvédère', listing: 'Villa Belvédère · Nice', datetime: 'Auj. 14:00', status: 'doing', priority: 'high' },
  { id: 't2', emoji: '🛬', type: 'Check-in',    title: 'Accueil Marco Rossi',          listing: 'Dar Sojori',            datetime: 'Auj. 16:30', status: 'todo',  priority: 'med' },
  { id: 't3', emoji: '🧹', type: 'Mid-stay',    title: 'Nettoyage hebdo',              listing: 'Atlas Loft',            datetime: 'Demain 10:00', status: 'todo', priority: 'low' },
  { id: 't4', emoji: '🔍', type: 'Inspection',  title: 'Post-checkout James P.',       listing: 'Villa Belvédère',       datetime: 'Hier 14:00',  status: 'done',  priority: 'low' },
  { id: 't5', emoji: '🔧', type: 'Maintenance', title: 'Vérifier thermostat',         listing: 'Médina House',          datetime: 'Hier 11:00',  status: 'overdue', priority: 'med' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  staffName?: string;
  staffInitials?: string;
  staffRole?: string;
  tasks?: StaffTask[];
  onTaskClick?: (task: StaffTask) => void;
}

export default function StaffTasksPanel({
  open, onClose,
  staffName = 'Yasmine K.', staffInitials = 'YK', staffRole = 'Chef ménage',
  tasks = MOCK_TASKS, onTaskClick,
}: Props) {
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');

  const counts = useMemo(() => {
    const c = { all: tasks.length, todo: 0, doing: 0, review: 0, done: 0, overdue: 0 };
    tasks.forEach(t => { c[t.status]++; });
    return c;
  }, [tasks]);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, bgcolor: T.bg2 } }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: AVA_BG[staffInitials[0]] || T.text4, fontSize: 14, fontWeight: 700 }}>
              {staffInitials}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{staffName}</Typography>
              <Typography sx={{ fontSize: 11, color: T.text3 }}>{staffRole}</Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1, textTransform: 'uppercase' }}>
          {filtered.length} tâche{filtered.length > 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Filtres */}
      <Stack direction="row" spacing={0.75} sx={{ p: 1.5, flexWrap: 'wrap', rowGap: 1, bgcolor: T.bg1, borderBottom: `1px solid ${T.border}` }} useFlexGap>
        {(['all', 'todo', 'doing', 'review', 'done', 'overdue'] as const).map(s => (
          <Chip key={s} size="small" clickable
            label={`${s === 'all' ? 'Toutes' : STATUS_META[s].label} · ${counts[s]}`}
            color={filter === s ? 'primary' : 'default'}
            variant={filter === s ? 'filled' : 'outlined'}
            onClick={() => setFilter(s)}
          />
        ))}
      </Stack>

      {/* Liste tâches */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: T.text3 }}>
            <Typography variant="h3" sx={{ mb: 1 }}>✨</Typography>
            <Typography variant="body2">Aucune tâche dans cette catégorie.</Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {filtered.map(t => {
              const sm = STATUS_META[t.status];
              const pColor = t.priority === 'high' ? T.error : t.priority === 'med' ? T.warning : T.info;
              return (
                <Box key={t.id}
                  onClick={() => onTaskClick?.(t)}
                  sx={{
                    p: 1.5, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5,
                    cursor: 'pointer', transition: 'all 0.15s',
                    borderLeft: `3px solid ${pColor}`,
                    '&:hover': { boxShadow: '0 4px 12px rgba(26,20,8,0.06)', transform: 'translateY(-1px)' },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                    <Box sx={{ fontSize: 16 }}>{t.emoji}</Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: T.text3, fontFamily: 'Geist Mono', letterSpacing: 0.3, flex: 1 }}>
                      {t.type.toUpperCase()}
                    </Typography>
                    <Chip size="small" label={sm.label}
                      sx={{ bgcolor: sm.bg, color: sm.color, fontWeight: 600, fontSize: 10, height: 20 }} />
                  </Stack>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: T.text, lineHeight: 1.3, mb: 0.5 }}>
                    {t.title}
                  </Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ fontSize: 11 }}>
                    <Typography sx={{ fontSize: 11, color: T.text3 }}>📍 {t.listing}</Typography>
                    <Typography sx={{ fontSize: 11, color: T.text2, fontFamily: 'Geist Mono', fontWeight: 600 }}>
                      {t.datetime}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Footer actions */}
      <Box sx={{ p: 1.5, borderTop: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="outlined" sx={{ textTransform: 'none', flex: 1 }}>💬 Message</Button>
          <Button fullWidth variant="contained" sx={{
            textTransform: 'none', fontWeight: 600, flex: 1,
            background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)`,
            color: T.text,
            '&:hover': { background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)` },
          }}>+ Assigner tâche</Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
