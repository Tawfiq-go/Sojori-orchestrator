# ❌ MODALS MANQUANTS - NOUVEAU DASHBOARD

**Date** : 14 Mai 2026
**Auditeur** : Agent Audit
**Dashboards comparés** :
- **Ancien** : sojori-dashboard (52 modals)
- **Nouveau** : Sojori-orchestrator (6 modals seulement)

---

## 📊 RÉSUMÉ COMPARATIF

| Dashboard | Modals | Δ |
|-----------|--------|---|
| **Ancien (production)** | 52 modals | - |
| **Nouveau (Phase 2)** | 6 modals | -46 modals ❌ |

**Taux de couverture** : **11.5%** (6/52) ⚠️

---

## ✅ MODALS DÉJÀ PRÉSENTS DANS LE NOUVEAU (6)

1. ✅ **CreateReservationModal** (Agent 2) - Refait dans nouveau
2. ✅ **CreateTaskModal** (Agent 4) - Refait dans nouveau (29 champs)
3. ✅ **AddTeamMemberModal** (Agent 4) - Composant Claude Design
4. ✅ **BroadcastModal** (Agent 4/5) - Composant Claude Design
5. ✅ **EditPlanningModal** (Agent 4) - Composant Claude Design
6. ✅ **(Un 6ème non identifié clairement)** - Probablement un petit modal générique

---

## ❌ MODALS À CRÉER (46 modals manquants)

### 🔴 PRIORITÉ 1 - BLOQUANT BUSINESS (10 modals)

Ces modals sont **CRITIQUES** pour les opérations quotidiennes. Sans eux, le dashboard est **INUTILISABLE**.

#### Agent 1 - Orchestration (2 modals)

##### 1. AdminActionModal ⭐⭐⭐
- **Priorité** : BLOQUANT
- **Référence** : `sojori-dashboard/src/features/ultimateDashboard/components/orchestration/modals/AdminActionModal.jsx`
- **Pourquoi critique** :
  - Modal **GÉNÉRIQUE** utilisé pour TOUTES les actions admin orchestration
  - Système de fields dynamiques (type, label, validation configurable)
  - Utilisé pour : force check-in, override deadline, manual trigger, etc.
  - **Sans ce modal, la timeline orchestration est NON INTERACTIVE** (BUG-002)
- **Complexité** : ⭐⭐⭐⭐ (4/5) - Système générique complexe
- **Estimation** : 4-6 heures
- **Action** :
  1. Lire `/Users/gouacht/sojori-dashboard/src/features/ultimateDashboard/components/orchestration/modals/AdminActionModal.jsx`
  2. Comprendre le système de fields dynamiques
  3. Recréer dans `/Users/gouacht/Sojori-orchestrator/src/components/modals/AdminActionModal.tsx`
  4. Adapter au design Aurora Soft Light
  5. Intégrer dans OrchestrationPage pour les clics événements
  6. Tester toutes les actions (force check-in, override, etc.)

##### 2. ReservationDetailsModal (depuis timeline)
- **Priorité** : BLOQUANT
- **Référence** : Probablement réutilise des composants existants mais formaté comme modal
- **Pourquoi critique** :
  - Cliquer sur "RÉSA #1234" dans timeline DOIT ouvrir détails complets
  - **Actuellement : rien ne se passe** (BUG-002)
- **Complexité** : ⭐⭐⭐ (3/5) - Peut réutiliser ReservationSejourPage
- **Estimation** : 3-4 heures
- **Action** :
  1. Créer `/Users/gouacht/Sojori-orchestrator/src/components/modals/ReservationDetailsModal.tsx`
  2. Réutiliser le contenu de ReservationSejourPage mais en format modal
  3. Intégrer dans OrchestrationPage
  4. Brancher sur clic événements type='reservation'

---

#### Agent 2 - Réservations (4 modals)

