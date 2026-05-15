# 📐 Spécifications UX EXACTES - Calendar (basé sur sojori-dashboard)

**Date**: 15 Mai 2026
**Source**: Analyse complète de `/Users/gouacht/sojori-dashboard/src/features/calendar/`
**Objectif**: Répliquer EXACTEMENT le fonctionnement de sojori-dashboard dans Sojori-orchestrator avec le nouveau design

---

## 🎨 Structure Globale

### Layout Principal
```
┌──────────────────────────────────────────────────────────┐
│ 🔍 FilterCalendar (Collapsible)                          │
│   - Search bar                                            │
│   - Country filter dropdown                               │
│   - City filter dropdown                                  │
│   - Display options: [Reservation] [Minimum stay]        │
│   - Clear filters button                                  │
│   - Listings count: "25 properties"                       │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ 📅 MultiTableCalendar (PrimeReact DataTable)             │
│                                                            │
│  Property Name  │ Mon 1 │ Tue 2 │ Wed 3 │ Thu 4 │ ...   │
│  ───────────────┼───────┼───────┼───────┼───────┼────── │
│  Villa Belvédère│ 250DH │ 250DH │ 250DH │ RÉSA  │ ...   │
│                 │ 2N    │ 2N    │ 2N    │ John  │       │
│  ───────────────┼───────┼───────┼───────┼───────┼────── │
│  Dar Sojori     │ 180DH │ 180DH │ RÉSA  │ RÉSA  │ ...   │
│                 │ 1N    │ 1N    │ Alice │ Alice │       │
│  ───────────────┼───────┼───────┼───────┼───────┼────── │
│  ...            │       │       │       │       │       │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ ◀ Previous   1  2  3  4  5  6   Next ▶   Per page: 25   │
└──────────────────────────────────────────────────────────┘
```

---

## 🔍 1. FilterCalendar Component

### État Initial
- **Filtres fermés** (collapse)
- Bouton "🔍 Filters" pour toggle
- Affiche le nombre de listings: **"25 properties"**

### Quand Ouvert
**Grid Layout** (4 colonnes):
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Search      │ Country     │ City        │ Clear       │
│ [_______]   │ [Dropdown▼] │ [Dropdown▼] │ [🗑 Clear]  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Checkboxes d'affichage** (en dessous):
- ☑ **Reservation** (checked par défaut)
- ☐ **Minimum stay** (unchecked par défaut)

### Fichier Source
`/Users/gouacht/sojori-dashboard/src/features/calendar/components/multiCalendarV2/FilterCalendar.jsx`

```javascript
const [selectedItems, setSelectedItems] = useState(['Reservation']); // Default
const options = ['Reservation', 'Minimum stay'];
```

### Comportement
1. **Search** → Filtre par nom de propriété (débounce)
2. **Country** → Filtre les listings par pays
3. **City** → Filtre par ville (dépend du pays sélectionné)
4. **Display options** → Affiche/cache des infos dans les cellules
5. **Clear** → Reset tous les filtres

---

## 📅 2. MultiTableCalendar Component

### Technologie
- **PrimeReact DataTable** (pas custom table)
- Scroll horizontal infini
- Auto-fetch au scroll (84 jours droite, 20 jours gauche)
- Cache client-side des données

### Fichier Source
`/Users/gouacht/sojori-dashboard/src/features/calendar/components/multiCalendarV2/MultiTableCalendar.jsx`

---

## 📊 3. Structure d'une Cellule Date

### 3 Types de Cellules

#### Type 1: Disponible (Pas de réservation)
```
┌──────────────┐
│  250 DH      │ ← Prix (toujours affiché)
│  2 Nights    │ ← Minimum stay (si checkbox activée)
└──────────────┘
```

**Code:**
```javascript
<div className="price-stay-info cursor-pointer" onClick={() => handlePriceStayClick(property, date, dayData)}>
  <div><span className="text-[11.5px] font-semibold italic text-gray-500">{dayData.price} DH</span></div>
  {selectedItems.includes('Minimum stay') && (
    <div><span className="text-[9.5px] font-semibold italic text-gray-400">{dayData.minimumStay} Nights</span></div>
  )}
</div>
```

#### Type 2: Réservée (Affiche guest si checkbox "Reservation")
```
┌──────────────┐
│  John D.     │ ← Guest name (initiales ou nom complet)
│  Airbnb      │ ← Source (si affichée)
└──────────────┘
```

**Code:**
```javascript
{selectedItems.includes('Reservation') && hasReservation ? (
  <div className="reservation-info" onClick={() => handleReservationClick(reservation)}>
    <div className="text-sm font-medium">{reservation.guestName}</div>
    <div className="text-xs text-gray-500">{reservation.source || 'Direct'}</div>
  </div>
) : (
  renderPriceStayInfo() // Affiche prix même si réservation existe
)}
```

