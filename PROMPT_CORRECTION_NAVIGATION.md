# 🎯 PROMPT CORRECTION - NAVIGATION DASHBOARD SOJORI

## Contexte

Tu as créé 6 pages de dashboard avec un design magnifique et fonctionnel. Cependant, **l'architecture de navigation ne correspond pas à la logique métier** décrite dans le brief initial.

Le problème principal: tu as mis **Calendrier** et **Vue d'ensemble** dans la section "Pilotage", alors que:
- **Calendrier** doit être dans un groupe "Réservations" dédié
- **Vue d'ensemble** ne doit pas exister (marqué comme "à refaire")

---

## 📋 TÂCHE: Corriger la navigation sidebar

### Fichier à modifier:
`/Users/gouacht/Sojori-orchestrator/src/components/dashboard/DashboardV2.components.jsx`

### Section à corriger:
Lignes 78-101 - `export const NAV = [...]`

---

## ✅ STRUCTURE CORRECTE ATTENDUE

```javascript
export const NAV = [
  // ═══════════════════════════════════════════════════════
  // PILOTAGE (Strategic)
  // ═══════════════════════════════════════════════════════
  { group: 'Pilotage', items: [
    { id: 'orchestration', label: 'Orchestration', icon: '✨', badge: 'AI', sub: [
      { id: 'orchestration/timeline', label: '› Chronologie' },
      { id: 'orchestration/events', label: '› Événements' },
      { id: 'orchestration/config', label: '› Configuration' },
    ]},
  ]},

  // ═══════════════════════════════════════════════════════
  // RÉSERVATIONS (Core business)
  // ═══════════════════════════════════════════════════════
  { group: 'Réservations', items: [
    { id: 'reservations/calendar', label: 'Calendrier', icon: '📅',
      description: 'Vue multi-propriétés' },
    { id: 'reservations/inventory', label: 'Inventaire', icon: '📦',
      description: 'Disponibilités & tarifs' },
    { id: 'reservations/list', label: 'Liste', icon: '🎫', badge: '23',
      description: 'Toutes les réservations' },
    { id: 'reservations/requests', label: 'Demandes', icon: '📝', badge: '2',
      description: 'En attente de confirmation' },
  ]},

  // ═══════════════════════════════════════════════════════
  // TÂCHES & OPÉRATIONS
  // ═══════════════════════════════════════════════════════
  { group: 'Tâches & Opérations', items: [
    { id: 'tasks/list', label: 'Liste', icon: '✅', badge: '7',
      description: 'Kanban & table' },
    { id: 'tasks/team', label: 'Équipe', icon: '👥',
      description: 'Staff assignments' },
    { id: 'tasks/planning', label: 'Planning', icon: '📆',
      description: 'Calendrier staff' },
    { id: 'tasks/staff-wa', label: 'Staff WhatsApp', icon: '💬',
      description: 'Communication équipe' },
  ]},

  // ═══════════════════════════════════════════════════════
  // COMMUNICATIONS HUB
  // ═══════════════════════════════════════════════════════
  { group: 'Communications', items: [
    { id: 'comms/guests', label: 'WhatsApp Guests', icon: '💬', badge: '3', badgeRed: true,
      description: 'Conversations voyageurs' },
    { id: 'comms/staff', label: 'Staff WhatsApp', icon: '👷',
      description: 'Messages équipe' },
    { id: 'comms/ota', label: 'Messages OTA', icon: '📨',
      description: 'Airbnb · Booking.com' },
  ]},

  // ═══════════════════════════════════════════════════════
  // AUTRES (Service & Reviews)
  // ═══════════════════════════════════════════════════════
  { group: 'Service Client', items: [
    { id: 'requests', label: 'Demandes', icon: '🎫',
      description: 'Demandes de service' },
    { id: 'reviews', label: 'Avis', icon: '⭐',
      description: 'Reviews OTA' },
  ]},

  // ═══════════════════════════════════════════════════════
  // CATALOGUE
  // ═══════════════════════════════════════════════════════
  { group: 'Catalogue', items: [
    { id: 'listings', label: 'Annonces', icon: '🏠', badge: '42',
      description: 'Actives & inactives' },
    { id: 'pricing', label: 'Tarification', icon: '📈',
      description: 'Dynamic pricing' },
    { id: 'channels', label: 'Canaux', icon: '🔗',
      description: 'Channel manager' },
    { id: 'clients', label: 'Clients', icon: '👤',
      description: 'Base voyageurs' },
  ]},
];
```

---

## 🔧 MODIFICATIONS À APPORTER

### 1. Supprimer de Pilotage:
- ❌ `{ id: 'home', label: "Vue d'ensemble", icon: '⌂' }`
- ❌ `{ id: 'calendar', label: 'Calendrier', icon: '📅' }`

