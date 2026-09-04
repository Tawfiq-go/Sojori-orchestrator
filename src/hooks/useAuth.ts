import { useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextType, User } from '../contexts/AuthContext';
import { AdminViewOverrideContext } from '../contexts/AdminViewOverrideContext';

/**
 * Compte réellement connecté — sans la vue owner.
 *
 * Réservé (2026-09-03) aux endroits qui DOIVENT connaître le rôle réel :
 * gardes de route (RouteAccessGuard, AdminRoute, EmailRestrictedRoute,
 * ProtectedRoute), PmSimulationProvider, la sidebar en mode admin,
 * AdminSessionTopBarButton. Partout ailleurs, `useAuth()`.
 */
export const useRealAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Make sure to wrap your app with <AuthProvider>.'
    );
  }

  return context;
};

function toEffectiveUser(real: User, view: { ownerId: string; ownerLabel: string; ownerEmail?: string }): User {
  const [firstName, ...rest] = view.ownerLabel.trim().split(/\s+/);
  return {
    ...real,
    id: view.ownerId,
    // Beaucoup d'écrans lisent `_id` (forme API) plutôt que `id`.
    ...({ _id: view.ownerId } as Record<string, unknown>),
    role: 'Owner',
    email: view.ownerEmail || real.email,
    firstName: firstName || view.ownerLabel,
    lastName: rest.join(' '),
    // Un Owner n'a ni employeur ni grants worker.
    ownerId: undefined,
    ownerAccess: undefined,
    listingIds: undefined,
    featureGrants: undefined,
  };
}

/**
 * Contexte d'authentification, vu à travers « la vue » quand un admin regarde
 * un owner : `user` devient cet owner (rôle Owner, id de l'owner). Le reste
 * (token, logout, session) reste celui du compte réel.
 */
export const useAuth = (): AuthContextType => {
  const context = useRealAuth();
  const view = useContext(AdminViewOverrideContext);

  return useMemo(() => {
    if (!view || !context.user) return context;
    return { ...context, user: toEffectiveUser(context.user, view) };
  }, [context, view]);
};
