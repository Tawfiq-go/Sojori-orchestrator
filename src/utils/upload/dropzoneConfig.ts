/**
 * Configuration pour react-dropzone - types de fichiers acceptés
 */
export const LISTING_MEDIA_ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

/**
 * Version HTML5 pour input file
 */
export const LISTING_MEDIA_ACCEPT_HTML = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * Taille maximale par fichier (50 MB)
 */
export const MAX_FILE_SIZE = 52428800;

/**
 * Dimensions minimales requises
 */
export const MIN_IMAGE_WIDTH = 1024;
export const MIN_IMAGE_HEIGHT = 768;
