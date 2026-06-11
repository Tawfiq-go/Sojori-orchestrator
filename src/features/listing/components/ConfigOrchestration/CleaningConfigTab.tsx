// Ménage — 2 onglets : Inclus · Payant (listing API)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';
import {
  Card,
  FormRow,
  TextArea,
  TextInput,
  DayPills,
  ConfigIntroBar,
  PillButton,
  Toggle,
  TYPO,
} from './SHARED';
import {
  AddFrequencyDialog,
  AddTimeslotDialog,
  DashedAddButton,
  TimeslotChip,
} from '../../../../components/listing/form-v2/components/cleaning/CleaningSlotDialogs';
import AddIncludedExtraDialog from './AddIncludedExtraDialog';
import AddPaidCleaningServiceDialog from './AddPaidCleaningServiceDialog';
import {
  mapCleaningConfigToListingPatch,
  mapListingToCleaningConfig,
  type CleaningListingConfig,
  type FrequencyTier,
  type IncludedCleaningExtra,
  type PaidCleaningServiceType,
  type TimeSlot,
} from './cleaningConfigTypes';
import { canPersistListingConfig } from './cleaningSojoriConfigTypes';
import { logOrchConfig, orchConfigError } from '../../utils/orchConfigDebugLog';
import { V3BlockSaveBar } from '../../../orchestrationListingV3/V3BlockSaveBar';

const SUB_TABS = [
  { id: 'included', label: 'Ménage inclus', icon: '🎁' },
  { id: 'paid', label: 'Ménage payant', icon: '💰' },
  { id: 'timeslots', label: 'Créneaux A/D', icon: '🛬' },
] as const;

type SubTab = (typeof SUB_TABS)[number]['id'];

interface Props {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  /** Template owner : persistance via onListingPatch uniquement. */
  templateMode?: boolean;
  /** Hub ménage : afficher une seule section. */
  forcedSub?: SubTab;
  hideSubNav?: boolean;
  /** V3 orchestration : save manuel via barre sticky. */
  manualSaveMode?: boolean;
}

