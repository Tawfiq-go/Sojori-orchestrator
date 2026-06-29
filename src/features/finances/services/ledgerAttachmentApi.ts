import apiClient from '../../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';
import { isAxiosError } from 'axios';

const UPLOAD_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/ledger-attachments/upload`;
const SIGNED_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/ledger-attachments/signed-url`;
const CONTENT_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/ledger-attachments/content`;

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
  message?: string;
};

function throwApiError(e: unknown, fallback: string): never {
  if (isAxiosError(e)) {
    const body = e.response?.data as { error?: string; message?: string } | undefined;
    const status = e.response?.status;
    throw new Error(body?.error || body?.message || (status ? `${fallback} (HTTP ${status})` : fallback));
  }
  throw e instanceof Error ? e : new Error(fallback);
}

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
    throwApiError(e, 'Upload impossible');
  }
}

export async function getLedgerAttachmentSignedUrl(
  canonicalUrl: string,
  ownerId: string | null | undefined,
) {
  if (!ownerId) throw new Error('Sélectionnez un propriétaire PM');
  try {
    const { data } = await apiClient.post<SignedResponse>(SIGNED_URL, {
      url: canonicalUrl,
      ownerId,
    });
    if (!data?.success || !data.data?.url) {
      throw new Error(data?.error || data?.message || 'Lecture impossible');
    }
    return data.data.url;
  } catch (e) {
    throwApiError(e, 'Lecture impossible');
  }
}

/** Blob via proxy srv-admin (même origine API — pas de CORS GCS). */
export async function fetchLedgerAttachmentBlob(
  canonicalUrl: string,
  ownerId: string | null | undefined,
  options?: { download?: boolean },
): Promise<Blob> {
  if (!ownerId) throw new Error('Sélectionnez un propriétaire PM');
  try {
    const { data } = await apiClient.get<Blob>(CONTENT_URL, {
      params: {
        url: canonicalUrl,
        ownerId,
        download: options?.download ? '1' : '0',
      },
      responseType: 'blob',
    });
    if (data instanceof Blob && (data.type.includes('json') || data.type.includes('text'))) {
      const text = await data.text();
      try {
        const json = JSON.parse(text) as { error?: string; message?: string };
        throw new Error(json.error || json.message || 'Lecture impossible');
      } catch (parseErr) {
        if (parseErr instanceof Error && !parseErr.message.includes('JSON')) throw parseErr;
        throw new Error(text.slice(0, 200) || 'Lecture impossible');
      }
    }
    if (!(data instanceof Blob) || data.size === 0) {
      throw new Error('Fichier vide ou illisible');
    }
    return data;
  } catch (e) {
    throwApiError(e, 'Lecture impossible');
  }
}

export async function downloadLedgerAttachment(
  canonicalUrl: string,
  ownerId: string | null | undefined,
  filename: string,
) {
  const blob = await fetchLedgerAttachmentBlob(canonicalUrl, ownerId, { download: true });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

export function isLedgerAttachmentPdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || url.includes('/pdfs/documents/ledger/');
}

export function attachmentFileLabel(url: string, index: number): string {
  const tail = url.split('/').pop()?.split('?')[0] || '';
  if (tail.length > 8) return tail.length > 36 ? `${tail.slice(0, 18)}…${tail.slice(-8)}` : tail;
  return `Pièce ${index + 1}`;
}
