import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { uploadImageResetAction } from '../../../redux/slices/UploadSlice';
import { LISTING_MEDIA_ACCEPT, MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT, MAX_FILE_SIZE } from '../../../utils/upload/dropzoneConfig';
import { logListingMedia } from '../../../utils/upload/helpers';
import {
  formatUploadError,
  uploadMultipleInBatches,
  UPLOAD_MAX_FILES_PER_REQUEST,
} from '../../../utils/upload/uploadInBatches';
import { getImageTypesSojori, type ImageType } from '../../../services/imageTypesService';
import listingsService from '../../../services/listingsService';
import { cleanListingImagesForPayload } from '../../../utils/listingFormV2ApiAdapter';
import UploadDialog from './UploadDialog';
import type { RootState } from '../../../redux/store';

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

interface MediaGridProps {
  listingId?: string;
  listingImages: ListingImage[];
  onChange: (images: ListingImage[]) => void;
  /** Après persistance API réussie (invalidation cache parent). */
  onImagesPersisted?: (images: ListingImage[]) => void;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  listingId,
  listingImages,
  onChange,
  onImagesPersisted,
}) => {
  const dispatch = useDispatch();
  const upload = useSelector((state: RootState) => state.uploadData);
  const { loading } = upload;

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [imageTypes, setImageTypes] = useState<ImageType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [imageToMove, setImageToMove] = useState<number | null>(null);
  const [persisting, setPersisting] = useState(false);

  const onImagesPersistedRef = useRef(onImagesPersisted);
  onImagesPersistedRef.current = onImagesPersisted;

  /** Enregistre listingImages sur le listing (update-property) — pas besoin du bouton Sauvegarder global. */
  const persistListingImages = useCallback(
    async (updatedImages: ListingImage[], action: string, successMessage?: string): Promise<void> => {
      if (!listingId) {
        onChange(updatedImages);
        if (successMessage) toast.success(successMessage);
        return;
      }

      setPersisting(true);
      logListingMedia('grid.persist.start', { action, count: updatedImages.length, listingId });
      try {
        await listingsService.updateListingProperty(listingId, {
          listingImages: cleanListingImagesForPayload(updatedImages),
        });
        onChange(updatedImages);
        onImagesPersistedRef.current?.(updatedImages);
        logListingMedia('grid.persist.ok', { action, count: updatedImages.length });
        toast.success(successMessage || 'Photos enregistrées sur le listing');
      } catch (error: unknown) {
        logListingMedia('grid.persist.err', { action, error: formatUploadError(error) });
        toast.error(`Échec enregistrement photos: ${formatUploadError(error)}`);
        throw error;
      } finally {
        setPersisting(false);
      }
    },
    [listingId, onChange],
  );

  useEffect(() => {
    const fetchImageTypes = async () => {
      setLoadingTypes(true);
      try {
        const response = await getImageTypesSojori({ priority: '1,2,3' });
        if (response.data && response.data.data) {
          setImageTypes(response.data.data);
        }
      } catch (error) {
        toast.error('Failed to load image types');
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchImageTypes();
  }, []);

  const checkImageDimensions = (file: File): Promise<{ width: number; height: number; isValid: boolean }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          isValid: img.width >= MIN_IMAGE_WIDTH && img.height >= MIN_IMAGE_HEIGHT,
        });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0, isValid: false });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const getMainImageType = (): ImageType | undefined => {
    if (!imageTypes?.length) return undefined;
    let mainType = imageTypes.find((type) => type.sojoriName?.en === 'Main Image');
    if (!mainType) {
      mainType = imageTypes.find((type) => type.rentalAmenityIds && type.rentalAmenityIds.includes(1));
    }
    return mainType || imageTypes[0];
  };

  const getDefaultNonMainImageType = (): ImageType | undefined => {
    if (!imageTypes?.length) return undefined;
    const mainType = getMainImageType();
    const nonMain = imageTypes.find((t) => t._id !== mainType?._id);
    return nonMain || mainType;
  };

  const isMainImage = (imageTypeId?: string): boolean => {
    if (!imageTypeId) return false;
    const imageType = imageTypes.find((type) => type._id === imageTypeId);
    return (
      imageType?.sojoriName?.en === 'Main Image' ||
      (imageType?.rentalAmenityIds && imageType.rentalAmenityIds.includes(1)) ||
      false
    );
  };

  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    let s = url.trim();
    if (/^https?:\/\/storage\.googleapis\.com\//i.test(s)) return s;
    return s;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) {
        return;
      }

      logListingMedia('grid.onDrop.start', {
        acceptedCount: acceptedFiles.length,
        names: acceptedFiles.map((f) => f.name),
      });

      const dimensionChecks = await Promise.all(acceptedFiles.map((file) => checkImageDimensions(file)));

      const validFiles: File[] = [];
      acceptedFiles.forEach((file, index) => {
        const dimensions = dimensionChecks[index];
        if (!dimensions.isValid) {
          toast.error(`Image ${file.name} trop petite (${dimensions.width}x${dimensions.height}). Minimum: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`);
          return;
        }
        validFiles.push(file);
      });

      if (!validFiles.length) {
        return;
      }

      if (!imageTypes.length) {
        toast.error('Types d\'images non chargés. Rafraîchissez la page.');
        return;
      }

      try {
        const batchCount = Math.ceil(validFiles.length / UPLOAD_MAX_FILES_PER_REQUEST);
        if (batchCount > 1) {
          toast.info(`Envoi en ${batchCount} lots (max ${UPLOAD_MAX_FILES_PER_REQUEST} images par lot)…`);
        }

        const filesArray = await uploadMultipleInBatches(dispatch, validFiles, 'listing', (current, total) => {
          if (total > 1) {
            toast.info(`Lot ${current}/${total}…`, { toastId: 'upload-batch' });
          }
        });

        const listingLenBefore = listingImages.length;
        const mainImageType = getMainImageType();
        const defaultType = getDefaultNonMainImageType();

        const newImages: ListingImage[] = filesArray.map((file, index) => {
          const isFirstImage = listingLenBefore === 0 && index === 0;
          const resolvedType = isFirstImage ? mainImageType : defaultType;

          return {
            fileName: file.fileName || `image_${Date.now()}_${index}`,
            imageTypeId: resolvedType?._id || '',
            imageTypeRuId: resolvedType?.rentalAmenityIds || [],
            sortOrder: listingLenBefore + index + 1,
            url: normalizeUrl(file.url),
          };
        });

        const updatedImages = [...listingImages, ...newImages];
        const mainMsg =
          listingLenBefore === 0
            ? `${validFiles.length} image(s) uploadée(s) — image principale définie`
            : `${validFiles.length} image(s) uploadée(s) et enregistrées`;
        await persistListingImages(updatedImages, 'grid.onDrop', mainMsg);
      } catch (error: unknown) {
        toast.error(`Échec: ${formatUploadError(error)}`);
      } finally {
        dispatch(uploadImageResetAction());
      }
    },
    [listingImages, imageTypes, dispatch, persistListingImages],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: LISTING_MEDIA_ACCEPT,
    maxSize: MAX_FILE_SIZE,
    noClick: true,
  });

  const handleFilesUpload = async (
    files: Array<{ file: File; imageTypeId: string | null }>,
    onProgress?: (progress: { current: number; total: number }) => void,
  ) => {
    const validFiles = files.map((f) => f.file);
    const batchCount = Math.ceil(validFiles.length / UPLOAD_MAX_FILES_PER_REQUEST);

    logListingMedia('grid.dialogUpload.start', {
      count: validFiles.length,
      batchCount,
    });

    try {
      if (batchCount > 1) {
        toast.info(`Envoi de ${validFiles.length} images en ${batchCount} lots…`, { toastId: 'upload-batch-info' });
      }

      const filesArray = await uploadMultipleInBatches(dispatch, validFiles, 'listing', (current, total) => {
        onProgress?.({ current, total });
        logListingMedia('grid.dialogUpload.batch', { current, total });
      });

      const listingLenBefore = listingImages.length;
      const newImages: ListingImage[] = filesArray.map((file, index) => {
        const correspondingFile = files[index];
        const imageTypeId = correspondingFile.imageTypeId || '';
        const imageType = imageTypes.find((t) => t._id === imageTypeId);

        return {
          fileName: file.fileName || `image_${Date.now()}_${index}`,
          imageTypeId,
          imageTypeRuId: imageType?.rentalAmenityIds || [],
          sortOrder: listingLenBefore + index + 1,
          url: normalizeUrl(file.url),
        };
      });

      const updatedImages = [...listingImages, ...newImages];
      await persistListingImages(
        updatedImages,
        'grid.dialogUpload',
        `${validFiles.length} image(s) uploadée(s) et enregistrées sur le listing`,
      );
      logListingMedia('grid.dialogUpload.done', { uploaded: filesArray.length });
    } catch (error: unknown) {
      logListingMedia('grid.dialogUpload.err', { error: formatUploadError(error) });
      toast.error(`Échec de l'upload: ${formatUploadError(error)}`);
      throw error;
    } finally {
      dispatch(uploadImageResetAction());
    }
  };

  const handleRemove = async (index: number) => {
    const removed = listingImages[index];
    logListingMedia('grid.remove.request', {
      index,
      listLen: listingImages.length,
      urlTail: typeof removed?.url === 'string' ? removed.url.slice(-72) : null,
    });
    const updatedImages = listingImages.filter((_, i) => i !== index);
    updatedImages.forEach((img, i) => {
      img.sortOrder = i + 1;
    });
    try {
      await persistListingImages(updatedImages, 'grid.remove', 'Image supprimée (listing + GCS)');
      logListingMedia('grid.remove.done', { newLen: updatedImages.length });
    } catch {
      // toast déjà affiché
    }
  };

  const handleSetMainImage = async (index: number) => {
    const updatedImages = [...listingImages];
    const mainImageType = getMainImageType();

    // Remove main image type from all images
    updatedImages.forEach((img) => {
      if (isMainImage(img.imageTypeId)) {
        img.imageTypeId = '';
        img.imageTypeRuId = [];
      }
    });

    // Set the selected image as main
    updatedImages[index].imageTypeId = mainImageType?._id || '';
    updatedImages[index].imageTypeRuId = mainImageType?.rentalAmenityIds || [];

    // Move to first position
    const mainImage = updatedImages[index];
    updatedImages.splice(index, 1);
    updatedImages.unshift(mainImage);

    // Update sort orders
    updatedImages.forEach((img, i) => {
      img.sortOrder = i + 1;
    });

    try {
      await persistListingImages(updatedImages, 'grid.setMain', 'Image principale mise à jour');
    } catch {
      // toast déjà affiché
    }
  };

  const handleImageClick = async (index: number) => {
    if (imageToMove === null) {
      setImageToMove(index);
      toast.info('Image sélectionnée. Cliquez sur une autre pour la déplacer.');
    } else if (imageToMove === index) {
      setImageToMove(null);
      toast.info('Déplacement annulé.');
    } else {
      const updatedImages = [...listingImages];
      const draggedImage = updatedImages[imageToMove];
      updatedImages.splice(imageToMove, 1);
      updatedImages.splice(index, 0, draggedImage);

      updatedImages.forEach((img, i) => {
        img.sortOrder = i + 1;
      });

      try {
        await persistListingImages(updatedImages, 'grid.reorder', 'Ordre des photos enregistré');
        setImageToMove(null);
      } catch {
        // toast déjà affiché
      }
    }
  };

  const PHOTO_GRADIENTS = [
    'linear-gradient(135deg,#fde68a,#d97706)',
    'linear-gradient(135deg,#a5f3fc,#0e7490)',
    'linear-gradient(135deg,#86efac,#16a34a)',
    'linear-gradient(135deg,#f9a8d4,#ec4899)',
    'linear-gradient(135deg,#fcd34d,#b45309)',
    'linear-gradient(135deg,#bef264,#65a30d)',
    'linear-gradient(135deg,#ddd6fe,#7c3aed)',
    'linear-gradient(135deg,#fed7aa,#9a3412)',
  ];

  return (
    <Box {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Upload zone */}
      <Box
        sx={{
          border: `2px dashed ${isDragActive ? T.primary : T.borderStrong}`,
          borderRadius: 1.25,
          p: 2.5,
          mb: 1.75,
          bgcolor: isDragActive ? T.primaryTint : T.bg2,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => setUploadDialogOpen(true)}
      >
        <Typography sx={{ fontSize: 34 }}>📤</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 1 }}>
          {isDragActive ? 'Déposez ici...' : 'Glisser-déposer vos photos ici'}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.5 }}>
          JPG, PNG, WEBP · min {MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT} px · max {Math.round(MAX_FILE_SIZE / 1024 / 1024)} Mo par photo
        </Typography>
        <Button
          sx={{
            mt: 1.25,
            textTransform: 'none',
            fontWeight: 600,
            background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
            color: T.text,
            boxShadow: '0 1px 2px rgba(135,97,25,0.30)',
          }}
        >
          {loading ? <CircularProgress size={20} /> : 'Parcourir les fichiers'}
        </Button>
      </Box>

      {/* Images grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 1.25,
        }}
      >
        {listingImages.map((img, idx) => {
          // console.log(`🔍 [MediaGrid] Rendering image ${idx}`, { url: img.url, fileName: img.fileName, imageTypeId: img.imageTypeId });
          return (
          <Box
            key={idx}
            onClick={() => handleImageClick(idx)}
            sx={{
              position: 'relative',
              aspectRatio: '4/3',
              borderRadius: 1.125,
              background: img.url
                ? `url(${img.url}) center/cover`
                : PHOTO_GRADIENTS[idx % PHOTO_GRADIENTS.length],
              cursor: imageToMove === null ? 'pointer' : imageToMove === idx ? 'grab' : 'copy',
              overflow: 'hidden',
              border: imageToMove === idx ? `3px solid ${T.primary}` : 'none',
              opacity: imageToMove !== null && imageToMove !== idx ? 0.6 : 1,
              transition: 'all 0.2s',
              '&:hover .photo-actions': { opacity: 1 },
            }}
          >
            {/* Order badge */}
            <Box
              sx={{
                position: 'absolute',
                top: 6,
                left: 6,
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

            {/* Main image badge */}
            {isMainImage(img.imageTypeId) && (
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
                  letterSpacing: '0.04em',
                }}
              >
                COVER
              </Box>
            )}

            {/* Actions */}
            <Box
              className="photo-actions"
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: '6px 8px',
                opacity: 0,
                transition: 'opacity 0.15s',
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 0.625,
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetMainImage(idx);
                }}
                sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,0.95)' }}
              >
                {isMainImage(img.imageTypeId) ? <StarIcon sx={{ fontSize: 14 }} /> : <StarBorderIcon sx={{ fontSize: 14 }} />}
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRemove(idx);
                }}
                sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,0.95)' }}
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>
        );
        })}
      </Box>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onFilesUpload={handleFilesUpload}
        existingImages={listingImages}
      />
    </Box>
  );
};

export default MediaGrid;
