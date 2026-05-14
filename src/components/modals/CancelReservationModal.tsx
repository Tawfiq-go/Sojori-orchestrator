// ════════════════════════════════════════════════════════════════════
// Sojori — CancelReservationModal
// Modal pour annuler une réservation avec raison obligatoire
// ════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Alert,
  Stack,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

const T = {
  primary: '#e6b022',
  error: '#ef4444',
  errorTint: 'rgba(239,68,68,0.10)',
  text: '#1a1408',
  text2: '#4a4234',
  text3: '#8a8170',
  bg1: '#fff',
  bg2: '#f5f3ec',
  border: 'rgba(26,20,8,0.08)',
};

export const CANCEL_REASONS = [
  { value: 'guest_request', label: 'Demande du client' },
  { value: 'property_issue', label: 'Problème avec la propriété' },
  { value: 'overbooking', label: 'Surbooking' },
  { value: 'payment_issue', label: 'Problème de paiement' },
  { value: 'force_majeure', label: 'Force majeure' },
  { value: 'other', label: 'Autre raison' },
];

export interface CancelReservationData {
  reason: string;
  notifyGuest: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CancelReservationData) => void | Promise<void>;
  reservationNumber?: string;
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalPrice?: string;
  loading?: boolean;
}

export function CancelReservationModal({
  open,
  onClose,
  onConfirm,
  reservationNumber,
  guestName,
  checkInDate,
  checkOutDate,
  totalPrice,
  loading = false,
}: Props) {
  const [reason, setReason] = useState('');
  const [notifyGuest, setNotifyGuest] = useState(true);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason) {
      setError('Veuillez sélectionner une raison d\'annulation');
      return;
    }

    setError('');
    await onConfirm({ reason, notifyGuest });
    handleClose();
  };

  const handleClose = () => {
    setReason('');
    setNotifyGuest(true);
    setError('');
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
          bgcolor: T.error,
          color: '#fff',
          fontWeight: 700,
          fontSize: 17,
          py: 2,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Warning sx={{ fontSize: 22 }} />
        Annuler la réservation
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, pb: 2 }}>
        {/* Reservation info */}
        {(reservationNumber || guestName) && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: T.errorTint,
              borderRadius: '12px',
              border: `1px solid ${T.error}33`,
            }}
          >
            {reservationNumber && (
              <Typography sx={{ fontSize: 13, color: T.text, mb: 0.5, fontWeight: 600 }}>
                ⚠️ Réservation: {reservationNumber}
              </Typography>
            )}
            {guestName && (
              <Typography sx={{ fontSize: 13, color: T.text2, mb: 0.5 }}>
                Voyageur: <strong>{guestName}</strong>
              </Typography>
            )}
            {checkInDate && checkOutDate && (
              <Typography sx={{ fontSize: 13, color: T.text3 }}>
                📅 {checkInDate} → {checkOutDate}
              </Typography>
            )}
            {totalPrice && (
              <Typography sx={{ fontSize: 13, color: T.text2, mt: 1, fontWeight: 700 }}>
                💰 Montant: {totalPrice}
              </Typography>
            )}
          </Box>
        )}

        {/* Warning Alert */}
        <Alert
          severity="warning"
          icon={<Warning />}
          sx={{
            mb: 3,
            bgcolor: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            '& .MuiAlert-icon': {
              color: '#f59e0b',
            },
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
            Action irréversible
          </Typography>
          <Typography sx={{ fontSize: 12 }}>
            L'annulation d'une réservation est définitive. Assurez-vous de gérer les remboursements
            et communications séparément.
          </Typography>
        </Alert>

        {/* Reason Select */}
        <FormControl fullWidth required sx={{ mb: 2.5 }}>
          <InputLabel>Raison d'annulation</InputLabel>
          <Select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            label="Raison d'annulation"
            error={!!error}
          >
            {CANCEL_REASONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </Select>
          {error && (
            <Typography sx={{ fontSize: 12, color: T.error, mt: 0.5 }}>
              {error}
            </Typography>
          )}
        </FormControl>

        {/* Notify Guest Checkbox */}
        <Box
          sx={{
            p: 2,
            bgcolor: T.bg2,
            borderRadius: '12px',
            border: `1px solid ${T.border}`,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={notifyGuest}
                onChange={(e) => setNotifyGuest(e.target.checked)}
                sx={{
                  color: T.text3,
                  '&.Mui-checked': {
                    color: T.primary,
                  },
                }}
              />
            }
            label={
              <Stack>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                  📧 Notifier le voyageur
                </Typography>
                <Typography sx={{ fontSize: 12, color: T.text3 }}>
                  Un email d'annulation sera envoyé au guest
                </Typography>
              </Stack>
            }
          />
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
          onClick={handleConfirm}
          disabled={loading || !reason}
          variant="contained"
          sx={{
            textTransform: 'none',
            bgcolor: T.error,
            color: '#fff',
            fontWeight: 700,
            px: 3,
            boxShadow: `0 4px 12px rgba(239,68,68,0.30)`,
            '&:hover': {
              bgcolor: '#dc2626',
            },
            '&:disabled': {
              bgcolor: T.bg2,
              color: T.text3,
            },
          }}
        >
          {loading ? '⏳ Annulation...' : '❌ Confirmer l\'annulation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
