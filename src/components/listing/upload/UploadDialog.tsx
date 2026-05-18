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
  height: 200,
  borderRadius: 16,
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
  width: '100%',
  height: 200,
  borderRadius: 16,
  border: '2px dashed #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: '#fafafa',
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: '#b8851a',
    backgroundColor: 'rgba(184,133,26,0.05)',
  },
}));

interface SelectedFile {
  file: File;
  preview: string;
  id: string;
  imageTypeId: string | null;
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onFilesUpload: (files: Array<{ file: File; imageTypeId: string | null }>) => void;
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

  useEffect(() => {
    if (!open) {
      setSelectedFiles([]);
    }
  }, [open]);

  useEffect(() => {
    const fetchImageTypes = async () => {
      if (open) {
        setLoading(true);
        try {
          const response = await getImageTypesSojori({ priority: '1,2,3' });
          if (response.data && response.data.data) {
            setImageTypes(response.data.data);
          }
        } catch (error) {
          toast.error('Failed to load image types');
        } finally {
          setLoading(false);
        }
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    logListingMedia('dialog.onDrop', {
      count: acceptedFiles.length,
      names: acceptedFiles.map((f) => f.name),
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
      imageTypeId: null,
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: LISTING_MEDIA_ACCEPT,
    maxSize: MAX_FILE_SIZE,
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

    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, imageTypeId: typeId } : f))
    );
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

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;

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

    onFilesUpload(filesWithTypes);
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    onClose();
  };

  const handleCancel = () => {
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

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 5,
          padding: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" position="relative">
          <IconButton onClick={handleCancel} size="small" sx={{ position: 'absolute', left: 0 }}>
            <CloseIcon />
          </IconButton>
          <Box flex={1} display="flex" justifyContent="center">
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Upload images
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', pb: 0 }}>
          {selectedFiles.length > 0 ? `${selectedFiles.length} fichier(s) sélectionné(s)` : 'Aucun fichier sélectionné'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: selectedFiles.length === 0 ? 3 : 0, py: selectedFiles.length === 0 ? 2 : 0 }}>
        {selectedFiles.length === 0 ? (
          <UploadContainer {...getRootProps()}>
            <input {...getInputProps()} />
            <PhotoIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 800, color: '#000' }}>
              {isDragActive ? 'Déposez les fichiers ici...' : 'Glisser-déposer'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 3, color: '#666' }}>
              ou parcourir pour des photos
            </Typography>
            <Button
              variant="contained"
              sx={{
                bgcolor: '#b8851a',
                color: 'white',
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#876119',
                },
              }}
            >
              Parcourir
            </Button>
          </UploadContainer>
        ) : (
          <Box sx={{ p: 0 }}>
            <Grid container spacing={2} sx={{ p: 2 }}>
              {selectedFiles.map((fileObj) => (
                <Grid item xs={6} key={fileObj.id}>
                  <Box>
                    <ImageThumbnail>
                      <img
                        src={fileObj.preview}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '16px',
                        }}
                      />
                      <DeleteButton className="delete-button" onClick={() => removeFile(fileObj.id)} size="small">
                        <DeleteIcon fontSize="small" />
                      </DeleteButton>

                      <Box sx={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 20 }}>
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
                    </ImageThumbnail>
                  </Box>
                </Grid>
              ))}
              <Grid item xs={6}>
                <AddMoreButton {...getRootProps()}>
                  <input {...getInputProps()} />
                  <AddIcon sx={{ fontSize: 40, color: '#ccc', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Ajouter plus
                  </Typography>
                </AddMoreButton>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
        <Button onClick={handleCancel} color="inherit">
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={selectedFiles.length === 0}
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
