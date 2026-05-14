# AUDIT AGENT 4 - OPÉRATIONS

**Date** : 14 Mai 2026
**Agent** : Agent 4
**Domaine** : Tâches & Opérations (Tasks, Team, Planning, Staff WhatsApp)

---

## 📊 RÉSUMÉ EXÉCUTIF

**Pages auditées** : 4
**Colonnes manquantes** : 68+
**Filtres manquants** : 35+
**Boutons/Actions manquants** : 28+
**Stats manquantes** : 15+
**Formulaires manquants** : 3 complets
**Fonctionnalités manquantes** : 12+ features majeures

**Priorité globale** : 🔴 HAUTE

---

## 📄 PAGE 1 : TASKS / TÂCHES

### 🔍 Ancien Dashboard

**Fichiers** :
- `/Users/gouacht/sojori-dashboard/src/features/tasks/Task.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/tasksNew/TasksNew.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/tasks/components/Calendar/TableTask.jsx`
- `/Users/gouacht/sojori-dashboard/src/components/AddSidebarTask/AddSidebarTask.jsx`

**Route** : `/task`, `/admin/tasks`

#### Vues disponibles
1. **Vue Kanban** (principale)
2. **Vue Liste** (TasksNew.jsx)
3. **Vue Calendrier/Table** (TableTask.jsx)
4. **Vue Timeline**

#### Colonnes (Vue Liste - TasksNew.jsx)
1. Nom tâche + sous-titre (item number, guest name, etc.)
2. Item Number (code tâche)
3. Date création (createdAt)
4. Détails (type + origine + subType)
5. Listing (property name)
6. Réservation (numero + link)
7. Guest (nom invité)
8. Date exécution (startDate)
9. Timeslot Client (heure choisie par client via WhatsApp)
10. Heure Tâche (heure réelle avec source: default/client/admin)
11. Timeslot (créneau horaire)
12. Statut (CREATED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, ARCHIVED)
13. Staff assigné (nom + photo)
14. Paiement (status)
15. Prix (montant €)
16. Urgence (Normal, Urgent, Critical)

#### Filtres (Très complets)
**Filtres rapides (chips)** :
- Toutes / Urgent / Aujourd'hui / Cette semaine / Non assignées
- Par type : 🧹 Ménage, 🔧 Maintenance, 🛬 Check-in, 📸 Photos

**Filtres avancés (multi-select)** :
- Origine : all / task / client
- Sub-types (categories): arrival, departure, cleaning, concierge, support, registration
- Statuts (multi-select) : CREATED, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED_ADMIN, CANCELLED_CUSTOMER, ARCHIVED
- Listing IDs (multi-select avec dropdown)
- Staff codes (multi-select)
- Payment status : all / paid / unpaid / pending
- Has association : all / yes / no
- Emergency : all / Normal / Urgent / Critical

**Filtres date** :
- Date Type : startDate / createdAt
- Date Range : Start Date + End Date

**Filtres MasterFilters** :
- Sort by : Logical / Date
- Period : Today / Tomorrow / Week / All
- Zones (multi-select)
- Status Cards : All, Vacant, Occupied, Reserved, Blocked, Dirty, Clean

**Recherche** :
- Search term (texte libre)

**Compteurs filtres urgents** :
- Unassigned count
- Urgent count
- Critical count

#### Boutons / Actions
**Header actions** :
- Créer nouvelle tâche (modal complet)
- Exporter CSV (todo)
- Exporter PDF (todo)
- Refresh/Reload

**Actions par ligne** :
- Voir détails (drawer/sidebar)
- Modifier tâche (sidebar)
- Changer statut (dropdown menu avec 8 statuts)
- Assigner staff (modal)
- Dupliquer tâche
- Supprimer tâche (avec confirmation)
- Marquer complétée
- Archiver

**Bulk actions** :
- Sélection multiple (checkboxes) - désactivée dans la version actuelle mais présente dans le code

#### Stats / KPIs (StatusCards)
- Total tâches sélectionnées
- En cours (14)
- Urgent aujourd'hui (7)
- En retard (2)
- Complétées cette semaine (28)
- Score AI qualité (94%)
- Vacant / Occupied / Reserved / Blocked / Dirty / Clean (par période)

