// ════════════════════════════════════════════════════════════════════
// TaskCard.tsx — light theme · multi-types · drop-in
// Le composant qui rend une tâche dans le panneau droit.
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { Box, Stack, Typography, Tooltip } from '@mui/material';
import { T, TASK_META, STATUS_META, formatDeadline, initials } from './_tokens';
import type { TaskType, TaskStatus } from './_tokens';
import type { ReservationTask } from '../../types/reservationTask.types';

export interface TaskCardProps {
  task: ReservationTask;
  onContactStaff?: (t: ReservationTask) => void;
  onViewDetails?: (t: ReservationTask) => void;
  onAssign?: (t: ReservationTask) => void;
}

export default function TaskCard({ task, onContactStaff, onViewDetails, onAssign }: TaskCardProps) {
  const [hover, setHover] = useState(false);
  const meta = TASK_META[(task.type as TaskType) || 'other'] || TASK_META.other;
  const status = STATUS_META[(task.status as TaskStatus) || 'CREATED'] || STATUS_META.CREATED;
  const deadline = useMemo(() => formatDeadline(task.deadline || task.scheduledFor), [task.deadline, task.scheduledFor]);
  const isUrgent = deadline.urgency === 'urgent' || deadline.urgency === 'late';
  const isDone = status.step === 4;
  const isUnassigned = !task.assignedStaff && !isDone;

  return (
    <Box
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onViewDetails?.(task)}
      sx={{
        p: '10px 11px', background: T.bg1,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${isUrgent ? T.error : meta.accent}`,
        borderRadius: 1.125, cursor: 'pointer', position: 'relative',
        opacity: isDone ? 0.65 : 1,
        transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px -4px rgba(20,17,10,0.10)',
          borderColor: T.borderStrong,
        },
      }}
    >
      {isUrgent && !isDone && (
        <Box sx={{
          position: 'absolute', top: 8, right: 8, width: 6, height: 6,
          borderRadius: '50%', background: T.error,
          animation: 'sojori-pulse-error 1.6s infinite',
        }} />
      )}

      {/* Header: type + code */}
      <Stack direction="row" gap={0.875} sx={{ alignItems: 'center',  mb: 0.875 }}>
        <Box sx={{ fontSize: 13, lineHeight: 1 }}>{meta.emoji}</Box>
        <Typography sx={{
          fontSize: 11.5, fontWeight: 700, color: T.text,
          textDecoration: isDone ? 'line-through' : 'none',
        }}>{meta.label}</Typography>
        <Typography sx={{
          ml: 'auto', fontFamily: '"Geist Mono", monospace', fontSize: 9,
          color: T.text4, fontWeight: 700, letterSpacing: '0.04em',
        }}>{task.taskCode}</Typography>
      </Stack>

      {/* Progress 4 steps */}
      <Stack direction="row" gap={0.625} sx={{ alignItems: 'center',  mb: 0.875 }}>
        <Stack direction="row" gap="2px" sx={{ flex: 1 }}>
          {[1,2,3,4].map(i => {
            const active = i <= status.step;
            const shimmer = i === status.step && !isDone && status.step >= 2;
            return (
              <Box key={i} sx={{
                flex: 1, height: 3, borderRadius: '2px',
                background: active ? status.color : T.bg3,
                ...(shimmer ? {
                  background: `linear-gradient(90deg, ${status.color}, ${T.bg3})`,
                  backgroundSize: '200% 100%',
                  animation: 'sojori-shimmer 1.6s infinite linear',
                } : {}),
              }} />
            );
          })}
        </Stack>
        <Typography sx={{
          fontSize: 9, fontWeight: 700, color: status.color,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{status.label}</Typography>
      </Stack>

      {/* Deadline */}
      {deadline.label && (
        <Typography sx={{
          fontSize: 10.5, color: deadline.urgency === 'late' ? T.error : T.text3,
          fontFamily: '"Geist Mono", monospace',
          fontWeight: deadline.urgency !== 'normal' ? 700 : 500,
          mb: 0.875, letterSpacing: '0.02em',
        }}>📅 {deadline.label}</Typography>
      )}

      {/* Footer: staff + hover actions */}
      <Stack direction="row" gap={0.875} sx={{ alignItems: 'center', 
        pt: 0.875, borderTop: `1px dashed ${T.border}`, minHeight: 22,
      }}>
        {task.assignedStaff ? (
          <>
            <Box sx={{
              width: 18, height: 18, borderRadius: '50%', color: '#fff',
              fontFamily: '"Geist Mono", monospace', fontSize: 8, fontWeight: 800,
              background: 'linear-gradient(135deg,#86efac,#0e8c4d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{initials(task.assignedStaff.name)}</Box>
            <Typography sx={{
              fontSize: 10.5, color: T.text2, fontWeight: 600,
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{task.assignedStaff.name}</Typography>
          </>
        ) : (
          <>
            <Box sx={{
              width: 18, height: 18, borderRadius: '50%', color: '#fff',
              background: `linear-gradient(135deg, #fca5a5, ${T.error})`,
              fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>⚠</Box>
            <Typography sx={{
              flex: 1, fontSize: 9.5, color: T.warning, fontWeight: 800,
              fontFamily: '"Geist Mono", monospace',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>Non assigné</Typography>
          </>
        )}

        {hover && (
          <Stack direction="row" gap={0.5}>
            {isUnassigned && (
              <Tooltip title="Assigner" arrow>
                <Box component="button" onClick={(e) => { e.stopPropagation(); onAssign?.(task); }}
                  sx={{
                    all: 'unset', cursor: 'pointer',
                    width: 20, height: 20, borderRadius: 0.625,
                    background: T.bg2, color: T.text2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, '&:hover': { background: T.primaryTint, color: T.primaryDeep },
                  }}>👤</Box>
              </Tooltip>
            )}
            {task.assignedStaff && (
              <Tooltip title="Contacter staff (WhatsApp)" arrow>
                <Box component="button" onClick={(e) => { e.stopPropagation(); onContactStaff?.(task); }}
                  sx={{
                    all: 'unset', cursor: 'pointer',
                    width: 20, height: 20, borderRadius: 0.625,
                    background: T.bg2, color: T.text2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, '&:hover': { background: T.primaryTint, color: T.primaryDeep },
                  }}>💬</Box>
              </Tooltip>
            )}
            <Tooltip title="Voir détails" arrow>
              <Box component="button" onClick={(e) => { e.stopPropagation(); onViewDetails?.(task); }}
                sx={{
                  all: 'unset', cursor: 'pointer',
                  width: 20, height: 20, borderRadius: 0.625,
                  background: T.bg2, color: T.text2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, '&:hover': { background: T.primaryTint, color: T.primaryDeep },
                }}>👁</Box>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
