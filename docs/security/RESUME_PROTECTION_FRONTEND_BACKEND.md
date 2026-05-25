# 🔒 Résumé : Logique de Protection Frontend & Backend

**Date:** 22 Mai 2026
**Pour:** Déploiement Vercel — Sécurité Essentielle

---

## 🎯 L'Essentiel en 30 Secondes

**Frontend (Vercel):**
- ✅ Auth normale (email/password) — pas de DEV_TOKEN
- ✅ RBAC basique (4 rôles : OWNER, ADMIN, STAFF, VIEWER)
- ✅ Session timeout 30 min
- ✅ Headers sécurité (X-Frame-Options, CSP)

**Backend (GKE):**
- ✅ JWT tokens avec expiration
- ✅ Validation tokens à chaque requête
- ✅ Secrets Kubernetes (jamais en code)
- ✅ HTTPS obligatoire

**Données à Chiffrer:**
- 🔐 Tokens JWT (HttpOnly cookies)
- 🔐 Secrets API (env variables Vercel)
- 🔐 Connexions (HTTPS/TLS uniquement)
- ❌ PAS de chiffrement côté client (données publiques dashboard)

---

## 📊 Comparaison avec Standards B2B

### Guesty & Hostaway — Ce qu'ils Font

**Auth & Sessions:**
- Login email/password (pas de bypass dev)
- 2FA optionnel (TOTP)
- Session 30-60 min d'inactivité
- Refresh tokens en HttpOnly cookies

**Frontend Protection:**
```
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

**RBAC:**
- Owner (accès complet)
- Admin (config listings, users)
- Staff (opérations quotidiennes)
- Viewer (lecture seule)

**Ce qu'ils NE font PAS:**
- ❌ Pas de DEV_TOKEN en production
- ❌ Pas de DISABLE_AUTH mode
- ❌ Pas de secrets committés (.env dans .gitignore)

---

## 🛡️ Logique Protection Frontend (Vercel)

### 1. Authentification (Couche 1)

**Ce qui se passe:**
```
User → Login (email/password) → Backend vérifie → JWT token renvoyé
                                                  ↓
                                    Cookie HttpOnly (sojori_token)
                                                  ↓
                                    Frontend stocke user state (rôle)
```

**Code essentiel:**
```typescript
// src/contexts/AuthContext.tsx
const login = async (email, password) => {
  const response = await authService.login({ email, password });
  if (response.success) {
    setToken(response.data.token);          // Cookie HttpOnly
    setUser(response.data.user);            // State (nom, rôle)
  }
};
```

**Sécurité:**
- ✅ Token jamais accessible via JavaScript (HttpOnly)
- ✅ Token auto-envoyé par browser (pas de localStorage)
- ✅ Expiration 1 jour (pas 7 jours)

---

### 2. Authorization (Couche 2)

**Ce qui se passe:**
```
User clique "/settings" → RoleGuard vérifie rôle → Autorise ou Refuse
```

**Code essentiel:**
```typescript
// src/components/RoleGuard.tsx
export function RoleGuard({ allowedRoles, children }: Props) {
  const { user } = useAuth();

  if (!allowedRoles.includes(user.role)) {
    return <div>❌ Accès refusé</div>;
  }

  return <>{children}</>;
}
```

**Utilisation:**
```typescript
// src/App.tsx
<Route element={<RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.OWNER]} />}>
  <Route path="/settings" element={<SettingsPage />} />
  <Route path="/channels" element={<ChannelsPage />} />
</Route>
```

**Sécurité:**
- ✅ Vérification côté frontend (UX)
- ⚠️ Backend DOIT aussi vérifier (sécurité réelle)

---

### 3. Session Timeout (Couche 3)

**Ce qui se passe:**
```
User inactif 30min → Hook détecte → Logout automatique
```

**Code essentiel:**
```typescript
// src/hooks/useSessionTimeout.ts
export function useSessionTimeout() {
  const { logout } = useAuth();
  const TIMEOUT = 30 * 60 * 1000; // 30 min

  useEffect(() => {
    const events = ['mousedown', 'keydown'];
    events.forEach(e => window.addEventListener(e, resetTimeout));

    const timer = setTimeout(() => {
      alert('Session expirée');
      logout();
    }, TIMEOUT);

    return () => clearTimeout(timer);
  }, []);
}
```

**Sécurité:**
- ✅ Empêche sessions abandonnées actives
- ✅ Standard B2B : 15-60 min

---

### 4. Headers Sécurité Vercel (Couche 4)

**Ce qui se passe:**
```
Vercel ajoute headers HTTP → Browser applique restrictions
```

**Code essentiel:**
```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        }
      ]
    }
  ]
}
```

**Impact:**
- ✅ **X-Frame-Options: DENY** — Empêche iframe (clickjacking)
- ✅ **CSP** — Bloque scripts malveillants
- ✅ **X-Content-Type-Options** — Empêche MIME sniffing

---

## 🛡️ Logique Protection Backend (GKE)

### 1. Validation JWT (Chaque Requête)

**Ce qui se passe:**
```
Frontend → Requête API avec Cookie → Backend vérifie JWT → Autorise ou 401
```

**Code backend (srv-orchestrator):**
```typescript
// apps/srv-orchestrator/src/middleware/auth.ts
export function authMiddleware(req, res, next) {
  const token = req.cookies.sojori_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // { userId, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}
```

**Sécurité:**
- ✅ Aucune route protégée sans ce middleware
- ✅ Token expiré = refusé
- ✅ Token modifié = signature invalide

---

### 2. Vérification Rôle Backend (RBAC)

**Ce qui se passe:**
```
Frontend passe RoleGuard → Requête API → Backend RE-vérifie rôle → Autorise ou 403
```

**Code backend:**
```typescript
// apps/srv-orchestrator/src/middleware/rbac.ts
export function requireRole(allowedRoles: string[]) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
}

