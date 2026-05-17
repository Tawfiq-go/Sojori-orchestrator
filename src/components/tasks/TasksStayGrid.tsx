/**
 * Grille « Vue Séjour » — redesign Atelier 2026.
 * Palette listings + tâches harmonisée sur tokens ambre/violet/vert/rouge.
 * Header dates : surface bg2 (au lieu d'un gradient orange vif), colonne
 * « Propriétés » sticky en ambre sobre, accents UPPERCASE 0.08em.
 *
 * Logique fonctionnelle (props, normalize, scroll sync, dialog overflow,
 * géométrie Gantt) inchangée — uniquement palette + radius + typographie.
 */
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, IconButton, Typography, Stack, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type {
  PlanningListingRow,
  PlanningReservationRow,
  PlanningTimelineItem,
} from '../../types/tasksPlanning.types';

// ─── Tokens locaux alignés DashboardV2 ──────────────────────────────
const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  success: '#0a8f5e', warning: '#c46506', error: '#c81e1e', info: '#0673b3',
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};

type PlanningCleanliness = 'clean' | 'dirty' | 'occupied';

function derivePlanningCleanliness(l: PlanningListingRow): PlanningCleanliness {
  const lc = (s: unknown) => String(s ?? '').trim().toLowerCase();
  const legacy = lc(l.cleanlinessStatus);
  if (legacy === 'clean' || legacy === 'cl') return 'clean';
  if (legacy === 'dirty' || legacy === 'dr') return 'dirty';
  if (legacy === 'occupied' || legacy === 'occupé' || legacy === 'occupe' || legacy === 'in') return 'occupied';
  const occ = lc(l.occupancyStatus);
  if (occ === 'occupied') return 'occupied';
  const v2 = lc(l.cleanlinessStatus_v2);
  if (v2 === 'dirty' || v2 === 'in_progress') return 'dirty';
  if (v2 === 'clean') return 'clean';
  return 'clean';
}

function cleanlinessBadgeLabel(s: PlanningCleanliness) {
  return s === 'clean' ? 'CLEAN' : s === 'dirty' ? 'DIRTY' : 'OCCUPÉ';
}
function cleanlinessBadgeStyle(s: PlanningCleanliness) {
  if (s === 'clean')  return { bg: 'rgba(10,143,94,0.10)',  color: T.success, border: 'rgba(10,143,94,0.30)' };
  if (s === 'dirty')  return { bg: 'rgba(200,30,30,0.08)',  color: T.error,   border: 'rgba(200,30,30,0.25)' };
  return { bg: 'rgba(6,115,179,0.10)', color: T.info, border: 'rgba(6,115,179,0.30)' };
}

const CELL_W = 76;
const STICKY_W = 260;
const BAR_TOP = 6;
const BAR_H = 28;
const TASK_Y = BAR_TOP + BAR_H + 10;
const CHIP_H = 17;
const CHIP_GAP = 4;
const CELL_PAD = 6;
const TODAY_STR = format(new Date(), 'yyyy-MM-dd');

const MAX_CHIPS_VISIBLE = 3;

function computeRowH(maxTasksPerDay: number) {
  if (maxTasksPerDay === 0) return TASK_Y + CELL_PAD;
  const visibleLines = Math.min(maxTasksPerDay, MAX_CHIPS_VISIBLE);
  const badgeLine = maxTasksPerDay > MAX_CHIPS_VISIBLE ? CHIP_H + CHIP_GAP : 0;
  return TASK_Y + visibleLines * (CHIP_H + CHIP_GAP) + badgeLine + CELL_PAD;
}

// Palette barres de réservations — neutres chauds + accents Sojori
const RES_PALETTE = [
  { bg: 'rgba(184,133,26,0.10)', border: T.primary,    text: T.primaryDeep },
  { bg: 'rgba(124,58,237,0.08)', border: T.ai,         text: '#5b21b6' },
  { bg: 'rgba(10,143,94,0.10)',  border: T.success,    text: '#065f3f' },
  { bg: 'rgba(6,115,179,0.10)',  border: T.info,       text: '#054a73' },
  { bg: 'rgba(196,101,6,0.10)',  border: T.warning,    text: '#8b4504' },
  { bg: 'rgba(85,80,74,0.10)',   border: T.text2,      text: T.text },
  { bg: 'rgba(232,121,249,0.10)', border: '#c026d3',  text: '#86198f' },
];

