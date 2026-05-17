import Cookies from 'js-cookie';

/**
 * `vite preview` (import.meta.env.PROD) sur http://127.0.0.1 — si secure=true, le navigateur
 * ne persiste pas / n’envoie pas les cookies JWT. Secure uniquement en HTTPS réel.
 */
function cookieSecure(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

const baseCookieOptions = {
  sameSite: 'Lax' as const,
  path: '/',
  expires: 7,
};

export const setCookie = (name: string, value: string) => {
  Cookies.set(name, value, { ...baseCookieOptions, secure: cookieSecure() });
};

export const getCookie = (name: string): string | undefined => {
  return Cookies.get(name);
};

export const removeCookie = (name: string) => {
  Cookies.remove(name, { path: '/' });
};
