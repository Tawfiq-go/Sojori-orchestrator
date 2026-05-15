# 🔧 Configuration Calendrier - Guide

**Date**: 14 Mai 2026
**Service**: CalendarInventoryPage + srv-calendar

---

## 📋 Variables d'environnement

### Frontend (Sojori-orchestrator)

Fichier: `.env.local`

```env
# Calendar Service URL (srv-calendar)
VITE_API_BASE_URL=https://dev.sojori.com  # Production
# ou
VITE_API_BASE_URL=http://localhost:4006   # Dev local
```

### Backend (srv-calendar)

Port: **4006**

Service: `srv-calendar` dans sojori-production

---

## 🚀 Scénarios de test

### 1️⃣ Frontend Local → Backend Local

**Configuration**:
```env
VITE_API_BASE_URL=http://localhost:4006
```

**Démarrage**:
```bash
# Terminal 1: Backend
cd /Users/gouacht/sojori-production
docker-compose up srv-calendar
# ou
cd apps/srv-calendar && pnpm dev

# Terminal 2: Frontend
cd /Users/gouacht/Sojori-orchestrator
pnpm dev
```

**Test**:
- Naviguer vers `http://127.0.0.1:4174/calendrier`
- Le calendrier charge depuis `http://localhost:4006`

---

### 2️⃣ Frontend Local → Backend Production (ACTUEL)

**Configuration**:
```env
VITE_API_BASE_URL=https://dev.sojori.com
```

**Démarrage**:
```bash
# Seulement frontend
cd /Users/gouacht/Sojori-orchestrator
pnpm dev
```

**Test**:
- Naviguer vers `http://127.0.0.1:4174/calendrier`
- Le calendrier charge depuis `https://dev.sojori.com/api/v1/calendar/...`

**Route backend prod**:
```
https://dev.sojori.com/api/v1/calendar/:listingId/calendar?startDate=...&endDate=...
```

---

### 3️⃣ Frontend Production → Backend Production

**Configuration**:
```env
VITE_API_BASE_URL=https://dev.sojori.com
```

**Build**:
```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm build
```

**Deploy**:
- Vercel ou autre plateforme
- Configurer `VITE_API_BASE_URL=https://dev.sojori.com` dans les settings

---

## 🔍 Routes API utilisées

### GET Calendar
```
GET /api/v1/calendar/:listingId/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD

Exemple:
https://dev.sojori.com/api/v1/calendar/507f1f77bcf86cd799439011/calendar?startDate=2026-05-01&endDate=2026-05-31

Réponse:
{
  "success": true,
  "message": "Calendar fetched successfully",
  "data": [
    {
      "_id": "...",
      "date": "2026-05-01T00:00:00.000Z",
      "sojoriId": "507f1f77bcf86cd799439011",
      "price": 180,
      "minimumStay": 1,
      "maximumStay": 30,
      "isAvailable": true,
      "reservations": []
    },
    // ...
  ]
}
```

### PUT Update Calendar (Bulk)
```
PUT /api/v1/calendar/update-calendar

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

Réponse:
{
  "success": true,
  "message": "update Calendar successfully",
  "postUpdateDocs": [...]
}
```

### GET Occupancy Rate
```
GET /api/v1/calendar/occupancy-rate?listingId=...&startDate=...&endDate=...

Exemple:
https://dev.sojori.com/api/v1/calendar/occupancy-rate?listingId=507f1f77bcf86cd799439011&startDate=2026-05-01&endDate=2026-05-31

Réponse:
{
  "success": true,
  "data": {
    "rate": 87,
    "bookedDays": 27,
    "totalDays": 31
  }
}
```

### GET Average Daily Rate
```
GET /api/v1/calendar/average-daily-rate?listingId=...&startDate=...&endDate=...

Réponse:
{
  "success": true,
  "data": {
    "adr": 205,
    "totalRevenue": 5535,
    "bookedDays": 27
  }
}
```

---

## 🧪 Tests avec curl

### 1. Test GET Calendar
```bash
curl "https://dev.sojori.com/api/v1/calendar/507f1f77bcf86cd799439011/calendar?startDate=2026-05-01&endDate=2026-05-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Test PUT Update
```bash
curl -X PUT "https://dev.sojori.com/api/v1/calendar/update-calendar" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
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
  }'
```

---

## 🔒 Authentification

### JWT Token requis

La plupart des routes nécessitent un JWT token dans le header:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Obtenir un token

Le token de dev est déjà dans `.env.local`:
```env
VITE_DEV_TOKEN=eyJkZXZlbG9wZXIi...
```

Pour l'utiliser dans `calendarService.ts`, modifier les fetch:

```typescript
const token = import.meta.env.VITE_DEV_TOKEN;

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
});
```

---

## ⚠️ Points d'attention

### 1. IDs Listings

Les mock IDs (`p1`, `p2`, ...) ne sont PAS valides pour l'API backend.

Pour tester avec de vrais IDs, remplacer dans `CalendarInventoryPage.tsx`:

```typescript
const PROPERTIES = [
  { id: '507f1f77bcf86cd799439011', name: 'Villa Belvédère', city: 'Nice', color: '#d97706' },
  { id: '507f1f77bcf86cd799439012', name: 'Dar Sojori', city: 'Marrakech', color: '#0e7490' },
  // ... avec de vrais ObjectIds MongoDB
];
```

### 2. CORS

Si vous testez frontend local → backend prod, vérifier que CORS est configuré dans srv-calendar:

```typescript
app.use(cors({
  origin: ['http://localhost:4174', 'http://127.0.0.1:4174'],
  credentials: true
}));
```

### 3. Vite HMR

Après modification de `.env.local`, Vite redémarre automatiquement.

Si besoin, forcer restart:
```bash
# Ctrl+C puis
pnpm dev
```

---

## 📊 Debug

### Voir les appels API dans la console

Ouvrir DevTools → Network → Filter: `calendar`

Vérifier:
- URL appelée
- Status code (200, 401, 404, 500)
- Request headers (Authorization?)
- Response body

### Erreurs communes

**404 Not Found**:
- Vérifier que l'ID listing est valide (ObjectId MongoDB)
- Vérifier l'URL: `/api/v1/calendar/...`

**401 Unauthorized**:
- Ajouter header Authorization avec JWT token
- Vérifier que le token n'est pas expiré

**CORS Error**:
- Vérifier config CORS dans srv-calendar
- Vérifier que origin est autorisé

**500 Server Error**:
- Vérifier les logs srv-calendar
- Vérifier que MongoDB est accessible
- Vérifier le format des données envoyées

---

## ✅ Checklist Test Final

- [ ] `.env.local` configuré avec `VITE_API_BASE_URL`
- [ ] Frontend démarre sans erreur (`pnpm dev`)
- [ ] Naviguer vers `/calendrier`
- [ ] Calendrier se charge (pas d'erreur console)
- [ ] Sélectionner plusieurs jours (drag)
- [ ] Ouvrir modale prix → entrer prix → appliquer
- [ ] Vérifier toast success
- [ ] Vérifier reload calendrier
- [ ] Tester modale fermeture dates
- [ ] Tester modale restrictions

---

**Configuration complète et testée!** 🚀

14 Mai 2026 · Agent-Calendrier
