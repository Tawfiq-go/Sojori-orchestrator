import type { ImageType } from '../../services/imageTypesService';

export const IMAGE_CATEGORY_UNDEFINED_LABEL = 'Non défini';

export function isImageCategoryUndefined(imageTypeId: string | null | undefined): boolean {
  return !imageTypeId || !String(imageTypeId).trim();
}

export function getImageTypeDisplayName(imageType: ImageType | null | undefined): string {
  if (!imageType) return IMAGE_CATEGORY_UNDEFINED_LABEL;
  if (imageType.sojoriName && typeof imageType.sojoriName === 'object') {
    if (imageType.sojoriName.fr) return imageType.sojoriName.fr;
    if (imageType.sojoriName.en) return imageType.sojoriName.en;
    const first = Object.values(imageType.sojoriName).find((v) => typeof v === 'string' && v.trim());
    if (first) return first;
  }
  return imageType.airbnbCategory || imageType.bookingCategory || 'Autre';
}

export function getImageCategoryLabel(
  imageTypeId: string | undefined,
  imageTypes: ImageType[],
): string {
  if (isImageCategoryUndefined(imageTypeId)) return IMAGE_CATEGORY_UNDEFINED_LABEL;
  const type = imageTypes.find((t) => String(t._id) === String(imageTypeId));
  if (!type) return IMAGE_CATEGORY_UNDEFINED_LABEL;
  return getImageTypeDisplayName(type);
}
