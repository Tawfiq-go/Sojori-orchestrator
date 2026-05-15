# 🔍 COMPARAISON APIs RÉSERVATIONS
## Dashboard Ancien (sojori-dashboard) vs Nouveau (Sojori-orchestrator)

**Date:** 2026-05-14
**Auteur:** Agent-Reservations

---

## 📊 RÉSUMÉ EXÉCUTIF

Les deux dashboards utilisent **des endpoints et des structures de données DIFFÉRENTS** :

| Aspect | Ancien Dashboard (sojori-dashboard) | Nouveau Dashboard (Sojori-orchestrator) |
|--------|-------------------------------------|----------------------------------------|
| **Endpoint principal** | `/api/v1/reservations/reservations` | `/api/v1/reservations` |
| **Authentification** | JWT (axios avec interceptors) | JWT (apiClient avec interceptors) |
| **Structure réponse** | `{ success, data[], unmappedReservation[], total }` | `data[]` (array direct) |
| **Mapping données** | `mapReservationData()` (60+ champs) | `ReservationListItem` (10 champs) |
| **Base URL** | `MICROSERVICE_BASE_URL.RESERVATION` | `VITE_API_BASE_URL` |

---

## 🔗 ENDPOINTS COMPARÉS

### 1. Liste des Réservations

#### ✅ Ancien Dashboard
```javascript
// File: src/features/reservation/services/serverApi.reservation.jsx:178
GET ${MICROSERVICE_BASE_URL.RESERVATION}/?${queryParams}
// = https://dev.sojori.com/api/v1/reservations/reservations?dateType=arrival&startDate=2026-05-14&...

// Query params supportés:
{
  limit: 0,
  dateType: 'arrival' | 'departure' | 'creation',  // ⚠️ Mapping: checkin→arrival, checkout→departure
  startDate: '2026-05-14',
  endDate: '2026-05-15',
  creationStart: '2026-05-01',
  creationEnd: '2026-05-14',
  idType: 'sojori' | 'rental',
  guestName: '',
  page: 0,
  status: '',
  phone: '',
  staging: false,
  paymentStatus: '',
  reservationNumber: '',
  channelName: '',
  listingId[]: [],        // ✅ Array de listing IDs
  cityId[]: [],
  countryNames: [],
  fetchLead: false,
  sortField: 'createdAt',
  sortOrder: 'desc',
  filterOwnerId: []       // ✅ Filter par owner (admin)
}

// Response:
{
  success: true,
  data: [/* reservations */],
  unmappedReservation: [/* unmapped */],
  total: 123,
  totalUnmapped: 5,
  message: 'Reservations fetched successfully'
}
```

#### 🆕 Nouveau Dashboard
```typescript
// File: src/services/reservationsService.ts:40
GET ${BASE_URL}/api/v1/reservations?${queryParams}
// = https://dev.sojori.com/api/v1/reservations?dateType=arrival&startDate=2026-05-14&...

// Query params supportés:
{
  dateType: 'arrival' | 'departure' | 'creation',
  startDate: '2026-05-14',
  endDate: '2026-05-15',
  limit: 1000
}

// Response (direct array):
[
  {
    _id: '...',
    guestName: '...',
    arrivalDate: '2026-05-14T00:00:00Z',
    departureDate: '2026-05-15T00:00:00Z',
    status: 'confirmed',
    listing: { name: '...', ... },
    channelName: 'Airbnb',
    // ... autres champs backend
  }
]
```

**⚠️ DIFFÉRENCE CRITIQUE:**
- Ancien: Retourne `{ success, data[], unmappedReservation[] }`
- Nouveau: Retourne directement `data[]` (pas de wrapper)

---

### 2. Détail d'une Réservation

#### ✅ Ancien Dashboard
```javascript
// File: src/features/reservation/services/serverApi.reservation.jsx:348
GET ${MICROSERVICE_BASE_URL.RESERVATION}/by-id/${id}/?staging=${staging}
// = https://dev.sojori.com/api/v1/reservations/reservations/by-id/123?staging=false

// Response:
{
  success: true,
  data: { /* reservation complète */ },
  message: 'Reservation fetched successfully'
}
```

