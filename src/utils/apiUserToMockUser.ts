import type { User as ApiUser } from '../services/authService';
import type { MockUser, MockUserRole } from '../data/mockAuth';
import { Roles } from '../constants/roles';

function normalizeApiRole(role: string | undefined, prev?: MockUserRole | string): MockUserRole | string {
  const r = String(role ?? prev ?? '').trim();
  const lower = r.toLowerCase();
  if (r === Roles.Worker || lower === 'worker' || lower === 'staff') return Roles.Worker;
  // Keep canonical Owner (not legacy mock lowercase) — role checks use Roles.Owner.
  if (r === Roles.Owner || lower === 'owner') return Roles.Owner;
  if (r === Roles.Admin || lower === 'admin') return Roles.Admin;
  if (r === Roles.SuperAdmin || lower === 'superadmin') return Roles.SuperAdmin;
  if (r === Roles.Landlord || lower === 'landlord') return Roles.Landlord;
  return r || prev || Roles.Owner;
}

export function apiUserToMockUser(api: ApiUser, prev: MockUser | null): MockUser {
  const role = normalizeApiRole(api.role, prev?.role);
  return {
    id: api.id,
    email: api.email ?? prev?.email ?? '',
    password: prev?.password ?? '',
    firstName: api.firstName ?? prev?.firstName ?? '',
    lastName: api.lastName ?? prev?.lastName ?? '',
    role,
    ownerId: api.ownerId ?? prev?.ownerId,
    ownerAccess: api.ownerAccess ?? prev?.ownerAccess ?? false,
    listingIds: api.listingIds ?? (prev as { listingIds?: string[] } | null)?.listingIds,
    featureGrants: api.featureGrants ?? prev?.featureGrants ?? [],
    phone: api.phone ?? prev?.phone ?? '',
    company: api.company ?? prev?.company ?? '',
    avatar: api.avatar ?? prev?.avatar ?? '',
    termsAccepted: prev?.termsAccepted ?? true,
    newsletter: prev?.newsletter ?? false,
  };
}
