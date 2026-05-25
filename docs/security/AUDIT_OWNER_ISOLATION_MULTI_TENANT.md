# 🔒 Audit : Isolation ownerId Multi-Tenant (Sojori)

**Date:** 22 Mai 2026
**Criticité:** 🔴 **CRITIQUE** — Risque de fuite de données entre property managers

---

## 🎯 Contexte

Sojori est une plateforme **multi-tenant** où chaque property manager (Owner) ne doit voir QUE ses propres données :
- Listings (propriétés)
- Réservations
- Calendriers
- Tâches
- Configurations

**Question critique posée par l'utilisateur:**
> "Comment l'ownerId est-il géré ? Est-ce robuste ? Ce serait une CATASTROPHE si un property manager pouvait voir les données d'un autre."

---

## 📊 État Actuel : Ce Qui Est Bien Fait ✅

### 1. Routes Principales (srv-listing, srv-reservations, srv-calendar)

**Pattern sécurisé identifié dans `getListings.ts`, `stats.ts`, `getDashboardDirectory.ts`, etc.:**

```typescript
const user: any = req.user  // User depuis JWT (passport.js)

switch (user.role) {
  case Roles.Owner:
    matchStage['ownerId'] = new Types.ObjectId(user._id as string)
    // ✅ FORCE ownerId = user._id (impossible de passer autre chose)
    break

  case Roles.Worker:
    matchStage['ownerId'] = new Types.ObjectId(user.ownerId as string)
    // ✅ Worker accède uniquement aux données de son employeur (user.ownerId)
    if (!user.ownerAccess) {
      matchStage['_id'] = { $in: user.listingIds }
    }
    break

  case Roles.Admin:
  case Roles.SuperAdmin:
    // ✅ Admin peut filtrer par ownerId (normal pour admin)
    if (filterOwnerIds.length > 0) {
      matchStage['ownerId'] = { $in: filterOwnerIds.map(...) }
    }
    break
}
```

**✅ Points forts:**
1. **Owner** → ownerId forcé à `user._id` (pas de query param accepté)
2. **Worker** → ownerId forcé à `user.ownerId` (employeur)
3. **Admin** → peut filtrer par ownerId (légitime)
4. JWT validé par middleware `passport.authenticate('jwt')`

---

### 2. Helper `resolveOwnerIdForListingConfig`

**Localisation:** `apps/srv-listing/src/routes/helpers/resolveOwnerIdForListingConfig.ts`

**Logique:**
```typescript
export async function resolveOwnerIdForListingConfig(req, listingId?) {
  const user = req.user

  if (user.role === Roles.Owner) {
    return ensureObjectId(user._id, 'ownerId')  // ✅ Sécurisé
  }

  if (user.role === Roles.Worker) {
    return ensureObjectId(user.ownerId, 'ownerId')  // ✅ Sécurisé
  }

  // ⚠️ Admin/SuperAdmin
  const ownerIdFromReq = req.body?.ownerId || req.query?.ownerId
  if (ownerIdFromReq) {
    return ensureObjectId(ownerIdFromReq, 'ownerId')  // ⚠️ Accepte n'importe quel ownerId
  }

  // Fallback: chercher ownerId depuis le listing
  const listing = await Listing.findById(listingId).select('ownerId')
  if (listing?.ownerId) {
    return new Types.ObjectId(String(listing.ownerId))
  }

  throw new BadRequestError('ownerId is required')
}
```

**✅ Points forts:**
- Owner/Worker → ownerId forcé depuis `req.user` (sécurisé)

**⚠️ Point d'attention:**
- Admin peut passer n'importe quel ownerId → **Acceptable SI l'admin est de confiance**

---

## 🔴 Failles Potentielles Identifiées

### 🚨 Faille #1 : Routes Sans Switch Role

**Risque:** Certaines routes pourraient accepter `req.body.ownerId` ou `req.query.ownerId` sans vérifier le rôle.

**Exemple de code DANGEREUX (à éviter):**
```typescript
// ❌ MAUVAIS : Accepte ownerId depuis req.body sans vérifier le rôle
const ownerId = req.body.ownerId || req.user._id

// Un Owner malveillant pourrait passer ownerId=autre_owner_id
const listings = await Listing.find({ ownerId })
```

