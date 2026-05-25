# ✅ Checklist d'Implémentation — Isolation Multi-Tenant

**Date:** 22 Mai 2026
**Criticité:** 🔴 **URGENT** (2 jours max)

---

## 📦 Fichiers Créés et Documentés

### ✅ Documentation (5 fichiers)

| Fichier | Localisation | Statut | Description |
|---------|--------------|--------|-------------|
| **AUDIT_OWNER_ISOLATION_MULTI_TENANT.md** | `docs/security/` | ✅ **Créé** | Audit complet : 5 failles + 5 recommandations + 4 scénarios d'attaque |
| **RESUME_PROTECTION_FRONTEND_BACKEND.md** | `docs/security/` | ✅ **Créé** | Résumé logiques protection frontend/backend + données à chiffrer |
| **PLAN_ACTION_SECURITE_SIMPLE.md** | `docs/security/` | ✅ **Créé** | Plan step-by-step auth normale + RBAC + session timeout |
| **AUDIT_SECURITE_FRONTEND_SOJORI.md** | `docs/security/` | ✅ **Créé** | Audit frontend complet (10 vulnérabilités) |
| **README.md** | `docs/security/` | ✅ **Mis à jour** | Index avec Phase 0 URGENTE isolation multi-tenant |

---

### ✅ Code Backend (3 fichiers)

