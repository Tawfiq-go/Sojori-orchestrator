/**
 * Génère une chaîne aléatoire de longueur spécifiée
 */
export function generateRandomString(length: number): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Logger optionnel uploads media — actif seulement si VITE_DEBUG_MEDIA_UPLOAD=true
 */
export function logListingMedia(phase: string, data?: Record<string, any>): void {
  if (import.meta.env.VITE_DEBUG_MEDIA_UPLOAD !== 'true') return;
  console.log(`[MediaUpload] ${phase}`, data);
}
