import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { devSecurityHeaders, previewSecurityHeaders } from './security/csp'

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'https://dev.sojori.com'
const fulltaskLocalTarget = process.env.VITE_FULLTASK_URL || 'http://127.0.0.1:4015'
const fullchatbotLocalTarget = process.env.VITE_FULLCHATBOT_URL || 'http://127.0.0.1:4016'

/** Proxy API dev — évite les appels relatifs vers 127.0.0.1:4174 (404 Not Found App). */
const apiDevProxy = {
  /** srv-fulltask direct en local (avant le catch-all /api → dev.sojori.com). */
  '/api/v1/admin/fulltask': {
    target: fulltaskLocalTarget,
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/api\/v1\/admin\/fulltask/, '/api'),
  },
  '/api/v1/admin/fullchatbot': {
    target: fullchatbotLocalTarget,
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(/^\/api\/v1\/admin\/fullchatbot/, '/api'),
  },
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
