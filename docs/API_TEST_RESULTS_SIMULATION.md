# 🧪 RÉSULTATS TESTS APIs - Simulation Comparative
## Ancien Dashboard vs Nouveau Dashboard

**Date:** 2026-05-15
**Status:** ⚠️ ERREUR 404 Détectée sur Nouveau Endpoint

---

## 🚨 PROBLÈME IDENTIFIÉ

### Erreur Actuelle
```
Request failed with status code 404
```

### Diagnostic

Le nouveau endpoint `/api/v1/reservations` retourne **404** pour les raisons suivantes:

#### 1. **Route Existe Mais Conditions Non Remplies**

**Backend:** `apps/srv-reservations/src/routes/reservation/getReservations.ts:76-80`

```typescript
const user: any = req.user  // ⚠️ DÉPEND DU JWT DÉCODÉ

switch (user.role) {
  case Roles.Owner:
    pipeline.push({
      $match: { ownerId: new Types.ObjectId(user._id as string) },
    })
    break
  // ...
}
```

**Si `req.user` est undefined ou mal formé → 404**

#### 2. **Middleware Auth Peut Échouer Silencieusement**

**File:** `apps/srv-reservations/src/passportConfig.ts` ou `apps/srv-reservations/src/routes/reservation/index.ts:62-64`

```typescript
propertyTypeRouter.get(
  '/',
  authenticateJWT,  // ⚠️ Si échec ici → 404 ou 401
  roleAllow([Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker]),
  getReservations,
)
```

---

## 📊 COMPARAISON STRUCTURE (Théorique)

### ✅ Ancien Endpoint (FONCTIONNE)

**Request:**
```bash
GET https://dev.sojori.com/api/v1/reservations/reservations?dateType=arrival&startDate=2026-05-15&endDate=2026-05-16&limit=5
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "663a1b2c3d4e5f6a7b8c9d0e",
      "reservationNumber": "SJ-W1QS3UKJ",
      "guestName": "John Doe",
      "guestFirstName": "John",
      "guestLastName": "Doe",
      "guestCountry": "France",
      "phone": "+33612345678",
      "arrivalDate": "2026-05-15T14:00:00.000Z",
      "departureDate": "2026-05-17T11:00:00.000Z",
      "nights": 2,
      "adults": 2,
      "children": 0,
      "totalPrice": 250.00,
      "currency": "EUR",
      "status": "confirmed",
      "paymentStatus": "paid",
      "channelName": "Airbnb",
      "listing": {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Appartement Paris Centre",
        "city": "Paris",
        "checkInTimeStart": 1400,
        "checkOutTime": 1100
      },
      "actualArrivalTime": null,
      "actualDepartureTime": null,
      "customerArrived": false,
      "byRentals": false,
      "byChannex": true,
      "sojoriId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "roomTypeName": "Studio",
      "ownerId": "65e0a1b2c3d4e5f6a7b8c9d0"
    }
  ],
  "unmappedReservation": [],
  "total": 1,
  "totalUnmapped": 0,
  "message": "Reservations fetched successfully"
}
```

### ❌ Nouveau Endpoint (404 ERROR)

**Request:**
```bash
GET https://dev.sojori.com/api/v1/reservations?dateType=arrival&startDate=2026-05-15&endDate=2026-05-16&limit=5
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response Actuelle (404 Not Found):**
```json
{
  "error": "Not Found",
  "message": "Cannot GET /api/v1/reservations",
  "statusCode": 404
}
```

**Response Attendue (si fonctionnait):**
```json
[
  {
    "_id": "663a1b2c3d4e5f6a7b8c9d0e",
    "reservationNumber": "SJ-W1QS3UKJ",
    "guestName": "John Doe",
    "guestFirstName": "John",
    "guestLastName": "Doe",
    "guestCountry": "France",
    "phone": "+33612345678",
    "arrivalDate": "2026-05-15T14:00:00.000Z",
    "departureDate": "2026-05-17T11:00:00.000Z",
    "nights": 2,
    "adults": 2,
    "children": 0,
    "totalPrice": 250.00,
    "currency": "EUR",
    "status": "confirmed",
    "paymentStatus": "paid",
    "channelName": "Airbnb",
    "listing": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Appartement Paris Centre",
      "city": "Paris",
      "checkInTimeStart": 1400,
      "checkOutTime": 1100
    },
    "actualArrivalTime": null,
    "actualDepartureTime": null,
    "customerArrived": false,
    "byRentals": false,
    "byChannex": true,
    "sojoriId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "roomTypeName": "Studio",
    "ownerId": "65e0a1b2c3d4e5f6a7b8c9d0"
  }
]
```

---

## 🔍 CAUSES POSSIBLES DU 404

### 1. Route Non Montée Correctement

**Vérifier:** `apps/srv-reservations/src/routes/index.ts`

```typescript
// ✅ CORRECT
router.use('/reservations', reservationRouter)

