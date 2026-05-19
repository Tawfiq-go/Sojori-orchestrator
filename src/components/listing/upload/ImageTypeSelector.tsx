import React, { memo } from 'react';
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

  const isMainImage = (imageTypeId: string): boolean => {
    const imageType = imageTypes.find((type) => type._id === imageTypeId);
    return (
      imageType?.sojoriName?.en === 'Main Image' ||
      (imageType?.rentalAmenityIds && imageType.rentalAmenityIds.includes(1)) ||
      false
    );
  };

  const hasExistingMainImage = () => {
    return existingImages.some((img) => img.url && img.url.trim() !== '' && img.imageTypeId && isMainImage(img.imageTypeId));
  };

  const isImageTypeAlreadySelected = (typeId: string): boolean => {
    return selectedFiles.some((f) => f.id !== currentFileId && f.imageTypeId === typeId);
  };

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

  const isTypeDisabled = (type: ImageType): boolean => {
    if (isMainImage(type._id) && hasExistingMainImage()) return true;
    if (isMainImage(type._id) && isImageTypeAlreadySelected(type._id)) return true;
    return false;
  };

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
        value={value}
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
        {imageTypes.map((type) => (
          <MenuItem key={type._id} value={type._id} disabled={isTypeDisabled(type)}>
            {getDisplayName(type)}
            {isMainImage(type._id) && ' ⭐'}
            {isTypeDisabled(type) && ' (déjà utilisé)'}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default memo(ImageTypeSelector);
