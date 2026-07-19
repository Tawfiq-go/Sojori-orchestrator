import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { toast } from 'react-toastify';
import {
  CAPABILITY_GROUPS,
  CAPABILITY_REGISTRY,
  getCapabilityDefinition,
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
import V3CleaningIncludedPanel from './V3CleaningIncludedPanel';
import OrchestrationGlobalSwitch from './OrchestrationGlobalSwitch';
import { V3 } from './theme';

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
  let anchor: TimingAnchor = fallbackAnchor;
  if (fromRef.includes('checkout') || toRef.includes('checkout')) anchor = 'checkout';
  else if (fromRef.includes('checkin') || toRef.includes('checkin')) anchor = 'checkin';

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
  let s: string;
  if (start?.ref === 'task_created') s = 'Immédiat';
  else if (start?.day != null) {
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
    staffAssignment?: Record<string, unknown> | null;
    escalationEnabled?: boolean;
    deadline?: Record<string, unknown> | null;
  } | null;
};

/** Résumé lisible de ce qui est déjà configuré (gestion + WA). */
function configHints(cap: CapDoc, key: string): string[] {
  const g = (cap.gestion ?? {}) as Record<string, unknown>;
  const hints: string[] = [];

  if (key === 'cleaning_free' || key === 'cleaning_paid' || key === 'cleaning_sojori') {
    const freq = Array.isArray(g.frequency) ? g.frequency : [];
    const slots = Array.isArray(g.timeSlots)
      ? g.timeSlots
      : Array.isArray(g.TS_CLEAN)
        ? g.TS_CLEAN
        : [];
    const extras = Array.isArray(g.extras)
      ? (g.extras as Array<{ enabled?: boolean }>).filter((e) => e.enabled !== false)
      : [];
    if (freq.length) hints.push(`${freq.length} palier${freq.length > 1 ? 's' : ''}`);
    if (slots.length) hints.push(`${slots.length} créneau${slots.length > 1 ? 'x' : ''}`);
    if (extras.length) hints.push(`${extras.length} option${extras.length > 1 ? 's' : ''}`);
  }

  if (key === 'concierge') {
    const services = (
      Array.isArray(g.services) ? g.services : Array.isArray(g.customServices) ? g.customServices : []
    ) as Array<{ enabled?: boolean }>;
    const on = services.filter((s) => s.enabled !== false);
    if (on.length) hints.push(`${on.length} service${on.length > 1 ? 's' : ''}`);
    else if (services.length) hints.push(`${services.length} au catalogue`);
  }

  if (key === 'transport') {
    const zones = Array.isArray(g.transportServices)
      ? g.transportServices
      : Array.isArray(g.zones)
        ? g.zones
        : Array.isArray(g.routes)
          ? g.routes
          : [];
    if (zones.length) hints.push(`${zones.length} trajet${zones.length > 1 ? 's' : ''} / prix`);
  }

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

  if (key === 'cleaning_paid') {
    const paid = g.paidCleaningConfig as { services?: unknown[] } | null | undefined;
    const services = Array.isArray(paid?.services) ? paid.services : Array.isArray(g.services) ? g.services : [];
    if (services.length) hints.push(`${services.length} offre${services.length > 1 ? 's' : ''} payante${services.length > 1 ? 's' : ''}`);
  }

  const codes = cap.whatsapp?.menuCodes;
  if (Array.isArray(codes) && codes.length) hints.push(`menu ${codes.join('·')}`);

  return hints;
}

const HOURS = ['08:00', '09:00', '10:00', '11:00', '14:00', '16:00', '18:00'] as const;

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
  arrival_choose: 'staff_reminder_arrival',
  departure_choose: 'staff_reminder_departure',
  cleaning_free: 'staff_reminder_cleaning',
  cleaning_paid: 'staff_reminder_cleaning',
  checkout_cleaning: 'staff_reminder_cleaning',
  transport: 'staff_reminder_transport',
  groceries: 'staff_reminder_groceries',
  concierge: 'staff_reminder_concierge',
  support: 'staff_reminder_support',
  service_client: 'staff_reminder_service_client',
};

function defaultRefForTask(taskType: string): string {
  if (taskType === 'arrival_choose' || taskType === 'registration' || taskType === 'arrival_declare') return 'checkin';
  if (taskType === 'departure_choose' || taskType === 'departure_declare' || taskType === 'checkout_cleaning') return 'checkout';
  if (taskType === 'support' || taskType === 'service_client') return 'task_created';
  return 'scheduledDate';
}

