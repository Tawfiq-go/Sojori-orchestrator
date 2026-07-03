import React from 'react';
import { Card, CardContent, Box, Typography, Switch, FormControlLabel, TextField, Select, MenuItem, FormControl, InputLabel, Stack, Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { conciergeServiceCardSx } from './conciergeCardSx';
const TransportServiceCard = ({
  service,
  onChange,
  onDelete
}) => {
  // Get badge configuration based on stored journeyTag (not calculated)
  const getJourneyBadge = () => {
    const journeyTag = service.route?.journeyTag || 'other';
    const badges = {
      arrival: {
        label: 'Arrivée',
        icon: '🏠←',
        color: 'success'
      },
      departure: {
        label: 'Départ',
        icon: '🏠→',
        color: 'error'
      },
      other: {
        label: 'Autre',
        icon: '🚗',
        color: 'default'
      }
    };
    return badges[journeyTag] || badges.other;
  };
  const handleChange = (field, value) => {
    const updatedService = {
      ...service,
      [field]: value
    };
    onChange(updatedService);
  };
  const handlePricingChange = (field, value) => {
    // Always ensure pricing has type field
    const currentPricing = service.pricing || {};
    onChange({
      ...service,
      pricing: {
        type: currentPricing.type || 'total',
        ...currentPricing,
        [field]: value
      }
    });
  };

  // Handle departure type change
  const handleDepartureTypeChange = departureType => {
    const updatedRoute = {
      ...service.route,
      departureType,
      from: departureType === 'from_property' ? 'Le logement' : ''
    };
    onChange({
      ...service,
      route: updatedRoute
    });
  };

  // Handle arrival type change
  const handleArrivalTypeChange = arrivalType => {
    const updatedRoute = {
      ...service.route,
      arrivalType,
      to: arrivalType === 'to_property' ? 'Le logement' : ''
    };
    onChange({
      ...service,
      route: updatedRoute
    });
  };

  // Handle from location change
  const handleFromChange = from => {
    onChange({
      ...service,
      route: {
        ...service.route,
        from
      }
    });
  };

  // Handle to location change
  const handleToChange = to => {
    onChange({
      ...service,
      route: {
        ...service.route,
        to
      }
    });
  };

  // Handle journey tag change
  const handleJourneyTagChange = journeyTag => {
    onChange({
      ...service,
      route: {
        ...service.route,
        journeyTag
      }
    });
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
  return <Card sx={conciergeServiceCardSx}>
      <CardContent>
        <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
      }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h6">🚗 Transport</Typography>
            <Chip label={service.pricing?.type === 'total' ? 'Prix fixe' : 'Par personne'} size="small" color="primary" variant="outlined" />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
          <TextField label="Nom (Français)" value={service.name?.fr || ''} onChange={e => handleNameChange('fr', e.target.value)} size="small" fullWidth placeholder="Ex: 🚗 Nouveau transport" />
          <TextField label="Nom (English)" value={service.name?.en || ''} onChange={e => handleNameChange('en', e.target.value)} size="small" fullWidth placeholder="Ex: 🚗 New transport" />
          <TextField label="Nom (العربية)" value={service.name?.ar || ''} onChange={e => handleNameChange('ar', e.target.value)} size="small" fullWidth placeholder="Ex: 🚗 نقل جديد" />
        </Box>

        <TextField
          label="Description"
          value={service.description?.fr || ''}
          onChange={(e) => handleDescriptionChange('fr', e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={2}
          placeholder="Décrivez le service (français)"
          sx={{ mb: 3 }}
        />

        <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '1fr 1fr'
        },
        gap: 2,
        mb: 2
      }}>
          <Box>
            <FormControl size="small" fullWidth sx={{
            mb: 1
          }}>
              <InputLabel>Type de départ</InputLabel>
              <Select value={service.route?.departureType || 'from_property'} onChange={e => handleDepartureTypeChange(e.target.value)} label="Type de départ">
                <MenuItem value="from_property">Depuis le logement</MenuItem>
                <MenuItem value="from_external">Depuis un endroit externe</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Départ" value={service.route?.from || ''} onChange={e => handleFromChange(e.target.value)} size="small" fullWidth disabled={service.route?.departureType === 'from_property'} placeholder={service.route?.departureType === 'from_external' ? 'Ex: Aéroport Mohammed V' : ''} sx={{
            '& .MuiInputBase-input.Mui-disabled': {
              color: 'text.primary',
              WebkitTextFillColor: 'text.primary'
            }
          }} />
          </Box>

          <Box>
            <FormControl size="small" fullWidth sx={{
            mb: 1
          }}>
              <InputLabel>Type d&apos;arrivée</InputLabel>
              <Select value={service.route?.arrivalType || 'to_property'} onChange={e => handleArrivalTypeChange(e.target.value)} label="Type d'arrivée">
                <MenuItem value="to_property">Vers le logement</MenuItem>
                <MenuItem value="to_external">Vers un endroit externe</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Arrivée" value={service.route?.to || ''} onChange={e => handleToChange(e.target.value)} size="small" fullWidth disabled={service.route?.arrivalType === 'to_property'} placeholder={service.route?.arrivalType === 'to_external' ? 'Ex: Gare CTM' : ''} sx={{
            '& .MuiInputBase-input.Mui-disabled': {
              color: 'text.primary',
              WebkitTextFillColor: 'text.primary'
            }
          }} />
          </Box>
        </Box>

        {/* Journey Tag Selector */}
        <Box sx={{
        mb: 2
      }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Type de trajet</InputLabel>
            <Select value={service.route?.journeyTag || 'other'} onChange={e => handleJourneyTagChange(e.target.value)} label="Type de trajet">
              <MenuItem value="arrival">🏠← Arrivée (vers le logement)</MenuItem>
              <MenuItem value="departure">🏠→ Départ (depuis le logement)</MenuItem>
              <MenuItem value="other">🚗 Autre (trajet externe)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Journey Type Badge - Visual Indicator */}
        <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        mb: 2
      }}>
          <Chip label={`${getJourneyBadge().icon} ${getJourneyBadge().label}`} color={getJourneyBadge().color} size="medium" sx={{
          fontWeight: 600
        }} />
        </Box>

        <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '1fr 1fr 1fr'
        },
        gap: 2,
        mb: 2
      }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Type de prix</InputLabel>
            <Select value={service.pricing?.type || 'total'} onChange={e => handlePricingChange('type', e.target.value)} label="Type de prix">
              <MenuItem value="total">Prix fixe</MenuItem>
              <MenuItem value="per_person">Par personne</MenuItem>
            </Select>
          </FormControl>

          {service.pricing?.type === 'total' ? <>
              <TextField label="Prix (MAD)" type="text" value={service.pricing?.amount ?? ''} onChange={e => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            handlePricingChange('amount', isNaN(val) ? 0 : val);
          }} size="small" fullWidth inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*'
          }} />
              <TextField label="Max passagers" type="text" value={service.capacity?.maxPassengers ?? ''} onChange={e => {
            const val = e.target.value === '' ? 1 : parseInt(e.target.value);
            onChange({
              ...service,
              capacity: {
                ...service.capacity,
                maxPassengers: isNaN(val) ? 1 : val
              }
            });
          }} size="small" fullWidth inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*'
          }} />
            </> : <>
              <TextField label="Prix par personne (MAD)" type="text" value={service.pricing?.pricePerPerson ?? ''} onChange={e => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            handlePricingChange('pricePerPerson', isNaN(val) ? 0 : val);
          }} size="small" fullWidth inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*'
          }} />
              <TextField label="Nombre de personnes" type="text" value={service.pricing?.numberOfPeople ?? ''} onChange={e => {
            const val = e.target.value === '' ? 1 : parseInt(e.target.value);
            handlePricingChange('numberOfPeople', isNaN(val) ? 1 : val);
          }} size="small" fullWidth inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*'
          }} />
            </>}
        </Box>

        {service.pricing?.type === 'per_person' && <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '1fr'
        },
        gap: 2,
        mb: 2
      }}>
            <TextField label="Max passagers (limite)" type="text" value={service.capacity?.maxPassengers ?? ''} onChange={e => {
          const val = e.target.value === '' ? 1 : parseInt(e.target.value);
          onChange({
            ...service,
            capacity: {
              ...service.capacity,
              maxPassengers: isNaN(val) ? 1 : val
            }
          });
        }} size="small" fullWidth helperText="Nombre maximum de passagers autorisés (indépendant du calcul du prix)" inputProps={{
          inputMode: 'numeric',
          pattern: '[0-9]*'
        }} />
          </Box>}
      </CardContent>
    </Card>;
};
export default TransportServiceCard;
