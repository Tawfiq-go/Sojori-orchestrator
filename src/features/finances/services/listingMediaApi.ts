import apiClient from '../../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';

const SIGNED_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/listing-media/signed-url`;
const CONTENT_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/listing-media/content`;

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

export function isListingDocumentUrl(url: string): boolean {
  const clean = stripListingMediaQuery(url);
  return /\/documents\//i.test(clean) || /passport|_id_front|_id_back/i.test(clean);
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

/**
 * Stream authentifié (blob) — utilisé pour passeports / documents privés
 * quand signBlob IAM n’est pas disponible sur le SA GKE.
 */
export async function getListingMediaContentBlobUrl(canonicalUrl: string): Promise<string> {
  const clean = stripListingMediaQuery(canonicalUrl);
  const { data } = await apiClient.post(
    CONTENT_URL,
    { canonicalUrl: clean, url: clean },
    { responseType: 'blob' },
  );
  if (!(data instanceof Blob) || data.size < 32) {
    throw new Error('Document vide ou illisible');
  }
  if (data.type.includes('application/json')) {
    const text = await data.text();
    throw new Error(text.slice(0, 120) || 'Lecture document impossible');
  }
  return URL.createObjectURL(data);
}

/** URL utilisable dans un `<img src>` (signée si bucket listings). */
export async function getListingMediaDisplayUrl(canonicalUrl: string): Promise<string> {
  const trimmed = stripListingMediaQuery(canonicalUrl);
  if (!trimmed) throw new Error('URL manquante');
  if (!isListingsBucketUrl(trimmed)) return trimmed;

  // Documents privés : proxy stream (évite signBlob IAM manquant)
  if (isListingDocumentUrl(trimmed)) {
    return getListingMediaContentBlobUrl(trimmed);
  }

  try {
    return await getListingMediaSignedUrl(trimmed);
  } catch {
    return getListingMediaContentBlobUrl(trimmed);
  }
}
