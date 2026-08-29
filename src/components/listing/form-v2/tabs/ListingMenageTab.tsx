import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import listingsService from '../../../../services/listingsService';
import V3HousekeepingPolicyPanel, {
  type HousekeepingPolicyConfig,
} from '../../../../features/orchestrationListingV3/V3HousekeepingPolicyPanel';
import MenageOpsPanel from '../../../../features/listing/components/ConfigOrchestration/MenageOpsPanel';
import V3MenageBaremePanel from '../../../../features/orchestrationListingV3/V3MenageBaremePanel';
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
 * Panneaux : Politique (qui crée/assigne/notifie), Types & durées (menageOps).
 */
export default function ListingMenageTab({ listingId }: Props) {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<HousekeepingPolicyConfig | null>(null);
  const [listingValues, setListingValues] = useState<Record<string, unknown>>({});

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

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, width: '100%' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', mb: 0.5 }}>
        LISTING
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 750, mb: 0.75, lineHeight: 1.2 }}>
        Ménage
      </Typography>
      <Stack sx={{ gap: 2, maxWidth: 680 }}>
        <V3HousekeepingPolicyPanel
          listingId={String(listingId)}
          policy={policy}
          onSaved={next => setPolicy(next)}
        />

        <Box sx={sectionSx}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${V3.b}`, bgcolor: V3.alt }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: V3.t }}>
              Types &amp; durées
            </Typography>
            <Typography sx={{ fontSize: 11, color: V3.t3 }}>
              Durée / prix par niveau (Normal / Grand) sur chaque piste, compléments et flexibilité
            </Typography>
          </Box>
          <Box sx={{ px: 2, py: 1.5 }}>
            <MenageOpsPanel
              listingId={String(listingId)}
              listingValues={listingValues}
              focusTrack="all"
              onListingPatch={patch =>
                setListingValues(prev => ({ ...prev, ...patch }))
              }
            />
          </Box>
        </Box>

        <V3MenageBaremePanel listingId={String(listingId)} />
      </Stack>
    </Box>
  );
}
