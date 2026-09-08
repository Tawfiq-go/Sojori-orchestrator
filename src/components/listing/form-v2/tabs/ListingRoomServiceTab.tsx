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
import { extractHttpErrorMessage } from '../../../../utils/extractHttpErrorMessage';
import {
  ListingBreakfastFormulas,
  draftFromDish,
  sanitizeOptionGroups,
  sortBreakfastDishes,
} from './ListingBreakfastFormulas';
import {
  activeBreakfastDishes,
  breakfastFormulaPatch,
  newBreakfastFormulaBody,
  retireFormulaPatch,
} from './breakfastFormulaHelpers';

type Props = {
  listingId?: string | null;
  listingCityId?: string | null;
  listingOwnerId?: string | null;
  /**
   * breakfast = onglet « PDJ Inclus » (formules incluses, fenêtre, annulation) ;
   * card = onglet « Room service » (carte payante, ce que WhatsApp montre sous 🍴).
   * Même catalogue room_service : « Inclus au petit déjeuner » fait passer un plat
   * d'un onglet à l'autre après Enregistrer.
   */
  mode?: 'breakfast' | 'card';
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
  cancelCutoffDaysBefore: 1,
  cancelCutoffHour: 17,
  supplementMode: 'none',
  supplementServiceIds: [],
};

type FormulaDraft = ReturnType<typeof draftFromDish>;

type NewFormula = { title: string; priceMad: string; whatsapp: string; description: string };
const EMPTY_NEW: NewFormula = { title: '', priceMad: '0', whatsapp: '', description: '' };

/**
 * Onglet listing « PDJ Inclus » — une activation, puis chaque formule
 * (description, supplément, options). Staff, pas de provider.
 */
