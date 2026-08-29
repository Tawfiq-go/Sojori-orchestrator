import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import listingsService from '../../../../services/listingsService';
import V3HousekeepingPolicyPanel, {
  type HousekeepingPolicyConfig,
} from '../../../../features/orchestrationListingV3/V3HousekeepingPolicyPanel';
import V3MenageBaremePanel, {
  useMenageBareme,
} from '../../../../features/orchestrationListingV3/V3MenageBaremePanel';
import V3MenageTypeCards from '../../../../features/orchestrationListingV3/V3MenageTypeCards';
import { describeHousekeepingPolicy } from '../../../../features/orchestrationListingV3/housekeepingPolicy';
import {
  baremeGlobalDeltaPct,
  baremeTotalCount,
} from '../../../../features/orchestrationListingV3/menageBareme';
import { V3 } from '../../../../features/orchestrationListingV3/theme';

type Props = {
  listingId?: string | null;
};

const sectionSx = {
  border: `1px solid ${V3.b}`,
  borderRadius: '12px',
  bgcolor: V3.card,
  overflow: 'hidden',
};

/**
 * Onglet listing « Ménage » — page ménage listing.
 * Desktop (≥1100px) : rail gauche 340px (Politique + En un coup d'œil),
 * colonne droite large (Types de ménage + Barème). En dessous : empilement.
 */
export default function ListingMenageTab({ listingId }: Props) {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<HousekeepingPolicyConfig | null>(null);
  const [listingValues, setListingValues] = useState<Record<string, unknown>>({});
  const baremeView = useMenageBareme(listingId ? String(listingId) : null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const loadPolicy = async () => {
        try {
          const res = await listingsService.getListingOrchestration(String(listingId));
          const doc = (res as { data?: Record<string, unknown> })?.data ?? res;
          const rules =
            doc && typeof doc === 'object'
              ? ((doc as Record<string, unknown>).cleaningRules as
                  | Record<string, unknown>
                  | undefined)
              : undefined;
          return (rules?.housekeepingPolicy as HousekeepingPolicyConfig | undefined) ?? null;
        } catch {
          // 404 = listing non migré orchestration → politique non configurée (défauts backend).
          return null;
        }
      };
      const loadListing = async () => {
        try {
          const doc = await listingsService.getListingDocument(String(listingId));
          return (doc ?? {}) as Record<string, unknown>;
        } catch {
          return {};
        }
      };
      const [hp, vals] = await Promise.all([loadPolicy(), loadListing()]);
      if (!cancelled) {
        setPolicy(hp);
        setListingValues(vals);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (!listingId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Enregistrez d’abord le listing pour configurer le ménage.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const policyLine = describeHousekeepingPolicy(policy).join(' · ');
  const totalCount = baremeView?.kind === 'rows' ? baremeTotalCount(baremeView.rows) : null;
  const globalDelta = baremeView?.kind === 'rows' ? baremeGlobalDeltaPct(baremeView.rows) : null;
  const windowDays = baremeView && 'windowDays' in baremeView ? baremeView.windowDays : 30;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, width: '100%' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', mb: 0.5 }}>
        LISTING
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 750, mb: 1.25, lineHeight: 1.2 }}>
        Ménage
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 2.5,
          alignItems: 'start',
          width: '100%',
          maxWidth: 1440,
          '@media (min-width:1100px)': {
            gridTemplateColumns: '340px minmax(0, 1fr)',
          },
        }}
      >
        {/* Rail gauche */}
        <Stack sx={{ gap: 2, minWidth: 0 }}>
          <V3HousekeepingPolicyPanel
            listingId={String(listingId)}
            policy={policy}
            onSaved={next => setPolicy(next)}
          />

          <Box sx={sectionSx}>
            <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${V3.b}`, bgcolor: V3.alt }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: V3.t }}>
                En un coup d’œil
              </Typography>
            </Box>
            <Stack sx={{ px: 2, py: 1.5, gap: 1 }}>
              <Typography sx={{ fontSize: 12, color: V3.t2, lineHeight: 1.6 }}>
                {policyLine}
              </Typography>
              {totalCount != null && (
                <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                  <GlanceStat label={`ménages ${windowDays} j`} value={String(totalCount)} />
                  {globalDelta != null && (
                    <GlanceStat
                      label="écart global"
                      value={`${globalDelta > 0 ? '+' : ''}${globalDelta} %`}
                      tone={Math.abs(globalDelta) <= 15 ? 'ok' : 'warn'}
                    />
                  )}
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Colonne principale */}
        <Stack sx={{ gap: 2.5, minWidth: 0 }}>
          <V3MenageTypeCards
            listingId={String(listingId)}
            listingValues={listingValues}
            baremeView={baremeView}
            onListingPatch={patch => setListingValues(prev => ({ ...prev, ...patch }))}
          />
          <V3MenageBaremePanel listingId={String(listingId)} view={baremeView} />
        </Stack>
      </Box>
    </Box>
  );
}

function GlanceStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  const color = tone === 'ok' ? V3.task : tone === 'warn' ? V3.pd : V3.t;
  return (
    <Box
      sx={{
        px: 1.25,
        py: 0.75,
        borderRadius: '10px',
        border: `1px solid ${V3.b}`,
        bgcolor: V3.alt,
        minWidth: 96,
      }}
    >
      <Typography sx={{ fontSize: 15, fontWeight: 800, color, fontFamily: 'monospace', lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 10, color: V3.t4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
    </Box>
  );
}
