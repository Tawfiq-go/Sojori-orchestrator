# 📊 Calendar Implementation - Progression

**Date Début**: 14 Mai 2026
**Date Mise à Jour**: 15 Mai 2026
**Objectif**: Répliquer EXACTEMENT sojori-dashboard dans Sojori-orchestrator

---

## ✅ Phase 1: Analyse & Documentation (TERMINÉ)

### Documents Créés

1. **`API_CALENDAR_TESTS_COMPARISON.md`** (15 KB)
   - Liste des 12 APIs utilisées par sojori-dashboard
   - Comparaison avec Sojori-orchestrator (ce qui existe/manque)
   - Exemples curl pour chaque API
   - Tableau récapitulatif avec priorités

2. **`CALENDAR_UX_SPEC_EXACT.md`** (25 KB)
   - Spécifications UX complètes basées sur sojori-dashboard
   - Structure des cellules (3 types: dispo/résa/loading)
   - Comportement exact des modales
   - Pattern de fetch parallèle
   - Ce qui N'EXISTE PAS (sélection Excel-like, etc.)

3. **`CONFIGURATION_CALENDAR.md`** (Existant - mis à jour)
   - Guide configuration URLs et ports
   - Scénarios de test

### Découvertes Importantes

✅ **Port Calendar**: 4004 (pas 4006!)
✅ **Pas de sélection Excel-like**: Click simple sur cellule → Modale
✅ **Modale liste TOUTES les propriétés**: Pas seulement celle cliquée
✅ **Fetch parallèle**: `Promise.all()` pour tous les calendriers
✅ **Affichage conditionnel**: Checkboxes "Reservation"/"Minimum stay"
✅ **Update local**: Ne recharge pas toute la page

---

## ✅ Phase 2: Backend Services (TERMINÉ)

### Fichiers Créés/Modifiés

#### 1. `src/types/listings.types.ts` ✅
**Ajouté**:
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
  reservations: CalendarReservation[];
  // ... autres champs
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

#### 2. `src/services/listingsService.ts` ✅
**Ajouté** (dans service existant):
```typescript
async getListingsForCalendar(
  page: number = 0,
  limit: number = 25,
  filters?: ListingFilters
): Promise<{ success: boolean; data: any[]; total: number }>

async getCountries(): Promise<{ _id: string; name: string }[]>

async getCities(): Promise<{ _id: string; name: string; countryId?: string }[]>

async getTags(): Promise<{ _id: string; name: string }[]>
```

**Configuration**:
- URL: `${VITE_API_URL}/api/v1/listing/listings`
- Timeout: 60 secondes
- `forCalendar=true` → Payload léger
- `credentials: 'include'` → JWT cookies

#### 3. `src/services/calendarService.ts` ✅
**Modifié**:
- ✅ Corrigé BASE_URL: `VITE_API_URL` au lieu de `VITE_API_BASE_URL`
- ✅ Ajouté `credentials: 'include'` sur TOUS les fetch
- ✅ Commentaire correct: Port 4004 (pas 4006)

**Ajouté**:
```typescript
async getInventoryForListings(
  listingIds: string[],
  startDate: string,
  endDate: string,
  includeReservations: boolean = true
): Promise<Record<string, any[]>>
```

**Méthodes Existantes** (déjà créées):
- `getMonthCalendar()` - GET calendar single
- `updateCalendar()` - PUT bulk update
- `getMultiPropertyAvailability()` - GET multi calendars
- `getOccupancyRate()` - GET occupancy
- `getAverageDailyRate()` - GET ADR

---

## ⏳ Phase 3: Frontend Integration (EN COURS)

### À Faire Maintenant

#### 1. Modifier `CalendarInventoryPage.tsx` 🔴 PRIORITÉ MAX

**Changements requis**:

