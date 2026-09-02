/**
 * Sources de vérité Ma journée (pas l’orchestration seule) :
 * - Arrivées / départs / créées / annulées → srv-reservations
 * - Propreté → listing.cleanlinessStatus_v2
 * - Messages → WhatsApp (fullchatbot) + OTA (srv-reservations get-thread)
 * - Expériences → tâches fulltask du jour (transport / custom / grocery)
 */
import { useCallback, useEffect, useState } from 'react';
import { reservationsService } from '../../services/reservationsService';
import { listingsService } from '../../services/listingsService';
import { messagesService } from '../../services/messagesService';
import { getDayPlan, listTasks, type DayPlanStep } from '../../services/fulltaskApi';
import type { Reservation } from '../../types/reservations.types';
import type { Conversation } from '../../types/messages.types';
import { mapApiItemToOtaThread } from '../../components/unified-inbox/inboxOtaMappers';
import { resolveOtaListLastMessage } from '../../components/unified-inbox/otaExchangePresence';
import { isOtaUnreplied } from '../../components/unified-inbox/otaThreadFilters';
import { isWaUnreplied } from '../../components/unified-inbox/waThreadFilters';
import { inboxMessagePreview } from '../../components/unified-inbox/formatInboxMessageText';
import { presenceMetaFromReservation } from '../../utils/reservationPresence';
import { waInboxUrl } from '../../utils/commsDeepLinks';

const UNASSIGNED = 'Non assigné';

function toIso(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function dayKey(v?: Date | string | null): string {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  try {
    return toIso(v);
  } catch {
    return '';
  }
}

function hhmm(v?: string | Date | null): string | null {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return null;
}

/** Affichage ops : 15h / 15h30 (aligné réservations). */
function hourLabel(v?: string | Date | number | null): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') {
    const h = Math.floor(v / 100);
    const m = v % 100;
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }
  const t = hhmm(v);
  if (!t) return null;
  const [h, m] = t.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

