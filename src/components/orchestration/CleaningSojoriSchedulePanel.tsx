import React, { useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import { CleanlinessBadgeInteractive } from '../calendar-views/CleanlinessBadgeInteractive';
import {
  deriveDisplayCleanliness,
  type DisplayCleanliness,
} from '../../utils/cleanlinessDisplay';

export interface ListingOperationalSnapshot {
  occupancyStatus?: string;
  cleanlinessStatus_v2?: string;
  cleanlinessStatus?: string;
  cleanlinessEmergency?: boolean;
}

export interface CleaningSojoriSchedulePanelProps {
  metadata?: Record<string, unknown> | null;
  compact?: boolean;
  listingId?: string;
  listingOperational?: ListingOperationalSnapshot | null;
  /** Active stay window for OCCUPÉ display */
  checkInDate?: string;
  checkOutDate?: string;
  onCleanlinessChange?: (listingId: string, status: DisplayCleanliness) => void | Promise<void>;
}

/** Affiche planification Ménage Sojori + état logement (modifiable). */
export function CleaningSojoriSchedulePanel({
  metadata,
  compact,
  listingId,
  listingOperational,
  checkInDate,
  checkOutDate,
  onCleanlinessChange,
}: CleaningSojoriSchedulePanelProps) {
  const scheduling = (metadata?.scheduling || metadata) as Record<string, unknown> | undefined;
  const hasSchedule = Boolean(scheduling?.cleaningDate || metadata?.cleaningDate);

  const reservations = [];
  if (checkInDate && checkOutDate) {
    reservations.push({
      arrivalDate: checkInDate,
      departureDate: checkOutDate,
      status: 'confirmed',
    });
  }

  const displayStatus = listingOperational
    ? deriveDisplayCleanliness(listingOperational, reservations)
    : 'clean';

  const [saving, setSaving] = useState(false);

  const handleStatus = async (next: DisplayCleanliness) => {
    if (!listingId || !onCleanlinessChange) return;
    setSaving(true);
    try {
      await onCleanlinessChange(listingId, next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        mt: compact ? 0.5 : 1,
        p: 1,
        bgcolor: t.bg2,
        borderRadius: 1,
        border: `1px solid ${t.border}`,
      }}
    >
      <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center" sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.text2 }}>Logement</Typography>
        {listingId ? (
          <CleanlinessBadgeInteractive
            status={displayStatus}
            displayStatus={displayStatus}
            emergency={Boolean(listingOperational?.cleanlinessEmergency)}
            disabled={saving || !onCleanlinessChange}
            onChange={onCleanlinessChange ? handleStatus : undefined}
          />
        ) : (
          <Chip label="—" size="small" sx={{ height: 18, fontSize: 9 }} />
        )}
        <Typography sx={{ fontSize: 9, color: t.text4 }}>
          (cron vérifie dirty → créneau SM- si besoin)
        </Typography>
      </Stack>

      {hasSchedule && (
        <>
          <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.text2 }}>Planification ménage</Typography>
            {Boolean(scheduling?.isUrgent ?? metadata?.isUrgent) && (
              <Chip
                label="URGENT"
                size="small"
                sx={{ height: 18, fontSize: 9, fontWeight: 800, bgcolor: `${t.error}18`, color: t.error }}
              />
            )}
            <Chip
              label={String(scheduling?.method || metadata?.calculationMethod || '—')}
              size="small"
              sx={{ height: 18, fontSize: 8, fontWeight: 600 }}
            />
          </Stack>
          <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: '"Geist Mono", monospace' }}>
            Ménage: {formatIso(scheduling?.cleaningDateIso || metadata?.cleaningDate)}
            {scheduling?.deadlineDateIso ? ` · Deadline ${formatIso(scheduling.deadlineDateIso)}` : ''}
            {scheduling?.nextReservationNumber
              ? ` · Avant résa ${String(scheduling.nextReservationNumber)}`
              : ''}
          </Typography>
          {!compact && Array.isArray(scheduling?.logs) && (scheduling.logs as string[]).length > 0 && (
            <Box component="ul" sx={{ m: '6px 0 0', pl: 2, fontSize: 10, color: t.text3 }}>
              {(scheduling.logs as string[]).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

function formatIso(v: unknown): string {
  if (!v) return '—';
  try {
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(v);
  }
}

export default CleaningSojoriSchedulePanel;
