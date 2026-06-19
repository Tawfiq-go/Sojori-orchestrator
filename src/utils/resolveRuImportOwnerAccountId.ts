import type { MockUser } from '../data/mockAuth';

export function normalizeAuthRole(role?: string): string {
  return String(role || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');
}

export function isAdminDashboardRole(role?: string): boolean {
  const r = normalizeAuthRole(role);
  return r === 'superadmin' || r === 'admin' || r === 'super_admin';
}

/**
 * Compte propriétaire RU / Sojori pour l’import Airbnb.
 * - Owner → user.id
 * - Worker / staff → user.ownerId (pas l’id du compte worker)
 */
export function resolveRuImportOwnerAccountId(user: MockUser | null | undefined): string | null {
  if (!user?.id) return null;
  const role = normalizeAuthRole(user.role);
  if (role === 'worker' || role === 'staff') {
    const ownerAccountId = String((user as MockUser & { ownerId?: string }).ownerId || '').trim();
    return ownerAccountId || null;
  }
  if (role === 'owner') {
    return String(user.id).trim();
  }
  return null;
}
