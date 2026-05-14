# 🚀 Prompts pour Relancer les Agents - Version Complète

**Date** : 14 Mai 2026
**Projet** : Sojori-orchestrator
**Phase** : Phase 1 (MOCK) → Implémentation complète des pages

---

## ⚠️ PROBLÈME ACTUEL

Les agents ont créé des pages **STUB** (basiques) mais n'ont pas implémenté :
- ❌ Les interactions (clics, modals, drawers)
- ❌ Les filtres et recherches
- ❌ Les boutons d'action fonctionnels
- ❌ Les éditions inline
- ❌ Les graphiques et visualisations
- ❌ Les formulaires complets

**CE QU'ON VEUT** : Des pages **COMPLÈTES** et **FONCTIONNELLES** comme celles qui existent déjà (ReservationsPage, TasksPage, etc.)

---

## 📋 AGENT 2 : INVENTAIRE + PRICING

### Contexte
Tu es un agent Claude Code spécialisé dans la création de pages React complexes. Tu vas compléter 2 pages du dashboard Sojori Orchestrator : **InventoryPage** et **PricingPage**.

### Localisation
- **Projet** : `/Users/gouacht/Sojori-orchestrator`
- **Fichiers à améliorer** :
  - `/src/pages/InventoryPage.tsx`
  - `/src/pages/PricingPage.tsx`

### Standards Techniques
- **Framework** : React 18 + TypeScript + Vite 8
- **UI** : Material-UI v9 (PAS Tailwind, PAS CSS-in-JS)
- **Syntaxe MUI** : `sx` props uniquement
- **Composants réutilisables** : `/src/components/dashboard/DashboardV2.components.jsx`
- **Router** : React Router v6
- **Data** : MOCK (Phase 1) - pas d'appels API

### Mission 1 : InventoryPage (Calendrier Inventaire)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Vue Calendrier** :
   - ✅ Calendrier 90 jours minimum (déjà fait)
   - ✅ 8+ listings affichés (déjà fait)
   - ➕ **AJOUTER** : Sélection de période (datepicker range)
   - ➕ **AJOUTER** : Zoom (vue jour/semaine/mois)
   - ➕ **AJOUTER** : Filtres par listing (checkboxes)
   - ➕ **AJOUTER** : Légende des couleurs (disponible/réservé/bloqué/maintenant)

2. **Interactions Cellules** :
   - ➕ **AJOUTER** : Clic sur cellule → Drawer de détails
   - ➕ **AJOUTER** : Afficher prix + statut + réservation si occupé
   - ➕ **AJOUTER** : Bouton "Bloquer cette période"
   - ➕ **AJOUTER** : Bouton "Modifier le prix"

3. **Blocages Manuels** :
   - ➕ **AJOUTER** : Modal "Bloquer période"
   - ➕ **AJOUTER** : Formulaire : listing, dates, raison (maintenance/owner/autre)
   - ➕ **AJOUTER** : Couleur différente pour blocages (gris hachuré)

4. **Stats Header** :
   - ➕ **AJOUTER** : Taux d'occupation global
   - ➕ **AJOUTER** : Nombre de nuits disponibles
   - ➕ **AJOUTER** : Revenus projetés
   - ➕ **AJOUTER** : Alertes (gaps de dispo, pricing à optimiser)

5. **Export** :
   - ➕ **AJOUTER** : Bouton "Exporter iCal" (download .ics)
   - ➕ **AJOUTER** : Bouton "Exporter CSV"

**Exemple de design** : Inspire-toi de `CalendarInventoryPage.tsx` existante + ajoute les interactions manquantes.

---

### Mission 2 : PricingPage (Pricing Dynamique)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Vue Principale** :
   - ✅ Tableau avec prix actuels vs suggestions AI (déjà fait)
   - ➕ **AJOUTER** : Clic sur ligne → Drawer "Modifier prix"
   - ➕ **AJOUTER** : Bouton "Appliquer suggestion AI" (bulk)
   - ➕ **AJOUTER** : Graphique d'évolution des prix (7/30/90 jours)

2. **Règles de Pricing** :
   - ✅ Liste de 10 règles (déjà fait)
   - ➕ **AJOUTER** : Toggle pour activer/désactiver chaque règle
   - ➕ **AJOUTER** : Clic sur règle → Modal "Éditer règle"
   - ➕ **AJOUTER** : Formulaire : nom, conditions, ajustement (%, €)
   - ➕ **AJOUTER** : Bouton "Créer nouvelle règle"

