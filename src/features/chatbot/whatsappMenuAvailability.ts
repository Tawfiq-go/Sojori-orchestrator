/**
 * Calcul disponibilité options menu WhatsApp — aligné srv-chatbot/utils/availability_calculator.py
 */
import { addDays, addHours, format, isAfter, isBefore, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
/** Contexte séjour (aligné srv-fulltask guest_context) */
export type GuestContextLike = {
  registration?: { total?: number; registered?: number; complete?: boolean };
  arrival?: { choose?: { chosen?: boolean } };
  departure?: { choose?: { chosen?: boolean } };
};

export type MenuOptionLike = {
  code?: string;
  label?: string;
  enabled?: boolean;
  availability?: {
    type?: string;
    from?: BoundaryLike;
    to?: BoundaryLike;
    requires?: string;
  };
};

type BoundaryLike = {
  unit?: 'days' | 'hours';
  value?: number;
  reference?: string;
  moment?: string;
  event?: string;
};

export type AvailabilityResult = {
  isAvailable: boolean;
  reason: string | null;
  availabilityType: string;
  timeWindow?: {
    startTime: Date;
    endTime: Date;
    startDisplay: string;
    endDisplay: string;
    inWindow: boolean;
  } | null;
  events?: {
    requiredEvents: string[];
    completedEvents: string[];
    missingEvents: string[];
  } | null;
  displayInfo: string;
};

function parseStayDate(value: Date | string | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = parseISO(String(value).slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildReference(moment: string, event: string): string {
  if (moment === 'on_day') return `on_${event}_day`;
  return `${moment}_${event}`;
}

function normalizeReference(boundary: BoundaryLike): string {
  if (boundary.reference) return boundary.reference;
  const moment = boundary.moment || 'before';
  const event = boundary.event === 'checkout' ? 'checkout' : 'checkin';
  return buildReference(moment === 'on_day' ? 'on_day' : moment, event);
}

export function calculateBoundaryDatetime(
  boundary: BoundaryLike,
  checkIn: Date,
  checkOut: Date,
): Date {
  const unit = boundary.unit || 'days';
  const value = boundary.value ?? 0;
  const reference = normalizeReference(boundary);

  let base = checkIn;
  let delta = 0;

  if (reference === 'before_checkin') {
    base = checkIn;
    delta = -value;
  } else if (reference === 'on_checkin_day') {
    base = new Date(checkIn);
    base.setHours(0, 0, 0, 0);
    delta = 0;
  } else if (reference === 'after_checkin') {
    base = checkIn;
    delta = value;
  } else if (reference === 'before_checkout') {
    base = checkOut;
    delta = -value;
  } else if (reference === 'on_checkout_day') {
    base = new Date(checkOut);
    base.setHours(0, 0, 0, 0);
    delta = 0;
  } else if (reference === 'after_checkout') {
    base = checkOut;
    delta = value;
  }

  if (unit === 'hours') return addHours(base, delta);
  return addDays(base, delta);
}

function formatBoundaryDisplay(boundary: BoundaryLike, checkIn: Date, checkOut: Date): string {
  const unit = boundary.unit || 'days';
  const value = boundary.value ?? 0;
  const reference = normalizeReference(boundary);
  const refMap: Record<string, string> = {
    before_checkin: 'avant check-in',
    on_checkin_day: 'jour du check-in',
    after_checkin: 'après check-in',
    before_checkout: 'avant check-out',
    on_checkout_day: 'jour du check-out',
    after_checkout: 'après check-out',
  };
  const refText = refMap[reference] || reference;
  const dt = calculateBoundaryDatetime(boundary, checkIn, checkOut);
  const dtText = format(dt, 'dd MMM yyyy HH:mm', { locale: fr });
  if (value === 0) return `${refText} (${dtText})`;
  const unitText = unit === 'days' ? (value > 1 ? 'jours' : 'jour') : value > 1 ? 'heures' : 'heure';
  return `${value} ${unitText} ${refText} (${dtText})`;
}

function checkTimeWindow(
  availability: NonNullable<MenuOptionLike['availability']>,
  checkIn: Date,
  checkOut: Date,
  now: Date,
): { ok: boolean; reason: string | null; details: AvailabilityResult['timeWindow'] } {
  const from = availability.from;
  const to = availability.to;
  if (!from && !to) return { ok: true, reason: null, details: null };

  // Borne absente = pas de limite de ce côté (ex. « dès la réservation » = pas de from).
  const startTime = from ? calculateBoundaryDatetime(from, checkIn, checkOut) : null;
  const endTime = to ? calculateBoundaryDatetime(to, checkIn, checkOut) : null;
  const inWindow =
    (!startTime || !isBefore(now, startTime)) && (!endTime || !isAfter(now, endTime));

  const details = {
    startTime: startTime ?? new Date(0),
    endTime: endTime ?? new Date(8640000000000000),
    startDisplay: from ? formatBoundaryDisplay(from, checkIn, checkOut) : 'dès la réservation',
    endDisplay: to ? formatBoundaryDisplay(to, checkIn, checkOut) : 'sans limite',
    inWindow,
  };

  if (startTime && isBefore(now, startTime)) {
    return { ok: false, reason: `Disponible dès le ${format(startTime, 'dd MMM', { locale: fr })}`, details };
  }
  if (endTime && isAfter(now, endTime)) {
    return { ok: false, reason: 'Fenêtre terminée', details };
  }
  return { ok: true, reason: null, details };
}

const EVENT_ALIASES: Record<string, string> = {
  E_completed: 'online_checkin_completed',
  E: 'online_checkin_completed',
  D1_completed: 'arrival_time_selected',
  D1: 'arrival_time_selected',
  D2_completed: 'departure_time_selected',
  D2: 'departure_time_selected',
  D3_completed: 'arrival_declared',
  D3: 'arrival_declared',
  D4_completed: 'departure_declared',
  D4: 'departure_declared',
};

function normalizeEventKey(key: string): string {
  const k = key.trim();
  return EVENT_ALIASES[k] || k;
}

function checkEventsRequired(
  availability: NonNullable<MenuOptionLike['availability']>,
  eventsCompleted: Record<string, boolean>,
  checkinStatus: Record<string, unknown>,
): { ok: boolean; reason: string | null; details: AvailabilityResult['events'] } {
  const requires = availability.requires;
  if (!requires) return { ok: true, reason: null, details: null };

  const requiredEvents = requires.split(',').map((e) => normalizeEventKey(e));
  const completedEvents: string[] = [];
  const missingEvents: string[] = [];

  for (const event of requiredEvents) {
    let done = false;
    if (event === 'online_checkin_completed') {
      done = Boolean(checkinStatus.registration_complete);
    } else {
      done = Boolean(eventsCompleted[event]);
    }
    if (done) completedEvents.push(event);
    else missingEvents.push(event);
  }

  const details = { requiredEvents, completedEvents, missingEvents };
  if (missingEvents.length === 0) return { ok: true, reason: null, details };

  const first = missingEvents[0];
  if (first === 'online_checkin_completed') {
    const total = Number(checkinStatus.total_adults ?? 0);
    const validated = Number(checkinStatus.validated_adults ?? 0);
    return { ok: false, reason: `Enregistrement ${validated}/${total}`, details };
  }
  if (first === 'arrival_time_selected') return { ok: false, reason: 'Heure arrivée requise', details };
  return { ok: false, reason: 'Conditions non remplies', details };
}

export function deriveEventsFromGuestContext(gc: GuestContextLike | null | undefined): Record<string, boolean> {
  if (!gc) return {};
  return {
    online_checkin_completed: Boolean(gc.registration?.complete),
    arrival_time_selected: Boolean(gc.arrival?.choose?.chosen),
    departure_time_selected: Boolean(gc.departure?.choose?.chosen),
    checkout_time_confirmed: Boolean(gc.departure?.choose?.chosen),
    arrival_declared: Boolean(gc.arrival?.declare?.yes),
    departure_declared: Boolean(gc.departure?.declare?.yes),
  };
}

export function deriveCheckinStatusFromGuestContext(gc: GuestContextLike | null | undefined): Record<string, unknown> {
  if (!gc) return {};
  return {
    registration_complete: Boolean(gc.registration?.complete),
    total_adults: gc.registration?.total ?? 0,
    validated_adults: gc.registration?.registered ?? 0,
  };
}

export function calculateOptionAvailability(
  option: MenuOptionLike,
  eventsCompleted: Record<string, boolean>,
  checkinStatus: Record<string, unknown>,
  checkIn: Date,
  checkOut: Date,
  now: Date = new Date(),
): AvailabilityResult {
  const availability = option.availability || {};
  const availType = availability.type || 'always';

  const result: AvailabilityResult = {
    isAvailable: true,
    reason: null,
    availabilityType: availType,
    timeWindow: null,
    events: null,
    displayInfo: '',
  };

  if (availType === 'always') {
    result.displayInfo = 'Toujours';
    return result;
  }
  if (availType === 'after_booking_confirmed') {
    result.displayInfo = 'Après confirmation';
    return result;
  }
  if (availType === 'time_window') {
    const { ok, reason, details } = checkTimeWindow(availability, checkIn, checkOut, now);
    result.isAvailable = ok;
    result.reason = reason;
    result.timeWindow = details;
    result.displayInfo = ok ? 'Dans la fenêtre' : reason || 'Hors fenêtre';
    return result;
  }
  if (availType === 'conditional_and_time') {
    const ev = checkEventsRequired(availability, eventsCompleted, checkinStatus);
    result.events = ev.details;
    if (!ev.ok) {
      result.isAvailable = false;
      result.reason = ev.reason;
      result.displayInfo = ev.reason || 'Condition manquante';
      return result;
    }
    if (availability.from || availability.to) {
      const tw = checkTimeWindow(availability, checkIn, checkOut, now);
      result.timeWindow = tw.details;
      if (!tw.ok) {
        result.isAvailable = false;
        result.reason = tw.reason;
        result.displayInfo = tw.reason || 'Hors fenêtre';
        return result;
      }
    }
    result.displayInfo = 'Actif (conditions OK)';
    return result;
  }

  result.isAvailable = false;
  result.reason = `Type inconnu: ${availType}`;
  result.displayInfo = 'Config invalide';
  return result;
}

export type MenuOptionStatus = 'active' | 'upcoming' | 'past' | 'blocked' | 'disabled' | 'always';

export type MenuOptionSummaryItem = {
  code: string;
  label: string;
  status: MenuOptionStatus;
  hint?: string;
};

export function summarizeMenuOptionsForStay(
  menuOptions: MenuOptionLike[],
  checkIn: Date | string | undefined,
  checkOut: Date | string | undefined,
  guestContext?: GuestContextLike | null,
  now: Date = new Date(),
): { items: MenuOptionSummaryItem[]; hasConfig: boolean } {
  const ci = parseStayDate(checkIn);
  const co = parseStayDate(checkOut);
  if (!menuOptions?.length) return { items: [], hasConfig: false };
  if (!ci || !co) return { items: [], hasConfig: true };

  const events = deriveEventsFromGuestContext(guestContext);
  const checkinStatus = deriveCheckinStatusFromGuestContext(guestContext);

  const items: MenuOptionSummaryItem[] = [];

  for (const opt of menuOptions) {
    const code = String(opt.code || '?');
    const label = String(opt.label || code).replace(/\s+/g, ' ').trim();

    if (opt.enabled === false) {
      items.push({ code, label, status: 'disabled', hint: 'Désactivée' });
      continue;
    }

    const avail = calculateOptionAvailability(opt, events, checkinStatus, ci, co, now);

    if (avail.isAvailable) {
      items.push({ code, label, status: avail.availabilityType === 'always' ? 'always' : 'active' });
      continue;
    }

    if (avail.timeWindow && isBefore(now, avail.timeWindow.startTime)) {
      items.push({
        code,
        label,
        status: 'upcoming',
        hint: `dès le ${format(avail.timeWindow.startTime, 'dd MMM', { locale: fr })}`,
      });
      continue;
    }

    if (avail.timeWindow && isAfter(now, avail.timeWindow.endTime)) {
      items.push({ code, label, status: 'past', hint: 'Fenêtre passée' });
      continue;
    }

    items.push({ code, label, status: 'blocked', hint: avail.reason || 'Indisponible' });
  }

  return { items, hasConfig: true };
}

/** Ordre affichage menu voyageur (A → L, sous-options D1…J3). */
export const MENU_DISPLAY_ORDER = [
  'A', 'B', 'C', 'D', 'D1', 'D2', 'D3', 'D4', 'E', 'F', 'G', 'H', 'I', 'J', 'J1', 'J2', 'J3', 'K', 'L',
] as const;

export type ListTrafficColor = 'green' | 'red' | 'yellow';

export function statusToListColor(status: MenuOptionStatus): ListTrafficColor {
  if (status === 'active' || status === 'always') return 'green';
  if (status === 'disabled' || status === 'past') return 'red';
  return 'yellow';
}

const EVENT_LABELS: Record<string, string> = {
  online_checkin_completed: 'Enregistrement voyageurs complété',
  arrival_time_selected: "Heure d'arrivée choisie",
  checkout_time_confirmed: 'Heure de départ confirmée',
  access_info_sent: "Infos d'accès envoyées",
  wifi_info_sent: 'Infos WiFi envoyées',
  house_rules_acknowledged: 'Règles confirmées',
};

function formatEventLabel(key: string): string {
  return EVENT_LABELS[key] || key;
}

function describeConfigRule(option: MenuOptionLike, checkIn: Date, checkOut: Date): string {
  if (option.enabled === false) return 'Option désactivée dans la config listing';

  const availability = option.availability || {};
  const type = availability.type || 'always';

  if (type === 'always') return 'Toujours proposée dans le menu WhatsApp';
  if (type === 'after_booking_confirmed') return 'Proposée après confirmation de la réservation';

  if (type === 'time_window') {
    const from = availability.from;
    const to = availability.to;
    if (from && to) {
      return `Fenêtre : ${formatBoundaryDisplay(from, checkIn, checkOut)} → ${formatBoundaryDisplay(to, checkIn, checkOut)}`;
    }
    if (to) {
      return `Fenêtre : dès la réservation → ${formatBoundaryDisplay(to, checkIn, checkOut)}`;
    }
    if (from) {
      return `Fenêtre : dès ${formatBoundaryDisplay(from, checkIn, checkOut)}`;
    }
    return 'Fenêtre temporelle (dates check-in / check-out)';
  }

  if (type === 'conditional_and_time') {
    const parts: string[] = [];
    if (availability.requires) {
      const reqs = availability.requires.split(',').map((e) => formatEventLabel(normalizeEventKey(e.trim())));
      parts.push(`Conditions : ${reqs.join(', ')}`);
    }
    if (availability.from || availability.to) {
      const from = availability.from;
      const to = availability.to;
      if (from && to) {
        parts.push(
          `Puis fenêtre : ${formatBoundaryDisplay(from, checkIn, checkOut)} → ${formatBoundaryDisplay(to, checkIn, checkOut)}`,
        );
      }
    }
    return parts.length ? parts.join(' · ') : 'Conditions séjour + fenêtre temporelle';
  }

  return `Règle : ${type}`;
}

function describeSituation(
  option: MenuOptionLike,
  avail: AvailabilityResult,
  now: Date,
): { headline: string; detail?: string } {
  if (option.enabled === false) {
    return { headline: 'Inactive — option coupée dans la config' };
  }

  if (avail.isAvailable) {
    if (avail.availabilityType === 'always') {
      return { headline: 'Active — toujours visible pour ce voyageur' };
    }
    if (avail.availabilityType === 'after_booking_confirmed') {
      return { headline: 'Active — réservation confirmée' };
    }
    return { headline: 'Active — visible dans le menu maintenant' };
  }

  if (avail.timeWindow && isBefore(now, avail.timeWindow.startTime)) {
    return {
      headline: `Inactive pour l’instant — disponible le ${format(avail.timeWindow.startTime, 'dd MMM yyyy', { locale: fr })}`,
      detail: `Fenêtre : ${avail.timeWindow.startDisplay} → ${avail.timeWindow.endDisplay}`,
    };
  }

  if (avail.timeWindow && isAfter(now, avail.timeWindow.endTime)) {
    return {
      headline: 'Inactive — fenêtre terminée',
      detail: `Fin de disponibilité : ${avail.timeWindow.endDisplay}`,
    };
  }

  if (avail.events?.missingEvents?.length) {
    const missing = avail.events.missingEvents.map(formatEventLabel).join(', ');
    return {
      headline: 'Inactive — conditions non remplies',
      detail: `Manque : ${missing}`,
    };
  }

  return {
    headline: 'Inactive — non disponible pour ce voyageur',
    detail: avail.reason || undefined,
  };
}

export type MenuOptionInterpretation = {
  code: string;
  label: string;
  listColor: ListTrafficColor;
  status: MenuOptionStatus;
  configRule: string;
  situation: string;
  situationDetail?: string;
};

export function interpretMenuOptionsForStay(
  menuOptions: MenuOptionLike[],
  checkIn: Date | string | undefined,
  checkOut: Date | string | undefined,
  guestContext?: GuestContextLike | null,
  now: Date = new Date(),
): { options: MenuOptionInterpretation[]; hasConfig: boolean } {
  const ci = parseStayDate(checkIn);
  const co = parseStayDate(checkOut);
  if (!menuOptions?.length) return { options: [], hasConfig: false };

  const events = deriveEventsFromGuestContext(guestContext);
  const checkinStatus = deriveCheckinStatusFromGuestContext(guestContext);

  const byCode = new Map<string, MenuOptionLike>();
  for (const opt of menuOptions) {
    if (opt.code) byCode.set(String(opt.code), opt);
  }

  const ordered: MenuOptionLike[] = [];
  for (const code of MENU_DISPLAY_ORDER) {
    const opt = byCode.get(code);
    if (opt) {
      ordered.push(opt);
      byCode.delete(code);
    }
  }
  for (const opt of byCode.values()) ordered.push(opt);

  const options: MenuOptionInterpretation[] = [];

  for (const opt of ordered) {
    const code = String(opt.code || '?');
    const label = String(opt.label || code).replace(/\s+/g, ' ').trim();

    if (!ci || !co) {
      options.push({
        code,
        label,
        listColor: 'red',
        status: 'blocked',
        configRule: describeConfigRule(opt, new Date(), new Date()),
        situation: 'Dates de séjour manquantes',
      });
      continue;
    }

    let status: MenuOptionStatus = 'blocked';
    let avail: AvailabilityResult = {
      isAvailable: false,
      reason: null,
      availabilityType: 'always',
      displayInfo: '',
    };

    if (opt.enabled === false) {
      status = 'disabled';
    } else {
      avail = calculateOptionAvailability(opt, events, checkinStatus, ci, co, now);
      if (avail.isAvailable) {
        status = avail.availabilityType === 'always' ? 'always' : 'active';
      } else if (avail.timeWindow && isBefore(now, avail.timeWindow.startTime)) {
        status = 'upcoming';
      } else if (avail.timeWindow && isAfter(now, avail.timeWindow.endTime)) {
        status = 'past';
      } else {
        status = 'blocked';
      }
    }

    const sit = describeSituation(opt, avail, now);
    options.push({
      code,
      label,
      listColor: statusToListColor(status),
      status,
      configRule: describeConfigRule(opt, ci, co),
      situation: sit.headline,
      situationDetail: sit.detail,
    });
  }

  return { options, hasConfig: true };
}
