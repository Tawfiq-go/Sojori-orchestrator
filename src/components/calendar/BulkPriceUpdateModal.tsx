import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import calendarService from '../../services/calendarService';
import { basePayload, dateRangeFromSelection } from './bulkModalUtils';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedDates: string[];
  listingId: string;
  onSuccess?: () => void;
}

export function BulkPriceUpdateModal({
  open,
  onClose,
  selectedDates,
  listingId,
  onSuccess,
}: Props) {
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { count } = dateRangeFromSelection(selectedDates);
  const numericPrice = Number(price);

  const handleApply = async () => {
    if (!selectedDates.length) return;
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error('Veuillez saisir un prix valide.');
      return;
    }

    setLoading(true);
    try {
      await calendarService.updateCalendar({
        type: 'manualPrice',
        ...basePayload(listingId, selectedDates),
        price: numericPrice,
      });
      toast.success(`Prix mis à jour pour ${count} jour(s).`);
      setPrice('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour du prix.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Modifier le prix</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {count} jour(s) sélectionné(s)
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Nouveau prix / nuit"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>€</Typography> }}
            fullWidth
            autoFocus
          />
          {numericPrice > 0 && (
            <Typography variant="body2" color="text.secondary">
              Total estimé : €{(numericPrice * count).toLocaleString('fr-FR')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="contained" onClick={() => void handleApply()} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Appliquer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