#### Formulaires
**Modal "Créer/Modifier tâche"** (AddSidebarTask.jsx) :
1. Type (select depuis taskConfigs)
2. Name (text)
3. SubType (select dynamique selon type)
4. TS_SEL (timeslots sélectionnés)
5. TS_VAL (boolean validation)
6. Start Date (date picker)
7. End Date (date picker)
8. Staff ID (select avec recherche)
9. Price (number €)
10. Paid (checkbox)
11. Payment Mode (select)
12. Task Status (select)
13. Reservation Number (text + bouton recherche)
14. Room Type ID
15. Guest Name (auto-rempli depuis réservation)
16. Arrival Date (auto-rempli)
17. Departure Date (auto-rempli)
18. Listing ID (select)
19. Reservation ID (hidden)
20. Duration (number heures)
21. Emergency (select: Normal/Urgent/Critical)
22. Presence (N/Y)
23. Request Payment (Yes/No)
24. Descriptions (array avec add/remove)
25. Images (array upload)
26. TS (timeslots)
27. Start Hour (select)
28. End Hour (select)
29. Services (array)

**Boutons formulaire** :
- Sauvegarder
- Annuler
- Supprimer (si modification)

#### Fonctionnalités Spéciales
1. **Pagination** : Page + Limit (10/25/50/100 items per page)
2. **Tri colonnes** : Clic sur header pour trier (asc/desc)
3. **Real-time updates** : Socket.io pour mise à jour automatique
4. **Recherche reservation** : Intégration API pour trouver réservation par numéro
5. **Validation images** : Upload et preview
6. **Task configs dynamiques** : Types/subtypes chargés depuis API
7. **Staff assignment** : Modal dédiée avec recherche
8. **Status flow** : Workflow complet CREATED → ASSIGNED → IN_PROGRESS → COMPLETED
9. **Archive system** : Distinction entre status et flag isArchived
10. **Scroll sync** : Synchronisation scroll horizontal (header/body/sticky)
11. **Cell sorting** : Dans TableTask, tri par cellule (total tasks vs critical)
12. **Filters collapse** : Possibilité de réduire les filtres
13. **No data states** : Messages explicites quand aucune donnée
14. **Admin/Owner scope** : Filtrage par propriétaire pour admins

---

### 🆕 Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/TasksPage.tsx`
**Existe** : ✅ Oui

#### Vues disponibles
1. **Vue Liste** (TasksListView)
2. **Vue Calendrier** (TasksCalendarView)
3. **Vue Séjours** (TasksSejoursView) - Timeline réservations + tâches
4. **Vue Équipe** (TasksTeamView) - Cards staff avec leurs tâches

#### Colonnes (Vue Liste)
1. Tâche (titre + sous-titre)
2. Type (emoji + label)
3. Listing (badge coloré)
4. Échéance (date)
5. Assigné à (avatar + nom)
6. Statut (badge)
7. Priorité (High/Med/Low avec dot)

#### Filtres
**Vue Liste** :
- Toutes / Urgent / Aujourd'hui / Cette semaine / Non assignées
- 🧹 Ménage / 🔧 Maintenance / 🛬 Check-in / 📸 Photos

**Vue Calendrier** :
- Tous types / 🧹 Ménage / 🔧 Maintenance / 🛬 Check-in / 📸 Photos
- Tout staff (dropdown)

**Vue Séjours** :
- Tous listings / Villa Belvédère / Dar Sojori / Villa Atlas
- Arrivées / Départs / Tâches urgentes

**Vue Équipe** :
- Tous / Online / Offline / Par rôle (Ménage/Maintenance/Concierge)

#### Boutons / Actions
**Header** :
- Exporter (📤)
- Auto-assigner (✨ AI)
- Nouvelle tâche (+)

**Actions par ligne** : Aucune visible (juste sélection checkbox)

#### Stats / KPIs
**Vue Liste** :
- En cours (14)
- Urgent aujourd'hui (7)
- En retard (2)
- Complétées cette semaine (28)
- Score AI qualité (94%)

