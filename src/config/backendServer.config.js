/**
 * Lecteur d’env compatible CRA (`process.env.REACT_APP_*`) et Vite (`import.meta.env`).
 * Dans le navigateur sous Vite, `process` n’existe pas : utiliser `VITE_REACT_APP_*` dans `.env`
 * (ex. `VITE_REACT_APP_ENV=localhost`) ou les clés `import.meta.env` exposées.
 */
function readEnv(name) {
  try {
    const im = typeof import.meta !== 'undefined' && import.meta.env;
    if (im) {
      if (name.startsWith('REACT_APP_')) {
        const viteLegacy = `VITE_${name}`;
        if (im[viteLegacy] !== undefined && String(im[viteLegacy]) !== '')
          return String(im[viteLegacy]);
      }
      if (im[name] !== undefined && String(im[name]) !== '') return String(im[name]);
      if (name === 'NODE_ENV') {
        if (im.PROD) return 'production';
        if (im.DEV) return 'development';
        return String(im.MODE || '');
      }
    }
  } catch {
    /* ignore */
  }
  if (typeof process !== 'undefined' && process?.env) {
    const v = process.env[name];
    if (v !== undefined && v !== '') return String(v);
  }
  return '';
}

// REACT_APP_ENV (ou VITE_REACT_APP_ENV) : prod | staging | localhost — voir .env.local pour « front local + API prod ».
const rawReactEnv = (readEnv('REACT_APP_ENV') || '').trim();

/** Ingress API du repo : dev.sojori.com (admin.sojori.com n’existe pas en DNS ici). Apex vitrine → même API cluster. */
function normalizeProdUrl(raw) {
  const u = (raw || '').trim().replace(/\/$/, '');
  if (!u) return 'https://dev.sojori.com';
  if (/^https?:\/\/(www\.)?sojori\.com$/i.test(u)) return 'https://dev.sojori.com';
  if (/^https?:\/\/admin\.sojori\.com$/i.test(u)) return 'https://dev.sojori.com';
  return u;
}
const isExplicitLocalhost = rawReactEnv === 'localhost';
const isExplicitProd =
  rawReactEnv === 'prod' || rawReactEnv === 'production';

const useRemoteApiWithLocalEnv =
  isExplicitLocalhost &&
  (readEnv('REACT_APP_USE_REMOTE_API') === 'true' ||
    readEnv('REACT_APP_USE_REMOTE_API') === '1');

const env = isExplicitLocalhost
  ? 'localhost'
  : isExplicitProd
    ? 'prod'
    : readEnv('NODE_ENV') === 'development'
      ? 'staging'
      : rawReactEnv || 'staging';

const PROD_URL = normalizeProdUrl(readEnv('REACT_APP_PROD_URL') || 'https://dev.sojori.com');

const DEV_URL = 'https://dev.sojori.com';

/** Front local + `REACT_APP_USE_REMOTE_API` : origine API (défaut dev.sojori.com). Surcharge : REACT_APP_REMOTE_APP_URL */
const HYBRID_REMOTE_ORIGIN = (
  readEnv('REACT_APP_REMOTE_APP_URL') || ''
)
  .trim()
  .replace(/\/$/, '') || DEV_URL;

/** Base URL pour les appels HTTP (REST). En localhost + remote → HYBRID_REMOTE_ORIGIN (cluster prod / staging selon .env). */
const appUrl =
  env === 'prod'
    ? PROD_URL
    : env === 'staging'
      ? DEV_URL
      : useRemoteApiWithLocalEnv
        ? HYBRID_REMOTE_ORIGIN
        : 'http://localhost';

export const API_BASE_URL = appUrl;

/** true = URLs avec ports locaux (4000, 4002, …). false = chemins /api/v1 sur appUrl (dev ou prod). */
const useLocalMicroservicePorts = env === 'localhost' && !useRemoteApiWithLocalEnv;

const DEFAULT_SOCKET_PATH = '/api/v1/sockets/connect';
const localSocketPort = readEnv('REACT_APP_SOCKET_PORT') || '4007';

/**
 * URL de base Socket.IO (srv-sockets).
 *
 * Priorité :
 * 1. REACT_APP_SOCKET_URL — URL complète, prime sur tout.
 * 2. REACT_APP_SOCKET_TARGET — local | dev | staging | prod (voir commentaires dans le corps).
 * 3. Auto : env=localhost → srv-sockets local ; sauf si REACT_APP_USE_REMOTE_API (hybride) → HYBRID_REMOTE_ORIGIN.
 *    Sinon → appUrl.
 */
