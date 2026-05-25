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
  normalizeAccessFromApi,
  type AccessFormState,
  type AccessInstructionStep,
} from './accessConfigDefaults';

interface Props {
  listingId?: string;
  listingName?: string;
  ownerId?: string;
  /** Template owner srv-listing : `global` ou id PM (sans listingId). */
  templateOwnerKey?: string;
}

function InstructionBlock({
  step,
  onChange,
}: {
  step: AccessInstructionStep;
  onChange: (patch: Partial<AccessInstructionStep>) => void;
}) {
  return (
    <Card icon="📍" title={step.title} compact>
      <FormRow label="Description activée">
        <Stack direction="row" alignItems="center" gap={1}>
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
  );
}

export default function AccessConfigTab({
  listingId = '',
  listingName = '',
  ownerId,
  templateOwnerKey,
}: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const [form, setForm] = useState<AccessFormState>(() =>
    defaultAccessForm(listingId || templateOwnerKey || '', listingName || 'Template'),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const skipSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    async (payload: AccessFormState) => {
      if (!isOwnerTemplate && !listingId) return;
      if (isOwnerTemplate && !templateOwnerKey) return;
      setSavingState('saving');
      try {
        const sectionBody = {
          receptionMode: {
            type: payload.receptionMode.type,
            assistedGuestMessage: payload.receptionMode.assistedGuestMessage,
            codeSendSchedule: payload.receptionMode.codeSendSchedule,
          },
          instructions: payload.instructions,
        };
        if (isOwnerTemplate && templateOwnerKey) {
          await listingsService.putListingOwnerConfigTemplateSection(
            templateOwnerKey,
            'access',
            sectionBody,
          );
        } else {
          const body = {
            listingId: payload.listingId,
            listingName: payload.listingName || listingName,
            ...sectionBody,
          };
          let res = await listingsService.updateListingAccess(listingId!, body);
          if (res.notFound || (res.error && !res.data)) {
            res = await listingsService.createListingAccess(body);
          }
          if (res.error) throw new Error(res.error);
        }
        setSavingState('saved');
        window.setTimeout(() => setSavingState('idle'), 2200);
      } catch (e: unknown) {
        setSavingState('error');
        toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
      }
    },
    [listingId, listingName, isOwnerTemplate, templateOwnerKey],
  );

  const scheduleSave = useCallback(
    (next: AccessFormState) => {
      if (skipSave.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persist(next), 700);
    },
    [persist],
  );

  const patch = useCallback(
    (updater: (f: AccessFormState) => AccessFormState) => {
      setForm((f) => {
        const next = updater(f);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  useEffect(() => {
    if (!isOwnerTemplate && !listingId) return;
    if (isOwnerTemplate && !templateOwnerKey) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      skipSave.current = true;
      try {
        let doc: Record<string, unknown> | null = null;
        if (isOwnerTemplate && templateOwnerKey) {
          const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
          const payload = (res as { data?: { access?: Record<string, unknown> } })?.data ?? res;
          doc = (payload as { access?: Record<string, unknown> })?.access ?? null;
        } else {
          const res = await listingsService.getListingAccessConfig(listingId!);
          if (res.error && !res.data && !res.notFound) {
            throw new Error(res.error);
          }
          doc = (res.data || null) as Record<string, unknown> | null;
        }
        if (cancelled) return;
        const id = listingId || templateOwnerKey || '';
        setForm(normalizeAccessFromApi(doc, id, listingName || 'Template'));
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Chargement impossible');
          setForm(defaultAccessForm(listingId || templateOwnerKey || '', listingName));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          window.setTimeout(() => {
            skipSave.current = false;
          }, 150);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, listingName, ownerId, isOwnerTemplate, templateOwnerKey]);

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
      <ConfigIntroBar saveState={savingState === 'error' ? 'idle' : savingState}>
        Instructions d&apos;accès ·{' '}
        {isOwnerTemplate ? 'template owner (listing_owner_config_templates)' : 'listing_access'}
      </ConfigIntroBar>

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
          <>
            Mode d&apos;accueil et zones Parking / Immeuble / Appartement — envoyés au voyageur via
            WhatsApp (menu Accès).
          </>
        }
      />

      <Card icon="🚪" title="Mode d'accueil" subtitle="receptionMode">
        <FormRow label="Type">
          <Stack direction="row" gap={1} flexWrap="wrap">
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
            <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
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

      {form.instructions.map((step, i) => (
        <InstructionBlock
          key={step.title}
          step={step}
          onChange={(patchStep) =>
            patch((f) => {
              const instructions = [...f.instructions];
              instructions[i] = { ...instructions[i], ...patchStep };
              return { ...f, instructions };
            })
          }
        />
      ))}

      <Typography sx={{ ...TYPO.caption, mt: 1 }}>
        Sauvegarde automatique après modification. Premier enregistrement : création du document
        listing_access si absent.
      </Typography>
    </Box>
  );
}
