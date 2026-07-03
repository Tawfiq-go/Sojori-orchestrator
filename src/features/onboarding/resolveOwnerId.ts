import type { MockUser } from '../../data/mockAuth';

function normRole(role?: string | null): string {
  return String(role || '').trim().toLowerCase();
}

/** Owner connecté : id compte ; staff : ownerId lié. */
export function resolveOwnerId(user: MockUser | null | undefined): string | null {
  const raw = user?.id || (user as { _id?: string } | null | undefined)?._id;
  const accountId = raw != null ? String(raw).trim() : '';
  if (!accountId) return null;
  const role = normRole(user?.role);
  if (role === 'owner') return accountId;
  if (role === 'worker' || role === 'staff') {
    const employer = user?.ownerId != null ? String(user.ownerId).trim() : '';
    return employer || accountId;
  }
  const fallbackOwner = user?.ownerId != null ? String(user.ownerId).trim() : '';
  return fallbackOwner || accountId;
}

export function isOwnerRole(user: MockUser | null | undefined): boolean {
  return normRole(user?.role) === 'owner';
}

export function isAdminRole(user: MockUser | null | undefined): boolean {
  const role = normRole(user?.role);
  return role === 'admin' || role === 'superadmin';
}

/** Sidebar On-boarding + wizard PM — Owner ou Admin Sojori. */
export function canAccessPmOnboarding(user: MockUser | null | undefined): boolean {
  return isOwnerRole(user) || isAdminRole(user);
}

/**
 * Owner cible du wizard : compte Owner = lui-même ; Admin = propriétaire choisi dans le filtre.
 */
export function resolvePmOnboardingOwnerId(
  user: MockUser | null | undefined,
  requestOwnerId: string | null | undefined,
  showOwnerFilter: boolean,
): string | null {
  if (showOwnerFilter) {
    const picked = requestOwnerId?.trim();
    return picked || null;
  }
  if (isOwnerRole(user)) return resolveOwnerId(user);
  return null;
}

export type OnboardingSuiteViewMode = 'owner' | 'admin';

/** owner PM = suivi simple · admin Sojori = audit / technique. */
export function onboardingSuiteViewMode(
  user: MockUser | null | undefined,
  showOwnerFilter: boolean,
): OnboardingSuiteViewMode {
  if (showOwnerFilter || isAdminRole(user)) return 'admin';
  return 'owner';
}

/** @deprecated alias — préférer onboardingSuiteViewMode */
export function onboardingImportProgressMode(
  user: MockUser | null | undefined,
  showOwnerFilter: boolean,
): OnboardingSuiteViewMode {
  return onboardingSuiteViewMode(user, showOwnerFilter);
}
