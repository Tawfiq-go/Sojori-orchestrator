# 🎨 COMPOSANTS CLAUDE DESIGN - DISPONIBLES POUR TOUS

**Date** : 14 Mai 2026
**Statut** : ✅ **11 COMPOSANTS LIVRÉS ET INTÉGRÉS DANS LE REPO**

Claude Design a terminé. Les composants sont dans `src/components/`.

---

## 📦 CE QUI EST DISPONIBLE

**11 composants prêts** :
- 3 Modals
- 1 Panel
- 2 Sections
- 2 Filters
- 1 View
- 1 Pricing Editor
- 1 Channels Dashboard

**TOUS en TypeScript + Material-UI v9 + MOCK data + Responsive**

---

## 🎯 POUR TOI (quel que soit ton agent)

**1. Lis cette section pour TON domaine :**

### Si tu es **Agent 2 - RÉSERVATIONS**

**Tes composants** (4) :
- ✅ `TravelersSection` → Dans détail réservation (onglet Voyageurs)
- ✅ `FinancialSection` → Dans détail réservation (onglet Finances)
- ✅ `ReservationsGanttView` → Vue calendrier Gantt (alternative grille)
- ✅ `ColumnSelector` → Bouton header "⚙️ Colonnes"

**Import** :
```typescript
import { TravelersSection } from '../components/sections/TravelersSection';
import { FinancialSection } from '../components/sections/FinancialSection';
import { ReservationsGanttView } from '../components/views/ReservationsGanttView';
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Utilisation rapide** :
```typescript
// Dans modal détail réservation
<TravelersSection
  reservationId={reservation.id}
  travelers={reservation.travelers}
  onUpdate={(travelers) => handleUpdate(travelers)}
/>

<FinancialSection
  reservation={reservation}
  onUpdate={(financial) => handleUpdate(financial)}
/>

// Dans CalendarPage
<ReservationsGanttView
  reservations={reservations}
  onUpdate={(id, dates) => handleUpdateDates(id, dates)}
/>
```

---

### Si tu es **Agent 3 - CATALOGUE**

**Tes composants** (3) :
- ✅ `PricingRulesEditor` → Page pricing (6 tabs : Month/Weekday/Events/Occupancy/LongStay/LastMinute)
- ✅ `ChannelsDashboard` → Page channels (5 tabs : Summary/Business/Debug/Cron/Mapping)
- ✅ `ColumnSelector` → Bouton header listings/clients

**Import** :
```typescript
import { PricingRulesEditor } from '../components/pricing/PricingRulesEditor';
import { ChannelsDashboard } from '../components/channels/ChannelsDashboard';
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Utilisation rapide** :
```typescript
// Dans PricingPage
<PricingRulesEditor
  listingId={listing.id}
  rules={pricingRules}
  onSave={(rules) => handleSave(rules)}
/>

// Dans ChannelsPage
<ChannelsDashboard
  data={channelsData}
  onAction={(action, payload) => handleAction(action, payload)}
/>
```

---

### Si tu es **Agent 4 - OPÉRATIONS**

**Tes composants** (6) :
- ✅ `AddTeamMemberModal` → Ajouter/éditer membre team (17 champs, 3 tabs)
- ✅ `EditPlanningModal` → Modifier planning staff
- ✅ `BroadcastModal` → Broadcast message staff
- ✅ `StaffTasksPanel` → Drawer tâches staff (400px)
- ✅ `AdvancedTaskFilters` → Filtres avancés tasks (15 filtres, Accordion)
- ✅ `ColumnSelector` → Bouton header tasks/team

**Import** :
```typescript
import { AddTeamMemberModal } from '../components/modals/AddTeamMemberModal';
import { EditPlanningModal } from '../components/modals/EditPlanningModal';
import { BroadcastModal } from '../components/modals/BroadcastModal';
import { StaffTasksPanel } from '../components/panels/StaffTasksPanel';
import { AdvancedTaskFilters } from '../components/filters/AdvancedTaskFilters';
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Utilisation rapide** :
```typescript
// Dans TeamPage
<AddTeamMemberModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  onSave={(member) => handleSave(member)}
  member={selectedMember} // Si édition
