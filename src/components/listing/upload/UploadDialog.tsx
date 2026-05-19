import React, { useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { ModalScrollColumn } from '../../common/ModalScrollColumn';
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
import { UPLOAD_BATCH_SIZE } from '../../../utils/upload/uploadInBatches';
import type { UploadProgressInfo } from '../../../utils/upload/uploadInBatches';
import {
  getImageCategoryLabel,
  isImageCategoryUndefined,
} from '../../../utils/upload/imageTypeDisplay';
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

export type UploadBatchProgress = UploadProgressInfo & {
  phase?: 'upload' | 'save';
};

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
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const isValid = img.width >= MIN_IMAGE_WIDTH && img.height >= MIN_IMAGE_HEIGHT;
        resolve({
          width: img.width,
          height: img.height,
          isValid,
          file,
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          width: 0,
          height: 0,
          isValid: false,
          file,
        });
      };
      img.src = objectUrl;
    });
  };

  /** Vérifie les dimensions par petits groupes (évite blocage / crash avec 20+ fichiers). */
  const checkDimensionsInChunks = async (files: File[], chunkSize = 4) => {
    const results: Awaited<ReturnType<typeof checkImageDimensions>>[] = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      const part = await Promise.all(chunk.map((file) => checkImageDimensions(file)));
      results.push(...part);
      await new Promise((r) => setTimeout(r, 0));
    }
    return results;
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

    const dimensionChecks = await checkDimensionsInChunks(acceptedFiles);

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

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || uploading) return;

    /** Seul un type choisi explicitement dans le dialogue est conservé — pas d’auto-assignation. */
    const filesWithTypes = selectedFiles.map((f) => ({
      file: f.file,
      imageTypeId: f.imageTypeId || null,
    }));

    setUploading(true);
    setUploadProgress({
      batchCurrent: 0,
      batchTotal: Math.ceil(filesWithTypes.length / UPLOAD_BATCH_SIZE) || 1,
      filesUploaded: 0,
      filesTotal: filesWithTypes.length,
      phase: 'upload',
    });
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
  const manyFiles = selectedFiles.length > 6;

  const renderFileThumb = (fileObj: SelectedFile, borderColor = '#e0e0e0') => {
    const categoryLabel = getImageCategoryLabel(fileObj.imageTypeId, imageTypes);
    return (
    <Box key={fileObj.id} sx={{ width: compactFileList ? 110 : 100, flexShrink: 0 }}>
      <Box
        sx={{
          position: 'relative',
          width: compactFileList ? 110 : 100,
          borderRadius: 1,
          overflow: 'hidden',
          border: `2px solid ${borderColor}`,
          bgcolor: '#fff',
        }}
      >
        <Box sx={{ position: 'relative', height: compactFileList ? 82 : 75 }}>
          <img src={fileObj.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <DeleteButton className="delete-button" onClick={() => removeFile(fileObj.id)} size="small">
            <DeleteIcon sx={{ fontSize: 14 }} />
          </DeleteButton>
        </Box>
        <Box
          sx={{
            px: 0.75,
            py: 0.5,
            bgcolor: isImageCategoryUndefined(fileObj.imageTypeId) ? 'rgba(220,38,38,0.12)' : 'rgba(20,17,10,0.88)',
          }}
        >
          <Typography
            noWrap
            sx={{
              fontSize: 10,
              fontWeight: 700,
              color: isImageCategoryUndefined(fileObj.imageTypeId) ? '#dc2626' : '#fff',
            }}
          >
            {categoryLabel}
          </Typography>
        </Box>
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
  };

  return (
    <Dialog
      open={open}
      onClose={uploading ? undefined : handleCancel}
      maxWidth="lg"
      fullWidth
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            width: '100%',
            maxWidth: 960,
            height: manyFiles ? 'min(88vh, 820px)' : 'min(72vh, 640px)',
            maxHeight: 'calc(100vh - 32px) !important',
            overflow: 'hidden !important',
            overflowY: 'hidden !important',
            display: 'flex !important',
            flexDirection: 'column !important',
            p: 0,
            m: '16px auto',
            boxShadow: '0 32px 80px rgba(20,17,10,0.18)',
            boxSizing: 'border-box',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            px: 2,
            py: 1.75,
            borderBottom: '1px solid #eee',
            background: 'linear-gradient(180deg, #fff, #fafaf7)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <IconButton
              onClick={handleCancel}
              size="small"
              disabled={uploading}
              sx={{ position: 'absolute', left: 0 }}
            >
              <CloseIcon />
            </IconButton>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 17, fontWeight: 700 }}>Upload images</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#7a756c', mt: 0.25 }}>
                {uploading && uploadProgress
                  ? uploadProgress.phase === 'save'
                    ? 'Enregistrement sur le listing…'
                    : `${uploadProgress.filesUploaded} / ${uploadProgress.filesTotal} image${uploadProgress.filesTotal > 1 ? 's' : ''}`
                  : selectedFiles.length > 0
                    ? `${selectedFiles.length} fichier(s) sélectionné(s)`
                    : 'Aucun fichier sélectionné'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <ModalScrollColumn
          active={open}
          className="upload-images-modal-scroll"
          wrapperSx={{ minHeight: 0 }}
          innerSx={{ px: 2, py: 2 }}
        >
        {uploading ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
            <CircularProgress sx={{ color: '#b8851a' }} />
            <Typography sx={{ mt: 2, fontWeight: 600 }}>
              {uploadProgress?.phase === 'save'
                ? 'Enregistrement sur le listing…'
                : 'Upload en cours…'}
            </Typography>
            {uploadProgress && uploadProgress.filesTotal > 0 && (
              <>
                <Typography
                  sx={{
                    mt: 2,
                    fontSize: 28,
                    fontWeight: 700,
                    fontFamily: '"Geist Mono", monospace',
                    color: '#b8851a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {uploadProgress.phase === 'save'
                    ? `${uploadProgress.filesTotal} / ${uploadProgress.filesTotal}`
                    : `${uploadProgress.filesUploaded} / ${uploadProgress.filesTotal}`}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    uploadProgress.phase === 'save'
                      ? 100
                      : Math.min(
                          100,
                          Math.round((uploadProgress.filesUploaded / uploadProgress.filesTotal) * 100),
                        )
                  }
                  sx={{ mt: 2, height: 10, borderRadius: 5, bgcolor: '#eee', '& .MuiLinearProgress-bar': { bgcolor: '#b8851a' } }}
                />
              </>
            )}
            <Typography sx={{ mt: 2, fontSize: 12, color: '#7a756c' }}>
              Ne fermez pas cette fenêtre — les images sont enregistrées automatiquement sur le listing.
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Zone d’ajout : compacte si des fichiers sont déjà sélectionnés */}
            {manyFiles ? (
              <Box
                {...getRootProps()}
                sx={{
                  flexShrink: 0,
                  cursor: 'pointer',
                  py: 1.25,
                  px: 2,
                  borderRadius: 1.5,
                  border: `1px dashed ${isDragActive ? '#b8851a' : '#d0d0d0'}`,
                  bgcolor: isDragActive ? 'rgba(184,133,26,0.08)' : '#fafafa',
                  textAlign: 'center',
                }}
              >
                <input {...getInputProps()} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#555' }}>
                  {isDragActive ? 'Déposez pour ajouter…' : '+ Ajouter d’autres images (clic ou glisser-déposer)'}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  flexShrink: 0,
                  border: '2px dashed #b8851a',
                  borderRadius: 2,
                  p: 2,
                  bgcolor: 'rgba(184,133,26,0.02)',
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5, color: '#333' }}>
                  Ajoutez vos images
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#666', mb: 1.5 }}>
                  Puis assignez une catégorie à chacune (optionnel).
                </Typography>
                <Box
                  {...getRootProps()}
                  sx={{
                    cursor: 'pointer',
                    py: 2.5,
                    px: 2,
                    bgcolor: '#fff',
                    borderRadius: 1.5,
                    border: '1px solid #e0e0e0',
                    '&:hover': { bgcolor: 'rgba(184,133,26,0.05)', borderColor: '#b8851a' },
                  }}
                >
                  <input {...getInputProps()} />
                  <CloudUploadIcon sx={{ fontSize: 40, color: '#b8851a', mb: 0.5 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                    {isDragActive ? 'Déposez ici' : 'Parcourir ou glisser-déposer'}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#999', mt: 0.5 }}>
                    JPG, PNG, WEBP · min {MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT} px
                  </Typography>
                </Box>
              </Box>
            )}

            {compactFileList && selectedFiles.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, color: '#333' }}>
                  {selectedFiles.length} images — assignez un type à chacune
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                  {selectedFiles.map((fileObj) => renderFileThumb(fileObj, fileObj.imageTypeId ? '#e0e0e0' : '#f59e0b'))}
                </Box>
              </Box>
            )}

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
        </ModalScrollColumn>

        <Box
          sx={{
            flexShrink: 0,
            px: 2,
            py: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid #eee',
            bgcolor: '#fafafa',
          }}
        >
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
        </Box>
      </Box>
    </Dialog>
  );
};

export default UploadDialog;