**⚠️ IMPORTANT**: Si checkbox "Reservation" est **décochée**, affiche le PRIX même s'il y a une réservation!

#### Type 3: Loading
```
┌──────────────┐
│ ░░░░░░░░░░░  │ ← Skeleton loader (pulsing animation)
│ ░░░░░░░      │
└──────────────┘
```

**Code:**
```javascript
if (isLoading) {
  return (
    <div className="date-cell loading flex items-center justify-center">
      <div className="w-full h-12 bg-gray-50 rounded-md">
        <div className="animate-pulse">
          <div className="flex flex-col gap-2 items-center">
            <div className="h-1 bg-gray-200 rounded w-5/6 mt-3"></div>
            <div className="h-1 bg-gray-200 rounded w-12"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🖱️ 4. Interactions Cellule

### Click sur Prix (Cellule disponible)
→ Ouvre **UpdateCalendar Modal** (Bulk Update)

### Click sur Réservation (Cellule réservée)
→ Ouvre **ModelEventDialog** (Détails réservation)

### ❌ PAS DE:
- Drag & drop
- Sélection multiple (Excel-like)
- Right-click menu
- Keyboard shortcuts

---

## 📝 5. UpdateCalendar Modal (Bulk Update)

### Apparence
```
┌─────────────────────────────────────────────┐
│ Bulk Update                             [X] │
├─────────────────────────────────────────────┤
│                                             │
│ Listing: [Villa Belvédère ▼]               │
│                                             │
│ Price: [250___________]                     │
│                                             │
│ From: [2026-05-15]  To: [2026-05-15]        │
│                                             │
│ Days of Week:                               │
│ [☑Sun] [☑Mon] [☑Tue] [☑Wed]               │
│ [☑Thu] [☑Fri] [☑Sat]                      │
│                                             │
│ Min Nights: [2____]  Max Nights: [30___]   │
│                                             │
│ Status: [Available ▼]                       │
│                                             │
│ Available: [Toggle ON/OFF]                  │
│                                             │
├─────────────────────────────────────────────┤
│               [Cancel]  [Save]              │
└─────────────────────────────────────────────┘
```

### Fichier Source
`/Users/gouacht/sojori-dashboard/src/features/calendar/components/multiCalendarV2/UpdateCalendar.jsx`

### Champs
1. **Listing Dropdown** → Liste TOUTES les propriétés (pas seulement celle cliquée!)
2. **Price** → Prix par nuit (requis)
3. **Date Range** → Start & End date
4. **Days of Week** → Checkboxes pour chaque jour
5. **Min/Max Nights** → Restrictions de séjour
6. **Status** → Dropdown: available, closed, etc
7. **Available Toggle** → isAvailable boolean

### Comportement CRITIQUE
**Quand on change le dropdown "Listing":**
```javascript
onChange={e => {
  const newListingId = e.target.value;
  setFieldValue('listingId', newListingId);

  // ⚠️ IMPORTANT: Charge les données du nouveau listing
  const selectedListing = selectedDay.allListingsDayData.find(
    item => item.property.id === newListingId
  );

  if (selectedListing) {
    setFieldValue('minimumStay', selectedListing.dayData?.minimumStay?.toString() || '');
    setFieldValue('maximumStay', selectedListing.dayData?.maximumStay?.toString() || '');
    setFieldValue('price', selectedListing.dayData?.price?.toString() || '');
    setFieldValue('isAvailable', selectedListing.dayData?.isAvailable ?? true);
    setFieldValue('status', selectedListing.dayData?.status || 'available');
  }
}}
```

**Quand on click sur une cellule:**
```javascript
const handlePriceStayClick = useCallback((property, date, dayData) => {
  const selectedDate = moment(date).format('YYYY-MM-DD');

  // ⚠️ RÉCUPÈRE TOUTES LES PROPRIÉTÉS pour ce jour
  const allListingsDayData = properties.map(prop => ({
    property: prop,
    dayData: prop.calendarData.find(d =>
      moment(d.date).format('YYYY-MM-DD') === selectedDate
    ) || null
  }));

  setSelectedDay({
    property,
    date,
    dayData,
    allListingsDayData // Passé à la modale
  });
  setIsPopupOpen(true);
}, [properties]);
```

**⚠️ DONC**: La modale peut modifier **N'IMPORTE QUELLE propriété** pour cette date, pas seulement celle cliquée!

### Validation (Yup)
```javascript
const validationSchema = Yup.object().shape({
  listingId: Yup.string().required('Listing is required'),
  price: Yup.number().positive('Price must be positive').required('Price is required'),
  startDate: Yup.date().required('Start date is required'),
  endDate: Yup.date().min(Yup.ref('startDate'), 'End date must be after start date').required('End date is required'),
  days: Yup.array().min(1, 'Select at least one day'),
  minimumStay: Yup.number().required('Min Nights is required'),
  maximumStay: Yup.number().required('Max Nights is required'),
  status: Yup.string().required('Status is required')
});
```

### Submit
```javascript
const handleSubmit = async (values) => {
  const response = await updateCalnedar(values); // PUT /api/v1/calendar/update-calendar

  toast.success('Calendar updated successfully');

  onUpdate({
    listingId: payload.listingId,
    postUpdateDocs: response.data.postUpdateDocs
  });

  onClose();
};
```

### Après Update
**NE RECHARGE PAS TOUTE LA PAGE** → Met à jour seulement les cellules affectées:

```javascript
const handleUpdateCalendar = useCallback((updatedData) => {
  setProperties(prevProperties => prevProperties.map(property => {
    if (property.id === updatedData.listingId) {
      const updatedCalendarData = property.calendarData.map(day => {
        const matchingUpdatedDay = updatedData.postUpdateDocs.find(
          updatedDay => moment(updatedDay.date).format('YYYY-MM-DD') === moment(day.date).format('YYYY-MM-DD')
        );

        if (matchingUpdatedDay) {
          return {
            ...day,
            price: matchingUpdatedDay.price,
            minimumStay: matchingUpdatedDay.minimumStay,
            maximumStay: matchingUpdatedDay.maximumStay,
            isAvailable: matchingUpdatedDay.isAvailable,
            note: matchingUpdatedDay.note,
            status: matchingUpdatedDay.status,
          };
        }
        return day;
      });
      return { ...property, calendarData: updatedCalendarData };
    }
    return property;
  }));
}, []);
```

---

## 🎫 6. ModelEventDialog (Détails Réservation)

### Apparence
```
┌─────────────────────────────────────────────┐
│ Reservation Details                     [X] │
├─────────────────────────────────────────────┤
│                                             │
│ Guest: John Doe                             │
│ Email: john@example.com                     │
│ Phone: +212 6 12 34 56 78                   │
│                                             │
│ Check-in:  2026-05-15                       │
│ Check-out: 2026-05-18                       │
│ Nights: 3                                   │
│                                             │
│ Total Price: 750 DH                         │
│ Source: Airbnb                              │
│ Status: Confirmed                           │
│                                             │
├─────────────────────────────────────────────┤
│                         [Close]             │
└─────────────────────────────────────────────┘
```

### Fichier Source
`/Users/gouacht/sojori-dashboard/src/features/calendar/components/multiCalendarV2/ModelEventDialog.jsx`

---

## 🔄 7. Auto-Fetch au Scroll

### Comportement
**Scroll horizontal** sur le DataTable → Auto-fetch plus de jours

**Triggers:**
- Scroll **DROITE** de **84+ colonnes** → Fetch jours futurs
- Scroll **GAUCHE** de **20+ colonnes** → Fetch jours passés

### Code
```javascript
const debouncedHandleScroll = useCallback(
  debounce(() => {
    if (!tableElement) return;

    const { scrollLeft, scrollWidth, clientWidth } = tableElement;
    const newScrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100;
    const currentScrolledColumns = Math.round(newScrollPercentage / columnWidth);

    if (lastTriggerScrollPosition === null) {
      setLastTriggerScrollPosition(currentScrolledColumns);
      return;
    }

    const scrollDirection = currentScrolledColumns > lastTriggerScrollPosition ? 'right' : 'left';
    const daysScrolled = Math.abs(currentScrolledColumns - lastTriggerScrollPosition);

    if (scrollDirection === 'right' && daysScrolled >= 84) {
      goToNextPeriod();
      setLastTriggerScrollPosition(currentScrolledColumns);
    } else if (scrollDirection === 'left' && daysScrolled >= 20) {
      goToPreviousPeriod();
      setLastTriggerScrollPosition(currentScrolledColumns);
    }
  }, 200),
  [goToNextPeriod, goToPreviousPeriod, columnWidth, tableElement, lastTriggerScrollPosition]
);
```

### Cache Client
**NE REFETCH PAS** si les données existent déjà:

```javascript
if (cachedStartDate && cachedEndDate &&
    moment(start).isSameOrAfter(cachedStartDate) &&
    moment(end).isSameOrBefore(cachedEndDate)) {
  setIsLoading(false);
  return; // ⚠️ Utilise le cache
}
```

---

## 📱 8. Pagination

### Position
En bas de la page

### Éléments
```
◀ Previous    1  2  3  4  5  6    Next ▶    Per page: [25 ▼]
```

### Options Per Page
- 10
- 25 (défaut)
- 50
- 100

### Fichier Source
`/Users/gouacht/sojori-dashboard/src/features/calendar/pages/MultiCalendarV2.page.jsx` ligne 84

```javascript
<Pagination
  page={page}
  onPageChange={handlePageChange}
  isNextDisabled={isNextDisabled}
  limit={limit}
  onLimitChange={handleLimitChange}
  rowsPerPageOptions={[10, 25, 50, 100]}
