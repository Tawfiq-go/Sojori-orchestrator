// Propriété & WiFi — infos listing (lecture seule) + SSID / mot de passe (menu WhatsApp G)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import { Card, FormRow, LockedPropertyBox, SectionHeader, TextInput, TYPO } from './SHARED';
import { listingPropertyFromValues } from './transportListingProperty';
import { V3BlockSaveBar } from '../../../orchestrationListingV3/V3BlockSaveBar';
import { logV3Orch } from '../../../orchestrationListingV3/v3OrchestrationDebugLog';

type WifiForm = {
  wifiUsername: string;
  wifiPassword: string;
};

const EMPTY_WIFI: WifiForm = { wifiUsername: '', wifiPassword: '' };

function metric(value: unknown): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isFinite(n)) return String(n);
  return String(value);
}

function mapWifiFromValues(values: Record<string, unknown>): WifiForm {
  return {
    wifiUsername: typeof values.wifiUsername === 'string' ? values.wifiUsername : '',
    wifiPassword: typeof values.wifiPassword === 'string' ? values.wifiPassword : '',
  };
}

function mapWifiToPatch(form: WifiForm): Record<string, unknown> {
  return {
    wifiUsername: form.wifiUsername ?? '',
    wifiPassword: form.wifiPassword ?? '',
  };
}

function PropertyInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, py: 0.35 }}>
      <Typography sx={{ fontSize: 12, color: T.text3 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}

interface Props {
  listingId?: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => Promise<void>;
  templateMode?: boolean;
  templateOwnerKey?: string;
  manualSaveMode?: boolean;
}

export default function PropertyWifiConfigTab({
  listingId = '',
  listingValues = {},
  onListingPatch,
  templateMode = false,
  templateOwnerKey,
  manualSaveMode = false,
}: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const useOrchestrationGestion = Boolean(onListingPatch) && (templateMode || Object.keys(listingValues).length > 0);
  const [form, setForm] = useState<WifiForm>(EMPTY_WIFI);
  const [sourceValues, setSourceValues] = useState<Record<string, unknown>>(listingValues);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const formRef = useRef(form);
  const dirtyRef = useRef(false);
  const skipAutoSaveRef = useRef(true);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const propertyPlace = useMemo(() => listingPropertyFromValues(sourceValues), [sourceValues]);
  const propertySummary = useMemo(
    () => ({
      propertyType: metric(sourceValues.propertyType),
      capacity: metric(sourceValues.personCapacityMax ?? sourceValues.guests),
      bedrooms: metric(sourceValues.bedroomCount),
      bathrooms: metric(sourceValues.bathroomCount),
      beds: metric(sourceValues.bedCount),
      city: metric(sourceValues.city),
    }),
    [sourceValues],
  );

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const markDirty = useCallback(() => {
    if (skipAutoSaveRef.current) return;
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  const patch = useCallback(
    (p: Partial<WifiForm>) => {
      markDirty();
      setForm(prev => {
        const next = { ...prev, ...p };
        formRef.current = next;
        return next;
      });
    },
    [markDirty],
  );

  const hydrateFromValues = useCallback(() => {
    setSourceValues(listingValues);
    const mapped = mapWifiFromValues(listingValues);
    setForm(mapped);
    formRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues]);

  useEffect(() => {
    if (!useOrchestrationGestion) return;
    if (hydratedRef.current && dirtyRef.current) return;
    skipAutoSaveRef.current = true;
    dirtyRef.current = false;
    setDirty(false);
    setLoading(false);
    hydrateFromValues();
    skipAutoSaveRef.current = false;
  }, [useOrchestrationGestion, hydrateFromValues, listingValues]);

  useEffect(() => {
    if (useOrchestrationGestion) return;
    if (!listingId && !isOwnerTemplate) return;
    let cancelled = false;
    skipAutoSaveRef.current = true;
    dirtyRef.current = false;
    hydratedRef.current = false;
    setDirty(false);
    (async () => {
      setLoading(true);
      try {
        if (listingId) {
          const doc = await listingsService.getListingDocument(listingId);
          if (cancelled) return;
          const vals = (doc ?? {}) as Record<string, unknown>;
          setSourceValues(vals);
          const mapped = mapWifiFromValues(vals);
          setForm(mapped);
          formRef.current = mapped;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          hydratedRef.current = true;
          skipAutoSaveRef.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, isOwnerTemplate, useOrchestrationGestion]);

  const persist = useCallback(async () => {
    const payload = mapWifiToPatch(formRef.current);
    setSavingState('saving');
    logV3Orch('gestion.property_wifi.persist.start', {
      templateMode,
      listingId: listingId || null,
      ssid: payload.wifiUsername,
    });
    try {
      if (useOrchestrationGestion && onListingPatch) {
        if (!templateMode && listingId) {
          await listingsService.updateListingProperty(listingId, payload);
        }
        await onListingPatch(payload);
      } else if (listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      } else {
        return;
      }
      setSavingState('saved');
      dirtyRef.current = false;
      setDirty(false);
      logV3Orch('gestion.property_wifi.persist.ok', { ssid: payload.wifiUsername });
      if (!manualSaveMode) {
        window.setTimeout(() => setSavingState('idle'), 2000);
      }
    } catch (err) {
      setSavingState('idle');
      dirtyRef.current = true;
      setDirty(true);
      logV3Orch('gestion.property_wifi.persist.error', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [listingId, manualSaveMode, onListingPatch, templateMode, useOrchestrationGestion]);

  useEffect(() => {
    if (manualSaveMode || loading || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, 900);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [form, loading, persist, manualSaveMode]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress sx={{ color: T.primary }} />
      </Box>
    );
  }

  return (
    <Box>
      <SectionHeader
        icon="🏠"
        title="Propriété & WiFi"
        badge="WA · G"
        badgeKind="wa-yes"
        subtitle={
          <>
            Menu WhatsApp G · <strong>Propriété</strong> = reprise automatique de la fiche listing ·{' '}
            <strong>WiFi</strong> configurable ci-dessous
          </>
        }
      />

      {templateMode && (
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Les infos <strong>propriété</strong> envoyées au voyageur proviennent de la fiche de chaque annonce
          (type, capacité, chambres…). Seul le <strong>WiFi</strong> se configure ici pour le modèle PM.
        </Alert>
      )}

      <Card
        icon="🏠"
        title="Propriété"
        subtitle="Reprise automatique · fiche listing (non modifiable ici)"
      >
        <LockedPropertyBox
          name={propertyPlace.name}
          address={propertyPlace.address}
          label="Annonce"
        />
        <Box sx={{ mt: 1.5, px: 0.5 }}>
          <PropertyInfoLine label="Type de bien" value={propertySummary.propertyType} />
          <PropertyInfoLine label="Capacité max" value={propertySummary.capacity} />
          <PropertyInfoLine label="Chambres · SdB · Lits" value={`${propertySummary.bedrooms} · ${propertySummary.bathrooms} · ${propertySummary.beds}`} />
          <PropertyInfoLine label="Ville" value={propertySummary.city} />
        </Box>
        <Typography sx={{ ...TYPO.caption, color: T.text3, mt: 1.25 }}>
          Modifier ces champs sur la fiche listing — le menu G les affiche tel quel au voyageur.
        </Typography>
      </Card>

      <Card icon="📶" title="Connexion WiFi" subtitle="Seul bloc éditable ici · wifiUsername · wifiPassword">
        <FormRow label="Nom du réseau (SSID)" help="Affiché au voyageur via le menu WhatsApp G">
          <TextInput
            value={form.wifiUsername}
            onChange={e => patch({ wifiUsername: e.target.value })}
            placeholder="Ex. Sojori_Guest"
          />
        </FormRow>
        <FormRow label="Mot de passe WiFi" help="Menu WhatsApp G uniquement">
          <TextInput
            value={form.wifiPassword}
            onChange={e => patch({ wifiPassword: e.target.value })}
            placeholder="Mot de passe"
          />
        </FormRow>
      </Card>

      {manualSaveMode ? (
        <V3BlockSaveBar
          label="Propriété & WiFi · connexion"
          dirty={dirty}
          saving={savingState === 'saving'}
          onSave={() => void persist()}
        />
      ) : savingState !== 'idle' ? (
        <Box
          component="span"
          sx={{
            display: 'block',
            mt: 1.5,
            fontSize: 10.5,
            color: savingState === 'saved' ? T.success : T.text3,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
          }}
        >
          {savingState === 'saving' ? '⏳ Enregistrement…' : '✓ Sauvegardé'}
        </Box>
      ) : null}
    </Box>
  );
}
