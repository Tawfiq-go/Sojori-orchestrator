# 🧪 GUIDE DE TEST - Comparaison APIs Réservations
## Ancien Dashboard (sojori-dashboard) vs Nouveau Dashboard (Sojori-orchestrator)

**Date:** 2026-05-15
**Auteur:** Agent-Reservations
**Objectif:** Lister TOUTES les APIs utilisées, mapper vers équivalents, et fournir tests pour validation

---

## 📋 TABLE DES MATIÈRES

1. [APIs Réservations - Liste Complète](#1-apis-réservations---liste-complète)
2. [APIs Auxiliaires (Listings, Cities, etc.)](#2-apis-auxiliaires)
3. [Status Implémentation Nouveau Dashboard](#3-status-implémentation)
4. [Scripts de Test cURL](#4-scripts-de-test-curl)
5. [Checklist Migration](#5-checklist-migration)

---

## 1. APIs RÉSERVATIONS - Liste Complète

### 📦 Fichier Source
**Ancien Dashboard:** `/Users/gouacht/sojori-dashboard/src/features/reservation/services/serverApi.reservation.jsx`

| # | Fonction | Endpoint Ancien | Endpoint Nouveau | Status | Page Utilisateur |
|---|----------|----------------|------------------|--------|------------------|
| 1 | `getReservations()` | `GET /api/v1/reservations/reservations?...` | `GET /api/v1/reservations?...` | ✅ Implémenté | `reservation.page.jsx` (liste) |
| 2 | `getReservationsById()` | `GET /api/v1/reservations/reservations/by-id/:id` | `GET /api/v1/reservations/by-id/:id` | ✅ Implémenté | `reservation-detail.jsx` |
| 3 | `getReservationByNumber()` | `GET /api/v1/reservations/reservations/by-reservation-number/:num` | ❌ Pas implémenté | 🔴 Manquant | `reservation-detail.jsx` (URL propre) |
| 4 | `getLeadById()` | `GET /api/v1/reservations/reservations/lead-by-id/:id` | ❌ Pas implémenté | 🔴 Manquant | `LeadDetails.jsx` |
| 5 | `getLeads()` | `GET /api/v1/reservations/reservations/get-lead?...` | ❌ Pas implémenté | 🔴 Manquant | `leadReservation.page.jsx` |
| 6 | `createReservation()` | `POST /api/v1/reservations/reservations/create` | ❌ Pas implémenté | 🔴 Manquant | `reservationCreate.jsx` |
| 7 | `updateReservation()` | `PUT /api/v1/reservations/reservations/update/:id` | ❌ Commenté | 🔴 Manquant | `reservation-detail.jsx` |
| 8 | `updateReservationFields()` | `PUT /api/v1/reservations/reservations/update-fields/:id` | ❌ Pas implémenté | 🔴 Manquant | `reservation-detail.jsx` |
| 9 | `cancelReservation()` | `PUT /api/v1/reservations/reservations/cancel/:id` | ❌ Pas implémenté | 🔴 Manquant | `reservation-detail.jsx` |
| 10 | `revertCancellation()` | `PUT /api/v1/reservations/reservations/revert-cancellation/:id` | ❌ Pas implémenté | 🔴 Manquant | `reservation-detail.jsx` |
| 11 | `republishCancellation()` | `POST /api/v1/reservations/reservations/republish-cancellations` | ❌ Pas implémenté | 🔴 Manquant | `reservation.page.jsx` |
| 12 | `resolveUnmappedReservation()` | `GET /api/v1/reservations/reservations/resolve-unmaped-reservation/:id` | ❌ Pas implémenté | 🔴 Manquant | `reservation.page.jsx` (dialog) |
| 13 | `updateGuestRegistration()` | `PUT /api/v1/reservations/reservations/update/:id` | ❌ Pas implémenté | 🔴 Manquant | `ChekinDetails.component.jsx` |
| 14 | `deleteGuest()` | `DELETE /api/v1/reservations/reservations/guest/:id/:index` | ❌ Pas implémenté | 🔴 Manquant | `ChekinDetails.component.jsx` |
| 15 | `updateCheckInOutStatus()` | `POST /api/v1/reservations/reservations/:id/declare-arrival` ou `/declare-departure` | ❌ Pas implémenté | 🔴 Manquant | `CheckInOutStatusModal.jsx` |
| 16 | `acceptOrRejectReservation()` | `POST /api/v1/reservations/reservations/accept-or-reject-request` | ❌ Pas implémenté | 🔴 Manquant | `LeadDetails.jsx` |
| 17 | `fetchReservationsPlanning()` | `GET /api/v1/reservations/reservations/planning?...` | ❌ Pas implémenté | 🔴 Manquant | `reservation.page.jsx` (calendar view) |
| 18 | `getCalendarCounts()` | `GET /api/v1/reservations/reservations/get-calendar-counts?...` | ❌ Pas implémenté | 🔴 Manquant | Calendar components |
| 19 | `syncReservationsPreview()` | `POST /api/v1/reservations/reservations/sync/preview` | ❌ Pas implémenté | 🔴 Manquant | `SyncReservationsModal.jsx` |
| 20 | `syncReservationsApply()` | `POST /api/v1/reservations/reservations/sync/apply` | ❌ Pas implémenté | 🔴 Manquant | `SyncReservationsModal.jsx` |

### 📨 APIs Messages (Thread OTA)

| # | Fonction | Endpoint Ancien | Status | Page Utilisateur |
|---|----------|----------------|--------|------------------|
| 21 | `sendMessage()` | `POST /api/v1/reservations/reservations/send-message` | 🔴 Manquant | `reservation-detail.jsx` |
| 22 | `getChatHistory()` | `GET /api/v1/reservations/reservations/get-messages?...` | 🔴 Manquant | Messages components |
| 23 | `getChatHistoryByReservation()` | `GET /api/v1/reservations/reservations/get-messages?...` | 🔴 Manquant | `reservation-detail.jsx` |
| 24 | `getChatHis()` | `GET /api/v1/reservations/reservations/get-messages?...` | 🔴 Manquant | Messages components |
| 25 | `pushMessage()` | `POST /api/v1/reservations/reservations/send-message` | 🔴 Manquant | Messages components |

---

## 2. APIs AUXILIAIRES

### 🏠 Listings

| # | Fonction | Endpoint | Status Nouveau | Utilisé Dans |
|---|----------|----------|----------------|--------------|
| 26 | `getListings()` | `GET /api/v1/listing/listings?staging=false&compact=true` | ❓ À vérifier | Filtres, Formulaires |

### 📅 Calendar

| # | Fonction | Endpoint | Status Nouveau | Utilisé Dans |
|---|----------|----------|----------------|--------------|
| 27 | `getCalendarDetails()` | `GET /api/v1/calendar/calendar/:sojoriId?startDate=...&endDate=...` | 🔴 Manquant | Calendar components |
| 28 | `checkRoomAvailabilityAndPrice()` | `POST /api/v1/calendar/availability-pricing-check` | 🔴 Manquant | `reservationCreate.jsx` |

### 🌍 Countries & Cities

| # | Fonction | Endpoint | Status Nouveau | Utilisé Dans |
|---|----------|----------|----------------|--------------|
| 29 | `getCountries()` | `GET /api/v1/admin/country` | 🔴 Manquant | Filtres, Formulaires |
| 30 | `getCities()` | `GET /api/v1/admin/city` | 🔴 Manquant | Filtres, Formulaires |
| 31 | `getLanguages()` | `GET /api/v1/admin/language` | 🔴 Manquant | Formulaires |

---

## 3. STATUS IMPLÉMENTATION NOUVEAU DASHBOARD

### ✅ IMPLÉMENTÉ (2/31)

```typescript
// File: /Users/gouacht/Sojori-orchestrator/src/services/reservationsService.ts

✅ getList()       → GET /api/v1/reservations
✅ getById()       → GET /api/v1/reservations/by-id/:id
```

### 🔴 MANQUANT (29/31)

**Priorité HAUTE (Core Features):**
1. `getReservationByNumber()` - URLs propres (SJ-W1QS3UKJ au lieu d'ObjectId)
2. `createReservation()` - Création manuelle réservations
3. `updateReservation()` - Modification réservations
4. `cancelReservation()` - Annulation
5. `updateCheckInOutStatus()` - Déclaration arrivée/départ

**Priorité MOYENNE:**
6. `getLeads()` / `getLeadById()` - Demandes de réservation
7. `acceptOrRejectReservation()` - Accept/reject leads
8. `sendMessage()` - Messagerie OTA
9. `updateReservationFields()` - Édition partielle
10. `fetchReservationsPlanning()` - Vue planning

**Priorité BASSE:**
11. `syncReservationsPreview()` / `syncReservationsApply()` - Sync RU
12. `getCalendarDetails()` - Intégration calendrier
13. Autres (guest registration, unmapped, etc.)

---

## 4. SCRIPTS DE TEST cURL

### 🧪 Test 1: Liste Réservations (Check-in Aujourd'hui)

#### Ancien Dashboard
```bash
curl -X GET \
  'https://dev.sojori.com/api/v1/reservations/reservations?dateType=arrival&startDate=2026-05-15&endDate=2026-05-16&limit=100' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'

# Expected response:
# {
#   "success": true,
#   "data": [ ... ],
#   "unmappedReservation": [ ... ],
#   "total": 5,
#   "totalUnmapped": 0
# }
```

#### Nouveau Dashboard (Sojori-orchestrator)
```bash
curl -X GET \
  'https://dev.sojori.com/api/v1/reservations?dateType=arrival&startDate=2026-05-15&endDate=2026-05-16&limit=100' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'

# Expected response (array direct):
# [
#   {
#     "_id": "...",
#     "guestName": "John Doe",
#     "arrivalDate": "2026-05-15T14:00:00Z",
#     "departureDate": "2026-05-17T11:00:00Z",
#     "status": "confirmed",
#     "listing": { "name": "Appartement Paris", ... },
#     "channelName": "Airbnb",
#     ...
#   }
# ]
```

### 🧪 Test 2: Détail Réservation par ID

#### Les Deux Dashboards (même endpoint)
```bash
curl -X GET \
  'https://dev.sojori.com/api/v1/reservations/by-id/663a1b2c3d4e5f6a7b8c9d0e' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'

# Expected response (objet réservation complet):
# {
#   "_id": "663a1b2c3d4e5f6a7b8c9d0e",
#   "reservationNumber": "SJ-W1QS3UKJ",
#   "guestName": "John Doe",
#   "guestFirstName": "John",
#   "guestLastName": "Doe",
#   "guestCountry": "France",
#   "phone": "+33612345678",
#   "arrivalDate": "2026-05-15T14:00:00Z",
#   "departureDate": "2026-05-17T11:00:00Z",
#   "nights": 2,
#   "adults": 2,
#   "children": 1,
#   "totalPrice": 250.00,
#   "currency": "EUR",
#   "status": "confirmed",
#   "paymentStatus": "paid",
#   "channelName": "Airbnb",
#   "listing": {
#     "_id": "...",
#     "name": "Appartement Paris",
#     "city": "Paris",
#     "checkInTimeStart": 1400,
#     "checkOutTime": 1100
#   },
#   "actualArrivalTime": null,
#   "actualDepartureTime": null,
#   "customerArrived": false,
#   ...
# }
```

### 🧪 Test 3: Réservation par Numéro (URL Propre)

#### Ancien Dashboard SEULEMENT (pas encore implémenté dans nouveau)
```bash
curl -X GET \
  'https://dev.sojori.com/api/v1/reservations/by-reservation-number/SJ-W1QS3UKJ' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'

# Expected: Même réponse que Test 2
```

### 🧪 Test 4: Déclaration Arrivée (Check-in)

#### Ancien Dashboard SEULEMENT
```bash
curl -X POST \
  'https://dev.sojori.com/api/v1/reservations/663a1b2c3d4e5f6a7b8c9d0e/declare-arrival' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "actualArrivalTime": "2026-05-15T14:30:00Z",
    "customerStatus": "arrived"
  }'

# Expected:
# {
#   "success": true,
#   "message": "Arrival declared successfully",
#   "data": { ... }
# }
```

### 🧪 Test 5: Création Réservation

#### Ancien Dashboard SEULEMENT
```bash
curl -X POST \
  'https://dev.sojori.com/api/v1/reservations/create' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "sojoriId": "663a1b2c3d4e5f6a7b8c9d0f",
    "guestName": "Jane Smith",
    "guestFirstName": "Jane",
    "guestLastName": "Smith",
    "guestCountry": "USA",
    "phone": "+1234567890",
    "arrivalDate": "2026-06-01",
    "departureDate": "2026-06-05",
    "adults": 2,
    "children": 0,
    "totalPrice": 400.00,
    "currency": "EUR",
    "channelName": "Direct",
    "status": "confirmed"
  }'

# Expected:
# {
#   "success": true,
#   "message": "Reservation created successfully",
#   "data": { "_id": "...", "reservationNumber": "SJ-...", ... }
# }
```

---

## 5. CHECKLIST MIGRATION

### Phase 1: Core Features (Priorité HAUTE)

```markdown
- [x] GET /api/v1/reservations (liste)
- [x] GET /api/v1/reservations/by-id/:id (détail)
- [ ] GET /api/v1/reservations/by-reservation-number/:num
- [ ] POST /api/v1/reservations/create
- [ ] PUT /api/v1/reservations/update/:id
- [ ] PUT /api/v1/reservations/cancel/:id
- [ ] POST /api/v1/reservations/:id/declare-arrival
- [ ] POST /api/v1/reservations/:id/declare-departure
```

### Phase 2: Extended Features (Priorité MOYENNE)

```markdown
- [ ] GET /api/v1/reservations/get-lead (leads)
- [ ] GET /api/v1/reservations/lead-by-id/:id
- [ ] POST /api/v1/reservations/accept-or-reject-request
- [ ] POST /api/v1/reservations/send-message (messagerie OTA)
- [ ] GET /api/v1/reservations/get-messages (historique chat)
- [ ] PUT /api/v1/reservations/update-fields/:id
- [ ] GET /api/v1/reservations/planning (vue calendrier)
```

### Phase 3: Advanced Features (Priorité BASSE)

```markdown
- [ ] POST /api/v1/reservations/sync/preview (RU sync)
- [ ] POST /api/v1/reservations/sync/apply
- [ ] GET /api/v1/reservations/resolve-unmaped-reservation/:id
- [ ] PUT /api/v1/reservations/revert-cancellation/:id
- [ ] POST /api/v1/reservations/republish-cancellations
- [ ] DELETE /api/v1/reservations/guest/:id/:index
- [ ] GET /api/v1/reservations/get-calendar-counts
- [ ] POST /api/v1/calendar/availability-pricing-check
```

### Auxiliaires (À Implémenter)

```markdown
- [ ] GET /api/v1/listing/listings (service séparé)
- [ ] GET /api/v1/calendar/calendar/:id (service séparé)
- [ ] GET /api/v1/admin/country (service séparé)
- [ ] GET /api/v1/admin/city (service séparé)
- [ ] GET /api/v1/admin/language (service séparé)
```

---

## 6. SCRIPT DE TEST AUTOMATIQUE

### Bash Script pour Tester les Deux Dashboards

Créer: `/Users/gouacht/Sojori-orchestrator/scripts/test-apis-comparison.sh`

```bash
#!/bin/bash

# Configuration
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"
BASE_URL="https://dev.sojori.com"
TODAY=$(date +%Y-%m-%d)
TOMORROW=$(date -v+1d +%Y-%m-%d)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Test Comparaison APIs - Ancien vs Nouveau Dashboard"
echo "========================================================"
echo ""

# Test 1: Liste réservations (ancien endpoint)
echo "📋 Test 1: Liste Réservations (Ancien Endpoint)"
echo "Endpoint: /api/v1/reservations/reservations"
response_old=$(curl -s -X GET \
  "${BASE_URL}/api/v1/reservations/reservations?dateType=arrival&startDate=${TODAY}&endDate=${TOMORROW}&limit=10" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$response_old" | jq -e '.success' > /dev/null 2>&1; then
  count=$(echo "$response_old" | jq '.data | length')
  echo -e "${GREEN}✅ ANCIEN: Succès - ${count} réservations${NC}"
else
  echo -e "${RED}❌ ANCIEN: Échec${NC}"
fi
echo ""

# Test 2: Liste réservations (nouveau endpoint)
echo "📋 Test 2: Liste Réservations (Nouveau Endpoint)"
echo "Endpoint: /api/v1/reservations"
response_new=$(curl -s -X GET \
  "${BASE_URL}/api/v1/reservations?dateType=arrival&startDate=${TODAY}&endDate=${TOMORROW}&limit=10" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$response_new" | jq -e 'type == "array"' > /dev/null 2>&1; then
  count=$(echo "$response_new" | jq 'length')
  echo -e "${GREEN}✅ NOUVEAU: Succès - ${count} réservations${NC}"
else
  echo -e "${RED}❌ NOUVEAU: Échec${NC}"
fi
echo ""

# Test 3: Détail réservation
echo "📋 Test 3: Détail Réservation (by-id)"
# Extract first reservation ID from list
RESERVATION_ID=$(echo "$response_new" | jq -r '.[0]._id // empty')

if [ -n "$RESERVATION_ID" ]; then
  echo "ID testé: ${RESERVATION_ID}"
  response_detail=$(curl -s -X GET \
    "${BASE_URL}/api/v1/reservations/by-id/${RESERVATION_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json")

  if echo "$response_detail" | jq -e '._id' > /dev/null 2>&1; then
    guest=$(echo "$response_detail" | jq -r '.guestName')
    echo -e "${GREEN}✅ Détail: Succès - Guest: ${guest}${NC}"
  else
    echo -e "${RED}❌ Détail: Échec${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Aucune réservation trouvée pour tester${NC}"
fi
echo ""

# Test 4: Endpoint by-reservation-number (ancien seulement)
echo "📋 Test 4: Détail par Numéro (by-reservation-number)"
RESERVATION_NUM=$(echo "$response_new" | jq -r '.[0].reservationNumber // empty')

if [ -n "$RESERVATION_NUM" ]; then
  echo "Numéro testé: ${RESERVATION_NUM}"
  response_by_num=$(curl -s -X GET \
    "${BASE_URL}/api/v1/reservations/by-reservation-number/${RESERVATION_NUM}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json")

  if echo "$response_by_num" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ANCIEN: by-reservation-number disponible${NC}"
  else
    echo -e "${RED}❌ ANCIEN: by-reservation-number non disponible${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Aucun numéro de réservation trouvé${NC}"
fi
echo ""

echo "========================================================"
echo "✅ Tests terminés"
```

### Utilisation:
```bash
chmod +x scripts/test-apis-comparison.sh
./scripts/test-apis-comparison.sh
```

---

## 7. RÉSUMÉ POUR AI AGENTS

### 🤖 Pour les Agents AI Futurs

**Context rapide:**
- **2 dashboards**: sojori-dashboard (ancien) + Sojori-orchestrator (nouveau)
- **31 APIs** identifiées dans ancien dashboard
- **2/31 implémentées** dans nouveau dashboard (getList, getById)
- **29/31 à implémenter** selon priorités (voir checklist)

**Fichiers clés:**
- Ancien: `/Users/gouacht/sojori-dashboard/src/features/reservation/services/serverApi.reservation.jsx`
- Nouveau: `/Users/gouacht/Sojori-orchestrator/src/services/reservationsService.ts`
- Backend: `/Users/gouacht/sojori-production/apps/srv-reservations/src/routes/`

**Tests:**
- Script bash: `scripts/test-apis-comparison.sh`
- Tests manuels: Voir section 4 (cURL commands)

**Next steps:**
1. Implémenter APIs priorité HAUTE (création, update, cancel)
2. Tester chaque API avant/après implémentation
3. Maintenir ce document à jour avec status

---

**Document créé par:** Agent-Reservations
**Date:** 2026-05-15
**Status:** ✅ Complet - Prêt pour tests
