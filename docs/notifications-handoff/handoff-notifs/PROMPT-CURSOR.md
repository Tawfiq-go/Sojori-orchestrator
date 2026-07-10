# 📋 Prompt Cursor — Implémenter le centre de notifications Sojori

> Colle ce prompt dans Cursor (ou Claude Code) **avec le repo `Sojori-orchestrator` ouvert**
> et le dossier `handoff-notifs/prototype/` accessible comme référence visuelle.

---

## Rôle & objectif

Tu es un ingénieur frontend senior sur **Sojori-orchestrator** (React 18 + Vite + MUI + `@tanstack/react-query`).
Implémente le **centre de notifications dashboard** pour les Owners / PM.

Le **backend est déjà livré** (srv-fulltask + srv-sockets) — **ne recrée pas l'API**.
Le **design et le comportement** sont entièrement définis par la maquette de référence :
`handoff-notifs/prototype/Sojori Notifications.html` (+ `notifs/data.js`, `notifs/app.js`).
Reproduis-la fidèlement en React/MUI (pixel + interactions). Ne réinvente ni l'UX ni les couleurs.

## Contraintes fermes

- ❌ Ne touche PAS au backend, ni à `sojori-dashboard` (legacy), ni à `sojori-production`.
- ❌ Pas de push navigateur / email (hors scope v1).
- ❌ Ne duplique pas l'Inbox Communications : messages = conversations ; cloche = alertes métier.
- ✅ Charte tokens dashboard : `src/components/dashboard/dashboardTokens.ts` (`primary: #E6B022`).
- ✅ Ne commit pas sans validation locale sur `http://127.0.0.1:3001/dashboard`.

---

## 1. Fichiers à créer

```
src/features/notifications/
  types.ts                          # types TS (voir §2)
  notificationApi.ts                # appels REST via apiClient (voir §3)
  NotificationProvider.tsx          # contexte + abonnement socket
  useNotifications.ts               # hooks React Query (liste, unread-count, mutations, prefs)
  NotificationBell.tsx              # cloche + badge (badge = actionRequired)
  NotificationPanel.tsx             # dropdown desktop / Drawer mobile
  NotificationRow.tsx               # une ligne (anatomie: voir maquette)
  NotificationFacetChips.tsx        # chips facettes + compteurs byFacet
  NotificationToast.tsx             # toast critical/high (auto-dismiss 6s)
  NotificationPreferencesSection.tsx# grille événement × canal
  index.ts
```

## 2. Types (`types.ts`)

