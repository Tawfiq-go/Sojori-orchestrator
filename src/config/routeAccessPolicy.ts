/**
 * Politique d'accès aux routes — zones distinctes :
 * - platform_admin : infra Sojori (monitor, /admin/*, mapping global…)
 * - pm : pilotage property manager (sidebar OWNER_NAV_GROUPS)
 * - worker / landlord : sous-ensemble PM selon featureGrants
 */
import { Roles } from '../constants/roles';

export type RouteZone = 'platform_admin' | 'pm' | 'authenticated';

/** Préfixes réservés SuperAdmin / Admin — jamais accessibles Owner / Worker / Landlord. */
export const PLATFORM_ADMIN_PATH_RULES: Array<{ prefix: string; exact?: boolean }> = [
  { prefix: '/admin/' },
  { prefix: '/monitor' },
  { prefix: '/channels' },
  { prefix: '/temp/' },
  { prefix: '/listings/mapping' },
];

export function isPlatformAdminPath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return PLATFORM_ADMIN_PATH_RULES.some((rule) => {
    if (rule.exact) return path === rule.prefix;
    return path === rule.prefix || path.startsWith(rule.prefix);
  });
}

/** Routes sidebar PM (hors infra `/admin/*`, monitor, channels admin…). */
export function isPmBusinessPath(pathname: string): boolean {
  const path = (pathname || '/').trim();
  if (!path || path === '/' || path === '/forbidden') return false;
  return !isPlatformAdminPath(path);
}

export function normalizeDashboardRole(role: string | null | undefined): string {
  if (role == null) return '';
  const r = String(role).trim();
  const lower = r.toLowerCase();
  if (r === Roles.SuperAdmin || lower === 'superadmin') return Roles.SuperAdmin;
  if (r === Roles.Admin || lower === 'admin') return Roles.Admin;
  if (r === Roles.Owner || lower === 'owner') return Roles.Owner;
  if (r === Roles.Worker || lower === 'worker' || lower === 'staff') return Roles.Worker;
  if (r === Roles.Landlord || lower === 'landlord') return Roles.Landlord;
  return r;
}
