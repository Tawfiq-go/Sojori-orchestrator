import { getToken, setTokens } from './authUtils';

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
