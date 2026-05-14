# 🚀 PHASE 2 - PROMPT TOUS LES AGENTS (2, 3, 4, 5)

**Date** : 14 Mai 2026
**Mission** : Compléter le dashboard Sojori-orchestrator avec MOCK data

---

## 📋 INSTRUCTIONS GÉNÉRALES (TOUS LES AGENTS)

### AVANT DE COMMENCER

1. **Clone le repo** :
```bash
git clone https://github.com/Tawfiq-go/Sojori-orchestrator
cd Sojori-orchestrator
pnpm install
```

2. **Lis ces fichiers pour comprendre** :
- `docs/Dashboard V2 - Handoff Claude Code.md` - Contexte global
- `docs/IMPLEMENTATION_AGENT_1_AUTH_ORCHESTRATION.md` - Ce qui a été fait
- `docs/ORGANISATION_NAVIGATION.md` - Structure navigation
- `docs/AUDIT_AGENT_X_[TON_DOMAINE].md` - TON audit (remplace X par ton numéro)

3. **Explore la structure** :
- `src/pages/` - Pages existantes
- `src/components/` - Composants existants
- `src/data/` - MOCK data existant

### RÈGLES IMPORTANTES

✅ **DO** :
- Crée les composants toi-même (Material-UI v9 + sx props)
- Respecte design Aurora Soft Light (primary: #e6b022, secondary: #8b5cf6)
- MOCK data seulement (pas d'API réelle)
- Réutilise composants existants au max
- Toast pour chaque action (success/error/warning)
- Validation formulaires
- Responsive (mobile + desktop)

❌ **DON'T** :
- Pas d'API calls backend
- Pas de Tailwind (Material-UI sx uniquement)
- Pas de données vides (toujours MOCK réaliste)
- Pas de console.log en prod (sauf debug)

### LIVRAISON

À la fin :
```bash
git add .
git commit -m "Agent X: [Description de ce que tu as fait]"
git push
```

Crée aussi un rapport : `docs/LIVRAISON_AGENT_X.md` avec :
- Ce qui a été fait
- Ce qui reste à faire (si manque temps)
- Bugs connus
- Instructions pour tester

---

## 🎯 AGENT 2 - RÉSERVATIONS + CALENDRIER

**Fichier prompt détaillé** : `docs/PHASE2_PROMPT_AGENT_2.md`

**Ton audit** : `docs/AUDIT_AGENT_2_RESERVATIONS_CALENDRIER.md`

### PRIORITÉS

#### P1 - FORMULAIRES (4-6h)
1. **CreateReservationModal** (créer toi-même)
   - 19 champs : Guest, Property, Dates, Prix, Source, etc.
   - 2 colonnes : Form + Summary
   - Calculs auto (commission, total)
   - MOCK save → `mockReservations.push()`

2. **TravelersSection** (créer toi-même)
   - Liste voyageurs avec statuts (COMPLETE/DRAFT/NOT_REGISTERED)
   - CRUD voyageurs
   - Upload passeport (MOCK)

#### P2 - COLONNES (2h)
Ajouter 15 colonnes dans `ReservationsPage.tsx` :
- reservationNumber, phone, paymentStatus, travelers
- createdAt, checkInTime, checkOutTime, days
- totalPrice, currency, guestCountry, notes
- otaCode, voucherNo, roomTypeName, channelManager

#### P3 - FILTRES (2h)
8 filtres :
- Recherche numéro réservation
- Recherche nom guest
- Multi-select listings
- Timeline (arrivées/départs/séjours)
- Multi-select canaux
- Multi-select statuts
- Filtre paiement
- Filtre owner (si admin)

#### P4 - ACTIONS (2-3h)
13 actions :
- Sync réservations (modal MOCK)
- Export PDF
- Print
- Configure columns
- Edit (modal)
- View calendar
- View tasks
- Declare check-in/out
- Cancel
- Send message
- Duplicate

### LIVRABLES
- [ ] Modal CreateReservation (19 champs)
- [ ] Section Travelers
- [ ] 15 colonnes ajoutées
- [ ] 8 filtres fonctionnels
- [ ] 13 actions branchées
- [ ] Tout testé en MOCK

---

## 🏠 AGENT 3 - CATALOGUE

**Fichier prompt détaillé** : `docs/PHASE2_PROMPT_AGENT_3.md`

**Ton audit** : `docs/AUDIT_AGENT_3_CATALOGUE.md`

### PRIORITÉS

#### P1 - LISTINGS (6-8h)
**NewListingFormPage.tsx - Compléter 18 onglets** :
- address, extras, licenses, automsg
- whatsapp, concierge, services, support
- cleaning, autotasks, roomtypes, deposit
- rules, houserules, access, wifi, iot

Chaque onglet :
- Formulaire avec champs appropriés
- MOCK save (localStorage ou mockData)
- Badge ✓ si complet
- Update % complétion global

**ListingsPage - Brancher filtres** :
- Quick search, owner, country, city, type, active/inactive

**Actions** :
- Détails, Éditer, Tâches, Calendrier, Quick edit, Import RU, Sync OTA

#### P2 - PRICING (4-6h)
**PricingRulesEditor** (créer toi-même) :
- Tabs : Month/Weekday/Events/Occupancy/LongStay/LastMinute
- Formulaires par famille
- MOCK save
- Actions : Save, Activate/Deactivate, Apply suggestions

#### P3 - CHANNELS (4-6h)
**ChannelsDashboard** (créer toi-même) :
- Tabs : Summary/Business/Debug/Cron/Mapping
- Tableaux par tab
- CRUD mapping RU
- Import RU Wizard

#### P4 - CLIENTS (2-4h)
- Enrichir ClientsPage (colonnes, filtres, actions)
- Créer WhatsAppContactsPage
- Créer CRMPage
- Créer OnboardingPage

### LIVRABLES
- [ ] 18 onglets listing implémentés
- [ ] Filtres listings branchés
- [ ] PricingRulesEditor complet
- [ ] ChannelsDashboard (5 tabs)
- [ ] 3 pages satellites créées

---

## ✅ AGENT 4 - OPÉRATIONS

**Fichier prompt détaillé** : `docs/PHASE2_PROMPT_AGENT_4.md`

**Ton audit** : `docs/AUDIT_AGENT_4_OPERATIONS.md`

### PRIORITÉS

#### P1 - TASKS (6-8h)
**CreateTaskModal** (créer toi-même) :
- 29 champs organisés en Accordion
- Sections : Base, Dates, Assignation, Tarification, Détails
- MOCK save → `mockTasks.push()`

**TasksPage - Ajouter** :
- 9 colonnes manquantes
- 15 filtres avancés (Accordion)
- 8 actions par ligne (menu 3 points)
- Pagination + tri colonnes

#### P2 - TEAM (4-6h)
**AddTeamMemberModal** (créer toi-même) :
- Tabs : Profil (17 champs) / Planning / Documents
- MOCK save

**TeamPage - Ajouter** :
- 9 colonnes manquantes
- 5 filtres
- 8 actions

#### P3 - PLANNING (2-4h)
**EditPlanningModal** (créer toi-même) :
- Présent/Absent toggle
- Array timings (add/remove)
- Validation heures
- Copier vers autres jours

**PlanningPage - Enrichir** :
- Horaires disponibilité (+ tâches existantes)
- Calcul heures auto
- Color coding
- Export planning

#### P4 - STAFF WHATSAPP (2h)
**StaffTasksPanel** (créer toi-même) :
- Drawer 400px
- Liste tâches staff
- Filtres rapides

**StaffWhatsAppPage - Brancher** :
- handleSendMessage (MOCK réel)
- handleBroadcast (MOCK réel)
- 6 filtres (role, unreplied, recent)

### LIVRABLES
- [ ] CreateTaskModal (29 champs)
- [ ] AddTeamMemberModal (17 champs)
- [ ] EditPlanningModal
- [ ] StaffTasksPanel
- [ ] Tout branché et testé

---

## 💬 AGENT 5 - COMMUNICATIONS

**Fichier prompt détaillé** : `docs/PHASE2_PROMPT_AGENT_5.md`

**Ton audit** : `docs/AUDIT_AGENT_5_COMMUNICATIONS.md`

### 🔴 P0 - BLOCAGES CRITIQUES (2h) - FAIRE EN PREMIER

#### 1. CommsPage.tsx - Brancher onSend
```typescript
const handleSendMessage = (message: string) => {
  const newMessage = {
    id: `msg-${Date.now()}`,
    sender: 'me',
    text: message,
    timestamp: new Date().toISOString(),
  };
  // Update mockConversations
  // Toast success
};

<ChatThread conversation={selectedConversation} onSend={handleSendMessage} />
```

#### 2. OTAMessagesPage.tsx - Brancher onSend
Même logique que CommsPage

#### 3. StaffWhatsAppPage.tsx - Brancher handleSendMessage
Remplacer `console.log` par vraie logique MOCK

#### 4. StaffWhatsAppPage.tsx - Brancher handleBroadcast
Remplacer `console.log` par vraie logique MOCK

#### 5. ReviewsPage.tsx - Aligner contrat
```typescript
<DataTable rows={filteredReviews} columns={REVIEWS_COLUMNS} />
```

#### 6. RequestsPage.tsx - Aligner contrats
```typescript
<DataTable rows={filteredRequests} columns={REQUESTS_COLUMNS} />
<KanbanBoard>
  {kanbanColumns.map(col => (
    <KanbanColumn key={col.id} title={col.title}>
      {filteredRequests.filter(r => r.status === col.id).map(req => (
        <RequestCard key={req.id} request={req} />
      ))}
    </KanbanColumn>
  ))}
</KanbanBoard>
```

### 🟠 P1 - FILTRES & ACTIONS (4h)

**Filtres à ajouter** :
- WhatsApp Guests : 6 filtres
- OTA Messages : 5 filtres
- Staff WhatsApp : 4 filtres (dont **Unreplied** important!)
- Reviews : recherche texte
- Requests : filtre date

**Actions à implémenter** :
- Reviews : export, flag, navigation cross-channel
- Requests : approve, reject, assign, create task, add pricing

### LIVRABLES
- [ ] 6 blocages corrigés
- [ ] 20 filtres ajoutés
- [ ] 15 actions branchées
- [ ] Toutes pages Communications fonctionnelles

---

## 📊 ORDRE DE PRIORITÉ GLOBAL

**AUJOURD'HUI** :

1. **Agent 5 (2h)** - PRIORITÉ MAXIMALE
   - Corriger 6 blocages
   - Résultat : 5 pages Communications fonctionnelles

2. **Agents 2, 4 (6-8h chacun)** - EN PARALLÈLE
   - Formulaires critiques
   - Colonnes + filtres

3. **Agent 3 (8-10h)** - EN PARALLÈLE
   - Onglets listing
   - Pricing + Channels

**FIN DE JOURNÉE** :
- Tout en MOCK fonctionnel
- Testable par patron
- Prêt pour Phase 3 (APIs) demain

---

## ✅ CHECKLIST FINALE

### Agent 2
- [ ] Modal CreateReservation
- [ ] Section Travelers
- [ ] 15 colonnes
- [ ] 8 filtres
- [ ] 13 actions

### Agent 3
- [ ] 18 onglets listing
- [ ] PricingRulesEditor
- [ ] ChannelsDashboard
- [ ] 3 pages satellites

### Agent 4
- [ ] CreateTaskModal
- [ ] AddTeamMemberModal
- [ ] EditPlanningModal
- [ ] StaffTasksPanel
- [ ] Tout branché

### Agent 5
- [ ] 6 blocages corrigés
- [ ] 20 filtres
- [ ] 15 actions

---

## 🎯 INSTRUCTION POUR TOI (PATRON)

**Copie-colle ce prompt à chaque agent et dis** :

> Tu es **Agent X** (2, 3, 4 ou 5).
>
> Lis la section "AGENT X - [TON DOMAINE]" ci-dessus.
>
> Suis les priorités P1 → P2 → P3.
>
> Si tu manques de temps, fais au moins P1.
>
> Commits réguliers (toutes les 2h).
>
> **GO !**

---

**URL REPO** : https://github.com/Tawfiq-go/Sojori-orchestrator

**LANCE LES 5 EN PARALLÈLE !** 🚀
