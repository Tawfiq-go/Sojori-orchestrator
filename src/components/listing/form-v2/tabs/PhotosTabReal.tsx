// PhotosTabReal.tsx — Galerie bâtiment + (Multi) upload par RoomType
import React, { useState, memo, useMemo, useCallback } from 'react';
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
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import MediaGrid from '../../upload/MediaGrid';
import { LegacyReduxProvider } from '../../../LegacyReduxBridge';
import { FieldIndicator } from '../components/FieldIndicator';
import { RuFormLegend } from './_shared';
import { PhotoZone } from '../../multi/PhotoZone';
import { uploadMultipleImagesToAPI } from '../../../../redux/slices/UploadSlice';
import type { MultiListingImage } from '../../multi/multiTypes';

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
  fileName?: string | null;
  imageTypeId?: string;
  imageTypeRuId?: number[];
  sortOrder?: number;
  url: string;
  caption?: string;
}

interface PhotosTabProps {
  listingId?: string;
  listingImages: ListingImage[];
  onChange: (images: ListingImage[]) => void;
  onImagesPersisted?: (images: ListingImage[]) => void;
  airbnbHeroOrder?: string;
  onAirbnbOrderChange?: (order: string) => void;
  propertyUnit?: string;
  roomTypes?: Array<Record<string, unknown>>;
  onRoomTypesChange?: (roomTypes: Array<Record<string, unknown>>) => void;
}