// Tâches — palette harmonisée
const TASK_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  arrival:          { bg: 'rgba(10,143,94,0.10)',  border: 'rgba(10,143,94,0.30)',  text: T.success, icon: '🏠' },
  departure:        { bg: 'rgba(200,30,30,0.08)',  border: 'rgba(200,30,30,0.25)',  text: T.error,   icon: '🚪' },
  cleaning:         { bg: 'rgba(196,101,6,0.10)',  border: 'rgba(196,101,6,0.28)',  text: T.warning, icon: '🧹' },
  cleaning_free:    { bg: 'rgba(10,143,94,0.08)',  border: 'rgba(10,143,94,0.24)',  text: T.success, icon: '🆓' },
  cleaning_paid:    { bg: 'rgba(184,133,26,0.10)', border: 'rgba(184,133,26,0.30)', text: T.primaryDeep, icon: '💰' },
  cleaning_sojori:  { bg: 'rgba(184,133,26,0.14)', border: T.primary,                text: T.primaryDeep, icon: '🧼' },
  registration:     { bg: 'rgba(6,115,179,0.08)',  border: 'rgba(6,115,179,0.25)',  text: T.info,    icon: '📝' },
  transport:        { bg: 'rgba(6,115,179,0.06)',  border: 'rgba(6,115,179,0.22)',  text: T.info,    icon: '🚗' },
  grocery:          { bg: 'rgba(10,143,94,0.06)',  border: 'rgba(10,143,94,0.22)',  text: T.success, icon: '🛒' },
  concierge:        { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.28)', text: '#5b21b6', icon: '🛎' },
  support:          { bg: 'rgba(232,121,249,0.10)', border: 'rgba(232,121,249,0.32)', text: '#86198f', icon: '🆘' },
  task:             { bg: T.bg2,                    border: T.border,                 text: T.text2,   icon: '✅' },
  default:          { bg: T.bg2,                    border: T.border,                 text: T.text3,   icon: '📋' },
};

function toStr(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const o = val as Record<string, string>;
    return o.fr || o.en || String(Object.values(o)[0] || '');
  }
  return String(val);
}
function resolveCleaningType(item: PlanningTimelineItem): string {
  const d = (item.data || {}) as Record<string, unknown>;
  const ct = (d.cleaning_type as string) || (d.type as string) || item.cleaning_type;
  if (ct === 'free' || ct === 'paid' || ct === 'sojori') return ct;
  if (d.paid === true || (typeof d.price === 'number' && d.price > 0)) return 'paid';
  const name = String(d.name || '').toLowerCase();
  if (name.includes('sojori')) return 'sojori';
  if (name.includes('payant')) return 'paid';
  if (name.includes('gratuit') || name.includes('inclus') || name.includes('free')) return 'free';
  return 'free';
}
function getTaskColorKey(item: PlanningTimelineItem): string {
  const type = String(item.type || '').toLowerCase();
  const cat = String(item.category || '').toLowerCase();
  const grp = String(item.categoryGroup || '').toLowerCase();
  if (type === 'arrival')      return 'arrival';
  if (type === 'departure')    return 'departure';
  if (type === 'cleaning')     return `cleaning_${resolveCleaningType(item)}`;
  if (type === 'registration') return 'registration';
  if (type === 'transport')    return 'transport';
  if (type === 'groceries' || type === 'grocery') return 'grocery';
  if (grp === 'concierge' || cat === 'concierge') return 'concierge';
  if (cat === 'support_request') return 'support';
  if (item.isTask || cat === 'task') return 'task';
  return 'default';
}
function taskColor(item: PlanningTimelineItem) { return TASK_COLORS[getTaskColorKey(item)] || TASK_COLORS.default; }
function taskIcon(item: PlanningTimelineItem) {
  const d = (item.data || {}) as Record<string, unknown>;
  const icon = d.categoryIcon as string | undefined;
  if (icon) return toStr(icon);
  return taskColor(item).icon;
}
function taskLabel(item: PlanningTimelineItem) {
  const type = String(item.type || '').toLowerCase();
  if (type === 'arrival') return 'Arrivée';
  if (type === 'departure') return 'Départ';
  if (type === 'cleaning') {
    const ct = resolveCleaningType(item);
    return ct === 'free' ? 'Gratuit' : ct === 'paid' ? 'Payant' : ct === 'sojori' ? 'Sojori' : 'Ménage';
  }
  if (type === 'registration') return 'Enregistrement';
  const d = (item.data || {}) as Record<string, unknown>;
  const catName = toStr(d.categoryName);
  if (catName) return catName;
  const name = toStr(d.name);
  if (name) return name;
  return type || '…';
}
function staffInitials(item: PlanningTimelineItem) {
  const d = (item.data || {}) as Record<string, unknown>;
  const name = toStr(d.staffName || item.staffId);
  if (!name) return null;
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}
function isUnassigned(item: PlanningTimelineItem) {
  const d = (item.data || {}) as Record<string, unknown>;
  const hasStaff = Boolean(d.staffId || item.staffId);
  const status = String(d.status || item.status || '');
  return !hasStaff && status !== 'COMPLETED';
}