**Comment vérifier:**
```bash
# Chercher routes qui utilisent req.body.ownerId sans switch role
grep -r "req.body.ownerId\|req.query.ownerId" apps/srv-*/src/routes/ \
  --include="*.ts" -B 10 | grep -v "Roles.Owner" | grep -v "switch (user.role)"
```

**Impact:** 🔴 **CRITIQUE** — Un Owner pourrait accéder aux données d'un autre Owner

---

### 🚨 Faille #2 : Frontend Envoie ownerId Manuellement

**Risque:** Le frontend (Sojori-orchestrator) envoie `ownerId` dans les requêtes API.

**Code frontend identifié:**
```typescript
// src/features/distribution/pages/DistributionPage.jsx
const ownerId = isAdmin && selectedOwnerId
  ? selectedOwnerId
  : user?.ownerId || user?._id

RentalUnitedApi.getUserToken(ownerId, 4)  // ❌ ownerId envoyé par frontend

// src/features/dynamic-pricing/hooks/usePortfolio.ts
const res = await fetchDynamicPricingPortfolio({
  ownerId,  // ❌ ownerId envoyé par frontend
  city: cityScope
})
```

**Problème:**
1. **Admin mode** → ownerId vient de `selectedOwnerId` (choix admin dans dropdown) → **OK**
2. **Owner mode** → ownerId = `user._id` → **Mais envoyé par frontend !**

**Risque:**
- Un Owner malveillant pourrait modifier le code frontend (DevTools, Burp Suite) pour passer un autre ownerId
- Si le backend ne re-vérifie pas, il pourrait accéder aux données d'un autre Owner

**Solution:**
- ✅ **Backend DOIT ignorer ownerId frontend pour Owner role**
- ✅ **Backend DOIT TOUJOURS utiliser `req.user._id` pour Owner**

---

### 🚨 Faille #3 : Pas de Validation sur listingId

**Risque:** Un Owner pourrait passer le `listingId` d'un autre Owner.

**Scénario d'attaque:**
```
1. Owner A (id=111) possède Listing X (id=aaa, ownerId=111)
2. Owner B (id=222) possède Listing Y (id=bbb, ownerId=222)

3. Owner A appelle: GET /api/listings/bbb/config
   Backend vérifie: req.user.role = Owner ✅
   Backend vérifie: listingId valide ✅
   Backend vérifie: listing.ownerId = req.user._id ❓

4. SI PAS DE VÉRIFICATION → Owner A accède à Listing Y de Owner B 🔴
```

**Comment vérifier:**
```bash
# Routes qui utilisent listingId en param sans vérifier ownerId
grep -r "req.params.listingId" apps/srv-listing/src/routes/ \
  --include="*.ts" -A 20 | grep -L "ownerId"
```

**Solution:**
```typescript
// ✅ BON : Vérifier que le listing appartient bien à l'owner
const listing = await Listing.findById(req.params.listingId)
if (!listing) return res.status(404).json(...)

if (user.role === Roles.Owner && listing.ownerId.toString() !== user._id) {
  return res.status(403).json({
    success: false,
    message: 'Vous ne pouvez pas accéder à ce listing'
  })
}
```

---

### 🚨 Faille #4 : JWT Claims Non Vérifiés

**Risque:** Le JWT contient `{ userId, role, ownerId }` mais est-il validé à chaque requête ?