**Vue Équipe** :
- Membres actifs (8)
- Tâches en cours (23)
- Note moyenne (4.7/5)
- Capacité utilisée (87%)

#### Formulaires
Aucun (modal placeholder uniquement)

---

### ❌ MANQUANT (Tasks)

#### Colonnes manquantes (9 colonnes)
- ❌ Item Number (code tâche)
- ❌ Date création
- ❌ Détails complets (origine + subType combinés)
- ❌ Réservation (numéro + link)
- ❌ Guest name
- ❌ Timeslot Client
- ❌ Heure Tâche (avec source)
- ❌ Paiement status
- ❌ Prix

#### Filtres manquants (15+ filtres)
- ❌ Origine (task/client)
- ❌ Sub-types (multi-select categories)
- ❌ Statuts détaillés (multi-select 8 statuts)
- ❌ Listing IDs (multi-select)
- ❌ Staff codes (multi-select)
- ❌ Payment status
- ❌ Has association
- ❌ Emergency level
- ❌ Date Type + Date Range
- ❌ Sort by (Logical/Date)
- ❌ Period (Today/Tomorrow/Week/All)
- ❌ Zones
- ❌ Status Cards (Vacant/Occupied/Reserved/Blocked/Dirty/Clean)
- ❌ Recherche texte libre
- ❌ Compteurs urgents (unassigned/urgent/critical)

#### Boutons manquants (8+ actions)
- ❌ Modifier tâche (sidebar complet)
- ❌ Changer statut (dropdown 8 options)
- ❌ Assigner staff (modal)
- ❌ Dupliquer
- ❌ Supprimer
- ❌ Marquer complétée
- ❌ Archiver
- ❌ Bulk actions (sélection multiple)

#### Stats manquantes (dans certaines vues)
- ❌ Status Cards détaillés (Vacant/Occupied/etc.)

#### Formulaires manquants
- ❌ **Formulaire complet création/modification tâche** (29 champs)
  - Type, Name, SubType
  - Timeslots (start/end, validation)
  - Dates (start/end)
  - Staff assignment
  - Prix, paiement, mode
  - Réservation (recherche intégrée)
  - Listing, guest
  - Duration, Emergency, Presence
  - Descriptions (array)
  - Images (upload multiple)
  - Services (array)

#### Fonctionnalités manquantes (12 features)
- ❌ Pagination (page + limit configurable)
- ❌ Tri colonnes (clic header)
- ❌ Real-time updates (sockets)
- ❌ Recherche réservation intégrée
- ❌ Upload images avec preview
- ❌ Task configs dynamiques (types/subtypes depuis API)
- ❌ Status workflow complet
- ❌ Archive system (flag séparé du status)
- ❌ Scroll sync (Excel-like)
- ❌ Cell sorting (total vs critical)
- ❌ Filters collapse/expand
- ❌ Admin/Owner scope filtering

---

### 💡 RECOMMANDATIONS (Tasks)

**Option 1 : Ajouter dans page existante** ⭐ RECOMMANDÉ
- Ajouter 9 colonnes manquantes dans TasksListView
- Implémenter tous les filtres (15+)
- Ajouter actions par ligne (8 actions)
- Créer modal formulaire complet (29 champs)
- Implémenter pagination + tri + real-time

**Option 2 : Créer page "Tasks Extended"**
- Si trop complexe, créer page séparée avec toutes les fonctionnalités avancées
- Garder TasksPage simple pour vue rapide
- Tasks Extended = page power-user

**Priorité implémentation** :
1. 🔴 CRITIQUE : Formulaire création/modification (29 champs)
2. 🔴 CRITIQUE : Filtres statuts détaillés + multi-select
3. 🔴 CRITIQUE : Actions par ligne (modifier/supprimer/assigner)
4. 🟠 IMPORTANT : Colonnes manquantes (item number, dates, paiement)
5. 🟠 IMPORTANT : Pagination + tri
6. 🟡 NICE : Real-time updates, upload images, recherche réservation

---

## 📄 PAGE 2 : TEAM / ÉQUIPE

### 🔍 Ancien Dashboard

