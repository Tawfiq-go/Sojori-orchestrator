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
} from '../services/authService';
import type { MockUser, RegisterPayload } from '../data/mockAuth';
import {
  clearTokens,
  getRefreshToken,
  getToken,
  setTokens,
} from '../utils/authUtils';
import { getPersistedUser } from '../data/mockAuth';

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

    return {
      user,
      token: token || null,
      refreshToken: refreshToken || null,
      isAuthenticated: !!user,
      loading: !!user || !!token,
      error: null,
    };
  });

  const logout = useCallback((): void => {
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
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await authService.validateToken();
      const refreshToken = state.refreshToken || getRefreshToken() || '';

      if (response.newToken && refreshToken) {
        setTokens(response.newToken, refreshToken);
      }

      setState((prev) => ({
        ...prev,
        token: response.newToken || prev.token,
        refreshToken: refreshToken || prev.refreshToken,
        user: response.user || prev.user,
        isAuthenticated: !!response.user,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      if (error?.forceLogout) {
        clearTokens();
        logout();
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
  }, [logout, state.refreshToken]);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await authService.login(credentials);
      setState({
        user: response.user,
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
      setState({
        user: response.user,
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
      const user = await authService.updateProfile(payload);
      setState((prev) => ({
        ...prev,
        user,
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
    if (state.user || state.token) {
      void checkAuth();
      return;
    }

    setState((prev) => ({ ...prev, loading: false }));
  }, [checkAuth, state.token, state.user]);

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
