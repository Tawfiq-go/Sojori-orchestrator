import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { sojoriTheme } from './theme/muiTheme'
import { logAuth } from './utils/dashboardDebug'
import { AmenitiesProvider } from './contexts/AmenitiesContext'
import './i18n'
import { bootstrapDevSessionFromEnv } from './utils/devApiAccess'
import { setupLegacyAxiosAuth } from './components/LegacyReduxBridge'

bootstrapDevSessionFromEnv()
setupLegacyAxiosAuth()

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
      <AmenitiesProvider>
        <ThemeProvider theme={sojoriTheme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </AmenitiesProvider>
    </QueryClientProvider>
  </StrictMode>,
)
