import type { AppDispatch } from '../../redux/store';
import { uploadMultipleImagesToAPI } from '../../redux/slices/UploadSlice';
import { logListingMedia } from './helpers';

/** Aligné sur srv-admin: upload.array('media', 30) */
export const UPLOAD_MAX_FILES_PER_REQUEST = 30;

export interface UploadedFileResult {
  url: string;
  fileName?: string;
}

function normalizeUploadResponse(result: unknown): UploadedFileResult[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  if (Array.isArray(r.files)) {
    return (r.files as UploadedFileResult[]).filter((f) => f?.url);
  }
  if (Array.isArray(result)) {
    return (result as unknown[]).map((item) => {
      if (typeof item === 'string') {
        return { url: item, fileName: item.split('/').pop() };
      }
      const o = item as UploadedFileResult;
      return { url: o.url, fileName: o.fileName };
    });
  }
  return [];
}

/**
 * Envoie les fichiers en lots (limite API admin upload_multiple).
 */
export async function uploadMultipleInBatches(
  dispatch: AppDispatch,
  files: File[],
  folder: string,
  onProgress?: (current: number, total: number) => void
): Promise<UploadedFileResult[]> {
  if (!files.length) return [];

  const batches: File[][] = [];
  for (let i = 0; i < files.length; i += UPLOAD_MAX_FILES_PER_REQUEST) {
    batches.push(files.slice(i, i + UPLOAD_MAX_FILES_PER_REQUEST));
  }

  const allUploaded: UploadedFileResult[] = [];

  for (let b = 0; b < batches.length; b += 1) {
    onProgress?.(b + 1, batches.length);
    logListingMedia('upload.batch.start', {
      batch: b + 1,
      totalBatches: batches.length,
      filesInBatch: batches[b].length,
    });
    const result = await dispatch(
      uploadMultipleImagesToAPI({ files: batches[b], folder })
    ).unwrap();
    logListingMedia('upload.batch.ok', { batch: b + 1, totalBatches: batches.length });
    const chunk = normalizeUploadResponse(result);
    if (chunk.length !== batches[b].length) {
      throw new Error(
        `Réponse incomplète (lot ${b + 1}/${batches.length}: ${chunk.length}/${batches[b].length} fichiers)`
      );
    }
    allUploaded.push(...chunk);
  }

  return allUploaded;
}

export function formatUploadError(error: unknown): string {
  if (!error) return 'Erreur inconnue';
  if (typeof error === 'string') return error;

  const e = error as {
    message?: string;
    errors?: unknown[];
    response?: { data?: { message?: string; errors?: unknown[] } };
  };

  const errors = e.errors ?? e.response?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'message' in first) {
      return String((first as { message: string }).message);
    }
  }

  return e.response?.data?.message || e.message || 'Erreur inconnue';
}
