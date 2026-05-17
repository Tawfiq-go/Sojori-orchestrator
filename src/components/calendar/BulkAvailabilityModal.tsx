// ════════════════════════════════════════════════════════════════════
// Sojori — BulkAvailabilityModal
// Modale pour fermer/ouvrir plusieurs jours en bulk
// ════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { toast } from 'react-toastify';
import { tokens as t, btnPrimarySx, btnGhostSx } from '../dashboard/DashboardV2.components';
import calendarService from '../../services/calendarService';

interface BulkAvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  selectedDates: string[];
  listingId: string;
  onSuccess: () => void;
}

export function BulkAvailabilityModal({
  open,
  onClose,
  selectedDates,
  listingId,
  onSuccess,
}: BulkAvailabilityModalProps) {
  const [action, setAction] = useState<'close' | 'open'>('close');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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
        minimumStay: 1,
        maximumStay: 30,
        isAvailable: action === 'open',
        note: '',
        status: action === 'close' ? 'closed' : '',
        days: uniqueWeekdays.length === 7 ? weekdays : uniqueWeekdays,
      });

      toast.success(`${selectedDates.length} jours ${action === 'close' ? 'fermés' : 'ouverts'}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating availability:', error);
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
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>🔒 Modifier la disponibilité</Typography>
            <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.5 }}>
              {selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''} sélectionné{selectedDates.length > 1 ? 's' : ''}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <RadioGroup value={action} onChange={(e) => setAction(e.target.value as 'close' | 'open')}>
            <FormControlLabel
              value="close"
              control={<Radio />}
              label={
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>🔒 Fermer les dates</Typography>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                    Les dates ne seront plus disponibles à la réservation
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="open"
              control={<Radio />}
              label={
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>🟢 Ouvrir les dates</Typography>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                    Les dates redeviendront disponibles à la réservation
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          {/* Preview */}
          <Box sx={{ p: 2, bgcolor: action === 'close' ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.05)', borderRadius: '8px', border: `1px solid ${action === 'close' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.20)'}` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, mb: 1, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Aperçu
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text2 }}>
              {selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''} {action === 'close' ? 'fermé' : 'ouvert'}{selectedDates.length > 1 ? 's' : ''}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={onClose} sx={btnGhostSx} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} sx={btnPrimarySx} disabled={loading}>
          {loading ? 'Mise à jour...' : 'Appliquer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