```typescript
// ❌ RETIRER
const PROPERTIES = [
  { id: 'p1', name: 'Villa Belvédère', ... },  // Mock IDs
];

// ✅ AJOUTER
import listingsService from '../services/listingsService';

const [properties, setProperties] = useState<Listing[]>([]);
const [page, setPage] = useState(0);
const [limit, setLimit] = useState(25);
const [total, setTotal] = useState(0);
const [filters, setFilters] = useState<ListingFilters>({});

useEffect(() => {
  const fetchListings = async () => {
    try {
      const response = await listingsService.getListingsForCalendar(
        page,
        limit,
        filters
      );

      setProperties(response.data.map(listing => ({
        id: listing._id,
        name: listing.name,
        calendarData: []  // Sera rempli par fetch parallèle
      })));

      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  fetchListings();
}, [page, limit, filters]);
```

#### 2. Implémenter Fetch Parallèle 🔴 PRIORITÉ MAX

**Pattern sojori-dashboard**:
```typescript
useEffect(() => {
  const fetchCalendarData = async () => {
    if (properties.length === 0) return;

    const startDate = moment(daysInView[0]).format('YYYY-MM-DD');
    const endDate = moment(daysInView[daysInView.length - 1]).format('YYYY-MM-DD');

    // ⚠️ FETCH PARALLÈLE CRITIQUE
    const calendarResponses = await Promise.all(
      properties.map(property =>
        calendarService.getMonthCalendar({
          listingId: property.id,
          startDate,
          endDate,
        })
      )
    );

    // Merge data into properties
    const updatedProperties = properties.map((property, index) => ({
      ...property,
      calendarData: calendarResponses[index] || []
    }));

    setProperties(updatedProperties);
  };

  fetchCalendarData();
}, [properties, daysInView]);
```

#### 3. Remplacer Modale Bulk 🔴 PRIORITÉ MAX

**Actuellement**: 3 modales séparées (BulkPriceUpdateModal, etc.)

**Requis**: 1 seule modale avec dropdown:

```typescript
// ❌ RETIRER
<BulkPriceUpdateModal selectedDates={...} />
<BulkAvailabilityModal selectedDates={...} />
<BulkRestrictionsModal selectedDates={...} />

// ✅ REMPLACER PAR
<UpdateCalendarDialog
  open={isPopupOpen}
  onClose={() => setIsPopupOpen(false)}
  selectedDay={{
    property: clickedProperty,
    date: clickedDate,
    dayData: clickedDayData,
    allListingsDayData: properties.map(prop => ({
      property: prop,
      dayData: prop.calendarData.find(d =>
        moment(d.date).format('YYYY-MM-DD') === clickedDate
      ) || null
    }))
  }}
  onUpdate={handleUpdateCalendar}
/>
```

**Modale doit contenir**:
```typescript
<Select name="listingId" onChange={handleListingChange}>
  {allListingsDayData.map(item => (
    <MenuItem value={item.property.id}>{item.property.name}</MenuItem>
  ))}
</Select>

<TextField name="price" type="number" />
<TextField name="startDate" type="date" />
<TextField name="endDate" type="date" />

<Box> {/* Days of week checkboxes */}
  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
    <Checkbox label={day} name={`day-${day}`} />
  ))}
</Box>

<TextField name="minimumStay" type="number" />
<TextField name="maximumStay" type="number" />

<Select name="status">
  <MenuItem value="available">Available</MenuItem>
  <MenuItem value="closed">Closed</MenuItem>
</Select>

<Switch name="isAvailable" />
```

#### 4. Retirer Sélection Excel-like 🟡 MOYEN

**Actuellement**: Système drag & drop avec bar bulk actions

**Requis**: Click simple → Ouvre modale

```typescript
// ❌ RETIRER
const [selection, setSelection] = useState<string[]>([]);
const handleDragStart = ...;
const handleDragEnd = ...;
<BulkActionsBar selection={selection} />;

// ✅ GARDER SIMPLE
const handlePriceClick = (property, date, dayData) => {
  setSelectedDay({ property, date, dayData, allListingsDayData });
  setIsPopupOpen(true);
};

<div onClick={() => handlePriceClick(property, date, dayData)}>
  {dayData.price} DH
</div>
```

