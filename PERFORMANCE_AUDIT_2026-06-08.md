# 🔍 Audit de Performance — Sojori Orchestrator

**Date:** 2026-06-08
**Contexte:** Migration de sojori-dashboard (CRA) vers Sojori-orchestrator (Vite)
**Pages problématiques:** `/tasks`, `/reservations/:id`

---

## 📊 Diagnostic

### Problèmes Identifiés

#### 1. **Bundle JavaScript Énorme (1MB+)**
```
1.0M  dist/assets/index-DEf-BVpb.js        ← Bundle principal MASSIF
456K  dist/assets/SettingsHubPage-DrSPygMI.js
320K  dist/assets/ListingFormV2-W5tEzKlx.js
296K  dist/assets/DashboardV2.components-B7sgkdeZ.js
```

**Impact:** Le bundle principal de 1MB doit être téléchargé et parsé avant que l'application ne démarre.

#### 2. **Absence de Code Splitting Optimisé**
- **61 lazy imports** dans App.tsx, mais beaucoup de composants lourds chargés immédiatement
- Pas de code splitting pour les bibliothèques tierces (MUI, Recharts, etc.)
- Absence de `optimizeDeps` complet dans vite.config.ts

#### 3. **Architecture Monolithique**
- **1,021 fichiers source** (tsx/ts/jsx/js)
- **603MB** de node_modules
- Pages très volumineuses :
  - `TasksListPage.tsx`: **2,155 lignes** avec 47+ hooks React
  - `ReservationsPage.tsx`: 1,071 lignes
  - Aucune utilisation de `React.memo()` pour optimiser le re-rendering

#### 4. **Pas de Memoization**
- 0 occurrence de `React.memo()` dans `/src/pages`
- Les composants lourds se re-rendent à chaque changement d'état
- Pas de `useMemo`/`useCallback` stratégiques sur les données volumineuses

#### 5. **Configuration Vite Non Optimisée**
```ts
// vite.config.ts actuel
optimizeDeps: {
  include: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  // ❌ Manque MUI, React Query, Recharts, etc.
}
```

#### 6. **Dépendances Redondantes**
- React 19.2.6 (très récent, possibles bugs de perf)
- TypeScript 6.0.2 (version expérimentale)
- Multiples versions de date libraries (moment + date-fns + date-fns-tz)
- @tanstack/react-router + react-router-dom (doublon)

---

## 🎯 Recommandations Prioritaires

### 🔥 **Quick Wins (Impact Immédiat)**

#### 1. Optimiser la Configuration Vite

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],

  optimizeDeps: {
    include: [
      // Core dependencies
      'react', 'react-dom', 'react-router-dom',
      // UI Libraries
      '@mui/material', '@mui/icons-material', '@mui/x-date-pickers',
      '@emotion/react', '@emotion/styled',
      // Data Libraries
      '@tanstack/react-query', 'axios',
      // Drag & Drop
      '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities',
      // Charts
      'recharts',
      // Utilities
      'lodash', 'moment', 'date-fns', 'zustand',
    ],
    // Force pré-bundling immédiat
    force: true,
  },

  build: {
    // Code splitting agressif
    rollupOptions: {
      output: {
        manualChunks: {
          // Séparer les grosses libs
          'mui-core': ['@mui/material', '@mui/icons-material'],
          'mui-pickers': ['@mui/x-date-pickers'],
          'charts': ['recharts'],
          'utils': ['lodash', 'moment', 'date-fns', 'date-fns-tz'],
          'forms': ['formik', 'yup'],
          'data': ['@tanstack/react-query', 'zustand'],
        },
      },
    },
    // Réduire la taille des chunks
    chunkSizeWarningLimit: 600,
    // Minification agressive
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  server: {
    // Pré-transformations plus rapides
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/pages/DashboardPage.tsx',
        './src/pages/TasksListPage.tsx',
        './src/pages/ReservationsPage.tsx',
      ],
    },
  },
})
```

#### 2. Ajouter React.memo() sur Composants Lourds

```tsx
// src/pages/TasksListPage.tsx
import { memo } from 'react';

// Mémoiser les composants de liste
const TaskRow = memo(({ task, onUpdate }) => {
  // ...
}, (prev, next) => {
  // Comparaison personnalisée
  return prev.task._id === next.task._id &&
         prev.task.status === next.task.status;
});

// Mémoiser les filtres
const TaskFilters = memo(({ filters, onChange }) => {
  // ...
});

export const TasksListPage = memo(() => {
  // Utiliser useMemo pour données calculées
  const filteredTasks = useMemo(() => {
    return tasks.filter(/* ... */);
  }, [tasks, filters]);

  // Utiliser useCallback pour handlers
  const handleStatusChange = useCallback((taskId, status) => {
    // ...
  }, []);

  // ...
});
```

#### 3. Lazy Load Composants Lourds dans les Pages

```tsx
// src/pages/TasksListPage.tsx
import { lazy, Suspense } from 'react';

const AddTaskModal = lazy(() => import('../components/tasks/AddTaskModal'));
const AssignStaffDialog = lazy(() => import('../features/tasksNew/components/AssignStaffDialog'));
const TaskDetailDrawer = lazy(() => import('../features/tasksNew/components/TaskDetailDrawer'));