function extractUrls(result: unknown): string[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    return result
      .map((row) => {
        if (typeof row === 'string') return row;
        if (row && typeof row === 'object' && 'url' in row) {
          return String((row as { url: string }).url);
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof result === 'object' && result && 'urls' in result) {
    const urls = (result as { urls?: unknown }).urls;
    return Array.isArray(urls) ? urls.map(String) : [];
  }
  return [];
}

/** Doit vivre sous LegacyReduxProvider (useDispatch). */
function MultiRoomTypeGalleries({
  roomTypes,
  onRoomTypesChange,
}: {
  roomTypes: Array<Record<string, unknown>>;
  onRoomTypesChange: (roomTypes: Array<Record<string, unknown>>) => void;
}) {
  const dispatch = useDispatch();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const setRoomTypeImages = useCallback(
    (index: number, images: MultiListingImage[]) => {
      const next = roomTypes.map((rt, i) =>
        i === index ? { ...rt, roomTypeImages: images } : { ...rt },
      );
      onRoomTypesChange(next);
    },
    [onRoomTypesChange, roomTypes],
  );

  const uploadForRoomType = useCallback(
    async (index: number, files: FileList) => {
      const list = Array.from(files).slice(0, 12);
      if (!list.length) return;
      const key = String(roomTypes[index]?._id || index);
      setUploadingKey(key);
      try {
        const result = await dispatch(
          uploadMultipleImagesToAPI({ files: list, folder: 'listings' }) as never,
        ).unwrap();
        const urls = extractUrls(result);
        if (!urls.length) {
          toast.error('Upload échoué — aucune URL');
          return;
        }
        const prev = Array.isArray(roomTypes[index]?.roomTypeImages)
          ? (roomTypes[index].roomTypeImages as MultiListingImage[])
          : [];
        const added: MultiListingImage[] = urls.map((url, i) => ({
          url,
          sortOrder: prev.length + i,
          fileName: list[i]?.name || null,
        }));
        setRoomTypeImages(index, [...prev, ...added]);
        toast.success(`${added.length} photo(s) ajoutée(s)`);
      } catch {
        toast.error('Upload photo type échoué');
      } finally {
        setUploadingKey(null);
      }
    },
    [dispatch, roomTypes, setRoomTypeImages],
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Typography sx={{ fontSize: 11, color: T.text3, mb: 0.75 }}>
        2 · Photos par type — ajouter plusieurs par type
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.text, mb: 1.5 }}>
        Galeries RoomType
      </Typography>
      <Stack spacing={2}>
        {roomTypes.map((rt, index) => {
          const imgs = (
            Array.isArray(rt.roomTypeImages) ? rt.roomTypeImages : []
          ) as MultiListingImage[];
          const name = String(rt.roomTypeName || `Type ${index + 1}`);
          const units = Math.max(1, Number(rt.roomNumber) || 1);
          const key = String(rt._id || index);
          return (
            <Box key={key}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }} flexWrap="wrap">
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{name}</Typography>
                <Box
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    px: 1,
                    py: 0.25,
                    borderRadius: '99px',
                    bgcolor: T.primaryTint,
                    color: T.primaryDeep,
                  }}
                >
                  ×{units} unités · {imgs.filter((i) => i?.url).length} photos
                </Box>
              </Stack>
              <PhotoZone
                variant="type"
                tag={name}
                hint="Clique + pour ajouter plusieurs · clique une photo pour retirer"
                images={imgs}
                onChange={(next) => setRoomTypeImages(index, next)}
                uploading={uploadingKey === key}
                onPickFiles={(files) => uploadForRoomType(index, files)}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export const PhotosTabReal = memo(function PhotosTabReal({
  listingId,
  listingImages = [],
  onChange,
  onImagesPersisted,
  airbnbHeroOrder = '',
  onAirbnbOrderChange,
  propertyUnit,
  roomTypes = [],
  onRoomTypesChange,
}: PhotosTabProps) {
  const validImageCount = useMemo(
    () => listingImages.filter((img) => img.url && img.url.trim() !== '').length,
    [listingImages],
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [airbnbOpen, setAirbnbOpen] = useState(false);
  const isMulti = propertyUnit === 'Multi';
  const typePhotoCount = useMemo(
    () =>
      roomTypes.reduce((sum, rt) => {
        const imgs = Array.isArray(rt.roomTypeImages) ? rt.roomTypeImages : [];
        return sum + imgs.filter((img: ListingImage) => img?.url).length;
      }, 0),
    [roomTypes],
  );

  return (
    <Box>
      <RuFormLegend />
      {isMulti && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: '10px',
            bgcolor: T.primaryTint,
            border: '1px solid rgba(184,133,26,0.28)',
          }}
        >
          <Typography sx={{ fontSize: 13, color: T.text2, lineHeight: 1.45 }}>
            <b>Ajouter des photos</b> : bâtiment (zone 1) <b>et</b> chaque type (zone 2, bouton +).
            Multiples fichiers OK. Puis <b>Sauvegarder</b> pour persister les photos type.
            Bâtiment : {validImageCount} · Types : {typePhotoCount}.
          </Typography>
        </Box>
      )}
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        gap={0.75}
        sx={{ mb: 0.75 }}
      >
        <Typography sx={{ fontSize: 11, color: T.text3 }}>
          {isMulti ? '1 · Galerie bâtiment (ajouter / retirer)' : 'Galerie'}
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
          {isMulti ? 'Photos bâtiment' : 'Photos'}
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
        {!isMulti && (
          <Button
            size="small"
            variant="text"
            endIcon={airbnbOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setAirbnbOpen((v) => !v)}
            sx={{ textTransform: 'none', fontWeight: 600, color: T.text2 }}
          >
            Ordre Airbnb
          </Button>
        )}
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
            {isMulti
              ? 'Bâtiment = patio / piscine / façade. Chaque type a son bouton « + Ajouter » (plusieurs images). Clique une vignette type pour la retirer. Formats : JPG, PNG, WEBP.'
              : 'La première image (cover) est utilisée sur tous les canaux OTA. L’upload enregistre immédiatement sur le listing — pas besoin du bouton Sauvegarder pour les photos. Formats : JPG, PNG, WEBP · min 1024×768 px.'}
          </Typography>
        </Box>
      </Collapse>

      <LegacyReduxProvider>
        <MediaGrid
          listingId={listingId}
          listingImages={listingImages}
          onChange={onChange}
          onImagesPersisted={onImagesPersisted}
          defaultUploadExpanded={isMulti || validImageCount === 0}
        />
        {isMulti && onRoomTypesChange && (
          <MultiRoomTypeGalleries
            roomTypes={roomTypes}
            onRoomTypesChange={onRoomTypesChange}
          />
        )}
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
