import { clearTokens, getToken, setTokens } from './authUtils';

export const SESSION_EXPIRED_EVENT = 'sojori:session-expired';

/** Dev local : accès API sans login via X-Dev-Token (jamais en prod build). */
export function hasDevTokenBypass(): boolean {
  return import.meta.env.DEV && Boolean(import.meta.env.VITE_DEV_TOKEN?.trim());
}

/** JWT cookie/localStorage ou VITE_DEV_TOKEN en dev local. */
export function hasActiveSession(): boolean {
  return Boolean(getToken()?.trim()) || hasDevTokenBypass();
}

/** Valid JWT only — srv-reservations / srv-fulltask staff inbox reject X-Dev-Token alone. */
export function hasJwtSession(): boolean {
  return Boolean(getToken()?.trim());
}

/** Routes protégées : session valide + checkAuth OK (ou bypass dev token explicite). */
export function canAccessProtectedRoutes(isAuthenticated: boolean): boolean {
  if (!hasActiveSession()) return false;
  if (isAuthenticated) return true;
  /** JWT présent mais checkAuth pas encore terminé — les gardes attendent `loading` avant cet appel. */
  if (hasJwtSession()) return true;
  return hasDevTokenBypass();
}

export function invalidateSession(reason?: string): void {
  if (typeof window === 'undefined') return;
  const fromPath = window.location.pathname + window.location.search;
  const diag = { reason, fromPath, at: new Date().toISOString() };
  // Persiste après redirect /login (console effacée) — lire sessionStorage.sojori_last_logout
  try {
    sessionStorage.setItem('sojori_last_logout', JSON.stringify(diag));
  } catch {
    /* ignore */
  }
  console.warn('[Sojori][invalidateSession]', diag);
  clearTokens();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { reason } }));
  /** Dev local + X-Dev-Token : ne pas expulser l’UI (srv-reservations exige un vrai JWT). */
  if (hasDevTokenBypass()) return;
  if (window.location.pathname !== '/login') {
    window.location.href = `/login?reason=${encodeURIComponent(reason || 'session_expired')}`;
  }
}

/** Front local + backend prod : JWT ou X-Dev-Token (CORS + DISABLE_AUTH cluster). */
export function hasLocalDevApiAccess(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false;
  }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname)) {
    return false;
  }
  return Boolean(getToken()?.trim() || import.meta.env.VITE_DEV_TOKEN?.trim());
}

export function bootstrapDevSessionFromEnv(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  if (getToken()) return;

  const testToken = import.meta.env.VITE_TEST_TOKEN?.trim();
  const testRefresh = import.meta.env.VITE_TEST_REFRESH_TOKEN?.trim();
  if (testToken && testRefresh) {
    setTokens(testToken, testRefresh);
  }
}
