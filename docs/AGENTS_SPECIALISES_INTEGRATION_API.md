# 🤖 AGENTS SPÉCIALISÉS - INTÉGRATION API

**Date** : 14 Mai 2026
**Mission** : Intégration complète des APIs backend dans le nouveau dashboard Sojori
**Référence** : sojori-dashboard (ancien) → Sojori-orchestrator (nouveau)

---

## 📋 VUE D'ENSEMBLE

### Contexte

**Projet actuel** : `Sojori-orchestrator`
- Stack : Vite 8 + React 18 + TypeScript + Material-UI v9
- Design : Aurora Soft Light (#e6b022 gold, #8b5cf6 purple)
- Port : 4174 (dev)
- Path : `/Users/gouacht/Sojori-orchestrator`

**Référence** : `sojori-dashboard` (ancien dashboard)
- Path : `/Users/gouacht/sojori-dashboard`
- À consulter pour Dashboard et Analytics (réutiliser le code)
- NE PAS copier pour les autres modules (refaire from scratch)

**Backend** : `sojori-production`
- Path : `/Users/gouacht/sojori-production`
- Microservices Node.js/TypeScript
- APIs REST + RabbitMQ events
- MongoDB Atlas

---

## 🎯 STRATÉGIE PAR AGENT

| Agent | Nom | Approche | Référence |
|-------|-----|----------|-----------|
| 1 | **Agent-Orchestration** | From scratch | Aucune (nouveau) |
| 2 | **Agent-Reservations** | From scratch | Aucune (nouveau) |
| 3 | **Agent-Calendrier** | From scratch | Aucune (nouveau) |
| 4 | **Agent-Inbox** | From scratch | Aucune (nouveau) |
| 5 | **Agent-Tasks** | From scratch | Aucune (nouveau) |
| 6 | **Agent-Annonces** | From scratch | Aucune (nouveau) |
| 7 | **Agent-Dashboard** | **Réutiliser code existant** | sojori-dashboard |
| 8 | **Agent-Analytics** | **Réutiliser code existant** | sojori-dashboard |

---

## 🔧 CE QUI A ÉTÉ FAIT

### ✅ Design System (Aurora Soft Light)

**Fichier** : `src/components/dashboard/DashboardV2.components.jsx`

**Tokens disponibles** :
```typescript
export const tokens = {
  // Colors
  primary: '#e6b022',        // Gold
  primaryDeep: '#d9a021',
  primaryTint: 'rgba(230,176,34,0.08)',

  secondary: '#8b5cf6',      // Purple/AI

  success: '#10b981',
  successTint: 'rgba(16,185,129,0.05)',

  error: '#ef4444',

  // Text
  text: '#18181b',           // Presque noir
  text2: '#3f3f46',
  text3: '#71717a',

  // Backgrounds
  bg1: '#ffffff',
  bg2: '#f9fafb',
  bg3: '#f3f4f6',

  // Borders
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
};
```

**Composants disponibles** :
- `DashboardWrapper` - Layout principal avec sidebar
- `PageHeader` - En-tête de page avec breadcrumb
- `Panel` - Conteneur avec titre/description
- `Badge` - Badges colorés
- `ViewToggle` - Sélecteur de vue
- `btnPrimarySx` - Style bouton primaire (gold)
- `btnGhostSx` - Style bouton ghost

### ✅ Pages créées (UI only, pas d'API)

1. **CalendarInventoryPage** (`src/pages/CalendarInventoryPage.tsx`)
   - Vue simple + multi-propriétés
   - MultiPropertyInventory component
   - Modal drawer avec DayDetailPanel
   - Mock data uniquement

2. **ReservationSejourPage** (`src/pages/ReservationSejourPage.tsx`)
   - Vue séjour avec réservations en blocs horizontaux
   - 6 propriétés avec réservations
   - Utilise MultiPropertyInventory (showPrices=false)
   - Mock data uniquement

3. **LoginPage** (`src/pages/LoginPage.tsx`)
   - Authentification mock
   - Couleurs Aurora Soft Light
   - Pas d'API backend connectée

### ✅ Navigation

**Fichier** : `src/components/dashboard/DashboardV2.components.jsx`

**Structure actuelle** :
```typescript
const NAV = [
  {
    group: 'pilotage',
    label: 'Pilotage',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'analytics', label: 'Analytics', icon: '📈' },
      { id: 'reports', label: 'Reports', icon: '📄' },
      { id: 'orchestration', label: 'Orchestration', icon: '🎯' },
    ],
  },
  {
    group: 'calendar',
    label: 'Calendrier',
    items: [
      { id: 'calendar', label: 'Calendrier', icon: '📅' },
    ],
  },
  {
    group: 'reservations',
    label: 'Réservations',
    items: [
      { id: 'reservations/list', label: 'Liste Réservations', icon: '📋' },
      { id: 'reservations/sejour', label: 'Vue Séjour', icon: '🏡' },
    ],
  },
  {
    group: 'tasks',
    label: 'Tâches & Opérations',
    items: [
      { id: 'tasks/list', label: 'Liste Tâches', icon: '✓' },
      { id: 'tasks/team', label: 'Équipe', icon: '👥' },
      { id: 'tasks/planning', label: 'Planning', icon: '📆' },
      { id: 'tasks/staff-whatsapp', label: 'Staff WhatsApp', icon: '💬' },
    ],
  },
  {
    group: 'communications',
    label: 'Communications',
    items: [
      { id: 'communications/whatsapp-guests', label: 'WhatsApp Guests', icon: '💬' },
      { id: 'communications/whatsapp-staff', label: 'WhatsApp Staff', icon: '👨‍💼' },
      { id: 'communications/messages-ota', label: 'Messages OTA', icon: '📨' },
    ],
  },
  {
    group: 'customer-service',
    label: 'Service Client',
    items: [
      { id: 'customer-service/requests', label: 'Requests', icon: '🎫' },
      { id: 'customer-service/reviews', label: 'Reviews', icon: '⭐' },
    ],
  },
  {
    group: 'catalogue',
    label: 'Catalogue',
    items: [
      { id: 'catalogue/listings', label: 'Annonces', icon: '🏠' },
      { id: 'catalogue/pricing', label: 'Tarification', icon: '💰' },
      { id: 'catalogue/channels', label: 'Canaux', icon: '🔗' },
      { id: 'catalogue/clients', label: 'Clients', icon: '👤' },
    ],
  },
];
```

**Améliorations récentes** :
- ✅ Scroll fluide (WebkitOverflowScrolling, GPU acceleration)
- ✅ Auto-open groupe contenant l'item actif
- ✅ AI section supprimée du bas de sidebar

### ✅ Routing

**Fichier** : `src/App.tsx`

**Routes configurées** :
```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/dashboard" element={<div>Dashboard</div>} />
<Route path="/analytics" element={<div>Analytics</div>} />
<Route path="/orchestration" element={<div>Orchestration</div>} />
<Route path="/calendar" element={<CalendarInventoryPage />} />
<Route path="/reservations/list" element={<div>Liste Réservations</div>} />
<Route path="/reservations/sejour" element={<ReservationSejourPage />} />
<Route path="/tasks/*" element={<div>Tasks</div>} />
<Route path="/communications/*" element={<div>Communications</div>} />
<Route path="/customer-service/*" element={<div>Service Client</div>} />
<Route path="/catalogue/*" element={<div>Catalogue</div>} />
```

**Routes manquantes** : Toutes sauf Login, Calendar, Reservations/Sejour

---

## 🚀 CE QUI DOIT ÊTRE FAIT

### Pour TOUS les agents

**Objectif** : Connecter le frontend aux APIs backend

**Checklist commune** :
1. ✅ Identifier les APIs backend dans `sojori-production/apps/srv-[nom]`
2. ✅ Créer les services API (`src/services/[nom]Service.ts`)
3. ✅ Créer les types TypeScript (`src/types/[nom].types.ts`)
4. ✅ Créer/Mettre à jour les pages React
5. ✅ Gérer l'état avec hooks (useState, useEffect, useMemo)
6. ✅ Afficher loading states, erreurs, données
7. ✅ Utiliser le design system Aurora Soft Light
8. ✅ Tester avec le backend local

**URLs Backend** :
```bash
# Développement local (docker-compose)
srv-orchestrator: http://localhost:4008
srv-reservations: http://localhost:4007
srv-calendar:     http://localhost:4006
srv-task:         http://localhost:4005
srv-listing:      http://localhost:4001
srv-admin:        http://localhost:4002
srv-user:         http://localhost:4003

# Production (GKE)
https://api.sojori.com/[service-name]
```

---

## 📂 DÉTAILS PAR AGENT

### 1️⃣ AGENT-ORCHESTRATION

**Nom** : `Agent-Orchestration`
**Mission** : Créer la page Orchestration (workflow automation)

**Backend** :
- Service : `srv-orchestrator` (port 4008)
- Path : `/Users/gouacht/sojori-production/apps/srv-orchestrator`

**APIs à intégrer** :
```typescript
// GET /api/v1/workflows - Liste workflows
// GET /api/v1/workflows/:id - Détail workflow
// POST /api/v1/workflows - Créer workflow
// PUT /api/v1/workflows/:id - Modifier workflow
// DELETE /api/v1/workflows/:id - Supprimer workflow
// POST /api/v1/workflows/:id/execute - Exécuter workflow
// GET /api/v1/executions - Historique exécutions
```

**Référence** : AUCUNE (créer from scratch)

**Fichiers à créer** :
- `src/services/orchestrationService.ts`
- `src/types/orchestration.types.ts`
- `src/pages/OrchestrationPage.tsx`

**UI à créer** :
- Liste des workflows (nom, status, dernière exécution)
- Détail workflow (steps, conditions, actions)
- Historique exécutions (succès, erreurs, logs)
- Boutons : Créer, Modifier, Supprimer, Exécuter

**Design** :
- Panel pour liste workflows
- Modal pour création/édition
- Timeline pour historique
- Badges pour status (actif, inactif, erreur)

---

### 2️⃣ AGENT-RESERVATIONS

**Nom** : `Agent-Reservations`
**Mission** : Intégrer les APIs réservations dans ReservationSejourPage + créer Liste

**Backend** :
- Service : `srv-reservations` (port 4007)
- Path : `/Users/gouacht/sojori-production/apps/srv-reservations`

**APIs à intégrer** :
```typescript
// GET /api/v1/reservations - Liste réservations
// GET /api/v1/reservations/:id - Détail réservation
// POST /api/v1/reservations - Créer réservation
// PUT /api/v1/reservations/:id - Modifier réservation
// DELETE /api/v1/reservations/:id - Annuler réservation
// GET /api/v1/reservations/by-property/:propertyId - Réservations par propriété
// GET /api/v1/reservations/calendar - Données pour calendrier
```

**Référence** : AUCUNE (créer from scratch)

**Fichiers à créer** :
- `src/services/reservationsService.ts`
- `src/types/reservations.types.ts`
- `src/pages/ReservationsListPage.tsx`

**Fichiers à modifier** :
- `src/pages/ReservationSejourPage.tsx` (remplacer mock data par API)

**UI à créer** :
- **Liste** : Tableau réservations (guest, dates, propriété, montant, status)
- **Vue Séjour** : Remplacer mock data par vraies réservations
- Modal détail réservation
- Filtres (dates, propriétés, status)

**Design** :
- Tableau avec tri/filtres
- Badges status (confirmed, pending, cancelled)
- Vue calendrier avec vraies données

---

### 3️⃣ AGENT-CALENDRIER

**Nom** : `Agent-Calendrier`
**Mission** : Intégrer les APIs calendrier/disponibilité/prix

**Backend** :
- Service : `srv-calendar` (port 4006)
- Path : `/Users/gouacht/sojori-production/apps/srv-calendar`

**APIs à intégrer** :
```typescript
// GET /api/v1/calendar/:propertyId/:month - Calendrier mois
// PUT /api/v1/calendar/prices - Modifier prix
// PUT /api/v1/calendar/availability - Modifier disponibilité
// GET /api/v1/pricing/suggestions - Suggestions AI
// POST /api/v1/calendar/bulk-update - Mise à jour multiple jours
```

**Référence** : AUCUNE (créer from scratch)

**Fichiers à créer** :
- `src/services/calendarService.ts`
- `src/types/calendar.types.ts`

**Fichiers à modifier** :
- `src/pages/CalendarInventoryPage.tsx` (remplacer mock data par API)
- `src/components/MultiPropertyInventory.tsx` (utiliser vraies données)

**UI existante à connecter** :
- ✅ Calendrier simple + multi déjà créé
- ✅ Modal détail jour (DayDetailPanel)
- Remplacer `generateDays()` par appel API
- Implémenter bulk update (sélection multiple jours)

**Design** :
- Conserver design actuel
- Ajouter loading states
- Afficher vraies suggestions AI

---

### 4️⃣ AGENT-INBOX

**Nom** : `Agent-Inbox`
**Mission** : Créer la messagerie (WhatsApp + OTA messages)

**Backend** :
- Service : `srv-chatbot` (port 4000) + `srv-admin`
- Path : `/Users/gouacht/sojori-production/apps/srv-chatbot`

**APIs à intégrer** :
```typescript
// GET /api/v1/messages - Liste messages
// GET /api/v1/messages/conversations - Liste conversations
// GET /api/v1/messages/conversation/:id - Détail conversation
// POST /api/v1/messages/send - Envoyer message
// GET /api/v1/whatsapp/templates - Templates WhatsApp
// POST /api/v1/whatsapp/send-template - Envoyer template
```

**Référence** : AUCUNE (créer from scratch)

**Fichiers à créer** :
- `src/services/messagesService.ts`
- `src/types/messages.types.ts`
- `src/pages/WhatsAppGuestsPage.tsx`
- `src/pages/WhatsAppStaffPage.tsx`
- `src/pages/MessagesOTAPage.tsx`

**UI à créer** :
- Liste conversations (style chat)
- Panneau conversation (messages)
- Input envoi message
- Templates WhatsApp (sélection rapide)
- Filtres (non lus, guests vs staff, OTA)

**Design** :
- Layout 2 colonnes (liste + conversation)
- Bulles messages (gauche = reçu, droite = envoyé)
- Timestamp, statut (envoyé, lu, erreur)
- Icônes WhatsApp, Airbnb, Booking

---

### 5️⃣ AGENT-TASKS

**Nom** : `Agent-Tasks`
**Mission** : Créer le système de gestion de tâches

**Backend** :
- Service : `srv-task` (port 4005)
- Path : `/Users/gouacht/sojori-production/apps/srv-task`

**APIs à intégrer** :
```typescript
// GET /api/v1/tasks - Liste tâches
// GET /api/v1/tasks/:id - Détail tâche
// POST /api/v1/tasks - Créer tâche
// PUT /api/v1/tasks/:id - Modifier tâche
// DELETE /api/v1/tasks/:id - Supprimer tâche
// PUT /api/v1/tasks/:id/status - Changer status
// GET /api/v1/tasks/by-assignee/:userId - Tâches par membre
// GET /api/v1/team - Liste membres équipe
```

**Référence** : AUCUNE (créer from scratch)

**Fichiers à créer** :
- `src/services/tasksService.ts`
- `src/types/tasks.types.ts`
- `src/pages/TasksListPage.tsx`
- `src/pages/TasksTeamPage.tsx`
- `src/pages/TasksPlanningPage.tsx`

**UI à créer** :
- **Liste** : Tableau tâches (titre, assigné, deadline, status, priorité)
- **Team** : Cartes membres équipe + leurs tâches
- **Planning** : Vue Kanban ou Timeline
- Modal création/édition tâche
- Filtres (status, assigné, propriété)

**Design** :
- Badges status (todo, in_progress, done)
- Badges priorité (low, medium, high, urgent)
- Avatar membres équipe
- Drag & drop pour Kanban (optionnel)

---

### 6️⃣ AGENT-ANNONCES

**Nom** : `Agent-Annonces`
**Mission** : Créer la gestion des annonces (listings)

**Backend** :
- Service : `srv-listing` (port 4001)
- Path : `/Users/gouacht/sojori-production/apps/srv-listing`

**APIs à intégrer** :
```typescript
// GET /api/v1/listings - Liste annonces
// GET /api/v1/listings/:id - Détail annonce
// POST /api/v1/listings - Créer annonce
// PUT /api/v1/listings/:id - Modifier annonce
// DELETE /api/v1/listings/:id - Supprimer annonce
// GET /api/v1/listings/:id/channels - Canaux connectés
// POST /api/v1/listings/:id/sync - Sync avec OTA
```

**Référence** : AUCUNE (créer from scratch)

**Fichiers à créer** :
- `src/services/listingsService.ts`
- `src/types/listings.types.ts`
- `src/pages/ListingsPage.tsx`
- `src/pages/ListingDetailPage.tsx`
- `src/pages/ChannelsPage.tsx`
- `src/pages/PricingPage.tsx`

**UI à créer** :
- **Listings** : Grille/Liste annonces (photo, nom, ville, status)
- **Détail** : Formulaire complet (infos, photos, équipements, règles)
- **Canaux** : Status sync Airbnb, Booking, Direct
- **Pricing** : Configuration tarifs (base, week-end, saisons)

**Design** :
- Grille cartes avec photos gradient
- Badges status (active, inactive, draft)
- Icônes canaux (Airbnb, Booking)
- Formulaire multi-étapes pour création

---

### 7️⃣ AGENT-DASHBOARD

**Nom** : `Agent-Dashboard`
**Mission** : Réutiliser le code de sojori-dashboard pour le Dashboard

**Backend** :
- Service : `srv-admin` (port 4002) + agrégation multi-services
- Path : `/Users/gouacht/sojori-production/apps/srv-admin`

**Référence** : **sojori-dashboard** ⚠️ IMPORTANT
- Path : `/Users/gouacht/sojori-dashboard`
- Fichiers à consulter :
  - `src/pages/DashboardPage.tsx` (ou équivalent)
  - `src/components/dashboard/*`
  - `src/services/dashboardService.ts`

**APIs à intégrer** :
```typescript
// GET /api/v1/dashboard/stats - Stats globales
// GET /api/v1/dashboard/revenue - Revenue
// GET /api/v1/dashboard/occupancy - Taux occupation
// GET /api/v1/dashboard/recent-bookings - Réservations récentes
// GET /api/v1/dashboard/alerts - Alertes importantes
```

**Approche** :
1. ✅ Lire le code de sojori-dashboard/DashboardPage
2. ✅ Copier la logique API calls
3. ✅ Adapter au nouveau design Aurora Soft Light
4. ✅ Réutiliser les composants (KPIs, charts, tables)

**Fichiers à créer** :
- `src/services/dashboardService.ts` (copier de sojori-dashboard)
- `src/types/dashboard.types.ts`
- `src/pages/DashboardPage.tsx` (adapter design)

**UI à créer** :
- KPIs (revenue, occupancy, bookings, avg rate)
- Charts (revenue trend, occupancy calendar)
- Recent bookings table
- Alerts/notifications
- Quick actions

---

### 8️⃣ AGENT-ANALYTICS

**Nom** : `Agent-Analytics`
**Mission** : Réutiliser le code de sojori-dashboard pour Analytics

**Backend** :
- Service : `srv-admin` (port 4002)
- Path : `/Users/gouacht/sojori-production/apps/srv-admin`

**Référence** : **sojori-dashboard** ⚠️ IMPORTANT
- Path : `/Users/gouacht/sojori-dashboard`
- Fichiers à consulter :
  - `src/pages/AnalyticsPage.tsx` (ou équivalent)
  - `src/components/analytics/*`
  - `src/services/analyticsService.ts`

**APIs à intégrer** :
```typescript
// GET /api/v1/analytics/revenue - Analyse revenue
// GET /api/v1/analytics/occupancy - Analyse occupation
// GET /api/v1/analytics/performance - Performance par propriété
// GET /api/v1/analytics/channels - Performance par canal
// GET /api/v1/analytics/guests - Analyse guests
// GET /api/v1/analytics/export - Export données
```

**Approche** :
1. ✅ Lire le code de sojori-dashboard/AnalyticsPage
2. ✅ Copier la logique API calls + charts
3. ✅ Adapter au nouveau design Aurora Soft Light
4. ✅ Réutiliser les composants charts (Line, Bar, Pie)

**Fichiers à créer** :
- `src/services/analyticsService.ts` (copier de sojori-dashboard)
- `src/types/analytics.types.ts`
- `src/pages/AnalyticsPage.tsx` (adapter design)

**UI à créer** :
- Charts revenue (line chart)
- Charts occupation (bar chart)
- Performance par propriété (table)
- Performance par canal (pie chart)
- Filtres période (7j, 30j, 3m, 1an, custom)
- Export CSV/PDF

---

## 📝 STRUCTURE FICHIERS TYPE

Pour **chaque agent**, créer cette structure :

```
src/
├── services/
│   └── [nom]Service.ts          # API calls
├── types/
│   └── [nom].types.ts            # TypeScript types
├── pages/
│   ├── [Nom]Page.tsx             # Page principale
│   └── [Nom]DetailPage.tsx       # Page détail (optionnel)
└── components/
    └── [nom]/                     # Composants spécifiques (optionnel)
        ├── [Nom]List.tsx
        ├── [Nom]Card.tsx
        └── [Nom]Modal.tsx
```

### Exemple pour Agent-Orchestration :

```typescript
// src/services/orchestrationService.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4008';

export const orchestrationService = {
  async getWorkflows() {
    const response = await axios.get(`${API_URL}/api/v1/workflows`);
    return response.data;
  },

  async getWorkflow(id: string) {
    const response = await axios.get(`${API_URL}/api/v1/workflows/${id}`);
    return response.data;
  },

  async createWorkflow(data: WorkflowInput) {
    const response = await axios.post(`${API_URL}/api/v1/workflows`, data);
    return response.data;
  },

  async executeWorkflow(id: string) {
    const response = await axios.post(`${API_URL}/api/v1/workflows/${id}/execute`);
    return response.data;
  },
};
```

```typescript
// src/types/orchestration.types.ts
export interface Workflow {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  steps: WorkflowStep[];
  lastExecution?: {
    date: string;
    status: 'success' | 'error';
    duration: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  type: 'action' | 'condition' | 'delay';
  config: Record<string, any>;
}

export interface WorkflowInput {
  name: string;
  description: string;
  steps: WorkflowStep[];
}
```

```typescript
// src/pages/OrchestrationPage.tsx
import React, { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader, Panel, Badge, btnPrimarySx, btnGhostSx, tokens as t } from '../components/dashboard/DashboardV2.components';
import { orchestrationService } from '../services/orchestrationService';
import type { Workflow } from '../types/orchestration.types';

export function OrchestrationPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await orchestrationService.getWorkflows();
      setWorkflows(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des workflows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await orchestrationService.executeWorkflow(id);
      loadWorkflows(); // Reload
    } catch (err) {
      alert('Erreur lors de l\'exécution');
    }
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration']}>
      <PageHeader
        title="Orchestration"
        desc="Automatisez vos workflows"
        actions={
          <Button sx={btnPrimarySx} onClick={() => alert('Créer workflow')}>
            ➕ Nouveau workflow
          </Button>
        }
      />

      {loading && <Typography>Chargement...</Typography>}
      {error && <Typography color="error">{error}</Typography>}

      {!loading && !error && (
        <Panel title="Workflows" desc={`${workflows.length} workflows configurés`}>
          <Stack spacing={1.5}>
            {workflows.map(w => (
              <Box key={w._id} sx={{ p: 2, border: `1px solid ${t.border}`, borderRadius: '12px' }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography sx={{ fontWeight: 700, flex: 1 }}>{w.name}</Typography>
                  <Badge variant={w.status === 'active' ? 'success' : 'default'}>
                    {w.status}
                  </Badge>
                  <Button size="small" sx={btnGhostSx} onClick={() => handleExecute(w._id)}>
                    ▶️ Exécuter
                  </Button>
                </Stack>
                <Typography sx={{ fontSize: 13, color: t.text3, mt: 0.5 }}>
                  {w.description}
                </Typography>
                {w.lastExecution && (
                  <Typography sx={{ fontSize: 11, color: t.text3, mt: 1, fontFamily: 'Geist Mono' }}>
                    Dernière exécution : {new Date(w.lastExecution.date).toLocaleString()} · {w.lastExecution.status}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Panel>
      )}
    </DashboardWrapper>
  );
}
```

---

## 🎯 CHECKLIST PAR AGENT

### Template checklist

Pour **chaque agent**, suivre cette checklist :

#### 1. Exploration Backend
- [ ] Lire `sojori-production/apps/srv-[nom]/src/routes/*.ts`
- [ ] Identifier toutes les routes API disponibles
- [ ] Noter les types de réponses (success/error format)
- [ ] Vérifier les paramètres requis

#### 2. Création Service
- [ ] Créer `src/services/[nom]Service.ts`
- [ ] Implémenter toutes les méthodes API
- [ ] Configurer axios avec base URL
- [ ] Gérer les erreurs (try/catch)

#### 3. Types TypeScript
- [ ] Créer `src/types/[nom].types.ts`
- [ ] Définir interfaces pour toutes les entités
- [ ] Définir types Input/Output
- [ ] Exporter tous les types

#### 4. Page React
- [ ] Créer `src/pages/[Nom]Page.tsx`
- [ ] Implémenter useState pour data, loading, error
- [ ] Implémenter useEffect pour fetch initial
- [ ] Utiliser composants Aurora Soft Light
- [ ] Gérer loading state (spinner)
- [ ] Gérer error state (message erreur)
- [ ] Afficher données avec design system

#### 5. Routing
- [ ] Ajouter route dans `src/App.tsx`
- [ ] Vérifier navigation depuis sidebar

#### 6. Tests
- [ ] Tester avec backend local (docker-compose)
- [ ] Vérifier affichage loading
- [ ] Vérifier affichage erreur
- [ ] Vérifier affichage données
- [ ] Tester toutes les actions (CRUD)

#### 7. Polish
- [ ] Ajouter animations (transitions)
- [ ] Optimiser performance (useMemo)
- [ ] Ajouter tooltips si nécessaire
- [ ] Vérifier responsive (mobile)

---

## 🚨 RÈGLES CRITIQUES

### Pour TOUS les agents

1. **Design System** :
   - ✅ TOUJOURS utiliser les tokens Aurora Soft Light
   - ✅ TOUJOURS utiliser les composants de DashboardV2.components
   - ❌ NE JAMAIS créer de nouveaux tokens
   - ❌ NE JAMAIS utiliser Material-UI default colors

2. **API Calls** :
   - ✅ TOUJOURS gérer loading state
   - ✅ TOUJOURS gérer error state
   - ✅ TOUJOURS utiliser try/catch
   - ✅ TOUJOURS vérifier le format de réponse backend

3. **TypeScript** :
   - ✅ TOUJOURS typer toutes les variables
   - ✅ TOUJOURS créer des interfaces
   - ❌ NE JAMAIS utiliser `any`

4. **Référence sojori-dashboard** (Agents Dashboard + Analytics uniquement) :
   - ✅ LIRE le code existant
   - ✅ COPIER la logique API
   - ✅ ADAPTER le design Aurora Soft Light
   - ❌ NE PAS copier le design (ancien)

5. **Backend** :
   - ✅ TOUJOURS vérifier que le backend tourne (docker-compose)
   - ✅ TOUJOURS consulter les routes dans sojori-production
   - ❌ NE JAMAIS deviner le format API

---

## 🔧 COMMANDES UTILES

### Démarrer backend local

```bash
# Dans sojori-production
cd /Users/gouacht/sojori-production
docker-compose -f docker-compose-v2.yml up -d

# Vérifier status
docker-compose -f docker-compose-v2.yml ps

# Logs d'un service
docker-compose -f docker-compose-v2.yml logs -f srv-orchestrator
```

### Démarrer frontend

```bash
# Dans Sojori-orchestrator
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4174

# Ouvrir navigateur
open http://localhost:4174
```

### Tester une API

```bash
# Health check
curl http://localhost:4008/health

# Test route
curl http://localhost:4008/api/v1/workflows
```

---

## 📊 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Agent-Dashboard** (réutiliser code) → Priorité HAUTE
2. **Agent-Analytics** (réutiliser code) → Priorité HAUTE
3. **Agent-Calendrier** (déjà UI créée) → Priorité HAUTE
4. **Agent-Reservations** (déjà UI créée) → Priorité HAUTE
5. **Agent-Orchestration** (nouveau) → Priorité MOYENNE
6. **Agent-Tasks** (nouveau) → Priorité MOYENNE
7. **Agent-Annonces** (nouveau) → Priorité MOYENNE
8. **Agent-Inbox** (nouveau, complexe) → Priorité BASSE

---

## 🎯 RÉSULTAT ATTENDU

**Après le travail de tous les agents** :

- ✅ Toutes les pages connectées aux APIs backend
- ✅ Design Aurora Soft Light cohérent partout
- ✅ Loading + Error states partout
- ✅ Dashboard + Analytics avec vraies données
- ✅ Calendrier avec vraies disponibilités/prix
- ✅ Réservations avec vraies données
- ✅ Orchestration fonctionnelle
- ✅ Tasks fonctionnelles
- ✅ Annonces fonctionnelles
- ✅ Inbox fonctionnelle
- ✅ Application production-ready 🚀

---

**Prêt à lancer les agents ?** 🤖
