import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { devSecurityHeaders, previewSecurityHeaders } from './security/csp'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'config': path.resolve(__dirname, './src/config'),
      'components': path.resolve(__dirname, './src/components'),
      'features': path.resolve(__dirname, './src/features'),
      'utils': path.resolve(__dirname, './src/utils'),
      'services': path.resolve(__dirname, './src/services'),
      'contexts': path.resolve(__dirname, './src/contexts'),
      'context': path.resolve(__dirname, './src/context'),
      'constants': path.resolve(__dirname, './src/constants'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
    headers: devSecurityHeaders,
    proxy: {
      '/api/v1/admin/channels-dashboard': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'https://dev.sojori.com',
        changeOrigin: true,
        secure: false,
      },
      '/api/monitoring': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'https://dev.sojori.com',
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 4174,
      clientPort: 4174,
    },
  },
  preview: {
    headers: previewSecurityHeaders,
  },
})
