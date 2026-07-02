import {
  setTokens,
  clearTokens,
} from '../utils/authUtils';
import {
  buildMockUserFromEmail,
  clearPersistedUser,
  clearResetEmail,
  createMockTokens,
  findUserByEmail,
  getPersistedUser,
  getResetEmail,
  getStoredUsers,
  persistResetEmail,
  persistUser,
  saveStoredUsers,
} from '../data/mockAuth';
import type { MockUser, RegisterPayload } from '../data/mockAuth';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ResetPasswordPayload {
  token: string;
  email?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: MockUser;
}

export interface ValidateTokenResponse {
  success: boolean;
  newToken?: string;
  user?: MockUser;
}

/**
 * Service d'authentification
 * Version mock persistante pour Agent 1.
 */
const authService = {
  /**
   * Connexion mock.
   * Toute combinaison email/password est acceptée pour accélérer les démos.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password.trim();

    if (!email || !password) {
      throw new Error('Veuillez renseigner un email et un mot de passe.');
    }

    const existingUser = findUserByEmail(email);
    const user = existingUser || buildMockUserFromEmail(email, password);

    if (!existingUser) {
      const nextUsers = [user, ...getStoredUsers()];
      saveStoredUsers(nextUsers);
    }

    const tokens = createMockTokens(user);
    persistUser(user);
    setTokens(tokens.token, tokens.refreshToken);

    return { ...tokens, user };
  },

  /**
   * Activation mock d'un compte worker.
   */
  async activateWorkerAccount(data: { email: string; password: string; token?: string }): Promise<AuthResponse> {
    return this.login({
      email: data.email,
      password: data.password,
    });
  },

  /**
   * Inscription mock.
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const email = payload.email.trim().toLowerCase();

    if (findUserByEmail(email)) {
      throw new Error('Un compte existe deja avec cet email.');
    }

    const user: MockUser = {
      id: `mock-user-${Date.now()}`,
      email,
      password: payload.password,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      role: 'owner',
      phone: payload.phone.trim(),
      company: payload.company.trim(),
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
      termsAccepted: payload.termsAccepted,
      newsletter: payload.newsletter,
    };

    saveStoredUsers([user, ...getStoredUsers()]);
    persistUser(user);

    const tokens = createMockTokens(user);
    setTokens(tokens.token, tokens.refreshToken);

    return { ...tokens, user };
  },

  /**
   * Demande de reset mock.
   */
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    persistResetEmail(normalizedEmail);

    return {
      success: true,
      message: `Lien de reinitialisation mock envoye a ${normalizedEmail}.`,
    };
  },

  /**
   * Finalise un reset mock.
   */
  async completePasswordReset({
    token,
    email,
    password,
  }: ResetPasswordPayload): Promise<{ success: boolean; message: string }> {
    if (!token) {
      throw new Error('Token de réinitialisation manquant.');
    }
    const targetEmail = (email || getResetEmail()).trim().toLowerCase();
    const users = getStoredUsers();
    const existingUser = users.find((user) => user.email === targetEmail);

    if (!existingUser) {
      throw new Error('Aucun compte mock ne correspond a cet email.');
    }

    const updatedUsers = users.map((user) =>
      user.email === targetEmail ? { ...user, password } : user
    );
    const updatedUser = updatedUsers.find((user) => user.email === targetEmail)!;

    saveStoredUsers(updatedUsers);
    persistUser(updatedUser);
    clearResetEmail();

    return {
      success: true,
      message: 'Mot de passe mock mis a jour avec succes.',
    };
  },

  /**
   * Mise a jour mock du profil.
   */
  async updateProfile(updates: Partial<RegisterPayload>): Promise<MockUser> {
    const currentUser = getPersistedUser();

    if (!currentUser) {
      throw new Error('Aucune session mock active.');
    }

    const updatedUser: MockUser = {
      ...currentUser,
      firstName: updates.firstName?.trim() || currentUser.firstName,
      lastName: updates.lastName?.trim() || currentUser.lastName,
      phone: updates.phone?.trim() || currentUser.phone,
      company: updates.company?.trim() || currentUser.company,
      newsletter: updates.newsletter ?? currentUser.newsletter,
    };

    const updatedUsers = getStoredUsers().map((user) =>
      user.id === currentUser.id ? updatedUser : user
    );

    saveStoredUsers(updatedUsers);
    persistUser(updatedUser);

    return updatedUser;
  },

  /**
   * Validation de session mock.
   */
  async validateToken(): Promise<ValidateTokenResponse> {
    const user = getPersistedUser();

    if (!user) {
      throw {
        success: false,
        error: 'No mock session found',
        forceLogout: true,
      };
    }

    return {
      success: true,
      newToken: createMockTokens(user).token,
      user,
    };
  },

  /**
   * Déconnexion de l'utilisateur
   */
  logout(): void {
    clearTokens();
    clearPersistedUser();
    clearResetEmail();
  }
};

export default authService;
