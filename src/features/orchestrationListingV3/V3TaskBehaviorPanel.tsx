import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import type { CapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
import {
  AUTO_COMPLETION_TRIGGER_LABELS,
  TASK_AUTO_COMPLETION_TRIGGERS,
  hintForAutoCompletion,
  normalizeCompletionTrigger,
  type TaskAutoCompletionTrigger,
} from '../taskHub/taskConfig/taskCompletionLabels';
import { saveListingTaskBehavior, type ListingOrchestrationDoc } from './listingOrchestrationApi';
import { V3 } from './theme';
import { V3FormRow, V3PillButton, V3Toggle } from './V3Primitives';

type Props = {
  def: CapabilityDefinition;
  listingId: string;
  doc: ListingOrchestrationDoc;
  onSaved: () => void;
};

export default function V3TaskBehaviorPanel({ def, listingId, doc, onSaved }: Props) {
  const cap = doc.capabilities?.[def.key];
  const initial = cap?.taskBehavior ?? {
    requiresClientAction: ['cleaning_paid', 'transport', 'groceries', 'concierge', 'support', 'service_client'].includes(
      def.taskType ?? '',
    ),
    autoCompletionTrigger: 'manual',
  };

  const [requiresClientAction, setRequiresClientAction] = useState(initial.requiresClientAction);
  const [autoCompletionTrigger, setAutoCompletionTrigger] = useState<TaskAutoCompletionTrigger | null>(
    normalizeCompletionTrigger(initial.autoCompletionTrigger),
  );
  const [saving, setSaving] = useState(false);

  if (!def.taskType || def.columns.task === 'na') {
    return (
      <Typography sx={{ fontSize: 12, color: V3.t3 }}>Pas de comportement tâche.</Typography>
    );
  }

  const persist = async (
    patch: Partial<{ requiresClientAction: boolean; autoCompletionTrigger: TaskAutoCompletionTrigger | null }>,
  ) => {
    setSaving(true);
    try {
      const nextRequires = patch.requiresClientAction ?? requiresClientAction;
      const nextTrigger = patch.autoCompletionTrigger ?? autoCompletionTrigger ?? 'manual';
      await saveListingTaskBehavior({
        listingId,
        capabilityKey: def.key,
        taskBehavior: {
          requiresClientAction: nextRequires,
          autoCompletionTrigger: nextTrigger,
        },
        doc,
      });
      toast.success('Comportement enregistré');
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
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
              void persist({ requiresClientAction: v });
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
                if (v) void persist({ autoCompletionTrigger: v });
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
  );
}
