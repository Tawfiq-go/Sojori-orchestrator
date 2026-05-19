import type { AppDispatch } from '../../redux/store';
import { uploadMultipleImagesToAPI } from '../../redux/slices/UploadSlice';
import { logListingMedia } from './helpers';

/** Limite API srv-admin (multer). */
export const UPLOAD_MAX_FILES_PER_REQUEST = 30;

/** Taille des lots réseau + affichage progression (ex. 21 → 5 lots : 1/5 … 5/5). */
export const UPLOAD_BATCH_SIZE = 5;

export interface UploadedFileResult {
  url: string;
  fileName?: string;
}

export type UploadProgressInfo = {
  batchCurrent: number;
  batchTotal: number;
  filesUploaded: number;
  filesTotal: number;
};

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
 * Envoie les fichiers en lots de {@link UPLOAD_BATCH_SIZE} (max API = 30).
 */
export async function uploadMultipleInBatches(
  dispatch: AppDispatch,
  files: File[],
  folder: string,
  onProgress?: (info: UploadProgressInfo) => void,
): Promise<UploadedFileResult[]> {
  if (!files.length) return [];

  const batchSize = Math.min(UPLOAD_BATCH_SIZE, UPLOAD_MAX_FILES_PER_REQUEST);
  const batches: File[][] = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }

  const allUploaded: UploadedFileResult[] = [];
  const filesTotal = files.length;

  for (let b = 0; b < batches.length; b += 1) {
    const filesBeforeBatch = allUploaded.length;

    onProgress?.({
      batchCurrent: b + 1,
      batchTotal: batches.length,
      filesUploaded: filesBeforeBatch,
      filesTotal,
    });

    logListingMedia('upload.batch.start', {
      batch: b + 1,
      totalBatches: batches.length,
      filesInBatch: batches[b].length,
    });

    const result = await dispatch(
      uploadMultipleImagesToAPI({ files: batches[b], folder }),
    ).unwrap();

    logListingMedia('upload.batch.ok', { batch: b + 1, totalBatches: batches.length });
    const chunk = normalizeUploadResponse(result);
    if (chunk.length !== batches[b].length) {
      throw new Error(
        `Réponse incomplète (lot ${b + 1}/${batches.length}: ${chunk.length}/${batches[b].length} fichiers)`,
      );
    }
    allUploaded.push(...chunk);

    onProgress?.({
      batchCurrent: b + 1,
      batchTotal: batches.length,
      filesUploaded: allUploaded.length,
      filesTotal,
    });
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
