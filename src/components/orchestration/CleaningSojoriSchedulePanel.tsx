import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';

export interface CleaningSojoriSchedulePanelProps {
  metadata?: Record<string, unknown> | null;
  compact?: boolean;
}

/** Affiche le détail de planification Ménage Sojori (workflow.metadata / scheduling). */
export function CleaningSojoriSchedulePanel({ metadata, compact }: CleaningSojoriSchedulePanelProps) {
  const scheduling = (metadata?.scheduling || metadata) as Record<string, unknown> | undefined;
  if (!scheduling?.cleaningDate && !metadata?.cleaningDate) return null;

  const isUrgent = Boolean(scheduling?.isUrgent ?? metadata?.isUrgent);
  const method = String(scheduling?.method || metadata?.calculationMethod || '—');
  const logs = Array.isArray(scheduling?.logs) ? (scheduling.logs as string[]) : [];

  return (
    <Box
      sx={{
        mt: compact ? 0.5 : 1,
        p: 1,
        bgcolor: isUrgent ? 'rgba(200,30,30,0.06)' : t.bg2,
        borderRadius: 1,
        border: `1px solid ${isUrgent ? 'rgba(200,30,30,0.25)' : t.border}`,
      }}
    >
      <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.text2 }}>Planification ménage</Typography>
        {isUrgent && (
          <Chip label="URGENT" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 800, bgcolor: `${t.error}18`, color: t.error }} />
        )}
        <Chip label={method} size="small" sx={{ height: 18, fontSize: 8, fontWeight: 600 }} />
      </Stack>
      <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: '"Geist Mono", monospace' }}>
        Ménage: {formatIso(scheduling?.cleaningDateIso || metadata?.cleaningDate)}
        {scheduling?.deadlineDateIso ? ` · Deadline ${formatIso(scheduling.deadlineDateIso)}` : ''}
        {scheduling?.nextReservationNumber
          ? ` · Avant résa ${String(scheduling.nextReservationNumber)}`
          : ''}
      </Typography>
      {!compact && logs.length > 0 && (
        <Box component="ul" sx={{ m: '6px 0 0', pl: 2, fontSize: 10, color: t.text3 }}>
          {logs.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </Box>
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
