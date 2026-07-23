import React, { useState, useEffect, useCallback } from 'react';
import { Box, Stack, Typography, Button, Chip } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import { SectionHeader, Card, FormRow, WhenOffNote, Toggle, ConfigIntroBar } from './SHARED';
import FullChatbotSyncButton from '../../../../components/listing/FullChatbotSyncButton';

const ORCH_FLAGS = [
  { key: 'orchestration_choose_arrival', label: 'Choisir heure arrivée' },
  { key: 'orchestration_choose_departure', label: 'Choisir heure départ' },
  { key: 'orchestration_declare_arrival', label: 'Déclarer arrivée' },
  { key: 'orchestration_declare_departure', label: 'Déclarer départ' },
  { key: 'orchestration_receive_arrival', label: 'Accueil arrivée' },
  { key: 'orchestration_receive_departure', label: 'Accueil départ' },
  { key: 'orchestration_registration', label: 'Enregistrement voyageurs' },
  { key: 'orchestration_cleaning_free', label: 'Ménage gratuit' },
  { key: 'orchestration_cleaning_paid', label: 'Ménage payant' },
  { key: 'orchestration_cleaning_sojori', label: 'Ménage Sojori auto' },
  { key: 'orchestration_transport', label: 'Transport' },
  { key: 'orchestration_grocery', label: 'Courses' },
  { key: 'orchestration_custom', label: 'Conciergerie / custom' },
  { key: 'orchestration_support', label: 'Support' },
  { key: 'orchestration_service_client', label: 'Service client' },
] as const;

type EffectivePayload = {
  flags?: Record<string, boolean>;
  overrides?: Record<string, boolean>;
};

interface Props {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
}

