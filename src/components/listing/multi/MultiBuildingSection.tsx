import { Box, TextField, Typography } from '@mui/material';
import { PhotoZone } from './PhotoZone';
import { multiTokens as t, type MultiCreateValues, type MultiListingImage } from './multiTypes';
import ListingOwnerSelect from '../form-v2/components/ListingOwnerSelect';

type Props = {
  values: MultiCreateValues;
  onChange: (partial: Partial<MultiCreateValues>) => void;
  uploading?: boolean;
  onPickCommonFiles?: (files: FileList) => void;
};

export function MultiBuildingSection({ values, onChange, uploading, onPickCommonFiles }: Props) {
  const descValue =
    Array.isArray(values.description) && values.description[0]
      ? String(values.description[0].value || '')
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
          />
          <TextField
            label="Adresse *"
            size="small"
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
            fullWidth
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <TextField
            label="Ville *"
            size="small"
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
            fullWidth
          />
          <TextField
            label="City ID *"
            size="small"
            value={values.cityId}
            onChange={(e) => onChange({ cityId: e.target.value })}
            helperText="ID Mongo / RU city (comme formulaire Single)"
            fullWidth
          />
          <TextField
            label="Pays *"
            size="small"
            value={values.country}
            onChange={(e) => onChange({ country: e.target.value })}
            fullWidth
          />
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
