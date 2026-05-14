# 🔍 AUDIT MODALS AGENT 2 - AUTO-AUDIT

**Date**: 14 Mai 2026
**Agent**: Agent 2 - Réservations + Calendrier
**Méthode**: Auto-audit de l'ancien dashboard `/Users/gouacht/sojori-dashboard`

---

## 📦 MODALS IDENTIFIÉS DANS L'ANCIEN DASHBOARD

### 🎫 RÉSERVATIONS - Modals existants dans `/src/features/reservation`

#### 1. ✅ CreateReservationModal.jsx (DÉJÀ FAIT Phase 2)
**Emplacement ancien**: `src/features/reservation/pages/components/modals/CreateReservationModal.jsx`
**Emplacement nouveau**: `src/components/modals/CreateReservationModal.tsx` ✅
**Status**: **DÉJÀ INTÉGRÉ** dans Phase 2

**Fonctionnalités** (anciennes):
- 20+ champs (vs 19 dans le nouveau)
- Validation Yup complète
- 3 modes de pricing: `calendar` | `perDay` | `total`
- Auto-fetch listings et room types via API
- Formik + Material-UI
- Schema complet avec adultes/enfants/infants
- Status: Pending/Confirmed
- Payment: Paid/UnPaid + cash/bank_card

**Différences avec le nouveau**:
- ✅ Nouveau: Design Aurora Soft Light (#e6b022)
- ❌ Nouveau: Mode pricing simplifié (pas de 3 modes)
- ❌ Nouveau: Pas de validation Yup
- ❌ Nouveau: MOCK data (pas d'API fetch)

---

#### 2. ❌ CheckInOutStatusModal.jsx (**MANQUANT**)
**Emplacement ancien**: `src/features/reservation/pages/components/checkInOut/CheckInOutStatusModal.jsx`
**Emplacement nouveau**: **N'EXISTE PAS** ❌

**Fonctionnalités**:
- 2 checkboxes: Check-in Confirmed / Check-out Confirmed
- Update via API `onUpdate(reservationId, updateData)`
- Toast notifications success/error
- Dialog Material-UI avec DialogTitle aquamarine

**Usage**:
- Appelé depuis page détail réservation
- Permet de confirmer arrivée/départ guest

**Priorité**: **P1 - CRITIQUE**
**Action**: À créer dans `src/components/modals/CheckInOutStatusModal.tsx`

---

#### 3. ❌ CancelReservationModal.jsx (**MANQUANT**)
**Emplacement ancien**: `src/features/reservation/pages/components/mobile/details/modals/CancelReservationModal.jsx`
**Emplacement nouveau**: **N'EXISTE PAS** ❌

**Fonctionnalités**:
- Select dropdown avec 6 raisons d'annulation:
  1. Demande du client
  2. Problème avec la propriété
  3. Surbooking
  4. Problème de paiement
  5. Force majeure
  6. Autre raison
- Checkbox "Notifier le guest" (default: true)
- Validation: raison obligatoire
- Alert warning avec icône
- Confirmation avant annulation

**Usage**:
- Depuis menu actions réservation (⋮)
- Depuis page détail réservation

**Priorité**: **P1 - CRITIQUE**
**Action**: À créer dans `src/components/modals/CancelReservationModal.tsx`

---

#### 4. ❌ AddEditTravellerModal.jsx (**MANQUANT - mais TravelersSection existe**)
**Emplacement ancien**: `src/features/reservation/pages/components/componentsInfo/teaveller/AddEditTravellerModal.jsx`
**Emplacement nouveau**: **Modal interne dans TravelersSection.tsx** (Phase 1)

**Status**: **PARTIELLEMENT FAIT**
- ✅ Phase 1: TravelersSection avec modal Add/Edit simple
- ✅ Phase 2: TravelersSection Claude Design avec tabs et cards
- ❌ Modal standalone manquant

**Fonctionnalités** (ancien):
- Formulaire complet voyageur
- Champs: firstName, lastName, nationality, passport, dateOfBirth
- Photo passeport upload
- Validation

**Action**: **AMÉLIORER** le modal existant dans TravelersSection pour matcher l'ancien

---

#### 5. ❌ DeleteConfirmationModal.jsx (voyageur) (**MANQUANT**)
**Emplacement ancien**: `src/features/reservation/pages/components/componentsInfo/teaveller/DeleteConfirmationModal.jsx`
**Emplacement nouveau**: **Utilise window.confirm()** dans TravelersSection

**Status**: **BASIQUE - À AMÉLIORER**
**Priorité**: **P2 - MOYEN**

**Fonctionnalités** (ancien):
- Modal avec message de confirmation
- Boutons Annuler/Confirmer
- Design cohérent

**Action**: Remplacer `window.confirm()` par un vrai modal Material-UI

---

#### 6. ❌ RegisterGuestModal.jsx (**MANQUANT**)
**Emplacement ancien**: `src/features/reservation/pages/components/guest/RegisterGuestModal.jsx`
**Emplacement nouveau**: **N'EXISTE PAS** ❌

**Fonctionnalités**:
- Formulaire inscription guest complet
- Champs: email, phone, name, country, language
- Associer à une réservation existante
- Ou créer un nouveau guest

**Usage**:
- Depuis liste réservations
- Pour lier un guest non enregistré

**Priorité**: **P2 - MOYEN**
**Action**: À créer dans `src/components/modals/RegisterGuestModal.tsx`

---

#### 7. ❌ SyncReservationsModal.jsx (**MANQUANT**)
**Emplacement ancien**: `src/features/reservation/components/sync/SyncReservationsModal.jsx`
**Emplacement nouveau**: **N'EXISTE PAS** ❌

**Fonctionnalités**:
- Synchronisation manuelle réservations depuis OTAs
- Sélection: Airbnb, Booking, Vrbo, etc.
- Progress bar
- Logs de sync

**Usage**:
- Depuis toolbar page réservations
- Bouton "🔄 Sync réservations"

**Priorité**: **P2 - MOYEN** (mais important pour multi-OTA)
**Action**: À créer dans `src/components/modals/SyncReservationsModal.tsx`

---

#### 8. ❌ ReservationModalCompact.jsx (**MANQUANT - depuis calendrier**)
**Emplacement ancien**: `src/features/reservation/calendarPage/ReservationModalCompact.jsx`
**Emplacement nouveau**: **N'EXISTE PAS** ❌

**Fonctionnalités**:
- Vue rapide réservation depuis calendrier
- Infos essentielles: guest, dates, prix
- Actions rapides: Voir détails, Éditer, Annuler
- Design compact (pas full screen)

**Usage**:
- Click sur bloc réservation dans CalendarGantt
- Quick view pour info rapide

**Priorité**: **P1 - IMPORTANT** (améliore UX calendrier)
**Action**: À créer dans `src/components/modals/ReservationModalCompact.tsx`

---

### 📅 CALENDRIER - Modals existants dans `/src/features/calendar`

#### 9. ❌ UpdateInventoryModal.jsx (**MANQUANT**)
**Emplacement ancien**: `src/features/calendar/components/inventoryCalendarNew/UpdateInventoryModal.jsx`
**Emplacement nouveau**: **N'EXISTE PAS** ❌

**Fonctionnalités**:
- Modifier inventaire (availability) pour une date/listing
- Champs: available (checkbox), minStay, maxStay
- Bulk update pour plage de dates
- Preview avant save

**Usage**:
- Depuis CalendarInventoryPage
- Click sur cellule d'inventaire

**Priorité**: **P1 - CRITIQUE** (fonctionnalité inventaire absente)
**Action**: À créer dans `src/components/modals/UpdateInventoryModal.tsx`

---

#### 10. ❌ PendingChangesModal.jsx (**MANQUANT**)
**Emplacement ancien**: `src/features/calendar/components/roomTypeCalendar/Calendar/PendingChangesModal.jsx`
**Emplacement nouveau**: **N'EXISTE PAS** ❌

**Fonctionnalités**:
- Affiche les modifications en attente (non sauvegardées)
- Liste des changements avec dates
- Boutons: Sauvegarder tout, Annuler, Ignorer

**Usage**:
- Avant de quitter la page calendrier avec changements non sauvés
- Modal de confirmation

**Priorité**: **P2 - MOYEN** (UX pour éviter pertes de données)
**Action**: À créer dans `src/components/modals/PendingChangesModal.tsx`

---

## 📊 RÉCAPITULATIF MODALS AGENT 2

### ✅ Modals DÉJÀ FAITS (1)
1. ✅ CreateReservationModal (Phase 1 + Phase 2)

### ❌ Modals MANQUANTS CRITIQUES - P1 (4)
1. ❌ CheckInOutStatusModal → Confirmer arrivée/départ
2. ❌ CancelReservationModal → Annuler réservation
3. ❌ ReservationModalCompact → Quick view depuis calendrier
4. ❌ UpdateInventoryModal → Gérer inventaire

### ❌ Modals MANQUANTS MOYENS - P2 (5)
5. ❌ DeleteConfirmationModal (voyageur) → Améliorer window.confirm()
6. ❌ RegisterGuestModal → Inscription guest
7. ❌ SyncReservationsModal → Sync OTAs
8. ❌ PendingChangesModal → Changements non sauvés
9. ❌ AddEditTravellerModal standalone → Améliorer modal existant

---

## 🎯 VUE SÉJOUR - RÉGRESSION CRITIQUE

### ❌ Vue "Séjour" MANQUANTE (**RÉGRESSION P0**)

**Recherche effectuée**:
```bash
cd /Users/gouacht/sojori-dashboard
find src -name "*Sejour*" -o -name "*sejour*" -o -name "*Stay*"
```

**Résultats**:
- `src/features/setting/pages/StayMore.jsx` → Paramètres, pas la vue
- Mentions dans `src/features/calendar/pages/InventoryCalendarNew.jsx`
- Mentions dans `src/features/financial/pages/CEODashboard.jsx`

**Hypothèses**:
1. **Soit** c'est une vue dans InventoryCalendarNew avec un mode "Par séjour"
2. **Soit** c'est une page dédiée qui n'a pas été migrée
3. **Soit** c'est une section dans CEODashboard

**Action requise**:
1. ✅ Lancer l'ancien dashboard: `cd /Users/gouacht/sojori-dashboard && PORT=3000 npm start`
2. ✅ Naviguer pour trouver la vue "Séjour"
3. ✅ Identifier la structure exacte
4. ✅ Lire le code source
5. ✅ Recréer dans le nouveau

**Priorité**: **P0 - BLOQUANT** (bug critique identifié par le patron)

---

## 📋 PLAN D'ACTION AGENT 2

### Phase 1: Corrections critiques (P0-P1) - **2-3 jours**

#### Jour 1: Vue Séjour + 2 modals critiques
1. ✅ Identifier Vue Séjour dans l'ancien (1h)
2. ✅ Recréer Vue Séjour dans le nouveau (4-6h)
3. ✅ Créer CheckInOutStatusModal (2h)
4. ✅ Créer CancelReservationModal (2h)

#### Jour 2: 2 modals critiques restants
5. ✅ Créer ReservationModalCompact (3h)
6. ✅ Créer UpdateInventoryModal (4h)
7. ✅ Tests P1 (1-2h)

### Phase 2: Corrections moyennes (P2) - **1 jour**

#### Jour 3: 5 modals moyens
8. ✅ Améliorer DeleteConfirmationModal (1h)
9. ✅ Créer RegisterGuestModal (2h)
10. ✅ Créer SyncReservationsModal (2h)
11. ✅ Créer PendingChangesModal (1h)
12. ✅ Améliorer AddEditTravellerModal (2h)
13. ✅ Tests P2 (1h)

---

## ✅ CHECKLIST AVANT DE COMMENCER

- [x] Ancien dashboard exploré
- [x] Modals listés et catégorisés
- [x] Priorités définies (P0/P1/P2)
- [x] Plan d'action 3 jours établi
- [ ] Lancer ancien dashboard (port 3000)
- [ ] Identifier Vue Séjour visuellement
- [ ] Commencer corrections P0

---

**PROCHAINE ÉTAPE IMMÉDIATE**:
👉 **Lancer l'ancien dashboard et identifier la Vue Séjour** 🚀

**Estimation totale**: 3-4 jours de travail pour Agent 2
