import { isAxiosError } from 'axios';

/** Normalize API / proxy / network errors for Communications inbox toasts & banners. */
export function extractHttpErrorMessage(error: unknown, fallback = 'Erreur inconnue'): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (data) {
      const nested = data.data as Record<string, unknown> | undefined;
      const candidates = [
        data.detail,
        data.error,
        data.message,
        nested?.error,
        nested?.detail,
        Array.isArray(data.errors) ? (data.errors[0] as { message?: string })?.message : undefined,
      ];
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) return c.trim();
      }
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Délai dépassé — Meta WhatsApp ne répond pas (timeout). Réessayez ou vérifiez le token.';
    }
    if (error.response?.status === 502) {
      return 'srv-fullchatbot injoignable ou WhatsApp a refusé l’envoi (502).';
    }
    if (error.message?.trim()) return error.message.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}
