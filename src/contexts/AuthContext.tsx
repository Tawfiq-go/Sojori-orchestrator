import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import authService from '../services/authService';
import { isMfaChallenge, isMfaEnrollment } from '../services/authService.real';
import type { AuthResponse } from '../services/authService.real';
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
import { readTokenExpiryMs, renewAccessTokenEarly } from '../services/apiClient';

export type User = MockUser;

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface MfaChallenge {
  method: 'totp' | 'whatsapp';
  challengeToken: string;
}

/** Admin sans 2FA : le login rend un jeton d'enrôlement, pas une session. */
export interface MfaEnrollment {
  enroll: true;
  enrollToken: string;
}

export interface AuthContextType extends AuthState {
  isLoading: boolean;
  /** Renvoie le défi 2FA si le compte en a un ; sinon la session est ouverte. */
  login: (credentials: LoginCredentials) => Promise<MfaChallenge | MfaEnrollment | null>;
  verifyMfa: (challengeToken: string, code: string) => Promise<void>;
  /** Ouvre la session rendue par confirm-totp (enrôlement forcé au login). */
  completeMfaEnrollment: (response: AuthResponse) => void;
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

  const verifyMfa = async (challengeToken: string, code: string): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await authService.verifyMfa(challengeToken, code);
      const user = apiUserToMockUser(response.user as ApiUser, null);
      persistUser(user);
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
        error: error?.message || 'Vérification impossible',
        isAuthenticated: false,
      }));
      throw error;
    }
  };

  const completeMfaEnrollment = (response: AuthResponse): void => {
    setTokens(response.token, response.refreshToken);
    const user = apiUserToMockUser(response.user as ApiUser, null);
    persistUser(user);
    setState({
      user,
      token: response.token,
      refreshToken: response.refreshToken,
      isAuthenticated: true,
      loading: false,
      error: null,
    });
  };

  const login = async (
    credentials: LoginCredentials,
  ): Promise<MfaChallenge | MfaEnrollment | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.login(credentials);

      // Second facteur requis : le mot de passe est bon mais aucune session
      // n'est ouverte. L'appelant affiche la saisie du code puis verifyMfa().
      if (isMfaChallenge(response)) {
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return { method: response.method, challengeToken: response.challengeToken };
      }

      // Enrôlement 2FA obligatoire (admin) : pas de session tant que le premier
      // code n'est pas validé. L'appelant affiche le dialogue d'activation.
      if (isMfaEnrollment(response)) {
        setState((prev) => ({ ...prev, loading: false, error: null }));
        return { enroll: true, enrollToken: response.enrollToken };
      }

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
      return null;
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

  /**
   * Renouvellement anticipé de l'access token (2026-09-03).
   *
   * Le refresh token n'accompagne plus chaque requête ; seul apiClient sait
   * rejouer après un 401. Les appels axios globaux et fetch (≈50 fichiers
   * legacy) verraient donc un jeton expiré toutes les 15 min. Ici on renouvelle
   * 90 s avant l'expiration, et au réveil de l'onglet si l'échéance est passée.
   */
  useEffect(() => {
    if (!state.isAuthenticated) return;
    let timer: number | null = null;
    let cancelled = false;

    const renew = async () => {
      try {
        const next = await renewAccessTokenEarly();
        if (!cancelled && next) {
          setState((prev) => ({ ...prev, token: next }));
        }
      } catch (err) {
        logAuthWarn('renouvellement anticipé échoué — le 401 suivant tentera le refresh', {
          message: (err as { message?: string })?.message,
        });
      }
    };

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      const exp = readTokenExpiryMs(getToken());
      if (!exp) return;
      const delay = Math.max(exp - Date.now() - 90_000, 5_000);
      timer = window.setTimeout(() => void renew(), delay);
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const exp = readTokenExpiryMs(getToken());
      if (exp && exp - Date.now() < 120_000) void renew();
      else schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.isAuthenticated, state.token]);

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
      verifyMfa,
      completeMfaEnrollment,
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
