import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  apiOrchestrationWorkflowToDesign,
  designWorkflowToApi,
} from '../../../utils/fulltaskMappers';
import { OrchestrationTimelineSimulation } from './OrchestrationTimelineSimulation';
import {
  FULLTASK_TASK_TYPE_EMOJI,
  FULLTASK_TASK_TYPE_LABELS,
  emptyWorkflowPlan,
  type FulltaskTaskTypeId,
} from '../staff-design/fulltaskTaskTypes';

export interface TaskConfigOrchestrationDialogProps {
  open: boolean;
  taskType: string;
  orchestration: Record<string, unknown> | null;
  orchestrationCustom: boolean;
  globalOrchestration: Record<string, unknown> | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: {
    orchestration: Record<string, unknown> | null;
    orchestrationCustom: boolean;
  }) => void;
}

export function TaskConfigOrchestrationDialog({
  open,
  taskType,
  orchestration,
  orchestrationCustom,
  globalOrchestration,
  saving = false,
  onClose,
  onSave,
}: TaskConfigOrchestrationDialogProps) {
  const [useCustom, setUseCustom] = useState(orchestrationCustom);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(orchestration);

  useEffect(() => {
    if (!open) return;
    setUseCustom(orchestrationCustom);
    setDraft(orchestration);
  }, [open, orchestration, orchestrationCustom]);

  const label =
    FULLTASK_TASK_TYPE_LABELS[taskType as keyof typeof FULLTASK_TASK_TYPE_LABELS] || taskType;
  const emoji = FULLTASK_TASK_TYPE_EMOJI[taskType as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '📋';

  const handleSave = () => {
    if (!useCustom) {
      onSave({ orchestration: null, orchestrationCustom: false });
      return;
    }
    const ui = draft
      ? apiOrchestrationWorkflowToDesign(draft, taskType) ||
        emptyWorkflowPlan(taskType as FulltaskTaskTypeId)
      : emptyWorkflowPlan(taskType as FulltaskTaskTypeId);
    const api = designWorkflowToApi(ui as Record<string, unknown>);
    onSave({ orchestration: api, orchestrationCustom: true });
  };

  const copyFromGlobal = () => {
    if (globalOrchestration) {
      setDraft({ ...globalOrchestration, type: taskType });
      setUseCustom(true);
      return;
    }
    setDraft(designWorkflowToApi(emptyWorkflowPlan(taskType as FulltaskTaskTypeId) as Record<string, unknown>));
    setUseCustom(true);
  };

  const effective = useCustom ? draft : globalOrchestration;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          sx: { backgroundColor: 'rgba(20, 17, 10, 0.35)', backdropFilter: 'blur(2px)' },
        },
      }}
      PaperProps={{ sx: { borderRadius: '12px' } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {emoji} {label}
        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {taskType}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={useCustom}
                onChange={(e) => {
                  setUseCustom(e.target.checked);
                  if (e.target.checked && !draft) copyFromGlobal();
                }}
              />
            }
            label="Plan orchestration dédié (ce PM / ce listing)"
          />
          {!useCustom ? (
            <Typography variant="body2" color="text.secondary">
              Utilise le plan de la config orchestration globale (si défini pour ce type).
            </Typography>
          ) : null}
          <div className="so-orch-root" style={{ padding: 0, minHeight: 0, background: 'transparent' }}>
            <OrchestrationTimelineSimulation
              title={`${label.toUpperCase()} · VUE VOYAGEUR + STAFF`}
              subtitle="Simulation du plan à partir de la config (relances, assignation, deadline)"
              workflow={effective}
              taskTypeId={taskType}
            />
          </div>
          {useCustom ? (
            <Button size="small" variant="outlined" onClick={copyFromGlobal}>
              Copier depuis config globale
            </Button>
          ) : null}
          <Button
            component={RouterLink}
            to="/orchestration/config"
            size="small"
            variant="text"
            sx={{ alignSelf: 'flex-start' }}
          >
            Éditer le détail (orchestration config) →
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
