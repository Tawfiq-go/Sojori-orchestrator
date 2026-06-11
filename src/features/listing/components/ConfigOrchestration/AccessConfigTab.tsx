// Accès — mode autonome / assisté + zones Parking · Immeuble · Appartement
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import {
  SectionHeader,
  Card,
  FormRow,
  NumInput,
  TextInput,
  TextArea,
  Toggle,
  PillButton,
  ConfigIntroBar,
  TYPO,
} from './SHARED';
import {
  defaultAccessForm,
  mapAccessFormToGestionPatch,
  mapAccessFormToListingAccessBody,
  normalizeAccessFromApi,
  type AccessFormState,
  type AccessInstructionStep,
} from './accessConfigDefaults';
import { V3BlockSaveBar } from '../../../orchestrationListingV3/V3BlockSaveBar';
import { logV3Orch } from '../../../orchestrationListingV3/v3OrchestrationDebugLog';

interface Props {
  listingId?: string;
  listingName?: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => Promise<void>;
  templateMode?: boolean;
  /** Template owner srv-listing : `global` ou id PM (sans listingId). */
  templateOwnerKey?: string;
  manualSaveMode?: boolean;
}

function InstructionBlock({
  step,
  onChange,
  disabled = false,
}: {
  step: AccessInstructionStep;
  onChange: (patch: Partial<AccessInstructionStep>) => void;
  disabled?: boolean;
}) {
  return (
    <Box sx={disabled ? { opacity: 0.55, pointerEvents: 'none', userSelect: 'none' } : undefined}>
      <Card icon="📍" title={step.title} compact>
        <FormRow label="Description activée">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Toggle
              on={step.description.enabled}
              onChange={() =>
                onChange({
                  description: { ...step.description, enabled: !step.description.enabled },
                })
              }
            />
            <Typography sx={{ fontSize: 12, color: T.text3 }}>
              {step.description.enabled ? 'Oui' : 'Non'}
            </Typography>
          </Stack>
        </FormRow>
        {step.description.enabled && (
          <FormRow label="Description (FR)" required>
            <TextArea
              value={step.description.value}
              onChange={(e) =>
                onChange({ description: { ...step.description, enabled: true, value: e.target.value } })
              }
              placeholder="Instructions pour le voyageur…"
            />
          </FormRow>
        )}
        <FormRow label="Code d'accès (optionnel)">
          <TextInput
            value={step.code.value}
            onChange={(e) =>
              onChange({
                code: { enabled: Boolean(e.target.value), value: e.target.value, description: '' },
              })
            }
            placeholder="Ex. 1234#"
          />
        </FormRow>
      </Card>
    </Box>
  );
}

