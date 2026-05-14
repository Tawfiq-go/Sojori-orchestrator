# 🔍 PROMPT AGENT AUDIT

**Date** : 14 Mai 2026
**Mission** : Auditer TOUT le travail livré par les Agents 1-5 + Claude Design
**Durée estimée** : 2-4h
**Périmètre** : Phase 2 - MOCK complet

---

## 🎯 TA MISSION

Tu es **Agent Audit**. Tu dois vérifier que TOUT ce qui a été livré par les 5 agents + Claude Design fonctionne correctement.

**Objectif** : Créer un rapport complet dans `docs/RAPPORT_AUDIT_PHASE2.md` avec :
- ✅ Ce qui fonctionne
- ❌ Les bugs trouvés (PAR AGENT)
- ⚠️ Les warnings/améliorations
- 📊 Statistiques
- 💬 **Remarques spécifiques pour chaque agent**

---

## 🌐 SITES WEB À AUDITER

Tu as accès à **deux sites web** en développement :

### Site 1 : Sojori-orchestrator (NOUVEAU - Phase 2)
- **URL** : http://localhost:4000
- **Projet** : `/Users/gouacht/Sojori-orchestrator`
- **Stack** : Vite 8 + React 18 + TypeScript + Material-UI v9
- **Design** : Aurora Soft Light (#e6b022, #8b5cf6)
- **Status** : Phase 2 MOCK - Livré par Agents 1-5 + Claude Design

### Site 2 : Sojori-dashboard (ANCIEN - Production)
- **URL** : http://localhost:4000 (ancien port)
- **Projet** : `/Users/gouacht/sojori-dashboard`
- **Status** : En production - **RÉFÉRENCE POUR LES MODALS**

---

## ⚠️ REMARQUES CRITIQUES DU PATRON

### 🚨 PROBLÈMES IDENTIFIÉS

**1. Vue Séjour - Réservations par listing MANQUANTE**
- ❌ **RÉGRESSION** : L'ancienne version affichait les réservations par listing (multi-listings)
- ❌ La page existait déjà, elle a disparu ou a été modifiée
- ✅ **ACTION** : Vérifier dans l'ancien dashboard `/sejour` ou équivalent
- ✅ **À RESTAURER** : Vue réservations groupées par listing

**2. Boutons Plan Orchestration NON FONCTIONNELS**
- ❌ Tous les boutons de la page Plan d'orchestration ne fonctionnent pas
- ❌ Exemple : Clic sur "RÉSA #1234" n'ouvre PAS le détail réservation
- ❌ Exemple : Clic sur "Message bienvenue" ne fait rien
- ❌ Exemple : Boutons timeline ne sont pas branchés

**Référence ancien dashboard** :
```
Orchestration · Plan d'orchestration
RÉSA #1234
📨 J-7
Message bienvenue
1/1 Complété
📧 Email
📧 Notification envoyée
Email · 07/05 17:00
```
- ✅ **Dans l'ancien** : Clic sur réservation → ouvre modal détail
- ❌ **Dans le nouveau** : Rien ne se passe

**3. Erreur React dans Console**
```
client:510 An error occurred in one of your React components.
Consider adding an error boundary to your tree to customize error handling behavior.
```
- ❌ Erreur React non gérée
- ✅ **ACTION** : Identifier le composant qui crash

---

## 🎯 TA MISSION PRIORITAIRE

**AVANT de tester le nouveau dashboard, tu DOIS** :

1. **Auditer TOUS les modals de l'ancien dashboard** (`/Users/gouacht/sojori-dashboard`)
2. **Lister TOUS les modals manquants** dans le nouveau
3. **Comparer les fonctionnalités** page par page
4. **Identifier les régressions** (fonctionnalités qui existaient et ont disparu)

---

## 📋 CHECKLIST MODALS À VÉRIFIER

### Dans l'ancien dashboard (`sojori-dashboard`)

**Navigation complète** :
- [ ] Aller sur chaque page
- [ ] Cliquer sur TOUS les boutons
- [ ] Noter TOUS les modals qui s'ouvrent
- [ ] Prendre des screenshots si nécessaire

**Modals à identifier** :
- [ ] Modal détail réservation (clic sur RÉSA #1234)
- [ ] Modal détail listing
- [ ] Modal détail tâche
- [ ] Modal détail membre team
- [ ] Modal timeline orchestration
- [ ] Modal messages
- [ ] Modal vue séjour (réservations par listing)
- [ ] **Tous les autres modals présents**

**Pour chaque modal trouvé, noter** :
- Nom du modal
- Page où il apparaît
- Bouton/action qui le déclenche
- Contenu du modal (champs, sections, boutons)
- Screenshot si possible

---

## 🔍 COMPARAISON DÉTAILLÉE PAR PAGE

### Vue Séjour / Réservations par listing

**Ancien dashboard** :
- [ ] Aller sur la page séjour/réservations
- [ ] Vérifier si affichage par listing
- [ ] Noter la structure
- [ ] Prendre screenshot

**Nouveau dashboard** :
- [ ] Chercher l'équivalent
- [ ] Si manquant → BUG BLOQUANT
- [ ] Si présent mais différent → Noter différences

### Plan d'Orchestration

**Ancien dashboard** :
- [ ] Aller sur `/orchestration` ou équivalent
- [ ] Cliquer sur une réservation dans la timeline
- [ ] Vérifier que le modal s'ouvre
- [ ] Noter tous les boutons fonctionnels

**Nouveau dashboard** :
- [ ] Aller sur `/orchestration`
- [ ] Tester TOUS les boutons
- [ ] Noter ceux qui ne fonctionnent pas
- [ ] Comparer avec l'ancien

**TA MISSION** : Comparer les deux sites et identifier :
- ❌ **Régressions** : Fonctionnalités qui ont disparu
- ❌ **Modals manquants** : Modals présents dans l'ancien mais absents du nouveau
- ❌ **Boutons non fonctionnels** : Boutons qui ne font rien
- ❌ **Erreurs React** : Composants qui crashent
- ✅ **Points d'amélioration**

---

## 📋 ÉTAPE 1 : VÉRIFICATIONS TECHNIQUES

### 1.1 Type-check
```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm type-check
```

**À noter dans le rapport** :
- Nombre d'erreurs TypeScript
- Liste des fichiers avec erreurs
- Sévérité (bloquant ou non)

### 1.2 Build
```bash
pnpm build
```

**À noter** :
- Build réussit ? Oui/Non
- Warnings de build
- Taille du bundle

### 1.3 Linter
```bash
pnpm lint
```

**À noter** :
- Erreurs de lint
- Fichiers concernés

---

## 📋 ÉTAPE 2 : LANCER L'APPLICATION

```bash
pnpm dev --port 4000
```

Ouvre http://localhost:4000

---

## 📋 ÉTAPE 3 : TESTER TOUTES LES PAGES

### 3.1 AGENT 1 - Auth + Orchestration

**Pages à tester** :
- [ ] `/login` - Login fonctionne en MOCK
- [ ] `/register` - Formulaire complet, validation
- [ ] `/forgot-password` - Email envoyé (MOCK)
- [ ] `/reset-password` - Reset OK (MOCK)
- [ ] `/dashboard` - Page s'affiche, stats visibles
- [ ] `/analytics` - Graphiques présents
- [ ] `/reports` - Rapports affichés

**Checklist** :
- [ ] Pas de page blanche
- [ ] Tous les boutons répondent
- [ ] Toasts de confirmation
- [ ] Design cohérent (Aurora Soft Light)
- [ ] Responsive (tester mobile + desktop)

**Bugs à noter** :
- Erreurs console
- Boutons qui ne font rien
- Textes/traductions manquants
- Design cassé

---

### 3.2 AGENT 2 - Réservations

**Pages à tester** :
- [ ] `/reservations` - Liste réservations MOCK

**Modal CreateReservation** :
- [ ] Bouton "Nouvelle réservation" ouvre modal
- [ ] 19 champs présents :
  - [ ] Guest (select)
  - [ ] Listing (select)
  - [ ] Check-in/out (date pickers)
  - [ ] Adults, Children, Infants (numbers)
  - [ ] Status (select)
  - [ ] Source (select)
  - [ ] Total price (number)
  - [ ] Notes (textarea)
  - [ ] etc.
- [ ] Validation fonctionne
- [ ] Bouton "Créer" → toast success
- [ ] Nouvelle réservation apparaît dans liste

**TravelersSection** (si intégré dans détail réservation) :
- [ ] CRUD voyageurs
- [ ] Ajout/édition/suppression
- [ ] Status badges (arrived, not arrived)

**Filtres réservations** (8 filtres) :
- [ ] Recherche texte
- [ ] Listing (select)
- [ ] Guest (select)
- [ ] Status (select)
- [ ] Source (select)
- [ ] Date range
- [ ] Filtrage fonctionne

**Actions** (13 actions) :
- [ ] Voir détail
- [ ] Modifier
- [ ] Annuler
- [ ] Check-in
- [ ] Check-out
- [ ] Export CSV
- [ ] etc.
- [ ] Toasts confirmations

**Colonnes** (15 colonnes) :
- [ ] ColumnSelector ouvre modal
- [ ] Masquer/afficher colonnes
- [ ] Ordre colonnes modifiable
- [ ] Changements persistent

**Checklist** :
- [ ] Pas d'erreurs console
- [ ] Design cohérent
- [ ] Responsive

**Bugs à noter** :
- Champs manquants
- Validation cassée
- Filtres ne filtrent pas
- Actions sans effet

---

### 3.3 AGENT 3 - Catalogue

#### 3.3.1 Listings

**Page** : `/listings`

- [ ] Liste listings MOCK affichée
- [ ] Filtres fonctionnent :
  - [ ] Recherche
  - [ ] Owner
  - [ ] Pays
  - [ ] Ville
  - [ ] Type
  - [ ] Statut
- [ ] 3 vues disponibles :
  - [ ] Grid view
  - [ ] Table view
  - [ ] Map view
- [ ] Actions listing :
  - [ ] Voir détails
  - [ ] Éditer
  - [ ] Tâches
  - [ ] Calendrier
  - [ ] Quick edit
  - [ ] Sync OTA (MOCK)
- [ ] Import RU MOCK fonctionne
- [ ] ColumnSelector intégré

**Formulaire NewListingForm** : `/listings/new`

- [ ] 18 onglets présents
- [ ] Navigation entre onglets
- [ ] Sauvegarde par section (localStorage)
- [ ] Indicateur de complétion par onglet
- [ ] Complétion globale
- [ ] Bouton "Créer" → toast success

#### 3.3.2 Pricing

**Page** : `/pricing`

- [ ] Calendrier de prix affiché
- [ ] Suggestions de prix
- [ ] Application suggestion par jour
- [ ] Application en masse
- [ ] **PricingRulesEditor** intégré (composant Claude Design)
- [ ] 6 familles de règles :
  - [ ] Month
  - [ ] Weekday
  - [ ] Events
  - [ ] Occupancy
  - [ ] LongStay
  - [ ] LastMinute
- [ ] Édition règles MOCK
- [ ] Sauvegarde MOCK

#### 3.3.3 Channels

**Page** : `/channels`

- [ ] **ChannelsDashboard** intégré (composant Claude Design)
- [ ] 5 tabs présents :
  - [ ] Summary
  - [ ] Business
  - [ ] Debug
  - [ ] Cron
  - [ ] Mapping
- [ ] CRUD mappings RU (MOCK)
- [ ] Wizard import RU multi-étapes
- [ ] Toggles canaux fonctionnent (MOCK)
- [ ] Actions cron (MOCK)

#### 3.3.4 Pages satellites

- [ ] `/whatsapp-contacts` - Page affichée
- [ ] `/crm` - Page affichée
- [ ] `/onboarding` - Page affichée

**Checklist Catalogue** :
- [ ] Navigation sidebar correcte
- [ ] Tous les composants Claude Design intégrés
- [ ] Pas d'erreurs console
- [ ] localStorage fonctionne
- [ ] Design cohérent

**Bugs à noter** :
- Composants manquants
- Erreurs d'import
- Filtres cassés
- localStorage ne persiste pas

---

### 3.4 AGENT 4 - Opérations

#### 3.4.1 Tasks

**Page** : `/tasks`

- [ ] Liste tâches MOCK affichée
- [ ] 11 colonnes présentes
- [ ] Pagination fonctionne
- [ ] Tri par colonne fonctionne
- [ ] **AdvancedTaskFilters** intégré (composant Claude Design)
- [ ] 15+ filtres :
  - [ ] Recherche
  - [ ] Type
  - [ ] Status
  - [ ] Priority
  - [ ] Assigned to
  - [ ] Listing
  - [ ] Date range
  - [ ] etc.
- [ ] Filtrage fonctionne
- [ ] **ColumnSelector** intégré

**Modal CreateTask** :
- [ ] Bouton "Nouvelle tâche" ouvre modal
- [ ] 29 champs en 5 sections (Accordion) :
  - [ ] Informations générales
  - [ ] Assignation
  - [ ] Planification
  - [ ] Détails
  - [ ] Pièces jointes
- [ ] Validation fonctionne
- [ ] Bouton "Créer" → toast success
- [ ] Nouvelle tâche apparaît dans liste

**Actions tasks** :
- [ ] Voir détail
- [ ] Modifier
- [ ] Supprimer
- [ ] Assigner
- [ ] Changer status
- [ ] Export CSV

#### 3.4.2 Team

**Page** : `/team`

- [ ] Liste membres team MOCK
- [ ] **AddTeamMemberModal** intégré (composant Claude Design)
- [ ] 3 tabs dans modal :
  - [ ] Profil (17 champs)
  - [ ] Planning (7 jours)
  - [ ] Documents
- [ ] Ajout membre fonctionne (MOCK)
- [ ] Édition membre fonctionne (MOCK)

#### 3.4.3 Planning

**Page** : `/planning`

- [ ] Planning staff affiché
- [ ] **EditPlanningModal** intégré (composant Claude Design)
- [ ] Modification horaires (MOCK)
- [ ] Toggle présent/absent
- [ ] Sauvegarde MOCK

#### 3.4.4 Staff WhatsApp

**Page** : `/staff-whatsapp`

- [ ] **BroadcastModal** intégré (composant Claude Design)
- [ ] Sélection multi-recipients
- [ ] Envoi broadcast (MOCK)
- [ ] **StaffTasksPanel** intégré (drawer 400px)
- [ ] Tâches staff affichées

**Checklist Opérations** :
- [ ] ~2,465 lignes de code produites
- [ ] Tous les composants Claude Design intégrés
- [ ] Pas d'erreurs console
- [ ] Design cohérent
- [ ] Responsive

**Bugs à noter** :
- Modals ne s'ouvrent pas
- Champs manquants
- Validation cassée
- Composants non intégrés

---

### 3.5 AGENT 5 - Communications

#### 3.5.1 WhatsApp Guest

**Page** : `/communications/whatsapp`

- [ ] Liste conversations MOCK
- [ ] Envoi message fonctionne (onSend branché MOCK)
- [ ] Feedback utilisateur (toast)
- [ ] Message visible dans thread
- [ ] Filtres :
  - [ ] Réservation
  - [ ] Client
  - [ ] Listing
  - [ ] Statut
  - [ ] Lu/non lu
  - [ ] Période

#### 3.5.2 OTA Messages

**Page** : `/communications/ota`

- [ ] Liste messages OTA MOCK
- [ ] Envoi message fonctionne (onSend branché MOCK)
- [ ] Preview conversation mise à jour
- [ ] Toast confirmation
- [ ] Filtres :
  - [ ] Recherche
  - [ ] OTA
  - [ ] Listing
  - [ ] Statut
  - [ ] Période

#### 3.5.3 Staff WhatsApp

**Page** : `/communications/staff`

- [ ] Envoi message branché (MOCK)
- [ ] Broadcast branché (MOCK)
- [ ] **BroadcastModal** intégré (composant Claude Design)
- [ ] Filtres :
  - [ ] Rôle
  - [ ] Unreplied
  - [ ] Recent 24h
  - [ ] Téléphone

#### 3.5.4 Reviews

**Page** : `/reviews`

- [ ] Liste avis MOCK
- [ ] **ColumnSelector** intégré (composant Claude Design)
- [ ] Recherche texte fonctionne
- [ ] Export CSV
- [ ] Signalement avis
- [ ] Navigation cross-channel

#### 3.5.5 Requests

**Page** : `/requests`

- [ ] Liste demandes MOCK
- [ ] **ColumnSelector** intégré (composant Claude Design)
- [ ] Filtre date
- [ ] Actions :
  - [ ] Approve (MOCK)
  - [ ] Reject (MOCK)
  - [ ] Assign (MOCK)
  - [ ] Create task
  - [ ] Add pricing
- [ ] Vue Kanban disponible

**Checklist Communications** :
- [ ] 6 blocages critiques corrigés
- [ ] onSend branché partout
- [ ] 20+ filtres ajoutés
- [ ] 15+ actions implémentées
- [ ] Composants Claude Design intégrés
- [ ] Pas d'erreurs console

**Bugs à noter** :
- onSend ne fonctionne pas
- Messages n'apparaissent pas
- Filtres cassés
- Actions sans effet
- Composants manquants

---

## 📋 ÉTAPE 4 : VÉRIFIER COMPOSANTS CLAUDE DESIGN

### 4.1 Composants intégrés

Vérifier que ces 11 composants sont bien intégrés :

**Modals** :
- [ ] `AddTeamMemberModal` (Agent 4, TeamPage)
- [ ] `EditPlanningModal` (Agent 4, PlanningPage)
- [ ] `BroadcastModal` (Agent 4 & 5, StaffWhatsAppPage)

**Panels** :
- [ ] `StaffTasksPanel` (Agent 4, StaffWhatsAppPage)

**Sections** :
- [ ] `TravelersSection` (Agent 2, détail réservation)
- [ ] `FinancialSection` (Agent 2, détail réservation)

**Filters** :
- [ ] `AdvancedTaskFilters` (Agent 4, TasksPage)
- [ ] `ColumnSelector` (Agents 2, 3, 4, 5 - plusieurs pages)

**Views** :
- [ ] `ReservationsGanttView` (Agent 2, CalendarPage ou ReservationsPage)

**Pricing** :
- [ ] `PricingRulesEditor` (Agent 3, PricingPage)

**Channels** :
- [ ] `ChannelsDashboard` (Agent 3, ChannelsPage)

### 4.2 Vérifier imports

Pour chaque composant, vérifier dans le code source que l'import est correct :

```typescript
// Exemple
import { AddTeamMemberModal } from '../components/modals/AddTeamMemberModal';
```

**À noter** :
- Imports manquants
- Chemins incorrects
- Composants non utilisés

---

## 📋 ÉTAPE 5 : VÉRIFIER DESIGN

### 5.1 Aurora Soft Light

- [ ] Couleurs respectées :
  - [ ] Primary : #e6b022 (gold)
  - [ ] Secondary : #8b5cf6 (purple)
- [ ] Boutons utilisent les bonnes couleurs
- [ ] Typographie cohérente
- [ ] Espacements corrects

### 5.2 Responsive

Tester sur :
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**À noter** :
- Pages cassées sur mobile
- Overflow horizontal
- Boutons trop petits
- Textes coupés

---

## 📋 ÉTAPE 6 : VÉRIFIER PERSISTANCE

### 6.1 localStorage

Tester :
- [ ] Créer réservation → fermer navigateur → rouvrir → réservation toujours là
- [ ] Modifier listing → reload page → changements persistés
- [ ] Ajouter tâche → reload → tâche présente
- [ ] Configuration colonnes → reload → colonnes correctes

**À noter** :
- Données perdues au reload
- localStorage ne fonctionne pas
- Conflits localStorage

---

## 📋 ÉTAPE 7 : CRÉER LE RAPPORT

### 7.1 Structure du rapport

Créer `docs/RAPPORT_AUDIT_PHASE2.md` avec cette structure :

```markdown
# 🔍 RAPPORT AUDIT PHASE 2

**Date** : [Date]
**Auditeur** : Agent Audit
**Durée** : [X heures]

---

## 📊 RÉSUMÉ EXÉCUTIF

- **Score global** : X/100
- **Bugs bloquants** : X
- **Bugs mineurs** : X
- **Warnings** : X
- **Pages testées** : X/X
- **Composants testés** : X/11

---

## ✅ CE QUI FONCTIONNE

### Agent 1 - Auth + Orchestration
- ✅ Login MOCK OK
- ✅ Dashboard affiché
- ✅ etc.

### Agent 2 - Réservations
- ✅ CreateReservationModal (19 champs) OK
- ✅ Filtres fonctionnent
- ✅ etc.

### Agent 3 - Catalogue
- ✅ PricingRulesEditor intégré
- ✅ ChannelsDashboard intégré
- ✅ etc.

### Agent 4 - Opérations
- ✅ CreateTaskModal (29 champs) OK
- ✅ AddTeamMemberModal intégré
- ✅ etc.

### Agent 5 - Communications
- ✅ onSend branché partout
- ✅ BroadcastModal intégré
- ✅ etc.

---

## ❌ BUGS BLOQUANTS

**IMPORTANT** : Pour chaque bug, spécifier l'agent responsable et lui adresser une remarque directe.

### BUG-001 : [Titre]
- **Sévérité** : BLOQUANT
- **Agent concerné** : Agent X
- **Fichier** : `src/pages/XPage.tsx`
- **Description** : [Description détaillée]
- **Reproduction** :
  1. Aller sur /page
  2. Cliquer sur bouton X
  3. Erreur console
- **Erreur console** : [Copier/coller erreur]
- **Solution proposée** : [Si tu as une idée]
- **📝 Remarque pour Agent X** : [Message direct à l'agent pour corriger]

### BUG-002 : [Titre]
...

---

## ⚠️ BUGS MINEURS

### BUG-MIN-001 : [Titre]
- **Sévérité** : MINEUR
- **Agent concerné** : Agent X
- **Description** : [Description]
- **Impact** : Faible

---

## ⚠️ WARNINGS / AMÉLIORATIONS

### WARN-001 : [Titre]
- **Type** : Performance / UX / Design
- **Description** : [Description]
- **Recommandation** : [Suggestion]

---

## 📊 STATISTIQUES

### Code
- **Lignes de code total** : ~X,XXX lignes
- **Fichiers créés** : X
- **Composants créés** : X
- **Pages créées** : X

### Tests
- **Type-check** : ✅ OK / ❌ X erreurs
- **Build** : ✅ OK / ❌ ÉCHOUÉ
- **Lint** : ✅ OK / ⚠️ X warnings

### Couverture
- **Agent 1** : X% des fonctionnalités testées
- **Agent 2** : X% des fonctionnalités testées
- **Agent 3** : X% des fonctionnalités testées
- **Agent 4** : X% des fonctionnalités testées
- **Agent 5** : X% des fonctionnalités testées
- **Claude Design** : X/11 composants intégrés

---

## 💬 REMARQUES PAR AGENT

**IMPORTANT** : Cette section doit contenir des remarques spécifiques adressées directement à chaque agent.

### 📝 Agent 1 - Auth + Orchestration

**Ce qui est bien** :
- [Points positifs]

**🚨 BUGS CRITIQUES IDENTIFIÉS** :
- ❌ **RÉGRESSION** : Boutons Plan Orchestration non fonctionnels
  - Clic sur "RÉSA #1234" n'ouvre pas le modal détail réservation
  - Clic sur timeline events ne fait rien
  - **ACTION** : Brancher TOUS les boutons de la timeline
  - **RÉFÉRENCE** : Auditer `/orchestration` dans l'ancien dashboard (`sojori-dashboard`)
  - **SOLUTION** : S'inspirer de l'existant pour intégrer les modals
  - Si besoin de design → demander à Claude Design

**Ce qui doit être corrigé** :
- [ ] Brancher boutons timeline orchestration
- [ ] Ouvrir modal détail réservation au clic sur RÉSA
- [ ] Ouvrir modal message au clic sur événement message
- [ ] Gérer erreur React (error boundary)
- [Autres bugs spécifiques Agent 1]

**Suggestions d'amélioration** :
- Comparer avec l'ancien dashboard pour ne rien oublier
- Ajouter error boundaries pour capturer les erreurs React
- [Autres recommandations]

---

### 📝 Agent 2 - Réservations

**Ce qui est bien** :
- [Points positifs]

**🚨 BUGS CRITIQUES IDENTIFIÉS** :
- ❌ **RÉGRESSION** : Vue Séjour / Réservations par listing MANQUANTE
  - **CONTEXTE** : L'ancien dashboard affichait les réservations groupées par listing (multi-listings)
  - **PROBLÈME** : Cette page existait déjà, elle a disparu ou n'a pas été migrée
  - **ACTION** : Auditer la page "Séjour" ou "Réservations par listing" dans l'ancien dashboard
  - **SOLUTION** : Recréer cette vue en s'inspirant de l'existant
  - Si besoin de design → demander à Claude Design

**Ce qui doit être corrigé** :
- [ ] **URGENT** : Restaurer la vue "Séjour" (réservations par listing)
- [ ] Vérifier que toutes les vues réservations de l'ancien sont présentes
- [ ] Modal détail réservation doit s'ouvrir depuis la timeline orchestration
- [Autres bugs spécifiques Agent 2]

**Suggestions d'amélioration** :
- Comparer toutes les vues réservations avec l'ancien dashboard
- S'assurer qu'aucune fonctionnalité n'a été oubliée
- [Autres recommandations]

---

### 📝 Agent 3 - Catalogue

**Ce qui est bien** :
- [Points positifs]

**Ce qui doit être corrigé** :
- [Bugs spécifiques Agent 3]

**Suggestions d'amélioration** :
- [Recommandations]

---

### 📝 Agent 4 - Opérations

**Ce qui est bien** :
- [Points positifs]

**Ce qui doit être corrigé** :
- [Bugs spécifiques Agent 4]

**Suggestions d'amélioration** :
- [Recommandations]

---

### 📝 Agent 5 - Communications

**Ce qui est bien** :
- [Points positifs]

**Ce qui doit être corrigé** :
- [Bugs spécifiques Agent 5]

**Suggestions d'amélioration** :
- [Recommandations]

---

### 📝 Claude Design - Composants

**Ce qui est bien** :
- [Points positifs]

**Problèmes d'intégration** :
- [Composants mal intégrés ou manquants]

**Suggestions d'amélioration** :
- [Recommandations]

---

## 🎯 RECOMMANDATIONS

### Priorité 1 (URGENT)
1. Corriger BUG-001 (bloquant) → **Agent X**
2. Corriger BUG-002 (bloquant) → **Agent Y**

### Priorité 2 (IMPORTANT)
1. Corriger bugs mineurs → **Agent X, Y, Z**
2. Améliorer performance

### Priorité 3 (NICE TO HAVE)
1. Améliorations UX
2. Refactoring

---

## 📋 CHECKLIST VALIDATION

Avant de passer à Phase 3 (APIs) :

- [ ] Type-check OK (0 erreur)
- [ ] Build OK (0 erreur)
- [ ] Toutes les pages s'affichent
- [ ] Tous les boutons fonctionnent
- [ ] Toutes les modals s'ouvrent
- [ ] Tous les filtres filtrent
- [ ] Toutes les actions affichent toast
- [ ] Design cohérent
- [ ] Responsive OK
- [ ] localStorage fonctionne
- [ ] 11 composants Claude Design intégrés

---

## 🚀 PROCHAINE ÉTAPE

**Si bugs bloquants** : Assigner corrections à chaque agent

**Si tout OK** : Passer à Phase 3 - Connexion APIs réelles

---

## 📎 ANNEXES

### Fichiers testés
- Liste complète des fichiers testés

### Logs erreurs
- Copie complète des erreurs console

### Screenshots
- Screenshots des bugs si nécessaire
```

---

## 📋 ÉTAPE 8 : COMMIT

Une fois le rapport terminé :

```bash
git add docs/RAPPORT_AUDIT_PHASE2.md
git commit -m "audit: rapport complet Phase 2 - Agent Audit"
git push
```

---

## ✅ CHECKLIST FINALE

Avant de livrer :

- [ ] Toutes les pages testées
- [ ] Tous les composants testés
- [ ] Tous les bugs documentés
- [ ] Rapport complet créé
- [ ] Statistiques calculées
- [ ] Recommandations fournies
- [ ] Rapport committé

---

## 🎯 OBJECTIF FINAL

À la fin de ton audit, on doit avoir :

1. **Un rapport complet** dans `docs/RAPPORT_AUDIT_PHASE2.md`
2. **Une liste de bugs** priorisée (bloquants, mineurs, warnings)
3. **Des recommandations** claires pour la suite
4. **Une décision** : corriger bugs OU passer aux APIs

**Durée totale estimée** : 2-4 heures

---

## 🔍 COMPARAISON AVEC L'ANCIEN DASHBOARD

**Ajoute une section dans le rapport pour comparer** :

### 🆚 Nouveau vs Ancien

**RÉGRESSIONS IDENTIFIÉES** (Fonctionnalités présentes dans l'ancien mais manquantes dans le nouveau) :
- ❌ **Vue Séjour** : Réservations groupées par listing (Agent 2)
- ❌ **Boutons Orchestration** : Timeline non interactive (Agent 1)
- ❌ **Modals manquants** : [À compléter après audit complet]
- [Autres à identifier]

**BUGS CRITIQUES** :
- ❌ Erreur React non gérée (error boundary manquant)
- ❌ Boutons non fonctionnels sur plusieurs pages
- [Autres à identifier]

**Améliorations du nouveau par rapport à l'ancien** :
- ✅ Design Aurora Soft Light (si cohérent)
- ✅ TypeScript strict
- ✅ Composants Claude Design intégrés
- [Autres à identifier]

**Incohérences de design** :
- [À identifier après comparaison visuelle]

**MODALS À VÉRIFIER/MIGRER** :
Pour chaque modal de l'ancien, vérifier s'il existe dans le nouveau :
- [ ] Modal détail réservation (timeline orchestration)
- [ ] Modal vue séjour/listing
- [ ] Modal détail message
- [ ] Modal détail tâche
- [ ] [Tous les autres à identifier]

**Recommandations de migration** :
1. **URGENT** : Auditer TOUS les modals de l'ancien dashboard
2. **URGENT** : Créer une liste exhaustive des modals manquants
3. Assigner chaque modal manquant à l'agent concerné
4. Si besoin de design → demander à Claude Design
5. S'inspirer du code existant dans `sojori-dashboard` pour les fonctionnalités

---

---

## 📋 AUDIT COMPLET DES MODALS (PRIORITÉ ABSOLUE)

**AVANT TOUT, tu dois créer une liste exhaustive des modals** :

### Étape 1 : Auditer l'ancien dashboard

```bash
# Lancer l'ancien dashboard
cd /Users/gouacht/sojori-dashboard
# (vérifier comment le lancer - probablement PORT=3000 npm start)
```

**Mission** : Parcourir TOUTES les pages et cliquer sur TOUS les boutons pour identifier TOUS les modals.

**Créer un fichier** : `docs/AUDIT_MODALS_ANCIEN_DASHBOARD.md`

**Structure** :
```markdown
# Audit Modals - Ancien Dashboard

## Page : Orchestration

### Modal : Détail Réservation
- **Déclencheur** : Clic sur "RÉSA #1234" dans timeline
- **Contenu** :
  - Section 1 : [Description]
  - Section 2 : [Description]
  - Champs : [Liste]
  - Boutons : [Liste]
- **Screenshot** : [Si possible]
- **Fichier source** : [Si trouvé dans le code]
- **Agent concerné** : Agent 2

### Modal : [Autre modal]
...

## Page : Réservations

### Modal : Vue Séjour (Réservations par listing)
...

## Page : Tasks
...

## Page : Communications
...

[Etc. pour TOUTES les pages]
```

### Étape 2 : Comparer avec le nouveau dashboard

Pour chaque modal identifié dans l'ancien :
- [ ] Existe-t-il dans le nouveau ? OUI/NON
- [ ] Si OUI : Fonctionne-t-il correctement ?
- [ ] Si NON : **BUG BLOQUANT** → À créer

**Créer un fichier** : `docs/MODALS_MANQUANTS.md`

**Structure** :
```markdown
# Modals Manquants - Nouveau Dashboard

## ❌ MODALS À CRÉER (Absents du nouveau)

### Agent 1 - Orchestration
1. **Modal Détail Réservation (depuis timeline)**
   - Référence : `sojori-dashboard/src/...`
   - Priorité : BLOQUANT
   - Design : À demander à Claude Design si besoin

2. [Autres modals Agent 1]

### Agent 2 - Réservations
1. **Vue Séjour / Réservations par listing**
   - Référence : `sojori-dashboard/src/...`
   - Priorité : BLOQUANT
   - Design : À demander à Claude Design si besoin

2. [Autres modals Agent 2]

### Agent 3 - Catalogue
[Liste]

### Agent 4 - Opérations
[Liste]

### Agent 5 - Communications
[Liste]
```

---

## 🚀 ACTION IMMÉDIATE

**ORDRE PRIORITAIRE** :

### 1️⃣ AUDIT MODALS ANCIEN DASHBOARD (1-2h)

```bash
cd /Users/gouacht/sojori-dashboard
# Lancer le dashboard
```

- Parcourir TOUTES les pages
- Cliquer sur TOUS les boutons
- Noter TOUS les modals qui s'ouvrent
- Créer `docs/AUDIT_MODALS_ANCIEN_DASHBOARD.md`

### 2️⃣ COMPARAISON NOUVEAU DASHBOARD (30min)

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4000
```

- Comparer page par page
- Identifier les modals manquants
- Créer `docs/MODALS_MANQUANTS.md`

### 3️⃣ TYPE-CHECK & BUILD (15min)

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm type-check
pnpm build
```

### 4️⃣ TEST FONCTIONNEL COMPLET (1-2h)

- Teste TOUTES les pages (voir checklist ci-dessus)
- Note TOUS les bugs par agent

### 5️⃣ RAPPORT FINAL (30min)

- Crée le rapport complet `docs/RAPPORT_AUDIT_PHASE2.md`
- **Adresse des remarques spécifiques à chaque agent**
- Commit et push

**Durée estimée totale** : 3-5 heures

---

## 📝 LIVRABLES ATTENDUS

1. ✅ `docs/AUDIT_MODALS_ANCIEN_DASHBOARD.md` - Liste exhaustive des modals de l'ancien
2. ✅ `docs/MODALS_MANQUANTS.md` - Modals à créer par agent
3. ✅ `docs/RAPPORT_AUDIT_PHASE2.md` - Rapport complet avec bugs et remarques

---

Bonne chance ! 🚀
