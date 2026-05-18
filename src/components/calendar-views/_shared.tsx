// ════════════════════════════════════════════════════════════════════
// Sojori Calendar Views · Atelier 2026
// _shared.tsx — tokens, types, helpers, composants réutilisables
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

/* ─── Tokens (alignés DashboardV2) ─── */
export const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a', primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.10)',
  error:   '#c81e1e', errorTint:   'rgba(200,30,30,0.10)',
  info:    '#0673b3', infoTint:    'rgba(6,115,179,0.10)',
  airbnb:  '#FF5A5F', booking: '#003580', vrbo: '#0e7490',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};

/* ─── Constantes dimensions ─── */
export const STAY = { CELL_W: 82, STICKY_W: 240, ROW_H: 76, MAX_CHIPS: 2 };

/** Barres réservation : arrivée à 14h (40% jour), départ ~11h (fin à 40%), 10% marge si 2 resa/jour */
export const STAY_RES_BAR = {
  CHECKIN_OFFSET: 0.4,
  CHECKOUT_END: 0.4,
  SAME_DAY_WIDTH: 0.5,
  TURNOVER_WIDTH: 0.4,
} as const;

/** Position % de la barre Gantt sur la timeline (jours = colonnes égales). */
export function computeReservationBarLayout(
  startIdx: number,
  endIdx: number,
  daysCount: number,
  sameDaySlot = 0,
): { leftPct: number; widthPct: number } {
  if (daysCount <= 0) return { leftPct: 0, widthPct: 0 };

  const cellPct = 100 / daysCount;
  const { CHECKIN_OFFSET, CHECKOUT_END, SAME_DAY_WIDTH, TURNOVER_WIDTH } = STAY_RES_BAR;

  if (sameDaySlot > 0) {
    const leftPct = (startIdx / daysCount) * 100;
    const widthPct = TURNOVER_WIDTH * cellPct;
    return { leftPct, widthPct: Math.max(widthPct, 2) };
  }

  if (startIdx >= endIdx) {
    return {
      leftPct: ((startIdx + CHECKIN_OFFSET) / daysCount) * 100,
      widthPct: Math.max(SAME_DAY_WIDTH * cellPct, 2),
    };
  }

  const leftPct = ((startIdx + CHECKIN_OFFSET) / daysCount) * 100;
  const rightPct = ((endIdx + CHECKOUT_END) / daysCount) * 100;
  const widthPct = Math.max(rightPct - leftPct, SAME_DAY_WIDTH * cellPct);

  return {
    leftPct,
    widthPct: Math.min(widthPct, 100 - leftPct - cellPct * 0.1),
  };
}
export const TEAM = { CELL_W: 84, STICKY_W: 200, ROW_H: 60, MAX_CHIPS: 2 };

/* ─── Types alignés API srv-task ─── */
export type TaskType = 'arrival' | 'departure' | 'cleaning' | 'registration' | 'transport' | 'concierge' | 'support' | 'task';
export type TaskStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
export type Channel = 'airbnb' | 'booking' | 'vrbo' | 'direct';
export type CleaningKind = 'free' | 'paid' | 'sojori';
export type Cleanliness = 'clean' | 'dirty' | 'in_progress' | 'occupied';

export interface TimelineItem {
  type: TaskType;
  category?: string;
  scheduledFor: string;          // ISO 8601
  isTask?: boolean;
  staffId?: string | null;
  staffName?: string | null;
  staffInitials?: string | null;
  status?: TaskStatus;
  cleaning_type?: CleaningKind;
  data?: Record<string, unknown>;
}

export interface ReservationRow {
  reservationId: string;
  guestName: string;
  arrivalDate: string;
  departureDate: string;
  status: 'confirmed' | 'pending';
  channelName?: string;           // mapped to Channel via channelFromName()
  numberOfGuests?: number;
  reservationNumber?: string;
  timeline?: TimelineItem[];
}

export interface ListingRow {
  listingId: string;
  listingName: string;
  city?: string;
  cleanlinessStatus_v2?: Cleanliness;
  occupancyStatus?: 'available' | 'occupied';
  reservations: ReservationRow[];
}

export interface StaffMember {
  _id: string;
  staffCode: string;
  username: string;
  memberRole: 'Staff' | 'Manager' | 'Admin';
  color?: string;                  // teinte unique (assigné côté front)
}

export interface TaskItem {
  _id: string;
  itemNumber: string;
  name: string;
  type: TaskType | null;
  subType?: string | null;
  startDate: string;
  taskStatus: TaskStatus;
  staffId?: string | null;
  staffName?: string | null;
  staffCode?: string | null;
  listingId: string;
  listingName: string;
  reservationNumber?: string;
  guestName?: string;
  emergency?: 'low' | 'medium' | 'high' | 'urgent';
}