##### 3. SyncReservationsModal ⭐⭐⭐
- **Priorité** : BLOQUANT
- **Référence** : `sojori-dashboard/src/features/reservation/components/sync/SyncReservationsModal.jsx`
- **Pourquoi critique** :
  - Synchronisation OTA (Airbnb, Booking.com, RU) est **ESSENTIELLE**
  - Sans sync, les réservations OTA ne peuvent pas être importées
  - **Impact business direct**
- **Complexité** : ⭐⭐⭐⭐⭐ (5/5) - Intégration OTA complexe
- **Estimation** : 8-12 heures (+ intégration API)
- **Action** :
  1. Lire référence ancien dashboard
  2. Identifier APIs sync OTA
  3. Créer modal avec : select OTA, date range, options sync, progress bar, logs
  4. Intégrer real-time updates durant sync
  5. Gérer erreurs et conflicts
  6. **NOTE** : Peut être différé en Phase 3 (APIs) si MOCK acceptable temporairement

##### 4. CheckInOutStatusModal ⭐⭐
- **Priorité** : BLOQUANT
- **Référence** : `sojori-dashboard/src/features/reservation/pages/components/checkInOut/CheckInOutStatusModal.jsx`
- **Pourquoi critique** :
  - Gérer check-in/check-out est opération quotidienne
  - Crée automatiquement tâches nettoyage
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures
- **Action** :
  1. Créer modal avec champs : actual time, guests present, room condition, notes, photos
  2. Brancher sur boutons check-in/out
  3. Créer tâche nettoyage automatiquement si check-out

##### 5. AddEditTravellerModal ⭐⭐
- **Priorité** : BLOQUANT (si TravelersSection utilisé)
- **Référence** : `sojori-dashboard/src/features/reservation/pages/components/componentsInfo/teaveller/AddEditTravellerModal.jsx`
- **Pourquoi critique** :
  - TravelersSection est intégré dans ReservationSejourPage
  - **Mais AUCUN modal pour ajouter/éditer voyageur**
  - Section inutilisable sans modal
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures
- **Action** :
  1. Créer modal avec champs voyageur (9 champs : nom, email, phone, DOB, nationality, passport, etc.)
  2. Validation Formik + Yup
  3. Intégrer dans TravelersSection

##### 6. CancelReservationModal ⭐⭐
- **Priorité** : BLOQUANT
- **Référence** : `sojori-dashboard/src/features/reservation/pages/components/mobile/details/modals/CancelReservationModal.jsx`
- **Pourquoi critique** :
  - Annulation réservation avec gestion refund
  - Opération fréquente
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

---

#### Agent 3 - Catalogue (2 modals)

##### 7. ImageGalleryModal ⭐⭐⭐
- **Priorité** : BLOQUANT
- **Référence** : `sojori-dashboard/src/components/ImageGalleryModal/ImageGalleryModal.jsx`
- **Pourquoi critique** :
  - **Impossible de voir photos listings sans ce modal**
  - Utilisé partout (listings, properties, etc.)
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures
- **Action** :
  1. Créer modal fullscreen ou large
  2. Carousel images (prev/next)
  3. Thumbnails en bas
  4. Actions : download, delete (admin)

##### 8. PdfViewerModal ⭐⭐
- **Priorité** : BLOQUANT
- **Référence** : `sojori-dashboard/src/features/listing/components/PdfViewerModal.jsx`
- **Pourquoi critique** :
  - **Impossible d'ouvrir contrats, factures, documents PDF**
  - Utilisé fréquemment
- **Complexité** : ⭐⭐ (2/5) - Peut utiliser lib react-pdf
- **Estimation** : 2-3 heures

---

#### Agent 5 - Communications (2 modals)

##### 9. MessageComposeModal ⭐⭐⭐
- **Priorité** : BLOQUANT
- **Référence** : `sojori-dashboard/src/features/chatboxV2/MessageComposeModal.jsx`
- **Pourquoi critique** :
  - **Impossible de composer nouveaux messages WhatsApp/OTA**
  - Actuellement, onSend branché sur pages mais pas de modal compose
