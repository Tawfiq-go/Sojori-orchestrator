# 🎫 AGENT 2 - PHASE 2 : COMPLÉTER RÉSERVATIONS + CALENDRIER

**Mission** : Implémenter TOUTES les données manquantes identifiées dans ton audit avec MOCK data

**Important** : MOCK SEULEMENT (pas d'API réelle). Tout doit fonctionner en local.

---

## 📋 TON AUDIT

Tu as livré : `/Users/gouacht/Sojori-orchestrator/docs/AUDIT_AGENT_2_RESERVATIONS_CALENDRIER.md`

**Résumé** :
- 73 éléments manquants
- 17 colonnes manquantes
- 8 filtres manquants
- 15 boutons manquants
- 2 formulaires complets manquants

---

## 🎯 TA MISSION AUJOURD'HUI

### PRIORITÉ 1 - FORMULAIRES (CRITIQUE)

#### 1. Modal "Créer Réservation"
**Fichier** : `src/components/modals/CreateReservationModal.tsx`

**ATTEND** : Claude Design va créer ce composant (regarde `PROMPT_CLAUDE_DESIGN_COMPOSANTS_MANQUANTS.md`)

**TON JOB** :
1. Attendre que modal soit créé par Claude Design
2. Intégrer dans `ReservationsPage.tsx`
3. Brancher bouton "+ Nouvelle résa"
4. Ajouter MOCK data pour :
   - Guests (10 guests mockés)
   - Listings (prendre depuis mockData existant)
   - Calculs automatiques (prix total, commission)
5. Implémenter `handleCreateReservation()` :
   - Valider champs
   - Générer ID réservation (SJ-XXXXX)
   - Ajouter à mockReservations
   - Créer tâches auto si checkbox activée (mock)
   - Afficher toast succès
   - Fermer modal
   - Rafraîchir liste

**Validation** : Formulaire 19 champs fonctionnel, création résa OK

---

#### 2. Section Voyageurs (Réservation Séjour)
**Fichier** : `src/components/sections/TravelersSection.tsx`

**ATTEND** : Claude Design va créer ce composant

**TON JOB** :
1. Intégrer dans `ReservationSejourPage.tsx`
2. Ajouter onglet "Voyageurs"
3. MOCK data :
   - 3 adultes (1 COMPLETE, 1 DRAFT, 1 NOT_REGISTERED)
   - 1 enfant (COMPLETE)
   - Passeports mockés (images placeholder)
4. Implémenter actions :
   - `handleAddTraveler()` (modal simple)
   - `handleEditTraveler()`
   - `handleDeleteTraveler()`

**Validation** : Liste voyageurs + CRUD fonctionnel

---

### PRIORITÉ 2 - COLONNES MANQUANTES

#### ReservationsPage.tsx - Ajouter 15 colonnes

**Colonnes à ajouter dans le tableau** :

```typescript
// Ajouter dans mockReservations
{
  // Existantes
  id, guest, dates, listing, status, source, revenue,

  // NOUVELLES (à ajouter)
  reservationNumber: 'SJ-12345',
  phone: '+33 6 12 34 56 78',
  paymentStatus: 'Paid', // ou 'Unpaid' / 'Partial'
  travelers: { adults: 2, children: 1, infants: 0, validated: 2, draft: 1, notRegistered: 0 },
  createdAt: '2025-05-10T14:30:00Z',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  days: 7,
  totalPrice: 1400,
  currency: 'EUR',
  guestCountry: 'FR',
  guestLanguage: 'fr',
  notes: 'Client VIP, chambre étage supérieur', // si présent, afficher icône 💬
  otaCode: 'HMABCDEF123',
  voucherNo: 'VOUCHER-456',
  roomTypeName: 'Suite Deluxe',
  channelManager: 'RentalsUnited',
}
```

**Affichage** :
- reservationNumber : Cliquable, navigate vers `/reservations/:id`
- phone : Format international
- paymentStatus : Badge vert (Paid) / rouge (Unpaid) / orange (Partial)
- travelers : Format "2A / 1C / 0I • 2V / 1D / 0N" avec tooltip
- notes : Icône 💬 si présent, tooltip au survol
- guestCountry : Drapeau emoji 🇫🇷

**TON JOB** :
1. Ajouter champs dans mockReservations (10 réservations)
2. Créer colonnes dans tableau
3. Configurer colonnes (certaines masquées par défaut)
4. Implémenter ColumnSelector (Claude Design va créer)

**Validation** : 21 colonnes totales, toutes affichables

---

### PRIORITÉ 3 - FILTRES MANQUANTS

#### Ajouter 8 filtres dans ReservationsPage

**Filtres à implémenter** :

```typescript
// State filtres
const [filters, setFilters] = useState({
  // Existants
  status: 'all',
  source: 'all',
  dateRange: [null, null],

  // NOUVEAUX
  reservationNumber: '', // Recherche texte
  listings: [], // Multi-select
  timeline: 'all', // Dropdown: Toutes/Arrivées aujourd'hui/Départs aujourd'hui/Séjours en cours/À venir/Passées
  channels: [], // Multi-select: Airbnb/Booking/Vrbo/Direct
  statusDetailed: [], // Multi-select: Pending/Confirmed/Cancelled/Rejected/etc.
  guestName: '', // Recherche texte
  payment: 'all', // Dropdown: All/Paid/Unpaid/Partial
  owner: 'all', // Si admin (dropdown multi-select owners)
});
```

**UI Filtres** :
- Barre recherche : reservationNumber + guestName (2 inputs)
- FilterChips : timeline (dropdown chips)
- Advanced Filters (Accordion) :
  - Listings (multi-select)
  - Channels (multi-select)
  - Status détaillé (multi-select)
  - Payment (select)
  - Owner (si admin)

**Logique filtrage** :
```typescript
const filteredReservations = mockReservations.filter(r => {
  if (filters.reservationNumber && !r.reservationNumber.includes(filters.reservationNumber)) return false;
  if (filters.guestName && !r.guest.name.toLowerCase().includes(filters.guestName.toLowerCase())) return false;
  if (filters.timeline === 'arrivals-today' && !isToday(r.checkIn)) return false;
  // ... etc pour chaque filtre
  return true;
});
```

**TON JOB** :
1. Créer composant AdvancedFilters
2. Implémenter logique filtrage
3. Badge count filtres actifs
4. Bouton "Reset filters"

**Validation** : 10 filtres fonctionnels

---

### PRIORITÉ 4 - ACTIONS MANQUANTES

#### Ajouter 13 actions

**Actions à implémenter** :

```typescript
// Header actions (NOUVELLES)
handleSyncReservations() // Modal sync OTA
handleExportPDF() // Génère PDF mock (toast "PDF téléchargé")
handlePrint() // window.print()
handleConfigureColumns() // Toggle ColumnSelector

// Row actions (NOUVELLES)
handleEdit(resaId) // Modal édition (réutiliser CreateReservationModal en mode edit)
handleViewCalendar(listing) // Navigate /calendar avec listing pré-sélectionné
handleViewTasks(resaId) // Navigate /tasks avec filtre réservation
handleDeclareCheckIn(resaId) // Modal avec heure effective + confirmation
handleDeclareCheckOut(resaId) // Modal avec heure effective + confirmation
handleCancel(resaId) // Modal annulation avec raison
handleSendMessage(resaId) // Navigate /communications/whatsapp avec conversation pré-ouverte
handleDuplicate(resaId) // Ouvre CreateReservationModal avec données pré-remplies
```

**UI Actions** :
- Header : 4 boutons (Sync, PDF, Print, Columns)
- Row : Menu 3 points (IconButton) avec MenuItem pour chaque action

**TON JOB** :
1. Créer modals nécessaires :
   - SyncReservationsModal (simple : sélection canaux + bouton sync)
   - CheckInOutModal (date + heure + notes)
   - CancelReservationModal (raison + confirmation)
2. Implémenter actions MOCK (toasts + updates mockData)
3. Ajouter menu 3 points sur chaque ligne

**Validation** : Toutes actions cliquables et fonctionnelles (MOCK)

---

### PRIORITÉ 5 - CALENDRIER / INVENTAIRE

#### CalendarInventoryPage.tsx + InventoryPage.tsx

**Problème** : 2 pages très similaires, beaucoup de duplication

**RECOMMANDATION** : Fusionner en une seule page avec toggle

**TON JOB** :

1. **Fusionner les pages**
   - Garder `/calendar` comme route principale
   - Ajouter toggle "Vue Calendrier" / "Vue Inventaire"
   - Partager composants communs

2. **Ajouter fonctionnalités manquantes** :

**Boutons manquants** :
- "Aujourd'hui" (reset au jour actuel)
- Date picker avancé (sélection date directe)
- Sync RU / Sync iCal / Push Inventory (modals simples)
- Sélecteur colonnes (8 colonnes configurables)
- Filtres listing multi-select (mode multi)
- Export (CSV/Excel)

**Données cellule manquantes** (12 champs) :
```typescript
{
  // Existants
  date, price, suggestedPrice, minNights, checkInAllowed, checkOutAllowed, status,

  // NOUVEAUX
  calculatedPrice: 135, // Prix dynamique calculé
  manualPrice: 150, // Prix manuel si défini
  applyManual: true, // Flag prix manuel actif
  stopSell: false, // Stop vente
  useDynamicPrice: true, // Dynamic pricing actif
  setUseDynamicPriceManual: false, // Override
  maxStay: 14, // Séjour maximum
  closedToArrival: false, // Fermé arrivée
  closedToDeparture: false, // Fermé départ
  reservations: [], // Liste réservations si colonne activée
  calculatedPriceHistory: [], // Historique prix
  syncStatus: { airbnb: 'ok', booking: 'ok', vrbo: 'pending', direct: 'ok' },
}
```

**Drawer édition cellule** :
- Afficher TOUS les champs
- Permettre édition (MOCK update)
- Validation (end > start, etc.)

**Vue Réservations Planning (Gantt)** :
- Nouveau composant `ReservationsGanttView`
- Attendre que Claude Design le crée
- Intégrer avec toggle "Calendrier" / "Planning"

**TON JOB** :
1. Fusionner Calendar + Inventory
2. Ajouter 12 champs cellule
3. Implémenter sélecteur colonnes
4. Ajouter boutons sync (modals MOCK)
5. Intégrer Gantt view (après Claude Design)

**Validation** : Page calendrier complète avec toutes fonctionnalités

---

## ✅ CHECKLIST LIVRAISON

- [ ] Modal Créer Réservation (19 champs) fonctionnelle
- [ ] Section Voyageurs dans ReservationSejourPage
- [ ] 15 colonnes ajoutées dans ReservationsPage
- [ ] ColumnSelector implémenté
- [ ] 8 filtres ajoutés et fonctionnels
- [ ] 13 actions implémentées (MOCK)
- [ ] Calendrier/Inventaire fusionnés
- [ ] 12 champs cellule ajoutés
- [ ] Vue Gantt intégrée
- [ ] Toutes les modals créées
- [ ] Tout fonctionne en MOCK (testable)

---

## 🚀 ORDRE D'EXÉCUTION

1. **Attendre composants Claude Design** (Modals + Sections)
2. **Intégrer modals** dans pages
3. **Ajouter colonnes** (quick win)
4. **Implémenter filtres** (important)
5. **Ajouter actions** (long mais critique)
6. **Fusionner calendrier** (restructuration)
7. **Tester tout** en MOCK

---

## 📝 NOTES IMPORTANTES

- **MOCK SEULEMENT** : Pas d'API calls
- **Données réalistes** : Prix cohérents, dates logiques
- **Toasts** : Feedback utilisateur pour chaque action
- **Validation** : Champs obligatoires, formats
- **Responsive** : Mobile + Desktop
- **Performance** : Pagination si > 50 items

---

**C'est parti ! Lance-toi en // avec les autres agents.** 🚀
