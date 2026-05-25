# 📦 Sojori · Staff & Orchestration · Bundle React/TypeScript

Composants prêts à intégrer dans `sojori-dashboard` (MUI v9). 4 fichiers · pas de routing · pas d'auth · pas de Next/Vite — uniquement des composants React typés.

## ✅ Contenu

```
src/
├── types.ts                     ← interfaces TS · tokens design Atelier 2026
├── StaffList.tsx                ← grille de cartes staff · filtres · search
├── StaffForm.tsx                ← formulaire création/édition · validation
├── OrchestrationEditor.tsx      ← workflows + messages simples
└── index.ts                     ← barrel export
```

**Référence visuelle** : ouvre `site/Sojori Staff Orchestration.html` (à côté) pour voir le rendu Atelier 2026.

## 🚀 Intégration · sojori-dashboard

```bash
cp -r delivery/sojori-staff-orchestration/src \
   sojori-dashboard/src/features/fulltask
```

```tsx
// sojori-dashboard/src/routes/AdminStaffRoute.tsx
import { useState } from 'react';
import { StaffList, StaffForm } from '@/features/fulltask';
import { useStaff, useListings, createStaff, updateStaff, deleteStaff } from '@/api/admin';

export default function AdminStaffRoute() {
  const { data: staff, refetch } = useStaff();
  const { data: listings } = useListings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (creating || editingId) {
    return (
      <StaffForm
        initial={editingId ? staff.find(s => s._id === editingId) : undefined}
        allListings={listings}
        onSave={async (s) => {
          if (editingId) await updateStaff(editingId, s);
          else await createStaff(s);
          await refetch();
          setEditingId(null); setCreating(false);
        }}
        onCancel={() => { setEditingId(null); setCreating(false); }}
        onDelete={editingId ? async () => {
          await deleteStaff(editingId);
          await refetch();
          setEditingId(null);
        } : undefined}
      />
    );
  }

  return (
    <StaffList
      staff={staff || []}
      onCreate={() => setCreating(true)}
      onEdit={(id) => setEditingId(id)}
    />
  );
}
```

## 🔌 Mapping API

### Staff

| Action UI | Méthode + endpoint | Body / params |
|---|---|---|
| Charger liste staff | `GET /fulltask/staff` | `?listingId=` ou `?ownerId=` selon contexte |
| Créer membre | `POST /fulltask/staff` | `Staff` (sans `_id`) |
| Modifier membre | `PATCH /fulltask/staff/:id` | `Partial<Staff>` |
| Supprimer membre | `DELETE /fulltask/staff/:id` | — |
| Charger types tâches | déjà disponible côté front | enum `TaskType` (cf. `types.ts`) |
| Charger listings | `GET /listing/listings/owner/:ownerId` | adapter selon ton API |

**Champs obligatoires côté backend** :
- `fullName` · `whatsappE164` · `contractType` · `allowedTaskTypes` · `schedule.daysOfWeek` · `schedule.timeWindows`
- Si `contractType === 'freelance'` : valider que chaque `allowedTaskTypes` a un `rates[t]` (sinon erreur 400)

### Orchestration

| Action UI | Méthode + endpoint | Body / params |
|---|---|---|
| Charger workflows | `GET /fulltask/orchestration/workflows` | `?listingId=` |
| MAJ workflow | `PATCH /fulltask/orchestration/workflows/:id` | `Partial<Workflow>` |
| Ajouter relance | `POST /fulltask/orchestration/workflows/:id/relances` | `WorkflowRelance` (sans id) |
| Supprimer relance | `DELETE /fulltask/orchestration/workflows/:id/relances/:rid` | — |
| Charger messages | `GET /fulltask/orchestration/messages` | `?listingId=` |
| Créer message | `POST /fulltask/orchestration/messages` | `SimpleMessage` (sans `_id`) |
| MAJ message | `PATCH /fulltask/orchestration/messages/:id` | `Partial<SimpleMessage>` |
| Supprimer message | `DELETE /fulltask/orchestration/messages/:id` | — |

### Tasks (référence, déjà existant)

| Action UI | Méthode + endpoint |
|---|---|
| Créer tâche depuis workflow | `POST /fulltask/tasks` avec `{ listingId, reservationId, type, assignedStaffId, dueAt }` |

