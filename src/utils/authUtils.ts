import { AUTH_CONFIG } from '../config/authConfig';
import { setCookie, getCookie, removeCookie } from './cookieUtils';

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
 * Récupère le token d'authentification depuis les cookies
 */
export const getToken = (): string | undefined => getCookie(AUTH_CONFIG.TOKEN_KEY);

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
};

/**
 * Supprime les tokens d'authentification des cookies
 */
export const clearTokens = (): void => {
  if (isAppEmbeddedInIframe()) return;
  removeCookie(AUTH_CONFIG.TOKEN_KEY);
  removeCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY);
};

/**
 * Vérifie si l'utilisateur est authentifié
 */
export const isAuthenticated = (): boolean => !!getToken();
