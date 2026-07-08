import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import authService from '../services/authService';
import type {
  LoginCredentials,
  ResetPasswordPayload,
  User as ApiUser,
} from '../services/authService';
import type { MockUser, RegisterPayload } from '../data/mockAuth';
import {
  clearTokens,
  getRefreshToken,
  getToken,
  setTokens,
} from '../utils/authUtils';
import { clearPersistedUser, getPersistedUser, persistUser } from '../data/mockAuth';
import { clearPmSimulationSnapshot } from '../utils/pmSimulationSession';
import { clearPersistedAdminScope } from '../utils/adminOwnerFilter.utils';
import { apiUserToMockUser } from '../utils/apiUserToMockUser';
import { logAuth, logAuthError, logAuthWarn, maskToken } from '../utils/dashboardDebug';
import { SESSION_EXPIRED_EVENT } from '../utils/devApiAccess';

export type User = MockUser;

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateToken: (newToken: string) => void;
  checkAuth: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  completePasswordReset: (
    payload: ResetPasswordPayload
  ) => Promise<{ success: boolean; message: string }>;
  updateProfile: (payload: Partial<RegisterPayload>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const token = getToken();
    const refreshToken = getRefreshToken();
    const user = getPersistedUser();

    const hasToken = !!token;
    logAuth('init session', {
      hasToken,
      hasRefreshToken: !!refreshToken,
      hasPersistedUser: !!user,
      tokenPreview: maskToken(token),
    });

    return {
      user: hasToken ? user : null,
      token: token || null,
      refreshToken: refreshToken || null,
      /** Validé par GET /auth/me dans checkAuth — pas au seul cookie */
      isAuthenticated: false,
      loading: hasToken,
      error: null,
    };
  });

  const logout = useCallback((): void => {
    logAuth('logout');
    clearPersistedUser();
    clearPmSimulationSnapshot();
    clearPersistedAdminScope();

    setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });
    authService.logout();
  }, []);

  const updateToken = useCallback(
    (newToken: string): void => {
      const currentRefreshToken = state.refreshToken || getRefreshToken() || '';
      setTokens(newToken, currentRefreshToken);
      setState((prev) => ({
        ...prev,
        token: newToken,
        isAuthenticated: true,
      }));
    },
    [state.refreshToken]
  );

  const checkAuth = useCallback(async (): Promise<void> => {
    const token = getToken();
    logAuth('checkAuth start', { tokenPreview: maskToken(token) });

    if (!token) {
      logAuthWarn('checkAuth: aucun token — redirection login imminente');
      clearPersistedUser();
      setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await authService.validateToken();
      const refreshToken = getRefreshToken() || '';

      if (response.newToken && refreshToken) {
        setTokens(response.newToken, refreshToken);
      }

      const newUser = response.user ? apiUserToMockUser(response.user as ApiUser, null) : null;

      // ✅ Persister le user mis à jour dans localStorage
      if (newUser) {
        persistUser(newUser);
      }

      logAuth('checkAuth OK', {
        userId: newUser?.id,
        email: newUser?.email,
        role: newUser?.role,
        ownerAccess: newUser?.ownerAccess,
        featureGrants: newUser?.featureGrants?.length ?? 0,
        newToken: !!response.newToken,
      });

      setState((prev) => ({
        ...prev,
        token: response.newToken || prev.token,
        refreshToken: refreshToken || prev.refreshToken,
        user: newUser || prev.user,
        /** Session valide dès que /valid-token-check répond OK (JWT accepté) */
        isAuthenticated: true,
        loading: false,
        error: null,
      }));
    } catch (error: unknown) {
      const err = error as {
        forceLogout?: boolean;
        error?: string;
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      logAuthError('checkAuth FAILED', {
        forceLogout: err?.forceLogout,
        status: err?.response?.status,
        message: err?.message || err?.error,
        body: err?.response?.data,
      });
      if (err?.forceLogout === false) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err?.error || err?.message || 'Impossible de valider la session',
        }));
        return;
      }
      clearTokens();
      clearPersistedUser();
      setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
        error: err?.error || err?.message || 'Session expirée — reconnectez-vous',
      });
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.login(credentials);
      const user = apiUserToMockUser(response.user as ApiUser, null);

      // ✅ Persister le user dans localStorage pour le garder après reload
      persistUser(user);
      logAuth('login OK', {
        userId: user.id,
        email: user.email,
        role: user.role,
        ownerAccess: user.ownerAccess,
        featureGrants: user.featureGrants?.length ?? 0,
      });

      setState({
        user,
        token: response.token,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || 'Login failed',
        isAuthenticated: false,
      }));
      throw error;
    }
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.register(payload);
      const user = apiUserToMockUser(response.user as ApiUser, null);

      // ✅ Persister le user dans localStorage pour le garder après reload
      persistUser(user);
      logAuth('login OK', {
        userId: user.id,
        email: user.email,
        role: user.role,
        ownerAccess: user.ownerAccess,
        featureGrants: user.featureGrants?.length ?? 0,
      });

      setState({
        user,
        token: response.token,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || 'Registration failed',
      }));
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await authService.resetPassword(email);
      setState((prev) => ({ ...prev, loading: false }));
      return result;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || 'Password reset failed',
      }));
      throw error;
    }
  };

  const completePasswordReset = async (payload: ResetPasswordPayload) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await authService.completePasswordReset(payload);
      setState((prev) => ({ ...prev, loading: false }));
      return result;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || 'Password update failed',
      }));
      throw error;
    }
  };

  const updateProfile = async (payload: Partial<RegisterPayload>): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const apiUser = await authService.updateProfile(payload);
      setState((prev) => ({
        ...prev,
        user: apiUserToMockUser(apiUser as ApiUser, prev.user),
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || 'Profile update failed',
      }));
      throw error;
    }
  };

  useEffect(() => {
    const onSessionExpired = () => {
      logAuthWarn('session-expired event — reset auth state');
      clearPersistedUser();
      setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
        error: 'Session expirée — reconnectez-vous',
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  useEffect(() => {
    const token = getToken();
    const persistedUser = getPersistedUser();
    logAuth('mount', {
      hasToken: Boolean(token),
      hasPersistedUser: Boolean(persistedUser),
      tokenPreview: maskToken(token),
      path: window.location.pathname,
    });

    if (token) {
      void checkAuth();
      return;
    }

    if (persistedUser) {
      logAuthWarn('user localStorage sans token — nettoyage');
      clearPersistedUser();
    }

    setState((prev) => ({
      ...prev,
      user: null,
      isAuthenticated: false,
      loading: false,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ FIX: tableau vide pour n'exécuter qu'au montage

  const contextValue = useMemo<AuthContextType>(
    () => ({
      ...state,
      isLoading: state.loading,
      login,
      register,
      logout,
      updateToken,
      checkAuth,
      resetPassword,
      completePasswordReset,
      updateProfile,
    }),
    [state, logout, updateToken, checkAuth]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
