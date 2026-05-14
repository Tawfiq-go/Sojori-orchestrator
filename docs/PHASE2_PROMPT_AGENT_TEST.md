# 🧪 AGENT TEST - PHASE 2 : TESTER LE TRAVAIL DE TOUS LES AGENTS

**Date** : 14 Mai 2026
**Mission** : Tester et valider le travail des Agents 1, 2, 3, 4, 5 + Claude Design
**Outil** : Cursor (session persistante)

---

## 📋 TON RÔLE

Tu es **Agent Test**. Les autres agents (1-5 + Claude Design) travaillent en parallèle.

**Ton job** :
1. ✅ Vérifier que le code compile (TypeScript)
2. ✅ Tester chaque page en MOCK
3. ✅ Identifier les bugs/erreurs
4. ✅ Créer un rapport de bugs
5. ✅ Corriger les bugs critiques (blocants)

**Tu NE dois PAS** :
- ❌ Réécrire le code des autres agents
- ❌ Optimiser (pas le moment)
- ❌ Ajouter des features non demandées

---

## 🎯 CHECKLIST DE TEST

### 1. BUILD & COMPILATION (5 min)

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm install
pnpm type-check
```

**Vérifier** :
- ✅ Aucune erreur TypeScript
- ✅ Aucun import manquant
- ✅ Aucun type `any` non justifié

**Si erreurs** : Note-les dans `BUGS_PHASE2.md`

---

### 2. DEV SERVER (2 min)

```bash
pnpm dev --port 4000
```

**Vérifier** :
- ✅ Serveur démarre sans crash
- ✅ Aucune erreur console
- ✅ App accessible sur http://localhost:4000

**Si crash** : Note l'erreur exacte

---

### 3. TESTS PAR AGENT

#### ✅ AGENT 1 - AUTH + ORCHESTRATION

**Pages à tester** :
- `/login` - Formulaire login
- `/register` - Formulaire register
- `/forgot-password` - Reset password
- `/dashboard` - Dashboard principal
- `/analytics` - Analytics
- `/reports` - Reports

**Checklist** :
- [ ] Login fonctionne (MOCK)
- [ ] Toast "Connexion réussie" s'affiche
- [ ] Redirect vers /dashboard
- [ ] Dashboard affiche stats
- [ ] Analytics affiche graphiques
- [ ] Reports affiche tableaux

**Bugs trouvés** : _________________

---

#### 🎯 AGENT 2 - RÉSERVATIONS + CALENDRIER

**Pages à tester** :
- `/reservations` - Liste réservations
- `/reservations/calendar` - Vue calendrier
- `/inventory` - Inventaire

**Checklist P0** :
- [ ] Tableau réservations s'affiche
- [ ] 15 colonnes présentes (reservationNumber, phone, payment, etc.)
- [ ] 8 filtres fonctionnels (recherche, listing, canal, statut, etc.)
- [ ] Clic "Nouvelle réservation" ouvre modal CreateReservationModal
- [ ] Modal a 19 champs
- [ ] MOCK save fonctionne (toast + ajout à la liste)
- [ ] Section Travelers affichée dans détail réservation
- [ ] CRUD voyageurs fonctionne

**Checklist P1** :
- [ ] 13 actions présentes (Sync, Export, Print, Edit, Cancel, etc.)
- [ ] Chaque action cliquable (pas console.log)
- [ ] Vue calendrier fonctionne
- [ ] Drag & drop réservations (si implémenté)

**Bugs trouvés** : _________________

---

#### 🏠 AGENT 3 - CATALOGUE

**Pages à tester** :
- `/listings` - Liste listings
- `/listings/new` - Formulaire nouveau listing
- `/pricing` - Pricing rules
- `/channels` - Channels dashboard
- `/clients` - Clients
- `/clients/contacts` - WhatsApp contacts (si créé)
- `/crm` - CRM (si créé)
- `/onboarding` - Onboarding (si créé)

**Checklist P0** :
- [ ] Tableau listings s'affiche
- [ ] Filtres listings fonctionnels (search, owner, country, city, type)
- [ ] Clic "Nouveau listing" navigate vers `/listings/new`
- [ ] Formulaire listing : 22 onglets accessibles (base + 18 nouveaux)
- [ ] Chaque onglet a un formulaire
- [ ] MOCK save fonctionne
- [ ] Badge ✓ si onglet complet
- [ ] % complétion global update

**Checklist P1** :
- [ ] PricingRulesEditor présent
- [ ] 6 familles pricing (Month/Weekday/Events/Occupancy/LongStay/LastMinute)
- [ ] ChannelsDashboard présent
- [ ] 5 tabs channels (Summary/Business/Debug/Cron/Mapping)
- [ ] Actions listings fonctionnelles (Détails, Éditer, Import RU, Sync OTA)

**Bugs trouvés** : _________________

---

#### ✅ AGENT 4 - OPÉRATIONS

**Pages à tester** :
- `/tasks` - Liste tâches
- `/team` - Liste team
- `/planning` - Planning staff
- `/communications/staff-whatsapp` - WhatsApp staff

**Checklist P0** :
- [ ] Tableau tasks s'affiche
- [ ] 9 colonnes tasks (itemNumber, details, reservationNumber, guestName, etc.)
- [ ] Clic "Nouvelle tâche" ouvre modal CreateTaskModal
- [ ] Modal a 29 champs organisés en Accordion
- [ ] MOCK save fonctionne
- [ ] Filtres avancés tasks (15 filtres) fonctionnels
- [ ] 8 actions par ligne (Edit, ChangeStatus, Assign, Duplicate, etc.)
- [ ] Pagination + tri colonnes

**Checklist P1** :
- [ ] Tableau team s'affiche
- [ ] 9 colonnes team (staffCode, subTypes, schedule, languages, etc.)
- [ ] Clic "Ajouter membre" ouvre modal AddTeamMemberModal
- [ ] Modal a 17 champs (Profil/Planning/Documents)
- [ ] 8 actions team fonctionnelles
- [ ] Planning affiche horaires + tâches
- [ ] Modal EditPlanning fonctionne
- [ ] Staff WhatsApp : StaffTasksPanel présent (drawer 400px)

**Bugs trouvés** : _________________

---

#### 💬 AGENT 5 - COMMUNICATIONS

**Pages à tester** :
- `/communications/whatsapp` - WhatsApp Guests
- `/communications/ota-messages` - Messages OTA
- `/communications/staff-whatsapp` - WhatsApp Staff
- `/communications/reviews` - Reviews
- `/communications/requests` - Requests

**Checklist P0 (BLOCAGES CRITIQUES)** :
- [ ] CommsPage : Champ texte + bouton "Envoyer"
- [ ] Clic "Envoyer" → Message apparaît dans thread (PAS console.log)
- [ ] Toast "Message envoyé" s'affiche
- [ ] OTAMessagesPage : idem
- [ ] StaffWhatsAppPage : bouton "Envoyer" envoie vraiment (PAS console.log)
- [ ] StaffWhatsAppPage : bouton "Broadcast" ouvre modal + envoie (PAS console.log)
- [ ] ReviewsPage : DataTable affiche avec prop `rows` (PAS `data`)
- [ ] RequestsPage : DataTable avec `rows`, KanbanBoard avec children (PAS `data`/`columns`)

**Checklist P1** :
- [ ] WhatsApp Guests : 6 filtres (reservation, client, listing, status, statsWhatsApp, dateRange)
- [ ] OTA Messages : 5 filtres (ota, listing, status, dateRange, searchTerm)
- [ ] Staff WhatsApp : 4 filtres (role, unreplied, recent, searchPhone)
- [ ] Reviews : recherche texte fonctionne
- [ ] Requests : filtre date fonctionne

**Checklist P2** :
- [ ] Reviews : Export CSV
- [ ] Reviews : Flag review
- [ ] Reviews : Navigation cross-channel
- [ ] Requests : Approve, Reject, Assign, Create task, Add pricing

**Bugs trouvés** : _________________

---

### 4. TESTS COMPOSANTS CLAUDE DESIGN

**Si Claude Design a livré les composants** :

**Composants à vérifier** (dans `src/components/`) :
- [ ] CreateReservationModal.tsx (19 champs)
- [ ] CreateTaskModal.tsx (29 champs)
- [ ] AddTeamMemberModal.tsx (17 champs)
- [ ] EditPlanningModal.tsx
- [ ] BroadcastModal.tsx
- [ ] StaffTasksPanel.tsx
- [ ] TravelersSection.tsx
- [ ] FinancialSection.tsx
- [ ] AdvancedTaskFilters.tsx
- [ ] ColumnSelector.tsx
- [ ] ReservationsGanttView.tsx
- [ ] PricingRulesEditor.tsx
- [ ] ChannelsDashboard.tsx

**Vérifier chaque composant** :
- [ ] Fichier existe
- [ ] Aucune erreur TypeScript
- [ ] Props documentées (JSDoc ou commentaires)
- [ ] MOCK data intégré
- [ ] Style cohérent (Material-UI sx, tokens t.*)
- [ ] Responsive (mobile + desktop)

**Bugs trouvés** : _________________

---

## 📝 RAPPORT DE BUGS

Crée le fichier `/Users/gouacht/Sojori-orchestrator/docs/BUGS_PHASE2.md` :

```markdown
# 🐛 BUGS PHASE 2 - Rapport de Test

