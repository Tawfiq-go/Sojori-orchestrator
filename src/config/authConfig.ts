// Configuration de l'authentification
// Basé sur /Users/gouacht/sojori-dashboard/src/config/auth.config.js

// Détermination de l'URL de base de l'API
const getApiBaseUrl = () => {
  // En production, utiliser l'URL de l'API de production
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://dev.sojori.com';
  }
  // En développement, utiliser localhost ou une URL spécifiée
  return import.meta.env.VITE_API_URL || 'http://localhost';
};

const API_BASE_URL = getApiBaseUrl();

// Déterminer si on utilise les ports locaux des microservices
const useLocalMicroservicePorts =
  !import.meta.env.PROD &&
  !import.meta.env.VITE_API_URL;

// URL du service utilisateur (srv-user)
const SRV_USER_URL = useLocalMicroservicePorts
  ? `${API_BASE_URL}:4005/api/v1/user`
  : `${API_BASE_URL}/api/v1/user`;

export const AUTH_CONFIG = {
  API_URL: `${SRV_USER_URL}/auth`,
  TOKEN_KEY: 'sojori_token',
  REFRESH_TOKEN_KEY: 'sojori_refresh_token',
  LOGIN_REDIRECT: '/dashboard',
  LOGOUT_REDIRECT: '/login',
  COOKIE_OPTIONS: {
    path: '/',
    secure: import.meta.env.PROD,  // HTTPS only in production
    httpOnly: false,  // False car on doit lire les tokens côté client pour les envoyer dans headers
    sameSite: 'Strict' as const,  // Strict pour meilleure protection CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 jours en millisecondes
  }
};

// Export des URLs des microservices pour utilisation dans d'autres services
export const MICROSERVICE_BASE_URL = {
  API_BASE_URL,
  SRV_USER: SRV_USER_URL,
  SRV_LISTING: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4000/api/v1/listing`
    : `${API_BASE_URL}/api/v1/listing`,
  SRV_ADMIN: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4006/api/v1/admin`
    : `${API_BASE_URL}/api/v1/admin`,
  SRV_RESERVATION: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4002/api/v1/reservations`
    : `${API_BASE_URL}/api/v1/reservations`,
  SRV_CALENDAR: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4004/api/v1/calendar`
    : `${API_BASE_URL}/api/v1/calendar`,
  SRV_TASK: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4003/api/v1/task`
    : `${API_BASE_URL}/api/v1/task`,
  SRV_ORCHESTRATOR: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4010/api/v1/orchestrator`
    : `${API_BASE_URL}/api/v1/orchestrator`,
  SRV_CHATBOT: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4000/api/v1/ai`
    : `${API_BASE_URL}/api/v1/ai`,
};