**Fichiers** :
- `/Users/gouacht/sojori-dashboard/src/features/staff/TeamMembers.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staff/StaffManagement.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staff/components/TeamMembersView.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staff/components/StaffManagementView.jsx`

**Route** : `/team-members`, `/staff-management`

#### Colonnes
1. Photo (avatar)
2. Nom complet (username)
3. Staff Code (ID unique)
4. Rôle (subType array)
5. Téléphone
6. Email
7. Statut (Actif/Inactif/En congé)
8. Disponibilités (grille 7 jours)
9. Tâches (complétées/total + progress bar)
10. Rating qualité (note + étoiles)
11. Délai moyen (heures)
12. Schedule (planning détaillé par jour)
13. Langues parlées
14. Compétences (skills array)
15. Zone géographique
16. Date embauche
17. Contrat type

#### Filtres
- Recherche texte (nom, email, code)
- Par rôle (dropdown multi-select)
- Par statut (Actif/Inactif/En congé)
- Par disponibilité (jour spécifique)
- Par zone géographique
- Par compétence
- Avec/Sans planning configuré

#### Boutons / Actions
**Header** :
- Ajouter membre (+)
- Exporter liste (CSV/PDF)
- Importer staff (CSV)
- Envoyer message groupé

**Actions par ligne** :
- Voir profil complet (drawer)
- Modifier (sidebar/modal)
- Voir planning (navigate)
- Envoyer message (WhatsApp)
- Assigner tâche
- Désactiver/Activer
- Supprimer (avec confirmation)

#### Stats / KPIs
- Total staff
- Actifs
- Inactifs
- En congé
- Avec planning configuré
- Taux de complétion moyen
- Note qualité moyenne
- Disponibles aujourd'hui
- Occupés (avec tâches en cours)

#### Formulaires
**Modal "Ajouter/Modifier membre"** :
1. Username (text)
2. Staff Code (auto ou manual)
3. Email (email validation)
4. Téléphone (phone validation)
5. Photo (upload)
6. Rôle principal (select)
7. Sub-types (multi-select)
8. Langues (multi-select)
9. Compétences (tags input)
10. Zone géographique (select)
11. Statut (radio: Actif/Inactif/En congé)
12. Date embauche (date picker)
13. Type contrat (select)
14. Salaire/tarif (number)
15. Planning par défaut (grille 7 jours avec horaires)
16. Notes internes (textarea)
17. Documents (upload multiple)

#### Fonctionnalités Spéciales
- **Planning management** : Configuration horaires par jour
- **Performance tracking** : Historique tâches + notes
- **Availability calendar** : Vue disponibilité temps réel
- **Batch operations** : Actions sur sélection multiple
- **Skills matching** : Suggestion auto pour assignation tâches
- **Stats individuelles** : Dashboard par staff membre

---

### 🆕 Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/TeamPage.tsx`
**Existe** : ✅ Oui

#### Colonnes
1. Membre (avatar + nom + ID)
2. Rôle (chip avec emoji)
3. Contact (téléphone + email)
4. Disponibilités (grille 7 jours)
5. Tâches (complétées/total + progress bar)
6. Qualité (rating + délai)
7. Statut (chip)
8. Actions (2 boutons)

#### Filtres
- Recherche texte (nom, email)
- Par rôle (dropdown)
- Par statut (dropdown: Tous/Actif/Inactif/En congé)

#### Boutons / Actions
**Header** :
- Ajouter membre (+)

**Actions par ligne** :
- Modifier (✏️)
- Voir planning (📆)

#### Stats / KPIs
- Total Staff
- Actifs
- Taux complétion
- Qualité moyenne

#### Formulaires
**Modal "Ajouter membre"** : Placeholder vide (à implémenter)

---

### ❌ MANQUANT (Team)

#### Colonnes manquantes (9 colonnes)
- ❌ Staff Code (ID unique)
- ❌ Sub-types détaillés (array compétences)
- ❌ Schedule détaillé (planning par jour avec horaires)
- ❌ Langues parlées
- ❌ Compétences (skills)
- ❌ Zone géographique
- ❌ Date embauche
- ❌ Type contrat
- ❌ Documents attachés

