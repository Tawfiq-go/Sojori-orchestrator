/**
 * Modal création tâche — 3 étapes (parité legacy dashboard).
 */

import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { createTaskFromFormData } from './addTaskApi';
import { Step1TypeSelection } from './Step1TypeSelection';
import { Step2ClientRequest } from './Step2ClientRequest';
import { Step3TaskInfo } from './Step3TaskInfo';
import type { TaskFormData } from './types';

/** Ambre Atelier 2026 (aligné TasksListPage) */
const MODAL_ACCENT = '#b8851a';
const MODAL_ACCENT_HOVER = '#9a6f14';

export interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newTask?: unknown) => void;
  ownerId?: string;
  isAdminUser?: boolean;
  useFulltaskApi?: boolean;
  createTaskFn?: (formData: TaskFormData, ownerId?: string) => Promise<{ task?: unknown; data?: unknown }>;
}

const INITIAL_FORM_DATA: TaskFormData = {
  taskType: null,
  listing: null,
  reservation: null,
  listingServices: null,
  clientRequest: {},
  taskInfo: {
    startDate: null,
    endDate: null,
    duration: 2,
    emergency: 'Normal',
    tags: [],
    comment: '',
    images: [],
    paid: false,
    price: 0,
    paymentMode: '',
  },
};

const STEPS_LEGACY = ['Contexte', 'Demande Client', 'Tâche'];
const STEPS_FULLTASK = ['Contexte', 'Tâche'];

export function AddTaskModal({
  open,
  onClose,
  onSuccess,
  ownerId,
  isAdminUser = false,
  useFulltaskApi = false,
  createTaskFn,
}: AddTaskModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<TaskFormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setActiveStep(0);
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response =
        useFulltaskApi && createTaskFn
          ? await createTaskFn(formData, ownerId)
          : await createTaskFromFormData(formData, ownerId);
      onSuccess((response as { task?: unknown })?.task ?? (response as { data?: unknown })?.data);
      handleClose();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      setError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.message ||
          axiosErr.message ||
          'Erreur lors de la création de la tâche',
      );
    } finally {
      setLoading(false);
    }
  };

  const steps = useFulltaskApi ? STEPS_FULLTASK : STEPS_LEGACY;
  const canProceedStep1 = useFulltaskApi
    ? formData.fulltaskTypeId && formData.listing && formData.reservation
    : formData.taskType && formData.listing && formData.reservation;
  const canSubmit = formData.taskInfo.startDate && formData.taskInfo.endDate;
  const lastStepIndex = steps.length - 1;

  const resolvedOwnerId =
    ownerId ||
    (formData.listing?.ownerId != null
      ? String(formData.listing.ownerId)
      : undefined);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(20, 17, 10, 0.35)',
            backdropFilter: 'blur(2px)',
          },
        },
        paper: {
          sx: {
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(20,17,10,0.15)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: MODAL_ACCENT,
          color: 'white',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        Créer une tâche
        <IconButton
          onClick={handleClose}
          disabled={loading}
          sx={{ color: 'white' }}
          aria-label="Fermer"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pt: 2 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent>
        {activeStep === 0 && (
          <Step1TypeSelection
            formData={formData}
            onChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
            ownerId={ownerId}
            isAdminUser={isAdminUser}
            useFulltaskApi={useFulltaskApi}
          />
        )}
        {!useFulltaskApi && activeStep === 1 && (
          <Step2ClientRequest
            formData={formData}
            onChange={(clientRequest) =>
              setFormData((prev) => ({ ...prev, clientRequest }))
            }
          />
        )}
        {activeStep === lastStepIndex && (
          <Step3TaskInfo
            formData={formData}
            onChange={(taskInfo) =>
              setFormData((prev) => ({ ...prev, taskInfo }))
            }
            ownerId={resolvedOwnerId}
            error={error}
            useFulltaskApi={useFulltaskApi}
            listingId={formData.listing?._id || formData.listing?.id}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        {activeStep > 0 && (
          <Button
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            disabled={loading}
          >
            Précédent
          </Button>
        )}
        {activeStep < lastStepIndex ? (
          <Button
            onClick={() =>
              setActiveStep((s) => Math.min(lastStepIndex, s + 1))
            }
            variant="contained"
            disabled={activeStep === 0 && !canProceedStep1}
            sx={{
              bgcolor: MODAL_ACCENT,
              '&:hover': { bgcolor: MODAL_ACCENT_HOVER },
            }}
          >
            Suivant
          </Button>
        ) : (
          <Button
            onClick={() => void handleSubmit()}
            variant="contained"
            disabled={!canSubmit || loading}
            sx={{
              bgcolor: MODAL_ACCENT,
              '&:hover': { bgcolor: MODAL_ACCENT_HOVER },
            }}
          >
            {loading ? 'Création…' : 'Créer la tâche'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
