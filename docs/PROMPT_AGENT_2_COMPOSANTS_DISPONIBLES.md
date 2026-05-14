# 🎯 AGENT 2 - COMPOSANTS CLAUDE DESIGN DISPONIBLES

**Pour toi** : Tu travailles sur **Réservations + Calendrier**

Claude Design a livré **4 composants** que tu peux utiliser maintenant.

---

## ✅ TES COMPOSANTS

### 1. **TravelersSection** (`src/components/sections/TravelersSection.tsx`)

**Utilisation** : Dans le détail d'une réservation

**Props** :
```typescript
interface TravelersSection Props {
  reservationId: string;
  travelers: Traveler[];
  onUpdate: (travelers: Traveler[]) => void;
}

interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passportNumber?: string;
  passportPhoto?: string;
  status: 'COMPLETE' | 'DRAFT' | 'NOT_REGISTERED';
}
```

**Import** :
```typescript
import { TravelersSection } from '../components/sections/TravelersSection';
```

**Exemple** :
```typescript
// Dans ton modal détail réservation
<TravelersSection
  reservationId={selectedReservation.id}
  travelers={selectedReservation.travelers}
  onUpdate={(travelers) => {
    setReservations(prev => prev.map(r =>
      r.id === selectedReservation.id
        ? { ...r, travelers }
        : r
    ));
    toast.success('Voyageurs mis à jour');
  }}
/>
```

---

### 2. **FinancialSection** (`src/components/sections/FinancialSection.tsx`)

**Utilisation** : Afficher/éditer détails financiers réservation

**Props** :
```typescript
interface FinancialSectionProps {
  reservation: Reservation;
  onUpdate: (financial: Financial) => void;
}

interface Financial {
  basePrice: number;
  cleaningFee: number;
  serviceFee: number;
  commission: number;
  total: number;
  currency: string;
}
```

**Import** :
```typescript
import { FinancialSection } from '../components/sections/FinancialSection';
```

**Exemple** :
```typescript
<FinancialSection
  reservation={selectedReservation}
  onUpdate={(financial) => {
    setReservations(prev => prev.map(r =>
      r.id === selectedReservation.id
        ? { ...r, ...financial }
        : r
    ));
    toast.success('Finances mises à jour');
  }}
/>
```

---

### 3. **ReservationsGanttView** (`src/components/views/ReservationsGanttView.tsx`)

**Utilisation** : Vue calendrier timeline avec drag & drop

**Props** :
```typescript
interface ReservationsGanttViewProps {
  reservations: Reservation[];
  onUpdate: (reservationId: string, newDates: { checkIn: string; checkOut: string }) => void;
}
```

**Import** :
```typescript
import { ReservationsGanttView } from '../components/views/ReservationsGanttView';
```

**Exemple** :
```typescript
// Dans ta page Calendrier
<ReservationsGanttView
  reservations={filteredReservations}
  onUpdate={(reservationId, newDates) => {
    setReservations(prev => prev.map(r =>
      r.id === reservationId
        ? { ...r, checkIn: newDates.checkIn, checkOut: newDates.checkOut }
        : r
    ));
    toast.success('Dates mises à jour');
  }}
/>
```

---

### 4. **ColumnSelector** (`src/components/filters/ColumnSelector.tsx`)

**Utilisation** : Modal pour sélectionner colonnes visibles dans tableau

**Props** :
```typescript
interface ColumnSelectorProps {
  open: boolean;
  onClose: () => void;
  columns: Column[];
  onSave: (visibleColumns: string[]) => void;
}

interface Column {
  id: string;
  label: string;
  visible: boolean;
}
```

**Import** :
```typescript
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Exemple** :
```typescript
// Dans ta page Réservations
const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
const [visibleColumns, setVisibleColumns] = useState(['id', 'guest', 'listing', 'dates', 'status']);

<Button onClick={() => setColumnSelectorOpen(true)}>
  ⚙️ Colonnes
</Button>

<ColumnSelector
  open={columnSelectorOpen}
  onClose={() => setColumnSelectorOpen(false)}
  columns={ALL_COLUMNS.map(col => ({
    id: col.key,
    label: col.label,
    visible: visibleColumns.includes(col.key),
  }))}
  onSave={(newVisibleColumns) => {
    setVisibleColumns(newVisibleColumns);
    setColumnSelectorOpen(false);
    toast.success('Colonnes mises à jour');
  }}
/>
```

---

## 🎯 OÙ LES UTILISER

| Composant | Page | Où exactement |
|-----------|------|---------------|
| TravelersSection | ReservationsPage | Modal détail réservation (nouvel onglet "Voyageurs") |
| FinancialSection | ReservationsPage | Modal détail réservation (nouvel onglet "Finances") |
| ReservationsGanttView | CalendarPage | Vue alternative au calendrier grille |
| ColumnSelector | ReservationsPage | Bouton header "⚙️ Colonnes" |

---

## ✅ CHECKLIST INTÉGRATION

- [ ] Importer les 4 composants
- [ ] Ajouter TravelersSection dans modal réservation
- [ ] Ajouter FinancialSection dans modal réservation
- [ ] Ajouter toggle Grille/Gantt dans CalendarPage
- [ ] Ajouter bouton ColumnSelector dans header

---

**Les composants sont PRÊTS. Intègre-les maintenant !** 🚀
