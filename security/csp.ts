/**
 * Content-Security-Policy for Sojori Orchestrator.
 *
 * DEV (`vite dev`): must allow Vite's dev client (script eval + blob SharedWorker for server ping).
 * PROD (`vite build` + static hosting): no @vite/client — no blob workers from Vite.
 */

const join = (directives: string[]) => directives.join('; ')

/**
 * Rental United Channel Manager (white-label iframe) — scripts/styles/API.
 * @see features/rentalUnited/components/RentalUnitedIframe.jsx
 */
const RU_SCRIPT_SRC = [
  'https://ajax.googleapis.com',
  'https://maxcdn.bootstrapcdn.com',
  'https://cdnjs.cloudflare.com',
  'https://new.rentalsunited.com',
  'https://*.rentalsunited.com',
  // RU white-label charge parfois GTM (analytics) — sans ceci le widget reste utilisable mais console bruyante
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
].join(' ')

const RU_STYLE_SRC = [
  'https://maxcdn.bootstrapcdn.com',
  'https://cdnjs.cloudflare.com',
  'https://new.rentalsunited.com',
  'https://*.rentalsunited.com',
  'https://fonts.googleapis.com',
].join(' ')

const RU_FONT_SRC = [
  'https://fonts.gstatic.com',
  'https://fonts.googleapis.com',
  'https://maxcdn.bootstrapcdn.com',
  'https://cdnjs.cloudflare.com',
  'https://new.rentalsunited.com',
  'https://*.rentalsunited.com',
].join(' ')

const RU_CONNECT_SRC = [
  'https://webapi.rentalsunited.com',
  'https://rm.rentalsunited.com',
  'https://*.rentalsunited.com',
  'https://ajax.googleapis.com',
  'https://maxcdn.bootstrapcdn.com',
  'https://cdnjs.cloudflare.com',
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.googletagmanager.com',
].join(' ')

const RU_FRAME_SRC = 'https://*.rentalsunited.com'

/** Dashboard legacy (sojori-dashboard) — iframe aperçu mapping admin en dev. */
const LEGACY_DASHBOARD_FRAME_SRC =
  'http://localhost:3000 http://127.0.0.1:3000 https://dashboard.sojori.com'

/** Local Vite dev/preview + HMR — inclut VITE_DEV_PORT / VITE_HMR_PORT (ex. 3001 + 3003). */
function buildLocalDevConnectSrc(): string {
  const devPort = process.env.VITE_DEV_PORT || '4174'
  const hmrPort = process.env.VITE_HMR_PORT || devPort
  const ports = [...new Set([devPort, hmrPort, '4174', '4007', '3001', '3003', '5173'])]
  return ports
    .flatMap((port) => [
      `http://127.0.0.1:${port}`,
      `ws://127.0.0.1:${port}`,
      `http://localhost:${port}`,
      `ws://localhost:${port}`,
    ])
    .join(' ')
}

const SOJORI_API_CONNECT = `https://dev.sojori.com wss://dev.sojori.com ${buildLocalDevConnectSrc()}`

/** Headers applied by `vite dev` only — never sent with production static assets. */
export const devSecurityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': join([
    "default-src 'self'",
    // Vite dev client + React refresh + RU white-label iframe (jquery/bootstrap/RU script)
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${RU_SCRIPT_SRC}`,
    // Vite 8 server-ping uses a blob: SharedWorker — without this, console floods and HMR breaks
    "worker-src 'self' blob:",
    `style-src 'self' 'unsafe-inline' ${RU_STYLE_SRC}`,
    "img-src 'self' data: https: blob: https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://*.tile.openstreetmap.org",
    `font-src 'self' data: ${RU_FONT_SRC}`,
    `connect-src 'self' ${SOJORI_API_CONNECT} ${RU_CONNECT_SRC}`,
    `frame-src 'self' ${RU_FRAME_SRC} ${LEGACY_DASHBOARD_FRAME_SRC}`,
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]),
}

/** Headers for `vite preview` — mirrors production bundle constraints (no Vite dev client). */
export const previewSecurityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': join([
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${RU_SCRIPT_SRC}`,
    `style-src 'self' 'unsafe-inline' ${RU_STYLE_SRC}`,
    "img-src 'self' data: https: blob: https://*.basemaps.cartocdn.com https://server.arcgisonline.com https://*.tile.openstreetmap.org",
    `font-src 'self' data: ${RU_FONT_SRC}`,
    `connect-src 'self' https://dev.sojori.com wss://dev.sojori.com ${RU_CONNECT_SRC}`,
    `frame-src 'self' ${RU_FRAME_SRC} ${LEGACY_DASHBOARD_FRAME_SRC}`,
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]),
}
