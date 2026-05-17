import type { User as ApiUser } from '../services/authService';
import type { MockUser } from '../data/mockAuth';

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
    featureGrants: (user as { featureGrants?: unknown[] }).featureGrants,
  };
}
