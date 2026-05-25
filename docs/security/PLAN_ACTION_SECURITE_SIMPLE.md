# 🔒 Plan d'Action Sécurité - SIMPLE & STEP BY STEP

**Date:** 21 Mai 2026
**Pour:** Gouacht (dev local + IP qui change)

---

## 🎯 Ton Besoin Principal

> **"Je dev depuis localhost, mon IP change souvent, je veux me connecter facilement SANS exposer la prod"**

---

## ✅ Solution Recommandée : Auth NORMALE en Dev

**Pourquoi ?**
- Plus simple qu'un DEV_TOKEN
- Plus sécurisé (tu as un vrai user)
- Pas de config spéciale

**Comment ?**
```env
# .env.local (ton PC uniquement)
VITE_API_URL=https://dev.sojori.com
VITE_DISABLE_AUTH=false  # ✅ Auth normale
# VITE_DEV_TOKEN=...     # ❌ On n'en a plus besoin
```

**Tu te connectes normalement :**
1. Ouvre `http://localhost:4174`
2. Login avec ton compte : `gouachadmin@sojori.com`
3. C'est tout !

**Avantages :**
- ✅ Fonctionne même si ton IP change
- ✅ Pas de token à gérer
- ✅ Même expérience que prod
- ✅ Sécurisé

---

## 📋 Plan d'Action : 5 Steps SIMPLES

### ✅ STEP 1 : Sécuriser .env.local (5 minutes)

**Ce que tu fais :**
```bash
cd /Users/gouacht/Sojori-orchestrator

# 1. Vérifier que .env.local est dans .gitignore
cat .gitignore | grep .env.local
# Si absent, ajouter :
echo ".env.local" >> .gitignore

# 2. Modifier .env.local
nano .env.local
```

**Contenu .env.local :**
```env
# Backend URL
VITE_API_URL=https://dev.sojori.com

# Environment
NODE_ENV=development

# ✅ Auth NORMALE (pas de bypass)
VITE_DISABLE_AUTH=false

# ❌ SUPPRIMER cette ligne (on n'en a plus besoin)
# VITE_DEV_TOKEN=eyJ...
```

**Test :**
```bash
pnpm dev
# → Ouvre http://localhost:4174
# → Tu dois voir la page login
# → Connecte-toi avec gouachadmin@sojori.com
```

**✅ Validation :** Tu peux te connecter et voir le dashboard

---

### ✅ STEP 2 : Activer Cookies Sécurisés (10 minutes)

**Fichier :** `src/config/authConfig.ts`

**AVANT :**
```typescript
COOKIE_OPTIONS: {
  secure: false,      // ❌
  httpOnly: false,    // ❌
  sameSite: 'Lax',
  expires: 7,
}
```

**APRÈS :**
```typescript
COOKIE_OPTIONS: {
  secure: window.location.protocol === 'https:',  // ✅ Auto selon protocole
  httpOnly: false,    // On garde false (frontend doit lire le token)
  sameSite: 'Lax',    // OK pour dev
  expires: 1,         // ✅ 1 jour au lieu de 7
}
```

**Test :**
```bash
# 1. Relance le dev
pnpm dev

# 2. Login
# 3. Ouvre DevTools → Application → Cookies → localhost
# 4. Vérifie que tu vois sojori_token et sojori_refresh_token
```

**✅ Validation :** Cookies présents et fonctionnent

---

### ✅ STEP 3 : Implémenter RBAC Basique (30 minutes)

**3.1 Créer les types de rôles**