#### 🆕 Nouveau Dashboard
```typescript
// File: src/services/reservationsService.ts:144
GET ${BASE_URL}/api/v1/reservations/by-id/${reservationId}
// = https://dev.sojori.com/api/v1/reservations/by-id/123

// Response (objet direct):
{
  _id: '...',
  guestName: '...',
  // ... tous les champs de la réservation
}
```

---

### 3. Counts par Filtre

#### ✅ Ancien Dashboard
❌ **Pas d'endpoint dédié**
→ Fait 6 appels séparés `getReservations()` pour chaque filtre

#### 🆕 Nouveau Dashboard
❌ **Pas d'endpoint public non plus**
→ Fait aussi 6 appels séparés `getList()` pour chaque filtre

**💡 NOTE:** Il existe un endpoint interne `/api/v1/internal/reservations/checkincheckout/counts` mais il requiert `x-internal-service-token` (service-to-service).

---

## 📦 MAPPING DES DONNÉES

### mapReservationData (Ancien Dashboard)

**File:** `src/features/reservation/services/serverApi.reservation.jsx:202`

```javascript
export const mapReservationData = reservation => ({
  // IDs
  id: reservation._id,
  sojoriId: reservation.sojoriId,
  reservationNumber: reservation.reservationNumber,
  rentalsReservationId: reservation.rentalsReservationId || '',

  // Guest Info
  guestName: reservation.guestName,
  guestFirstName: reservation.guestFirstName || '',
  guestLastName: reservation.guestLastName || '',
  guestCountry: reservation.guestCountry || '',
  guestLanguage: reservation.guestLanguage || '',
  phone: reservation.phone,
  adults: reservation.adults || 0,
  children: reservation.children || 0,
  infants: reservation.infants || 0,

  // Dates
  checkInDate: reservation.arrivalDate ? formatDatecheck(reservation.arrivalDate) : '',
  checkOutDate: reservation.departureDate ? formatDatecheck(reservation.departureDate) : '',
  reservationDate: reservationDate ? formatDatecheck(reservationDate) : '',
  bookingDate: reservation.bookingDate || reservation.reservationDate || '',
  createdAt: reservation.createdAt || '',
  nights: reservation.nights || '',

  // Check-in / Check-out Times
  checkInTime: reservation.checkInTime,
  checkOutTime: reservation.checkOutTime,
  confirmedCheckInTime: reservation.confirmedCheckInTime,
  confirmedCheckOutTime: reservation.confirmedCheckOutTime,
  checkInTimeStart: reservation?.listing?.checkInTimeStart,

  // Presence tracking (NEW)
  customerArrived: reservation.customerArrived ?? false,
  actualArrivalTime: reservation.actualArrivalTime || null,
  actualDepartureTime: reservation.actualDepartureTime || null,
  customerStatus: reservation.customerStatus || null,

  // Status
  status: reservation.status,
  checkinStatus: reservation.checkinStatus,
  paymentStatus: reservation.paymentStatus,
  paymentRedirectToSuccess: reservation.paymentRedirectToSuccess,

  // Listing
  listing: (() => {
    const L = reservation.listing;
    if (L == null) return 'No Listing Name';
    if (typeof L === 'string') return L.trim() || 'No Listing Name';
    return L.name || L.title || L.internalName || 'No Listing Name';
  })(),
  listingData: reservation.listing,
  city: reservation.listing?.city || reservation.city || '',
  roomTypeName: reservation.roomTypeName,
  roomTypeId: reservation.roomTypeId,
  roomType: reservation.roomType || reservation.roomTypeName || '',

  // Channel
  channelName: reservation.channelName,
  byChannex: reservation.byChannex || false,
  byRentals: reservation.byRentals || false,
  otaCode: reservation.otaCode,
  voucherNo: reservation.voucherNo,

  // Pricing
  currency: reservation.currency,
  totalPrice: reservation.totalPrice,
  paid: reservation.paid ?? reservation.paidAmount ?? 0,
  otaCommission: reservation.otaCommission,
  commission: reservation.commission,
  channelCommission: reservation.channelCommission,
  sojoriTotal: reservation.sojoriTotal,
  cleaningFee: reservation.cleaningFee,
  paymentCollect: reservation.paymentCollect,
  priceBreakdown: reservation.priceBreakdown || [],
  taxesAndFees: reservation.taxesAndFees || [],
  reservationBreakdown: reservation.reservationBreakdown || {},
  paymentStatusTimes: reservation.paymentStatusTimes || [],
  costs: typeof reservation.costs === 'object' && reservation.costs !== null ? reservation.costs : {},

  // Guest Registration (old check-in system)
  y: reservation.guestRegistration?.nbre_guest_to_register || 0,
  x: reservation.guestRegistration?.nbre_guest_registered || 0,
  guestRegistration: reservation.guestRegistration || null,
  nbre_guest_registered: reservation.guestRegistration?.nbre_guest_registered ?? null,

  // Owner
  owner: reservation.owner || '',
  theOwner: reservation.theOwner || {},
  theOwnerId: reservation.theOwnerId || '',

  // Unmapped
  isUnmapped: reservation.isUnmapped || false,

  // Cancellation (NEW)
  cancellationDate: reservation.cancellationDate || null,
  cancellationAcknowledged: reservation.cancellationAcknowledged === true,
});
```