export default function CleaningConfigTab({
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
  forcedSub,
  hideSubNav = false,
  manualSaveMode = false,
}: Props) {
  const [sub, setSub] = useState<SubTab>(forcedSub || 'included');

  useEffect(() => {
    if (forcedSub) setSub(forcedSub);
  }, [forcedSub]);
  const [config, setConfig] = useState<CleaningListingConfig | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const [freqDialog, setFreqDialog] = useState(false);
  const [cleanDialog, setCleanDialog] = useState(false);
  const [paidSlotDialog, setPaidSlotDialog] = useState<string | null>(null);
  const [checkinDialog, setCheckinDialog] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [extraDialogOpen, setExtraDialogOpen] = useState(false);
  const [paidServiceDialogOpen, setPaidServiceDialogOpen] = useState(false);
  const configRef = useRef<CleaningListingConfig | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
    setDirty(false);
  }, [listingId]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!listingValues || !Object.keys(listingValues).length) return;
    const mapped = mapListingToCleaningConfig(listingValues);
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues, listingId]);

  const patch = useCallback((fn: (c: CleaningListingConfig) => CleaningListingConfig) => {
    dirtyRef.current = true;
    setDirty(true);
    setConfig(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      configRef.current = next;
      return next;
    });
  }, []);

  const persist = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg || !canPersistListingConfig(listingId, templateMode)) return;
    const paidExisting = (listingValues.paidCleaningConfig as { enabled?: boolean }) || {};
    const payload = mapCleaningConfigToListingPatch(cfg, {
      preservePaidEnabled: paidExisting.enabled !== false,
    });
    logOrchConfig('cleaning.hub.persist →', {
      listingId: listingId || '(template)',
      templateMode,
      forcedSub,
      patchKeys: Object.keys(payload),
    });
    setSavingState('saving');
    try {
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      }
      await onListingPatch?.(payload);
      logOrchConfig('cleaning.hub.persist ← OK', { listingId: listingId || '(template)' });
      setSavingState('saved');
      dirtyRef.current = false;
      setDirty(false);
    } catch (e) {
      orchConfigError('cleaning.hub.persist ← FAIL', e, {
        listingId: listingId || '(template)',
        templateMode,
      });
      setSavingState('idle');
      dirtyRef.current = true;
    }
  }, [listingId, onListingPatch, listingValues, templateMode, forcedSub]);

  useEffect(() => {
    if (manualSaveMode || !config || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist().finally(() => {
        dirtyRef.current = false;
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, persist, manualSaveMode]);

  if (!config || !Object.keys(listingValues).length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 2, ...TYPO.intro }}>Chargement ménage…</Typography>
      </Box>
    );
  }

  const paid = config.paidCleaningConfig;
  const activeSub = forcedSub || sub;

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        {forcedSub === 'included'
          ? 'Ménage inclus (gratuit) pendant le séjour.'
          : forcedSub === 'paid'
            ? 'Ménage payant proposé au voyageur (WhatsApp).'
            : 'Ménage inclus et payant pour ce logement.'}
      </ConfigIntroBar>

      {!hideSubNav && (
      <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
        {SUB_TABS.map(t => (
          <Box
            key={t.id}
            component="button"
            type="button"
            onClick={() => setSub(t.id)}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              px: 1.25,
              py: 0.65,
              borderRadius: 1,
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              ...(sub === t.id
                ? { bgcolor: T.primaryTint, color: T.primaryDeep, border: `1px solid ${T.primary}` }
                : { bgcolor: T.bg1, color: T.text2, border: `1px solid ${T.border}` }),
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </Box>
        ))}
      </Stack>
      )}

      {activeSub === 'included' && (
        <>
          <Card compact icon="🎁" title="Inclus">
            <FormRow compact label="Description">
              <TextArea
                rows={2}
                value={config.includedDescriptionFr}
                onChange={e => patch(c => ({ ...c, includedDescriptionFr: e.target.value }))}
                placeholder="Ex. : Ménages inclus selon la durée de votre séjour (voir planning)."
              />
            </FormRow>

            <FormRow compact label="Paliers durée">
              <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
                {config.frequency.map((tier, i) => (
                  <FrequencyChip
                    key={`${tier.startDay}-${tier.endDay}-${i}`}
                    tier={tier}
                    onRemove={() =>
                      patch(c => ({
                        ...c,
                        frequency: c.frequency.filter((_, j) => j !== i),
                      }))
                    }
                  />
                ))}
                <DashedAddButton label="+ Palier" onClick={() => setFreqDialog(true)} />
              </Stack>
            </FormRow>

            <FormRow compact label="Créneaux">
              <Stack direction="row" useFlexGap sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                {config.TS_CLEAN.map((ts, i) => (
                  <TimeslotChip
                    key={`${ts.start}-${ts.end}-${i}`}
                    slot={ts}
                    onRemove={() =>
                      patch(c => ({
                        ...c,
                        TS_CLEAN: c.TS_CLEAN.filter((_, j) => j !== i),
                      }))
                    }
                  />
                ))}
                <DashedAddButton label="+ Créneau" onClick={() => setCleanDialog(true)} />
              </Stack>
            </FormRow>
          </Card>

          <Card compact icon="➕" title="Extras payants">
            <Stack sx={{ gap: 1 }}>
              {config.includedExtras.filter(e => e.enabled).length === 0 && (
                <Typography sx={{ ...TYPO.caption }}>
                  Aucun extra — ajoutez depuis la bibliothèque ou créez le vôtre.
                </Typography>
              )}
              {config.includedExtras
                .filter(e => e.enabled)
                .map(extra => (
                  <IncludedExtraRow
                    key={extra.id}
                    extra={extra}
                    onUpdate={updates =>
                      patch(c => ({
                        ...c,
                        includedExtras: c.includedExtras.map(x =>
                          x.id === extra.id ? { ...x, ...updates } : x,
                        ),
                      }))
                    }
                    onRemove={() =>
                      patch(c => ({
                        ...c,
                        includedExtras: c.includedExtras.filter(x => x.id !== extra.id),
                      }))
                    }
                  />
                ))}
              <DashedAddButton label="+ Ajouter extra" onClick={() => setExtraDialogOpen(true)} />
            </Stack>
          </Card>
        </>
      )}

      {activeSub === 'paid' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 300px' }, gap: 2, alignItems: 'start' }}>
          <Box>
          <Card compact icon="💰" title="Payant — règles">
            <FormRow compact label="Fréquence">
              <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                <PillButton
                  active={paid.frequency === 'all_days'}
                  onClick={() =>
                    patch(c => ({
                      ...c,
                      paidCleaningConfig: { ...c.paidCleaningConfig, frequency: 'all_days' },
                    }))
                  }
                >
                  Tous les jours du séjour
                </PillButton>
                <PillButton
                  active={paid.frequency === 'per_week'}
                  onClick={() =>
                    patch(c => ({
                      ...c,
                      paidCleaningConfig: { ...c.paidCleaningConfig, frequency: 'per_week' },
                    }))
                  }
                >
                  Par semaine
                </PillButton>
              </Stack>
            </FormRow>

            {paid.frequency === 'per_week' && (
              <FormRow compact label="Max / semaine">
                <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
                  {[1, 2, 3].map(n => (
                    <PillButton
                      key={n}
                      active={paid.perWeekCount === n}
                      onClick={() =>
                        patch(c => ({
                          ...c,
                          paidCleaningConfig: { ...c.paidCleaningConfig, perWeekCount: n },
                        }))
                      }
                    >
                      {n}
                    </PillButton>
                  ))}
                </Stack>
              </FormRow>
            )}

            <FormRow compact label="Jours">
              <DayPills
                value={paid.availableWeekdays}
                onChange={days =>
                  patch(c => ({
                    ...c,
                    paidCleaningConfig: { ...c.paidCleaningConfig, availableWeekdays: days },
                  }))
                }
              />
            </FormRow>
          </Card>

          <Card compact icon="🧽" title="Types & créneaux">
            <Typography sx={{ ...TYPO.caption, mb: 1 }}>
              Chaque type : titre, description, prix et créneaux horaires (+ Créneau).
            </Typography>
            <Stack sx={{ gap: 1 }}>
              {paid.serviceTypes.map(svc => (
                <PaidServiceRow
                  key={svc.id}
                  service={svc}
                  onUpdate={updates =>
                    patch(c => ({
                      ...c,
                      paidCleaningConfig: {
                        ...c.paidCleaningConfig,
                        serviceTypes: c.paidCleaningConfig.serviceTypes.map(s =>
                          s.id === svc.id ? { ...s, ...updates } : s,
                        ),
                      },
                    }))
                  }
                  onAddSlot={() => setPaidSlotDialog(svc.id)}
                  onRemoveSlot={idx =>
                    patch(c => ({
                      ...c,
                      paidCleaningConfig: {
                        ...c.paidCleaningConfig,
                        serviceTypes: c.paidCleaningConfig.serviceTypes.map(s =>
                          s.id === svc.id
                            ? { ...s, timeslots: s.timeslots.filter((_, j) => j !== idx) }
                            : s,
                        ),
                      },
                    }))
                  }
                  onRemove={() =>
                    patch(c => ({
                      ...c,
                      paidCleaningConfig: {
                        ...c.paidCleaningConfig,
                        serviceTypes: c.paidCleaningConfig.serviceTypes.filter(s => s.id !== svc.id),
                      },
                    }))
                  }
                />
              ))}
            </Stack>
            <DashedAddButton
              label="+ Ajouter ménage payant"
              onClick={() => setPaidServiceDialogOpen(true)}
            />
          </Card>
          </Box>

        </Box>
      )}

      {activeSub === 'timeslots' && (
        <Stack sx={{ gap: 1.5 }}>
          <Card compact icon="🛬" title="Créneaux d'arrivée" meta="TS_CHECKIN[]">
            <FormRow compact label="Activer">
              <Toggle
                on={config.checkinTimeslotsEnabled}
                sm
                onChange={() =>
                  patch(c => ({ ...c, checkinTimeslotsEnabled: !c.checkinTimeslotsEnabled }))
                }
              />
            </FormRow>
            <Stack direction="row" useFlexGap sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
              {config.TS_CHECKIN.map((ts, i) => (
                <TimeslotChip
                  key={`in-${ts.start}-${ts.end}-${i}`}
                  slot={ts}
                  onRemove={() =>
                    patch(c => ({
                      ...c,
                      TS_CHECKIN: c.TS_CHECKIN.filter((_, j) => j !== i),
                    }))
                  }
                />
              ))}
              <DashedAddButton label="+ Ajouter créneau" onClick={() => setCheckinDialog(true)} />
            </Stack>
          </Card>

          <Card compact icon="🛫" title="Créneaux de départ" meta="TS_CHECKOUT[]">
            <FormRow compact label="Activer">
              <Toggle
                on={config.checkoutTimeslotsEnabled}
                sm
                onChange={() =>
                  patch(c => ({ ...c, checkoutTimeslotsEnabled: !c.checkoutTimeslotsEnabled }))
                }
              />
            </FormRow>
            <Stack direction="row" useFlexGap sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
              {config.TS_CHECKOUT.map((ts, i) => (
                <TimeslotChip
                  key={`out-${ts.start}-${ts.end}-${i}`}
                  slot={ts}
                  onRemove={() =>
                    patch(c => ({
                      ...c,
                      TS_CHECKOUT: c.TS_CHECKOUT.filter((_, j) => j !== i),
                    }))
                  }
                />
              ))}
              <DashedAddButton label="+ Ajouter créneau" onClick={() => setCheckoutDialog(true)} />
            </Stack>
          </Card>

          <Typography sx={{ ...TYPO.monoHelp, px: 0.5 }}>
            Fenêtre check-in {config.checkInTimeStart}h–{config.checkInTimeEnd}h · départ défaut{' '}
            {config.checkOutTime}h · sync WhatsApp via listing_snapshot après sauvegarde.
          </Typography>
        </Stack>
      )}

      <AddPaidCleaningServiceDialog
        open={paidServiceDialogOpen}
        onClose={() => setPaidServiceDialogOpen(false)}
        existingIds={paid.serviceTypes.map(s => s.id)}
        onAdd={item =>
          patch(c => ({
            ...c,
            paidCleaningConfig: {
              ...c.paidCleaningConfig,
              serviceTypes: [
                ...c.paidCleaningConfig.serviceTypes,
                {
                  ...item,
                  enabled: true,
                  timeslots: [],
                  displayOrder: c.paidCleaningConfig.serviceTypes.length,
                },
              ],
            },
          }))
        }
      />

      <AddIncludedExtraDialog
        open={extraDialogOpen}
        onClose={() => setExtraDialogOpen(false)}
        existingIds={config.includedExtras.filter(e => e.enabled).map(e => e.id)}
        onAdd={item =>
          patch(c => {
            const exists = c.includedExtras.find(e => e.id === item.id);
            if (exists) {
              return {
                ...c,
                includedExtras: c.includedExtras.map(e =>
                  e.id === item.id ? { ...e, ...item, enabled: true } : e,
                ),
              };
            }
            return {
              ...c,
              includedExtras: [...c.includedExtras, { ...item, enabled: true }],
            };
          })
        }
      />

      <AddFrequencyDialog
        open={freqDialog}
        onClose={() => setFreqDialog(false)}
        onAdd={(row: FrequencyTier) => patch(c => ({ ...c, frequency: [...c.frequency, row] }))}
      />
      <AddTimeslotDialog
        open={cleanDialog}
        onClose={() => setCleanDialog(false)}
        title="Créneau ménage inclus"
        includedMode
        existingSlots={config.TS_CLEAN}
        onAdd={(slot: TimeSlot) =>
          patch(c => ({
            ...c,
            TS_CLEAN: [...c.TS_CLEAN, { start: slot.start, end: slot.end, price: 0, default: slot.default === true }],
          }))
        }
      />
      {paidSlotDialog && (
        <AddTimeslotDialog
          open={Boolean(paidSlotDialog)}
          onClose={() => setPaidSlotDialog(null)}
          title="Créneau ménage payant"
          onAdd={(slot: TimeSlot) => {
            patch(c => ({
              ...c,
              paidCleaningConfig: {
                ...c.paidCleaningConfig,
                serviceTypes: c.paidCleaningConfig.serviceTypes.map(s =>
                  s.id === paidSlotDialog ? { ...s, timeslots: [...s.timeslots, slot] } : s,
                ),
              },
            }));
            setPaidSlotDialog(null);
          }}
        />
      )}
      <AddTimeslotDialog
        open={checkinDialog}
        onClose={() => setCheckinDialog(false)}
        title="Créneau d'arrivée"
        onAdd={(slot: TimeSlot) => patch(c => ({ ...c, TS_CHECKIN: [...c.TS_CHECKIN, slot] }))}
      />
      <AddTimeslotDialog
        open={checkoutDialog}
        onClose={() => setCheckoutDialog(false)}
        title="Créneau de départ"
        onAdd={(slot: TimeSlot) => patch(c => ({ ...c, TS_CHECKOUT: [...c.TS_CHECKOUT, slot] }))}
      />
      {manualSaveMode ? (
        <V3BlockSaveBar
          label={
            forcedSub === 'paid'
              ? 'Ménage payant · gestion owner_orchestrations'
              : forcedSub === 'timeslots'
                ? 'Créneaux A/D · gestion owner_orchestrations'
                : 'Ménage inclus · gestion owner_orchestrations'
          }
          dirty={dirty}
          saving={savingState === 'saving'}
          onSave={() => void persist()}
        />
      ) : null}
    </Box>
  );
}

