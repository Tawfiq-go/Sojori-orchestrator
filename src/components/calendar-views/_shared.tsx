// ════════════════════════════════════════════════════════════════════
// Sojori Calendar Views · Atelier 2026
// _shared.tsx — tokens, types, helpers, composants réutilisables
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import {
  getNextTaskStatus,
  normalizeTaskStatus,
  TASK_STATUS_LABELS,
  type TaskStatus as HubTaskStatus,
} from '../../types/tasks.types';

/* ─── Tokens (alignés DashboardV2) ─── */
export const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a', primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.10)',
  error:   '#c81e1e', errorTint:   'rgba(200,30,30,0.10)',
  info:    '#0673b3', infoTint:    'rgba(6,115,179,0.10)',
  /** Canaux — alignés Claude Design Cockpit Planning */
  airbnb:  '#C4483A', booking: '#2C558F', vrbo: '#0e7490',
  wa: '#2F7D5C', waWash: '#EDF5F1', ota: '#6A6155',
  gold: '#E6B022', goldDeep: '#B8881A', goldWash: '#FDF6E4',
  ink: '#16130E', cream: '#F6F5F1',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};

/* ─── Constantes dimensions ─── */
export const STAY = {
  CELL_W: 78,
  STICKY_W: 236,
  /** Hauteur ligne vue réservations (barres seules) */
  ROW_H: 74,
  /** Hauteur ligne vue tâches classique (/tasks/planning) */
  TASK_ROW_H: 112,
  /** Max chips jour — planning classique 2 ; cockpit Résas override via maxVisible */
  MAX_CHIPS: 2,
  LISTING_ICON_SIZE: 28,
  LISTING_ICON_GAP: 12,
  RES_BAR_TOP: 10,
  RES_BAR_HEIGHT: 28,
  RES_TASK_GAP: 6,
};

/** Bloc sous barre : statut séjour (1 ligne) + WA|OTA (1 ligne) — tâches dans les colonnes jour. */
export const COCKPIT_META = {
  BAR_GAP: 4,
  /** @deprecated — WA/OTA sont sur une ligne (MSG_ROW_H). */
  CARD_H: 36,
  CARD_GAP: 3,
  /** Bande statut (enreg / arr / dép / déclaré) — pastilles couleur. */
  STATUS_H: 18,
  STATUS_GAP: 3,
  /** Une ligne de preview message (Q/R ou A). */
  MSG_LINE_H: 17,
  /** Une ligne WA | OTA (badge + date + preview) — hauteur de base. */
  MSG_ROW_H: 36,
  /** Hauteur d’une ligne de chip tâche (2 lignes : type · statut/livreur). */
  CHIP_LINE_H: 40,
  /** Minimum 2 lignes de chips ; au-delà on grandit. */
  TASK_LANE_MIN_LINES: 2,
  TASK_LANE_MAX_LINES: 6,
  TASK_LANE_GAP: 5,
  BOTTOM_PAD: 8,
  MIN_ROW: 88,
} as const;

export type CommsChannelMeta = {
  text: string;
  at?: string;
  /** Heure formatée (Auj 14:32) — aligné inbox WA/OTA. */
  time?: string;
  lastMessageKind?: 'Q' | 'R';
  programmedAuto?: {
    catalogKey: string;
    label: string;
    time: string;
    sentAt?: string;
  };
  threadId?: string | number;
  phone?: string;
  count?: number;
  unread?: number;
  needsReply?: boolean;
  exists?: boolean;
};

/** Statut séjour compact sous la barre (pastilles). */
export type StayOpsMeta = {
  registered: number;
  toRegister: number;
  arrivalChosen: boolean;
  arrivalTime?: string | null;
  departureChosen: boolean;
  departureTime?: string | null;
  /** actualArrivalTime / customerStatus arrived|on_site */
  arrived: boolean;
  arrivalDate: string;
  departureDate: string;
};

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Jours jusqu’à une date ISO (0 = aujourd’hui, <0 = passé). */
function daysUntilIso(iso: string, today = todayIsoLocal()): number {
  const a = (iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return 0;
  const t0 = Date.parse(`${today}T12:00:00`);
  const t1 = Date.parse(`${a}T12:00:00`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return 0;
  return Math.round((t1 - t0) / 86400000);
}

/**
 * Arrivée / départ / enregistrement (même barème) :
 * - vert  = client a déjà choisi / fait
 * - orange = pas fait et échéance dans plus de 3 jours
 * - rouge  = pas fait et échéance dans ≤ 3 jours (ou déjà passée)
 * Enregistrement sur place (client déjà arrivé) → toujours vert.
 */
export type StayOpsTone = 'ok' | 'warn' | 'alert' | 'mute';

export function stayOpsPendingTone(done: boolean, daysUntilDue: number): StayOpsTone {
  if (done) return 'ok';
  if (daysUntilDue > 3) return 'warn';
  return 'alert';
}

export function formatStayClock(value?: string | null): string {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0 && n < 24) return `${String(Math.floor(n)).padStart(2, '0')}h`;
  if (/^\d{1,2}h$/i.test(s)) return s.toLowerCase();
  return s.slice(0, 5);
}

/** Nb de lignes preview dans une cellule (Q/R et/ou A) — comme onglet OTA. */
export function commsMetaLineCount(meta?: CommsChannelMeta | null): number {
  if (!meta) return 1;
  let n = 0;
  if (meta.lastMessageKind === 'Q' || meta.lastMessageKind === 'R') n += 1;
  if (meta.programmedAuto) n += 1;
  return Math.max(1, n);
}

/** Hauteur bloc sous barre : WA|OTA (empilé si résa courte / dual Q+A). */
export function reservationMessagesBlockHeight(
  showMessages: boolean,
  narrow = false,
  /** Max lignes dans une cellule (1 = seul Q/R ou A, 2 = Q/R + A). */
  dualMsgLines = 1,
): number {
  if (!showMessages) return 0;
  const lines = Math.max(1, Math.min(2, dualMsgLines));
  const cellH = Math.max(COCKPIT_META.MSG_ROW_H, lines * COCKPIT_META.MSG_LINE_H + 6);
  return narrow ? cellH * 2 + 2 : cellH;
}

/** Une ligne StayOps si la journée a Arr et/ou Dép (layout horizontal, pas empilé). */
export function stayOpsDayPillCount(ops: StayOpsMeta | undefined, dayIso: string): number {
  if (!ops) return 0;
  const day = dayIso.slice(0, 10);
  const arrIso = (ops.arrivalDate || '').slice(0, 10);
  const depIso = (ops.departureDate || '').slice(0, 10);
  const today = todayIsoLocal();
  if (day === depIso) return 1;
  if (day === arrIso) {
    const daysToArr = daysUntilIso(arrIso, today);
    if (daysToArr >= 0 || Math.max(0, ops.toRegister || 0) > 0) return 1;
  }
  return 0;
}

export function taskLaneHeightForLines(lines: number): number {
  const n = Math.max(
    COCKPIT_META.TASK_LANE_MIN_LINES,
    Math.min(COCKPIT_META.TASK_LANE_MAX_LINES, lines),
  );
  return n * COCKPIT_META.CHIP_LINE_H;
}

/**
 * Hauteur ligne cockpit :
 * barre résa + messages globaux (sous barre) + lane tâches par jour (N lignes).
 */
export function listingCockpitRowHeight(opts: {
  barTop: number;
  barH: number;
  showMessages: boolean;
  showTasks: boolean;
  taskLines?: number;
  fallback: number;
  /** Au moins une résa courte → WA/OTA empilés. */
  narrowMessages?: boolean;
  /** Q/R + A sur la même cellule (comme inbox OTA). */
  dualMsgLines?: number;
}): number {
  const { barTop, barH, showMessages, showTasks, fallback } = opts;
  const msgH = reservationMessagesBlockHeight(
    showMessages,
    opts.narrowMessages,
    opts.dualMsgLines,
  );
  let h = barTop + barH;
  if (msgH > 0) h += COCKPIT_META.BAR_GAP + msgH;
  if (showTasks) {
    h += COCKPIT_META.TASK_LANE_GAP + taskLaneHeightForLines(opts.taskLines ?? COCKPIT_META.TASK_LANE_MIN_LINES);
  }
  h += COCKPIT_META.BOTTOM_PAD;
  return Math.max(COCKPIT_META.MIN_ROW, fallback, h);
}

/** Top CSS des chips jour : sous la barre (+ messages si présents). */
export function dayTaskLaneTop(opts: {
  barTop: number;
  barH: number;
  showMessages: boolean;
  narrowMessages?: boolean;
  dualMsgLines?: number;
}): number {
  const msgH = reservationMessagesBlockHeight(
    opts.showMessages,
    opts.narrowMessages,
    opts.dualMsgLines,
  );
  let top = opts.barTop + opts.barH;
  if (msgH > 0) top += COCKPIT_META.BAR_GAP + msgH + COCKPIT_META.TASK_LANE_GAP;
  else top += opts.barTop > 0 ? 4 : 4;
  return top;
}

/** Dimensions denses — planning résa / mobile */
export const STAY_COMPACT = {
  CELL_W: 52,
  STICKY_W: 112,
  ROW_H: 34,
  TASK_ROW_H: 48,
  MAX_CHIPS: 2,
  LISTING_ICON_SIZE: 14,
  LISTING_ICON_GAP: 4,
  RES_BAR_TOP: 2,
  RES_BAR_HEIGHT: 12,
  RES_TASK_GAP: 2,
};

export type StayMetrics = typeof STAY;

export function stayMetrics(compact?: boolean, narrow?: boolean): StayMetrics {
  if (!compact) return STAY;
  if (narrow) {
    return { ...STAY_COMPACT, CELL_W: 46, STICKY_W: 100, ROW_H: 30 };
  }
  return STAY_COMPACT;
}

/** Barres réservation : arrivée ~14h (40% jour), départ ~11h (fin 40%), largeur = séjour réel. */
export const STAY_RES_BAR = {
  CHECKIN_OFFSET: 0.4,
  CHECKOUT_END: 0.4,
  SAME_DAY_WIDTH: 0.5,
} as const;

export type ReservationBarClip = {
  /** Arrivée avant le 1er jour visible → barre depuis le bord gauche (pas offset check-in). */
  clippedStart?: boolean;
  /** Départ après le dernier jour visible → barre jusqu’au bord droit. */
  clippedEnd?: boolean;
};

/**
 * Position % de la barre Gantt sur la timeline (jours = colonnes égales).
 * Turnover même jour : départ = [0 → CHECKOUT_END], arrivée = [CHECKIN_OFFSET → …]
 * (pas de chevauchement barre / messages).
 */
export function computeReservationBarLayout(
  startIdx: number,
  endIdx: number,
  daysCount: number,
  clip: ReservationBarClip = {},
): { leftPct: number; widthPct: number } {
  if (daysCount <= 0) return { leftPct: 0, widthPct: 0 };

  const cellPct = 100 / daysCount;
  const { CHECKIN_OFFSET, CHECKOUT_END, SAME_DAY_WIDTH } = STAY_RES_BAR;
  const { clippedStart = false, clippedEnd = false } = clip;

  // Stub checkout seul dans la fenêtre (ex. résa commencée hier, part aujourd’hui) :
  // occupe le matin [0 → 40%], laisse l’après-midi à l’arrivée du jour.
  if (clippedStart && startIdx >= endIdx) {
    const leftPct = (startIdx / daysCount) * 100;
    const widthPct = CHECKOUT_END * cellPct;
    return { leftPct, widthPct: Math.max(widthPct, 1.5) };
  }

  // Vrai même-jour (arrivée + départ le même calendrier, non clipée)
  if (!clippedStart && startIdx >= endIdx) {
    return {
      leftPct: ((startIdx + CHECKIN_OFFSET) / daysCount) * 100,
      widthPct: Math.max(SAME_DAY_WIDTH * cellPct, 2),
    };
  }

  const leftFrac = clippedStart ? startIdx : startIdx + CHECKIN_OFFSET;
  const rightFrac = clippedEnd ? endIdx + 1 : endIdx + CHECKOUT_END;
  const leftPct = (leftFrac / daysCount) * 100;
  const rightPct = (rightFrac / daysCount) * 100;
  const widthPct = Math.max(rightPct - leftPct, SAME_DAY_WIDTH * cellPct * 0.5);

  return {
    leftPct,
    widthPct: Math.min(widthPct, Math.max(0, 100 - leftPct)),
  };
}

/**
 * Bloc messages = exactement la barre résa (jamais de débordement
 * sur une autre résa / turnover).
 */
export function computeReservationMessagesLayout(
  startIdx: number,
  endIdx: number,
  daysCount: number,
  clip: ReservationBarClip = {},
): { leftPct: number; widthPct: number; narrow: boolean } {
  const bar = computeReservationBarLayout(startIdx, endIdx, daysCount, clip);
  const cellPct = daysCount > 0 ? 100 / daysCount : 100;
  // < ~1,25 colonne → mode compact (empiler WA/OTA), sans élargir
  const narrow = bar.widthPct < cellPct * 1.25;
  return { ...bar, narrow };
}
export const TEAM = { CELL_W: 84, STICKY_W: 200, ROW_H: 60, MAX_CHIPS: 2 };

/* ─── Types alignés API srv-task ─── */
export type TaskType = 'arrival' | 'departure' | 'cleaning' | 'registration' | 'transport' | 'concierge' | 'support' | 'task';
export type TaskStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
export type Channel = 'airbnb' | 'booking' | 'vrbo' | 'direct';

/** Wash + bord canal (design cockpit) — pas de dégradé plein. */
export const CHANNEL_COCKPIT: Record<Channel, { color: string; wash: string }> = {
  airbnb:  { color: '#C4483A', wash: '#FBF0EE' },
  booking: { color: '#2C558F', wash: '#EDF1F8' },
  vrbo:    { color: '#0e7490', wash: '#E8F5F7' },
  direct:  { color: '#B8881A', wash: '#FBF3E2' },
};

export type CleaningKind = 'free' | 'paid' | 'sojori' | 'checkout' | string;
export type Cleanliness = 'clean' | 'dirty' | 'in_progress' | 'occupied';

/** Priorité 3 couleurs dérivée backend — vert / orange / rouge. */
export type TaskUrgency = 'green' | 'orange' | 'red';

export interface TaskUrgencyInfo {
  urgency: TaskUrgency;
  reason?: string;
  dueAt?: string;
}

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
  /** Priorité exécution dérivée (heure vs statut). */
  priority?: TaskUrgencyInfo;
  data?: Record<string, unknown>;
}

