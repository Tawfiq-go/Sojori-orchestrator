# 🔍 AUTO-AUDIT AGENT 4 - Bugs & Fonctionnalités Manquantes

**Date**: 2026-05-14
**Agent**: Agent 4 - Operations
**Scope**: Comparaison ancien dashboard (sojori-dashboard) vs nouveau (Sojori-orchestrator)

---

## 📋 TABLE DES MATIÈRES

1. [P1 - TASKS: Bugs identifiés](#p1---tasks-bugs-identifiés)
2. [P2 - TEAM: Bugs identifiés](#p2---team-bugs-identifiés)
3. [Modals manquants critiques](#modals-manquants-critiques)
4. [Fonctionnalités manquantes](#fonctionnalités-manquantes)
5. [Plan de correction](#plan-de-correction)

---

## 🚨 P1 - TASKS: Bugs identifiés

### ❌ BUG 1.1: Modal CreateTaskModal incomplet vs AddTask.jsx

**Ancien (sojori-dashboard)**: `src/features/tasks/components/Calendar/AddTask.jsx` (763 lignes)

**Nouveau (Sojori-orchestrator)**: `src/components/tasks/CreateTaskModal.tsx` (615 lignes)

**Différences critiques**:

| Feature | Ancien ✅ | Nouveau ❌ | Priorité |
|---------|----------|-----------|----------|
| **Stepper 4 étapes** | ✅ 4 steps (Basic Info, Note, Additional Details, Images) | ❌ 1 seul Accordion plat | 🔴 CRITIQUE |
| **Recherche réservation** | ✅ Bouton Search avec API `getReservationByNumber()` | ❌ Simple TextField mock | 🔴 CRITIQUE |
| **Upload images** | ✅ Composant `ImageUpload` avec preview + delete | ❌ Absent | 🟠 IMPORTANT |
| **Services listing** | ✅ Sélection multi-services avec options (pickup/price) | ❌ Absent | 🟠 IMPORTANT |
| **Mode Auto/Manu** | ✅ Select avec 2 options | ❌ Absent | 🟡 MOYEN |
| **TS_CLEAN sync** | ✅ Sync automatique avec `listing.TS_CLEAN` | ❌ Absent | 🟡 MOYEN |
| **Validation Yup complète** | ✅ Schema avec 15+ champs | ✅ Présent mais simplifié | ✅ OK |
| **End date toggle** | ✅ Bouton CalendarOff/CalendarDays pour show/hide endDate | ❌ Absent | 🟡 MOYEN |
| **Staff loading dynamique** | ✅ Fetch staff par ownerId avec `getStaffOwner()` | ❌ Staff statique mock | 🔴 CRITIQUE |
| **Task status complet** | ✅ 7 statuts (PENDING, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELED, CANCELED-BY-CUST) | ✅ 8 statuts présents | ✅ OK |
| **Assignment status** | ✅ 4 statuts (ASSIGNED, UNASSIGNED, ACCEPTED, REFUSED) | ❌ Absent | 🟠 IMPORTANT |
| **Task Status field** | ✅ Select START/END/None | ❌ Absent | 🟡 MOYEN |
| **TS_VAL checkbox** | ✅ Confirmed checkbox | ❌ Présent dans code mais pas visible | 🟡 MOYEN |
| **Descriptions array dynamique** | ✅ Add/Remove boutons pour multiple descriptions | ✅ Présent | ✅ OK |
| **Payment mode** | ✅ Cash/Card select | ✅ Présent | ✅ OK |
| **Emergency** | ✅ Normal/Urgent/Critical | ✅ Présent (priority) | ✅ OK |
| **Presence** | ✅ P/N select | ✅ Présent | ✅ OK |
| **Réservation details display** | ✅ Box avec PersonIcon + DateRangeIcon + guest name + dates | ❌ Absent | 🟠 IMPORTANT |

**Gravité**: 🔴 **CRITIQUE** - Le modal est trop simplifié et manque de fonctionnalités essentielles.

---

### ❌ BUG 1.2: Modal AssignTask manquant

**Ancien**: `src/features/tasks/components/Calendar/AssignTask.jsx` (101 lignes)

**Nouveau**: ❌ **ABSENT TOTALEMENT**

**Description**:
- Modal dédié pour assigner/réassigner un staff à une task
- Affiche "Currently assigned to: {staff.username}" si déjà assigné
- API call: `AssignTaskToStaff(task.id, staffId)`
- Texte dynamique: "Assign Task" vs "Update Task Assignment"
- Disabled si même staffId sélectionné

**Action requise**: 🔴 **CRÉER** le modal `AssignTaskModal.tsx`

---

### ❌ BUG 1.3: Modal DetailsTask manquant

**Ancien**: `src/features/tasks/components/Calendar/DetailsTask.jsx`

**Nouveau**: ❌ **ABSENT TOTALEMENT**

**Description**:
- Modal de visualisation complète d'une task (read-only ou editable)
- Affiche toutes les informations détaillées
- Boutons d'actions intégrés

**Action requise**: 🔴 **CRÉER** le modal `TaskDetailsModal.tsx`

---

### ❌ BUG 1.4: Filtres incomplets

**Ancien**: Plusieurs filtres avancés:
- `TaskGlobalFilter.jsx`
- `TaskSearchFilter.jsx`
- `TaskListingFilter.jsx`
- `TaskPriorityFilter.jsx`
- `TaskDateProximityFilter.jsx`
- `ReservationSearchFilter.jsx`
- `QuickSearchFilter.jsx`

**Nouveau**: `TaskFilters.tsx` avec 15+ filtres ✅

**Status**: ✅ **OK** - Les filtres du nouveau sont MEILLEURS (consolidés)

---

### ❌ BUG 1.5: Actions manquantes dans TasksPage

**Ancien (PublicStaff.jsx patterns)**:
- Edit (avec modal complet)
- Delete (avec confirmation dialog)
- Assign (avec AssignTask modal)
- View Details (avec DetailsTask modal)
- Duplicate
- Export selected

**Nouveau (TasksPage.tsx)**:
- ✅ View Details (toast mock)
- ✅ Edit (ouvre CreateTaskModal)
- ❌ Assign (toast mock)
- ✅ Delete (toast mock)

**Actions manquantes**:
- 🔴 Assign Task (besoin modal AssignTaskModal)
- 🟡 Duplicate Task
- 🟡 Export Selected Tasks

---

## 🚨 P2 - TEAM: Bugs identifiés

### ❌ BUG 2.1: Modal AddTeamMemberModal incomplet vs CreateStaffSidebar.jsx

**Ancien**: `src/features/staff/components/CreateStaffSidebar.jsx` (700+ lignes)

**Nouveau**: `src/components/team/AddTeamMemberModal.tsx` (735 lignes)

**Différences critiques**:

| Feature | Ancien ✅ | Nouveau ❌ | Priorité |
|---------|----------|-----------|----------|
| **Sidebar format** | ✅ Slide-in depuis droite (600px width) | ❌ Dialog centré | 🟡 MOYEN (UX) |
| **Owner selection** | ✅ Select dynamique avec API `getOwners()` | ❌ Absent (seulement mock) | 🔴 CRITIQUE |
| **Staff Type** | ✅ Select: salaried/freelance/contractor | ❌ Absent | 🟠 IMPORTANT |
| **Pricing per task type** | ✅ Object `pricingPerTaskType: {}` | ❌ Absent | 🟠 IMPORTANT |
| **Listing selector** | ✅ Composant `ListingSelector` avec "All" option | ❌ Absent | 🔴 CRITIQUE |
| **Task types multi-select** | ✅ Checkbox list avec taskTypes depuis API | ❌ Absent (seulement role simple) | 🔴 CRITIQUE |
| **Countries multi-select** | ✅ Avec option "All" | ❌ Absent | 🟡 MOYEN |
| **Cities multi-select** | ✅ Avec option "All" | ❌ Absent (seulement zone unique) | 🟠 IMPORTANT |
| **Languages multi-select** | ✅ Checkbox list depuis API | ✅ Présent (Autocomplete) | ✅ OK |
| **Email field** | ✅ TextField avec validation Yup email | ✅ Présent | ✅ OK |
| **Two phone fields** | ✅ callPhone + whatsappPhone séparés | ✅ Présent (phone + emergencyPhone) | ✅ OK |
| **Contract type** | ✅ CDI/CDD/CDD-I/Freelance | ✅ Présent | ✅ OK |
| **Salary** | ✅ TextField number | ✅ Présent | ✅ OK |
| **Hire date** | ✅ Date picker | ✅ Présent | ✅ OK |
| **Documents upload** | ✅ Tab 3 avec upload | ✅ Présent (Tab 3) | ✅ OK |
| **Planning tab** | ✅ Mais séparé dans ModifyStaffPlanning | ✅ Présent (Tab 2) | ✅ OK |
| **API Integration** | ✅ `CreateStaff()` API call | ❌ Mock only | 🔴 CRITIQUE |
| **Error handling** | ✅ `handleErrorResponse()` avec Array support | ❌ Simple toast | 🟡 MOYEN |
| **RBAC permissions** | ✅ RoleBasedRenderer + `can()` checks | ❌ Absent | 🟠 IMPORTANT |
| **Loading states** | ✅ CircularProgress pendant fetch | ❌ Absent | 🟡 MOYEN |

**Gravité**: 🔴 **CRITIQUE** - Manque des champs essentiels et API intégration

---

### ❌ BUG 2.2: Modal ModifyStaffSidebar manquant

**Ancien**: `src/features/staff/components/ModifyStaffSidebar.jsx`

**Nouveau**: Le modal `AddTeamMemberModal` gère création ET édition ✅

**Status**: ✅ **OK** - Pattern différent mais fonctionnel

---

### ❌ BUG 2.3: Modal ModifyStaffPlanning manquant

**Ancien**: `src/features/staff/components/ModifyStaffPlanningNew.jsx` + Wrapper

**Description**:
- Modal dédié pour gérer le planning complet d'un staff
- Probablement beaucoup plus complexe que le Tab 2 actuel
- Gestion des exceptions, congés, horaires spéciaux

**Nouveau**: Tab 2 "Planning" dans `AddTeamMemberModal` (simplifié)

**Différence**:
- Ancien: Modal séparé avec logique avancée
- Nouveau: Tab intégré avec 7 jours + timings basiques

**Gravité**: 🟠 **IMPORTANT** - Le planning actuel est trop basique

**Action requise**: 🟠 **ENRICHIR** le Tab 2 Planning OU créer modal séparé `EditPlanningModal`

---

### ❌ BUG 2.4: Page TeamPage incomplète vs Staff.page.jsx

**Ancien**: `src/features/staff/Staff.page.jsx` + `PublicStaff.jsx`

**Nouveau**: `src/pages/TeamPage.tsx` (580 lignes)

**Différences**:

| Feature | Ancien ✅ | Nouveau ❌ | Priorité |
|---------|----------|-----------|----------|
| **Pagination API** | ✅ `page`, `limit`, server-side | ❌ Client-side avec mock | 🔴 CRITIQUE |
| **Search API** | ✅ `search_text` param API | ❌ Client-side filter | 🔴 CRITIQUE |
| **Filters API** | ✅ `listings`, `types`, `languages` params | ❌ Client-side filter | 🔴 CRITIQUE |
| **Total count** | ✅ `response.total` depuis API | ❌ `mockTeamMembers.length` | 🔴 CRITIQUE |
| **Delete confirmation** | ✅ Dialog avec state `deleteDialogOpen` | ❌ Simple toast | 🟠 IMPORTANT |
| **RBAC permissions** | ✅ `canCreate`, `canUpdate`, `canDelete` checks | ❌ Absent | 🟠 IMPORTANT |
| **Staff listing popup** | ✅ `ListingPopup` modal pour voir listings | ❌ Absent | 🟡 MOYEN |
| **Loading states** | ✅ CircularProgress pendant fetch | ❌ Absent | 🟡 MOYEN |
| **Error handling** | ✅ Try/catch avec fallbacks | ❌ Basique | 🟡 MOYEN |

**Gravité**: 🔴 **CRITIQUE** - Pas de vraie intégration API

---

### ❌ BUG 2.5: Filtres TeamFilters incomplets

**Ancien**: `src/features/staff/components/StaffFilters.jsx`

**Nouveau**: `src/components/team/TeamFilters.tsx`

**Comparaison**:

| Filter | Ancien ✅ | Nouveau ✅/❌ | Priorité |
|--------|----------|-------------|----------|
| Search text | ✅ | ✅ | ✅ OK |
| Roles | ✅ | ✅ (limité à 6 roles) | 🟡 MOYEN |
| Statuses | ✅ | ✅ | ✅ OK |
| Listings | ✅ Multi-select | ❌ Absent | 🔴 CRITIQUE |
| Task types | ✅ Multi-select | ❌ Absent | 🔴 CRITIQUE |
| Languages | ✅ Multi-select | ❌ Absent (indirect via skills) | 🟡 MOYEN |
| Availability day | ✅ | ✅ | ✅ OK |
| Zones | ✅ | ✅ | ✅ OK |
| Skills | ❌ (pas dans ancien) | ✅ | ✅ BONUS |
| Complete schedule | ❌ (pas dans ancien) | ✅ | ✅ BONUS |

**Gravité**: 🔴 **CRITIQUE** - Manque filtres listings et task types essentiels

---

## 🚨 Modals manquants critiques

### 1. ❌ AssignTaskModal
- **Priorité**: 🔴 CRITIQUE
- **Référence**: `src/features/tasks/components/Calendar/AssignTask.jsx`
- **Usage**: Assigner/réassigner staff à une task
- **Estimation**: 2h

### 2. ❌ TaskDetailsModal
- **Priorité**: 🔴 CRITIQUE
- **Référence**: `src/features/tasks/components/Calendar/DetailsTask.jsx`
- **Usage**: Voir détails complets d'une task
- **Estimation**: 3h

### 3. ❌ EditPlanningModal (optionnel)
- **Priorité**: 🟠 IMPORTANT
- **Référence**: `src/features/staff/components/ModifyStaffPlanningNew.jsx`
- **Usage**: Gérer planning avancé avec exceptions
- **Estimation**: 4h
- **Alternative**: Enrichir Tab 2 de AddTeamMemberModal (2h)

### 4. ❌ ListingPopup
- **Priorité**: 🟡 MOYEN
- **Référence**: `src/features/staff/components/ListingPopup.jsx`
- **Usage**: Voir listings assignés à un staff
- **Estimation**: 1h

### 5. ❌ DeleteConfirmationDialog (pattern)
- **Priorité**: 🟠 IMPORTANT
- **Référence**: Pattern dans `PublicStaff.jsx` (lignes 56-58)
- **Usage**: Confirmation avant delete avec dialog
- **Estimation**: 1h

---

## 🔧 Fonctionnalités manquantes

### TASKS

#### 🔴 CRITIQUES
1. **Stepper 4 étapes** dans CreateTaskModal
2. **API Recherche réservation** avec `getReservationByNumber()`
3. **Upload images** avec preview et delete
4. **Staff loading dynamique** par ownerId
5. **API Integration** pour create/update tasks

#### 🟠 IMPORTANTES
6. **Services listing** sélection avec options
7. **Assignment status** field (4 états)
8. **Réservation details display** box stylé
9. **Modal AssignTask** complet
10. **Modal TaskDetails** complet

#### 🟡 MOYENNES
11. **Mode Auto/Manu** select
12. **TS_CLEAN sync** automatique
13. **End date toggle** avec icônes
14. **Task Status** field (START/END/None)
15. **Duplicate task** action
16. **Export selected tasks** action

### TEAM

#### 🔴 CRITIQUES
17. **API Integration** complète pour team CRUD
18. **Owner selection** dynamique
19. **Listing selector** avec option "All"
20. **Task types multi-select** pour staff
21. **Filtres listings** et **task types** dans TeamFilters
22. **Pagination server-side**
23. **Search API** integration

#### 🟠 IMPORTANTES
24. **Staff Type** field (salaried/freelance/contractor)
25. **Pricing per task type** object
26. **Cities multi-select** avec "All"
27. **RBAC permissions** checks (canCreate, canUpdate, canDelete)
28. **Delete confirmation dialog**
29. **Planning enrichi** (exceptions, congés)

#### 🟡 MOYENNES
30. **Countries multi-select**
31. **Error handling** avancé avec Array support
32. **Loading states** avec CircularProgress
33. **ListingPopup** modal
34. **Sidebar format** vs Dialog (UX)

---

## 📝 Plan de correction

### Phase 1: CRITIQUES (Priorité 🔴) - 12-16h

1. **Refonte CreateTaskModal avec Stepper** (4h)
   - Convertir Accordion vers Stepper 4 étapes
   - Intégrer API recherche réservation
   - Ajouter upload images
   - Staff loading dynamique

2. **Créer AssignTaskModal** (2h)
   - Modal dédié avec API `AssignTaskToStaff()`
   - État "currently assigned"

3. **Créer TaskDetailsModal** (3h)
   - Modal read-only/editable
   - Affichage complet des infos

4. **API Integration TASKS** (2h)
   - Connecter createTask/updateTask APIs
   - Gestion erreurs avancée

5. **API Integration TEAM** (3-4h)
   - Connecter CreateStaff/UpdateStaff APIs
   - Pagination server-side
   - Search et filters API

6. **Enrichir AddTeamMemberModal** (2-3h)
   - Owner selection
   - Staff Type
   - Listing selector
   - Task types multi-select
   - Cities multi-select
   - Pricing per task type

7. **Enrichir TeamFilters** (1h)
   - Ajouter filtre Listings
   - Ajouter filtre Task Types

### Phase 2: IMPORTANTES (Priorité 🟠) - 6-8h

8. **Services listing** dans CreateTaskModal (1h)
9. **Assignment status** field (0.5h)
10. **Réservation details display** (0.5h)
11. **Delete confirmation dialogs** (1h)
12. **RBAC permissions** checks (1h)
13. **Enrichir Planning Tab 2** (2-3h)
    - Exceptions
    - Congés
    - Horaires spéciaux
14. **Error handling** avancé (1h)

### Phase 3: MOYENNES (Priorité 🟡) - 4-6h

15. **Mode Auto/Manu, TS_CLEAN sync, End date toggle** (1h)
16. **Task Status field** (0.5h)
17. **Duplicate et Export** actions (1h)
18. **Countries multi-select** (0.5h)
19. **Loading states** partout (1h)
20. **ListingPopup** modal (1h)

---

## 📊 Statistiques

- **Bugs critiques** (🔴): 10
- **Bugs importants** (🟠): 12
- **Bugs moyens** (🟡): 12
- **Total bugs**: 34
- **Temps correction estimé**: 22-30h
- **Modals à créer**: 3-4
- **Modals à enrichir**: 2
- **APIs à intégrer**: 6-8

---

## 🎯 Recommandations

### Actions immédiates (aujourd'hui)

1. ✅ **Commencer Phase 1** avec les 🔴 CRITIQUES
2. 🔴 **Créer AssignTaskModal** (Quick win 2h)
3. 🔴 **Refonte CreateTaskModal Stepper** (4h)

### Actions court terme (cette semaine)

4. 🔴 **API Integration** complète TASKS + TEAM (5-6h)
5. 🔴 **Enrichir AddTeamMemberModal** avec champs manquants (3h)
6. 🟠 **Phase 2** : Fonctionnalités importantes

### Actions moyen terme (semaine prochaine)

7. 🟡 **Phase 3** : Fonctionnalités moyennes
8. ✅ **Tests complets** de toutes les corrections
9. ✅ **Documentation** mise à jour

---

## ✅ Conclusion

Le travail P1 (TASKS) et P2 (TEAM) est **fonctionnel à 60%** mais manque de **nombreuses fonctionnalités critiques** présentes dans l'ancien dashboard.

**Points positifs** ✅:
- Structure de base solide
- Filtres consolidés et améliorés
- TypeScript strict
- Design cohérent

**Points négatifs** ❌:
- Trop de MOCK, pas assez d'API integration
- Modals trop simplifiés vs ancien
- Champs essentiels manquants (Owner, Staff Type, Listings, etc.)
- Pas de RBAC permissions
- Pas de vraie pagination server-side

**Verdict**: 🔴 **NÉCESSITE CORRECTIONS MAJEURES** avant production.

---

**Prochaine étape**: Commencer Phase 1 avec `AssignTaskModal` (quick win 2h) puis `CreateTaskModal Stepper` (4h).
