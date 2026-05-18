// Configuration d'authentification client (source unique pour ce dépôt).

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
    /** Aligné avec cookieUtils : Secure seulement sur https (sinon preview http://127.0.0.1:4174 casse l’auth). */
    secure: false,
    httpOnly: false,  // False car on doit lire les tokens côté client pour les envoyer dans headers
    sameSite: 'Lax' as const,  // Lax (pas Strict) pour permettre navigation et reload
    expires: 7,  // 7 jours
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
  /** Villes (admin) — wizard import RU */
  CITY: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4006/api/v1/admin/city`
    : `${API_BASE_URL}/api/v1/admin/city`,
  SRV_RESERVATION: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4002/api/v1/reservations`
    : `${API_BASE_URL}/api/v1/reservations`,
  /** Router Express `messageState` : `/api/v1/message/*` (pas sous `/reservations/`) */
  SRV_RESERVATION_MESSAGE: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4002/api/v1/message`
    : `${API_BASE_URL}/api/v1/message`,
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
  SRV_CRM: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4013/api/v1/crm`
    : `${API_BASE_URL}/api/v1/crm`,
  SRV_CRM_DEMO: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4013/api/v1/demo`
    : `${API_BASE_URL}/api/v1/demo`,
  // Upload endpoints
  UPLOAD_IMAGE: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4006/api/v1/admin/uploads/image`
    : `${API_BASE_URL}/api/v1/admin/uploads/image`,
  UPLOAD_IMAGE_MULTIPLE: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4006/api/v1/admin/uploads/multiple`
    : `${API_BASE_URL}/api/v1/admin/uploads/multiple`,
};

const logApiBases =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]'));

if (logApiBases) {
  console.info('[Sojori Orchestrator] API bases', {
    API_BASE_URL,
    useLocalMicroservicePorts,
    viteProdBuild: import.meta.env.PROD,
    viteApiUrl: import.meta.env.VITE_API_URL ?? '(non défini → fallback dev.sojori.com en build prod)',
    SRV_ADMIN: MICROSERVICE_BASE_URL.SRV_ADMIN,
    SRV_RESERVATION: MICROSERVICE_BASE_URL.SRV_RESERVATION,
    SRV_RESERVATION_MESSAGE: MICROSERVICE_BASE_URL.SRV_RESERVATION_MESSAGE,
    hasDevToken: !!import.meta.env.VITE_DEV_TOKEN,
  });
}
