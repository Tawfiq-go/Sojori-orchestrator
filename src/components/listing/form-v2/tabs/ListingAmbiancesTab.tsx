import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Switch, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { ListingExperiencesPicker } from '../../../../features/orchestrationListingV3/ListingExperiencesPicker';
import { fetchListingConciergeArrays } from '../../../../features/listing/components/ConfigOrchestration/conciergeListingPersist';
import listingsService from '../../../../services/listingsService';
import type {
  ListingStructure,
  ListingStructureRoomType,
} from '../../../../types/listings.types';
import { STAY_OPTION_BEDS, STAY_OPTION_POOL } from './stayOptionCatalog';

type Props = {
  listingId?: string | null;
  listingCityId?: string | null;
  listingOwnerId?: string | null;
};

type ExtraKind = 'pool' | 'beds';

function StayOptionCard({
  title,
  category,
  choiceLabel,
  daysLabel,
  description,
  priceMad,
  contextLabel,
  checked,
  busy,
  onToggle,
}: {
  title: string;
  category: string;
  choiceLabel: string;
  daysLabel: string;
  description: string;
  priceMad: number;
  contextLabel?: string;
  checked: boolean;
  busy?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1px solid',
        borderColor: checked ? 'warning.main' : 'divider',
        bgcolor: checked ? 'rgba(184, 133, 26, 0.06)' : 'background.paper',
        overflow: 'hidden',
        minHeight: 140,
        opacity: busy ? 0.7 : 1,
      }}
    >
      <Box
        sx={{
          height: 72,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
        }}
      >
        <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600, textAlign: 'center' }}>
          {category}
          {contextLabel ? ` · ${contextLabel}` : ''}
        </Typography>
      </Box>
      <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 700,
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.35 }}>
          {choiceLabel} · {daysLabel}
        </Typography>
        <Typography
          sx={{
            fontSize: 11.5,
            color: 'text.secondary',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>
        <Box
          sx={{
            mt: 'auto',
            pt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: checked ? 'success.dark' : 'text.secondary',
              }}
            >
              {checked ? 'Activée' : 'Désactivée'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{priceMad} DH / jour</Typography>
          </Box>
          <Switch
            size="small"
            checked={checked}
            disabled={busy}
            onChange={(_, next) => onToggle(next)}
            inputProps={{ 'aria-label': checked ? `Désactiver ${title}` : `Activer ${title}` }}
            color="warning"
          />
        </Box>
      </Box>
    </Box>
  );
}

const CARD_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, 1fr)',
    sm: 'repeat(2, 1fr)',
    md: 'repeat(3, 1fr)',
  },
  gap: 1.25,
  maxWidth: 720,
} as const;

/**
 * Onglet listing « Options séjour » — ambiances villa, piscine, beds :
 * mêmes cartes, même activation. Le petit déjeuner reste l’onglet PDJ Inclus.
 */