function nightsBetween(from?: Date | string, to?: Date | string): number | null {
  const a = dayKey(from);
  const b = dayKey(to);
  if (!a || !b) return null;
  const n = Math.round(
    (new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000,
  );
  return n > 0 ? n : null;
}

function channelOf(r: Reservation): string {
  return String(r.channelName || r.source || '').trim() || '—';
}

function listingNameOf(r: Reservation): string {
  return r.listing?.name || r.roomName || 'Logement';
}

function listingIdOf(r: Reservation): string {
  return String(r.sojoriId || r.listingMapId || r.listing?._id || '');
}

/** Aligné sur /reservations (compteurs 3/3) — pas seulement guestsRegistrationStatus. */
function isRegistered(r: Reservation): boolean {
  const gr = r.guestRegistration;
  const total = Number(gr?.nbre_guest_to_register ?? r.adults ?? 0) || 0;
  const registered = Number(gr?.nbre_guest_registered ?? 0) || 0;
  const complete = Number(gr?.nbre_guest_complete ?? 0) || 0;
  if (total > 0 && (registered >= total || complete >= total)) return true;

  const members = Array.isArray(gr?.members) ? gr.members : [];
  if (total > 0) {
    const doneMembers = members.filter((m) => {
      const s = String((m as { status?: string; done?: boolean })?.status || '').toLowerCase();
      return (m as { done?: boolean })?.done === true || s === 'done' || s === 'complete' || s === 'completed';
    }).length;
    if (doneMembers >= total) return true;
  }

  // Prefer nested registration_status — top-level guestsRegistrationStatus is often stuck PENDING.
  const st = String(gr?.registration_status || r.guestsRegistrationStatus || '').toLowerCase();
  if (!st || /pending|not[_ ]?started|in[_ ]?progress|draft/.test(st)) return false;
  return /complete|done|ok|registered|finished|valid/.test(st);
}

function cleanLabel(status?: string): 'clean' | 'dirty' | 'unknown' {
  const s = String(status || '').toLowerCase();
  if (!s) return 'unknown';
  if (/(clean|propre|ready)/.test(s) && !/dirty|sale|in_progress|en_cours/.test(s)) return 'clean';
  if (/(dirty|sale|dirty_needed|needs_clean)/.test(s)) return 'dirty';
  if (/(in_progress|en_cours|cleaning)/.test(s)) return 'dirty';
  return 'unknown';
}

function relativeWhen(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  if (mins < 24 * 60) return `il y a ${Math.round(mins / 60)} h`;
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export type StayCheck = {
  cls: 'ok' | 'no' | 'bad' | 'done';
  text: string;
  /** Badge principal (Arrivé à / Attendu) — le reste est secondaire. */
  primary?: boolean;
};

export type StayRow = {
  id: string;
  reservationId: string;
  listingId: string;
  reservationKeys: string[];
  time: string;
  timeTbd: boolean;
  guestName: string;
  meta: string;
  checks: StayCheck[];
  /** Accueil check-in / check-out */
  staffName: string;
  /** Femme de ménage */
  cleanerName: string;
};

export type ExpRow = {
  id: string;
  taskId?: string;
  time: string;
  title: string;
  sub: string;
  tag: string;
  tagCrit?: boolean;
  tagOk?: boolean;
};

export type MsgRow = {
  id: string;
  channel: 'wa' | 'ota';
  guestName: string;
  listingHint: string;
  preview: string;
  unread: boolean;
  when: string;
  href: string;
};

export type MaJourneeModel = {
  date: string;
  listingCount: number;
  arrivals: StayRow[];
  departures: StayRow[];
  createdCount: number;
  createdChannels: string;
  cancelledCount: number;
  cancelledDetail: string;
  experiences: ExpRow[];
  messages: MsgRow[];
  arrivalDetail: string;
  departureDetail: string;
  /** Accueils et menages du jour clotures par le staff, sur le total attendu. */
  staffDone: number;
  staffTotal: number;
  staffDetail: string;
};

const EMPTY: MaJourneeModel = {
  date: toIso(new Date()),
  listingCount: 0,
  arrivals: [],
  departures: [],
  createdCount: 0,
  createdChannels: '—',
  cancelledCount: 0,
  cancelledDetail: 'Aucune aujourd’hui',
  experiences: [],
  messages: [],
  arrivalDetail: 'Rien à signaler',
  departureDetail: 'Aucun départ',
  staffDone: 0,
  staffTotal: 0,
  staffDetail: 'Rien à clôturer',
};

function reservationKeysOf(r: Reservation): string[] {
  const keys = [r.id, r.reservationNumber, r.channelReservationId]
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  return [...new Set(keys)];
}

function mapArrival(r: Reservation, cleanMap: Map<string, string>): StayRow {
  const plannedLabel =
    hourLabel(r.checkInTime) || hourLabel(r.arrival_time as string | undefined) || null;
  const declaredLabel = hourLabel(r.actualArrivalTime as string | undefined);
  const presence = presenceMetaFromReservation(r);
  const arrived = presence.label === 'Arrivé' || Boolean(r.actualArrivalTime);
  const hourOk = Boolean(
    r.confirmedCheckInTime || r.arrival_time_chosen || plannedLabel,
  );
  const lid = listingIdOf(r);
  const regOk = isRegistered(r);
  const clean = cleanLabel(cleanMap.get(lid));
  const n = nightsBetween(r.arrivalDate, r.departureDate);
  const meta = [listingNameOf(r), n ? `${n} nuit${n > 1 ? 's' : ''}` : null, channelOf(r)]
    .filter(Boolean)
    .join(' · ');

  // Colonne heure : réelle si arrivé, sinon prévue.
  const time = arrived
    ? declaredLabel || plannedLabel || '?'
    : plannedLabel || '?';

  const checks: StayCheck[] = [];
  if (arrived) {
    checks.push({
      cls: 'ok',
      primary: true,
      text: declaredLabel ? `Arrivé à ${declaredLabel}` : 'Arrivé',
    });
    // Plus besoin de « 15h confirmée » une fois sur place.
  } else {
    checks.push({
      cls: 'no',
      primary: true,
      text: plannedLabel
        ? hourOk
          ? `Attendu · ${plannedLabel}`
          : `Attendu · ${plannedLabel}?`
        : 'Attendu · heure ?',
    });
    // Pas de second marqueur quand l'heure manque : « Attendu · heure ? »
    // le dit deja. Le repeter sur chaque ligne — les voyageurs ne declarent
    // pas encore leur heure — noyait la page sous un bruit constant, au
    // point qu'une heure REELLEMENT declaree passerait inapercue.
    if (hourOk) {
      checks.push({ cls: 'ok', text: '✓ Heure déclarée' });
    }
  }

  checks.push(
    { cls: regOk ? 'ok' : 'no', text: regOk ? 'Enregistré' : 'Non enregistré' },
    {
      cls: clean === 'clean' ? 'ok' : clean === 'dirty' ? 'bad' : 'no',
      text: clean === 'clean' ? 'Propre' : clean === 'dirty' ? 'Sale' : 'Propreté ?',
    },
  );

  return {
    id: r.id,
    reservationId: r.id,
    listingId: lid,
    reservationKeys: reservationKeysOf(r),
    time,
    timeTbd: !arrived && !hourOk,
    guestName: r.guestName || 'Voyageur',
    meta,
    checks,
    staffName: UNASSIGNED,
    cleanerName: UNASSIGNED,
  };
}

function mapDeparture(r: Reservation, cleanMap: Map<string, string>): StayRow {
  const time =
    hhmm(r.checkOutTime) ||
    hhmm(r.actualDepartureTime as string | undefined) ||
    '11:00';
  const left =
    String(r.customerStatus || '').toLowerCase() === 'departed' ||
    Boolean(r.actualDepartureTime) ||
    Boolean(r.confirmedCheckOutTime);
  const lid = listingIdOf(r);
  const clean = cleanLabel(cleanMap.get(lid));

  return {
    id: r.id,
    reservationId: r.id,
    listingId: lid,
    reservationKeys: reservationKeysOf(r),
    time,
    timeTbd: false,
    guestName: r.guestName || 'Voyageur',
    meta: listingNameOf(r),
    checks: [
      { cls: left ? 'done' : 'no', text: left ? 'Parti' : 'Pas encore parti' },
      {
        // Tant que le voyageur est la, l'etat « clean » est celui du menage
        // PRECEDENT : afficher « Menage fait » laissait croire que la
        // remise en etat du depart etait deja faite, alors qu'elle ne peut
        // pas avoir commence.
        cls: !left ? 'no' : clean === 'clean' ? 'ok' : clean === 'dirty' ? 'bad' : 'no',
        text: !left
          ? 'Ménage après départ'
          : clean === 'clean'
            ? '✓ Ménage fait'
            : clean === 'dirty'
              ? 'Ménage à faire'
              : 'Propreté ?',
      },
    ],
    staffName: UNASSIGNED,
    cleanerName: UNASSIGNED,
  };
}

function taskTypeBlob(t: { taskType?: string; type?: string; requestType?: string; kind?: string }): string {
  return [t.taskType, t.type, t.requestType, t.kind]
    .map((x) => String(x || '').toLowerCase())
    .join(' ');
}

function isCleaningType(blob: string): boolean {
  return /cleaning|menage|ménage|checkout_cleaning/.test(blob);
}

function isReceiveArrival(blob: string): boolean {
  return (
    /receive_arrival/.test(blob) ||
    (/accueil/.test(blob) && /check.?in|arriv/.test(blob))
  );
}

function isReceiveDeparture(blob: string): boolean {
  return (
    /receive_departure/.test(blob) ||
    (/accueil/.test(blob) && /check.?out|d[eé]part/.test(blob))
  );
}

function namedOrUnassigned(name?: string | null): string {
  const n = String(name || '').trim();
  return n || UNASSIGNED;
}

type StaffAssignIndex = {
  staffByResKey: Map<string, string>;
  cleanerByResKey: Map<string, string>;
  cleanerByListing: Map<string, string>;
  staffArrivalByListing: Map<string, string>;
  staffDepartureByListing: Map<string, string>;
};

function buildStaffAssignIndex(
  steps: DayPlanStep[],
  chains: Array<{
    id: string;
    listingId: string;
    departingReservationId: string;
    arrivingReservationId: string;
  }>,
  taskList: Record<string, unknown>[],
): StaffAssignIndex {
  const staffByResKey = new Map<string, string>();
  const cleanerByResKey = new Map<string, string>();
  const cleanerByListing = new Map<string, string>();
  const staffArrivalByListing = new Map<string, string>();
  const staffDepartureByListing = new Map<string, string>();

  const put = (map: Map<string, string>, key: string | undefined, name: string | null | undefined) => {
    const k = String(key || '').trim();
    const n = String(name || '').trim();
    if (!k || !n || map.has(k)) return;
    map.set(k, n);
  };

  for (const s of steps) {
    const blob = taskTypeBlob({ taskType: s.taskType });
    const name = s.staffName;
    if (s.kind === 'cleaning' || isCleaningType(blob)) {
      put(cleanerByResKey, s.reservationId, name);
      put(cleanerByResKey, s.reservationCode, name);
      put(cleanerByListing, s.listingId, name);
    } else if (isReceiveArrival(blob)) {
      put(staffByResKey, s.reservationId, name);
      put(staffByResKey, s.reservationCode, name);
      put(staffArrivalByListing, s.listingId, name);
    } else if (isReceiveDeparture(blob)) {
      put(staffByResKey, s.reservationId, name);
      put(staffByResKey, s.reservationCode, name);
      put(staffDepartureByListing, s.listingId, name);
    }
  }

  /* Turnover : ménage du départ → utile pour l’arrivée du même listing. */
  for (const c of chains) {
    const clean =
      cleanerByResKey.get(c.departingReservationId) ||
      steps.find(
        (s) =>
          (s.kind === 'cleaning' || isCleaningType(taskTypeBlob({ taskType: s.taskType }))) &&
          (s.chainId === c.id || s.reservationId === c.departingReservationId),
      )?.staffName;
    put(cleanerByResKey, c.arrivingReservationId, clean);
    put(cleanerByListing, c.listingId, clean);
  }

  for (const t of taskList) {
    const blob = taskTypeBlob({
      taskType: String(t.taskType || ''),
      type: String(t.type || ''),
      requestType: String(t.requestType || ''),
    });
    const name = String(
      t.staffName || t.assignedToName || t.assigneeName || (t.staff as { name?: string } | undefined)?.name || '',
    ).trim();
    if (!name) continue;
    const resKeys = [
      t.reservationId,
      t.reservation_id,
      t.reservationNumber,
      t.reservationCode,
    ].map((x) => String(x || '').trim()).filter(Boolean);
    const listingId = String(t.listingId || t.listing_id || '').trim();
    if (isCleaningType(blob)) {
      for (const k of resKeys) put(cleanerByResKey, k, name);
      put(cleanerByListing, listingId, name);
    } else if (isReceiveArrival(blob)) {
      for (const k of resKeys) put(staffByResKey, k, name);
      put(staffArrivalByListing, listingId, name);
    } else if (isReceiveDeparture(blob)) {
      for (const k of resKeys) put(staffByResKey, k, name);
      put(staffDepartureByListing, listingId, name);
    }
  }

  return {
    staffByResKey,
    cleanerByResKey,
    cleanerByListing,
    staffArrivalByListing,
    staffDepartureByListing,
  };
}

function resolveStayStaff(
  row: StayRow,
  kind: 'arrival' | 'departure',
  idx: StaffAssignIndex,
): StayRow {
  let staff = '';
  for (const k of row.reservationKeys) {
    const hit = idx.staffByResKey.get(k);
    if (hit) {
      staff = hit;
      break;
    }
  }
  if (!staff) {
    staff =
      (kind === 'arrival'
        ? idx.staffArrivalByListing.get(row.listingId)
        : idx.staffDepartureByListing.get(row.listingId)) || '';
  }

  let cleaner = '';
  for (const k of row.reservationKeys) {
    const hit = idx.cleanerByResKey.get(k);
    if (hit) {
      cleaner = hit;
      break;
    }
  }
  if (!cleaner) cleaner = idx.cleanerByListing.get(row.listingId) || '';

  return {
    ...row,
    staffName: namedOrUnassigned(staff),
    cleanerName: namedOrUnassigned(cleaner),
  };
}

function isExperienceTask(t: Record<string, unknown>): boolean {
  const blob = [
    t.requestType,
    t.type,
    t.taskType,
    t.category,
    t.title,
    t.name,
    (t.payload as { kind?: string } | undefined)?.kind,
  ]
    .map((x) => String(x || '').toLowerCase())
    .join(' ');
  return /transport|transfert|grocery|course|custom|expérience|experience|concierge|quad|activité|activite|j3|partner/.test(
    blob,
  );
}

function taskOnDay(t: Record<string, unknown>, day: string): boolean {
  for (const key of ['scheduledDate', 'scheduledAt', 'dueDate', 'date', 'plannedAt']) {
    const v = t[key];
    if (v && dayKey(v as string) === day) return true;
  }
  return false;
}

export type MaJourneeDay = 'today' | 'tomorrow';

function dateForDay(day: MaJourneeDay): string {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  if (day === 'tomorrow') base.setDate(base.getDate() + 1);
  return toIso(base);
}

export function useMaJourneeData(day: MaJourneeDay = 'today') {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<MaJourneeModel>(() => ({
    ...EMPTY,
    date: dateForDay(day),
  }));

  const load = useCallback(async () => {
    const date = dateForDay(day);
    const checkInFilter = day === 'tomorrow' ? 'CHECKIN_TOMORROW' : 'CHECKIN_TODAY';
    const checkOutFilter = day === 'tomorrow' ? 'CHECKOUT_TOMORROW' : 'CHECKOUT_TODAY';
    setLoading(true);
    try {
      const [
        arrivalsRes,
        depsRes,
        createdRes,
        cancelledRes,
        listingsRes,
        waRes,
        otaRes,
        tasksRes,
        dayPlanRes,
      ] = await Promise.all([
        reservationsService.getList({ filter: checkInFilter, limit: 100 }).catch(() => null),
        reservationsService.getList({ filter: checkOutFilter, limit: 100 }).catch(() => null),
        reservationsService
          .getList({
            dateType: 'creation',
            startDate: date,
            endDate: date,
            limit: 50,
            sortField: 'createdAt',
          })
          .catch(() => null),
        // Annulations du jour sélectionné = cancellationDate
        reservationsService
          .getList({
            dateType: 'arrival',
            startDate: toIso(new Date(Date.now() - 90 * 86400000)),
            endDate: toIso(new Date(Date.now() + 365 * 86400000)),
            limit: 100,
            status: 'Cancelled,cancelled,CancelledByAdmin,cancelled_by_guest,cancelled_by_host',
            sortField: 'createdAt',
            sortOrder: 'desc',
          })
          .catch(() => null),
        listingsService
          .getListings({ page: 0, limit: 300, useActiveFilter: true, active: true })
          .catch(() => null),
        messagesService
          .getConversations({ filter: 'smart', limit: 80, silent: true })
          .catch(() => null),
        // Pas unreplied=true seul : le statut Mongo est souvent périmé (hôte a répondu).
        // On charge les fils récents et on classe côté client (otaThreadNeedsReply).
        messagesService
          .getOTAThreads({ page: 0, limit: 80, sortBy: 'lastMessageAt' })
          .catch(() => null),
        listTasks({ audience: 'STAFF', limit: 200 }).catch(() => null),
        getDayPlan(date).catch(() => null),
      ]);

      const cleanMap = new Map<string, string>();
      const listingItems = listingsRes?.data?.items || [];
      for (const l of listingItems) {
        if (l.id && l.cleanlinessStatus_v2) cleanMap.set(l.id, l.cleanlinessStatus_v2);
      }

      const taskListEarly: Record<string, unknown>[] = Array.isArray(tasksRes)
        ? (tasksRes as Record<string, unknown>[])
        : Array.isArray((tasksRes as { data?: unknown })?.data)
          ? ((tasksRes as { data: Record<string, unknown>[] }).data)
          : Array.isArray((tasksRes as { tasks?: unknown })?.tasks)
            ? ((tasksRes as { tasks: Record<string, unknown>[] }).tasks)
            : [];

      const assignIdx = buildStaffAssignIndex(
        dayPlanRes?.steps || [],
        dayPlanRes?.chains || [],
        taskListEarly,
      );

      const arrivalsRaw = (arrivalsRes?.data || []).filter(
        (r) => !/cancel/i.test(String(r.status || '')),
      );
      const depsRaw = (depsRes?.data || []).filter((r) => !/cancel/i.test(String(r.status || '')));

      const arrivals = arrivalsRaw
        .map((r) => resolveStayStaff(mapArrival(r, cleanMap), 'arrival', assignIdx))
        .sort((a, b) => a.time.localeCompare(b.time));
      const departures = depsRaw
        .map((r) => resolveStayStaff(mapDeparture(r, cleanMap), 'departure', assignIdx))
        .sort((a, b) => a.time.localeCompare(b.time));

      let ready = 0;
      let hourTbd = 0;
      let dirty = 0;
      let attendu = 0;
      let arrived = 0;
      for (const a of arrivals) {
        const regOk = a.checks.some((c) => c.text.includes('Enregistré') && c.cls === 'ok');
        const cleanOk = a.checks.some((c) => c.text === 'Propre' && c.cls === 'ok');
        const isArrived = a.checks.some((c) => c.primary && c.text.startsWith('Arrivé'));
        if (isArrived) arrived += 1;
        else if (a.checks.some((c) => c.primary && c.text.startsWith('Attendu'))) attendu += 1;
        // Prête ops = enregistré + propre (l’heure choisie n’a plus de sens une fois arrivé).
        if (regOk && cleanOk) ready += 1;
        if (!isArrived && a.timeTbd) hourTbd += 1;
        if (a.checks.some((c) => c.cls === 'bad')) dirty += 1;
      }
      // En location courte duree il n'y a pas de reception : cet ecran EST
      // le filet qui rattrape les oublis. Ce qui manque passe donc devant —
      // « 5 sans heure » se lit comme une action, « 5 attendus » comme un
      // simple constat.
      const arrivalDetail = [
        dirty ? `⚠ ${dirty} logement${dirty > 1 ? 's' : ''} pas prêt${dirty > 1 ? 's' : ''}` : null,
        hourTbd ? `${hourTbd} sans heure déclarée` : null,
        attendu ? `${attendu} attendu${attendu > 1 ? 's' : ''}` : null,
        arrived ? `${arrived} arrivé${arrived > 1 ? 's' : ''}` : null,
        ready ? `${ready} prête${ready > 1 ? 's' : ''}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || (arrivals.length ? 'En cours' : 'Rien à signaler');

      const left = departures.filter((d) => d.checks.some((c) => c.text === 'Parti')).length;
      const pending = Math.max(0, departures.length - left);
      // Un depart non constate apres l'heure de sortie bloque le menage, donc
      // l'arrivee suivante : c'est l'oubli le plus couteux de la journee.
      const departureDetail =
        departures.length === 0
          ? 'Aucun départ'
          : pending
            ? `⚠ ${pending} départ${pending > 1 ? 's' : ''} à constater${left ? ` · ${left} parti${left > 1 ? 's' : ''}` : ''}`
            : `${left} parti${left > 1 ? 's' : ''}`;

      const created = createdRes?.data || [];
      const chans = new Set<string>();
      for (const r of created) {
        const c = channelOf(r);
        if (c && c !== '—') chans.add(c);
      }

      const cancelled = (cancelledRes?.data || []).filter((r) => {
        const raw = r as Reservation & { updatedAt?: string | Date | null };
        const cancelDay = dayKey(raw.cancellationDate) || dayKey(raw.updatedAt);
        return cancelDay === date;
      });
      let cancelledDetail = day === 'tomorrow' ? 'Aucune demain' : 'Aucune aujourd’hui';
      if (cancelled.length) {
        const first = cancelled[0];
        cancelledDetail = [channelOf(first), listingNameOf(first)].filter(Boolean).join(' · ');
      }

      const taskList = taskListEarly;

      /**
       * Cloture des tâches terrain du jour.
       *
       * En location courte duree il n'y a pas de reception : c'est le clic
       * « Fin accueil » du staff qui declare l'arrivee quand le voyageur ne
       * l'a pas fait. Sans cloture, ni l'heure ni l'etat du logement ne
       * remontent — et le filet de rattrapage reste inerte.
       */
      const FIELD_TYPES = ['receive_arrival', 'receive_departure', 'checkout_cleaning'];
      let staffDone = 0;
      let staffTotal = 0;
      let staffDoing = 0;
      for (const t of taskList) {
        const type = String((t as { type?: unknown }).type || '');
        if (!FIELD_TYPES.includes(type)) continue;
        if (!taskOnDay(t, date)) continue;
        const st = String((t as { status?: unknown }).status || '');
        if (st === 'cancelled') continue;
        staffTotal += 1;
        if (st === 'done') staffDone += 1;
        else if (st === 'doing') staffDoing += 1;
      }
      const staffDetail = !staffTotal
        ? 'Rien à clôturer'
        : staffDone === staffTotal
          ? 'Tout est clôturé'
          : [
              staffDoing ? `${staffDoing} commencée${staffDoing > 1 ? 's' : ''}` : null,
              `⚠ ${staffTotal - staffDone} à clôturer`,
            ]
              .filter(Boolean)
              .join(' · ');

      const experiences: ExpRow[] = taskList
        .filter((t) => isExperienceTask(t) && taskOnDay(t, date))
        .slice(0, 20)
        .map((t) => {
          const status = String(t.status || '').toLowerCase();
          const staff = String(
            (t.assignedToName as string) ||
              (t.staffName as string) ||
              (t.assigneeName as string) ||
              '',
          );
          const tagCrit = !staff && !/done|completed|fait/.test(status);
          const tagOk = /done|completed|fait/.test(status);
          return {
            id: String(t._id || t.id || Math.random()),
            taskId: String(t._id || t.id || ''),
            time: hhmm(String(t.scheduledAt || t.scheduledTime || t.time || '')) || '—',
            title: String(t.title || t.name || t.requestType || 'Expérience'),
            sub: [t.guestName || t.reservationGuestName, staff ? `· ${staff}` : null]
              .filter(Boolean)
              .join(' '),
            tag: tagOk ? 'FAIT' : tagCrit ? 'À ASSIGNER' : /confirm|doing|accepted/.test(status) ? 'CONFIRMÉ' : 'PLANIFIÉ',
            tagCrit,
            tagOk,
          };
        });

      const messages: MsgRow[] = [];

      const waConvs: Conversation[] = waRes?.data?.conversations || [];
      for (const c of waConvs) {
        const unreplied = isWaUnreplied(c) || (c.unread_count || 0) > 0;
        const ex = c.recent_exchanges?.[0];
        const rawPreview =
          ex?.owner_summary ||
          ex?.user_message ||
          (unreplied ? '' : ex?.ai_response) ||
          '';
        const preview =
          inboxMessagePreview(rawPreview) ||
          (unreplied ? 'Message en attente' : 'Conversation WhatsApp');
        messages.push({
          id: `wa-${c.phone}`,
          channel: 'wa',
          guestName: c.name || c.reservation_number || c.phone,
          listingHint: c.listing_name ? `· ${c.listing_name}` : '',
          preview,
          unread: unreplied,
          when: relativeWhen(ex?.timestamp || c.last_message_time),
          // Par réservation quand elle est connue : une URL ne doit pas
          // transporter le téléphone du voyageur.
          href: waInboxUrl({ reservationNumber: c.reservation_number, phone: c.phone }),
        });
      }

      const otaItems: unknown[] = Array.isArray(otaRes?.data)
        ? otaRes.data
        : Array.isArray(otaRes?.data?.threads)
          ? otaRes.data.threads
          : Array.isArray(otaRes?.threads)
            ? otaRes.threads
            : Array.isArray(otaRes)
              ? otaRes
              : [];

      for (const raw of otaItems.slice(0, 60)) {
        try {
          const row = mapApiItemToOtaThread(raw as never);
          if (!row) continue;
          const effective = resolveOtaListLastMessage(row);
          if (effective.empty && !row.lastMessage && !row.lastGuestMessage) continue;
          const preview =
            inboxMessagePreview(effective.text) ||
            inboxMessagePreview(row.lastGuestMessage) ||
            inboxMessagePreview(row.lastMessage) ||
            'Message OTA';
          const unread = isOtaUnreplied(row);
          messages.push({
            id: `ota-${row.id || row.threadId}`,
            channel: 'ota',
            guestName: row.guestName || 'Voyageur',
            listingHint: row.listingName ? `· ${row.listingName}` : '',
            preview,
            unread,
            when: relativeWhen(effective.at || row.lastMessageTime || row.lastGuestMessageAt),
            href: row.reservationNumber
              ? `/communications?section=guest&tab=ota&reservationNumber=${encodeURIComponent(row.reservationNumber)}`
              : '/communications?section=guest&tab=ota',
          });
        } catch {
          /* ignore bad row */
        }
      }

      messages.sort((a, b) => {
        if (Number(b.unread) !== Number(a.unread)) return Number(b.unread) - Number(a.unread);
        return 0;
      });

      // Liste : d’abord les vrais « À répondre », puis quelques vus (contexte).
      const todo = messages.filter((m) => m.unread);
      const done = messages.filter((m) => !m.unread);
      const messagesForDay = [...todo, ...done.slice(0, Math.max(0, 16 - todo.length))].slice(0, 16);

      setModel({
        date,
        listingCount: Number(listingsRes?.data?.total ?? listingItems.length),
        arrivals,
        departures,
        createdCount: createdRes?.total ?? created.length,
        createdChannels: [...chans].slice(0, 3).join(' · ') || (created.length ? '—' : '—'),
        cancelledCount: cancelled.length,
        cancelledDetail,
        experiences,
        messages: messagesForDay,
        arrivalDetail,
        departureDetail,
        staffDone,
        staffTotal,
        staffDetail,
      });
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  return { loading, model, reload: load, day };
}