/* ─── Helpers ─── */
export function channelFromName(n?: string): Channel {
  const s = (n || '').toLowerCase();
  if (s.includes('airbnb'))  return 'airbnb';
  if (s.includes('booking')) return 'booking';
  if (s.includes('vrbo'))    return 'vrbo';
  return 'direct';
}

export function genDays(start: Date, count: number) {
  const arr = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const months = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];
    arr.push({
      date: d,
      iso: d.toISOString().slice(0, 10),
      day: d.getDate(),
      weekday: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][(d.getDay() + 6) % 7],
      month: months[d.getMonth()],
      frShort: `${d.getDate()} ${months[d.getMonth()]}`,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday: d.toDateString() === today.toDateString(),
    });
  }
  return arr;
}

export function initialsFrom(name?: string | null) {
  if (!name) return '—';
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '');
}

/* ─── Composants réutilisables ─── */

export function KpiPill({ icon, count, label, tone = 'neutral', alert }: {
  icon: string; count: number; label: string;
  tone?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral'; alert?: boolean;
}) {
  const map: Record<string, { bg: string; color: string }> = {
    success: { bg: T.successTint, color: T.success },
    warning: { bg: T.warningTint, color: T.warning },
    error:   { bg: T.errorTint,   color: T.error },
    info:    { bg: T.infoTint,    color: T.info },
    primary: { bg: T.primaryTint, color: T.primaryDeep },
    neutral: { bg: T.bg3,         color: T.text3 },
  };
  const s = map[tone];
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{
      px: 1.625, py: 1, borderRadius: '999px',
      bgcolor: T.bg1, border: `1px solid ${T.border}`, boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Box sx={{
        width: 22, height: 22, borderRadius: 0.75, bgcolor: s.bg, color: s.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        ...(alert ? { animation: 'sojori-pulse-error 1.8s infinite' } : {}),
      }}>{icon}</Box>
      <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{count}</Typography>
      <Typography sx={{
        fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace',
        textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
      }}>{label}</Typography>
    </Stack>
  );
}

export function DayHeader({ day, width }: { day: ReturnType<typeof genDays>[0]; width: number }) {
  return (
    <Box sx={{
      width, py: 1, textAlign: 'center', borderRight: `1px solid ${T.border}`,
      position: 'relative', bgcolor: day.isToday ? T.primaryTint : 'transparent',
      ...(day.isToday ? {
        '&::after': {
          content: '""', position: 'absolute', left: '50%', bottom: 3,
          transform: 'translateX(-50%)', width: 20, height: 2, bgcolor: T.primary, borderRadius: 999,
        },
      } : {}),
    }}>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 9.5, fontWeight: 700,
        color: day.isToday ? T.primaryDeep : day.isWeekend ? T.warning : T.text3,
        letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1,
      }}>{day.weekday}</Typography>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 13, fontWeight: 700,
        color: day.isToday ? T.primaryDeep : T.text, mt: 0.375,
      }}>{day.day}</Typography>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 8.5, color: T.text4, mt: '1px',
      }}>{day.month}</Typography>
    </Box>
  );
}

export function CleanlinessBadge({ status }: { status?: Cleanliness }) {
  const map = {
    clean:       { label: 'CLEAN',     bg: T.successTint, color: T.success },
    dirty:       { label: 'DIRTY',     bg: T.errorTint,   color: T.error },
    in_progress: { label: 'EN COURS',  bg: T.warningTint, color: T.warning },
    occupied:    { label: 'OCCUPÉ',    bg: T.infoTint,    color: T.info },
  };
  const s = map[status || 'clean'];
  return (
    <Box component="span" sx={{
      display: 'inline-block', fontFamily: '"Geist Mono", monospace', fontSize: 9, fontWeight: 700,
      px: 0.75, py: '1px', borderRadius: 999, letterSpacing: '0.06em',
      bgcolor: s.bg, color: s.color, width: 'fit-content',
    }}>{s.label}</Box>
  );
}

export const TASK_CHIP_STYLES: Record<TaskType, { emoji: string; bg: string; color: string; label: string }> = {
  arrival:      { emoji: '🏠', bg: 'rgba(10,143,94,0.12)',  color: T.success, label: 'Arr.' },
  departure:    { emoji: '🚪', bg: 'rgba(200,30,30,0.10)',  color: T.error,   label: 'Dép.' },
  cleaning:     { emoji: '🧹', bg: 'rgba(196,101,6,0.12)',  color: T.warning, label: 'Mén.' },
  registration: { emoji: '📝', bg: 'rgba(6,115,179,0.10)',  color: T.info,    label: 'Enreg.' },
  transport:    { emoji: '🚗', bg: 'rgba(6,115,179,0.08)',  color: T.info,    label: 'Transp.' },
  concierge:    { emoji: '🛎', bg: 'rgba(124,58,237,0.10)', color: T.ai,      label: 'Conc.' },
  support:      { emoji: '🆘', bg: 'rgba(232,121,249,0.10)', color: '#86198f', label: 'Supp.' },
  task:         { emoji: '✅', bg: T.bg2,                    color: T.text2,   label: 'Tâche' },
};

