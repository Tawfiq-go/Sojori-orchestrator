import React, { useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Grid,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import PhotoIcon from '@mui/icons-material/Photo';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { LISTING_MEDIA_ACCEPT, MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT, MAX_FILE_SIZE } from '../../../utils/upload/dropzoneConfig';
import { getImageTypesSojori, type ImageType } from '../../../services/imageTypesService';
import { logListingMedia } from '../../../utils/upload/helpers';
import { UPLOAD_MAX_FILES_PER_REQUEST } from '../../../utils/upload/uploadInBatches';
import ImageTypeSelector from './ImageTypeSelector';

const UploadContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(6),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 300,
  borderWidth: 2,
  borderRadius: 12,
  borderColor: '#e0e0e0',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#666',
  outline: 'none',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: '#b8851a',
    backgroundColor: 'rgba(184,133,26,0.05)',
  },
}));

const ImageThumbnail = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  aspectRatio: '4/3',
  borderRadius: 8,
  overflow: 'hidden',
  '&:hover .delete-button': {
    opacity: 1,
  },
}));

const DeleteButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 4,
  right: 4,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  opacity: 0,
  transition: 'opacity 0.2s',
  width: 24,
  height: 24,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
}));

const AddMoreButton = styled(Box)(({ theme }) => ({
  width: '140px',
  height: '105px',
  borderRadius: 12,
  border: '2px dashed #d0d0d0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: '#fff',
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: '#b8851a',
    backgroundColor: 'rgba(184,133,26,0.08)',
    transform: 'scale(1.02)',
  },
}));

interface SelectedFile {
  file: File;
  preview: string;
  id: string;
  imageTypeId: string | null;
}

export type UploadBatchProgress = { current: number; total: number };

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onFilesUpload: (
    files: Array<{ file: File; imageTypeId: string | null }>,
    onProgress?: (progress: UploadBatchProgress) => void,
  ) => Promise<void>;
  existingImages?: Array<{ url: string; imageTypeId?: string }>;
}

