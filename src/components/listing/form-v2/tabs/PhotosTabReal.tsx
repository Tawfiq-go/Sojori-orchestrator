// PhotosTabReal.tsx — Galerie (Single = MediaGrid) · Multi = PhotoZone bâtiment + types
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
import listingsService from '../../../../services/listingsService';
import { cleanListingImagesForPayload } from '../../../../utils/listingFormV2ApiAdapter';
import { isPersistedListingId } from '../../../../utils/listingId';
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

function toMultiImages(images: ListingImage[]): MultiListingImage[] {
  return images
    .filter((img) => img?.url)
    .map((img, i) => ({
      url: img.url,
      sortOrder: img.sortOrder ?? i,
      fileName: img.fileName ?? null,
      caption: img.caption,
    }));
}

function SectionLabel({
  title,
  count,
  field,
}: {
  title: string;
  count?: number;
  field?: string;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</Typography>
      {typeof count === 'number' ? (
        <Box
          sx={{
            fontSize: 11,
            fontWeight: 700,
            px: 1,
            py: 0.25,
            borderRadius: '99px',
            bgcolor: count > 0 ? 'rgba(16,185,129,0.10)' : T.bg2,
            color: count > 0 ? '#059669' : T.text3,
          }}
        >
          {count} photo{count !== 1 ? 's' : ''}
        </Box>
      ) : null}
      {field ? <FieldIndicator field={field} dense adminOnlyGate /> : null}
    </Stack>
  );
}