### 2. Créer nouveau groupe "Réservations":
- ✅ Calendrier (déplacé depuis Pilotage)
- ✅ Inventaire (nouveau)
- ✅ Liste (ancien "Réservations" renommé)
- ✅ Demandes (déplacé depuis Activité)

### 3. Restructurer "Tâches & Opérations":
- ✅ Ajouter sous-sections: Liste, Équipe, Planning, Staff WhatsApp
- ✅ L'actuel "Tâches" devient "Tâches/Liste"

### 4. Restructurer "Communications Hub":
- ✅ Séparer en 3: WhatsApp Guests, Staff WhatsApp, Messages OTA
- ✅ L'actuel "Communications" devient "Communications/Guests"

### 5. Créer groupe "Service Client":
- ✅ Demandes (service requests)
- ✅ Avis (reviews)

### 6. Garder "Catalogue" tel quel:
- ✅ Annonces, Tarification, Canaux, Clients

---

## 🗺️ MAPPING ROUTES À METTRE À JOUR

### Fichier: `/Users/gouacht/Sojori-orchestrator/src/components/DashboardWrapper.tsx`

**AVANT:**
```typescript
const navToRoute: Record<string, string> = {
  'home': '/',
  'orchestration/timeline': '/orchestration/timeline/1234',
  'calendar': '/calendar',
  'reservations': '/reservations',
  'tasks': '/tasks',
  'comms': '/communications/whatsapp',
  'listings': '/listings',
};
```

**APRÈS:**
```typescript
const navToRoute: Record<string, string> = {
  // Pilotage
  'orchestration/timeline': '/orchestration/timeline/1234',
  'orchestration/events': '/orchestration/events',
  'orchestration/config': '/orchestration/config',

  // Réservations
  'reservations/calendar': '/reservations/calendar',
  'reservations/inventory': '/reservations/inventory',
  'reservations/list': '/reservations/list',
  'reservations/requests': '/reservations/requests',

  // Tâches
  'tasks/list': '/tasks/list',
  'tasks/team': '/tasks/team',
  'tasks/planning': '/tasks/planning',
  'tasks/staff-wa': '/tasks/staff-whatsapp',

  // Communications
  'comms/guests': '/communications/guests',
  'comms/staff': '/communications/staff',
  'comms/ota': '/communications/ota',

  // Service
  'requests': '/requests',
  'reviews': '/reviews',

  // Catalogue
  'listings': '/listings',
  'pricing': '/pricing',
  'channels': '/channels',
  'clients': '/clients',
};
```

---

## 🎯 OBJECTIF FINAL

**Sidebar navigation doit refléter la logique métier:**

```
📊 PILOTAGE
  ✨ Orchestration
    › Chronologie
    › Événements
    › Configuration

🎫 RÉSERVATIONS
  📅 Calendrier
  📦 Inventaire
  🎫 Liste (23)
  📝 Demandes (2)

✅ TÂCHES & OPÉRATIONS
  ✅ Liste (7)
  👥 Équipe
  📆 Planning
  💬 Staff WhatsApp

💬 COMMUNICATIONS
  💬 WhatsApp Guests (3)
  👷 Staff WhatsApp
  📨 Messages OTA

🎫 SERVICE CLIENT
  🎫 Demandes
  ⭐ Avis

🏠 CATALOGUE
  🏠 Annonces (42)
  📈 Tarification
  🔗 Canaux
  👤 Clients
```

---

## ⚠️ NE PAS MODIFIER

- ✅ **Design des pages existantes** (ReservationsPage, CalendarPage, etc.) - parfait!
- ✅ **Composants UI** (StatsRow, DataTable, etc.) - excellents!
- ✅ **Couleurs, spacing, typographie** - à conserver!

**Seule modification:** Réorganiser le tableau `NAV` et le mapping des routes.

---

## 🚀 ÉTAPES D'EXÉCUTION

1. Ouvrir `/Users/gouacht/Sojori-orchestrator/src/components/dashboard/DashboardV2.components.jsx`
2. Remplacer `export const NAV = [...]` (lignes 78-101) par la nouvelle structure ci-dessus
3. Ouvrir `/Users/gouacht/Sojori-orchestrator/src/components/DashboardWrapper.tsx`
4. Mettre à jour `navToRoute` avec le nouveau mapping
5. Redémarrer le serveur: `pnpm dev`
6. Vérifier que la sidebar affiche la nouvelle structure
7. Vérifier que les liens existants fonctionnent toujours

---

## ✅ CRITÈRES DE SUCCÈS

- [ ] Sidebar affiche 6 groupes: Pilotage, Réservations, Tâches, Communications, Service Client, Catalogue
- [ ] "Vue d'ensemble" a disparu
- [ ] "Calendrier" est maintenant dans "Réservations"
- [ ] Les 6 pages existantes sont toujours accessibles
- [ ] Aucune régression visuelle
- [ ] Navigation fonctionne correctement