/>

// Dans PlanningPage
<EditPlanningModal
  open={planningModalOpen}
  onClose={() => setPlanningModalOpen(false)}
  staffId={staff.id}
  date={date}
  currentPlanning={planning}
  onSave={(planning) => handleSave(planning)}
/>

// Dans StaffWhatsAppPage
<BroadcastModal
  open={broadcastOpen}
  onClose={() => setBroadcastOpen(false)}
  staffList={staffList}
  onSend={(recipients, message) => handleBroadcast(recipients, message)}
/>

<StaffTasksPanel
  open={panelOpen}
  onClose={() => setPanelOpen(false)}
  staffId={staffId}
  tasks={tasks}
/>

// Dans TasksPage
<AdvancedTaskFilters
  filters={filters}
  onFiltersChange={(newFilters) => setFilters(newFilters)}
/>
```

---

### Si tu es **Agent 5 - COMMUNICATIONS**

**Tes composants** (2) :
- ✅ `BroadcastModal` → Broadcast staff (si Agent 4 ne l'a pas déjà fait)
- ✅ `ColumnSelector` → Bouton header reviews/requests

**Import** :
```typescript
import { BroadcastModal } from '../components/modals/BroadcastModal';
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Utilisation rapide** :
```typescript
// Dans StaffWhatsAppPage (si pas fait par Agent 4)
<BroadcastModal
  open={broadcastOpen}
  onClose={() => setBroadcastOpen(false)}
  staffList={staffList}
  onSend={(recipients, message) => handleBroadcast(recipients, message)}
/>
```

---

## ✅ COMMENT LES INTÉGRER

**Étape 1** : Vérifie que le composant existe
```bash
ls src/components/[category]/[ComponentName].tsx
```

**Étape 2** : Lis les props (début du fichier .tsx)
```typescript
// Toujours au début du fichier
interface ComponentNameProps {
  prop1: string;
  prop2: number;
  // ...
}
```

**Étape 3** : Importe le composant
```typescript
import { ComponentName } from '../components/[category]/ComponentName';
```

**Étape 4** : Utilise-le avec MOCK data
```typescript
<ComponentName
  prop1="valeur MOCK"
  prop2={123}
  onAction={(data) => {
    // MOCK save
    toast.success('Action réussie');
  }}
/>
```

**Étape 5** : Teste localement
```bash
pnpm dev --port 4000
# Ouvre http://localhost:4000
```

---

## 📋 CHECKLIST

### Agent 2
- [ ] Intégrer TravelersSection
- [ ] Intégrer FinancialSection
- [ ] Intégrer ReservationsGanttView
- [ ] Intégrer ColumnSelector

### Agent 3
- [ ] Intégrer PricingRulesEditor
- [ ] Intégrer ChannelsDashboard
- [ ] Intégrer ColumnSelector

### Agent 4
- [ ] Intégrer AddTeamMemberModal
- [ ] Intégrer EditPlanningModal
- [ ] Intégrer BroadcastModal
- [ ] Intégrer StaffTasksPanel
- [ ] Intégrer AdvancedTaskFilters
- [ ] Intégrer ColumnSelector

### Agent 5
- [ ] Intégrer BroadcastModal (si besoin)
- [ ] Intégrer ColumnSelector

---

## 🚀 ACTION IMMÉDIATE

**1. Lis la section de TON agent (2, 3, 4 ou 5)**

**2. Importe TES composants**

**3. Intègre-les dans TES pages**

**4. Teste localement**

**5. Commit + push quand ça marche**

---

**Tous les composants sont PRÊTS. Intègre-les MAINTENANT !** 🎨