/>
```

---

## 🎨 9. Style & Design Tokens

### Couleurs sojori-dashboard
- Primary: `#00b4b4` (cyan/turquoise)
- Dialog header: `#2196f3` (Material blue)
- Prix text: `#6B7280` (gray-500)
- Min nights text: `#9CA3AF` (gray-400)

### Fonts
- Prix: `11.5px`, `font-semibold`, `italic`
- Min nights: `9.5px`, `font-semibold`, `italic`

### Spacing
- Grid gap filtres: `16px` (theme.spacing(2))
- Cell padding: Auto (PrimeReact)

---

## ✅ Checklist Fonctionnalités EXACTES

### Filtres
- [ ] Search bar (débounce)
- [ ] Country dropdown (fetch depuis API)
- [ ] City dropdown (fetch depuis API)
- [ ] Display checkboxes: Reservation, Minimum stay
- [ ] Clear filters button
- [ ] Listings count affichage
- [ ] Collapse/expand filtres

### Tableau
- [ ] PrimeReact DataTable
- [ ] Scroll horizontal infini
- [ ] Auto-fetch au scroll (84 droite, 20 gauche)
- [ ] Cache client-side
- [ ] Loading skeleton par cellule
- [ ] Affichage conditionnel (Reservation checkbox)
- [ ] Click cellule prix → Modale
- [ ] Click cellule réservation → Détails

