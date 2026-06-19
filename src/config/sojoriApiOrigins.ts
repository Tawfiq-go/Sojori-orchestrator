/**
 * Origines Sojori — ne pas confondre vitrine et API cluster.
 *
 * | Host              | Rôle                                      |
 * |-------------------|-------------------------------------------|
 * | sojori.com        | Site vitrine (Next.js) — pas d’API /api   |
 * | dev.sojori.com    | Ingress K8s prod (nom historique)       |
 * | app.sojori.com    | Futur front orchestrator déployé          |
 * | api.sojori.com    | Migration API prévue (DNS pas encore actif)|
 *
 * Front local Vite : proxy `/api` → SOJORI_API_ORIGIN (dev.sojori.com).
 */
export const SOJORI_MARKETING_ORIGIN = 'https://sojori.com';

/** Ingress API production (cluster GKE) — malgré le préfixe « dev ». */
export const SOJORI_K8S_API_ORIGIN = 'https://dev.sojori.com';

/** Futur hébergement du front orchestrator pro (build statique). */
export const SOJORI_APP_ORIGIN_FUTURE = 'https://app.sojori.com';

/** Normalise une URL configurée : apex vitrine → ingress API cluster. */
export function resolveSojoriApiOrigin(configured?: string): string {
  const raw = (configured || SOJORI_K8S_API_ORIGIN).trim().replace(/\/+$/, '');
  if (!raw) return SOJORI_K8S_API_ORIGIN;
  if (/^https?:\/\/(www\.)?sojori\.com$/i.test(raw)) return SOJORI_K8S_API_ORIGIN;
  if (/^https?:\/\/admin\.sojori\.com$/i.test(raw)) return SOJORI_K8S_API_ORIGIN;
  return raw;
}

/** Origine API effective (proxy Vite, builds, appels absolus). */
export const SOJORI_API_ORIGIN = resolveSojoriApiOrigin();