/** Clé ménage depuis chip / fulltask (category, cleaning_type, type). */
export function resolveCleaningKindKey(item: TimelineItem | TaskItem | Record<string, unknown>): string {
  const data = ('data' in item ? item.data : undefined) as Record<string, unknown> | undefined;
  const raw = String(
    ('cleaning_type' in item ? item.cleaning_type : '') ||
      ('category' in item ? item.category : '') ||
      data?.cleaning_type ||
      data?.cleaningType ||
      data?.type ||
      data?.taskType ||
      '',
  )
    .toLowerCase()
    .trim();
  return raw.replace(/-/g, '_');
}

/**
 * Libellés ménage cockpit :
 * Sojori (checkout auto) · inclus · payant · checkout.
 */
export function cleaningLabelFr(kindOrItem?: string | TimelineItem | TaskItem | null): string {
  const k =
    typeof kindOrItem === 'string' || kindOrItem == null
      ? String(kindOrItem || '')
          .toLowerCase()
          .replace(/-/g, '_')
          .trim()
      : resolveCleaningKindKey(kindOrItem);
  if (!k) return 'Ménage';
  if (
    k === 'sojori' ||
    k === 'cleaning_sojori' ||
    k === 'checkout_cleaning' ||
    k.includes('sojori')
  ) {
    return 'Ménage Sojori';
  }
  if (k === 'paid' || k === 'cleaning_paid' || k.includes('payant') || k.includes('paid')) {
    return 'Ménage payant';
  }
  if (
    k === 'free' ||
    k === 'cleaning_free' ||
    k.includes('inclus') ||
    k.includes('gratuit') ||
    k.includes('free')
  ) {
    return 'Ménage inclus';
  }
  if (k === 'checkout' || (k.includes('checkout') && k.includes('clean'))) {
    return 'Ménage checkout';
  }
  if (k.includes('checkout')) return 'Ménage checkout';
  return 'Ménage';
}

/** Chip court (colonne étroite). */
export function cleaningChipLabelFr(kindOrItem?: string | TimelineItem | TaskItem | null): string {
  const full = cleaningLabelFr(kindOrItem);
  if (full === 'Ménage Sojori') return 'Sojori';
  if (full === 'Ménage payant') return 'Payant';
  if (full === 'Ménage inclus') return 'Inclus';
  if (full === 'Ménage checkout') return 'Checkout';
  return 'Ménage';
}

/** Jour de turnover = au moins un Dép + un Arr sur ce jour. */
export function dayIsTurnover(opsList: StayOpsMeta[] | undefined, dayIso: string): boolean {
  if (!opsList?.length) return false;
  const day = dayIso.slice(0, 10);
  let hasDep = false;
  let hasArr = false;
  for (const ops of opsList) {
    if ((ops.departureDate || '').slice(0, 10) === day) hasDep = true;
    if ((ops.arrivalDate || '').slice(0, 10) === day) hasArr = true;
  }
  return hasDep && hasArr;
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
  /** Type de chambre Multi — affiché sur la barre (Single = absent). */
  roomTypeName?: string;
  /** Id RoomType (Multi) — filtre ligne roomType. */
  roomTypeId?: string;
  /** Unité inventaire (Mews) — affichage chambre exacte. */
  roomId?: string;
  roomName?: string;
  timeline?: TimelineItem[];
  /** Dernier message OTA (Airbnb/Booking) — cockpit planning. */
  lastOta?: CommsChannelMeta & { exists?: boolean };
  /** Dernier message WhatsApp guest — cockpit planning. */
  lastWa?: CommsChannelMeta & { exists?: boolean };
  /** Enreg / heure arr·dép / déclaré — pastilles sous barre. */
  stayOps?: StayOpsMeta;
  /**
   * 'block' = blocage calendrier (CalendarBlock, pas une résa) : barre grise/rouge,
   * guestName porte le titre du bloc, blockNote/blockAuthor pour le détail.
   */
  kind?: 'reservation' | 'block';
  blockNote?: string;
  blockAuthor?: string;
}

