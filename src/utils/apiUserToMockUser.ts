import type { User as ApiUser } from '../services/authService';
import type { MockUser, MockUserRole } from '../data/mockAuth';

export function apiUserToMockUser(api: ApiUser, prev: MockUser | null): MockUser {
  const role = (api.role as MockUserRole) || prev?.role || 'owner';
  return {
    id: api.id,
    email: api.email ?? prev?.email ?? '',
    password: prev?.password ?? '',
    firstName: api.firstName ?? prev?.firstName ?? '',
    lastName: api.lastName ?? prev?.lastName ?? '',
    role,
    ownerId: api.ownerId ?? prev?.ownerId,
    phone: api.phone ?? prev?.phone ?? '',
    company: api.company ?? prev?.company ?? '',
    avatar: api.avatar ?? prev?.avatar ?? '',
    termsAccepted: prev?.termsAccepted ?? true,
    newsletter: prev?.newsletter ?? false,
  };
}
