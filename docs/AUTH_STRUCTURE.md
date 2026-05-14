# Structure de l'Authentification - Sojori Orchestrator

## Vue d'ensemble de l'architecture

```
src/
├── config/
│   └── authConfig.ts          # Configuration centrale (URLs API, clés cookies, redirections)
│
├── utils/
│   ├── cookieUtils.ts         # Gestion des cookies (get, set, remove)
│   └── authUtils.ts           # Utilitaires d'auth (getToken, setTokens, clearTokens, etc.)
│
├── services/
│   ├── authService.ts         # Service d'authentification (login, logout, validateToken)
│   └── apiClient.ts           # Client Axios avec intercepteurs (auto-refresh, 401 handling)
│
├── contexts/
│   └── AuthContext.tsx        # Context React global pour l'état d'auth
│
├── hooks/
│   └── useAuth.ts             # Hook personnalisé pour accéder au contexte d'auth
│
├── components/
│   └── ProtectedRoute.tsx     # Composant de protection des routes privées
│
├── pages/
│   └── LoginPage.tsx          # Page de connexion
│
└── App.tsx                    # Intégration AuthProvider + routes protégées
```

---

## Flux de données

### 1. Initialisation de l'application

```
main.tsx
   │
   └──> App.tsx
           │
           └──> <AuthProvider>  ────────┐
                     │                  │
                     │                  ▼
                     │           AuthContext initialisation
                     │                  │
                     │                  ├── Lit les cookies (getToken, getRefreshToken)
                     │                  │
                     │                  └── Si tokens présents
                     │                       └──> checkAuth()
                     │                              │
                     │                              └──> authService.validateToken()
                     │                                      │
                     │                                      └──> GET /auth/valid-token-check
                     │
                     └──> <BrowserRouter>
                              │
                              └──> <Routes>
                                      │
                                      ├──> /login (public)
                                      │
                                      └──> <ProtectedRoute>
                                              │
                                              ├── Vérifie isAuthenticated
                                              │
                                              ├── Si false → Navigate to /login
                                              │
                                              └── Si true → <Outlet /> (routes enfants)
```

### 2. Flow de Login

```
LoginPage
   │
   │ (utilisateur entre email/password)
   │
   └──> handleSubmit()
           │
           └──> useAuth().login({ email, password })
                   │
                   └──> authService.login(credentials)
                           │
                           └──> POST /auth/login
                                   │
                                   ├── Retour: { token, refreshToken, user }
                                   │
                                   ├──> setTokens(token, refreshToken) [cookies]
                                   │
                                   └──> AuthContext.setState({ user, token, refreshToken, isAuthenticated: true })
                                           │
                                           └──> checkAuth() [validation post-login]
                                                   │
                                                   └──> useEffect dans LoginPage
                                                           │
                                                           └──> navigate('/orchestration')
```

### 3. Flow de Requête API Protégée

```
Composant quelconque
   │
   └──> axios.get('/api/some-endpoint') ou apiClient.get(...)
           │
           └──> apiClient.interceptors.request
                   │
                   ├── Ajoute Authorization: Bearer ${token}
                   │
                   └── Ajoute x-refresh-token: ${refreshToken}
                           │
                           └──> Requête envoyée au backend
                                   │
                                   ├── Si réponse OK avec newToken
                                   │   │
                                   │   └──> apiClient.interceptors.response
                                   │           │
                                   │           └──> setTokens(newToken, refreshToken)
                                   │                   │
                                   │                   └──> Mise à jour du state (updateToken)
                                   │
                                   └── Si erreur 401
                                       │
                                       └──> apiClient.interceptors.response (error handler)
                                               │
                                               ├── Tente GET /auth/valid-token-check
                                               │       │
                                               │       ├── Si succès avec newToken
                                               │       │   │
                                               │       │   └──> setTokens(newToken, refreshToken)
                                               │       │           │
                                               │       │           └──> Réessaye la requête originale
                                               │       │
                                               │       └── Si échec
                                               │           │
                                               │           └──> clearTokens() + redirect('/login')
                                               │
                                               └── Si forceLogout ou "Session expired"
                                                   │
                                                   └──> clearTokens() + redirect('/login')
```

### 4. Flow de Logout

```
Composant quelconque
   │
   └──> const { logout } = useAuth()
           │
           └──> logout()
                   │
                   └──> AuthContext.logout()
                           │
                           ├──> authService.logout()
                           │       │
                           │       └──> clearTokens() [supprime cookies]
                           │
                           └──> setState({ user: null, token: null, isAuthenticated: false })
                                   │
                                   └──> (ProtectedRoute détecte isAuthenticated === false)
                                           │
                                           └──> Navigate to /login
```

---

## Détails des composants

### authConfig.ts

