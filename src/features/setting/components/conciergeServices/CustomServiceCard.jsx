import React from 'react';
import { Card, CardContent, Box, Typography, Switch, FormControlLabel, TextField, Stack, Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
const CustomServiceCard = ({
  service,
  onChange,
  onDelete
}) => {
  const handleChange = (field, value) => {
    const updatedService = {
      ...service,
      [field]: value
    };
    onChange(updatedService);
  };
  const handleNameChange = (lang, value) => {
    onChange({
      ...service,
      name: {
        ...service.name,
        [lang]: value
      }
    });
  };
  const handleDescriptionChange = (lang, value) => {
    onChange({
      ...service,
      description: {
        ...service.description,
        [lang]: value
      }
    });
  };
  return <Card sx={{
    border: '1px solid #e0e0e0',
    boxShadow: 'none'
  }}>
      <CardContent>
        <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
      }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">💬 Service personnalisé</Typography>
            <Chip label="Sur devis" size="small" color="warning" variant="outlined" />
            {service.requiresPMValidation && <Chip label="Validation PM requise" size="small" color="error" variant="outlined" />}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel control={<Switch checked={service.enabled} onChange={e => handleChange('enabled', e.target.checked)} />} label={service.enabled ? 'Activé' : 'Désactivé'} />
            {onDelete && <IconButton onClick={onDelete} color="error" size="small" title="Supprimer">
                <DeleteIcon />
              </IconButton>}
          </Stack>
        </Box>

        {/* Name fields (editable) */}
        <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '1fr 1fr 1fr'
        },
        gap: 2,
        mb: 2
      }}>
          <TextField label="Nom (Français)" value={service.name?.fr || ''} onChange={e => handleNameChange('fr', e.target.value)} size="small" fullWidth placeholder="Ex: 💬 Service personnalisé" />
          <TextField label="Nom (English)" value={service.name?.en || ''} onChange={e => handleNameChange('en', e.target.value)} size="small" fullWidth placeholder="Ex: 💬 Custom service" />
          <TextField label="Nom (العربية)" value={service.name?.ar || ''} onChange={e => handleNameChange('ar', e.target.value)} size="small" fullWidth placeholder="Ex: 💬 خدمة مخصصة" />
        </Box>

        {/* Description fields (editable) */}
        <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '1fr 1fr 1fr'
        },
        gap: 2,
        mb: 2
      }}>
          <TextField label="Description (Français)" value={service.description?.fr || ''} onChange={e => handleDescriptionChange('fr', e.target.value)} size="small" fullWidth multiline rows={3} placeholder="Décrivez le service" />
          <TextField label="Description (English)" value={service.description?.en || ''} onChange={e => handleDescriptionChange('en', e.target.value)} size="small" fullWidth multiline rows={3} placeholder="Describe the service" />
          <TextField label="Description (العربية)" value={service.description?.ar || ''} onChange={e => handleDescriptionChange('ar', e.target.value)} size="small" fullWidth multiline rows={3} placeholder="وصف الخدمة" />
        </Box>

        <TextField label="Explication prix (FR)" value={service.pricing?.explanation?.fr || ''} onChange={e => {
        const currentPricing = service.pricing || {};
        onChange({
          ...service,
          pricing: {
            type: currentPricing.type || 'quote',
            // Always include type
            ...currentPricing,
            explanation: {
              ...currentPricing.explanation,
              fr: e.target.value
            }
          }
        });
      }} multiline rows={2} size="small" fullWidth />
      </CardContent>
    </Card>;
};
export default CustomServiceCard;