function resolveSocketBaseUrl() {
  const explicit = (readEnv('REACT_APP_SOCKET_URL') || '').trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const target = (readEnv('REACT_APP_SOCKET_TARGET') || '').toLowerCase().trim();

  if (target === 'local' || target === 'localhost') {
    return `http://localhost:${localSocketPort}`;
  }
  if (target === 'dev' || target === 'staging' || target === 'remote') {
    return DEV_URL;
  }
  if (target === 'prod' || target === 'production') {
    const prod =
      (readEnv('REACT_APP_SOCKET_PROD_URL') || '').trim() ||
      (readEnv('REACT_APP_PUBLIC_APP_URL') || '').trim();
    return normalizeProdUrl(prod || PROD_URL).replace(/\/$/, '');
  }

  if (env === 'localhost') {
    if (useRemoteApiWithLocalEnv) {
      return HYBRID_REMOTE_ORIGIN;
    }
    return `http://localhost:${localSocketPort}`;
  }
  return appUrl.replace(/\/$/, '');
}

const SOCKET_TARGET_ENV = (readEnv('REACT_APP_SOCKET_TARGET') || '').trim();

/** Base URL Socket.IO (importée par serverApi.reservation comme SOCKET_URL). */
export const SOCKET_BASE_URL = resolveSocketBaseUrl();

export const SOCKET_PATH =
  readEnv('REACT_APP_SOCKET_PATH') || DEFAULT_SOCKET_PATH;

export const backendServerConfig = {
  appUrl,
  env,
  /** localhost + APIs distantes (hybride) */
  useRemoteApiWithLocalEnv,
  /** Origine API utilisée en hybride (voir REACT_APP_REMOTE_APP_URL) */
  hybridRemoteOrigin: HYBRID_REMOTE_ORIGIN,
  /** URL effective du socket (copie de SOCKET_BASE_URL) */
  socketUrl: SOCKET_BASE_URL,
  /** Ex. "local", "prod", ou "" si mode auto */
  socketTarget: SOCKET_TARGET_ENV,
  TIMEOUT: '',
};

