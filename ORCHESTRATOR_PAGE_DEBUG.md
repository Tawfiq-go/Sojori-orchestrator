# 🐛 DEBUG: Page Orchestrator Vide

**Date:** 16 Mai 2026 01:40
**Problème:** Page `/orchestrator` charge mais ne montre aucune carte/plan

---

## ❌ Symptômes

Utilisateur rapporte:
> "la ca beug pas mais je ne vois pas les plans, click sur plan je vois les cartes etc ca disparu ou tout ca?"

- ✅ Page charge (pas d'erreur JavaScript fatale)
- ❌ Aucune carte de réservation visible
- ❌ Pas de liste des plans
- ❌ Click sur plan → rien ne se passe

---

## 🔍 Points de Vérification

### 1. API Endpoint
**Fichier:** `OrchestrationView.jsx:101-102`
```javascript
const url = `${API_URL}/api/v1/orchestrator/reservations?${params.toString()}`;
const response = await axios.get(url);
```

**URL complète attendue:**
```
https://dev.sojori.com/api/v1/orchestrator/reservations?limit=20&offset=0&sortBy=recent&reservationStatus=ACTIVE
```

**Vérification:**
1. Ouvrir la console navigateur (F12)
2. Aller à `/orchestrator`
3. Regarder l'onglet Network
4. Chercher la requête `reservations?limit=20...`
5. Vérifier:
   - ✅ Statut 200 OK
   - ✅ Response `{success: true, data: [...], pagination: {...}}`
   - ❌ Statut 401 Unauthorized → **Problème de token JWT**
   - ❌ Statut 404 Not Found → **API n'existe pas**
   - ❌ Response `{data: []}` → **Aucune réservation**

### 2. Token JWT
**Fichier:** `authUtils.ts` + `apiClient.ts`

**Vérifications:**
```javascript
// Dans console navigateur
localStorage.getItem('token')
document.cookie // Chercher 'sojori_token'
```

**Si pas de token:**
- Se reconnecter sur `/login`
- Token sera stocké dans cookie `sojori_token` ET `localStorage['token']`

**Header Authorization:**
Toutes les requêtes doivent avoir:
```
Authorization: Bearer eyJhbG...LDQQ
```

### 3. État du Composant
**Fichier:** `OrchestrationView.jsx:17-18`

Ajouter des console.log temporaires:
```javascript
useEffect(() => {
  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      console.log('[DEBUG] Fetching reservations...', { page, limit, selectedListings, reservationStatus });

      const params = new URLSearchParams({...});
      const url = `${API_URL}/api/v1/orchestrator/reservations?${params.toString()}`;
      console.log('[DEBUG] API URL:', url);

      const response = await axios.get(url);
      console.log('[DEBUG] API Response:', response.data);

      if (response.data.success) {
        setReservations(response.data.data);
        console.log('[DEBUG] Reservations set:', response.data.data.length);
        setTotalItems(response.data.pagination?.total || response.data.data.length);
      }
    } catch (error) {
      console.error('[DEBUG] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  fetchReservations();
}, [page, limit, selectedListings, reservationStatus, sortBy, listRefreshKey]);
```

### 4. Render Conditionnel
**Fichier:** `OrchestrationView.jsx` (partie render)

Vérifier si le composant affiche:
```jsx
{isLoading && <CircularProgress />}
{!isLoading && reservations.length === 0 && (
  <div>Aucune réservation trouvée</div>
)}
{!isLoading && reservations.length > 0 && (
  <div>
    {reservations.map(r => <ReservationCard key={r.reservationNumber} reservation={r} />)}
  </div>
)}
```

---

## 🔧 Solutions Possibles

### Solution 1: Pas de Token JWT
**Symptôme:** Requête retourne 401 Unauthorized

**Fix:**
```bash
# Se reconnecter
Ouvrir: http://localhost:4174/login
Email: gouachadmin@sojori.com
Mot de passe: [mot de passe admin]
```

Après login, vérifier:
```javascript
localStorage.getItem('token') // Doit exister
document.cookie // Contient sojori_token=...
```

### Solution 2: API N'existe Pas (404)
**Symptôme:** Requête retourne 404 Not Found

**Fix:**
Vérifier que le backend **srv-orchestrator** tourne et expose:
```
GET /api/v1/orchestrator/reservations
```

Endpoints attendus (voir OrchestrationView.jsx):
- `GET /api/v1/orchestrator/reservations` - Liste paginée
- `POST /api/v1/orchestrator/reservations/{reservationNumber}/plan-cron/run-once` - Tick cron
- `POST /api/v1/orchestrator/reservations/{reservationNumber}/recalculate` - Recalculer plan
- `POST /api/v1/orchestrator/reservations/{reservationNumber}/cancel-plan` - Annuler plan

### Solution 3: Aucune Donnée (Response Vide)
**Symptôme:** Requête 200 OK mais `response.data.data = []`

**Fix:**
1. Vérifier qu'il existe des réservations avec status `ACTIVE`:
   ```javascript
   // Dans MongoDB
   db.getCollection('workflowOrchestrationPlans').find({
     'orchestrationStatus': 'ACTIVE'
   }).limit(10)
   ```

2. Changer le filtre à ALL pour voir toutes les réservations:
   - Aller sur la page
   - Click sur le filtre "Status"
   - Décocher "ACTIVE"
   - Voir si des réservations apparaissent (COMPLETED, CANCELLED, etc.)

### Solution 4: Composant Ne Rend Rien
**Symptôme:** `reservations.length > 0` mais aucune carte visible

**Fix:**
Vérifier la partie render du composant - peut-être un problème CSS ou condition qui cache les cartes.

---

## 📋 Checklist Debug

Étapes à suivre:

1. [ ] Ouvrir console navigateur (F12)
2. [ ] Aller sur `http://localhost:4174/orchestrator`
3. [ ] Vérifier onglet Network → requête `reservations?...`
4. [ ] Noter le status code (200, 401, 404?)
5. [ ] Noter la response `{success, data, pagination}`
6. [ ] Vérifier `localStorage.getItem('token')` existe
7. [ ] Vérifier `document.cookie` contient `sojori_token`
8. [ ] Si 401: Se reconnecter sur `/login`
9. [ ] Si 200 mais data=[]: Changer filtre status à "ALL"
10. [ ] Si data=[...] mais rien visible: Vérifier console pour erreurs render

---

## 🎯 Résultat Attendu

Après fix, la page devrait afficher:

```
┌─────────────────────────────────────────────────┐
│  Filtres: [Recherche] [Listing] [Status] [Sort]│
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ SJ-  │ │ SJ-  │ │ SJ-  │ │ SJ-  │  ←Cartes│
│  │4OQHVT│ │5ABCDE│ │6FGHIJ│ │7KLMNO│          │
│  │⚡Act.│ │⚡Act.│ │✅Cmp.│ │⚡Act.│          │
│  └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                 │
│  [Pagination: 1-4 / 20] [< 1/5 >]             │
├─────────────────────────────────────────────────┤
│  Timeline (click sur carte pour afficher)       │
│  ┌───────────────────────────────────────────┐  │
│  │ Phase 1: Pre-Stay                        │  │
│  │ ✅ Send Welcome Email (2 days ago)       │  │
│  │ ⏳ Send Check-in Info (pending)          │  │
│  │ Phase 2: Arrival                         │  │
│  │ ⏳ Staff Assignment (pending)            │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

**Prochaine Étape:** Exécuter la checklist et rapporter les résultats.
