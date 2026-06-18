/**
 * Listing API base — same source as dashboard (`MICROSERVICE_BASE_URL.SRV_LISTING`).
 * With VITE_API_URL=https://dev.sojori.com → direct https://dev.sojori.com/api/v1/listing (not 127.0.0.1:4174).
 */
import { MICROSERVICE_BASE_URL } from './authConfig';

export const LISTING_API_BASE_URL = MICROSERVICE_BASE_URL.SRV_LISTING;

export function resolveDeployedGatewayOrigin(): string {
  return (
    import.meta.env.VITE_API_URL?.trim() ||
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    'https://dev.sojori.com'
  ).replace(/\/+$/, '');
}

export type ListingApiRequestInfo = {
  browserUrl: string;
  transport: string;
  remoteGateway: string;
  listingApiBase: string;
};

export function describeListingApiRequest(method: string, pathSuffix: string): ListingApiRequestInfo {
  const browserUrl = `${LISTING_API_BASE_URL}${pathSuffix}`;
  const remoteGateway = resolveDeployedGatewayOrigin();
  const onLocalFront =
    typeof window !== 'undefined' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname);
  const viaProxy = browserUrl.startsWith('/');
  const transport = onLocalFront
    ? viaProxy
      ? `local frontend (${window.location.origin}) → Vite proxy → ${remoteGateway}`
      : `local frontend (${window.location.origin}) → direct ${remoteGateway}`
    : `direct → ${remoteGateway}`;

  return {
    browserUrl,
    transport,
    remoteGateway,
    listingApiBase: LISTING_API_BASE_URL,
  };
}

/** Dev console: resolved URL + remote gateway for listing calls (incl. service-activation). */
export function logListingApiRequest(method: string, pathSuffix: string): ListingApiRequestInfo {
  const info = describeListingApiRequest(method, pathSuffix);
  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_LISTING_API === 'true') {
    console.info(`[listing-api] ${method} ${info.browserUrl}`, {
      transport: info.transport,
      remoteGateway: info.remoteGateway,
      listingApiBase: info.listingApiBase,
    });
  }
  return info;
}

export function logListingActivationSave(
  listingId: string,
  method: string,
  pathSuffix: string,
  body: unknown,
  result?: { status: number; data: unknown },
  error?: { status?: number; data: unknown },
): void {
  if (!import.meta.env.DEV && import.meta.env.VITE_DEBUG_LISTING_API !== 'true') return;
  const info = describeListingApiRequest(method, pathSuffix);
  console.info('[listing-activation-save]', {
    listingId,
    method,
    url: info.browserUrl,
    remoteGateway: info.remoteGateway,
    requestBody: body,
    ...(result ? { responseStatus: result.status, responseBody: result.data } : {}),
    ...(error ? { errorStatus: error.status, errorBody: error.data } : {}),
  });
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const boot = describeListingApiRequest('BOOT', '');
  console.info('[listing-api] configured', {
    listingApiBase: boot.listingApiBase,
    transport: boot.transport,
    remoteGateway: boot.remoteGateway,
  });
}
