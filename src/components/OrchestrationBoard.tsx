// ════════════════════════════════════════════════════════════════════
// Sojori — Orchestration Board (Plan d'orchestration view)
// Drop-in React + MUI component
//
// Usage in your existing OrchestrationPage:
//   <ViewToggle> Chronologie ↔ Plan d'orchestration </ViewToggle>
//   When "Plan d'orchestration" is active → <OrchestrationBoard />
//
// Uses tokens from DashboardV2.components.jsx
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { tokens as t } from './dashboard/DashboardV2.components';

// ─── Data model ─────────────────────────────────────────────────
// A lane is EITHER a single-day lane (with `day` + `steps`),
// OR a grouped lane (with `days[]` — each day has its own `steps`).
// Group consecutive same-title lanes when their combined display
// would exceed 6 vertical boxes.
type StepKind = 'done' | 'late' | 'pending' | 'info' | 'future';
type Channel = 'wa' | 'email' | 'staff' | 'api' | 'notif' | 'auto';

interface Step {
  kind: StepKind;
  icon: string;
  title: string;
  meta: string;
  tag?: string;
  channel?: Channel;
}

interface LaneDay {
  day: string;        // 'J' / 'J+2' / 'J+3'
  label: string;      // '12/05'
  active?: boolean;
  steps: Step[];
}

interface Lane {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  future?: boolean;
  // Either single day:
  day?: string;
  steps?: Step[];
  // Or grouped (max 6 days, each ≤ 6 steps):
  days?: LaneDay[];
}

interface OrchestrationBoardProps {
  lanes?: Lane[];
  onReservationOpen?: () => void;
  onStepClick?: (payload: { lane: Lane; step: Step; day?: LaneDay | null }) => void;
}

// ─── Example data (replace with real props from API) ────────────
const DEFAULT_LANES: Lane[] = [
  { day: 'J-7', icon: '📨', iconBg: t.infoTint, iconColor: '#0e7490', title: 'Message bienvenue',
    steps: [{ kind: 'done', icon: '📧', title: 'Notification envoyée', meta: 'Email · 07/05 17:00', channel: 'email' }] },
  { day: 'J-7', icon: '🔐', iconBg: t.aiTint, iconColor: t.ai, title: 'Registration',
    steps: [
      { kind: 'info', icon: '📱', title: 'WhatsApp', meta: 'Fenêtre terminée', channel: 'wa' },
      { kind: 'late', icon: '🔓', title: 'Registration', meta: '0V / 0D / 0N', tag: 'Retard', channel: 'staff' },
    ]},
  { day: 'J-3', icon: '🎫', iconBg: t.infoTint, iconColor: '#0e7490', title: 'Choisir arrivée',
    steps: [
      { kind: 'info', icon: '📱', title: 'WhatsApp', meta: 'Fenêtre terminée', channel: 'wa' },
      { kind: 'late', icon: '⏰', title: 'Arrivée', meta: '10/05 · 2 relances', tag: 'Retard', channel: 'staff' },
      { kind: 'done', icon: '👤', title: 'Staff', meta: '0/3 essais', channel: 'staff' },
      { kind: 'late', icon: '⏰', title: 'Deadline', meta: 'En retard', tag: 'Retard', channel: 'auto' },
      { kind: 'info', icon: '🔔', title: 'Notif', meta: 'Admin & Client', channel: 'notif' },
    ]},
  // GROUPED: 3 × "Ménage inclus" (J / J+2 / J+3)
  { icon: '🧹', iconBg: t.successTint, iconColor: t.success, title: 'Ménage inclus',
    days: [
      { day: 'J', label: '12/05', active: true, steps: [
        { kind: 'info', icon: '📱', title: 'WhatsApp', meta: 'Disponible', channel: 'wa' },
        { kind: 'pending', icon: '🧺', title: 'Ménage inclus', meta: '12/05 · 1 relance', tag: 'Retard', channel: 'staff' },
        { kind: 'done', icon: '👤', title: 'Staff', meta: '0/3 essais', channel: 'staff' },
        { kind: 'late', icon: '⏰', title: 'Deadline', meta: 'En retard', tag: 'Retard', channel: 'auto' },
      ]},
      { day: 'J+2', label: '14/05', steps: [/* … */] },
      { day: 'J+3', label: '16/05', steps: [/* … */] },
    ]},
  // … rest of lanes — see prototype site/Orchestration Board.html
];

