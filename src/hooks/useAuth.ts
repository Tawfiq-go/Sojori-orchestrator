import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextType } from '../contexts/AuthContext';

/**
 * Hook personnalisé pour accéder au contexte d'authentification
 * Doit être utilisé à l'intérieur d'un AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Make sure to wrap your app with <AuthProvider>.'
    );
  }

  return context;
};
