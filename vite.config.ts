import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { devSecurityHeaders, previewSecurityHeaders } from './security/csp'

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'https://dev.sojori.com'

/**
 * Pattern dev (comme réservations / listing) :
 * - Par défaut → dev.sojori.com (srv-admin reverse-proxy vers K8s prod).
 * - Port-forward local uniquement si VITE_FULLTASK_URL / VITE_FULLCHATBOT_URL explicites
 *   (ex. http://127.0.0.1:4015 après kubectl port-forward).
 */
const fulltaskTarget = process.env.VITE_FULLTASK_URL || devProxyTarget
const fullchatbotTarget = process.env.VITE_FULLCHATBOT_URL || devProxyTarget

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

/** Proxy API dev — évite les appels relatifs vers 127.0.0.1:4174 (404 Not Found App). */
const apiDevProxy = {
  ...adminServiceProxy('fulltask', fulltaskTarget, '4015'),
  ...adminServiceProxy('fullchatbot', fullchatbotTarget, '4016'),
  '/api': {
    target: devProxyTarget,
    changeOrigin: true,
    secure: false,
  },
} as const

// https://vite.dev/config/
export default defineConfig({
  appType: 'spa',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
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
    port: 4174,
    strictPort: true,
    headers: devSecurityHeaders,
    proxy: {
      ...apiDevProxy,
    },
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 4174,
      clientPort: 4174,
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
