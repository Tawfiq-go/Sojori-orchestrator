# 🎯 NOUVEAU SCHÉMA DE NAVIGATION - SOJORI DASHBOARD V2

## Philosophie

**Organisation par WORKFLOW métier** et non par type d'objet technique.

L'owner suit ce parcours quotidien:
1. Voir ce qui arrive aujourd'hui/demain (Vue d'ensemble)
2. Gérer les réservations en cours
3. Gérer son inventaire/calendrier
4. Communiquer avec guests et équipe
5. Gérer les opérations (tâches, staff)
6. Gérer son catalogue (annonces, canaux, tarifs)

---

## 📐 STRUCTURE PROPOSÉE

### 🏠 VUE D'ENSEMBLE (Home)
**URL:** `/`

**Contenu:**
- Dashboard avec KPIs du mois
- Arrivées aujourd'hui/demain
- Tâches urgentes (3 prochaines)
- Messages non lus (3 derniers)
- Événements orchestration critiques

**Objectif:** Vision 360° en 1 coup d'œil

---

### 🎫 RÉSERVATIONS
**Groupe principal - cœur de métier**

#### 📅 Calendrier
**URL:** `/reservations/calendar`
- Vue multi-propriétés (Gantt 21j/mois/semaine)
- Drag & drop pour bloquer/débloquer dates
- Color-coded par statut (confirmée, pending, checkout)

#### 🎫 Toutes les réservations
**URL:** `/reservations/list`
- Table filtrable/sortable
- Filtres: Statut, Date, Source (Airbnb/Booking/Direct), Listing
- Export CSV
- Actions rapides: Voir détails, Message guest, Créer tâche

#### 📝 Demandes en attente
**URL:** `/reservations/requests`
- Demandes de réservation à valider/refuser
- Badge rouge si > 2h sans réponse
- Action rapide: Accepter/Refuser avec raison

#### 👤 Détail d'une réservation
**URL:** `/reservations/:id`
- Infos guest (nom, pays, séjours précédents, VIP status)
- Dates, prix, source
- **Timeline orchestration** (événements clés)
- Messages (shortcut vers Comms)
- Tâches liées (ménages, check-in/out)
- Actions: Message guest, Créer tâche, Modifier, Annuler

---

### 🏠 INVENTAIRE & CATALOGUE

#### 📦 Inventaire
**URL:** `/inventory`
- Vue calendrier par listing
- Disponibilités (ouvert/fermé)
- Prix par nuit (tarif de base + dynamic pricing)
- Restrictions (min nights, check-in/out rules)
- Action: Bloquer dates, Modifier prix, Sync canaux

#### 🏠 Mes annonces
**URL:** `/listings`
- Grid cards avec photo
- Stats: Taux occupation, ADR, RevPAR, Reviews
- Channels actifs (badges Airbnb/Booking/VRBO/Direct)
- Actions: Modifier, Voir sur OTA, Désactiver

#### ➕ Créer/Modifier annonce
**URL:** `/listings/:id/edit` ou `/listings/new`
- Formulaire (celui que tu as déjà créé avec Claude Design!)

#### 📈 Tarification dynamique
**URL:** `/pricing`
- Calendrier avec prix suggérés vs prix actuels
- Règles de pricing (weekend, événements, saisonnalité)
- Comparaison avec concurrence

#### 🔗 Canaux (Channel Manager)
**URL:** `/channels`
- Liste des connexions: Airbnb, Booking.com, VRBO, etc.
- Statut sync (dernière sync, erreurs)
- Mapping listings ↔ annonces OTA
- Actions: Reconnecter, Sync manuel, Gérer mapping

---

### ✅ OPÉRATIONS & TÂCHES

#### ✅ Tâches
**URL:** `/operations/tasks`
- Vue Kanban (À faire, En cours, À valider, Terminé)
- Filtres: Date, Listing, Staff assigné, Type (ménage, maintenance, check-in)
- Actions: Créer tâche, Assigner staff, Changer statut

#### 👥 Équipe
**URL:** `/operations/team`
- Liste staff avec rôles (femme de ménage, maintenance, conciergerie)
- Disponibilités
- Stats: Tâches complétées, Moyenne qualité, Délai moyen
- Actions: Ajouter membre, Modifier, Désactiver

#### 📆 Planning
**URL:** `/operations/planning`
- Calendrier staff (qui travaille quand)
- Vue par semaine/mois
- Affectations tâches par personne
- Drag & drop pour réassigner

---

### 💬 COMMUNICATIONS

#### 💬 WhatsApp Guests
**URL:** `/communications/guests`
- Liste conversations voyageurs
- Thread chat par guest
- AI suggestions de réponses
- Quick actions: Template welcome, code accès, etc.

