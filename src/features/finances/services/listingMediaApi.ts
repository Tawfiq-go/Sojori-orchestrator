import apiClient from '../../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';
import { isAxiosError } from 'axios';

const SIGNED_URL = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/listing-media/signed-url`;

type SignedResponse = {
  success?: boolean;
  data?: { url?: string };
  error?: string;
};

export function isListingsBucketUrl(url: string): boolean {
  return /^https:\/\/storage\.googleapis\.com\//i.test(String(url || '').trim());
}

/** URL signée temporaire — ne pas afficher l’URL canonique GCS à l’utilisateur. */
export async function getListingMediaSignedUrl(canonicalUrl: string): Promise<string> {
  const { data } = await apiClient.post<SignedResponse>(SIGNED_URL, {
    canonicalUrl,
    url: canonicalUrl,
  });
  if (!data?.success || !data.data?.url) {
    throw new Error(data?.error || 'Lecture média impossible');
  }
  return data.data.url;
}

export async function fetchListingMediaBlob(canonicalUrl: string): Promise<Blob> {
  const trimmed = String(canonicalUrl || '').trim();
  if (!trimmed) throw new Error('URL manquante');
  const fetchUrl = isListingsBucketUrl(trimmed) ? await getListingMediaSignedUrl(trimmed) : trimmed;
  const res = await fetch(fetchUrl, { mode: 'cors', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error('Image inaccessible');
  return res.blob();
}
