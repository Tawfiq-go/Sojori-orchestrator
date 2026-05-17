import { AUTH_CONFIG } from '../config/authConfig';
import { setCookie, getCookie, removeCookie } from './cookie.utils';

/** Document React embarqué (ex. SPA servie par erreur dans une iframe Grafana) : ne pas toucher aux cookies partagés avec le parent. */
export function isAppEmbeddedInIframe() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export const getToken = () => getCookie(AUTH_CONFIG.TOKEN_KEY);
export const getRefreshToken = () => getCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY);

export const setTokens = (token, refreshToken) => {
  setCookie(AUTH_CONFIG.TOKEN_KEY, token);
  setCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = () => {
  if (isAppEmbeddedInIframe()) return;
  removeCookie(AUTH_CONFIG.TOKEN_KEY);
  removeCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY);
};

export const isAuthenticated = () => !!getToken();