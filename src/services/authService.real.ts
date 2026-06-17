import apiClient from './apiClient';
import { setTokens, clearTokens } from '../utils/authUtils';
import { AUTH_CONFIG } from '../config/authConfig';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ResetPasswordPayload {
  email?: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  company?: string;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface ValidateTokenResponse {
  success: boolean;
  newToken?: string;
  user?: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  termsAccepted: boolean;
  newsletter: boolean;
}

/**
 * Service d'authentification RÉEL
 *
 * Authentification RÉELLE depuis localhost ou production
 * Le dev token sert uniquement à bypasser CORS, pas à faire du mock
 */
function userFromValidTokenPayload(data: Record<string, unknown>): User | undefined {
  const raw = data.user;
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const id = String(r._id ?? r.id ?? '').trim();
  if (!id) {
    return undefined;
  }
  return {
    id,
    email: String(r.email ?? ''),
    firstName: String(r.firstName ?? ''),
    lastName: String(r.lastName ?? ''),
    role: String(r.role ?? ''),
    phone: r.phone != null ? String(r.phone) : undefined,
    company: r.company != null ? String(r.company) : undefined,
    avatar: r.avatar != null ? String(r.avatar) : undefined,
  };
}

const authService = {
  /**
   * Détecte si on est en mode localhost avec dev token (pour logs uniquement)
   */
  isDevMode(): boolean {
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0'
    );
    const hasDevToken = !!import.meta.env.VITE_DEV_TOKEN;
    return isLocalhost && hasDevToken;
  },

  /**
   * Connexion RÉELLE (toujours, même depuis localhost)
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password, rememberMe } = credentials;

    if (!email || !password) {
      throw new Error('Veuillez renseigner un email et un mot de passe.');
    }

    try {
      const loginUrl = AUTH_CONFIG.API_URL + '/login';

      // Logs désactivés pour nettoyer la console
      // if (this.isDevMode()) {
      //   console.log('🔐 LOCALHOST MODE: Real login to', loginUrl);
      //   console.log('🔑 Dev token will bypass CORS');
      // } else {
      //   console.log('🔐 PROD MODE: Real login to', loginUrl);
      // }

      const response = await apiClient.post(loginUrl, {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        rememberMe: rememberMe || false,
      });

      const { token, refreshToken, user } = response.data;

      if (!token || !user) {
        throw new Error('Réponse invalide du serveur');
      }

      setTokens(token, refreshToken);

      // Logs désactivés pour nettoyer la console
      // console.log('✅ Connexion réussie:', user.email, '- Role:', user.role);

      return {
        token,
        refreshToken,
        user,
      };
    } catch (error: any) {
      console.error('Login error:', error);

      if (!error.response) {
        throw new Error(
          'Erreur réseau (CORS ou API injoignable). Redémarrez Vite et utilisez le proxy local (pas api.sojori.com direct).',
        );
      }

      if (error.response?.status === 401) {
        const apiError =
          error.response?.data?.error ||
          error.response?.data?.message;
        if (apiError?.includes('Role not allowed from this origin')) {
          throw new Error(
            'Connexion refusée depuis ce port local. Redémarrez srv-user ou utilisez le port 4174.',
          );
        }
        throw new Error(apiError || 'Email ou mot de passe incorrect');
      }

      if (error.response?.status === 403) {
        throw new Error('Compte désactivé ou accès refusé');
      }

      if (error.response?.status === 503 || error.response?.status === 502 || error.response?.status === 504) {
        throw new Error(
          'Service d’authentification temporairement indisponible (503). Réessayez dans quelques secondes.',
        );
      }

      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Erreur de connexion'
      );
    }
  },

  /**
   * Activation worker - toujours en mode réel
   */
  async activateWorkerAccount(data: {
    email: string;
    password: string;
    token?: string
  }): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(AUTH_CONFIG.API_URL + '/activate-worker', {
        email: data.email.trim().toLowerCase(),
        password: data.password.trim(),
        activationToken: data.token,
      });

      const { token, refreshToken, user } = response.data;
      setTokens(token, refreshToken);

      return { token, refreshToken, user };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de l\'activation du compte'
      );
    }
  },

  /**
   * Inscription RÉELLE
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(AUTH_CONFIG.API_URL + '/register', {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone.trim(),
        company: payload.company.trim(),
        termsAccepted: payload.termsAccepted,
        newsletter: payload.newsletter,
      });

      const { token, refreshToken, user } = response.data;
      setTokens(token, refreshToken);

      return { token, refreshToken, user };
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('Un compte existe déjà avec cet email');
      }

      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de l\'inscription'
      );
    }
  },

  /**
   * Reset password RÉEL
   */
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(AUTH_CONFIG.API_URL + '/reset-password', {
        email: email.trim().toLowerCase(),
      });

      return {
        success: true,
        message: response.data?.message || 'Email de réinitialisation envoyé',
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de la demande de réinitialisation'
      );
    }
  },

  /**
   * Complete password reset RÉEL
   */
  async completePasswordReset({
    email,
    password
  }: ResetPasswordPayload): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(AUTH_CONFIG.API_URL + '/complete-reset', {
        email: email?.trim().toLowerCase(),
        password: password.trim(),
      });

      return {
        success: true,
        message: response.data?.message || 'Mot de passe mis à jour avec succès',
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de la réinitialisation'
      );
    }
  },

  /**
   * Update profile RÉEL
   */
  async updateProfile(updates: Partial<RegisterPayload>): Promise<User> {
    try {
      const response = await apiClient.patch(AUTH_CONFIG.API_URL + '/profile', {
        firstName: updates.firstName?.trim(),
        lastName: updates.lastName?.trim(),
        phone: updates.phone?.trim(),
        company: updates.company?.trim(),
        newsletter: updates.newsletter,
      });

      return response.data.user;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
        'Erreur lors de la mise à jour du profil'
      );
    }
  },

  /**
   * Validate token RÉEL
   */
  async validateToken(): Promise<ValidateTokenResponse> {
    try {
      const response = await apiClient.get(AUTH_CONFIG.API_URL + '/valid-token-check');
      const data = response.data as Record<string, unknown>;

      return {
        success: Boolean(data.success !== false),
        newToken: data.newToken as string | undefined,
        user: userFromValidTokenPayload(data),
      };
    } catch (error: any) {
      throw {
        success: false,
        error: error.response?.data?.message || 'Session expirée',
        forceLogout: true,
      };
    }
  },

  /**
   * Logout RÉEL
   */
  logout(): void {
    clearTokens();

    // Appeler l'API pour invalider le token côté serveur
    apiClient.post(AUTH_CONFIG.API_URL + '/logout').catch(() => {
      // Ignorer les erreurs de logout
    });
  },
};

export default authService;