function IncludedExtraRow({
  extra,
  onUpdate,
  onRemove,
}: {
  extra: IncludedCleaningExtra;
  onUpdate: (u: Partial<IncludedCleaningExtra>) => void;
  onRemove: () => void;
}) {
  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        border: `1px solid ${T.border}`,
        bgcolor: T.bg2,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
        <Typography sx={{ fontSize: 20, lineHeight: 1, pt: 0.25 }}>{extra.icon}</Typography>
        <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
          <TextInput value={extra.labelFr} onChange={e => onUpdate({ labelFr: e.target.value })} />
          <TextInput
            type="number"
            value={extra.price}
            onChange={e => onUpdate({ price: Number(e.target.value) || 0 })}
            style={{ maxWidth: 100 }}
          />
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <TextArea
              rows={1}
              value={extra.descriptionFr}
              onChange={e => onUpdate({ descriptionFr: e.target.value })}
              placeholder="Description pour le voyageur"
            />
          </Box>
        </Box>
        <Typography
          component="button"
          type="button"
          onClick={onRemove}
          sx={{ all: 'unset', cursor: 'pointer', fontSize: 16, color: T.error, lineHeight: 1, px: 0.5 }}
          title="Retirer"
        >
          ✕
        </Typography>
      </Stack>
      <Typography sx={{ ...TYPO.monoHelp, mt: 0.5 }}>
        {extra.price} MAD · {extra.id}
      </Typography>
    </Box>
  );
}

