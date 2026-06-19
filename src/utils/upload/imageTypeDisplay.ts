import type { ImageType } from '../../services/imageTypesService';
import { localizeRuImageCaption } from './ruImageCaptionLabels';

export const IMAGE_CATEGORY_UNDEFINED_LABEL = 'Non défini';
export const IMAGE_CATEGORY_LEGACY_LABEL = 'Type hors catalogue';

export type ImageDisplayLocale = 'fr' | 'en';

function localizedCaptionLabel(caption: string, locale: ImageDisplayLocale): string {
  const loc = localizeRuImageCaption(caption);
  return locale === 'en' ? loc.nameSojoriEn : loc.nameSojoriFr;
}

export function isImageCategoryUndefined(imageTypeId: string | null | undefined): boolean {
  return !imageTypeId || !String(imageTypeId).trim();
}

export function getImageTypeDisplayName(
  imageType: ImageType | null | undefined,
  locale: ImageDisplayLocale = 'fr',
): string {
  if (!imageType) return IMAGE_CATEGORY_UNDEFINED_LABEL;
  if (imageType.sojoriName && typeof imageType.sojoriName === 'object') {
    const fr = (imageType.sojoriName.fr || '').trim();
    const en = (imageType.sojoriName.en || '').trim();
    if (locale === 'en') {
      if (en) return en;
      if (fr) return fr;
    } else {
      if (fr) return fr;
      if (en) return en;
    }
    const first = Object.values(imageType.sojoriName).find((v) => typeof v === 'string' && v.trim());
    if (first) return first;
  }
  return imageType.airbnbCategory || imageType.bookingCategory || 'Autre';
}

export function ruIdsOnType(type: ImageType): number[] {
  const ids = [...(type.rentalAmenityIds || []), ...(type.rentalImageTypeIds || [])];
  return [...new Set(ids.map(Number).filter((n) => n > 0))];
}

/** Image de couverture — Exterior, puis Living room, puis RU id 1, sinon premier type. */
export function getMainImageTypeFromCatalog(imageTypes: ImageType[]): ImageType | undefined {
  if (!imageTypes?.length) return undefined;
  const byName = (en: string) =>
    imageTypes.find((t) => t.sojoriName?.en === en || t.airbnbCategory === en);
  return (
    byName('Exterior') ||
    byName('Living room') ||
    imageTypes.find((t) => ruIdsOnType(t).includes(1)) ||
    imageTypes[0]
  );
}

export function isMainImageCategory(
  imageTypeId: string | undefined,
  imageTypeRuId: number[] | string[] | undefined,
  imageTypes: ImageType[],
): boolean {
  const main = getMainImageTypeFromCatalog(imageTypes);
  if (!main) return false;
  const effectiveId = getEffectiveImageTypeId(imageTypeId, imageTypeRuId, imageTypes);
  return effectiveId === String(main._id);
}

export function ruIdsForImageType(type: ImageType | undefined): number[] {
  return type ? ruIdsOnType(type) : [];
}

function findSojoriTypeByRuId(
  imageTypeRuId: number[] | string[] | undefined,
  imageTypes: ImageType[],
): ImageType | undefined {
  const ruIds = (imageTypeRuId || []).map(Number).filter((n) => n > 0);
  for (const ruId of ruIds) {
    const match = imageTypes.find((t) => ruIdsOnType(t).includes(ruId));
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
  caption?: string | null,
  locale: ImageDisplayLocale = 'fr',
): string {
  const effectiveId = getEffectiveImageTypeId(imageTypeId, imageTypeRuId, imageTypes);
  if (isImageCategoryUndefined(effectiveId)) {
    const cap = String(caption || '').trim();
    return cap ? localizedCaptionLabel(cap, locale) : IMAGE_CATEGORY_UNDEFINED_LABEL;
  }

  const type = imageTypes.find((t) => String(t._id) === String(effectiveId));
  if (!type) {
    const cap = String(caption || '').trim();
    if (cap) return localizedCaptionLabel(cap, locale);
    if (!isImageCategoryUndefined(imageTypeId)) return IMAGE_CATEGORY_LEGACY_LABEL;
    return IMAGE_CATEGORY_UNDEFINED_LABEL;
  }
  return getImageTypeDisplayName(type, locale);
}
