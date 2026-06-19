/**
 * Front local (127.0.0.1:4174) — URLs relatives /api/... proxifiées par vite.config.ts.
 * Inclut `vite dev` et `vite preview` sur localhost (pas seulement import.meta.env.DEV).
 */
import { SOJORI_API_ORIGIN, resolveSojoriApiOrigin } from './sojoriApiOrigins';
export function isLocalViteDevHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname)
  );
}

export function resolveDevApiOrigin(): string {
  if (isLocalViteDevHost()) {
    return '';
  }
  const configured =
    import.meta.env.VITE_API_URL?.trim() ||
    import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return resolveSojoriApiOrigin(configured);
  }
  if (import.meta.env.PROD) {
    return SOJORI_API_ORIGIN;
  }
  return 'http://localhost';
}
