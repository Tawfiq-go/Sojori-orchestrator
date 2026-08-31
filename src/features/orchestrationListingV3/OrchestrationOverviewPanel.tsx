import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { toast } from 'react-toastify';
import {
  CAPABILITY_GROUPS,
  CAPABILITY_REGISTRY,
  getCapabilityDefinition,
  getCapabilityOrchestrationActivities,
  isOnDemandCapability,
  type CapabilityGroupId,
} from '../serviceMatrix/capabilityRegistry';
import {
  CapabilityGestionPanel,
  CapabilityWhatsAppPanel,
} from '../serviceMatrix/CapabilityMatrixConfigPanels';
import listingsService from '../../services/listingsService';
import {
  loadOwnerOrchestrationMatrix,
  saveOwnerGestion,
  type OwnerOrchestrationDoc,
  type OwnerOrchestrationEffective,
} from './ownerOrchestrationApi';
import {
  loadListingOrchestrationMatrix,
  saveListingGestion,
  type ListingOrchestrationDoc,
  type ListingOrchestrationEffective,
} from './listingOrchestrationApi';
import {
  activationStatusFromEffectiveDoc,
  loadListingServiceActivation,
  overridePatchForToggle,
  saveListingServiceActivation,
  type ServiceActivationStatusEntry,
} from './listingCapabilityActivation';
import {
  loadListingScheduledMessagesContext,
  saveListingScheduledMessages,
} from './listingScheduledMessagesApi';
import {
  loadOwnerScheduledMessagesContext,
  saveOwnerScheduledMessages,
} from './ownerScheduledMessagesApi';
import type { CatalogMessage, ScheduledOrchestrationMessage } from '../taskHub/staff-design/types';
import V3ReceiveChecklistPanel from './V3ReceiveChecklistPanel';
import V3InformSyndicPanel from './V3InformSyndicPanel';
import { V3ArrivalJourneyPanel } from './V3ArrivalJourneyPanel';
import CleaningChecklistPanel from '../listing/components/ConfigOrchestration/CleaningChecklistPanel';
import CleaningDeclarePanel from '../listing/components/ConfigOrchestration/CleaningDeclarePanel';
import MenageContentRedirectCard from '../serviceMatrix/MenageContentRedirectCard';
import OrchestrationGlobalSwitch from './OrchestrationGlobalSwitch';
import CapabilityAuditStrip from './CapabilityAuditStrip';
import { V3Section } from './V3Primitives';
import { GROUP_EMOJI } from './V3Rail';
import { V3 } from './theme';
import {
  fetchListingConciergeArrays,
} from '../listing/components/ConfigOrchestration/conciergeListingPersist';
import {
  CLEANING_CAP_TO_TYPE,
  isCleaningCapabilityKey,
  mergeCleaningRulesPatch,
  typeFlags,
  type CleaningRules,
} from './cleaningRules';

const GROUP_ORDER: CapabilityGroupId[] = [
  'cleaning',
  'journey',
  'communication',
  'concierge',
  'info',
];

/* ───────────────────── formatteurs langage métier ───────────────────── */

type Boundary = { unit?: string; value?: number; reference?: string; time?: string } | undefined;
type Availability = { type?: string; from?: Boundary; to?: Boundary; requires?: string } | undefined;

function boundaryHuman(b: Boundary, side: 'from' | 'to'): string {
  if (!b) return side === 'from' ? 'la réservation' : 'départ';
  const v = Number(b.value ?? 0);
  const ref = String(b.reference ?? '');
  if (ref === 'before_checkin') return v === 0 ? "jour d'arrivée" : `J-${v} avant arrivée`;
  if (ref === 'on_checkin_day') return "jour d'arrivée";
  if (ref === 'before_checkout') return v === 0 ? 'jour du départ' : `J-${v} avant départ`;
  if (ref === 'on_checkout_day') return 'jour du départ';
  if (ref === 'after_checkout') return 'départ';
  if (ref === 'after_checkin') return `J+${v} après arrivée`;
  return `${v} ${b.unit ?? ''} ${ref}`;
}

const REQUIRE_EVENTS: Array<{ id: string; label: string; short: string }> = [
  { id: 'E_completed', label: 'Enregistrement (E)', short: 'E' },
  { id: 'D1_completed', label: 'Créneau arrivée (D1)', short: 'D1' },
  { id: 'D2_completed', label: 'Créneau départ (D2)', short: 'D2' },
  { id: 'D3_completed', label: 'Arrivée déclarée (D3)', short: 'D3' },
  { id: 'D4_completed', label: 'Départ déclaré (D4)', short: 'D4' },
];

/** Ancre WhatsApp : avant arrivée vs pendant séjour / avant départ. */
type TimingAnchor = 'checkin' | 'checkout';

/** Fins supportées (interprétées par menuAvailabilityEngine). */
type TimingFin = 'J-3' | 'J-2' | 'J-1' | 'J0' | 'fin' | 'J+1';

const START_DAYS_PRE = [7, 6, 5, 4, 3, 2, 1] as const;
const FIN_CHIPS: TimingFin[] = ['J-3', 'J-2', 'J-1', 'J0', 'fin', 'J+1'];

/** Suggestions métier par service — alignées moteur WA (from/to + requires). */
const TIMING_PRESETS: Record<
  string,
  {
    label: string;
    start: 'toujours' | 'resa' | number;
    fin: TimingFin;
    anchor: TimingAnchor;
    hint: string;
    /** Conditions ET à appliquer avec le preset (ex. accès = E + D1). */
    requires?: string[];
  }
> = {
  cleaning_free: {
    label: 'Séjour entier',
    start: 'resa',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'Menu I dès la résa jusqu’au départ',
  },
  cleaning_paid: {
    label: 'Séjour entier',
    start: 'resa',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'Demande ménage possible tout le séjour',
  },
  arrival_journey: {
    label: 'Pré-arrivée',
    start: 'resa',
    fin: 'J0',
    anchor: 'checkin',
    hint: 'Checklist Parcours Arrivée · menu C — pas de tâche staff',
  },
  arrival_choose: {
    label: 'Pré-arrivée',
    start: 'resa',
    fin: 'J0',
    anchor: 'checkin',
    hint: 'Choisir créneau dès la résa jusqu’au jour d’arrivée',
  },
  departure_choose: {
    label: 'Avant départ',
    start: 3,
    fin: 'J0',
    anchor: 'checkout',
    hint: 'Choisir départ J-3 → jour du départ',
  },
  receive_arrival: {
    label: 'Jour J arrivée',
    start: 0,
    fin: 'J0',
    anchor: 'checkin',
    hint: 'Accueil staff le jour d’arrivée (lié à D1)',
  },
  inform_syndic: {
    label: 'Avant arrivée',
    start: 2,
    fin: 'J0',
    anchor: 'checkin',
    hint: 'Message planifié syndic · J0/J-1/J-2 · heure · durée d’accès — pas de tâche staff',
  },
  receive_departure: {
    label: 'Jour J départ',
    start: 0,
    fin: 'J0',
    anchor: 'checkout',
    hint: 'Accueil staff le jour de départ (lié à D2)',
  },
  arrival_declare: {
    label: 'Jour J arrivée',
    start: 1,
    fin: 'J0',
    anchor: 'checkin',
    hint: 'Déclarer arrivée J-1 → J0',
  },
  departure_declare: {
    label: 'Jour J départ',
    start: 1,
    fin: 'J0',
    anchor: 'checkout',
    hint: 'Déclarer départ J-1 → J0',
  },
  registration: {
    label: 'Pré-arrivée',
    start: 'resa',
    fin: 'J0',
    anchor: 'checkin',
    hint: 'Enregistrement dès la résa jusqu’à l’arrivée',
  },
  access: {
    label: 'J-1 + E + D1',
    start: 1,
    fin: 'fin',
    anchor: 'checkin',
    requires: ['E_completed', 'D1_completed'],
    hint: 'Codes dès J-1 avant arrivée, jusqu’au départ — si enregistrement + créneau arrivée faits',
  },
  property_wifi: {
    label: 'Séjour',
    start: 'resa',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'Infos logement / WiFi tout le séjour',
  },
  house_rules: {
    label: 'Séjour',
    start: 'resa',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'Règles visibles tout le séjour',
  },
  transport: {
    label: 'Séjour',
    start: 'resa',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'À la demande pendant le séjour',
  },
  groceries: {
    label: 'Séjour',
    start: 'resa',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'À la demande pendant le séjour',
  },
  concierge: {
    label: 'Séjour',
    start: 'resa',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'À la demande pendant le séjour',
  },
  support: {
    label: 'Toujours',
    start: 'toujours',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'Toujours visible dans le menu',
  },
  service_client: {
    label: 'Toujours',
    start: 'toujours',
    fin: 'fin',
    anchor: 'checkout',
    hint: 'Toujours visible — service client',
  },
};

function mkBoundaryFrom(
  start: 'resa' | number,
  anchor: TimingAnchor,
): Boundary | undefined {
  if (start === 'resa') return undefined;
  if (start === 0) {
    return {
      unit: 'days',
      value: 0,
      reference: anchor === 'checkout' ? 'on_checkout_day' : 'on_checkin_day',
    };
  }
  return {
    unit: 'days',
    value: start,
    reference: anchor === 'checkout' ? 'before_checkout' : 'before_checkin',
  };
}

function mkBoundaryTo(fin: TimingFin, anchor: TimingAnchor): Boundary {
  if (fin === 'fin') {
    return { unit: 'days', value: 0, reference: 'after_checkout' };
  }
  if (fin === 'J+1') {
    return { unit: 'days', value: 1, reference: 'after_checkout' };
  }
  if (fin === 'J0') {
    return {
      unit: 'days',
      value: 0,
      reference: anchor === 'checkout' ? 'on_checkout_day' : 'on_checkin_day',
    };
  }
  const n = Number(fin.replace('J-', ''));
  return {
    unit: 'days',
    value: n,
    reference: anchor === 'checkout' ? 'before_checkout' : 'before_checkin',
  };
}

function parseTimingState(av: Availability, fallbackAnchor: TimingAnchor): {
  start: 'toujours' | 'resa' | number;
  fin: TimingFin;
  anchor: TimingAnchor;
} {
  if (av?.type === 'always') {
    return { start: 'toujours', fin: 'fin', anchor: fallbackAnchor };
  }
  const fromRef = String(av?.from?.reference ?? '');
  const toRef = String(av?.to?.reference ?? '');
  /**
   * Ancre des J-n de DÉBUT : prioriser `from`.
   * `after_checkout` (Fin / J+1) = toujours « jusqu’au départ » et ne doit PAS basculer
   * l’ancre vers départ — sinon Accès (J-3 avant arrivée → fin séjour) est relu comme départ.
   */
  let anchor: TimingAnchor = fallbackAnchor;
  if (fromRef.includes('checkin')) anchor = 'checkin';
  else if (fromRef.includes('checkout')) anchor = 'checkout';
  else if (toRef === 'before_checkin' || toRef === 'on_checkin_day' || toRef === 'after_checkin') {
    anchor = 'checkin';
  } else if (toRef === 'before_checkout' || toRef === 'on_checkout_day') {
    anchor = 'checkout';
  }

  let start: 'toujours' | 'resa' | number = 'resa';
  if (av?.type === 'after_booking_confirmed' || (!av?.from && (av?.type === 'time_window' || av?.type === 'conditional_and_time'))) {
    start = 'resa';
  } else if (fromRef.startsWith('on_')) {
    start = 0;
  } else if (av?.from?.value != null) {
    start = Number(av.from.value);
  }

  let fin: TimingFin = 'fin';
  if (toRef === 'after_checkout') {
    fin = Number(av?.to?.value ?? 0) >= 1 ? 'J+1' : 'fin';
  } else if (toRef.startsWith('on_')) {
    fin = 'J0';
  } else if (toRef.startsWith('before_') && av?.to?.value != null) {
    const v = Number(av.to.value);
    if (v === 1) fin = 'J-1';
    else if (v === 2) fin = 'J-2';
    else if (v === 3) fin = 'J-3';
    else fin = 'J-1';
  } else if (!av?.to) {
    fin = 'fin';
  }

  return { start, fin, anchor };
}

