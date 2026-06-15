// ════════════════════════════════════════════════════════════════════
// ImportProgressTimeline.tsx — Phase C : 10 étapes animées
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { T, STEPS_ORDER, STEPS_LABELS, computeProgress } from './_tokens';
import type { ImportProgress } from './_tokens';

export interface ImportProgressTimelineProps {
  progress: ImportProgress;
}

export default function ImportProgressTimeline({ progress }: ImportProgressTimelineProps) {
  const pct = computeProgress(progress.steps);
  const doneCount = progress.steps.filter(s => s.status === 'done').length;

  return (
    <Box>
      {/* Header */}
      <Stack sx={{ mb: 2.5 }}>
        <Typography sx={{
          fontFamily: '"Geist Mono", monospace', fontSize: 11, color: T.text3,
          textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, mb: 0.625,
        }}>
          {progress.totalBatch > 1
            ? `Annonce ${progress.currentBatchIndex + 1} / ${progress.totalBatch} — En cours`
            : 'Import en cours'}
        </Typography>
        <Typography sx={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', mb: 0.375 }}>
          {progress.currentPropertyName || 'Création du listing'}
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.text3, lineHeight: 1.5 }}>
          Listing, calendrier et orchestration (template owner filtré par la ville choisie).
        </Typography>

        {/* Progress bar */}
        <Box sx={{
          position: 'relative', height: 8, bgcolor: T.bg3, borderRadius: '99px',
          overflow: 'hidden', mt: 1.75, mb: 0.625,
        }}>
          <Box className="sj-progress-fill" sx={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`,
            background: `linear-gradient(90deg, ${T.orange}, ${T.primarySoft}, ${T.orange})`,
            backgroundSize: '200% 100%',
            animation: 'sj-shimmer 1.6s infinite linear',
            borderRadius: '99px', transition: 'width 0.6s ease',
          }} />
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{
          fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace',
          letterSpacing: '0.04em', fontWeight: 700, textTransform: 'uppercase',
        }}>
          <Box>{doneCount} / {progress.steps.length} étapes</Box>
          <Box sx={{ color: T.orange, fontSize: 13 }}>{pct}%</Box>
        </Stack>
      </Stack>

      {/* Timeline */}
      <Box sx={{ mt: 3 }}>
        {progress.steps.map((step, idx) => {
          const isLast = idx === progress.steps.length - 1;
          const meta = STEPS_LABELS[step.key];
          return (
            <StepRow key={step.key} step={step} meta={meta} isLast={isLast} />
          );
        })}
      </Box>
    </Box>
  );
}

function StepRow({ step, meta, isLast }: { step: StepState; meta: { label: string; sub: string }; isLast: boolean }) {
  const { status } = step;
  const stepIdx = STEPS_ORDER.indexOf(step.key) + 1;

  const connectorBg =
    status === 'done' ? T.success :
    status === 'error' ? T.error :
    status === 'running' ? `linear-gradient(180deg, ${T.orange}, ${T.bg3})` :
    T.bg3;

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75, position: 'relative', pb: 1.75 }}>
      {/* Connector */}
      {!isLast && (
        <Box sx={{
          position: 'absolute', left: 13, top: 30, bottom: -4, width: 2,
          background: connectorBg,
          backgroundSize: status === 'running' ? '100% 32px' : undefined,
          animation: status === 'running' ? 'sj-line-flow 1.2s infinite linear' : undefined,
          zIndex: 0,
        }} />
      )}

      {/* Dot */}
      <Box sx={{
        width: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Geist Mono", monospace', fontSize: 11.5, fontWeight: 800,
        flexShrink: 0, position: 'relative', zIndex: 1,
        transition: 'all 0.25s',
        ...(status === 'pending' ? {
          bgcolor: T.bg1, border: `2px solid ${T.borderStrong}`, color: T.text3,
        } : status === 'running' ? {
          bgcolor: T.orange, color: '#fff', border: 0,
          animation: 'sj-pulse-orange 1.6s infinite',
        } : status === 'done' ? {
          bgcolor: T.success, color: '#fff', border: 0,
        } : {
          bgcolor: T.error, color: '#fff', border: 0,
        }),
      }}>
        {status === 'done' ? (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round" fill="none"
              style={{ strokeDasharray: 24, strokeDashoffset: 0, animation: 'sj-check-draw 0.3s ease-out' }} />
          </svg>
        ) : status === 'error' ? '!' : stepIdx}
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, minWidth: 0, pt: 0.375, animation: 'sj-fadeIn 0.2s' }}>
        <Typography sx={{
          fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em',
          color: status === 'running' ? T.orange :
                 status === 'done' ? T.success :
                 status === 'error' ? T.error : T.text,
          fontWeight: status === 'running' || status === 'done' ? 700 : 600,
        }}>{meta.label}</Typography>
        <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.25, lineHeight: 1.45 }}>{meta.sub}</Typography>

        {status === 'error' && step.errorMessage && (
          <Stack direction="row" alignItems="center" gap={0.625} sx={{
            mt: 0.5, fontSize: 11, color: T.error, fontWeight: 600,
          }}>
            <Box>⚠</Box>{step.errorMessage}
          </Stack>
        )}

        {/* Live indicator for running step */}
        {status === 'running' && (
          <Box sx={{
            mt: 1, p: '9px 12px',
            background: `linear-gradient(90deg, ${T.orangeBg}, ${T.bg2})`,
            borderRadius: 0.875, fontSize: 11, color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            display: 'flex', alignItems: 'center', gap: 1,
            animation: 'sj-pulse-soft 1.6s infinite',
          }}>
            <Box sx={{ fontSize: 14 }}>{stepIconFor(step.key)}</Box>
            <Box sx={{ flex: 1 }}>{liveLabelFor(step)}</Box>
            <Box sx={{ ml: 'auto', fontWeight: 700, color: T.orange }}>
              {liveMetaFor(step)}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function stepIconFor(key: StepState['key']) {
  return ({
    pull_spec: '📄', pull_prices: '💰', pull_calendar: '📅', pull_external: '✨',
    build_payload: '⚙', reupload_images: '🖼', create_listing: '🏠',
    wait_inventory: '⏳', apply_inventory: '✅', post_import_sync: '🔄',
    apply_orchestration: '⚡',
  } as const)[key];
}

function liveLabelFor(step: StepState) {
  if (step.key === 'reupload_images' && step.meta?.photosTotal) {
    return 'Téléchargement des photos…';
  }
  if (step.key === 'apply_orchestration') {
    return 'Application orchestration · template owner + ville Sojori…';
  }
  if (step.key === 'post_import_sync') {
    return 'Synchronisation réservations et avis…';
  }
  return 'En cours…';
}

function liveMetaFor(step: StepState) {
  if (step.key === 'reupload_images' && step.meta?.photosTotal) {
    return `${step.meta.photosDone || 0} / ${step.meta.photosTotal} photos`;
  }
  if (step.key === 'apply_orchestration') {
    return 'Orchestration';
  }
  return '';
}
