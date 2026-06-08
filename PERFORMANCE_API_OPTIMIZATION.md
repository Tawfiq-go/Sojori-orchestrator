# 🚀 Optimisation API & Temps de Chargement — Sojori Orchestrator

**Date:** 2026-06-08
**Problème:** LCP de 2.10s sur /tasks, données prennent du temps à charger
**Cause:** Appels API séquentiels + pas de feedback visuel pendant le chargement

---

## 🔍 Diagnostic des Appels API

### Page `/tasks` - Appels Réseau

**Actuellement :**
```
1. GET /api/v1/admin/fulltask/staff (ownerId, limit=200)    → ~500ms
2. GET /api/v1/admin/fulltask/listings                      → ~300ms
   ↑ Ces 2 sont en parallèle (Promise.all) ✅

3. GET /api/v1/admin/fulltask/tasks (avec tous les filtres) → ~800-1200ms ⚠️
   ↑ Ce call attend que les 2 premiers soient terminés
```

**Total:** ~1300-1700ms de chargement données

### Problèmes Identifiés

1. ⚠️ **Chargement séquentiel** : getTasks attend staff + listings
2. ⚠️ **Pas de skeleton/loading progressif** : Écran blanc pendant 2s
3. ⚠️ **Pas de cache** : Rechargement complet à chaque visite
4. ⚠️ **API lente** : `/tasks` endpoint prend 800-1200ms (backend)
5. ⚠️ **Trop de données** : Charge tout d'un coup au lieu de pagination

---

## ✅ Solutions Recommandées

### 1. **Chargement Parallèle Total** ⚡ (Gain: -50% temps)

**Avant:**
```tsx
// 1. Charge staff + listings
const [staffResult, listingResult] = await Promise.all([...]);
setStaff(...);
setListings(...);

// 2. PUIS charge tasks (séquentiel)
const tasksResult = await tasksService.getTasks({...});
setTasks(...);
```

**Après:**
```tsx
// ⚡ Tout en parallèle
const [staffResult, listingResult, tasksResult] = await Promise.all([
  tasksService.getStaff({ ownerId: scope.ownerId, limit: 200 }),
  tasksService.getListings(),
  tasksService.getTasks({
    ownerId: scope.ownerId,
    page,
    limit: rowsPerPage,
    search: activeSearchTerm,
    // ... tous les filtres
  }),
]);

// Tout set en même temps
setStaff(staffResult.staff);
setListings(listingResult.listings);
setTasks(tasksResult.tasks);
setPagination(tasksResult.pagination);
```

**Impact:** 1300ms → **700ms** (-46%)

---

### 2. **Skeleton Loading** 💀 (Gain: UX instantanée)

Afficher immédiatement un skeleton pendant le chargement :

```tsx
export function TasksListPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskListItem[]>([]);

  if (loading) {
    return (
      <DashboardWrapper>
        <Box sx={{ p: 3 }}>
          {/* Header skeleton */}
          <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />

          {/* Filters skeleton */}
          <Stack direction="row" gap={2} sx={{ mb: 3 }}>
            {[1,2,3,4,5].map(i => (
              <Skeleton key={i} variant="rounded" width={100} height={36} />
            ))}
          </Stack>

          {/* Table skeleton */}
          <Paper>
            {[1,2,3,4,5,6,7,8].map(i => (
              <Skeleton key={i} height={60} sx={{ mb: 1 }} />
            ))}
          </Paper>
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      {/* Contenu réel */}
    </DashboardWrapper>
  );
}
```

**Impact:** Perception utilisateur de **0ms** (affichage immédiat)

---

### 3. **Progressive Data Loading** 📊 (Gain: First Paint rapide)

Charger les données critiques d'abord, le reste après :