## 📐 Types exposés

Voir `types.ts` · résumé :
- `Staff` · `TaskType` · `ContractType` · `StaffStatus`
- `Workflow` · `WorkflowRelance` · `WorkflowAssignment` · `WorkflowDeadline`
- `SimpleMessage` · `ChannelKind` · `ReferencePoint` · `WindowUnit`

## 🎨 Tokens / layout

Tous les tokens dans `types.ts → T` :
- Primary `#b8851a` (gold ambre) · primaryDeep `#876119` · primarySoft `#e6c46a`
- Backgrounds `#f6f5f1` (page) / `#fff` (cards) / `#fafaf7` (alt)
- Text `#14110a` / `#55504a` / `#7a756c` / `#a8a299` (4 niveaux)
- Success `#0a8f5e` · warning `#c46506` · error `#c81e1e` · info `#0673b3` · ai `#7c3aed`
- Border `rgba(20,17,10,0.07)` · borderStrong `rgba(20,17,10,0.14)`

**Polices** : Geist (sans) + Geist Mono (chiffres / labels mono). À charger côté app shell :
```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Espacements** : multiples MUI `theme.spacing` (8px base) · radii 1 / 1.125 / 1.625 / 1.75 / 2 selon densité.

**Breakpoints** : la grille StaffList passe en 1 col mobile, 2 col tablette, 3 col xl.

## 🧱 États UI gérés par les composants

| Composant | Loading | Empty | Erreur | Modales |
|---|---|---|---|---|
| `StaffList` | prop `loading` (squelette à ajouter si besoin) | empty state intégré | à gérer par parent (toast) | aucune (drawer/page parent) |
| `StaffForm` | bouton "Enregistrement…" pendant save | — | à gérer par parent (try/catch sur onSave) | aucune (suppression confirmée par parent) |
| `OrchestrationEditor` | — | — | à gérer par parent | aucune |

Pas de Snackbar/Toast intégré · tu utilises ton système existant côté sojori-dashboard.

## 🚫 Ce qui n'est PAS dans ce bundle

- Routes (`react-router-dom`) — tu les ajoutes dans `routes/AdminStaffRoute.tsx`
- AuthRoute / protection admin — gérée par ton `AuthRoute` existant
- Appels API — abstrait via callbacks `onSave` / `onUpdate` / `onDelete`
- Toast / Snackbar — tu utilises ton système existant
- Loading skeletons — à ajouter selon ta convention (MUI Skeleton, etc.)

## 📍 Suggestion d'emplacement dans le dashboard

```
sojori-dashboard/
└── src/
    └── features/
        └── fulltask/
            ├── components/
            │   ├── StaffList.tsx
            │   ├── StaffForm.tsx
            │   ├── OrchestrationEditor.tsx
            │   └── types.ts
            ├── routes/
            │   ├── AdminStaffRoute.tsx       ← wraps StaffList + StaffForm
            │   └── AdminOrchestrationRoute.tsx ← wraps OrchestrationEditor
            └── api/
                ├── staffApi.ts
                └── orchestrationApi.ts
```

Menu sidebar admin : ajouter "👷 Staff" et "⚙️ Orchestration" à côté de `tasksNew`.

## ✅ Checklist intégration

- [ ] Copier `src/` dans `features/fulltask/components/`
- [ ] Créer `staffApi.ts` + `orchestrationApi.ts` avec les endpoints listés ci-dessus
- [ ] Ajouter 2 routes (AdminStaffRoute · AdminOrchestrationRoute) avec `AuthRoute` admin-only
- [ ] Ajouter les entrées sidebar
- [ ] Tester : créer un staff freelance → vérifier validation `rates[type]` côté backend
- [ ] Tester : activer/désactiver un workflow → confirmer que les relances ne déclenchent plus
- [ ] Charger Geist + Geist Mono dans le shell HTML

## 🎯 Pour les questions de pixel-perfect

La référence visuelle est `site/Sojori Staff Orchestration.html`. Si un détail ne correspond pas (espacement, couleur, etc.), ouvre le HTML dans le navigateur et compare. Les composants TSX suivent **exactement** ces tokens.