export function TaskChip({ item, compact }: { item: TimelineItem | TaskItem; compact?: boolean }) {
  const type = (('type' in item ? item.type : null) || 'task') as TaskType;
  const s = TASK_CHIP_STYLES[type] || TASK_CHIP_STYLES.task;
  const staff = ('staffName' in item ? item.staffName : null) || ('staffCode' in item ? item.staffCode : null);
  const isUnassigned = !staff && (('taskStatus' in item ? item.taskStatus : item.status) !== 'COMPLETED');

  return (
    <Box sx={{
      height: 17, borderRadius: 0.75, fontSize: 9.5, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 0.375, px: 0.625, overflow: 'hidden',
      whiteSpace: 'nowrap', bgcolor: s.bg, color: s.color,
      ...(isUnassigned ? { boxShadow: `inset 0 0 0 1px ${T.error}` } : {}),
    }}>
      <Box component="span" sx={{ fontSize: 11, flexShrink: 0 }}>{s.emoji}</Box>
      {!compact && (
        <Box component="span" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</Box>
      )}
      {staff && (
        <Box component="span" sx={{
          fontFamily: '"Geist Mono", monospace', fontSize: 8.5, fontWeight: 800,
          bgcolor: 'rgba(255,255,255,0.7)', px: 0.5, borderRadius: 0.375, flexShrink: 0,
        }}>{initialsFrom(staff)}</Box>
      )}
      {isUnassigned && (
        <Box component="span" sx={{
          width: 5, height: 5, borderRadius: '50%', bgcolor: T.error, ml: 0.25,
          animation: 'sojori-pulse-error 1.8s infinite',
        }} />
      )}
    </Box>
  );
}

export function GanttBar({ channel, guestName, reservationNumber, confirmed, leftPct, widthPct }: {
  channel: Channel; guestName: string; reservationNumber?: string; confirmed: boolean;
  leftPct: number; widthPct: number;
}) {
  const grad = {
    airbnb:  `linear-gradient(180deg, #ff8084, ${T.airbnb})`,
    booking: `linear-gradient(180deg, #1a5cb8, ${T.booking})`,
    vrbo:    `linear-gradient(180deg, #22a0bd, ${T.vrbo})`,
    direct:  `linear-gradient(180deg, #cb9b2c, ${T.primary})`,
  }[channel];
  const fg = channel === 'direct' ? '#1a1408' : '#fff';
  return (
    <Box sx={{
      position: 'absolute', top: 6, height: 22, left: `${leftPct}%`, width: `${widthPct}%`,
      borderRadius: '11px', background: grad, color: fg,
      display: 'flex', alignItems: 'center', px: 1, gap: 0.625,
      fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(20,17,10,0.10)', zIndex: 2, cursor: 'pointer',
      transition: 'transform 0.12s, box-shadow 0.12s',
      '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 10px rgba(20,17,10,0.15)' },
    }}>
      <Box component="span" sx={{ fontSize: 9, opacity: 0.85 }}>{confirmed ? '✓' : '⏳'}</Box>
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{guestName}</Box>
      {reservationNumber && (
        <Box component="span" sx={{
          fontFamily: '"Geist Mono", monospace', fontSize: 9.5, opacity: 0.85, ml: 'auto',
        }}>{reservationNumber}</Box>
      )}
    </Box>
  );
}

export function LoadBar({ count, height = 'calc(100% - 6px)' }: { count: number; height?: string }) {
  const fillPct = Math.min(100, (count / 10) * 100);
  const tone = count >= 7 ? 'high' : count >= 4 ? 'med' : 'low';
  const grad = tone === 'high' ? `linear-gradient(180deg, ${T.error}, #8a1212)` :
               tone === 'med'  ? `linear-gradient(180deg, ${T.warning}, #8b4505)` :
                                 `linear-gradient(180deg, ${T.primary}, ${T.primaryDeep})`;
  return (
    <Box sx={{
      position: 'absolute', top: 3, right: 3, width: 3, height, bgcolor: T.bg3,
      borderRadius: '2px', overflow: 'hidden',
    }}>
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${fillPct}%`, background: grad, borderRadius: '2px',
      }} />
    </Box>
  );
}

/* ─── Animations CSS globales — à injecter dans index.css ─── */
export const SOJORI_KEYFRAMES = `
@keyframes sojori-pulse-error {
  0%, 100% { box-shadow: 0 0 0 0 rgba(200,30,30,0.5); }
  50%      { box-shadow: 0 0 0 6px rgba(200,30,30,0); }
}
@keyframes sojori-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
`;
