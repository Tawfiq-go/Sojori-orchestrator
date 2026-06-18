import type { ImageType } from '../../services/imageTypesService';

export const IMAGE_CATEGORY_UNDEFINED_LABEL = 'Non défini';
export const IMAGE_CATEGORY_LEGACY_LABEL = 'Type hors catalogue';

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

function findSojoriTypeByRuId(
  imageTypeRuId: number[] | string[] | undefined,
  imageTypes: ImageType[],
): ImageType | undefined {
  const ruIds = (imageTypeRuId || []).map(Number).filter((n) => n > 0);
  for (const ruId of ruIds) {
    const match = imageTypes.find(
      (t) => Array.isArray(t.rentalAmenityIds) && t.rentalAmenityIds.includes(ruId),
    );
    if (match) return match;
  }
  return undefined;
}

/** Résout imageTypeId Sojori (y compris imports RU avec ancien id catalogue RU). */
export function getEffectiveImageTypeId(
  imageTypeId: string | undefined,
  imageTypeRuId: number[] | string[] | undefined,
  imageTypes: ImageType[],
): string | undefined {
  if (imageTypeId && imageTypes.some((t) => String(t._id) === String(imageTypeId))) {
    return String(imageTypeId);
  }
  const byRu = findSojoriTypeByRuId(imageTypeRuId, imageTypes);
  if (byRu) return String(byRu._id);
  return imageTypeId ? String(imageTypeId) : undefined;
}

export function getImageCategoryLabel(
  imageTypeId: string | undefined,
  imageTypes: ImageType[],
  imageTypeRuId?: number[] | string[],
): string {
  const effectiveId = getEffectiveImageTypeId(imageTypeId, imageTypeRuId, imageTypes);
  if (isImageCategoryUndefined(effectiveId)) return IMAGE_CATEGORY_UNDEFINED_LABEL;

  const type = imageTypes.find((t) => String(t._id) === String(effectiveId));
  if (!type) {
    if (!isImageCategoryUndefined(imageTypeId)) return IMAGE_CATEGORY_LEGACY_LABEL;
    return IMAGE_CATEGORY_UNDEFINED_LABEL;
  }
  return getImageTypeDisplayName(type);
}
