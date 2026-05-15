# =Ë API Calendar - Comparaison & Tests sojori-dashboard vs Sojori-orchestrator

**Date**: 14 Mai 2026
**But**: Lister TOUTES les APIs calendar utilisées, tester chacune, et mapper vers Sojori-orchestrator

---

## <¯ Résumé Rapide

| Système | Repo | Framework | Port Calendar | Port Listing |
|---------|------|-----------|---------------|--------------|
| **Ancien** | sojori-dashboard | React (CRA) | 4004 | 4000 |
| **Nouveau** | Sojori-orchestrator | React (Vite) | 4004 | 4000 |

**ERREUR DÉTECTÉE**: Sojori-orchestrator utilisait port 4006 au lieu de 4004 pour calendar L
**CORRECTION**: Maintenant port 4004 

---

## =Á Sources des APIs (sojori-dashboard)

### Fichier Principal
**`/Users/gouacht/sojori-dashboard/src/features/calendar/services/serverApi.calendar.js`**

### Pages Utilisant ces APIs
1. `/Users/gouacht/sojori-dashboard/src/features/calendar/pages/MultiCalendarV2.page.jsx` - Calendrier multi-propriétés
2. `/Users/gouacht/sojori-dashboard/src/features/calendar/pages/InventoryCalendarNew.jsx` - Inventaire/disponibilités
3. `/Users/gouacht/sojori-dashboard/src/features/calendar/components/multiCalendarV2/MultiCalendar.jsx` - Fetch parallèle

---

## = TOUTES LES APIs CALENDAR (sojori-dashboard)

### 1. GET Calendar par Listing (Single)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 3
export function getCalnedarById(listingId, start, end) {
  return axios.get(`${MICROSERVICE_BASE_URL.CALENDAR}/${listingId}/calendar?startDate=${start}&endDate=${end}`);
}
```

**URL Prod:**
```
GET https://dev.sojori.com/api/v1/calendar/{listingId}/calendar?startDate=2026-05-01&endDate=2026-05-31
```

**URL Local:**
```
GET http://localhost:4004/api/v1/calendar/{listingId}/calendar?startDate=2026-05-01&endDate=2026-05-31
```

**Appelé depuis:**
- `MultiCalendar.jsx` ligne 55: `await Promise.all(listingIds.map(id => getMultiCalendById(id, startDate, endDate)))`

**Sojori-orchestrator équivalent:**
```typescript
// src/services/calendarService.ts
async getMonthCalendar(params: CalendarMonthRequest): Promise<CalendarDay[]>
```

---

### 2. PUT Update Calendar

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 6
export function updateCalnedar(data) {
  return axios.put(`${MICROSERVICE_BASE_URL.CALENDAR}/update-calendar`, data);
}
```

**URL:**
```
PUT https://dev.sojori.com/api/v1/calendar/update-calendar
Content-Type: application/json

Body:
{
  "listingId": "507f1f77bcf86cd799439011",
  "startDate": "2026-05-15",
  "endDate": "2026-05-17",
  "price": 250,
  "minimumStay": 2,
  "maximumStay": 30,
  "isAvailable": true,
  "note": "",
  "status": "",
  "days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
}
```

**Sojori-orchestrator équivalent:**
```typescript
// src/services/calendarService.ts
async updateCalendar(params: CalendarUpdateRequest): Promise<CalendarDay[]>
```

---