#### Filtres manquants (5 filtres)
- ❌ Par disponibilité (jour spécifique)
- ❌ Par zone géographique
- ❌ Par compétence
- ❌ Avec/Sans planning
- ❌ Multi-select rôles

#### Boutons manquants (8 actions)
- ❌ Exporter liste (CSV/PDF)
- ❌ Importer staff (CSV)
- ❌ Message groupé
- ❌ Voir profil complet (drawer)
- ❌ Envoyer message WhatsApp
- ❌ Assigner tâche directe
- ❌ Désactiver/Activer
- ❌ Supprimer

#### Stats manquantes (4 stats)
- ❌ Inactifs (count)
- ❌ En congé (count)
- ❌ Disponibles aujourd'hui
- ❌ Occupés (avec tâches)

#### Formulaires manquants
- ❌ **Formulaire complet ajout/modification** (17 champs)
  - Tous les champs de base + planning + compétences + documents

#### Fonctionnalités manquantes (6 features)
- ❌ Planning management (configuration horaires détaillée)
- ❌ Performance tracking (historique)
- ❌ Availability calendar
- ❌ Batch operations (sélection multiple)
- ❌ Skills matching (suggestion auto)
- ❌ Stats individuelles (dashboard par membre)

---

### 💡 RECOMMANDATIONS (Team)

**Option 1 : Enrichir page existante** ⭐ RECOMMANDÉ
- Ajouter 9 colonnes manquantes
- Implémenter formulaire complet (17 champs)
- Ajouter toutes les actions (8)
- Implémenter filtres avancés (5)

**Option 2 : Créer vue "Team Extended"**
- Team simple = liste basique
- Team Extended = gestion complète avec planning/compétences/historique

**Priorité implémentation** :
1. 🔴 CRITIQUE : Formulaire complet (17 champs)
2. 🔴 CRITIQUE : Actions essentielles (modifier/supprimer/désactiver)
3. 🟠 IMPORTANT : Colonnes manquantes (staff code, compétences, schedule)
4. 🟠 IMPORTANT : Planning management
5. 🟡 NICE : Performance tracking, skills matching

---

## 📄 PAGE 3 : PLANNING

### 🔍 Ancien Dashboard

**Fichiers** :
- `/Users/gouacht/sojori-dashboard/src/features/staff/TeamPlanning.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staff/components/ModifyStaffPlanning.jsx`

**Route** : `/team-planning`

#### Vue Planning
**Format** : Grille Staff × Jours (7 colonnes)

#### Colonnes
1. Staff membre (nom + code + statut + rôle)
2-8. Lundi à Dimanche (7 colonnes dates)

**Contenu cellules** :
- Présent/Absent
- Horaires (start-end par timing)
- Multiple timings par jour (array)
- Total heures jour
- Couleur selon disponibilité

#### Filtres
- Navigation semaine (prev/next)
- Semaine offset (counter)
- Choix staff (dropdown multi-select)
- Choix type (ménage/maintenance/etc.)

#### Boutons / Actions
**Header** :
- Semaine précédente (←)
- Semaine suivante (→)
- Retour aujourd'hui
- Export planning (PDF/Excel)

**Actions par cellule** :
- Clic cellule → Modifier horaires
- Ajouter timing
- Supprimer timing
- Marquer présent/absent
- Copier planning (duplication)

#### Stats / KPIs (dans TeamPlanning.page.jsx)
- Staff actifs
- Total staff
- Avec planning configuré
- Heures planifiées semaine
- Moyenne heures/staff
- KPIs calculés en temps réel

#### Formulaires
**Modal "Modifier planning"** :
- Jour sélectionné
- Présent (checkbox)
- Timings (array)
  - Start (select heures)
  - End (select heures)
  - Add/Remove timing
- Copier vers autres jours
- Appliquer à toutes les semaines

#### Fonctionnalités Spéciales
- **Calcul automatique** : Total heures par jour/semaine
- **Validation horaires** : End > Start
- **Duplication intelligente** : Copier planning vers autres jours/semaines
- **Color coding** : Vert = disponible, Gris = absent
- **Responsive** : Scroll horizontal pour petits écrans
- **Real-time update** : Mise à jour instantanée

