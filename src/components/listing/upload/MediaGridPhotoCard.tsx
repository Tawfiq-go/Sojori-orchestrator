import React, { memo, useState } from 'react';
import { Box, Typography, IconButton, Checkbox, Button, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import LinkIcon from '@mui/icons-material/Link';
import ImageTypeSelector from './ImageTypeSelector';
import { type ImageType } from '../../../services/imageTypesService';
import { MEDIA_GRID_THEME as T } from './mediaGridConstants';
import { useAuth } from '../../../hooks/useAuth';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { isListingImageImportedFromRu } from '../../../utils/resolveRuImportedFields';

export interface MediaGridListingImage {
  fileName?: string;
  imageTypeId?: string;
  imageTypeRuId?: number[];
  sortOrder?: number;
  url: string;
  importedFromRu?: boolean;
  /** Multi — RoomType._id associés pour push OTA */
  roomTypeIds?: string[];
}

export type MediaGridRoomTypeOption = { id: string; name: string };

export interface MediaGridPhotoCardProps {
  originalIndex: number;
  img: MediaGridListingImage;
  effectiveImageTypeId?: string;
  categoryLabel: string;
  undefinedCategory: boolean;
  isMain: boolean;
  placeholderGradient: string;
  selectionMode: boolean;
  isSelected: boolean;
  imageToMove: number | null;
  showTypeSelector: boolean;
  imageTypes: ImageType[];
  existingImages: MediaGridListingImage[];
  selectorDisabled: boolean;
  onCardClick: (index: number) => void;
  onToggleSelect: (index: number) => void;
  onSetMain: (index: number) => void;
  onRemove: (index: number) => void;
  onTypeChange: (index: number, typeId: string | null) => void;
  onStartTypeEdit: (index: number) => void;
  /** Multi — boutons Associer sous la carte */
  roomTypeOptions?: MediaGridRoomTypeOption[];
  onToggleRoomType?: (index: number, roomTypeId: string) => void;
}

function MediaGridPhotoCardComponent({
  originalIndex: idx,
  img,
  effectiveImageTypeId,
  categoryLabel,
  undefinedCategory,
  isMain,
  placeholderGradient,
  selectionMode,
  isSelected,
  imageToMove,
  showTypeSelector,
  imageTypes,
  existingImages,
  selectorDisabled,
  onCardClick,
  onToggleSelect,
  onSetMain,
  onRemove,
  onTypeChange,
  onStartTypeEdit,
  roomTypeOptions,
  onToggleRoomType,
}: MediaGridPhotoCardProps) {
  const { user } = useAuth();
  const isAdmin = Boolean(user && hasAdminAccess(user.role));
  const showImportedBadge = isAdmin && isListingImageImportedFromRu(img as Record<string, unknown>);
  const dimUnselected = selectionMode && !isSelected;
  const [assocOpen, setAssocOpen] = useState(false);
  const linkedIds = Array.isArray(img.roomTypeIds) ? img.roomTypeIds : [];
  const showAssoc = Boolean(roomTypeOptions?.length && onToggleRoomType && !selectionMode);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1.125,
        overflow: 'hidden',
        border: `2px solid ${isSelected ? T.primary : imageToMove === idx ? T.primary : T.border}`,
        bgcolor: T.bg1,
        boxShadow: isSelected ? `0 0 0 2px ${T.primaryTint}` : 'none',
        opacity: dimUnselected ? 0.85 : 1,
        contentVisibility: 'auto',
        containIntrinsicSize: '220px 280px',
      }}
    >
      <Box
        onClick={() => onCardClick(idx)}
        sx={{
          position: 'relative',
          aspectRatio: '4/3',
          background: img.url ? `url(${img.url}) center/cover` : placeholderGradient,
          cursor: selectionMode ? 'pointer' : imageToMove === null ? 'pointer' : imageToMove === idx ? 'grab' : 'copy',
          opacity: !selectionMode && imageToMove !== null && imageToMove !== idx ? 0.6 : 1,
          transition: 'opacity 0.2s',
          '&:hover .photo-actions': { opacity: selectionMode ? 0 : 1 },
        }}
      >
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(idx);
            }}
            onClick={(e) => e.stopPropagation()}
            icon={<CheckBoxOutlineBlankIcon sx={{ bgcolor: '#fff', borderRadius: 0.5 }} />}
            checkedIcon={<CheckBoxIcon sx={{ color: T.primary }} />}
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              zIndex: 2,
              p: 0.25,
              bgcolor: 'rgba(255,255,255,0.92)',
              borderRadius: 0.5,
            }}
          />
        )}

        <Box
          sx={{
            position: 'absolute',
            top: 6,
            left: selectionMode ? 36 : 6,
            bgcolor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 800,
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          {idx + 1}
        </Box>

        {isMain && (
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              bgcolor: T.primary,
              color: T.text,
              px: 0.875,
              py: 0.25,
              borderRadius: 0.625,
              fontSize: 9.5,
              fontWeight: 800,
            }}
          >
            COVER
          </Box>
        )}

        {showImportedBadge && (
          <Box
            title="Importée depuis Rentals United"
            sx={{
              position: 'absolute',
              top: isMain ? 32 : 6,
              right: 6,
              bgcolor: 'rgba(10, 143, 94, 0.92)',
              color: '#fff',
              minWidth: 20,
              height: 20,
              px: 0.5,
              borderRadius: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
              fontFamily: '"Geist Mono", monospace',
              zIndex: 2,
            }}
          >
            I
          </Box>
        )}

        <Box
          className="photo-actions"
          sx={{
            position: 'absolute',
            top: 6,
            right: isMain ? 52 : 6,
            display: 'flex',
            gap: 0.5,
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onSetMain(idx);
            }}
            sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,0.95)' }}
          >
            {isMain ? <StarIcon sx={{ fontSize: 14 }} /> : <StarBorderIcon sx={{ fontSize: 14 }} />}
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(idx);
            }}
            sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,0.95)' }}
          >
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          px: 1,
          py: 0.625,
          bgcolor: undefinedCategory ? 'rgba(220,38,38,0.10)' : 'rgba(20,17,10,0.88)',
          borderTop: `1px solid ${undefinedCategory ? 'rgba(220,38,38,0.35)' : T.border}`,
        }}
        title={categoryLabel}
      >
        <Typography
          noWrap
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: undefinedCategory ? '#dc2626' : '#fff',
            lineHeight: 1.3,
          }}
        >
          {categoryLabel}
        </Typography>
      </Box>

      {!selectionMode && (
        <Box sx={{ px: 0.5, py: 0.5, bgcolor: T.bg2 }} onClick={(e) => e.stopPropagation()}>
          {showTypeSelector ? (
            <ImageTypeSelector
              value={effectiveImageTypeId || img.imageTypeId || ''}
              onChange={(typeId) => onTypeChange(idx, typeId)}
              imageTypes={imageTypes}
              disabled={selectorDisabled}
              existingImages={existingImages}
            />
          ) : (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={() => onStartTypeEdit(idx)}
              sx={{
                textTransform: 'none',
                fontSize: '0.7rem',
                py: 0.5,
                borderColor: undefinedCategory ? 'rgba(220,38,38,0.45)' : T.borderStrong,
                color: undefinedCategory ? '#dc2626' : T.text2,
                fontWeight: 600,
              }}
            >
              {undefinedCategory ? 'Définir la catégorie' : 'Changer la catégorie'}
            </Button>
          )}
          {showAssoc ? (
            <Box sx={{ mt: 0.5 }}>
              <Button
                fullWidth
                size="small"
                variant={linkedIds.length ? 'contained' : 'outlined'}
                startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                disabled={selectorDisabled}
                onClick={() => setAssocOpen((v) => !v)}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.68rem',
                  py: 0.4,
                  fontWeight: 700,
                  bgcolor: linkedIds.length ? T.primary : 'transparent',
                  color: linkedIds.length ? '#fff' : T.text2,
                  borderColor: T.borderStrong,
                  '&:hover': {
                    bgcolor: linkedIds.length ? T.primaryDeep : T.primaryTint,
                  },
                }}
              >
                {assocOpen
                  ? 'Fermer'
                  : linkedIds.length
                    ? `Associé · ${linkedIds.length}`
                    : 'Associer'}
              </Button>
              {assocOpen ? (
                <Stack direction="row" gap={0.4} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {roomTypeOptions!.map((rt) => {
                    const on = linkedIds.includes(rt.id);
                    return (
                      <Button
                        key={rt.id}
                        size="small"
                        variant={on ? 'contained' : 'outlined'}
                        disabled={selectorDisabled}
                        onClick={() => onToggleRoomType!(idx, rt.id)}
                        sx={{
                          textTransform: 'none',
                          fontSize: 10,
                          fontWeight: 700,
                          py: 0.1,
                          px: 0.75,
                          minHeight: 0,
                          lineHeight: 1.5,
                          bgcolor: on ? T.primary : 'transparent',
                          color: on ? '#fff' : T.text2,
                          borderColor: T.border,
                          '&:hover': { bgcolor: on ? T.primaryDeep : T.primaryTint },
                        }}
                      >
                        {rt.name}
                      </Button>
                    );
                  })}
                </Stack>
              ) : null}
              {!assocOpen && linkedIds.length > 0 ? (
                <Typography sx={{ fontSize: 9.5, color: T.text3, mt: 0.35, lineHeight: 1.3 }}>
                  {roomTypeOptions!
                    .filter((rt) => linkedIds.includes(rt.id))
                    .map((rt) => rt.name)
                    .join(' · ') || `${linkedIds.length} type(s)`}
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}

function roomTypeIdsKey(ids?: string[]): string {
  return Array.isArray(ids) ? ids.join(',') : '';
}

function arePhotoCardPropsEqual(
  prev: MediaGridPhotoCardProps,
  next: MediaGridPhotoCardProps,
): boolean {
  return (
    prev.originalIndex === next.originalIndex &&
    prev.img.url === next.img.url &&
    prev.img.imageTypeId === next.img.imageTypeId &&
    roomTypeIdsKey(prev.img.roomTypeIds) === roomTypeIdsKey(next.img.roomTypeIds) &&
    prev.effectiveImageTypeId === next.effectiveImageTypeId &&
    prev.categoryLabel === next.categoryLabel &&
    prev.undefinedCategory === next.undefinedCategory &&
    prev.isMain === next.isMain &&
    prev.placeholderGradient === next.placeholderGradient &&
    prev.selectionMode === next.selectionMode &&
    prev.isSelected === next.isSelected &&
    prev.imageToMove === next.imageToMove &&
    prev.showTypeSelector === next.showTypeSelector &&
    prev.selectorDisabled === next.selectorDisabled &&
    prev.imageTypes === next.imageTypes &&
    prev.existingImages === next.existingImages &&
    prev.roomTypeOptions === next.roomTypeOptions &&
    prev.onCardClick === next.onCardClick &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onSetMain === next.onSetMain &&
    prev.onRemove === next.onRemove &&
    prev.onTypeChange === next.onTypeChange &&
    prev.onStartTypeEdit === next.onStartTypeEdit &&
    prev.onToggleRoomType === next.onToggleRoomType
  );
}

const MediaGridPhotoCard = memo(MediaGridPhotoCardComponent, arePhotoCardPropsEqual);
export default MediaGridPhotoCard;
