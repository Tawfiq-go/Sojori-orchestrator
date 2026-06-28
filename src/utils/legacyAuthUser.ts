import type { User as ApiUser } from '../services/authService';
import type { MockUser } from '../data/mockAuth';
import {
  ORCHESTRATION_ADMIN_EMAIL,
  ORCHESTRATION_ADMIN_OWNER_ID,
} from '../constants/orchestrationAdmin';

const ROLE_MAP: Record<string, string> = {
  admin: 'Admin',
  owner: 'Owner',
  staff: 'Worker',
  superadmin: 'SuperAdmin',
};

/** Map AuthContext user → shape attendu par features/staff legacy (redux). */
export function toLegacyAuthUser(user: MockUser | ApiUser | null): Record<string, unknown> | null {
  if (!user) return null;
  const id = 'id' in user ? user.id : String((user as { _id?: string })._id || '');
  const rawRole = String(user.role || '');
  const role =
    ROLE_MAP[rawRole.toLowerCase()] ||
    (['SuperAdmin', 'Admin', 'Owner', 'Worker'].includes(rawRole) ? rawRole : 'Admin');
  return {
    _id: id,
    id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role,
    phone: 'phone' in user ? user.phone : undefined,
    company: 'company' in user ? user.company : undefined,
    ownerId: (user as { ownerId?: string }).ownerId,
    ownerAccess: !!(user as { ownerAccess?: boolean }).ownerAccess,
    featureGrants: (user as { featureGrants?: unknown[] }).featureGrants,
  };
}

/** Utilisateur admin template (dev local sans login, aligné srv-orchestrator). */
export function getDevOrchestrationAdminUser(): Record<string, unknown> {
  return {
    _id: ORCHESTRATION_ADMIN_OWNER_ID,
    id: ORCHESTRATION_ADMIN_OWNER_ID,
    email: ORCHESTRATION_ADMIN_EMAIL,
    firstName: 'Admin',
    lastName: 'Sojori',
    role: 'SuperAdmin',
  };
}

/** Redux legacy ← AuthContext ; en VITE_DISABLE_AUTH sans session → admin template. */
export function resolveLegacyAuthUser(
  authUser: MockUser | ApiUser | null | undefined,
  reduxUser: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (reduxUser && (reduxUser._id || reduxUser.id)) return reduxUser;
  const fromAuth = toLegacyAuthUser(authUser ?? null);
  if (fromAuth) return fromAuth;
  if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
    return getDevOrchestrationAdminUser();
  }
  return null;
}
