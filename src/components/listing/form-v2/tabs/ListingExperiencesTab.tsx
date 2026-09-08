import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { ListingExperiencesPicker } from '../../../../features/orchestrationListingV3/ListingExperiencesPicker';
import {
  fetchListingConciergeArrays,
  persistListingConciergeSlice,
} from '../../../../features/listing/components/ConfigOrchestration/conciergeListingPersist';
import listingsService from '../../../../services/listingsService';
import { partnersApi, type Partner, type PartnerService } from '../../../../services/partnersApi';
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
import { TabSection } from './tabSection';

type Props = {
  listingId?: string | null;
  listingCityId?: string | null;
  listingOwnerId?: string | null;
};

type FormulaDraft = ReturnType<typeof draftFromDish>;
type NewExperience = {
  partnerId: string;
  title: string;
  category: string;
  priceMad: string;
  whatsapp: string;
  description: string;
};
const EMPTY_NEW: NewExperience = {
  partnerId: '',
  title: '',
  category: '',
  priceMad: '500',
  whatsapp: '',
  description: '',
};
const DEFAULT_CATEGORY = 'Expérience';

/**
 * Onglet listing « Expériences » — quatre sections repliables : paiement, mes
 * expériences (éditées sur place : formules, description, photos, options,
 * proposée dans WhatsApp, créer avec sa fiche provider, retirer), catalogue
 * partagé (marché + navettes, cases à cocher), menus guest.
 * Ambiances / piscine / beds : Options séjour. PDJ et carte : leurs onglets.
 */