**Fichier :** `src/types/roles.ts` (nouveau)
```typescript
export enum UserRole {
  OWNER = 'OWNER',       // Propriétaire
  ADMIN = 'ADMIN',       // Admin
  STAFF = 'STAFF',       // Staff
  VIEWER = 'VIEWER',     // Lecture seule
}

// Routes publiques (tous les users authentifiés)
export const PUBLIC_ROUTES = [
  '/dashboard',
  '/reservations',
  '/calendar',
  '/tasks',
];

// Routes ADMIN+ seulement
export const ADMIN_ROUTES = [
  '/settings',
  '/channels',
  '/tasks/config',
];

// Routes OWNER seulement
export const OWNER_ROUTES = [
  '/analytics',
  '/staff-whatsapp',
  '/monitoring',
];
```

**3.2 Créer le RoleGuard**

**Fichier :** `src/components/RoleGuard.tsx` (nouveau)
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/roles';

interface Props {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: Props) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasPermission = allowedRoles.includes(user.role as UserRole);

  if (!hasPermission) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>❌ Accès refusé</h2>
        <p>Vous n'avez pas les permissions pour accéder à cette page.</p>
        <p>Rôle requis : {allowedRoles.join(', ')}</p>
        <p>Votre rôle : {user.role}</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

**3.3 Protéger 3 routes critiques**

**Fichier :** `src/App.tsx`

**Trouve cette section :**
```typescript
<Route element={<ProtectedRoute />}>
  <Route path="/settings" element={<LazyRoute><SettingsHubPage /></LazyRoute>} />
  <Route path="/channels" element={<LazyRoute><ChannelsAdminPage /></LazyRoute>} />
  <Route path="/staff-whatsapp" element={<LazyRoute><StaffWhatsAppPage /></LazyRoute>} />
</Route>
```

**Remplace par :**
```typescript
import { RoleGuard } from './components/RoleGuard';
import { UserRole } from './types/roles';

<Route element={<ProtectedRoute />}>
  {/* Routes ADMIN+ */}
  <Route element={<RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.OWNER]} />}>
    <Route path="/settings" element={<LazyRoute><SettingsHubPage /></LazyRoute>} />
    <Route path="/channels" element={<LazyRoute><ChannelsAdminPage /></LazyRoute>} />
  </Route>

  {/* Routes OWNER */}
  <Route element={<RoleGuard allowedRoles={[UserRole.OWNER]} />}>
    <Route path="/staff-whatsapp" element={<LazyRoute><StaffWhatsAppPage /></LazyRoute>} />
  </Route>
</Route>
```

**Test :**
```bash
# 1. Connecte-toi avec un compte STAFF
# 2. Essaye d'aller sur /settings
# → Tu dois voir "Accès refusé"

# 3. Connecte-toi avec un compte ADMIN
# 4. Va sur /settings
# → Ça doit marcher
```

**✅ Validation :** RBAC fonctionne

---

### ✅ STEP 4 : Ajouter Session Timeout (20 minutes)

**Fichier :** `src/hooks/useSessionTimeout.ts` (nouveau)
```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

const TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useSessionTimeout() {
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!isAuthenticated) return;

    timeoutRef.current = setTimeout(() => {
      alert('⏰ Session expirée (30min inactivité)');
      logout();
    }, TIMEOUT);
  }, [logout, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset));

    reset();

    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reset, isAuthenticated]);
}
```

**Activer dans App :**

**Fichier :** `src/App.tsx`
```typescript
import { useSessionTimeout } from './hooks/useSessionTimeout';

function App() {
  useSessionTimeout();  // ✅ Ajout

  return (
    <AuthProvider>
      {/* ... reste du code */}
    </AuthProvider>
  );
}
```

**Test :**
```bash
# 1. Connecte-toi
# 2. Ne touche RIEN pendant 30 minutes
# → Alert + déconnexion auto
```

**✅ Validation :** Timeout fonctionne

---

### ✅ STEP 5 : Nettoyer les Logs (5 minutes)

**Fichier :** `src/contexts/AuthContext.tsx`

**Supprimer tous les `logAuth()` :**
```typescript
// AVANT
logAuth('init session', { hasToken, ... });
logAuth('checkAuth start', { ... });
logAuth('login OK', { ... });

// APRÈS
// (supprimer ces lignes)
```

