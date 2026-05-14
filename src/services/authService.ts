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
 * Se connecte au backend production (dev.sojori.com)
 */
const authService = {
  /**
   * Connexion réelle à l'API
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password, rememberMe } = credentials;

    if (!email || !password) {
      throw new Error('Veuillez renseigner un email et un mot de passe.');
    }

    try {
      const response = await apiClient.post(AUTH_CONFIG.API_URL + '/login', {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        rememberMe: rememberMe || false,
      });

      const { token, refreshToken, user } = response.data;

      if (!token || !user) {
        throw new Error('Réponse invalide du serveur');
      }

      // Stocker les tokens
      setTokens(token, refreshToken);

      return {
        token,
        refreshToken,
        user,
      };
    } catch (error: any) {
      console.error('Login error:', error);

      // Gérer les erreurs spécifiques
      if (error.response?.status === 401) {
        throw new Error('Email ou mot de passe incorrect');
      }

      if (error.response?.status === 403) {
        throw new Error('Compte désactivé ou accès refusé');
      }

      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Erreur de connexion'
      );
    }
  },

  /**
   * Activation d'un compte worker
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
   * Inscription
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
   * Demande de réinitialisation de mot de passe
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
   * Finalise la réinitialisation du mot de passe
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
   * Mise à jour du profil
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
   * Validation du token de session
   */
  async validateToken(): Promise<ValidateTokenResponse> {
    try {
      const response = await apiClient.get(AUTH_CONFIG.API_URL + '/me');

      return {
        success: true,
        newToken: response.data.newToken,
        user: response.data.user,
      };
    } catch (error: any) {
      // Token invalide ou expiré
      throw {
        success: false,
        error: error.response?.data?.message || 'Session expirée',
        forceLogout: true,
      };
    }
  },

  /**
   * Déconnexion
   */
  logout(): void {
    // Nettoyer les tokens
    clearTokens();

    // Optionnel : appeler l'API pour invalider le token côté serveur
    // (si le backend supporte cette fonctionnalité)
    apiClient.post(AUTH_CONFIG.API_URL + '/logout').catch(() => {
      // Ignorer les erreurs de logout
    });
  },
};

export default authService;
