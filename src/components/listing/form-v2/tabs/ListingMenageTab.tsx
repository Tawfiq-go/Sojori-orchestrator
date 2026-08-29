import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import listingsService from '../../../../services/listingsService';
import V3HousekeepingPolicyPanel, {
  type HousekeepingPolicyConfig,
} from '../../../../features/orchestrationListingV3/V3HousekeepingPolicyPanel';

type Props = {
  listingId?: string | null;
};

/**
 * Onglet listing « Ménage » — première pierre de la page ménage listing.
 * Cette itération : uniquement la politique (création / assignation / notification).
 * Les panneaux suivants (types de ménage, barème…) s'empileront dans la même Stack.
 */
export default function ListingMenageTab({ listingId }: Props) {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<HousekeepingPolicyConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await listingsService.getListingOrchestration(String(listingId));
        const doc = (res as { data?: Record<string, unknown> })?.data ?? res;
        const rules =
          doc && typeof doc === 'object'
            ? ((doc as Record<string, unknown>).cleaningRules as
                | Record<string, unknown>
                | undefined)
            : undefined;
        const hp = rules?.housekeepingPolicy as HousekeepingPolicyConfig | undefined;
        if (!cancelled) setPolicy(hp ?? null);
      } catch {
        // 404 = listing non migré orchestration → politique non configurée (défauts backend).
        if (!cancelled) setPolicy(null);
      } finally {
        if (!cancelled) setLoading(false);
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
        {/* Prochains panneaux ménage (types, barème…) s'empilent ici. */}
      </Stack>
    </Box>
  );
}
