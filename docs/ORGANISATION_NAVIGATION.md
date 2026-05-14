# 📐 Organisation de la Navigation - Sojori Orchestrator

**Date** : 14 Mai 2026
**Version** : 1.0

---

## 🗂️ STRUCTURE SIDEBAR

La sidebar est organisée en **7 sections** principales :

### 1. 🎯 PILOTAGE (Strategic)

**Objectif** : Vue stratégique et orchestration automatisée

| Item | Route | Page | Statut |
|------|-------|------|--------|
| **Orchestration** | `/orchestration` | OrchestrationPage.tsx | ✅ Complet |
| › Chronologie | `/orchestration/timeline/:id` | OrchestrationPage.tsx | ✅ Complet |
| › Événements | `/orchestration/events` | OrchestrationEventsPage.tsx | ✅ Complet |
| › Configuration | `/orchestration/config` | OrchestrationConfigPage.tsx | ✅ Complet |

**Fonctionnalités** :
- Timeline des événements par réservation (20+ événements)
- Vue board avec statuts visuels
- Configuration des workflows automatiques
- Log complet de tous les événements

---

### 2. 📅 CALENDRIER

**Objectif** : Gestion calendrier & disponibilités

| Item | Route | Page | Statut |
|------|-------|------|--------|
| **Vue multi-propriétés** | `/calendar` | CalendarInventoryPage.tsx | ✅ Complet |
| **Inventaire** | `/inventory` | InventoryPage.tsx | ⚠️ À compléter |

**Fonctionnalités** :
- Gantt 21 jours avec 5+ propriétés
- Vue inventaire 90 jours (dispo/réservé/bloqué)
- Blocages manuels
- Gestion prix par jour

---

### 3. 🎫 RÉSERVATIONS

**Objectif** : Gestion des réservations

| Item | Route | Page | Statut |
|------|-------|------|--------|
| **Liste** | `/reservations` | ReservationsPage.tsx | ✅ Complet |
| **Séjour** | `/reservations/:id` | ReservationSejourPage.tsx | ✅ Complet |

**Fonctionnalités** :
- Liste complète avec filtres avancés
- Stats (revenus, taux occupation, ADR)
- Détail réservation avec timeline
- Actions rapides (modifier, annuler)

---

### 4. ✅ TÂCHES & OPÉRATIONS

**Objectif** : Gestion équipe et planning

| Item | Route | Page | Statut |
|------|-------|------|--------|
| **Tâches** | `/tasks` | TasksPage.tsx | ✅ Complet |
| **Équipe** | `/team` | TeamPage.tsx | ⚠️ À compléter |
| **Planning** | `/operations/planning` | PlanningPage.tsx | ⚠️ À compléter |

**Fonctionnalités** :
- Kanban 4 colonnes (À faire, En cours, Bloqué, Terminé)
- Vue liste et timeline
- Gestion staff (15 membres)
- Planning hebdomadaire (180+ tâches)
- Assignation automatique

---

### 5. 💬 COMMUNICATIONS

**Objectif** : Hub de communication centralisé

| Item | Route | Page | Statut |
|------|-------|------|--------|
| **WhatsApp Guests** | `/communications/whatsapp` | CommsPage.tsx | ✅ Complet |
| **WhatsApp Staff** | `/communications/staff` | StaffWhatsAppPage.tsx | ⚠️ À compléter |
| **Messages OTA** | `/communications/ota` | OTAMessagesPage.tsx | ⚠️ À compléter |

**Fonctionnalités** :
- Conversations WhatsApp avec guests (AI suggestions)
- Chat avec staff (200+ messages)
- Unified inbox OTA (Airbnb, Booking, etc.)
- Templates de réponses
- Traduction automatique

---

### 6. 🎫 SERVICE CLIENT

**Objectif** : Support et satisfaction client

| Item | Route | Page | Statut |
|------|-------|------|--------|
| **Demandes** | `/requests` | RequestsPage.tsx | ⚠️ À compléter |
| **Avis** | `/reviews` | ReviewsPage.tsx | ⚠️ À compléter |

**Fonctionnalités** :
- Demandes guests (Kanban + Table)
- Timeline de résolution
- Avis multi-plateformes (30+ avis)
- AI suggestions de réponses
- Sentiment analysis

---

### 7. 🏠 CATALOGUE

**Objectif** : Gestion annonces et distribution

| Item | Route | Page | Statut |
|------|-------|------|--------|
| **Annonces** | `/listings` | ListingsPage.tsx | ✅ Complet |
| **Listing Form** | `/listings/:id` | NewListingFormPage.tsx | ✅ Complet |
| **Tarification** | `/pricing` | PricingPage.tsx | ⚠️ À compléter |
| **Canaux** | `/channels` | ChannelsPage.tsx | ⚠️ À compléter |
| **Clients** | `/clients` | ClientsPage.tsx | ⚠️ À compléter |