Dérive-les du contrat renvoyé par l'API (voir la réponse liste et unread-count ci-dessous).
Champs clés d'une notification : `_id, eventKey, facet, priority, title, body, linkPath,
status, readAt, expiresAt, aggregatedCount, payload, createdAt`.

- `facet`: `'reservation' | 'guest_journey' | 'orchestration' | 'message' | 'task' | 'concierge' | 'finance' | 'review' | 'lead'`
- `priority`: `'critical' | 'high' | 'normal' | 'low'`
- `status`: `'created' | 'pending' | 'handled' | 'done' | 'dismissed' | 'expired'`

## 3. API REST (`notificationApi.ts`)

Reprends **exactement** le pattern de `src/services/fulltaskApi.ts` + `apiClient` (JWT auto) :

```typescript
function resolveFulltaskBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') return '/api/v1/admin/fulltask';
  return `${API_BASE_URL}/api/v1/admin/fulltask`;
}
const NOTIF_BASE = `${resolveFulltaskBase()}/notification`;
```

| Method | Path | Usage |
|--------|------|--------|
| GET | `${NOTIF_BASE}/` | Liste `?facet=&unreadOnly=&status=&page=&limit=` |
| GET | `${NOTIF_BASE}/unread-count` | Badge cloche |
| PUT | `${NOTIF_BASE}/:id/read` | Clic ligne → lu |
| PUT | `${NOTIF_BASE}/:id/status` | `{ status: 'done' \| 'dismissed' }` |
| PUT | `${NOTIF_BASE}/read-all` | `?facet=` optionnel |
| GET | `${NOTIF_BASE}/preferences` | Settings |
| PUT | `${NOTIF_BASE}/preferences` | `{ events: { "reservation:new": { dashboard: true } } }` |
| GET | `${NOTIF_BASE}/event-catalog` | Catalogue eventKeys |

**unread-count** → `{ success, data: { total, actionRequired, byFacet: { message, reservation, ... } } }`

## 4. React Query (`useNotifications.ts`)

- `useUnreadCount()` → `['notifications','unread-count']`, `refetchInterval` fallback 60s.
- `useNotificationList(facet, tab)` → `['notifications','list',{facet,tab}]`, `keepPreviousData`.
- `useNotificationPreferences()` / `useUpdatePreferences()`.
- Mutations `useMarkRead`, `useSetStatus`, `useMarkAllRead` avec **optimistic update** +
  `invalidateQueries(['notifications'])` en `onSettled`.

## 5. Socket temps réel

- `src/constants/socketEvents.ts` → **ajouter** `NEW_NOTIFICATION: 'NEW_NOTIFICATION'`.
- Dans `NotificationProvider`, via `useSocketIO` (cf. `CommunicationsHubPage.tsx`,
  `TasksListPage.tsx`), rejoindre les rooms depuis `useAuth()` :
  - `room_notification_{ownerId}`
  - `room_notification_user_{userId}` (optionnel)
- Sur `NEW_NOTIFICATION` :
  `queryClient.invalidateQueries(['notifications','unread-count'])` +
  prepend dans la liste si le panneau est ouvert +
  déclencher un **toast** si `priority ∈ {critical, high}`.

## 6. Intégration shell

- `src/components/dashboard/DashboardV2.components.jsx`, fonction `TopBar` (~ligne 712) :
  remplacer le mock `NotificationsNoneOutlined` + badge statique par `<NotificationBell />`.
- Envelopper l'app dashboard avec `<NotificationProvider>` dans `DashboardShellLayout.tsx`
  (ou `App.tsx`, sous les providers auth).
- **La cloche doit être visible sur toutes les pages** (TopBar persistante).

## 7. Comportement (source de vérité = la maquette)

- **Badge cloche** = `unread-count.data.actionRequired` (rouge). Masqué si 0.
- **Onglet « Action requise »** = notifs avec `priority ∈ {critical,high}` ET `status ∈ {created,pending}`.
- **Ligne non lue** (`readAt === null`) : fond `warningTint` + barre gauche `primary` 3px.
- **Clic ligne** : `PUT /:id/read` (optimistic) puis `navigate(linkPath)` (React Router).
- Actions ligne : **Terminer** → `PUT /:id/status {done}` ; **Ignorer** → `{dismissed}` ; sortie animée.
- **Tout marquer lu** : `PUT /read-all?facet=`.
- **Agrégation** : si `aggregatedCount > 1`, afficher `×N` (ex. « Relances ×3 »).
- **Facettes** distinctes visuellement — surtout `guest_journey` ≠ `reservation` (couleur + icône).
- **Deep links** : ne pas réinventer, utiliser `notification.linkPath` tel quel. Routes : `src/config/navConfig.ts` (`OWNER_NAV_GROUPS`).

### Priorités → tokens
`critical → error` · `high → warning` · `normal → info` · `low → text3`.

## 8. Panneau — responsive

- **Desktop (≥ md)** : ancré sous la cloche, largeur ~400px, max-height ~70vh, `Popover` MUI.
- **Mobile / étroit** : `Drawer` MUI `anchor="right"`, pleine hauteur, lignes 48–56px.
- Header « Notifications » + « Tout marquer lu » + ⚙️ (→ préférences).
- Empty state : « Rien à signaler » / « Rien à traiter ».

## 9. Préférences (`NotificationPreferencesSection.tsx`)

- Grille **événement × canal** (Dashboard / WhatsApp staff), style Hostaway.
- Groupes **collapsibles par facette** (à partir de `GET /event-catalog`).
- Événements `critical` : toggle **Dashboard non désactivable** (cadenas + tooltip « toujours actif »).
- `GET/PUT /notification/preferences`.
- Emplacement : onglet Settings existant ou route `/settings/notifications`.

---

## 10. Critères d'acceptation (à cocher avant commit)

- [ ] Cloche visible sur **toutes** les pages dashboard (TopBar persistante)
- [ ] Badge = `actionRequired` (pas `total`)
- [ ] Socket `NEW_NOTIFICATION` → refresh sans reload + toast critical/high
- [ ] Filtres facettes avec compteurs `byFacet`
- [ ] Clic → deep link (`linkPath`) + marquer lu
- [ ] Terminer / Ignorer / Tout marquer lu (optimistic + invalidate)
- [ ] Préférences persistées (PUT), critiques verrouillées sur Dashboard
- [ ] `guest_journey` ≠ `reservation` visuellement
- [ ] Agrégation `aggregatedCount > 1` affichée
- [ ] Aucune régression sur Communications Hub

## 11. Test manuel

« nouvelle résa → badge +1 → clic → fiche résa » :
1. Émettre un `NEW_NOTIFICATION` (`reservation:new`) → badge +1, ring, toast si high.
2. Ouvrir la cloche → la ligne est en tête, non lue.
3. Cliquer → route `/reservations?search=SJ-XXX` + notif passée en lu, badge -1.

## 12. Références repo (lecture)

- `src/services/fulltaskApi.ts`, `src/services/apiClient.ts`
- `src/hooks/useSocketIO.ts`, `src/constants/socketEvents.ts`
- `src/components/dashboard/DashboardV2.components.jsx` (TopBar ~l.712), `dashboardTokens.ts`
- `src/config/navConfig.ts` (`OWNER_NAV_GROUPS`)
- Ex. socket : `CommunicationsHubPage.tsx`, `TasksListPage.tsx`
- Doc backend (lecture seule) : `sojori-production/docs/notifications/` (`05-architecture-cible.md`, `02-taxonomie-evenements.md`, `BRIEF-CLAUDE-DESIGN.md`)

---

**Livre** : les composants branchés sur l'API réelle, `NotificationBell` dans la TopBar,
`NotificationProvider` au shell, `socketEvents.ts` mis à jour, section préférences.
Valide en local avant de commit.
