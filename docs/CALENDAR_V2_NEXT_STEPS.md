# 📅 Calendar Inventory V2 - Prochaines Étapes

## ✅ Ce qui est fait

1. **DashboardWrapper** - Sidebar toujours présente ✅
2. **ColumnFilters.tsx** - Composant créé avec les 11 colonnes ✅
3. **Documentation complète** - CALENDAR_V2_REFONTE_COMPLETE.md ✅

## 🔄 Ce qui reste (Complexe - 1376 lignes dans l'original)

### 1. Créer `InventoryGridV2.tsx`

Le composant doit :
- Afficher une ligne par listing (collapsible avec ▼/▲)
- Afficher les room types en sous-lignes quand expanded
- Rendre les colonnes dynamiquement selon `selectedColumns`
- Afficher les VRAIES données depuis `inventoryData[listingId][roomTypeId].availability[dateStr]`

**Structure des props:**
```typescript
interface InventoryGridProps {
  listings: Listing[];
  inventoryData: InventoryData; // Structure indexée
  days: string[]; // Array de dates YYYY-MM-DD
  selectedColumns: ColumnId[]; // Quelles colonnes afficher
  expandedListings: Record<string, boolean>; // Quels listings sont expanded
  onToggleListing: (listingId: string) => void;
  onCellClick: (listingId: string, roomTypeId: string, date: string, column: ColumnId) => void;
  inventoryLoading: boolean;
}
```

**Colonnes à implémenter:**

```typescript
// Pour chaque colonne, récupérer la donnée depuis inventory:
const inventory = inventoryData[listingId][roomTypeId].availability[dateStr];

switch (columnId) {
  case 'availableRoom':
    return inventory.availableRoom; // Nombre

  case 'rate':
    // Logique complexe: calculatedPrice OU manualPrice selon applyManual
    return inventory.applyManual ? inventory.manualPrice : inventory.calculatedPrice;

  case 'basePrice':
    return inventory.basePrice;

  case 'manualPrice':
    return inventory.manualPrice || '—';

  case 'dynamicPrice':
    return inventory.calculatedPrice;

  case 'stopSell':
    return inventory.stopSell ? '🚫' : '—';

  case 'minStay':
    return inventory.minStay ? `${inventory.minStay}n` : '—';

  case 'maxStay':
    return inventory.maxStay ? `${inventory.maxStay}n` : '—';

  case 'closedArrival':
    return inventory.closedArrival ? '⛔' : '—';

  case 'closedDeparture':
    return inventory.closedDeparture ? '⛔' : '—';

  case 'reservations':
    return inventory.reservations?.length || 0;
}
```

### 2. Modifier `CalendarInventoryPageV2.tsx`

**Ajouter:**
```typescript
import { ColumnFilters, type ColumnId } from '../components/calendar/ColumnFilters';
import { InventoryGridV2 } from '../components/calendar/InventoryGridV2';

// States
const [selectedColumns, setSelectedColumns] = useState<ColumnId[]>(['availableRoom', 'rate']);
const [expandedListings, setExpandedListings] = useState<Record<string, boolean>>({});

// Initialiser tous les listings en expanded par défaut
useEffect(() => {
  if (listings.length > 0) {
    const allExpanded = listings.reduce((acc, listing) => {
      acc[listing._id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedListings(allExpanded);
  }
}, [listings]);

const toggleListing = (listingId: string) => {
  setExpandedListings(prev => ({
    ...prev,
    [listingId]: !prev[listingId]
  }));
};
```

**Dans le JSX - remplacer MultiPropertyInventory:**
```tsx
{/* Filtres de colonnes */}
<Box sx={{ mb: 2, maxWidth: 300 }}>
  <ColumnFilters
    selectedColumns={selectedColumns}
    onSelectedColumnsChange={setSelectedColumns}
  />
</Box>

{/* Grille inventory */}
<InventoryGridV2
  listings={paginatedListings}
  inventoryData={inventoryData}
  days={dates}
  selectedColumns={selectedColumns}
  expandedListings={expandedListings}
  onToggleListing={toggleListing}
  onCellClick={handleCellClick}
  inventoryLoading={inventoryLoading}
/>
```

### 3. Créer `UpdateInventoryModal.tsx`

Modal qui s'ouvre au click sur une cellule avec formulaire pour modifier:
- Available rooms (input number)
- Base price (input number)
- Manual price (input number + checkbox "apply manual")
- Stop sell (checkbox)
- Min/max stay (input number)
- Closed arrival/departure (checkbox)

**Appel API:**
```typescript
PUT /api/v1/calendar/update-calendar
Body: {
  listingId: string,
  roomTypeId: string,
  dates: string[], // Array de dates à modifier
  updates: {
    availableRoom?: number,
    basePrice?: number,
    manualPrice?: number,
    applyManual?: boolean,
    stopSell?: boolean,
    minStay?: number,
    maxStay?: number,
    closedArrival?: boolean,
    closedDeparture?: boolean
  }
}
```

### 4. Couleurs des cellules

**Selon le status:**
```typescript
function getCellColor(inventory: InventoryDay, columnId: ColumnId) {
  // Stop sell = rouge
  if (inventory.stopSell) return '#fee2e2';

  // Pas disponible = gris
  if (inventory.availableRoom === 0) return '#f3f4f6';

  // Réservations = bleu
  if (inventory.reservations && inventory.reservations.length > 0) return '#dbeafe';

  // Disponible = blanc/vert léger
  return inventory.availableRoom > 0 ? '#f0fdf4' : '#fff';
}
```

## 📂 Fichiers à Créer

```
src/
├── components/
│   └── calendar/
│       ├── ColumnFilters.tsx ✅ (FAIT)
│       ├── InventoryGridV2.tsx ❌ (À créer - ~400-500 lignes)
│       └── UpdateInventoryModal.tsx ❌ (À créer - ~200 lignes)
└── pages/
    └── CalendarInventoryPageV2.tsx 🔄 (Modifier - ajouter ColumnFilters + InventoryGridV2)
```

## 🎯 Priorités

1. **InventoryGridV2** - Le plus important, affiche les vraies données
2. **Intégrer ColumnFilters** - Dans la page
3. **UpdateInventoryModal** - Pour éditer les cellules

## 📌 Références Critiques

- **Source grille originale:** `/Users/gouacht/sojori-dashboard/src/features/calendar/components/inventoryCalendarNew/InventoryGrid.jsx` (lignes 600-900 pour le rendu des cellules)
- **Logique prix:** Ligne 122-131 de InventoryGrid.jsx - fonction `priceOf(inv)`
- **Collapse logic:** Lignes 645-695 - expandedListings et IconButton

## ⚠️ Points d'Attention

1. **Ne PAS utiliser mock data** - Toutes les données depuis inventoryData
2. **Respecter la hiérarchie** - Listing (collapsible) → Room Types (rows)
3. **Colonnes dynamiques** - Seulement afficher ce qui est dans selectedColumns
4. **Prix intelligent** - applyManual ? manualPrice : calculatedPrice
5. **Skeleton loading** - Pendant inventoryLoading (voir ligne 704-710)

---

**Status actuel:**
- ✅ DashboardWrapper + sidebar
- ✅ ColumnFilters créé
- ❌ InventoryGridV2 à créer (complexe, ~500 lignes)
- ❌ UpdateInventoryModal à créer

**Prochain commit:** Créer InventoryGridV2.tsx avec rendu dynamique des colonnes
