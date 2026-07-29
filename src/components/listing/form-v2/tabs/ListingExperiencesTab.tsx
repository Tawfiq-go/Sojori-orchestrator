import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ListingExperiencesPicker } from '../../../../features/orchestrationListingV3/ListingExperiencesPicker';
import { fetchListingConciergeArrays } from '../../../../features/listing/components/ConfigOrchestration/conciergeListingPersist';

type Props = {
  listingId?: string | null;
  listingCityId?: string | null;
  listingOwnerId?: string | null;
};

/**
 * Onglet listing « Expériences » — active les expériences cochées pour le guest (J3).
 * Hors orchestration : Transport / Courses restent dans Orchestration V3.
 */
export default function ListingExperiencesTab({
  listingId,
  listingCityId,
  listingOwnerId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [enabledIds, setEnabledIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const conc = await fetchListingConciergeArrays(String(listingId));
        if (!cancelled) {
          setEnabledIds(conc.enabledExperienceIds ?? null);
        }
      } catch {
        if (!cancelled) setEnabledIds([]);
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
          Enregistrez d’abord le listing pour activer des expériences.
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
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 820 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', mb: 0.5 }}>
        LISTING
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 750, mb: 0.75, lineHeight: 1.2 }}>
        Expériences
      </Typography>
      <ListingExperiencesPicker
        listingId={String(listingId)}
        listingCityId={listingCityId || null}
        listingOwnerId={listingOwnerId || null}
        enabledIds={enabledIds}
        onSaved={(ids) => setEnabledIds(ids)}
        maxHeight={560}
      />
    </Box>
  );
}
