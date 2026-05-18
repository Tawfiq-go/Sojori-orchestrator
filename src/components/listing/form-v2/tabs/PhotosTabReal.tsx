// PhotosTabReal.tsx — Version fonctionnelle avec upload réel
import React from 'react';
import { Box, Typography, TextField, Stack } from '@mui/material';
import MediaGrid from '../../upload/MediaGrid';

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed',
  aiTint: 'rgba(124,58,237,0.08)',
  aiBorder: 'rgba(124,58,237,0.20)',
  bg0: '#f6f5f1',
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
  listingImages: ListingImage[];
  onChange: (images: ListingImage[]) => void;
  airbnbHeroOrder?: string;
  onAirbnbOrderChange?: (order: string) => void;
}

function Card({ title, meta, children }: { title: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, p: 2.25, mb: 1.75 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1.75 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>{title}</Typography>
        {meta && <Typography sx={{ ml: 'auto', fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>{meta}</Typography>}
      </Stack>
      {children}
    </Box>
  );
}

function Field({
  label,
  ruField,
  hint,
  children,
}: {
  label: string;
  ruField?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 0.625 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text }}>{label}</Typography>
        {ruField && (
          <Box
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 9.5,
              px: 0.625,
              py: '1px',
              borderRadius: 0.5,
              bgcolor: T.bg3,
              color: T.text3,
              fontWeight: 600,
            }}
          >
            RU: {ruField}
          </Box>
        )}
      </Stack>
      {hint && (
        <Typography sx={{ fontSize: 11, color: T.text3, mb: 0.75 }}>
          {hint}
        </Typography>
      )}
      {children}
    </Box>
  );
}

export function PhotosTabReal({ listingImages = [], onChange, airbnbHeroOrder = '', onAirbnbOrderChange }: PhotosTabProps) {
  const validImageCount = listingImages.filter((img) => img.url && img.url.trim() !== '').length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: T.primaryTint, color: T.primaryDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              📸
            </Box>
            Médias
          </Typography>
          <Typography sx={{ color: T.text3, fontSize: 13.5, lineHeight: 1.5, maxWidth: 640 }}>
            Photos, vidéos et tour 360°. La première image (cover) est utilisée sur tous les canaux OTA.
          </Typography>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.125, py: 0.5, borderRadius: '99px', bgcolor: validImageCount > 0 ? 'rgba(16,185,129,0.10)' : T.bg2, color: validImageCount > 0 ? '#10b981' : T.text3, border: `1px solid ${validImageCount > 0 ? 'rgba(16,185,129,0.25)' : T.border}`, fontFamily: 'Geist Mono', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          ● {validImageCount} photo{validImageCount > 1 ? 's' : ''}
        </Box>
      </Box>

      {/* Media Grid */}
      <Field
        label="Galerie photos"
        ruField="listingImages"
        hint="Images synchronisées vers Rentals United (Push_PutProperty). Glisser-déposer pour réordonner."
      >
        <MediaGrid listingImages={listingImages} onChange={onChange} />
      </Field>

      {/* Airbnb specific order */}
      <Card title="🅰️ Sync Airbnb · ordre spécifique" meta="Optionnel">
        <Typography sx={{ fontSize: 12, color: T.text3, mb: 1.25 }}>
          Permet de réordonner les photos uniquement sur Airbnb sans modifier l'ordre Sojori/RU.
        </Typography>
        <Stack direction="row" alignItems="center" gap={1} sx={{ p: 1.25, bgcolor: T.bg2, borderRadius: 1 }}>
          <Box sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 700, fontSize: 12 }}>airbnbHeroOrder</Box>
          <TextField
            size="small"
            fullWidth
            value={airbnbHeroOrder}
            onChange={(e) => onAirbnbOrderChange?.(e.target.value)}
            placeholder="1, 3, 5, 7, 9"
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 12.5, bgcolor: T.bg1 } }}
          />
        </Stack>
      </Card>
    </Box>
  );
}

export default PhotosTabReal;
