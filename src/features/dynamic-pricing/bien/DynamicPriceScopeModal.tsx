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
  const [applyMinStay, setApplyMinStay] = useState(true);

  useEffect(() => {
    if (!open) return;
    setApplyMinStay(initialApplyMinStay !== false);
  }, [open, initialApplyMinStay]);

  const confirmLabel = applyMinStay ? 'Prix + min stay' : 'Prix seul';

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
              border: `2px solid ${applyMinStay ? T.gold : '#d32f2f'}`,
              bgcolor: applyMinStay ? T.bg1 : 'rgba(211,47,47,0.04)',
            }}
          >
            <FormControlLabel
              sx={{ m: 0, alignItems: 'flex-start', width: '100%' }}
              control={
                <Switch
                  checked={applyMinStay}
                  onChange={(_, v) => setApplyMinStay(v)}
                  sx={{ '& .Mui-checked': { color: T.goldDeep }, pt: 0.25 }}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>🌙 Séjour minimum</Typography>
                  <Typography sx={{ fontSize: 11.5, color: T.text2, mt: 0.5 }}>
                    {applyMinStay
                      ? 'Min. nuits/jour (AirROI + plancher) → calendrier'
                      : 'Désactivé : le calendrier garde les min stay actuels'}
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Stack>

        <Typography sx={{ fontSize: 11, color: T.text3, mt: 2 }}>
          Min stay seul sans prix n’est pas possible. Les réglages §03 restent modifiables même si min stay sync est OFF.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={saving}
          onClick={() => onConfirm({ applyPrice: true, applyMinStay })}
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