- **Complexité** : ⭐⭐⭐⭐ (4/5)
- **Estimation** : 4-6 heures
- **Action** :
  1. Créer modal avec : recipient, template, message, attachments, schedule
  2. Preview variables
  3. Validation
  4. Intégrer dans CommsPage, OTAMessagesPage, StaffWhatsAppPage

##### 10. ReviewComposeModal ⭐⭐
- **Priorité** : BLOQUANT
- **Référence** : `sojori-dashboard/src/features/reviews/components/ReviewComposeModal.jsx`
- **Pourquoi critique** :
  - **Impossible d'écrire reviews pour guests**
  - Fonctionnalité importante pour réputation
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

---

### 🟡 PRIORITÉ 2 - IMPORTANT (16 modals)

Ces modals sont **IMPORTANTS** mais le dashboard peut fonctionner sans eux temporairement (fonctionnalités dégradées).

#### Agent 1 - Orchestration (3 modals)

##### 11. DeadlineExtensionModal
- **Priorité** : IMPORTANT
- **Référence** : `sojori-dashboard/src/features/ultimateDashboard/components/orchestration/modals/DeadlineExtensionModal.jsx`
- **Complexité** : ⭐⭐ (2/5)
- **Estimation** : 2-3 heures
- **Workaround** : Utiliser AdminActionModal générique

##### 12. ManualRegistrationModal
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

##### 13. StaffAutoAssignModal
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

---

#### Agent 2 - Réservations (6 modals)

##### 14. RegisterGuestModal
- **Priorité** : IMPORTANT
- **Référence** : `sojori-dashboard/src/features/reservation/pages/components/guest/RegisterGuestModal.jsx`
- **Complexité** : ⭐⭐⭐⭐ (4/5) - Upload documents
- **Estimation** : 4-6 heures

##### 15. GuestModal
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

##### 16. TravellerModal
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

##### 17. UnmappedReservationDialog
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

##### 18. ReservationModalCompact
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐ (2/5)
- **Estimation** : 2-3 heures

##### 19. MobileFiltersModal
- **Priorité** : IMPORTANT (si responsive mobile)
- **Complexité** : ⭐⭐ (2/5)
- **Estimation** : 2-3 heures

---

#### Agent 3 - Catalogue (5 modals)

##### 20. UpdateInventoryModal
- **Priorité** : IMPORTANT
- **Référence** : `sojori-dashboard/src/features/calendar/components/inventoryCalendarNew/UpdateInventoryModal.jsx`
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

##### 21. LeadDetailsModal
- **Priorité** : IMPORTANT
- **Référence** : `sojori-dashboard/src/features/lead/components/leadsDetails/LeadDetailsModal.jsx`
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

##### 22. AmenityViewModal
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐ (2/5)
- **Estimation** : 2-3 heures

##### 23. RoomSelectionModal
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

##### 24. ApiDetailModal (Channels)
- **Priorité** : IMPORTANT (debug)
- **Complexité** : ⭐⭐ (2/5)
- **Estimation** : 2-3 heures

---

#### Agent 5 - Communications (2 modals)

##### 25. MessageEditModal
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

##### 26. ReviewFormModal (RU)
- **Priorité** : IMPORTANT
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures

---

### 🟢 PRIORITÉ 3 - NICE TO HAVE (20 modals)

Ces modals sont **OPTIONNELS** et peuvent être créés plus tard (Phase 3+).

#### Agent 1 - Orchestration/Admin (3 modals)

##### 27. PendingChangesModal
- **Priorité** : NICE TO HAVE
- **Estimation** : 2 heures

##### 28. DLQManagerModal
- **Priorité** : NICE TO HAVE (monitoring)
- **Estimation** : 4-6 heures

##### 29. LogDetailModal
- **Priorité** : NICE TO HAVE (monitoring)
- **Estimation** : 3-4 heures

---

#### Agent 2 - Réservations (5 modals)

##### 30-34. Modals génériques
- DeleteConfirmModal (Reservation)
- DeleteConfirmationModal (Traveller)
- ConfirmationModal (Reservation)
- CreateReservationMobileModal
- Etc.
- **Priorité** : NICE TO HAVE
- **Estimation totale** : 8-12 heures