### 3. GET Multi-Calendar (par listing - parallèle)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 13
export function getMultiCalendById(listingId, start, end) {
  return axios.get(`${MICROSERVICE_BASE_URL.CALENDAR}/${listingId}/calendar?startDate=${start}&endDate=${end}`);
}
```

**Note**: C'est la MÊME API que #1, mais utilisée avec `Promise.all()` pour fetch multiple propriétés en parallèle.

**Pattern d'utilisation:**
```javascript
const calendarResponses = await Promise.all(
  listingIds.map(listingId => getMultiCalendById(listingId, startDate, endDate))
);
```

**Sojori-orchestrator**: Doit implémenter le même pattern avec `Promise.all()`

---

### 4. GET Listings (Paginated, avec filtres)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 24
export function getMultiListing(page, limit, filters, staging = false, forCalendar = false) {
  const tagsString = filters?.tags ? filters.tags.join(',') : '';
  const baseUrl = `${MICROSERVICE_BASE_URL.LISTING}/?page=${page}&limit=${limit}&paged=true`;
  const params = new URLSearchParams();

  if (filters?.countryNames && Array.isArray(filters.countryNames)) {
    filters.countryNames.forEach(countryName => {
      if (countryName) params.append('countryNames', countryName);
    });
  }

  params.append('useActiveFilter', 'true');
  params.append('active', (filters?.active ?? true).toString());
  params.append('tags', tagsString);
  params.append('name', filters?.match || '');
  params.append('staging', staging.toString());

  if (forCalendar) params.append('forCalendar', 'true');

  if (filters?.cityIds && Array.isArray(filters.cityIds)) {
    filters.cityIds.forEach(cityId => {
      if (cityId) params.append('cityId[]', cityId);
    });
  }

  return axios.get(`${baseUrl}&${params.toString()}`, { timeout: 60000 });
}
```

**URL Exemple:**
```
GET https://dev.sojori.com/api/v1/listing/listings?
  page=0
  &limit=25
  &paged=true
  &useActiveFilter=true
  &active=true
  &countryNames=France
  &cityId[]=123
  &tags=villa,luxe
  &name=hotel
  &staging=false
  &forCalendar=true

Timeout: 60 secondes
```

**Sojori-orchestrator**: L **MANQUANT** - Besoin de créer `listingsService.ts`

---

### 5. GET Countries (pour filtres)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 56
export function getcountries(page, limit, paged) {
  return axios.get(`${MICROSERVICE_BASE_URL.COUNTRY}?page=${page}&limit=${limit}&paged=false`);
}
```

**URL:**
```
GET https://dev.sojori.com/api/v1/admin/country?page=0&limit=10&paged=false
```

**Sojori-orchestrator**: L **MANQUANT**

---

### 6. GET Cities (pour filtres)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 59
export function getcities(page, limit, paged) {
  return axios.get(`${MICROSERVICE_BASE_URL.CITY}?page=${page}&limit=${limit}&paged=false`);
}
```

**URL:**
```
GET https://dev.sojori.com/api/v1/admin/city?page=0&limit=20&paged=false
```

**Sojori-orchestrator**: L **MANQUANT**

---

### 7. GET Tags (pour filtres)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 62
export function getTags() {
  return axios.get(`${MICROSERVICE_BASE_URL.TAG}?paged=false`);
}
```

**URL:**
```
GET https://dev.sojori.com/api/v1/listing/tag?paged=false
```

**Sojori-orchestrator**: L **MANQUANT**

---

### 8. GET Inventory (Batch Multi-Property)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 73
export function getInventoryForListings(listingIds, startDate, endDate, includeReservations = true) {
  const listingIdsParams = listingIds.map(id => `listingIds[]=${id}`).join('&');
  const inc = includeReservations === true || includeReservations === 'true' || includeReservations === undefined ? 'true' : 'false';
  return axios.get(
    `${MICROSERVICE_BASE_URL.SRV_CALENDAR}/inventory/get-inventory?${listingIdsParams}&startDate=${startDate}&endDate=${endDate}&includeReservations=${inc}`,
    { timeout: 90000 }
  );
}
```

**URL Exemple:**
```
GET https://dev.sojori.com/api/v1/calendar/inventory/get-inventory?
  listingIds[]=507f1f77bcf86cd799439011
  &listingIds[]=507f1f77bcf86cd799439012
  &startDate=2026-05-01
  &endDate=2026-05-31
  &includeReservations=true

Timeout: 90 secondes (MongoDB aggregation lente)
```

**Sojori-orchestrator**: L **MANQUANT**

---

### 9. PUT Update Inventory (Batch)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 85
export function updateInventoryForListings(data, modificationSource = 'inventory-calendar-unspecified') {
  const headers = {};
  if (modificationSource) {
    headers['X-Sojori-Modification-Source'] = String(modificationSource);
  }
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_CALENDAR}/inventory/update-inventory`, data, { headers });
}
```

