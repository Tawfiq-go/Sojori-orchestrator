# Sojori Dashboard V2 — Handoff Claude Code

> Pour : new React + Vite project OU `sojori-dashboard` existant
> Stack : React 18 + Material-UI v5 (sx props)

---

## 📦 Fichiers livrés

| Fichier | Quoi |
|---|---|
| `DashboardV2.components.jsx` | **Tous les composants** réutilisables avec `sx` props (1 fichier, ~30 composants) |
| `DashboardV2.examples.jsx` | **6 exemples de pages prêts à utiliser** (Réservations, Orchestration, Calendrier, Tâches, Comms, Annonces) |
| `Dashboard V2 Owner.html` | Prototype visuel cliquable de référence |

---

## 🚀 Quick start

### 1. Nouveau projet React + Vite
```bash
npm create vite@latest sojori-dashboard-v2 -- --template react
cd sojori-dashboard-v2
npm install @mui/material @emotion/react @emotion/styled
npm install -D @types/react
```

### 2. Importer les fonts Geist
Dans `index.html` ou `App.jsx` :
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### 3. Copier les 2 fichiers
```
src/dashboard/
  ├── DashboardV2.components.jsx
  └── DashboardV2.examples.jsx
```

### 4. Utiliser
```jsx
import { ReservationsPage } from './dashboard/DashboardV2.examples';

function App() {
  return <ReservationsPage />;
}
```

---

## 🧩 Composants exportés (de `DashboardV2.components.jsx`)

### Layout
- **`DashboardLayout`** — root grid sidebar + topbar + main
- **`AppSidebar`** — nav verticale avec groupes + AI shortcut + user
- **`TopBar`** — breadcrumb + search global + icon buttons

### Data display
- **`DataTable`** — table sortable/selectable avec row actions au hover ⭐ **CORE**
- **`Badge`** — variants : success / warning / error / info / ai / gold / neutral
- **`SourcePill`** — pill Airbnb/Booking/Vrbo/Direct avec logos
- **`GuestCell`**, **`ListingCell`**, **`Revenue`** — cellules pré-stylées
- **`Checkbox`**, **`Pagination`**

### Stats
- **`StatsRow`** — grid 4 colonnes responsive
- **`StatCard`** — card avec icône, valeur, label, trend

### Filters & toggles
- **`FilterBar`** — wrapper flex pour filter chips
- **`FilterChip`** — chip filtre (active/dropdown)
- **`ViewToggle`** — segmented control (Table/Cards/etc.)

### Spécialisés
- **`OrchestrationTimeline`** + **`TLEvent`** + **`TLDayLabel`** — timeline verticale events
- **`CalendarGantt`** + **`CalBooking`** — calendar multi-property gantt
- **`KanbanBoard`** + **`KanbanColumn`** + **`TaskCard`** — kanban drag-ready
- **`ChatLayout`** + **`ConversationList`** + **`ChatThread`** + **`ChatAside`** — messaging UI
- **`ListingsGrid`** + **`ListingCard`** — cards property

### AI
- **`AIBanner`** — banner contextuel violet/or
- **`AIChip`** — suggestion chip (utilisé dans ChatThread)
- **`AICard`** — card with GPT-4 badge

### Buttons (sx props prêts)
- **`btnPrimarySx`** — gold gradient
- **`btnGhostSx`** — outline
- **`btnAiSx`** — purple gradient
- **`btnSmSx`** — modifier pour version small

### Generic
- **`Panel`** — card section avec head optionnel
- **`tokens`** — toutes les couleurs/spacings exportés

---

## 🎨 Design tokens (exportés)

```js
import { tokens } from './DashboardV2.components';

tokens.primary      // #e6b022 (gold signature)
tokens.primaryDeep  // #b8881a
tokens.primarySoft  // #f4cf5e
tokens.primaryTint  // rgba(230,176,34,0.08)

tokens.ai           // #8b5cf6 (purple AI)
tokens.aiTint       // rgba(139,92,246,0.08)

tokens.success      // #10b981
tokens.warning      // #f59e0b
tokens.error        // #ef4444
tokens.info         // #06b6d4

tokens.bg0          // #fbfaf6 (warm cream background)
tokens.bg1          // #ffffff
tokens.bg2          // #f5f3ec
tokens.bg3          // #ebe7da

tokens.text         // #1a1408 (warm black)
tokens.text2        // #4a4234
tokens.text3        // #8a8170
tokens.text4        // #b8b09b

tokens.border       // rgba(26,20,8,0.08)
tokens.borderStrong // rgba(26,20,8,0.14)

tokens.sidebarW     // 248
tokens.topbarH      // 56
```

---

## 📐 Pages à intégrer (Phase 1 critical)

D'après ton brief, voici l'ordre conseillé d'intégration :