#### 5. Implémenter Filtres 🟠 HIGH

**Structure**:
```typescript
<FilterCalendar
  onFilterChange={setFilters}
  onSearchQueryChange={(query) => setFilters({...filters, name: query})}
  onSelectedItemsChange={setDisplayOptions}
  listingsCount={properties.length}
/>
```

**Filtres requis**:
- Search bar (débounce 300ms)
- Country dropdown
- City dropdown (filtré par country)
- Display options: [☑ Reservation] [☐ Minimum stay]
- Clear button

---

## 📊 Statistiques

### Fichiers Créés
- 3 documents de spec/analyse
- 1 fichier types (modifié)
- 2 services (modifiés avec nouvelles méthodes)

### Lignes de Code
- Types: ~70 lignes ajoutées
- listingsService: ~150 lignes ajoutées
- calendarService: ~50 lignes ajoutées + corrections

### APIs Implémentées
- ✅ GET /api/v1/listing/listings (paginated)
- ✅ GET /api/v1/admin/country
- ✅ GET /api/v1/admin/city
- ✅ GET /api/v1/listing/tag
- ✅ GET /api/v1/calendar/:id/calendar
- ✅ PUT /api/v1/calendar/update-calendar
- ✅ GET /api/v1/calendar/inventory/get-inventory
- ✅ GET /api/v1/calendar/occupancy-rate
- ✅ GET /api/v1/calendar/average-daily-rate

### APIs Manquantes (Non critiques)
- ❌ PUT /api/v1/calendar/inventory/update-inventory
- ❌ POST /api/v1/calendar/inventory/reconcile-from-reservations

---

## 🎯 Prochaines Étapes (Ordre de Priorité)

### 1. 🔴 CRITICAL - Fetch Listings Réels (15 min)
- Modifier CalendarInventoryPage
- Remplacer PROPERTIES mock
- Implémenter pagination

### 2. 🔴 CRITICAL - Fetch Parallèle (20 min)
- Promise.all() pour tous les calendriers
- Merge data dans properties.calendarData
- Loading states

### 3. 🔴 CRITICAL - Nouvelle Modale (45 min)
- Créer UpdateCalendarDialog.tsx
- Dropdown toutes propriétés
- Auto-load data listing sélectionné
- Days of week checkboxes
- Validation Yup

### 4. 🟡 MEDIUM - Retirer Excel-like (10 min)
- Supprimer système sélection
- Supprimer BulkActionsBar
- Simplifier click handlers

### 5. 🟠 HIGH - Filtres (30 min)
- Créer FilterCalendar component
- Country/City/Tags dropdowns
- Search bar avec débounce
- Display options checkboxes

### 6. 🟢 LOW - Polish (1h)
- Pagination component
- Toast notifications
- Error handling
- Skeleton loaders
- Responsive design

---

## ⚠️ Points d'Attention

1. **Authentification**: Tous les fetch utilisent `credentials: 'include'` pour JWT cookies
2. **ObjectIds MongoDB**: Pas de mock IDs (p1, p2) - utiliser vrais `_id`
3. **Update Local**: Après modification, ne PAS reload page - update state seulement
4. **Fetch Parallèle**: CRITIQUE pour performance - 1 requête par propriété en //
5. **Cache Client**: Ne pas refetch si données déjà chargées (sojori-dashboard pattern)

---

## 🚫 Ce Qui Ne Sera PAS Implémenté

- ❌ Sélection Excel-like (drag & drop cellules)
- ❌ Bulk actions bar en bas
- ❌ Multi-select de propriétés dans modale
- ❌ AI Pricing suggestions
- ❌ Channel sync buttons inline
- ❌ Right-click context menu
- ❌ Keyboard shortcuts

**Raison**: Ces fonctionnalités n'existent PAS dans sojori-dashboard. On réplique EXACTEMENT le comportement existant.

---

**Dernière Mise à Jour**: 15 Mai 2026 - 10:50
**Prochaine Étape**: Modifier CalendarInventoryPage pour fetch listings réels