export type PlanningRoomTypeRef = { id: string; name: string };

/**
 * Contexte déduit d'un clic droit sur une cellule du planning : la POSITION
 * porte déjà le logement + le jour, et la résa en cours ce jour-là si elle existe.
 * Le PM n'a donc plus qu'à choisir le type de tâche.
 */
export interface PlanningCreateContext {
  listingId: string;
  listingName: string;
  dayIso: string;
  reservationId?: string;
  reservationNumber?: string;
  guestName?: string;
  /** true si le jour cliqué est le jour de départ (ménage/check-out probable). */
  isDepartureDay?: boolean;
  /** true si le jour cliqué est le jour d'arrivée (check-in probable). */
  isArrivalDay?: boolean;
}

export interface ListingRow {
  listingId: string;
  listingName: string;
  city?: string;
  cleanlinessStatus_v2?: Cleanliness;
  cleanlinessStatus?: string;
  occupancyStatus?: 'available' | 'occupied' | 'vacant';
  cleanlinessEmergency?: boolean;
  reservations: ReservationRow[];
  /** Single | Multi — gate collapse roomTypes (comme MultiView MEWS). */
  propertyUnit?: string;
  roomTypes?: PlanningRoomTypeRef[];
  /** Ligne enfant roomType (synthetic). */
  isRoomTypeRow?: boolean;
  parentListingId?: string;
  /** Nom hôtel (sur ligne roomType) pour hover / drawer. */
  parentListingName?: string;
  roomTypeId?: string;
  roomTypeCount?: number;
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
  /** Priorité exécution dérivée (heure vs statut). */
  priority?: TaskUrgencyInfo;
}

/** Lit la priorité 3 couleurs (champ dédié ou data.priority du merge fulltask). */
export function resolveTaskUrgency(
  item: TimelineItem | TaskItem | Record<string, unknown> | null | undefined,
): TaskUrgency {
  if (!item) return 'green';
  const direct = (item as { priority?: TaskUrgencyInfo }).priority;
  if (direct?.urgency === 'red' || direct?.urgency === 'orange' || direct?.urgency === 'green') {
    return direct.urgency;
  }
  const data = ('data' in item ? item.data : undefined) as Record<string, unknown> | undefined;
  const nested = data?.priority as TaskUrgencyInfo | undefined;
  if (nested?.urgency === 'red' || nested?.urgency === 'orange' || nested?.urgency === 'green') {
    return nested.urgency;
  }
  return 'green';
}

export function resolveTaskUrgencyInfo(
  item: TimelineItem | TaskItem | Record<string, unknown> | null | undefined,
): TaskUrgencyInfo | undefined {
  if (!item) return undefined;
  const direct = (item as { priority?: TaskUrgencyInfo }).priority;
  if (direct?.urgency) return direct;
  const data = ('data' in item ? item.data : undefined) as Record<string, unknown> | undefined;
  const nested = data?.priority as TaskUrgencyInfo | undefined;
  return nested?.urgency ? nested : undefined;
}

/* ─── Helpers ─── */
export function channelFromName(n?: string): Channel {
  const s = (n || '').toLowerCase();
  if (s.includes('airbnb'))  return 'airbnb';
  if (s.includes('booking')) return 'booking';
  if (s.includes('vrbo'))    return 'vrbo';
  return 'direct';
}

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function genDays(start: Date, count: number) {
  const arr = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const anchor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  for (let i = 0; i < count; i++) {
    const d = new Date(anchor); d.setDate(anchor.getDate() + i);
    const months = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];
    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();
    arr.push({
      date: d,
      iso: toLocalIsoDate(d),
      day: d.getDate(),
      weekday: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][(d.getDay() + 6) % 7],
      month: months[d.getMonth()],
      frShort: `${d.getDate()} ${months[d.getMonth()]}`,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday,
      isYesterday,
      isPast: d < today && !isToday && !isYesterday,
    });
  }
  return arr;
}

export type PlanningDay = ReturnType<typeof genDays>[number];

const PAST_SLATE = '100,116,139';

/** Styles colonnes passées (planning résa + tâches). */
export function planningDaySurfaceSx(day: PlanningDay) {
  if (day.isToday) {
    return {
      bgcolor: T.primaryTint,
      borderRight: `1px solid ${T.border}`,
    };
  }
  if (day.isYesterday) {
    return {
      bgcolor: `rgba(${PAST_SLATE},0.14)`,
      borderRight: `2px solid rgba(${PAST_SLATE},0.38)`,
      boxShadow: `inset 0 0 0 1px rgba(${PAST_SLATE},0.1)`,
    };
  }
  if (day.isPast) {
    return {
      bgcolor: `rgba(${PAST_SLATE},0.07)`,
      borderRight: `1px solid rgba(${PAST_SLATE},0.2)`,
      backgroundImage: `repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 5px,
        rgba(${PAST_SLATE},0.06) 5px,
        rgba(${PAST_SLATE},0.06) 10px
      )`,
    };
  }
  return {
    bgcolor: day.isWeekend ? T.bg2 : T.bg1,
    borderRight: `1px solid ${T.border}`,
  };
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
    <Stack direction="row" gap={1} sx={{ alignItems: 'center', 
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

export function DayHeader({ day, width, compact = false }: { day: ReturnType<typeof genDays>[0]; width: number; compact?: boolean }) {
  const surface = planningDaySurfaceSx(day);
  return (
    <Box sx={{
      width, py: compact ? 0.2 : 1, textAlign: 'center',
      position: 'relative',
      ...surface,
      ...(day.isToday ? {
        '&::after': {
          content: '""', position: 'absolute', left: '50%', bottom: 3,
          transform: 'translateX(-50%)', width: 20, height: 2, bgcolor: T.primary, borderRadius: 999,
        },
      } : {}),
      ...(day.isYesterday ? {
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 6,
          bottom: 6,
          right: 0,
          width: 3,
          borderRadius: '3px 0 0 3px',
          bgcolor: `rgba(${PAST_SLATE},0.35)`,
        },
      } : {}),
    }}>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: compact ? 8.5 : 9.5, fontWeight: 700,
        color: day.isToday ? T.primaryDeep : day.isYesterday ? `rgba(${PAST_SLATE},1)` : day.isPast ? T.text4 : day.isWeekend ? T.warning : T.text3,
        letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1,
      }}>{day.isYesterday ? 'Hier' : day.weekday}</Typography>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: compact ? 11 : 13, fontWeight: 700,
        color: day.isToday ? T.primaryDeep : day.isYesterday ? `rgba(${PAST_SLATE},0.95)` : day.isPast ? T.text3 : T.text, mt: compact ? 0 : 0.375,
        opacity: day.isPast ? 0.85 : 1,
      }}>{day.day}</Typography>
      {!compact && (
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 8.5, color: T.text4, mt: '1px',
        opacity: day.isPast ? 0.75 : 1,
      }}>{day.month}</Typography>
      )}
    </Box>
  );
}

export function CleanlinessBadge({ status }: { status?: Cleanliness }) {
  const map = {
    clean:       { label: 'CLEAN',     icon: '✨', bg: T.successTint, color: T.success },
    dirty:       { label: 'DIRTY',     icon: '🚫', bg: T.errorTint,   color: T.error },
    in_progress: { label: 'EN COURS',  icon: '🧹', bg: T.warningTint, color: T.warning },
    occupied:    { label: 'OCCUPÉ',    icon: '🏠', bg: T.infoTint,    color: T.info },
  };
  const s = map[status || 'clean'];
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.375,
      fontFamily: '"Geist Mono", monospace', fontSize: 9, fontWeight: 700,
      px: 0.75, py: '1px', borderRadius: 999, letterSpacing: '0.06em',
      bgcolor: s.bg, color: s.color, width: 'fit-content',
    }}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </Box>
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

/** Labels plus longs — colonnes jour élargies (Résas). */
const TASK_CHIP_LABELS_RICH: Record<TaskType, string> = {
  arrival: 'Arrivée',
  departure: 'Départ',
  cleaning: 'Ménage',
  registration: 'Enreg.',
  transport: 'Transport',
  concierge: 'Concierge',
  support: 'Support',
  task: 'Tâche',
};

function taskChipClock(iso?: string): string {
  if (!iso) return '';
  const m = String(iso).match(/T(\d{2}):(\d{2})/);
  if (!m) return '';
  const hh = Number(m[1]);
  const mm = m[2];
  if (!Number.isFinite(hh)) return '';
  if (hh === 0 && mm === '00') return '';
  return `${String(hh).padStart(2, '0')}:${mm}`;
}

function frHoverDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(+d)) return iso.slice(0, 10);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function HoverPanel({ children, maxWidth = 280 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <Box
      sx={{
        p: 1.25,
        maxWidth,
        bgcolor: '#16130E',
        color: '#F6F5F1',
        borderRadius: '10px',
        boxShadow: '0 10px 28px rgba(22,19,14,0.35)',
      }}
    >
      {children}
    </Box>
  );
}

function taskStatusLabelFr(raw: string | null | undefined): string {
  const s = String(raw || '').trim();
  if (!s || s === '—') return '—';
  const upper = s.toUpperCase();
  if (upper in TASK_STATUS_LABELS) {
    return TASK_STATUS_LABELS[upper as HubTaskStatus];
  }
  return TASK_STATUS_LABELS[normalizeTaskStatus(s)];
}

function taskFutureStatusLabelFr(raw: string | null | undefined): string {
  const next = getNextTaskStatus(raw);
  if (!next) {
    const cur = normalizeTaskStatus(raw);
    if (cur === 'COMPLETED') return '— (terminée)';
    if (cur === 'CANCELLED_ADMIN' || cur === 'CANCELLED_CUSTOMER' || cur === 'ARCHIVED') {
      return '— (annulée)';
    }
    return '—';
  }
  return TASK_STATUS_LABELS[next];
}

function HoverLine({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', minWidth: 0 }}>
      <Box
        component="span"
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: accent || '#E6B022',
          flexShrink: 0,
          pt: '1px',
          minWidth: 44,
        }}
      >
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: 12,
          fontWeight: 500,
          color: '#F6F5F1',
          lineHeight: 1.35,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minWidth: 0,
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

function toneLabelFr(tone: StayOpsTone): string {
  if (tone === 'ok') return 'Vert · OK';
  if (tone === 'warn') return 'Orange · >3 jours';
  if (tone === 'alert') return 'Rouge · ≤3 jours';
  return '—';
}

function frHoverDateTime(iso?: string): string {
  if (!iso) return '—';
  const day = frHoverDate(iso);
  const clock = taskChipClock(iso);
  return clock ? `${day} · ${clock}` : day;
}

export function TaskHoverContent({ item }: { item: TimelineItem | TaskItem }) {
  const type = (('type' in item ? item.type : null) || 'task') as TaskType;
  const s = TASK_CHIP_STYLES[type] || TASK_CHIP_STYLES.task;
  const isCleaning = type === 'cleaning';
  const richLabel = isCleaning
    ? cleaningLabelFr(item)
    : TASK_CHIP_LABELS_RICH[type] || s.label;
  const staff =
    ('staffName' in item ? item.staffName : null) ||
    ('staffCode' in item ? item.staffCode : null) ||
    'Non assigné';
  const status = String(('taskStatus' in item ? item.taskStatus : item.status) || '—');
  const when = String(('scheduledFor' in item ? item.scheduledFor : '') || '');
  const data = ('data' in item ? item.data : undefined) as Record<string, unknown> | undefined;
  const note = String(data?.notes || data?.comment || data?.title || data?.description || '').trim();
  const resa = String(data?.reservationNumber || data?.reservationCode || '').trim();
  const guest = String(data?.guestName || '').trim();
  const urgInfo = resolveTaskUrgencyInfo(item);
  const urg = urgInfo?.urgency ?? 'green';
  const urgLabel =
    urg === 'red' ? '🔴 Agir' : urg === 'orange' ? '🟠 Surveiller' : '🟢 OK';

  return (
    <HoverPanel maxWidth={300}>
      <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.75, letterSpacing: '-0.02em' }}>
        {s.emoji} {richLabel}
      </Typography>
      <Stack gap={0.55}>
        {resa ? <HoverLine label="Résa" value={resa} /> : null}
        {guest ? <HoverLine label="Voyageur" value={guest} /> : null}
        <HoverLine label="Quand" value={frHoverDateTime(when)} />
        {isCleaning ? <HoverLine label="Type" value={cleaningLabelFr(item)} /> : null}
        <HoverLine
          label="Priorité"
          value={urgInfo?.reason ? `${urgLabel} · ${urgInfo.reason}` : urgLabel}
          accent={urg === 'red' ? '#C4483A' : urg === 'orange' ? '#C46506' : undefined}
        />
        <HoverLine label="Actuel" value={taskStatusLabelFr(status)} />
        <HoverLine
          label="Futur"
          value={taskFutureStatusLabelFr(status)}
          accent={
            getNextTaskStatus(status) ? '#5CBF8F' : undefined
          }
        />
        <HoverLine
          label="Staff"
          value={String(staff)}
          accent={staff === 'Non assigné' ? '#C4483A' : undefined}
        />
        {note ? <HoverLine label="Note" value={note.slice(0, 180)} /> : null}
      </Stack>
    </HoverPanel>
  );
}

function StayOpsHoverContent({
  kind,
  ops,
  tone,
  daysUntil,
  onSite,
}: {
  kind: 'arr' | 'dep' | 'reg';
  ops: StayOpsMeta;
  tone: StayOpsTone;
  daysUntil: number;
  onSite: boolean;
}) {
  const clockArr = formatStayClock(ops.arrivalTime) || '—';
  const clockDep = formatStayClock(ops.departureTime) || '—';

  if (kind === 'arr') {
    return (
      <HoverPanel maxWidth={280}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.75 }}>🛬 Heure d’arrivée</Typography>
        <Stack gap={0.55}>
          <HoverLine label="Jour" value={frHoverDate(ops.arrivalDate)} />
          <HoverLine
            label="Heure"
            value={clockArr}
            accent={ops.arrivalChosen ? '#5CBF8F' : '#E6B022'}
          />
          <HoverLine
            label="Choix client"
            value={ops.arrivalChosen ? 'Oui · créneau choisi' : 'Non · heure listing / défaut'}
          />
          <HoverLine label="Jours restants" value={`${daysUntil} j`} />
          <HoverLine label="Statut" value={toneLabelFr(tone)} />
        </Stack>
      </HoverPanel>
    );
  }

  if (kind === 'dep') {
    return (
      <HoverPanel maxWidth={280}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.75 }}>🛫 Heure de départ</Typography>
        <Stack gap={0.55}>
          <HoverLine label="Jour" value={frHoverDate(ops.departureDate)} />
          <HoverLine
            label="Heure"
            value={clockDep}
            accent={ops.departureChosen ? '#5CBF8F' : '#E6B022'}
          />
          <HoverLine
            label="Choix client"
            value={
              ops.departureChosen
                ? 'Oui · créneau choisi (D2)'
                : 'Non · heure listing / défaut checkout'
            }
          />
          <HoverLine label="Jours restants" value={`${daysUntil} j`} />
          <HoverLine label="Statut" value={toneLabelFr(tone)} />
        </Stack>
      </HoverPanel>
    );
  }

  const reg = Math.max(0, ops.registered || 0);
  const toReg = Math.max(0, ops.toRegister || 0);
  const regDone = toReg > 0 && reg >= toReg;
  return (
    <HoverPanel maxWidth={280}>
      <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.75 }}>📝 Enregistrement</Typography>
      <Stack gap={0.55}>
        <HoverLine label="Progression" value={`${reg} / ${toReg} voyageur(s)`} />
        <HoverLine
          label="État"
          value={regDone ? 'Complet' : onSite ? 'Sur place (toujours OK visuel)' : 'Incomplet'}
          accent={regDone || onSite ? '#5CBF8F' : '#C4483A'}
        />
        <HoverLine label="Échéance" value={`Arrivée · ${frHoverDate(ops.arrivalDate)}`} />
        <HoverLine label="Jours avant arr." value={`${daysUntil} j`} />
        <HoverLine label="Statut" value={toneLabelFr(tone)} />
      </Stack>
    </HoverPanel>
  );
}