export default function OrchestrationConfigTab({
  listingId,
  listingValues = {},
  onListingPatch,
}: Props) {
  const [globalOn, setGlobalOn] = useState(true);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const cleaningOrch = (listingValues.cleaningOrchestration as { enabled?: boolean }) || {};

  const applyEffective = useCallback((data: EffectivePayload | null) => {
    const f = data?.flags ?? {};
    setGlobalOn(f.orchestrationEnabled !== false);
    const next: Record<string, boolean> = {};
    ORCH_FLAGS.forEach(({ key }) => {
      next[key] = f[key] !== false;
    });
    setFlags(next);
    setOverrides((data?.overrides as Record<string, boolean>) ?? {});
  }, []);

  const loadEffective = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    try {
      const res = await listingsService.getListingOrchestrationTemplateEffective(listingId);
      const body = res as { success?: boolean; data?: EffectivePayload };
      applyEffective(body?.data ?? null);
    } catch {
      setGlobalOn(listingValues.orchestrationEnabled !== false);
      const next: Record<string, boolean> = {};
      ORCH_FLAGS.forEach(({ key }) => {
        next[key] = listingValues[key] !== false;
      });
      setFlags(next);
      setOverrides({});
    } finally {
      setLoading(false);
    }
  }, [listingId, listingValues, applyEffective]);

  useEffect(() => {
    void loadEffective();
  }, [loadEffective]);

  const persistField = useCallback(
    async (field: string, checked: boolean) => {
      if (!listingId) return;
      setSavingField(field);
      setSavingState('saving');
      try {
        const payload = { [field]: checked };
        await listingsService.updateListingProperty(listingId, payload);
        onListingPatch?.(payload);
        setOverrides((prev) => ({ ...prev, [field]: checked }));
        setSavingState('saved');
        toast.success(checked ? 'Activé' : 'Désactivé', { autoClose: 2000 });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erreur enregistrement';
        toast.error(msg);
        setSavingState('idle');
        throw e;
      } finally {
        setSavingField(null);
      }
    },
    [listingId, onListingPatch],
  );

  const handleResetFromOwner = async () => {
    try {
      setSavingState('saving');
      const res = await listingsService.applyListingOrchestrationFromOwner(listingId);
      const body = res as { success?: boolean; data?: EffectivePayload };
      applyEffective(body?.data ?? null);
      const patch = body?.data?.flags ?? {};
      onListingPatch?.(patch);
      setSavingState('saved');
      toast.success('Config réinitialisée depuis le template propriétaire');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
      setSavingState('idle');
    }
  };

  const handleGlobalToggle = async () => {
    const next = !globalOn;
    setGlobalOn(next);
    try {
      await persistField('orchestrationEnabled', next);
    } catch {
      setGlobalOn(!next);
    }
  };

  const handleCategoryToggle = async (key: string) => {
    if (!globalOn) return;
    const next = !flags[key];
    setFlags((prev) => ({ ...prev, [key]: next }));
    try {
      await persistField(key, next);
    } catch {
      setFlags((prev) => ({ ...prev, [key]: !next }));
    }
  };

  const handleCleaningSojoriToggle = async () => {
    if (!listingId || !globalOn) return;
    const next = !cleaningOrch.enabled;
    setSavingField('cleaningOrchestration');
    setSavingState('saving');
    try {
      const payload = {
        orchestration_cleaning_sojori: next,
        cleaningOrchestration: {
          ...(cleaningOrch as Record<string, unknown>),
          enabled: next,
        },
      };
      await listingsService.updateListingProperty(listingId, payload);
      onListingPatch?.(payload);
      setOverrides((prev) => ({ ...prev, orchestration_cleaning_sojori: next }));
      setSavingState('saved');
      toast.success(next ? 'Ménage Sojori activé' : 'Ménage Sojori désactivé', { autoClose: 2000 });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
      setSavingState('idle');
    } finally {
      setSavingField(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">Chargement config orchestration…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        Valeurs effectives : template admin → template propriétaire → ce logement. Chaque toggle
        enregistre <b>un seul champ</b> sur ce listing (override).
        <Stack direction="row" sx={{ mt: 1.25, gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button size="small" variant="outlined" onClick={() => void handleResetFromOwner()}>
            Réinitialiser depuis template PM
          </Button>
          <FullChatbotSyncButton listingId={listingId} variant="listing" />
        </Stack>
      </ConfigIntroBar>

      <SectionHeader
        icon="⚡"
        title="Orchestration"
        badge="LISTING"
        badgeKind="wa-partial"
        subtitle="Héritage owner + overrides locaux."
      />

      <Card icon="⚡" title="Orchestration globale" subtitle="Coupe tout le plan auto (relances incluses)">
        <FormRow label="Orchestration active sur ce listing">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Toggle
              on={globalOn}
              onChange={() => void handleGlobalToggle()}
              disabled={savingField === 'orchestrationEnabled'}
            />
            <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
              {globalOn ? 'Oui — plan auto possible' : 'Non — aucun plan à la résa'}
            </Typography>
            {overrides.orchestrationEnabled !== undefined && (
              <Chip size="small" label="override listing" color="warning" variant="outlined" />
            )}
          </Stack>
        </FormRow>
      </Card>

      <Card icon="🔀" title="Catégories orchestration" subtitle="Services proposés aux voyageurs">
        <Stack sx={{ gap: 0, opacity: globalOn ? 1 : 0.45, pointerEvents: globalOn ? 'auto' : 'none' }}>
          {ORCH_FLAGS.map(({ key, label }) => (
            <FormRow key={key} label={label}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Toggle
                  on={!!flags[key]}
                  onChange={() => void handleCategoryToggle(key)}
                  disabled={savingField === key}
                />
                <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
                  {flags[key] ? 'ON' : 'OFF'}
                </Typography>
                {overrides[key] !== undefined && (
                  <Chip size="small" label="override" color="warning" variant="outlined" />
                )}
              </Stack>
            </FormRow>
          ))}
        </Stack>
      </Card>

      <Card icon="🧹" title="Ménage automatique Sojori">
        <FormRow label="Orchestration ménage">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Toggle
              on={!!cleaningOrch.enabled && globalOn}
              onChange={() => void handleCleaningSojoriToggle()}
              disabled={!globalOn || savingField === 'cleaningOrchestration'}
            />
            <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
              {cleaningOrch.enabled !== false ? 'ON' : 'OFF'}
            </Typography>
          </Stack>
        </FormRow>
      </Card>

      <WhenOffNote>
        Template propriétaire : Catalogue → Template. Import Airbnb applique flags orchestration
        + les 13 onglets Config orchestration (accès, support, ménage, menu WA, etc.) à la création.
      </WhenOffNote>
    </Box>
  );
}
