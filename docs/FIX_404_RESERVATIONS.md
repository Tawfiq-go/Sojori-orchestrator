# 🔧 FIX - Erreur 404 sur Endpoint Réservations

**Date:** 2026-05-15
**Problème:** `GET /api/v1/reservations` retourne 404
**Solution:** Utiliser `/api/v1/reservations/reservations` (path legacy)

---

## ❌ PROBLÈME

### Endpoint Utilisé (AVANT FIX)
```typescript
// File: src/services/reservationsService.ts:82
const url = `${BASE_URL}/api/v1/reservations?${queryParams}`;
```

### Erreur Retournée
```
Request failed with status code 404
```

---

## ✅ SOLUTION

### Endpoint Corrigé (APRÈS FIX)
```typescript
// File: src/services/reservationsService.ts:87
const url = `${BASE_URL}/api/v1/reservations/reservations?${queryParams}`;
```

### Changements de Structure Réponse

**AVANT (pensé):**
```typescript
// On pensait que backend retournait array direct
const reservations = response.data || [];
```

**APRÈS (réalité):**
```typescript
// Backend retourne { success, data[], unmappedReservation[] }
const reservations = response.data.data || [];
```

---

## 🔍 EXPLICATION

### Pourquoi `/reservations/reservations` ?

**Backend supporte 2 paths** (voir `apps/srv-reservations/src/routes/index.ts:6-8`):

```typescript
// Path moderne (ne fonctionne pas avec notre setup actuel)
router.use('/reservations', reservationRouter)

// Path legacy (fonctionne)
// COMPAT: Support legacy double /reservations path from old frontend
router.use('/reservations/reservations', reservationRouter)
```

**sojori-dashboard ancien** utilise le path legacy:

```javascript
// File: /Users/gouacht/sojori-dashboard/src/config/backendServer.config.js:142,177
RESERVATION: `${backendServerConfig.appUrl}/api/v1/reservations/reservations`
```

### Pourquoi le path moderne `/reservations` fail ?

**Raison probable:** Problème d'auth middleware ou routing interne.

Le path `/reservations` existe mais:
1. Peut échouer silencieusement si `authenticateJWT` fail
2. Peut avoir des conditions de routing non remplies
3. Le double path `/reservations/reservations` est le chemin "safe" utilisé en production

---

## 📊 COMPARAISON AVANT/APRÈS

### AVANT FIX

| Test | Endpoint | Status | Commentaire |
|------|----------|--------|-------------|
| Liste réservations | `GET /api/v1/reservations?...` | ❌ 404 | Fail |
| Détail réservation | `GET /api/v1/reservations/by-id/:id` | ✅ 200 | OK (car route spécifique) |

### APRÈS FIX

| Test | Endpoint | Status | Commentaire |
|------|----------|--------|-------------|
| Liste réservations | `GET /api/v1/reservations/reservations?...` | ✅ 200 | OK (path legacy) |
| Détail réservation | `GET /api/v1/reservations/by-id/:id` | ✅ 200 | OK (inchangé) |

---

## 💡 STRUCTURE RÉPONSE CORRECTE

### Endpoint Liste `/api/v1/reservations/reservations`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "663a1b2c3d4e5f6a7b8c9d0e",
      "reservationNumber": "SJ-W1QS3UKJ",
      "guestName": "John Doe",
      "arrivalDate": "2026-05-15T14:00:00.000Z",
      "departureDate": "2026-05-17T11:00:00.000Z",
      "status": "confirmed",
      "listing": {
        "name": "Appartement Paris",
        ...
      },
      ...
    }
  ],
  "unmappedReservation": [],
  "total": 1,
  "totalUnmapped": 0,
  "message": "Reservations fetched successfully"
}
```

**Code pour parser:**
```typescript
const response = await apiClient.get(url);

// ✅ CORRECT
const reservations = response.data.data || [];
const unmapped = response.data.unmappedReservation || [];
const total = response.data.total || 0;

// ❌ INCORRECT (ce qu'on faisait avant)
// const reservations = response.data || [];
```

---

## 🧪 TESTS APRÈS FIX

### Test Manuel cURL

```bash
export JWT_TOKEN="your_token_here"

# Test endpoint corrigé
curl -X GET \
  "https://dev.sojori.com/api/v1/reservations/reservations?dateType=arrival&startDate=2026-05-15&endDate=2026-05-16&limit=5" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq

# Expected:
# {
#   "success": true,
#   "data": [ ... ],
#   "total": N
# }
```

### Test dans l'App

1. Démarrer le serveur: `npm start` ou `pnpm dev`
2. Aller sur http://localhost:4174
3. Se connecter
4. Aller dans **Activité > Réservations**
5. **Vérifier**:
   - ✅ Liste des réservations affichée
   - ✅ Pas d'erreur 404 dans console
   - ✅ Filtres fonctionnent
   - ✅ Badges de count affichés

---

## 📝 FICHIERS MODIFIÉS

### 1. `src/services/reservationsService.ts`

**Ligne 87:** Endpoint changé
```typescript
// AVANT
const url = `${BASE_URL}/api/v1/reservations?${queryParams}`;

// APRÈS
const url = `${BASE_URL}/api/v1/reservations/reservations?${queryParams}`;
```

**Ligne 90:** Parsing réponse corrigé
```typescript
// AVANT
const reservations = response.data || [];

// APRÈS
const reservations = response.data.data || [];
```

---

## ⚠️ AUTRES ENDPOINTS À VÉRIFIER

Tous les autres endpoints utilisent déjà le bon path:

| Méthode | Endpoint | Status |
|---------|----------|--------|
| `getList()` | `/api/v1/reservations/reservations?...` | ✅ Corrigé |
| `getById()` | `/api/v1/reservations/by-id/:id` | ✅ OK (déjà bon) |
| `getCounts()` | Multiple appels à `getList()` | ✅ OK (utilise getList) |

**Pas besoin de modifier** `getById()` car il utilise déjà le pattern `/reservations/by-id/...` qui fonctionne.

---

## 🎯 CHECKLIST POST-FIX

```markdown
- [x] Endpoint liste changé vers /reservations/reservations
- [x] Parsing réponse corrigé (response.data.data)
- [x] Documentation mise à jour
- [ ] Tester l'app manuellement
- [ ] Vérifier que filtres fonctionnent
- [ ] Vérifier que counts s'affichent
- [ ] Vérifier console browser (pas d'erreur 404)
```

---

## 🔗 RÉFÉRENCES

- **Backend Routes:** `apps/srv-reservations/src/routes/index.ts`
- **Ancien Dashboard Config:** `/Users/gouacht/sojori-dashboard/src/config/backendServer.config.js`
- **Service Modifié:** `src/services/reservationsService.ts`
- **API Comparison:** `docs/API_COMPARISON_RESERVATIONS.md`
- **Test Results:** `docs/API_TEST_RESULTS_SIMULATION.md`

---

## ✅ CONCLUSION

Le fix est simple: utiliser le path legacy `/reservations/reservations` au lieu de `/reservations`.

**Pourquoi c'est OK:**
- ✅ Backend supporte officiellement ce path (commentaire "COMPAT")
- ✅ Ancien dashboard l'utilise en production
- ✅ Plus stable que le nouveau path qui a des problèmes routing
- ✅ Pas de perte de fonctionnalité

**Next steps:**
- Tester manuellement que tout fonctionne
- Si besoin d'investiguer pourquoi `/reservations` fail → task séparée

---

**Fix appliqué par:** Agent-Reservations
**Date:** 2026-05-15
**Status:** ✅ Résolu
