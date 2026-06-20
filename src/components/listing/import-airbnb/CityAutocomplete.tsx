// ════════════════════════════════════════════════════════════════════
// CityAutocomplete.tsx — Phase B : ville Sojori (MUI Autocomplete + portal)
// ════════════════════════════════════════════════════════════════════
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import type { SojoriCity } from './_tokens';
import { T } from './_tokens';

export interface CityAutocompleteProps {
  cities: SojoriCity[];
  selected: SojoriCity | null;
  onSelect: (city: SojoriCity | null) => void;
  error?: boolean;
  loading?: boolean;
  autoDetected?: boolean;
}

export default function CityAutocomplete({
  cities,
  selected,
  onSelect,
  error,
  loading,
  autoDetected,
}: CityAutocompleteProps) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 700,
          color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 0.625,
        }}
      >
        Ville Sojori{' '}
        {!autoDetected && <Box component="span" sx={{ color: T.error }}>*</Box>}
        {autoDetected && (
          <Box component="span" sx={{ color: T.info, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
            · détectée depuis RU
          </Box>
        )}
      </Typography>

      <Autocomplete
        options={cities}
        value={selected}
        loading={loading}
        disabled={loading}
        onChange={(_e, val) => onSelect(val)}
        getOptionLabel={(c) => c.name}
        isOptionEqualToValue={(a, b) => a._id === b._id}
        noOptionsText={
          loading
            ? 'Chargement des villes…'
            : cities.length === 0
              ? 'Aucune ville — vérifiez la connexion admin'
              : 'Aucune ville trouvée'
        }
        slotProps={{
          popper: {
            sx: { zIndex: 1500 },
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Rechercher une ville (Casablanca, Marrakech…)"
            error={error}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.25,
                bgcolor: T.bg1,
                fontSize: 14,
                '& fieldset': { borderColor: error ? T.error : T.border },
                '&:hover fieldset': { borderColor: error ? T.error : T.borderStrong },
                '&.Mui-focused fieldset': {
                  borderColor: error ? T.error : T.primary,
                  borderWidth: 1.5,
                  boxShadow: `0 0 0 3px ${error ? 'rgba(220,38,38,0.16)' : T.primaryTint}`,
                },
              },
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option._id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <span>{option.flag || '📍'}</span>
              <span>{option.name}</span>
              {option.country && (
                <Typography
                  component="span"
                  sx={{
                    ml: 'auto',
                    fontSize: 10.5,
                    color: T.text3,
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  {option.country}
                </Typography>
              )}
            </Box>
          </li>
        )}
      />

      <Typography
        sx={{
          fontSize: 11,
          color: error ? T.error : T.text3,
          fontWeight: error ? 600 : 400,
          mt: 0.625,
        }}
      >
        {error
          ? '⚠ Sélectionne une ville Sojori pour continuer.'
          : loading
            ? 'Chargement des villes Sojori…'
            : autoDetected && selected
              ? `Orchestration filtrée sur ${selected.name} (mapping RU → Sojori).`
              : cities.length > 0
                ? `Optionnel si détectée depuis RU — ${cities.length} ville(s) disponibles.`
                : 'Ville résolue automatiquement depuis Rentals United à l’import.'}
      </Typography>
    </Box>
  );
}