export default function ListingAmbiancesTab({
  listingId,
  listingCityId,
  listingOwnerId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [structure, setStructure] = useState<ListingStructure | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [conc, struct] = await Promise.all([
        fetchListingConciergeArrays(String(listingId)),
        listingsService.getListingStructure(String(listingId)),
      ]);
      setEnabledIds(conc.enabledExperienceIds ?? []);
      setStructure(struct);
    } catch {
      setEnabledIds([]);
      setStructure(null);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchExtra = async (
    key: string,
    payload: Record<string, unknown>,
    okLabel: string,
  ) => {
    if (!listingId) return;
    setBusyKey(key);
    try {
      const r = await listingsService.patchListingConfiguration(String(listingId), payload);
      if (!r.success) {
        toast.error(r.error || 'Enregistrement impossible');
        return;
      }
      toast.success(okLabel);
      const next = await listingsService.getListingStructure(String(listingId));
      if (next) setStructure(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setBusyKey(null);
    }
  };

  const toggleBuilding = (kind: ExtraKind, next: boolean) => {
    const spec = kind === 'pool' ? STAY_OPTION_POOL : STAY_OPTION_BEDS;
    const price =
      kind === 'pool'
        ? structure?.building.privatePoolPricePerDayMad || spec.defaultPriceMad
        : structure?.building.bedsPricePerDayMad || spec.defaultPriceMad;
    void patchExtra(
      `${kind}:building`,
      {
        building:
          kind === 'pool'
            ? { paidPrivatePool: next, privatePoolPricePerDayMad: price }
            : { paidBeds: next, bedsPricePerDayMad: price },
      },
      next ? `${spec.title} activée` : `${spec.title} désactivée`,
    );
  };

  const toggleRoomType = (rt: ListingStructureRoomType, kind: ExtraKind, next: boolean) => {
    const spec = kind === 'pool' ? STAY_OPTION_POOL : STAY_OPTION_BEDS;
    const price =
      kind === 'pool'
        ? rt.privatePoolPricePerDayMad || spec.defaultPriceMad
        : rt.bedsPricePerDayMad || spec.defaultPriceMad;
    void patchExtra(
      `${kind}:${rt.id}`,
      {
        roomTypeId: rt.id,
        roomType:
          kind === 'pool'
            ? { paidPrivatePool: next, privatePoolPricePerDayMad: price }
            : { paidBeds: next, bedsPricePerDayMad: price },
      },
      next ? `${spec.title} · ${rt.otaDisplayName || rt.name}` : `${spec.title} désactivée`,
    );
  };

  if (!listingId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Enregistrez d’abord le listing pour activer les options séjour.
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

  const isMulti = String(structure?.building.propertyUnit || '') === 'Multi';
  const roomTypes = structure?.roomTypes ?? [];

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, width: '100%' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', mb: 0.5 }}>
        LISTING
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 750, mb: 0.75, lineHeight: 1.2 }}>
        Options séjour
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
        Ambiances villa, piscine et beds : mêmes cartes, même interrupteur. Activez{' '}
        <b>Beds</b> ici pour le voir dans WhatsApp Options séjour. Le petit déjeuner
        reste l’onglet <b>PDJ Inclus</b>.
      </Typography>

      {isMulti && roomTypes.length > 0
        ? roomTypes.map((rt) => (
            <Box key={rt.id} sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 1 }}>
                {rt.otaDisplayName || rt.name}
              </Typography>
              <Box sx={CARD_GRID_SX}>
                <StayOptionCard
                  {...STAY_OPTION_POOL}
                  priceMad={rt.privatePoolPricePerDayMad || STAY_OPTION_POOL.defaultPriceMad}
                  checked={rt.paidPrivatePool === true}
                  busy={busyKey === `pool:${rt.id}`}
                  onToggle={(next) => toggleRoomType(rt, 'pool', next)}
                />
                <StayOptionCard
                  {...STAY_OPTION_BEDS}
                  priceMad={rt.bedsPricePerDayMad || STAY_OPTION_BEDS.defaultPriceMad}
                  checked={rt.paidBeds === true}
                  busy={busyKey === `beds:${rt.id}`}
                  onToggle={(next) => toggleRoomType(rt, 'beds', next)}
                />
              </Box>
            </Box>
          ))
        : (
            <Box sx={{ ...CARD_GRID_SX, mb: 2.5 }}>
              <StayOptionCard
                {...STAY_OPTION_POOL}
                priceMad={
                  structure?.building.privatePoolPricePerDayMad || STAY_OPTION_POOL.defaultPriceMad
                }
                checked={structure?.building.paidPrivatePool === true}
                busy={busyKey === 'pool:building'}
                onToggle={(next) => toggleBuilding('pool', next)}
              />
              <StayOptionCard
                {...STAY_OPTION_BEDS}
                priceMad={structure?.building.bedsPricePerDayMad || STAY_OPTION_BEDS.defaultPriceMad}
                checked={structure?.building.paidBeds === true}
                busy={busyKey === 'beds:building'}
                onToggle={(next) => toggleBuilding('beds', next)}
              />
            </Box>
          )}

      <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 1 }}>Ambiances villa</Typography>
      <ListingExperiencesPicker
        listingId={String(listingId)}
        listingCityId={listingCityId || null}
        listingOwnerId={listingOwnerId || null}
        enabledIds={enabledIds}
        onSaved={(ids) => setEnabledIds(ids)}
        maxHeight={560}
        kindFilter="villa_experience"
        hideIntro
      />
    </Box>
  );
}
