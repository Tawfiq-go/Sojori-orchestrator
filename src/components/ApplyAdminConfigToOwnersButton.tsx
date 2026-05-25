import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Box,
} from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';

export type ApplyMode = 'current' | 'all';

interface ApplyAdminConfigToOwnersButtonProps {
  /** ID du Owner actuellement sélectionné (ou null si admin template) */
  currentOwnerId: string | null;
  /** Nom du Owner actuellement sélectionné */
  currentOwnerName?: string;
  /** True si on affiche actuellement le template Admin */
  isAdminTemplate: boolean;
  /** Callback pour appliquer la config admin à un/plusieurs owners */
  onApply: (mode: ApplyMode, targetOwnerId?: string) => Promise<void>;
  /** Disabled state */
  disabled?: boolean;
  /** Texte du bouton (optionnel) */
  buttonText?: string;
}

/**
 * Bouton pour copier la config Admin vers un ou plusieurs Owners.
 * Inspiré de ApplyAdminTemplateToOwnerButton du legacy.
 */
export default function ApplyAdminConfigToOwnersButton({
  currentOwnerId,
  currentOwnerName,
  isAdminTemplate,
  onApply,
  disabled,
  buttonText = 'Appliquer aux Owners',
}: ApplyAdminConfigToOwnersButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applyMode, setApplyMode] = useState<ApplyMode>('current');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (applyMode === 'current' && !currentOwnerId) {
        toast.error('Aucun Owner sélectionné');
        return;
      }

      await onApply(applyMode, applyMode === 'current' ? currentOwnerId! : undefined);

      const msg =
        applyMode === 'current'
          ? `Config Admin appliquée à ${currentOwnerName || currentOwnerId}`
          : 'Config Admin appliquée à tous les Owners';
      toast.success(msg);
      setOpen(false);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Erreur lors de l\'application';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Si on n'est pas sur le template admin, ne rien afficher
  if (!isAdminTemplate) {
    return null;
  }

  const canApplyCurrent = currentOwnerId && currentOwnerId.trim() !== '';

  return (
    <>
      <Button
        type="button"
        size="small"
        variant="contained"
        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <ContentCopyIcon />}
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          px: 2,
          color: '#fff',
          backgroundColor: '#15803d',
          border: '1px solid #166534',
          boxShadow: '0 1px 2px rgba(22, 101, 52, 0.35)',
          '&:hover': {
            backgroundColor: '#166534',
            borderColor: '#14532d',
          },
          '&:disabled': {
            color: 'rgba(255,255,255,0.85)',
            backgroundColor: '#86efac',
            borderColor: '#4ade80',
          },
        }}
      >
        {buttonText}
      </Button>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Appliquer la config Admin aux Owners ?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Cette action copie la configuration Admin actuelle (task types, orchestration workflows,
            messages catalog) vers un ou plusieurs Owners.
          </DialogContentText>

          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ <strong>Action destructive :</strong> Cette opération écrase complètement la
            configuration existante du/des Owner(s) cible(s). Cette action ne peut pas être annulée.
          </Alert>

          <RadioGroup value={applyMode} onChange={(e) => setApplyMode(e.target.value as ApplyMode)}>
            <FormControlLabel
              value="current"
              control={<Radio />}
              disabled={!canApplyCurrent}
              label={
                <Box>
                  <strong>Owner sélectionné</strong>
                  <Box component="span" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary' }}>
                    {canApplyCurrent
                      ? `Appliquer à : ${currentOwnerName || currentOwnerId}`
                      : 'Aucun Owner sélectionné (sélectionnez un Owner dans le filtre)'}
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              value="all"
              control={<Radio />}
              label={
                <Box>
                  <strong>Tous les Owners</strong>
                  <Box component="span" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary' }}>
                    ⚠️ Applique cette config à TOUS les propriétaires de la plateforme
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading || (applyMode === 'current' && !canApplyCurrent)}
            sx={{
              color: '#fff',
              backgroundColor: '#15803d',
              '&:hover': { backgroundColor: '#166534' },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Appliquer'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
