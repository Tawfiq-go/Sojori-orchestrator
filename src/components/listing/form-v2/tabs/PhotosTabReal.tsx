// PhotosTabReal.tsx — Galerie prioritaire, aide / upload repliables
import React, { useState, memo, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Stack,
  Button,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MediaGrid from '../../upload/MediaGrid';
import { LegacyReduxProvider } from '../../../LegacyReduxBridge';
import { FieldIndicator } from '../components/FieldIndicator';
import { RuFormLegend } from './_shared';

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg1: '#fff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',
};

interface ListingImage {
  fileName?: string;
  imageTypeId?: string;
  imageTypeRuId?: number[];
  sortOrder?: number;
  url: string;
}

interface PhotosTabProps {
  listingId?: string;
  listingImages: ListingImage[];
  onChange: (images: ListingImage[]) => void;
  onImagesPersisted?: (images: ListingImage[]) => void;
  airbnbHeroOrder?: string;
  onAirbnbOrderChange?: (order: string) => void;
}

export const PhotosTabReal = memo(function PhotosTabReal({
  listingId,
  listingImages = [],
  onChange,
  onImagesPersisted,
  airbnbHeroOrder = '',
  onAirbnbOrderChange,
}: PhotosTabProps) {
  const validImageCount = useMemo(
    () => listingImages.filter((img) => img.url && img.url.trim() !== '').length,
    [listingImages],
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [airbnbOpen, setAirbnbOpen] = useState(false);

  return (
    <Box>
      <RuFormLegend />
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        gap={0.75}
        sx={{ mb: 0.75 }}
      >
        <Typography sx={{ fontSize: 11, color: T.text3 }}>
          Galerie
        </Typography>
        <FieldIndicator field="listingImages" dense adminOnlyGate />
      </Stack>
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 1.25 }}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.text }}>
          Photos
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1,
            py: 0.35,
            borderRadius: '99px',
            bgcolor: validImageCount > 0 ? 'rgba(16,185,129,0.10)' : T.bg2,
            color: validImageCount > 0 ? '#10b981' : T.text3,
            border: `1px solid ${validImageCount > 0 ? 'rgba(16,185,129,0.25)' : T.border}`,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {validImageCount} photo{validImageCount !== 1 ? 's' : ''}
        </Box>
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Button
          size="small"
          variant="text"
          startIcon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />}
          endIcon={helpOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setHelpOpen((v) => !v)}
          sx={{ textTransform: 'none', fontWeight: 600, color: T.text2 }}
        >
          Aide
        </Button>
        <Button
          size="small"
          variant="text"
          endIcon={airbnbOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setAirbnbOpen((v) => !v)}
          sx={{ textTransform: 'none', fontWeight: 600, color: T.text2 }}
        >
          Ordre Airbnb
        </Button>
      </Stack>

      <Collapse in={helpOpen}>
        <Box
          sx={{
            mb: 1.5,
            p: 1.5,
            borderRadius: 1,
            bgcolor: T.bg2,
            border: `1px solid ${T.border}`,
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: T.text2, lineHeight: 1.55 }}>
            La première image (cover) est utilisée sur tous les canaux OTA. L’upload enregistre
            immédiatement sur le listing — pas besoin du bouton Sauvegarder pour les photos.
            Formats : JPG, PNG, WEBP · min 1024×768 px.
          </Typography>
        </Box>
      </Collapse>

      <LegacyReduxProvider>
        <MediaGrid
          listingId={listingId}
          listingImages={listingImages}
          onChange={onChange}
          onImagesPersisted={onImagesPersisted}
          defaultUploadExpanded={validImageCount === 0}
        />
      </LegacyReduxProvider>

      <Collapse in={airbnbOpen}>
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: 1,
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
          }}
        >
          <Typography sx={{ fontSize: 12, color: T.text3, mb: 1 }}>
            Ordre des photos spécifique Airbnb (optionnel), sans modifier l’ordre Sojori / RU.
          </Typography>
          <Stack direction="row" gap={1} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: T.text3, flexShrink: 0 }}>
              airbnbHeroOrder
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={airbnbHeroOrder}
              onChange={(e) => onAirbnbOrderChange?.(e.target.value)}
              placeholder="1, 3, 5, 7, 9"
              sx={{ '& .MuiOutlinedInput-root': { fontSize: 12.5, bgcolor: T.bg2 } }}
            />
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
});

export default PhotosTabReal;
