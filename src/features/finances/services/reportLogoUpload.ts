import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';
import { generateRandomString } from '../../../utils/upload/helpers';
import { postFormDataAsMultipart } from '../../../utils/upload/postFormData';

/** Upload logo rapport P&L — sans Redux (pages Finances hors LegacyReduxProvider). */
export async function uploadReportLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('media', file);
  formData.append('type', 'other');
  formData.append('name', generateRandomString(15));

  const { data } = await postFormDataAsMultipart(MICROSERVICE_BASE_URL.UPLOAD_IMAGE, formData);
  const url = typeof data?.url === 'string' ? data.url.trim() : '';
  if (!url) {
    throw new Error('URL manquante après upload');
  }
  return url;
}