```typescript
export const AUTH_CONFIG = {
  API_URL: `${SRV_USER_URL}/auth`,           // Base URL du service d'auth
  TOKEN_KEY: 'sojori_token',                 // Clé du cookie pour le token
  REFRESH_TOKEN_KEY: 'sojori_refresh_token', // Clé du cookie pour le refresh token
  LOGIN_REDIRECT: '/orchestration',          // Redirection après login
  LOGOUT_REDIRECT: '/login',                 // Redirection après logout
  COOKIE_OPTIONS: { ... }                    // Options de sécurité des cookies
}
```

**Variables d'environnement:**
- `VITE_API_URL` - URL de base de l'API (vide en dev local, https://dev.sojori.com en staging/prod)

---

### authService.ts

**Fonctions:**

| Fonction | Endpoint | Description | Retour |
|----------|----------|-------------|--------|
| `login(credentials)` | POST /auth/login | Connexion utilisateur | `{ token, refreshToken, user }` |
| `activateWorkerAccount(data)` | POST /auth/init-password | Activation compte worker | `{ token, refreshToken, user }` |
| `validateToken()` | GET /auth/valid-token-check | Validation/refresh du token | `{ success, newToken?, user? }` |
| `logout()` | (local) | Suppression des tokens | void |

**Protection contre appels concurrents:**
- `validateToken()` utilise une variable `isValidatingToken` et une `validationPromise` partagée
- Si un appel est en cours, les appels suivants attendent la même promesse
- Évite les appels multiples simultanés à `/valid-token-check`

---

### apiClient.ts

**Intercepteur de requête:**
```typescript
config.headers.Authorization = `Bearer ${token}`
config.headers['x-refresh-token'] = refreshToken
```

**Intercepteur de réponse (succès):**
```typescript
if (response.data.newToken) {
  setTokens(newToken, refreshToken)
  // Met à jour le header Authorization pour les requêtes suivantes
}
```

**Intercepteur de réponse (erreur):**
```typescript
// Cas 1: newToken dans l'erreur
if (error.response.data.newToken) {
  setTokens(newToken, refreshToken)
  return axios(originalRequest) // Réessaye
}

// Cas 2: forceLogout ou "Session expired"
if (forceLogout || "Session expired") {
  clearTokens()
  window.location.href = '/login'
}

// Cas 3: 401 Unauthorized
if (error.response.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true
  const response = await axios.get('/auth/valid-token-check')
  if (response.data.newToken) {
    setTokens(newToken, refreshToken)
    return axios(originalRequest) // Réessaye
  } else {
    clearTokens()
    window.location.href = '/login'
  }
}
```

---

### AuthContext.tsx

**État:**
```typescript
interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}
```

**Fonctions:**
```typescript
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  updateToken: (newToken: string) => void
  checkAuth: () => Promise<void>
}
```

**Initialisation:**
```typescript
// Au montage du provider
const token = getToken()
const refreshToken = getRefreshToken()

if (token && refreshToken) {
  setState({ token, refreshToken, isAuthenticated: true, loading: true })
  checkAuth() // Valide le token
}
```

**useEffect:**
```typescript
useEffect(() => {
  if (state.token) {
    checkAuth() // Valide au démarrage
  }
}, []) // Une seule fois
```

---

### ProtectedRoute.tsx

**Logique:**
```typescript
if (loading) {
  return <CircularProgress /> // Attendre validation
}

if (isAuthenticated) {
  return <Outlet /> // Afficher les routes enfants
}

return <Navigate to="/login" replace />
```

---

### LoginPage.tsx

**État local:**
```typescript
const [credentials, setCredentials] = useState({ email: '', password: '' })
const [showPassword, setShowPassword] = useState(false)
const [localError, setLocalError] = useState<string | null>(null)
```

**Soumission:**
```typescript
const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    await login(credentials) // AuthContext
    // Navigation automatique via useEffect
  } catch (err) {
    setLocalError(err.message)
  }
}
```

**Redirection automatique:**
```typescript
useEffect(() => {
  if (isAuthenticated) {
    navigate('/orchestration')
  }
}, [isAuthenticated])
```

---

## Variables d'environnement

### .env.example

```env
# URL de l'API backend
VITE_API_URL=http://localhost        # Dev local avec ports
VITE_API_URL=https://dev.sojori.com  # Dev/Staging distant
VITE_API_URL=https://api.sojori.com  # Production
```

**Résolution de l'URL:**
```typescript
// authConfig.ts
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://dev.sojori.com'
  }
  return import.meta.env.VITE_API_URL || 'http://localhost'
}
```

**Ports locaux:**
```typescript
// Si VITE_API_URL vide ou http://localhost
const useLocalMicroservicePorts = !import.meta.env.PROD && !import.meta.env.VITE_API_URL

// Alors
SRV_USER_URL = 'http://localhost:4005/api/v1/user'

// Sinon
SRV_USER_URL = '${API_BASE_URL}/api/v1/user'
```

---

## Sécurité

### Cookies sécurisés

```typescript
const COOKIE_CONFIG = {
  secure: import.meta.env.PROD,  // HTTPS seulement en production
  sameSite: 'Lax',               // Protection CSRF
  path: '/',                     // Accessible partout
  expires: 365 * 10              // 10 ans
}
```