**Date** : 14 Mai 2026
**Testé par** : Agent Test (Cursor)

---

## 🔴 BUGS BLOQUANTS (à corriger immédiatement)

### #1 - [Nom du bug]
- **Page** : /chemin/page
- **Agent responsable** : Agent X
- **Description** : ...
- **Reproduction** :
  1. ...
  2. ...
- **Erreur** :
  ```
  [Copier erreur console/terminal]
  ```
- **Fix suggéré** : ...
- **Statut** : ⏳ En attente

---

## 🟠 BUGS NON-BLOQUANTS (à corriger après)

### #2 - [Nom du bug]
- **Page** : /chemin/page
- **Agent responsable** : Agent X
- **Description** : ...
- **Impact** : Faible / Moyen
- **Statut** : 📋 Backlog

---

## ✅ TESTS RÉUSSIS

- ✅ Agent 1 : Auth fonctionne
- ✅ Agent 2 : Réservations table OK
- ...

---

## 📊 MÉTRIQUES

- **Total bugs** : X
- **Bloquants** : X
- **Non-bloquants** : X
- **Taux réussite** : X%
```

---

## 🛠️ CORRECTION DES BUGS CRITIQUES

**Si tu trouves un bug BLOQUANT** :

1. **Note-le dans BUGS_PHASE2.md**
2. **Identifie l'agent responsable**
3. **Corrige UNIQUEMENT si** :
   - Crash app
   - Page blanche
   - Bouton ne fait rien
   - Erreur TypeScript bloquante

**Exemple de fix** :

```typescript
// ❌ AVANT (Agent 5 a oublié onSend)
<ChatThread conversation={conv} />

