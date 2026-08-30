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
 * Onglet listing « Room Service » — catalogue plats (sidebar), comme Ménage / Expériences.
 * Orchestration (flag guest WhatsApp) reste dans Orchestration V3.
 */
export default function ListingRoomServiceTab({
  listingId,
  listingCityId,
  listingOwnerId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [enabledIds, setEnabledIds] = useState<string[]>([]);

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
          setEnabledIds(conc.enabledExperienceIds ?? []);
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
          Enregistrez d’abord le listing pour activer le Room Service.
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
      <Typography
        sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', mb: 0.5 }}
      >
        LISTING
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 750, mb: 0.75, lineHeight: 1.2 }}>
        Room Service
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5, lineHeight: 1.5 }}>
        Catalogue plats + options. Activez les plats ici ; le menu guest WhatsApp se
        pilote dans Orchestration.
      </Typography>
      <ListingExperiencesPicker
        listingId={String(listingId)}
        listingCityId={listingCityId || null}
        listingOwnerId={listingOwnerId || null}
        enabledIds={enabledIds}
        onSaved={(ids) => setEnabledIds(ids)}
        kindFilter="room_service"
        maxHeight={560}
      />
    </Box>
  );
}