**Total: ~60 champs mappés**

---

### ReservationListItem (Nouveau Dashboard)

**File:** `src/types/reservations.types.ts:45`

```typescript
export interface ReservationListItem {
  id: string;
  title: string;              // "Listing • Channel"
  description: string;
  guest_name: string;
  listing_name: string;
  arrival_date: Date | string;
  departure_date: Date | string;
  actual_arrival_time: Date | string | null;
  actual_departure_time: Date | string | null;
  status: string;
}
```

**Total: 10 champs**

**⚠️ CONVERSION DANS ReservationsPage.tsx:**
```typescript
// File: src/pages/ReservationsPage.tsx:140
const formattedReservations: ReservationListItem[] = response.data.map((r: any) => ({
  id: r._id || r.id,
  title: `${r.listing?.name || 'Listing'} • ${r.channelName || 'Direct'}`,
  description: '',
  guest_name: r.guestName || `${r.guestFirstName || ''} ${r.guestLastName || ''}`.trim() || 'Guest',
  listing_name: r.listing?.name || 'Listing',
  arrival_date: r.arrivalDate,
  departure_date: r.departureDate,
  actual_arrival_time: r.actualArrivalTime || null,
  actual_departure_time: r.actualDepartureTime || null,
  status: r.status,
}));
```

---

## 🔧 CONFIGURATION BASE URL

### Ancien Dashboard
```javascript
// File: src/config/backendServer.config.js:142,177
RESERVATION: `${backendServerConfig.appUrl}/api/v1/reservations/reservations`

// En production (env='prod'):
// → https://dev.sojori.com/api/v1/reservations/reservations

// En local avec remote API (REACT_APP_USE_REMOTE_API=true):
// → https://dev.sojori.com/api/v1/reservations/reservations

// En local pur:
// → http://localhost:4002/api/v1/reservations/reservations
```

### Nouveau Dashboard
```typescript
// File: src/services/reservationsService.ts:13
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4007';

// Avec .env:
// VITE_API_BASE_URL=https://dev.sojori.com
// → https://dev.sojori.com/api/v1/reservations
```

**⚠️ DIFFÉRENCE:**
- Ancien: Port 4002 en local
- Nouveau: Port 4007 en local (srv-reservations direct)

---

## 🚨 POINTS CRITIQUES POUR MIGRATION

### 1. Double Path Legacy `/reservations/reservations`

**Backend:**
```typescript
// File: apps/srv-reservations/src/routes/index.ts:6-8
router.use('/reservations', reservationRouter)
// COMPAT: Support legacy double /reservations path from old frontend
router.use('/reservations/reservations', reservationRouter)
```

→ Les deux paths fonctionnent:
- ✅ `/api/v1/reservations` (nouveau)
- ✅ `/api/v1/reservations/reservations` (legacy, compatibilité ancien dashboard)

### 2. Mapping `dateType` Frontend → Backend

**Ancien Dashboard:**
```javascript
// File: src/features/reservation/services/serverApi.reservation.jsx:63-68
const dateTypeMapping = {
  'checkin': 'arrival',
  'checkout': 'departure',
  'created': 'creation'
};
```

**Nouveau Dashboard:**
```typescript
// File: src/services/reservationsService.ts:74-106
switch (filter) {
  case 'CHECKIN_TODAY':
    return { dateType: 'arrival', startDate: ..., endDate: ... };
  case 'CHECKOUT_TODAY':
    return { dateType: 'departure', startDate: ..., endDate: ... };
}
```