const TOOLTIP_SLOT = {
  tooltip: {
    sx: {
      bgcolor: 'rgba(20,17,10,0.94)',
      color: '#f6f5f1',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 1,
      maxWidth: 320,
      py: 1,
      px: 1.25,
      fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    },
  },
} as const;

function formatShortFr(iso?: string, withTime = false) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), withTime ? "EEE d MMM yyyy · HH:mm" : 'd MMM yyyy', { locale: fr });
  } catch {
    return '—';
  }
}

function reservationTooltipTitle(reservation: PlanningReservationRow): ReactNode {
  const nights = Math.round(
    Math.abs(+new Date(reservation.departureDate) - +new Date(reservation.arrivalDate)) / 86400000,
  );
  const channel = toStr(reservation.channelName);
  const guestN = typeof reservation.numberOfGuests === 'number' ? reservation.numberOfGuests : undefined;
  return (
    <Box>
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, mb: 0.5, fontSize: 12 }}>
        Séjour — {reservation.guestName || 'Voyageur'}
      </Typography>
      <Typography
        variant="caption"
        sx={{ display: 'block', opacity: 0.92, fontSize: 11, fontFamily: '"Geist Mono", monospace', lineHeight: 1.45 }}
      >
        {formatShortFr(reservation.arrivalDate)} → {formatShortFr(reservation.departureDate)}
        {' · '}
        {nights} nuit{nights > 1 ? 's' : ''}
      </Typography>
      {reservation.reservationNumber && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontFamily: '"Geist Mono", monospace', fontSize: 11 }}>
          Réf. {reservation.reservationNumber}
        </Typography>
      )}
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.88, fontSize: 11 }}>
        Statut : {reservation.status || '—'}
      </Typography>
      {channel ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.35, fontSize: 11 }}>
          Canal : {channel}
        </Typography>
      ) : null}
      {guestN !== undefined ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.35, fontSize: 11 }}>
          Voyageurs : {guestN}
        </Typography>
      ) : null}
    </Box>
  );
}

