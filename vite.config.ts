import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { devSecurityHeaders, previewSecurityHeaders } from './security/csp'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'config': path.resolve(__dirname, './src/config'),
      'components': path.resolve(__dirname, './src/components'),
      'features': path.resolve(__dirname, './src/features'),
      'utils': path.resolve(__dirname, './src/utils'),
      'services': path.resolve(__dirname, './src/services'),
      'contexts': path.resolve(__dirname, './src/contexts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
    headers: devSecurityHeaders,
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