3. **Événements Locaux** :
   - ✅ Liste de 4 événements (déjà fait)
   - ➕ **AJOUTER** : Clic sur événement → Modal "Éditer événement"
   - ➕ **AJOUTER** : Formulaire : nom, dates, impact prix, properties concernées
   - ➕ **AJOUTER** : Bouton "Ajouter événement"

4. **Comparaison Concurrence** :
   - ✅ Tableau comparatif (déjà fait)
   - ➕ **AJOUTER** : Refresh button pour mettre à jour les prix
   - ➕ **AJOUTER** : Badge si prix trop haut/bas vs concurrence
   - ➕ **AJOUTER** : Recommandation AI "Ajuster à €X pour rester compétitif"

5. **AI Suggestions** :
   - ➕ **AJOUTER** : AICard avec 3-5 recommandations
   - ➕ **AJOUTER** : Exemples :
     - "Augmenter de 15% ce weekend (festival)"
     - "Baisser de 10% les 5 prochains jours (gap de dispo)"
     - "Activer tarif long séjour pour janvier"

**Design** : Panels avec DataTable + Modals + Drawers comme dans `TasksPage.tsx`

---

### Checklist Livraison

Pour chaque page, tu DOIS livrer :

- [ ] Toutes les interactions fonctionnent (clics, modals, drawers)
- [ ] Tous les boutons font quelque chose (même si MOCK)
- [ ] Tous les formulaires sont complets et valident les données
- [ ] Toutes les stats sont calculées dynamiquement
- [ ] Design cohérent avec les autres pages (Aurora Soft)
- [ ] Code TypeScript sans erreurs
- [ ] Composants réutilisables de DashboardV2.components.jsx utilisés
- [ ] Au moins 50+ lignes de données MOCK réalistes
- [ ] Responsive (mobile, tablette, desktop)

---

## 📋 AGENT 3 : CHANNELS + CLIENTS

### Contexte
Tu es un agent Claude Code spécialisé dans la création de pages React complexes. Tu vas compléter 2 pages du dashboard Sojori Orchestrator : **ChannelsPage** et **ClientsPage**.

### Localisation
- **Projet** : `/Users/gouacht/Sojori-orchestrator`
- **Fichiers à améliorer** :
  - `/src/pages/ChannelsPage.tsx`
  - `/src/pages/ClientsPage.tsx`

### Mission 1 : ChannelsPage (Gestion OTAs)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Onglet "Overview"** :
   - ✅ Liste des 7 OTAs (déjà fait)
   - ➕ **AJOUTER** : Toggle "Connecté/Déconnecté" par OTA
   - ➕ **AJOUTER** : Statut sync temps réel (badge vert/rouge)
   - ➕ **AJOUTER** : Dernière sync (timestamp)
   - ➕ **AJOUTER** : Nombre de listings mappés / total
   - ➕ **AJOUTER** : Bouton "Configurer" → Modal de config OTA

2. **Onglet "Mapping"** :
   - ✅ Tableau mapping (déjà fait)
   - ➕ **AJOUTER** : Recherche par listing ou external ID
   - ➕ **AJOUTER** : Filtres par OTA, statut mapping (mappé/non mappé)
   - ➕ **AJOUTER** : Clic sur ligne → Drawer "Éditer mapping"
   - ➕ **AJOUTER** : Formulaire : Listing Sojori → External ID par OTA
   - ➕ **AJOUTER** : Bouton "Auto-match" (AI matching)
   - ➕ **AJOUTER** : Bulk actions (mapper plusieurs listings)

3. **Onglet "Logs"** :
   - ✅ Liste des logs sync (déjà fait)
   - ➕ **AJOUTER** : Filtres : OTA, type (price/availability/booking), statut (success/error)
   - ➕ **AJOUTER** : Recherche par listing ou booking ID
   - ➕ **AJOUTER** : Clic sur log → Drawer avec détails complets
   - ➕ **AJOUTER** : Stack trace si erreur
   - ➕ **AJOUTER** : Bouton "Retry" si échec

4. **Stats Header** :
   - ➕ **AJOUTER** : Nombre total de syncs (24h)
   - ➕ **AJOUTER** : Taux de succès (%)
   - ➕ **AJOUTER** : Temps moyen de sync
   - ➕ **AJOUTER** : Alertes (OTA down, erreurs répétées)

