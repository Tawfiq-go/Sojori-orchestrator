import { useCallback, useEffect, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import {
  fetchListingConciergeArrays,
  persistListingConciergeSlice,
} from '../../../../features/listing/components/ConfigOrchestration/conciergeListingPersist';
import listingsService from '../../../../services/listingsService';
import { partnersApi, type PartnerService } from '../../../../services/partnersApi';
import type {
  ListingStructure,
  ListingStructureRoomType,
} from '../../../../types/listings.types';
import { extractHttpErrorMessage } from '../../../../utils/extractHttpErrorMessage';
import { GuestPaymentMethodsField } from './GuestPaymentMethodsField';
import {
  ListingBreakfastFormulas,
  draftFromDish,
  sanitizeOptionGroups,
  sortBreakfastDishes,
} from './ListingBreakfastFormulas';
import {
  activeDishesOfKind,
  breakfastFormulaPatch,
  newPartnerServiceBody,
  retireFormulaPatch,
} from './breakfastFormulaHelpers';
import { STAY_OPTION_BEDS, STAY_OPTION_POOL } from './stayOptionCatalog';

type Props = {
  listingId?: string | null;
  listingCityId?: string | null;
  listingOwnerId?: string | null;
};

type ExtraKind = 'pool' | 'beds';
type FormulaDraft = ReturnType<typeof draftFromDish>;
type NewAmbiance = { title: string; priceMad: string; whatsapp: string; description: string };
const EMPTY_NEW: NewAmbiance = { title: '', priceMad: '650', whatsapp: '', description: '' };
const AMBIANCE_CATEGORY = 'Ambiance';

/** Section repliable : titre + résumé d'état lisible sans ouvrir. */
function Section({
  id,
  icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Accordion
      expanded={open}
      onChange={onToggle}
      disableGutters
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px !important', mb: 1, '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${id}-content`} id={`${id}-header`}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', pr: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 750 }}>
            {icon} {title}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{summary}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

/** Une ligne « option native » : interrupteur + prix / jour, enregistrés tout de suite. */
function ExtraRow({
  label,
  hint,
  checked,
  priceMad,
  busy,
  onToggle,
  onPrice,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  priceMad: number;
  busy: boolean;
  onToggle: (next: boolean) => void;
  onPrice: (price: number) => void;
}) {
  // Valeur en cours de saisie ; null = on affiche le prix enregistré.
  const [edited, setEdited] = useState<string | null>(null);
  const price = edited ?? String(priceMad);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 0.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
        opacity: busy ? 0.6 : 1,
        flexWrap: 'wrap',
      }}
    >
      <Switch
        size="small"
        checked={checked}
        disabled={busy}
        onChange={(_, next) => onToggle(next)}
        color="warning"
        slotProps={{ input: { 'aria-label': `${checked ? 'Désactiver' : 'Activer'} ${label}` } }}
      />
      <Box sx={{ flex: 1, minWidth: 160 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{label}</Typography>
        {hint ? <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{hint}</Typography> : null}
      </Box>
      <TextField
        size="small"
        type="number"
        label="DH / jour"
        value={price}
        disabled={busy}
        onChange={(e) => setEdited(e.target.value)}
        onBlur={() => {
          const n = Math.max(0, Math.round(Number(price) || 0));
          setEdited(null);
          if (n !== priceMad) onPrice(n);
        }}
        slotProps={{ htmlInput: { min: 0, step: 50, 'aria-label': `Prix ${label}` } }}
        sx={{ width: 120 }}
      />
    </Box>
  );
}

/**
 * Onglet listing « Options séjour » — quatre sections repliables : paiement, beds
 * piscine, piscine privée, ambiances villa. Les ambiances s'éditent sur place
 * (formules, description, photos, attentions) ; piscine et beds s'enregistrent au clic.
 * Le petit déjeuner reste l’onglet PDJ Inclus, la carte payante l’onglet Room service.
 */
export default function ListingAmbiancesTab({
  listingId,
  listingCityId,
  listingOwnerId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [structure, setStructure] = useState<ListingStructure | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ ambiances: true });

  const [ambiances, setAmbiances] = useState<PartnerService[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FormulaDraft>>({});
  const [enabledAmbianceIds, setEnabledAmbianceIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newAmbiance, setNewAmbiance] = useState<NewAmbiance>(EMPTY_NEW);

  const toggleOpen = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const load = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [conc, struct, catalog] = await Promise.all([
        fetchListingConciergeArrays(String(listingId)),
        listingsService.getListingStructure(String(listingId)),
        partnersApi.listExperienceCatalog({
          scope: 'own',
          cityId: listingCityId || undefined,
          ownerId: listingOwnerId || undefined,
          kinds: ['villa_experience'],
        }),
      ]);
      setStructure(struct);
      const rows = sortBreakfastDishes(activeDishesOfKind(catalog, 'villa_experience'));
      setAmbiances(rows);
      const nextDrafts: Record<string, FormulaDraft> = {};
      for (const r of rows) nextDrafts[String(r.id)] = draftFromDish(r);
      setDrafts(nextDrafts);
      const catalogIds = new Set(rows.map((r) => String(r.id)));
      setEnabledAmbianceIds(
        new Set((conc.enabledExperienceIds ?? []).map(String).filter((id) => catalogIds.has(id))),
      );
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Chargement impossible'));
      setStructure(null);
      setAmbiances([]);
      setDrafts({});
      setEnabledAmbianceIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [listingId, listingCityId, listingOwnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchExtra = async (key: string, payload: Record<string, unknown>, okLabel: string) => {
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
      toast.error(extractHttpErrorMessage(e, 'Enregistrement impossible'));
    } finally {
      setBusyKey(null);
    }
  };

  const buildingPrice = (kind: ExtraKind) =>
    kind === 'pool'
      ? structure?.building.privatePoolPricePerDayMad || STAY_OPTION_POOL.defaultPriceMad
      : structure?.building.bedsPricePerDayMad || STAY_OPTION_BEDS.defaultPriceMad;

  const toggleBuilding = (kind: ExtraKind, next: boolean, price = buildingPrice(kind)) => {
    const spec = kind === 'pool' ? STAY_OPTION_POOL : STAY_OPTION_BEDS;
    void patchExtra(
      `${kind}:building`,
      {
        building:
          kind === 'pool'
            ? { paidPrivatePool: next, privatePoolPricePerDayMad: price }
            : { paidBeds: next, bedsPricePerDayMad: price },
      },
      next ? `${spec.title} · ${price} DH / jour` : `${spec.title} désactivée`,
    );
  };

  const toggleRoomType = (
    rt: ListingStructureRoomType,
    kind: ExtraKind,
    next: boolean,
    price?: number,
  ) => {
    const spec = kind === 'pool' ? STAY_OPTION_POOL : STAY_OPTION_BEDS;
    const p =
      price ??
      (kind === 'pool'
        ? rt.privatePoolPricePerDayMad || spec.defaultPriceMad
        : rt.bedsPricePerDayMad || spec.defaultPriceMad);
    void patchExtra(
      `${kind}:${rt.id}`,
      {
        roomTypeId: rt.id,
        roomType:
          kind === 'pool'
            ? { paidPrivatePool: next, privatePoolPricePerDayMad: p }
            : { paidBeds: next, bedsPricePerDayMad: p },
      },
      next
        ? `${spec.title} · ${rt.otaDisplayName || rt.name} · ${p} DH / jour`
        : `${spec.title} désactivée · ${rt.otaDisplayName || rt.name}`,
    );
  };

  /** Enregistre les ambiances modifiées puis la liste proposée dans WhatsApp. */
  const saveAmbiances = async () => {
    if (!listingId) return;
    setSaving(true);
    try {
      for (const dish of ambiances) {
        const id = String(dish.id);
        const draft = drafts[id] || draftFromDish(dish);
        const patch = breakfastFormulaPatch(dish, draft, sanitizeOptionGroups, {
          formulesEditable: true,
        });
        if (!patch) continue;
        await partnersApi.updateExperience(id, patch);
      }
      const current = await fetchListingConciergeArrays(String(listingId));
      const catalogIds = new Set(ambiances.map((d) => String(d.id)));
      // On ne touche qu'aux ambiances : PDJ, carte payante, expériences restent tels quels.
      const keptOther = (current.enabledExperienceIds ?? []).map(String).filter((id) => !catalogIds.has(id));
      await persistListingConciergeSlice(String(listingId), {
        enabledExperienceIds: Array.from(new Set([...keptOther, ...Array.from(enabledAmbianceIds)])),
      });
      toast.success('Ambiances enregistrées');
      await load();
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Enregistrement impossible'));
    } finally {
      setSaving(false);
    }
  };

  const createAmbiance = async () => {
    const sibling = ambiances.find((d) => d.partnerId) || ambiances[0];
    const whatsapp = newAmbiance.whatsapp.trim() || ambiances.find((d) => d.whatsapp)?.whatsapp || '';
    const body = newPartnerServiceBody({
      ownerId: listingOwnerId || undefined,
      kind: 'villa_experience',
      category: sibling?.category || AMBIANCE_CATEGORY,
      partnerId: sibling?.partnerId || null,
      title: newAmbiance.title,
      description: newAmbiance.description,
      priceMad: Number(newAmbiance.priceMad) || 0,
      whatsapp,
      formuleLabel: 'Essentiel',
    });
    if ('error' in body) {
      toast.error(body.error);
      return;
    }
    setCreating(true);
    try {
      const created = await partnersApi.createExperience(body);
      const id = String(created.id);
      setAmbiances((prev) => sortBreakfastDishes([...prev, created]));
      setDrafts((prev) => ({ ...prev, [id]: draftFromDish(created) }));
      setEnabledAmbianceIds((prev) => new Set(prev).add(id));
      setNewAmbiance(EMPTY_NEW);
      setNewOpen(false);
      toast.success(`Ambiance « ${created.title} » créée — pensez à Enregistrer`);
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Création impossible'));
    } finally {
      setCreating(false);
    }
  };

  const removeAmbiance = async (id: string) => {
    const dish = ambiances.find((d) => String(d.id) === id);
    if (!dish) return;
    if (!window.confirm(`Retirer l’ambiance « ${dish.title} » ?`)) return;
    try {
      await partnersApi.updateExperience(id, retireFormulaPatch(dish));
      setAmbiances((prev) => prev.filter((d) => String(d.id) !== id));
      setEnabledAmbianceIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success(`Ambiance « ${dish.title} » retirée — pensez à Enregistrer`);
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Retrait impossible'));
    }
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
  const paymentModes = structure?.building.guestPaymentMethods?.length
    ? structure.building.guestPaymentMethods.length
    : 1;
  const bedsOn = structure?.building.paidBeds === true;
  const poolSummary = isMulti
    ? `${roomTypes.filter((rt) => rt.paidPrivatePool === true).length}/${roomTypes.length} types de villa`
    : structure?.building.paidPrivatePool
      ? `Activée · ${buildingPrice('pool')} DH / jour`
      : 'Désactivée';
  const ambianceSummary = ambiances.length
    ? `${enabledAmbianceIds.size}/${ambiances.length} proposées dans WhatsApp`
    : 'aucune ambiance';

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, width: '100%' }}>
      <Typography sx={{ mb: 1.5, fontSize: 12, color: 'text.secondary' }}>
        Ce que le voyageur voit dans WhatsApp sous 🌞 Options séjour. Le petit déjeuner est dans
        PDJ Inclus, la carte payante dans Room service.
      </Typography>

      <Section
        id="payment"
        icon="💳"
        title="Paiement"
        summary={`${paymentModes} mode${paymentModes > 1 ? 's' : ''} proposé${paymentModes > 1 ? 's' : ''} au voyageur`}
        open={Boolean(open.payment)}
        onToggle={() => toggleOpen('payment')}
      >
        <GuestPaymentMethodsField
          value={structure?.building.guestPaymentMethods}
          busy={busyKey === 'guestPayment'}
          onChange={(methods) => {
            void patchExtra(
              'guestPayment',
              { building: { guestPaymentMethods: methods } },
              `Paiement extras : ${methods.join(' + ')}`,
            );
          }}
        />
      </Section>

      <Section
        id="beds"
        icon="🛏️"
        title={STAY_OPTION_BEDS.title}
        summary={bedsOn ? `Activée · ${buildingPrice('beds')} DH / jour` : 'Désactivée'}
        open={Boolean(open.beds)}
        onToggle={() => toggleOpen('beds')}
      >
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
          {STAY_OPTION_BEDS.description} {STAY_OPTION_BEDS.choiceLabel} · {STAY_OPTION_BEDS.daysLabel}.
          {isMulti ? ' Réglage au niveau de l’hôtel.' : ''}
        </Typography>
        <ExtraRow
          label={STAY_OPTION_BEDS.title}
          checked={bedsOn}
          priceMad={buildingPrice('beds')}
          busy={busyKey === 'beds:building'}
          onToggle={(next) => toggleBuilding('beds', next)}
          onPrice={(price) => toggleBuilding('beds', bedsOn, price)}
        />
      </Section>

      <Section
        id="pool"
        icon="🏊"
        title={STAY_OPTION_POOL.title}
        summary={poolSummary}
        open={Boolean(open.pool)}
        onToggle={() => toggleOpen('pool')}
      >
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
          {STAY_OPTION_POOL.description} {STAY_OPTION_POOL.choiceLabel} · {STAY_OPTION_POOL.daysLabel}.
          {isMulti ? ' Réglage par type de villa.' : ''}
        </Typography>
        {isMulti && roomTypes.length > 0 ? (
          roomTypes.map((rt) => (
            <ExtraRow
              key={rt.id}
              label={rt.otaDisplayName || rt.name}
              checked={rt.paidPrivatePool === true}
              priceMad={rt.privatePoolPricePerDayMad || STAY_OPTION_POOL.defaultPriceMad}
              busy={busyKey === `pool:${rt.id}`}
              onToggle={(next) => toggleRoomType(rt, 'pool', next)}
              onPrice={(price) => toggleRoomType(rt, 'pool', rt.paidPrivatePool === true, price)}
            />
          ))
        ) : (
          <ExtraRow
            label={STAY_OPTION_POOL.title}
            checked={structure?.building.paidPrivatePool === true}
            priceMad={buildingPrice('pool')}
            busy={busyKey === 'pool:building'}
            onToggle={(next) => toggleBuilding('pool', next)}
            onPrice={(price) =>
              toggleBuilding('pool', structure?.building.paidPrivatePool === true, price)
            }
          />
        )}
      </Section>

      <Section
        id="ambiances"
        icon="🌹"
        title="Ambiances villa"
        summary={ambianceSummary}
        open={Boolean(open.ambiances)}
        onToggle={() => toggleOpen('ambiances')}
      >
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
          Romance, anniversaire, célébration… Chaque ambiance : formules avec prix, description,
          photos (3 max) et attentions à la carte. « Proposée dans WhatsApp » l’allume pour ce
          listing ; « Retirer » la sort du catalogue.
        </Typography>
        <ListingBreakfastFormulas
          mode="ambiance"
          emptyText="Aucune ambiance. Ajoutez-en une avec « Nouvelle ambiance »."
          dishes={ambiances}
          drafts={drafts}
          includedIds={enabledAmbianceIds}
          supplementIds={new Set()}
          onToggleIncluded={(id, on) =>
            setEnabledAmbianceIds((prev) => {
              const next = new Set(prev);
              if (on) next.add(id);
              else next.delete(id);
              return next;
            })
          }
          onToggleSupplement={() => undefined}
          onDraftChange={(id, patch) =>
            setDrafts((prev) => {
              const dish = ambiances.find((d) => String(d.id) === id);
              const base = prev[id] || (dish ? draftFromDish(dish) : undefined);
              if (!base) return prev;
              return { ...prev, [id]: { ...base, ...patch } };
            })
          }
          onRemove={(id) => void removeAmbiance(id)}
        />

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
              label="Nom de l’ambiance"
              value={newAmbiance.title}
              onChange={(e) => setNewAmbiance((p) => ({ ...p, title: e.target.value }))}
              slotProps={{ htmlInput: { maxLength: 160 } }}
              autoFocus
            />
            <TextField
              size="small"
              type="number"
              label="Prix Essentiel (MAD)"
              value={newAmbiance.priceMad}
              onChange={(e) => setNewAmbiance((p) => ({ ...p, priceMad: e.target.value }))}
              slotProps={{ htmlInput: { min: 0, step: 50 } }}
              helperText="D’autres formules s’ajoutent ensuite"
            />
            <TextField
              size="small"
              label="WhatsApp staff (notifications)"
              value={newAmbiance.whatsapp}
              onChange={(e) => setNewAmbiance((p) => ({ ...p, whatsapp: e.target.value }))}
              placeholder={ambiances.find((d) => d.whatsapp)?.whatsapp || '+212…'}
              helperText={
                ambiances.find((d) => d.whatsapp)?.whatsapp
                  ? 'Vide = même numéro que les autres ambiances'
                  : 'Numéro qui reçoit les demandes'
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
              value={newAmbiance.description}
              onChange={(e) => setNewAmbiance((p) => ({ ...p, description: e.target.value }))}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', gridColumn: { sm: '1 / -1' } }}>
              <Button
                size="small"
                disabled={creating}
                onClick={() => {
                  setNewOpen(false);
                  setNewAmbiance(EMPTY_NEW);
                }}
              >
                Annuler
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={creating || !newAmbiance.title.trim()}
                onClick={() => void createAmbiance()}
              >
                {creating ? '…' : 'Créer l’ambiance'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Button size="small" onClick={() => setNewOpen(true)} sx={{ mt: 1, textTransform: 'none' }}>
            ＋ Nouvelle ambiance
          </Button>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="small" disabled={saving} onClick={() => void saveAmbiances()}>
            {saving ? '…' : 'Enregistrer les ambiances'}
          </Button>
        </Box>
      </Section>
    </Box>
  );
}