---

#### Agent 3 - Catalogue (8 modals)

##### 35-42. Modals configuration/admin
- AmenityLanguageModal
- AlertModal
- ConfirmationModal (Listing)
- DeleteInstanceModal
- ViewAllItemsModal
- RoomCompositionModal
- ListingCleaningServiceModal
- LeadModal
- **Priorité** : NICE TO HAVE
- **Estimation totale** : 12-16 heures

---

#### Agent 4 - Opérations (5 modals - TOUS P3)

**NOTE** : Agent 4 a déjà bien travaillé (CreateTaskModal, AddTeamMemberModal, etc.)

##### 43. TaskEditModal
- **Priorité** : NICE TO HAVE
- **Complexité** : ⭐⭐⭐ (3/5)
- **Estimation** : 3-4 heures
- **Workaround** : Réutiliser CreateTaskModal en mode édition

##### 44-47. Autres modals ops
- TaskConfigModal
- TicketsModal
- UnitModal
- DeleteConfirmationModal (Project Units)
- **Priorité** : NICE TO HAVE
- **Estimation totale** : 8-12 heures

---

#### Agent 5 - Communications (4 modals)

##### 48-52. Settings & Admin
- WidgetModal (Distribution)
- DebugModalOptimized (AI Lab)
- 6× Settings modals (Cancellation, Stories, Templates, WhatsApp Config)
- **Priorité** : NICE TO HAVE
- **Estimation totale** : 10-15 heures

---

## 📊 RÉCAPITULATIF PAR AGENT

### 🔵 Agent 1 - Orchestration

| Priorité | Modals | Estimation |
|----------|--------|------------|
| P1 (Bloquant) | 2 | 7-10h |
| P2 (Important) | 3 | 8-11h |
| P3 (Nice to have) | 3 | 9-13h |
| **TOTAL** | **8** | **24-34h** |

**P1 à faire IMMÉDIATEMENT** :
1. ✅ AdminActionModal (4-6h) ⭐⭐⭐
2. ✅ ReservationDetailsModal (3-4h) ⭐⭐

**Total P1** : **7-10 heures**

---

### 🟢 Agent 2 - Réservations

| Priorité | Modals | Estimation |
|----------|--------|------------|
| P1 (Bloquant) | 4 | 17-24h |
| P2 (Important) | 6 | 16-22h |
| P3 (Nice to have) | 5 | 8-12h |
| **TOTAL** | **15** | **41-58h** |

**P1 à faire IMMÉDIATEMENT** :
1. ✅ SyncReservationsModal (8-12h) ⭐⭐⭐ (peut être P2 si MOCK OK)
2. ✅ CheckInOutStatusModal (3-4h) ⭐⭐
3. ✅ AddEditTravellerModal (3-4h) ⭐⭐
4. ✅ CancelReservationModal (3-4h) ⭐⭐

**Total P1** : **17-24 heures** (ou 9-12h si SyncReservationsModal → P2)