export function ReservationHoverContent({
  guestName,
  reservationNumber,
  channelLabel,
  confirmed,
  arrivalDate,
  departureDate,
  numberOfGuests,
  nights,
  lastWa,
  lastOta,
  otaLabel = 'OTA',
  roomTypeName,
  roomName,
  listingName,
}: {
  guestName: string;
  reservationNumber?: string;
  channelLabel: string;
  confirmed: boolean;
  arrivalDate?: string;
  departureDate?: string;
  numberOfGuests?: number;
  nights?: number | null;
  lastWa?: CommsChannelMeta & { exists?: boolean };
  lastOta?: CommsChannelMeta & { exists?: boolean };
  otaLabel?: string;
  roomTypeName?: string;
  roomName?: string;
  listingName?: string;
}) {
  const hasWa = Boolean(lastWa?.exists || lastWa?.text || (lastWa?.count || 0) > 0);
  const hasOta = Boolean(lastOta?.exists || lastOta?.text || (lastOta?.count || 0) > 0);
  const waText = hasWa
    ? (lastWa?.text || 'Fil WhatsApp')
    : 'Aucun échange WhatsApp';
  const otaText = hasOta
    ? (lastOta?.text || 'Fil OTA')
    : 'Aucun échange OTA';
  const propertyLine = (() => {
    const hotel = String(listingName || '').trim();
    const type = String(roomTypeName || '').trim();
    const unit = String(roomName || '').trim();
    return [hotel, type, unit].filter(Boolean).join(' · ');
  })();

  return (
    <HoverPanel maxWidth={300}>
      <Typography sx={{ fontSize: 13.5, fontWeight: 800, mb: 0.35, letterSpacing: '-0.02em' }}>
        {guestName}
        {nights != null && nights > 0 ? (
          <Box component="span" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 700, color: '#BEB7AA', ml: 0.75, fontSize: 12 }}>
            {nights}n
          </Box>
        ) : null}
      </Typography>
      {propertyLine ? (
        <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#D4C4A8', mb: 0.5 }}>
          {propertyLine}
        </Typography>
      ) : null}
      <Typography
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 10.5,
          color: '#BEB7AA',
          mb: 1,
        }}
      >
        {reservationNumber || '—'}
        {' · '}
        {channelLabel}
        {' · '}
        {confirmed ? 'Confirmée' : 'En attente'}
        {numberOfGuests ? ` · ${numberOfGuests}p` : ''}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: '#E6B022', fontWeight: 700, mb: 1 }}>
        {frHoverDate(arrivalDate)} → {frHoverDate(departureDate)}
      </Typography>
      <Stack gap={0.85}>
        <Box
          sx={{
            p: 0.85,
            borderRadius: '7px',
            bgcolor: hasWa ? 'rgba(47,125,92,0.22)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${hasWa ? 'rgba(47,125,92,0.45)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <HoverLine
            label="WA"
            value={
              hasWa
                ? `${waText}${lastWa?.needsReply ? ' · À répondre' : ''}${lastWa?.unread ? ` · ${lastWa.unread} non lu(s)` : ''}`
                : waText
            }
            accent="#5CBF8F"
          />
        </Box>
        <Box
          sx={{
            p: 0.85,
            borderRadius: '7px',
            bgcolor: hasOta ? 'rgba(44,85,143,0.28)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${hasOta ? 'rgba(44,85,143,0.5)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <HoverLine
            label={otaLabel.slice(0, 3)}
            value={
              hasOta
                ? `${otaText}${lastOta?.needsReply ? ' · À répondre' : ''}${lastOta?.unread ? ` · ${lastOta.unread} non lu(s)` : ''}`
                : otaText
            }
            accent="#8FB0E0"
          />
        </Box>
      </Stack>
    </HoverPanel>
  );
}

const HOVER_TOOLTIP_SX = {
  tooltip: {
    sx: {
      bgcolor: 'transparent',
      p: 0,
      maxWidth: 'none',
      boxShadow: 'none',
    },
  },
};

function taskStatusShortFr(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'DONE') return 'OK';
  if (s === 'IN_PROGRESS' || s === 'DOING') return 'En cours';
  if (s === 'ACCEPTED' || s === 'CONFIRMED') return 'Acceptée';
  if (s === 'ASSIGNED' || s === 'PENDING_PARTNER') return 'À accepter';
  if (s === 'CREATED' || s === 'NEW') return 'Créée';
  if (s === 'CANCELLED' || s === 'CANCELLED_ADMIN' || s === 'CANCELLED_CUSTOMER') return 'Annulée';
  return '';
}

export function TaskChip({
  item,
  compact,
  rich,
  onClick,
  /** Largeur auto (ex. ménage centré entre Dép et Arr). */
  fitContent,
}: {
  item: TimelineItem | TaskItem;
  compact?: boolean;
  /** Résas : label long + heure + prénom staff. */
  rich?: boolean;
  onClick?: () => void;
  fitContent?: boolean;
}) {
  const type = (('type' in item ? item.type : null) || 'task') as TaskType;
  const s = TASK_CHIP_STYLES[type] || TASK_CHIP_STYLES.task;
  const staff = ('staffName' in item ? item.staffName : null) || ('staffCode' in item ? item.staffCode : null);
  const status = String(('taskStatus' in item ? item.taskStatus : item.status) || '');
  const done = status === 'COMPLETED' || status === 'CANCELLED';
  const isUnassigned = !staff && !done;
  const urgency = done ? 'green' : resolveTaskUrgency(item);
  const urgBar =
    done || urgency === 'green'
      ? 'rgba(10,143,94,0.45)'
      : urgency === 'red'
        ? T.error
        : T.warning;
  const isCleaning = type === 'cleaning';
  const label = isCleaning
    ? cleaningChipLabelFr(item)
    : rich
      ? TASK_CHIP_LABELS_RICH[type] || s.label
      : s.label;
  const when = String(
    ('scheduledFor' in item ? item.scheduledFor : '') ||
      ('startDate' in item ? item.startDate : '') ||
      '',
  );
  const clock = taskChipClock(when);
  const staffLabel = isUnassigned
    ? 'NA'
    : staff
      ? String(staff).trim().split(/\s+/)[0]
      : '';
  const statusShort = rich ? taskStatusShortFr(status) : '';
  const chipH = rich ? 38 : 24;

  return (
    <Tooltip
      title={<TaskHoverContent item={item} />}
      placement="top"
      enterDelay={280}
      leaveDelay={80}
      slotProps={HOVER_TOOLTIP_SX}
    >
      <Box
        component={onClick ? 'button' : 'div'}
        type={onClick ? 'button' : undefined}
        onClick={(e: React.MouseEvent) => {
          if (!onClick) return;
          e.stopPropagation();
          onClick();
        }}
        sx={{
          all: onClick ? 'unset' : undefined,
          boxSizing: 'border-box',
          height: chipH,
          minHeight: chipH,
          borderRadius: 0.9,
          fontSize: rich ? 11 : 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: rich ? 0.35 : 0.4,
          // Texte collé après la barre priorité (pas de pl parasite)
          pl: 0,
          pr: rich ? 0.4 : 0.55,
          overflow: 'hidden',
          whiteSpace: rich ? 'normal' : 'nowrap',
          bgcolor: done ? T.bg2 : s.bg,
          color: done ? T.text3 : s.color,
          cursor: onClick ? 'pointer' : 'default',
          fontFamily: 'inherit',
          textAlign: 'left',
          width: fitContent ? 'auto' : '100%',
          maxWidth: fitContent ? '100%' : undefined,
          minWidth: rich ? (fitContent ? 88 : 0) : 0,
          lineHeight: 1.1,
          border: `1px solid ${done ? T.border : `${s.color}33`}`,
          borderLeft: `3px solid ${urgBar}`,
          opacity: done ? 0.78 : 1,
          ...(onClick
            ? {
                '&:hover': {
                  filter: 'brightness(0.97)',
                  borderColor: s.color,
                  borderLeftColor: urgBar,
                },
              }
            : {}),
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: rich ? 12 : 12,
            flexShrink: 0,
            lineHeight: 1,
            width: rich ? 14 : 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'stretch',
            bgcolor: done ? 'transparent' : `${s.color}10`,
          }}
        >
          {s.emoji}
        </Box>

        {rich && !compact ? (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              justifyContent: 'center',
              py: 0,
              pr: '2px',
            }}
          >
            {/* L1 — type + heure */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 0.35,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <Box
                component="span"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  fontWeight: 800,
                  fontSize: 11,
                }}
              >
                {label}
              </Box>
              {clock ? (
                <Box
                  component="span"
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 10,
                    fontWeight: 750,
                    flexShrink: 0,
                    opacity: 0.9,
                  }}
                >
                  {clock}
                </Box>
              ) : null}
            </Box>
            {/* L2 — statut · livreur */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.35,
                minWidth: 0,
              }}
            >
              {statusShort ? (
                <Box
                  component="span"
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 9,
                    fontWeight: 700,
                    color: T.text2,
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title="Statut tâche"
                >
                  {statusShort}
                </Box>
              ) : (
                <Box component="span" sx={{ flex: 1, minWidth: 0 }} />
              )}
              {staffLabel ? (
                <Box
                  component="span"
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 9.5,
                    fontWeight: 800,
                    bgcolor: isUnassigned ? T.errorTint : 'rgba(255,255,255,0.82)',
                    color: isUnassigned ? T.error : s.color,
                    px: 0.4,
                    py: 0,
                    borderRadius: 0.45,
                    flexShrink: 0,
                    maxWidth: '42%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    border: isUnassigned ? `1px solid ${T.error}55` : `1px solid ${s.color}28`,
                  }}
                  title={isUnassigned ? 'Non assigné' : 'Livreur / staff'}
                >
                  {staffLabel}
                </Box>
              ) : null}
            </Box>
          </Box>
        ) : (
          <>
            {!compact && (
              <Box
                component="span"
                sx={{
                  flex: fitContent ? '0 1 auto' : 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  letterSpacing: '-0.01em',
                }}
              >
                {label}
              </Box>
            )}
            {clock && !isCleaning ? (
              <Box
                component="span"
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                  opacity: 0.9,
                }}
              >
                {clock}
              </Box>
            ) : null}
            {staffLabel ? (
              <Box
                component="span"
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 10,
                  fontWeight: 800,
                  bgcolor: isUnassigned ? T.errorTint : 'rgba(255,255,255,0.75)',
                  color: isUnassigned ? T.error : s.color,
                  px: 0.5,
                  py: '2px',
                  borderRadius: 0.6,
                  flexShrink: 0,
                  maxWidth: 48,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  border: isUnassigned ? `1px solid ${T.error}55` : '1px solid transparent',
                }}
              >
                {staffLabel}
              </Box>
            ) : null}
          </>
        )}
      </Box>
    </Tooltip>
  );
}

