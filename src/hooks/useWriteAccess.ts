import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { isLandlordRole, isReadOnlyUser, userCanWrite } from '../utils/writeAccess';

/** Accès écriture global — Landlord toujours lecture seule. */
export function useWriteAccess(featureKey?: string) {
  const { user } = useAuth();
  return useMemo(() => {
    const readOnly = isReadOnlyUser(user);
    const canWrite = userCanWrite(user, featureKey);
    return {
      canWrite,
      readOnly,
      isLandlord: isLandlordRole(user?.role),
      user,
    };
  }, [user, featureKey]);
}