/** Flags décisions du popup apercu (ops/staff = taskEnabled). */
type DecisionFlags = {
  orchestrated: boolean;
  clientEnabled: boolean;
  taskEnabled: boolean;
  clientReminders: boolean;
  staffReminders: boolean;
  pmEscalation: boolean;
};

function readDecisionFlags(cap: CapDoc): DecisionFlags {
  const d = cap.decisions ?? {};
  const exec = cap.execution ?? {};
  const reminders = exec.reminders ?? [];
  const staffRem = exec.staffReminders ?? [];
  return {
    orchestrated: d.orchestrated === true,
    clientEnabled: d.clientEnabled === true,
    taskEnabled: d.taskEnabled === true,
    clientReminders: reminders.length > 0,
    staffReminders: staffRem.length > 0,
    pmEscalation: exec.escalationEnabled === true,
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
    next.staffReminders = false;
  }
  if (changed === 'staffReminders' && next.staffReminders && !next.taskEnabled) {
    next.taskEnabled = true;
  }
  return next;
}

function buildExecutionFromFlags(
  cap: CapDoc,
  flags: DecisionFlags,
  taskType: string,
  opts?: { onDemand?: boolean },
): NonNullable<CapDoc['execution']> {
  const prev = cap.execution ?? { enabled: true };
  const ref = defaultRefForTask(taskType);
  let reminders = [...(prev.reminders ?? [])];
  let staffReminders = [...(prev.staffReminders ?? [])];
  let staffAssignment = prev.staffAssignment ?? null;
  let deadline = prev.deadline ?? null;
  let escalationEnabled = flags.pmEscalation;

  // À la demande (ménage payant, conciergerie…) : jamais de relances client.
  if (opts?.onDemand || !flags.clientReminders) {
    reminders = [];
  } else if (reminders.length === 0) {
    reminders = [
      {
        ref,
        day: -1,
        time: '10:00',
        label: 'Relance J-1',
        messageId: CLIENT_MSG_ID[taskType] ?? '',
      },
    ];
  }

  if (!flags.taskEnabled) {
    staffAssignment = null;
    staffReminders = [];
  } else if (!flags.staffReminders) {
    staffReminders = [];
  } else if (staffReminders.length === 0) {
    staffReminders = [
      {
        label: 'Rappel J-1',
        ref,
        day: -1,
        time: '11:00',
        messageId: STAFF_MSG_ID[taskType] ?? '',
      },
    ];
  }

  if (!flags.pmEscalation) {
    escalationEnabled = false;
  } else if (!deadline) {
    deadline =
      taskType === 'support' || taskType === 'service_client'
        ? { ref: 'task_created', hours: 4 }
        : { ref, day: -1, time: '11:00' };
    escalationEnabled = true;
  }

  return {
    ...prev,
    enabled: flags.orchestrated !== false,
    reminders,
    staffReminders,
    staffAssignment,
    deadline,
    escalationEnabled,
  };
}