/** Chip tâche style Claude Design Cockpit (sous barre résa). */
export function CockpitTaskChip({
  item,
  dim = false,
  onClick,
}: {
  item: TimelineItem;
  dim?: boolean;
  onClick?: () => void;
}) {
  const type = (item.type || 'task') as TaskType;
  const s = TASK_CHIP_STYLES[type] || TASK_CHIP_STYLES.task;
  const status = String(item.status || '');
  const done = status === 'COMPLETED' || status === 'CANCELLED';
  const staff = item.staffName || null;
  const unassigned = !done && !staff;
  const color = unassigned ? '#C4483A' : done ? '#9B9285' : '#B8881A';
  const firstName = staff ? String(staff).trim().split(/\s+/)[0] : '';

  return (
    <Tooltip
      title={<TaskHoverContent item={item} />}
      placement="top"
      enterDelay={280}
      leaveDelay={80}
      slotProps={HOVER_TOOLTIP_SX}
    >
    <Box
      component="button"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        height: 26,
        px: '9px',
        borderRadius: '6px',
        flexShrink: 0,
        fontSize: 12.5,
        fontWeight: 650,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dim ? 0.45 : 1,
        color,
        bgcolor: done ? 'transparent' : T.bg1,
        border: `1.5px ${unassigned ? 'dashed' : 'solid'} ${done ? T.borderStrong : color}`,
        '&:hover': onClick ? { filter: 'brightness(0.97)' } : undefined,
      }}
    >
      <Box component="span" sx={{ fontSize: 12, lineHeight: 1 }}>{s.emoji}</Box>
      {s.label}
      {firstName && !unassigned ? (
        <Box component="span" sx={{ color: '#BEB7AA', fontWeight: 500 }}>·{firstName}</Box>
      ) : null}
    </Box>
    </Tooltip>
  );
}

function OpsPill({
  label,
  tone,
  hover,
}: {
  label: string;
  tone: StayOpsTone;
  hover: React.ReactNode;
}) {
  const map = {
    ok: { bg: 'rgba(10,143,94,0.14)', fg: '#0a8f5e', bd: 'rgba(10,143,94,0.35)' },
    warn: { bg: 'rgba(196,101,6,0.14)', fg: '#c46506', bd: 'rgba(196,101,6,0.38)' },
    alert: { bg: 'rgba(200,30,30,0.12)', fg: '#c81e1e', bd: 'rgba(200,30,30,0.4)' },
    mute: { bg: T.bg3, fg: T.text3, bd: T.border },
  } as const;
  const c = map[tone];
  return (
    <Tooltip
      title={hover}
      placement="top"
      enterDelay={220}
      leaveDelay={60}
      slotProps={HOVER_TOOLTIP_SX}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 16,
          px: '4px',
          borderRadius: '4px',
          fontFamily: '"Geist Mono", monospace',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.01em',
          lineHeight: 1,
          bgcolor: c.bg,
          color: c.fg,
          border: `1px solid ${c.bd}`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          cursor: 'help',
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
}

/**
 * Ligne StayOps seule (pas le ménage) :
 * [Dép] ……… [Arr][Enreg]
 * Ménage = ligne à part, centrée (moitié fin resa / début suivante).
 */
export function StayOpsDayLane({
  opsList,
  dayIso,
}: {
  opsList: StayOpsMeta[];
  dayIso: string;
}) {
  const today = todayIsoLocal();
  const day = dayIso.slice(0, 10);
  const depPills: React.ReactNode[] = [];
  const arrPills: React.ReactNode[] = [];

  opsList.forEach((ops, idx) => {
    const arrIso = (ops.arrivalDate || '').slice(0, 10);
    const depIso = (ops.departureDate || '').slice(0, 10);
    const daysToArr = daysUntilIso(arrIso, today);
    const daysToDep = daysUntilIso(depIso, today);
    const onSite = daysToArr <= 0 && daysToDep >= 0;
    const isArrDay = Boolean(arrIso && day === arrIso);
    const isDepDay = Boolean(depIso && day === depIso);
    if (!isArrDay && !isDepDay) return;

    const toReg = Math.max(0, ops.toRegister || 0);
    const reg = Math.max(0, ops.registered || 0);
    const regDone = toReg > 0 && reg >= toReg;
    const regTone: StayOpsTone = !toReg
      ? 'mute'
      : onSite || regDone
        ? 'ok'
        : stayOpsPendingTone(false, daysToArr);

    const arrClock = formatStayClock(ops.arrivalTime);
    const depClock = formatStayClock(ops.departureTime);
    const arrLabel = arrClock ? `Arr ${arrClock}` : 'Arr ·';
    const arrTone = stayOpsPendingTone(ops.arrivalChosen, daysToArr);
    const depLabel = depClock ? `Dép ${depClock}` : 'Dép ·';
    const depTone = stayOpsPendingTone(ops.departureChosen, daysToDep);

    if (isDepDay) {
      depPills.push(
        <OpsPill
          key={`dep-${idx}`}
          label={depLabel}
          tone={depTone}
          hover={
            <StayOpsHoverContent
              kind="dep"
              ops={ops}
              tone={depTone}
              daysUntil={daysToDep}
              onSite={onSite}
            />
          }
        />,
      );
    }
    if (isArrDay && daysToArr >= 0) {
      arrPills.push(
        <OpsPill
          key={`arr-${idx}`}
          label={arrLabel}
          tone={arrTone}
          hover={
            <StayOpsHoverContent
              kind="arr"
              ops={ops}
              tone={arrTone}
              daysUntil={daysToArr}
              onSite={onSite}
            />
          }
        />,
      );
    }
    if (isArrDay && toReg > 0) {
      arrPills.push(
        <OpsPill
          key={`reg-${idx}`}
          label={`${reg}/${toReg}`}
          tone={regTone}
          hover={
            <StayOpsHoverContent
              kind="reg"
              ops={ops}
              tone={regTone}
              daysUntil={daysToArr}
              onSite={onSite}
            />
          }
        />,
      );
    }
  });

  if (!depPills.length && !arrPills.length) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '3px',
        width: '100%',
        minHeight: COCKPIT_META.STATUS_H,
        mb: '2px',
        overflow: 'visible',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
        {depPills}
      </Box>
      <Box sx={{ flex: 1, minWidth: 4 }} />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '2px',
          flexShrink: 0,
        }}
      >
        {arrPills}
      </Box>
    </Box>
  );
}

/** Badge Q / R / A — même langage que l’inbox WA/OTA. */
function CommsKindBadge({ kind }: { kind: 'Q' | 'R' | 'A' }) {
  const styles =
    kind === 'Q'
      ? { bgcolor: '#fff7ed', color: '#c2410c', border: '#fdba74' }
      : kind === 'R'
        ? { bgcolor: '#ecfdf5', color: '#0e8c4d', border: 'rgba(14,140,77,0.25)' }
        : { bgcolor: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' };
  return (
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        fontFamily: '"Geist Mono", monospace',
        fontSize: 8.5,
        fontWeight: 800,
        letterSpacing: '0.04em',
        px: '4px',
        py: '0px',
        borderRadius: '3px',
        bgcolor: styles.bgcolor,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        lineHeight: '14px',
      }}
    >
      {kind}
    </Box>
  );
}

function channelCommsAccent(channel: 'wa' | Channel): {
  accent: string;
  wash: string;
  label: string;
} {
  if (channel === 'wa') return { accent: T.wa, wash: T.waWash, label: 'WhatsApp' };
  if (channel === 'airbnb') return { accent: T.airbnb, wash: '#FBF0EE', label: 'Airbnb' };
  if (channel === 'booking') return { accent: T.booking, wash: '#EDF1F8', label: 'Booking' };
  if (channel === 'vrbo') return { accent: T.vrbo, wash: '#ECFEFF', label: 'Vrbo' };
  return { accent: T.ota, wash: '#F5F4F1', label: 'OTA' };
}

function CommsPreviewLine({
  kind,
  when,
  text,
  urgent,
  accent,
}: {
  kind: 'Q' | 'R' | 'A';
  when?: string;
  text: string;
  urgent?: boolean;
  accent: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        minWidth: 0,
        height: COCKPIT_META.MSG_LINE_H,
        lineHeight: 1,
      }}
    >
      <CommsKindBadge kind={kind} />
      {when ? (
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            fontFamily: '"Geist Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            color: urgent ? T.text2 : T.text3,
            whiteSpace: 'nowrap',
          }}
        >
          {when}
        </Box>
      ) : null}
      <Box
        component="span"
        sx={{
          flex: 1,
          minWidth: 0,
          fontSize: 10,
          fontWeight: urgent ? 550 : 450,
          color: kind === 'A' ? accent : urgent ? T.ink : T.text2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </Box>
    </Box>
  );
}