function requiresList(av: Availability): string[] {
  return String(av?.requires ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function availabilityHuman(av: Availability): string {
  const type = av?.type ?? 'always';
  if (type === 'always') return 'Toujours';
  if (type === 'after_booking_confirmed') return 'À la réservation';
  if (type === 'conditional_and_time') {
    const reqs = requiresList(av)
      .map((r) => REQUIRE_EVENTS.find((e) => e.id === r)?.short ?? r)
      .join(' + ');
    const win = av?.from || av?.to
      ? ` · ${av?.from ? `de ${boundaryHuman(av.from, 'from')}` : 'de la réservation'} → ${boundaryHuman(av?.to, 'to')}`
      : '';
    return `Si ${reqs || 'conditions'}${win}`;
  }
  if (type === 'time_window') {
    const start = av?.from ? `De ${boundaryHuman(av.from, 'from')}` : 'De la réservation';
    return `${start} → ${boundaryHuman(av.to, 'to')}`;
  }
  return String(type);
}

function assignHuman(sa: Record<string, unknown> | null | undefined): string {
  if (!sa) return '—';
  const start = sa.startAt as { ref?: string; day?: number; time?: string } | undefined;
  const end = sa.endAt as { ref?: string; day?: number; time?: string } | undefined;
  if (start?.ref === 'task_created') return 'Immédiat';

  const daysRaw = Array.isArray(sa.days)
    ? (sa.days as unknown[])
        .map((d) => Number(d))
        .filter((d) => Number.isFinite(d))
    : [];
  const days = [...new Set(daysRaw)].sort((a, b) => a - b);
  const st = start?.time ? hourOf(start.time) : '';
  const et = end?.time ? hourOf(end.time) : '';

  if (days.length > 0) {
    const allDay =
      sa.allDay === true ||
      (String(start?.time || '') === '00:00' &&
        (String(end?.time || '') === '23:59' || String(end?.time || '') === '23:00'));
    const hours = allDay
      ? ' · 24h'
      : st && et
        ? ` · ${st}–${et}`
        : st
          ? ` · ${st}`
          : '';
    return `${daysHuman(days)}${hours}`;
  }

  let s: string;
  if (start?.day != null) {
    const d = Number(start.day);
    s = d === 0 ? 'Jour J' : d < 0 ? `Dès J${d}` : `Dès J+${d}`;
    if (start.time) s += ` à ${hourOf(start.time)}`;
  } else s = '—';
  if (end?.day != null) {
    const d = Number(end.day);
    s += ` → fin ${d === 0 ? 'jour J' : d < 0 ? `J${d}` : `J+${d}`}`;
    if (end.time) s += ` ${hourOf(end.time)}`;
  }
  return s;
}

function daysHuman(days: number[]): string {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => (d === 0 ? 'J0' : d > 0 ? `J+${d}` : `J${d}`))
    .join(' · ');
}

function hourOf(time?: string): string {
  if (!time) return '';
  return `${Number(String(time).slice(0, 2))}h`;
}

type CapDoc = {
  key?: string;
  taskType?: string;
  decisions?: Record<string, unknown>;
  taskBehavior?: Record<string, unknown>;
  gestion?: Record<string, unknown>;
  whatsapp?: { menuCodes?: string[]; menuOptions?: Array<Record<string, unknown>>; overrides?: unknown[] };
  execution?: {
    enabled?: boolean;
    reminders?: Array<Record<string, unknown>>;
    staffReminders?: Array<Record<string, unknown>>;
    staffStartReminderEnabled?: boolean;
    staffAssignment?: Record<string, unknown> | null;
    escalationEnabled?: boolean;
    deadline?: Record<string, unknown> | null;
    remindersMode?: 'auto' | 'manual';
    staffAssignmentMode?: 'auto' | 'manual';
    staffRemindersMode?: 'auto' | 'manual';
    escalationMode?: 'auto' | 'manual';
  } | null;
};

/** Résumé lisible de ce qui est déjà configuré (gestion + WA). */
function configHints(cap: CapDoc, key: string): string[] {
  const g = (cap.gestion ?? {}) as Record<string, unknown>;
  const hints: string[] = [];

  if (key === 'cleaning_free' || key === 'cleaning_paid' || key === 'cleaning_sojori') {
    const ops = (g.menageOps ?? {}) as {
      included?: { normal?: { price?: number }; grand?: { price?: number } };
      paid?: { normal?: { price?: number }; grand?: { price?: number } };
      checkout?: {
        normal?: { price?: number };
        grand?: { price?: number };
        pricingMode?: string;
        monthlyForfaitAmount?: number;
      };
    };
    if (key === 'cleaning_free' && ops.included) {
      const n = ops.included.normal?.price;
      const gr = ops.included.grand?.price;
      if (n != null || gr != null) hints.push(`N ${n ?? 0} / G ${gr ?? 0} MAD`);
    }
    if (key === 'cleaning_paid' && ops.paid) {
      const n = ops.paid.normal?.price;
      const gr = ops.paid.grand?.price;
      if (n != null || gr != null) hints.push(`N ${n ?? 0} / G ${gr ?? 0} MAD`);
    }
    if (key === 'cleaning_sojori' && ops.checkout) {
      if (ops.checkout.pricingMode === 'monthly_forfait') {
        hints.push(`forfait ${ops.checkout.monthlyForfaitAmount ?? 0} MAD/mois`);
      } else {
        const n = ops.checkout.normal?.price;
        const gr = ops.checkout.grand?.price;
        if (n != null || gr != null) hints.push(`N ${n ?? 0} / G ${gr ?? 0} MAD`);
      }
    }
    const freq = Array.isArray(g.frequency) ? g.frequency : [];
    const slots = Array.isArray(g.timeSlots)
      ? g.timeSlots
      : Array.isArray(g.TS_CLEAN)
        ? g.TS_CLEAN
        : [];
    if (key === 'cleaning_free' && g.includedAlways === true) {
      hints.push('Always · chaque jour');
    } else if (key === 'cleaning_free' && freq.length) {
      hints.push(`${freq.length} palier${freq.length > 1 ? 's' : ''}`);
    }
    if (key === 'cleaning_free' && slots.length) {
      hints.push(`${slots.length} créneau${slots.length > 1 ? 'x' : ''}`);
    }
  }

  // Transport : le contenu vit dans les expériences navette (onglet
  // Expériences) — l'ancien compteur « N trajets / prix » lisait le legacy
  // supprimé du parcours guest le 16/08.

  if (key === 'groceries') {
    const items = Array.isArray(g.groceryServices)
      ? g.groceryServices
      : Array.isArray(g.items)
        ? g.items
        : Array.isArray(g.products)
          ? g.products
          : [];
    if (items.length) hints.push(`${items.length} article${items.length > 1 ? 's' : ''}`);
  }

  const codes = cap.whatsapp?.menuCodes;
  if (Array.isArray(codes) && codes.length) hints.push(`menu ${codes.join('·')}`);

  return hints;
}

const HOURS = ['08:00', '09:00', '10:00', '11:00', '14:00', '16:00', '18:00'] as const;

/** 24 créneaux horaires (HH:00) pour assignation début/fin. */
const ALL_DAY_HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

const CLIENT_MSG_ID: Record<string, string> = {
  arrival_choose: 'msg_relance_arrival_choose',
  departure_choose: 'msg_relance_departure_choose',
  arrival_declare: 'msg_relance_arrival_declare',
  departure_declare: 'msg_relance_departure_declare',
  registration: 'msg_relance_registration',
  cleaning_free: 'msg_relance_cleaning',
  cleaning_paid: 'msg_relance_cleaning',
};

const STAFF_MSG_ID: Record<string, string> = {
  // arrival_choose / departure_choose / registration : pas de rappel staff (task N/A)
  receive_arrival: 'staff_reminder_receive_arrival',
  receive_departure: 'staff_reminder_receive_departure',
  cleaning_free: 'staff_reminder_cleaning',
  cleaning_paid: 'staff_reminder_cleaning',
  cleaning_sojori: 'staff_reminder_cleaning',
  checkout_cleaning: 'staff_reminder_cleaning',
  transport: 'staff_reminder_transport',
  groceries: 'staff_reminder_groceries',
  concierge: 'staff_reminder_concierge',
  support: 'staff_reminder_support',
  service_client: 'staff_reminder_service_client',
};

function defaultRefForTask(taskType: string): string {
  if (
    taskType === 'arrival_choose' ||
    taskType === 'registration' ||
    taskType === 'arrival_declare' ||
    taskType === 'receive_arrival'
  ) {
    return 'checkin';
  }
  if (
    taskType === 'departure_choose' ||
    taskType === 'departure_declare' ||
    taskType === 'checkout_cleaning' ||
    taskType === 'receive_departure'
  ) {
    return 'checkout';
  }
  if (taskType === 'support' || taskType === 'service_client') return 'task_created';
  return 'scheduledDate';
}

/** Flags décisions du popup apercu — Relances / Assignation / Rappels / Escalade séparés. */
type DecisionFlags = {
  orchestrated: boolean;
  clientEnabled: boolean;
  taskEnabled: boolean;
  clientReminders: boolean;
  /** Assignation auto dans le plan (indépendant de Créer tâche). */
  staffAssignment: boolean;
  staffReminders: boolean;
  /** Rappel « il est temps de commencer » — défaut ON, sans heure. */
  staffStartReminder: boolean;
  pmEscalation: boolean;
};

function readDecisionFlags(cap: CapDoc): DecisionFlags {
  const d = cap.decisions ?? {};
  const exec = cap.execution ?? {};
  const reminders = exec.reminders ?? [];
  const staffRem = exec.staffReminders ?? [];
  const hasStaffAssign = Boolean(exec.staffAssignment);
  const inferAuto = (mode: unknown, hasConfig: boolean) =>
    mode === 'auto' || (mode !== 'manual' && hasConfig);
  return {
    orchestrated: d.orchestrated === true,
    clientEnabled: d.clientEnabled === true,
    taskEnabled: d.taskEnabled === true,
    // true = Auto · false = Manuel (toujours présent au plan)
    clientReminders: inferAuto(exec.remindersMode, reminders.length > 0),
    staffAssignment: inferAuto(exec.staffAssignmentMode, hasStaffAssign),
    staffReminders: inferAuto(exec.staffRemindersMode, staffRem.length > 0),
    staffStartReminder:
      d.taskEnabled === true
        ? exec.staffStartReminderEnabled !== false
        : false,
    pmEscalation: inferAuto(
      exec.escalationMode,
      exec.escalationEnabled === true && Boolean(exec.deadline),
    ),
  };
}

function applyDecisionFlagRules(
  flags: DecisionFlags,
  changed: keyof DecisionFlags,
): DecisionFlags {
  const next = { ...flags };
  // orchestrated n’est plus géré en UI : toujours ON côté save (colonne ON = master).
  next.orchestrated = true;
  if (changed === 'taskEnabled' && !next.taskEnabled) {
    next.staffAssignment = false;
    next.staffReminders = false;
    next.staffStartReminder = false;
  }
  if (changed === 'staffAssignment' && next.staffAssignment && !next.taskEnabled) {
    next.taskEnabled = true;
  }
  if (changed === 'staffReminders' && next.staffReminders && !next.taskEnabled) {
    next.taskEnabled = true;
  }
  if (changed === 'staffStartReminder' && next.staffStartReminder && !next.taskEnabled) {
    next.taskEnabled = true;
  }
  return next;
}

function buildExecutionFromFlags(
  cap: CapDoc,
  flags: DecisionFlags,
  taskType: string,
  opts?: { onDemand?: boolean; noStaffReminders?: boolean },
): NonNullable<CapDoc['execution']> {
  const prev = cap.execution ?? { enabled: true };
  const ref = defaultRefForTask(taskType);
  let reminders = [...(prev.reminders ?? [])];
  let staffReminders = [...(prev.staffReminders ?? [])];
  let staffAssignment = prev.staffAssignment ?? null;
  let deadline = prev.deadline ?? null;
  const remindersMode: 'auto' | 'manual' =
    opts?.onDemand || !flags.clientReminders ? 'manual' : 'auto';
  const staffAssignmentMode: 'auto' | 'manual' = flags.staffAssignment ? 'auto' : 'manual';
  const staffRemindersMode: 'auto' | 'manual' =
    opts?.noStaffReminders || !flags.staffReminders ? 'manual' : 'auto';
  const escalationMode: 'auto' | 'manual' = flags.pmEscalation ? 'auto' : 'manual';

  // Toujours garder une config (Auto = horaires·scheduler · Manuel = bouton cockpit).
  if (opts?.onDemand) {
    reminders = [];
  } else if (reminders.length === 0) {
    reminders = [
      {
        ref,
        day: -1,
        time: '10:00',
        label: remindersMode === 'manual' ? 'Relance manuelle' : 'Relance J-1',
        messageId: CLIENT_MSG_ID[taskType] ?? '',
      },
    ];
  }

  if (opts?.noStaffReminders) {
    staffReminders = [];
  }

  if (!flags.taskEnabled) {
    // Pas de tâche ops : assignation / rappels staff hors scope (manuel sans skeleton task).
    staffAssignment =
      staffAssignment ??
      ({
        days: [-1, 0],
        startAt: { ref, day: -1, time: '09:00' },
        endAt: { ref, day: 0, time: '11:00' },
        autoAssign: false,
        findAnotherStaff: true,
        acceptToleranceHours: 2,
      } as NonNullable<CapDoc['execution']>['staffAssignment']);
    if (!opts?.noStaffReminders && staffReminders.length === 0) {
      staffReminders = [
        {
          label: 'Rappel staff manuel',
          ref,
          day: -1,
          time: '11:00',
          messageId: STAFF_MSG_ID[taskType] ?? '',
        },
      ];
    }
  } else {
    if (!staffAssignment) {
      staffAssignment = {
        days: [-1, 0],
        startAt: { ref, day: -1, time: '09:00' },
        endAt: { ref, day: 0, time: '11:00' },
        autoAssign: staffAssignmentMode === 'auto',
        findAnotherStaff: true,
        acceptToleranceHours: 2,
      };
    } else {
      staffAssignment = {
        ...staffAssignment,
        autoAssign: staffAssignmentMode === 'auto',
      };
    }
    if (!opts?.noStaffReminders && staffReminders.length === 0) {
      staffReminders = [
        {
          label: staffRemindersMode === 'manual' ? 'Rappel staff manuel' : 'Rappel J-1',
          ref,
          day: -1,
          time: '11:00',
          messageId: STAFF_MSG_ID[taskType] ?? '',
        },
      ];
    }
  }

  if (!deadline) {
    deadline =
      taskType === 'support' || taskType === 'service_client'
        ? { ref: 'task_created', hours: 4 }
        : { ref, day: -1, time: '11:00' };
  }

  return {
    ...prev,
    enabled: flags.orchestrated !== false,
    reminders,
    staffReminders,
    staffStartReminderEnabled: Boolean(flags.taskEnabled && flags.staffStartReminder),
    staffAssignment,
    deadline,
    escalationEnabled: true,
    remindersMode,
    staffAssignmentMode,
    staffRemindersMode,
    escalationMode,
  };
}

function DecisionSwitch({
  label,
  hint,
  checked,
  disabled,
  onChange,
  mode = 'onOff',
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  /** autoManual = Relances / Assignation / Rappels / Escalade · onOff = présence */
  mode?: 'autoManual' | 'onOff';
}) {
  const modeLabel =
    mode === 'autoManual' ? (checked ? 'Auto' : 'Manuel') : checked ? 'ON' : 'OFF';
  const modeColor =
    mode === 'autoManual'
      ? checked
        ? V3.su
        : V3.t4
      : checked
        ? V3.su
        : '#9b1c1c';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        py: 1,
        borderBottom: `1px solid ${V3.b}`,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: V3.t }}>{label}</Typography>
        <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>{hint}</Typography>
      </Box>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
        }
        label={modeLabel}
        labelPlacement="start"
        sx={{
          m: 0,
          gap: 0.5,
          '& .MuiFormControlLabel-label': {
            fontSize: 11,
            fontWeight: 800,
            color: modeColor,
            minWidth: 52,
          },
        }}
      />
    </Box>
  );
}

function isPostCreationEscalation(taskType: string): boolean {
  return taskType === 'support' || taskType === 'service_client';
}

type DeadlineDoc = { ref?: string; day?: number; time?: string; hours?: number } | null | undefined;

/** Escalade lisible — Support/Service client = après création (J0 / J+1 / +Xh). */
function escalationHuman(escOn: boolean, dl: DeadlineDoc): string {
  if (!escOn) return '—';
  if (!dl) return 'ON';
  const hours = dl.hours != null ? Number(dl.hours) : null;
  if (hours != null && hours > 0) {
    return `+${hours}h après création`;
  }
  if (dl.day != null) {
    const d = Number(dl.day);
    const dayLabel = d === 0 ? 'J0' : d > 0 ? `J+${d}` : `J${d}`;
    const timePart = dl.time ? ` à ${hourOf(dl.time)}` : '';
    if (dl.ref === 'task_created' || d >= 0) {
      if (d === 0) return `J0 après création${timePart}`;
      if (d > 0) return `${dayLabel} après création${timePart}`;
    }
    return `${dayLabel}${timePart}`;
  }
  return 'ON';
}

/* ───────────────────── petits contrôles réutilisables ───────────────────── */

function SegChip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <Chip
      label={label}
      size="small"
      onClick={onClick}
      sx={{
        height: 24,
        fontSize: 11.5,
        fontWeight: on ? 800 : 500,
        bgcolor: on ? V3.p : 'transparent',
        color: on ? '#fff' : V3.t2,
        border: `1px solid ${on ? V3.p : V3.bs}`,
        '&:hover': { bgcolor: on ? V3.pd : V3.pt },
      }}
    />
  );
}

