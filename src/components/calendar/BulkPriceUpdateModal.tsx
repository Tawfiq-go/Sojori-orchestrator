// ════════════════════════════════════════════════════════════════════
// Sojori — BulkPriceUpdateModal
// Modale pour modifier le prix de plusieurs jours en bulk
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

interface BulkPriceUpdateModalProps {
  open: boolean;
  onClose: () => void;
  selectedDates: string[]; // YYYY-MM-DD
  listingId: string;
  onSuccess: () => void;
}

export function BulkPriceUpdateModal({
  open,
  onClose,
  selectedDates,
  listingId,
  onSuccess,
}: BulkPriceUpdateModalProps) {
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (price <= 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }

    try {
      setLoading(true);

      // Sort dates and get range
      const sortedDates = [...selectedDates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      // Get weekdays from selected dates
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const selectedWeekdays = selectedDates.map(dateStr => {
        const d = new Date(dateStr);
        const wd = (d.getDay() + 6) % 7; // Monday=0
        return weekdays[wd];
      });
      const uniqueWeekdays = [...new Set(selectedWeekdays)];

      await calendarService.updateCalendar({
        listingId,
        startDate,
        endDate,
        price,
        minimumStay: 1, // Keep existing, don't change
        maximumStay: 30,
        isAvailable: true, // Keep existing
        note: '',
        status: '',
        days: uniqueWeekdays.length === 7 ? weekdays : uniqueWeekdays,
      });

      toast.success(`Prix mis à jour pour ${selectedDates.length} jours`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Erreur lors de la mise à jour des prix');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>💰 Modifier le prix</Typography>
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
            label="Nouveau prix par nuit"
            type="number"
            value={price || ''}
            onChange={(e) => setPrice(Number(e.target.value))}
            fullWidth
            autoFocus
            slotProps={{
              input: {
                startAdornment: <Box sx={{ pr: 1, color: t.text3 }}>€</Box>,
              },
            }}
            helperText={`Ce prix sera appliqué aux ${selectedDates.length} jours sélectionnés`}
          />

          {/* Preview */}
          <Box sx={{ p: 2, bgcolor: t.bg2, borderRadius: '8px', border: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, mb: 1, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Aperçu
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text2 }}>
              Prix: <strong style={{ fontFamily: 'Geist Mono', fontSize: 15 }}>€{price || 0}</strong> /nuit
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text2, mt: 0.5 }}>
              Total pour {selectedDates.length} jours: <strong style={{ fontFamily: 'Geist Mono', fontSize: 15 }}>€{(price || 0) * selectedDates.length}</strong>
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={onClose} sx={btnGhostSx} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} sx={btnPrimarySx} disabled={loading || price <= 0}>
          {loading ? 'Mise à jour...' : 'Appliquer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
