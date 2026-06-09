import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { sxInput } from '../../../../components/listing/form-v2/tabs/_shared';
import { SOJORI_TOKENS as T } from './types';
import {
  PAID_CLEANING_CATALOG,
  type PaidCleaningServiceType,
} from './cleaningConfigTypes';
import { PillButton, TYPO } from './SHARED';

type ServiceDraft = Omit<PaidCleaningServiceType, 'enabled' | 'displayOrder' | 'timeslots'>;

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (service: ServiceDraft) => void;
  existingIds: string[];
};

const defaultCustom = (): ServiceDraft => ({
  id: '',
  labelFr: '',
  descriptionFr: '',
  icon: '🧹',
  duration: 2,
  price: 0,
  currency: 'MAD',
  timeslotMode: 'timeslot',
});

export default function AddPaidCleaningServiceDialog({
  open,
  onClose,
  onAdd,
  existingIds,
}: Props) {
  const [mode, setMode] = useState<'library' | 'custom'>('library');
  const [custom, setCustom] = useState(defaultCustom);

  useEffect(() => {
    if (!open) return;
    setMode('library');
    setCustom(defaultCustom());
  }, [open]);

  const libraryAvailable = PAID_CLEANING_CATALOG.filter(c => !existingIds.includes(c.id));

  const submitCustom = () => {
    const label = custom.labelFr.trim();
    if (!label) return;
    onAdd({
      id: `paid_${Date.now()}`,
      labelFr: label,
      descriptionFr: custom.descriptionFr.trim(),
      icon: custom.icon || '🧹',
      duration: Math.max(1, Number(custom.duration) || 2),
      price: Math.max(0, Number(custom.price) || 0),
      currency: 'MAD',
      timeslotMode: custom.timeslotMode,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ ...TYPO.bodyBold, fontSize: 15, letterSpacing: '-0.02em', pb: 0.5 }}>
        Ajouter un ménage payant
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" sx={{ gap: 0.5, mb: 1.5, mt: 0.5 }}>
          {(
            [
              { id: 'library' as const, label: '📚 Bibliothèque' },
              { id: 'custom' as const, label: '✏️ Nouveau' },
            ] as const
          ).map(m => (
            <PillButton key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </PillButton>
          ))}
        </Stack>

        {mode === 'library' ? (
          <>
            <Typography sx={{ ...TYPO.caption, mb: 1 }}>
              Modèles prédéfinis — titre, description et prix modifiables après ajout
            </Typography>
            {libraryAvailable.length === 0 ? (
              <Typography sx={{ ...TYPO.intro, py: 2, textAlign: 'center' }}>
                Tous les modèles sont déjà ajoutés. Utilisez l’onglet <b>Nouveau</b>.
              </Typography>
            ) : (
              <Stack sx={{ gap: 0.75 }}>
                {libraryAvailable.map(cat => (
                  <Box
                    key={cat.id}
                    component="button"
                    type="button"
                    onClick={() => {
                      onAdd({ ...cat });
                      onClose();
                    }}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      p: 1.25,
                      borderRadius: 1.125,
                      border: `1px solid ${T.border}`,
                      bgcolor: T.bg1,
                      textAlign: 'left',
                      width: '100%',
                      '&:hover': { borderColor: T.primary, bgcolor: T.primaryTint },
                    }}
                  >
                    <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{cat.icon}</Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ ...TYPO.bodyBold }}>{cat.labelFr}</Typography>
                      <Typography sx={{ ...TYPO.caption, lineHeight: 1.35 }}>{cat.descriptionFr}</Typography>
                    </Box>
                    <Typography sx={{ ...TYPO.price, flexShrink: 0 }}>{cat.price} MAD</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </>
        ) : (
          <Stack sx={{ gap: 1.25, pt: 0.5 }}>
            <Typography sx={{ ...TYPO.caption }}>Type personnalisé — créneaux à ajouter sur la carte</Typography>
            <TextField
              size="small"
              label="Titre"
              required
              fullWidth
              value={custom.labelFr}
              onChange={e => setCustom(c => ({ ...c, labelFr: e.target.value }))}
              slotProps={{ htmlInput: { maxLength: 60 } }}
              sx={sxInput}
            />
            <TextField
              size="small"
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={custom.descriptionFr}
              onChange={e => setCustom(c => ({ ...c, descriptionFr: e.target.value }))}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              sx={sxInput}
            />
            <Stack direction="row" sx={{ gap: 1 }}>
              <TextField
                size="small"
                label="Prix (MAD)"
                type="number"
                fullWidth
                value={custom.price || ''}
                onChange={e => setCustom(c => ({ ...c, price: Number(e.target.value) || 0 }))}
                slotProps={{ htmlInput: { min: 0 } }}
                sx={sxInput}
              />
              <TextField
                size="small"
                label="Durée (h)"
                type="number"
                fullWidth
                value={custom.duration || ''}
                onChange={e => setCustom(c => ({ ...c, duration: Number(e.target.value) || 1 }))}
                slotProps={{ htmlInput: { min: 1, max: 12 } }}
                sx={sxInput}
              />
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: T.text2, fontWeight: 600 }}>
          Annuler
        </Button>
        {mode === 'custom' && (
          <Button
            variant="contained"
            disabled={!custom.labelFr.trim()}
            onClick={submitCustom}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: T.primary, '&:hover': { bgcolor: T.primaryDeep } }}
          >
            Ajouter
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
