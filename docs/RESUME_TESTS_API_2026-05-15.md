# 📋 Résumé Tests API - 2026-05-15

**Status:** ❌ Tests bloqués par authentification

---

## 🎯 OBJECTIF

Comparer les APIs entre:
- **Ancien dashboard** (sojori-dashboard)
- **Nouveau dashboard** (Sojori-orchestrator)
- **Backend prod** (https://dev.sojori.com)

---

## ❌ PROBLÈME PRINCIPAL

### Erreur 404 sur Réservations

**Endpoint:** `GET /api/v1/reservations/reservations`

**User report:** 404 Not Found

**Investigation:** En réalité, l'erreur est **401 Unauthorized**, pas 404

**Test effectué:**
```bash
curl 'https://dev.sojori.com/api/v1/reservations/reservations?limit=1' \
  -H 'X-Dev-Token: eyJ...'

Response:
{
  "success": false,
  "error": "Session expired, please login again",
  "errorMsg": "no refreshToken send",
  "forceLogout": true
}
```

**Conclusion:** X-Dev-Token seul ne suffit PAS. Le backend requiert un JWT token valide.

---

## 🔑 AUTHENTIFICATION

### Ce qui est requis

**Headers nécessaires:**
```
Authorization: Bearer <jwt_token>     ← Obtenu via login
x-refresh-token: <refresh_token>      ← Obtenu via login
X-Dev-Token: <dev_token>              ← Pour CORS localhost→prod (optionnel)
```

### X-Dev-Token ≠ Authentication

**File:** `src/services/apiClient.ts:17-26`

```typescript
// 🔒 CORS Security: Add dev token for localhost → production
if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
  apiClient.defaults.headers.common['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
}
```

**Purpose:** Contourner CORS quand frontend local appelle backend prod

**NOT for:** Bypass d'authentification (le backend vérifie toujours JWT)

---

## 📊 RÉSULTATS

### APIs Réservations Implémentées

| Type | Old Dashboard | New Dashboard | Status |
|------|---------------|---------------|--------|
| **Lecture** | 11 APIs | 2 APIs | ❌ 18% |
| **Écriture** | 9 APIs | 0 APIs | ❌ 0% |
| **Analytics** | 11 APIs | 0 APIs | ❌ 0% |
| **TOTAL** | **31 APIs** | **2 APIs** | ❌ **6.5%** |

### APIs Implémentées

✅ `getList()` - Liste des réservations (avec filtre date)
✅ `getById()` - Détail d'une réservation

### APIs Manquantes (29)

❌ Search (by number, by phone)
❌ CRUD (create, update, delete, cancel)
❌ Guest actions (declare arrival/departure)
❌ Analytics (stats, revenue, channels)
❌ Planning & timeline
❌ Messages & communication

---

## 🐛 PROBLÈMES IDENTIFIÉS

### 1. Configuration Décentralisée

**Old:** Config centralisée dans `backendServer.config.js`
```javascript
export const MICROSERVICE_BASE_URL = {
  RESERVATION: `${baseUrl}/api/v1/reservations/reservations`,
  LISTING: `${baseUrl}/api/v1/listing/listings`,
  // ... 15+ services
};
```

**New:** Chaque service a son propre BASE_URL
```typescript
// reservationsService.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4007';

// listingsService.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4005';
```

**Problème:** Defaults incohérents, difficile à maintenir

**Recommandation:** Créer `src/config/apiConfig.ts` centralisé

### 2. Mapping de Données Incohérent

**Old:** Toutes les réponses passent par `mapReservationData()` (60+ champs)

**New:**
- Liste → données brutes du backend
- Détail → `mapReservationToDetail()` (30 champs, snake_case)

**Problème:** Frontend doit gérer 2 structures différentes

**Recommandation:** Appliquer mapping uniformément

### 3. APIs Manquantes

**Impact critique:**
- ❌ Pas de recherche par numéro/téléphone (opérations quotidiennes)
- ❌ Pas de CRUD (impossible de gérer réservations)
- ❌ Pas de stats (reporting management)

**Recommandation:** Implémenter les 29 APIs manquantes

---

## 📝 DOCUMENTATION CRÉÉE

### Fichiers Principaux

1. **`docs/AI-READ-API-PARITY.md`** ← **À LIRE EN PREMIER**
   - Carte complète des APIs (tous domaines)
   - Tableau de statut (SAME, PARTIAL, DASH_ONLY, etc.)
   - Écarts constatés (mis à jour avec findings)

2. **`docs/API_PARITY_TEST_RESULTS_2026-05-15.md`**
   - Rapport détaillé des tests effectués
   - Root cause analysis (404 vs 401)
   - Comparaison old vs new (config, mapping, APIs)
   - Action items prioritisés

3. **`docs/RESERVATIONS_404_INVESTIGATION.md`**
   - Investigation du 404 original
   - Hypothèses et tests
   - Script de diagnostic

4. **`docs/FIX_404_RESERVATIONS.md`**
   - Tentative de fix du path endpoint
   - Explication du path legacy `/reservations/reservations`

5. **`docs/API_COMPARISON_RESERVATIONS.md`**
   - Comparaison des 31 APIs réservations
   - Structure des requêtes/réponses
   - Exemples d'utilisation

### Scripts Créés

- **`/tmp/test-reservations-404-final.sh`** - Test automatisé avec 6 scénarios
- **`/tmp/debug-reservations-404.md`** - Guide de debug étape par étape

---

## 🚀 PROCHAINES ÉTAPES

### Urgent (débloquer tests)

1. **Obtenir JWT token valide:**
   ```bash
   # Option 1: Via API
   curl -X POST 'https://dev.sojori.com/api/v1/user/auth/login' \
     -H 'Content-Type: application/json' \
     -d '{"email":"user@sojori.com","password":"..."}'

   # Option 2: Copier depuis navigateur
   # DevTools > Application > Local Storage > 'token'
   ```

2. **Retester endpoint avec JWT:**
   ```bash
   export JWT_TOKEN="..."
   export REFRESH_TOKEN="..."

   curl 'https://dev.sojori.com/api/v1/reservations/reservations?limit=1' \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "x-refresh-token: $REFRESH_TOKEN"
   ```

3. **Vérifier que apiClient envoie bien le token:**
   - Inspecter Network tab
   - Vérifier headers Authorization présent

### Important (améliorer parité)

4. **Centraliser configuration:**
   - Créer `src/config/apiConfig.ts`
   - Migrer tous les services

5. **Standardiser mapping:**
   - Appliquer mapping à toutes les réponses
   - Utiliser noms de champs cohérents

6. **Implémenter APIs critiques:**
   - Search by number/phone (P0)
   - CRUD operations (P1)
   - Analytics (P2)

### Long terme

7. **Compléter les 29 APIs manquantes**
8. **Tests automatisés**
9. **Migration complète utilisateurs**

---

## 🔗 RÉFÉRENCES

### Code Source

**Old Dashboard:**
- Config: `sojori-dashboard/src/config/backendServer.config.js`
- APIs: `sojori-dashboard/src/features/reservation/services/serverApi.reservation.jsx`

**New Dashboard:**
- Config: `Sojori-orchestrator/.env`, `src/services/apiClient.ts`
- APIs: `Sojori-orchestrator/src/services/reservationsService.ts`

**Backend:**
- Routes: `sojori-production/apps/srv-reservations/src/routes/`
- Auth: `sojori-production/apps/srv-reservations/src/passportConfig/Middlewares/`

### Documentation Complète

Voir fichiers listés dans section "Documentation Créée" ci-dessus.

---

## ✅ CONCLUSION

**Tests bloqués** car backend requiert JWT token valide pour tous les endpoints protégés.

**X-Dev-Token** est pour CORS seulement, pas pour bypass d'auth.

**Parité actuelle:** 2/31 APIs réservations (6.5%)

**Action immédiate:** Obtenir JWT token via login pour continuer les tests.

**Estimation:** ~1 semaine pour implémenter les 29 APIs manquantes + standardiser config/mapping.

---

**Créé:** 2026-05-15
**Par:** Assistant AI
**Status:** ⏸️ Tests en pause - Attente JWT token
