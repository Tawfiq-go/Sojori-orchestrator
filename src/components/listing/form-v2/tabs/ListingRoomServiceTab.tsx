import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import {
  fetchListingConciergeArrays,
  persistListingConciergeSlice,
  type RoomServiceBreakfastConfig,
} from '../../../../features/listing/components/ConfigOrchestration/conciergeListingPersist';
import { partnersApi, type PartnerService } from '../../../../services/partnersApi';
import {
  ListingBreakfastFormulas,
  draftFromDish,
  sanitizeOptionGroups,
  sortBreakfastDishes,
} from './ListingBreakfastFormulas';

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
  supplementMode: 'none',
  supplementServiceIds: [],
};

type FormulaDraft = ReturnType<typeof draftFromDish>;

/**
 * Onglet listing « PDJ Inclus » — une activation, puis chaque formule
 * (description, supplément, options). Staff, pas de provider.
 */
export default function ListingRoomServiceTab({
  listingId,
  listingCityId,
  listingOwnerId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [breakfast, setBreakfast] = useState<RoomServiceBreakfastConfig>(DEFAULT_BREAKFAST);
  const [dishes, setDishes] = useState<PartnerService[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FormulaDraft>>({});
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [supplementIds, setSupplementIds] = useState<Set<string>>(new Set());

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
          scope: 'own',
          cityId: listingCityId || undefined,
          ownerId: listingOwnerId || undefined,
          kinds: ['room_service'],
        }),
      ]);
      const rows = sortBreakfastDishes(catalog.filter((r) => (r.kind || '') === 'room_service'));
      setDishes(rows);
      const nextDrafts: Record<string, FormulaDraft> = {};
      for (const r of rows) nextDrafts[String(r.id)] = draftFromDish(r);
      setDrafts(nextDrafts);

      const b = conc.roomServiceBreakfast ?? { ...DEFAULT_BREAKFAST };
      setBreakfast(b);
      const included = new Set((b.includedServiceIds || []).map(String));
      setIncludedIds(included);
      const savedSupp = (b.supplementServiceIds || []).map(String).filter((id) => included.has(id));
      if (savedSupp.length) {
        setSupplementIds(new Set(savedSupp));
      } else if (b.supplementMode === 'with_supplement') {
        setSupplementIds(new Set(included));
      } else {
        setSupplementIds(new Set());
      }
    } catch {
      setDishes([]);
      setDrafts({});
      setBreakfast({ ...DEFAULT_BREAKFAST });
      setIncludedIds(new Set());
      setSupplementIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [listingId, listingCityId, listingOwnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistBreakfastConfig = async (next: RoomServiceBreakfastConfig) => {
    if (!listingId) return;
    const included = Array.from(includedIds);
    const supplement = Array.from(supplementIds).filter((id) => includedIds.has(id));
    await persistListingConciergeSlice(String(listingId), {
      roomServiceBreakfast: {
        ...next,
        includedServiceIds: included,
        supplementServiceIds: supplement,
        supplementMode: supplement.length ? 'with_supplement' : 'none',
        guestMustSelectDays: true,
      },
    });
  };

  const saveWindow = async (next: RoomServiceBreakfastConfig) => {
    setBreakfast(next);
    try {
      await persistBreakfastConfig(next);
      toast.success('Fenêtre petit déjeuner enregistrée');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    }
  };

  const save = async () => {
    if (!listingId) return;
    setSaving(true);
    try {
      for (const dish of dishes) {
        const id = String(dish.id);
        const draft = drafts[id] || draftFromDish(dish);
        const optionGroups = sanitizeOptionGroups(draft.optionGroups);
        const desc = (draft.description || '').trim();
        const sameDesc = (dish.description || '').trim() === desc;
        const sameOpts = JSON.stringify(dish.optionGroups || []) === JSON.stringify(optionGroups);
        if (sameDesc && sameOpts) continue;
        await partnersApi.updateExperience(id, {
          description: desc,
          optionGroups,
        });
      }

      const included = Array.from(includedIds);
      const supplement = Array.from(supplementIds).filter((id) => includedIds.has(id));
      const current = await fetchListingConciergeArrays(String(listingId));
      const catalogIds = new Set(dishes.map((d) => String(d.id)));
      const keptOther = (current.enabledExperienceIds ?? [])
        .map(String)
        .filter((id) => !catalogIds.has(id));

      await persistListingConciergeSlice(String(listingId), {
        enabledExperienceIds: [...keptOther, ...included],
        roomServiceBreakfast: {
          ...breakfast,
          includedServiceIds: included,
          supplementServiceIds: supplement,
          supplementMode: supplement.length ? 'with_supplement' : 'none',
          guestMustSelectDays: true,
        },
      });
      setBreakfast((prev) => ({
        ...prev,
        includedServiceIds: included,
        supplementServiceIds: supplement,
        supplementMode: supplement.length ? 'with_supplement' : 'none',
      }));
      toast.success('Petit déjeuner inclus enregistré');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 750, lineHeight: 1.2 }}>
          Petit déjeuner inclus
        </Typography>
        <Switch
          checked={breakfast.enabled}
          onChange={(_, checked) => setBreakfast((p) => ({ ...p, enabled: checked }))}
          slotProps={{ input: { 'aria-label': 'Activer le petit déjeuner inclus' } }}
        />
      </Box>

      <Box
        sx={{
          mt: 1.5,
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
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
              void saveWindow({
                ...breakfast,
                start: e.target.value as RoomServiceBreakfastConfig['start'],
              })
            }
          >
            <MenuItem value="j_plus_1">J+1</MenuItem>
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
              void saveWindow({
                ...breakfast,
                endInclusive: e.target.value === 'departure',
              })
            }
          >
            <MenuItem value="eve">Veille du départ</MenuItem>
            <MenuItem value="departure">Jour de départ</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel id="rs-time-mode">Heure guest</InputLabel>
          <Select
            labelId="rs-time-mode"
            label="Heure guest"
            value={breakfast.timeMode || 'shared'}
            onChange={(e) =>
              setBreakfast((p) => ({
                ...p,
                timeMode: e.target.value as RoomServiceBreakfastConfig['timeMode'],
              }))
            }
          >
            <MenuItem value="per_traveler">Même heure par jour</MenuItem>
            <MenuItem value="shared">Heure à la confirmation</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Heure défaut"
          value={breakfast.defaultTime || '09:00'}
          onChange={(e) => setBreakfast((p) => ({ ...p, defaultTime: e.target.value }))}
        />
        <TextField
          size="small"
          label="De"
          value={breakfast.timeWindow?.from || '07:00'}
          onChange={(e) =>
            setBreakfast((p) => ({
              ...p,
              timeWindow: { from: e.target.value, to: p.timeWindow?.to || '11:00' },
            }))
          }
        />
        <TextField
          size="small"
          label="À"
          value={breakfast.timeWindow?.to || '11:00'}
          onChange={(e) =>
            setBreakfast((p) => ({
              ...p,
              timeWindow: { from: p.timeWindow?.from || '07:00', to: e.target.value },
            }))
          }
        />
      </Box>
      <Typography sx={{ mt: 0.75, fontSize: 12, color: 'text.secondary' }}>
        Début et Fin s’enregistrent tout de suite. « Jour de départ » ajoute le matin du
        checkout dans WhatsApp, même formule pour tous les matins.
      </Typography>

      <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2.5, mb: 0.25 }}>Formules</Typography>
      <ListingBreakfastFormulas
        dishes={dishes}
        drafts={drafts}
        includedIds={includedIds}
        supplementIds={supplementIds}
        onToggleIncluded={(id, on) => {
          setIncludedIds((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
          });
          if (on) setBreakfast((p) => (p.enabled ? p : { ...p, enabled: true }));
          if (!on) {
            setSupplementIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        }}
        onToggleSupplement={(id, on) => {
          setSupplementIds((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
          });
        }}
        onDraftChange={(id, patch) => {
          setDrafts((prev) => {
            const dish = dishes.find((d) => String(d.id) === id);
            const base = prev[id] || (dish ? draftFromDish(dish) : undefined);
            if (!base) return prev;
            return { ...prev, [id]: { ...base, ...patch } };
          });
        }}
      />

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" size="small" disabled={saving} onClick={() => void save()}>
          {saving ? '…' : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
}