export default function AccessConfigTab({
  listingId = '',
  listingName = '',
  ownerId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
  templateOwnerKey,
  manualSaveMode = false,
}: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const useOrchestrationGestion =
    Boolean(onListingPatch) && (templateMode || Object.keys(listingValues).length > 0);
  const contextId = listingId || templateOwnerKey || '';
  const [form, setForm] = useState<AccessFormState>(() =>
    defaultAccessForm(contextId, listingName || 'Template'),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [dirty, setDirty] = useState(false);
  const formRef = useRef(form);
  const skipSave = useRef(true);
  const dirtyRef = useRef(false);
  const hydratedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const persistListingAccess = useCallback(async (payload: AccessFormState) => {
    const body = mapAccessFormToListingAccessBody(payload);
    let res = await listingsService.updateListingAccess(listingId!, body);
    if (res.notFound || (res.error && !res.data)) {
      res = await listingsService.createListingAccess(body);
    }
    if (res.error) throw new Error(res.error);
  }, [listingId]);

  const persist = useCallback(async () => {
    const payload = formRef.current;
    if (!useOrchestrationGestion && !isOwnerTemplate && !listingId) return;
    if (!useOrchestrationGestion && isOwnerTemplate && !templateOwnerKey) return;

    setSavingState('saving');
    logV3Orch('gestion.access.persist.start', {
      templateMode,
      listingId: listingId || null,
      receptionType: payload.receptionMode.type,
    });
    try {
      if (useOrchestrationGestion && onListingPatch) {
        if (!templateMode && listingId) {
          await persistListingAccess(payload);
        }
        await onListingPatch(mapAccessFormToGestionPatch(payload, { templateMode }));
      } else if (isOwnerTemplate && templateOwnerKey) {
        await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'access', {
          receptionMode: mapAccessFormToGestionPatch(payload, { templateMode: true }).receptionMode,
        });
      } else if (listingId) {
        await persistListingAccess(payload);
      } else {
        return;
      }
      setSavingState('saved');
      dirtyRef.current = false;
      setDirty(false);
      logV3Orch('gestion.access.persist.ok', { receptionType: payload.receptionMode.type });
      if (!manualSaveMode) {
        window.setTimeout(() => setSavingState('idle'), 2200);
      }
    } catch (e: unknown) {
      setSavingState('error');
      dirtyRef.current = true;
      setDirty(true);
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
      logV3Orch('gestion.access.persist.error', {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [
    isOwnerTemplate,
    listingId,
    manualSaveMode,
    onListingPatch,
    persistListingAccess,
    templateMode,
    templateOwnerKey,
    useOrchestrationGestion,
  ]);

  const scheduleSave = useCallback(() => {
    if (manualSaveMode || skipSave.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(), 700);
  }, [manualSaveMode, persist]);

  const patch = useCallback(
    (updater: (f: AccessFormState) => AccessFormState) => {
      if (!skipSave.current) {
        dirtyRef.current = true;
        setDirty(true);
      }
      setForm((f) => {
        const next = updater(f);
        formRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const hydrateFromValues = useCallback(() => {
    const next = normalizeAccessFromApi(listingValues, contextId, listingName || 'Template');
    setForm(next);
    formRef.current = next;
    hydratedRef.current = true;
  }, [contextId, listingName, listingValues]);

  useEffect(() => {
    if (!useOrchestrationGestion) return;
    if (hydratedRef.current && dirtyRef.current) return;
    let cancelled = false;
    skipSave.current = true;
    dirtyRef.current = false;
    setDirty(false);
    setLoadError(null);
    setLoading(true);
    (async () => {
      try {
        let source = listingValues;
        if (!templateMode && listingId && listingValues.receptionMode == null) {
          const accessRes = await listingsService.getListingAccessConfig(listingId);
          if (accessRes.data) {
            source = { ...listingValues, ...(accessRes.data as Record<string, unknown>) };
          }
        }
        if (cancelled) return;
        const next = normalizeAccessFromApi(source, contextId, listingName || 'Template');
        setForm(next);
        formRef.current = next;
        hydratedRef.current = true;
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Chargement impossible');
          hydrateFromValues();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          skipSave.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useOrchestrationGestion, hydrateFromValues, listingValues, templateMode, listingId, contextId, listingName]);

  useEffect(() => {
    if (useOrchestrationGestion) return;
    if (!isOwnerTemplate && !listingId) return;
    if (isOwnerTemplate && !templateOwnerKey) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      skipSave.current = true;
      dirtyRef.current = false;
      hydratedRef.current = false;
      setDirty(false);
      try {
        let doc: Record<string, unknown> | null = null;
        if (isOwnerTemplate && templateOwnerKey) {
          const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
          const payload = (res as { data?: { access?: Record<string, unknown> } })?.data ?? res;
          doc = (payload as { access?: Record<string, unknown> })?.access ?? null;
        } else {
          const accessRes = await listingsService.getListingAccessConfig(listingId!);
          if (accessRes.error && !accessRes.data && !accessRes.notFound) {
            throw new Error(accessRes.error);
          }
          doc = (accessRes.data || null) as Record<string, unknown> | null;
        }
        if (cancelled) return;
        const next = normalizeAccessFromApi(doc, contextId, listingName || 'Template');
        setForm(next);
        formRef.current = next;
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Chargement impossible');
          const fallback = defaultAccessForm(contextId, listingName);
          setForm(fallback);
          formRef.current = fallback;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          hydratedRef.current = true;
          window.setTimeout(() => {
            skipSave.current = false;
          }, 150);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, listingName, ownerId, isOwnerTemplate, templateOwnerKey, useOrchestrationGestion, contextId]);

  const mode = form.receptionMode.type;
  const sched = form.receptionMode.codeSendSchedule;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: T.primary }} />
      </Box>
    );
  }

  return (
    <Box>
      {!manualSaveMode && (
        <ConfigIntroBar saveState={savingState === 'error' ? 'idle' : savingState}>
          Instructions d&apos;accès ·{' '}
          {isOwnerTemplate ? 'template owner (listing_owner_config_templates)' : 'listing_access'}
        </ConfigIntroBar>
      )}

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
          {loadError}
        </Alert>
      )}

      <SectionHeader
        icon="🔐"
        title="Accès"
        badge="✓ schéma"
        badgeKind="wa-yes"
        subtitle={
          isOwnerTemplate ? (
            <>
              Mode d&apos;accueil partagé sur les annonces (menu WhatsApp <strong>F</strong>). Les codes
              parking / immeuble / appartement se configurent <strong>par listing</strong>.
            </>
          ) : (
            <>Codes et instructions d&apos;accès (menu WhatsApp <strong>F</strong>).</>
          )
        }
      />

      <Card icon="🚪" title="Mode d'accueil" subtitle="receptionMode">
        <FormRow label="Type">
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            <PillButton
              active={mode === 'automatic'}
              onClick={() =>
                patch((f) => ({
                  ...f,
                  receptionMode: { ...f.receptionMode, type: 'automatic' },
                }))
              }
            >
              Autonome
            </PillButton>
            <PillButton
              active={mode === 'assisted'}
              onClick={() =>
                patch((f) => ({
                  ...f,
                  receptionMode: { ...f.receptionMode, type: 'assisted' },
                }))
              }
            >
              Assisté
            </PillButton>
          </Stack>
        </FormRow>

        {mode === 'assisted' ? (
          <FormRow label="Message envoyé au client" help="Texte WhatsApp pour accueil physique">
            <TextArea
              value={form.receptionMode.assistedGuestMessage}
              onChange={(e) =>
                patch((f) => ({
                  ...f,
                  receptionMode: { ...f.receptionMode, assistedGuestMessage: e.target.value },
                }))
              }
              placeholder="Ex. Notre équipe vous accueillera sur place à l'heure convenue…"
            />
          </FormRow>
        ) : (
          <FormRow
            label="Envoi des codes au client"
            help="Ex. check-in J-2 à 11h → 2 jours avant arrivée, 11:00"
          >
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 12, color: T.text2 }}>J −</Typography>
              <Box sx={{ width: 72 }}>
                <NumInput
                  min={0}
                  max={30}
                  value={sched.daysBefore}
                  onChange={(e) => {
                    const daysBefore = Math.max(0, Number(e.target.value) || 0);
                    patch((f) => ({
                      ...f,
                      receptionMode: {
                        ...f.receptionMode,
                        codeSendSchedule: { ...f.receptionMode.codeSendSchedule, daysBefore },
                      },
                    }));
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 12, color: T.text2 }}>à</Typography>
              <TextInput
                value={sched.time}
                onChange={(e) =>
                  patch((f) => ({
                    ...f,
                    receptionMode: {
                      ...f.receptionMode,
                      codeSendSchedule: {
                        ...f.receptionMode.codeSendSchedule,
                        time: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="11:00"
                style={{ width: 88 }}
              />
            </Stack>
          </FormRow>
        )}
      </Card>

      {isOwnerTemplate && (
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Parking, immeuble et appartement (codes et descriptions) ne sont <strong>pas</strong>{' '}
          synchronisés depuis ce template. Configurez-les dans chaque fiche annonce → onglet{' '}
          <strong>Accès</strong>.
        </Alert>
      )}

      {form.instructions.map((step, i) => (
        <InstructionBlock
          key={step.title}
          step={step}
          disabled={isOwnerTemplate}
          onChange={(patchStep) =>
            patch((f) => {
              const instructions = [...f.instructions];
              instructions[i] = { ...instructions[i], ...patchStep };
              return { ...f, instructions };
            })
          }
        />
      ))}

      {!manualSaveMode && (
        <Typography sx={{ ...TYPO.caption, mt: 1 }}>
          {isOwnerTemplate
            ? 'Sauvegarde automatique du mode d’accueil uniquement. La sync vers les annonces ne modifie pas les codes d’accès déjà saisis par listing.'
            : 'Sauvegarde automatique après modification. Premier enregistrement : création du document listing_access si absent.'}
        </Typography>
      )}

      {manualSaveMode ? (
        <V3BlockSaveBar
          label="Accès · mode d'accueil"
          dirty={dirty}
          saving={savingState === 'saving'}
          onSave={() => void persist()}
        />
      ) : null}
    </Box>
  );
}