// ❌ SI MANQUANT: 404
```

### 2. Middleware Auth Échoue

**apiClient** envoie bien le header `Authorization: Bearer <token>` ?

**Vérifier dans:** `src/services/apiClient.ts:57-65`

```typescript
const token = getToken();
if (token && config.headers) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

**Test:**
```bash
# Vérifier que le header est bien envoyé
# Ouvrir DevTools > Network > requête /api/v1/reservations
# Onglet Headers > Request Headers
# Doit contenir: Authorization: Bearer eyJ...
```

### 3. Token JWT Invalide/Expiré

```bash
# Décoder le token pour vérifier
echo "eyJhbGciOiJIUzI1NiIs..." | base64 -d

# Vérifier l'expiration
# payload.exp doit être > Date.now()
```

### 4. Backend Attend Query Params Obligatoires

**Code:** `apps/srv-reservations/src/routes/reservation/getReservations.ts:47-59`

Si `startDate`/`endDate` sont requis mais manquent → peut causer erreur

### 5. CORS/CSP Bloque la Requête

**Vérifier console browser:**
```
Access to fetch at 'https://dev.sojori.com/api/v1/reservations' from origin 'http://localhost:4174' has been blocked by CORS policy
```

**Solution:** Vérifier `vite.config.ts` CSP

---

## 🛠️ DEBUG ÉTAPE PAR ÉTAPE

### Étape 1: Vérifier que la Route Existe

```bash
# Tester l'ancien endpoint (fonctionne)
curl -I https://dev.sojori.com/api/v1/reservations/reservations

# Expected: HTTP/1.1 401 Unauthorized (normal sans token)

# Tester le nouveau endpoint
curl -I https://dev.sojori.com/api/v1/reservations

# Si 404 → route non montée
# Si 401 → route existe mais auth requis ✅
```

### Étape 2: Tester avec Token Valide

```bash
# Obtenir un token
# 1. Se connecter sur https://dev.sojori.com
# 2. DevTools > Application > Local Storage
# 3. Copier 'token'

TOKEN="votre_token_ici"

# Tester ancien
curl -X GET "https://dev.sojori.com/api/v1/reservations/reservations?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -v

# Tester nouveau
curl -X GET "https://dev.sojori.com/api/v1/reservations?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -v
```

### Étape 3: Vérifier Logs Backend

```bash
# Si backend local
cd /Users/gouacht/sojori-production
pnpm --filter srv-reservations dev

# Regarder les logs quand requête arrive

# Si backend prod (GKE)
kubectl logs -f deployment/srv-reservations --namespace=production

# Chercher:
# - "GET /api/v1/reservations" → route hit
# - Error messages
# - JWT decode errors
```

### Étape 4: Vérifier Frontend

**Ouvrir:** `http://localhost:4174`

**DevTools > Network:**
1. Aller sur page Réservations
2. Regarder requête `reservations?dateType=...`
3. **Request Headers** doit contenir:
   ```
   Authorization: Bearer eyJ...
   Content-Type: application/json
   ```
4. **Response:**
   - Si 404 → backend issue
   - Si 401 → token invalide
   - Si 200 → succès ✅

---

