import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Popover,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { CAPABILITY_REGISTRY, getCapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
import listingsService from '../../services/listingsService';
import * as fulltaskApi from '../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../utils/unwrapFulltaskResponse';
import { loadOwnerOrchestrationMatrix, type OwnerOrchestrationEffective } from './ownerOrchestrationApi';
import { V3 } from './theme';

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

function availabilityHuman(av: Availability): string {
  const type = av?.type ?? 'always';
  if (type === 'always') return 'Toujours';
  if (type === 'after_booking_confirmed') return 'À la réservation';
  if (type === 'conditional_and_time') return 'Après enregistrement + créneau';
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
        bgcolor: on ? V3.t1 : 'transparent',
        color: on ? '#fff' : V3.t2,
        border: `1px solid ${on ? V3.t1 : V3.border}`,
        '&:hover': { bgcolor: on ? V3.t1 : V3.bg2 },
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

type EditorKind = 'availability' | 'reminders' | 'assign' | 'staffRem' | 'escalation';

export default function OrchestrationOverviewPanel({ ownerKey }: { ownerKey: string }) {
  const [doc, setDoc] = useState<OwnerOrchestrationEffective | null>(null);
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<{ kind: EditorKind; capKey: string; anchor: HTMLElement } | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    loadOwnerOrchestrationMatrix(ownerKey)
      .then(async ({ doc: d }) => {
        setDoc(d);
        let msgs = (d.scheduledMessages ?? []) as Array<Record<string, unknown>>;
        if (!msgs.length) {
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
  }, [ownerKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const caps = (doc?.capabilities ?? {}) as Record<string, CapDoc>;

  const saveCapPatch = useCallback(
    async (capKey: string, patch: Partial<CapDoc>) => {
      const cap = caps[capKey];
      const def = getCapabilityDefinition(capKey);
      if (!cap || !def) return;
      setSaving(true);
      try {
        await listingsService.putOwnerOrchestration(ownerKey, {
          capabilities: {
            [capKey]: {
              key: capKey,
              taskType: def.taskType,
              decisions: cap.decisions,
              taskBehavior: cap.taskBehavior,
              gestion: cap.gestion,
              whatsapp: patch.whatsapp ?? cap.whatsapp,
              execution: patch.execution !== undefined ? patch.execution : cap.execution,
            },
          },
        });
        // maj locale optimiste
        setDoc((prev) =>
          prev
            ? {
                ...prev,
                capabilities: {
                  ...prev.capabilities,
                  [capKey]: { ...(prev.capabilities[capKey] as CapDoc), ...patch } as never,
                },
              }
            : prev,
        );
        toast.success('Modèle mis à jour');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
      } finally {
        setSaving(false);
      }
    },
    [caps, ownerKey],
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
        : av?.type === 'after_booking_confirmed' || (av?.type === 'time_window' && !av?.from) ? 'resa'
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
      const setStart = (start: 'toujours' | 'resa' | number) => {
        if (start === 'toujours') return patchAvailability(editor.capKey, { type: 'always' });
        if (start === 'resa') {
          return patchAvailability(
            editor.capKey,
            curFin === 'depart'
              ? { type: 'after_booking_confirmed' }
              : { type: 'time_window', to: mkTo(curFin) },
          );
        }
        return patchAvailability(editor.capKey, {
          type: 'time_window',
          from: { unit: 'days', value: start, reference: refBase },
          to: mkTo(curFin),
        });
      };
      const setFin = (fin: 'J-1' | 'J0' | 'depart') => {
        if (curStart === 'toujours') return;
        if (curStart === 'resa') {
          return patchAvailability(
            editor.capKey,
            fin === 'depart' ? { type: 'after_booking_confirmed' } : { type: 'time_window', to: mkTo(fin) },
          );
        }
        patchAvailability(editor.capKey, {
          type: 'time_window',
          from: { unit: 'days', value: curStart, reference: refBase },
          to: mkTo(fin),
        });
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
      const dl = (exec.deadline ?? null) as { ref?: string; day?: number; time?: string } | null;
      const ref = String(dl?.ref ?? defaultRefForTask(taskType));
      const day = Number(dl?.day ?? -1);
      const time = String(dl?.time ?? '11:00');
      const write = (on: boolean, nextDay: number, nextTime: string) => {
        patchExecution(editor.capKey, {
          escalationEnabled: on,
          deadline: on ? { ref, day: nextDay, time: nextTime } : dl,
        });
      };
      body = (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Switch size="small" checked={escOn} onChange={(e) => write(e.target.checked, day, time)} />
            <Typography sx={{ fontSize: 12, color: V3.t2 }}>Alerter l&apos;admin (escalade)</Typography>
          </Box>
          {escOn && (
            <>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {[-2, -1, 0].map((d) => (
                  <SegChip key={d} on={day === d} label={d === 0 ? 'J0' : `J${d}`} onClick={() => write(true, d, time)} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 12, color: V3.t3 }}>Heure</Typography>
                <HourSelect value={time} onChange={(t) => write(true, day, t)} />
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
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t1, mb: 1 }}>
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
      CAPABILITY_REGISTRY.filter((def) => caps[def.key]).map((def) => {
        const cap = caps[def.key];
        const on = cap.decisions?.managed === true;
        const exec = cap.execution;
        const reminders = exec?.reminders ?? [];
        const staffRem = exec?.staffReminders ?? [];
        const sa = exec?.staffAssignment ?? null;
        const escOn = exec?.escalationEnabled === true;
        const dl = exec?.deadline as { day?: number; time?: string } | null | undefined;
        return {
          key: def.key,
          emoji: def.emoji,
          label: def.label,
          on,
          hasTask: Boolean(def.taskType),
          availability: on ? availabilityHuman(cap.whatsapp?.menuOptions?.[0]?.availability as Availability) : 'Off',
          reminders: reminders.length
            ? `${daysHuman(reminders.map((r) => Number(r.day ?? 0)))} à ${hourOf(String(reminders[0]?.time ?? ''))}`
            : '—',
          assign: sa ? assignHuman(sa) : '—',
          autoAssign: sa ? (sa as { autoAssign?: boolean }).autoAssign === true : null,
          staffReminder: staffRem.length
            ? `${daysHuman(staffRem.map((r) => Number(r.day ?? 0)))} à ${hourOf(String(staffRem[0]?.time ?? ''))}`
            : '—',
          escalation: escOn
            ? dl?.day != null
              ? `${dl.day === 0 ? 'J0' : dl.day > 0 ? `J+${dl.day}` : `J${dl.day}`} à ${hourOf(dl.time)}`
              : 'ON'
            : '—',
        };
      }),
    [caps],
  );

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
    '&:hover': { bgcolor: V3.bg2, outline: `1px solid ${V3.border}` },
  } as const;
  const head = { fontSize: 11, fontWeight: 800, color: V3.t3, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };

  const open = (kind: EditorKind, capKey: string) => (e: React.MouseEvent<HTMLElement>) =>
    setEditor({ kind, capKey, anchor: e.currentTarget });

  return (
    <Box sx={{ display: 'grid', gap: 2, opacity: saving ? 0.6 : 1 }}>
      <Alert severity="info" sx={{ fontSize: 12.5 }}>
        Cliquez une cellule pour la modifier — chaque changement est enregistré immédiatement dans le
        modèle owner. Détail complet dans « Services &amp; workflows ».
      </Alert>

      <Box sx={{ border: `1px solid ${V3.border}`, borderRadius: 2, p: 2, bgcolor: V3.bg1, overflowX: 'auto' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: V3.t1, mb: 1 }}>
          📱 Services — quand ils sont proposés et comment l&apos;équipe exécute
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1.3fr 1fr 1.5fr 0.9fr 0.8fr',
            gap: 0.75,
            alignItems: 'center',
            minWidth: 860,
          }}
        >
          <Typography sx={head}>Service</Typography>
          <Typography sx={head}>Proposé au voyageur</Typography>
          <Typography sx={head}>Relances client</Typography>
          <Typography sx={head}>Assignation staff</Typography>
          <Typography sx={head}>Rappel staff</Typography>
          <Typography sx={head}>Escalade</Typography>
          {rows.map((r) => (
            <Box key={r.key} sx={{ display: 'contents' }}>
              <Typography sx={{ ...cell, fontWeight: 700, color: r.on ? V3.t1 : V3.t4 }}>
                {r.emoji} {r.label}
                {!r.on && <Chip label="Off" size="small" sx={{ ml: 0.75, height: 16, fontSize: 10 }} />}
              </Typography>
              <Typography sx={r.on ? editCell : { ...cell, opacity: 0.5 }} onClick={r.on ? open('availability', r.key) : undefined}>
                {r.availability}
              </Typography>
              <Typography sx={r.hasTask ? editCell : cell} onClick={r.hasTask ? open('reminders', r.key) : undefined}>
                {r.reminders}
              </Typography>
              <Typography sx={r.hasTask ? editCell : cell} onClick={r.hasTask ? open('assign', r.key) : undefined}>
                {r.assign}
                {r.autoAssign != null && r.assign !== '—' && (
                  <Box component="span" sx={{ ml: 0.5, fontSize: 11, color: r.autoAssign ? V3.task : V3.t4 }}>
                    · Auto-accepté {r.autoAssign ? '✓' : '✗'}
                  </Box>
                )}
              </Typography>
              <Typography sx={r.hasTask ? editCell : cell} onClick={r.hasTask ? open('staffRem', r.key) : undefined}>
                {r.staffReminder}
              </Typography>
              <Typography sx={r.hasTask ? editCell : cell} onClick={r.hasTask ? open('escalation', r.key) : undefined}>
                {r.escalation}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ border: `1px solid ${V3.border}`, borderRadius: 2, p: 2, bgcolor: V3.bg1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: V3.t1, mb: 1 }}>
          💬 Messages automatiques du séjour
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
    </Box>
  );
}