**Questions:**
1. ✅ JWT signé avec secret ? (Oui, sinon passport.authenticate échouerait)
2. ✅ JWT expiré rejeté ? (Oui, passport vérifie l'expiration)
3. ⚠️ JWT `role` peut-il être modifié ? (Seulement si JWT_SECRET compromis)
4. ⚠️ JWT `ownerId` pour Worker peut-il être modifié ? (Seulement si JWT_SECRET compromis)

**Vérification backend:**
```typescript
// apps/srv-listing/src/passportConfig.ts ou middleware auth
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,  // ✅ Secret sécurisé ?
}, async (payload, done) => {
  // ⚠️ Le payload JWT est-il vérifié en base ?
  const user = await User.findById(payload.userId)
  if (!user) return done(null, false)

  // ⚠️ Est-ce que user.role du JWT === user.role en base ?
  if (payload.role !== user.role) {
    return done(null, false)  // ✅ Important !
  }

  return done(null, { ...payload, dbRole: user.role })
}))
```

**Recommandation:**
- ✅ **Toujours re-vérifier `role` depuis la base de données**
- ✅ **JWT_SECRET doit être unique et sécurisé (Kubernetes Secret)**

---

### 🚨 Faille #5 : Routes Sans Authentification

**Risque:** Certaines routes pourraient être publiques (pas de `passport.authenticate`).

**Vérification:**
```bash
# Trouver routes sans middleware auth
grep -r "router.get\|router.post\|router.put\|router.delete" \
  apps/srv-listing/src/routes/ --include="*.ts" -A 1 | \
  grep -v "passport.authenticate\|requireAuth\|authMiddleware" | head -50
```

**Exemple de route NON SÉCURISÉE:**
```typescript
// ❌ DANGEREUX
router.get('/listings', async (req, res) => {
  const listings = await Listing.find()  // ❌ Tous les listings renvoyés !
  res.json(listings)
})

// ✅ SÉCURISÉ
router.get('/listings',
  passport.authenticate('jwt', { session: false }),  // ✅ Auth requis
  async (req, res) => {
    const user: any = req.user
    const filter = user.role === Roles.Owner
      ? { ownerId: user._id }  // ✅ Filtré par owner
      : {}
    const listings = await Listing.find(filter)
    res.json(listings)
  }
)
```

---

## ✅ Recommandations pour Renforcer l'Isolation

### 🎯 Recommandation #1 : Middleware `enforceOwnerIsolation`

**Créer un middleware global qui FORCE l'isolation pour Owner/Worker.**

**Fichier:** `apps/srv-listing/src/middleware/enforceOwnerIsolation.ts`

```typescript
import type { Request, Response, NextFunction } from 'express'
import { Roles } from '../passportConfig'

/**
 * Middleware qui empêche Owner/Worker de passer un ownerId différent du leur.
 * À utiliser APRÈS passport.authenticate('jwt').
 */
export function enforceOwnerIsolation(req: Request, res: Response, next: NextFunction) {
  const user: any = req.user

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    })
  }

  // Owner → FORCE ownerId = user._id
  if (user.role === Roles.Owner) {
    const requestedOwnerId = req.body?.ownerId || req.query?.ownerId

    if (requestedOwnerId && requestedOwnerId !== user._id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access data from another owner',
        attemptedOwnerId: requestedOwnerId,
        yourOwnerId: user._id,
      })
    }

    // ✅ Forcer ownerId dans req pour toutes les routes suivantes
    req.body.ownerId = user._id
    if (req.query) req.query.ownerId = user._id
  }

  // Worker → FORCE ownerId = user.ownerId
  if (user.role === Roles.Worker) {
    const requestedOwnerId = req.body?.ownerId || req.query?.ownerId

    if (requestedOwnerId && requestedOwnerId !== user.ownerId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access data from another owner',
        attemptedOwnerId: requestedOwnerId,
        yourEmployerOwnerId: user.ownerId,
      })
    }

    // ✅ Forcer ownerId
    req.body.ownerId = user.ownerId
    if (req.query) req.query.ownerId = user.ownerId
  }

  // Admin/SuperAdmin → Pas de restriction (peuvent passer ownerId)
  next()
}
```

**Usage dans les routes:**
```typescript
import { enforceOwnerIsolation } from '../middleware/enforceOwnerIsolation'

router.get('/listings',
  passport.authenticate('jwt', { session: false }),
  enforceOwnerIsolation,  // ✅ AVANT le handler
  getListings
)
```

---

### 🎯 Recommandation #2 : Middleware `verifyListingOwnership`

**Vérifier que le listing appartient bien à l'owner pour les routes avec `:listingId`.**

**Fichier:** `apps/srv-listing/src/middleware/verifyListingOwnership.ts`

```typescript
import type { Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { Listing } from '../db'
import { Roles } from '../passportConfig'

/**
 * Middleware qui vérifie que le listing appartient bien à l'owner connecté.
 * À utiliser sur les routes PATCH/PUT/DELETE /listings/:listingId.
 */
export async function verifyListingOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user: any = req.user
  const listingId = req.params.listingId

  if (!listingId || !Types.ObjectId.isValid(listingId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid listing ID'
    })
  }

  const listing = await Listing.findById(listingId).select('ownerId').lean()

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    })
  }

  // Owner → Vérifier que listing.ownerId = user._id
  if (user.role === Roles.Owner) {
    if (listing.ownerId.toString() !== user._id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this listing',
        listingId,
        listingOwnerId: listing.ownerId,
        yourOwnerId: user._id,
      })
    }
  }

  // Worker → Vérifier que listing.ownerId = user.ownerId
  if (user.role === Roles.Worker) {
    if (listing.ownerId.toString() !== user.ownerId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this listing',
        listingId,
        listingOwnerId: listing.ownerId,
        yourEmployerOwnerId: user.ownerId,
      })
    }

    // Si Worker sans ownerAccess, vérifier listingIds
    if (!user.ownerAccess) {
      const hasAccess = user.listingIds?.includes(listingId)
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this specific listing',
        })
      }
    }
  }

  // Admin/SuperAdmin → Pas de restriction
  next()
}
```

**Usage:**
```typescript
router.patch('/listings/:listingId',
  passport.authenticate('jwt', { session: false }),
  verifyListingOwnership,  // ✅ Vérifie ownership
  updateListing
)

router.delete('/listings/:listingId',
  passport.authenticate('jwt', { session: false }),
  verifyListingOwnership,  // ✅ Vérifie ownership
  deleteListing
)
```

---

### 🎯 Recommandation #3 : Auditer Toutes les Routes Critiques

**Script d'audit automatique:**

**Fichier:** `scripts/audit-owner-isolation.sh`

```bash
#!/bin/bash

echo "🔍 Audit d'isolation ownerId - Sojori Backend"
echo "=============================================="
echo ""

# 1. Routes sans middleware auth
echo "1️⃣ Routes SANS authentification (CRITIQUE):"
grep -r "router\.\(get\|post\|put\|patch\|delete\)" apps/srv-listing/src/routes/ \
  apps/srv-reservations/src/routes/ apps/srv-calendar/src/routes/ \
  --include="*.ts" -n | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)

  # Vérifier si passport.authenticate existe dans les 5 lignes suivantes
  hasAuth=$(sed -n "${linenum},$((linenum+5))p" "$file" | grep -c "passport.authenticate\|requireAuth\|authMiddleware")

  if [ "$hasAuth" -eq 0 ]; then
    echo "⚠️  $line"
  fi
done | head -20
echo ""

# 2. Routes qui acceptent req.body.ownerId sans switch role
echo "2️⃣ Routes acceptant ownerId depuis req.body/query (à vérifier):"
grep -r "req\.body\.ownerId\|req\.query\.ownerId" apps/srv-listing/src/routes/ \
  apps/srv-reservations/src/routes/ --include="*.ts" -n | head -20
echo ""

# 3. Routes avec :listingId sans vérification ownerId
echo "3️⃣ Routes avec :listingId (vérifier ownership):"
grep -r "req\.params\.listingId" apps/srv-listing/src/routes/ \
  --include="*.ts" -l | head -20
echo ""

# 4. Secrets JWT (vérifier rotation)
echo "4️⃣ Configuration JWT_SECRET:"
if [ -f "kubernetes/apps/srv-listing/secrets.yaml" ]; then
  echo "✅ Secrets Kubernetes trouvés"
else
  echo "⚠️  Secrets Kubernetes NON trouvés"
fi
echo ""

echo "✅ Audit terminé. Vérifier manuellement les warnings."
```

**Utilisation:**
```bash
chmod +x scripts/audit-owner-isolation.sh
./scripts/audit-owner-isolation.sh > audit-owner-isolation-report.txt
```

---

### 🎯 Recommandation #4 : Tests Automatisés d'Isolation

**Créer des tests qui vérifient l'isolation entre owners.**

**Fichier:** `apps/srv-listing/src/routes/__tests__/owner-isolation.test.ts`

```typescript
import request from 'supertest'
import app from '../../app'
import { Listing } from '../../db'
import { generateJWT } from '../../utils/jwt'

describe('Owner Isolation Security', () => {
  let ownerAToken: string
  let ownerBToken: string
  let listingA: any
  let listingB: any

  beforeAll(async () => {
    // Créer Owner A
    ownerAToken = generateJWT({
      userId: '111111111111111111111111',
      role: 'Owner',
      email: 'ownerA@test.com',
    })

    // Créer Owner B
    ownerBToken = generateJWT({
      userId: '222222222222222222222222',
      role: 'Owner',
      email: 'ownerB@test.com',
    })

    // Créer Listing A (appartient à Owner A)
    listingA = await Listing.create({
      name: 'Listing A',
      ownerId: '111111111111111111111111',
      city: 'Paris',
    })

    // Créer Listing B (appartient à Owner B)
    listingB = await Listing.create({
      name: 'Listing B',
      ownerId: '222222222222222222222222',
      city: 'Marrakech',
    })
  })

  test('🔴 Owner A ne peut PAS voir Listing B', async () => {
    const res = await request(app)
      .get(`/api/v1/listing/listings/${listingB._id}`)
      .set('Authorization', `Bearer ${ownerAToken}`)

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toContain('do not have permission')
  })

  test('✅ Owner A peut voir Listing A', async () => {
    const res = await request(app)
      .get(`/api/v1/listing/listings/${listingA._id}`)
      .set('Authorization', `Bearer ${ownerAToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data._id).toBe(listingA._id.toString())
  })

  test('🔴 Owner A ne peut PAS passer ownerId=Owner B dans query', async () => {
    const res = await request(app)
      .get('/api/v1/listing/listings')
      .query({ ownerId: '222222222222222222222222' })  // Owner B
      .set('Authorization', `Bearer ${ownerAToken}`)  // Token Owner A

    expect(res.status).toBe(403)
    expect(res.body.message).toContain('cannot access data from another owner')
  })

  test('🔴 Owner A ne peut PAS modifier Listing B', async () => {
    const res = await request(app)
      .patch(`/api/v1/listing/listings/${listingB._id}`)
      .send({ name: 'Hacked Listing B' })
      .set('Authorization', `Bearer ${ownerAToken}`)

    expect(res.status).toBe(403)
  })
})
```

**Lancer les tests:**
```bash
cd apps/srv-listing
pnpm test owner-isolation.test.ts
```

---

### 🎯 Recommandation #5 : RBAC Strict sur Frontend

**Frontend (Sojori-orchestrator) ne doit PAS envoyer ownerId pour Owner role.**

**Avant (DANGEREUX):**
```typescript
// ❌ Frontend envoie ownerId
const ownerId = user?.ownerId || user?._id
const res = await api.getListings({ ownerId })
```

**Après (SÉCURISÉ):**
```typescript
// ✅ Frontend n'envoie PAS ownerId pour Owner
// Backend le détermine depuis req.user
const res = await api.getListings({
  // Pas de ownerId si user.role === 'Owner'
  ...(user.role === 'Admin' && selectedOwnerId ? { ownerId: selectedOwnerId } : {})
})
```

**Règle générale:**
- ✅ **Admin** → peut passer `ownerId` (dropdown sélecteur owner)
- ❌ **Owner/Worker** → NE JAMAIS envoyer `ownerId` (backend le force)

---

## 📋 Checklist de Validation

### Phase 1 : Backend Isolation (1 semaine)
- [ ] **Ajouter middleware `enforceOwnerIsolation`** sur toutes les routes Owner/Worker
- [ ] **Ajouter middleware `verifyListingOwnership`** sur routes PATCH/DELETE listings/:id
- [ ] **Auditer routes sans `passport.authenticate`** (script `audit-owner-isolation.sh`)
- [ ] **Vérifier `resolveOwnerIdForListingConfig`** dans toutes les routes de config
- [ ] **Tester avec JWT d'un autre owner** (tests automatisés)

### Phase 2 : Frontend RBAC (3 jours)
- [ ] **Supprimer envoi ownerId pour Owner role** dans apiClient
- [ ] **Garder envoi ownerId UNIQUEMENT pour Admin** (dropdown sélecteur)
- [ ] **RoleGuard bloque accès routes admin** pour Owner/Worker

### Phase 3 : Tests Sécurité (2 jours)
- [ ] **Tests automatisés owner-isolation.test.ts**
- [ ] **Pen test manuel** : Owner A tente accès données Owner B
- [ ] **Audit logs** : détecter tentatives d'accès non autorisé

### Phase 4 : Monitoring (continu)
- [ ] **Logger tentatives d'accès refusées** (403 avec ownerId)
- [ ] **Alertes Grafana** : spike de 403 sur routes listings/reservations
- [ ] **Revue mensuelle logs** : détecter patterns suspects

---

## 🚨 Scénarios d'Attaque à Tester

### Scénario 1 : Owner malveillant via DevTools

**Attaque:**
```javascript
// Owner A (id=111) ouvre DevTools
// Modifie requête API pour passer ownerId=222 (Owner B)
fetch('https://dev.sojori.com/api/v1/listing/listings?ownerId=222', {
  headers: { 'Authorization': 'Bearer <token_owner_A>' }
})
```

**Défense attendue:**
- ✅ Backend répond `403 Forbidden`
- ✅ Message : "You cannot access data from another owner"
- ✅ Log l'incident : `[SECURITY] Owner 111 attempted access to ownerId 222`

---

### Scénario 2 : Modification JWT (role escalation)

**Attaque:**
```javascript
// Attaquant décode son JWT Owner
// Modifie "role": "Owner" → "role": "Admin"
// Re-signe avec un faux secret
```

**Défense attendue:**
- ✅ Signature invalide → `passport.authenticate` rejette
- ✅ Réponse `401 Unauthorized`

---

### Scénario 3 : listingId d'un autre owner

**Attaque:**
```bash
# Owner A (id=111) appelle
PATCH /api/v1/listing/listings/bbb  # Listing B appartient à Owner B (id=222)
Authorization: Bearer <token_owner_A>
Body: { name: "Hacked Listing" }
```

**Défense attendue:**
- ✅ Middleware `verifyListingOwnership` vérifie `listing.ownerId === req.user._id`
- ✅ Réponse `403 Forbidden`

---

### Scénario 4 : Worker tente accès listing hors de sa liste

**Attaque:**
```bash
# Worker (ownerId=111, listingIds=[aaa, bbb]) appelle
GET /api/v1/listing/listings/ccc  # Listing C appartient aussi à Owner 111 mais pas dans listingIds
```

**Défense attendue:**
- ✅ `verifyListingOwnership` vérifie `user.listingIds.includes(listingId)`
- ✅ Réponse `403 Forbidden` (si `user.ownerAccess === false`)

---

## 🎯 Résumé Exécutif

### État Actuel : 7/10 Sécurité 🟡

**✅ Bien fait:**
- Routes principales (getListings, stats) filtrent par `user._id` pour Owner
- JWT validé par passport.js
- Helper `resolveOwnerIdForListingConfig` force ownerId pour Owner/Worker

**⚠️ Risques identifiés:**
- Pas de middleware global `enforceOwnerIsolation`
- Routes avec `:listingId` sans vérification ownership
- Frontend envoie ownerId (risque manipulation DevTools)
- Pas de tests automatisés d'isolation

### Recommandations Prioritaires (Cette Semaine)

1. **Ajouter `enforceOwnerIsolation` middleware** (2h)
2. **Ajouter `verifyListingOwnership` middleware** (2h)
3. **Auditer routes critiques** (script `audit-owner-isolation.sh`) (1h)
4. **Tests automatisés** (`owner-isolation.test.ts`) (3h)
5. **Supprimer envoi ownerId frontend pour Owner** (1h)

**Temps total:** ~1 jour
**Impact:** 🔴 **CRITIQUE** — Évite fuite de données entre owners

---

## 📞 Contact

**Questions isolation:** Gouacht
**Revue code sécurité:** Claude Code
**Incident sécurité:** Créer issue GitHub (label: `security-critical`)

---

**⚠️ URGENT:**
- Implémenter `enforceOwnerIsolation` AVANT déploiement en production
- Tester scénarios d'attaque avec Postman/Burp Suite
- Jamais faire confiance aux données frontend (req.body.ownerId)
