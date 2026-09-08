/** Règles pures (testables sans DOM ni env) : photos d'un service partenaire. */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;
const MAX_BYTES = 1024 * 1024;

/**
 * JPEG/PNG/WebP ≤ 1 Mo, au plus `slots` fichiers : les autres sont renvoyés
 * avec une raison lisible pour un toast.
 */
export function pickUploadablePhotos(
  files: FileList | File[] | null | undefined,
  slots: number,
): { valid: File[]; rejected: string[] } {
  const valid: File[] = [];
  const rejected: string[] = [];
  for (const file of Array.from(files || [])) {
    const typeOk = ALLOWED_MIME.has(file.type) || (!file.type && ALLOWED_EXT.test(file.name));
    if (!typeOk) rejected.push(`${file.name} : formats acceptés JPEG, PNG ou WebP`);
    else if (file.size > MAX_BYTES) rejected.push(`${file.name} : max 1 Mo`);
    else if (valid.length >= Math.max(0, slots)) rejected.push(`${file.name} : 3 photos maximum`);
    else valid.push(file);
  }
  return { valid, rejected };
}
