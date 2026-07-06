// ════════════════════════════════════════════════════════════════════
// Sojori — Update Inventory Modal
// Modal pour modifier l'inventaire calendrier (prix, dispo, restrictions)
// Réplication exacte de sojori-dashboard/UpdateInventoryModal.jsx
// ════════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  IconButton,
  Alert,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import moment, { type Moment } from 'moment';
import calendarService from '../../services/calendarService';
import type { Listing } from '../../types/listings.types';
import type { InventoryData } from './InventoryGridV2';

const COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  success: '#22c55e',
  error: '#ef4444',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    600: '#757575',
    700: '#616161',
    900: '#212121',
  },
};

interface SelectedCell {
  listingId: string;
  roomTypeId: string;
  dateStr: string;
}

interface UpdateInventoryModalProps {
  open: boolean;
  onClose: () => void;
  selectedCells: SelectedCell[];
  inventoryData: InventoryData;
  listings: Listing[];
  onSave: () => void;
}

export function UpdateInventoryModal({
  open,
  onClose,
  selectedCells,
  inventoryData,
  listings,
  onSave,
}: UpdateInventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range
  const [startDate, setStartDate] = useState<Moment>(moment());
  const [endDate, setEndDate] = useState<Moment>(moment().add(3, 'days'));

  // Form values
  const [manualPrice, setManualPrice] = useState('');
  const [availability, setAvailability] = useState('');
  const [stopSell, setStopSell] = useState<boolean | null>(null);

  // Restrictions
  const [minStay, setMinStay] = useState('');
  const [maxStay, setMaxStay] = useState('');
  const [closedArrival, setClosedArrival] = useState<boolean | null>(null);
  const [closedDeparture, setClosedDeparture] = useState<boolean | null>(null);

  // Dynamic Price
  const [useDynamicPrice, setUseDynamicPrice] = useState<boolean | null>(null);

  // Confirmation popup
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Grouper les cellules par listing + roomType
  const groupedCells = useMemo(() => {
    const groups: Record<string, { listingId: string; roomTypeId: string; dates: Set<string> }> =
      {};
    selectedCells.forEach((cell) => {
      const key = `${cell.listingId}_${cell.roomTypeId}`;
      if (!groups[key]) {
        groups[key] = {
          listingId: cell.listingId,
          roomTypeId: cell.roomTypeId,
          dates: new Set(),
        };
      }
      groups[key].dates.add(cell.dateStr);
    });
    return Object.values(groups).map((group) => ({
      ...group,
      dates: Array.from(group.dates).sort(),
    }));
  }, [selectedCells]);

  // Résumé de sélection
  const selectionSummary = useMemo(() => {
    if (groupedCells.length === 0) return null;
    const roomTypes = groupedCells.length;
    const nightsCount = endDate.diff(startDate, 'days') + 1;
    return {
      totalDates: nightsCount,
      roomTypes,
      nightsCount,
      dateRange: {
        from: startDate.format('YYYY-MM-DD'),
        to: endDate.format('YYYY-MM-DD'),
      },
    };
  }, [groupedCells, startDate, endDate]);

  // Résumé des modifications
  const changesSummary = useMemo(() => {
    const changes: string[] = [];
    if (manualPrice) changes.push(`Prix manuel: ${manualPrice} MAD`);
    if (availability !== '') changes.push(`Disponibilité: ${availability}`);
    if (stopSell !== null) changes.push(`Stop Sell: ${stopSell ? 'Oui' : 'Non'}`);
    if (minStay) changes.push(`Min Stay: ${minStay} nuits`);
    if (maxStay) changes.push(`Max Stay: ${maxStay} nuits`);
    if (closedArrival !== null)
      changes.push(`Arrivée fermée: ${closedArrival ? 'Oui' : 'Non'}`);
    if (closedDeparture !== null)
      changes.push(`Départ fermé: ${closedDeparture ? 'Oui' : 'Non'}`);
    if (useDynamicPrice !== null)
      changes.push(`Tarification dynamique: ${useDynamicPrice ? 'Oui' : 'Non'}`);
    return changes;
  }, [
    manualPrice,
    availability,
    stopSell,
    minStay,
    maxStay,
    closedArrival,
    closedDeparture,
    useDynamicPrice,
  ]);

  // Initialiser les dates depuis la sélection
  useEffect(() => {
    if (open && selectedCells.length > 0) {
      const dates = selectedCells.map((c) => c.dateStr).sort();
      const firstDate = moment(dates[0]);
      const lastDate = moment(dates[dates.length - 1]);
      setStartDate(firstDate);
      setEndDate(dates.length === 1 ? firstDate.clone() : lastDate);
    }
  }, [open, selectedCells]);

  const handleReset = () => {
    setManualPrice('');
    setAvailability('');
    setStopSell(null);
    setMinStay('');
    setMaxStay('');
    setClosedArrival(null);
    setClosedDeparture(null);
    setUseDynamicPrice(null);
    setError(null);
    setShowConfirmation(false);
  };

  const handleSubmit = async () => {
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowConfirmation(false);

      // Construire les payloads pour chaque roomType
      const payloads: any[] = [];
      const date_from = startDate.format('YYYY-MM-DD');
      const date_to = endDate.format('YYYY-MM-DD');

      groupedCells.forEach((group) => {
        // Manual Price
        if (manualPrice && parseFloat(manualPrice) > 0) {
          payloads.push({
            type: 'manualPrice',
            roomTypeId: group.roomTypeId,
            date_from,
            date_to,
            price: parseFloat(manualPrice),
          });
        }

        // Availability
        if (availability !== '' && parseInt(availability) >= 0) {
          payloads.push({
            type: 'availability',
            roomTypeId: group.roomTypeId,
            date_from,
            date_to,
            availableRoom: parseInt(availability),
          });
        }

        // Stop Sell
        if (stopSell !== null) {
          payloads.push({
            type: 'stopSell',
            roomTypeId: group.roomTypeId,
            date_from,
            date_to,
            stopSell: stopSell,
          });
        }

        // Min Stay
        if (minStay && parseInt(minStay) > 0) {
          payloads.push({
            type: 'min_stay_arrival',
            roomTypeId: group.roomTypeId,
            date_from,
            date_to,
            min_stay_arrival: parseInt(minStay),
          });
        }

        // Max Stay
        if (maxStay && parseInt(maxStay) > 0) {
          payloads.push({
            type: 'max_stay',
            roomTypeId: group.roomTypeId,
            date_from,
            date_to,
            max_stay: parseInt(maxStay),
          });
        }

        // Closed Arrival
        if (closedArrival !== null) {
          payloads.push({
            type: 'closed_to_arrival',
            roomTypeId: group.roomTypeId,
            date_from,
            date_to,
            closed_to_arrival: closedArrival,
          });
        }

        // Closed Departure
        if (closedDeparture !== null) {
          payloads.push({
            type: 'closed_to_departure',
            roomTypeId: group.roomTypeId,
            date_from,
            date_to,
            closed_to_departure: closedDeparture,
          });
        }

        // Dynamic Price Override
        if (useDynamicPrice !== null) {
          payloads.push({
            type: 'setUseDynamicPriceManual',
            roomTypeId: group.roomTypeId,
            date_from,
            date_to,
            setUseDynamicPriceManual: useDynamicPrice,
          });
        }
      });

      if (payloads.length === 0) {
        setError('Veuillez modifier au moins un champ');
        setLoading(false);
        return;
      }

      // Appel API pour chaque payload
      for (const payload of payloads) {
        await calendarService.updateCalendar(payload);
      }

      // Callback success
      await onSave();

      // Reset et fermer
      handleReset();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <>
      {/* Main Modal */}
      <Dialog
        open={open && !showConfirmation}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxWidth: '480px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: '16px 20px',
            borderBottom: `1px solid ${COLORS.gray[200]}`,
            backgroundColor: 'white',
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: '16px',
                fontWeight: 700,
                color: COLORS.gray[900],
                mb: 0.5,
              }}
            >
              Modifier l'inventaire
            </Typography>
            {selectionSummary && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${selectionSummary.nightsCount} nuit${selectionSummary.nightsCount > 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    fontSize: '11px',
                    height: '22px',
                    fontWeight: 600,
                    backgroundColor: COLORS.primary + '15',
                    color: COLORS.primary,
                    border: `1px solid ${COLORS.primary}40`,
                  }}
                />
                <Chip
                  label={`${selectionSummary.roomTypes} room type(s)`}
                  size="small"
                  sx={{
                    fontSize: '11px',
                    height: '22px',
                    fontWeight: 600,
                    backgroundColor: COLORS.primary + '15',
                    color: COLORS.primary,
                    border: `1px solid ${COLORS.primary}40`,
                  }}
                />
              </Box>
            )}
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              color: COLORS.gray[600],
              '&:hover': { backgroundColor: COLORS.gray[100] },
            }}
            size="small"
          >
            ✕
          </IconButton>
        </Box>

        {/* Content */}
        <DialogContent sx={{ p: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: '10px',
                backgroundColor: COLORS.error + '10',
                color: COLORS.error,
                border: `1px solid ${COLORS.error}40`,
              }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Période */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ mb: 1.5, color: COLORS.gray[700], fontWeight: 600 }}
            >
              Période
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Début"
                type="date"
                value={startDate.format('YYYY-MM-DD')}
                onChange={(e) => setStartDate(moment(e.target.value))}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                  },
                }}
              />
              <TextField
                label="Fin"
                type="date"
                value={endDate.format('YYYY-MM-DD')}
                onChange={(e) => setEndDate(moment(e.target.value))}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                  },
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 11, color: COLORS.gray[600], mt: 0.5 }}>
              {endDate.diff(startDate, 'days') + 1} nuit(s)
            </Typography>
          </Box>

          {/* Prix manuel */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ mb: 1.5, color: COLORS.gray[700], fontWeight: 600 }}
            >
              Prix manuel
            </Typography>
            <TextField
              type="number"
              placeholder="Ex: 150"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  endAdornment: <Typography sx={{ fontSize: 13 }}>MAD</Typography>,
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                },
              }}
            />
          </Box>

          {/* Disponibilité */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ mb: 1.5, color: COLORS.gray[700], fontWeight: 600 }}
            >
              Disponibilité
            </Typography>
            <TextField
              type="number"
              placeholder="Ex: 5"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  endAdornment: <Typography sx={{ fontSize: 13 }}>chambres</Typography>,
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                },
              }}
            />
          </Box>

          {/* Stop Sell */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ mb: 1.5, color: COLORS.gray[700], fontWeight: 600 }}
            >
              Arrêt des ventes
            </Typography>
            <ToggleButtonGroup
              value={stopSell}
              exclusive
              onChange={(e, newValue) => setStopSell(newValue)}
              size="small"
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: 13,
                  '&.Mui-selected': {
                    backgroundColor: COLORS.primary,
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: COLORS.primaryDark,
                    },
                  },
                },
              }}
            >
              <ToggleButton value={true}>Oui 🚫</ToggleButton>
              <ToggleButton value={false}>Non ✅</ToggleButton>
              <ToggleButton value={null}>Aucun changement</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Accordion Restrictions */}
          <Accordion
            sx={{
              mb: 2,
              borderRadius: '10px !important',
              border: `1px solid ${COLORS.gray[200]}`,
              '&:before': { display: 'none' },
              boxShadow: 'none',
            }}
          >
            <AccordionSummary
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: COLORS.gray[700],
              }}
            >
              Restrictions (min/max stay, arrivée/départ)
            </AccordionSummary>
            <AccordionDetails>
              {/* Min Stay */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: COLORS.gray[700], fontWeight: 600 }}
                >
                  Séjour minimum
                </Typography>
                <TextField
                  type="number"
                  placeholder="Ex: 2"
                  value={minStay}
                  onChange={(e) => setMinStay(e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: <Typography sx={{ fontSize: 13 }}>nuits</Typography>,
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                    },
                  }}
                />
              </Box>

              {/* Max Stay */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: COLORS.gray[700], fontWeight: 600 }}
                >
                  Séjour maximum
                </Typography>
                <TextField
                  type="number"
                  placeholder="Ex: 7"
                  value={maxStay}
                  onChange={(e) => setMaxStay(e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: <Typography sx={{ fontSize: 13 }}>nuits</Typography>,
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                    },
                  }}
                />
              </Box>

              {/* Closed Arrival */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={closedArrival === true}
                      onChange={(e) => setClosedArrival(e.target.checked ? true : null)}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13, color: COLORS.gray[700] }}>
                      Arrivée fermée ⛔
                    </Typography>
                  }
                />
              </Box>

              {/* Closed Departure */}
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={closedDeparture === true}
                      onChange={(e) => setClosedDeparture(e.target.checked ? true : null)}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13, color: COLORS.gray[700] }}>
                      Départ fermé ⛔
                    </Typography>
                  }
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Accordion Dynamic Pricing */}
          <Accordion
            sx={{
              mb: 2,
              borderRadius: '10px !important',
              border: `1px solid ${COLORS.gray[200]}`,
              '&:before': { display: 'none' },
              boxShadow: 'none',
            }}
          >
            <AccordionSummary
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: COLORS.gray[700],
              }}
            >
              Tarification dynamique ⚡
            </AccordionSummary>
            <AccordionDetails>
              <ToggleButtonGroup
                value={useDynamicPrice}
                exclusive
                onChange={(e, newValue) => setUseDynamicPrice(newValue)}
                size="small"
                fullWidth
                sx={{
                  mb: 2,
                  '& .MuiToggleButton-root': {
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontSize: 13,
                    '&.Mui-selected': {
                      backgroundColor: COLORS.primary,
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: COLORS.primaryDark,
                      },
                    },
                  },
                }}
              >
                <ToggleButton value={true}>Activer ⚡</ToggleButton>
                <ToggleButton value={false}>Désactiver</ToggleButton>
                <ToggleButton value={null}>Aucun changement</ToggleButton>
              </ToggleButtonGroup>

              <Typography sx={{ fontSize: 12, color: COLORS.gray[600], mt: 1, lineHeight: 1.45 }}>
                Les tarifs journaliers viennent du service Dynamic Pricing (pilot G7). Activez ou
                désactivez le mode dynamique sur la période — sans saisie de prix de base.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </DialogContent>

        {/* Footer */}
        <Box
          sx={{
            p: '16px 20px',
            borderTop: `1px solid ${COLORS.gray[200]}`,
            display: 'flex',
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            onClick={handleClose}
            fullWidth
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              borderColor: COLORS.gray[300],
              color: COLORS.gray[700],
              '&:hover': {
                borderColor: COLORS.gray[600],
                backgroundColor: COLORS.gray[50],
              },
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            fullWidth
            disabled={changesSummary.length === 0}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              backgroundColor: COLORS.primary,
              '&:hover': {
                backgroundColor: COLORS.primaryDark,
              },
              '&:disabled': {
                backgroundColor: COLORS.gray[300],
                color: COLORS.gray[600],
              },
            }}
          >
            💾 Enregistrer
          </Button>
        </Box>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxWidth: '400px',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{ fontSize: 16, fontWeight: 700, color: COLORS.gray[900], mb: 2 }}
          >
            Confirmer les modifications
          </Typography>
          <Typography sx={{ fontSize: 13, color: COLORS.gray[700], mb: 2 }}>
            Vous êtes sur le point de modifier {selectionSummary?.nightsCount} nuit(s) pour{' '}
            {selectionSummary?.roomTypes} room type(s) :
          </Typography>
          <Box
            sx={{
              p: 2,
              borderRadius: '10px',
              backgroundColor: COLORS.gray[50],
              border: `1px solid ${COLORS.gray[200]}`,
              mb: 2,
            }}
          >
            {changesSummary.map((change, idx) => (
              <Typography
                key={idx}
                sx={{ fontSize: 12, color: COLORS.gray[700], mb: 0.5 }}
              >
                • {change}
              </Typography>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setShowConfirmation(false)}
              fullWidth
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                borderColor: COLORS.gray[300],
                color: COLORS.gray[700],
              }}
            >
              Retour
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              fullWidth
              disabled={loading}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                backgroundColor: COLORS.success,
                '&:hover': {
                  backgroundColor: '#16a34a',
                },
              }}
            >
              {loading ? 'Enregistrement...' : '✅ Confirmer'}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}

export default UpdateInventoryModal;
