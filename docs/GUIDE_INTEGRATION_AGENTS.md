# 🚀 Guide d'Intégration pour Agents - Sojori Orchestrator

**Version** : 1.0
**Date** : 14 Mai 2026
**Projet** : Sojori-orchestrator (Dashboard V2)

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture actuelle](#architecture-actuelle)
3. [Stratégie d'intégration](#stratégie-dintégration)
4. [Assignation des agents](#assignation-des-agents)
5. [Guide technique par agent](#guide-technique-par-agent)
6. [Authentification](#authentification)
7. [Standards de code](#standards-de-code)
8. [Checklist avant PR](#checklist-avant-pr)

---

## 🎯 Vue d'ensemble

### Contexte
Refonte complète du dashboard Sojori en React + TypeScript + Vite + Material-UI v9.

**Ancien dashboard** : `/Users/gouacht/sojori-dashboard` (React CRA + Material-UI v5)
**Nouveau dashboard** : `/Users/gouacht/Sojori-orchestrator` (Vite + MUI v9)

### Objectif
Intégrer **toutes les pages** du nouveau dashboard en parallèle, avec données mock en attendant l'authentification.

---

## 🏗️ Architecture Actuelle

### Stack Technique
- **Framework** : React 18 + Vite 8
- **Langage** : TypeScript
- **UI** : Material-UI v9 (`@mui/material`)
- **Routing** : React Router v6
- **State** : useState (local state pour l'instant)
- **Style** : `sx` props (pas de Tailwind, pas de CSS-in-JS global)

### Structure Projet
```
/Users/gouacht/Sojori-orchestrator/
├── src/
│   ├── App.tsx                 # Routing principal
│   ├── components/
│   │   ├── DashboardWrapper.tsx         # Layout avec sidebar principale
│   │   └── dashboard/
│   │       └── DashboardV2.components.jsx  # 30+ composants réutilisables
│   └── pages/                  # Toutes les pages (24 fichiers)
│       ├── ReservationsPage.tsx         ✅ Complet
│       ├── CalendarPage.tsx             ✅ Complet
│       ├── TasksPage.tsx                ✅ Complet
│       ├── OrchestrationPage.tsx        ✅ Complet
│       ├── CommsPage.tsx                ✅ Complet
│       ├── ListingsPage.tsx             ✅ Complet
│       ├── NewListingFormPage.tsx       ✅ Complet (22 onglets)
│       ├── InventoryPage.tsx            ⚠️ STUB
│       ├── PricingPage.tsx              ⚠️ STUB
│       ├── ChannelsPage.tsx             ⚠️ STUB
│       ├── ClientsPage.tsx              ⚠️ STUB
│       ├── ReviewsPage.tsx              ⚠️ STUB
│       ├── RequestsPage.tsx             ⚠️ STUB
│       ├── TeamPage.tsx                 ⚠️ STUB
│       ├── PlanningPage.tsx             ⚠️ STUB
│       ├── StaffWhatsAppPage.tsx        ⚠️ STUB
│       ├── OTAMessagesPage.tsx          ⚠️ STUB
│       └── ... (autres)
└── docs/                       # Documentation
    ├── AUDIT_NAVIGATION_ACTUELLE.md
    ├── NOUVEAU_SCHEMA_NAVIGATION.md
    └── Dashboard V2 - Handoff Claude Code.md
```

### Composants Disponibles

**Dans `DashboardV2.components.jsx`** (30+ composants prêts à utiliser) :

**Layout** :
- `DashboardWrapper` - Layout principal avec sidebar + topbar
- `Panel` - Card section avec header optionnel
- `PageHeader` - Header de page

**Data Display** :
- `DataTable` - Table sortable/selectable avec actions au hover ⭐ **CORE**
- `Badge` - Variants : success/warning/error/info/ai/gold/neutral
- `SourcePill` - Pills Airbnb/Booking/Vrbo/Direct avec logos
- `GuestCell`, `ListingCell`, `Revenue` - Cellules pré-stylées

**Stats** :
- `StatsRow` - Grid 4 colonnes responsive
- `StatCard` - Card avec icône, valeur, label, trend

**Spécialisés** :
- `OrchestrationTimeline` + `TLEvent` - Timeline verticale
- `CalendarGantt` + `CalBooking` - Calendar multi-property
- `KanbanBoard` + `KanbanColumn` + `TaskCard` - Kanban
- `ChatLayout` + `ConversationList` + `ChatThread` - Messaging UI

**AI** :
- `AIBanner` - Banner contextuel violet/or
- `AIChip` - Suggestion chip
- `AICard` - Card avec GPT-4 badge

---

## 🎯 Stratégie d'Intégration

### Phase 1 : Développement en Parallèle (MAINTENANT)

**Approche** : **Développement MOCK en parallèle** + **1 agent auth**

```
┌─────────────────────────────────────────────────────────┐
│  AGENT 1: Inventaire + Pricing          (mode MOCK)    │
│  AGENT 2: Channels + Clients            (mode MOCK)    │
│  AGENT 3: Team + Planning + Staff WA    (mode MOCK)    │
│  AGENT 4: Reviews + Requests + OTA      (mode MOCK)    │
│  AGENT 5: AUTHENTIFICATION              (backend)      │
└─────────────────────────────────────────────────────────┘
```

**Avantages** :
- ✅ Pas de blocage (agents 1-4 travaillent sans attendre)
- ✅ Agent 5 intègre auth en parallèle
- ✅ Merge progressif facile

**Mode MOCK** : Utiliser des données en dur (comme `LISTING_DATA` dans `NewListingFormPage.tsx`)

### Phase 2 : Connexion Backend (APRÈS Phase 1)

Une fois l'auth intégrée :
1. Remplacer les données MOCK par les vrais appels API
2. Utiliser les mêmes endpoints que l'ancien dashboard
3. Tester page par page

---

## 👥 Assignation des Agents

### **Agent 1 : Inventaire + Pricing** 🔴 HAUTE PRIORITÉ

**Pages à créer** :
1. `/inventory` - **InventoryPage.tsx**
   - Calendrier par listing (vue disponibilités)
   - Prix par nuit (tarif de base + dynamic pricing)
   - Restrictions (min nights, check-in/out rules)
   - Actions : Bloquer dates, Modifier prix, Sync canaux

2. `/pricing` - **PricingPage.tsx**
   - Calendrier avec prix suggérés vs prix actuels
   - Règles de pricing (weekend, événements, saisonnalité)
   - Comparaison avec concurrence (mockup)

**Effort estimé** : 4-6h
**Composants à utiliser** : `CalendarGantt`, `DataTable`, `StatCard`, `Panel`
**Données MOCK** : Créer objet `INVENTORY_DATA` et `PRICING_DATA`

---

### **Agent 2 : Channels + Clients** 🟠 MOYENNE PRIORITÉ

**Pages à créer** :
1. `/channels` - **ChannelsPage.tsx**
   - Liste des connexions : Airbnb, Booking.com, VRBO, etc.
   - Statut sync (dernière sync, erreurs)
   - Mapping listings ↔ annonces OTA
   - Actions : Reconnecter, Sync manuel, Gérer mapping

2. `/clients` - **ClientsPage.tsx**
   - Liste tous les voyageurs (CRM)
   - Infos : Nb séjours, Revenu total, Note moyenne, VIP status
   - Filtres : Pays, Nb séjours, Dernière visite
   - Actions : Voir historique, Envoyer message

**Effort estimé** : 3-5h
**Composants à utiliser** : `DataTable`, `Badge`, `SourcePill`, `Panel`
**Données MOCK** : Créer `CHANNELS_DATA` et `CLIENTS_DATA`

---

### **Agent 3 : Team + Planning + Staff WhatsApp** 🟡 MOYENNE PRIORITÉ

**Pages à créer** :
1. `/operations/team` - **TeamPage.tsx**
   - Liste staff avec rôles (femme de ménage, maintenance, conciergerie)
   - Disponibilités
   - Stats : Tâches complétées, Moyenne qualité, Délai moyen
   - Actions : Ajouter membre, Modifier, Désactiver

2. `/operations/planning` - **PlanningPage.tsx**
   - Calendrier staff (qui travaille quand)
   - Vue par semaine/mois
   - Affectations tâches par personne
   - Drag & drop pour réassigner (optionnel phase 1)

3. `/communications/staff` - **StaffWhatsAppPage.tsx**
   - Conversations équipe interne
   - Broadcast messages (envoyer à toute l'équipe)
   - Groupes (par rôle: ménages, maintenance)

**Effort estimé** : 5-7h
**Composants à utiliser** : `DataTable`, `CalendarGantt`, `ChatLayout`, `KanbanBoard`
**Données MOCK** : Créer `TEAM_DATA`, `PLANNING_DATA`, `STAFF_MESSAGES_DATA`

---

### **Agent 4 : Reviews + Requests + OTA Messages** 🟢 BASSE PRIORITÉ

**Pages à créer** :
1. `/reviews` - **ReviewsPage.tsx**
   - Tous les avis Airbnb/Booking
   - Moyenne par listing
   - Filtres : Note, Date, OTA
   - Réponses à donner (pending review response)

2. `/requests` - **RequestsPage.tsx**
   - Demandes guests pendant séjour (extra towels, early check-in, etc.)
   - Statut : Nouveau, En cours, Résolu
   - Actions : Assigner staff, Marquer résolu, Message guest

3. `/communications/ota` - **OTAMessagesPage.tsx**
   - Unified inbox : messages Airbnb + Booking.com
   - Statut : Non lu, En attente réponse, Résolu
   - Action : Répondre (copié dans OTA)

**Effort estimé** : 4-6h
**Composants à utiliser** : `DataTable`, `Badge`, `ChatLayout`, `Panel`
**Données MOCK** : Créer `REVIEWS_DATA`, `REQUESTS_DATA`, `OTA_MESSAGES_DATA`

---

### **Agent 5 : AUTHENTIFICATION** 🔴 CRITIQUE (parallèle)

**Mission** : Intégrer l'authentification de l'ancien dashboard

**Tâches** :
1. **Analyser l'ancien dashboard** (`/Users/gouacht/sojori-dashboard`)
   - Trouver le système d'auth actuel (Redux, Context, hooks)
   - Identifier les endpoints API d'auth
   - Comprendre le flow login/logout/refresh token

2. **Copier le système d'auth** dans Sojori-orchestrator
   - Créer `src/contexts/AuthContext.tsx`
   - Créer `src/services/authService.ts`
   - Créer `src/hooks/useAuth.ts`

3. **Créer les pages d'auth**
   - `/login` - **LoginPage.tsx**
   - `/logout` - **LogoutPage.tsx**
   - Protéger les routes (wrapper `ProtectedRoute`)

4. **Tester le flow complet**
   - Login → Dashboard → Pages protégées
   - Token refresh automatique
   - Logout → Redirection login

**Effort estimé** : 6-8h
**Prérequis** : Lire le code de l'ancien dashboard
**Données** : Backend production (pas de mock)

---

## 📖 Guide Technique par Agent

### Template de Page Standard

```tsx
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  DataTable,
  StatCard,
  StatsRow,
  Panel,
  Badge,
  btnPrimarySx,
  tokens as t
} from '../components/dashboard/DashboardV2.components';

// ─── Mock Data ─────────────────────────────────────────
const MOCK_DATA = {
  // Vos données mock ici
  items: [
    { id: 1, name: 'Item 1', status: 'active' },
    { id: 2, name: 'Item 2', status: 'pending' },
  ],
  stats: {
    total: 42,
    active: 23,
    pending: 19,
  }
};

// ─── Main Component ─────────────────────────────────────
export function YourPage() {
  const [selected, setSelected] = useState<number[]>([]);

  return (
    <DashboardWrapper breadcrumb={['Section', 'Votre Page']}>
      {/* Stats */}
      <StatsRow sx={{ mb: 3 }}>
        <StatCard icon="📊" label="Total" value={MOCK_DATA.stats.total} />
        <StatCard icon="✅" label="Actifs" value={MOCK_DATA.stats.active} trend="+12%" />
        <StatCard icon="⏳" label="En attente" value={MOCK_DATA.stats.pending} />
      </StatsRow>

      {/* Table ou autre contenu */}
      <Panel>
        <DataTable
          columns={[
            { key: 'name', label: 'Nom' },
            { key: 'status', label: 'Statut', render: (row) => (
              <Badge variant={row.status === 'active' ? 'success' : 'warning'}>
                {row.status}
              </Badge>
            )},
          ]}
          rows={MOCK_DATA.items}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
        />
      </Panel>
    </DashboardWrapper>
  );
}
```

### Étapes pour créer une page

1. **Créer le fichier** : `src/pages/YourPage.tsx`
2. **Copier le template** ci-dessus
3. **Créer les données MOCK** (objet `MOCK_DATA`)
4. **Utiliser les composants** de `DashboardV2.components.jsx`
5. **Ajouter la route** dans `src/App.tsx`
6. **Tester** : http://localhost:4000/your-route

### Ajouter une route

Dans `src/App.tsx`, ajouter :

```tsx
import { YourPage } from './pages/YourPage';

// Dans le <Routes>
<Route path="/your-route" element={<YourPage />} />
```

---

## 🔐 Authentification (Agent 5)

### Analyse de l'ancien dashboard

**Étape 1** : Explorer `/Users/gouacht/sojori-dashboard/src/`

Chercher :
- `AuthContext`, `AuthProvider`, `useAuth`
- `authService`, `api.ts`, `axiosInstance`
- `ProtectedRoute`, `RequireAuth`
- Endpoints : `/api/login`, `/api/logout`, `/api/refresh`

**Étape 2** : Copier dans Sojori-orchestrator

```
src/
├── contexts/
│   └── AuthContext.tsx       # Context React pour auth
├── services/
│   ├── authService.ts        # Appels API login/logout
│   └── apiClient.ts          # Axios instance avec token
├── hooks/
│   └── useAuth.ts            # Hook personnalisé
├── components/
│   └── ProtectedRoute.tsx    # Wrapper pour routes protégées
└── pages/
    ├── LoginPage.tsx         # Page de login
    └── LogoutPage.tsx        # Page de logout
```

**Étape 3** : Protéger les routes

```tsx
// Dans App.tsx
import { ProtectedRoute } from './components/ProtectedRoute';

<Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
<Route path="/login" element={<LoginPage />} />
```

**Étape 4** : Utiliser dans les pages

```tsx
import { useAuth } from '../hooks/useAuth';

export function YourPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <div>Welcome {user.name}</div>;
}
```

---

## 📏 Standards de Code

### TypeScript

- ✅ **Toujours typer** les props, states, retours de fonction
- ✅ Utiliser `interface` pour les props de composants
- ✅ Utiliser `type` pour les unions, intersections
- ❌ Éviter `any` (utiliser `unknown` si nécessaire)

```tsx
interface YourPageProps {
  listingId: string;
  onSave?: (data: FormData) => void;
}

export function YourPage({ listingId, onSave }: YourPageProps) {
  // ...
}
```

### Material-UI

- ✅ **Toujours utiliser `sx` props** (pas de CSS-in-JS global)
- ✅ Utiliser les `tokens` de `DashboardV2.components.jsx`
- ❌ Pas de Tailwind, pas de `className` personnalisé

```tsx
import { tokens as t } from '../components/dashboard/DashboardV2.components';

<Box sx={{
  bgcolor: t.bg1,
  color: t.text,
  borderRadius: '12px',
  p: 3,
}}>
  Contenu
</Box>
```

### Mock Data

- ✅ Créer un objet `MOCK_DATA` en haut du fichier
- ✅ Structurer les données comme elles viendront du backend
- ✅ Ajouter des commentaires expliquant la structure

```tsx
// ─── Mock Data ─────────────────────────────────────────
const MOCK_DATA = {
  // Liste des clients (viendra de GET /api/clients)
  clients: [
    {
      id: 'CL-001',
      name: 'Ahmed Benali',
      email: 'ahmed@example.com',
      totalBookings: 5,
      totalRevenue: 2450,
      vipStatus: true,
      country: 'MA',
    },
    // ...
  ],
  // Stats (viendra de GET /api/clients/stats)
  stats: {
    total: 142,
    vip: 12,
    avgRevenue: 850,
  }
};
```

### Nommage

- **Fichiers** : PascalCase pour composants (`YourPage.tsx`)
- **Composants** : PascalCase (`function YourPage()`)
- **Fonctions** : camelCase (`handleSubmit`)
- **Constantes** : UPPER_SNAKE_CASE (`MOCK_DATA`)

---

## ✅ Checklist Avant PR

### Code Quality

- [ ] ✅ TypeScript sans erreurs (`pnpm type-check`)
- [ ] ✅ Pas de `any` (ou justifié)
- [ ] ✅ Toutes les props typées
- [ ] ✅ Pas de warnings dans la console navigateur (sauf MUI warnings connus)

### Données MOCK

- [ ] ✅ Objet `MOCK_DATA` créé et commenté
- [ ] ✅ Structure réaliste (comme viendra du backend)
- [ ] ✅ Au moins 5-10 entrées pour tester pagination/filtres

### UI/UX

- [ ] ✅ Page utilise `DashboardWrapper`
- [ ] ✅ Breadcrumb correct
- [ ] ✅ Stats visibles (si applicable)
- [ ] ✅ Actions claires (boutons, filtres)
- [ ] ✅ Responsive (tester mobile)

### Navigation

- [ ] ✅ Route ajoutée dans `App.tsx`
- [ ] ✅ Lien dans la sidebar (si nécessaire)
- [ ] ✅ Navigation fonctionne (pas de 404)

### Tests Manuels

- [ ] ✅ Page s'affiche sans erreur
- [ ] ✅ Sidebar principale visible
- [ ] ✅ Interactions fonctionnent (clics, filtres)
- [ ] ✅ Hot reload fonctionne après modifications

---

## 🚀 Commandes Utiles

### Développement

```bash
# Démarrer le serveur (port 4000)
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4000

# Type-check
pnpm type-check

# Build
pnpm build
```

### Git Workflow

```bash
# Créer une branche pour votre agent
git checkout -b agent1-inventory-pricing

# Commit réguliers
git add .
git commit -m "feat(inventory): add InventoryPage with calendar view"

# Push
git push origin agent1-inventory-pricing

# Créer une PR sur GitHub
```

---

## 📞 Ressources

### Documentation

- **Handoff Claude Design** : `docs/Dashboard V2 - Handoff Claude Code.md`
- **Navigation** : `docs/NOUVEAU_SCHEMA_NAVIGATION.md`
- **Audit** : `docs/AUDIT_NAVIGATION_ACTUELLE.md`

### Composants

- **Tous les composants** : Voir `src/components/dashboard/DashboardV2.components.jsx`
- **Exemples d'utilisation** : Voir pages existantes (`ReservationsPage.tsx`, `TasksPage.tsx`, etc.)

### Ancien Dashboard (référence)

- **Projet** : `/Users/gouacht/sojori-dashboard`
- **Auth** : Chercher dans `src/contexts/` et `src/services/`
- **API** : Voir `src/services/api.ts` ou équivalent

---

## 🎯 Timeline Estimée

| Phase | Durée | Description |
|-------|-------|-------------|
| **Agents 1-4** (parallèle) | 4-7h chacun | Création pages MOCK |
| **Agent 5** (parallèle) | 6-8h | Intégration auth |
| **Phase 1 Total** | **2-3 jours** | Toutes pages + auth |
| **Phase 2** | 2-3h par page | Connexion backend |
| **Phase 2 Total** | **1-2 jours** | Backend connecté |
| **TOTAL** | **3-5 jours** | Dashboard complet |

---

## 🚨 Important

### ⚠️ NE PAS MODIFIER

- ❌ `DashboardV2.components.jsx` (sauf bug critique)
- ❌ `DashboardWrapper.tsx` (sauf bug critique)
- ❌ Pages déjà complètes (`ReservationsPage`, `TasksPage`, etc.)

### ✅ À CRÉER

- ✅ Nouvelles pages (les STUB)
- ✅ Nouveaux composants spécifiques (dans `src/components/`)
- ✅ Nouveaux services (dans `src/services/`)

---

**Dernière mise à jour** : 14 Mai 2026, 09:35
**Serveur** : http://localhost:4000
**Contact** : Claude Code (Sonnet 4.5)