export default function ListingRoomServiceTab({
  listingId,
  listingCityId,
  listingOwnerId,
  mode = 'breakfast',
}: Props) {
  const isCard = mode === 'card';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [breakfast, setBreakfast] = useState<RoomServiceBreakfastConfig>(DEFAULT_BREAKFAST);
  const [dishes, setDishes] = useState<PartnerService[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FormulaDraft>>({});
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  /** Inclus tels que chargés : un plat reste dans son onglet jusqu'à Enregistrer. */
  const [loadedIncludedIds, setLoadedIncludedIds] = useState<Set<string>>(new Set());
  const [supplementIds, setSupplementIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newFormula, setNewFormula] = useState<NewFormula>(EMPTY_NEW);

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
      const rows = sortBreakfastDishes(activeBreakfastDishes(catalog));
      setDishes(rows);
      const nextDrafts: Record<string, FormulaDraft> = {};
      for (const r of rows) nextDrafts[String(r.id)] = draftFromDish(r);
      setDrafts(nextDrafts);

      const b = conc.roomServiceBreakfast ?? { ...DEFAULT_BREAKFAST };
      setBreakfast(b);
      const included = new Set((b.includedServiceIds || []).map(String));
      setIncludedIds(included);
      setLoadedIncludedIds(new Set(included));
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
      setLoadedIncludedIds(new Set());
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
  cancelCutoffDaysBefore: 1,
  cancelCutoffHour: 17,
      },
    });
  };

  const saveWindow = async (next: RoomServiceBreakfastConfig) => {
    setBreakfast(next);
    try {
      await persistBreakfastConfig(next);
      toast.success('Fenêtre petit déjeuner enregistrée');
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Enregistrement impossible'));
    }
  };

  const save = async () => {
    if (!listingId) return;
    setSaving(true);
    try {
      for (const dish of dishes) {
        const id = String(dish.id);
        const draft = drafts[id] || draftFromDish(dish);
        const patch = breakfastFormulaPatch(dish, draft, sanitizeOptionGroups);
        if (!patch) continue;
        await partnersApi.updateExperience(id, patch);
      }

      const included = Array.from(includedIds);
      const supplement = Array.from(supplementIds).filter((id) => includedIds.has(id));
      const current = await fetchListingConciergeArrays(String(listingId));
      const catalogIds = new Set(dishes.map((d) => String(d.id)));
      const currentIds = (current.enabledExperienceIds ?? []).map(String);
      const keptOther = currentIds.filter((id) => !catalogIds.has(id));
      // Carte payante WhatsApp = plats room_service activés sur le listing mais non
      // inclus au PDJ. L'onglet Room service l'aligne sur le catalogue (moins les
      // plats retirés) ; l'onglet PDJ ne touche pas à ce qui est déjà activé.
      // Avant : la liste était réécrite avec les seuls inclus, ce qui éteignait la
      // carte payante dans WhatsApp à chaque enregistrement.
      const paidIds = isCard
        ? dishes.map((d) => String(d.id)).filter((id) => !includedIds.has(id))
        : currentIds.filter((id) => catalogIds.has(id) && !includedIds.has(id));
      const enabledExperienceIds = Array.from(new Set([...keptOther, ...included, ...paidIds]));

      await persistListingConciergeSlice(String(listingId), {
        enabledExperienceIds,
        roomServiceBreakfast: {
          ...breakfast,
          includedServiceIds: included,
          supplementServiceIds: supplement,
          supplementMode: supplement.length ? 'with_supplement' : 'none',
          guestMustSelectDays: true,
  cancelCutoffDaysBefore: 1,
  cancelCutoffHour: 17,
        },
      });
      setBreakfast((prev) => ({
        ...prev,
        includedServiceIds: included,
        supplementServiceIds: supplement,
        supplementMode: supplement.length ? 'with_supplement' : 'none',
      }));
      toast.success('Petit déjeuner inclus enregistré');
      await load();
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Enregistrement impossible'));
    } finally {
      setSaving(false);
    }
  };

  /** Crée une formule (PartnerService room_service) puis l'inclut dans le PDJ. */
  const createFormula = async () => {
    const whatsapp = newFormula.whatsapp.trim() || dishes.find((d) => d.whatsapp)?.whatsapp || '';
    const body = newBreakfastFormulaBody({
      ownerId: listingOwnerId || undefined,
      title: newFormula.title,
      description: newFormula.description,
      priceMad: Number(newFormula.priceMad) || 0,
      whatsapp,
    });
    if ('error' in body) {
      toast.error(body.error);
      return;
    }
    setCreating(true);
    try {
      const created = await partnersApi.createExperience(body);
      const id = String(created.id);
      setDishes((prev) => sortBreakfastDishes([...prev, created]));
      setDrafts((prev) => ({ ...prev, [id]: draftFromDish(created) }));
      if (!isCard) {
        setIncludedIds((prev) => new Set(prev).add(id));
        setLoadedIncludedIds((prev) => new Set(prev).add(id));
        setBreakfast((p) => (p.enabled ? p : { ...p, enabled: true }));
      }
      setNewFormula(EMPTY_NEW);
      setNewOpen(false);
      toast.success(
        isCard
          ? `Plat « ${created.title} » ajouté à la carte — pensez à Enregistrer`
          : `Formule « ${created.title} » créée — pensez à Enregistrer`,
      );
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Création impossible'));
    } finally {
      setCreating(false);
    }
  };

  /** Retire une formule : active=false côté partenaires, jamais de suppression physique. */
  const removeFormula = async (id: string) => {
    const dish = dishes.find((d) => String(d.id) === id);
    if (!dish) return;
    if (!window.confirm(`Retirer la formule « ${dish.title} » du petit déjeuner ?`)) return;
    try {
      await partnersApi.updateExperience(id, retireFormulaPatch(dish));
      setDishes((prev) => prev.filter((d) => String(d.id) !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setIncludedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSupplementIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success(`Formule « ${dish.title} » retirée — pensez à Enregistrer`);
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Retrait impossible'));
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

  // Un plat reste dans l'onglet où il a été chargé jusqu'à Enregistrer.
  const visibleDishes = dishes.filter((d) =>
    isCard ? !loadedIncludedIds.has(String(d.id)) : loadedIncludedIds.has(String(d.id)),
  );

  const formulasList = (
    <ListingBreakfastFormulas
      mode={mode}
      emptyText={
        isCard
          ? 'Aucun plat payant sur ce listing. Ajoutez-en un avec « Nouveau plat ».'
          : undefined
      }
      dishes={visibleDishes}
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
      onRemove={(id) => void removeFormula(id)}
    />
  );

  const newFormulaBlock = (
    <>
    {newOpen ? (
      <Box
        sx={{
          mt: 1.5,
          p: 1.5,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1.5,
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
        }}
      >
        <TextField
          size="small"
          label={isCard ? 'Nom du plat' : 'Nom de la formule'}
          value={newFormula.title}
          onChange={(e) => setNewFormula((p) => ({ ...p, title: e.target.value }))}
          slotProps={{ htmlInput: { maxLength: 160 } }}
          autoFocus
        />
        <TextField
          size="small"
          type="number"
          label="Prix MAD"
          value={newFormula.priceMad}
          onChange={(e) => setNewFormula((p) => ({ ...p, priceMad: e.target.value }))}
          slotProps={{ htmlInput: { min: 0, step: 10 } }}
          helperText={isCard ? 'Prix payé à la commande' : '0 = inclus dans le séjour'}
        />
        <TextField
          size="small"
          label="WhatsApp cuisine (notifications)"
          value={newFormula.whatsapp}
          onChange={(e) => setNewFormula((p) => ({ ...p, whatsapp: e.target.value }))}
          placeholder={dishes.find((d) => d.whatsapp)?.whatsapp || '+212…'}
          helperText={
            dishes.find((d) => d.whatsapp)?.whatsapp
              ? 'Vide = même numéro que les autres formules'
              : 'Numéro qui reçoit les commandes'
          }
          sx={{ gridColumn: { sm: '1 / -1' } }}
        />
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          label="Description"
          value={newFormula.description}
          onChange={(e) => setNewFormula((p) => ({ ...p, description: e.target.value }))}
          sx={{ gridColumn: { sm: '1 / -1' } }}
        />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', gridColumn: { sm: '1 / -1' } }}>
          <Button
            size="small"
            disabled={creating}
            onClick={() => {
              setNewOpen(false);
              setNewFormula(EMPTY_NEW);
            }}
          >
            Annuler
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={creating || !newFormula.title.trim()}
            onClick={() => void createFormula()}
          >
            {creating ? '…' : isCard ? 'Ajouter à la carte' : 'Créer la formule'}
          </Button>
        </Box>
      </Box>
    ) : (
      <Button
        size="small"
        onClick={() => setNewOpen(true)}
        sx={{ mt: 1, textTransform: 'none' }}
      >
        {isCard ? '＋ Nouveau plat' : '＋ Nouvelle formule'}
      </Button>
    )}
    </>
  );

  if (isCard) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 }, width: '100%' }}>
        <Typography sx={{ fontSize: 18, fontWeight: 750, lineHeight: 1.2 }}>
          Room service — carte payante
        </Typography>
        <Typography sx={{ mt: 0.75, fontSize: 12, color: 'text.secondary' }}>
          Ce que le voyageur voit dans WhatsApp sous 🍴 Room service : plats et catégories
          payés à la commande, avec leurs options. « Inclus au petit déjeuner » déplace un plat
          vers l’onglet PDJ Inclus après Enregistrer. La porte s’allume dans WhatsApp si le
          service Room Service est activé dans Orchestration.
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2.5, mb: 0.25 }}>Carte</Typography>
        {formulasList}
        {newFormulaBlock}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="small" disabled={saving} onClick={() => void save()}>
            {saving ? '…' : 'Enregistrer'}
          </Button>
        </Box>
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

      <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2.5, mb: 0.25 }}>
        Limite d’annulation
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          type="number"
          label="Jours avant"
          inputProps={{ min: 0, max: 14 }}
          sx={{ width: 130 }}
          value={breakfast.cancelCutoffDaysBefore ?? 1}
          onChange={(e) =>
            setBreakfast((p) => ({
              ...p,
              cancelCutoffDaysBefore: Math.min(14, Math.max(0, Number(e.target.value) || 0)),
            }))
          }
        />
        <TextField
          size="small"
          type="number"
          label="Heure limite"
          inputProps={{ min: 0, max: 23 }}
          sx={{ width: 130 }}
          value={breakfast.cancelCutoffHour ?? 17}
          onChange={(e) =>
            setBreakfast((p) => ({
              ...p,
              cancelCutoffHour: Math.min(23, Math.max(0, Number(e.target.value) || 0)),
            }))
          }
        />
      </Box>
      <Typography sx={{ mt: 0.75, fontSize: 12, color: 'text.secondary' }}>
        Jusqu’à quand le voyageur peut annuler ou modifier un petit déjeuner, en heure locale
        du logement. 1 jour / 17h = la veille à 17h. Mettre 2 jours si la cuisine commande plus
        tôt.
      </Typography>

      <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2.5, mb: 0.25 }}>Formules</Typography>
      {formulasList}

      {newFormulaBlock}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" size="small" disabled={saving} onClick={() => void save()}>
          {saving ? '…' : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
}
