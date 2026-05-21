import React, { useState, useEffect } from 'react';
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
  INCLUDED_EXTRA_CATALOG,
  INCLUDED_EXTRA_ICON_PICKER,
  type IncludedCleaningExtra,
} from './cleaningConfigTypes';
import { PillButton, TYPO } from './SHARED';

type ExtraDraft = Omit<IncludedCleaningExtra, 'enabled'>;

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (extra: ExtraDraft) => void;
  existingIds: string[];
};

const defaultCustom = (): ExtraDraft => ({
  id: '',
  labelFr: '',
  descriptionFr: '',
  price: 0,
  icon: '✨',
});

export default function AddIncludedExtraDialog({ open, onClose, onAdd, existingIds }: Props) {
  const [mode, setMode] = useState<'library' | 'custom'>('library');
  const [custom, setCustom] = useState(defaultCustom);

  useEffect(() => {
    if (!open) return;
    setMode('library');
    setCustom(defaultCustom());
  }, [open]);

  const libraryAvailable = INCLUDED_EXTRA_CATALOG.filter(c => !existingIds.includes(c.id));

  const submitCustom = () => {
    const label = custom.labelFr.trim();
    if (!label) return;
    onAdd({
      id: `extra_${Date.now()}`,
      labelFr: label,
      descriptionFr: custom.descriptionFr.trim(),
      price: Math.max(0, Number(custom.price) || 0),
      icon: custom.icon || '✨',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ ...TYPO.bodyBold, fontSize: 15, letterSpacing: '-0.02em', pb: 0.5 }}>
        Ajouter un extra payant
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" gap={0.5} sx={{ mb: 1.5, mt: 0.5 }}>
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
            <Typography sx={{ ...TYPO.caption, mb: 1 }}>Modèles prédéfinis — cliquez pour ajouter</Typography>
            {libraryAvailable.length === 0 ? (
              <Typography sx={{ ...TYPO.intro, py: 2, textAlign: 'center' }}>
                Tous les modèles sont déjà ajoutés. Utilisez l’onglet <b>Nouveau</b>.
              </Typography>
            ) : (
              <Stack gap={0.75}>
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
                    <Typography sx={{ ...TYPO.price, flexShrink: 0 }}>+{cat.price} MAD</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </>
        ) : (
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Typography sx={{ ...TYPO.caption }}>Extra personnalisé (hors bibliothèque)</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
              <TextField
                size="small"
                label="Icône"
                value={custom.icon}
                onChange={e => setCustom(c => ({ ...c, icon: e.target.value.slice(0, 4) }))}
                sx={{ ...sxInput, width: 72, '& input': { textAlign: 'center', fontSize: 18 } }}
              />
              {INCLUDED_EXTRA_ICON_PICKER.map(emoji => (
                <Box
                  key={emoji}
                  component="button"
                  type="button"
                  onClick={() => setCustom(c => ({ ...c, icon: emoji }))}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    width: 32,
                    height: 32,
                    fontSize: 18,
                    borderRadius: 0.75,
                    border: custom.icon === emoji ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
                    bgcolor: custom.icon === emoji ? T.primaryTint : T.bg2,
                  }}
                >
                  {emoji}
                </Box>
              ))}
            </Stack>
            <TextField
              size="small"
              label="Nom"
              required
              fullWidth
              value={custom.labelFr}
              onChange={e => setCustom(c => ({ ...c, labelFr: e.target.value }))}
              inputProps={{ maxLength: 60 }}
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
              inputProps={{ maxLength: 200 }}
              sx={sxInput}
            />
            <TextField
              size="small"
              label="Prix (MAD)"
              type="number"
              fullWidth
              value={custom.price || ''}
              onChange={e => setCustom(c => ({ ...c, price: Number(e.target.value) || 0 }))}
              inputProps={{ min: 0 }}
              sx={sxInput}
            />
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