export const MICROSERVICE_BASE_URL =
  useLocalMicroservicePorts
    ? {
      LISTING_TESTING: `${backendServerConfig.appUrl}:4000/api/v1/listing-test/listings`,
      LISTING: `${backendServerConfig.appUrl}:4000/api/v1/listing/listings`,
      CALENDAR: `${backendServerConfig.appUrl}:4004/api/v1/calendar/calendar`,
      COUNTRY: `${backendServerConfig.appUrl}:4006/api/v1/admin/country`,
      CITY: `${backendServerConfig.appUrl}:4006/api/v1/admin/city`,
      UPLOAD_IMAGE: `${backendServerConfig.appUrl}:4006/api/v1/admin/upload/get_link`,
      UPLOAD_IMAGE_MULTIPLE: `${backendServerConfig.appUrl}:4006/api/v1/admin/upload/upload_multiple`,
      CITIESMAPPING: `${backendServerConfig.appUrl}:4006/api/v1/admin/mapping`,
      BLOGS: `${backendServerConfig.appUrl}:4006/api/v1/admin/blog`,
      SLIDES: `${backendServerConfig.appUrl}:4006/api/v1/admin/slide-show`,
      PROPERTYTYPES: `${backendServerConfig.appUrl}:4000/api/v1/listing/propertyTypes`,
      OPENAI: `${backendServerConfig.appUrl}:4006/api/v1/admin/open-ai-init`,
      OPENAICONFIG: `${backendServerConfig.appUrl}:4006/api/v1/admin/open-ai-config`,
      TAG: `${backendServerConfig.appUrl}:4006/api/v1/listing/tag`,
      CHANNEL_MANAGER: `${backendServerConfig.appUrl}:4006/api/v1/admin/channel-manager`,
      CHANNELMANAGER: `${backendServerConfig.appUrl}:4006/api/v1/admin/channel-manager`,


      AMENITIES: `${backendServerConfig.appUrl}:4000/api/v1/listing/amenities`,
      AMENITIESMAPPING: `${backendServerConfig.appUrl}:4000/api/v1/listing/amenities/mapping/amenities`,
      RESERVATION: `${backendServerConfig.appUrl}:4002/api/v1/reservations/reservations`,
      BEDTYPE: `${backendServerConfig.appUrl}:4000/api/v1/listing/bedTypes`,
      TAGS: `${backendServerConfig.appUrl}/api/v1/listing/tag?page=0&limit=20&paged=false&search_text`,
      LANGUAGE: `${backendServerConfig.appUrl}:4006/api/v1/admin/language`,


      SRV_LISTING: `${backendServerConfig.appUrl}:4000/api/v1/listing`,
      SRV_LISTING_TESTING: `${backendServerConfig.appUrl}:4004/api/v1/listing-test/listings`,
      SRV_ADMIN: `${backendServerConfig.appUrl}:4006/api/v1/admin`,
      SRV_RESERVATION: `${backendServerConfig.appUrl}:4002/api/v1/reservations`,
      SRV_RESERVATION_MESSAGE: `${backendServerConfig.appUrl}:4002/api/v1/message`,
      SRV_CALENDAR: `${backendServerConfig.appUrl}:4004/api/v1/calendar`,
      SRV_CRON: `${backendServerConfig.appUrl}:4009/api/v1/cron`,
      SRV_USER: `${backendServerConfig.appUrl}:4005/api/v1/user`,
      /** CRM (srv-crm) — agents, RDV, créneaux ; démo publique sous SRV_CRM_DEMO */
      SRV_CRM: `${backendServerConfig.appUrl}:4013/api/v1/crm`,
      SRV_CRM_DEMO: `${backendServerConfig.appUrl}:4013/api/v1/demo`,
      SRV_TASK: `${backendServerConfig.appUrl}:4003/api/v1/task`,
      SRV_ORCHESTRATOR: `${backendServerConfig.appUrl}:4010/api/v1/orchestrator`,
      SRV_CHATBOT: `${backendServerConfig.appUrl}:4000/api/v1/ai`,
      SRV_EVENT_STORE: `${backendServerConfig.appUrl}:3016/api/events`,

    }
    : {
      // don't use  
      LISTING: `${backendServerConfig.appUrl}/api/v1/listing/listings`,
      AMENITIES: `${backendServerConfig.appUrl}/api/v1/listing/amenities`,
      AMENITIESMAPPING: `${backendServerConfig.appUrl}/api/v1/listing/amenities/mapping/amenities`,
      CALENDAR: `${backendServerConfig.appUrl}/api/v1/calendar/calendar`,
      COUNTRY: `${backendServerConfig.appUrl}/api/v1/admin/country`,
      CITY: `${backendServerConfig.appUrl}/api/v1/admin/city`,
      UPLOAD_IMAGE: `${backendServerConfig.appUrl}/api/v1/admin/upload/get_link`,
      UPLOAD_IMAGE_MULTIPLE: `${backendServerConfig.appUrl}/api/v1/admin/upload/upload_multiple`,
      CITIESMAPPING: `${backendServerConfig.appUrl}/api/v1/admin/mapping`,
      BLOGS: `${backendServerConfig.appUrl}/api/v1/admin/blog`,
      SLIDES: `${backendServerConfig.appUrl}/api/v1/admin/slide-show`,
      RESERVATION: `${backendServerConfig.appUrl}/api/v1/reservations/reservations`,
      BEDTYPE: `${backendServerConfig.appUrl}/api/v1/listing/bedTypes`,
      PROPERTYTYPES: `${backendServerConfig.appUrl}/api/v1/listing/propertyTypes`,
      OPENAI: `${backendServerConfig.appUrl}/api/v1/admin/open-ai-init`,
      OPENAICONFIG: `${backendServerConfig.appUrl}/api/v1/admin/open-ai-config`,
      LANGUAGE: `${backendServerConfig.appUrl}/api/v1/admin/language`,
      TAG: `${backendServerConfig.appUrl}/api/v1/listing/tag`,
      CHANNEL_MANAGER: `${backendServerConfig.appUrl}/api/v1/admin/channel-manager`,
      CHANNELMANAGER: `${backendServerConfig.appUrl}/api/v1/admin/channel-manager`,

      // use
      SRV_LISTING: `${backendServerConfig.appUrl}/api/v1/listing`,
      SRV_LISTING_TESTING: `${backendServerConfig.appUrl}:4004/api/v1/listing-test/listings`,
      SRV_ADMIN: `${backendServerConfig.appUrl}/api/v1/admin`,
      SRV_RESERVATION: `${backendServerConfig.appUrl}/api/v1/reservations`,
      SRV_RESERVATION_MESSAGE: `${backendServerConfig.appUrl}/api/v1/message`,
      SRV_CALENDAR: `${backendServerConfig.appUrl}/api/v1/calendar`,
      SRV_CRON: `${backendServerConfig.appUrl}/api/v1/cron`,
      SRV_USER: `${backendServerConfig.appUrl}/api/v1/user`,
      SRV_CRM: `${backendServerConfig.appUrl}/api/v1/crm`,
      SRV_CRM_DEMO: `${backendServerConfig.appUrl}/api/v1/demo`,
      SRV_TASK: `${backendServerConfig.appUrl}/api/v1/task`,
      SRV_ORCHESTRATOR: `${backendServerConfig.appUrl}/api/v1/orchestrator`,
      SRV_CHATBOT: `${backendServerConfig.appUrl}/api/v1/ai`,
      SRV_EVENT_STORE: `${backendServerConfig.appUrl}/api/events`,
    };

/**
 * Base URL srv-orchestrator (execute, check-conditions, message-logs).
 * Si REACT_APP_ORCHESTRATOR_URL = origine seule (ex. https://dev.sojori.com), on ajoute /api/v1/orchestrator
 * pour éviter POST …/actions/… qui ne pointe pas sur le bon service.
 * Sinon : MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR (même logique que le reste du dashboard).
 */
export function getOrchestratorApiBaseUrl() {
  const explicit = (readEnv('REACT_APP_ORCHESTRATOR_URL') || '').trim().replace(/\/$/, '')
  if (explicit) {
    if (/\/api\/v1\/orchestrator/i.test(explicit)) return explicit
    return `${explicit}/api/v1/orchestrator`
  }
  return (MICROSERVICE_BASE_URL.SRV_ORCHESTRATOR || '').replace(/\/$/, '')
}
