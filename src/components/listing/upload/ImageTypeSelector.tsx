import React, { memo, useMemo } from 'react';
import { FormControl, Select, MenuItem, type SelectChangeEvent } from '@mui/material';
import { type ImageType } from '../../../services/imageTypesService';

interface ImageTypeSelectorProps {
  value: string;
  onChange: (typeId: string | null) => void;
  imageTypes: ImageType[];
  disabled?: boolean;
  existingImages?: Array<{ url: string; imageTypeId?: string }>;
  currentFileId?: string;
  selectedFiles?: Array<{ id: string; imageTypeId: string | null }>;
}

const ImageTypeSelector: React.FC<ImageTypeSelectorProps> = ({
  value,
  onChange,
  imageTypes,
  disabled = false,
  existingImages = [],
  currentFileId,
  selectedFiles = [],
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    const newValue = event.target.value;
    onChange(newValue === '' ? null : newValue);
  };

  const mainImageTypeId = useMemo(() => {
    let mainType = imageTypes.find((type) => type.sojoriName?.en === 'Main Image');
    if (!mainType) {
      mainType = imageTypes.find((type) => type.rentalAmenityIds?.includes(1));
    }
    return mainType?._id ?? null;
  }, [imageTypes]);

  const hasExistingMainImage = useMemo(
    () =>
      Boolean(
        mainImageTypeId &&
          existingImages.some(
            (img) =>
              img.url &&
              img.url.trim() !== '' &&
              img.imageTypeId &&
              img.imageTypeId === mainImageTypeId,
          ),
      ),
    [existingImages, mainImageTypeId],
  );

  const isImageTypeAlreadySelected = (typeId: string): boolean =>
    selectedFiles.some((f) => f.id !== currentFileId && f.imageTypeId === typeId);

  const disabledTypeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!mainImageTypeId) return ids;
    for (const type of imageTypes) {
      if (type._id !== mainImageTypeId) continue;
      if (hasExistingMainImage) ids.add(type._id);
      if (isImageTypeAlreadySelected(type._id)) ids.add(type._id);
    }
    return ids;
  }, [imageTypes, mainImageTypeId, hasExistingMainImage, selectedFiles, currentFileId]);

  const getDisplayName = (imageType: ImageType): string => {
    if (!imageType) return '';
    if (imageType.sojoriName && typeof imageType.sojoriName === 'object') {
      if (imageType.sojoriName.fr) return imageType.sojoriName.fr;
      if (imageType.sojoriName.en) return imageType.sojoriName.en;
      const firstAvailable = Object.values(imageType.sojoriName)[0];
      if (firstAvailable) return firstAvailable;
    }
    return imageType.airbnbCategory || imageType.bookingCategory || 'Unknown';
  };

  const isTypeDisabled = (type: ImageType): boolean => disabledTypeIds.has(type._id);

  const isKnownTypeId = (typeId: string) => imageTypes.some((t) => t._id === typeId);
  const legacyTypeId =
    value && String(value).trim() !== '' && !isKnownTypeId(String(value)) ? String(value) : null;
  const selectValue = legacyTypeId ? legacyTypeId : value || '';

  if (!imageTypes || imageTypes.length === 0) {
    return (
      <FormControl fullWidth size="small" disabled>
        <Select value="" displayEmpty sx={{ fontSize: '0.75rem', bgcolor: '#fafafa' }}>
          <MenuItem value="">
            <em>Types non disponibles</em>
          </MenuItem>
        </Select>
      </FormControl>
    );
  }

  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <Select
        value={selectValue}
        onChange={handleChange}
        displayEmpty
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          fontSize: '0.75rem',
          border: '1px solid #e0e0e0',
          '& .MuiSelect-select': {
            padding: '6px 10px',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        }}
      >
        <MenuItem value="">
          <em>Sélectionner un type</em>
        </MenuItem>
        {legacyTypeId && (
          <MenuItem value={legacyTypeId} disabled>
            <em>Type hors catalogue</em>
          </MenuItem>
        )}
        {imageTypes.map((type) => (
          <MenuItem key={type._id} value={type._id} disabled={isTypeDisabled(type)}>
            {getDisplayName(type)}
            {type._id === mainImageTypeId && ' ⭐'}
            {isTypeDisabled(type) && ' (déjà utilisé)'}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default memo(ImageTypeSelector);
