import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4174,
    headers: {
      // 🔒 Security Headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // CSP: Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite needs unsafe-eval in dev
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Google Fonts + MUI
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com", // Google Fonts CDN
        "connect-src 'self' https://dev.sojori.com wss://dev.sojori.com http://127.0.0.1:4174 ws://127.0.0.1:4174 http://localhost:4007",
        "media-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
  },
  preview: {
    headers: {
      // 🔒 Production Security Headers (stricter CSP)
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'", // NO unsafe-eval in production
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://dev.sojori.com wss://dev.sojori.com",
        "media-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join('; '),
    },
  },
})
