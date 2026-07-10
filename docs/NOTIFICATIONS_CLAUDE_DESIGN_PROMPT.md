# Prompt à copier-coller — Claude Design · Centre de notifications

**Repo front** : `Sojori-orchestrator` (localhost:3001)  
**Backend déjà livré** : `sojori-production` → `srv-fulltask` + `srv-sockets` (ne pas recréer l’API)  
**Date** : juillet 2026

---

## Mission

Implémenter le **centre de notifications dashboard** pour les **Owners / PM** dans Sojori-orchestrator :

- Cloche dans la **TopBar** (remplacer le placeholder actuel)
- Panneau dropdown desktop / drawer mobile
- Temps réel via socket `NEW_NOTIFICATION`
- Page ou section **Préférences** (on/off par type d’événement)
- **Ne pas** dupliquer l’Inbox Communications (messages = conversations ; cloche = alertes métier)

Inspiration UX : **Guesty** (Alerts vs Updates), **Hostaway** (badge + settings par catégorie).

---

## Point d’intégration exact (déjà en place — mock)

Fichier : `src/components/dashboard/DashboardV2.components.jsx`  
Fonction `TopBar` (~ligne 712) : icône `NotificationsNoneOutlined` + badge rouge **statique** — à remplacer par `<NotificationBell />`.

```jsx
// AVANT (mock)
<Tooltip title="Notifications">
  <IconButton sx={iconBtnSx} aria-label="Notifications">
    <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
    <Box sx={{ position: 'absolute', top: 7, right: 8, ... }} /> {/* badge fixe */}
  </IconButton>
</Tooltip>

// APRÈS
<NotificationBell />
```

Envelopper l’app dashboard avec `NotificationProvider` dans `DashboardShellLayout.tsx` (ou `App.tsx` sous les providers auth).

---

## API REST (via proxy srv-admin)

**Pattern identique à** `src/services/fulltaskApi.ts` :

```typescript
function resolveFulltaskBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return '/api/v1/admin/fulltask';
  }
  return `${API_BASE_URL}/api/v1/admin/fulltask`;
}
const NOTIF_BASE = `${resolveFulltaskBase()}/notification`;
```

Utiliser `apiClient` existant (`src/services/apiClient.ts`) — JWT automatique.

| Method | Path | Usage |
|--------|------|--------|
| GET | `${NOTIF_BASE}/` | Liste `?facet=&unreadOnly=&status=&page=&limit=` |
| GET | `${NOTIF_BASE}/unread-count` | Badge cloche |
| PUT | `${NOTIF_BASE}/:id/read` | Clic ligne → lu |
| PUT | `${NOTIF_BASE}/:id/status` | `{ status: 'done' \| 'dismissed' \| ... }` |
| PUT | `${NOTIF_BASE}/read-all` | `?facet=` optionnel |
| GET | `${NOTIF_BASE}/preferences` | Settings |
| PUT | `${NOTIF_BASE}/preferences` | `{ events: { "reservation:new": { dashboard: true } } }` |
| GET | `${NOTIF_BASE}/event-catalog` | Catalogue eventKeys |

**Réponse liste** :

```json
{
  "success": true,
  "items": [{
    "_id": "…",
    "eventKey": "message:ota_received",
    "facet": "message",
    "priority": "high",
    "title": "Message OTA reçu · SJ-ABC",
    "body": "Bonjour…",
    "linkPath": "/comms/ota?thread=123",
    "status": "pending",
    "readAt": null,
    "expiresAt": "2026-07-12T…",
    "aggregatedCount": 2,
    "payload": { "reservationNumber": "SJ-ABC", "listingName": "Majorelle" },
    "createdAt": "2026-07-09T…"
  }],
  "total": 12,
  "page": 1,
  "limit": 30
}
```

**Unread count** :

```json
{
  "success": true,
  "data": {
    "total": 8,
    "actionRequired": 3,
    "byFacet": { "message": 2, "reservation": 1, "orchestration": 2 }
  }
}
```

---

## Socket temps réel

**Hook existant** : `src/hooks/useSocketIO.ts`  
**Constantes** : `src/constants/socketEvents.ts` — **ajouter** :

```typescript
NEW_NOTIFICATION: 'NEW_NOTIFICATION',
```

**Rooms à rejoindre** (ownerId depuis JWT / `useAuth`) :

- `room_notification_{ownerId}`
- `room_notification_user_{userId}` (optionnel)

**Payload socket** :

```json
{
  "notificationId": "…",
  "ownerId": "…",
  "eventKey": "reservation:new",
  "facet": "reservation",
  "priority": "normal",
  "title": "Nouvelle réservation · SJ-XXX",
  "status": "created",
  "unreadCountDelta": 1
}
```

Sur event : `queryClient.invalidateQueries(['notifications', 'unread-count'])` + prepend si panneau ouvert.

Référence implémentation socket : `CommunicationsHubPage.tsx`, `TasksListPage.tsx`.

---

## Facettes (chips filtres — alignées sidebar Owner)

| `facet` | Label chip FR | Sidebar groupe |
|---------|---------------|----------------|
| `reservation` | Réservations | Réservations |
| `guest_journey` | Parcours guest | Orchestration |
| `orchestration` | Orchestration | Orchestration |
| `message` | Messages | Inbox Guest |
| `task` | Tâches | Task |
| `concierge` | Conciergerie | Task |
| `finance` | Finances | Finances |
| `review` | Avis | Inbox Guest |
| `lead` | Leads | Inbox Guest |

