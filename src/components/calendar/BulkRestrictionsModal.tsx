// ════════════════════════════════════════════════════════════════════
// Sojori — BulkRestrictionsModal
// Modale pour modifier les restrictions (min/max nights) en bulk
// ════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import { toast } from 'react-toastify';
import { tokens as t, btnPrimarySx, btnGhostSx } from '../dashboard/DashboardV2.components';
import calendarService from '../../services/calendarService';

interface BulkRestrictionsModalProps {
  open: boolean;
  onClose: () => void;
  selectedDates: string[];
  listingId: string;
  onSuccess: () => void;
}

export function BulkRestrictionsModal({
  open,
  onClose,
  selectedDates,
  listingId,
  onSuccess,
}: BulkRestrictionsModalProps) {
  const [minNights, setMinNights] = useState<number>(1);
  const [maxNights, setMaxNights] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (minNights < 1 || maxNights < minNights) {
      toast.error('Veuillez entrer des valeurs valides');
      return;
    }

    try {
      setLoading(true);

      const sortedDates = [...selectedDates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const selectedWeekdays = selectedDates.map(dateStr => {
        const d = new Date(dateStr);
        const wd = (d.getDay() + 6) % 7;
        return weekdays[wd];
      });
      const uniqueWeekdays = [...new Set(selectedWeekdays)];

      await calendarService.updateCalendar({
        listingId,
        startDate,
        endDate,
        price: 0, // Keep existing
        minimumStay: minNights,
        maximumStay: maxNights,
        isAvailable: true, // Keep existing
        note: '',
        status: '',
        days: uniqueWeekdays.length === 7 ? weekdays : uniqueWeekdays,
      });

      toast.success(`Restrictions mises à jour pour ${selectedDates.length} jours`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating restrictions:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>⏱ Modifier les restrictions</Typography>
            <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.5 }}>
              {selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''} sélectionné{selectedDates.length > 1 ? 's' : ''}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Minimum de nuits"
            type="number"
            value={minNights}
            onChange={(e) => setMinNights(Number(e.target.value))}
            fullWidth
            slotProps={{ htmlInput: { min: 1 } }}
            helperText="Durée minimale de séjour requise"
          />

          <TextField
            label="Maximum de nuits"
            type="number"
            value={maxNights}
            onChange={(e) => setMaxNights(Number(e.target.value))}
            fullWidth
            slotProps={{ htmlInput: { min: minNights } }}
            helperText="Durée maximale de séjour autorisée"
          />

          {/* Preview */}
          <Box sx={{ p: 2, bgcolor: t.bg2, borderRadius: '8px', border: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, mb: 1, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Aperçu
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text2 }}>
              Min: <strong>{minNights}</strong> nuit{minNights > 1 ? 's' : ''}
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text2, mt: 0.5 }}>
              Max: <strong>{maxNights}</strong> nuit{maxNights > 1 ? 's' : ''}
            </Typography>
            <Typography sx={{ fontSize: 11, color: t.text3, mt: 1, fontStyle: 'italic' }}>
              Ces restrictions s'appliqueront aux {selectedDates.length} jours sélectionnés
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={onClose} sx={btnGhostSx} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} sx={btnPrimarySx} disabled={loading || minNights < 1 || maxNights < minNights}>
          {loading ? 'Mise à jour...' : 'Appliquer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