export default function ListingExperiencesTab({
  listingId,
  listingCityId,
  listingOwnerId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({ mine: true });
  const toggleOpen = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [guestBlocs, setGuestBlocs] = useState('');
  const [savingBlocs, setSavingBlocs] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<
    Array<'cash' | 'card' | 'card_tpe' | 'room_charge'>
  >([]);
  const [savingPay, setSavingPay] = useState(false);

  const [experiences, setExperiences] = useState<PartnerService[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FormulaDraft>>({});
  const [enabledMine, setEnabledMine] = useState<Set<string>>(new Set());
  const [partners, setPartners] = useState<Partner[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [draftNew, setDraftNew] = useState<NewExperience>(EMPTY_NEW);
  const [previewKey, setPreviewKey] = useState(0);

  const load = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [conc, struct, catalog, partnerRows] = await Promise.all([
        fetchListingConciergeArrays(String(listingId)),
        listingsService.getListingStructure(String(listingId)),
        partnersApi.listExperienceCatalog({
          scope: 'own',
          cityId: listingCityId || undefined,
          ownerId: listingOwnerId || undefined,
          kinds: ['experience'],
        }),
        listingOwnerId
          ? partnersApi.list({ ownerId: String(listingOwnerId), active: true }).catch(() => [])
          : Promise.resolve([] as Partner[]),
      ]);
      const ids = (conc.enabledExperienceIds ?? []).map(String);
      setEnabledIds(ids);
      setGuestBlocs(conc.experienceGuestBlocs || '');
      setPaymentMethods(struct?.building.guestPaymentMethods ?? []);
      const rows = sortBreakfastDishes(activeDishesOfKind(catalog, 'experience'));
      setExperiences(rows);
      const nextDrafts: Record<string, FormulaDraft> = {};
      for (const r of rows) nextDrafts[String(r.id)] = draftFromDish(r);
      setDrafts(nextDrafts);
      const catalogIds = new Set(rows.map((r) => String(r.id)));
      setEnabledMine(new Set(ids.filter((id) => catalogIds.has(id))));
      setPartners(partnerRows);
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Chargement impossible'));
      setEnabledIds([]);
      setGuestBlocs('');
      setExperiences([]);
      setDrafts({});
      setEnabledMine(new Set());
    } finally {
      setLoading(false);
    }
  }, [listingId, listingCityId, listingOwnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Enregistre les expériences modifiées puis la liste proposée dans WhatsApp. */
  const saveMine = async () => {
    if (!listingId) return;
    setSaving(true);
    try {
      for (const exp of experiences) {
        const id = String(exp.id);
        const draft = drafts[id] || draftFromDish(exp);
        const patch = breakfastFormulaPatch(exp, draft, sanitizeOptionGroups, {
          formulesEditable: true,
        });
        if (!patch) continue;
        await partnersApi.updateExperience(id, patch);
      }
      const current = await fetchListingConciergeArrays(String(listingId));
      const catalogIds = new Set(experiences.map((d) => String(d.id)));
      // On ne touche qu'à mes expériences : PDJ, carte, ambiances, marché restent tels quels.
      const keptOther = (current.enabledExperienceIds ?? []).map(String).filter((id) => !catalogIds.has(id));
      const next = Array.from(new Set([...keptOther, ...Array.from(enabledMine)]));
      await persistListingConciergeSlice(String(listingId), { enabledExperienceIds: next });
      setEnabledIds(next);
      toast.success('Expériences enregistrées');
      await load();
      setPreviewKey((k) => k + 1);
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Enregistrement impossible'));
    } finally {
      setSaving(false);
    }
  };

  const createExperience = async () => {
    const partner = partners.find((p) => String(p.id) === draftNew.partnerId);
    if (!partner) {
      toast.error('Choisissez la fiche provider qui réalise cette expérience.');
      return;
    }
    const sibling = experiences.find((d) => String(d.partnerId) === String(partner.id));
    const body = newPartnerServiceBody({
      ownerId: listingOwnerId || undefined,
      kind: 'experience',
      category: draftNew.category.trim() || sibling?.category || DEFAULT_CATEGORY,
      partnerId: String(partner.id),
      title: draftNew.title,
      description: draftNew.description,
      priceMad: Number(draftNew.priceMad) || 0,
      whatsapp: draftNew.whatsapp.trim() || partner.whatsapp || sibling?.whatsapp || '',
      formuleLabel: 'Standard',
    });
    if ('error' in body) {
      toast.error(body.error);
      return;
    }
    setCreating(true);
    try {
      const created = await partnersApi.createExperience(body);
      const id = String(created.id);
      setExperiences((prev) => sortBreakfastDishes([...prev, created]));
      setDrafts((prev) => ({ ...prev, [id]: draftFromDish(created) }));
      setEnabledMine((prev) => new Set(prev).add(id));
      setDraftNew(EMPTY_NEW);
      setNewOpen(false);
      toast.success(`Expérience « ${created.title} » créée — pensez à Enregistrer`);
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Création impossible'));
    } finally {
      setCreating(false);
    }
  };

  const removeExperience = async (id: string) => {
    const exp = experiences.find((d) => String(d.id) === id);
    if (!exp) return;
    if (!window.confirm(`Retirer l’expérience « ${exp.title} » ?`)) return;
    try {
      await partnersApi.updateExperience(id, retireFormulaPatch(exp));
      setExperiences((prev) => prev.filter((d) => String(d.id) !== id));
      setEnabledMine((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success(`Expérience « ${exp.title} » retirée — pensez à Enregistrer`);
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Retrait impossible'));
    }
  };

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

  const providerName = (exp: PartnerService) =>
    partners.find((p) => String(p.id) === String(exp.partnerId))?.name || exp.providerName || '';
  const mineSummary = experiences.length
    ? `${enabledMine.size}/${experiences.length} proposées dans WhatsApp`
    : 'aucune expérience à vous';

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, width: '100%' }}>
      <Typography sx={{ mb: 1.5, fontSize: 12, color: 'text.secondary' }}>
        Ce que le voyageur voit dans WhatsApp sous ✨ Expériences. Les ambiances, la piscine et les
        beds sont dans Options séjour ; la navette dans Orchestration → Transport.
      </Typography>

      <TabSection
        id="payment"
        icon="💳"
        title="Paiement"
        summary={`${paymentMethods.length || 1} mode${(paymentMethods.length || 1) > 1 ? 's' : ''} proposé${(paymentMethods.length || 1) > 1 ? 's' : ''} au voyageur`}
        open={Boolean(open.payment)}
        onToggle={() => toggleOpen('payment')}
      >
        <GuestPaymentMethodsField
          value={paymentMethods}
          busy={savingPay}
          onChange={async (methods) => {
            setSavingPay(true);
            try {
              const r = await listingsService.patchListingConfiguration(String(listingId), {
                building: { guestPaymentMethods: methods },
              });
              if (!r.success) {
                toast.error(r.error || 'Enregistrement impossible');
                return;
              }
              setPaymentMethods(methods);
              toast.success(`Paiement extras : ${methods.join(' + ')}`);
            } catch (e) {
              toast.error(extractHttpErrorMessage(e, 'Enregistrement impossible'));
            } finally {
              setSavingPay(false);
            }
          }}
        />
      </TabSection>

      <TabSection
        id="mine"
        icon="✨"
        title="Mes expériences"
        summary={mineSummary}
        open={Boolean(open.mine)}
        onToggle={() => toggleOpen('mine')}
      >
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
          Chaque expérience : formules avec prix, description, photos (3 max), options à la carte.
          « Proposée dans WhatsApp » l’allume pour ce listing ; « Retirer » la sort du catalogue.
          Une expérience est réalisée par une fiche provider (partenaire), choisie à la création.
        </Typography>
        {experiences.length ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 0.5 }}>
            Providers :{' '}
            {Array.from(new Set(experiences.map(providerName).filter(Boolean))).join(' · ') || '—'}
          </Typography>
        ) : null}
        <ListingBreakfastFormulas
          mode="ambiance"
          emptyText="Aucune expérience à vous. Ajoutez-en une avec « Nouvelle expérience »."
          dishes={experiences}
          drafts={drafts}
          includedIds={enabledMine}
          supplementIds={new Set()}
          onToggleIncluded={(id, on) =>
            setEnabledMine((prev) => {
              const next = new Set(prev);
              if (on) next.add(id);
              else next.delete(id);
              return next;
            })
          }
          onToggleSupplement={() => undefined}
          onDraftChange={(id, patch) =>
            setDrafts((prev) => {
              const exp = experiences.find((d) => String(d.id) === id);
              const base = prev[id] || (exp ? draftFromDish(exp) : undefined);
              if (!base) return prev;
              return { ...prev, [id]: { ...base, ...patch } };
            })
          }
          onRemove={(id) => void removeExperience(id)}
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
            <FormControl size="small" sx={{ gridColumn: { sm: '1 / -1' } }}>
              <InputLabel id="exp-provider">Fiche provider (qui réalise l’expérience)</InputLabel>
              <Select
                labelId="exp-provider"
                label="Fiche provider (qui réalise l’expérience)"
                value={draftNew.partnerId}
                onChange={(e) => setDraftNew((p) => ({ ...p, partnerId: String(e.target.value) }))}
              >
                {partners.map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.whatsapp ? ` · ${p.whatsapp}` : ''}
                  </MenuItem>
                ))}
              </Select>
              {!partners.length ? (
                <Typography sx={{ mt: 0.5, fontSize: 11.5, color: 'warning.dark' }}>
                  Aucune fiche provider active pour ce propriétaire : créez-en une dans Partenaires.
                </Typography>
              ) : null}
            </FormControl>
            <TextField
              size="small"
              label="Nom de l’expérience"
              value={draftNew.title}
              onChange={(e) => setDraftNew((p) => ({ ...p, title: e.target.value }))}
              slotProps={{ htmlInput: { maxLength: 160 } }}
              autoFocus
            />
            <TextField
              size="small"
              type="number"
              label="Prix Standard (MAD)"
              value={draftNew.priceMad}
              onChange={(e) => setDraftNew((p) => ({ ...p, priceMad: e.target.value }))}
              slotProps={{ htmlInput: { min: 0, step: 50 } }}
              helperText="D’autres formules s’ajoutent ensuite"
            />
            <TextField
              size="small"
              label="Catégorie"
              value={draftNew.category}
              onChange={(e) => setDraftNew((p) => ({ ...p, category: e.target.value }))}
              placeholder={DEFAULT_CATEGORY}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              size="small"
              label="WhatsApp provider (notifications)"
              value={draftNew.whatsapp}
              onChange={(e) => setDraftNew((p) => ({ ...p, whatsapp: e.target.value }))}
              placeholder={partners.find((p) => String(p.id) === draftNew.partnerId)?.whatsapp || '+212…'}
              helperText="Vide = numéro de la fiche provider"
            />
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              label="Description"
              value={draftNew.description}
              onChange={(e) => setDraftNew((p) => ({ ...p, description: e.target.value }))}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', gridColumn: { sm: '1 / -1' } }}>
              <Button
                size="small"
                disabled={creating}
                onClick={() => {
                  setNewOpen(false);
                  setDraftNew(EMPTY_NEW);
                }}
              >
                Annuler
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={creating || !draftNew.title.trim() || !draftNew.partnerId}
                onClick={() => void createExperience()}
              >
                {creating ? '…' : 'Créer l’expérience'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Button size="small" onClick={() => setNewOpen(true)} sx={{ mt: 1, textTransform: 'none' }}>
            ＋ Nouvelle expérience
          </Button>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" size="small" disabled={saving} onClick={() => void saveMine()}>
            {saving ? '…' : 'Enregistrer les expériences'}
          </Button>
        </Box>
      </TabSection>

      <TabSection
        id="market"
        icon="🛒"
        title="Catalogue partagé"
        summary="expériences d’autres partenaires et navettes, à cocher"
        open={Boolean(open.market)}
        onToggle={() => toggleOpen('market')}
      >
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
          Expériences d’autres partenaires (marché) et navettes : cochez pour les proposer sur ce
          listing. Leur contenu se modifie chez le partenaire.
        </Typography>
        <ListingExperiencesPicker
          listingId={String(listingId)}
          listingCityId={listingCityId || null}
          listingOwnerId={listingOwnerId || null}
          enabledIds={enabledIds}
          onSaved={(ids) => {
            setEnabledIds(ids);
            const catalogIds = new Set(experiences.map((d) => String(d.id)));
            setEnabledMine(new Set(ids.map(String).filter((id) => catalogIds.has(id))));
          }}
          maxHeight={480}
          hideIntro
        />
      </TabSection>

      <TabSection
        id="menus"
        icon="⚙️"
        title="Menus guest"
        summary={guestBlocs.trim() ? guestBlocs.trim() : 'un seul bouton Expériences'}
        open={Boolean(open.menus)}
        onToggle={() => toggleOpen('menus')}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', maxWidth: 520 }}>
          <TextField
            size="small"
            fullWidth
            label="Menus guest"
            placeholder="EE$autres"
            helperText="EE$autres = essentielles + autres. Vide = un seul bouton Expériences."
            value={guestBlocs}
            onChange={(e) => setGuestBlocs(e.target.value)}
          />
          <Button
            variant="outlined"
            size="small"
            disabled={savingBlocs}
            sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
            onClick={async () => {
              setSavingBlocs(true);
              try {
                await persistListingConciergeSlice(String(listingId), {
                  experienceGuestBlocs: guestBlocs.trim(),
                });
                toast.success('Menus guest enregistrés');
              } catch (e) {
                toast.error(extractHttpErrorMessage(e, 'Enregistrement impossible'));
              } finally {
                setSavingBlocs(false);
              }
            }}
          >
            OK
          </Button>
        </Box>
      </TabSection>

      <TabSection
        id="preview"
        icon="💬"
        title="Ce que le voyageur voit"
        summary="le menu WhatsApp et le hub Services, calculés par le chatbot"
        open={Boolean(open.preview)}
        onToggle={() => toggleOpen('preview')}
      >
        <GuestWhatsAppPreview listingId={String(listingId)} focus="experiences" refreshKey={previewKey} />
      </TabSection>
    </Box>
  );
}
