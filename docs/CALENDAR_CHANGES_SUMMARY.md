# 📝 Calendar - Résumé des Changements

**Date**: 15 Mai 2026 - 11:00
**Status**: ✅ Phase 1 Terminée - Fetch Listings Réels

---

## ✅ Changements Appliqués

### 1. Services Backend

#### `src/services/listingsService.ts`
**Méthodes ajoutées:**
```typescript
async getListingsForCalendar(
  page: number = 0,
  limit: number = 25,
  filters?: ListingFilters
): Promise<{ success: boolean; data: Listing[]; total: number }>

async getCountries(): Promise<{ _id: string; name: string }[]>
async getCities(): Promise<{ _id: string; name: string; countryId?: string }[]>
async getTags(): Promise<{ _id: string; name: string }[]>
```

**Configuration**:
- URL: `${VITE_API_URL}/api/v1/listing/listings`
- Paramètres: `forCalendar=true` pour payload léger
- Timeout: 60 secondes
- Cookies: `credentials: 'include'`

#### `src/services/calendarService.ts`
**Corrections:**
- ✅ BASE_URL corrigé: `VITE_API_URL` (était `VITE_API_BASE_URL`)
- ✅ Ajouté `credentials: 'include'` sur TOUS les fetch
- ✅ Commentaire port 4004 (pas 4006)

**Méthode ajoutée:**
```typescript
async getInventoryForListings(
  listingIds: string[],
  startDate: string,
  endDate: string,
  includeReservations: boolean = true
): Promise<Record<string, any[]>>
```

---

### 2. Types TypeScript

#### `src/types/listings.types.ts`
**Ajouts:**
```typescript
export interface Listing {
  _id: string;
  name: string;
  propertyUnit: string;
  active: boolean;
  calendarData?: CalendarDayData[];
}

export interface CalendarDayData {
  _id?: string;
  date: string | Date;
  price: number;
  minimumStay: number;
  maximumStay: number;
  isAvailable: boolean;
  status?: string;
  note?: string;
  reservations: CalendarReservation[];
}

export interface CalendarReservation {
  id: string;
  reservationId: string;
  arrivalDate: string;
  departureDate: string;
  guestName?: string;
  totalPrice?: number;
  status?: string;
  source?: 'airbnb' | 'booking' | 'direct' | string;
}

export interface ListingsResponse {
  success: boolean;
  data: Listing[];
  total: number;
}

export interface ListingFilters {
  countryNames?: string[];
  cityIds?: string[];
  tags?: string | string[];
  active?: boolean;
  name?: string;
}
```

---

### 3. CalendarInventoryPage.tsx

#### ❌ Supprimé
```typescript
// Mock data
const PROPERTIES = [
  { id: 'p1', name: 'Villa Belvédère', city: 'Nice', color: '#d97706' },
  { id: 'p2', name: 'Dar Sojori', city: 'Marrakech', color: '#0e7490' },
  // ...
];
```

#### ✅ Ajouté

**State Management:**
```typescript
const [properties, setProperties] = useState<Listing[]>([]);
const [page, setPage] = useState(0);
const [limit, setLimit] = useState(25);
const [total, setTotal] = useState(0);
const [loadingListings, setLoadingListings] = useState(true);
```

**Fetch Listings:**
```typescript
useEffect(() => {
  const fetchListings = async () => {
    try {
      setLoadingListings(true);
      const response = await listingsService.getListingsForCalendar(page, limit, {
        active: true,
      });

      if (response.success && response.data.length > 0) {
        setProperties(response.data);
        setTotal(response.total);

        // Auto-select first property
        if (!propertyId && response.data[0]) {
          setPropertyId(response.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Impossible de charger les propriétés');
    } finally {
      setLoadingListings(false);
    }
  };

  fetchListings();
}, [page, limit]);
```

