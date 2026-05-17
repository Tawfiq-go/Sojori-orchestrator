import { AUTH_CONFIG } from '../config/authConfig';
import { setCookie, getCookie, removeCookie } from './cookieUtils';

/** Ancien chemin utilisé par orchestration / quelques écrans — gardé en repli pour `getToken`. */
const LEGACY_JWT_LOCALSTORAGE_KEY = 'token';

/**
 * Vérifie si l'application est embarquée dans une iframe
 * Utile pour éviter les problèmes de cookies en contexte iframe
 */
export function isAppEmbeddedInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * JWT pour les appels API : cookie `sojori_token` (auth actuelle), sinon legacy `localStorage.token`.
 */
export const getToken = (): string | undefined => {
  const fromCookie = getCookie(AUTH_CONFIG.TOKEN_KEY);
  if (fromCookie) return fromCookie;
  if (typeof window === 'undefined') return undefined;
  try {
    const legacy = window.localStorage.getItem(LEGACY_JWT_LOCALSTORAGE_KEY)?.trim();
    return legacy || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Récupère le refresh token depuis les cookies
 */
export const getRefreshToken = (): string | undefined => getCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY);

/**
 * Stocke les tokens d'authentification dans les cookies
 */
export const setTokens = (token: string, refreshToken: string): void => {
  setCookie(AUTH_CONFIG.TOKEN_KEY, token);
  setCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LEGACY_JWT_LOCALSTORAGE_KEY, token);
    } catch {
      /* ignore quota / private mode */
    }
  }
};

/**
 * Supprime les tokens d'authentification des cookies
 */
export const clearTokens = (): void => {
  if (isAppEmbeddedInIframe()) return;
  removeCookie(AUTH_CONFIG.TOKEN_KEY);
  removeCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LEGACY_JWT_LOCALSTORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
};

/**
 * Vérifie si l'utilisateur est authentifié
 */
export const isAuthenticated = (): boolean => !!getToken();
