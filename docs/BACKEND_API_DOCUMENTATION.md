# 📘 DOCUMENTATION API srv-reservations

**Service:** srv-reservations
**Port:** 4007
**Base URL (local):** `http://localhost:4007/api/v1`
**Base URL (production):** `https://dev.sojori.com/api/v1`

---

## 🔍 ROUTES PRINCIPALES IDENTIFIÉES

### 1️⃣ **LISTE DES RÉSERVATIONS** (Check-in / Check-out)

**Endpoint:** `GET /api/v1/internal/reservations/checkincheckout`

**Query params:**
- `filter`: `CHECKIN_TODAY` | `CHECKIN_TOMORROW` | `CHECKIN_7DAYS` | `CHECKOUT_TODAY` | `CHECKOUT_TOMORROW` | `CHECKOUT_7DAYS`
- `limit`: number (default 50)

**Response format:**
```json
{
  "success": true,
  "filter_label": "Check-in aujourd'hui",
  "reservations": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Villa Atlas Loft • Airbnb",
      "description": "John Doe • 📅15/05 14:00→20/05 11:00 • 👥2A+1E • 1200€",
      "guest_name": "John Doe",
      "listing_name": "Villa Atlas Loft",
      "arrival_date": "2026-05-15T14:00:00Z",
      "departure_date": "2026-05-20T11:00:00Z",
      "actual_arrival_time": null,
      "actual_departure_time": null,
      "status": "confirmed"
    }
  ],
  "reservation_count": 1
}
```

**Fichier backend:** `/apps/srv-reservations/src/routes/internal/getCheckinCheckoutList.ts`

---

### 2️⃣ **DÉTAIL D'UNE RÉSERVATION**

**Endpoint:** `GET /api/v1/internal/reservations/:id/detail`

**Path params:**
- `id`: ObjectId de la réservation

**Response format:**
```json
{
  "success": true,
  "reservation": {
    "id": "507f1f77bcf86cd799439011",
    "listing_name": "Villa Atlas Loft",
    "guest_name": "John Doe",
    "guest_email": "john.doe@example.com",
    "guest_phone": "+33612345678",
    "guest_phone_whatsapp": "33612345678",
    "guest_language": "fr",
    "guest_country": "FR",
    "ota": "Airbnb",
    "arrival_date": "15/05/2026 14:00",
    "departure_date": "20/05/2026 11:00",
    "arrival_date_raw": "2026-05-15T14:00:00Z",
    "departure_date_raw": "2026-05-20T11:00:00Z",
    "nights": 5,
    "guests": "2 adultes, 1 enfant",
    "adults": 2,
    "children": 1,
    "infants": 0,
    "check_in_time_chosen": "14:00",
    "check_out_time_chosen": "11:00",
    "actual_arrival_time": null,
    "actual_departure_time": null,
    "arrival_declared": "Pas déclaré",
    "departure_declared": "Pas déclaré",
    "total_price": "1200.00€",
    "already_paid": 600,
    "payment_status": "partial",
    "door_code": "1234",
    "status": "confirmed",
    "police_members": 0,
    "reservation_number": "RES-2026-001",
    "channel_name": "airbnb"
  }
}
```

**Fichier backend:** `/apps/srv-reservations/src/routes/internal/getReservationDetail.ts`

---

### 3️⃣ **COUNTS POUR FILTRES**

**Endpoint:** `GET /api/v1/internal/reservations/checkincheckout/counts`

**Response format:**
```json
{
  "success": true,
  "counts": {
    "CHECKIN_TODAY": 3,
    "CHECKIN_TOMORROW": 5,
    "CHECKIN_7DAYS": 12,
    "CHECKOUT_TODAY": 2,
    "CHECKOUT_TOMORROW": 4,
    "CHECKOUT_7DAYS": 9
  }
}
```

**Fichier backend:** `/apps/srv-reservations/src/routes/internal/getCheckinCheckoutCounts.ts`

---

## 📦 MODÈLE MONGOOSE (Reservation)

**Fichier:** `/apps/srv-reservations/src/db/models/Reservation.ts`

### Champs principaux du modèle:

```typescript
interface ReservationAttrs {
  // Identification
  channelId: string
  channelName: string
  channelReservationId: string
  channexId: string
  reservationNumber: string

  // Guest info
  guestName: string
  guestFirstName: string
  guestLastName: string
  guestAddress: string
  guestCity: string
  guestCountry: string
  nationality: string
  guestEmail: string
  guestLanguage?: string | null
  phone: string

  // Dates
  reservationDate: Date
  arrivalDate: Date
  departureDate: Date
  checkInTime: string | null
  checkOutTime: string | null
  nights: number

  // Guests
  numberOfGuests: number
  adults: number
  children: number | null
  infants: number | null
  pets: number | null

  // Pricing
  totalPrice: number
  alreadyPaid: number
  currency: string
  paymentMethod: string | null
  paymentType: string | null
  paymentStatus: string
  paymentLink: string

  // Status
  status: string  // confirmed, cancelled, pending, etc.
  cancellationDate: Date | null
  cancellationAcknowledged: boolean
  cancelledBy: string | null

  // Listing & Room
  sojoriId?: string | Types.ObjectId  // Listing ID
  roomTypeId?: string | Types.ObjectId
  doorCode: string

  // Registration
  guestsRegistrationStatus?: string | null
  guestRegistration?: {
    nbre_guest_to_register: number
    nbre_guest_registered: number
    nbre_guest_draft: number
    nbre_guest_complete: number
    registration_status: string
    members: IMember[]
  }

  // Messages & Communication
  messages_status: string
  messages: [any]

  // OTA Integration
  byChannex: boolean
  byRentals: boolean
  channexListingId: string | null
  channexRoomTypeId: string
  channexRatePlaneId: string
  otaCode: string
  voucherNo: string

  // Notes & Services
  notes: string
  services: any[]

  // Other
  atSojori: boolean | null
  staging: boolean
  midCleanTaskCount: number
  pdfUrl: string
  mailTemplates: [any]
}
```

---

## 🎯 ENDPOINTS SUPPLÉMENTAIRES IDENTIFIÉS

### Par numéro de réservation
`GET /api/v1/reservations/number/:reservationNumber`

### Par téléphone
`GET /api/v1/reservations/by-phone?phone=+33612345678`

### Par ID de listing (latest)
`GET /api/v1/reservations/by-listing/:listingId/latest`

### Réservation complète
`GET /api/v1/reservations/:id/complete`

### Par ID simple
`GET /api/v1/reservations/by-id/:id`

### Pour déclaration
`GET /api/v1/reservations/for-declaration`
`GET /api/v1/reservations/for-declaration/counts`

---

## 🔐 AUTHENTIFICATION

Les routes internes (`/api/v1/internal/*`) utilisent le header:
- `x-internal-service-token` pour l'authentification service-to-service

Les routes publiques (`/api/v1/*`) peuvent nécessiter un token JWT standard.

---

## 📝 NOTES IMPORTANTES

1. **Status values possibles:**
   - `confirmed` - Réservation confirmée
   - `cancelled` - Annulée
   - `CancelledByHost` - Annulée par l'hôte
   - `CancelledByCustomer` - Annulée par le client
   - `CancelledByAdmin` - Annulée par l'admin
   - `pending` - En attente

2. **Payment status values:**
   - `paid` - Payé en totalité
   - `partial` - Partiellement payé
   - `unpaid` - Non payé
   - `refunded` - Remboursé

3. **OTA channels:**
   - `airbnb` - Airbnb
   - `booking` - Booking.com
   - `direct` - Réservation directe
   - `expedia` - Expedia
   - `vrbo` - VRBO

4. **Date formats:**
   - Backend utilise ISO 8601: `2026-05-15T14:00:00Z`
   - Frontend display: `15/05/2026 14:00`

---

## ✅ VALIDATION

- ✅ Routes API identifiées et documentées
- ✅ Modèle Mongoose analysé (150+ champs)
- ✅ Formats de réponse documentés
- ✅ Authentification clarifiée

**Prêt pour ÉTAPE 2: Créer reservationsService.ts**
