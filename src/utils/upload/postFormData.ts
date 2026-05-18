import { getToken, getRefreshToken } from '../auth/auth.utils';
import { logListingMedia } from './helpers';

interface PostFormDataOptions {
  rid?: string;
  timeoutMs?: number;
}

/**
 * POST multipart sans transformation JSON
 * Évite les problèmes de Content-Type avec multer
 */
export async function postFormDataAsMultipart(
  url: string,
  formData: FormData,
  opts: PostFormDataOptions = {}
): Promise<{ data: any }> {
  const { rid, timeoutMs = 180000 } = opts;

  // Récupération des tokens
  const devTok = import.meta.env.DEV ? (import.meta.env.VITE_DEV_TOKEN || '').trim() : '';
  const token = getToken() || devTok || '';
  const refreshToken = getRefreshToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (refreshToken) {
    headers['x-refresh-token'] = refreshToken;
  }

  const ctrl = new AbortController();
  let abortedByTimeout = false;
  const timer = timeoutMs > 0 ? setTimeout(() => {
    abortedByTimeout = true;
    ctrl.abort();
  }, timeoutMs) : null;

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const logFetch = (phase: string, extra: Record<string, any> = {}) => {
    const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    logListingMedia(phase, {
      rid,
      url,
      elapsedMs,
      ...extra,
    });
  };

  logFetch('upload.fetch.start', { hasAuth: Boolean(token) });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: ctrl.signal,
    });
  } catch (e: any) {
    if (timer) clearTimeout(timer);
    if (e?.name === 'AbortError') {
      const msg = abortedByTimeout
        ? `Upload timed out after ${Math.round(timeoutMs / 1000)}s`
        : 'Upload aborted';
      logFetch('upload.fetch.timeout', { message: msg, abortedByTimeout });
      const err: any = new Error(msg);
      err.response = { status: 408, data: { message: msg } };
      throw err;
    }
    logFetch('upload.fetch.networkErr', { message: e?.message, name: e?.name });
    const err: any = new Error(e?.message || 'Network error');
    err.response = { status: 0, data: { message: err.message } };
    throw err;
  }

  if (timer) clearTimeout(timer);

  const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  logListingMedia('upload.fetch.response', {
    rid,
    url,
    status: res.status,
    ok: res.ok,
    elapsedMs,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || res.statusText || 'Invalid JSON response' };
  }

  if (!res.ok) {
    logFetch('upload.fetch.httpErr', { status: res.status, data });
    const err: any = new Error(data?.message || res.statusText || 'Request failed');
    err.response = { status: res.status, data };
    throw err;
  }

  logListingMedia('upload.fetch.ok', { rid, url, status: res.status, elapsedMs });
  return { data };
}