Compteurs chips : `unread-count.data.byFacet[facet]`.

---

## Statuts métier (cycle de vie BD)

```
created → pending → handled → done
                  ↘ dismissed
                  ↘ expired (TTL auto côté Mongo)
```

| UI | Règle |
|----|--------|
| **Badge cloche** | `actionRequired` (API) — pas seulement `total` |
| **Onglet « Action requise »** | `priority` ∈ {critical, high} ET `status` ∈ {created, pending} |
| **Ligne non lue** | `readAt === null` → fond `tokens.warningTint` ou barre gauche `tokens.primary` 3px |
| **Clic ligne** | `PUT …/read` puis `navigate(linkPath)` (React Router) |

---

## Priorités visuelles

| `priority` | Couleur token | Usage |
|------------|---------------|--------|
| `critical` | `tokens.error` | Escalade, deadline |
| `high` | `tokens.warning` | Message non lu, annulation |
| `normal` | `tokens.info` | Nouvelle résa, guest journey |
| `low` | `tokens.text3` | Relance agrégée |

Tokens : `src/components/dashboard/dashboardTokens.ts` (`primary: #E6B022`, etc.)

---

## Structure fichiers à créer

```
src/features/notifications/
  types.ts
  notificationApi.ts
  NotificationProvider.tsx
  useNotifications.ts          # React Query hooks
  NotificationBell.tsx
  NotificationPanel.tsx
  NotificationRow.tsx
  NotificationFacetChips.tsx
  NotificationPreferencesSection.tsx  # pour Settings ou modal
  index.ts
```

**Stack** : React 18 + MUI + `@tanstack/react-query` (déjà dans le projet).

---

## UX panneau cloche

### Desktop (≥ md)
- Ancre sous la cloche, largeur ~400px, max-height 70vh
- Header : « Notifications » + lien « Tout marquer lu »
- Onglets : **Action requise** | **Tout**
- Chips facettes (scroll horizontal)
- Liste scrollable
- Empty : « Rien à signaler »

### Mobile / paysage étroit
- `Drawer` anchor right, pleine hauteur
- Lignes denses ~48–56px

### Ligne notification (anatomie)

```
[icône facette]  Titre (1 ligne)                    il y a 5 min
                 SJ-ABC · Majorelle · Tawfiq
                 Corps (ellipsis 1 ligne)
                 [badge priorité]  [×2 si aggregatedCount > 1]
```

### Toast optionnel (v1.1)
Sur `critical` / `high` : coin bas-droite, auto-dismiss 6s, bouton « Voir ».

---

## Deep links (`linkPath` — ne pas réinventer)

| Facette | Exemple `linkPath` |
|---------|-------------------|
| Résa | `/reservations?search=SJ-XXX` |
| OTA | `/comms/ota?thread=ID` |
| WA guest | `/comms/guests?phone=…` |
| Orchestration | `/orch/plans` ou query `res=` |
| Tâches | `/tasks/list` |
| Finances | `/finances/ledger` |

Routes réelles : voir `src/config/navConfig.ts` (`OWNER_NAV_GROUPS`).

---

## Page Préférences

Grille **événement × canal** (style Hostaway) :

| Événement | Dashboard | WhatsApp staff |
|-----------|:---------:|:--------------:|
| Nouvelle réservation | ☑ | ☑ |
| Message OTA | ☑ | ☑ |
| … | | |

- Groupes collapsibles par facette
- Événements `critical` : dashboard **non désactivable** (icône cadenas + tooltip)
- GET/PUT `/notification/preferences`

Emplacement suggéré : onglet dans Settings existant ou route `/settings/notifications`.

---

## Hors scope v1

- ❌ Recréer le backend
- ❌ `sojori-dashboard` legacy
- ❌ Push navigateur / email
- ❌ Inbox admin plateforme (SuperAdmin agrégé)
- ❌ Page full `/notifications` historique (optionnel wireframe)

---

## Critères d’acceptation

- [ ] Cloche visible sur **toutes** les pages dashboard (TopBar persistante)
- [ ] Badge = `actionRequired` (nombre rouge/orange)
- [ ] Socket `NEW_NOTIFICATION` → refresh sans reload
- [ ] Filtres facettes avec compteurs
- [ ] Clic → deep link + marquer lu
- [ ] Préférences persistées (PUT)
- [ ] Guest journey ≠ Réservations visuellement
- [ ] Agrégation : `aggregatedCount > 1` affiché (« Relances ×3 »)
- [ ] Pas de régression sur Communications Hub

---

## Références doc backend (lecture seule)

Dans `sojori-production/docs/notifications/` :

- `05-architecture-cible.md` — schéma Mongo
- `02-taxonomie-evenements.md` — catalogue eventKeys
- `BRIEF-CLAUDE-DESIGN.md` — spec UX détaillée

---

## Livrables attendus de Claude Design

1. Composants React fonctionnels branchés sur l’API réelle
2. `NotificationBell` intégré dans `TopBar`
3. `NotificationProvider` au niveau shell
4. `socketEvents.ts` mis à jour (`NEW_NOTIFICATION`)
5. Section préférences (minimum viable)
6. Instructions test manuel : « nouvelle résa → badge +1 → clic → fiche résa »

**Ne pas commit** sans validation locale sur `http://127.0.0.1:3001/dashboard`.