**Fichier :** `src/services/apiClient.ts`

**Désactiver les logs requêtes :**
```typescript
// Ligne ~108
if (dashboardDebugEnabled && config.url && !config.url.includes('/valid-token-check')) {
  // ❌ Commenter tout ce bloc
  // const isDashboard = ...
  // if (isDashboard) { logAuth(...) }
}
```

**Test :**
```bash
pnpm dev
# Ouvre Console → Filtre "Sojori"
# → Devrait être vide (ou très peu de logs)
```

**✅ Validation :** Console propre

---

## 🧪 Tests Finaux

### Test 1 : Login Fonctionnel
```bash
1. pnpm dev
2. Ouvre http://localhost:4174
3. Login avec gouachadmin@sojori.com
4. ✅ Dashboard s'affiche
```

### Test 2 : RBAC Fonctionne
```bash
1. Connecté en tant que STAFF
2. Va sur /settings
3. ✅ "Accès refusé"
```

### Test 3 : Session Timeout
```bash
1. Connecté
2. Attends 30min (ou change TIMEOUT à 1min pour tester)
3. ✅ Déconnexion auto
```

### Test 4 : Reload Page
```bash
1. Connecté
2. F5 (reload)
3. ✅ Toujours connecté (cookie persist)
```

---

## 📊 Checklist Validation

- [ ] **Step 1** : .env.local sécurisé, auth normale fonctionne
- [ ] **Step 2** : Cookies configurés, login/logout OK
- [ ] **Step 3** : RBAC implémenté, 3 routes protégées
- [ ] **Step 4** : Session timeout actif
- [ ] **Step 5** : Logs nettoyés, console propre

**✅ TOUS validés ?** → Tu peux déployer en staging

---

## 🚀 Déploiement Staging (Quand prêt)

```bash
# 1. Build
pnpm build

# 2. Test du build
pnpm preview
# → Ouvre http://localhost:4173
# → Teste login, RBAC, timeout

# 3. Deploy
git add .
git commit -m "security: auth normale + RBAC + session timeout"
git push

# 4. Vérifier en staging
# → https://staging.sojori.com
# → Même tests
```

---

## ❓ FAQ

### Q: Mon IP change souvent, est-ce un problème ?
**R:** Non ! Avec auth normale (email/password), l'IP n'a pas d'importance.

### Q: Je veux quand même un DEV_TOKEN pour dev ultra-rapide ?
**R:** Pas recommandé, mais si vraiment besoin :
```env
VITE_DEV_TOKEN=ton_token_ici
# Backend doit avoir DISABLE_AUTH=true
# ⚠️ JAMAIS en staging/prod
```

### Q: Comment créer un user ADMIN pour tester RBAC ?
**R:**
```bash
# Backend (srv-user)
MONGODB_URI="..." node -e "
const User = require('./db/models/User');
User.findOneAndUpdate(
  { email: 'gouachadmin@sojori.com' },
  { role: 'ADMIN' }
).then(() => console.log('✅ Role updated'))
"
```

### Q: Ça casse quelque chose en prod ?
**R:** Non, ces changements sont **backward compatible**. Production continue de fonctionner.

---

## 📞 Prochaines Étapes (Après validation)

Une fois les 5 steps validés :
1. ✅ Audit logs (1 semaine)
2. ✅ CSP headers (1 semaine)
3. ✅ MFA (2 semaines)

Mais **PAS TOUT EN MÊME TEMPS**. Un step à la fois.

---

**TL;DR:**
1. Auth normale (pas de DEV_TOKEN)
2. Cookies 1 jour
3. RBAC sur 3 routes
4. Session timeout 30min
5. Logs nettoyés

**Temps total:** ~1h30
**Complexité:** Faible
**Impact:** Haute sécurité

**Tu testes step 1, tu valides, puis step 2, etc.**