**Fonctionnalités** :
- Grid de 42 annonces avec photos
- Formulaire listing 22 onglets (34k lignes)
- Pricing dynamique avec AI
- Channel manager (7 OTAs)
- CRM clients (50+ clients)

---

## 📊 STATISTIQUES NAVIGATION

### Pages par Statut

| Statut | Nombre | Pages |
|--------|--------|-------|
| ✅ **Complet** | 8 | Orchestration, Calendar, Reservations, Tasks, Comms Guests, Listings, Listing Form, Orchestration Events/Config |
| ⚠️ **À compléter** | 10 | Inventory, Pricing, Channels, Clients, Team, Planning, Staff WA, Reviews, Requests, OTA Messages |

### Pages par Section

| Section | Pages Complètes | Pages Incomplètes | Total |
|---------|-----------------|-------------------|-------|
| Pilotage | 4 | 0 | 4 |
| Calendrier | 1 | 1 | 2 |
| Réservations | 2 | 0 | 2 |
| Tâches & Opérations | 1 | 2 | 3 |
| Communications | 1 | 2 | 3 |
| Service Client | 0 | 2 | 2 |
| Catalogue | 2 | 3 | 5 |

**Total** : 11 complètes + 10 incomplètes = **21 pages**

---

## 🎯 PRIORITÉS POUR LES AGENTS

### Haute Priorité (Business Critical)
1. **Inventory** - Gestion dispo calendrier
2. **Pricing** - Tarification dynamique
3. **Channels** - Sync OTAs

### Moyenne Priorité (Opérations)
4. **Team** - Gestion équipe
5. **Planning** - Planning hebdo
6. **Clients** - CRM

### Basse Priorité (Support & Satisfaction)
7. **Staff WhatsApp** - Chat équipe
8. **Reviews** - Gestion avis
9. **Requests** - Demandes guests
10. **OTA Messages** - Inbox OTA

---

## 🔄 ÉTAT DES SECTIONS (Collapsed par défaut)

Par défaut, certaines sections sont **ouvertes** ou **fermées** au chargement :

```javascript
{
  'Pilotage': false,              // ✅ Ouvert
  'Calendrier': false,            // ✅ Ouvert
  'Réservations': false,          // ✅ Ouvert
  'Tâches & Opérations': true,    // ❌ Fermé
  'Communications': true,          // ❌ Fermé
  'Service Client': true,          // ❌ Fermé
  'Catalogue': true,               // ❌ Fermé
}
```

**Pourquoi ?**
- Sections principales ouvertes (Pilotage, Calendrier, Réservations)
- Sections secondaires fermées pour ne pas surcharger la sidebar

---

## 📝 NOTES POUR LES AGENTS

Quand tu crées/complètes une page, assure-toi que :

1. ✅ **La route existe dans `App.tsx`**
   ```typescript
   <Route path="/inventory" element={<InventoryPage />} />
   ```

2. ✅ **Le mapping est dans `DashboardWrapper.tsx`**
   ```typescript
   'inventory': '/inventory',
   ```

3. ✅ **Le breadcrumb est cohérent**
   ```typescript
   <DashboardWrapper breadcrumb={['Calendrier', 'Inventaire']}>
   ```

4. ✅ **L'icône est appropriée**
   - Pilotage : ✨ (AI), 📊 (data)
   - Calendrier : 📅, 📊
   - Réservations : 🎫, 📋
   - Tâches : ✅, 👥, 📆
   - Communications : 💬, 📨
   - Service Client : 🎫, ⭐
   - Catalogue : 🏠, 📈, 🔗, 👤

---

## 🎨 DESIGN SYSTEM (Rappel)

### Couleurs de Badges

```typescript
success: '#10b981',   // Vert - Confirmé, Actif, Disponible
warning: '#f59e0b',   // Orange - En attente, À vérifier
error: '#ef4444',     // Rouge - Erreur, Annulé, Urgent
info: '#3b82f6',      // Bleu - Info, Neutre
ai: '#8b5cf6',        // Violet - IA, Automatique
primary: '#e6b022',   // Or Sojori - Principal
```

### États par Section

| Section | Badge Fréquent | Couleur |
|---------|----------------|---------|
| Pilotage | AI | Violet |
| Calendrier | - | - |
| Réservations | Confirmée/Pending | Vert/Orange |
| Tâches | 7 en cours | Rouge (urgent) |
| Communications | 3 non lus | Rouge |
| Service Client | - | - |
| Catalogue | 42 annonces | Bleu (info) |

---

**Dernière mise à jour** : 14 Mai 2026
**Par** : Claude Code (Sonnet 4.5)
