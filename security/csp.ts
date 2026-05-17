/**
 * Content-Security-Policy for Sojori Orchestrator.
 *
 * DEV (`vite dev`): must allow Vite's dev client (script eval + blob SharedWorker for server ping).
 * PROD (`vite build` + static hosting): no @vite/client — no blob workers from Vite.
 */

const join = (directives: string[]) => directives.join('; ')

/** Headers applied by `vite dev` only — never sent with production static assets. */
export const devSecurityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': join([
    "default-src 'self'",
    // Vite dev client + React refresh
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Vite 8 server-ping uses a blob: SharedWorker — without this, console floods and HMR breaks
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://dev.sojori.com wss://dev.sojori.com http://127.0.0.1:4174 ws://127.0.0.1:4174 http://localhost:4007 ws://localhost:4007",
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
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://dev.sojori.com wss://dev.sojori.com",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]),
}