function taskTooltipTitle(item: PlanningTimelineItem): ReactNode {
  const res = (item as { __reservation?: PlanningReservationRow }).__reservation;
  const listing = (item as { __listing?: { name?: string } }).__listing;
  const d = (item.data || {}) as Record<string, unknown>;
  const staff = toStr(d.staffName || item.staffId);
  const when = item.scheduledFor ? formatShortFr(item.scheduledFor, true) : '—';
  const st = String(item.status || d.status || '');
  const un = isUnassigned(item);
  return (
    <Box>
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, mb: 0.5, fontSize: 12 }}>
        {taskIcon(item)} {taskLabel(item)}
      </Typography>
      <Typography
        variant="caption"
        sx={{ display: 'block', fontFamily: '"Geist Mono", monospace', fontSize: 11, opacity: 0.92, lineHeight: 1.45 }}
      >
        {when}
      </Typography>
      {listing?.name ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.65, fontSize: 11 }}>
          Annonce : {listing.name}
        </Typography>
      ) : null}
      {res?.guestName ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.35, fontSize: 11, opacity: 0.9 }}>
          Séjour : {res.guestName}
        </Typography>
      ) : null}
      <Typography variant="caption" sx={{ display: 'block', mt: 0.65, fontSize: 11 }}>
        {staff ? `Assigné : ${staff}` : un ? 'Non assigné' : 'Sans staff lié'}
      </Typography>
      {st ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.35, fontSize: 11, opacity: 0.85 }}>
          État : {st}
        </Typography>
      ) : null}
    </Box>
  );
}
function itemsForDayWithContext(
  reservations: PlanningReservationRow[],
  listing: StayListing,
  dayStr: string,
) {
  return (reservations || []).flatMap((reservation) => {
    const timeline = reservation.timeline || [];
    return timeline
      .filter((it) => {
        if (!it.scheduledFor) return false;
        try { return format(new Date(it.scheduledFor), 'yyyy-MM-dd') === dayStr; } catch { return false; }
      })
      .map((it) => ({ ...it, __reservation: reservation, __listing: listing }));
  });
}
type DayCellTaskItems = ReturnType<typeof itemsForDayWithContext>;

function barGeometry(reservation: PlanningReservationRow, days: { date: Date }[], cellWidth: number) {
  const firstDay = days[0].date;
  const totalDays = days.length;
  const arrive = new Date(reservation.arrivalDate);
  const depart = new Date(reservation.departureDate);
  const arrDay = Math.floor((+arrive - +firstDay) / 86400000);
  const depDay = Math.floor((+depart - +firstDay) / 86400000);
  const visStart = Math.max(0, arrDay);
  const visEnd = Math.min(totalDays - 1, depDay);
  if (visStart > visEnd && arrDay >= 0) return null;
  /** Caps + offset : valeurs un peu plus larges qu’avant pour des barres résa plus lisibles */
  const offset = Math.round(cellWidth * 0.52);
  const leftPx = arrDay < 0 ? 0 : arrDay * cellWidth + offset;
  let widthPx = 0;
  const capW = Math.round(cellWidth * 0.48);
  if (arrDay < 0) {
    const cnt = Math.min(totalDays - 1, depDay) + 1;
    widthPx = (cnt - 1) * cellWidth + capW;
  } else {
    const firstW = capW;
    const lastW = depDay > arrDay && depDay >= 0 && depDay < totalDays ? capW : 0;
    const midCnt = Math.max(0, Math.min(totalDays - 1, depDay) - Math.max(0, arrDay + 1));
    widthPx = firstW + midCnt * cellWidth + lastW;
  }
  return widthPx > 0 ? { leftPx, widthPx } : null;
}

export type StayListing = {
  id: string;
  name: string;
  cleanlinessStatus?: PlanningCleanliness;
  reservations: PlanningReservationRow[];
};