function DualChannelCell({
  channel,
  meta,
  onClick,
}: {
  channel: 'wa' | Channel;
  meta?: CommsChannelMeta & { exists?: boolean };
  onClick?: () => void;
}) {
  const { accent, wash, label } = channelCommsAccent(channel);
  const rawText = String(meta?.text || '').trim();
  const placeholderText =
    !rawText ||
    /^(whatsapp|whatsapp lié|fil ota|aucun message|message ota|pas de nº|—|-)$/i.test(rawText) ||
    rawText.toLowerCase().startsWith('aucun message');
  const hasPhone = Boolean(String(meta?.phone || '').trim());
  const hasThread = Boolean(meta?.threadId);
  // Comme onglet OTA : Q/R et A en deux lignes si les deux existent
  const showAuto = Boolean(meta?.programmedAuto);
  const showQr = meta?.lastMessageKind === 'Q' || meta?.lastMessageKind === 'R';
  const qrText =
    showQr && rawText && !placeholderText
      ? rawText
      : showQr
        ? meta?.needsReply
          ? 'Non lu'
          : 'Message'
        : '';
  const autoText = showAuto ? meta!.programmedAuto!.label : '';
  const hasContent = showAuto || showQr || (!placeholderText && Boolean(rawText));
  const empty = !hasContent;
  const unread = meta?.unread || 0;
  // À répondre = fil guest, pas la relance auto
  const urgent = Boolean((meta?.needsReply || unread > 0) && (showQr || !showAuto));
  const clickable = Boolean(onClick && (hasContent || hasPhone || hasThread || channel !== 'wa'));

  return (
    <Tooltip
      title={
        <HoverPanel maxWidth={300}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.75 }}>{label}</Typography>
          <Stack gap={0.55}>
            {channel === 'wa' && hasPhone ? (
              <HoverLine label="Nº" value={String(meta!.phone)} />
            ) : null}
            {showQr ? (
              <>
                <HoverLine
                  label={meta!.lastMessageKind!}
                  value={qrText}
                  accent={meta!.lastMessageKind === 'Q' ? '#C4483A' : '#5CBF8F'}
                />
                {meta?.time ? <HoverLine label="Quand" value={meta.time} /> : null}
              </>
            ) : null}
            {showAuto ? (
              <>
                <HoverLine label="A" value={autoText} accent="#1d4ed8" />
                {meta!.programmedAuto!.time ? (
                  <HoverLine label="Quand" value={meta!.programmedAuto!.time} />
                ) : null}
              </>
            ) : null}
            {!showQr && !showAuto ? (
              <HoverLine label="Message" value="Aucun message" />
            ) : null}
            {urgent ? <HoverLine label="Action" value="À répondre" accent="#C4483A" /> : null}
            {unread > 0 ? <HoverLine label="Non lus" value={String(unread)} /> : null}
          </Stack>
        </HoverPanel>
      }
      placement="top"
      enterDelay={220}
      leaveDelay={60}
      slotProps={HOVER_TOOLTIP_SX}
    >
    <Box
      component={clickable ? 'button' : 'div'}
      type={clickable ? 'button' : undefined}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        if (!clickable) return;
        onClick?.();
      }}
      sx={{
        all: clickable ? 'unset' : undefined,
        boxSizing: 'border-box',
        flex: 1,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '1px',
        px: '5px',
        py: '2px',
        borderRadius: '5px',
        border: `1px solid ${urgent ? '#C4483A55' : `${accent}40`}`,
        borderLeft: `3px solid ${urgent ? '#C4483A' : accent}`,
        background: urgent
          ? 'linear-gradient(90deg, #FBF0EE 0%, #fff 55%)'
          : `linear-gradient(90deg, ${wash} 0%, #fff 60%)`,
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'inherit',
        opacity: empty ? 0.72 : 1,
        overflow: 'hidden',
        '&:hover': clickable
          ? { borderColor: accent, boxShadow: `0 1px 4px ${accent}22` }
          : undefined,
      }}
    >
      {unread > 0 && !showQr && !showAuto ? (
        <Box
          component="span"
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 8,
            fontWeight: 800,
            color: '#fff',
            bgcolor: T.goldDeep,
            borderRadius: '3px',
            px: '3px',
            alignSelf: 'flex-start',
            lineHeight: '12px',
          }}
        >
          {unread}
        </Box>
      ) : null}
      {showQr ? (
        <CommsPreviewLine
          kind={meta!.lastMessageKind!}
          when={meta?.time}
          text={qrText}
          urgent={urgent}
          accent={accent}
        />
      ) : null}
      {showAuto ? (
        <CommsPreviewLine
          kind="A"
          when={meta!.programmedAuto!.time}
          text={autoText}
          accent={accent}
        />
      ) : null}
      {!showQr && !showAuto ? (
        <Box
          component="span"
          sx={{
            fontSize: 10,
            fontWeight: 500,
            color: T.text4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          —
        </Box>
      ) : null}
    </Box>
    </Tooltip>
  );
}

/** WA | OTA — largeur = barre résa uniquement. Court séjour → empilé. Q+A = 2 lignes. */
export function CockpitCommsDualRow({
  wa,
  ota,
  otaChannel = 'direct',
  onWaClick,
  onOtaClick,
  narrow = false,
}: {
  wa?: CommsChannelMeta & { exists?: boolean };
  ota?: CommsChannelMeta & { exists?: boolean };
  otaChannel?: Channel;
  onWaClick?: () => void;
  onOtaClick?: () => void;
  /** Résa courte : 2 lignes dans la largeur de la barre (pas de débordement). */
  narrow?: boolean;
}) {
  const dualLines = Math.max(commsMetaLineCount(wa), commsMetaLineCount(ota));
  const cellH = Math.max(COCKPIT_META.MSG_ROW_H, dualLines * COCKPIT_META.MSG_LINE_H + 6);
  const rowH = narrow ? cellH * 2 + 2 : cellH;
  return (
    <Box
      sx={{
        height: rowH,
        minHeight: rowH,
        display: 'flex',
        flexDirection: narrow ? 'column' : 'row',
        alignItems: 'stretch',
        gap: narrow ? '2px' : '4px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <DualChannelCell channel="wa" meta={wa} onClick={onWaClick} />
      <DualChannelCell channel={otaChannel} meta={ota} onClick={onOtaClick} />
    </Box>
  );
}

/** Carte canal sous barre — Q/R/A + date (aligné inbox WA/OTA). */
export function CockpitCommsCard({
  kind,
  label,
  text,
  time,
  lastMessageKind,
  programmedAuto,
  count = 0,
  unread = 0,
  needsReply = false,
  empty = false,
  onClick,
}: {
  kind: 'wa' | 'ota';
  label: string;
  text?: string;
  time?: string;
  lastMessageKind?: 'Q' | 'R';
  programmedAuto?: CommsChannelMeta['programmedAuto'];
  count?: number;
  unread?: number;
  needsReply?: boolean;
  empty?: boolean;
  onClick?: () => void;
}) {
  const accent = kind === 'wa' ? T.wa : T.booking;
  const wash = kind === 'wa' ? T.waWash : '#EDF1F8';
  const urgent = needsReply || unread > 0;
  const countLabel = count > 0 ? `${count}` : empty ? '—' : '0';
  // Cockpit Résas : Q/R seulement (programmedAuto / relances ignorés).
  void programmedAuto;
  const showQr = Boolean(lastMessageKind && !empty);
  const preview = empty
    ? 'Aucun fil'
    : text || (unread > 0 ? 'Message non lu' : '—');
  const when = time || '';
  const titleBits = [
    label,
    needsReply ? 'À répondre' : '',
    unread ? `${unread} non lu(s)` : '',
    showQr
      ? `${lastMessageKind === 'Q' ? 'Question voyageur' : 'Réponse'}${when ? ` · ${when}` : ''}`
      : '',
    preview,
    onClick ? 'Cliquer pour ouvrir' : '',
  ].filter(Boolean);

  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.();
      }}
      sx={{
        all: onClick ? 'unset' : undefined,
        boxSizing: 'border-box',
        width: '100%',
        height: COCKPIT_META.CARD_H,
        minHeight: COCKPIT_META.CARD_H,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '2px',
        px: '6px',
        py: '4px',
        borderRadius: '6px',
        bgcolor: urgent ? '#fff' : '#fff',
        border: `1px solid ${urgent ? '#C4483A55' : `${accent}33`}`,
        borderLeft: `2px solid ${urgent ? '#C4483A' : accent}`,
        boxShadow: urgent
          ? '0 1px 4px rgba(196,72,58,0.1)'
          : '0 1px 2px rgba(22,19,14,0.05)',
        overflow: 'hidden',
        opacity: empty ? 0.72 : 1,
        background: urgent
          ? `linear-gradient(90deg, #FBF0EE 0%, #fff 40%)`
          : `linear-gradient(90deg, ${wash} 0%, #fff 55%)`,
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit',
        textAlign: 'left',
        '&:hover': onClick ? { borderColor: accent, boxShadow: `0 2px 8px ${accent}22` } : undefined,
      }}
      title={titleBits.join(' · ')}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, minWidth: 0 }}>
        <Box
          component="span"
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 8.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: accent,
            flexShrink: 0,
          }}
        >
          {kind === 'wa'
            ? 'WA'
            : label === 'Airbnb'
              ? 'Air'
              : label === 'Booking'
                ? 'Bkg'
                : label === 'Vrbo'
                  ? 'Vrbo'
                  : 'OTA'}
        </Box>
        <Box
          component="span"
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 8.5,
            fontWeight: 700,
            color: T.ink,
            bgcolor: '#fff',
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '3px',
            px: '4px',
            lineHeight: '13px',
            flexShrink: 0,
          }}
        >
          {countLabel}
        </Box>
        {unread > 0 && (
          <Box
            component="span"
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 8,
              fontWeight: 800,
              color: '#fff',
              bgcolor: T.goldDeep,
              borderRadius: '3px',
              px: '4px',
              lineHeight: '13px',
              flexShrink: 0,
            }}
          >
            {unread}
          </Box>
        )}
        {needsReply && (
          <Box
            component="span"
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#fff',
              bgcolor: '#C4483A',
              borderRadius: '3px',
              px: '4px',
              lineHeight: '13px',
              flexShrink: 0,
              ml: 'auto',
            }}
          >
            Répondre
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          minWidth: 0,
          lineHeight: 1.2,
        }}
      >
        {showQr ? <CommsKindBadge kind={lastMessageKind!} /> : null}
        {when ? (
          <Box
            component="span"
            sx={{
              flexShrink: 0,
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10,
              fontWeight: 700,
              color: urgent ? T.text2 : T.text3,
              whiteSpace: 'nowrap',
            }}
          >
            {when}
          </Box>
        ) : null}
        <Box
          component="span"
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: 10.5,
            fontWeight: showQr ? (urgent ? 500 : 400) : urgent ? 650 : 500,
            fontStyle: showQr ? 'normal' : empty ? 'normal' : 'italic',
            color: empty ? T.text4 : urgent ? T.ink : T.text2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {preview}
        </Box>
      </Box>
    </Box>
  );
}