**NOTE** : **Agent 2 a le plus de travail** (15 modals manquants sur 15 existants dans l'ancien)

**IMPORTANT** : Ne pas oublier **BUG-003 : Vue Séjour manquante** (page complète, pas juste modal)

---

### 🟣 Agent 3 - Catalogue

| Priorité | Modals | Estimation |
|----------|--------|------------|
| P1 (Bloquant) | 2 | 5-7h |
| P2 (Important) | 5 | 13-18h |
| P3 (Nice to have) | 8 | 12-16h |
| **TOTAL** | **15** | **30-41h** |

**P1 à faire IMMÉDIATEMENT** :
1. ✅ ImageGalleryModal (3-4h) ⭐⭐⭐
2. ✅ PdfViewerModal (2-3h) ⭐⭐

**Total P1** : **5-7 heures**

**NOTE** : Agent 3 doit aussi corriger **BUG-001 : ChannelsDashboard** (2h)

---

### 🟡 Agent 4 - Opérations

| Priorité | Modals | Estimation |
|----------|--------|------------|
| P1 (Bloquant) | 0 | 0h |
| P2 (Important) | 0 | 0h |
| P3 (Nice to have) | 5 | 8-12h |
| **TOTAL** | **5** | **8-12h** |

**P1 à faire IMMÉDIATEMENT** : **AUCUN** ✅

**EXCELLENT TRAVAIL Agent 4** 🎉 - Tu as déjà créé les modals essentiels (CreateTaskModal, AddTeamMemberModal, etc.)

**NOTE** : Agent 4 doit corriger **BUG-007 : TeamPageOld.tsx** (1h) et erreurs Stack props (2h)

---

### 🟠 Agent 5 - Communications

| Priorité | Modals | Estimation |
|----------|--------|------------|
| P1 (Bloquant) | 2 | 7-10h |
| P2 (Important) | 2 | 6-8h |
| P3 (Nice to have) | 10 | 10-15h |
| **TOTAL** | **14** | **23-33h** |

**P1 à faire IMMÉDIATEMENT** :
1. ✅ MessageComposeModal (4-6h) ⭐⭐⭐
2. ✅ ReviewComposeModal (3-4h) ⭐⭐

**Total P1** : **7-10 heures**

---

## 📈 TABLEAU RÉCAPITULATIF GLOBAL

| Agent | P1 (Bloquant) | P2 (Important) | P3 (Nice to have) | TOTAL Modals | TOTAL Heures |
|-------|---------------|----------------|-------------------|--------------|--------------|
| **Agent 1** | 2 (7-10h) | 3 (8-11h) | 3 (9-13h) | 8 | 24-34h |
| **Agent 2** | 4 (17-24h) | 6 (16-22h) | 5 (8-12h) | 15 | 41-58h |
| **Agent 3** | 2 (5-7h) | 5 (13-18h) | 8 (12-16h) | 15 | 30-41h |
| **Agent 4** | 0 (0h) | 0 (0h) | 5 (8-12h) | 5 | 8-12h |
| **Agent 5** | 2 (7-10h) | 2 (6-8h) | 10 (10-15h) | 14 | 23-33h |
| **TOTAL** | **10 (36-51h)** | **16 (43-59h)** | **31 (47-68h)** | **57** | **126-178h** |

**Estimation globale** : **126-178 heures** (15-22 jours-personne)

---

## 🚀 PLAN D'ACTION RECOMMANDÉ

### Phase 1 - BLOQUANTS (P1) : 1-2 semaines

**Objectif** : Dashboard fonctionnel minimum viable

**Priorité absolue - Faire EN PREMIER** :

1. **Agent 1** :
   - ✅ AdminActionModal (4-6h)
   - ✅ ReservationDetailsModal (3-4h)
   - ✅ Corriger BUG-005 : Error Boundary (1h)
   - **Total** : **8-11h**

2. **Agent 2** :
   - ✅ CheckInOutStatusModal (3-4h)
   - ✅ AddEditTravellerModal (3-4h)
   - ✅ CancelReservationModal (3-4h)
   - ✅ **BUG-003 : Recréer Vue Séjour** (4-6h) ⭐⭐⭐
   - SyncReservationsModal → **DIFFÉRER en Phase 3 (APIs)**
   - **Total** : **13-18h**

3. **Agent 3** :
   - ✅ ImageGalleryModal (3-4h)
   - ✅ PdfViewerModal (2-3h)
   - ✅ Corriger BUG-001 : ChannelsDashboard (2h)
   - **Total** : **7-9h**

4. **Agent 4** :
   - ✅ Corriger BUG-007 : TeamPageOld.tsx (1h)
   - ✅ Corriger erreurs Stack props (2h)
   - **Total** : **3h**

5. **Agent 5** :
   - ✅ MessageComposeModal (4-6h)
   - ✅ ReviewComposeModal (3-4h)
   - **Total** : **7-10h**

**TOUS LES AGENTS** :
- ✅ Corriger BUG-006 : Lint (68 erreurs) → **2-3h chacun**

**Total Phase 1** : **48-61 heures** (~6-8 jours si tous les agents travaillent en parallèle)

---

### Phase 2 - IMPORTANT (P2) : 1-2 semaines

**Objectif** : Dashboard complet et confortable

- Agent 1 : 3 modals (8-11h)
- Agent 2 : 6 modals (16-22h)
- Agent 3 : 5 modals (13-18h)
- Agent 5 : 2 modals (6-8h)

**Total Phase 2** : **43-59 heures**

---

### Phase 3 - NICE TO HAVE : En continu

**Objectif** : Dashboard avec toutes les fonctionnalités avancées

- Tous agents : 31 modals (47-68h)
- + Intégration APIs réelles
- + Tests
- + Monitoring/Admin tools

---

## ⚠️ NOTES IMPORTANTES

### Pour TOUS les agents

1. **AVANT de créer un modal** :
   - Lire le fichier référence dans `/Users/gouacht/sojori-dashboard`
   - Comprendre EXACTEMENT le comportement
   - S'inspirer du code existant (ne PAS réinventer)
   - Adapter au design Aurora Soft Light

2. **Structure recommandée** :
   ```
   /Users/gouacht/Sojori-orchestrator/src/components/modals/
   ├── AdminActionModal.tsx
   ├── ReservationDetailsModal.tsx
   ├── MessageComposeModal.tsx
   ├── ImageGalleryModal.tsx
   ├── ... (autres modals)
   ```

3. **Imports Material-UI v9** :
   - ⚠️ Props `alignItems`, `justifyContent` → dans `sx`
   - ⚠️ TextField `InputProps` → `slotProps={{ input: { ... } }}`

4. **Validation** :
   - Utiliser Formik + Yup (comme dans l'ancien)
   - Ou Zod si préférence

5. **Toasts** :
   - Utiliser le système de toasts existant (ActionToast?)
   - Success / Error / Warning selon action

6. **LocalStorage (MOCK)** :
   - Pour Phase 2, stocker data dans localStorage
   - Clés format : `sojori_reservations`, `sojori_tasks`, etc.

---

### Agent 1 - CRITIQUE ⚠️

Tu as la **MISSION LA PLUS CRITIQUE** :
- AdminActionModal est utilisé PARTOUT dans orchestration
- Sans ce modal, la timeline est une **BELLE UI MORTE**
- **FAIS CE MODAL EN PREMIER** avant tout le reste

**Système de fields dynamiques** :
```typescript
interface Field {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'datetime' | 'number';
  label: string;
  required?: boolean;
  validate?: (value: any) => string | undefined;
  options?: { label: string, value: any }[]; // si type='select'
}

interface AdminActionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, any>) => void;
  title: string;
  fields: Field[];
  actionLabel?: string;
  isLoading?: boolean;
  error?: string | null;
}
```

**Exemple d'usage** :
```typescript
<AdminActionModal
  open={showModal}
  onClose={() => setShowModal(false)}
  onSubmit={(data) => console.log('Force check-in:', data)}
  title="Force Check-in"
  fields={[
    { name: 'reason', type: 'textarea', label: 'Raison', required: true },
    { name: 'time', type: 'datetime', label: 'Heure check-in', required: true },
    { name: 'notify', type: 'checkbox', label: 'Notifier le guest' }
  ]}
  actionLabel="Forcer check-in"
/>
```

---

### Agent 2 - TRAVAIL MASSIF ⚠️

Tu as **LE PLUS DE MODALS MANQUANTS** (15 sur 15).

**Priorisation** :
1. **D'ABORD** : Recréer **Vue Séjour** (BUG-003) - Page complète, pas modal
2. **PUIS** : CheckInOutStatusModal, AddEditTravellerModal, CancelReservationModal
3. **ENSUITE** : Autres modals P1
4. **DIFFÉRER** : SyncReservationsModal en Phase 3 (intégration OTA complexe)

**Ne te décourage pas** : CreateReservationModal (25+ champs) est DÉJÀ fait ✅

---

### Agent 3 - BON ÉQUILIBRE

Tu as déjà bien intégré les composants Claude Design (PricingRulesEditor, ChannelsDashboard).

**Priorités** :
1. **D'ABORD** : Corriger BUG-001 (ChannelsDashboard Stack props) - 2h
2. **PUIS** : ImageGalleryModal (utilisé PARTOUT)
3. **PUIS** : PdfViewerModal (utilisé PARTOUT)

---

### Agent 4 - EXCELLENT TRAVAIL 🎉

Tu as le **MOINS de modals manquants** (5 sur 5) et TOUS sont P3 (nice to have).

**Tes priorités** :
1. ✅ Corriger BUG-007 : TeamPageOld.tsx (décider : supprimer OU corriger)
2. ✅ Corriger erreurs Stack props TasksPage, TeamPage
3. ✅ Lint (nettoyer imports non utilisés)
4. **PUIS** : Aide les autres agents si disponible

---

### Agent 5 - COMMUNICATIONS CRITIQUES

**Priorités** :
1. **D'ABORD** : MessageComposeModal (CRITIQUE - compose WhatsApp/OTA)
2. **PUIS** : ReviewComposeModal (IMPORTANT - reviews guests)
3. **ENSUITE** : MessageEditModal, ReviewFormModal (P2)

---

## 📋 CHECKLIST VALIDATION (Avant Phase 3)

**Build & Lint** :
- [ ] Type-check OK (0 erreur)
- [ ] Build OK (0 erreur)
- [ ] Lint OK (0 erreur)

**Modals P1 (10 modals)** :
- [ ] AdminActionModal (Agent 1)
- [ ] ReservationDetailsModal (Agent 1)
- [ ] CheckInOutStatusModal (Agent 2)
- [ ] AddEditTravellerModal (Agent 2)
- [ ] CancelReservationModal (Agent 2)
- [ ] ImageGalleryModal (Agent 3)
- [ ] PdfViewerModal (Agent 3)
- [ ] MessageComposeModal (Agent 5)
- [ ] ReviewComposeModal (Agent 5)

**Bugs critiques** :
- [ ] BUG-001 : Build échoue → CORRIGÉ
- [ ] BUG-002 : Boutons Orchestration → CORRIGÉ
- [ ] BUG-003 : Vue Séjour → CRÉÉE
- [ ] BUG-005 : Error Boundary → AJOUTÉ
- [ ] BUG-006 : Lint → CORRIGÉ
- [ ] BUG-007 : TeamPageOld → CORRIGÉ

**Fonctionnel** :
- [ ] Timeline orchestration INTERACTIVE
- [ ] Vue Séjour disponible
- [ ] Photos listings visibles (ImageGalleryModal)
- [ ] PDFs ouverts (PdfViewerModal)
- [ ] Messages WhatsApp composables
- [ ] Reviews guests composables
- [ ] Check-in/out géré
- [ ] Voyageurs ajoutables/éditables

**SI TOUT OK** → ✅ **Phase 3 : Connexion APIs**

---

## 🎯 CONCLUSION

**État actuel** : **11.5% modals présents** (6/52)

**Après Phase 1 (P1)** : **~31% modals présents** (16/52)
- Dashboard **FONCTIONNEL** pour opérations critiques

**Après Phase 2 (P1+P2)** : **~50% modals présents** (26/52)
- Dashboard **COMPLET ET CONFORTABLE**

**Après Phase 3 (P1+P2+P3)** : **100% modals présents** (52/52)
- Dashboard **IDENTIQUE à l'ancien** (avec design amélioré)

**Estimation totale corrections** : **126-178 heures** (15-22 jours-personne)

**SI tous les agents travaillent en parallèle** : **~3 semaines** pour atteindre 100%

**RECOMMANDATION** : **Prioriser P1** (1-2 semaines) puis **valider avec utilisateurs** avant de continuer P2/P3.

---

**FIN DOCUMENT MODALS MANQUANTS**

Auditeur : **Agent Audit**
Date : **14 Mai 2026**
Durée audit : **3 heures**

**Prochaine étape** : Distribuer ce document aux agents pour corrections Phase 1 (P1)