function TaskChip({ item, onClick, cellWidth }: { item: PlanningTimelineItem; onClick?: (i: PlanningTimelineItem) => void; cellWidth: number }) {
  const [hover, setHover] = useState(false);
  const c = taskColor(item);
  const icon = taskIcon(item);
  const lbl = taskLabel(item);
  const ini = staffInitials(item);
  const unassigned = isUnassigned(item);
  const chipW = Math.max(10, cellWidth - 8);
  return (
    <Tooltip title={taskTooltipTitle(item)} enterDelay={280} arrow slotProps={TOOLTIP_SLOT}>
      <div
        role="button" tabIndex={0}
        onClick={() => onClick?.(item)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(item); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 6px', borderRadius: 6,
          background: hover ? (unassigned ? 'rgba(200,30,30,0.06)' : 'rgba(184,133,26,0.06)') : c.bg,
          border: `1px solid ${unassigned ? T.error : c.border}`,
          color: c.text, fontSize: 10, fontWeight: 600,
          cursor: onClick ? 'pointer' : 'default',
          whiteSpace: 'nowrap', overflow: 'hidden',
          width: chipW, height: CHIP_H,
          boxShadow: unassigned
            ? `0 0 0 1.5px rgba(200,30,30,0.18)${hover ? ', 0 2px 6px rgba(200,30,30,0.12)' : ''}`
            : hover ? '0 2px 6px rgba(20,17,10,0.08)' : 'none',
          boxSizing: 'border-box',
          transition: 'background 120ms ease, box-shadow 120ms ease',
        }}
      >
        <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, lineHeight: 1.2 }}>{lbl}</span>
        {unassigned ? (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.error, flexShrink: 0 }} />
        ) : ini ? (
          <span style={{
            background: c.border, color: c.text, borderRadius: 3,
            padding: '0 4px', fontSize: 8.5, fontWeight: 700, flexShrink: 0,
            fontFamily: '"Geist Mono", monospace',
          }}>{ini}</span>
        ) : null}
      </div>
    </Tooltip>
  );
}

function ReservationBar({ reservation, days, paletteIndex, cellWidth }: { reservation: PlanningReservationRow; days: { date: Date }[]; paletteIndex: number; cellWidth: number }) {
  const [hover, setHover] = useState(false);
  const geo = barGeometry(reservation, days, cellWidth);
  if (!geo) return null;
  const { leftPx, widthPx } = geo;
  const col = RES_PALETTE[paletteIndex % RES_PALETTE.length];
  const confirmed = String(reservation.status || '').toLowerCase() === 'confirmed';
  return (
    <Tooltip title={reservationTooltipTitle(reservation)} enterDelay={320} arrow slotProps={TOOLTIP_SLOT}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'absolute', left: leftPx, top: BAR_TOP, width: widthPx, height: BAR_H,
          borderRadius: 7, background: col.bg,
          border: `1.5px solid ${confirmed ? col.border : T.borderStrong}`,
          color: col.text,
          display: 'flex', alignItems: 'center', padding: '0 9px', gap: 6,
          cursor: 'default', overflow: 'hidden', whiteSpace: 'nowrap',
          boxShadow: hover ? '0 3px 10px rgba(20,17,10,0.12)' : '0 1px 3px rgba(20,17,10,0.06)',
          transform: hover ? 'translateY(-0.5px)' : 'none',
          transition: 'box-shadow 140ms ease, transform 140ms ease',
          zIndex: hover ? 8 : 5, pointerEvents: 'auto',
        }}
      >
        <span style={{ fontSize: 10, flexShrink: 0 }}>{confirmed ? '✓' : '⏳'}</span>
        <span style={{ fontWeight: 600, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {reservation.guestName}
        </span>
        {widthPx > 108 && reservation.reservationNumber && (
          <span style={{
            fontSize: 10, opacity: 0.85, flexShrink: 0, fontWeight: 600,
            fontFamily: '"Geist Mono", monospace',
          }}>{reservation.reservationNumber}</span>
        )}
      </div>
    </Tooltip>
  );
}