**Property Selector (Select):**
```typescript
<Select
  size="small"
  value={propertyId}
  onChange={(e) => setPropertyId(e.target.value)}
  disabled={loadingListings || properties.length === 0}
>
  {properties.map((p, idx) => (
    <MenuItem key={p._id} value={p._id}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: PROPERTY_COLORS[idx % PROPERTY_COLORS.length]
        }} />
        <span>{p.name}</span>
        <span style={{ color: t.text3, fontSize: 11 }}>· {p.propertyUnit}</span>
      </Stack>
    </MenuItem>
  ))}
</Select>
```

**Loading State:**
```typescript
{(loading || loadingListings) && (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
    <CircularProgress size={32} sx={{ color: t.primary }} />
    <Typography sx={{ ml: 2, color: t.text2 }}>
      {loadingListings ? 'Chargement des propriétés...' : 'Chargement du calendrier...'}
    </Typography>
  </Box>
)}
```

---

## 🧪 Test Plan

### ⚠️ PRÉ-REQUIS CRITIQUE: AUTHENTIFICATION

**IMPORTANT**: L'API `/api/v1/listing/listings` requiert une authentification JWT valide.

**Code backend** (`apps/srv-listing/src/routes/listing/index.ts:22-24`):
```typescript
listingsRouter.get(
  '/',
  authenticateJWT,  // ⚠️ OBLIGATOIRE
  roleAllow([Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker]),
  getListings,
)
```

**Solution**: Se connecter d'abord via http://127.0.0.1:4174/login pour obtenir un token JWT.

---

### Test 1: Vérifier Fetch Listings

1. **ÉTAPE OBLIGATOIRE**: Se connecter sur http://127.0.0.1:4174/login
2. Aller sur http://127.0.0.1:4174/calendrier
3. Vérifier DevTools → Network
4. Chercher requête: `GET /api/v1/listing/listings?page=0&limit=25&paged=true&useActiveFilter=true&active=true&forCalendar=true`
5. **Attendu**: Status 200, `success: true`, array de listings
6. **Si 401 Unauthorized**: Token expiré, se reconnecter

### Test 2: Dropdown Properties

1. Click sur dropdown propriété
2. **Attendu**: Liste des VRAIES propriétés (pas mock p1, p2)
3. Vérifier noms, propertyUnit affichés

### Test 3: Sélection Propriété

1. Sélectionner une propriété
2. **Attendu**: Calendar fetch avec VRAI _id MongoDB
3. DevTools → Requête: `GET /api/v1/calendar/{realId}/calendar?startDate=...`

---

## ⏳ Prochaines Étapes

### Phase 2: Fetch Parallèle (EN COURS)

**Objectif**: Fetcher TOUS les calendriers en parallèle pour vue multi-propriétés

**Pattern sojori-dashboard**:
```typescript
const calendarResponses = await Promise.all(
  properties.map(property =>
    calendarService.getMonthCalendar({
      listingId: property._id,
      startDate,
      endDate,
    })
  )
);

// Merge data
const updatedProperties = properties.map((property, index) => ({
  ...property,
  calendarData: calendarResponses[index] || []
}));
```

**Fichier à modifier**: `CalendarInventoryPage.tsx` (nouveau useEffect)

---

### Phase 3: Nouvelle Modale

**Créer**: `src/components/calendar/UpdateCalendarDialog.tsx`

**Features**:
- Dropdown TOUTES les propriétés
- Auto-load data quand listing change
- Days of week checkboxes
- Date range picker
- Min/Max nights
- Status dropdown
- Validation Yup

**Remplace**:
- ❌ BulkPriceUpdateModal
- ❌ BulkAvailabilityModal
- ❌ BulkRestrictionsModal

---

### Phase 4: Retirer Excel-like

**Supprimer**:
```typescript
const [selection, setSelection] = useState<string[]>([]);
const [dragStart, setDragStart] = useState<string | null>(null);
const onDayMouseDown = ...;
const onDayMouseEnter = ...;
```