5. **Actions Rapides** :
   - ➕ **AJOUTER** : Bouton "Force Sync All"
   - ➕ **AJOUTER** : Bouton "Test Connection" par OTA
   - ➕ **AJOUTER** : Export logs CSV

---

### Mission 2 : ClientsPage (CRM Clients)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Tableau Clients** :
   - ✅ 13 colonnes avec toggle (déjà fait)
   - ➕ **AJOUTER** : Tri par colonne (nom, date, total dépensé, etc.)
   - ➕ **AJOUTER** : Recherche par nom, email, téléphone
   - ➕ **AJOUTER** : Filtres avancés :
     - Statut (VIP, régulier, nouveau)
     - Source (OTA, direct, referral)
     - Pays
     - Total dépensé (range)
     - Dernière réservation (date range)

2. **Fiche Client** (clic sur ligne) :
   - ➕ **AJOUTER** : Drawer avec 4 onglets :
     - **Profil** : Avatar, nom, contact, préférences
     - **Réservations** : Historique complet (dates, property, montant, statut)
     - **Communications** : Timeline messages WhatsApp/Email
     - **Notes** : Notes internes staff

3. **Actions Client** :
   - ➕ **AJOUTER** : Bouton "Envoyer message" → WhatsApp ou Email
   - ➕ **AJOUTER** : Bouton "Nouvelle réservation"
   - ➕ **AJOUTER** : Bouton "Marquer VIP" / "Blacklist"
   - ➕ **AJOUTER** : Bouton "Exporter fiche PDF"

4. **Segments** :
   - ➕ **AJOUTER** : Filtres rapides :
     - VIP (10+ séjours ou €5k+ dépensés)
     - Nouveaux (1 séjour)
     - Inactifs (pas de résa depuis 6 mois)
     - Anniversaire ce mois-ci

5. **Stats Header** :
   - ➕ **AJOUTER** : Total clients
   - ➕ **AJOUTER** : Nouveaux ce mois
   - ➕ **AJOUTER** : Taux de rétention
   - ➕ **AJOUTER** : LTV moyen (Lifetime Value)

**Design** : DataTable avec filtres avancés + Drawer multi-onglets comme `RequestsPage.tsx`

---

### Checklist Livraison

Pour chaque page, tu DOIS livrer :

- [ ] Toutes les interactions fonctionnent
- [ ] Tous les onglets fonctionnent
- [ ] Tous les filtres fonctionnent
- [ ] Recherche fonctionne (même si MOCK)
- [ ] Drawers/Modals avec contenu complet
- [ ] Formulaires validés
- [ ] Stats calculées dynamiquement
- [ ] Au moins 30+ clients MOCK, 50+ logs MOCK
- [ ] Design cohérent

---

## 📋 AGENT 4 : TEAM + PLANNING + STAFF WHATSAPP

### Contexte
Tu es un agent Claude Code spécialisé dans la création de pages React complexes. Tu vas compléter 3 pages du dashboard Sojori Orchestrator : **TeamPage**, **PlanningPage**, **StaffWhatsAppPage**.

### Localisation
- **Projet** : `/Users/gouacht/Sojori-orchestrator`
- **Fichiers à améliorer** :
  - `/src/pages/TeamPage.tsx`
  - `/src/pages/PlanningPage.tsx`
  - `/src/pages/StaffWhatsAppPage.tsx`

### Mission 1 : TeamPage (Gestion Équipe)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Tableau Staff** :
   - ✅ 15 membres avec 8 colonnes (déjà fait)
   - ➕ **AJOUTER** : Clic sur ligne → Drawer "Fiche Staff"
   - ➕ **AJOUTER** : Fiche avec 3 onglets :
     - **Profil** : Photo, nom, contact, role, langues, compétences
     - **Planning** : Tâches assignées (7 jours)
     - **Performance** : Tâches complétées, rating, feedback guests

2. **Actions Staff** :
   - ➕ **AJOUTER** : Bouton "Nouveau membre" → Modal formulaire
   - ➕ **AJOUTER** : Bouton "Modifier" / "Désactiver"
   - ➕ **AJOUTER** : Bouton "Envoyer message WhatsApp"
   - ➕ **AJOUTER** : Bouton "Voir planning complet"

