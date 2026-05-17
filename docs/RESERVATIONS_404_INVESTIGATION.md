# 🔍 Investigation: 404 Error sur Endpoint Réservations

**Date:** 2026-05-15
**Status:** 🔴 404 Not Found (Investigation en cours)
**Endpoint:** `GET /api/v1/reservations/reservations`

---

## 📊 SITUATION ACTUELLE

### Erreur Observée

```
GET https://dev.sojori.com/api/v1/reservations/reservations?dateType=arrival&startDate=2026-05-15&endDate=2026-05-16&limit=1000
Status: 404 (Not Found)
```

### Configuration Actuelle

**Frontend (.env):**
```env
VITE_API_BASE_URL=https://dev.sojori.com
VITE_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3...
```

**Frontend Service (reservationsService.ts:86):**
```typescript
const url = `${BASE_URL}/api/v1/reservations/reservations?${queryParams.toString()}`;
const response = await apiClient.get(url);
const reservations = response.data.data || [];
```

**Backend Routing (srv-reservations):**
```typescript
// apps/srv-reservations/src/app.ts:129
app.use('/api/v1', router)  // Base path

// apps/srv-reservations/src/routes/index.ts:34
router.use('/reservations/reservations', reservationRouter)  // Legacy path

// apps/srv-reservations/src/routes/reservation/index.ts:60-65
propertyTypeRouter.get(
  '/',
  authenticateJWT,
  roleAllow([Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker]),
  getReservations,
)
```

**➡️ URL complète attendue:** `/api/v1/reservations/reservations` ✅

---

## 🔍 ANALYSE

### Ce qui fonctionne

- ✅ Frontend est configuré pour appeler `https://dev.sojori.com`
- ✅ Backend a bien la route `/reservations/reservations` (legacy path)
- ✅ Backend a les middlewares auth (`authenticateJWT`, `roleAllow`)
- ✅ Endpoint `/api/v1/reservations/by-id/:id` fonctionne (selon docs)

### Points Suspects

#### 1. 404 au lieu de 401 (Critique!)

**Observation:** L'erreur est 404 (Not Found), pas 401 (Unauthorized)

**Signification:**
- Si c'était un problème d'auth, on aurait 401
- 404 = La route n'est **jamais atteinte** par la requête
- Les middlewares `authenticateJWT` ne sont **jamais exécutés**

**Possibilités:**
- Ingress/Nginx ne route pas vers srv-reservations
- Service srv-reservations n'est pas déployé/accessible
- CORS preflight (OPTIONS) échoue avant GET
- Base URL incorrecte (mais `.env` semble correct)

#### 2. Quel endpoint fonctionne réellement?

**Ancien dashboard utilise:** `/api/v1/reservations/reservations`
**Nouveau dashboard utilise:** `/api/v1/reservations/reservations`
**→ Même endpoint!**

**Question:** Pourquoi ça marche dans l'ancien mais pas le nouveau?

**Hypothèses:**
- Ancien dashboard a un token différent (avec role différent?)
- Ancien dashboard envoie des headers différents?
- Problème de CORS (localhost → prod)?

---

## 🧪 TESTS À EFFECTUER

### Script de Test Complet

Un script bash complet est disponible: `/tmp/test-reservations-404-final.sh`

```bash
# Exécuter le script
bash /tmp/test-reservations-404-final.sh
```

**Le script teste:**
1. Health check backend
2. Route sans auth (doit retourner 401 si route existe)
3. Route avec JWT token
4. Endpoint de référence (by-id)
5. Avec X-Dev-Token header

### Tests Manuels dans le Navigateur

**1. Vérifier Token JWT:**
```javascript
// Dans DevTools Console
console.log(localStorage.getItem('token'));
```

**2. Vérifier les Headers Envoyés:**
- DevTools > Network
- Cliquer sur requête `reservations`
- Onglet "Headers" > "Request Headers"
- **Vérifier présence de:**
  - `Authorization: Bearer <token>`
  - `X-Dev-Token: <dev-token>`
  - `Content-Type: application/json`

**3. Vérifier OPTIONS Preflight:**
- DevTools > Network
- Chercher requête `OPTIONS` avant `GET`
- Si OPTIONS = 404 → Problème CORS

### Test avec cURL

```bash
# Copier le token depuis localStorage
TOKEN="your_token_here"

# Test sans auth (doit retourner 401)
curl -I https://dev.sojori.com/api/v1/reservations/reservations

# Test avec auth (doit retourner 200)
curl -X GET "https://dev.sojori.com/api/v1/reservations/reservations?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -v
```