/** @deprecated — préférer CockpitCommsCard */
export function CockpitChannelPill({
  kind,
  label,
  text,
  emph = false,
}: {
  kind: 'wa' | 'ota';
  label: string;
  text?: string;
  emph?: boolean;
}) {
  return (
    <CockpitCommsCard
      kind={kind}
      label={label}
      text={text}
      empty={!text || text === '—'}
      needsReply={emph}
    />
  );
}

export function GanttBar({
  channel,
  guestName,
  reservationNumber,
  confirmed,
  leftPct,
  widthPct,
  compact = false,
  numberOfGuests,
  arrivalDate,
  departureDate,
  lastWa,
  lastOta,
  roomTypeName,
  roomName,
  listingName,
  isBlock = false,
  blockNote,
  blockAuthor,
}: {
  channel: Channel;
  guestName: string;
  reservationNumber?: string;
  confirmed: boolean;
  leftPct: number;
  widthPct: number;
  compact?: boolean;
  /** @deprecated — WA/OTA sont sous la barre (CockpitCommsCard), pas dans la ligne nom. */
  hasOtaMsg?: boolean;
  /** @deprecated — idem */
  hasWaMsg?: boolean;
  numberOfGuests?: number;
  arrivalDate?: string;
  departureDate?: string;
  lastWa?: CommsChannelMeta & { exists?: boolean };
  lastOta?: CommsChannelMeta & { exists?: boolean };
  /** Type Multi — affiché à côté du voyageur (Single = omis). */
  roomTypeName?: string;
  /** Unité inventaire Mews (101) — prioritaire sur la barre. */
  roomName?: string;
  listingName?: string;
  /** Blocage calendrier (CalendarBlock) : barre neutre rouge, tooltip titre/note/auteur. */
  isBlock?: boolean;
  blockNote?: string;
  blockAuthor?: string;
}) {
  const ch = isBlock
    ? { color: '#b91c1c', wash: 'rgba(220,38,38,0.09)' }
    : CHANNEL_COCKPIT[channel];
  const channelLabel = { airbnb: 'Airbnb', booking: 'Booking', vrbo: 'Vrbo', direct: 'Direct' }[channel];
  const barH = compact ? STAY_COMPACT.RES_BAR_HEIGHT : STAY.RES_BAR_HEIGHT;
  const barTop = compact ? STAY_COMPACT.RES_BAR_TOP : STAY.RES_BAR_TOP;
  const otaLabel =
    channel === 'airbnb' ? 'Airbnb'
      : channel === 'booking' ? 'Booking'
        : channel === 'vrbo' ? 'Vrbo'
          : 'OTA';
  const nights = (() => {
    if (!arrivalDate || !departureDate) return null;
    const a = new Date(`${String(arrivalDate).slice(0, 10)}T12:00:00`).getTime();
    const d = new Date(`${String(departureDate).slice(0, 10)}T12:00:00`).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(d)) return null;
    const n = Math.round((d - a) / 86400000);
    return n > 0 ? n : null;
  })();
  const typeLabel = String(roomTypeName || '').trim();
  const unitLabel = String(roomName || '').trim();
  const barSuffix = unitLabel || typeLabel;
  const hoverType = typeLabel || undefined;
  const hoverUnit = unitLabel || undefined;

  return (
    <Tooltip
      title={isBlock ? (
        <Box sx={{ p: 0.5, maxWidth: 260 }}>
          <Box sx={{ fontSize: 12.5, fontWeight: 800, mb: 0.3 }}>🚫 {guestName}</Box>
          {blockNote ? (
            <Box sx={{ fontSize: 11.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', mb: 0.3 }}>
              {blockNote}
            </Box>
          ) : null}
          <Box sx={{ fontSize: 10.5, opacity: 0.8 }}>
            Bloqué{blockAuthor ? ` par ${blockAuthor}` : ''}
            {nights != null && nights > 0 ? ` · ${nights} nuit(s)` : ''}
          </Box>
        </Box>
      ) : (
        <ReservationHoverContent
          guestName={guestName}
          reservationNumber={reservationNumber}
          channelLabel={channelLabel}
          confirmed={confirmed}
          arrivalDate={arrivalDate}
          departureDate={departureDate}
          numberOfGuests={numberOfGuests}
          nights={nights}
          lastWa={lastWa}
          lastOta={lastOta}
          otaLabel={otaLabel}
          roomTypeName={hoverType}
          roomName={hoverUnit}
          listingName={listingName}
        />
      )}
      placement="top"
      enterDelay={320}
      leaveDelay={100}
      followCursor={false}
      slotProps={HOVER_TOOLTIP_SX}
    >
      <Box
        className="sojori-resw"
        sx={{
          position: 'absolute',
          top: barTop,
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          zIndex: 2,
          cursor: 'pointer',
          '&:hover .sojori-resbar': {
            height: compact ? barH : 32,
            boxShadow: `0 4px 14px ${ch.color}33`,
          },
        }}
      >
        <Box
          className="sojori-resbar"
          sx={{
            height: barH,
            borderRadius: compact ? '5px' : '6px',
            background: `linear-gradient(90deg, ${ch.color}22 0%, ${ch.wash} 28%, ${ch.wash} 100%)`,
            border: `1px solid ${ch.color}55`,
            borderLeft: `4px solid ${ch.color}`,
            color: T.ink,
            display: 'flex',
            alignItems: 'center',
            px: compact ? '5px' : '8px',
            pl: compact ? '5px' : '7px',
            gap: compact ? 0.4 : 0.65,
            fontSize: compact ? 9.5 : 12.5,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            transition: 'height 0.15s ease, box-shadow 0.15s ease',
            boxShadow: `0 1px 2px ${ch.color}18`,
          }}
        >
          {/* Canal = couleur barre uniquement (pas de badge Boo/Air). */}
          {!confirmed && !compact && (
            <Box component="span" sx={{ fontSize: 9, color: T.warning, flexShrink: 0 }}>⏳</Box>
          )}
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
            {isBlock ? '🚫 ' : ''}{guestName}
            {barSuffix && !compact ? (
              <Box
                component="span"
                sx={{
                  fontWeight: 650,
                  color: T.text2,
                  ml: 0.5,
                  fontSize: compact ? 8.5 : 11,
                }}
              >
                · {barSuffix}
              </Box>
            ) : null}
            {nights != null && nights > 0 ? (
              <Box
                component="span"
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: compact ? 8.5 : 10.5,
                  fontWeight: 700,
                  color: T.text3,
                  ml: 0.5,
                  letterSpacing: '0.02em',
                }}
              >
                {nights}n
              </Box>
            ) : null}
          </Box>
          {numberOfGuests != null && numberOfGuests > 0 && !compact && (
            <Box component="span" sx={{
              fontFamily: '"Geist Mono", monospace', fontSize: 10, color: T.text3,
              flexShrink: 0, letterSpacing: '0.02em',
            }}>
              {numberOfGuests}p
            </Box>
          )}
        </Box>
      </Box>
    </Tooltip>
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
