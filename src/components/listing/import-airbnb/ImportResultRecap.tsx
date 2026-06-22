// ════════════════════════════════════════════════════════════════════
// ImportResultRecap.tsx — Phase D : récapitulatif post-import
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { T } from './_tokens';
import type { ImportResultItem } from './_tokens';

export interface ImportResultRecapProps {
  results: ImportResultItem[];
}

function displayTitle(r: ImportResultItem): string {
  const sojori = r.listingName?.trim();
  const ru = r.propertyName?.trim();
  if (sojori && !sojori.startsWith('Annonce #')) return sojori;
  if (ru && !ru.startsWith('Annonce #')) return ru;
  return ru || sojori || `Annonce RU #${r.ruPropertyId}`;
}

export default function ImportResultRecap({ results }: ImportResultRecapProps) {
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.length - successCount;
  const allSuccess = errorCount === 0;

  return (
    <Box>
      <Stack alignItems="center" sx={{ py: 2.5, mb: 2 }}>
        <Box sx={{
          width: 72, height: 72, borderRadius: '50%',
          background: allSuccess
            ? `linear-gradient(135deg, #86efac, ${T.success})`
            : `linear-gradient(135deg, #fda4af, ${T.error})`,
          color: '#fff', fontSize: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 24px ${allSuccess ? 'rgba(34,197,94,0.30)' : 'rgba(220,38,38,0.30)'}`,
          mb: 1.75, animation: 'sj-scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>{allSuccess ? '✓' : '⚠'}</Box>
        <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em' }}>
          {allSuccess ? 'Import terminé' : 'Import partiellement terminé'}
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.625 }}>
          {successCount} annonce{successCount > 1 ? 's' : ''} importée{successCount > 1 ? 's' : ''} avec succès
          {errorCount > 0 && ` · ${errorCount} échec${errorCount > 1 ? 's' : ''}`}
        </Typography>
      </Stack>

      <Stack gap={1}>
        {results.map(r => (
          <Box key={r.ruPropertyId} sx={{
            p: '11px 14px', bgcolor: T.bg1, border: `1px solid ${T.border}`,
            borderRadius: 1.25, display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, flexShrink: 0,
              ...(r.success
                ? { bgcolor: T.successTint, color: T.success }
                : { bgcolor: T.errorTint, color: T.error }),
            }}>{r.success ? '✓' : '✕'}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>
                {displayTitle(r)}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', mt: 0.25 }}>
                RU #{r.ruPropertyId}{r.city ? ` · ${r.city}` : ''}
              </Typography>
              {r.errorMessage && (
                <Typography sx={{
                  fontSize: 11,
                  color: r.success ? '#b45309' : T.error,
                  fontStyle: 'italic',
                  mt: 0.25,
                  lineHeight: 1.45,
                }}>
                  {r.success ? `⚠ ${r.errorMessage}` : r.errorMessage}
                </Typography>
              )}
            </Box>
            {r.listingId && r.success && (
              <Link
                component={RouterLink}
                to={`/listings/${r.listingId}`}
                underline="hover"
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.primaryDeep,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                Ouvrir →
              </Link>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