**Remplacer par**:
```typescript
const handlePriceClick = (property, date, dayData) => {
  setSelectedDay({ property, date, dayData, allListingsDayData });
  setIsPopupOpen(true);
};
```

---

### Phase 5: Filtres

**Créer**: `src/components/calendar/FilterCalendar.tsx`

**Filtres**:
- Search bar (débounce 300ms)
- Country dropdown
- City dropdown (filtré par country)
- Display options: [☑ Reservation] [☐ Minimum stay]
- Clear button

**State**:
```typescript
const [filters, setFilters] = useState<ListingFilters>({
  active: true,
});

const [displayOptions, setDisplayOptions] = useState(['Reservation']);
```

---

## 🐛 Bugs Potentiels à Surveiller

### 1. Authentification ⚠️ CRITIQUE
**Symptôme**: 401 Unauthorized ou `{"success": false, "error": "Unauthorized access"}`
**Cause**: L'endpoint `/api/v1/listing/listings` requiert OBLIGATOIREMENT un JWT token valide
**Code backend**: `authenticateJWT` + `roleAllow([SuperAdmin, Admin, Owner, Worker])`
**Solution**:
1. Se connecter via http://127.0.0.1:4174/login avec un compte Owner/Admin
2. Le token JWT sera stocké dans localStorage
3. `apiClient.ts` (ligne 69) l'ajoutera automatiquement: `Authorization: Bearer <token>`
4. Si déjà connecté mais 401 → Token expiré, se reconnecter

### 2. CORS
**Symptôme**: CORS error dans console
**Cause**: `credentials: 'include'` sans configuration CORS backend
**Solution**: Vérifier srv-listing CORS config

### 3. ObjectIds Invalides
**Symptôme**: Calendar API retourne vide
**Cause**: Utilisation d'anciens mock IDs (p1, p2)
**Solution**: ✅ Résolu - maintenant utilise vrais _id

### 4. Pagination
**Symptôme**: Seulement 25 propriétés affichées
**Cause**: Limit par défaut = 25
**Solution**: Implémenter pagination UI (Phase 6)

---

## 📊 Statistiques

**Lignes Modifiées**: ~150 lignes
- Types: +70 lignes
- listingsService: +150 lignes
- calendarService: +50 lignes, 5 corrections
- CalendarInventoryPage: ~80 lignes modifiées

**Fichiers Touchés**: 3
- `src/types/listings.types.ts`
- `src/services/listingsService.ts`
- `src/services/calendarService.ts`
- `src/pages/CalendarInventoryPage.tsx`

**Features Ajoutées**:
- ✅ Fetch listings réels depuis API
- ✅ Dropdown propriétés dynamique
- ✅ Loading states (listings + calendar)
- ✅ Error handling
- ✅ Auto-selection première propriété

**Features Restantes**:
- ⏳ Fetch parallèle calendriers (vue multi)
- ⏳ Nouvelle modale UpdateCalendar
- ⏳ Retirer sélection Excel-like
- ⏳ Filtres (Country/City/Search)
- ⏳ Pagination
- ⏳ Toast notifications

---

## ✅ Checklist Complète

### Backend
- [x] Types Listing/CalendarDayData
- [x] getListingsForCalendar()
- [x] getCountries()
- [x] getCities()
- [x] getTags()
- [x] getInventoryForListings()
- [x] Credentials 'include' partout
- [x] BASE_URL corrigé

### Frontend
- [x] Retirer mock PROPERTIES
- [x] State listings/page/limit/total
- [x] useEffect fetch listings
- [x] Dropdown dynamique
- [x] Loading states
- [x] Error handling
- [x] Auto-select première propriété
- [ ] Fetch parallèle calendriers
- [ ] Nouvelle modale UpdateCalendar
- [ ] Retirer sélection Excel-like
- [ ] FilterCalendar component
- [ ] Pagination UI

---

**Document Créé**: 15 Mai 2026 - 11:00
**Prochaine Action**: Tester fetch listings en production
