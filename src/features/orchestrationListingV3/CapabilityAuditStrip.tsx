import { Box, Typography } from '@mui/material';
import {
  CAPABILITY_REGISTRY,
  capabilityDurationKind,
  type CapabilityDefinition,
} from '../serviceMatrix/capabilityRegistry';
import { V3 } from './theme';

type CapDocLike = {
  decisions?: {
    managed?: boolean;
    orchestrated?: boolean;
    clientEnabled?: boolean;
    taskEnabled?: boolean;
  };
  gestion?: Record<string, unknown>;
};

function isCapOn(cap: CapDocLike | undefined, def: CapabilityDefinition): boolean {
  if (!cap) return false;
  const d = cap.decisions;
  if (d?.managed === true || d?.orchestrated === true) return true;
  if (d?.managed === false && d?.orchestrated === false) return false;
  // Fallback: client or task enabled
  return d?.clientEnabled === true || d?.taskEnabled === true;
}

function formatHoursDuration(gestion: Record<string, unknown> | undefined): string {
  if (!gestion) return '—';
  if (typeof gestion.duration === 'number' && gestion.duration > 0) {
    return `${gestion.duration} h`;
  }
  const slots = Array.isArray(gestion.timeSlots)
    ? gestion.timeSlots
    : Array.isArray(gestion.TS_CLEAN)
      ? gestion.TS_CLEAN
      : [];
  const defaultSlot = slots.find(
    (s: unknown) => s && typeof s === 'object' && (s as { default?: boolean }).default === true,
  ) as { start?: number; end?: number } | undefined;
  const slot = defaultSlot ?? (slots[0] as { start?: number; end?: number } | undefined);
  if (slot && typeof slot.start === 'number' && typeof slot.end === 'number' && slot.end > slot.start) {
    return `${slot.end - slot.start} h`;
  }
  const freq = Array.isArray(gestion.frequency) ? gestion.frequency : [];
  if (freq.length) {
    const first = freq[0] as { numberOfCleaning?: number; startDay?: number; endDay?: number };
    if (typeof first?.numberOfCleaning === 'number') {
      return `${first.numberOfCleaning}× / palier`;
    }
    return `${freq.length} paliers`;
  }
  const paid = gestion.paidCleaningConfig as { services?: Array<{ duration?: number; enabled?: boolean }> } | undefined;
  const services = Array.isArray(paid?.services) ? paid!.services! : [];
  const enabled = services.filter((s) => s.enabled !== false && typeof s.duration === 'number');
  if (enabled.length) {
    const d = enabled[0].duration!;
    return enabled.length === 1 ? `${d} h` : `${d}–${Math.max(...enabled.map((s) => s.duration!))} h`;
  }
  return '—';
}

function formatMinutesDuration(gestion: Record<string, unknown> | undefined, on: boolean): string {
  if (!on) return '—';
  const mins =
    typeof gestion?.durationMinutes === 'number' && gestion.durationMinutes > 0
      ? gestion.durationMinutes
      : 30;
  const n = Array.isArray(gestion?.checklist) ? gestion!.checklist.length : 0;
  return n > 0 ? `${mins} min · ${n} pts` : `${mins} min`;
}

function durationLabel(def: CapabilityDefinition, cap: CapDocLike | undefined, on: boolean): string {
  const kind = capabilityDurationKind(def);
  if (kind === 'na') return 'N/A';
  if (kind === 'minutes') return formatMinutesDuration(cap?.gestion, on);
  return on ? formatHoursDuration(cap?.gestion) : '—';
}

/**
 * Bandeau compact ON/OFF + durée pour l’aperçu template owner.
 */
export default function CapabilityAuditStrip({
  capabilities,
}: {
  capabilities: Record<string, CapDocLike> | undefined;
}) {
  const rows = CAPABILITY_REGISTRY.filter(
    (def) => def.taskType != null || def.columns.managed === 'yes',
  );

  return (
    <Box
      sx={{
        border: `1px solid ${V3.b}`,
        borderRadius: 2,
        p: 1.25,
        bgcolor: V3.card,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t, mb: 0.75 }}>
        Audit config
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(120px,1.4fr) 44px minmax(64px,0.7fr)',
          gap: '2px 8px',
          alignItems: 'center',
          maxHeight: 220,
          overflowY: 'auto',
        }}
      >
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: V3.t4, letterSpacing: 0.4 }}>
          SERVICE
        </Typography>
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: V3.t4 }}>ON</Typography>
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: V3.t4 }}>DURÉE</Typography>
        {rows.map((def) => {
          const cap = capabilities?.[def.key];
          const on = isCapOn(cap, def);
          return (
            <Box key={def.key} sx={{ display: 'contents' }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: V3.t2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={def.label}
              >
                {def.emoji} {def.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: on ? V3.su : V3.t4,
                }}
              >
                {on ? 'ON' : 'OFF'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: V3.t3 }}>
                {durationLabel(def, cap, on)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