/** Doit vivre sous LegacyReduxProvider (useDispatch). */
function MultiBuildingGallery({
  listingId,
  listingImages,
  onChange,
  onImagesPersisted,
}: {
  listingId?: string;
  listingImages: ListingImage[];
  onChange: (images: ListingImage[]) => void;
  onImagesPersisted?: (images: ListingImage[]) => void;
}) {
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);

  const persist = useCallback(
    async (next: ListingImage[]) => {
      onChange(next);
      if (!listingId || !isPersistedListingId(listingId)) return;
      try {
        await listingsService.updateListingProperty(listingId, {
          listingImages: cleanListingImagesForPayload(next),
        });
        onImagesPersisted?.(next);
      } catch {
        toast.error('Photos bâtiment non enregistrées — réessayez Sauvegarder');
      }
    },
    [listingId, onChange, onImagesPersisted],
  );

  const onPickFiles = useCallback(
    async (files: FileList) => {
      const list = Array.from(files).slice(0, 20);
      if (!list.length) return;
      setUploading(true);
      try {
        const result = await dispatch(
          uploadMultipleImagesToAPI({ files: list, folder: 'listings' }) as never,
        ).unwrap();
        const urls = extractUrls(result);
        if (!urls.length) {
          toast.error('Upload échoué');
          return;
        }
        const added: ListingImage[] = urls.map((url, i) => ({
          url,
          sortOrder: listingImages.length + i,
          fileName: list[i]?.name || null,
        }));
        await persist([...listingImages, ...added]);
        toast.success(`${added.length} photo(s) bâtiment`);
      } catch {
        toast.error('Upload bâtiment échoué');
      } finally {
        setUploading(false);
      }
    },
    [dispatch, listingImages, persist],
  );

  const onZoneChange = useCallback(
    (images: MultiListingImage[]) => {
      void persist(
        images.map((img, i) => {
          const prev = listingImages.find((p) => p.url === img.url);
          return {
            url: img.url,
            sortOrder: i,
            fileName: img.fileName ?? prev?.fileName ?? null,
            caption: img.caption ?? prev?.caption,
            imageTypeId: prev?.imageTypeId,
            imageTypeRuId: prev?.imageTypeRuId,
          };
        }),
      );
    },
    [listingImages, persist],
  );

  return (
    <PhotoZone
      variant="common"
      compact
      images={toMultiImages(listingImages)}
      onChange={onZoneChange}
      uploading={uploading}
      onPickFiles={onPickFiles}
    />
  );
}

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
          toast.error('Upload échoué');
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
        toast.success(`${added.length} photo(s)`);
      } catch {
        toast.error('Upload type échoué');
      } finally {
        setUploadingKey(null);
      }
    },
    [dispatch, roomTypes, setRoomTypeImages],
  );

  if (!roomTypes.length) {
    return (
      <Typography sx={{ fontSize: 12.5, color: T.text3, mt: 1 }}>
        Aucun type — ajoutez-en dans Config Rooms.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.1}>
      {roomTypes.map((rt, index) => {
        const imgs = (
          Array.isArray(rt.roomTypeImages) ? rt.roomTypeImages : []
        ) as MultiListingImage[];
        const name = String(rt.roomTypeName || `Type ${index + 1}`);
        const units = Math.max(1, Number(rt.roomNumber) || 1);
        const key = String(rt._id || index);
        const n = imgs.filter((i) => i?.url).length;
        return (
          <Box key={key}>
            <Stack direction="row" alignItems="baseline" gap={0.75} sx={{ mb: 0.45 }} flexWrap="wrap">
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{name}</Typography>
              <Typography sx={{ fontSize: 11, color: T.text3 }}>
                {n} · ×{units}
              </Typography>
            </Stack>
            <PhotoZone
              variant="type"
              compact
              images={imgs}
              onChange={(next) => setRoomTypeImages(index, next)}
              uploading={uploadingKey === key}
              onPickFiles={(files) => uploadForRoomType(index, files)}
            />
          </Box>
        );
      })}
    </Stack>
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
      {!isMulti && <RuFormLegend />}

      <Stack
        direction="row"
        alignItems="center"
        gap={0.75}
        flexWrap="wrap"
        sx={{ mb: isMulti ? 0.75 : 1.25, mt: isMulti ? -0.5 : 0 }}
      >
        {!isMulti && (
          <>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: T.text }}>Photos</Typography>
            <Box
              sx={{
                fontSize: 11,
                fontWeight: 700,
                px: 1,
                py: 0.25,
                borderRadius: '99px',
                bgcolor: validImageCount > 0 ? 'rgba(16,185,129,0.10)' : T.bg2,
                color: validImageCount > 0 ? '#059669' : T.text3,
              }}
            >
              {validImageCount} photo{validImageCount !== 1 ? 's' : ''}
            </Box>
          </>
        )}
        <FieldIndicator field="listingImages" dense adminOnlyGate />
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Button
          size="small"
          variant="text"
          startIcon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />}
          endIcon={helpOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setHelpOpen((v) => !v)}
          sx={{ textTransform: 'none', fontWeight: 600, color: T.text2, py: 0.15, minHeight: 0 }}
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
            mb: 1,
            p: 1.1,
            borderRadius: 1,
            bgcolor: T.bg2,
            border: `1px solid ${T.border}`,
          }}
        >
          <Typography sx={{ fontSize: 12, color: T.text2, lineHeight: 1.45 }}>
            {isMulti
              ? '+ ajouter · clic vignette = retirer. Communes = immédiat. Types = Sauvegarder. R = OTA · * = obligatoire.'
              : 'Cover = 1ʳᵉ image OTA. Upload immédiat. JPG / PNG / WEBP · min 1024×768.'}
          </Typography>
        </Box>
      </Collapse>

      <LegacyReduxProvider>
        {isMulti ? (
          <Stack spacing={1.25}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2, mb: 0.45 }}>
                Bâtiment · {validImageCount}
              </Typography>
              <MultiBuildingGallery
                listingId={listingId}
                listingImages={listingImages}
                onChange={onChange}
                onImagesPersisted={onImagesPersisted}
              />
            </Box>
            {onRoomTypesChange ? (
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2, mb: 0.45 }}>
                  Types · {typePhotoCount}
                </Typography>
                <MultiRoomTypeGalleries
                  roomTypes={roomTypes}
                  onRoomTypesChange={onRoomTypesChange}
                />
              </Box>
            ) : null}
          </Stack>
        ) : (
          <>
            <SectionLabel title="Galerie" field="listingImages" />
            <MediaGrid
              listingId={listingId}
              listingImages={listingImages}
              onChange={onChange}
              onImagesPersisted={onImagesPersisted}
              defaultUploadExpanded={validImageCount === 0}
            />
          </>
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
            Ordre des photos spécifique Airbnb (optionnel).
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
