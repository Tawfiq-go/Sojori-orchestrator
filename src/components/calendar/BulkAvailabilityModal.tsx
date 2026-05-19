import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
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

export function BulkAvailabilityModal({
  open,
  onClose,
  selectedDates,
  listingId,
  onSuccess,
}: Props) {
  const [action, setAction] = useState<'close' | 'open'>('close');
  const [loading, setLoading] = useState(false);
  const { count } = dateRangeFromSelection(selectedDates);

  const handleApply = async () => {
    if (!selectedDates.length) return;

    setLoading(true);
    try {
      if (action === 'close') {
        await calendarService.updateCalendar({
          type: 'stopSell',
          ...basePayload(listingId, selectedDates),
          stopSell: true,
        });
      } else {
        await calendarService.updateCalendar({
          type: 'stopSell',
          ...basePayload(listingId, selectedDates),
          stopSell: false,
        });
        await calendarService.updateCalendar({
          type: 'availability',
          ...basePayload(listingId, selectedDates),
          availableRoom: 1,
        });
      }
      toast.success(
        action === 'close'
          ? `${count} jour(s) fermé(s).`
          : `${count} jour(s) ouvert(s).`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour de la disponibilité.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Disponibilité</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {count} jour(s) sélectionné(s)
        </Typography>
        <FormControl>
          <RadioGroup value={action} onChange={(e) => setAction(e.target.value as 'close' | 'open')}>
            <FormControlLabel value="close" control={<Radio />} label="Fermer les dates" />
            <FormControlLabel value="open" control={<Radio />} label="Ouvrir les dates" />
          </RadioGroup>
        </FormControl>
        <Stack sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {action === 'close'
              ? 'Les dates seront marquées comme indisponibles (stop sell).'
              : 'Les dates seront rouvertes à la réservation.'}
          </Typography>
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
