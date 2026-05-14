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
- **URL** : Vérifier avec l'utilisateur
- **Projet** : `/Users/gouacht/sojori-dashboard`
- **Status** : En production

**TA MISSION** : Comparer les deux sites et identifier :
- Incohérences de design
- Fonctionnalités manquantes dans le nouveau
- Régressions potentielles
- Points d'amélioration

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

**Ce qui doit être corrigé** :
- [Bugs spécifiques Agent 1]

**Suggestions d'amélioration** :
- [Recommandations]

---

### 📝 Agent 2 - Réservations

**Ce qui est bien** :
- [Points positifs]

**Ce qui doit être corrigé** :
- [Bugs spécifiques Agent 2]

**Suggestions d'amélioration** :
- [Recommandations]

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

**Fonctionnalités présentes dans l'ancien mais manquantes dans le nouveau** :
- [Liste]

**Améliorations du nouveau par rapport à l'ancien** :
- [Liste]

**Incohérences de design** :
- [Liste]

**Recommandations de migration** :
- [Liste]

---

## 🚀 ACTION IMMÉDIATE

**GO ! Commence par** :

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm type-check
```

**Ensuite** :
1. Lance `pnpm dev --port 4000`
2. Ouvre http://localhost:4000
3. Teste TOUTES les pages (voir checklist ci-dessus)
4. Note TOUS les bugs par agent
5. Compare avec l'ancien dashboard si disponible
6. Crée le rapport complet `docs/RAPPORT_AUDIT_PHASE2.md`
7. **Adresse des remarques spécifiques à chaque agent**
8. Commit et push

**Durée estimée** : 2-4 heures

Bonne chance ! 🚀