function HourSelect({
  value,
  onChange,
  fullDay = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** true = 00h→23h (assignation) · false = liste courte (relances) */
  fullDay?: boolean;
}) {
  const pool = fullDay ? ALL_DAY_HOURS : [...HOURS];
  const options = pool.includes(value) ? pool : [value, ...pool];
  return (
    <Select size="small" value={value} onChange={(e) => onChange(String(e.target.value))} sx={{ fontSize: 12, height: 28, minWidth: 70 }}>
      {options.map((h) => (
        <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>
          {hourOf(h)}
        </MenuItem>
      ))}
    </Select>
  );
}

/** Flag discret Flow / Msg devant chaque ligne. */
function KindFlag({ kind }: { kind: 'flow' | 'msg' }) {
  const flow = kind === 'flow';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: flow ? V3.orch : V3.client,
        bgcolor: flow ? V3.orchT : V3.clientT,
        border: `1px solid ${flow ? 'rgba(124,58,237,0.22)' : 'rgba(6,115,179,0.22)'}`,
        px: 0.55,
        py: 0.15,
        borderRadius: 0.5,
        lineHeight: 1.35,
        flexShrink: 0,
      }}
    >
      {flow ? 'Flow' : 'Msg'}
    </Box>
  );
}

function messageWhenHuman(rule: ScheduledOrchestrationMessage): string {
  if (rule.sendMode === 'manual') return '📨 Manuel';
  const ref = rule.trigger?.reference;
  const delay = rule.trigger?.delay;
  if (!ref || !delay) return '—';
  const abs = Math.abs(Number(delay.value ?? 0));
  const sign = Number(delay.value ?? 0) >= 0 ? '+' : '−';
  const base =
    ref === 'reservation_date'
      ? 'résa'
      : ref === 'check_in'
        ? 'arrivée'
        : ref === 'check_out'
          ? 'départ'
          : ref === 'task_created'
            ? 'tâche'
            : 'réf.';
  if (delay.unit === 'hours') {
    return abs === 0 ? `Immédiat (${base})` : `${sign}${abs}h après ${base}`;
  }
  const dayLabel =
    Number(delay.value ?? 0) === 0
      ? `jour ${base}`
      : Number(delay.value ?? 0) > 0
        ? `J+${abs} après ${base}`
        : `J−${abs} avant ${base}`;
  return `${dayLabel}${rule.trigger.time ? ` à ${hourOf(rule.trigger.time)}` : ''}`;
}

function messageChannelHuman(rule: ScheduledOrchestrationMessage): string {
  const ch = rule.deliveryChannel;
  if (ch === 'whatsapp') return 'WA';
  if (ch === 'email') return 'Email';
  return 'OTA';
}