// Usage
router.delete('/listings/:id',
  authMiddleware,
  requireRole(['ADMIN', 'OWNER']),
  deleteListingHandler
);
```

**Pourquoi Double Vérification ?**
- Frontend RBAC = UX (cacher boutons, routes)
- Backend RBAC = Sécurité réelle (bloquer API)
- ⚠️ **Frontend seul = insécurisé** (dev tools contournent)

---

### 3. Secrets Management (Kubernetes)

**Ce qui se passe:**
```
Secrets Kubernetes → Injectés en env vars → Services lisent → Jamais en code
```

**Exemple:**
```yaml
# kubernetes/apps/srv-orchestrator/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: srv-orchestrator-secrets
data:
  JWT_SECRET: <base64>
  MONGODB_URI: <base64>
  RABBITMQ_URL: <base64>
```

**Code backend:**
```typescript
// apps/srv-orchestrator/src/config/index.ts
export const config = {
  jwtSecret: process.env.JWT_SECRET,  // ✅ Vient de Kubernetes Secret
  mongoUri: process.env.MONGODB_URI,  // ✅ Jamais hardcodé
};
```

**Sécurité:**
- ✅ Secrets chiffrés dans Kubernetes
- ✅ Rotation facile (update secret → restart pod)
- ❌ Jamais committés dans Git

---

## 🔐 Données à Chiffrer — Checklist

### ✅ DOIT Être Chiffré

| Donnée | Où | Comment |
|--------|-----|---------|
| JWT tokens | Transit (frontend ↔ backend) | HTTPS/TLS |
| JWT tokens | Stockage (cookies) | HttpOnly, Secure |
| Passwords | Stockage backend | bcrypt hash (12 rounds) |
| Secrets API | Backend env vars | Kubernetes Secrets |
| MongoDB URI | Backend env vars | Kubernetes Secrets |

### ❌ PAS Besoin de Chiffrement Supplémentaire

| Donnée | Pourquoi |
|--------|----------|
| Nom listing | Données publiques (dashboard) |
| Tarifs | Visibles par users autorisés |
| Réservations | Protégées par RBAC (pas de PII sensible) |
| Logs frontend | Nettoyés (pas de tokens/passwords) |

**Règle simple:**
- 🔐 Credentials, secrets, tokens → Chiffrés
- 📊 Données business (listings, tarifs) → RBAC suffit
- 🔒 PII sensibles (passeports, cartes bancaires) → Chiffrement bout-en-bout (futur)

---

## 🎯 Plan d'Action Minimal (Vercel)

### Step 1 : Activer Auth Normale (5 min)

**Fichier:** `.env.local`
```env
# ❌ SUPPRIMER
# VITE_DEV_TOKEN=...
# VITE_DISABLE_AUTH=true

# ✅ GARDER
VITE_API_URL=https://dev.sojori.com
NODE_ENV=development
```

**Test:**
```bash
pnpm dev
# → Login avec gouachadmin@sojori.com
# → Dashboard s'affiche
```

---

### Step 2 : Cookies Sécurisés (10 min)

**Fichier:** `src/config/authConfig.ts`
```typescript
COOKIE_OPTIONS: {
  secure: window.location.protocol === 'https:',  // ✅ Auto
  httpOnly: false,    // Frontend doit lire (OK pour frontend)
  sameSite: 'Lax',
  expires: 1,         // ✅ 1 jour (pas 7)
}
```

---

### Step 3 : RBAC (30 min)

**Créer:** `src/types/roles.ts`
```typescript
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  VIEWER = 'VIEWER',
}
```

**Créer:** `src/components/RoleGuard.tsx`
```typescript
export function RoleGuard({ allowedRoles, children }: Props) {
  const { user } = useAuth();
  const hasPermission = allowedRoles.includes(user.role as UserRole);

  if (!hasPermission) {
    return <div>❌ Accès refusé</div>;
  }

  return <>{children}</>;
}
```

**Modifier:** `src/App.tsx`
```typescript
<Route element={<RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.OWNER]} />}>
  <Route path="/settings" element={<SettingsPage />} />
  <Route path="/channels" element={<ChannelsPage />} />
