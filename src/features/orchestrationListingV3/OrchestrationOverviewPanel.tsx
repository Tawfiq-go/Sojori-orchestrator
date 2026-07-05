import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Typography } from '@mui/material';
import { CAPABILITY_REGISTRY } from '../serviceMatrix/capabilityRegistry';
import { loadOwnerOrchestrationMatrix, type OwnerOrchestrationEffective } from './ownerOrchestrationApi';
import { V3 } from './theme';

/* ───────────────────── formatteurs langage métier ───────────────────── */

type Boundary = { unit?: string; value?: number; reference?: string } | undefined;
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
    if (start.time) s += ` à ${Number(String(start.time).slice(0, 2))}h`;
  } else s = '—';
  if (end?.day != null) {
    const d = Number(end.day);
    s += ` → fin ${d === 0 ? 'jour J' : d < 0 ? `J${d}` : `J+${d}`}`;
    if (end.time) s += ` ${Number(String(end.time).slice(0, 2))}h`;
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

/* ───────────────────────────── composant ───────────────────────────── */

type Row = {
  key: string;
  emoji: string;
  label: string;
  on: boolean;
  availability: string;
  reminders: string;
  assign: string;
  autoAssign: boolean | null;
  staffReminder: string;
  escalation: string;
};

type ScheduledMsg = {
  label?: string;
  enabled?: boolean;
  messageId?: string;
  trigger?: { ref?: string; day?: number; hours?: number; time?: string };
  channel?: { primary?: string; fallback?: string };
};

function triggerHuman(t: ScheduledMsg['trigger']): string {
  if (!t) return '—';
  if (t.ref === 'booking_created') {
    const h = Number(t.hours ?? 0);
    return h === 0 ? 'Immédiat à la réservation' : `+${h}h après la réservation`;
  }
  const base = t.ref === 'checkin' ? 'arrivée' : t.ref === 'checkout' ? 'départ' : String(t.ref ?? '');
  const d = Number(t.day ?? 0);
  const dayTxt = d === 0 ? `jour ${base}` : d > 0 ? `J+${d} après ${base}` : `J${d} avant ${base}`;
  return `${dayTxt}${t.time ? ` à ${hourOf(t.time)}` : ''}`;
}

const cell = { fontSize: 12.5, color: V3.t2 } as const;
const head = { fontSize: 11, fontWeight: 800, color: V3.t3, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };

export default function OrchestrationOverviewPanel({ ownerKey }: { ownerKey: string }) {
  const [doc, setDoc] = useState<OwnerOrchestrationEffective | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadOwnerOrchestrationMatrix(ownerKey)
      .then(({ doc: d }) => {
        if (!cancelled) setDoc(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chargement impossible');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerKey]);

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

  const caps = doc.capabilities ?? {};
  const rows: Row[] = CAPABILITY_REGISTRY.filter((def) => caps[def.key]).map((def) => {
    const cap = caps[def.key] as Record<string, never> & {
      decisions?: { managed?: boolean };
      whatsapp?: { menuOptions?: Array<{ availability?: Availability }> };
      execution?: {
        reminders?: Array<{ day?: number; time?: string }>;
        staffReminders?: Array<{ day?: number; time?: string }>;
        staffAssignment?: Record<string, unknown> | null;
        escalationEnabled?: boolean;
        deadline?: { day?: number; time?: string } | null;
      } | null;
    };
    const on = cap.decisions?.managed === true;
    const av = cap.whatsapp?.menuOptions?.[0]?.availability;
    const exec = cap.execution;
    const reminders = exec?.reminders ?? [];
    const staffRem = exec?.staffReminders ?? [];
    const sa = exec?.staffAssignment ?? null;
    const escOn = exec?.escalationEnabled === true;
    const dl = exec?.deadline;
    return {
      key: def.key,
      emoji: def.emoji,
      label: def.label,
      on,
      availability: on ? availabilityHuman(av) : 'Off',
      reminders: reminders.length
        ? `${daysHuman(reminders.map((r) => Number(r.day ?? 0)))} à ${hourOf(reminders[0]?.time)}`
        : '—',
      assign: sa ? assignHuman(sa) : '—',
      autoAssign: sa ? (sa as { autoAssign?: boolean }).autoAssign === true : null,
      staffReminder: staffRem.length
        ? `${daysHuman(staffRem.map((r) => Number(r.day ?? 0)))} à ${hourOf(staffRem[0]?.time)}`
        : '—',
      escalation: escOn
        ? dl?.day != null
          ? `${dl.day === 0 ? 'J0' : dl.day > 0 ? `J+${dl.day}` : `J${dl.day}`} à ${hourOf(dl.time ?? undefined)}`
          : 'ON'
        : '—',
    };
  });

  const messages = (doc.scheduledMessages ?? []) as ScheduledMsg[];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Alert severity="info" sx={{ fontSize: 12.5 }}>
        Lecture d&apos;ensemble du modèle — pour modifier, ouvrez « Services &amp; workflows » ou
        relancez l&apos;onboarding (Équipe &amp; Rôles → On-boarding).
      </Alert>

      {/* ── services ── */}
      <Box sx={{ border: `1px solid ${V3.border}`, borderRadius: 2, p: 2, bgcolor: V3.bg1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: V3.t1, mb: 1 }}>
          📱 Services — quand ils sont proposés et comment l&apos;équipe exécute
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr 1.3fr 1fr 1.4fr 1fr 0.8fr' },
            gap: 0.75,
            alignItems: 'center',
          }}
        >
          <Typography sx={head}>Service</Typography>
          <Typography sx={{ ...head, display: { xs: 'none', md: 'block' } }}>Proposé au voyageur</Typography>
          <Typography sx={{ ...head, display: { xs: 'none', md: 'block' } }}>Relances client</Typography>
          <Typography sx={{ ...head, display: { xs: 'none', md: 'block' } }}>Assignation staff</Typography>
          <Typography sx={{ ...head, display: { xs: 'none', md: 'block' } }}>Rappel staff</Typography>
          <Typography sx={{ ...head, display: { xs: 'none', md: 'block' } }}>Escalade</Typography>
          {rows.map((r) => (
            <Box key={r.key} sx={{ display: 'contents' }}>
              <Typography sx={{ ...cell, fontWeight: 700, color: r.on ? V3.t1 : V3.t4 }}>
                {r.emoji} {r.label}
                {!r.on && (
                  <Chip label="Off" size="small" sx={{ ml: 0.75, height: 16, fontSize: 10 }} />
                )}
              </Typography>
              <Typography sx={{ ...cell, opacity: r.on ? 1 : 0.5 }}>{r.availability}</Typography>
              <Typography sx={cell}>{r.reminders}</Typography>
              <Typography sx={cell}>
                {r.assign}
                {r.autoAssign != null && r.assign !== '—' && (
                  <Box component="span" sx={{ ml: 0.5, fontSize: 11, color: r.autoAssign ? V3.task : V3.t4 }}>
                    · Auto-accepté {r.autoAssign ? '✓' : '✗'}
                  </Box>
                )}
              </Typography>
              <Typography sx={cell}>{r.staffReminder}</Typography>
              <Typography sx={cell}>{r.escalation}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── messages planifiés ── */}
      <Box sx={{ border: `1px solid ${V3.border}`, borderRadius: 2, p: 2, bgcolor: V3.bg1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: V3.t1, mb: 1 }}>
          💬 Messages automatiques du séjour
        </Typography>
        {messages.length === 0 ? (
          <Typography sx={cell}>Aucun message planifié.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 0.5 }}>
            {messages.map((m, i) => (
              <Typography key={m.messageId ?? i} sx={{ ...cell, opacity: m.enabled === false ? 0.5 : 1 }}>
                <strong>{m.label ?? m.messageId}</strong> — {triggerHuman(m.trigger)} ·{' '}
                {(m.channel?.primary ?? '').toUpperCase() || '—'}
                {m.enabled === false ? ' · désactivé' : ''}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