// ─── Helpers ────────────────────────────────────────────────────
const STEP_STYLES: Record<StepKind, { bg: string; border: string; tint: string; text: string; label: string }> = {
  done:    { bg: `linear-gradient(135deg, rgba(16,185,129,0.05), ${t.bg1})`, border: 'rgba(16,185,129,0.30)', tint: t.successTint, text: '#047857', label: 'Complété' },
  late:    { bg: `linear-gradient(135deg, rgba(239,68,68,0.05), ${t.bg1})`,  border: 'rgba(239,68,68,0.30)',  tint: t.errorTint,   text: '#b91c1c', label: 'Retard' },
  pending: { bg: `linear-gradient(135deg, rgba(245,158,11,0.05), ${t.bg1})`, border: 'rgba(245,158,11,0.30)', tint: t.warningTint, text: '#b45309', label: 'En attente' },
  info:    { bg: `linear-gradient(135deg, rgba(6,182,212,0.04), ${t.bg1})`,  border: 'rgba(6,182,212,0.25)',  tint: t.infoTint,    text: '#0e7490', label: 'Info' },
  future:  { bg: t.bg2,                                                       border: t.borderStrong,           tint: t.bg3,         text: t.text3,   label: 'Futur' },
};

const CHANNEL_LABEL: Record<Channel, string> = { wa: 'WhatsApp', email: 'Email', staff: 'Staff', api: 'API', notif: 'Notif', auto: 'Auto' };
const CHANNEL_ICON: Record<Channel, string> = { wa: '📱', email: '📧', staff: '👤', api: '⚡', notif: '🔔', auto: '✨' };

// ─── Component ──────────────────────────────────────────────────
export function OrchestrationBoard({
  lanes = DEFAULT_LANES,
  onReservationOpen,
  onStepClick,
}: OrchestrationBoardProps) {
  const [state, setState] = useState(lanes);

  const switchDay = (laneIdx: number, dayIdx: number) => {
    setState(prev => prev.map((l, i) => {
      if (i !== laneIdx || !l.days) return l;
      return { ...l, days: l.days.map((d, j) => ({ ...d, active: j === dayIdx })) };
    }));
  };

  return (
    <Box sx={{ overflowX: 'auto', pb: 10 }}>
      <Box sx={{
        display: 'grid', gridAutoFlow: 'column',
        gridAutoColumns: '248px', gap: 1.5,
        minWidth: 'max-content',
      }}>
        {state.map((lane, i) => (
          <LaneCard
            key={i}
            lane={lane}
            laneIdx={i}
            onSwitchDay={switchDay}
            onReservationOpen={onReservationOpen}
            onStepClick={onStepClick}
          />
        ))}
      </Box>
    </Box>
  );
}

