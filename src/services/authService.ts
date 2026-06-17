import realAuthService from './authService.real';
import mockAuthService from './authService.mock';

/** Mock auth uniquement si opt-in explicite — jamais via VITE_DISABLE_AUTH. */
export function isMockAuthEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_AUTH === 'true';
}

const authService = isMockAuthEnabled() ? mockAuthService : realAuthService;

export default authService;

export type {
  LoginCredentials,
  ResetPasswordPayload,
  User,
  AuthResponse,
  ValidateTokenResponse,
  RegisterPayload,
} from './authService.real';
