import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { clearTokens, getToken, getRefreshToken, setTokens, isAppEmbeddedInIframe } from '../utils/authUtils';
import { AUTH_CONFIG } from '../config/authConfig';
import {
  logApiHttpFailure,
  logAuth,
  logAuthError,
  logAuthWarn,
  maskToken,
} from '../utils/dashboardDebug';
import { runtimeLog } from '../utils/runtimeLog';
import { hasDevTokenBypass, invalidateSession } from '../utils/devApiAccess';
import store from '../redux/store';
import { isLandlordMutationAllowlisted, isLandlordRole } from '../utils/writeAccess';
import { toast } from 'react-toastify';

/**
 * VITE_DISABLE_AUTH : ne concerne que le garde `ProtectedRoute` (éviter la redirection login).
 * Les appels API doivent TOUJOURS envoyer le JWT — sinon 401 sur listing / admin / etc.
 */
const devBypassFrontendGuard = import.meta.env.VITE_DISABLE_AUTH === 'true';

function isSessionInvalidBody(data: Record<string, unknown> | undefined): boolean {
  return Boolean(
    data?.forceLogout ||
      data?.error === 'Session expired, please login again' ||
      data?.error === 'Invalid token',
  );
}

/** Inbox / comms : échec endpoint ≠ session morte — ne pas expulser tout le dashboard. */
function isInboxSoftFailEndpoint(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes('/api/v1/ai/debug') ||
    u.includes('/fullchatbot/debug') ||
    u.includes('/staff-whatsapp') ||
    u.includes('/api/v1/fulltask/staff-whatsapp') ||
    u.includes('/rentals/get-thread') ||
    u.includes('/rentals/get-review') ||
    u.includes('/rentals/get-messages-by-thread-id') ||
    u.includes('/communications-ai/')
  );
}

async function refreshSessionViaValidTokenCheck(): Promise<string | null> {
  const token = getToken();
  const refreshToken = getRefreshToken();
  if (!token || !refreshToken) return null;

  const response = await apiClient.get(`${AUTH_CONFIG.API_URL}/valid-token-check`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-refresh-token': refreshToken,
    },
    _internalTokenRefresh: true,
  } as InternalAxiosRequestConfig);

  const refreshedToken = response.data?.newToken as string | undefined;
  const tokenForUse = refreshedToken || token;
  setTokens(tokenForUse, refreshToken);
  return tokenForUse;
}
// Logs désactivés pour nettoyer la console
// let loggedDisableAuthApiClient = false;
// if (devBypassFrontendGuard && !loggedDisableAuthApiClient) {
//   loggedDisableAuthApiClient = true;
//   console.warn(
//     '⚠️ VITE_DISABLE_AUTH : garde UI désactivée ; Authorization: Bearer est quand même envoyé — sans JWT valide les APIs (listing, admin…) répondront 401.',
//   );
//   console.log('🔍 [apiClient] Variables d\'environnement:', {
//     VITE_DISABLE_AUTH: import.meta.env.VITE_DISABLE_AUTH,
//     VITE_DEV_TOKEN: import.meta.env.VITE_DEV_TOKEN ? '✅ défini' : '❌ non défini',
//     VITE_API_URL: import.meta.env.VITE_API_URL,
//     MODE: import.meta.env.MODE,
//   });
// }

// Variable pour gérer la validation de token
let isValidatingToken = false;
let validationPromise: Promise<{ newToken?: string; user?: any }> | null = null;

// Créer l'instance axios
const apiClient: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,  // 🔒 Set to false to allow wildcard CORS origin (we use X-Dev-Token + JWT headers instead)
  /** Snapshot admin / agrégations peut dépasser 30s ; ne pas couper trop tôt. */
  timeout: 180_000,
});

// 🔒 CORS Security: Add dev token for localhost → production
// 🔒 CORS Security: Add dev token for localhost → production
// X-Dev-Token IS allowed by Ingress in cors-allow-headers
// Backend with DISABLE_AUTH=true will accept requests with X-Dev-Token
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);
// Logs désactivés pour nettoyer la console
if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
  apiClient.defaults.headers.common['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
  // console.log('🔑 X-Dev-Token défini pour localhost → prod (port ' + window.location.port + '). Logs requête désactivés.');
}