3. **Filtres** :
   - ➕ **AJOUTER** : Par rôle (ménage, conciergerie, maintenance)
   - ➕ **AJOUTER** : Par statut (actif, inactif, vacances)
   - ➕ **AJOUTER** : Par disponibilité (libre aujourd'hui, occupé)

4. **Stats Header** :
   - ➕ **AJOUTER** : Total staff actifs
   - ➕ **AJOUTER** : Occupés aujourd'hui
   - ➕ **AJOUTER** : Tâches en cours
   - ➕ **AJOUTER** : Rating moyen équipe

---

### Mission 2 : PlanningPage (Planning Hebdomadaire)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Vue Calendrier** :
   - ✅ Vue semaine avec tâches (déjà fait)
   - ➕ **AJOUTER** : Navigation semaine précédente/suivante
   - ➕ **AJOUTER** : Vue jour / semaine / mois (toggle)
   - ➕ **AJOUTER** : Clic sur tâche → Drawer détails
   - ➕ **AJOUTER** : Drag & drop tâches (réassigner jour/staff)

2. **Création Tâche** :
   - ➕ **AJOUTER** : Bouton "Nouvelle tâche" → Modal
   - ➕ **AJOUTER** : Formulaire :
     - Type (ménage, check-in, maintenance, autre)
     - Listing concerné
     - Date/heure
     - Assigné à (dropdown staff)
     - Durée estimée
     - Priorité
     - Notes

3. **Filtres** :
   - ➕ **AJOUTER** : Par type de tâche
   - ➕ **AJOUTER** : Par staff member
   - ➕ **AJOUTER** : Par property
   - ➕ **AJOUTER** : Par statut (à faire, en cours, terminé)

4. **Stats** :
   - ➕ **AJOUTER** : Tâches planifiées cette semaine
   - ➕ **AJOUTER** : Taux de complétion
   - ➕ **AJOUTER** : Charge de travail par staff
   - ➕ **AJOUTER** : Alertes (surcharge, tâches non assignées)

---

### Mission 3 : StaffWhatsAppPage (Messagerie Équipe)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Layout ChatLayout** :
   - ✅ Liste conversations + zone messages (déjà fait)
   - ➕ **AJOUTER** : Liste conversations :
     - Avatar + nom staff
     - Derniers message preview
     - Timestamp
     - Badge non lus
     - Tri par date dernière activité

2. **Zone Messages** :
   - ➕ **AJOUTER** : Affichage messages par conversation
   - ➕ **AJOUTER** : Différenciation staff/vous (alignement gauche/droite)
   - ➕ **AJOUTER** : Support images/documents
   - ➕ **AJOUTER** : Status messages (envoyé/lu)
   - ➕ **AJOUTER** : Timestamps

3. **Envoi Messages** :
   - ➕ **AJOUTER** : Textarea + bouton "Envoyer"
   - ➕ **AJOUTER** : Bouton "Joindre fichier"
   - ➕ **AJOUTER** : Templates rapides (messages prédéfinis)
   - ➕ **AJOUTER** : Emojis picker

4. **Actions** :
   - ➕ **AJOUTER** : Bouton "Créer tâche depuis message"
   - ➕ **AJOUTER** : Bouton "Marquer comme important"
   - ➕ **AJOUTER** : Recherche dans messages

**Design** : Comme CommsPage (WhatsApp guests) mais adapté staff

---

### Checklist Livraison

Pour chaque page :

- [ ] Toutes les interactions fonctionnent
- [ ] Modals/Drawers avec formulaires complets
- [ ] Drag & drop (PlanningPage)
- [ ] Chat fonctionnel (StaffWhatsAppPage)
- [ ] Filtres et recherche
- [ ] Stats calculées
- [ ] Au moins 15 staff, 180 tâches, 200 messages MOCK

---

## 📋 AGENT 5 : REVIEWS + REQUESTS + OTA MESSAGES

### Contexte
Tu es un agent Claude Code spécialisé dans la création de pages React complexes. Tu vas compléter 3 pages du dashboard Sojori Orchestrator : **ReviewsPage**, **RequestsPage**, **OTAMessagesPage**.

### Localisation
- **Projet** : `/Users/gouacht/Sojori-orchestrator`
- **Fichiers à améliorer** :
  - `/src/pages/ReviewsPage.tsx`
  - `/src/pages/RequestsPage.tsx`
  - `/src/pages/OTAMessagesPage.tsx`

### Mission 1 : ReviewsPage (Gestion Avis)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Liste Avis** :
   - ✅ 10 avis avec AI suggestions (déjà fait)
   - ➕ **AJOUTER** : Clic sur avis → Drawer détails complet
   - ➕ **AJOUTER** : Drawer avec :
     - Infos guest (nom, pays, dates séjour)
     - Texte complet de l'avis
     - Réponse propriétaire (si existe)
     - AI suggestion de réponse
     - Formulaire "Répondre"
     - Bouton "Utiliser suggestion AI"

2. **Filtres** :
   - ➕ **AJOUTER** : Par source (Airbnb, Booking, Google, Direct)
   - ➕ **AJOUTER** : Par rating (1-5 étoiles)
   - ➕ **AJOUTER** : Par property
   - ➕ **AJOUTER** : Par statut (répondu, non répondu)
   - ➕ **AJOUTER** : Par sentiment (positif, neutre, négatif)

3. **Actions** :
   - ➕ **AJOUTER** : Bouton "Répondre" (ouvre formulaire)
   - ➕ **AJOUTER** : Bouton "Marquer important" (follow-up)
   - ➕ **AJOUTER** : Bouton "Générer réponse AI"
   - ➕ **AJOUTER** : Bulk actions (répondre à plusieurs)

4. **Stats Header** :
   - ➕ **AJOUTER** : Rating moyen (toutes properties)
   - ➕ **AJOUTER** : Nouveaux avis ce mois
   - ➕ **AJOUTER** : Taux de réponse
   - ➕ **AJOUTER** : Sentiment analysis (% positif)

5. **Graphiques** :
   - ➕ **AJOUTER** : Évolution rating (30 jours)
   - ➕ **AJOUTER** : Distribution par note (1-5 étoiles)
   - ➕ **AJOUTER** : Top keywords mentionnés

---

### Mission 2 : RequestsPage (Demandes Guests)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Vue Table + Kanban** :
   - ✅ Toggle entre Table et Kanban (déjà fait)
   - ➕ **AJOUTER** : Vue Table :
     - Tri par colonne
     - Recherche par guest, property, contenu
     - Filtres (type, statut, priorité, date)
   - ➕ **AJOUTER** : Vue Kanban :
     - 4 colonnes (Nouveau, En cours, Résolu, Fermé)
     - Drag & drop entre colonnes
     - Counter par colonne

2. **Fiche Demande** :
   - ➕ **AJOUTER** : Clic sur demande → Drawer détails
   - ➕ **AJOUTER** : Onglets :
     - **Détails** : Type, guest, property, description, photos
     - **Timeline** : Historique actions (créée, assignée, résolue)
     - **Messages** : Conversation avec guest
     - **Actions** : Tâches créées suite à cette demande

3. **Actions** :
   - ➕ **AJOUTER** : Bouton "Assigner à staff"
   - ➕ **AJOUTER** : Bouton "Créer tâche"
   - ➕ **AJOUTER** : Bouton "Envoyer message guest"
   - ➕ **AJOUTER** : Bouton "Marquer résolu"
   - ➕ **AJOUTER** : Bouton "Escalader (urgent)"

4. **Stats** :
   - ➕ **AJOUTER** : Demandes en cours
   - ➕ **AJOUTER** : Temps moyen de résolution
   - ➕ **AJOUTER** : Taux de satisfaction
   - ➕ **AJOUTER** : Types de demandes les plus fréquents

---

### Mission 3 : OTAMessagesPage (Messages OTAs)

**Fonctionnalités COMPLÈTES à implémenter** :

1. **Unified Inbox** :
   - ✅ ChatLayout (déjà fait)
   - ➕ **AJOUTER** : Liste conversations :
     - Badge source OTA (Airbnb, Booking, etc.)
     - Nom guest + property
     - Dates séjour
     - Badge non lus
     - Preview dernier message
     - Tri par date

2. **Zone Messages** :
   - ➕ **AJOUTER** : Messages groupés par jour
   - ➕ **AJOUTER** : Support images/pièces jointes
   - ➕ **AJOUTER** : Différenciation guest/host
   - ➕ **AJOUTER** : Status messages (envoyé, lu, échec)
   - ➕ **AJOUTER** : Bouton "Traduire" si langue différente

3. **Envoi** :
   - ➕ **AJOUTER** : Textarea + bouton "Envoyer"
   - ➕ **AJOUTER** : Templates réponses (check-in, directions, etc.)
   - ➕ **AJOUTER** : AI suggestion de réponse
   - ➕ **AJOUTER** : Joindre fichiers (PDF house rules, etc.)

4. **Filtres** :
   - ➕ **AJOUTER** : Par OTA
   - ➕ **AJOUTER** : Par statut (non lus, importants, archivés)
   - ➕ **AJOUTER** : Par property
   - ➕ **AJOUTER** : Par date séjour

5. **Actions** :
   - ➕ **AJOUTER** : Bouton "Marquer lu/non lu"
   - ➕ **AJOUTER** : Bouton "Important" (star)
   - ➕ **AJOUTER** : Bouton "Créer tâche depuis message"
   - ➕ **AJOUTER** : Recherche dans messages

**Design** : Comme CommsPage mais multi-sources OTA

---

### Checklist Livraison

Pour chaque page :

- [ ] Toutes les interactions fonctionnent
- [ ] Drawers multi-onglets complets
- [ ] Formulaires de réponse fonctionnels
- [ ] AI suggestions affichées
- [ ] Filtres et recherche
- [ ] Stats et graphiques
- [ ] Au moins 30+ reviews, 50+ requests, 100+ messages MOCK

---

## 🎯 STANDARDS GLOBAUX (TOUS LES AGENTS)

### Design System

**Couleurs** :
```typescript
primary: '#e6b022',      // Or Sojori
secondary: '#8b5cf6',    // Violet AI
accent: '#06b6d4',       // Cyan
success: '#10b981',      // Vert
warning: '#f59e0b',      // Orange
error: '#ef4444',        // Rouge
```

**Backgrounds** :
```typescript
bg0: '#ffffff',
bg1: '#fafaf9',
bg2: '#f5f5f4',
bg3: '#e7e5e4',
```

**Composants à utiliser** :
- `DashboardWrapper` - Layout principal
- `PageHeader` - Header de page
- `Panel` - Conteneur avec border
- `DataTable` - Tableau avec tri/filtres
- `Badge` - Status badges
- `AICard` - Suggestions AI
- `Revenue` - Montants formatés
- `OrchestrationTimeline` - Timeline événements
- `CalendarGantt` - Vue calendrier
- `KanbanBoard` - Vue Kanban
- `ChatLayout` - Vue chat
- `ViewToggle` - Toggles de vue

### Données MOCK

**Minimum par page** :
- Inventaire : 90 jours × 8 listings = 720 cellules
- Pricing : 10 règles, 20 comparaisons, 5 événements
- Channels : 7 OTAs, 30 mappings, 100 logs
- Clients : 50 clients
- Team : 15 staff
- Planning : 180 tâches
- Staff WhatsApp : 200 messages
- Reviews : 30 avis
- Requests : 50 demandes
- OTA Messages : 100 messages

### Formules de Calcul

**Stats à calculer dynamiquement** (pas hardcodées) :
```typescript
// Exemple : Taux d'occupation
const occupancyRate = (bookedNights / totalNights) * 100;

// Exemple : Rating moyen
const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

// Exemple : Taux de réponse
const responseRate = (respondedReviews / totalReviews) * 100;
```

### Validation Formulaires

**Toujours valider** :
- Champs requis
- Formats (email, téléphone, dates)
- Cohérence (date début < date fin)
- Afficher erreurs sous les champs

### Interactions

**Ce qui DOIT fonctionner** :
- Clics (rows, buttons, cards)
- Modals/Drawers (ouverture/fermeture)
- Formulaires (saisie, validation, submit simulé)
- Filtres (changement de données affichées)
- Recherche (filtrage en temps réel)
- Tri (ordre croissant/décroissant)
- Toggles (changement de vue)
- Drag & drop (si Kanban/Planning)

---

## 📦 LIVRAISON

Pour chaque agent, tu DOIS me fournir :

1. **Code complet** de chaque page modifiée
2. **Liste des fonctionnalités ajoutées** (checklist)
3. **Nombre de lignes de code** par fichier
4. **Nombre d'entrées MOCK** par type de données
5. **Screenshots** (optionnel mais apprécié)

**Format de retour** :
```
# Agent X : [Nom]

## Pages complétées :
- PageName.tsx (XXX lignes, +YYY lignes ajoutées)

## Fonctionnalités ajoutées :
- [x] Feature 1
- [x] Feature 2
...

## Données MOCK :
- XX items
- YY interactions

## Problèmes rencontrés :
- Aucun / [Description]
```

---

**Prêt à lancer ?** 🚀
