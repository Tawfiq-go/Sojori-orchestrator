import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Stack,
  Chip,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  GuestLangTextFields,
  mergeGuestLangMap,
} from '../../../listing/shared/GuestLangTextFields';

const CustomServiceCard = ({ service, onChange, onDelete }) => {
  const handleChange = (field, value) => {
    onChange({ ...service, [field]: value });
  };

  return (
    <Card sx={{ border: '1px solid #e0e0e0', boxShadow: 'none' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h6">💬 Service personnalisé</Typography>
            <Chip label="Sur devis" size="small" color="warning" variant="outlined" />
            {service.requiresPMValidation && (
              <Chip label="Validation PM requise" size="small" color="error" variant="outlined" />
            )}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={service.enabled}
                  onChange={(e) => handleChange('enabled', e.target.checked)}
                />
              }
              label={service.enabled ? 'Activé' : 'Désactivé'}
            />
            {onDelete && (
              <IconButton onClick={onDelete} color="error" size="small" title="Supprimer">
                <DeleteIcon />
              </IconButton>
            )}
          </Stack>
        </Box>

        <Box sx={{ mb: 2 }}>
          <GuestLangTextFields
            fieldLabel="Nom"
            requiredFr
            value={mergeGuestLangMap(service.name)}
            onChange={(name) => onChange({ ...service, name })}
            helperText="FR requis · cliquez ✨ pour générer EN/ES/DE/IT/AR/Darija."
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <GuestLangTextFields
            fieldLabel="Description"
            value={mergeGuestLangMap(service.description)}
            onChange={(description) => onChange({ ...service, description })}
            multiline
            rows={2}
          />
        </Box>

        <TextField
          label="Explication prix (FR)"
          value={service.pricing?.explanation?.fr || ''}
          onChange={(e) => {
            const currentPricing = service.pricing || {};
            onChange({
              ...service,
              pricing: {
                type: currentPricing.type || 'quote',
                ...currentPricing,
                explanation: {
                  ...mergeGuestLangMap(currentPricing.explanation),
                  fr: e.target.value,
                },
              },
            });
          }}
          multiline
          rows={2}
          size="small"
          fullWidth
        />
      </CardContent>
    </Card>
  );
};

export default CustomServiceCard;
