import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { ListingExperiencesPicker } from '../../../../features/orchestrationListingV3/ListingExperiencesPicker';
import {
  fetchListingConciergeArrays,
  persistListingConciergeSlice,
  type RoomServiceBreakfastConfig,
} from '../../../../features/listing/components/ConfigOrchestration/conciergeListingPersist';
import { partnersApi, type PartnerService } from '../../../../services/partnersApi';

type Props = {
  listingId?: string | null;
  listingCityId?: string | null;
  listingOwnerId?: string | null;
};

const DEFAULT_BREAKFAST: RoomServiceBreakfastConfig = {
  enabled: false,
  entitlement: 'per_traveler',
  start: 'j_plus_1',
  endInclusive: false,
  includedServiceIds: [],
  defaultTime: '09:00',
  timeWindow: { from: '07:00', to: '11:00' },
  timeMode: 'shared',
  guestMustSelectDays: true,
};

/**
 * Onglet listing « Room Service » — PDJ inclus (staff) + catalogue plats.
 */
export default function ListingRoomServiceTab({
  listingId,
  listingCityId,
  listingOwnerId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [savingBreakfast, setSavingBreakfast] = useState(false);
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [breakfast, setBreakfast] = useState<RoomServiceBreakfastConfig>(DEFAULT_BREAKFAST);
  const [dishRows, setDishRows] = useState<PartnerService[]>([]);

  const load = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [conc, catalog] = await Promise.all([
        fetchListingConciergeArrays(String(listingId)),
        partnersApi.listExperienceCatalog({
          scope: 'all',
          cityId: listingCityId || undefined,
          ownerId: listingOwnerId || undefined,
        }),
      ]);
      setEnabledIds(conc.enabledExperienceIds ?? []);
      setBreakfast(conc.roomServiceBreakfast ?? { ...DEFAULT_BREAKFAST });
      setDishRows(catalog.filter((r) => (r.kind || '') === 'room_service'));
    } catch {
      setEnabledIds([]);
      setBreakfast({ ...DEFAULT_BREAKFAST });
      setDishRows([]);
    } finally {
      setLoading(false);
    }
  }, [listingId, listingCityId, listingOwnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enabledDishes = useMemo(() => {
    const idSet = new Set(enabledIds.map(String));
    return dishRows.filter((r) => idSet.has(String(r.id)));
  }, [dishRows, enabledIds]);

  const saveBreakfast = async () => {
    if (!listingId) return;
    setSavingBreakfast(true);
    try {
      const included = breakfast.includedServiceIds.filter((id) =>
        enabledIds.map(String).includes(String(id)),
      );
      await persistListingConciergeSlice(String(listingId), {
        roomServiceBreakfast: {
          ...breakfast,
          includedServiceIds: included,
          guestMustSelectDays: true,
        },
      });
      setBreakfast((prev) => ({ ...prev, includedServiceIds: included }));
      toast.success('Petit déjeuner inclus enregistré');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSavingBreakfast(false);
    }
  };

  const toggleIncludedDish = (id: string, on: boolean) => {
    setBreakfast((prev) => {
      const set = new Set(prev.includedServiceIds.map(String));
      if (on) set.add(String(id));
      else set.delete(String(id));
      return { ...prev, includedServiceIds: Array.from(set) };
    });
  };

  if (!listingId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Enregistrez d’abord le listing pour activer le petit déjeuner inclus.
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
        Petit Déjeuner Inclus
      </Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2, lineHeight: 1.5 }}>
        Formules PDJ incluses pour le guest WhatsApp + configuration des jours et horaires.
        Les commandes créent des tâches staff (lettre R).
      </Typography>

      <Box
        sx={{
          mb: 3,
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          bgcolor: 'background.paper',
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1 }}>
          Petit déjeuner inclus
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={breakfast.enabled}
              onChange={(_, checked) => setBreakfast((p) => ({ ...p, enabled: checked }))}
            />
          }
          label="Activer le petit déjeuner inclus (guest WhatsApp)"
        />

        <Box
          sx={{
            mt: 1.5,
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            opacity: breakfast.enabled ? 1 : 0.45,
            pointerEvents: breakfast.enabled ? 'auto' : 'none',
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel id="rs-entitlement">Quota</InputLabel>
            <Select
              labelId="rs-entitlement"
              label="Quota"
              value={breakfast.entitlement}
              onChange={(e) =>
                setBreakfast((p) => ({
                  ...p,
                  entitlement: e.target.value as RoomServiceBreakfastConfig['entitlement'],
                }))
              }
            >
              <MenuItem value="per_traveler">Un par voyageur / jour</MenuItem>
              <MenuItem value="per_reservation">Un par réservation / jour</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="rs-start">Début</InputLabel>
            <Select
              labelId="rs-start"
              label="Début"
              value={breakfast.start}
              onChange={(e) =>
                setBreakfast((p) => ({
                  ...p,
                  start: e.target.value as RoomServiceBreakfastConfig['start'],
                }))
              }
            >
              <MenuItem value="j_plus_1">J+1 (lendemain d’arrivée)</MenuItem>
              <MenuItem value="arrival">Jour d’arrivée</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="rs-end">Fin</InputLabel>
            <Select
              labelId="rs-end"
              label="Fin"
              value={breakfast.endInclusive ? 'departure' : 'eve'}
              onChange={(e) =>
                setBreakfast((p) => ({
                  ...p,
                  endInclusive: e.target.value === 'departure',
                }))
              }
            >
              <MenuItem value="eve">Veille du départ</MenuItem>
              <MenuItem value="departure">Jour de départ inclus</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Heure par défaut"
            value={breakfast.defaultTime || '09:00'}
            onChange={(e) => setBreakfast((p) => ({ ...p, defaultTime: e.target.value }))}
            placeholder="09:00"
          />

          <TextField
            size="small"
            label="Heure min (7h–11h)"
            value={breakfast.timeWindow?.from || '07:00'}
            onChange={(e) =>
              setBreakfast((p) => ({
                ...p,
                timeWindow: { from: e.target.value, to: p.timeWindow?.to || '11:00' },
              }))
            }
            placeholder="07:00"
          />

          <TextField
            size="small"
            label="Heure max (7h–11h)"
            value={breakfast.timeWindow?.to || '11:00'}
            onChange={(e) =>
              setBreakfast((p) => ({
                ...p,
                timeWindow: { from: p.timeWindow?.from || '07:00', to: e.target.value },
              }))
            }
            placeholder="11:00"
          />

          <FormControl size="small" fullWidth>
            <InputLabel id="rs-time-mode">Mode heure guest</InputLabel>
            <Select
              labelId="rs-time-mode"
              label="Mode heure guest"
              value={breakfast.timeMode || 'shared'}
              onChange={(e) =>
                setBreakfast((p) => ({
                  ...p,
                  timeMode: e.target.value as RoomServiceBreakfastConfig['timeMode'],
                }))
              }
            >
              <MenuItem value="shared">Même heure pour toute la commande (écran confirmation)</MenuItem>
              <MenuItem value="per_traveler">Heure par jour (écran sélection)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 2, mb: 0.5 }}>
          Plats inclus (parmi le catalogue activé ci-dessous)
        </Typography>
        <FormGroup sx={{ opacity: breakfast.enabled ? 1 : 0.45, pointerEvents: breakfast.enabled ? 'auto' : 'none' }}>
          {enabledDishes.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Activez d’abord des plats Room Service dans le catalogue.
            </Typography>
          ) : (
            enabledDishes.map((d) => (
              <FormControlLabel
                key={String(d.id)}
                control={
                  <Checkbox
                    size="small"
                    checked={breakfast.includedServiceIds.map(String).includes(String(d.id))}
                    onChange={(_, checked) => toggleIncludedDish(String(d.id), checked)}
                  />
                }
                label={d.title}
              />
            ))
          )}
        </FormGroup>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="small"
            disabled={savingBreakfast}
            onClick={() => void saveBreakfast()}
          >
            {savingBreakfast ? '…' : 'Enregistrer PDJ inclus'}
          </Button>
        </Box>
      </Box>

      <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1 }}>Catalogue plats</Typography>
      <ListingExperiencesPicker
        listingId={String(listingId)}
        listingCityId={listingCityId || null}
        listingOwnerId={listingOwnerId || null}
        enabledIds={enabledIds}
        onSaved={(ids) => {
          setEnabledIds(ids);
          void partnersApi
            .listExperienceCatalog({
              scope: 'all',
              cityId: listingCityId || undefined,
              ownerId: listingOwnerId || undefined,
            })
            .then((list) => setDishRows(list.filter((r) => (r.kind || '') === 'room_service')))
            .catch(() => undefined);
        }}
        kindFilter="room_service"
        maxHeight={560}
      />
    </Box>
  );
}