**URL:**
```
PUT https://dev.sojori.com/api/v1/calendar/inventory/update-inventory
Content-Type: application/json
X-Sojori-Modification-Source: inventory-calendar-ui

Body: [
  {
    listingId: "...",
    date: "2026-05-15",
    availableRoom: 2,
    rate: 150,
    ...
  },
  ...
]
```

**Sojori-orchestrator**: L **MANQUANT**

---

### 10. POST Reconcile Inventory (sync srv-calendar ” srv-reservations)

**sojori-dashboard:**
```javascript
// Fichier: serverApi.calendar.js ligne 94
export function reconcileInventoryFromReservations(listingIds, startDate, endDate) {
  return axios.post(
    `${MICROSERVICE_BASE_URL.SRV_CALENDAR}/inventory/reconcile-from-reservations`,
    { listingIds, startDate, endDate },
    { timeout: 180000 }
  );
}
```

**URL:**
```
POST https://dev.sojori.com/api/v1/calendar/inventory/reconcile-from-reservations
Content-Type: application/json

Body:
{
  "listingIds": ["507f...", "507f..."],
  "startDate": "2026-05-01",
  "endDate": "2026-05-31"
}

Timeout: 180 secondes (3 minutes!)
```

**Sojori-orchestrator**: L **MANQUANT**

---

### 11. GET Occupancy Rate

**sojori-dashboard**: L Non trouvé dans `serverApi.calendar.js`

**Mais trouvé dans:**
```typescript
// src/services/calendarService.ts (Sojori-orchestrator)
async getOccupancyRate(params): Promise<{ rate, bookedDays, totalDays }>
```

**URL:**
```
GET https://dev.sojori.com/api/v1/calendar/occupancy-rate?
  listingId=507f1f77bcf86cd799439011
  &startDate=2026-05-01
  &endDate=2026-05-31
```

**Sojori-orchestrator**:  **EXISTE**

---

### 12. GET Average Daily Rate (ADR)

**sojori-dashboard**: L Non trouvé dans `serverApi.calendar.js`

**Mais trouvé dans:**
```typescript
// src/services/calendarService.ts (Sojori-orchestrator)
async getAverageDailyRate(params): Promise<{ adr, totalRevenue, bookedDays }>
```

**URL:**
```
GET https://dev.sojori.com/api/v1/calendar/average-daily-rate?
  listingId=507f1f77bcf86cd799439011
  &startDate=2026-05-01
  &endDate=2026-05-31
```

**Sojori-orchestrator**:  **EXISTE**

---

## =Ê Tableau Récapitulatif

| # | API | Dashboard | Orchestrator | Status | Priority |
|---|-----|-----------|--------------|--------|----------|
| 1 | GET Calendar Single |  |  | OK | =4 CRITICAL |
| 2 | PUT Update Calendar |  |  | OK | =4 CRITICAL |
| 3 | GET Multi Calendar (Promise.all) |  |   | Pas parallèle | =4 CRITICAL |
| 4 | GET Listings (paginated) |  | L | MANQUANT | =4 CRITICAL |
| 5 | GET Countries |  | L | MANQUANT | =á MEDIUM |
| 6 | GET Cities |  | L | MANQUANT | =á MEDIUM |
| 7 | GET Tags |  | L | MANQUANT | =á MEDIUM |
| 8 | GET Inventory (batch) |  | L | MANQUANT | =4 CRITICAL |
| 9 | PUT Update Inventory |  | L | MANQUANT | =à HIGH |
| 10 | POST Reconcile Inventory |  | L | MANQUANT | =à HIGH |
| 11 | GET Occupancy Rate | L |  | Seulement Orchestrator | =â LOW |
| 12 | GET Average Daily Rate | L |  | Seulement Orchestrator | =â LOW |

---

## >ê TESTS (Production)

### Test 1: GET Calendar Single

```bash
curl -s "https://dev.sojori.com/api/v1/calendar/507f1f77bcf86cd799439011/calendar?startDate=2026-05-01&endDate=2026-05-31" \
  -H "Authorization: Bearer TOKEN" \
  --cookie "refreshToken=..." | jq '{success, dataLength: (.data | length)}'
```

