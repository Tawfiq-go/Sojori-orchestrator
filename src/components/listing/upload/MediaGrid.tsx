import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Checkbox,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { uploadImageResetAction } from '../../../redux/slices/UploadSlice';
import { LISTING_MEDIA_ACCEPT, MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT, MAX_FILE_SIZE } from '../../../utils/upload/dropzoneConfig';
import { logListingMedia } from '../../../utils/upload/helpers';
import {
  formatUploadError,
  uploadMultipleInBatches,
  UPLOAD_BATCH_SIZE,
} from '../../../utils/upload/uploadInBatches';
import type { UploadProgressInfo } from '../../../utils/upload/uploadInBatches';
import type { UploadBatchProgress } from './UploadDialog';
import { getImageTypesSojori, type ImageType } from '../../../services/imageTypesService';
import listingsService from '../../../services/listingsService';
import { cleanListingImagesForPayload } from '../../../utils/listingFormV2ApiAdapter';
import UploadDialog from './UploadDialog';
import ImageTypeSelector from './ImageTypeSelector';
import {
  getImageCategoryLabel,
  getImageTypeDisplayName,
  isImageCategoryUndefined,
} from '../../../utils/upload/imageTypeDisplay';
import type { RootState } from '../../../redux/store';

const GALLERY_TAB_ALL = 'all';
const GALLERY_TAB_NONE = '__none__';

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
  /** Si false, la zone d’upload est repliée (galerie visible en premier). */
  defaultUploadExpanded?: boolean;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  listingId,
  listingImages,
  onChange,
  onImagesPersisted,
  defaultUploadExpanded = false,
}) => {
  const dispatch = useDispatch();
  const upload = useSelector((state: RootState) => state.uploadData);
  const { loading } = upload;

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [imageTypes, setImageTypes] = useState<ImageType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [imageToMove, setImageToMove] = useState<number | null>(null);
  const [persisting, setPersisting] = useState(false);
  /** Après upload : onglet « Tout » actif. */
  const [galleryTab, setGalleryTab] = useState<string>(GALLERY_TAB_ALL);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [uploadExpanded, setUploadExpanded] = useState(defaultUploadExpanded);

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

  const galleryTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string; count: number }> = [
      { id: GALLERY_TAB_ALL, label: 'Tout', count: listingImages.length },
    ];
    const noneCount = listingImages.filter((img) => !String(img.imageTypeId || '').trim()).length;
    if (noneCount > 0) {
      tabs.push({ id: GALLERY_TAB_NONE, label: 'Non défini', count: noneCount });
    }
    for (const type of imageTypes) {
      const count = listingImages.filter((img) => String(img.imageTypeId) === String(type._id)).length;
      if (count > 0) {
        tabs.push({ id: type._id, label: getImageTypeDisplayName(type), count });
      }
    }
    return tabs;
  }, [listingImages, imageTypes]);

  const visibleImages = useMemo(() => {
    const rows = listingImages.map((img, originalIndex) => ({ img, originalIndex }));
    if (galleryTab === GALLERY_TAB_ALL) return rows;
    if (galleryTab === GALLERY_TAB_NONE) {
      return rows.filter(({ img }) => !String(img.imageTypeId || '').trim());
    }
    return rows.filter(({ img }) => String(img.imageTypeId) === galleryTab);
  }, [listingImages, galleryTab]);

  useEffect(() => {
    if (!galleryTabs.some((t) => t.id === galleryTab)) {
      setGalleryTab(GALLERY_TAB_ALL);
    }
  }, [galleryTabs, galleryTab]);

  useEffect(() => {
    setSelectedIndices(new Set());
  }, [galleryTab]);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIndices(new Set());
    setBulkCategoryId('');
    setImageToMove(null);
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      exitSelectionMode();
      return;
    }
    setImageToMove(null);
    setSelectionMode(true);
    setSelectedIndices(new Set());
  };

  const toggleSelectIndex = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const visibleOriginalIndices = useMemo(
    () => visibleImages.map(({ originalIndex }) => originalIndex),
    [visibleImages],
  );

  const allVisibleSelected =
    visibleOriginalIndices.length > 0 &&
    visibleOriginalIndices.every((i) => selectedIndices.has(i));

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        visibleOriginalIndices.forEach((i) => next.delete(i));
        return next;
      });
      return;
    }
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      visibleOriginalIndices.forEach((i) => next.add(i));
      return next;
    });
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIndices.size === 0) return;
    const toRemove = new Set(selectedIndices);
    const updatedImages = listingImages
      .filter((_, i) => !toRemove.has(i))
      .map((img, i) => ({ ...img, sortOrder: i + 1 }));
    try {
      await persistListingImages(
        updatedImages,
        'grid.bulkDelete',
        `${toRemove.size} image(s) supprimée(s)`,
      );
      exitSelectionMode();
    } catch {
      // toast déjà affiché
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const handleBulkCategoryApply = async () => {
    if (selectedIndices.size === 0) {
      toast.warning('Sélectionnez au moins une image');
      return;
    }
    if (!bulkCategoryId) {
      toast.warning('Choisissez une catégorie à appliquer');
      return;
    }
    if (isMainImage(bulkCategoryId) && selectedIndices.size > 1) {
      toast.error('Image principale : sélectionnez une seule image');
      return;
    }
    const selectedType = imageTypes.find((t) => t._id === bulkCategoryId);
    const updatedImages = [...listingImages];
    selectedIndices.forEach((idx) => {
      updatedImages[idx] = {
        ...updatedImages[idx],
        imageTypeId: bulkCategoryId,
        imageTypeRuId: selectedType?.rentalAmenityIds || [],
      };
    });
    try {
      await persistListingImages(
        updatedImages,
        'grid.bulkCategory',
        `Catégorie appliquée sur ${selectedIndices.size} image(s)`,
      );
      setSelectedIndices(new Set());
    } catch {
      // toast déjà affiché
    }
  };

  const handleCardClick = (idx: number) => {
    if (selectionMode) {
      toggleSelectIndex(idx);
      return;
    }
    void handleImageClick(idx);
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
        const filesArray = await uploadMultipleInBatches(dispatch, validFiles, 'listing', (info) => {
          if (info.filesUploaded > 0 && info.filesUploaded < info.filesTotal) {
            toast.info(`${info.filesUploaded} / ${info.filesTotal} images…`, { toastId: 'upload-batch' });
          }
        });

        const listingLenBefore = listingImages.length;

        const newImages: ListingImage[] = filesArray.map((file, index) => ({
          fileName: file.fileName || `image_${Date.now()}_${index}`,
          imageTypeId: '',
          imageTypeRuId: [],
          sortOrder: listingLenBefore + index + 1,
          url: normalizeUrl(file.url),
        }));

        const updatedImages = [...listingImages, ...newImages];
        await persistListingImages(
          updatedImages,
          'grid.onDrop',
          `${validFiles.length} image(s) uploadée(s) — assignez une catégorie si besoin`,
        );
        setGalleryTab(GALLERY_TAB_ALL);
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
    onProgress?: (progress: UploadBatchProgress) => void,
  ) => {
    const validFiles = files.map((f) => f.file);
    const batchCount = Math.ceil(validFiles.length / UPLOAD_BATCH_SIZE);
    const filesTotal = validFiles.length;

    logListingMedia('grid.dialogUpload.start', {
      count: validFiles.length,
      batchCount,
    });

    try {
      const filesArray = await uploadMultipleInBatches(dispatch, validFiles, 'listing', (info: UploadProgressInfo) => {
        onProgress?.({ ...info, phase: 'upload' });
        logListingMedia('grid.dialogUpload.batch', info);
      });

      const listingLenBefore = listingImages.length;
      const newImages: ListingImage[] = filesArray.map((file, index) => {
        const correspondingFile = files[index];
        const imageTypeId = correspondingFile.imageTypeId ? String(correspondingFile.imageTypeId) : '';
        const imageType = imageTypeId ? imageTypes.find((t) => t._id === imageTypeId) : undefined;

        return {
          fileName: file.fileName || `image_${Date.now()}_${index}`,
          imageTypeId,
          imageTypeRuId: imageType?.rentalAmenityIds || [],
          sortOrder: listingLenBefore + index + 1,
          url: normalizeUrl(file.url),
        };
      });

      const updatedImages = [...listingImages, ...newImages];
      onProgress?.({
        batchCurrent: 0,
        batchTotal: 0,
        filesUploaded: filesTotal,
        filesTotal,
        phase: 'save',
      });
      await persistListingImages(
        updatedImages,
        'grid.dialogUpload',
        `${validFiles.length} image(s) uploadée(s) et enregistrées sur le listing`,
      );
      logListingMedia('grid.dialogUpload.done', { uploaded: filesArray.length });
      setGalleryTab(GALLERY_TAB_ALL);
    } catch (error: unknown) {
      logListingMedia('grid.dialogUpload.err', { error: formatUploadError(error) });
      toast.error(`Échec de l'upload: ${formatUploadError(error)}`);
      throw error;
    } finally {
      dispatch(uploadImageResetAction());
    }
  };

  const handleChangeImageType = async (index: number, typeId: string | null) => {
    const selectedType = imageTypes.find((t) => t._id === typeId);
    const updatedImages = [...listingImages];
    updatedImages[index] = {
      ...updatedImages[index],
      imageTypeId: typeId || '',
      imageTypeRuId: selectedType?.rentalAmenityIds || [],
    };
    try {
      await persistListingImages(updatedImages, 'grid.typeChange', 'Catégorie mise à jour');
    } catch {
      // toast déjà affiché
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

  const openUploadDialog = () => {
    setUploadDialogOpen(true);
  };

  return (
    <Box {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Barre compacte : galerie d’abord, upload à la demande */}
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.25 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={(e) => {
            e.stopPropagation();
            openUploadDialog();
          }}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: T.primary,
            color: '#fff',
            '&:hover': { bgcolor: T.primaryDeep },
          }}
        >
          Ajouter des photos
        </Button>
        <Button
          size="small"
          variant="outlined"
          endIcon={uploadExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={(e) => {
            e.stopPropagation();
            setUploadExpanded((v) => !v);
          }}
          sx={{ textTransform: 'none', fontWeight: 600, borderColor: T.borderStrong, color: T.text2 }}
        >
          {uploadExpanded ? 'Masquer la zone d’envoi' : 'Glisser-déposer'}
        </Button>
        {isDragActive && (
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.primaryDeep }}>
            Déposez pour ajouter…
          </Typography>
        )}
      </Stack>

      <Collapse in={uploadExpanded}>
        <Box
          sx={{
            border: `2px dashed ${isDragActive ? T.primary : T.borderStrong}`,
            borderRadius: 1.25,
            p: 2,
            mb: 1.5,
            bgcolor: isDragActive ? T.primaryTint : T.bg2,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={(e) => {
            e.stopPropagation();
            openUploadDialog();
          }}
        >
          <Typography sx={{ fontSize: 28 }}>📤</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, mt: 0.75 }}>
            Glisser-déposer ou cliquer pour parcourir
          </Typography>
          <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.35 }}>
            JPG, PNG, WEBP · min {MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT} px · max{' '}
            {Math.round(MAX_FILE_SIZE / 1024 / 1024)} Mo
          </Typography>
        </Box>
      </Collapse>

      {listingImages.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          gap={1}
          sx={{ mb: 1 }}
        >
          <Button
            size="small"
            variant={selectionMode ? 'contained' : 'outlined'}
            onClick={toggleSelectionMode}
            startIcon={selectionMode ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
              ...(selectionMode
                ? { bgcolor: T.primary, color: '#fff', '&:hover': { bgcolor: T.primaryDeep } }
                : { borderColor: T.borderStrong, color: T.text2 }),
            }}
          >
            {selectionMode ? 'Annuler la sélection' : 'Sélection multiple'}
          </Button>
          {selectionMode && (
            <Typography sx={{ fontSize: 12, color: T.text2, fontWeight: 600 }}>
              {selectedIndices.size} sélectionnée{selectedIndices.size > 1 ? 's' : ''}
            </Typography>
          )}
        </Stack>
      )}

      {selectionMode && listingImages.length > 0 && (
        <Box
          sx={{
            mb: 1.5,
            p: 1.25,
            borderRadius: 1,
            bgcolor: T.primaryTint,
            border: `1px solid rgba(184,133,26,0.25)`,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
            <Button
              size="small"
              onClick={handleSelectAllVisible}
              sx={{ textTransform: 'none', fontWeight: 600, color: T.primaryDeep }}
            >
              {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'} ({visibleOriginalIndices.length}{' '}
              visibles)
            </Button>
            <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
              <ImageTypeSelector
                value={bulkCategoryId}
                onChange={(typeId) => setBulkCategoryId(typeId || '')}
                imageTypes={imageTypes}
                disabled={loadingTypes || persisting || selectedIndices.size === 0}
                existingImages={listingImages}
              />
            </FormControl>
            <Button
              size="small"
              variant="contained"
              disabled={selectedIndices.size === 0 || !bulkCategoryId || persisting}
              onClick={() => void handleBulkCategoryApply()}
              sx={{ textTransform: 'none', bgcolor: T.primary, color: '#fff' }}
            >
              Changer catégorie
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={selectedIndices.size === 0 || persisting}
              onClick={() => setDeleteConfirmOpen(true)}
              startIcon={<DeleteIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Supprimer ({selectedIndices.size})
            </Button>
          </Stack>
        </Box>
      )}

      {listingImages.length > 0 && (
        <Tabs
          value={galleryTab}
          onChange={(_, value) => setGalleryTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 1.5,
            minHeight: 40,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 12.5,
              minHeight: 40,
              py: 0.5,
            },
            '& .Mui-selected': { color: T.primaryDeep },
            '& .MuiTabs-indicator': { bgcolor: T.primary },
          }}
        >
          {galleryTabs.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={`${tab.label} (${tab.count})`} />
          ))}
        </Tabs>
      )}

      {/* Images grid */}
      {visibleImages.length === 0 && listingImages.length > 0 ? (
        <Typography sx={{ fontSize: 13, color: T.text3, py: 2, textAlign: 'center' }}>
          Aucune image dans cette catégorie.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 1.25,
          }}
        >
          {visibleImages.map(({ img, originalIndex: idx }) => {
            const categoryLabel = getImageCategoryLabel(img.imageTypeId, imageTypes);
            const undefinedCategory = isImageCategoryUndefined(img.imageTypeId);
            const isSelected = selectedIndices.has(idx);
            return (
              <Box
                key={`${idx}-${img.url}`}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 1.125,
                  overflow: 'hidden',
                  border: `2px solid ${
                    isSelected ? T.primary : imageToMove === idx ? T.primary : T.border
                  }`,
                  bgcolor: T.bg1,
                  boxShadow: isSelected ? `0 0 0 2px ${T.primaryTint}` : 'none',
                  opacity: selectionMode && selectedIndices.size > 0 && !isSelected ? 0.85 : 1,
                }}
              >
                <Box
                  onClick={() => handleCardClick(idx)}
                  sx={{
                    position: 'relative',
                    aspectRatio: '4/3',
                    background: img.url
                      ? `url(${img.url}) center/cover`
                      : PHOTO_GRADIENTS[idx % PHOTO_GRADIENTS.length],
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
                        toggleSelectIndex(idx);
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
                      right: isMainImage(img.imageTypeId) ? 52 : 6,
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
                        void handleSetMainImage(idx);
                      }}
                      sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,0.95)' }}
                    >
                      {isMainImage(img.imageTypeId) ? (
                        <StarIcon sx={{ fontSize: 14 }} />
                      ) : (
                        <StarBorderIcon sx={{ fontSize: 14 }} />
                      )}
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

                <Box
                  sx={{ px: 0.5, py: 0.5, bgcolor: T.bg2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ImageTypeSelector
                    value={img.imageTypeId || ''}
                    onChange={(typeId) => void handleChangeImageType(idx, typeId)}
                    imageTypes={imageTypes}
                    disabled={loadingTypes || persisting}
                    existingImages={listingImages}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onFilesUpload={handleFilesUpload}
        existingImages={listingImages}
      />

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !persisting && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2.5,
              overflow: 'hidden',
              border: `1px solid ${T.borderStrong}`,
              boxShadow: '0 12px 40px rgba(20,17,10,0.14)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            pt: 2.5,
            pb: 0.5,
            background: 'linear-gradient(180deg, rgba(220,38,38,0.08) 0%, rgba(255,255,255,0) 100%)',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                bgcolor: 'rgba(220,38,38,0.12)',
                border: '1px solid rgba(220,38,38,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <WarningAmberRoundedIcon sx={{ color: '#dc2626', fontSize: 26 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                Supprimer les images sélectionnées ?
              </Typography>
              <Typography sx={{ fontSize: 13, color: T.text2, mt: 1, lineHeight: 1.5 }}>
                {selectedIndices.size === 1
                  ? 'Cette image sera supprimée définitivement du listing.'
                  : `${selectedIndices.size} images seront supprimées définitivement du listing.`}
              </Typography>
              <Box
                sx={{
                  mt: 1.25,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1,
                  bgcolor: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.18)',
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#b91c1c' }}>
                  Action irréversible.
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>
        <DialogActions
          sx={{
            px: 2.5,
            py: 2,
            gap: 1,
            bgcolor: T.bg2,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            disabled={persisting}
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: T.borderStrong,
              color: T.text2,
              bgcolor: T.bg1,
              '&:hover': { borderColor: T.text3, bgcolor: T.bg1 },
            }}
          >
            Annuler
          </Button>
          <Button
            fullWidth
            variant="contained"
            disabled={persisting}
            onClick={() => void handleBulkDeleteConfirm()}
            startIcon={persisting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#dc2626',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(220,38,38,0.35)',
              '&:hover': { bgcolor: '#b91c1c' },
              '&.Mui-disabled': { bgcolor: 'rgba(220,38,38,0.4)', color: '#fff' },
            }}
          >
            {persisting ? 'Suppression…' : 'Supprimer définitivement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MediaGrid;