### Modale Update
- [ ] Dropdown TOUTES les propriétés
- [ ] Auto-load data du listing sélectionné
- [ ] Date range picker
- [ ] Days of week checkboxes
- [ ] Price, Min/Max nights, Status
- [ ] Validation Yup
- [ ] Toast notifications
- [ ] Update local state (pas full reload)

### Pagination
- [ ] Previous/Next buttons
- [ ] Page numbers
- [ ] Per page dropdown (10/25/50/100)
- [ ] Disable next si dernière page

### Performance
- [ ] Fetch parallèle avec Promise.all()
- [ ] Debounce search (300ms)
- [ ] Debounce scroll (200ms)
- [ ] Cache merge (pas overwrite)
- [ ] Timeout listings: 60s
- [ ] Skeleton loaders

---

## 🚫 Ce Qui N'EXISTE PAS dans sojori-dashboard

- ❌ Sélection multiple de cellules (Excel-like drag)
- ❌ Bulk actions bar en bas
- ❌ Right-click context menu
- ❌ Keyboard shortcuts (Arrow keys, etc)
- ❌ Multi-property select dans modale (c'est un dropdown, pas multi-select)
- ❌ AI Pricing suggestions
- ❌ Channel sync buttons

---

## 🎯 PLAN D'ACTION pour Sojori-orchestrator

### Phase 1: Data Layer (PRIORITÉ)
1. ✅ Corriger port calendar (4004)
2. ❌ Créer listingsService.ts
3. ❌ Créer listings.types.ts
4. ❌ Fetch listings depuis API (pas mock)
5. ❌ Fetch calendars en parallèle (Promise.all)

### Phase 2: UI Refactor (Garder nouveau design)
1. ❌ Remplacer mock PROPERTIES par fetch réel
2. ❌ Implémenter FilterCalendar exact
3. ❌ Remplacer custom table par PrimeReact DataTable
4. ❌ Cellules avec 3 états (dispo/résa/loading)
5. ❌ Affichage conditionnel (checkboxes)

### Phase 3: Modales
1. ❌ UpdateCalendar avec dropdown TOUTES propriétés
2. ❌ Auto-load data listing sélectionné
3. ❌ ModelEventDialog pour réservations
4. ❌ Update local state (pas reload)

### Phase 4: Performance
1. ❌ Auto-fetch au scroll
2. ❌ Cache client-side
3. ❌ Skeleton loaders
4. ❌ Debounce search/scroll

### Phase 5: Polish
1. ❌ Pagination complète
2. ❌ Toast notifications
3. ❌ Error handling
4. ❌ Responsive (mobile/tablet)

---

**Document créé le**: 15 Mai 2026
**Pour**: Répliquer EXACTEMENT sojori-dashboard dans Sojori-orchestrator
**Source**: Analyse complète du code sojori-dashboard
