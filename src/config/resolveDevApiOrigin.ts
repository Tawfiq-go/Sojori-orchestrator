/**
 * Front local (127.0.0.1:4174) + backend prod (dev.sojori.com via proxy Vite).
 * Retourne '' → URLs relatives /api/... proxifiées par vite.config.ts.
 */
export function isLocalViteDevHost(): boolean {
  return (
    import.meta.env.DEV &&
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
    return configured.replace(/\/+$/, '');
  }
  if (import.meta.env.PROD) {
    return 'https://dev.sojori.com';
  }
  return 'http://localhost';
}