---

## 🎯 SOLUTIONS POTENTIELLES

### Solution 1: Vérifier Déploiement srv-reservations

```bash
# Si GKE production
kubectl get pods -n production | grep srv-reservations
kubectl logs -f deployment/srv-reservations -n production

# Vérifier que le service écoute sur 4007
kubectl get svc -n production | grep srv-reservations
```

**Expected:**
```
srv-reservations-xxx   Running   srv-reservations:4007
```

### Solution 2: Vérifier Ingress Routing

```bash
kubectl get ingress -n production
kubectl describe ingress sojori-ingress -n production
```

**Vérifier que la règle existe:**
```yaml
rules:
  - host: dev.sojori.com
    http:
      paths:
        - path: /api/v1/reservations
          backend:
            service:
              name: srv-reservations
              port:
                number: 4007
```

### Solution 3: Vérifier Token JWT Role

Le endpoint requiert role `SuperAdmin`, `Admin`, `Owner`, ou `Worker`.

**Décoder le token:**
```bash
# Copier partie payload du token (entre les deux points)
echo "<payload>" | base64 -d

# Vérifier:
# - "role": "SuperAdmin" / "Admin" / "Owner" / "Worker"
# - "exp": doit être > Date.now()
```

### Solution 4: Utiliser Endpoint Interne (Workaround Temporaire)

**Si rien ne fonctionne**, utiliser endpoint interne:

```typescript
// src/services/reservationsService.ts
const url = `${BASE_URL}/api/v1/internal/reservations/checkincheckout?filter=CHECKIN_TODAY`;
```

**⚠️ ATTENTION:**
- Endpoints internes ont structure différente
- Pas une solution permanente
- Ne résout pas le problème root

---

## 📝 PROCHAINES ÉTAPES

### Pour l'Utilisateur

1. **Exécuter le script de test:**
   ```bash
   bash /tmp/test-reservations-404-final.sh
   ```
   Copier token JWT depuis navigateur quand demandé

2. **Partager les résultats:**
   - Quel test retourne 404?
   - Quel test retourne 200?
   - Erreurs CORS dans console?

3. **Vérifier Network tab:**
   - Screenshot de la requête `reservations`
   - Montrer Request Headers
   - Montrer Response Headers

### Pour Débug Avancé

Si tous les tests échouent avec 404:

1. **Vérifier backend est déployé:**
   ```bash
   kubectl get all -n production | grep srv-reservations
   ```

2. **Vérifier logs backend:**
   ```bash
   kubectl logs -f deployment/srv-reservations -n production --tail=50
   ```

3. **Tester en local:**
   ```bash
   cd /Users/gouacht/sojori-production/apps/srv-reservations
   pnpm dev
   # Dans autre terminal:
   curl http://localhost:4007/api/v1/reservations/reservations
   ```

---

## 🔗 FICHIERS LIÉS

- **Frontend Service:** `/Users/gouacht/Sojori-orchestrator/src/services/reservationsService.ts`
- **Backend Routes:** `/Users/gouacht/sojori-production/apps/srv-reservations/src/routes/`
- **Backend App:** `/Users/gouacht/sojori-production/apps/srv-reservations/src/app.ts`
- **Auth Middleware:** `/Users/gouacht/sojori-production/apps/srv-reservations/src/passportConfig/Middlewares/index.ts`
- **Old Dashboard Config:** `/Users/gouacht/sojori-dashboard/src/config/backendServer.config.js`
- **Fix Documentation:** `/Users/gouacht/Sojori-orchestrator/docs/FIX_404_RESERVATIONS.md`
- **API Comparison:** `/Users/gouacht/Sojori-orchestrator/docs/API_COMPARISON_RESERVATIONS.md`
- **Test Script:** `/tmp/test-reservations-404-final.sh`
- **Debug Guide:** `/tmp/debug-reservations-404.md`

---

## 🎬 CONCLUSION

**Statut actuel:** 404 error persistant même après configuration correcte

**Prochaine action:** Exécuter le script de test pour identifier si:
- ❌ Backend n'est pas accessible (Ingress/deployment)
- ❌ Token JWT invalide/expiré
- ❌ Problème CORS preflight
- ❌ Autre problème réseau/proxy

**Une fois les tests effectués**, on pourra identifier la cause exacte et appliquer le fix approprié.

---

**Créé par:** Assistant
**Date:** 2026-05-15
**Version:** 1.0
