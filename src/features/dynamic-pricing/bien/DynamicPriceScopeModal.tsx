// Modal activation Sojori AI : périmètre sync Prix vs Min stay
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { T } from '../_tokens';

export type DynamicPriceScopeChoice = {
  applyPrice: boolean;
  applyMinStay: boolean;
};

export interface DynamicPriceScopeModalProps {
  open: boolean;
  listingName?: string;
  initialApplyPrice?: boolean;
  initialApplyMinStay?: boolean;
  editMode?: boolean;
  saving?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (choice: DynamicPriceScopeChoice) => void;
}

export default function DynamicPriceScopeModal({
  open,
  listingName,
  initialApplyPrice = true,
  initialApplyMinStay = true,
  editMode = false,
  saving = false,
  errorMessage = null,
  onClose,
  onConfirm,
}: DynamicPriceScopeModalProps) {
  const confirmLabel = 'Prix + min stay trous';

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
        {editMode ? 'Périmètre sync Sojori AI' : 'Activer Sojori AI'}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: T.text2, mb: 2 }}>
          {listingName ? (
            <>
              Bien <b>{listingName}</b> — choisissez ce qui est poussé vers le calendrier à chaque apply / cron.
            </>
          ) : (
            <>Choisissez ce qui est synchronisé vers le calendrier.</>
          )}
        </Typography>

        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
            {errorMessage}
          </Alert>
        ) : null}

        <Stack sx={{ gap: 1.25 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.25,
              border: `2px solid ${T.gold}`,
              bgcolor: T.goldTint,
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>💰 Prix (dynamic)</Typography>
                <Typography sx={{ fontSize: 11.5, color: T.text2, mt: 0.5 }}>
                  Tarifs journaliers pilote (marché + modes + events) — <b>toujours actif</b> avec Sojori AI.
                </Typography>
              </Box>
              <Box
                sx={{
                  fontSize: 10,
                  fontWeight: 800,
                  fontFamily: '"Geist Mono", monospace',
                  color: T.goldDeep,
                  bgcolor: T.bg1,
                  px: 1,
                  py: 0.5,
                  borderRadius: '99px',
                  border: `1px solid ${T.goldDeep}`,
                }}
              >
                ON
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.25,
              border: `1px solid ${T.info}`,
              bgcolor: T.infoTint,
            }}
          >
            <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>🔒 Trous entre réservations</Typography>
            <Typography sx={{ fontSize: 11.5, color: T.text2, mt: 0.5 }}>
              Stop-sell automatique sur les plages libres trop courtes (entre deux résas) par rapport au séjour min.
              marché — sans modifier le min stay du calendrier.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={saving}
          onClick={() => onConfirm({ applyPrice: true, applyMinStay: false })}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            bgcolor: T.goldDeep,
            '&:hover': { bgcolor: T.gold },
            color: T.text,
          }}
        >
          {saving ? 'Enregistrement…' : editMode ? `Enregistrer · ${confirmLabel}` : `Activer · ${confirmLabel}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