#### 👷 WhatsApp Staff
**URL:** `/communications/staff`
- Conversations équipe interne
- Broadcast messages (envoyer à toute l'équipe)
- Groupes (par rôle: ménages, maintenance)

#### 📨 Messages OTA
**URL:** `/communications/ota`
- Unified inbox: messages Airbnb + Booking.com
- Statut: Non lu, En attente réponse, Résolu
- Action: Répondre (copié dans OTA)

---

### ✨ ORCHESTRATION (AI)

#### 🔮 Vue d'ensemble
**URL:** `/orchestration`
- Tous les workflows actifs
- Statut par réservation: vert (OK), orange (action requise), rouge (bloqué)
- Prochaines actions à venir (J+1, J+2)
- Anomalies détectées par AI

#### 📊 Chronologie par réservation
**URL:** `/orchestration/timeline/:reservationId`
- **Timeline verticale ultra-détaillée** (comme celle que tu m'as montrée!)
- Tous les événements:
  - Messages (bienvenue, feedback, merci, avis)
  - Enregistrement voyageur (registration)
  - Check-in/Check-out (déclaration)
  - Tâches (ménages, staff)
  - Notifications (admin, client)
  - Deadlines
- Statuts: COMPLETED, PENDING, INFO, Retard
- Icônes: 📨 📱 🔐 🎫 👤 ⏰ 🔔
- Indicateurs: Fenêtre (terminée/disponible/trop tôt), Relances, Essais

#### ⚙️ Configuration workflows
**URL:** `/orchestration/config`
- Liste des workflows disponibles (Villa long séjour, Studio court séjour, etc.)
- Par workflow: étapes, triggers, conditions
- Templates de messages
- Actions: Créer workflow, Modifier, Dupliquer, Activer/Désactiver

#### 📜 Événements système
**URL:** `/orchestration/events`
- Log de TOUS les événements (toutes réservations confondues)
- Filtres: Date, Type, Réservation, Statut
- Utile pour debug et audit

---

### 👤 CLIENTS (CRM)

#### 👤 Base clients
**URL:** `/clients`
- Liste tous les voyageurs
- Infos: Nombre séjours, Revenu total, Note moyenne donnée, VIP status
- Filtres: Pays, Nb séjours, Dernière visite
- Actions: Voir historique, Envoyer message

#### 👤 Détail client
**URL:** `/clients/:id`
- Infos perso (anonymisées selon RGPD)
- Historique réservations
- Messages échangés
- Notes/Tags (VIP, problématique, etc.)

---

### ⭐ AVIS & DEMANDES

#### ⭐ Avis
**URL:** `/reviews`
- Tous les avis Airbnb/Booking
- Moyenne par listing
- Filtres: Note, Date, OTA
- Réponses à donner (pending review response)

#### 🎫 Demandes de service
**URL:** `/requests`
- Demandes guests pendant séjour (extra towels, early check-in, etc.)
- Statut: Nouveau, En cours, Résolu
- Actions: Assigner staff, Marquer résolu, Message guest

---

### 📊 RAPPORTS & ANALYTIQUES (Optionnel - V2)

#### 📊 Tableau de bord
**URL:** `/reports`
- Revenus (mois, année)
- Occupation
- ADR / RevPAR
- Top listings
- Comparaison année N vs N-1

---

## 🎨 SIDEBAR FINALE

```
🏠 Vue d'ensemble

━━━━━━━━━━━━━━━━━━━━━━━
🎫 RÉSERVATIONS
  📅 Calendrier
  🎫 Toutes les réservations (23)
  📝 Demandes en attente (2)

━━━━━━━━━━━━━━━━━━━━━━━
🏠 INVENTAIRE & CATALOGUE
  📦 Inventaire
  🏠 Mes annonces (42)
  📈 Tarification
  🔗 Canaux

━━━━━━━━━━━━━━━━━━━━━━━
✅ OPÉRATIONS
  ✅ Tâches (7)
  👥 Équipe
  📆 Planning

━━━━━━━━━━━━━━━━━━━━━━━
💬 COMMUNICATIONS
  💬 WhatsApp Guests (3 non lus)
  👷 WhatsApp Staff
  📨 Messages OTA

━━━━━━━━━━━━━━━━━━━━━━━
✨ ORCHESTRATION (AI)
  🔮 Vue d'ensemble
  ⚙️ Configuration
  📜 Événements

━━━━━━━━━━━━━━━━━━━━━━━
👤 CLIENTS & AVIS
  👤 Base clients
  ⭐ Avis
  🎫 Demandes de service
```

---

## 🎯 MAPPING ANCIEN → NOUVEAU

| Ancien dashboard | Nouveau schéma |
|------------------|----------------|
| `/admin/orchestrator` (chronologie) | `/orchestration/timeline/:id` |
| `/admin/reservation` | `/reservations/list` |
| `/calendar` | `/reservations/calendar` |
| `/tasks` | `/operations/tasks` |
| `/staff` | `/operations/team` |
| `/communications` | `/communications/guests` |
| `/listing` | `/listings` |
| `/channels` | `/channels` |

---

## ✅ AVANTAGES DE CE SCHÉMA

1. **Logique métier** > logique technique
2. **Parcours owner** clair et intuitif
3. **Groupes cohérents** (tout ce qui touche aux réservations ensemble, etc.)
4. **Orchestration isolée** car c'est une feature AI avancée
5. **Vue d'ensemble en home** pour vision rapide
6. **Scalable** pour ajouter nouvelles features (rapports, financial, etc.)

---

## 🚀 PROCHAINES ÉTAPES

1. Valider ce schéma avec toi
2. Créer les routes dans `App.tsx`
3. Mettre à jour `NAV` dans `DashboardV2.components.jsx`
4. Créer les pages manquantes (stubs d'abord, puis contenu)
5. Migrer le code de l'ancien dashboard vers les nouvelles pages