// Intercepteur de requête
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Ne pas ajouter de token pour les requêtes d’auth publiques uniquement
    if (
      config.url?.includes('/login') ||
      config.url?.includes('/register') ||
      config.url?.includes('/reset-password') ||
      config.url?.includes('/complete-reset')
    ) {
      return config;
    }

    // Landlord = lecture seule : bloquer POST/PUT/PATCH/DELETE (sauf auth)
    const method = String(config.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const role = store.getState?.().auth?.user?.role;
      if (isLandlordRole(role) && !isLandlordMutationAllowlisted(config.url)) {
        const err = new Error(
          'Compte propriétaire : accès en lecture seule — modification impossible.',
        ) as Error & { code?: string; response?: { status: number; data: unknown } };
        err.code = 'LANDLORD_READ_ONLY';
        err.response = {
          status: 403,
          data: { success: false, error: err.message },
        };
        if (typeof window !== 'undefined') {
          toast.warn(err.message, { toastId: 'landlord-readonly' });
        }
        return Promise.reject(err);
      }
    }

    // Gestion du FormData (préserver le Content-Type natif)
    if (config.data instanceof FormData) {
      const headers = AxiosHeaders.from(config.headers);
      headers.delete('Content-Type');
      headers.delete('content-type');
      config.headers = headers;
      config.transformRequest = [(data) => data];
    }

    // 🔒 CRITICAL: Add X-Dev-Token for localhost → production CORS
    // Must be done INSIDE interceptor (not at module level) to ensure window exists
    if (typeof window !== 'undefined') {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '0.0.0.0';

      if (isLocalhost && import.meta.env.VITE_DEV_TOKEN && config.headers) {
        config.headers['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
      }
    }

    // Attendre si une validation de token est en cours
    if (isValidatingToken && validationPromise) {
      await validationPromise;
    }

    // Ajouter les tokens aux headers
    const token = getToken();
    const refreshToken = getRefreshToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (refreshToken && config.headers) {
      config.headers['x-refresh-token'] = refreshToken;
    }

    // Scope PM simulation via ownerId query param (AdminOwnerFilter) — pas de header custom
    // (X-Sojori-View-As-Owner bloque le preflight CORS localhost → dev.sojori.com).

    if (
      import.meta.env.VITE_DASHBOARD_DEBUG === 'true' &&
      config.url &&
      !config.url.includes('/valid-token-check')
    ) {
      logAuth(`→ ${config.method?.toUpperCase() ?? 'GET'} ${config.url}`, {
        hasAuth: !!token,
        tokenPreview: maskToken(token),
        hasRefresh: !!refreshToken,
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const url = typeof response.config?.url === 'string' ? response.config.url : '';
    if (url.includes('/analytics/')) {
      const body = response.data as Record<string, unknown> | undefined;
      runtimeLog('info', 'HTTP', `← ${response.status} ${url.split('?')[0]}`, {
        success: body?.success,
        hasData: Boolean(body?.data),
        error: body?.error,
      });
    }

    // Si un nouveau token est retourné dans la réponse, le mettre à jour
    if (response.data?.newToken) {
      const newToken = response.data.newToken;
      setTokens(newToken, getRefreshToken() || '');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const url = typeof originalRequest?.url === 'string' ? originalRequest.url : '';

    /** Appels internes refresh — ne pas re-déclencher logout / boucle. */
    if (originalRequest?._internalTokenRefresh) {
      return Promise.reject(error);
    }

    if (url.includes('/analytics/')) {
      const canceled =
        axios.isCancel(error) ||
        error.code === 'ERR_CANCELED' ||
        (error as { name?: string }).name === 'CanceledError';
      if (!canceled) {
        runtimeLog('error', 'HTTP', `✗ ${url.split('?')[0]}`, {
          status: error.response?.status,
          code: error.code,
          message: error.message,
          body: error.response?.data,
        });
      }
    }

    // Si un nouveau token est retourné dans l'erreur, le mettre à jour et réessayer
    if (error.response?.data?.newToken) {
      const newToken = error.response.data.newToken;
      setTokens(newToken, getRefreshToken() || '');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    }

    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const isSessionInvalidResponse = isSessionInvalidBody(responseData);

    // Gestion du forceLogout ou session expirée
    if (isSessionInvalidResponse) {
      const inboxSoftFail = isInboxSoftFailEndpoint(url);

      if (!inboxSoftFail) {
        logAuthWarn(
          hasDevTokenBypass() ? 'session JWT expirée (dev bypass actif)' : 'session invalidée — redirect login',
          { url: originalRequest?.url, status: error.response?.status },
        );
      }

      if (!isAppEmbeddedInIframe()) {
        if (hasDevTokenBypass() && !originalRequest._devAuthRetry) {
          originalRequest._devAuthRetry = true;
          clearTokens();
          delete originalRequest.headers?.Authorization;
          delete originalRequest.headers?.authorization;
          delete originalRequest.headers?.['x-refresh-token'];
          return apiClient(originalRequest);
        }
        if (!originalRequest._sessionRefreshRetry && getToken() && getRefreshToken()) {
          originalRequest._sessionRefreshRetry = true;
          try {
            const tokenForRetry = await refreshSessionViaValidTokenCheck();
            if (tokenForRetry) {
              originalRequest.headers = originalRequest.headers ?? {};
              originalRequest.headers.Authorization = `Bearer ${tokenForRetry}`;
              originalRequest.headers['x-refresh-token'] = getRefreshToken() || '';
              return apiClient(originalRequest);
            }
          } catch {
            /* refresh impossible — logout ci-dessous sauf inbox soft-fail */
          }
        }
        if (inboxSoftFail) {
          logApiHttpFailure(error, { inboxSoftFail: true });
          return Promise.reject(error);
        }
        invalidateSession('force_logout');
      }
      if (!inboxSoftFail) {
        logApiHttpFailure(error);
      }
      return Promise.reject(error);
    }

    // Gestion du 401 (non autorisé) - tentative de refresh du token
    // Mais pas pour les routes d'authentification (login, register, etc.)
    const isAuthRoute =
      originalRequest.url?.includes('/login') ||
      originalRequest.url?.includes('/register') ||
      originalRequest.url?.includes('/reset-password') ||
      originalRequest.url?.includes('/complete-reset') ||
      originalRequest.url?.includes('/valid-token-check'); // éviter boucle refresh

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        const tokenForRetry = await refreshSessionViaValidTokenCheck();
        if (!tokenForRetry) {
          throw new Error('No tokens available');
        }
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${tokenForRetry}`;
        originalRequest.headers['x-refresh-token'] = getRefreshToken() || '';
        return apiClient(originalRequest);
      } catch (refreshError) {
        const refreshErrData = (refreshError as { response?: { data?: Record<string, unknown> } })
          ?.response?.data;
        const refreshSessionDead = isSessionInvalidBody(refreshErrData);
        const noTokens =
          refreshError instanceof Error && refreshError.message === 'No tokens available';

        logAuthError('refresh token échoué', {
          url: originalRequest?.url,
          status: (refreshError as { response?: { status?: number } })?.response?.status,
          refreshSessionDead,
          noTokens,
        });
        if (
          !isAppEmbeddedInIframe() &&
          !hasDevTokenBypass() &&
          (refreshSessionDead || noTokens)
        ) {
          invalidateSession('refresh_failed');
        }
        logApiHttpFailure(refreshError, {
          inboxSoftFail: isInboxSoftFailEndpoint(url),
          refreshFailed: true,
        });
        return Promise.reject(refreshError);
      }
    }

    // 401 après refresh OK = refus endpoint (scope / droits), pas fin de session globale.
    if (
      error.response?.status === 401 &&
      !isAuthRoute &&
      isSessionInvalidResponse &&
      !isAppEmbeddedInIframe() &&
      !hasDevTokenBypass()
    ) {
      logAuthWarn('HTTP 401 — session invalidée (corps explicite)', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        retried: Boolean(originalRequest._retry),
      });
      invalidateSession('http_401');
    }

    logApiHttpFailure(error, { inboxSoftFail: isInboxSoftFailEndpoint(url) });
    return Promise.reject(error);
  }
);

export default apiClient;
