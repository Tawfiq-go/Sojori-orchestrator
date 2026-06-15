import { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import type { CapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
import {
  AUTO_COMPLETION_TRIGGER_LABELS,
  TASK_AUTO_COMPLETION_TRIGGERS,
  defaultTaskBehaviorForType,
  hintForAutoCompletion,
  normalizeCompletionTrigger,
  type TaskAutoCompletionTrigger,
} from '../taskHub/taskConfig/taskCompletionLabels';
import { saveListingTaskBehavior, type ListingOrchestrationDoc } from './listingOrchestrationApi';
import { saveOwnerTaskBehavior, type OwnerOrchestrationDoc } from './ownerOrchestrationApi';
import { V3 } from './theme';
import { V3FormRow, V3PillButton, V3Toggle } from './V3Primitives';
import { V3BlockSaveBar } from './V3BlockSaveBar';

type Props = {
  def: CapabilityDefinition;
  doc: ListingOrchestrationDoc | OwnerOrchestrationDoc;
  listingId?: string;
  ownerKey?: string;
  ownerTemplateMode?: boolean;
  onSaved: () => void;
};

function defaultTaskBehavior(def: CapabilityDefinition) {
  if (!def.taskType) {
    return { requiresClientAction: false, autoCompletionTrigger: 'manual' as const };
  }
  return defaultTaskBehaviorForType(def.taskType);
}

export default function V3TaskBehaviorPanel({
  def,
  doc,
  listingId,
  ownerKey,
  ownerTemplateMode = false,
  onSaved,
}: Props) {
  const cap = doc.capabilities?.[def.key];
  const initial = cap?.taskBehavior ?? defaultTaskBehavior(def);

  const [requiresClientAction, setRequiresClientAction] = useState(initial.requiresClientAction);
  const [autoCompletionTrigger, setAutoCompletionTrigger] = useState<TaskAutoCompletionTrigger | null>(
    normalizeCompletionTrigger(initial.autoCompletionTrigger),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const next = cap?.taskBehavior ?? defaultTaskBehavior(def);
    setRequiresClientAction(next.requiresClientAction);
    setAutoCompletionTrigger(normalizeCompletionTrigger(next.autoCompletionTrigger));
    setDirty(false);
  }, [def.key, def.taskType, cap?.taskBehavior?.requiresClientAction, cap?.taskBehavior?.autoCompletionTrigger]);

  if (!def.taskType || def.columns.task === 'na') {
    return (
      <Typography sx={{ fontSize: 12, color: V3.t3 }}>Pas de comportement tâche.</Typography>
    );
  }

  const persist = async () => {
    setSaving(true);
    try {
      const taskBehavior = {
        requiresClientAction,
        autoCompletionTrigger: autoCompletionTrigger ?? 'manual',
      };

      if (ownerTemplateMode && ownerKey) {
        await saveOwnerTaskBehavior({
          ownerKey,
          capabilityKey: def.key,
          taskBehavior,
          doc: doc as OwnerOrchestrationDoc,
        });
      } else if (listingId) {
        await saveListingTaskBehavior({
          listingId,
          capabilityKey: def.key,
          taskBehavior,
          doc: doc as ListingOrchestrationDoc,
        });
      } else {
        throw new Error('Contexte enregistrement introuvable');
      }

      toast.success('Comportement enregistré');
      setDirty(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = ownerTemplateMode
    ? 'Comportement tâche · owner_orchestrations'
    : 'Comportement tâche · listing_orchestrations';

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          width: '100%',
          alignItems: 'start',
        }}
      >
        <V3FormRow label="À la demande client" help="Tâche créée quand le client agit (WhatsApp), pas à la résa.">
          <Stack direction="row" alignItems="center" gap={1}>
            <V3Toggle
              kind="task"
              checked={requiresClientAction}
              disabled={saving}
              onChange={v => {
                setRequiresClientAction(v);
                setDirty(true);
              }}
            />
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: requiresClientAction ? V3.task : V3.t4 }}>
              {requiresClientAction ? 'Activé' : 'Désactivé'}
            </Typography>
          </Stack>
        </V3FormRow>

        <V3FormRow label="Auto-complétion" help={def.taskType ? hintForAutoCompletion(def.taskType, autoCompletionTrigger) : undefined}>
          <Stack direction="row" useFlexGap sx={{ gap: 0.5, flexWrap: 'wrap' }}>
            {TASK_AUTO_COMPLETION_TRIGGERS.map(t => (
              <V3PillButton
                key={t}
                active={autoCompletionTrigger === t}
                disabled={saving}
                onClick={() => {
                  const v = normalizeCompletionTrigger(t);
                  setAutoCompletionTrigger(v);
                  setDirty(true);
                }}
              >
                {t === 'manual' ? 'Manuel' : t === 'staff_done' ? 'Staff terminé' : 'Statut OK'}
              </V3PillButton>
            ))}
          </Stack>
          <Typography sx={{ fontSize: 10, color: V3.t4, mt: 0.75 }}>
            {autoCompletionTrigger ? AUTO_COMPLETION_TRIGGER_LABELS[autoCompletionTrigger] : '—'}
          </Typography>
        </V3FormRow>
      </Box>

      <V3BlockSaveBar label={saveLabel} dirty={dirty} saving={saving} onSave={() => void persist()} />
    </Box>
  );
}
