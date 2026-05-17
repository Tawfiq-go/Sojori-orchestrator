# 📅 Calendar Inventory V2 - Refonte Complète

## 🎯 Objectif

Reproduire **EXACTEMENT** https://partners.sojori.com/admin/calendar/Inventory dans Sojori-orchestrator avec :
- ✅ Sidebar toujours présente (DashboardWrapper)
- ✅ Filtres de colonnes (11 colonnes disponibles)
- ❌ Données réelles de l'API (pas mock)
- ❌ Collapse/expand listings pour voir les room types
- ❌ Affichage détaillé des prix (base, manual, dynamic)
- ❌ Affichage stop sell, min/max stay, closed arrival/departure

---

## 📊 Structure des Données API

### Endpoint: `/api/v1/calendar/inventory/get-inventory`

**Paramètres:**
- `listingIds[]`: Array de listing IDs
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `includeReservations`: boolean

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "listingId": "abc123",
        "roomTypes": [
          {
            "roomTypeId": "rt456",
            "name": "Chambre Standard",
            "availableRoomsByDay": [
              {
                "date": "2026-05-15",
                "availableRoom": 3,
                "basePrice": 120,
                "calculatedPrice": 135,
                "manualPrice": null,
                "applyManual": false,
                "stopSell": false,
                "minStay": 2,
                "maxStay": 7,
                "closedArrival": false,
                "closedDeparture": false,
                "reservations": [...]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## 🎨 Colonnes Disponibles (11 au total)

| ID | Label | Description | Données API |
|----|-------|-------------|-------------|
| `availableRoom` | Chambre disponible | Nombre de chambres dispo | `availableRoom` |
| `rate` | Tarif (avec détails) | Prix affiché + détails collapse | `calculatedPrice` ou `manualPrice` |
| `basePrice` | Prix de base | Prix de base | `basePrice` |
| `manualPrice` | Prix manuel | Prix manuel override | `manualPrice` |
| `dynamicPrice` | Prix Dynamique | Prix calculé dynamiquement | `calculatedPrice` |
| `reservations` | Réservations | Liste des réservations | `reservations[]` |
| `stopSell` | Arrêt des ventes | Bloquer les ventes | `stopSell` |
| `minStay` | Séjour minimum | Nuits minimum | `minStay` |
| `maxStay` | Séjour maximum | Nuits maximum | `maxStay` |
| `closedArrival` | Arrivée fermée | Pas de check-in ce jour | `closedArrival` |
| `closedDeparture` | Départ fermé | Pas de check-out ce jour | `closedDeparture` |

**Colonnes par défaut affichées:** `['availableRoom', 'rate']`

---

## 🔨 Tâches à Compléter

### ✅ 1. DashboardWrapper avec Sidebar
- [x] Ajouter `<DashboardWrapper breadcrumb={['Calendrier', 'Inventaire']}>`
- [x] Wrapper tout le contenu de la page

### 🔄 2. Composant ColumnFilters
- [x] Créer `/src/components/calendar/ColumnFilters.tsx`
- [ ] Intégrer dans CalendarInventoryPageV2
- [ ] State `selectedColumns` avec défaut `['availableRoom', 'rate']`
- [ ] Callback `onSelectedColumnsChange`

### 📋 3. Affichage Grille avec VRAIES Données
**PROBLÈME ACTUEL:** On utilise MultiPropertyInventory avec mock data (bookedRanges, closedDays)

**SOLUTION:** Créer un nouveau composant `InventoryGrid` qui affiche:
- Une ligne par listing (collapsible)
- Sous-lignes pour chaque room type
- Colonnes dynamiques selon `selectedColumns`
- Données depuis `inventoryData[listingId][roomTypeId].availability[dateStr]`

**Structure attendue:**
```tsx
<InventoryGrid
  listings={listings}
  inventoryData={inventoryData}
  days={dates}
  selectedColumns={selectedColumns}
  expandedListings={expandedListings}
  onToggleListing={toggleListing}
  onCellClick={openUpdateModal}
/>
```

### 🎯 4. Collapse/Expand Listings
- [ ] State `expandedListings: Record<string, boolean>`
- [ ] Tous expanded par défaut
- [ ] Toggle avec flèche ▼/▲
- [ ] Afficher/cacher les room types

### 💰 5. Colonne "Tarif (avec détails)"
Quand `selectedColumns` contient `'rate'`:
- Afficher le prix principal (calculatedPrice ou manualPrice si applyManual)
- Au click, ouvrir collapse avec détails:
  - Prix de base: XXX€
  - Prix manuel: YYY€
  - Prix dynamique: ZZZ€
  - Appliqué: [manuel/dynamique]

### 🚫 6. Colonne "Stop Sell"
- Afficher icône 🚫 si `stopSell: true`
- Cellule rouge/grisée

### 📅 7. Colonnes Min/Max Stay
- Afficher nombre de nuits
- `minStay: 2` → "2n min"
- `maxStay: 7` → "7n max"

### 🔒 8. Colonnes Closed Arrival/Departure
- `closedArrival: true` → Icône ⛔ arrivée
- `closedDeparture: true` → Icône ⛔ départ

### 📝 9. UpdateInventoryModal
- [ ] Créer composant modal
- [ ] Ouvre au click sur cellule
- [ ] Formulaire pour modifier:
  - Available rooms
  - Base price
  - Manual price
  - Stop sell
  - Min/max stay
  - Closed arrival/departure
- [ ] Appel PUT `/api/v1/calendar/update-calendar`

---

## 🗂️ Architecture Proposée

```
src/
├── components/
│   └── calendar/
│       ├── ColumnFilters.tsx ✅
│       ├── InventoryGrid.tsx ❌ À créer
│       ├── InventoryRow.tsx ❌ À créer
│       ├── InventoryCell.tsx ❌ À créer
│       └── UpdateInventoryModal.tsx ❌ À créer
├── pages/
│   └── CalendarInventoryPageV2.tsx 🔄 Refactoriser
└── types/
    └── calendar.types.ts 🔄 Étendre avec tous les champs
```

---

## 🔄 Prochaines Étapes (Ordre d'Implémentation)

1. **Créer InventoryGrid.tsx** - Grille avec collapse, colonnes dynamiques
2. **Intégrer ColumnFilters** dans la page
3. **Remplacer MultiPropertyInventory** par InventoryGrid
4. **Afficher les VRAIES données** depuis inventoryData
5. **Implémenter collapse/expand** pour room types
6. **Ajouter toutes les colonnes** (price, stop sell, min/max stay, etc.)
7. **Créer UpdateInventoryModal** avec formulaire complet
8. **Tester avec données réelles** de l'API

---

## 📌 Références

- **Source exacte:** `/Users/gouacht/sojori-dashboard/src/features/calendar/pages/InventoryCalendarNew.jsx`
- **Composant grille:** `/Users/gouacht/sojori-dashboard/src/features/calendar/components/inventoryCalendarNew/InventoryGrid.jsx`
- **Composant filtres:** `/Users/gouacht/sojori-dashboard/src/features/calendar/components/inventoryCalendarNew/ColumnFilters.jsx`

---

## ⚠️ Points Critiques

1. **NE PAS utiliser mock data** - Toutes les données doivent venir de l'API inventory
2. **Respecter structure collapse** - Listing → Room Types (collapsible)
3. **11 colonnes au total** - Pas seulement 2 comme actuellement
4. **Défaut: availableRoom + rate** - Comme l'ancien système
5. **Prix avec détails** - Collapse pour voir base/manual/dynamic

---

Date: 2026-05-15
Status: 🚧 En cours - ColumnFilters créé, grille à refaire complètement