function LaneCard({
  lane,
  laneIdx,
  onSwitchDay,
  onReservationOpen,
  onStepClick,
}: {
  lane: Lane;
  laneIdx: number;
  onSwitchDay: (l: number, d: number) => void;
  onReservationOpen?: () => void;
  onStepClick?: (payload: { lane: Lane; step: Step; day?: LaneDay | null }) => void;
}) {
  const isGrouped = !!lane.days;
  const activeDay = isGrouped ? (lane.days!.find(d => d.active) ?? lane.days![0]) : null;
  const steps = isGrouped ? activeDay!.steps : lane.steps!;
  const done = steps.filter(s => s.kind === 'done').length;
  const total = steps.length;
  const pct = total ? (done / total) * 100 : 0;

  const doneDays = isGrouped ? lane.days!.filter(d => d.steps.every(s => s.kind === 'done')).length : 0;
  const totalDays = isGrouped ? lane.days!.length : 0;

  return (
    <Box sx={{
      bgcolor: isGrouped ? `linear-gradient(180deg, rgba(230,176,34,0.04), ${t.bg2})` : t.bg2,
      background: isGrouped ? `linear-gradient(180deg, rgba(230,176,34,0.04), ${t.bg2})` : t.bg2,
      border: '1px solid', borderColor: isGrouped ? 'rgba(230,176,34,0.30)' : t.border,
      borderRadius: '12px', p: 1.5,
      opacity: lane.future ? 0.55 : 1, transition: 'all 0.2s',
    }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 1.25,
          cursor: onReservationOpen ? 'pointer' : 'default',
        }}
        onClick={onReservationOpen}
      >
        <Box sx={{
          width: 24, height: 24, borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, bgcolor: lane.iconBg, color: lane.iconColor,
        }}>{lane.icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{
            fontSize: 9.5, fontFamily: 'Geist Mono', fontWeight: 600,
            color: t.text3, letterSpacing: 0.4, textTransform: 'uppercase',
          }}>{isGrouped ? `SÉRIE · ${totalDays} fois` : lane.day}</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.1px' }}>{lane.title}</Typography>
        </Box>
        <Box sx={{
          fontFamily: 'Geist Mono', fontSize: 10, fontWeight: 700,
          p: '2px 7px', borderRadius: '99px', bgcolor: t.bg1,
          border: `1px solid ${t.border}`, color: t.text3,
        }}>
          {isGrouped ? `${doneDays}/${totalDays}` : `${done}/${total}`}
        </Box>
      </Stack>

      {isGrouped && (
        <Box sx={{
          display: 'flex', gap: 0.5, mb: 1, p: 0.375,
          bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '8px',
        }}>
          {lane.days!.map((d, i) => {
            const allDone = d.steps.every(s => s.kind === 'done');
            const anyLate = d.steps.some(s => s.kind === 'late');
            const dotColor = allDone ? t.success : anyLate ? t.error : t.warning;
            return (
              <Box key={i} component="button" onClick={() => onSwitchDay(laneIdx, i)} sx={{
                flex: 1, p: '5px 6px', borderRadius: '6px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.125,
                bgcolor: d.active ? t.primaryTint : 'transparent',
                boxShadow: d.active ? 'inset 0 0 0 1px rgba(230,176,34,0.30)' : 'none',
                cursor: 'pointer', border: 0,
                fontFamily: 'Geist Mono', fontWeight: 600,
                color: d.active ? t.text : t.text3,
                '&:hover': { bgcolor: d.active ? t.primaryTint : t.bg2 },
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dotColor, mb: 0.25 }} />
                <Box sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4 }}>{d.day}</Box>
                <Box sx={{ fontSize: 8.5, opacity: 0.7 }}>{d.label}</Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Box sx={{ height: 3, borderRadius: '99px', bgcolor: t.bg3, mb: 1.25, overflow: 'hidden' }}>
        <Box sx={{
          height: '100%',
          bgcolor: t.success,
          width: `${pct}%`,
          transition: 'width 0.6s cubic-bezier(.34,1.4,.5,1)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': pct > 0 && pct < 100 ? {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
            animation: 'shimmer 2.2s ease-in-out infinite',
          } : {},
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' },
          },
        }} />
      </Box>

      <Stack spacing={1}>
        {steps.map((s, i) => (
          <StepCard
            key={i}
            step={s}
            idx={i}
            onClick={
              onStepClick
                ? () => onStepClick({ lane, step: s, day: activeDay })
                : undefined
            }
          />
        ))}
      </Stack>
    </Box>
  );
}

function StepCard({ step, idx, onClick }: { step: Step; idx: number; onClick?: () => void }) {
  const sty = STEP_STYLES[step.kind];
  const interactive = typeof onClick === 'function';

  return (
    <Box
      onClick={onClick}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      sx={{
        bgcolor: t.bg1,
        background: sty.bg,
        border: '1px solid',
        borderColor: sty.border,
        borderRadius: '10px',
        p: '10px 11px',
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
        animation: step.kind === 'late'
          ? `step-in 0.45s ${idx * 0.04}s cubic-bezier(.34,1.4,.5,1) both, late-pulse 2.4s ease-in-out infinite`
          : `step-in 0.45s ${idx * 0.04}s cubic-bezier(.34,1.4,.5,1) both`,
        transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease',
        '&:hover': interactive
          ? {
              transform: 'translateY(-1px)',
              boxShadow: '0 8px 16px rgba(26,20,8,0.10)',
              borderColor: t.borderStrong,
            }
          : undefined,
        '&:focus-visible': interactive
          ? {
              outline: `2px solid ${t.primary}`,
              outlineOffset: 2,
            }
          : undefined,
        '@keyframes step-in': {
          from: { opacity: 0, transform: 'translateY(6px) scale(0.98)' },
          to:   { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        '@keyframes late-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(239,68,68,0.10)' },
        },
        ...(step.kind === 'done' && {
          '&::before': {
            content: '"✓"', position: 'absolute', top: 8, right: 8,
            width: 18, height: 18, borderRadius: '50%',
            bgcolor: t.success, color: '#fff', fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 3px rgba(16,185,129,0.18)',
            animation: 'check-pop 0.6s cubic-bezier(.34,1.6,.4,1) both',
          },
          '@keyframes check-pop': {
            '0%': { transform: 'scale(0) rotate(-180deg)', opacity: 0 },
            '60%': { transform: 'scale(1.2)', opacity: 1 },
            '100%': { transform: 'scale(1) rotate(0)' },
          },
        }),
        ...(step.kind === 'late' && {
          '&::after': {
            content: '""', position: 'absolute', top: 9, right: 9,
            width: 7, height: 7, borderRadius: '50%',
            bgcolor: t.error,
            animation: 'dot-pulse 1.4s ease-in-out infinite',
          },
          '@keyframes dot-pulse': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.6)', boxShadow: '0 0 0 4px rgba(239,68,68,0.20)' },
          },
        }),
        ...(step.kind === 'pending' && {
          '&::after': {
            content: '""', position: 'absolute', top: 9, right: 9,
            width: 7, height: 7, borderRadius: '50%',
            bgcolor: t.warning,
            animation: 'dot-glow 2s ease-in-out infinite',
          },
          '@keyframes dot-glow': {
            '0%, 100%': { boxShadow: '0 0 0 0 currentColor', opacity: 1 },
            '50%': { boxShadow: '0 0 0 4px rgba(0,0,0,0)', opacity: 0.6 },
          },
        }),
        ...(step.kind === 'future' && { borderStyle: 'dashed' }),
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
        <Box sx={{
          fontFamily: 'Geist Mono', fontSize: 9, fontWeight: 700,
          p: '1px 6px', borderRadius: '4px',
          bgcolor: sty.tint, color: sty.text,
          letterSpacing: 0.4, textTransform: 'uppercase',
        }}>{sty.label}</Box>
        {step.tag && (
          <Box sx={{
            fontFamily: 'Geist Mono', fontSize: 9, fontWeight: 700,
            p: '1px 6px', borderRadius: '4px',
            bgcolor: step.kind === 'late' ? t.errorTint : t.warningTint,
            color: step.kind === 'late' ? '#b91c1c' : '#b45309',
          }}>{step.tag}</Box>
        )}
        {step.channel && (
          <Box sx={{
            ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 0.5,
            fontSize: 9.5, color: t.text3,
            fontFamily: 'Geist Mono', letterSpacing: 0.3,
          }}>{CHANNEL_ICON[step.channel]} {CHANNEL_LABEL[step.channel]}</Box>
        )}
      </Stack>
      <Stack direction="row" spacing={0.875} sx={{ alignItems: 'center', fontSize: 12, fontWeight: 600, mb: 0.5 }}>
        <Box sx={{ fontSize: 14 }}>{step.icon}</Box>{step.title}
      </Stack>
      <Typography sx={{ fontSize: 10.5, color: t.text3, fontFamily: 'Geist Mono', letterSpacing: 0.2 }}>{step.meta}</Typography>
    </Box>
  );
}