## 🎯 SOLUTIONS PROPOSÉES

### Solution 1: Utiliser l'Ancien Endpoint (Quick Fix)

**Dans:** `src/services/reservationsService.ts`

```typescript
// AVANT (404)
const url = `${BASE_URL}/api/v1/reservations?${queryParams.toString()}`;

// APRÈS (fonctionne)
const url = `${BASE_URL}/api/v1/reservations/reservations?${queryParams.toString()}`;
```

**Pros:**
- ✅ Fonctionne immédiatement
- ✅ Backend supporte déjà ce path (legacy)

**Cons:**
- ⚠️ Utilise path legacy
- ⚠️ Response a structure différente (`{ success, data }` vs `data[]`)

### Solution 2: Debugger Pourquoi le Nouveau Endpoint Fail

**Étapes:**
1. Vérifier que route est montée dans `apps/srv-reservations/src/routes/index.ts`
2. Vérifier que `authenticateJWT` middleware fonctionne
3. Vérifier que token JWT est valide et bien envoyé
4. Tester avec cURL direct (contourner frontend)

### Solution 3: Utiliser Endpoint Interne (avec Service Token)

**Si dashboard = service interne:**

```typescript
// Utiliser endpoint interne qui ne requiert pas JWT user
const url = `${BASE_URL}/api/v1/internal/reservations/checkincheckout?filter=CHECKIN_TODAY`;

// Ajouter header service token
headers: {
  'x-internal-service-token': process.env.INTERNAL_SERVICE_SECRET
}
```

**Pros:**
- ✅ Endpoint optimisé pour dashboards
- ✅ Pas de problème JWT user

**Cons:**
- ⚠️ Requiert configuration service token
- ⚠️ Endpoints limités (pas de CRUD)

---

## 📝 ACTION ITEMS

### Priorité HAUTE
1. **Tester avec cURL** pour isoler si problème = frontend ou backend
2. **Vérifier logs backend** quand requête arrive
3. **Vérifier token JWT** est bien envoyé et valide

### Priorité MOYENNE
4. **Temporairement revenir à ancien endpoint** (`/reservations/reservations`)
5. **Adapter le code** pour gérer structure `{ success, data }` au lieu de `data[]`

### Priorité BASSE
6. **Investiguer pourquoi** `/reservations` retourne 404
7. **Fixer** le nouveau endpoint si c'est un bug backend

---

## 🧪 SCRIPT DE TEST

```bash
#!/bin/bash

# Test rapide pour diagnostiquer 404

TOKEN="votre_token"
BASE="https://dev.sojori.com"

echo "🧪 Test 1: Health Check"
curl -I $BASE/health
echo ""

echo "🧪 Test 2: Ancien Endpoint (sans token)"
curl -I $BASE/api/v1/reservations/reservations
echo ""

echo "🧪 Test 3: Nouveau Endpoint (sans token)"
curl -I $BASE/api/v1/reservations
echo ""

echo "🧪 Test 4: Ancien Endpoint (avec token)"
curl -s "$BASE/api/v1/reservations/reservations?limit=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.success, .data | length'
echo ""

echo "🧪 Test 5: Nouveau Endpoint (avec token)"
curl -s "$BASE/api/v1/reservations?limit=1" \
  -H "Authorization: Bearer $TOKEN" | jq 'type, length'
echo ""
```

---

## 🔗 LIENS UTILES

- **Backend Routes:** `/Users/gouacht/sojori-production/apps/srv-reservations/src/routes/`
- **Frontend Service:** `/Users/gouacht/Sojori-orchestrator/src/services/reservationsService.ts`
- **API Comparison:** `/Users/gouacht/Sojori-orchestrator/docs/API_COMPARISON_RESERVATIONS.md`

---

**Conclusion:** Le 404 est probablement dû à un problème d'auth middleware ou route non correctement montée. **Quick fix: utiliser `/reservations/reservations` (ancien endpoint).**

---

**Document créé par:** Agent-Reservations
**Date:** 2026-05-15
**Status:** 🚨 404 Error - Investigation En Cours