export const TasksListPage = () => {
  return (
    <>
      {/* Afficher uniquement quand nécessaire */}
      {showModal && (
        <Suspense fallback={<CircularProgress />}>
          <AddTaskModal />
        </Suspense>
      )}
      {/* ... */}
    </>
  );
};
```

#### 4. Virtualisation des Listes

```tsx
// Pour les longues listes de tâches/réservations
import { FixedSizeList } from 'react-window';

const VirtualizedTaskList = ({ tasks }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TaskRow task={tasks[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={tasks.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

#### 5. React Query - Configuration Optimale

```tsx
// src/App.tsx ou main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Éviter re-fetch inutiles
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      // Réduire les re-fetch en arrière-plan
      refetchOnWindowFocus: false,
      // Retry uniquement sur vraie erreur réseau
      retry: 1,
    },
  },
});
```

---

### 🏗️ **Optimisations Moyennes (1-2 jours)**

#### 6. Découper les Pages Volumineuses

**TasksListPage.tsx (2,155 lignes) → À découper en :**
```
src/pages/TasksListPage/
├── index.tsx                    (100 lignes)
├── TasksToolbar.tsx            (150 lignes)
├── TasksFilters.tsx            (200 lignes)
├── TasksTable.tsx              (300 lignes)
├── TaskRow.tsx                 (150 lignes)
├── hooks/
│   ├── useTasks.ts
│   ├── useTaskFilters.ts
│   └── useTaskActions.ts
└── types.ts
```

#### 7. Nettoyer les Dépendances

```bash
# Supprimer les doublons
npm uninstall @tanstack/react-router  # Garder react-router-dom
npm uninstall moment                   # Migrer vers date-fns uniquement

# Mettre à jour vers versions stables
npm install react@^18.3.1 react-dom@^18.3.1
npm install typescript@^5.5.0
```

#### 8. Ajouter React DevTools Profiler

```tsx
// En développement uniquement
import { Profiler } from 'react';

<Profiler id="TasksListPage" onRender={logRenderTime}>
  <TasksListPage />
</Profiler>
```

---

### 🚀 **Optimisations Avancées (3-5 jours)**

#### 9. Service Worker + Cache Stratégies

```ts
// vite.config.ts + plugin PWA
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  VitePWA({
    workbox: {
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/dev\.sojori\.com\/api\//,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 5, // 5 minutes
            },
          },
        },
      ],
    },
  }),
];
```

#### 10. Web Workers pour Calculs Lourds

```ts
// src/workers/taskFiltering.worker.ts
self.onmessage = (e) => {
  const { tasks, filters } = e.data;
  const filtered = tasks.filter(/* logique complexe */);
  self.postMessage(filtered);
};
```

#### 11. Prefetching Intelligent

```tsx
// Précharger les données probables
const { prefetchQuery } = useQueryClient();

onMouseEnter={() => {
  prefetchQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksService.getTask(taskId),
  });
}}
```

---

## 📈 Métriques Avant/Après (Estimées)

| Métrique | Avant | Après Optimisation | Gain |
|----------|-------|-------------------|------|
| Bundle principal | 1.0 MB | 350 KB | **-65%** |
| Time to Interactive | 4-6s | 1.5-2s | **-66%** |
| Lighthouse Performance | 40-50 | 85-95 | **+90%** |
| First Contentful Paint | 2.5s | 0.8s | **-68%** |
| Largest Contentful Paint | 5s | 1.8s | **-64%** |

---

## ✅ Plan d'Action Recommandé

### Semaine 1 - Quick Wins
- [ ] Jour 1: Optimiser vite.config.ts (points 1-2)
- [ ] Jour 2: Ajouter React.memo sur 10 composants critiques
- [ ] Jour 3: Lazy load des modals/drawers
- [ ] Jour 4: Configurer React Query optimalement
- [ ] Jour 5: Tests de performance + mesures

### Semaine 2 - Optimisations Moyennes
- [ ] Jour 1-2: Découper TasksListPage en composants
- [ ] Jour 3: Nettoyer dépendances + migration date-fns
- [ ] Jour 4: Virtualisation des grandes listes
- [ ] Jour 5: Tests + validation

### Semaine 3 - Optimisations Avancées (optionnel)
- [ ] Service Worker + PWA
- [ ] Web Workers pour calculs
- [ ] Prefetching intelligent

---

## 🔧 Commandes Utiles

```bash
# Analyser le bundle
cd Sojori-orchestrator
npm run build
npx vite-bundle-visualizer

# Profiler en dev
VITE_PROFILE=true npm run dev

# Mesurer les perfs
npm install -g lighthouse
lighthouse http://127.0.0.1:4174/tasks --view

# Build de production optimisé
npm run build -- --mode production
```

---

## 📚 Ressources

- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)

---

**Conclusion:** Les problèmes de performance sont principalement dus à un bundle monolithique non optimisé et à l'absence de memoization sur des composants lourds. Les quick wins (semaine 1) devraient résoudre 70% des problèmes de lenteur.