const UploadDialog: React.FC<UploadDialogProps> = ({
  open,
  onClose,
  onFilesUpload,
  existingImages = [],
}) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [imageTypes, setImageTypes] = useState<ImageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadBatchProgress | null>(null);

  // Reset selected files when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedFiles([]);
    }
  }, [open]);

  // Fetch image types when dialog opens
  useEffect(() => {
    if (!open) return;

    setLoading(true);

    const fetchImageTypes = async () => {
      try {
        const response = await getImageTypesSojori({ priority: '1,2,3' });
        if (response.data?.data) {
          setImageTypes(response.data.data);
        }
      } catch {
        toast.error('Échec du chargement des types d\'images');
      } finally {
        setLoading(false);
      }
    };

    fetchImageTypes();
  }, [open]);

  const checkImageDimensions = (file: File): Promise<{ width: number; height: number; isValid: boolean; file: File }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isValid = img.width >= MIN_IMAGE_WIDTH && img.height >= MIN_IMAGE_HEIGHT;
        resolve({
          width: img.width,
          height: img.height,
          isValid,
          file,
        });
      };
      img.onerror = () => {
        resolve({
          width: 0,
          height: 0,
          isValid: false,
          file,
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[], typeId: string | null = null) => {
    if (!acceptedFiles.length) {
      return;
    }

    logListingMedia('dialog.onDrop', {
      count: acceptedFiles.length,
      names: acceptedFiles.map((f) => f.name),
      typeId: typeId || 'null',
    });

    const dimensionChecks = await Promise.all(acceptedFiles.map((file) => checkImageDimensions(file)));

    const validFiles: File[] = [];
    dimensionChecks.forEach(({ width, height, isValid, file }) => {
      if (isValid) {
        validFiles.push(file);
      } else {
        toast.error(`Image ${file.name} est trop petite (${width}x${height}px). Minimum requis: ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`);
      }
    });

    if (validFiles.length === 0) {
      toast.error(`Aucune image valide. Toutes les images doivent faire au moins ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`);
      return;
    }

    if (validFiles.length !== acceptedFiles.length) {
      toast.warning(`${acceptedFiles.length - validFiles.length} image(s) rejetée(s) car trop petites`);
    }

    const newFiles: SelectedFile[] = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      imageTypeId: typeId,
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      onDrop(files, null);
    },
    accept: LISTING_MEDIA_ACCEPT,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    noClick: false,
    noKeyboard: false,
  });

  const removeFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  const hasExistingMainImage = () => {
    return existingImages.some((img) => img.url && img.url.trim() !== '' && isMainImage(img.imageTypeId));
  };

  const handleTypeChange = (fileId: string, typeId: string | null) => {
    if (typeId && isMainImage(typeId)) {
      if (hasExistingMainImage()) {
        toast.error('Une image principale existe déjà. Veuillez la supprimer avant d\'en sélectionner une nouvelle.');
        return;
      }
      const isMainImageAlreadySelected = selectedFiles.some((f) => f.id !== fileId && isMainImage(f.imageTypeId));
      if (isMainImageAlreadySelected) {
        toast.error('Le type "Image principale" est déjà sélectionné pour un autre fichier.');
        return;
      }
    }

    setSelectedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, imageTypeId: typeId } : f)));
  };

  const resolveMainImageType = (): ImageType | null => {
    if (!imageTypes.length) return null;
    let mainType = imageTypes.find((t) => t.sojoriName?.en === 'Main Image');
    if (!mainType) {
      mainType = imageTypes.find((t) => t.rentalAmenityIds && t.rentalAmenityIds.includes(1));
    }
    return mainType || imageTypes[0];
  };

  const resolveDefaultNonMainType = (): ImageType | null => {
    const main = resolveMainImageType();
    if (!imageTypes.length) return null;
    const other = imageTypes.find((t) => t._id !== main?._id);
    return other || imageTypes[0];
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || uploading) return;

    const mainT = resolveMainImageType();
    const defaultT = resolveDefaultNonMainType();

    const anyExplicitMainInDialog = selectedFiles.some((f) => f.imageTypeId && isMainImage(f.imageTypeId));
    let mainAlreadyReserved = hasExistingMainImage() || anyExplicitMainInDialog;

    const filesWithTypes = selectedFiles.map((f) => {
      let tid = f.imageTypeId;

      if (tid) {
        return { file: f.file, imageTypeId: tid };
      }

      if (!imageTypes.length) {
        return { file: f.file, imageTypeId: null };
      }

      if (!mainAlreadyReserved && mainT) {
        tid = mainT._id;
        mainAlreadyReserved = true;
      } else {
        tid = defaultT?._id ?? mainT?._id ?? null;
      }

      return { file: f.file, imageTypeId: tid };
    });

    setUploading(true);
    setUploadProgress(null);
    try {
      await onFilesUpload(filesWithTypes, setUploadProgress);
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);
      onClose();
    } catch {
      // Erreur déjà toastée dans MediaGrid
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleCancel = () => {
    if (uploading) return;
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    onClose();
  };

  const isMainImage = (imageTypeId?: string | null): boolean => {
    if (!imageTypeId) return false;
    const imageType = imageTypes.find((type) => type._id === imageTypeId);
    return (
      imageType?.sojoriName?.en === 'Main Image' ||
      (imageType?.rentalAmenityIds && imageType.rentalAmenityIds.includes(1)) ||
      false
    );
  };

  const getDisplayName = (imageType: ImageType): string => {
    if (!imageType) return '';
    if (imageType.sojoriName && typeof imageType.sojoriName === 'object') {
      if (imageType.sojoriName.fr) return imageType.sojoriName.fr;
      if (imageType.sojoriName.en) return imageType.sojoriName.en;
      const firstAvailable = Object.values(imageType.sojoriName)[0];
      if (firstAvailable) return firstAvailable;
    }
    return imageType.airbnbCategory || imageType.bookingCategory || 'Autre';
  };

  const getFilesForType = (typeId: string | null) => {
    return selectedFiles.filter(f => f.imageTypeId === typeId);
  };

  const compactFileList = selectedFiles.length > 12;

  const renderFileThumb = (fileObj: SelectedFile, borderColor = '#e0e0e0') => (
    <Box key={fileObj.id} sx={{ width: compactFileList ? 110 : 100, flexShrink: 0 }}>
      <Box
        sx={{
          position: 'relative',
          width: compactFileList ? 110 : 100,
          height: compactFileList ? 82 : 75,
          borderRadius: 1,
          overflow: 'hidden',
          border: `2px solid ${borderColor}`,
          bgcolor: '#fff',
        }}
      >
        <img src={fileObj.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <DeleteButton className="delete-button" onClick={() => removeFile(fileObj.id)} size="small">
          <DeleteIcon sx={{ fontSize: 14 }} />
        </DeleteButton>
      </Box>
      <Box sx={{ mt: 0.5 }}>
        <ImageTypeSelector
          value={fileObj.imageTypeId || ''}
          onChange={(typeId) => handleTypeChange(fileObj.id, typeId)}
          imageTypes={imageTypes}
          disabled={loading}
          existingImages={existingImages}
          currentFileId={fileObj.id}
          selectedFiles={selectedFiles}
        />
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={uploading ? undefined : handleCancel}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            maxHeight: 'min(90vh, 900px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle sx={{ flexShrink: 0, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <IconButton onClick={handleCancel} size="small" sx={{ position: 'absolute', left: 0 }}>
            <CloseIcon />
          </IconButton>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Upload images
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', pb: 0 }}>
          {uploading && uploadProgress
            ? uploadProgress.total > 1
              ? `Envoi lot ${uploadProgress.current}/${uploadProgress.total}…`
              : `Envoi de ${selectedFiles.length} image${selectedFiles.length > 1 ? 's' : ''}…`
            : selectedFiles.length > 0
              ? `${selectedFiles.length} fichier(s) sélectionné(s)`
              : 'Aucun fichier sélectionné'}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          p: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            p: 3,
          }}
        >
        {uploading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#b8851a' }} />
            <Typography sx={{ mt: 2, fontWeight: 600 }}>
              Upload en cours…
              {uploadProgress && uploadProgress.total > 1
                ? ` (lot ${uploadProgress.current}/${uploadProgress.total})`
                : selectedFiles.length > 0
                  ? ` (${selectedFiles.length} fichier${selectedFiles.length > 1 ? 's' : ''})`
                  : ''}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 12, color: '#7a756c' }}>
              {uploadProgress && uploadProgress.total > 1
                ? `Ne fermez pas cette fenêtre — envoi par lots de ${UPLOAD_MAX_FILES_PER_REQUEST} max.`
                : 'Ne fermez pas cette fenêtre — enregistrement automatique sur le listing à la fin.'}
            </Typography>
          </Box>
        ) : loading || imageTypes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2, color: '#666' }}>
              {loading ? 'Chargement des types d\'images...' : 'Aucun type d\'image disponible'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* ZONE D'UPLOAD PRINCIPALE EN PREMIER */}
            <Box sx={{
              border: '2px dashed #b8851a',
              borderRadius: 2,
              p: 3,
              bgcolor: 'rgba(184,133,26,0.02)',
              textAlign: 'center'
            }}>
              <Typography sx={{
                fontSize: 15,
                fontWeight: 700,
                mb: 1,
                color: '#333'
              }}>
                📤 Upload images
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#666', mb: 2 }}>
                Ajoutez toutes vos images ici. Vous pourrez ensuite les organiser par catégorie.
              </Typography>

              <Box {...getRootProps()} sx={{
                cursor: 'pointer',
                py: 3,
                px: 2,
                bgcolor: '#fff',
                borderRadius: 1.5,
                border: '1px solid #e0e0e0',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(184,133,26,0.05)',
                  borderColor: '#b8851a'
                }
              }}>
                <input {...getInputProps()} />
                <CloudUploadIcon sx={{ fontSize: 48, color: '#b8851a', mb: 1 }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#333', mb: 0.5 }}>
                  {isDragActive ? 'Déposez vos images ici' : 'Cliquez pour parcourir ou glissez-déposez'}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#999' }}>
                  JPG, PNG, WEBP · plusieurs fichiers · envoi par lots de {UPLOAD_MAX_FILES_PER_REQUEST} max
                </Typography>
                {selectedFiles.length > 0 && (
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#b8851a', mt: 1.5 }}>
                    ✓ {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} au total
                  </Typography>
                )}
              </Box>
            </Box>

            {compactFileList && selectedFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: '#333' }}>
                  {selectedFiles.length} images — assignez un type à chacune
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {selectedFiles.map((fileObj) => renderFileThumb(fileObj, fileObj.imageTypeId ? '#e0e0e0' : '#f59e0b'))}
                </Box>
              </Box>
            )}

            {/* IMAGES NON CATÉGORISÉES - Affichées en priorité */}
            {!compactFileList && getFilesForType(null).length > 0 && (
              <Box sx={{
                border: '2px solid #f59e0b',
                borderRadius: 2,
                p: 2,
                bgcolor: 'rgba(245,158,11,0.05)'
              }}>
                <Typography sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  mb: 1,
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  📁 Images à catégoriser
                  <Box component="span" sx={{
                    ml: 'auto',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#f59e0b',
                    bgcolor: '#fff',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1
                  }}>
                    {getFilesForType(null).length}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#d97706', mb: 2 }}>
                  ⚠️ Assignez un type à chaque image via le menu déroulant
                </Typography>
                <Box sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5
                }}>
                  {getFilesForType(null).map((fileObj) => renderFileThumb(fileObj, '#f59e0b'))}
                </Box>
              </Box>
            )}

            {/* GALERIES PAR TYPE */}
            {!compactFileList && imageTypes.filter(type => getFilesForType(type._id).length > 0).map((type) => {
              const filesForType = getFilesForType(type._id);
              const displayName = getDisplayName(type);
              const isMain = isMainImage(type._id);

              return (
                <Box key={type._id} sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  bgcolor: '#fafafa'
                }}>
                  {/* Header */}
                  <Typography sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    mb: 1.5,
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    {displayName}
                    {isMain && ' ⭐'}
                    <Box component="span" sx={{
                      ml: 'auto',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#999',
                      bgcolor: '#fff',
                      px: 1,
                      py: 0.25,
                      borderRadius: 1
                    }}>
                      {filesForType.length} image{filesForType.length > 1 ? 's' : ''}
                    </Box>
                  </Typography>

                  {/* Gallery */}
                  <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    minHeight: 60
                  }}>
                    {filesForType.map((fileObj) => renderFileThumb(fileObj))}

                  </Box>
                </Box>
              );
            })}

          </Box>
        )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ flexShrink: 0, px: 3, pb: 3, justifyContent: 'space-between' }}>
        <Button onClick={handleCancel} color="inherit" disabled={uploading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleUpload()}
          disabled={selectedFiles.length === 0 || uploading}
          sx={{
            bgcolor: selectedFiles.length > 0 ? '#b8851a' : '#e0e0e0',
            color: selectedFiles.length > 0 ? 'white' : '#999',
            textTransform: 'none',
            '&:hover': {
              bgcolor: selectedFiles.length > 0 ? '#876119' : '#e0e0e0',
            },
          }}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadDialog;
