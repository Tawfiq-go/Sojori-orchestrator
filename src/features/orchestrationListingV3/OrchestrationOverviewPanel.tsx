import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
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
  type CapabilityGroupId,
} from '../serviceMatrix/capabilityRegistry';
import {
  CapabilityGestionPanel,
  CapabilityWhatsAppPanel,
} from '../serviceMatrix/CapabilityMatrixConfigPanels';
import listingsService from '../../services/listingsService';
import * as fulltaskApi from '../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../utils/unwrapFulltaskResponse';
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
import V3CleaningIncludedPanel from './V3CleaningIncludedPanel';
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
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<{ kind: EditorKind; capKey: string; anchor: HTMLElement } | null>(null);
  const [configModal, setConfigModal] = useState<{ capKey: string; tab: 'gestion' | 'wa' } | null>(null);
  const [listingValues, setListingValues] = useState<Record<string, unknown>>({});
  const [activationStatus, setActivationStatus] = useState<ServiceActivationStatusEntry[]>([]);

  const reload = useCallback(() => {
    setLoading(true);
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

    loadMatrix
      .then(async (d) => {
        setDoc(d);
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
        let msgs = (d.scheduledMessages ?? []) as Array<Record<string, unknown>>;
        if (!msgs.length && !listingId) {
          try {
            const raw = await fulltaskApi.getOrchestrationConfig(ownerKey, { strictOwner: true });
            const ft = unwrapFulltaskData<{ scheduledMessages?: Array<Record<string, unknown>> }>(raw);
            msgs = ft?.scheduledMessages ?? [];
          } catch {
            msgs = [];
          }
        }
        setMessages(msgs);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, [ownerKey, listingId]);

  useEffect(() => {
    reload();
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
        if (listingId) {
          await listingsService.putListingOrchestration(listingId, {
            capabilities: { [capKey]: payload },
          });
        } else {
          await listingsService.putOwnerOrchestration(ownerKey, {
            capabilities: { [capKey]: payload },
          });
        }
        setDoc((prev) =>
          prev
            ? {
                ...prev,
                capabilities: {
                  ...prev.capabilities,
                  [capKey]: { ...cap, ...patch } as never,
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
          toast.success(value ? 'Service activé pour cette annonce' : 'Service désactivé pour cette annonce');
          reload();
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
    if (field === 'managed' && !value) {
      next.clientEnabled = false;
    }
    void saveCapPatch(capKey, { decisions: next });
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

  /* ── éditeurs ── */

  const patchAvailability = (capKey: string, av: Record<string, unknown>) => {
    const cap = caps[capKey];
    const menuOptions = (cap.whatsapp?.menuOptions ?? []).map((o) => ({ ...o, availability: av }));
    void saveCapPatch(capKey, { whatsapp: { ...cap.whatsapp, menuOptions } });
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
      const refBase = isDeparture ? 'before_checkout' : 'before_checkin';
      const dayRef = (av?.from?.reference ?? '') as string;
      const curStart: 'toujours' | 'resa' | number =
        av?.type === 'always' ? 'toujours'
        : av?.type === 'after_booking_confirmed' || (!av?.from && (av?.type === 'time_window' || av?.type === 'conditional_and_time'))
          ? 'resa'
          : Number(av?.from?.value ?? 3);
      const curEnd = av?.to;
      const mkTo = (fin: 'J-1' | 'J0' | 'depart') =>
        fin === 'depart'
          ? { unit: 'days', value: 0, reference: 'after_checkout' }
          : fin === 'J0'
            ? { unit: 'days', value: 0, reference: isDeparture ? 'on_checkout_day' : 'on_checkin_day' }
            : { unit: 'days', value: 1, reference: refBase };
      const curFin: 'J-1' | 'J0' | 'depart' =
        (curEnd?.reference ?? '').startsWith('on_') ? 'J0'
        : curEnd?.reference === 'after_checkout' || !curEnd ? 'depart'
        : 'J-1';
      const curReqs = requiresList(av);
      /** Construit l'availability : base début/fin, puis conditions (ET) si présentes. */
      const writeAv = (start: 'toujours' | 'resa' | number, fin: 'J-1' | 'J0' | 'depart', reqs: string[]) => {
        let base: Record<string, unknown>;
        if (start === 'toujours') base = { type: 'always' };
        else if (start === 'resa') {
          base = fin === 'depart' ? { type: 'after_booking_confirmed' } : { type: 'time_window', to: mkTo(fin) };
        } else {
          base = { type: 'time_window', from: { unit: 'days', value: start, reference: refBase }, to: mkTo(fin) };
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
      const setStart = (start: 'toujours' | 'resa' | number) => writeAv(start, curFin, curReqs);
      const setFin = (fin: 'J-1' | 'J0' | 'depart') => {
        if (curStart === 'toujours') return;
        writeAv(curStart, fin, curReqs);
      };
      const toggleReq = (id: string) => {
        const next = curReqs.includes(id) ? curReqs.filter((r) => r !== id) : [...curReqs, id];
        writeAv(curStart, curFin, next);
      };
      body = (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>DÉBUT</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <SegChip on={curStart === 'toujours'} label="Toujours" onClick={() => setStart('toujours')} />
            <SegChip on={curStart === 'resa'} label="À la réservation" onClick={() => setStart('resa')} />
            {[7, 3, 2, 1].map((d) => (
              <SegChip key={d} on={curStart === d} label={`J-${d}`} onClick={() => setStart(d)} />
            ))}
          </Box>
          {curStart !== 'toujours' && (
            <>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>FIN</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <SegChip on={curFin === 'J-1'} label={isDeparture ? 'J-1 (veille)' : 'J-1'} onClick={() => setFin('J-1')} />
                <SegChip on={curFin === 'J0'} label={isDeparture ? 'Jour du départ' : 'J0'} onClick={() => setFin('J0')} />
                <SegChip on={curFin === 'depart'} label="Départ" onClick={() => setFin('depart')} />
              </Box>
            </>
          )}
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: V3.t3 }}>
            CONDITIONS REQUISES (toutes — ET)
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {REQUIRE_EVENTS.map((ev) => (
              <SegChip key={ev.id} on={curReqs.includes(ev.id)} label={ev.label} onClick={() => toggleReq(ev.id)} />
            ))}
          </Box>
          <Typography sx={{ fontSize: 11, color: V3.t4 }}>
            Le voyageur doit avoir complété chaque condition cochée avant de voir l&apos;option
            (ex. codes d&apos;accès : E + D1). Aucune coche = pas de condition.
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
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[-3, -2, -1, 0].map((d) => (
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
      const end = sa?.endAt as Record<string, unknown> | undefined;
      const ref = String(start?.ref && start.ref !== 'task_created' ? start.ref : defaultRefForTask(taskType));
      const auto = (sa as { autoAssign?: boolean } | null)?.autoAssign === true;
      const time = String(start?.time ?? '09:00');
      const base = {
        releaseWindows: (sa as { releaseWindows?: string[] } | null)?.releaseWindows ?? ['11:00', '16:00'],
        releaseMode: (sa as { releaseMode?: string } | null)?.releaseMode ?? 'tolerance',
        acceptToleranceHours: (sa as { acceptToleranceHours?: number } | null)?.acceptToleranceHours ?? 3,
        assignmentHoursMode: (sa as { assignmentHoursMode?: string } | null)?.assignmentHoursMode ?? 'planning',
      };
      const curState: 'immediate' | 'none' | number =
        !sa ? 'none' : start?.ref === 'task_created' ? 'immediate' : Number(start?.day ?? -3) === 0 ? 0 : Number(start?.day ?? -3);
      const write = (state: 'immediate' | 'none' | number, opts?: { time?: string; auto?: boolean }) => {
        const nextAuto = opts?.auto ?? auto;
        const nextTime = opts?.time ?? time;
        if (state === 'none') return patchExecution(editor.capKey, { staffAssignment: null });
        if (state === 'immediate') {
          return patchExecution(editor.capKey, {
            staffAssignment: { ...base, autoAssign: nextAuto, findAnotherStaff: !nextAuto, startAt: { ref: 'task_created' } },
          });
        }
        const day = Number(state);
        const startAt = { ref, day, time: nextTime };
        const endAt = day === 0
          ? { ref, day: 0, time: '18:00' }
          : (end ?? { ref, day: -1, time: '11:00' });
        patchExecution(editor.capKey, {
          staffAssignment: { ...base, autoAssign: nextAuto, findAnotherStaff: !nextAuto, startAt, endAt },
        });
      };
      body = (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <SegChip on={curState === 'immediate'} label="Immédiat" onClick={() => write('immediate')} />
            {[-7, -3, -1].map((d) => (
              <SegChip key={d} on={curState === d} label={`Dès J${d}`} onClick={() => write(d)} />
            ))}
            <SegChip on={curState === 0} label="J0" onClick={() => write(0)} />
            <SegChip on={curState === 'none'} label="—" onClick={() => write('none')} />
          </Box>
          {typeof curState === 'number' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12, color: V3.t3 }}>1ʳᵉ tentative</Typography>
              <HourSelect value={time} onChange={(t) => write(curState, { time: t })} />
            </Box>
          )}
          {curState !== 'none' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Switch size="small" checked={auto} onChange={(e) => write(curState, { auto: e.target.checked })} />
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
                {[2, 4, 8].map((h) => (
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
                Ex. +4h = escalade 4 h après la demande · J+1 à 9h = lendemain à 09:00.
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
        <Box sx={{ p: 1.5, maxWidth: 380 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t, mb: 1 }}>
            {def.emoji} {def.label}
          </Typography>
          {body}
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

  if (loading) {
    return (
      <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (error || !doc) {
    return <Alert severity="warning">{error ?? 'Modèle orchestration introuvable.'}</Alert>;
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
    <Box sx={{ display: 'grid', gap: 2, opacity: saving ? 0.6 : 1 }}>
      <Alert severity="info" sx={{ fontSize: 12.5 }}>
        {isListingScope ? (
          <>
            Vue <strong>annonce</strong> : <strong>ON</strong> = activation du service pour cette fiche
            (onglet Activation). Puis Configurer / WA / ops. Un service Off ne peut pas être modifié via
            orchestration.
          </>
        ) : (
          <>
            Cliquez <strong>Configurer</strong> pour éditer paliers / créneaux / prix / catalogue. Mode
            Accès template = mode d&apos;accueil seulement (codes par annonce).
          </>
        )}
      </Alert>

      <Box sx={{ border: `1px solid ${V3.b}`, borderRadius: 2, p: 2, bgcolor: V3.card, overflowX: 'auto' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: V3.t, mb: 1.25 }}>
          Services — activation, config &amp; exécution
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(150px,1.3fr) 44px 44px minmax(130px,1.15fr) 1.1fr 0.9fr 1.2fr 0.85fr 0.75fr 96px',
            gap: 0.75,
            alignItems: 'center',
            minWidth: 1080,
          }}
        >
          <Typography sx={head}>Service</Typography>
          <Typography sx={head}>ON</Typography>
          <Typography sx={head}>WA</Typography>
          <Typography sx={head}>Configurer</Typography>
          <Typography sx={head}>Proposé</Typography>
          <Typography sx={head}>Relances</Typography>
          <Typography sx={head}>Assignation</Typography>
          <Typography sx={head}>Rappel staff</Typography>
          <Typography sx={head}>Escalade</Typography>
          <Typography sx={head}>Fiche</Typography>

          {groupedRows.map((group) => (
            <Box key={group.id} sx={{ display: 'contents' }}>
              <Typography
                sx={{
                  ...head,
                  gridColumn: '1 / -1',
                  mt: group.id === groupedRows[0]?.id ? 0.5 : 1.25,
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
              </Typography>
              {group.rows.map((r) => (
                <Box key={r.key} sx={{ display: 'contents' }}>
                  <Typography component="div" sx={{ ...cell, fontWeight: 700, color: r.on ? V3.t : V3.t4 }}>
                    {r.emoji} {r.label}
                    {!r.on && (
                      <Chip label="Off" size="small" sx={{ ml: 0.75, height: 16, fontSize: 10 }} />
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
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    {r.hasClient ? (
                      <Switch
                        size="small"
                        checked={r.waOn}
                        disabled={!r.on}
                        onChange={(e) => patchDecision(r.key, 'clientEnabled', e.target.checked)}
                        inputProps={{ 'aria-label': `${r.label} WhatsApp` }}
                      />
                    ) : (
                      <Typography sx={{ ...cell, color: V3.t4 }}>—</Typography>
                    )}
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
                    title="Cliquer pour configurer (prix, créneaux, services…)"
                  >
                    {r.hints.length === 0 ? (
                      <Typography sx={{ ...cell, color: V3.p, fontSize: 11.5, fontWeight: 700 }}>
                        + Configurer
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
                  >
                    {r.availability}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasTask ? editCell : cell}
                    onClick={r.on && r.hasTask ? open('reminders', r.key) : undefined}
                  >
                    {r.reminders}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasTask ? editCell : cell}
                    onClick={r.on && r.hasTask ? open('assign', r.key) : undefined}
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
                    onClick={r.on && r.hasTask ? open('staffRem', r.key) : undefined}
                  >
                    {r.staffReminder}
                  </Typography>
                  <Typography
                    component="div"
                    sx={r.on && r.hasTask ? editCell : cell}
                    onClick={r.on && r.hasTask ? open('escalation', r.key) : undefined}
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
        </Box>
      </Box>

      <Box sx={{ border: `1px solid ${V3.b}`, borderRadius: 2, p: 2, bgcolor: V3.card }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: V3.t, mb: 1 }}>
          Messages automatiques du séjour
        </Typography>
        {messages.length === 0 ? (
          <Typography sx={cell}>Aucun message planifié.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 0.5 }}>
            {messages.map((m, i) => {
              const trigger = m.trigger as { ref?: string; day?: number; hours?: number; time?: string } | undefined;
              const channel = m.channel as { primary?: string } | undefined;
              let when = '—';
              if (trigger?.ref === 'booking_created') {
                const h = Number(trigger.hours ?? 0);
                when = h === 0 ? 'Immédiat à la réservation' : `+${h}h après la réservation`;
              } else if (trigger) {
                const base = trigger.ref === 'checkin' ? 'arrivée' : 'départ';
                const d = Number(trigger.day ?? 0);
                when = `${d === 0 ? `jour ${base}` : d > 0 ? `J+${d} après ${base}` : `J${d} avant ${base}`}${trigger.time ? ` à ${hourOf(trigger.time)}` : ''}`;
              }
              return (
                <Typography key={String(m.messageId ?? i)} sx={{ ...cell, opacity: m.enabled === false ? 0.5 : 1 }}>
                  <strong>{String(m.label ?? m.messageId ?? '')}</strong> — {when} ·{' '}
                  {(channel?.primary ?? '').toUpperCase() || '—'}
                  {m.enabled === false ? ' · désactivé' : ''}
                </Typography>
              );
            })}
          </Box>
        )}
        <Typography sx={{ fontSize: 11.5, color: V3.t3, mt: 1 }}>
          Textes et réglages fins : onglet « Messages planifiés ».
        </Typography>
      </Box>

      {renderEditor()}

      <Dialog
        open={Boolean(configModal && configDef)}
        onClose={() => {
          setConfigModal(null);
          reload();
        }}
        maxWidth="lg"
        fullWidth
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
                  reload();
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
                    onOrchestrationSaved={reload}
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