| Fichier | Localisation | Statut | Description |
|---------|--------------|--------|-------------|
| **enforceOwnerIsolation.ts** | `apps/srv-listing/src/middleware/` | ✅ **Créé** | Middleware qui FORCE ownerId pour Owner/Worker |
| **verifyListingOwnership.ts** | `apps/srv-listing/src/middleware/` | ✅ **Créé** | Middleware qui vérifie listing.ownerId = user._id |
| **owner-isolation.test.ts** | `apps/srv-listing/src/routes/__tests__/` | ✅ **Créé** | Tests automatisés (5 scénarios d'attaque) |

---

### ✅ Scripts Audit (1 fichier)

| Fichier | Localisation | Statut | Description |
|---------|--------------|--------|-------------|
| **audit-owner-isolation.sh** | `scripts/` | ✅ **Créé** | Script bash pour auditer routes sans auth, ownerId, etc. |

---

## 🚀 Prochaines Étapes (Implémentation)

### Phase 1 : Appliquer les Middlewares (3h)

#### 1.1 Routes Listings (srv-listing)

**Fichier:** `apps/srv-listing/src/routes/listing/index.ts` (ou routes principales)

```typescript
import { enforceOwnerIsolation } from '../../middleware/enforceOwnerIsolation'
import { verifyListingOwnership } from '../../middleware/verifyListingOwnership'
import passport from 'passport'

// ✅ Routes GET/POST avec filtrage par ownerId
router.get('/listings',
  passport.authenticate('jwt', { session: false }),
  enforceOwnerIsolation,  // ← AJOUTER ICI
  getListings
)

router.post('/listings',
  passport.authenticate('jwt', { session: false }),
  enforceOwnerIsolation,  // ← AJOUTER ICI
  createListing
)

// ✅ Routes avec :listingId
router.get('/listings/:listingId',
  passport.authenticate('jwt', { session: false }),
  verifyListingOwnership,  // ← AJOUTER ICI
  getListingById
)

router.patch('/listings/:listingId',
  passport.authenticate('jwt', { session: false }),
  verifyListingOwnership,  // ← AJOUTER ICI
  updateListing
)

router.delete('/listings/:listingId',
  passport.authenticate('jwt', { session: false }),
  verifyListingOwnership,  // ← AJOUTER ICI
  deleteListing
)
```

**Checklist:**
- [ ] Ajouter `enforceOwnerIsolation` sur GET /listings
- [ ] Ajouter `enforceOwnerIsolation` sur POST /listings
- [ ] Ajouter `verifyListingOwnership` sur GET /listings/:listingId
- [ ] Ajouter `verifyListingOwnership` sur PATCH /listings/:listingId
- [ ] Ajouter `verifyListingOwnership` sur DELETE /listings/:listingId

---

#### 1.2 Routes Config (chatbot, concierge, support)

**Fichiers:**
- `apps/srv-listing/src/routes/listingChatbotConfig.ts`
- `apps/srv-listing/src/routes/listingConciergeConfig.ts`
- `apps/srv-listing/src/routes/listingSupportCategories.ts`
- `apps/srv-listing/src/routes/listingTaskConfig.ts`

**Pattern à ajouter:**
```typescript
import { verifyListingOwnership } from '../middleware/verifyListingOwnership'

router.get('/listings/:listingId/chatbot-config',
  passport.authenticate('jwt', { session: false }),
  verifyListingOwnership,  // ← AJOUTER ICI
  getChatbotConfig
)

router.patch('/listings/:listingId/chatbot-config',
  passport.authenticate('jwt', { session: false }),
  verifyListingOwnership,  // ← AJOUTER ICI
  updateChatbotConfig
)
```

**Checklist:**
- [ ] Ajouter `verifyListingOwnership` sur routes chatbot config
- [ ] Ajouter `verifyListingOwnership` sur routes concierge config
- [ ] Ajouter `verifyListingOwnership` sur routes support categories
- [ ] Ajouter `verifyListingOwnership` sur routes task config

---

#### 1.3 Routes Réservations (srv-reservations)

**Fichiers:**
- `apps/srv-reservations/src/routes/reservation/getReservations.ts`
- `apps/srv-reservations/src/routes/reservation/getRentalRevenue.ts`

**Pattern:**
```typescript
import { enforceOwnerIsolation } from '../../middleware/enforceOwnerIsolation'

router.get('/reservations',
  passport.authenticate('jwt', { session: false }),
  enforceOwnerIsolation,  // ← AJOUTER ICI
  getReservations
)
```

**Checklist:**
- [ ] Créer `apps/srv-reservations/src/middleware/enforceOwnerIsolation.ts` (copier depuis srv-listing)
- [ ] Ajouter middleware sur GET /reservations
- [ ] Ajouter middleware sur GET /revenue

---

#### 1.4 Routes Calendar (srv-calendar)

**Fichiers:**
- `apps/srv-calendar/src/routes/inventory.ts`

**Checklist:**
- [ ] Créer `apps/srv-calendar/src/middleware/enforceOwnerIsolation.ts`
- [ ] Ajouter middleware sur routes inventaire

---

### Phase 2 : Tests Automatisés (2h)

#### 2.1 Configurer les tests

**Fichier:** `apps/srv-listing/src/routes/__tests__/owner-isolation.test.ts`

**À faire:**
1. Remplacer `generateMockJWT` par la vraie fonction JWT de srv-listing
2. Configurer MongoDB test database
3. Vérifier imports (app, Listing, passport)

**Commande:**
```bash
cd apps/srv-listing
pnpm test owner-isolation.test.ts
```

**Résultats attendus:**
- ✅ 5 tests doivent PASSER (tous 403 ou 200 selon scénario)
- ❌ Si tests échouent → Middlewares non appliqués sur ces routes

**Checklist:**
- [ ] Installer dépendances test : `pnpm add -D supertest @types/supertest`
- [ ] Remplacer `generateMockJWT` par vraie fonction
- [ ] Lancer tests : `pnpm test owner-isolation.test.ts`
- [ ] Vérifier que 5/5 tests passent ✅

---

### Phase 3 : Audit Automatique (1h)

#### 3.1 Lancer le script d'audit

**Commande:**
```bash
cd /Users/gouacht/sojori-production
./scripts/audit-owner-isolation.sh
```

**Résultats attendus:**
```
✅ Aucune route sans authentification trouvée
⚠️  30 routes avec req.body.ownerId → Vérifier switch role
⚠️  15 routes avec :listingId → Ajouter verifyListingOwnership
✅ enforceOwnerIsolation.ts existe
✅ verifyListingOwnership.ts existe
✅ owner-isolation.test.ts existe
```

**Checklist:**
- [ ] Lancer script audit
- [ ] Corriger routes sans authentification (si détectées)
- [ ] Vérifier routes avec req.body.ownerId (switch role présent ?)
- [ ] Ajouter verifyListingOwnership sur routes :listingId manquantes

---

### Phase 4 : Frontend (1h)

#### 4.1 Supprimer envoi ownerId pour Owner

**Fichiers frontend (Sojori-orchestrator):**
- `src/features/distribution/pages/DistributionPage.jsx`
- `src/features/dynamic-pricing/hooks/usePortfolio.ts`
- `src/features/tasks/services/serverApi.task.js`

**Avant (DANGEREUX):**
```typescript
// ❌ Owner envoie ownerId
const ownerId = user?.ownerId || user?._id
const res = await api.getListings({ ownerId })
```

**Après (SÉCURISÉ):**
```typescript
// ✅ Owner NE passe PAS ownerId (backend le force)
const res = await api.getListings({
  // Uniquement Admin peut passer ownerId
  ...(user.role === 'Admin' && selectedOwnerId ? { ownerId: selectedOwnerId } : {})
})
```

**Checklist:**
- [ ] Modifier `DistributionPage.jsx` (supprimer ownerId pour Owner)
- [ ] Modifier `usePortfolio.ts` (supprimer ownerId pour Owner)
- [ ] Modifier `serverApi.task.js` (supprimer ownerId pour Owner)
- [ ] Tester en local : Owner se connecte → Voit uniquement ses listings

---

## 📋 Validation Finale

### Checklist Globale

- [ ] **Phase 1** : Middlewares appliqués sur 15+ routes critiques
- [ ] **Phase 2** : Tests automatisés 5/5 passent ✅
- [ ] **Phase 3** : Script audit ne trouve AUCUNE route sans auth
- [ ] **Phase 4** : Frontend ne passe PAS ownerId pour Owner

### Tests Manuels (Postman/Burp Suite)

#### Test 1 : Owner A ne peut PAS voir Listing B

```bash
# Créer Owner A et Owner B en base
# Créer Listing A (ownerId=Owner A) et Listing B (ownerId=Owner B)

# Test avec token Owner A
curl -X GET "https://dev.sojori.com/api/v1/listing/listings/LISTING_B_ID" \
  -H "Authorization: Bearer TOKEN_OWNER_A"

# Résultat attendu : 403 Forbidden
# Message : "You do not have permission to access this listing"
```

#### Test 2 : Owner A ne peut PAS passer ownerId=Owner B

```bash
curl -X GET "https://dev.sojori.com/api/v1/listing/listings?ownerId=OWNER_B_ID" \
  -H "Authorization: Bearer TOKEN_OWNER_A"

# Résultat attendu : 403 Forbidden
# Message : "You cannot access data from another owner"
```

#### Test 3 : Worker sans ownerAccess ne peut PAS voir Listing C

```bash
# Worker avec listingIds=[A] tente accès Listing C (Owner A aussi)

curl -X GET "https://dev.sojori.com/api/v1/listing/listings/LISTING_C_ID" \
  -H "Authorization: Bearer TOKEN_WORKER"

# Résultat attendu : 403 Forbidden
# Message : "You do not have access to this specific listing"
```

**Checklist Tests Manuels:**
- [ ] Test 1 : Owner A → Listing B = 403 ✅
- [ ] Test 2 : Owner A + ownerId=B = 403 ✅
- [ ] Test 3 : Worker → Listing hors liste = 403 ✅

---

## 🚨 Déploiement Production

### Avant Déploiement

- [ ] Tous les tests automatisés passent ✅
- [ ] Tests manuels Postman validés ✅
- [ ] Script audit ne montre AUCUNE alerte critique
- [ ] Code review par 2ème dev (si possible)

### Déploiement

```bash
# 1. Build local
cd apps/srv-listing
pnpm build

# 2. Tests pre-deploy
pnpm test owner-isolation.test.ts

# 3. Commit
git add .
git commit -m "security(multi-tenant): enforce owner isolation with middlewares

- Add enforceOwnerIsolation middleware (force ownerId for Owner/Worker)
- Add verifyListingOwnership middleware (verify listing.ownerId)
- Add automated security tests (5 scenarios)
- Update 15+ routes with security middlewares
- Fixes potential cross-owner data leak vulnerability

See: docs/security/AUDIT_OWNER_ISOLATION_MULTI_TENANT.md"

# 4. Push
git push origin main

# 5. Deploy
kubectl rollout restart deployment srv-listing
kubectl rollout status deployment srv-listing

# 6. Vérifier logs
kubectl logs -f deployment/srv-listing | grep "SECURITY"
```

### Monitoring Post-Déploiement

**Chercher tentatives d'accès refusées:**
```bash
# Logs Kubernetes (dernières 24h)
kubectl logs deployment/srv-listing --since=24h | grep "\[SECURITY\]"

# Si détecte tentatives :
# → Vérifier IP source
# → Vérifier userId/email
# → Bloquer si attaque automatisée
```

**Grafana Dashboard:**
- Créer alerte : Spike de 403 sur routes `/listings*`
- Seuil : > 10 erreurs 403 en 5 min

---

## 📊 Estimation Temps Total

| Phase | Tâche | Temps Estimé |
|-------|-------|--------------|
| **Phase 1** | Appliquer middlewares sur 15+ routes | 3h |
| **Phase 2** | Configurer et lancer tests automatisés | 2h |
| **Phase 3** | Audit automatique + corrections | 1h |
| **Phase 4** | Frontend (supprimer ownerId) | 1h |
| **Validation** | Tests manuels Postman | 1h |
| **Déploiement** | Build + Deploy + Monitoring | 1h |
| **TOTAL** | | **9h** (~2 jours) |

---

## 📞 Support

**Questions implémentation:** Gouacht
**Bugs middlewares:** Créer issue GitHub (label: `security-critical`)
**Documentation:** `docs/security/AUDIT_OWNER_ISOLATION_MULTI_TENANT.md`

---

**⚠️ RAPPEL CRITIQUE:**

> "Ce serait une CATASTROPHE si un property manager pouvait voir les données d'un autre."

**→ Implémenter MAINTENANT (2 jours max)**