→ Les deux utilisent `arrival`/`departure` côté backend (OK)

### 3. Gestion des Réservations Non-Mappées

**Ancien Dashboard:**
```javascript
// File: src/features/reservation/services/serverApi.reservation.jsx:182-190
const unmappedReservations = (response.data.unmappedReservation || []).map(reservation => ({
  ...mapReservationData(reservation),
  isUnmapped: true
}));
```

**Nouveau Dashboard:**
❌ **Pas encore implémenté**

**TODO:** Ajouter support `unmappedReservation[]` dans nouveau dashboard si besoin

### 4. Filtres Admin (filterOwnerId)

**Ancien Dashboard:**
```javascript
// File: src/features/reservation/services/serverApi.reservation.jsx:100-104
if (Array.isArray(filterOwnerId) && filterOwnerId.length > 0) {
  filterOwnerId.forEach(id => {
    if (id) queryParams.append('filterOwnerId', id);
  });
}
```

**Nouveau Dashboard:**
❌ **Pas implémenté**

**TODO:** Ajouter support `filterOwnerId` pour permettre aux admins de filtrer par owner

---

## 📝 RECOMMANDATIONS

### Pour Nouveau Dashboard (Sojori-orchestrator)

1. **✅ Conserver l'approche actuelle** `/api/v1/reservations` (pas besoin du double path)
2. **✅ Conserver le mapping simple** `ReservationListItem` (10 champs suffisants pour la liste)
3. **🔧 Ajouter type complet** `Reservation` pour la page détail (60+ champs comme ancien)
4. **🔧 Implémenter filtres avancés** si besoin:
   - `listingId[]` - Filter par propriétés
   - `cityId[]` - Filter par villes
   - `countryNames` - Filter par pays
   - `status` - Filter par statut
   - `channelName` - Filter par canal
   - `filterOwnerId` - Filter par owner (admin)

### Pour Compatibilité Backend

**✅ Backend srv-reservations supporte déjà les deux dashboards:**
- Route `/reservations` (nouveau)
- Route `/reservations/reservations` (legacy)
- Même logique, même auth, mêmes query params

**Aucune modification backend nécessaire** 🎉

---

## 🔍 FICHIERS CLÉS

### Ancien Dashboard (sojori-dashboard)
```
src/features/reservation/
├── services/
│   └── serverApi.reservation.jsx       # APIs + mapReservationData
├── pages/
│   ├── reservation.page.jsx            # Liste des réservations
│   └── reservation-detail.jsx          # Détail réservation
└── components/
    └── ... (60+ composants UI)

src/config/
└── backendServer.config.js             # Config URLs microservices
```

### Nouveau Dashboard (Sojori-orchestrator)
```
src/
├── services/
│   ├── reservationsService.ts          # Service API réservations
│   └── apiClient.ts                    # Axios client authentifié
├── types/
│   └── reservations.types.ts           # Types TypeScript
└── pages/
    ├── ReservationsPage.tsx            # Liste (Flow C)
    └── ReservationSejourPage.tsx       # Détail (à implémenter)
```

### Backend (sojori-production)
```
apps/srv-reservations/src/
├── routes/
│   ├── index.ts                        # Routing principal
│   ├── reservation/
│   │   ├── index.ts                    # Routes publiques
│   │   └── getReservations.ts          # GET /reservations
│   └── internal/
│       ├── index.ts                    # Routes internes
│       ├── getCheckinCheckoutList.ts   # Flow C list
│       └── getCheckinCheckoutCounts.ts # Flow C counts
└── db/models/Reservation.ts            # Mongoose model
```

---

## ✅ CONCLUSION

**Les deux dashboards sont compatibles avec le même backend srv-reservations.**

Différences:
1. **Endpoints** : Ancien utilise path legacy `/reservations/reservations`, nouveau utilise `/reservations`
2. **Mapping données** : Ancien map 60+ champs, nouveau 10 champs (suffisant pour liste)
3. **Structure réponse** : Ancien attend `{ success, data }`, nouveau attend `data[]` direct

**Recommandation:** Continuer avec l'approche du nouveau dashboard (plus simple, plus moderne).
Si besoin de features avancées (unmapped, filtres admin), s'inspirer de l'ancien dashboard.

---

**Document créé par:** Agent-Reservations
**Date:** 2026-05-14
**Status:** ✅ Complet