function DayCell({ day, tasks, rowH, maxVisible, cellWidth, onOverflow }: {
  day: { dateStr: string; isWeekend: boolean };
  tasks: DayCellTaskItems;
  rowH: number;
  maxVisible: number;
  cellWidth: number;
  onOverflow: (tasks: DayCellTaskItems, dayStr: string) => void;
}) {
  const isToday = day.dateStr === TODAY_STR;
  const visible = tasks.slice(0, maxVisible);
  const overflow = tasks.length - maxVisible;
  const overflowPreview =
    overflow > 0
      ? tasks
          .slice(maxVisible)
          .map((t) => taskLabel(t))
          .slice(0, 8)
          .join(' · ') + (overflow > 8 ? '…' : '')
      : '';
  return (
    <div style={{
      height: rowH,
      background: isToday ? T.primaryTint : day.isWeekend ? T.bg2 : T.bg1,
      borderRight: `1px solid ${isToday ? 'rgba(184,133,26,0.20)' : T.border}`,
      borderBottom: `1px solid ${T.border}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {tasks.length > 0 && (
        <div style={{
          position: 'absolute', top: TASK_Y, left: 4, right: 4,
          display: 'flex', flexDirection: 'column', gap: CHIP_GAP,
        }}>
          {visible.map((item, i) => <TaskChip key={i} item={item} cellWidth={cellWidth} />)}
          {overflow > 0 && (
            <Tooltip
              title={
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
                    {overflow} autre{overflow > 1 ? 's' : ''} sur ce jour
                  </Typography>
                  {overflowPreview ? (
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.9, fontSize: 11, lineHeight: 1.45 }}>
                      {overflowPreview}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.75, opacity: 0.75, fontSize: 10 }}>
                    Clic pour tout afficher
                  </Typography>
                </Box>
              }
              enterDelay={200}
              slotProps={TOOLTIP_SLOT}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOverflow(tasks, day.dateStr); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: cellWidth - 8, height: CHIP_H, borderRadius: 6,
                  background: T.bg2, border: `1px solid ${T.border}`,
                  color: T.text2, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  boxSizing: 'border-box',
                  transition: 'background 120ms ease, border-color 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(184,133,26,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(184,133,26,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.bg2;
                  e.currentTarget.style.borderColor = T.border;
                }}
              >
                +{overflow} autre{overflow > 1 ? 's' : ''}
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

function ListingRow({ listing, days, listingIndex, cellWidth, stickyWidth, onOverflow }: {
  listing: StayListing;
  days: { date: Date; dateStr: string; isWeekend: boolean }[];
  listingIndex: number;
  cellWidth: number;
  stickyWidth: number;
  onOverflow: (tasks: ReturnType<typeof itemsForDayWithContext>, dayStr: string, name: string) => void;
}) {
  const reservations = listing.reservations || [];
  const numDays = days.length;
  const taskTotal = useMemo(
    () => reservations.reduce((n, r) => n + (r.timeline?.length || 0), 0),
    [reservations],
  );
  const maxTasksPerDay = useMemo(() => {
    let max = 0;
    days.forEach((day) => {
      const n = itemsForDayWithContext(reservations, listing, day.dateStr).length;
      if (n > max) max = n;
    });
    return max;
  }, [reservations, listing, days]);
  const rowH = computeRowH(maxTasksPerDay);
  const maxVisible = Math.min(maxTasksPerDay, MAX_CHIPS_VISIBLE);
  const gridW = stickyWidth + days.length * cellWidth;
  const cleanSt: PlanningCleanliness = listing.cleanlinessStatus ?? 'clean';
  const badge = cleanlinessBadgeStyle(cleanSt);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `${stickyWidth}px repeat(${days.length}, ${cellWidth}px)`,
      position: 'relative', minWidth: gridW,
    }}>
      <div style={{
        height: rowH, position: 'sticky', left: 0, zIndex: 20,
        background: T.bg1,
        borderRight: `1px solid ${T.borderStrong}`, borderBottom: `1px solid ${T.border}`,
        padding: '0 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
        overflow: 'hidden', boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
          width: '100%',
        }}>
          <span style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 600,
            fontSize: 12.5,
            color: T.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
          }}>{listing.name}</span>
          <span style={{
            display: 'inline-block',
            flexShrink: 0,
            padding: '2px 7px',
            borderRadius: 999,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}>{cleanlinessBadgeLabel(cleanSt)}</span>
        </div>
        <div style={{
          fontSize: 10.5, color: T.text3, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: '"Geist Mono", monospace',
        }}>
          <span style={{ color: T.primary, fontWeight: 700 }}>{numDays} j</span>
          <span style={{ color: T.text4, margin: '0 5px' }}>·</span>
          <span>{listing.reservations.length} séj.</span>
          <span style={{ color: T.text4, margin: '0 5px' }}>·</span>
          <span>{taskTotal} tâch.</span>
        </div>
      </div>
      {days.map((day) => {
        const tasks = itemsForDayWithContext(reservations, listing, day.dateStr);
        return (
          <DayCell
            key={day.dateStr}
            day={day}
            tasks={tasks}
            rowH={rowH}
            maxVisible={maxVisible}
            cellWidth={cellWidth}
            onOverflow={(t, d) => onOverflow(t, d, listing.name)}
          />
        );
      })}
      <div style={{
        position: 'absolute', top: 0, left: stickyWidth, right: 0,
        height: rowH, pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
          {listing.reservations.map((res, ri) => (
            <ReservationBar
              key={String(res.reservationId || res.id || ri)}
              reservation={res}
              days={days}
              paletteIndex={listingIndex * 2 + ri}
              cellWidth={cellWidth}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DateHeader({ days, headerRef, cellWidth, stickyWidth }: {
  days: { dateStr: string; label: string; month: string; weekday: string; isToday: boolean; isWeekend: boolean }[];
  headerRef: React.RefObject<HTMLDivElement | null>;
  cellWidth: number;
  stickyWidth: number;
}) {
  const gridW = stickyWidth + days.length * cellWidth;
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: T.bg2, borderBottom: `1px solid ${T.borderStrong}` }}>
      <div ref={headerRef} style={{ overflowX: 'hidden', overflowY: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${stickyWidth}px repeat(${days.length}, ${cellWidth}px)`,
          minWidth: gridW,
        }}>
          <div style={{
            height: 44, position: 'sticky', left: 0, zIndex: 50,
            background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)`,
            color: T.text,
            display: 'flex', alignItems: 'center', padding: '0 14px',
            fontWeight: 700, fontSize: 11,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderRight: `2px solid rgba(255,255,255,0.30)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30)',
          }}>Propriétés</div>
          {days.map((day) => (
            <div
              key={day.dateStr}
              style={{
                height: 44, position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: day.isToday ? T.primaryTint : day.isWeekend ? T.bg3 : T.bg2,
                borderRight: `1px solid ${day.isToday ? 'rgba(184,133,26,0.25)' : T.border}`,
                borderBottom: day.isToday ? `3px solid ${T.primary}` : '3px solid transparent',
              }}
            >
              <span style={{
                fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: day.isToday ? T.primaryDeep : day.isWeekend ? T.warning : T.text3,
                fontFamily: '"Geist Mono", monospace',
              }}>{day.weekday}</span>
              <span style={{
                fontSize: 14, fontWeight: 700, lineHeight: 1,
                color: day.isToday ? T.primaryDeep : day.isWeekend ? T.text : T.text2,
                fontFamily: '"Geist Mono", monospace',
              }}>{day.label}</span>
              <span style={{
                fontSize: 8.5, color: T.text4, lineHeight: 1,
                fontFamily: '"Geist Mono", monospace',
              }}>{day.month}</span>
              {day.isToday && (
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: T.primary, position: 'absolute', bottom: 2,
                }}/>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function normalizePlanningListings(rows: PlanningListingRow[]): StayListing[] {
  return (rows || []).map((l) => ({
    id: String(l.listingId || ''),
    name: l.listingName || l.name || 'Sans nom',
    cleanlinessStatus: derivePlanningCleanliness(l),
    reservations: (l.reservations || []).map((r) => ({ ...r, id: String(r.reservationId || r.id || r._id || '') })),
  }));
}

export function TasksStayGrid({ listings, startDate, endDate }: { listings: StayListing[]; startDate: string; endDate: string }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const days = useMemo(() => {
    try {
      return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((d) => ({
        date: d,
        dateStr: format(d, 'yyyy-MM-dd'),
        label: format(d, 'd'),
        month: format(d, 'MMM', { locale: fr }),
        weekday: format(d, 'EEE', { locale: fr }),
        isToday: format(d, 'yyyy-MM-dd') === TODAY_STR,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      }));
    } catch { return []; }
  }, [startDate, endDate]);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [overflowPayload, setOverflowPayload] = useState<{
    tasks: ReturnType<typeof itemsForDayWithContext>;
    dayStr: string;
    listingName: string;
  } | null>(null);

  const handleOverflow = useCallback(
    (tasks: ReturnType<typeof itemsForDayWithContext>, dayStr: string, listingName: string) => {
      setOverflowPayload({ tasks, dayStr, listingName });
      setOverflowOpen(true);
    }, [],
  );

  useEffect(() => {
    const hdr = headerRef.current;
    const bdy = bodyRef.current;
    if (!hdr || !bdy) return;
    const fromBody = () => {
      if (syncing.current) return;
      syncing.current = true;
      hdr.scrollLeft = bdy.scrollLeft;
      requestAnimationFrame(() => { syncing.current = false; });
    };
    const fromHeader = () => {
      if (syncing.current) return;
      syncing.current = true;
      bdy.scrollLeft = hdr.scrollLeft;
      requestAnimationFrame(() => { syncing.current = false; });
    };
    bdy.addEventListener('scroll', fromBody, { passive: true });
    hdr.addEventListener('scroll', fromHeader, { passive: true });
    return () => {
      bdy.removeEventListener('scroll', fromBody);
      hdr.removeEventListener('scroll', fromHeader);
    };
  }, [days.length]);

  const cellWidth = CELL_W;
  const stickyWidth = STICKY_W;

  if (days.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography sx={{ color: T.text3, fontSize: 13 }}>Période invalide.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      background: T.bg1, borderRadius: 0,
      width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box',
    }}>
      <DateHeader days={days} headerRef={headerRef} cellWidth={cellWidth} stickyWidth={stickyWidth} />
      <div ref={bodyRef} style={{
        overflowX: 'auto', overflowY: 'visible',
        WebkitOverflowScrolling: 'touch',
        maxWidth: '100%', minWidth: 0,
      }}>
        <div style={{ minWidth: stickyWidth + days.length * cellWidth }}>
          {listings.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: T.text3, fontSize: 13 }}>
              Aucune donnée pour cette période.
            </Box>
          ) : (
            listings.map((listing, idx) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                days={days}
                listingIndex={idx}
                cellWidth={cellWidth}
                stickyWidth={stickyWidth}
                onOverflow={handleOverflow}
              />
            ))
          )}
        </div>
      </div>

      <Dialog
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1.5, border: `1px solid ${T.border}` } } }}
      >
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 14, fontWeight: 700, color: T.text, borderBottom: `1px solid ${T.border}`,
        }}>
          Tâches du jour
          <IconButton size="small" onClick={() => setOverflowOpen(false)} aria-label="Fermer">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: T.bg2 }}>
          {overflowPayload && (
            <>
              <Typography sx={{
                fontSize: 11, color: T.text3, mb: 1.5,
                fontFamily: '"Geist Mono", monospace', letterSpacing: '0.04em',
              }}>
                {overflowPayload.listingName} · {overflowPayload.dayStr} · {overflowPayload.tasks.length} tâche(s)
              </Typography>
              <Stack spacing={1.25}>
                {overflowPayload.tasks.map((item, i) => {
                  const c = taskColor(item);
                  const res = item.__reservation;
                  const when = item.scheduledFor ? formatShortFr(item.scheduledFor, true) : '—';
                  const d = (item.data || {}) as Record<string, unknown>;
                  const staff = toStr(d.staffName || item.staffId);
                  return (
                    <Box
                      key={i}
                      sx={{
                        p: 1.35,
                        borderRadius: 1.25,
                        border: `1px solid ${c.border}`,
                        bgcolor: c.bg,
                        color: c.text,
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16, lineHeight: 1 }}>{taskIcon(item)}</span>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>
                            {taskLabel(item)}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 11,
                              mt: 0.35,
                              fontFamily: '"Geist Mono", monospace',
                              opacity: 0.88,
                            }}
                          >
                            {when}
                          </Typography>
                          {res?.guestName ? (
                            <Typography sx={{ fontSize: 11, mt: 0.5, opacity: 0.9 }}>
                              Séjour : {res.guestName}
                              {res.reservationNumber ? ` · ${res.reservationNumber}` : ''}
                            </Typography>
                          ) : null}
                          <Typography sx={{ fontSize: 11, mt: 0.45, opacity: 0.85 }}>
                            {staff ? `Assigné : ${staff}` : isUnassigned(item) ? 'Non assigné' : 'Staff —'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
