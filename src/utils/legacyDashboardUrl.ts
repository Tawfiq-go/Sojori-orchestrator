/** Base URL du dashboard legacy (sojori-dashboard) pour iframes / liens admin mapping. */
export function getLegacyDashboardBaseUrl(): string {
  const configured = import.meta.env.VITE_LEGACY_DASHBOARD_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (import.meta.env.PROD) return 'https://dashboard.sojori.com';
  return 'http://localhost:3000';
}

export function legacyDashboardUrl(path: string): string {
  const base = getLegacyDashboardBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
