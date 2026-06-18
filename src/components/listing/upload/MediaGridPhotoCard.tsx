import React, { memo } from 'react';
import { Box, Typography, IconButton, Checkbox, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ImageTypeSelector from './ImageTypeSelector';
import { type ImageType } from '../../../services/imageTypesService';
import { MEDIA_GRID_THEME as T } from './mediaGridConstants';

export interface MediaGridListingImage {
  fileName?: string;
  imageTypeId?: string;
  imageTypeRuId?: number[];
  sortOrder?: number;
  url: string;
}

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
}: MediaGridPhotoCardProps) {
  const dimUnselected = selectionMode && !isSelected;

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
        </Box>
      )}
    </Box>
  );
}

function arePhotoCardPropsEqual(
  prev: MediaGridPhotoCardProps,
  next: MediaGridPhotoCardProps,
): boolean {
  return (
    prev.originalIndex === next.originalIndex &&
    prev.img.url === next.img.url &&
    prev.img.imageTypeId === next.img.imageTypeId &&
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
    prev.onCardClick === next.onCardClick &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onSetMain === next.onSetMain &&
    prev.onRemove === next.onRemove &&
    prev.onTypeChange === next.onTypeChange &&
    prev.onStartTypeEdit === next.onStartTypeEdit
  );
}

const MediaGridPhotoCard = memo(MediaGridPhotoCardComponent, arePhotoCardPropsEqual);
export default MediaGridPhotoCard;
