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
 * Logger simple pour les uploads media (peut être étendu plus tard)
 */
export function logListingMedia(phase: string, data?: Record<string, any>): void {
  // TOUJOURS logger pour debug
  console.log(`[MediaUpload] ${phase}`, data);
}
