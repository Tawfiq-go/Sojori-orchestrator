import apiClient from '../../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';
import { isAxiosError } from 'axios';

const UPLOAD_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/ledger-attachments/upload`;
const SIGNED_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/ledger-attachments/signed-url`;

type UploadResponse = {
  success?: boolean;
  data?: { url?: string; objectPath?: string; originalName?: string };
  error?: string;
  message?: string;
};

type SignedResponse = {
  success?: boolean;
  data?: { url?: string };
  error?: string;
};

export async function uploadLedgerAttachment(file: File, ownerId: string | null | undefined) {
  if (!ownerId) throw new Error('Sélectionnez un propriétaire PM');
  const form = new FormData();
  form.append('media', file);
  form.append('ownerId', ownerId);
  try {
    const { data } = await apiClient.post<UploadResponse>(UPLOAD_URL, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data?.success || !data.data?.url) {
      throw new Error(data?.error || data?.message || 'Upload impossible');
    }
    return data.data.url;
  } catch (e) {
    if (isAxiosError(e)) {
      const body = e.response?.data as UploadResponse | undefined;
      throw new Error(body?.error || body?.message || 'Upload impossible');
    }
    throw e instanceof Error ? e : new Error('Upload impossible');
  }
}

export async function getLedgerAttachmentSignedUrl(
  canonicalUrl: string,
  ownerId: string | null | undefined,
) {
  if (!ownerId) throw new Error('Sélectionnez un propriétaire PM');
  const { data } = await apiClient.post<SignedResponse>(SIGNED_URL, {
    url: canonicalUrl,
    ownerId,
  });
  if (!data?.success || !data.data?.url) {
    throw new Error(data?.error || 'Lecture impossible');
  }
  return data.data.url;
}

export function isLedgerAttachmentPdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || url.includes('/pdfs/documents/ledger/');
}

export function attachmentFileLabel(url: string, index: number): string {
  const tail = url.split('/').pop()?.split('?')[0] || '';
  if (tail.length > 8) return tail.slice(0, 24);
  return `Pièce ${index + 1}`;
}
