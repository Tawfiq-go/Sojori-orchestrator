import { useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { PhotoZone } from './PhotoZone';
import { multiTokens as t, type MultiCreateValues, type MultiListingImage } from './multiTypes';
import ListingOwnerSelect from '../form-v2/components/ListingOwnerSelect';
import listingsService from '../../../services/listingsService';

type CityOption = { _id: string; name: string; countryId?: string };
type CountryOption = { _id: string; name: string };

type Props = {
  values: MultiCreateValues;
  onChange: (partial: Partial<MultiCreateValues>) => void;
  uploading?: boolean;
  onPickCommonFiles?: (files: FileList) => void;
};

function countryNameForCity(
  city: CityOption | undefined,
  countries: CountryOption[],
): string {
  if (!city?.countryId) return '';
  return countries.find((c) => c._id === city.countryId)?.name || '';
}

export function MultiBuildingSection({ values, onChange, uploading, onPickCommonFiles }: Props) {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const descValue =
    Array.isArray(values.description) && values.description[0]
      ? String(values.description[0].value || '')
      : '';

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listingsService.getCities({ allCities: true, limit: 2000 }),
      listingsService.getCountries(),
    ]).then(([cityRows, countryRows]) => {
      if (cancelled) return;
      setCities(cityRows || []);
      setCountries(countryRows || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resynchronise cityId / pays si la ville est affichée mais l’ID manque (HMR, autofill, etc.)
  useEffect(() => {
    if (!cities.length || !values.city?.trim()) return;
    const selected = cities.find((c) => c.name === values.city);
    if (!selected) return;
    const nextCountry =
      values.country?.trim() || countryNameForCity(selected, countries) || values.country;
    const needsCityId = !values.cityId || values.cityId !== selected._id;
    const needsCountry = Boolean(nextCountry) && nextCountry !== values.country;
    if (!needsCityId && !needsCountry) return;
    onChange({
      ...(needsCityId ? { cityId: selected._id } : {}),
      ...(needsCountry ? { country: nextCountry } : {}),
    });
  }, [cities, countries, values.city, values.cityId, values.country, onChange]);

  const citySelectValue =
    values.city && cities.some((c) => c.name === values.city) ? values.city : '';
  const countrySelectValue =
    values.country && countries.some((c) => c.name === values.country)
      ? values.country
      : '';

  return (
    <Box
      sx={{
        background: t.bg1,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.25,
          py: 1.75,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '8px',
            background: t.infoTint,
            color: t.info,
            fontFamily: t.mono,
            fontWeight: 800,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          B
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>Le bâtiment</Typography>
          <Typography sx={{ fontSize: 11.5, color: t.text3 }}>
            Infos & photos communes à toutes les chambres
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2.25 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <TextField
            label="Nom de l'établissement *"
            size="small"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            fullWidth
            autoComplete="off"
          />
          <TextField
            label="Adresse *"
            size="small"
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
            fullWidth
            autoComplete="street-address"
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <FormControl size="small" fullWidth required>
            <InputLabel id="multi-create-city-label">Ville</InputLabel>
            <Select
              labelId="multi-create-city-label"
              label="Ville"
              value={citySelectValue}
              onChange={(e) => {
                const name = String(e.target.value || '');
                const selected = cities.find((c) => c.name === name);
                onChange({
                  city: name,
                  cityId: selected?._id || '',
                  // Pays dérivé de la ville (évite autofill navigateur hors state React)
                  country: countryNameForCity(selected, countries) || values.country || '',
                });
              }}
            >
              <MenuItem value="" disabled>
                <em>Sélectionner une ville</em>
              </MenuItem>
              {cities.map((c) => (
                <MenuItem key={c._id} value={c.name}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth required>
            <InputLabel id="multi-create-country-label">Pays</InputLabel>
            <Select
              labelId="multi-create-country-label"
              label="Pays"
              value={countrySelectValue}
              onChange={(e) => onChange({ country: String(e.target.value || '') })}
            >
              <MenuItem value="" disabled>
                <em>Sélectionner un pays</em>
              </MenuItem>
              {countries.map((c) => (
                <MenuItem key={c._id} value={c.name}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <ListingOwnerSelect
            values={values}
            onChange={(partial: Partial<MultiCreateValues>) => onChange(partial)}
          />
        </Box>

        <TextField
          label="Description commune"
          size="small"
          multiline
          minRows={3}
          value={descValue}
          onChange={(e) =>
            onChange({
              description: [{ ...(values.description?.[0] || {}), value: e.target.value }],
            })
          }
          fullWidth
          sx={{ mb: 1.5 }}
        />

        <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.8 }}>
          Photos communes
        </Typography>
        <PhotoZone
          variant="common"
          tag="Communes"
          hint="Espaces partagés : patio, piscine, terrasse, façade — pas les chambres"
          images={values.listingImages}
          onChange={(listingImages: MultiListingImage[]) => onChange({ listingImages })}
          uploading={uploading}
          onPickFiles={onPickCommonFiles}
        />
      </Box>
    </Box>
  );
}
