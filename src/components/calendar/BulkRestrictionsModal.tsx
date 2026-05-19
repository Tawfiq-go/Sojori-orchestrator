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

export function BulkRestrictionsModal({
  open,
  onClose,
  selectedDates,
  listingId,
  onSuccess,
}: Props) {
  const [minNights, setMinNights] = useState('');
  const [maxNights, setMaxNights] = useState('');
  const [loading, setLoading] = useState(false);
  const { count } = dateRangeFromSelection(selectedDates);

  const handleApply = async () => {
    if (!selectedDates.length) return;

    const min = minNights !== '' ? Number(minNights) : null;
    const max = maxNights !== '' ? Number(maxNights) : null;

    if (min !== null && (!Number.isFinite(min) || min < 1)) {
      toast.error('Le minimum de nuits doit être au moins 1.');
      return;
    }
    if (max !== null && (!Number.isFinite(max) || max < 1)) {
      toast.error('Le maximum de nuits doit être au moins 1.');
      return;
    }
    if (min !== null && max !== null && min > max) {
      toast.error('Le minimum ne peut pas dépasser le maximum.');
      return;
    }
    if (min === null && max === null) {
      toast.error('Modifiez au moins une restriction.');
      return;
    }

    setLoading(true);
    try {
      const base = basePayload(listingId, selectedDates);
      const updates = [];
      if (min !== null) {
        updates.push(
          calendarService.updateCalendar({
            type: 'min_stay_arrival',
            ...base,
            min_stay_arrival: min,
          })
        );
      }
      if (max !== null) {
        updates.push(
          calendarService.updateCalendar({
            type: 'max_stay',
            ...base,
            max_stay: max,
          })
        );
      }
      await Promise.all(updates);
      toast.success(`Restrictions mises à jour pour ${count} jour(s).`);
      setMinNights('');
      setMaxNights('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour des restrictions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Restrictions</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {count} jour(s) sélectionné(s)
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Nuits minimum"
            type="number"
            value={minNights}
            onChange={(e) => setMinNights(e.target.value)}
            fullWidth
          />
          <TextField
            label="Nuits maximum"
            type="number"
            value={maxNights}
            onChange={(e) => setMaxNights(e.target.value)}
            fullWidth
          />
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
