# 🔐 AGENT 1 - AUTHENTIFICATION

**Mission** : Faire fonctionner le système de login/logout

---

## 📍 TON OBJECTIF

Créer un système d'authentification COMPLET pour que :
- ✅ L'utilisateur puisse se connecter avec email/password
- ✅ Les pages soient protégées (redirect vers /login si non connecté)
- ✅ Le logout fonctionne
- ✅ L'auth persiste après refresh de la page

**MODE MOCK** : Pas besoin de backend pour Phase 1, on simule tout !

---

## 📂 FICHIERS À CRÉER/MODIFIER

### 1. Page de Login
**Fichier** : `/src/pages/LoginPage.tsx`

**Ce qui existe déjà** : Une page basique de 6KB

**Ce que tu dois ajouter** :
```tsx
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // MODE MOCK : Credentials hardcodés
      if (email === 'admin@sojori.com' && password === 'admin123') {
        await login({ email, password });
        navigate('/orchestration'); // Redirect après login
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" sx={{ mb: 3 }}>Connexion</Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <Typography variant="caption" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
          Demo: admin@sojori.com / admin123
        </Typography>
      </Paper>
    </Box>
  );
}
```

---

### 2. Context d'Authentification
**Fichier** : `/src/contexts/AuthContext.tsx`

**Ce qui existe** : Déjà créé mais désactivé

**Ce que tu dois faire** :
1. Garde le code existant
2. Modifie juste la fonction `login()` pour accepter les credentials MOCK :

```tsx
const login = async (credentials: LoginCredentials): Promise<void> => {
  setState((prev) => ({ ...prev, loading: true, error: null }));

  try {
    // MODE MOCK : Simule un user
    const mockUser = {
      _id: '1',
      email: credentials.email,
      firstName: 'Admin',
      lastName: 'Sojori',
      role: 'owner'
    };
    const mockToken = 'mock-jwt-token-12345';
    const mockRefreshToken = 'mock-refresh-token-67890';

    // Sauvegarde les tokens
    setTokens(mockToken, mockRefreshToken);

    setState({
      user: mockUser,
      token: mockToken,
      refreshToken: mockRefreshToken,
      isAuthenticated: true,
      loading: false,
      error: null,
    });
  } catch (error: any) {
    setState((prev) => ({
      ...prev,
      loading: false,
      error: error?.message || 'Login failed',
      isAuthenticated: false,
    }));
    throw error;
  }
};
```

---

### 3. Protection des Routes
**Fichier** : `/src/components/ProtectedRoute.tsx`

**Ce qui existe** : Désactivé (return directement <Outlet />)

**Ce que tu dois faire** : **RÉACTIVER** le code commenté

```tsx
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Si authentifié, afficher le contenu
  if (isAuthenticated) {
    return <Outlet />;
  }

  // Sinon, rediriger vers login
  return <Navigate to="/login" replace />;
};
```

---

### 4. Utils Auth
**Fichier** : `/src/utils/authUtils.ts`

**À créer** : Fonctions pour gérer les cookies

```tsx
// Lecture/écriture cookies
export function getToken(): string | null {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1] || null;
}

export function getRefreshToken(): string | null {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('refreshToken='))
    ?.split('=')[1] || null;
}

export function setTokens(token: string, refreshToken: string): void {
  const maxAge = 7 * 24 * 60 * 60; // 7 jours
  document.cookie = `token=${token}; max-age=${maxAge}; path=/`;
  document.cookie = `refreshToken=${refreshToken}; max-age=${maxAge}; path=/`;
}

export function clearTokens(): void {
  document.cookie = 'token=; max-age=0; path=/';
  document.cookie = 'refreshToken=; max-age=0; path=/';
}

export function isAppEmbeddedInIframe(): boolean {
  return window.self !== window.top;
}
```

---

### 5. Config Auth
**Fichier** : `/src/config/authConfig.ts`

**À créer** :

```tsx
export const AUTH_CONFIG = {
  API_URL: 'http://localhost:4005/api/v1/user/auth',
  LOGOUT_REDIRECT: '/login',
  COOKIE_MAX_AGE: 7 * 24 * 60 * 60, // 7 jours
};
```

---

## ✅ CHECKLIST

Quand tu as terminé, vérifie que :

- [ ] Je peux aller sur http://localhost:4000
- [ ] Je suis redirigé vers /login
- [ ] Je peux me connecter avec `admin@sojori.com` / `admin123`
- [ ] Après login, je suis redirigé vers /orchestration
- [ ] Je vois la sidebar et le dashboard
- [ ] Si je refresh la page, je reste connecté (cookies)
- [ ] Le bouton logout fonctionne et me redirige vers /login
- [ ] Si je tente d'accéder à /reservations sans login, je suis redirigé vers /login

---

## 🎯 RÉSULTAT ATTENDU

```
1. Login avec credentials → ✅ Dashboard accessible
2. Refresh page → ✅ Reste connecté
3. Logout → ✅ Retour au login
4. Accès page protégée sans auth → ✅ Redirect login
```

---

## 📋 CE QUE TU ME RETOURNES

```markdown
# Agent 1 - Authentification

## ✅ Complété

### Fichiers créés/modifiés :
- [x] LoginPage.tsx (XXX lignes)
- [x] AuthContext.tsx (modifié)
- [x] ProtectedRoute.tsx (réactivé)
- [x] authUtils.ts (créé, XXX lignes)
- [x] authConfig.ts (créé, XXX lignes)

### Fonctionnalités :
- [x] Login avec credentials MOCK
- [x] Redirect après login
- [x] Protection routes
- [x] Persistence cookies
- [x] Logout fonctionnel

### Tests :
- [x] Login réussi → /orchestration
- [x] Login échoué → erreur affichée
- [x] Refresh → reste connecté
- [x] Logout → retour /login
- [x] Accès direct /reservations sans auth → redirect /login

## ✅ Prêt pour Production
Oui / Non
```

**IMPORTANT** : Utilise Material-UI v9 (sx props), pas Tailwind !
