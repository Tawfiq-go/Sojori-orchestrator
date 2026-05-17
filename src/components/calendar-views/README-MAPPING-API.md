# 📋 Mapping API → UI · Sojori Calendar Views V2

Mapping complet des champs API (srv-task) vers les composants React des 3 vues.

---

## 🎨 Bundle livré

```
delivery/sojori-calendar-views-v2/
├── _shared.tsx        ← tokens · types · helpers · KpiPill · DayHeader · TaskChip · GanttBar · LoadBar · CleanlinessBadge
├── StayView.tsx       ← Vue Séjour (Gantt + tâches · mini-map 30j · groupé par ville)
├── TeamView.tsx       ← Vue Équipe (load bars · "Non assigné" en tête)
├── KanbanView.tsx     ← Kanban 4 colonnes (drag-drop natif · stats footer)
└── README-MAPPING-API.md
```

## 🚀 Intégration en 3 minutes

```tsx
import StayView from './delivery/sojori-calendar-views-v2/StayView';
import TeamView from './delivery/sojori-calendar-views-v2/TeamView';
import KanbanView from './delivery/sojori-calendar-views-v2/KanbanView';

// Vue Séjour
<StayView
  startDate={new Date()}
  listings={apiPlanning.listings}     // direct depuis GET /api/v1/task/reservation/planning
  daysCount={30}                       // pour la mini-map
  onTaskClick={(t) => openTaskDrawer(t)}
  onReservationClick={(id) => openReservation(id)}
/>

// Vue Équipe
<TeamView
  startDate={new Date()}
  daysCount={14}
  staff={apiStaff.data}                // GET /api/v1/task/staff-simplified
  tasks={apiTasks.data}                // GET /api/v1/task/tasks/search
  onTaskClick={(t) => openTaskDrawer(t)}
/>

// Vue Kanban
<KanbanView
  tasks={apiTasks.data}
  onTaskMove={(taskId, newStatus) => tasksService.updateStatus(taskId, newStatus)}
  onTaskClick={(t) => openTaskDrawer(t)}
  onNewTask={() => openNewTaskDialog()}
/>
```

---

## 🔗 Mapping Vue Séjour

**Endpoint :** `GET /api/v1/task/reservation/planning`

| Champ API | UI | Composant |
|---|---|---|
| `listings[].listingId` | `key` du row + identifiant interne | `ListingRowComp` |
| `listings[].listingName` | Nom affiché colonne sticky | `ListingRowComp` |
| `listings[].city` | **Groupe ville** (header de section) | `byCity` map dans `StayView` |
| `listings[].cleanlinessStatus_v2` | Badge `CLEAN / DIRTY / EN COURS / OCCUPÉ` | `CleanlinessBadge` |
| `listings[].reservations[].reservationId` | `key` + onClick | `GanttBar` |
| `listings[].reservations[].guestName` | Texte barre Gantt | `GanttBar` |
| `listings[].reservations[].arrivalDate` | Position `leftPct` | `barGeometry()` interne |
| `listings[].reservations[].departureDate` | Position `widthPct` | `barGeometry()` interne |
| `listings[].reservations[].channelName` | **Couleur barre** via `channelFromName()` | `airbnb` rouge · `booking` bleu · `vrbo` cyan · `direct` ambre |
| `listings[].reservations[].status` | Icône `✓` (confirmed) ou `⏳` (pending) | `GanttBar` |
| `listings[].reservations[].reservationNumber` | Affiché à droite si largeur > 120px | `GanttBar` |
| `listings[].reservations[].timeline[].type` | **Type chip** (emoji + couleur) | `TaskChip` via `TASK_CHIP_STYLES` |
| `listings[].reservations[].timeline[].scheduledFor` | Détermine la cellule jour (`.slice(0,10)`) | `DayCell` filter |
| `listings[].reservations[].timeline[].staffName` | Initiales dans le chip | `initialsFrom()` |
| `listings[].reservations[].timeline[].staffId` | Si null + status ≠ COMPLETED → halo rouge clignotant | `isUnassigned` |

**Calculs internes :**
- **KPI "Aujourd'hui"** : itère timeline · compte `arrival` · `departure` · `cleaning` · non assignés
- **Mini-map 30j** : 1 case par jour · couleur intensité = nb tâches (0 / 1-2 / 3+) · today rouge
- **Group by city** : `new Map<string, ListingRow[]>()` dans `useMemo`

---

## 🔗 Mapping Vue Équipe

**Endpoints :** `GET /api/v1/task/tasks/search` + `GET /api/v1/task/staff-simplified`

| Champ API | UI | Composant |
|---|---|---|
| `staff[]._id` | `key` du row | `StaffRow` |
| `staff[].username` | Nom affiché | `StaffRow` |
| `staff[].memberRole` | Sous-titre `Staff / Manager / Admin` | `StaffRow` |
| `staff[]` index | **Couleur avatar** (cycle 6 couleurs) | `STAFF_COLORS[i % 6]` |
| `tasks[]._id` | `key` du chip | `TaskChip` |
| `tasks[].type` | Type + couleur chip | `TASK_CHIP_STYLES` |
| `tasks[].startDate` | Détermine cellule jour | `DayCellTeam` filter |
| `tasks[].staffId` | Groupement → row staff ou `__unassigned__` | `grouped` map |
| `tasks[].listingName` | Texte chip | `TaskChip` |
| `tasks[].taskStatus` | Si ≠ COMPLETED + `!staffId` → halo rouge | `isUnassigned` |
| `tasks[].emergency` | Priorité (urgent → highlight) | `TaskCard` (Kanban) |

