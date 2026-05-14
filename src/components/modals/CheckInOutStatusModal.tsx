// ════════════════════════════════════════════════════════════════════
// Sojori — CheckInOutStatusModal
// Modal pour confirmer l'arrivée (check-in) et/ou le départ (check-out) d'un guest
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
} from '@mui/material';

const T = {
  primary: '#e6b022',
  primarySoft: '#f4cf5e',
  success: '#10b981',
  warning: '#f59e0b',
  text: '#1a1408',
  text2: '#4a4234',
  text3: '#8a8170',
  bg1: '#fff',
  bg2: '#f5f3ec',
  border: 'rgba(26,20,8,0.08)',
};

export interface CheckInOutData {
  confirmedCheckInTime?: boolean;
  confirmedCheckOutTime?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdate: (data: CheckInOutData) => void | Promise<void>;
  initialData?: CheckInOutData;
  reservationNumber?: string;
  guestName?: string;
  loading?: boolean;
}

export function CheckInOutStatusModal({
  open,
  onClose,
  onUpdate,
  initialData,
  reservationNumber,
  guestName,
  loading = false,
}: Props) {
  const [checkInConfirmed, setCheckInConfirmed] = useState(false);
  const [checkOutConfirmed, setCheckOutConfirmed] = useState(false);

  // Load initial data when modal opens
  useEffect(() => {
    if (open && initialData) {
      setCheckInConfirmed(!!initialData.confirmedCheckInTime);
      setCheckOutConfirmed(!!initialData.confirmedCheckOutTime);
    }
  }, [open, initialData]);

  const handleSave = async () => {
    const updateData: CheckInOutData = {
      confirmedCheckInTime: checkInConfirmed,
      confirmedCheckOutTime: checkOutConfirmed,
    };

    await onUpdate(updateData);
    onClose();
  };

  const handleClose = () => {
    // Reset to initial values
    if (initialData) {
      setCheckInConfirmed(!!initialData.confirmedCheckInTime);
      setCheckOutConfirmed(!!initialData.confirmedCheckOutTime);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(26,20,8,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: T.primary,
          color: T.text,
          fontWeight: 700,
          fontSize: 17,
          py: 2,
          px: 3,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        ✅ Confirmer arrivée / départ
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, pb: 2 }}>
        {/* Reservation info */}
        {(reservationNumber || guestName) && (
          <Box sx={{ mb: 3, p: 2, bgcolor: T.bg2, borderRadius: '12px' }}>
            {reservationNumber && (
              <Typography sx={{ fontSize: 13, color: T.text3, mb: 0.5 }}>
                Réservation: <strong>{reservationNumber}</strong>
              </Typography>
            )}
            {guestName && (
              <Typography sx={{ fontSize: 13, color: T.text3 }}>
                Voyageur: <strong>{guestName}</strong>
              </Typography>
            )}
          </Box>
        )}

        {/* Checkboxes */}
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={checkInConfirmed}
                onChange={(e) => setCheckInConfirmed(e.target.checked)}
                sx={{
                  color: T.text3,
                  '&.Mui-checked': {
                    color: T.success,
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                  🛬 Check-in confirmé
                </Typography>
                <Typography sx={{ fontSize: 12, color: T.text3 }}>
                  Le voyageur est bien arrivé
                </Typography>
              </Box>
            }
          />

          <Box sx={{ borderTop: `1px solid ${T.border}`, pt: 2.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={checkOutConfirmed}
                  onChange={(e) => setCheckOutConfirmed(e.target.checked)}
                  sx={{
                    color: T.text3,
                    '&.Mui-checked': {
                      color: T.warning,
                    },
                  }}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                    🛫 Check-out confirmé
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: T.text3 }}>
                    Le voyageur est bien parti
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Stack>

        {/* Info message */}
        <Box
          sx={{
            mt: 3,
            p: 1.5,
            bgcolor: 'rgba(16,185,129,0.08)',
            borderRadius: '8px',
            border: `1px solid rgba(16,185,129,0.2)`,
          }}
        >
          <Typography sx={{ fontSize: 12, color: T.text2 }}>
            💡 <strong>Info:</strong> Ces confirmations permettent de suivre l'état réel du séjour
            indépendamment des dates prévues.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${T.border}`,
          bgcolor: T.bg2,
        }}
      >
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{
            textTransform: 'none',
            color: T.text2,
            fontWeight: 600,
            px: 2.5,
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          variant="contained"
          sx={{
            textTransform: 'none',
            bgcolor: T.primary,
            color: T.text,
            fontWeight: 700,
            px: 3,
            boxShadow: `0 4px 12px rgba(230,176,34,0.30)`,
            '&:hover': {
              bgcolor: T.primarySoft,
            },
            '&:disabled': {
              bgcolor: T.bg2,
              color: T.text3,
            },
          }}
        >
          {loading ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