function FrequencyChip({ tier, onRemove }: { tier: FrequencyTier; onRemove: () => void }) {
  return (
    <Box
      sx={{
        p: '6px 10px',
        border: `1px solid ${T.border}`,
        borderRadius: 1,
        bgcolor: T.bg1,
        minWidth: 100,
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <Typography
        component="button"
        onClick={onRemove}
        sx={{ all: 'unset', cursor: 'pointer', position: 'absolute', top: 4, right: 6, fontSize: 12, color: T.text4 }}
      >
        ×
      </Typography>
      <Typography sx={{ ...TYPO.monoHelp, fontSize: 10.5, color: T.text3 }}>
        J {tier.startDay}–{tier.endDay}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.primaryDeep, fontFamily: CONFIG_ORCH_FONT.mono, letterSpacing: '-0.02em' }}>
        {tier.numberOfCleaning}
      </Typography>
      <Typography sx={{ ...TYPO.monoHelp, fontSize: 9.5 }}>ménages</Typography>
    </Box>
  );
}

function PaidServiceRow({
  service,
  onUpdate,
  onAddSlot,
  onRemoveSlot,
  onRemove,
}: {
  service: PaidCleaningServiceType;
  onUpdate: (u: Partial<PaidCleaningServiceType>) => void;
  onAddSlot: () => void;
  onRemoveSlot: (idx: number) => void;
  onRemove: () => void;
}) {
  return (
    <Box
      sx={{
        p: 1.25,
        border: `1px solid ${service.enabled ? T.primary : T.border}`,
        borderRadius: 1,
        bgcolor: service.enabled ? T.primaryTint : T.bg2,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 18 }}>{service.icon}</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TextInput
            value={service.labelFr}
            onChange={e => onUpdate({ labelFr: e.target.value })}
            placeholder="Titre du ménage payant"
          />
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => onUpdate({ enabled: !service.enabled })}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            color: service.enabled ? T.success : T.text4,
          }}
        >
          {service.enabled ? 'ON' : 'OFF'}
        </Box>
        <Typography
          component="button"
          type="button"
          onClick={onRemove}
          sx={{ all: 'unset', cursor: 'pointer', fontSize: 16, color: T.error, lineHeight: 1, px: 0.5 }}
          title="Supprimer ce type"
        >
          ✕
        </Typography>
      </Stack>
      <TextArea
        rows={2}
        value={service.descriptionFr}
        onChange={e => onUpdate({ descriptionFr: e.target.value })}
        placeholder="Description affichée au voyageur (flow WhatsApp / menu)"
      />
      <Stack direction="row" sx={{ gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextInput
          type="number"
          value={service.price}
          onChange={e => onUpdate({ price: Number(e.target.value) || 0 })}
          style={{ maxWidth: 100 }}
        />
        <Typography sx={{ ...TYPO.monoHelp }}>MAD</Typography>
        <TextInput
          type="number"
          value={service.duration}
          onChange={e => onUpdate({ duration: Number(e.target.value) || 1 })}
          style={{ maxWidth: 72 }}
        />
        <Typography sx={{ ...TYPO.monoHelp }}>heures</Typography>
      </Stack>
      <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
        {service.timeslots.map((ts, i) => (
          <TimeslotChip key={i} slot={ts} onRemove={() => onRemoveSlot(i)} />
        ))}
        <DashedAddButton label="+ Créneau" onClick={onAddSlot} />
      </Stack>
    </Box>
  );
}
