// Configuration d'authentification client (source unique pour ce dépôt).

const normalizeEnvUrl = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim();
  return trimmed || undefined;
};

const DEFAULT_REMOTE_API = 'https://dev.sojori.com';

const isBrowserLocalhost = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(window.location.hostname);
};

/** Ports locaux 4000–4015 — opt-in explicite (sinon front local → dev.sojori.com, compatible CSP). */
const shouldUseLocalMicroservicePorts = (): boolean => {
  const configured = normalizeEnvUrl(import.meta.env.VITE_API_URL);
  if (configured === 'http://localhost' || configured?.startsWith('http://127.0.0.1:')) {
    return true;
  }
  return (
    import.meta.env.VITE_USE_LOCAL_MICROSERVICES === 'true' && isBrowserLocalhost()
  );
};

// Détermination de l'URL de base de l'API (runtime : évite localhost baked en prod / preview)
const getApiBaseUrl = (): string => {
  const configured = normalizeEnvUrl(import.meta.env.VITE_API_URL);
  if (configured) {
    return configured;
  }
  if (shouldUseLocalMicroservicePorts()) {
    return 'http://localhost';
  }
  return DEFAULT_REMOTE_API;
};

const API_BASE_URL = getApiBaseUrl();
const useLocalMicroservicePorts = shouldUseLocalMicroservicePorts();

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
  /** Équipe : admin-whatsapp, staff-simplified (migration srv-task → srv-fulltask) */
  SRV_FULLTASK: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4015/api/v1/fulltask`
    : `${API_BASE_URL}/api/v1/fulltask`,
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
  SRV_CRM_BECOME_HOST: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4013/api/v1/become-host`
    : `${API_BASE_URL}/api/v1/become-host`,
  // Upload endpoints
  UPLOAD_IMAGE: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4006/api/v1/admin/uploads/image`
    : `${API_BASE_URL}/api/v1/admin/uploads/image`,
  UPLOAD_IMAGE_MULTIPLE: useLocalMicroservicePorts
    ? `${API_BASE_URL}:4006/api/v1/admin/upload/upload_multiple`
    : `${API_BASE_URL}/api/v1/admin/upload/upload_multiple`,
};

// Logs désactivés pour nettoyer la console
// const logApiBases =
//   import.meta.env.DEV ||
//   (typeof window !== 'undefined' &&
//     (window.location.hostname === '127.0.0.1' ||
//       window.location.hostname === 'localhost' ||
//       window.location.hostname === '[::1]'));

// if (logApiBases) {
//   console.info('[Sojori Orchestrator] API bases', {
//     API_BASE_URL,
//     useLocalMicroservicePorts,
//     viteProdBuild: import.meta.env.PROD,
//     viteApiUrl: import.meta.env.VITE_API_URL ?? '(non défini → fallback dev.sojori.com en build prod)',
//     SRV_ADMIN: MICROSERVICE_BASE_URL.SRV_ADMIN,
//     SRV_RESERVATION: MICROSERVICE_BASE_URL.SRV_RESERVATION,
//     SRV_RESERVATION_MESSAGE: MICROSERVICE_BASE_URL.SRV_RESERVATION_MESSAGE,
//     hasDevToken: !!import.meta.env.VITE_DEV_TOKEN,
//   });
// }
