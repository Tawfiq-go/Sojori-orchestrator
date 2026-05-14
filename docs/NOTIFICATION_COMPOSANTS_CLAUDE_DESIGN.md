# 🎨 NOTIFICATION - COMPOSANTS CLAUDE DESIGN DISPONIBLES

**Date** : 14 Mai 2026
**Statut** : ✅ **TOUS LES COMPOSANTS LIVRÉS ET INTÉGRÉS**

---

## 📦 COMPOSANTS DISPONIBLES (11 au total)

### 🔹 MODALS (`src/components/modals/`)

1. **AddTeamMemberModal.tsx** (17 champs)
   - Tabs : Profil / Planning / Documents
   - Props : `open`, `onClose`, `onSave`, `member?` (pour édition)
   - Usage : Agent 4 - Team

2. **EditPlanningModal.tsx**
   - Présent/Absent toggle
   - Array timings (add/remove)
   - Copier vers autres jours
   - Props : `open`, `onClose`, `staffId`, `date`, `currentPlanning`, `onSave`
   - Usage : Agent 4 - Planning

3. **BroadcastModal.tsx**
   - Sélection multi-destinataires (checkboxes)
   - Textarea message
   - Props : `open`, `onClose`, `staffList`, `onSend`
   - Usage : Agent 4 & 5 - Staff WhatsApp

---

### 🔹 PANELS (`src/components/panels/`)

4. **StaffTasksPanel.tsx** (Drawer 400px)
   - Liste tâches du staff sélectionné
   - Filtres rapides (status)
   - Props : `open`, `onClose`, `staffId`, `tasks[]`
   - Usage : Agent 4 - Staff WhatsApp

---

### 🔹 SECTIONS (`src/components/sections/`)

5. **TravelersSection.tsx**
   - Liste voyageurs avec statuts (COMPLETE/DRAFT/NOT_REGISTERED)
   - CRUD voyageurs
   - Upload passeport (MOCK)
   - Props : `reservationId`, `travelers[]`, `onUpdate`
   - Usage : Agent 2 - Réservations

6. **FinancialSection.tsx**
   - Détails financiers réservation
   - Calculs automatiques (commission, total)
   - Props : `reservation`, `onUpdate`
   - Usage : Agent 2 - Réservations

---

### 🔹 FILTERS (`src/components/filters/`)

7. **AdvancedTaskFilters.tsx** (15 filtres)
   - Accordion organisation
   - Multi-select (subTypes, statuses, zones)
   - Badge count filtres actifs
   - Reset button
   - Props : `filters`, `onFiltersChange`
   - Usage : Agent 4 - Tasks

8. **ColumnSelector.tsx**
   - Modal sélection colonnes visibles
   - Drag & drop ordre (optionnel)
   - Props : `open`, `onClose`, `columns[]`, `onSave`
   - Usage : Agent 2, 3, 4 - Tous tableaux

---

### 🔹 VIEWS (`src/components/views/`)

9. **ReservationsGanttView.tsx**
   - Vue Gantt timeline réservations
   - Drag & drop dates
   - Props : `reservations[]`, `onUpdate`
   - Usage : Agent 2 - Calendrier

---

### 🔹 PRICING (`src/components/pricing/`)

10. **PricingRulesEditor.tsx** (6 familles)
    - Tabs : Month/Weekday/Events/Occupancy/LongStay/LastMinute
    - Formulaires par famille
    - Switch actif/inactif
    - Props : `listingId`, `rules`, `onSave`
    - Usage : Agent 3 - Pricing

---

### 🔹 CHANNELS (`src/components/channels/`)

11. **ChannelsDashboard.tsx** (5 tabs)
    - Tabs : Summary/Business/Debug/Cron/Mapping
    - Tableaux par tab
    - CRUD mapping RU
    - Props : `data`, `onAction`
    - Usage : Agent 3 - Channels

---

## 📋 INSTRUCTIONS POUR CHAQUE AGENT

### 🎯 AGENT 2 - RÉSERVATIONS

**Composants à utiliser** :
- ✅ `TravelersSection` - Dans détail réservation
- ✅ `FinancialSection` - Dans détail réservation
- ✅ `ReservationsGanttView` - Vue calendrier alternative
- ✅ `ColumnSelector` - Configure colonnes table

**Import** :
```typescript
import { TravelersSection } from '../components/sections/TravelersSection';
import { FinancialSection } from '../components/sections/FinancialSection';
import { ReservationsGanttView } from '../components/views/ReservationsGanttView';
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Exemple d'utilisation** :
```typescript
// Dans ReservationsPage.tsx - détail modal
<TravelersSection
  reservationId={selectedReservation.id}
  travelers={selectedReservation.travelers}
  onUpdate={(travelers) => handleUpdateTravelers(travelers)}
/>

<FinancialSection
  reservation={selectedReservation}
  onUpdate={(financial) => handleUpdateFinancial(financial)}
