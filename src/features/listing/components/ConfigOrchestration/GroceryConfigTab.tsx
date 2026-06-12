// Courses — liste libre + frais de service
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import {
  SectionHeader,
  Card,
  FormRow,
  NumInput,
  TextInput,
  TextArea,
  DayPills,
  SlotPills,
  WhenOffNote,
} from './SHARED';
import { V3BlockSaveBar } from '../../../orchestrationListingV3/V3BlockSaveBar';
import { logV3Orch } from '../../../orchestrationListingV3/v3OrchestrationDebugLog';
import { persistListingConciergeSlice } from './conciergeListingPersist';

const DEFAULT_SLOT_OPTIONS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

const EMPTY_GROCERY = {
  enabled: false,
  serviceFee: 0,
  currency: 'MAD',
  deliveryLeadTimeHours: 24,
  availability: {
    daysOfWeek: [] as number[],
    timeSlots: [] as string[],
  },
  noteToGuest: '',
};

function mapFromConciergeDoc(doc: { groceryServices?: unknown[] } | null | undefined) {
  const svc = doc?.groceryServices?.[0] as Record<string, unknown> | undefined;
  if (!svc) {
    return { ...EMPTY_GROCERY };
  }
  const pricing = svc.pricing as { serviceFee?: number; currency?: string } | undefined;
  const availability = svc.availability as {
    daysOfWeek?: number[];
    timeSlots?: string[];
    deliveryLeadTimeHours?: number;
  } | undefined;
  const description = svc.description as { fr?: string } | undefined;
  const name = svc.name as { fr?: string } | undefined;
  return {
    enabled: svc.enabled !== false,
    serviceFee: pricing?.serviceFee ?? 0,
    currency: pricing?.currency ?? 'MAD',
    deliveryLeadTimeHours:
      availability?.deliveryLeadTimeHours ?? EMPTY_GROCERY.deliveryLeadTimeHours,
    availability: {
      daysOfWeek: Array.isArray(availability?.daysOfWeek) ? availability.daysOfWeek : [],
      timeSlots: Array.isArray(availability?.timeSlots) ? availability.timeSlots : [],
    },
    noteToGuest: description?.fr || name?.fr || '',
    _serviceId: svc.id,
  };
}

function buildGroceryAvailability(
  config: Record<string, unknown>,
  baseAvailability: Record<string, unknown> | undefined,
) {
  const avail = config.availability as { daysOfWeek?: number[]; timeSlots?: string[] } | undefined;
  const daysOfWeek = Array.isArray(avail?.daysOfWeek) ? avail.daysOfWeek : [];
  const timeSlots = Array.isArray(avail?.timeSlots) ? avail.timeSlots : [];
  const hasWindow = daysOfWeek.length > 0 || timeSlots.length > 0;
  return {
    ...(baseAvailability || {}),
    type: hasWindow ? 'time_window' : baseAvailability?.type || 'always',
    daysOfWeek,
    timeSlots,
    deliveryLeadTimeHours: Number(config.deliveryLeadTimeHours) || EMPTY_GROCERY.deliveryLeadTimeHours,
  };
}

function mapToConciergeGrocery(
  config: Record<string, unknown>,
  existingDoc: Record<string, unknown> | null,
) {
  const base = (existingDoc?.groceryServices as Record<string, unknown>[] | undefined)?.[0];
  const id = config._serviceId || base?.id || 'grocery_default';
  const baseAvailability = base?.availability as Record<string, unknown> | undefined;
  const groceryService = {
    id,
    enabled: true,
    name: {
      fr: 'Courses',
      en: 'Groceries',
      ar: 'بقالة',
    },
    description: {
      fr: config.noteToGuest,
      en: config.noteToGuest,
      ar: config.noteToGuest,
    },
    pricing: {
      type: 'service_fee_only',
      serviceFee: Number(config.serviceFee) || 0,
      currency: config.currency || 'MAD',
      explanation: {
        fr: `Frais de service ${config.serviceFee} ${config.currency || 'MAD'}`,
        en: `Service fee ${config.serviceFee} ${config.currency || 'MAD'}`,
        ar: '',
      },
    },
    clientFields: base?.clientFields || {},
    availability: buildGroceryAvailability(config, baseAvailability),
    requiresPMValidation: base?.requiresPMValidation ?? true,
    images: base?.images || [],
  };
  return {
    transportServices: existingDoc?.transportServices || [],
    groceryServices: [groceryService],
    customServices: existingDoc?.customServices || [],
  };
}

