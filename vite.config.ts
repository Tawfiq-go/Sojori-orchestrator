import type { ClientRequest } from 'node:http'
import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { devSecurityHeaders, previewSecurityHeaders } from './security/csp'

/** Ingress K8s prod (dev.sojori.com). sojori.com = vitrine sans /api. Override : VITE_DEV_PROXY_TARGET. */
const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'https://dev.sojori.com'

/**
 * Pattern dev local :
 * - Par défaut → dev.sojori.com (ingress API cluster prod).
 * - Port-forward local : VITE_FULLTASK_URL / VITE_LISTING_URL explicites.
 */
const fulltaskTarget = process.env.VITE_FULLTASK_URL || devProxyTarget
const fullchatbotTarget = process.env.VITE_FULLCHATBOT_URL || devProxyTarget
/** Port-forward ou srv-listing local — ex. http://127.0.0.1:4001 */
const listingTarget = process.env.VITE_LISTING_URL || devProxyTarget
const listingDirectLocal = listingTarget !== devProxyTarget && isDirectLocalService(listingTarget, 4001)

function isDirectLocalService(url: string, port: number): boolean {
  try {
    const u = new URL(url)
    return ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && u.port === String(port)
  } catch {
    return false
  }
}

function adminServiceProxy(
  service: 'fulltask' | 'fullchatbot',
  target: string,
  port: '4015' | '4016',
) {
  const prefix = `/api/v1/admin/${service}`
  const directLocal = isDirectLocalService(target, Number(port))
  return {
    [prefix]: {
      target,
      changeOrigin: true,
      secure: false,
      /** srv-fulltask/chatbot en local exposent /api/*, pas /api/v1/admin/… */
      ...(directLocal
        ? { rewrite: (path: string) => path.replace(new RegExp(`^${prefix}`), '/api') }
        : {}),
    },
  }
}

/** Proxy monitoring sans Origin (srv-logs-proxy CORS strict) — doit être avant le catch-all /api */
const monitoringDevProxy = {
  '/api/monitoring': {
    target: devProxyTarget,
    changeOrigin: true,
    secure: false,
    timeout: 180_000,
    proxyTimeout: 180_000,
    configure: ((proxy) => {
      proxy.on('proxyReq', (proxyReq: ClientRequest) => {
        proxyReq.removeHeader('origin')
        proxyReq.removeHeader('referer')
      })
    }) satisfies NonNullable<ProxyOptions['configure']>,
  },
} as const

/** Proxy API dev — évite les appels relatifs vers 127.0.0.1:4174 (404 Not Found App). */
const listingDevProxy = {
  '/api/v1/listing': {
    target: listingTarget,
    changeOrigin: true,
    secure: !listingDirectLocal,
    timeout: 180_000,
    proxyTimeout: 180_000,
  },
} as const

/** Socket.io (srv-sockets) — nécessite ws: true pour l'upgrade WebSocket, doit précéder le catch-all /api */
const socketsDevProxy = {
  '/api/v1/sockets': {
    target: devProxyTarget,
    changeOrigin: true,
    secure: false,
    ws: true,
  },
} as const

const apiDevProxy = {
  ...adminServiceProxy('fulltask', fulltaskTarget, '4015'),
  ...adminServiceProxy('fullchatbot', fullchatbotTarget, '4016'),
  ...monitoringDevProxy,
  /** Listing (amenities/image OTA catalog) — toujours prioritaire sur le catch-all /api */
  ...listingDevProxy,
  ...socketsDevProxy,
  '/api': {
    target: devProxyTarget,
    changeOrigin: true,
    secure: false,
    /** create résa + calendrier peuvent dépasser 60s (ingress dev) */
    timeout: 180_000,
    proxyTimeout: 180_000,
  },
} as const

const devPort = Number(process.env.VITE_DEV_PORT || 4174)
const devHmrPort = Number(process.env.VITE_HMR_PORT || devPort)

// https://vite.dev/config/
export default defineConfig({
  appType: 'spa',
  plugins: [react(), tailwindcss()],

  // ⚡ OPTIMISATION PERFORMANCE - Pré-bundling agressif des dépendances
  optimizeDeps: {
    include: [
      // Core React
      'react', 'react-dom', 'react-router-dom',
      // MUI Components
      '@mui/material', '@mui/icons-material', '@mui/lab',
      '@mui/x-date-pickers', '@emotion/react', '@emotion/styled',
      // Data Management
      '@tanstack/react-query', 'axios', 'zustand',
      // Drag & Drop
      '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities',
      // Charts & Visualization
      'recharts',
      // Forms
      'formik', 'yup',
      // Date Libraries
      'moment', 'date-fns', 'date-fns-tz',
      // UI Libraries
      'primereact', 'primeicons', 'react-toastify',
      // Utilities
      'lodash', 'js-cookie',
      // Maps
      'leaflet', 'react-leaflet',
      // Internationalization
      'i18next', 'react-i18next',
      // Misc
      'react-dropzone', 'styled-components',
    ],
    // Force immediate pre-bundling
    force: false,
  },

  // ⚡ BUILD OPTIMIZATIONS
  build: {
    // manualChunks objet retiré — incompatible Vite 8 / rolldown en prod build
    // Optimiser la taille des chunks
    chunkSizeWarningLimit: 600,
    // Minification plus agressive en production
    minify: 'esbuild', // plus rapide que terser, suffisant pour la plupart des cas
    target: 'es2020',
    // Sourcemaps en dev uniquement
    sourcemap: process.env.NODE_ENV === 'development',
  },

  resolve: {
    alias: [
      // Regex only matches `@/…` — bare `@` would shadow npm scopes like @dnd-kit, @mui
      {
        find: /^@\//,
        replacement: `${path.resolve(__dirname, './src')}/`,
      },
      { find: 'config', replacement: path.resolve(__dirname, './src/config') },
      { find: 'components', replacement: path.resolve(__dirname, './src/components') },
      { find: 'features', replacement: path.resolve(__dirname, './src/features') },
      { find: 'utils', replacement: path.resolve(__dirname, './src/utils') },
      { find: 'services', replacement: path.resolve(__dirname, './src/services') },
      { find: 'contexts', replacement: path.resolve(__dirname, './src/contexts') },
      { find: 'context', replacement: path.resolve(__dirname, './src/context') },
      { find: 'constants', replacement: path.resolve(__dirname, './src/constants') },
    ],
  },

  server: {
    host: '127.0.0.1',
    port: devPort,
    strictPort: true,
    headers: devSecurityHeaders,
    proxy: {
      ...apiDevProxy,
    },
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      /** Même port que le serveur si VITE_HMR_PORT non défini (évite send-before-connect). */
      port: devHmrPort,
      clientPort: devHmrPort,
      overlay: false,
    },
    // ⚡ Pré-réchauffer les modules les plus utilisés
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/main.tsx',
        './src/pages/DashboardPage.tsx',
        './src/pages/TasksListPage.tsx',
        './src/pages/ReservationsPage.tsx',
      ],
    },
  },

  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
    headers: previewSecurityHeaders,
    proxy: {
      ...apiDevProxy,
    },
  },
})
