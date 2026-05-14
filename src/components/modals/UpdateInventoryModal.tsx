// ════════════════════════════════════════════════════════════════════
// Sojori — UpdateInventoryModal
// Modal pour modifier l'inventaire (availability) d'un listing pour une ou plusieurs dates
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  TextField,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
} from '@mui/material';

const T = {
  primary: '#e6b022',
  primarySoft: '#f4cf5e',
  success: '#10b981',
  error: '#ef4444',
  text: '#1a1408',
  text2: '#4a4234',
  text3: '#8a8170',
  bg1: '#fff',
  bg2: '#f5f3ec',
  bg3: '#ebe7da',
  border: 'rgba(26,20,8,0.08)',
};

export interface InventoryUpdate {
  available: boolean;
  minStay?: number;
  maxStay?: number;
  price?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: InventoryUpdate) => void | Promise<void>;
  listingName?: string;
  dateRange?: { start: string; end: string };
  singleDate?: string;
  initialData?: InventoryUpdate;
  loading?: boolean;
}

export function UpdateInventoryModal({
  open,
  onClose,
  onSave,
  listingName,
  dateRange,
  singleDate,
  initialData,
  loading = false,
}: Props) {
  const [available, setAvailable] = useState(true);
  const [minStay, setMinStay] = useState<number | ''>('');
  const [maxStay, setMaxStay] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');

  // Load initial data when modal opens
  useEffect(() => {
    if (open && initialData) {
      setAvailable(initialData.available);
      setMinStay(initialData.minStay || '');
      setMaxStay(initialData.maxStay || '');
      setPrice(initialData.price || '');
    }
  }, [open, initialData]);

  const handleSave = async () => {
    const updateData: InventoryUpdate = {
      available,
      minStay: minStay !== '' ? Number(minStay) : undefined,
      maxStay: maxStay !== '' ? Number(maxStay) : undefined,
      price: price !== '' ? Number(price) : undefined,
    };

    await onSave(updateData);
    handleClose();
  };

  const handleClose = () => {
    // Reset to initial values
    if (initialData) {
      setAvailable(initialData.available);
      setMinStay(initialData.minStay || '');
      setMaxStay(initialData.maxStay || '');
      setPrice(initialData.price || '');
    }
    onClose();
  };

  const daysCount = dateRange
    ? Math.ceil(
        (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 1;

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
        }}
      >
        📊 Modifier l'inventaire
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3, pb: 2 }}>
        {/* Listing & Date info */}
        <Box sx={{ mb: 3, p: 2, bgcolor: T.bg2, borderRadius: '12px' }}>
          {listingName && (
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
              🏠 {listingName}
            </Typography>
          )}
          {singleDate && (
            <Typography sx={{ fontSize: 13, color: T.text3 }}>
              📅 {singleDate}
            </Typography>
          )}
          {dateRange && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 13, color: T.text3 }}>
                📅 {dateRange.start} → {dateRange.end}
              </Typography>
              <Chip
                label={`${daysCount} jour${daysCount > 1 ? 's' : ''}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: T.bg3,
                }}
              />
            </Stack>
          )}
        </Box>

        {/* Available Checkbox */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: available ? T.bg2 : 'rgba(239,68,68,0.08)',
            borderRadius: '12px',
            border: `1px solid ${available ? T.border : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                sx={{
                  color: T.text3,
                  '&.Mui-checked': {
                    color: T.success,
                  },
                }}
              />
            }
            label={
              <Stack>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                  {available ? '✅ Disponible' : '❌ Non disponible'}
                </Typography>
                <Typography sx={{ fontSize: 12, color: T.text3 }}>
                  {available
                    ? 'Le listing peut recevoir des réservations'
                    : 'Le listing est bloqué et ne peut pas être réservé'}
                </Typography>
              </Stack>
            }
          />
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Min/Max Stay */}
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Séjour minimum (nuits)"
              type="number"
              value={minStay}
              onChange={(e) => setMinStay(e.target.value === '' ? '' : Number(e.target.value))}
              fullWidth
              InputProps={{
                inputProps: { min: 1, max: 30 },
              }}
              helperText="Minimum de nuits requises"
            />
            <TextField
              label="Séjour maximum (nuits)"
              type="number"
              value={maxStay}
              onChange={(e) => setMaxStay(e.target.value === '' ? '' : Number(e.target.value))}
              fullWidth
              InputProps={{
                inputProps: { min: 1, max: 365 },
              }}
              helperText="Maximum de nuits autorisées"
            />
          </Stack>

          {/* Price */}
          <TextField
            label="Prix par nuit (optionnel)"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
            InputProps={{
              inputProps: { min: 0, step: 10 },
              startAdornment: <Typography sx={{ mr: 1, color: T.text3 }}>€</Typography>,
            }}
            helperText="Laisser vide pour utiliser le prix dynamique"
          />
        </Stack>

        {/* Info */}
        <Box
          sx={{
            mt: 3,
            p: 1.5,
            bgcolor: 'rgba(6,182,212,0.08)',
            borderRadius: '8px',
            border: '1px solid rgba(6,182,212,0.2)',
          }}
        >
          <Typography sx={{ fontSize: 12, color: T.text2 }}>
            💡 <strong>Astuce:</strong> Les modifications seront appliquées à{' '}
            {dateRange ? `${daysCount} jours` : 'cette date'}.
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
