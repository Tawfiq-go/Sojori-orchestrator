/** Upload photos d'un service partenaire (JPEG/PNG/WebP ≤ 1 Mo, 3 max) → URLs. */
import { MICROSERVICE_BASE_URL } from '../../../../config/authConfig';
import { postFormDataAsMultipart } from '../../../../utils/upload/postFormData';

export { pickUploadablePhotos } from './partnerPhotoRules';

export async function uploadPartnerPhotos(files: File[]): Promise<string[]> {
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach((file) => formData.append('media', file));
  formData.append('type', 'partner-services');
  formData.append('name', `partner-${Date.now()}`);
  const { data } = await postFormDataAsMultipart(MICROSERVICE_BASE_URL.UPLOAD_IMAGE_MULTIPLE, formData);
  const urls = (Array.isArray(data?.files) ? data.files : [])
    .map((f: { url?: string }) => f?.url)
    .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0);
  if (!urls.length) throw new Error('Aucune URL renvoyée par l’upload');
  return urls;
}