// ✅ APRÈS (fix)
<ChatThread conversation={conv} onSend={handleSendMessage} />
```

4. **Commit le fix** :

```bash
git add .
git commit -m "fix: [Agent X] - Corriger bug [description courte]"
git push
```

---

## 🧪 COMMANDES UTILES

```bash
# Recompiler
pnpm type-check

# Redémarrer dev server
pnpm dev --port 4000

# Voir erreurs console
# Ouvre DevTools → Console (F12)

# Rechercher fichier
# Cursor : Cmd+P (Mac) / Ctrl+P (Windows)

# Rechercher dans tout le code
# Cursor : Cmd+Shift+F (Mac) / Ctrl+Shift+F (Windows)
```

---

## ✅ LIVRAISON FINALE

À la fin de tes tests :

1. **Crée rapport** : `docs/BUGS_PHASE2.md`
2. **Commit** :
   ```bash
   git add docs/BUGS_PHASE2.md
   git commit -m "test: Rapport de test Phase 2 - Agent Test"
   git push
   ```
3. **Notifie patron** : "Tests terminés, X bugs trouvés (Y bloquants)"

---

## 🎯 PRIORITÉS

1. **P0** : Tester Agent 5 (blocages critiques)
2. **P1** : Tester Agent 2, 4 (formulaires)
3. **P2** : Tester Agent 3 (onglets)
4. **P3** : Tester composants Claude Design

**Ordre recommandé** : P0 → P1 → P2 → P3

---

**GO ! Teste tout et rapporte les bugs ! 🧪**
