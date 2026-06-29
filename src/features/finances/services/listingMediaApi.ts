import apiClient from '../../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';

const SIGNED_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/listing-media/signed-url`;

type SignedResponse = {
  success?: boolean;
  data?: { url?: string };
  error?: string;
};

export function isListingsBucketUrl(url: string): boolean {
  return /^https:\/\/storage\.googleapis\.com\//i.test(String(url || '').trim());
}

/** Retire query/signature pour signer ou afficher l’URL canonique. */
export function stripListingMediaQuery(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  return trimmed.split('?')[0] || trimmed;
}

/** URL signée temporaire — ne pas afficher l’URL canonique GCS à l’utilisateur. */
export async function getListingMediaSignedUrl(canonicalUrl: string): Promise<string> {
  const clean = stripListingMediaQuery(canonicalUrl);
  const { data } = await apiClient.post<SignedResponse>(SIGNED_URL, {
    canonicalUrl: clean,
    url: clean,
  });
  if (!data?.success || !data.data?.url) {
    throw new Error(data?.error || 'Lecture média impossible');
  }
  return data.data.url;
}

/** URL utilisable dans un `<img src>` (signée si bucket listings). */
export async function getListingMediaDisplayUrl(canonicalUrl: string): Promise<string> {
  const trimmed = stripListingMediaQuery(canonicalUrl);
  if (!trimmed) throw new Error('URL manquante');
  if (isListingsBucketUrl(trimmed)) {
    return getListingMediaSignedUrl(trimmed);
  }
  return trimmed;
}