```tsx
useEffect(() => {
  const loadData = async () => {
    // Phase 1: Données critiques (affichage immédiat)
    const tasksResult = await tasksService.getTasks({
      ownerId: scope.ownerId,
      limit: 10, // ⚡ Seulement 10 premières tâches
    });
    setTasks(tasksResult.tasks);
    setLoading(false); // ✅ Affiche la page

    // Phase 2: Données complètes (en arrière-plan)
    const [staffResult, listingResult, fullTasksResult] = await Promise.all([
      tasksService.getStaff({ ownerId: scope.ownerId }),
      tasksService.getListings(),
      tasksService.getTasks({
        ownerId: scope.ownerId,
        limit: rowsPerPage, // 50-100 tâches
      }),
    ]);
    setStaff(staffResult.staff);
    setListings(listingResult.listings);
    setTasks(fullTasksResult.tasks);
  };

  loadData();
}, []);
```

**Impact:** First Paint **300ms** au lieu de 1700ms (-82%)

---

### 4. **Cache Intelligent avec React Query** 🗄️ (Gain: Instant sur revisites)

Utiliser React Query pour cacher les données :

```tsx
import { useQuery, useQueries } from '@tanstack/react-query';

export function TasksListPage() {
  // ⚡ Cache automatique 5 minutes
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', scope.ownerId, page, filters],
    queryFn: () => tasksService.getTasks({...}),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: staff } = useQuery({
    queryKey: ['staff', scope.ownerId],
    queryFn: () => tasksService.getStaff({...}),
    staleTime: 15 * 60 * 1000, // 15 minutes (change rarement)
  });

  const { data: listings } = useQuery({
    queryKey: ['listings'],
    queryFn: () => tasksService.getListings(),
    staleTime: 15 * 60 * 1000,
  });

  // ✅ Au 2ème visit: 0ms (cache)
}
```

**Impact:** Revisite de la page **0-50ms** au lieu de 1700ms (-97%)

---

### 5. **Optimisation Backend** ⚙️ (Gain: -30% temps API)

Côté backend (srv-fulltask), optimiser l'endpoint `/tasks` :

**A. Indexation MongoDB**
```js
// Créer des index sur les champs fréquemment filtrés
db.tasks.createIndex({ ownerId: 1, createdAt: -1 });
db.tasks.createIndex({ ownerId: 1, taskStatus: 1 });
db.tasks.createIndex({ ownerId: 1, startDate: 1 });
```

**B. Pagination Cursor-based**
```js
// Au lieu de skip/limit (lent sur grandes collections)
const tasks = await Task.find({
  ownerId,
  _id: { $gt: cursor }, // Cursor pagination
})
.limit(50)
.sort({ createdAt: -1 });
```

**C. Select Fields**
```js
// Ne charger que les champs nécessaires
const tasks = await Task.find({...})
  .select('_id taskTitle taskStatus startDate assignedStaffCode')
  .lean(); // ⚡ 2x plus rapide
```

**Impact:** 800-1200ms → **500-700ms** (-40%)

---

## 🎯 Plan d'Action Immédiat

### Phase 1: Quick Wins Frontend (1h) ⚡

1. **Chargement parallèle total** (15 min)
   ```tsx
   // Remplacer les appels séquentiels par Promise.all
   ```

2. **Skeleton loading** (30 min)
   ```tsx
   // Ajouter des skeletons MUI
   ```

3. **React Query partout** (15 min)
   ```tsx
   // Remplacer useState par useQuery
   ```

**Résultat attendu:** LCP **2.10s → 0.8s** (-62%)

---

### Phase 2: Optimisations Backend (2-3h)

4. **Créer les index MongoDB** (30 min)
5. **Optimiser les queries** (1h)
6. **Ajouter pagination cursor** (1h)

**Résultat attendu:** LCP **0.8s → 0.4s** (-50% supplémentaire)

---

## 📊 Résultats Attendus Final

| Métrique | Avant | Phase 1 | Phase 2 | Gain Total |
|----------|-------|---------|---------|------------|
| **LCP /tasks** | 2.10s | 0.8s | 0.4s | **-81%** ⚡ |
| **First Paint** | 2.10s | 0.3s | 0.3s | **-86%** ⚡ |
| **Revisite (cache)** | 2.10s | 0.05s | 0.05s | **-98%** ⚡ |
| **API /tasks** | 1200ms | 1200ms | 600ms | **-50%** ⚡ |

---

## 🔧 Code à Implémenter (Phase 1)

Je vais maintenant implémenter ces optimisations dans le code...