**Pourquoi cookies et pas localStorage?**
- Protection contre XSS (cookies HttpOnly possible côté backend)
- SameSite protège contre CSRF
- Conformité avec l'ancien dashboard

### Protection iframe

```typescript
export function isAppEmbeddedInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    return true
  }
}

// Utilisé dans clearTokens()
export const clearTokens = (): void => {
  if (isAppEmbeddedInIframe()) return // Ne pas toucher aux cookies si en iframe
  removeCookie(AUTH_CONFIG.TOKEN_KEY)
  removeCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY)
}
```

**Pourquoi?**
- Éviter de casser l'auth du parent si le dashboard est embarqué
- Exemple: Grafana qui embarque le dashboard dans une iframe

---

## Points d'attention

### 1. Appels concurrents à validateToken

**Problème:** Si plusieurs requêtes échouent avec 401 en même temps, elles vont toutes tenter de refresh le token.

**Solution:**
```typescript
let isValidatingToken = false
let validationPromise = null

if (isValidatingToken && validationPromise) {
  return validationPromise // Retourner la promesse existante
}

isValidatingToken = true
validationPromise = (async () => {
  // ... appel API
})()
```

### 2. Redirection après login

**Problème:** Le login ne retourne pas immédiatement après succès, il lance `checkAuth()`.

**Solution:** useEffect dans LoginPage qui surveille `isAuthenticated`:
```typescript
useEffect(() => {
  if (isAuthenticated) {
    navigate('/orchestration')
  }
}, [isAuthenticated])
```

### 3. Infinite loop dans checkAuth

**Problème:** Si `checkAuth()` est appelé dans un useEffect sans dépendances, risque de boucle.

**Solution:** Dépendance vide `[]` pour exécuter une seule fois:
```typescript
useEffect(() => {
  if (state.token) {
    checkAuth()
  }
}, []) // ⚠️ Important: tableau vide
```

### 4. FormData et Content-Type

**Problème:** Axios ajoute par défaut `Content-Type: application/json`, ce qui casse les uploads.

**Solution:**
```typescript
if (config.data instanceof FormData) {
  const headers = AxiosHeaders.from(config.headers)
  headers.delete('Content-Type')
  config.headers = headers
  config.transformRequest = [(data) => data]
}
```

---

## Comparaison avec l'ancien dashboard

| Aspect | Ancien Dashboard | Sojori-Orchestrator |
|--------|------------------|---------------------|
| **State management** | Redux Toolkit | React Context API |
| **Navigation** | navigationRef | window.location.href |
| **Framework CSS** | Material-UI v5 | Material-UI v9 |
| **Stockage tokens** | Cookies | Cookies (identique) |
| **Endpoints API** | /auth/login, /auth/valid-token-check | Identique |
| **Refresh automatique** | Oui (401 + newToken) | Identique |
| **Protection iframe** | Oui | Identique |
| **TypeScript** | Partiel (.jsx) | Strict (.ts/.tsx) |
| **Dev bypass** | Oui (devAuthBypass) | Non (peut être ajouté) |

---

## Prochaines étapes recommandées

1. **Ajouter un bouton de déconnexion** dans la navbar
2. **Améliorer la navigation** avec `useNavigate()` au lieu de `window.location.href`
3. **Ajouter un indicateur utilisateur** (avatar, nom, role) dans le header
4. **Tests unitaires** pour authService et AuthContext
5. **Page "Forgot Password"** si endpoint backend existe
6. **Gestion des rôles** avec `RoleProtectedRoute` si nécessaire
7. **Refresh proactif** (timer avant expiration du token)
8. **Toast notifications** pour erreurs/succès

---

## Aide-mémoire pour les développeurs

### Utiliser l'authentification dans un composant

```typescript
import { useAuth } from '../hooks/useAuth'

function MyComponent() {
  const { user, isAuthenticated, loading, login, logout } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Not authenticated</div>

  return (
    <div>
      <p>Hello {user?.firstName || user?.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Faire une requête API protégée

```typescript
import apiClient from '../services/apiClient'

// Option 1: Utiliser apiClient (intercepteurs automatiques)
const response = await apiClient.get('/api/some-endpoint')

// Option 2: Utiliser axios directement (ajouter le token manuellement)
import axios from 'axios'
import { getToken } from '../utils/authUtils'

const response = await axios.get('/api/some-endpoint', {
  headers: {
    Authorization: `Bearer ${getToken()}`
  }
})
```

### Protéger une route

```typescript
// App.tsx
<Route element={<ProtectedRoute />}>
  <Route path="/admin" element={<AdminPage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Route>
```

### Accéder aux informations utilisateur

```typescript
const { user } = useAuth()

console.log(user?._id)
console.log(user?.email)
console.log(user?.role)
console.log(user?.firstName)
console.log(user?.lastName)
```

---

**Auteur:** Agent 1 - Authentification
**Date:** 14 Mai 2026
**Version:** 1.0