| # | Page | Component d'entrée | Effort |
|---|---|---|---|
| 1 | **Réservations · Liste** | `ReservationsPage` | ⚡ Direct copy |
| 2 | **Calendrier** | `CalendarPage` | ⚡ Direct copy |
| 3 | **Tâches · Kanban** | `TasksPage` | ⚡ Direct copy |
| 4 | **Orchestration · Chronologie** | `OrchestrationPage` | ⚡ Direct copy |
| 5 | **Communications · WhatsApp** | `CommsPage` | ⚡ Direct copy |
| 6 | **Annonces · Grid** | `ListingsPage` | ⚡ Direct copy |
| 7 | Réservations · Détail (3 cols) | À adapter avec `Panel` + `Stack` |
| 8 | Tarification dynamique | Combiner `DataTable` + chart (à venir) |
| 9 | Canaux | `Panel` + `Badge` (status synced/pending) |
| 10 | Clients | `DataTable` (réutiliser pattern) |

---

## 🔧 Intégration avec ton state

Les composants sont **fully controlled** — passe tes data + handlers en props.

### Exemple — connecter au state global (Redux/Zustand) :
```jsx
function ReservationsPage() {
  const { reservations, loading } = useReservations(); // ton hook
  const [selected, setSelected] = useState([]);

  return (
    <DashboardLayout activePath="reservations" onNavigate={(path) => router.push(`/${path}`)}>
      <DataTable
        columns={columns}
        rows={reservations}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
      />
    </DashboardLayout>
  );
}
```

### Routing (React Router v6)
```jsx
const NAV_TO_ROUTE = {
  'reservations': '/reservations',
  'orchestration/timeline': '/orchestration/timeline',
  'calendar': '/calendar',
  // ...
};

<DashboardLayout
  activePath={location.pathname.replace('/', '')}
  onNavigate={(path) => navigate(NAV_TO_ROUTE[path] || `/${path}`)}
/>
```

---

## 🎯 Customizations probables

### 1. Remplacer les emoji icons par lucide-react
```bash
npm install lucide-react
```
```jsx
import { Home, Calendar, Tag, CheckSquare, MessageSquare } from 'lucide-react';

// Dans NAV (DashboardV2.components.jsx), remplace `icon: '🏠'` par `icon: <Home size={14} />`
```

### 2. Remplacer Geist par Inter (si déjà installé)
Dans `tokens` → remplace `Geist` par `Inter` partout.

### 3. Connecter le search global ⌘K
```jsx
<TopBar
  breadcrumb={['Pilotage', 'Réservations']}
  onSearch={() => setCommandPaletteOpen(true)} // ouvre cmdk
/>
```

### 4. AI Chat panel (sidebar bottom)
Le bouton "Demander à l'IA…" ouvre un modal. À implémenter :
```jsx
// Dans AppSidebar — wrap le bloc .side-ai dans un onClick
<Box onClick={() => setAIOpen(true)} sx={{ cursor: 'pointer' }}>
  {/* ai shortcut block */}
</Box>
```

---

## ✅ Checklist intégration

- [ ] `npm install @mui/material @emotion/react @emotion/styled`
- [ ] Fonts Geist + Geist Mono importées
- [ ] Copy `DashboardV2.components.jsx` + `DashboardV2.examples.jsx`
- [ ] Première page (Réservations) qui s'affiche
- [ ] Branchage `activePath` + `onNavigate` sur React Router
- [ ] Branchage data réelle dans `DataTable` (remplacer les mocks)
- [ ] Customization icons (lucide-react)
- [ ] Search ⌘K connecté
- [ ] AI chat panel branché (provider GPT-4)
- [ ] Build prod sans warning (`npm run build`)
- [ ] Lighthouse ≥ 90 sur tous les axes

---

## 🚨 Pièges à éviter

- ❌ **Pas de Tailwind** — tout est `sx` props MUI pour rester cohérent avec ton code existant
- ❌ **Pas de re-style** des MUI components au global — seulement via `sx` ciblé pour ne pas casser le reste de ton app
- ❌ **Geist doit être chargé** avant render — sinon fallback system-ui pas joli
- ❌ **L'`overflow-x: hidden`** est important sur html/body pour empêcher le scroll horizontal mobile

---

## 📦 Format livraison phase 2 (à venir)

Si tu veux la suite (pages secondaires + charts) :
- Charts : Line / Bar / Donut / Area (utiliser **Recharts** + tokens)
- Pages : Détail réservation 3 cols, Tarification dynamique avec graph, Canaux, Clients, Avis, Demandes

Dis-moi quand tu es prêt — je préparerai pareil : composants + examples + handoff.

---

## 🙏 Merci !

Si quelque chose ne va pas dans les composants ou tu as besoin d'un cas non couvert, dis-moi. Le code est conçu pour être **forkable** — n'hésite pas à adapter à ton style.

🔥 **Same quality as Listing Form V2** — promis !
