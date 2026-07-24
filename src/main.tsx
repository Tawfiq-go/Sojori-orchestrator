import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { sojoriTheme } from './theme/muiTheme'
import { logAuth } from './utils/dashboardDebug'
import { AmenitiesProvider } from './contexts/AmenitiesContext'
import { ConnectivityProvider } from './contexts/ConnectivityContext'
import { NetworkStatusBanner } from './components/NetworkStatusBanner'
import { isTransientNetworkError } from './utils/networkError'
import './i18n'
import { bootstrapDevSessionFromEnv } from './utils/devApiAccess'
import { setupLegacyAxiosAuth } from './components/LegacyReduxBridge'

bootstrapDevSessionFromEnv()
setupLegacyAxiosAuth()

// Pause / reprise des queries React Query selon navigator.onLine (4G Maroc).
onlineManager.setEventListener((setOnline) => {
  const onOnline = () => setOnline(true)
  const onOffline = () => setOnline(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isTransientNetworkError(error)) return failureCount < 2
        return failureCount < 1
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 5 * 60 * 1000,
      networkMode: 'online',
    },
    mutations: {
      networkMode: 'online',
      retry: (failureCount, error) =>
        isTransientNetworkError(error) ? failureCount < 1 : false,
    },
  },
})

logAuth('app bootstrap', {
  mode: import.meta.env.MODE,
  apiUrl: import.meta.env.VITE_API_URL ?? '(default localhost)',
  devToken: Boolean(import.meta.env.VITE_DEV_TOKEN),
  design: 'sojori-atelier-2026',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConnectivityProvider>
        <AmenitiesProvider>
          <ThemeProvider theme={sojoriTheme}>
            <CssBaseline />
            <NetworkStatusBanner />
            <App />
          </ThemeProvider>
        </AmenitiesProvider>
      </ConnectivityProvider>
    </QueryClientProvider>
  </StrictMode>,
)