function gestionConciergeShell(listingValues: Record<string, unknown>): Record<string, unknown> {
  return {
    transportServices: listingValues.transportServices ?? [],
    groceryServices: listingValues.groceryServices ?? [],
    customServices: listingValues.customServices ?? [],
  };
}

interface Props {
  listingId?: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => Promise<void>;
  templateMode?: boolean;
  templateOwnerKey?: string;
  /** V3 orchestration : pas d’auto-save (évite boucle save → rawDoc → save). */
  manualSaveMode?: boolean;
}

export default function GroceryConfigTab({
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
  templateOwnerKey,
  manualSaveMode = false,
}: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const useOrchestrationGestion = Boolean(onListingPatch) && (templateMode || Object.keys(listingValues).length > 0);
  const gestionGroceryKey = useMemo(
    () => JSON.stringify(listingValues.groceryServices ?? []),
    [listingValues.groceryServices],
  );
  const [config, setConfig] = useState(EMPTY_GROCERY);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const configRef = useRef(config);
  const rawDocRef = useRef<Record<string, unknown> | null>(null);
  const dirtyRef = useRef(false);
  const skipAutoSaveRef = useRef(true);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const markDirty = useCallback(() => {
    if (skipAutoSaveRef.current) return;
    dirtyRef.current = true;
    setDirty(true);
  }, []);

  const patch = useCallback(
    (p: Record<string, unknown>) => {
      markDirty();
      setConfig(c => ({ ...c, ...p }));
    },
    [markDirty],
  );

  const patchAvail = useCallback(
    (p: Record<string, unknown>) => {
      markDirty();
      setConfig(c => ({ ...c, availability: { ...c.availability, ...p } }));
    },
    [markDirty],
  );

  const hydrateFromGestion = useCallback(() => {
    const shell = gestionConciergeShell(listingValues);
    rawDocRef.current = shell;
    const mapped = mapFromConciergeDoc({ groceryServices: shell.groceryServices as unknown[] });
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues]);

  useEffect(() => {
    if (!useOrchestrationGestion) return;
    if (hydratedRef.current && dirtyRef.current) return;
    skipAutoSaveRef.current = true;
    dirtyRef.current = false;
    setDirty(false);
    setLoading(false);
    hydrateFromGestion();
    skipAutoSaveRef.current = false;
  }, [useOrchestrationGestion, gestionGroceryKey, hydrateFromGestion]);

  useEffect(() => {
    if (useOrchestrationGestion) return;
    let cancelled = false;
    skipAutoSaveRef.current = true;
    dirtyRef.current = false;
    hydratedRef.current = false;
    setDirty(false);
    (async () => {
      setLoading(true);
      if (isOwnerTemplate && templateOwnerKey) {
        const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
        if (cancelled) return;
        const payload = (res as { data?: { concierge?: Record<string, unknown> } })?.data ?? res;
        const concierge = (payload as { concierge?: Record<string, unknown> })?.concierge || {};
        rawDocRef.current = {
          groceryServices: concierge.groceryServices,
          transportServices: concierge.transportServices,
          customServices: concierge.customServices,
        };
        setConfig(mapFromConciergeDoc({ groceryServices: concierge.groceryServices as unknown[] }));
      } else if (listingId) {
        const res = await listingsService.getListingConciergeConfig(listingId);
        if (cancelled) return;
        if (res.data) {
          rawDocRef.current = res.data as Record<string, unknown>;
          setConfig(mapFromConciergeDoc(res.data as { groceryServices?: unknown[] }));
        }
      }
      setLoading(false);
      hydratedRef.current = true;
      skipAutoSaveRef.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, isOwnerTemplate, templateOwnerKey, useOrchestrationGestion]);

  const persist = useCallback(async () => {
    setSavingState('saving');
    const shell = useOrchestrationGestion
      ? gestionConciergeShell(listingValues)
      : rawDocRef.current || {};
    const body = mapToConciergeGrocery(configRef.current as Record<string, unknown>, shell);
    logV3Orch('gestion.grocery.persist.start', {
      templateMode,
      listingId: listingId || null,
      serviceFee: configRef.current.serviceFee,
    });
    try {
      if (useOrchestrationGestion && onListingPatch) {
        await onListingPatch({ groceryServices: body.groceryServices });
        if (!templateMode && listingId) {
          const merged = await persistListingConciergeSlice(listingId, {
            groceryServices: body.groceryServices,
          });
          rawDocRef.current = merged;
        } else {
          rawDocRef.current = {
            ...(rawDocRef.current || {}),
            groceryServices: body.groceryServices,
          };
        }
      } else if (isOwnerTemplate && templateOwnerKey) {
        const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
        const payload = (res as { data?: { concierge?: Record<string, unknown> } })?.data ?? res;
        const prev = (payload as { concierge?: Record<string, unknown> })?.concierge || {};
        await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'concierge', {
          transportServices: prev.transportServices || [],
          groceryServices: body.groceryServices,
          customServices: prev.customServices || [],
        });
        rawDocRef.current = { ...(rawDocRef.current || {}), groceryServices: body.groceryServices };
      } else if (listingId) {
        const merged = await persistListingConciergeSlice(listingId, {
          groceryServices: body.groceryServices,
        });
        rawDocRef.current = merged;
      } else {
        return;
      }
      setSavingState('saved');
      dirtyRef.current = false;
      setDirty(false);
      logV3Orch('gestion.grocery.persist.ok', { serviceFee: configRef.current.serviceFee });
      if (!manualSaveMode) {
        window.setTimeout(() => setSavingState('idle'), 2000);
      }
    } catch (err) {
      setSavingState('idle');
      dirtyRef.current = true;
      setDirty(true);
      logV3Orch('gestion.grocery.persist.error', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [
    listingId,
    isOwnerTemplate,
    templateOwnerKey,
    manualSaveMode,
    useOrchestrationGestion,
    onListingPatch,
    templateMode,
    listingValues,
  ]);

  useEffect(() => {
    if (manualSaveMode || loading || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, 900);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, loading, persist, manualSaveMode]);

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
        icon="🛒"
        title="Courses"
        badge="WA · OUI"
        badgeKind="wa-yes"
        subtitle={<>Liste libre + frais de service pour ce logement.</>}
      />

      <Card icon="💰" title="Frais de service" subtitle="Facturés en plus du coût réel des courses">
        <FormRow label="Frais de service" required help="Forfait facturé au voyageur">
          <Box sx={{ maxWidth: 200 }}>
            <NumInput
              value={config.serviceFee}
              suffix="MAD"
              min={0}
              onChange={e => patch({ serviceFee: Number(e.target.value) })}
            />
          </Box>
        </FormRow>
        <FormRow label="Devise">
          <Box sx={{ maxWidth: 120 }}>
            <TextInput value={config.currency} onChange={e => patch({ currency: e.target.value })} />
          </Box>
        </FormRow>
      </Card>

      <Card icon="📅" title="Disponibilités" subtitle="Estimation pour le voyageur (enregistrement à venir)">
        <FormRow label="Jours disponibles" help="Jours où les courses sont possibles">
          <DayPills value={config.availability.daysOfWeek} onChange={v => patchAvail({ daysOfWeek: v })} />
        </FormRow>
        <FormRow label="Créneaux horaires">
          <SlotPills
            value={config.availability.timeSlots}
            options={DEFAULT_SLOT_OPTIONS}
            onChange={v => patchAvail({ timeSlots: v })}
          />
        </FormRow>
        <FormRow label="Délai minimum" help="Heures entre commande et livraison estimée">
          <Box sx={{ maxWidth: 160 }}>
            <NumInput
              value={config.deliveryLeadTimeHours}
              suffix="HEURES"
              min={1}
              onChange={e => patch({ deliveryLeadTimeHours: Number(e.target.value) })}
            />
          </Box>
        </FormRow>
      </Card>

      <Card icon="📝" title="Note voyageur" subtitle="Texte affiché au voyageur">
        <FormRow label="Note">
          <TextArea
            rows={3}
            value={config.noteToGuest}
            onChange={e => patch({ noteToGuest: e.target.value })}
            placeholder="Saisissez librement votre liste de courses…"
          />
        </FormRow>
      </Card>

      <WhenOffNote>
        <b style={{ color: T.text }}>Quand courses est désactivé</b>, le service n’est plus proposé au voyageur.
        Pas de catalogue produits — demande en texte libre + frais de service.
      </WhenOffNote>

      {manualSaveMode ? (
        <V3BlockSaveBar
          label="Courses · gestion concierge"
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