function CleaningRulesAssignUi({
  capKey,
  rules,
  saving,
  onPatch,
}: {
  capKey: string;
  rules: CleaningRules;
  saving: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const catalogType = CLEANING_CAP_TO_TYPE[capKey] || 'cleaning_stay';
  const flags = typeFlags(rules, catalogType);
  const createAheadDays = Math.max(0, Number(rules.createAheadDays) || 0);
  return (
    <Box sx={{ display: 'grid', gap: 0.75, pt: 1, borderTop: '1px solid rgba(20,17,10,0.08)' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>STATUS-ACCEPT / AUTO</Typography>
      <Typography sx={{ fontSize: 11, color: V3.t3 }}>
        Status-Accept est au niveau établissement (toutes les activités ménage). Listing = politique
        du bien pour toutes les FdM. Staff = fiche de chaque agent.
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <SegChip
          on={rules.statusAccept === 'listing'}
          label="Listing"
          onClick={() => !saving && onPatch({ statusAccept: 'listing' })}
        />
        <SegChip
          on={rules.statusAccept === 'staff'}
          label="Staff"
          onClick={() => !saving && onPatch({ statusAccept: 'staff' })}
        />
      </Box>
      {rules.statusAccept === 'staff' ? (
        <Typography sx={{ fontSize: 11, color: V3.t3 }}>
          Auto-Accept / Auto-Start lus sur la fiche de chaque FdM, pas ici.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <SegChip
            on={flags.autoAccept}
            label={`Auto-Accept ${flags.autoAccept ? 'Yes' : 'No'}`}
            onClick={() =>
              !saving &&
              onPatch({ types: { [catalogType]: { autoAccept: !flags.autoAccept } } })
            }
          />
          <SegChip
            on={flags.autoStart}
            label={`Auto-Start ${flags.autoStart ? 'Yes' : 'No'}`}
            onClick={() =>
              !saving && onPatch({ types: { [catalogType]: { autoStart: !flags.autoStart } } })
            }
          />
        </Box>
      )}
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3, pt: 0.5 }}>
        CRÉATION TÂCHE
      </Typography>
      <Typography sx={{ fontSize: 11, color: V3.t3 }}>
        Créer la tâche N jours avant la date d’exécution (séjour + checkout). 0 = à la réservation.
        La séquence reste visible sur le plan dès la résa.
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {[0, 3, 5, 7].map((d) => (
          <SegChip
            key={d}
            on={createAheadDays === d}
            label={d === 0 ? 'J0 (immédiat)' : `J−${d}`}
            onClick={() => !saving && onPatch({ createAheadDays: d })}
          />
        ))}
      </Box>
    </Box>
  );
}

/* ───────────────────────────── composant ───────────────────────────── */

type EditorKind = 'availability' | 'reminders' | 'assign' | 'staffRem' | 'escalation';

type OverviewDoc = OwnerOrchestrationEffective | ListingOrchestrationEffective;

export default function OrchestrationOverviewPanel({
  ownerKey,
  listingId,
  listingName,
}: {
  ownerKey: string;
  /** Si fourni (fiche annonce) : grille + Configurer au scope listing (codes Accès éditables). */
  listingId?: string;
  listingName?: string;
}) {
  const isListingScope = Boolean(listingId);
  const [doc, setDoc] = useState<OverviewDoc | null>(null);
  const [messages, setMessages] = useState<ScheduledOrchestrationMessage[]>([]);
  const [msgCatalog, setMsgCatalog] = useState<CatalogMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<{ kind: EditorKind; capKey: string; anchor: HTMLElement } | null>(null);
  const [msgEditor, setMsgEditor] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [configModal, setConfigModal] = useState<{ capKey: string; tab: 'gestion' | 'wa' } | null>(null);
  const [decisionsModal, setDecisionsModal] = useState<string | null>(null);
  const [listingValues, setListingValues] = useState<Record<string, unknown>>({});
  const [activationStatus, setActivationStatus] = useState<ServiceActivationStatusEntry[]>([]);
  const [orchestrationEnabled, setOrchestrationEnabled] = useState(true);
  const [openGroups, setOpenGroups] = useState<Set<CapabilityGroupId | 'messages'>>(new Set());
  /** Checklist ménage sous Flows — repliée par défaut. */
  const [cleaningChecklistOpen, setCleaningChecklistOpen] = useState(false);
  const [cleaningDeclareOpen, setCleaningDeclareOpen] = useState(false);

  const reload = useCallback((_opts?: { silent?: boolean }) => {
    // Pas de setLoading(true) ici : évite de démonter la grille / les modals (effet « reload page »).
    setError(null);

    const loadValues = async () => {
      if (listingId) {
        try {
          const listingDoc = await listingsService.getListingDocument(listingId);
          let vals = { ...((listingDoc ?? {}) as Record<string, unknown>) };
          try {
            const accessRes = await listingsService.getListingAccessConfig(listingId);
            const accessData = (accessRes as { data?: Record<string, unknown> })?.data;
            if (accessData && typeof accessData === 'object') {
              vals = { ...vals, ...accessData };
            }
          } catch {
            /* access doc optional */
          }
          setListingValues(vals);
          try {
            const conc = await fetchListingConciergeArrays(listingId);
            setListingValues((prev) => ({
              ...prev,
              conciergeSource: conc.conciergeSource,
              transportServices: conc.transportServices,
              groceryServices: conc.groceryServices,
              customServices: conc.customServices,
              enabledExperienceIds: conc.enabledExperienceIds,
            }));
          } catch {
            /* optional */
          }
        } catch {
          setListingValues({});
        }
        return;
      }
      try {
        const res = await listingsService.getListingOwnerConfigTemplate(ownerKey);
        const payload = (res as { data?: { listing?: Record<string, unknown> } })?.data ?? res;
        setListingValues(
          ((payload as { listing?: Record<string, unknown> })?.listing ?? {}) as Record<string, unknown>,
        );
      } catch {
        setListingValues({});
      }
    };

    const loadMatrix = listingId
      ? loadListingOrchestrationMatrix(listingId).then(({ doc: d }) => d)
      : loadOwnerOrchestrationMatrix(ownerKey).then(({ doc: d }) => d);

    return loadMatrix
      .then(async (d) => {
        setDoc(d);
        setOrchestrationEnabled(d?.orchestrationEnabled !== false);
        await loadValues();
        if (listingId) {
          const fromDoc = activationStatusFromEffectiveDoc(d as ListingOrchestrationEffective, listingId);
          if (fromDoc?.length) {
            setActivationStatus(fromDoc);
          } else {
            try {
              const act = await loadListingServiceActivation(listingId);
              setActivationStatus(act.services ?? []);
            } catch {
              setActivationStatus([]);
            }
          }
        } else {
          setActivationStatus([]);
        }
        try {
          const msgCtx = listingId
            ? await loadListingScheduledMessagesContext(listingId, ownerKey)
            : await loadOwnerScheduledMessagesContext(ownerKey);
          setMessages(msgCtx.rules ?? []);
          setMsgCatalog(msgCtx.catalog ?? []);
        } catch {
          setMessages([]);
          setMsgCatalog([]);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, [ownerKey, listingId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const caps = (doc?.capabilities ?? {}) as Record<string, CapDoc>;

  const resolveCap = useCallback(
    (capKey: string): CapDoc | null => {
      const existing = caps[capKey];
      if (existing) return existing;
      const def = getCapabilityDefinition(capKey);
      if (!def) return null;
      return {
        key: capKey,
        taskType: def.taskType ?? undefined,
        decisions: {
          managed: false,
          clientEnabled: false,
          orchestrated: false,
          taskEnabled: false,
        },
      };
    },
    [caps],
  );

  const persistOrchestrationGlobal = useCallback(
    async (next: boolean) => {
      const prev = orchestrationEnabled;
      setOrchestrationEnabled(next);
      setSaving(true);
      try {
        if (listingId) {
          await listingsService.putListingOrchestration(listingId, { orchestrationEnabled: next });
        } else {
          await listingsService.putOwnerOrchestration(ownerKey, { orchestrationEnabled: next });
        }
        setDoc((d) => (d ? { ...d, orchestrationEnabled: next } : d));
        toast.success(next ? 'Orchestration globale activée' : 'Orchestration globale coupée');
      } catch (e: unknown) {
        setOrchestrationEnabled(prev);
        toast.error(e instanceof Error ? e.message : 'Impossible de modifier l’orchestration globale');
      } finally {
        setSaving(false);
      }
    },
    [orchestrationEnabled, listingId, ownerKey],
  );

  const persistCleaningRules = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!listingId) return;
      const prev = (doc as ListingOrchestrationEffective | null)?.cleaningRules;
      const next = mergeCleaningRulesPatch(prev, patch);
      setSaving(true);
      try {
        await listingsService.putListingOrchestration(listingId, { cleaningRules: next });
        setDoc((d) => (d ? { ...d, cleaningRules: next } : d));
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Impossible d’enregistrer les règles ménage');
      } finally {
        setSaving(false);
      }
    },
    [listingId, doc],
  );

  const saveCapPatch = useCallback(
    async (capKey: string, patch: Partial<CapDoc>) => {
      const cap = resolveCap(capKey);
      const def = getCapabilityDefinition(capKey);
      if (!cap || !def) return;

      if (listingId) {
        const act = activationStatus.find((s) => s.serviceId === capKey);
        if (act && act.effectiveEnabled !== true) {
          toast.warning(
            `« ${def.label} » est désactivé pour cette annonce — activez-le (ON) avant de modifier.`,
          );
          return;
        }
      }

      setSaving(true);
      try {
        const payload = {
          key: capKey,
          taskType: def.taskType,
          decisions: patch.decisions ?? cap.decisions,
          taskBehavior: patch.taskBehavior ?? cap.taskBehavior,
          gestion: patch.gestion ?? cap.gestion,
          whatsapp: patch.whatsapp ?? cap.whatsapp,
          execution: patch.execution !== undefined ? patch.execution : cap.execution,
        };
        const putRes = listingId
          ? await listingsService.putListingOrchestration(listingId, {
              capabilities: { [capKey]: payload },
            })
          : await listingsService.putOwnerOrchestration(ownerKey, {
              capabilities: { [capKey]: payload },
            });
        const effectiveCap = (
          putRes as {
            effective?: { capabilities?: Record<string, CapDoc> };
            data?: { effective?: { capabilities?: Record<string, CapDoc> } };
          }
        )?.effective?.capabilities?.[capKey]
          ?? (putRes as { data?: { effective?: { capabilities?: Record<string, CapDoc> } } })
              ?.data?.effective?.capabilities?.[capKey];
        setDoc((prev) =>
          prev
            ? {
                ...prev,
                capabilities: {
                  ...prev.capabilities,
                  [capKey]: (effectiveCap
                    ? { ...cap, ...patch, ...effectiveCap }
                    : { ...cap, ...patch }) as never,
                },
              }
            : prev,
        );
        toast.success(listingId ? 'Annonce mise à jour' : 'Modèle mis à jour');
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: string; message?: string } } };
        const detail = ax.response?.data?.error || ax.response?.data?.message;
        toast.error(detail || (e instanceof Error ? e.message : 'Enregistrement impossible'));
      } finally {
        setSaving(false);
      }
    },
    [resolveCap, ownerKey, listingId, activationStatus],
  );

  const patchDecision = (capKey: string, field: 'managed' | 'clientEnabled', value: boolean) => {
    const cap = resolveCap(capKey);
    if (!cap) return;

    // Listing : ON = activation (service-activation), pas decisions.managed
    if (listingId && field === 'managed') {
      void (async () => {
        setSaving(true);
        try {
          const patch = overridePatchForToggle(activationStatus, capKey, value);
          if (!patch.overrides && !patch.unset?.length) {
            toast.info('Déjà aligné sur l’activation propriétaire');
            return;
          }
          const next = await saveListingServiceActivation(listingId, patch);
          setActivationStatus(next.services ?? []);
          // Plus de toggle Orchestrer : ON ⇒ plan auto autorisé (orchestrated=true).
          // Appel direct (pas saveCapPatch) : le gate activation verrait encore l’ancien OFF.
          if (value) {
            const def = getCapabilityDefinition(capKey);
            if (def) {
              await listingsService.putListingOrchestration(listingId, {
                capabilities: {
                  [capKey]: {
                    key: capKey,
                    taskType: def.taskType,
                    decisions: {
                      ...(cap.decisions ?? {}),
                      managed: true,
                      orchestrated: true,
                    },
                    taskBehavior: cap.taskBehavior,
                    gestion: cap.gestion,
                    whatsapp: cap.whatsapp,
                    execution: cap.execution,
                  },
                },
              });
            }
          }
          toast.success(value ? 'Service activé pour cette annonce' : 'Service désactivé pour cette annonce');
          // Mise à jour locale sans spinner plein écran.
          if (value) {
            setDoc((prev) => {
              if (!prev) return prev;
              const existing = (prev.capabilities?.[capKey] ?? cap) as CapDoc;
              return {
                ...prev,
                capabilities: {
                  ...prev.capabilities,
                  [capKey]: {
                    ...existing,
                    decisions: {
                      ...(existing.decisions ?? {}),
                      managed: true,
                      orchestrated: true,
                    },
                  } as never,
                },
              };
            });
          }
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Activation impossible');
        } finally {
          setSaving(false);
        }
      })();
      return;
    }

    if (listingId && field === 'clientEnabled') {
      const act = activationStatus.find((s) => s.serviceId === capKey);
      if (act && act.effectiveEnabled !== true) {
        toast.warning('Activez d’abord le service (colonne ON) avant WhatsApp voyageur');
        return;
      }
    }

    const next: Record<string, unknown> = {
      managed: true,
      clientEnabled: true,
      orchestrated: true,
      taskEnabled: true,
      ...(cap.decisions ?? {}),
      [field]: value,
    };
    if (field === 'managed' && value) {
      next.orchestrated = true;
    }
    if (field === 'managed' && !value) {
      next.clientEnabled = false;
    }
    void saveCapPatch(capKey, { decisions: next });
  };

  const saveDecisionFlags = (capKey: string, flags: DecisionFlags) => {
    const cap = resolveCap(capKey);
    const def = getCapabilityDefinition(capKey);
    if (!cap || !def) return;
    if (listingId) {
      const act = activationStatus.find((s) => s.serviceId === capKey);
      if (act && act.effectiveEnabled !== true) {
        toast.warning('Activez d’abord le service (colonne ON)');
        return;
      }
    }
    const taskType = def.taskType ?? capKey;
    const actx = getCapabilityOrchestrationActivities(def);
    const noOpsTask = !actx.hasOpsTask;
    const decisions = {
      managed: true,
      clientEnabled: actx.whatsapp ? flags.clientEnabled : false,
      // Colonne ON = master ; plus de bouton Orchestrer en UI.
      orchestrated: true,
      taskEnabled: noOpsTask ? false : flags.taskEnabled,
    };
    const flagInput: DecisionFlags = {
      ...flags,
      clientReminders: actx.clientReminders ? flags.clientReminders : false,
      staffAssignment: actx.staffAssignment ? flags.staffAssignment : false,
      staffReminders: actx.staffReminders ? flags.staffReminders : false,
      staffStartReminder: actx.staffStartReminder ? flags.staffStartReminder : false,
      pmEscalation: actx.escalation ? flags.pmEscalation : false,
    };
    const execution = buildExecutionFromFlags(
      cap,
      noOpsTask
        ? {
            ...flagInput,
            taskEnabled: false,
            staffAssignment: false,
            staffReminders: false,
            staffStartReminder: false,
          }
        : flagInput,
      taskType,
      { onDemand: actx.onDemand, noStaffReminders: !actx.staffReminders },
    );
    void saveCapPatch(capKey, { decisions, execution });
  };

  const onGestionPatch = useCallback(
    async (capKey: string, patch: Record<string, unknown>) => {
      if (!doc) return;
      const existing = (caps[capKey]?.gestion ?? {}) as Record<string, unknown>;
      const nextGestion = { ...existing, ...patch };
      setSaving(true);
      try {
        if (listingId) {
          await saveListingGestion({
            listingId,
            capabilityKey: capKey,
            gestion: nextGestion,
            doc: doc as ListingOrchestrationDoc,
          });
        } else {
          await saveOwnerGestion({
            ownerKey,
            capabilityKey: capKey,
            gestion: nextGestion,
            doc: doc as OwnerOrchestrationDoc,
          });
        }
        setDoc((prev) =>
          prev
            ? {
                ...prev,
                capabilities: {
                  ...prev.capabilities,
                  [capKey]: {
                    ...(prev.capabilities[capKey] as CapDoc),
                    gestion: nextGestion,
                  } as never,
                },
              }
            : prev,
        );
        toast.success('Configuration enregistrée');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
      } finally {
        setSaving(false);
      }
    },
    [caps, doc, ownerKey, listingId],
  );

  const persistMessages = useCallback(
    async (next: ScheduledOrchestrationMessage[]) => {
      setSaving(true);
      try {
        if (listingId) {
          await saveListingScheduledMessages(listingId, next, msgCatalog);
        } else {
          await saveOwnerScheduledMessages(ownerKey, next, msgCatalog);
        }
        setMessages(next);
        toast.success('Message mis à jour');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Enregistrement message impossible');
      } finally {
        setSaving(false);
      }
    },
    [listingId, ownerKey, msgCatalog],
  );

  const patchMessageEnabled = (id: string, enabled: boolean) => {
    const next = messages.map((m) => (m._id === id ? { ...m, enabled } : m));
    void persistMessages(next);
  };

  const patchMessageTrigger = (
    id: string,
    trigger: ScheduledOrchestrationMessage['trigger'],
  ) => {
    const next = messages.map((m) => (m._id === id ? { ...m, trigger } : m));
    void persistMessages(next);
  };

  const patchMessageSendMode = (id: string, sendMode: 'auto' | 'manual') => {
    const next = messages.map((m) => (m._id === id ? { ...m, sendMode } : m));
    void persistMessages(next);
  };

  /* ── éditeurs ── */

  const patchAvailability = (capKey: string, av: Record<string, unknown>) => {
    const cap = resolveCap(capKey);
    const def = getCapabilityDefinition(capKey);
    if (!cap || !def) return;
    const codes = def.menuCodes.length
      ? def.menuCodes
      : (cap.whatsapp?.menuCodes ?? []).filter(Boolean);
    let menuOptions = [...(cap.whatsapp?.menuOptions ?? [])];
    if (menuOptions.length === 0 && codes.length > 0) {
      menuOptions = codes.map((code) => ({
        code,
        enabled: true,
        availability: av,
      }));
    } else {
      menuOptions = menuOptions.map((o) => ({ ...o, availability: av }));
      // Garantit au moins une option pour chaque code menu du service.
      for (const code of codes) {
        if (!menuOptions.some((o) => String((o as { code?: string }).code ?? '') === code)) {
          menuOptions.push({ code, enabled: true, availability: av });
        }
      }
    }
    void saveCapPatch(capKey, {
      whatsapp: {
        ...(cap.whatsapp ?? {}),
        menuCodes: codes.length ? codes : cap.whatsapp?.menuCodes,
        menuOptions,
        overrides: cap.whatsapp?.overrides ?? codes.map((code) => ({ code, enabled: true })),
      },
    });
  };

  const patchExecution = (capKey: string, exePatch: Record<string, unknown>) => {
    const cap = caps[capKey];
    void saveCapPatch(capKey, { execution: { ...(cap.execution ?? { enabled: true }), ...exePatch } });
  };

  const renderEditor = () => {
    if (!editor || !doc) return null;
    const cap = caps[editor.capKey];
    const def = getCapabilityDefinition(editor.capKey);
    if (!cap || !def) return null;
    const taskType = def.taskType ?? '';
    const exec = cap.execution ?? {};
    const close = () => setEditor(null);

    let body: JSX.Element | null = null;

    if (editor.kind === 'availability') {
      const av = (cap.whatsapp?.menuOptions?.[0]?.availability ?? { type: 'always' }) as Availability;
      const fallbackAnchor: TimingAnchor =
        taskType === 'departure_choose' ||
        taskType === 'departure_declare' ||
        taskType === 'receive_departure'
          ? 'checkout'
          : 'checkin';
      const { start: curStart, fin: curFin, anchor: curAnchor } = parseTimingState(av, fallbackAnchor);
      const curReqs = requiresList(av);
      const preset = TIMING_PRESETS[editor.capKey];
      const anchorLabel = curAnchor === 'checkout' ? 'départ' : 'arrivée';

      const writeAv = (
        start: 'toujours' | 'resa' | number,
        fin: TimingFin,
        reqs: string[],
        anchor: TimingAnchor,
      ) => {
        let base: Record<string, unknown>;
        if (start === 'toujours') {
          base = { type: 'always' };
        } else if (start === 'resa') {
          base =
            fin === 'fin'
              ? { type: 'after_booking_confirmed' }
              : { type: 'time_window', to: mkBoundaryTo(fin, anchor) };
        } else {
          const from = mkBoundaryFrom(start, anchor);
          base = { type: 'time_window', from, to: mkBoundaryTo(fin, anchor) };
        }
        if (reqs.length) {
          base = {
            type: 'conditional_and_time',
            requires: reqs.join(','),
            ...(base.from ? { from: base.from } : {}),
            ...(base.to ? { to: base.to } : {}),
          };
        }
        patchAvailability(editor.capKey, base);
      };

      const setStart = (start: 'toujours' | 'resa' | number) => writeAv(start, curFin, curReqs, curAnchor);
      const setFin = (fin: TimingFin) => {
        if (curStart === 'toujours') return;
        writeAv(curStart, fin, curReqs, curAnchor);
      };
      const setAnchor = (anchor: TimingAnchor) => {
        writeAv(curStart === 'toujours' ? 'resa' : curStart, curFin, curReqs, anchor);
      };
      const toggleReq = (id: string) => {
        const next = curReqs.includes(id) ? curReqs.filter((r) => r !== id) : [...curReqs, id];
        writeAv(curStart, curFin, next, curAnchor);
      };
      const applyPreset = () => {
        if (!preset) return;
        writeAv(preset.start, preset.fin, preset.requires ?? [], preset.anchor);
      };

      const presetReqsLabel = (preset?.requires ?? [])
        .map((r) => REQUIRE_EVENTS.find((e) => e.id === r)?.short ?? r)
        .join(' + ');
      const presetMatches =
        Boolean(preset) &&
        curStart === preset!.start &&
        curFin === preset!.fin &&
        curAnchor === preset!.anchor &&
        (preset!.requires ?? []).every((r) => curReqs.includes(r)) &&
        curReqs.length === (preset!.requires ?? []).length;

      const finLabel = (fin: TimingFin) => {
        if (fin === 'fin') return 'Fin (départ)';
        if (fin === 'J+1') return 'J+1 après départ';
        if (fin === 'J0') return curAnchor === 'checkout' ? 'J0 départ' : 'J0 arrivée';
        return `${fin} av. ${anchorLabel}`;
      };

      body = (
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {preset && (
            <Box
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: presetMatches ? V3.suT : V3.alt,
                border: `1px solid ${presetMatches ? 'rgba(10,143,94,0.35)' : V3.b}`,
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3, mb: 0.35 }}>
                CONFIG RECOMMANDÉE · {def.emoji} {def.label}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: V3.t, mb: 0.35 }}>
                {preset.label}
                {presetReqsLabel ? ` · conditions ${presetReqsLabel}` : ''}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: V3.t3, mb: 1 }}>{preset.hint}</Typography>
              <Button
                size="small"
                variant={presetMatches ? 'outlined' : 'contained'}
                onClick={applyPreset}
                sx={{
                  textTransform: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  ...(presetMatches
                    ? {}
                    : { bgcolor: V3.p, '&:hover': { bgcolor: V3.pd } }),
                }}
              >
                {presetMatches ? '✓ Config appliquée' : 'Appliquer cette config'}
              </Button>
            </Box>
          )}
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>
            RÉFÉRENCE DES JOURS (WhatsApp)
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <SegChip
              on={curAnchor === 'checkin'}
              label="Par rapport à l’arrivée"
              onClick={() => setAnchor('checkin')}
            />
            <SegChip
              on={curAnchor === 'checkout'}
              label="Par rapport au départ (séjour)"
              onClick={() => setAnchor('checkout')}
            />
          </Box>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>DÉBUT</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <SegChip on={curStart === 'toujours'} label="Toujours" onClick={() => setStart('toujours')} />
            <SegChip on={curStart === 'resa'} label="À la réservation" onClick={() => setStart('resa')} />
            {START_DAYS_PRE.map((d) => (
              <SegChip key={d} on={curStart === d} label={`J-${d}`} onClick={() => setStart(d)} />
            ))}
            <SegChip on={curStart === 0} label="J0" onClick={() => setStart(0)} />
          </Box>
          {curStart !== 'toujours' && (
            <>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>FIN</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {FIN_CHIPS.map((fin) => (
                  <SegChip
                    key={fin}
                    on={curFin === fin}
                    label={finLabel(fin)}
                    onClick={() => setFin(fin)}
                  />
                ))}
              </Box>
            </>
          )}
          <Typography sx={{ fontSize: 11, color: V3.t4 }}>
            J-n début = n jours avant {anchorLabel}. J0 = le jour d&apos;{anchorLabel}. « Fin (départ) »
            = visible jusqu&apos;au départ (même si le début est relatif à l&apos;arrivée). J+1 = lendemain
            du départ. WhatsApp utilise ces bornes pour afficher / masquer l&apos;option menu.
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>
            CONDITIONS REQUISES (toutes — ET)
            {preset?.requires?.length ? (
              <Box component="span" sx={{ fontWeight: 600, color: V3.t3, ml: 0.75 }}>
                · reco : {presetReqsLabel}
              </Box>
            ) : null}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {REQUIRE_EVENTS.map((ev) => (
              <SegChip
                key={ev.id}
                on={curReqs.includes(ev.id)}
                label={ev.label}
                onClick={() => toggleReq(ev.id)}
              />
            ))}
          </Box>
          <Typography sx={{ fontSize: 11, color: V3.t4 }}>
            Ex. accès : J-1 + E + D1. Aucune coche = pas de condition.
          </Typography>
        </Box>
      );
    }

    if (editor.kind === 'reminders') {
      const reminders = exec.reminders ?? [];
      const days = reminders.map((r) => Number(r.day ?? 0));
      const time = String(reminders[0]?.time ?? '10:00');
      const ref = String(reminders[0]?.ref ?? defaultRefForTask(taskType));
      const messageId = String(reminders[0]?.messageId ?? CLIENT_MSG_ID[taskType] ?? '');
      const write = (nextDays: number[], nextTime: string) => {
        patchExecution(editor.capKey, {
          reminders: nextDays
            .slice()
            .sort((a, b) => a - b)
            .map((day) => ({ ref, day, time: nextTime, label: day === 0 ? 'Relance J0' : `Relance J${day}`, messageId })),
        });
      };
      body = (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {[-7, -6, -5, -4, -3, -2, -1, 0].map((d) => (
              <SegChip
                key={d}
                on={days.includes(d)}
                label={d === 0 ? 'J0' : `J${d}`}
                onClick={() => write(days.includes(d) ? days.filter((x) => x !== d) : [...days, d], time)}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure d&apos;envoi</Typography>
            <HourSelect value={time} onChange={(t) => days.length && write(days, t)} />
          </Box>
        </Box>
      );
    }

    if (editor.kind === 'assign') {
      const sa = (exec.staffAssignment ?? null) as Record<string, unknown> | null;
      const start = sa?.startAt as { ref?: string; day?: number; time?: string } | undefined;
      const end = sa?.endAt as { ref?: string; day?: number; time?: string } | undefined;
      const ref = String(start?.ref && start.ref !== 'task_created' ? start.ref : defaultRefForTask(taskType));
      const assignAuto = exec.staffAssignmentMode !== 'manual';
      const allDay =
        sa?.allDay === true ||
        (String(start?.time || '') === '00:00' &&
          (String(end?.time || '') === '23:59' || String(end?.time || '') === '23:00'));
      const startTime = allDay ? '00:00' : String(start?.time ?? '09:00');
      const endTime = allDay ? '23:59' : String(end?.time ?? '11:00');
      const fromDaysField = Array.isArray(sa?.days)
        ? (sa!.days as unknown[])
            .map((d) => Number(d))
            .filter((d) => Number.isFinite(d))
        : [];
      const legacyDays =
        start?.ref !== 'task_created' && start?.day != null
          ? (() => {
              const sd = Number(start.day);
              const ed = end?.day != null ? Number(end.day) : sd;
              const out: number[] = [];
              for (let d = Math.min(sd, ed); d <= Math.max(sd, ed); d += 1) out.push(d);
              return out;
            })()
          : [-1];
      const selectedDays = [...new Set(fromDaysField.length > 0 ? fromDaysField : legacyDays)].sort(
        (a, b) => a - b,
      );
      const mode: 'immediate' | 'none' | 'window' = !sa
        ? 'none'
        : start?.ref === 'task_created'
          ? 'immediate'
          : 'window';
      const ASSIGN_DAYS = [-7, -6, -5, -4, -3, -2, -1, 0, 1] as const;
      const dayLabel = (d: number) => (d === 0 ? 'J0' : d > 0 ? `J+${d}` : `J${d}`);
      const base = {
        releaseWindows: (sa as { releaseWindows?: string[] } | null)?.releaseWindows ?? ['11:00', '16:00'],
        releaseMode: (sa as { releaseMode?: string } | null)?.releaseMode ?? 'tolerance',
        acceptToleranceHours: (sa as { acceptToleranceHours?: number } | null)?.acceptToleranceHours ?? 3,
        assignmentHoursMode: (sa as { assignmentHoursMode?: string } | null)?.assignmentHoursMode ?? 'planning',
      };
      const write = (opts: {
        mode?: 'immediate' | 'none' | 'window';
        days?: number[];
        startTime?: string;
        endTime?: string;
        allDay?: boolean;
      }) => {
        const nextMode = opts.mode ?? mode;
        const nextAuto = assignAuto;
        if (nextMode === 'none') return patchExecution(editor.capKey, { staffAssignment: null });
        if (nextMode === 'immediate') {
          return patchExecution(editor.capKey, {
            staffAssignment: {
              ...base,
              autoAssign: nextAuto,
              findAnotherStaff: !nextAuto,
              startAt: { ref: 'task_created' },
              assignmentHoursMode: 'always',
            },
            staffAssignmentMode: nextAuto ? 'auto' : 'manual',
          });
        }
        const days = [...new Set(opts.days ?? selectedDays)]
          .filter((d) => Number.isFinite(d))
          .sort((a, b) => a - b);
        if (days.length === 0) return;
        const nextAllDay = opts.allDay ?? allDay;
        const st = nextAllDay ? '00:00' : opts.startTime ?? startTime;
        const et = nextAllDay ? '23:59' : opts.endTime ?? endTime;
        const sd = days[0]!;
        const ed = days[days.length - 1]!;
        patchExecution(editor.capKey, {
          staffAssignment: {
            ...base,
            autoAssign: nextAuto,
            findAnotherStaff: !nextAuto,
            days,
            allDay: nextAllDay,
            startAt: { ref, day: sd, time: st },
            endAt: { ref, day: ed, time: et },
          },
          staffAssignmentMode: nextAuto ? 'auto' : 'manual',
        });
      };
      body = (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>MODE</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <SegChip on={mode === 'immediate'} label="Immédiat" onClick={() => write({ mode: 'immediate' })} />
            <SegChip
              on={mode === 'window'}
              label="Jours"
              onClick={() =>
                write({
                  mode: 'window',
                  days: selectedDays.length ? selectedDays : [-1],
                  allDay: false,
                  startTime: '09:00',
                  endTime: '11:00',
                })
              }
            />
          </Box>
          {mode === 'window' && (
            <>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>
                JOURS D&apos;ASSIGNATION
              </Typography>
              <Typography sx={{ fontSize: 11, color: V3.t3, mb: 0.25 }}>
                Cliquez pour cocher / décocher librement (ex. seulement J-7 et J-1). Recherche active
                ces jours entre les heures ci-dessous.
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {ASSIGN_DAYS.map((d) => {
                  const on = selectedDays.includes(d);
                  return (
                    <SegChip
                      key={`d${d}`}
                      on={on}
                      label={dayLabel(d)}
                      onClick={() => {
                        const next = on
                          ? selectedDays.filter((x) => x !== d)
                          : [...selectedDays, d];
                        if (next.length === 0) return;
                        write({ mode: 'window', days: next });
                      }}
                    />
                  );
                })}
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3, mt: 0.5 }}>
                HEURES
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                <SegChip
                  on={allDay}
                  label="24h"
                  onClick={() => write({ mode: 'window', allDay: true })}
                />
                <SegChip
                  on={!allDay}
                  label="Créneau"
                  onClick={() =>
                    write({
                      mode: 'window',
                      allDay: false,
                      startTime: startTime === '00:00' ? '09:00' : startTime,
                      endTime: endTime === '23:59' || endTime === '23:00' ? '11:00' : endTime,
                    })
                  }
                />
              </Box>
              {allDay ? (
                <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>
                  24h · recherche toute la journée sur les jours cochés (l’heure n’entre pas en
                  compte).
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure début</Typography>
                  <HourSelect
                    fullDay
                    value={startTime}
                    onChange={(t) => write({ mode: 'window', allDay: false, startTime: t })}
                  />
                  <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure fin</Typography>
                  <HourSelect
                    fullDay
                    value={endTime === '23:59' ? '23:00' : endTime}
                    onChange={(t) => write({ mode: 'window', allDay: false, endTime: t })}
                  />
                </Box>
              )}
            </>
          )}
          {isListingScope && isCleaningCapabilityKey(editor.capKey) ? (
            <CleaningRulesAssignUi
              capKey={editor.capKey}
              rules={mergeCleaningRulesPatch(
                (doc as ListingOrchestrationEffective | null)?.cleaningRules,
                undefined,
              )}
              saving={saving}
              onPatch={(p) => void persistCleaningRules(p)}
            />
          ) : null}
        </Box>
      );
    }

    if (editor.kind === 'staffRem') {
      const staffRem = exec.staffReminders ?? [];
      const day = staffRem.length ? Number(staffRem[0].day ?? -1) : null;
      const time = String(staffRem[0]?.time ?? '11:00');
      const ref = String(staffRem[0]?.ref ?? defaultRefForTask(taskType));
      const messageId = String(staffRem[0]?.messageId ?? STAFF_MSG_ID[taskType] ?? '');
      const write = (nextDay: number | null, nextTime: string) => {
        patchExecution(editor.capKey, {
          staffReminders: nextDay == null
            ? []
            : [{ label: nextDay === 0 ? 'Rappel J0' : `Rappel J${nextDay > 0 ? `+${nextDay}` : nextDay}`, ref, day: nextDay, time: nextTime, messageId }],
        });
      };
      body = (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[-2, -1, 0, 1].map((d) => (
              <SegChip key={d} on={day === d} label={d === 0 ? 'J0' : d > 0 ? `J+${d}` : `J${d}`} onClick={() => write(d, time)} />
            ))}
          </Box>
          {day != null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure</Typography>
              <HourSelect value={time} onChange={(t) => write(day, t)} />
            </Box>
          )}
        </Box>
      );
    }

    if (editor.kind === 'escalation') {
      const escOn = exec.escalationEnabled === true;
      const dl = (exec.deadline ?? null) as DeadlineDoc;
      const postCreate = isPostCreationEscalation(taskType);
      const ref = String(dl?.ref ?? defaultRefForTask(taskType));
      const hours = dl?.hours != null ? Number(dl.hours) : null;
      const day =
        hours != null
          ? null
          : dl?.day != null
            ? Number(dl.day)
            : postCreate
              ? 1
              : -1;
      const time = String(dl?.time ?? (postCreate ? '09:00' : '11:00'));

      const writeDay = (on: boolean, nextDay: number, nextTime: string) => {
        patchExecution(editor.capKey, {
          escalationEnabled: on,
          deadline: on
            ? { ref: postCreate ? 'task_created' : ref, day: nextDay, time: nextTime }
            : dl,
        });
      };
      const writeHours = (on: boolean, nextHours: number) => {
        patchExecution(editor.capKey, {
          escalationEnabled: on,
          deadline: on ? { ref: 'task_created', hours: nextHours } : dl,
        });
      };

      body = (
        <Box sx={{ display: 'grid', gap: 1 }}>
          {escOn && postCreate && (
            <>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>
                APRÈS CRÉATION DE LA TÂCHE
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {[2, 4, 8, 24].map((h) => (
                  <SegChip
                    key={`h${h}`}
                    on={hours === h}
                    label={`+${h}h`}
                    onClick={() => writeHours(true, h)}
                  />
                ))}
                {[0, 1].map((d) => (
                  <SegChip
                    key={`d${d}`}
                    on={hours == null && day === d}
                    label={d === 0 ? 'J0' : 'J+1'}
                    onClick={() => writeDay(true, d, time)}
                  />
                ))}
              </Box>
              {hours == null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure</Typography>
                  <HourSelect value={time} onChange={(t) => writeDay(true, day ?? 1, t)} />
                </Box>
              )}
              <Typography sx={{ fontSize: 11, color: V3.t4 }}>
                Ex. +4h = 4 h après la demande · +24h = 24 h après · J+1 à 9h = lendemain à 09:00.
              </Typography>
            </>
          )}
          {escOn && !postCreate && (
            <>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {[-2, -1, 0, 1].map((d) => (
                  <SegChip
                    key={d}
                    on={day === d}
                    label={d === 0 ? 'J0' : d > 0 ? `J+${d}` : `J${d}`}
                    onClick={() => writeDay(true, d, time)}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure</Typography>
                <HourSelect value={time} onChange={(t) => writeDay(true, day ?? 0, t)} />
              </Box>
            </>
          )}
        </Box>
      );
    }

    // Titre + toggles Auto/Manuel (Relances / Assignation / Rappels / Escalade).
    const inferOn = (mode: unknown, hasConfig: boolean) =>
      mode === 'auto' || (mode !== 'manual' && hasConfig);
    const kindMeta: Record<
      Exclude<EditorKind, 'availability'>,
      { suffix: string; on: boolean; hintManual: string }
    > = {
      reminders: {
        suffix: '· Relances client',
        on: inferOn(exec.remindersMode, (exec.reminders ?? []).length > 0),
        hintManual:
          'Manuel = pas d’envoi auto. Relancer reste possible dans le plan (cockpit).',
      },
      assign: {
        suffix: '· Assignation',
        on: inferOn(exec.staffAssignmentMode, Boolean(exec.staffAssignment)),
        hintManual:
          'Manuel = pas de recherche auto. Assigner reste possible dans le plan (cockpit).',
      },
      staffRem: {
        suffix: '· Rappels staff',
        on: inferOn(exec.staffRemindersMode, (exec.staffReminders ?? []).length > 0),
        hintManual:
          'Manuel = pas de notif auto. Rappeler reste possible dans le plan (cockpit).',
      },
      escalation: {
        suffix: '· Escalade',
        on: inferOn(exec.escalationMode, exec.escalationEnabled === true && Boolean(exec.deadline)),
        hintManual:
          'Manuel = pas d’alerte auto. Escalader reste possible dans le plan (cockpit).',
      },
    };

    const featureKind =
      editor.kind === 'availability' ? null : (editor.kind as Exclude<EditorKind, 'availability'>);
    const meta = featureKind ? kindMeta[featureKind] : null;

    const toggleFeature = (auto: boolean) => {
      if (!featureKind) return;
      const mode = auto ? 'auto' : 'manual';
      const ref = defaultRefForTask(taskType);

      if (featureKind === 'reminders') {
        const reminders =
          (exec.reminders ?? []).length > 0
            ? exec.reminders
            : [
                {
                  ref,
                  day: -1,
                  time: '10:00',
                  label: auto ? 'Relance J-1' : 'Relance manuelle',
                  messageId: CLIENT_MSG_ID[taskType] ?? '',
                },
              ];
        patchExecution(editor.capKey, { reminders, remindersMode: mode });
        return;
      }
      if (featureKind === 'assign') {
        const staffAssignment =
          (exec.staffAssignment as Record<string, unknown> | null | undefined) ??
          ({
            days: [-3, -2, -1, 0],
            startAt: { ref, day: -3, time: '09:00' },
            endAt: { ref, day: 0, time: '11:00' },
            autoAssign: auto,
            findAnotherStaff: !auto,
            releaseWindows: ['11:00', '16:00'],
            releaseMode: 'tolerance',
            acceptToleranceHours: 3,
            assignmentHoursMode: 'planning',
          } as Record<string, unknown>);
        patchExecution(editor.capKey, {
          staffAssignment: {
            ...staffAssignment,
            autoAssign: auto ? staffAssignment.autoAssign !== false : false,
            findAnotherStaff: !auto,
          },
          staffAssignmentMode: mode,
        });
        return;
      }
      if (featureKind === 'staffRem') {
        const staffReminders =
          (exec.staffReminders ?? []).length > 0
            ? exec.staffReminders
            : [
                {
                  label: auto ? 'Rappel J-1' : 'Rappel staff manuel',
                  ref,
                  day: -1,
                  time: '11:00',
                  messageId: STAFF_MSG_ID[taskType] ?? '',
                },
              ];
        patchExecution(editor.capKey, { staffReminders, staffRemindersMode: mode });
        return;
      }
      if (featureKind === 'escalation') {
        const postCreate = isPostCreationEscalation(taskType);
        const dl = (exec.deadline ?? null) as DeadlineDoc;
        patchExecution(editor.capKey, {
          escalationEnabled: true,
          escalationMode: mode,
          deadline: dl ?? {
            ref: postCreate ? 'task_created' : ref,
            ...(postCreate ? { hours: 4 } : { day: -1, time: '11:00' }),
          },
        });
      }
    };

    return (
      <Popover
        open
        anchorEl={editor.anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, maxWidth: editor.kind === 'assign' ? 440 : 380 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 1,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t }}>
              {def.emoji} {def.label}
              {meta ? (
                <Box component="span" sx={{ ml: 0.75, fontWeight: 700, color: V3.t3, fontSize: 11 }}>
                  {meta.suffix}
                </Box>
              ) : null}
            </Typography>
            {meta ? (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={meta.on}
                    onChange={(e) => toggleFeature(e.target.checked)}
                    slotProps={{ input: { 'aria-label': `Mode ${meta.suffix}` } }}
                  />
                }
                label={meta.on ? 'Auto' : 'Manuel'}
                labelPlacement="start"
                sx={{
                  m: 0,
                  gap: 0.5,
                  '& .MuiFormControlLabel-label': {
                    fontSize: 11,
                    fontWeight: 800,
                    color: meta.on ? V3.su : V3.t4,
                    minWidth: 52,
                  },
                }}
              />
            ) : null}
          </Box>
          {meta && !meta.on ? (
            <Typography sx={{ fontSize: 12, color: V3.t3, mb: 1 }}>{meta.hintManual}</Typography>
          ) : null}
          {body}
        </Box>
      </Popover>
    );
  };

  const renderMsgEditor = () => {
    if (!msgEditor) return null;
    const rule = messages.find((m) => m._id === msgEditor.id);
    if (!rule) return null;
    const ref = rule.trigger?.reference ?? 'check_in';
    const delayVal = Number(rule.trigger?.delay?.value ?? -1);
    const unit = rule.trigger?.delay?.unit === 'hours' ? 'hours' : 'days';
    const time = String(rule.trigger?.time ?? '10:00');
    const write = (next: ScheduledOrchestrationMessage['trigger']) => {
      patchMessageTrigger(rule._id, next);
    };
    const sendMode = rule.sendMode === 'manual' ? 'manual' : 'auto';
    return (
      <Popover
        open
        anchorEl={msgEditor.anchor}
        onClose={() => setMsgEditor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, maxWidth: 360, display: 'grid', gap: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t }}>
            💬 {rule.label} · timing
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>MODE</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <SegChip
              on={sendMode === 'auto'}
              label="Auto"
              onClick={() => patchMessageSendMode(rule._id, 'auto')}
            />
            <SegChip
              on={sendMode === 'manual'}
              label="📨 Manuel"
              onClick={() => patchMessageSendMode(rule._id, 'manual')}
            />
          </Box>
          {sendMode === 'manual' ? (
            <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.35 }}>
              Pas d’envoi auto. Relancer reste possible dans le plan (cockpit) 📨.
            </Typography>
          ) : null}
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              color: V3.t3,
              opacity: sendMode === 'manual' ? 0.45 : 1,
            }}
          >
            RÉFÉRENCE
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              flexWrap: 'wrap',
              opacity: sendMode === 'manual' ? 0.45 : 1,
              pointerEvents: sendMode === 'manual' ? 'none' : 'auto',
            }}
          >
            {(
              [
                ['reservation_date', 'Résa'],
                ['check_in', 'Arrivée'],
                ['check_out', 'Départ'],
              ] as const
            ).map(([id, label]) => (
              <SegChip
                key={id}
                on={ref === id}
                label={label}
                onClick={() =>
                  write({
                    reference: id,
                    delay: { value: delayVal, unit },
                    time: unit === 'days' ? time : undefined,
                  })
                }
              />
            ))}
          </Box>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              color: V3.t3,
              opacity: sendMode === 'manual' ? 0.45 : 1,
            }}
          >
            DÉLAI
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              flexWrap: 'wrap',
              opacity: sendMode === 'manual' ? 0.45 : 1,
              pointerEvents: sendMode === 'manual' ? 'none' : 'auto',
            }}
          >
            {[
              { v: 0, u: 'hours' as const, label: 'Immédiat' },
              { v: 2, u: 'hours' as const, label: '+2h' },
              { v: 4, u: 'hours' as const, label: '+4h' },
              { v: -2, u: 'days' as const, label: 'J−2' },
              { v: -1, u: 'days' as const, label: 'J−1' },
              { v: 0, u: 'days' as const, label: 'J0' },
              { v: 1, u: 'days' as const, label: 'J+1' },
              { v: 2, u: 'days' as const, label: 'J+2' },
              { v: 3, u: 'days' as const, label: 'J+3' },
            ].map((opt) => (
              <SegChip
                key={`${opt.u}${opt.v}${opt.label}`}
                on={unit === opt.u && delayVal === opt.v}
                label={opt.label}
                onClick={() =>
                  write({
                    reference: ref,
                    delay: { value: opt.v, unit: opt.u },
                    time: opt.u === 'days' ? time : undefined,
                  })
                }
              />
            ))}
          </Box>
          {unit === 'days' && sendMode === 'auto' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure</Typography>
              <HourSelect
                value={time}
                onChange={(t) =>
                  write({
                    reference: ref,
                    delay: { value: delayVal, unit: 'days' },
                    time: t,
                  })
                }
              />
            </Box>
          )}
        </Box>
      </Popover>
    );
  };

  /* ── rendu tableau ── */

  const rows = useMemo(
    () =>
      CAPABILITY_REGISTRY.filter((def) => def.key !== 'menu_navigation').map((def) => {
        const cap: CapDoc = caps[def.key] ?? {
          key: def.key,
          taskType: def.taskType ?? undefined,
          decisions: {
            managed: false,
            clientEnabled: false,
            orchestrated: false,
            taskEnabled: false,
          },
        };
        const act = activationStatus.find((s) => s.serviceId === def.key);
        const on = isListingScope
          ? act
            ? act.effectiveEnabled === true
            : cap.decisions?.managed === true
          : cap.decisions?.managed === true;
        const waOn = on && cap.decisions?.clientEnabled === true;
        const exec = cap.execution;
        const reminders = exec?.reminders ?? [];
        const staffRem = exec?.staffReminders ?? [];
        const sa = exec?.staffAssignment ?? null;
        const escOn = exec?.escalationEnabled === true;
        const dl = exec?.deadline as DeadlineDoc;
        const hints = configHints(cap, def.key);
        const actx = getCapabilityOrchestrationActivities(def);
        const hasClient = actx.whatsapp;
        const hasTaskCol = actx.hasOpsTask;
        const hasOrch = def.columns.orchestrated !== 'na';
        const flags = readDecisionFlags(cap);
        return {
          key: def.key,
          group: def.group,
          groupLabel: CAPABILITY_GROUPS[def.group] ?? def.groupLabel,
          emoji: def.emoji,
          label: def.label,
          on,
          waOn,
          hasClient,
          hasTask: Boolean(def.taskType),
          hasTaskCol,
          hasOrch,
          hasClientReminders: actx.clientReminders,
          hasStaffReminders: actx.staffReminders,
          hasEscalation: actx.escalation,
          onDemand: actx.onDemand,
          flags: {
            ...flags,
            ...(actx.onDemand || !actx.clientReminders ? { clientReminders: false } : null),
            ...(!actx.staffReminders ? { staffReminders: false } : null),
          },
          hints,
          // N/A = activité absente · Manuel = mode Manuel · créneaux = mode Auto · — = Auto sans config
          availability: !actx.whatsapp
            ? 'N/A'
            : on
              ? availabilityHuman(cap.whatsapp?.menuOptions?.[0]?.availability as Availability)
              : 'Off',
          reminders: !actx.clientReminders
            ? 'N/A'
            : !flags.clientReminders
              ? 'Manuel'
              : reminders.length
                ? `${daysHuman(reminders.map((r) => Number(r.day ?? 0)))} à ${hourOf(String(reminders[0]?.time ?? ''))}`
                : '—',
          assign: !actx.staffAssignment
            ? 'N/A'
            : !flags.staffAssignment
              ? 'Manuel'
              : sa
                ? assignHuman(sa)
                : '—',
          autoAssign:
            actx.staffAssignment && flags.staffAssignment && sa
              ? (sa as { autoAssign?: boolean }).autoAssign === true
              : null,
          staffReminder: !actx.staffReminders
            ? 'N/A'
            : !flags.staffReminders
              ? 'Manuel'
              : staffRem.length
                ? `${daysHuman(staffRem.map((r) => Number(r.day ?? 0)))} à ${hourOf(String(staffRem[0]?.time ?? ''))}`
                : '—',
          escalation: !actx.escalation
            ? 'N/A'
            : !flags.pmEscalation
              ? 'Manuel'
              : escalationHuman(escOn, dl),
        };
      }),
    [caps, activationStatus, isListingScope],
  );

  const groupedRows = useMemo(() => {
    const byGroup = new Map<CapabilityGroupId, typeof rows>();
    for (const r of rows) {
      const list = byGroup.get(r.group) ?? [];
      list.push(r);
      byGroup.set(r.group, list);
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => {
      const groupRows = byGroup.get(g)!;
      return {
        id: g,
        label: CAPABILITY_GROUPS[g],
        rows: groupRows,
        activeCount: groupRows.filter((r) => r.on).length,
      };
    });
  }, [rows]);

  const toggleGroup = (id: CapabilityGroupId | 'messages') => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const configGestionValues = useMemo(() => {
    if (!configModal) return {};
    const capGestion = (caps[configModal.capKey]?.gestion ?? {}) as Record<string, unknown>;
    // Accès: listing_access fields on listingValues win over stale gestion.
    if (configModal.capKey === 'access') {
      const fromListing: Record<string, unknown> = {};
      if (listingValues.receptionMode != null) fromListing.receptionMode = listingValues.receptionMode;
      if (Array.isArray(listingValues.instructions)) {
        fromListing.instructions = listingValues.instructions;
      }
      if (listingValues.listingName != null) fromListing.listingName = listingValues.listingName;
      return { ...capGestion, ...fromListing };
    }
    const merged: Record<string, unknown> = { ...listingValues };
    for (const [k, v] of Object.entries(capGestion)) {
      if (v !== null && v !== undefined) merged[k] = v;
      else if (!(k in merged)) merged[k] = v;
    }
    return merged;
  }, [configModal, caps, listingValues]);

  if (loading && !doc) {
    return (
      <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (error && !doc) {
    return <Alert severity="warning">{error ?? 'Modèle orchestration introuvable.'}</Alert>;
  }
  if (!doc) {
    return <Alert severity="warning">Modèle orchestration introuvable.</Alert>;
  }

  const cell = { fontSize: 12.5, color: V3.t2 } as const;
  const editCell = {
    ...cell,
    cursor: 'pointer',
    borderRadius: 1,
    px: 0.5,
    '&:hover': { bgcolor: V3.alt, outline: `1px solid ${V3.b}` },
  } as const;
  const head = {
    fontSize: 10.5,
    fontWeight: 800,
    color: V3.t3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  };

  const open = (kind: EditorKind, capKey: string) => (e: React.MouseEvent<HTMLElement>) =>
    setEditor({ kind, capKey, anchor: e.currentTarget });

  const configDef = configModal ? getCapabilityDefinition(configModal.capKey) : null;
  const configHelp = (() => {
    if (!configDef) return '';
    switch (configDef.key) {
      case 'access':
        return isListingScope
          ? 'Éditez mode d’accueil, parking, immeuble et appartement (codes + descriptions) — puis Enregistrer.'
          : 'Template owner : mode d’accueil seulement. Codes parking / immeuble / appartement → chaque fiche annonce.';
      case 'cleaning_free':
        return 'Tarifs Normal/Grand + paliers (nombre de ménages selon la durée) et créneaux — puis Enregistrer.';
      case 'cleaning_paid':
        return 'Tarifs Normal/Grand + options serviettes/draps — puis Enregistrer.';
      case 'cleaning_sojori':
        return 'Tarifs Normal/Grand (ou forfait mensuel) + déclenchement après checkout — puis Enregistrer.';
      case 'transport':
        return 'Suivi du vol : activez-le et choisissez les vérifications. Destinations et prix → onglet Expériences.';
      case 'concierge':
        return 'Les expériences (J3) se cochent dans l’onglet listing Expériences — pas ici.';
      case 'groceries':
        return 'Configurez les articles / paniers courses et leurs prix — puis Enregistrer.';
      default:
        return configDef.gestionHint || 'Modifiez la configuration puis Enregistrer.';
    }
  })();

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
          <OrchestrationGlobalSwitch
            checked={orchestrationEnabled}
            disabled={saving}
            scope={isListingScope ? 'listing' : 'owner'}
            onChange={(v) => void persistOrchestrationGlobal(v)}
          />
        </Box>
        <Typography
          sx={{
            flex: '2 1 280px',
            fontSize: 11,
            color: V3.t3,
            lineHeight: 1.35,
            minWidth: 0,
          }}
          title="ON = service + plan. Décisions = WA / Tâche / Relances / Rappel staff / Escalade. Visibilité WA = fenêtre menu voyageur. Tâche OFF = pas d’équipe."
        >
          <Box component="span" sx={{ fontWeight: 700, color: V3.t2 }}>
            ON
          </Box>{' '}
          = service ·{' '}
          <Box component="span" sx={{ fontWeight: 700, color: V3.t2 }}>
            Décisions
          </Box>{' '}
          = WA / Tâche / Rel / Staff / Esc ·{' '}
          <Box component="span" sx={{ fontWeight: 700, color: V3.t2 }}>
            Visibilité WA
          </Box>{' '}
          = menu voyageur
          {!orchestrationEnabled ? (
            <Box component="span" sx={{ fontWeight: 800, color: '#9b1c1c', ml: 0.75 }}>
              · Globale OFF — pas d’auto
            </Box>
          ) : null}
        </Typography>
      </Box>

      {!isListingScope && doc ? (
        <CapabilityAuditStrip capabilities={doc.capabilities as Record<string, CapDoc> | undefined} />
      ) : null}

      <Box sx={{ border: `1px solid ${V3.b}`, borderRadius: 2, p: 1.5, bgcolor: V3.card }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: V3.t, mb: 1 }}>
          Flows &amp; messages — config d&apos;ensemble
        </Typography>

        {groupedRows.map((group) => (
          <V3Section
            key={group.id}
            icon={GROUP_EMOJI[group.id] ?? '•'}
            kind="manage"
            title={group.label}
            subtitle={`${group.rows.length} flow${group.rows.length > 1 ? 's' : ''}`}
            open={openGroups.has(group.id)}
            onOpenChange={() => toggleGroup(group.id)}
            badge={
              <Box
                component="span"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 9,
                  fontWeight: 700,
                  color: group.activeCount > 0 ? V3.su : V3.t4,
                }}
              >
                {group.activeCount}/{group.rows.length} actifs
              </Box>
            }
          >
            {group.id === 'concierge' && isListingScope ? (
              <Typography sx={{ fontSize: 11.5, color: V3.t3, mb: 1.25, lineHeight: 1.45 }}>
                Les expériences (J3) et la <b>navette</b> (expérience Transport) se cochent
                dans l’onglet listing <b>Expériences</b>. Ici : Courses uniquement — le
                transport legacy est remplacé.
              </Typography>
            ) : null}

            <Box sx={{ overflowX: 'auto' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns:
                    '36px minmax(140px,1.25fr) 44px minmax(150px,1.3fr) minmax(110px,1fr) minmax(100px,0.95fr) 0.8fr 0.95fr 0.75fr 0.7fr 88px',
                  gap: 0.75,
                  alignItems: 'center',
                  minWidth: 1240,
                }}
              >
                <Typography sx={head}> </Typography>
                <Typography sx={head} title="Nom du service / flow">
                  Service
                </Typography>
                <Typography sx={head} title="Activer ou couper le service">
                  ON
                </Typography>
                <Typography sx={head} title="WhatsApp · Créer tâche · Relances · Staff · Escalade">
                  Décisions
                </Typography>
                <Typography sx={head} title="Prix, créneaux, catalogue, textes…">
                  Contenu
                </Typography>
                <Typography sx={head} title="Fenêtre où le menu WhatsApp est proposé au voyageur">
                  Visibilité WA
                </Typography>
                <Typography sx={head} title="Rappels WhatsApp au voyageur si pas encore fait">
                  Relances client
                </Typography>
                <Typography sx={head} title="Fenêtre d’assignation équipe">
                  Assignation
                </Typography>
                <Typography sx={head} title="Notification pour rappeler le staff à J / heure (pas l’assignation)">
                  Rappels staff
                </Typography>
                <Typography sx={head} title="Alerte admin si non traité à temps">
                  Escalade
                </Typography>
                <Typography sx={head} title="Ouvrir la fiche de configuration">
                  Éditer
                </Typography>

              {group.rows.map((r) => (
                <Box key={r.key} sx={{ display: 'contents' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <KindFlag kind="flow" />
                  </Box>
                  <Typography
                    component="div"
                    sx={{
                      ...cell,
                      fontWeight: 700,
                      color: r.on ? V3.t : V3.t4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      {r.emoji} {r.label}
                    </span>
                    {!r.on && (
                      <Chip label="Off" size="small" sx={{ height: 16, fontSize: 10 }} />
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Switch
                      size="small"
                      checked={r.on}
                      onChange={(e) => patchDecision(r.key, 'managed', e.target.checked)}
                      inputProps={{ 'aria-label': `${r.label} actif` }}
                    />
                  </Box>
                  <Box
                    sx={{
                      ...editCell,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.35,
                      minHeight: 28,
                      alignItems: 'center',
                      py: 0.25,
                    }}
                    onClick={() => (r.on ? setDecisionsModal(r.key) : toast.warning('Activez d’abord ON'))}
                    title="WhatsApp · Tâche · Relances · Assignation · Rappels · Escalade"
                  >
                    {(
                      [
                        r.hasClient && { on: r.flags.clientEnabled, label: 'WA' },
                        r.hasTaskCol && { on: r.flags.taskEnabled, label: 'Tâche' },
                        r.hasClientReminders && { on: r.flags.clientReminders, label: 'Rel' },
                        r.hasTaskCol && { on: r.flags.staffAssignment, label: 'Assign' },
                        r.hasStaffReminders && { on: r.flags.staffReminders, label: 'Rappel' },
                        r.hasEscalation && { on: r.flags.pmEscalation, label: 'Esc' },
                      ] as Array<{ on: boolean; label: string } | false>
                    )
                      .filter(Boolean)
                      .map((chip) => {
                        const c = chip as { on: boolean; label: string };
                        return (
                          <Chip
                            key={c.label}
                            label={c.label}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 9.5,
                              fontWeight: 800,
                              bgcolor: c.on ? V3.suT : V3.alt,
                              color: c.on ? V3.su : V3.t4,
                              border: `1px solid ${c.on ? 'rgba(10,143,94,0.25)' : V3.b}`,
                            }}
                          />
                        );
                      })}
                  </Box>
                  <Box
                    sx={{
                      ...(r.key === 'concierge' ? cell : editCell),
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.35,
                      minHeight: 28,
                      alignItems: 'center',
                      py: 0.25,
                      ...(r.key === 'concierge' ? { cursor: 'default', opacity: 0.85 } : null),
                    }}
                    onClick={
                      r.key === 'concierge'
                        ? undefined
                        : () => setConfigModal({ capKey: r.key, tab: 'gestion' })
                    }
                    title={
                      r.key === 'concierge'
                        ? 'Expériences (J3) — onglet listing Expériences'
                        : r.key === 'transport'
                          ? 'Suivi du vol — destinations et prix dans l’onglet Expériences'
                          : 'Contenu (prix, créneaux, catalogue…)'
                    }
                  >
                    {r.key === 'concierge' || r.key === 'transport' ? (
                      <Typography sx={{ ...cell, color: V3.t3, fontSize: 11.5, fontWeight: 700 }}>
                        {r.key === 'transport' ? '→ Expériences (navette)' : '→ Expériences'}
                      </Typography>
                    ) : r.hints.length === 0 ? (
                      <Typography sx={{ ...cell, color: V3.p, fontSize: 11.5, fontWeight: 700 }}>
                        + Contenu
                      </Typography>
                    ) : (
                      r.hints.map((h) => (
                        <Chip
                          key={h}
                          label={h}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            fontWeight: 600,
                            bgcolor: V3.pt,
                            color: V3.pd,
                            cursor: 'pointer',
                          }}
                        />
                      ))
                    )}
                  </Box>
                  <Typography
                    component="div"
                    sx={r.on && r.hasClient ? editCell : { ...cell, opacity: 0.5 }}
                    onClick={r.on && r.hasClient ? open('availability', r.key) : undefined}
                    title={
                      r.hasClient
                        ? 'Visibilité WhatsApp — fenêtre proposée au voyageur'
                        : 'N/A — pas de menu voyageur'
                    }
                  >
                    {r.availability}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasClientReminders ? editCell : cell}
                    onClick={
                      r.on && r.hasClientReminders ? open('reminders', r.key) : undefined
                    }
                    title={
                      r.hasClientReminders
                        ? 'Relances client (voyageur)'
                        : 'N/A — pas de relances client'
                    }
                  >
                    {r.reminders}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasTaskCol ? editCell : cell}
                    onClick={r.on && r.hasTaskCol ? open('assign', r.key) : undefined}
                    title={
                      r.hasTaskCol
                        ? 'Assignation staff — début / fin'
                        : 'N/A — pas de tâche ops staff'
                    }
                  >
                    {r.assign}
                    {r.assign !== 'Flow' &&
                    r.assign !== 'Manuel' &&
                    r.assign !== 'N/A' &&
                    r.assign !== '—'
                      ? r.autoAssign === true
                        ? ' · Auto ✓'
                        : r.autoAssign === false
                          ? ' · Auto ✗'
                          : ''
                      : ''}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasStaffReminders ? editCell : cell}
                    onClick={r.on && r.hasStaffReminders ? open('staffRem', r.key) : undefined}
                    title={
                      r.hasStaffReminders
                        ? 'Rappels staff — notification équipe (jour + heure)'
                        : 'N/A — pas de rappel staff horaire'
                    }
                  >
                    {r.staffReminder}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasEscalation ? editCell : cell}
                    onClick={r.on && r.hasEscalation ? open('escalation', r.key) : undefined}
                    title={
                      r.hasEscalation
                        ? 'Escalade admin si non traité'
                        : 'N/A — pas d’escalade'
                    }
                  >
                    {r.escalation}
                  </Typography>
                  <Box>
                    {r.key === 'concierge' ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled
                        sx={{
                          fontSize: 11,
                          py: 0.35,
                          px: 1,
                          minWidth: 0,
                          textTransform: 'none',
                        }}
                        title="Contenu Conciergerie = onglet Expériences"
                      >
                        Expériences
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SettingsOutlinedIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setConfigModal({ capKey: r.key, tab: 'gestion' })}
                        sx={{
                          fontSize: 11,
                          py: 0.35,
                          px: 1,
                          minWidth: 0,
                          textTransform: 'none',
                          bgcolor: V3.p,
                          boxShadow: 'none',
                          '&:hover': { bgcolor: V3.pd, boxShadow: 'none' },
                        }}
                      >
                        Éditer
                      </Button>
                    )}
                  </Box>
                </Box>
              ))}
              </Box>
            </Box>

            {group.id === 'cleaning' ? (
              <Box
                sx={{
                  mt: 2,
                  pt: 1.5,
                  borderTop: `1px solid ${V3.b}`,
                }}
              >
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => setCleaningChecklistOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCleaningChecklistOpen((v) => !v);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    cursor: 'pointer',
                    userSelect: 'none',
                    py: 0.5,
                    px: 0.25,
                    borderRadius: 1,
                    '&:hover': { bgcolor: V3.alt },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 18,
                      color: V3.t3,
                      transform: cleaningChecklistOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t, lineHeight: 1.3 }}>
                      📋 Checklist staff par catégories
                    </Typography>
                    {!cleaningChecklistOpen ? (
                      <Typography sx={{ fontSize: 10.5, color: V3.t3, mt: 0.15 }}>
                        Repliée · clic pour éditer (FR/DA/EN/AR · thèmes)
                      </Typography>
                    ) : null}
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: 9,
                      fontWeight: 700,
                      color: V3.t4,
                    }}
                  >
                    {cleaningChecklistOpen ? 'ouvert' : 'fermé'}
                  </Typography>
                </Box>
                <Collapse in={cleaningChecklistOpen} unmountOnExit={false}>
                  <Box sx={{ pt: 1 }}>
                    <Typography sx={{ fontSize: 11, color: V3.t3, mb: 1.25, lineHeight: 1.4 }}>
                      Thèmes (Chambres, SDB, Cuisine…) · FR/DA/EN/AR · police compacte. WA Terminer = 1
                      CheckboxGroup / cat sur le même écran (non bloquant au début).
                    </Typography>
                    <CleaningChecklistPanel
                      listingId={listingId || ''}
                      listingValues={listingValues}
                      templateMode={!isListingScope}
                      onListingPatch={async (patch) => {
                        setListingValues((prev) => ({ ...prev, ...patch }));
                        if (!isListingScope) {
                          try {
                            const next = { ...listingValues, ...patch };
                            await listingsService.putListingOwnerConfigTemplateSection(
                              ownerKey,
                              'listing',
                              next,
                            );
                            toast.success('Checklist template enregistrée');
                          } catch (e: unknown) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : 'Enregistrement checklist impossible',
                            );
                            throw e;
                          }
                        }
                      }}
                    />
                  </Box>
                </Collapse>

                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => setCleaningDeclareOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCleaningDeclareOpen((v) => !v);
                    }
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    cursor: 'pointer',
                    userSelect: 'none',
                    py: 0.5,
                    px: 0.25,
                    mt: 1.25,
                    borderRadius: 1,
                    '&:hover': { bgcolor: V3.alt },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 18,
                      color: V3.t3,
                      transform: cleaningDeclareOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t, lineHeight: 1.3 }}>
                      ⚠️ Déclarations problèmes
                    </Typography>
                    {!cleaningDeclareOpen ? (
                      <Typography sx={{ fontSize: 10.5, color: V3.t3, mt: 0.15 }}>
                        Repliée · clic pour éditer (FR/DA/EN/AR · liste plate)
                      </Typography>
                    ) : null}
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: 9,
                      fontWeight: 700,
                      color: V3.t4,
                    }}
                  >
                    {cleaningDeclareOpen ? 'ouvert' : 'fermé'}
                  </Typography>
                </Box>
                <Collapse in={cleaningDeclareOpen} unmountOnExit={false}>
                  <Box sx={{ pt: 1 }}>
                    <Typography sx={{ fontSize: 11, color: V3.t3, mb: 1.25, lineHeight: 1.4 }}>
                      Liste des problèmes à cocher (cassé, tache, fuite…) · même écran Terminer WA.
                    </Typography>
                    <CleaningDeclarePanel
                      listingId={listingId || ''}
                      listingValues={listingValues}
                      templateMode={!isListingScope}
                      onListingPatch={async (patch) => {
                        setListingValues((prev) => ({ ...prev, ...patch }));
                        if (!isListingScope) {
                          try {
                            const next = { ...listingValues, ...patch };
                            await listingsService.putListingOwnerConfigTemplateSection(
                              ownerKey,
                              'listing',
                              next,
                            );
                            toast.success('Déclarations template enregistrées');
                          } catch (e: unknown) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : 'Enregistrement déclarations impossible',
                            );
                            throw e;
                          }
                        }
                      }}
                    />
                  </Box>
                </Collapse>
              </Box>
            ) : null}
          </V3Section>
        ))}

        <V3Section
          icon="📨"
          kind="client"
          title="Messages planifiés"
          subtitle="Auto ou 📨 Manuel (Relancer cockpit) — hors menu"
          open={openGroups.has('messages')}
          onOpenChange={() => toggleGroup('messages')}
          badge={
            <Box
              component="span"
              sx={{
                fontFamily: 'monospace',
                fontSize: 9,
                fontWeight: 700,
                color: messages.some((m) => m.enabled !== false) ? V3.su : V3.t4,
              }}
            >
              {messages.filter((m) => m.enabled !== false).length}/{messages.length} actifs
            </Box>
          }
        >
        <Box sx={{ overflowX: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns:
              '36px minmax(140px,1.25fr) 44px minmax(150px,1.3fr) minmax(110px,1fr) minmax(100px,0.95fr) 0.8fr 0.95fr 0.75fr 0.7fr 88px',
            gap: 0.75,
            alignItems: 'center',
            minWidth: 1240,
          }}
        >
          <Typography sx={head}> </Typography>
          <Typography sx={head}>Message</Typography>
          <Typography sx={head}>ON</Typography>
          <Typography sx={{ ...head, color: V3.t4 }}>—</Typography>
          <Typography sx={head} title="Modèle catalogue + canal d’envoi">
            Canal
          </Typography>
          <Typography sx={head} title="Auto (horaire) ou 📨 Manuel (Relancer cockpit)">
            Quand envoyer
          </Typography>
          <Typography sx={{ ...head, color: V3.t4 }}>—</Typography>
          <Typography sx={{ ...head, color: V3.t4 }}>—</Typography>
          <Typography sx={{ ...head, color: V3.t4 }}>—</Typography>
          <Typography sx={{ ...head, color: V3.t4 }}>—</Typography>
          <Typography sx={head}>Modifier</Typography>

          {messages.length === 0 ? (
            <Typography sx={{ ...cell, gridColumn: '1 / -1', color: V3.t4, py: 1 }}>
              Aucun message planifié — ajoutez-en dans Services &amp; workflows → Messages planifiés.
            </Typography>
          ) : (
            messages.map((m) => {
              const catalogLabel =
                msgCatalog.find((c) => c.id === m.catalogMessageId)?.label ?? m.label;
              return (
                <Box key={m._id} sx={{ display: 'contents' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <KindFlag kind="msg" />
                  </Box>
                  <Typography
                    component="div"
                    sx={{
                      ...cell,
                      fontWeight: 700,
                      color: m.enabled ? V3.t : V3.t4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>💬 {m.label || catalogLabel}</span>
                    {!m.enabled && (
                      <Chip label="Off" size="small" sx={{ height: 16, fontSize: 10 }} />
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Switch
                      size="small"
                      checked={m.enabled !== false}
                      onChange={(e) => patchMessageEnabled(m._id, e.target.checked)}
                      inputProps={{ 'aria-label': `${m.label} actif` }}
                    />
                  </Box>
                  <Typography sx={{ ...cell, color: V3.t4 }}>—</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, alignItems: 'center' }}>
                    <Chip
                      label={catalogLabel}
                      size="small"
                      sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: V3.clientT, color: V3.client }}
                    />
                    <Chip
                      label={messageChannelHuman(m)}
                      size="small"
                      sx={{ height: 18, fontSize: 10, fontWeight: 600 }}
                    />
                  </Box>
                  <Typography
                    component="div"
                    sx={m.enabled !== false ? editCell : { ...cell, opacity: 0.5 }}
                    onClick={
                      m.enabled !== false
                        ? (e) => setMsgEditor({ id: m._id, anchor: e.currentTarget })
                        : undefined
                    }
                    title={
                      m.sendMode === 'manual'
                        ? 'Manuel — Relancer 📨 dans le plan uniquement'
                        : 'Quand envoyer (auto)'
                    }
                  >
                    {messageWhenHuman(m)}
                  </Typography>
                  <Typography sx={{ ...cell, color: V3.t4 }}>—</Typography>
                  <Typography sx={{ ...cell, color: V3.t4 }}>—</Typography>
                  <Typography sx={{ ...cell, color: V3.t4 }}>—</Typography>
                  <Typography sx={{ ...cell, color: V3.t4 }}>—</Typography>
                  <Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => setMsgEditor({ id: m._id, anchor: e.currentTarget })}
                      sx={{ fontSize: 11, py: 0.35, px: 1, minWidth: 0, textTransform: 'none' }}
                    >
                      Quand
                    </Button>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
        </Box>
        </V3Section>
      </Box>

      {renderEditor()}
      {renderMsgEditor()}

      {(() => {
        const dKey = decisionsModal;
        if (!dKey) return null;
        const dDef = getCapabilityDefinition(dKey);
        const dCap = resolveCap(dKey);
        if (!dDef || !dCap) return null;
        const flags = readDecisionFlags(dCap);
        const serviceOn = (() => {
          if (!isListingScope) return dCap.decisions?.managed === true || flags.orchestrated || flags.clientEnabled;
          const act = activationStatus.find((s) => s.serviceId === dKey);
          return act ? act.effectiveEnabled === true : true;
        })();
        const actx = getCapabilityOrchestrationActivities(dDef);
        const hasClient = actx.whatsapp;
        const hasTaskCol = actx.hasOpsTask;
        const hasOrch = dDef.columns.orchestrated !== 'na';
        const onDemand = actx.onDemand;
        const hasClientReminders = actx.clientReminders;
        const hasStaffReminders = actx.staffReminders;
        const hasEscalation = actx.escalation;
        const locked = !serviceOn;

        const toggle = (field: keyof DecisionFlags, value: boolean) => {
          const next = applyDecisionFlagRules({ ...flags, [field]: value }, field);
          if (!hasClientReminders) next.clientReminders = false;
          if (!hasStaffReminders) next.staffReminders = false;
          if (!hasEscalation) next.pmEscalation = false;
          if (!actx.staffAssignment) next.staffAssignment = false;
          if (!actx.staffStartReminder) next.staffStartReminder = false;
          saveDecisionFlags(dKey, next);
        };

        return (
          <Dialog
            open
            onClose={() => setDecisionsModal(null)}
            maxWidth="sm"
            fullWidth
            disableScrollLock
            disableRestoreFocus
            PaperProps={{ sx: { borderRadius: 2 } }}
          >
            <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>
              Décisions · {dDef.emoji} {dDef.label}
              <IconButton
                size="small"
                onClick={() => setDecisionsModal(null)}
                sx={{ position: 'absolute', right: 12, top: 12 }}
                aria-label="Fermer"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {locked && (
                <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12.5 }}>
                  Activez d&apos;abord le service (colonne ON) pour modifier ces décisions.
                </Alert>
              )}
              <Typography sx={{ fontSize: 12, color: V3.t3, mb: 1.5 }}>
                Sur Relances / Assignation / Rappels / Escalade : <b>Auto</b> = horaire + envoi
                scheduler · <b>Manuel</b> = présent au plan, boutons cockpit (pas d&apos;envoi auto).
              </Typography>
              {hasClient && (
                <DecisionSwitch
                  label="👤 Visible WhatsApp"
                  hint="Option menu voyageur"
                  checked={flags.clientEnabled}
                  disabled={locked}
                  onChange={(v) => toggle('clientEnabled', v)}
                  mode="onOff"
                />
              )}
              {hasTaskCol && (
                <DecisionSwitch
                  label="📋 Créer tâche"
                  hint="Créer la tâche ops (sans imposer l’auto-assign)"
                  checked={flags.taskEnabled}
                  disabled={locked}
                  onChange={(v) => toggle('taskEnabled', v)}
                  mode="onOff"
                />
              )}
              {hasClientReminders && (
                <DecisionSwitch
                  label="💌 Relances client"
                  hint="Horaire scheduler vs bouton Relancer"
                  checked={flags.clientReminders}
                  disabled={locked}
                  onChange={(v) => toggle('clientReminders', v)}
                  mode="autoManual"
                />
              )}
              {!hasClientReminders && (hasOrch || hasClient || onDemand) && (
                <Box sx={{ py: 1, borderBottom: `1px solid ${V3.b}` }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: V3.t4 }}>
                    💌 Relances client
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>
                    N/A — pas de relance voyageur pour cette capacité
                  </Typography>
                </Box>
              )}
              {actx.staffAssignment && (
                <DecisionSwitch
                  label="👷 Assignation"
                  hint="Recherche staff à la fenêtre vs bouton Assigner"
                  checked={flags.staffAssignment}
                  disabled={locked || !flags.taskEnabled}
                  onChange={(v) => toggle('staffAssignment', v)}
                  mode="autoManual"
                />
              )}
              {!actx.staffAssignment && hasOrch && (
                <Box sx={{ py: 1, borderBottom: `1px solid ${V3.b}` }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: V3.t4 }}>
                    👷 Assignation
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>
                    N/A — pas de tâche ops staff
                  </Typography>
                </Box>
              )}
              {hasStaffReminders && (
                <DecisionSwitch
                  label="🔔 Rappels staff"
                  hint="Notif à J/heure vs bouton Rappeler"
                  checked={flags.staffReminders}
                  disabled={locked || !flags.taskEnabled}
                  onChange={(v) => toggle('staffReminders', v)}
                  mode="autoManual"
                />
              )}
              {!hasStaffReminders && actx.staffAssignment && (
                <Box sx={{ py: 1, borderBottom: `1px solid ${V3.b}` }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: V3.t4 }}>
                    🔔 Rappels staff
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>
                    N/A — pas de rappel staff horaire pour cette activité
                  </Typography>
                </Box>
              )}
              {actx.staffStartReminder && (
                <DecisionSwitch
                  label="⏰ Rappel début tâche"
                  hint="Une fois : heure de début passée et pas encore commencé — pas d’heure à choisir"
                  checked={flags.staffStartReminder}
                  disabled={locked || !flags.taskEnabled}
                  onChange={(v) => toggle('staffStartReminder', v)}
                  mode="onOff"
                />
              )}
              {hasEscalation && (
                <DecisionSwitch
                  label="🚨 Escalade admin"
                  hint="Alerte à la deadline vs bouton Escalader"
                  checked={flags.pmEscalation}
                  disabled={locked}
                  onChange={(v) => toggle('pmEscalation', v)}
                  mode="autoManual"
                />
              )}
              {!hasEscalation && hasOrch && (
                <Box sx={{ py: 1, borderBottom: `1px solid ${V3.b}` }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: V3.t4 }}>
                    🚨 Escalade admin
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>
                    N/A — pas d’escalade pour cette capacité
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.5 }}>
              <Button onClick={() => setDecisionsModal(null)} sx={{ textTransform: 'none' }}>
                Fermer
              </Button>
              {dKey !== 'concierge' ? (
                <Button
                  variant="contained"
                  onClick={() => {
                    setDecisionsModal(null);
                    setConfigModal({ capKey: dKey, tab: 'gestion' });
                  }}
                  sx={{ textTransform: 'none', bgcolor: V3.p, '&:hover': { bgcolor: V3.pd } }}
                >
                  Configurer le contenu…
                </Button>
              ) : null}
            </DialogActions>
          </Dialog>
        );
      })()}

      <Dialog
        open={Boolean(configModal && configDef)}
        onClose={() => setConfigModal(null)}
        maxWidth="lg"
        fullWidth
        disableScrollLock
        disableRestoreFocus
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '92vh' } }}
      >
        {configDef && configModal && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, pr: 6, fontWeight: 800 }}>
              <Box>
                <Typography component="div" sx={{ fontSize: 18, fontWeight: 800 }}>
                  Configurer · {configDef.emoji} {configDef.label}
                  {listingName ? (
                    <Typography component="span" sx={{ fontSize: 13, fontWeight: 600, color: V3.t3, ml: 1 }}>
                      · {listingName}
                    </Typography>
                  ) : null}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: V3.t3, fontWeight: 500, mt: 0.5 }}>
                  {configHelp}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => {
                  setConfigModal(null);
                }}
                sx={{ position: 'absolute', right: 12, top: 12 }}
                aria-label="Fermer"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 1.5 }}>
              <Box key={`gestion-${configDef.key}-${listingId ?? ownerKey}`}>
                  {configDef.key === 'cleaning_free' || configDef.key === 'cleaning_paid' ? (
                    /* Contenu ménage (durées, prix, niveaux, linge) → onglet Ménage du listing. */
                    <MenageContentRedirectCard
                      listingId={isListingScope ? listingId || undefined : undefined}
                      templateMode={!isListingScope}
                    />
                  ) : configDef.key === 'cleaning_sojori' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Contenu → onglet Ménage du listing ; l'activation du déclenchement
                          checkout reste ici (CleaningSojoriConfigTab via CapabilityGestionPanel). */}
                      <CapabilityGestionPanel
                        def={configDef}
                        scope={isListingScope ? 'listing' : 'owner'}
                        ownerKey={ownerKey}
                        listingId={listingId}
                        listingValues={configGestionValues}
                        onListingPatch={async (patch) => {
                          await onGestionPatch(configDef.key, patch);
                        }}
                        manualSaveMode
                      />
                    </Box>
                  ) : configDef.key === 'receive_arrival' ||
                    configDef.key === 'receive_departure' ? (
                    <V3ReceiveChecklistPanel
                      kind={configDef.key === 'receive_arrival' ? 'arrival' : 'departure'}
                      gestion={configGestionValues}
                      onSave={async (nextGestion) => {
                        await onGestionPatch(configDef.key, nextGestion);
                      }}
                    />
                  ) : configDef.key === 'transport' ? (
                    (() => {
                      const ft = (configGestionValues.flightTracking ?? {}) as {
                        enabled?: boolean;
                        checks?: { j1?: boolean; takeoff?: boolean; landing?: boolean };
                      };
                      const checks = ft.checks ?? {};
                      const save = (next: typeof ft) =>
                        onGestionPatch('transport', { ...configGestionValues, flightTracking: next });
                      const CHECKS = [
                        ['j1', 'J-1 (la veille) — le vol existe, horaire confirmé'],
                        ['takeoff', 'Au décollage — retard confirmé → client et chauffeur prévenus'],
                        ['landing', 'À l’atterrissage — bienvenue + contact du chauffeur'],
                      ] as const;
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Typography sx={{ fontSize: 13, color: V3.t3 }}>
                            Les destinations et prix de la navette se gèrent dans l’onglet
                            listing <b>Expériences</b>. Ici : la politique de <b>suivi du vol</b> —
                            chaque vérification a un coût, chaque client choisit les siennes.
                          </Typography>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={ft.enabled === true}
                                onChange={(e) =>
                                  save({
                                    enabled: e.target.checked,
                                    checks: e.target.checked
                                      ? { j1: true, takeoff: true, landing: true, ...checks }
                                      : checks,
                                  })
                                }
                              />
                            }
                            label="Appliquer le suivi du vol aux courses navette"
                          />
                          {ft.enabled === true ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 1 }}>
                              {CHECKS.map(([k, label]) => (
                                <FormControlLabel
                                  key={k}
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={checks[k] !== false}
                                      onChange={(e) =>
                                        save({
                                          ...ft,
                                          checks: { ...checks, [k]: e.target.checked },
                                        })
                                      }
                                    />
                                  }
                                  label={<Typography sx={{ fontSize: 13 }}>{label}</Typography>}
                                />
                              ))}
                              <Typography sx={{ fontSize: 12, color: V3.t3, mt: 0.5 }}>
                                Le moteur de suivi (cron 3 passes, notifications) arrive avec le
                                chantier Vols — cette configuration sera lue telle quelle.
                              </Typography>
                            </Box>
                          ) : null}
                        </Box>
                      );
                    })()
                  ) : configDef.key === 'arrival_journey' ? (
                    <V3ArrivalJourneyPanel
                      receptionMode={
                        (listingValues as { receptionMode?: string })?.receptionMode ??
                        (configGestionValues as { receptionMode?: string })?.receptionMode
                      }
                    />
                  ) : configDef.key === 'inform_syndic' ? (
                    <V3InformSyndicPanel
                      gestion={configGestionValues}
                      listingId={listingId}
                      listingValues={listingValues}
                      ownerTemplateMode={!isListingScope}
                      onSave={async (nextGestion) => {
                        await onGestionPatch(configDef.key, nextGestion);
                      }}
                      onSyndicsSaved={(next) => {
                        setListingValues((prev) => ({ ...prev, syndics: next }));
                      }}
                    />
                  ) : (
                    <CapabilityGestionPanel
                      def={configDef}
                      scope={isListingScope ? 'listing' : 'owner'}
                      ownerKey={ownerKey}
                      listingId={listingId}
                      listingValues={configGestionValues}
                      onListingPatch={async (patch) => {
                        await onGestionPatch(configDef.key, patch);
                      }}
                      manualSaveMode
                    />
                  )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