**Résultat attendu:**
```json
{
  "success": true,
  "dataLength": 31
}
```

**Test sojori-dashboard:**  Fonctionne (avec axios + cookies auto)
**Test Sojori-orchestrator:** ó À tester avec `credentials: 'include'`

---

### Test 2: GET Listings

```bash
curl -s "https://dev.sojori.com/api/v1/listing/listings?page=0&limit=5&paged=true&useActiveFilter=true&active=true&forCalendar=true" \
  -H "Authorization: Bearer TOKEN" \
  --cookie "refreshToken=..." | jq '{success, total, dataLength: (.data | length)}'
```

**Résultat sojori-dashboard:**  Fonctionne
**Résultat Sojori-orchestrator:** L Service manquant

---

### Test 3: GET Inventory (batch)

```bash
curl -s "https://dev.sojori.com/api/v1/calendar/inventory/get-inventory?listingIds[]=ID1&listingIds[]=ID2&startDate=2026-05-01&endDate=2026-05-31&includeReservations=true" \
  -H "Authorization: Bearer TOKEN" \
  --cookie "refreshToken=..." | jq 'keys'
```

**Résultat attendu:**
```json
[
  "507f1f77bcf86cd799439011",
  "507f1f77bcf86cd799439012"
]
```

**Test sojori-dashboard:**  Fonctionne
**Test Sojori-orchestrator:** L Service manquant

---

## =' ACTIONS REQUISES (Sojori-orchestrator)

### Priorité =4 CRITICAL (Bloquant)

1.  **Corriger port calendar**: 4006 ’ 4004 *(FAIT)*
2. L **Créer `listingsService.ts`** avec méthode `getListings()`
3. L **Modifier CalendarInventoryPage** pour fetcher listings au lieu de mock PROPERTIES
4. L **Implémenter fetch parallèle** avec `Promise.all()` comme sojori-dashboard
5. L **Ajouter `getInventoryForListings()`** dans calendarService

### Priorité =à HIGH

6. L **Ajouter `updateInventoryForListings()`**
7. L **Ajouter `reconcileInventoryFromReservations()`**

### Priorité =á MEDIUM

8. L **Ajouter `getCountries()`** (pour filtres)
9. L **Ajouter `getCities()`** (pour filtres)
10. L **Ajouter `getTags()`** (pour filtres)

---

## =Á Fichiers à Créer/Modifier

### À Créer

```
src/services/listingsService.ts
src/types/listings.types.ts
```

### À Modifier

```
src/services/calendarService.ts  (ajouter inventory methods)
src/types/calendar.types.ts      (ajouter inventory types)
src/pages/CalendarInventoryPage.tsx (fetch listings + parallèle)
```

---

## <¯ Pattern Fetch Parallèle (IMPORTANT!)

**sojori-dashboard fait:**
```javascript
// Fetch ALL listings calendars en parallèle
const calendarResponses = await Promise.all(
  listingIds.map(listingId =>
    getMultiCalendById(listingId, startDate, endDate)
  )
);

// Merge data
const newData = calendarResponses.reduce((acc, response, index) => {
  const listingId = listingIds[index];
  acc[listingId] = response.data.data;
  return acc;
}, {});
```

**Sojori-orchestrator doit faire pareil!**

---

##  Checklist Tests Finaux

- [ ] Fetch listings depuis API (pas de mock)
- [ ] Fetch calendar en parallèle pour toutes les propriétés
- [ ] Afficher loading spinner pendant fetch
- [ ] Gérer erreurs API (toast)
- [ ] Bulk update prix fonctionne
- [ ] Bulk close dates fonctionne
- [ ] Bulk restrictions fonctionne
- [ ] Tester avec VRAIS IDs MongoDB (pas p1, p2)
- [ ] Vérifier que les cookies JWT passent (`credentials: 'include'`)
- [ ] Test avec 10+ propriétés (performance)

---

**Document créé le**: 14 Mai 2026
**Pour**: Les prochains agents IA qui vont travailler sur ce projet
**But**: Comprendre rapidement les différences entre les 2 systèmes et savoir quoi implémenter