function DecisionSwitch({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
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
        label={checked ? 'ON' : 'OFF'}
        labelPlacement="start"
        sx={{
          m: 0,
          gap: 0.5,
          '& .MuiFormControlLabel-label': {
            fontSize: 11,
            fontWeight: 800,
            color: checked ? V3.su : V3.t4,
            minWidth: 28,
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

function HourSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = HOURS.includes(value as (typeof HOURS)[number]) ? [...HOURS] : [value, ...HOURS];
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
    const decisions = {
      managed: true,
      clientEnabled: flags.clientEnabled,
      // Colonne ON = master ; plus de bouton Orchestrer en UI.
      orchestrated: true,
      taskEnabled: def.columns.task === 'na' ? false : flags.taskEnabled,
    };
    const onDemand = isOnDemandCapability(def);
    const execution = buildExecutionFromFlags(
      cap,
      onDemand ? { ...flags, clientReminders: false } : flags,
      taskType,
      { onDemand },
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
    const isDeparture = taskType === 'departure_choose' || taskType === 'departure_declare';
    const close = () => setEditor(null);

    let body: JSX.Element | null = null;

    if (editor.kind === 'availability') {
      const av = (cap.whatsapp?.menuOptions?.[0]?.availability ?? { type: 'always' }) as Availability;
      const fallbackAnchor: TimingAnchor =
        taskType === 'departure_choose' || taskType === 'departure_declare' ? 'checkout' : 'checkin';
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
            J-n = n jours avant {anchorLabel}. J0 = le jour. Fin = jusqu’au départ. J+1 = lendemain du
            départ. WhatsApp utilise ces bornes pour afficher / masquer l’option menu.
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
      const auto = (sa as { autoAssign?: boolean } | null)?.autoAssign === true;
      const startTime = String(start?.time ?? '09:00');
      const endTime = String(end?.time ?? '18:00');
      const startDay = start?.ref === 'task_created' ? -3 : Number(start?.day ?? -3);
      const endDay = end?.day != null ? Number(end.day) : startDay === 0 ? 0 : 0;
      const mode: 'immediate' | 'none' | 'window' = !sa
        ? 'none'
        : start?.ref === 'task_created'
          ? 'immediate'
          : 'window';
      const ASSIGN_DAYS = [-7, -6, -5, -4, -3, -2, -1, 0] as const;
      const ASSIGN_END_DAYS = [-7, -6, -5, -4, -3, -2, -1, 0, 1] as const;
      const dayLabel = (d: number) => (d === 0 ? 'J0' : d > 0 ? `J+${d}` : `J${d}`);
      const base = {
        releaseWindows: (sa as { releaseWindows?: string[] } | null)?.releaseWindows ?? ['11:00', '16:00'],
        releaseMode: (sa as { releaseMode?: string } | null)?.releaseMode ?? 'tolerance',
        acceptToleranceHours: (sa as { acceptToleranceHours?: number } | null)?.acceptToleranceHours ?? 3,
        assignmentHoursMode: (sa as { assignmentHoursMode?: string } | null)?.assignmentHoursMode ?? 'planning',
      };
      const write = (opts: {
        mode?: 'immediate' | 'none' | 'window';
        startDay?: number;
        startTime?: string;
        endDay?: number;
        endTime?: string;
        auto?: boolean;
      }) => {
        const nextMode = opts.mode ?? mode;
        const nextAuto = opts.auto ?? auto;
        if (nextMode === 'none') return patchExecution(editor.capKey, { staffAssignment: null });
        if (nextMode === 'immediate') {
          return patchExecution(editor.capKey, {
            staffAssignment: {
              ...base,
              autoAssign: nextAuto,
              findAnotherStaff: !nextAuto,
              startAt: { ref: 'task_created' },
            },
          });
        }
        const sd = opts.startDay ?? startDay;
        const st = opts.startTime ?? startTime;
        let ed = opts.endDay ?? (end?.day != null ? endDay : Math.max(sd, 0));
        if (ed < sd) ed = sd;
        const et = opts.endTime ?? endTime;
        patchExecution(editor.capKey, {
          staffAssignment: {
            ...base,
            autoAssign: nextAuto,
            findAnotherStaff: !nextAuto,
            startAt: { ref, day: sd, time: st },
            endAt: { ref, day: ed, time: et },
          },
        });
      };
      body = (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>MODE</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <SegChip on={mode === 'immediate'} label="Immédiat" onClick={() => write({ mode: 'immediate' })} />
            <SegChip
              on={mode === 'window'}
              label="Fenêtre"
              onClick={() => write({ mode: 'window', startDay, endDay: Math.max(endDay, startDay) })}
            />
            <SegChip on={mode === 'none'} label="—" onClick={() => write({ mode: 'none' })} />
          </Box>
          {mode === 'window' && (
            <>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>DÉBUT (1ʳᵉ tentative)</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {ASSIGN_DAYS.map((d) => (
                  <SegChip
                    key={`s${d}`}
                    on={startDay === d}
                    label={dayLabel(d)}
                    onClick={() => write({ mode: 'window', startDay: d })}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure début</Typography>
                <HourSelect value={startTime} onChange={(t) => write({ mode: 'window', startTime: t })} />
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>FIN (arrêt assignation)</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {ASSIGN_END_DAYS.filter((d) => d >= startDay).map((d) => (
                  <SegChip
                    key={`e${d}`}
                    on={endDay === d}
                    label={dayLabel(d)}
                    onClick={() => write({ mode: 'window', endDay: d })}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure fin</Typography>
                <HourSelect value={endTime} onChange={(t) => write({ mode: 'window', endTime: t })} />
              </Box>
            </>
          )}
          {mode !== 'none' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Switch
                size="small"
                checked={auto}
                onChange={(e) => write({ mode, auto: e.target.checked })}
              />
              <Typography sx={{ fontSize: 12, color: V3.t2 }}>
                Auto-accepté (assigné sans acceptation staff)
              </Typography>
            </Box>
          )}
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
            <SegChip on={day == null} label="—" onClick={() => write(null, time)} />
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Switch
              size="small"
              checked={escOn}
              onChange={(e) => {
                if (!e.target.checked) {
                  writeDay(false, day ?? 1, time);
                  return;
                }
                if (postCreate) {
                  if (hours != null) writeHours(true, hours);
                  else writeDay(true, day ?? 1, time);
                } else {
                  writeDay(true, day ?? -1, time);
                }
              }}
            />
            <Typography sx={{ fontSize: 12, color: V3.t2 }}>Alerter l&apos;admin (escalade)</Typography>
          </Box>
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

    return (
      <Popover
        open
        anchorEl={editor.anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, maxWidth: editor.kind === 'assign' ? 440 : 380 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t, mb: 1 }}>
            {def.emoji} {def.label}
          </Typography>
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
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>RÉFÉRENCE</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>DÉLAI</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
          {unit === 'days' && (
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
        const hasClient = def.columns.client !== 'na';
        const hasTaskCol = def.columns.task !== 'na' && Boolean(def.taskType);
        const hasOrch = def.columns.orchestrated !== 'na';
        const onDemand = isOnDemandCapability(def);
        const hasClientReminders = hasOrch && !onDemand;
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
          hasClientReminders,
          onDemand,
          flags: onDemand ? { ...flags, clientReminders: false } : flags,
          hints,
          availability: on
            ? hasClient
              ? availabilityHuman(cap.whatsapp?.menuOptions?.[0]?.availability as Availability)
              : '—'
            : 'Off',
          reminders: reminders.length
            ? `${daysHuman(reminders.map((r) => Number(r.day ?? 0)))} à ${hourOf(String(reminders[0]?.time ?? ''))}`
            : '—',
          assign: sa ? assignHuman(sa) : '—',
          autoAssign: sa ? (sa as { autoAssign?: boolean }).autoAssign === true : null,
          staffReminder: staffRem.length
            ? `${daysHuman(staffRem.map((r) => Number(r.day ?? 0)))} à ${hourOf(String(staffRem[0]?.time ?? ''))}`
            : '—',
          escalation: escalationHuman(escOn, dl),
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
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
      id: g,
      label: CAPABILITY_GROUPS[g],
      rows: byGroup.get(g)!,
    }));
  }, [rows]);

  const configGestionValues = useMemo(() => {
    if (!configModal) return {};
    const capGestion = (caps[configModal.capKey]?.gestion ?? {}) as Record<string, unknown>;
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
      case 'cleaning_paid':
      case 'cleaning_sojori':
        return 'Éditez les paliers de durée, créneaux horaires et options — puis Enregistrer.';
      case 'transport':
        return 'Ajoutez des trajets et fixez le prix de chaque course — puis Enregistrer.';
      case 'concierge':
        return 'Choisissez les services conciergerie du catalogue, tarifs et détails — puis Enregistrer.';
      case 'groceries':
        return 'Configurez les articles / paniers courses et leurs prix — puis Enregistrer.';
      default:
        return configDef.gestionHint || 'Modifiez la configuration puis Enregistrer.';
    }
  })();

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <OrchestrationGlobalSwitch
        checked={orchestrationEnabled}
        disabled={saving}
        scope={isListingScope ? 'listing' : 'owner'}
        onChange={(v) => void persistOrchestrationGlobal(v)}
      />

      <Alert severity="info" sx={{ fontSize: 12.5 }}>
        <strong>ON</strong> active le service (et le plan). <strong>Décisions</strong> : WhatsApp /
        Créer tâche / Relances / Rappel staff / Escalade. <strong>Visibilité WA</strong> = quand le
        menu apparaît au voyageur. Créer tâche OFF ⇒ pas d&apos;équipe — relances &amp; escalade OK.
        {!orchestrationEnabled ? (
          <>
            {' '}
            <strong style={{ color: '#9b1c1c' }}>
              Orchestration globale coupée — aucun plan / tâche / message auto.
            </strong>
          </>
        ) : null}
      </Alert>

      <Box sx={{ border: `1px solid ${V3.b}`, borderRadius: 2, p: 2, bgcolor: V3.card, overflowX: 'auto' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: V3.t, mb: 1.25 }}>
          Flows &amp; messages — config d&apos;ensemble
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns:
              '36px minmax(140px,1.25fr) 44px minmax(150px,1.3fr) minmax(110px,1fr) minmax(100px,0.95fr) 0.8fr 0.95fr 0.7fr 88px',
            gap: 0.75,
            alignItems: 'center',
            minWidth: 1120,
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
          <Typography sx={head} title="Fenêtre d’assignation équipe + auto-accept">
            Assignation
          </Typography>
          <Typography sx={head} title="Alerte admin si non traité à temps">
            Escalade
          </Typography>
          <Typography sx={head} title="Ouvrir la fiche de configuration">
            Éditer
          </Typography>

          {groupedRows.map((group, gi) => (
            <Box key={group.id} sx={{ display: 'contents' }}>
              <Typography
                sx={{
                  ...head,
                  gridColumn: '1 / -1',
                  mt: gi === 0 ? 0.5 : 1.25,
                  mb: 0.25,
                  color: V3.t,
                  fontSize: 11.5,
                  bgcolor: V3.alt,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                {group.label}
                <Box component="span" sx={{ ml: 1, fontWeight: 600, color: V3.t3, fontSize: 10.5 }}>
                  · flows
                </Box>
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
                    title="WhatsApp · Créer tâche · Relances · Staff · Escalade"
                  >
                    {(
                      [
                        r.hasClient && { on: r.flags.clientEnabled, label: 'WA' },
                        r.hasTaskCol && { on: r.flags.taskEnabled, label: 'Tâche' },
                        r.hasClientReminders && { on: r.flags.clientReminders, label: 'Rel' },
                        r.hasTaskCol && { on: r.flags.staffReminders, label: 'Staff' },
                        r.hasTaskCol && { on: r.flags.pmEscalation, label: 'Esc' },
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
                      ...editCell,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.35,
                      minHeight: 28,
                      alignItems: 'center',
                      py: 0.25,
                    }}
                    onClick={() => setConfigModal({ capKey: r.key, tab: 'gestion' })}
                    title="Contenu (prix, créneaux, catalogue…)"
                  >
                    {r.hints.length === 0 ? (
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
                    title="Visibilité WhatsApp — fenêtre proposée au voyageur"
                  >
                    {r.availability}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasClientReminders && r.hasTask ? editCell : cell}
                    onClick={
                      r.on && r.hasClientReminders && r.hasTask
                        ? open('reminders', r.key)
                        : undefined
                    }
                    title={
                      r.onDemand
                        ? 'Pas de relances client (à la demande / ménage Sojori)'
                        : 'Relances client (voyageur)'
                    }
                  >
                    {r.onDemand ? 'N/A' : r.reminders}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasTask ? editCell : cell}
                    onClick={r.on && r.hasTask ? open('assign', r.key) : undefined}
                    title="Assignation staff — début / fin / auto-accept"
                  >
                    {r.assign}
                    {r.autoAssign != null && r.assign !== '—' && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: 11, color: r.autoAssign ? V3.task : V3.t4 }}>
                        · Auto {r.autoAssign ? '✓' : '✗'}
                      </Box>
                    )}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasTask ? editCell : cell}
                    onClick={r.on && r.hasTask ? open('escalation', r.key) : undefined}
                    title="Escalade admin si non traité"
                  >
                    {r.escalation}
                  </Typography>
                  <Box>
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
                  </Box>
                </Box>
              ))}
            </Box>
          ))}

          <Typography
            sx={{
              ...head,
              gridColumn: '1 / -1',
              mt: 1.5,
              mb: 0.25,
              color: V3.t,
              fontSize: 11.5,
              bgcolor: V3.clientT,
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            Messages planifiés
            <Box component="span" sx={{ ml: 1, fontWeight: 600, color: V3.t3, fontSize: 10.5 }}>
              · envois automatiques (hors menu)
            </Box>
          </Typography>

          {/* En-têtes adaptés messages (même grille que les flows) */}
          <Typography sx={head}> </Typography>
          <Typography sx={head}>Message</Typography>
          <Typography sx={head}>ON</Typography>
          <Typography sx={{ ...head, color: V3.t4 }}>—</Typography>
          <Typography sx={head} title="Modèle catalogue + canal d’envoi">
            Canal
          </Typography>
          <Typography sx={head} title="Référence + délai + heure d’envoi">
            Quand envoyer
          </Typography>
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
                    title="Quand envoyer"
                  >
                    {messageWhenHuman(m)}
                  </Typography>
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
        const hasClient = dDef.columns.client !== 'na';
        const hasTaskCol = dDef.columns.task !== 'na' && Boolean(dDef.taskType);
        const hasOrch = dDef.columns.orchestrated !== 'na';
        const onDemand = isOnDemandCapability(dDef);
        const hasClientReminders = hasOrch && !onDemand;
        const locked = !serviceOn;

        const toggle = (field: keyof DecisionFlags, value: boolean) => {
          const next = applyDecisionFlagRules({ ...flags, [field]: value }, field);
          if (onDemand) next.clientReminders = false;
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
                ON = service + plan. Créer tâche OFF ⇒ pas d&apos;équipe assignée — les relances
                client et l&apos;escalade admin restent possibles.
              </Typography>
              {hasClient && (
                <DecisionSwitch
                  label="👤 Visible WhatsApp"
                  hint="Option menu voyageur"
                  checked={flags.clientEnabled}
                  disabled={locked}
                  onChange={(v) => toggle('clientEnabled', v)}
                />
              )}
              {hasTaskCol && (
                <DecisionSwitch
                  label="📋 Créer tâche"
                  hint="Assigner l’équipe et suivre dans les tâches"
                  checked={flags.taskEnabled}
                  disabled={locked}
                  onChange={(v) => toggle('taskEnabled', v)}
                />
              )}
              {hasClientReminders && (
                <DecisionSwitch
                  label="💌 Relances client"
                  hint="Rappels voyageur automatiques"
                  checked={flags.clientReminders}
                  disabled={locked}
                  onChange={(v) => toggle('clientReminders', v)}
                />
              )}
              {onDemand && hasOrch && (
                <Box sx={{ py: 1, borderBottom: `1px solid ${V3.b}` }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: V3.t4 }}>
                    💌 Relances client
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: V3.t3 }}>
                    N/A — pas de relance voyageur (à la demande / ménage Sojori)
                  </Typography>
                </Box>
              )}
              {hasTaskCol && (
                <DecisionSwitch
                  label="👷 Rappel staff"
                  hint="Notif équipe (nécessite Créer tâche)"
                  checked={flags.staffReminders}
                  disabled={locked || !flags.taskEnabled}
                  onChange={(v) => toggle('staffReminders', v)}
                />
              )}
              {hasTaskCol && (
                <DecisionSwitch
                  label="🚨 Escalade admin"
                  hint="Alerte admin si deadline dépassée"
                  checked={flags.pmEscalation}
                  disabled={locked}
                  onChange={(v) => toggle('pmEscalation', v)}
                />
              )}
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.5 }}>
              <Button onClick={() => setDecisionsModal(null)} sx={{ textTransform: 'none' }}>
                Fermer
              </Button>
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
              <Tabs
                value={configModal.tab}
                onChange={(_, v) => setConfigModal({ ...configModal, tab: v })}
                sx={{ mb: 2, minHeight: 36 }}
              >
                <Tab value="gestion" label="Éditer la config" sx={{ textTransform: 'none', minHeight: 36, fontWeight: 700 }} />
                {configDef.menuCodes.length > 0 && (
                  <Tab value="wa" label="WhatsApp voyageur" sx={{ textTransform: 'none', minHeight: 36 }} />
                )}
              </Tabs>

              {configModal.tab === 'gestion' && (
                <Box key={`gestion-${configDef.key}-${listingId ?? ownerKey}`}>
                  {configDef.key === 'cleaning_free' ? (
                    <V3CleaningIncludedPanel
                      gestion={configGestionValues}
                      listingValues={listingValues}
                      onSave={async (nextGestion) => {
                        await onGestionPatch(configDef.key, nextGestion);
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
              )}

              {configModal.tab === 'wa' && (
                <Box key={`wa-${configDef.key}-${listingId ?? ownerKey}`}>
                  <CapabilityWhatsAppPanel
                    def={configDef}
                    scope={isListingScope ? 'listing' : 'owner'}
                    ownerKey={ownerKey}
                    listingId={listingId}
                    orchestrationDoc={isListingScope ? (doc as ListingOrchestrationDoc) : undefined}
                    ownerOrchestrationDoc={
                      isListingScope ? undefined : (doc as OwnerOrchestrationDoc)
                    }
                    onOrchestrationSaved={() => {
                      void reload();
                    }}
                    onWhatsappPatch={() => {
                      void reload();
                    }}
                  />
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
