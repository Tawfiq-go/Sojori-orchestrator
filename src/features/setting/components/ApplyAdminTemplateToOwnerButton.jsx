import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { applyAdminDefaultTemplateToOwner } from '../services/serverApi.orchestratorConfig';

/**
 * Copies the admin default template (srv-admin per-owner settings + orchestration task template)
 * onto the selected owner. Destructive overwrite.
 */
export default function ApplyAdminTemplateToOwnerButton({
  targetOwnerId,
  disabled,
  size = 'small',
  variant = 'contained',
  onApplied,
}) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await applyAdminDefaultTemplateToOwner(targetOwnerId);
      toast.success(
        t('Admin default template applied to this owner.', {
          defaultValue: 'Admin default template applied to this owner.',
        }),
      );
      onApplied?.();
      setOpen(false);
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Request failed';
      toast.error(typeof msg === 'string' ? msg : t('Request failed'));
    } finally {
      setLoading(false);
    }
  };

  const invalid = !targetOwnerId || String(targetOwnerId).trim() === '';

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <ContentCopyIcon />}
        disabled={disabled || invalid || loading}
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
        {t('Copy admin template to this owner', {
          defaultValue: 'Copy admin template to this owner',
        })}
      </Button>
      <Dialog open={open} onClose={() => !loading && setOpen(false)}>
        <DialogTitle>
          {t('Overwrite with admin template?', { defaultValue: 'Overwrite with admin template?' })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(
              'This replaces this owner’s rules, descriptions, chatbot menu, concierge, support, OpenAI config, and orchestration categories with the admin default. This cannot be undone.',
              {
                defaultValue:
                  'This replaces this owner’s rules, descriptions, chatbot menu, concierge, support, OpenAI config, and orchestration categories with the admin default. This cannot be undone.',
              },
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading}
            sx={{
              color: '#fff',
              backgroundColor: '#15803d',
              '&:hover': { backgroundColor: '#166534' },
            }}
          >
            {t('Apply', { defaultValue: 'Apply' })}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