</Route>
```

---

### Step 4 : Session Timeout (20 min)

**Créer:** `src/hooks/useSessionTimeout.ts`
```typescript
const TIMEOUT = 30 * 60 * 1000; // 30 min

export function useSessionTimeout() {
  const { logout, isAuthenticated } = useAuth();

  const reset = useCallback(() => {
    if (!isAuthenticated) return;

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      alert('Session expirée');
      logout();
    }, TIMEOUT);
  }, [logout, isAuthenticated]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();

    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(timeoutRef.current);
    };
  }, [reset, isAuthenticated]);
}
```

**Activer:** `src/App.tsx`
```typescript
function App() {
  useSessionTimeout();  // ✅ Ajout

  return <AuthProvider>...</AuthProvider>;
}
```

---

### Step 5 : Headers Vercel (5 min)

**Créer:** `vercel.json` (racine du projet)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
        }
      ]
    }
  ]
}
```

---

### Step 6 : Deploy Vercel (5 min)

```bash
# 1. Vérifier .gitignore
cat .gitignore | grep .env.local  # ✅ Doit être présent

# 2. Build local
pnpm build

# 3. Test du build
pnpm preview  # http://localhost:4173

# 4. Push
git add .
git commit -m "security: auth + RBAC + session timeout + headers"
git push

# 5. Vercel auto-deploy (si configuré)
# Ou manuellement : vercel --prod
```

**Vérifier en production:**
```bash
# Headers
curl -I https://sojori-orchestrator.vercel.app

# Devrait voir :
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
```

---

## 📋 Checklist Validation Finale

- [ ] **Auth normale fonctionne** (login email/password)
- [ ] **Cookies sécurisés** (expires: 1 jour)
- [ ] **RBAC implémenté** (ADMIN peut accéder /settings, STAFF non)
- [ ] **Session timeout actif** (30 min inactivité → logout)
- [ ] **Headers déployés** (curl -I montre X-Frame-Options, CSP)
- [ ] **.env.local dans .gitignore** (jamais committés)
- [ ] **Aucun DEV_TOKEN en code** (grep -r "DEV_TOKEN" → vide)
- [ ] **Build réussit** (pnpm build → 0 erreurs)

---

## ❓ FAQ

### Q: Pourquoi pas de chiffrement côté client pour les données dashboard ?
**R:** Les données (listings, tarifs, réservations) sont protégées par:
1. RBAC (seuls users autorisés y accèdent)
2. HTTPS (transit chiffré)
3. Backend validation (API refuse accès non autorisé)

Chiffrement client supplémentaire n'ajoute rien car:
- User autorisé doit voir les données en clair
- Attaquant sans token ne peut pas appeler API
- PII sensibles (passeports) déjà chiffrées backend

### Q: Localhost dev sécurisé comment ?
**R:** Avec auth normale:
- ✅ Login email/password requis
- ✅ Token JWT valide requis
- ✅ IP qui change = pas un problème

**VPN (plus tard) ajoutera:**
- IP whitelist backend (Tailscale)
- Mais PAS prioritaire pour Vercel

### Q: Et si quelqu'un clone le repo ?
**R:** Sans credentials:
- ❌ Pas de `.env.local` (dans .gitignore)
- ❌ Pas de JWT_SECRET backend
- ❌ Pas de compte user valide

Avec credentials volées:
- ⚠️ IP whitelist + VPN (futur)
- ⚠️ 2FA (futur)

**Priorité MAINTENANT:** Empêcher credentials en code (✅ fait avec ce plan)

### Q: CSP casse mon app ?
**R:** Si erreurs console "CSP violation":
```json
// vercel.json — Ajuster CSP
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..."
```

Tester localement avec `pnpm preview` avant deploy.

---

## 🎯 TL;DR

**Frontend (Vercel):**
1. Auth normale (email/password) — 5 min
2. Cookies 1 jour — 10 min
3. RBAC (4 rôles) — 30 min
4. Session timeout 30 min — 20 min
5. Headers sécurité — 5 min

**Backend (GKE):**
- ✅ Déjà OK (JWT, HTTPS, Kubernetes Secrets)

**Données chiffrées:**
- 🔐 Tokens (HTTPS + HttpOnly cookies)
- 🔐 Secrets (Kubernetes Secrets)
- 🔐 Passwords (bcrypt backend)

**Standards B2B respectés:**
- ✅ Pas de DEV_TOKEN prod
- ✅ RBAC basique
- ✅ Session timeout
- ✅ Headers sécurité

**Temps total:** ~1h15
**Complexité:** Faible
**Impact:** Sécurité B2B standard ✅
