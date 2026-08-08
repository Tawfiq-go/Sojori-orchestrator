// PhotosTabReal.tsx — Galerie (Single + Multi building/types = MediaGrid)
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
import MediaGrid from '../../upload/MediaGrid';
import { LegacyReduxProvider } from '../../../LegacyReduxBridge';
import { FieldIndicator } from '../components/FieldIndicator';
import { RuFormLegend } from './_shared';
import listingsService from '../../../../services/listingsService';
import { cleanListingImagesForPayload } from '../../../../utils/listingFormV2ApiAdapter';
import { isPersistedListingId } from '../../../../utils/listingId';

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
  imageTypeRuId?: number[] | string[];
  sortOrder?: number;
  url: string;
  caption?: string;
  /** Multi only — RoomType._id associés pour push OTA */
  roomTypeIds?: string[];
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

/** Doit vivre sous LegacyReduxProvider (useDispatch / MediaGrid). Multi only. */
function MultiBuildingGallery({
  listingId,
  listingImages,
  onChange,
  onImagesPersisted,
  roomTypes = [],
}: {
  listingId?: string;
  listingImages: ListingImage[];
  onChange: (images: ListingImage[]) => void;
  onImagesPersisted?: (images: ListingImage[]) => void;
  roomTypes?: Array<Record<string, unknown>>;
}) {
  const roomTypeOptions = useMemo(
    () =>
      roomTypes
        .map((rt, i) => ({
          id: String(rt._id || ''),
          name: String(rt.otaDisplayName || rt.roomTypeName || `Type ${i + 1}`),
        }))
        .filter((r) => Boolean(r.id)),
    [roomTypes],
  );

  return (
    <Stack spacing={1}>
      <MediaGrid
        listingId={listingId}
        listingImages={listingImages}
        onChange={onChange}
        onImagesPersisted={onImagesPersisted}
        roomTypeOptions={roomTypeOptions}
      />
      {roomTypeOptions.length > 0 ? (
        <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.4 }}>
          Sous chaque photo : <strong>Associer</strong> → cochez les types OTA qui réutilisent
          l’image. Non associé = building only (pas poussé sur Airbnb via RU).
        </Typography>
      ) : null}
    </Stack>
  );
}

function MultiRoomTypeGalleries({
  listingId,
  roomTypes,
  onRoomTypesChange,
}: {
  listingId?: string;
  roomTypes: Array<Record<string, unknown>>;
  onRoomTypesChange: (roomTypes: Array<Record<string, unknown>>) => void;
}) {
  const persistRoomTypeImages = useCallback(
    async (index: number, images: ListingImage[]) => {
      const next = roomTypes.map((rt, i) =>
        i === index ? { ...rt, roomTypeImages: images } : { ...rt },
      );
      onRoomTypesChange(next);

      if (!listingId || !isPersistedListingId(listingId)) return;

      const targetId = String(roomTypes[index]?._id || '').trim();
      if (!targetId) {
        // Draft local sans _id : mémoire formulaire seulement
        return;
      }

      // Tous les _id présents → passe le garde « delete roomtype ».
      // Pas de clé `rooms` → le backend ne touche pas aux units.
      const payloadRoomTypes = next
        .map((rt, i) => {
          const id = String(rt._id || '').trim();
          if (!id) return null;
          if (i === index) {
            return {
              _id: id,
              roomTypeImages: cleanListingImagesForPayload(images),
            };
          }
          return { _id: id };
        })
        .filter(Boolean);

      const persistedCount = next.filter((rt) => String(rt._id || '').trim()).length;
      if (payloadRoomTypes.length !== persistedCount) {
        throw new Error('Room types incomplets — impossible d’enregistrer les photos type');
      }

      await listingsService.updateListingProperty(listingId, {
        roomTypes: payloadRoomTypes,
      });
    },
    [listingId, onRoomTypesChange, roomTypes],
  );

  if (!roomTypes.length) {
    return (
      <Typography sx={{ fontSize: 12.5, color: T.text3, mt: 1 }}>
        Aucun type — ajoutez-en dans Config Rooms.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {roomTypes.map((rt, index) => {
        const imgs = (
          Array.isArray(rt.roomTypeImages) ? rt.roomTypeImages : []
        ) as ListingImage[];
        const name = String(rt.otaDisplayName || rt.roomTypeName || `Type ${index + 1}`);
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
            <MediaGrid
              listingId={listingId}
              listingImages={imgs}
              onChange={(images) => {
                const next = roomTypes.map((row, i) =>
                  i === index ? { ...row, roomTypeImages: images } : { ...row },
                );
                onRoomTypesChange(next);
              }}
              persistImages={async (images, _action, _msg) => {
                await persistRoomTypeImages(index, images);
              }}
            />
          </Box>
        );
      })}
      <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.4 }}>
        Même logique que building : catégorie OTA sous chaque photo (Bedroom, Pool…). Ces tags
        partent avec le sync RU → Airbnb comme pour une villa.
      </Typography>
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
              ? 'Building + chaque type = MediaGrid (upload, corbeille, catégorie OTA). Associer sous photo building = partage OTA vers types. Enregistrement immédiat.'
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
                roomTypes={roomTypes}
              />
            </Box>
            {onRoomTypesChange ? (
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2, mb: 0.45 }}>
                  Types · {typePhotoCount}
                </Typography>
                <MultiRoomTypeGalleries
                  listingId={listingId}
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