/>
```

---

### 🏠 AGENT 3 - CATALOGUE

**Composants à utiliser** :
- ✅ `PricingRulesEditor` - Page pricing
- ✅ `ChannelsDashboard` - Page channels
- ✅ `ColumnSelector` - Configure colonnes listings/clients

**Import** :
```typescript
import { PricingRulesEditor } from '../components/pricing/PricingRulesEditor';
import { ChannelsDashboard } from '../components/channels/ChannelsDashboard';
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Exemple d'utilisation** :
```typescript
// Dans PricingPage.tsx
<PricingRulesEditor
  listingId={selectedListing.id}
  rules={pricingRules}
  onSave={(rules) => handleSavePricingRules(rules)}
/>

// Dans ChannelsPage.tsx
<ChannelsDashboard
  data={channelsData}
  onAction={(action, payload) => handleChannelAction(action, payload)}
/>
```

---

### ✅ AGENT 4 - OPÉRATIONS

**Composants à utiliser** :
- ✅ `AddTeamMemberModal` - Ajouter/éditer membre team
- ✅ `EditPlanningModal` - Modifier planning
- ✅ `BroadcastModal` - Broadcast staff
- ✅ `StaffTasksPanel` - Panneau tâches staff
- ✅ `AdvancedTaskFilters` - Filtres avancés tasks
- ✅ `ColumnSelector` - Configure colonnes tasks/team

**Import** :
```typescript
import { AddTeamMemberModal } from '../components/modals/AddTeamMemberModal';
import { EditPlanningModal } from '../components/modals/EditPlanningModal';
import { BroadcastModal } from '../components/modals/BroadcastModal';
import { StaffTasksPanel } from '../components/panels/StaffTasksPanel';
import { AdvancedTaskFilters } from '../components/filters/AdvancedTaskFilters';
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Exemple d'utilisation** :
```typescript
// Dans TeamPage.tsx
<AddTeamMemberModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  onSave={(member) => handleAddMember(member)}
  member={selectedMember} // Si édition
/>

// Dans PlanningPage.tsx
<EditPlanningModal
  open={planningModalOpen}
  onClose={() => setPlanningModalOpen(false)}
  staffId={selectedStaff.id}
  date={selectedDate}
  currentPlanning={currentPlanning}
  onSave={(planning) => handleSavePlanning(planning)}
/>

// Dans StaffWhatsAppPage.tsx
<BroadcastModal
  open={broadcastOpen}
  onClose={() => setBroadcastOpen(false)}
  staffList={STAFF_LIST}
  onSend={(recipients, message) => handleBroadcast(recipients, message)}
/>

<StaffTasksPanel
  open={tasksPanelOpen}
  onClose={() => setTasksPanelOpen(false)}
  staffId={selectedStaff.id}
  tasks={staffTasks}
/>

// Dans TasksPage.tsx
<AdvancedTaskFilters
  filters={filters}
  onFiltersChange={(newFilters) => setFilters(newFilters)}
/>
```

---

### 💬 AGENT 5 - COMMUNICATIONS

**Composants à utiliser** :
- ✅ `BroadcastModal` - Broadcast staff (si pas déjà fait par Agent 4)
- ✅ `ColumnSelector` - Configure colonnes reviews/requests

**Import** :
```typescript
import { BroadcastModal } from '../components/modals/BroadcastModal';
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Exemple d'utilisation** :
```typescript
// Dans StaffWhatsAppPage.tsx (si pas déjà intégré par Agent 4)
<BroadcastModal
  open={broadcastModalOpen}
  onClose={() => setBroadcastModalOpen(false)}
  staffList={STAFF_LIST}
  onSend={(recipients, message) => handleBroadcast(recipients, message)}
/>
```

---

## ✅ VÉRIFICATION INTÉGRATION

**Avant d'utiliser un composant** :

1. ✅ Vérifier que le fichier existe : `ls src/components/[category]/[ComponentName].tsx`
2. ✅ Lire les props attendues (TypeScript interfaces au début du fichier)
3. ✅ Importer le composant
4. ✅ Passer les props MOCK
5. ✅ Tester en local

**Si erreur TypeScript** :
- Vérifier que tous les imports sont corrects
- Vérifier que les props correspondent aux interfaces
- Vérifier que les MOCK data ont la bonne structure

---

## 📊 ÉTAT D'INTÉGRATION PAR AGENT

| Agent | Composants à intégrer | Statut |
|-------|----------------------|--------|
| Agent 2 | 4 composants | ⏳ En attente |
| Agent 3 | 3 composants | ⏳ En attente |
| Agent 4 | 6 composants | ⏳ En attente |
| Agent 5 | 2 composants | ⏳ En attente |

---

## 🎯 PROCHAINES ÉTAPES

**Pour chaque agent** :

1. ✅ Lire cette notification
2. ✅ Identifier les composants nécessaires pour sa partie
3. ✅ Intégrer les composants dans ses pages
4. ✅ Tester localement
5. ✅ Commit + push

**Tous les composants sont PRÊTS et DISPONIBLES maintenant !** 🚀
