import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, FormControlLabel, Checkbox, Box, Alert, Typography } from '@mui/material';
// Using native date input instead of DatePicker to avoid date-fns compatibility issues
import { createStaffException } from '../services/serverApi.staffSimplified';
const EXCEPTION_TYPES = [{
  value: 'vacation',
  label: 'Congés payés'
}, {
  value: 'sick_leave',
  label: 'Arrêt maladie'
}, {
  value: 'special_leave',
  label: 'Congé exceptionnel'
}, {
  value: 'custom_hours',
  label: 'Horaires personnalisés'
}, {
  value: 'public_holiday',
  label: 'Jour férié'
}];

/**
 * Dialog to create staff availability exceptions
 * (vacations, sick leave, custom hours, etc.)
 */
const StaffExceptionDialog = ({
  open,
  onClose,
  staffCode,
  onSuccess
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    startDate: today,
    endDate: today,
    type: 'vacation',
    isAvailable: false,
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate dates
      if (formData.endDate < formData.startDate) {
        setError('La date de fin doit être après la date de début');
        setLoading(false);
        return;
      }

      // Prepare data (dates are already in ISO format)
      const exceptionData = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        type: formData.type,
        isAvailable: formData.isAvailable,
        reason: formData.reason.trim() || undefined
      };

      // Create exception
      await createStaffException(staffCode, exceptionData);

      // Success
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'exception');
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      startDate: today,
      endDate: today,
      type: 'vacation',
      isAvailable: false,
      reason: ''
    });
    setError(null);
    onClose();
  };
  return <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter une Exception</DialogTitle>
      <DialogContent>
        <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        mt: 1
      }}>
          {error && <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>}

          <TextField label="Date de début" type="date" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} fullWidth InputLabelProps={{
          shrink: true
        }} />

          <TextField label="Date de fin" type="date" value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} slotProps={{
          htmlInput: {
            min: formData.startDate
          }
        }} fullWidth InputLabelProps={{
          shrink: true
        }} />

          <TextField select label="Type d'exception" value={formData.type} onChange={e => handleChange('type', e.target.value)} fullWidth>
            {EXCEPTION_TYPES.map(option => <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>)}
          </TextField>

          <FormControlLabel control={<Checkbox checked={formData.isAvailable} onChange={e => handleChange('isAvailable', e.target.checked)} />} label="Disponible pendant cette période" />

          <TextField label="Raison / Note (optionnel)" value={formData.reason} onChange={e => handleChange('reason', e.target.value)} multiline rows={3} fullWidth placeholder="Ex: Vacances en famille, Formation, etc." />

          <Typography variant="caption" color="text.secondary">
            Note: Si &quot;Disponible&quot; est coché, le staff sera marqué comme disponible pendant cette période
            malgré l&apos;exception (utile pour horaires personnalisés).
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Création...' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>;
};
export default StaffExceptionDialog;