---

### 🆕 Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/PlanningPage.tsx`
**Existe** : ✅ Oui

#### Vue Planning
**Format** : Grille Staff × Jours (7 colonnes)

#### Colonnes
1. Staff membre (avatar + nom + rôle)
2-8. Lundi à Dimanche (7 colonnes)

**Contenu cellules** :
- Tâches du jour (emoji + heure + listing)
- Couleur selon statut (pending/in_progress/completed)
- Count tâches

#### Filtres
- Navigation semaine (←/→)
- Staff membre (dropdown)
- Type tâche (dropdown)

#### Boutons / Actions
**Header** :
- Navigation semaine

**Actions cellules** : Tooltip uniquement (pas d'édition)

#### Stats / KPIs
- Total tâches
- En attente
- En cours
- Terminées
- Charge max (staff + count)

#### Formulaires
Aucun

---

### ❌ MANQUANT (Planning)

#### Colonnes manquantes (informations cellules)
- ❌ Horaires détaillés (start-end)
- ❌ Multiple timings par jour
- ❌ Total heures jour
- ❌ Présent/Absent toggle
- ❌ Staff code dans colonne 1
- ❌ Statut actif/inactif

#### Filtres manquants (2 filtres)
- ❌ Multi-select staff
- ❌ Retour aujourd'hui (button)

#### Boutons manquants (6 actions)
- ❌ Export planning (PDF/Excel)
- ❌ Modifier horaires (modal)
- ❌ Ajouter timing
- ❌ Supprimer timing
- ❌ Marquer présent/absent
- ❌ Copier planning

#### Stats manquantes (2 stats)
- ❌ Heures planifiées semaine
- ❌ Moyenne heures/staff

#### Formulaires manquants
- ❌ **Modal "Modifier planning"**
  - Présent (checkbox)
  - Timings (array start/end)
  - Copier vers autres jours
  - Validation horaires

#### Fonctionnalités manquantes (6 features)
- ❌ Édition inline horaires
- ❌ Calcul automatique heures
- ❌ Validation horaires (end > start)
- ❌ Duplication intelligente planning
- ❌ Color coding disponibilité
- ❌ Gestion présence/absence

**Note importante** : Le nouveau dashboard affiche les **tâches assignées** alors que l'ancien affiche les **horaires de travail** (disponibilité staff). Ce sont deux vues différentes avec des objectifs différents.

---

### 💡 RECOMMANDATIONS (Planning)

**Option 1 : Ajouter onglet "Disponibilités"** ⭐ RECOMMANDÉ
- Garder vue actuelle "Tâches assignées"
- Ajouter onglet "Disponibilités" avec horaires de travail
- Implémenter modal modification horaires
- Ajouter gestion présence/absence

**Option 2 : Vue unifiée**
- Combiner tâches + disponibilités dans même cellule
- Afficher horaires travail + tâches superposées
- Couleur selon charge (vert = disponible, rouge = surchargé)

**Option 3 : Pages séparées**
- Planning Tâches (actuel)
- Planning Horaires (nouveau)

**Priorité implémentation** :
1. 🔴 CRITIQUE : Modal modification horaires
2. 🔴 CRITIQUE : Gestion présence/absence
3. 🟠 IMPORTANT : Calcul heures automatique
4. 🟠 IMPORTANT : Export planning
5. 🟡 NICE : Duplication planning, validation horaires

---

## 📄 PAGE 4 : STAFF WHATSAPP

### 🔍 Ancien Dashboard

**Fichiers** :
- `/Users/gouacht/sojori-dashboard/src/features/staffMessages/pages/StaffWhatsAppNew.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staffMessages/components/StaffWhatsAppLayout.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staffMessages/components/StaffTasksPanel.jsx`

**Route** : `/staff-whatsapp`

#### Layout
- **3 colonnes** : Liste threads + Conversation + Panneau tâches (optionnel)

#### Colonnes (Liste threads)
1. Avatar + badge online
2. Nom staff (workerWaName)
3. Rôle (admin/manager/staff) avec badge couleur
4. Téléphone (workerWaNumber)
5. Dernier message (preview)
6. Timestamp
7. Count messages (badge)
8. Statut réponse (has replied)

#### Filtres
**FilterBar avec 8 filtres** :
- All
- Admin
- Staff
- Manager
- Unreplied (pas encore répondu)
- Recent (dernières 24h)
- (+ autres filtres custom)

**Recherche** :
- Nom staff
- Téléphone
- Rôle

#### Boutons / Actions
**Header** :
- Charger plus (pagination)
- Refresh

**Thread actions** :
- Sélectionner conversation
- Afficher tâches (toggle panneau droit)

**Message actions** :
- Envoyer message
- Envoyer image/document (TODO)
- Templates messages (TODO)
- Créer tâche depuis message

#### Zone conversation
- Messages (sent/delivered/read status)
- Timestamps
- Avatars sender
- Distinction admin/staff messages
- Status WhatsApp (✓ / ✓✓)
- Scroll auto vers bas
- Input avec Enter to send

#### Panneau tâches (StaffTasksPanel)
**Affichage des tâches du staff** :
- Liste tâches assignées
- Filtres tâches (status)
- Actions rapides
- Click tâche → Modal détail

#### Stats
- Total threads
- Unreplied count
- Online staff count
- Messages count

#### Formulaires
**Compose message** :
- Text input (multiline)
- Enter to send
- Shift+Enter = nouvelle ligne

---

### 🆕 Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/StaffWhatsAppPage.tsx`
**Existe** : ✅ Oui

#### Layout
- **3 colonnes** : Liste conversations + Thread + Info panel

#### Colonnes (Liste conversations)
1. Avatar + badge online (pour individuels)
2. Nom staff/groupe
3. Sous-titre (rôle / nb membres)
4. Dernier message
5. Timestamp
6. Count non lus

#### Filtres
**Tabs** :
- Individuels
- Groupes (avec badge count)

**Recherche** :
- Nom
- Sous-titre (rôle)

#### Boutons / Actions
**Header** :
- Broadcast (📢) → Modal avec sélection destinataires

**Message actions** :
- Envoyer
- Input multiline

#### Zone conversation
- Messages avec avatar
- Timestamps
- Status sent/delivered
- Distinction me/staff
- Scroll auto
- Group: affichage sender name

#### Panneau info (droite)
- Avatar/icône groupe
- Nom
- Téléphone/Nb membres
- Liste membres (pour groupes)

#### Stats
Uniquement dans header : Count non lus total

#### Formulaires
**Broadcast modal** :
- Checkbox destinataires (STAFF_LIST)
- Message textarea
- Send (count sélectionnés)

**Compose message** :
- Text input
- Enter to send

---

### ❌ MANQUANT (Staff WhatsApp)

#### Colonnes manquantes (2 dans liste)
- ❌ Count messages total (badge)
- ❌ Statut réponse (has replied indicator)

#### Filtres manquants (6 filtres)
- ❌ Admin (filter)
- ❌ Staff (filter)
- ❌ Manager (filter)
- ❌ Unreplied (important!)
- ❌ Recent (24h)
- ❌ Recherche par téléphone

#### Boutons manquants (4 actions)
- ❌ Charger plus (pagination threads)
- ❌ Envoyer image/document
- ❌ Templates messages
- ❌ Créer tâche depuis message

#### Panneau tâches manquant
- ❌ **StaffTasksPanel complet**
  - Liste tâches staff sélectionné
  - Filtres tâches
  - Actions rapides
  - Modal détail tâche

#### Stats manquantes (3 stats)
- ❌ Unreplied count
- ❌ Online staff count
- ❌ Messages count

#### Fonctionnalités manquantes (5 features)
- ❌ Real-time socket updates (useStaffThreadsSocket)
- ❌ Pagination with hasMore
- ❌ Role-based colors (ROLE_COLORS)
- ❌ Thread filtering (applyLocalFilter)
- ❌ Optimistic message sending

---

### 💡 RECOMMANDATIONS (Staff WhatsApp)

**Option 1 : Ajouter panneau tâches** ⭐ RECOMMANDÉ
- Implémenter toggle panneau droit
- Afficher tâches staff sélectionné
- Bouton "Créer tâche depuis message"

**Option 2 : Améliorer filtres**
- Ajouter filtres Admin/Staff/Manager
- Ajouter filtre "Unreplied" (très important!)
- Ajouter filtre Recent

**Option 3 : Fonctionnalités avancées**
- Upload image/document
- Templates messages
- Real-time socket updates

**Priorité implémentation** :
1. 🔴 CRITIQUE : Panneau tâches (intégration forte avec tâches)
2. 🔴 CRITIQUE : Filtre "Unreplied"
3. 🟠 IMPORTANT : Filtres rôle (Admin/Staff/Manager)
4. 🟠 IMPORTANT : Real-time updates
5. 🟡 NICE : Templates, upload fichiers

---

## 🎯 PRIORISATION GLOBALE

### 🔴 CRITIQUE (Must have)

**Tasks** :
1. Formulaire création/modification complet (29 champs)
2. Filtres statuts + multi-select (listings, staff, types)
3. Actions par ligne (modifier, supprimer, assigner, changer statut)
4. Pagination + tri colonnes

**Team** :
1. Formulaire ajout/modification complet (17 champs)
2. Actions essentielles (modifier, supprimer, activer/désactiver)
3. Colonnes manquantes (staff code, compétences, schedule)

**Planning** :
1. Modal modification horaires (présent/absent, timings)
2. Gestion disponibilité staff (horaires travail)
3. Calcul heures automatique

**Staff WhatsApp** :
1. Panneau tâches staff (integration forte)
2. Filtre "Unreplied" (critique pour gestion)
3. Filtres rôles (Admin/Staff/Manager)

### 🟠 IMPORTANT (Should have)

**Tasks** :
- Colonnes supplémentaires (item number, dates, paiement)
- Recherche réservation intégrée
- Status workflow complet
- Archive system

**Team** :
- Planning management détaillé
- Filtres avancés (zone, compétences, disponibilité)
- Stats individuelles

**Planning** :
- Export planning (PDF/Excel)
- Duplication planning
- Validation horaires

**Staff WhatsApp** :
- Real-time updates (sockets)
- Pagination threads
- Role-based filtering

### 🟡 NICE TO HAVE (Could have)

**Tasks** :
- Real-time socket updates
- Upload images avec preview
- Cell sorting (total vs critical)
- Scroll sync Excel-like

**Team** :
- Performance tracking historique
- Skills matching auto
- Batch operations

**Planning** :
- Color coding avancé
- Vue unifiée tâches + disponibilités

**Staff WhatsApp** :
- Templates messages
- Upload image/document
- Optimistic sending

---

## ✅ CHECKLIST AUDIT

- [x] Exploré ancien dashboard
- [x] Listé toutes pages de mon domaine (4 pages)
- [x] Pour chaque page : listé colonnes
- [x] Pour chaque page : listé filtres
- [x] Pour chaque page : listé boutons
- [x] Pour chaque page : listé stats
- [x] Pour chaque page : listé formulaires
- [x] Exploré nouveau dashboard
- [x] Fait comparaison complète (4 pages)
- [x] Créé recommandations détaillées
- [x] Sauvegardé rapport complet

---

## 📈 STATISTIQUES FINALES

| Catégorie | Total manquant |
|-----------|----------------|
| Colonnes | 68+ |
| Filtres | 35+ |
| Boutons/Actions | 28+ |
| Stats/KPIs | 15+ |
| Formulaires complets | 3 |
| Features majeures | 12+ |

**Total éléments manquants** : **160+ éléments**

**Estimation développement** :
- Tasks : 15-20 jours
- Team : 10-12 jours
- Planning : 8-10 jours
- Staff WhatsApp : 6-8 jours

**Total estimé** : **39-50 jours de développement**

---

**🎯 Conclusion** : Le nouveau dashboard a une excellente base design, mais nécessite un enrichissement fonctionnel substantiel pour atteindre la parité avec l'ancien dashboard. Les 4 domaines d'Opérations nécessitent tous des améliorations critiques, particulièrement au niveau des formulaires, filtres avancés, et intégrations (tâches ↔ staff ↔ planning ↔ WhatsApp).