**Calculs internes :**
- **Load bar 0-10** : `tasks.length` dans la cellule · fill % = `min(100, count*10)` · couleur low/med/high
- **Ligne "Non assigné" en tête** : toujours rendue première · collapsible si vide
- **Filtres types fuzzy** : `activeTypes.has(t.type)` (plus de keywords hardcodés)

---

## 🔗 Mapping Kanban

**Endpoint :** `GET /api/v1/task/tasks/search`

| Champ API | UI | Composant |
|---|---|---|
| `tasks[].taskStatus` | **Colonne** (CREATED / ASSIGNED / IN_PROGRESS / COMPLETED) | `grouped[t.taskStatus]` |
| `tasks[].type` | Header card (emoji + label) | `TASK_CHIP_STYLES` |
| `tasks[].name` | Titre card | `TaskCard` |
| `tasks[].listingName` | Meta line | `TaskCard` |
| `tasks[].guestName` | Meta line | `TaskCard` |
| `tasks[].reservationNumber` | Meta line `#XXX` | `TaskCard` |
| `tasks[].startDate` | Badge horaire (`HH:mm`) + détection retard | `TaskCard` |
| `tasks[].staffName` / `.staffCode` | Avatar bottom + initiales | `TaskCard` |
| `tasks[].staffId` | Si null + ≠ COMPLETED → avatar rouge `⚠` | `isUnassigned` |
| `tasks[].emergency` | Si `urgent` → border gauche rouge + point clignotant | `isPriority` |

**Drag & drop :**
- `draggable={true}` natif HTML5
- `onDragStart` → set `dragged` state
- `onDrop` → callback `onTaskMove(taskId, newStatus)` → appelle ton API `tasksService.updateStatus()`
- Background colonne ambre pâle pendant drag-over

**Stats footer :**
- `unassigned` : `tasks.filter(t => !t.staffId && t.taskStatus !== 'COMPLETED').length`
- `late` : `startDate < today && taskStatus !== 'COMPLETED'`
- `completedToday` : `taskStatus === 'COMPLETED' && startDate === today`
- `rate` : `(COMPLETED / total) * 100`

---

## 🎨 Décisions design validées

| # | Décision | Implémenté dans |
|---|---|---|
| 1 | Vues : Séjour + Équipe + **Kanban bonus** | `StayView` · `TeamView` · `KanbanView` |
| 2 | Hauteur ligne **fixe** : 76px (Séjour) / 60px (Équipe) | `STAY.ROW_H` · `TEAM.ROW_H` dans `_shared.tsx` |
| 3 | Max **2** chips visibles + badge `+N` **popover MUI inline** | `STAY.MAX_CHIPS` · `TEAM.MAX_CHIPS` · `<Popover>` |
| 4 | Couleur barre **par canal** OTA | `channelFromName()` · `GanttBar` |
| 5 | **Load bar 0-10** par cellule (couleur low/med/high) | `LoadBar` dans `_shared.tsx` |
| 6 | **Mini-map 30j** au-dessus du header | `MiniMap` interne à `StayView` |
| 7 | Filtres groupés **par ville** | `byCity` map dans `StayView` |

---

## 🎬 Animations à ajouter dans `index.css`

```css
@keyframes sojori-pulse-error {
  0%, 100% { box-shadow: 0 0 0 0 rgba(200,30,30,0.5); }
  50%      { box-shadow: 0 0 0 6px rgba(200,30,30,0); }
}
@keyframes sojori-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
```

(Déjà exportées par `_shared.tsx` via `SOJORI_KEYFRAMES` — injectées via `<style>` dans chaque vue.)

---

## ✅ Checklist intégration

- [ ] Copier les 4 fichiers `.tsx` dans `src/components/calendar-views/`
- [ ] Brancher les routes `/tasks/planning` → `<StayView>`, `/tasks/team` → `<TeamView>`, `/tasks/kanban` → `<KanbanView>`
- [ ] Mapper les hooks data existants vers les props attendues
- [ ] Tester drag-drop Kanban → `tasksService.updateStatus` appelé
- [ ] Tester popover overflow tâches → toutes les tâches s'affichent
- [ ] Tester mini-map → indication position visible quand on navigue
- [ ] Responsive : ajouter media query à 768px pour basculer `CELL_W` à 60px

## 🔮 Évolutions possibles

- **Drag-drop dans la grid Séjour/Équipe** pour réassigner staff (utiliser `react-dnd` ou native + cells indexées)
- **Persistance filtres** types tâches en localStorage
- **Vue mensuelle classique** (style Google Calendar) en complément
- **Heatmap charge staff** (semaine × staff) pour vue managériale
