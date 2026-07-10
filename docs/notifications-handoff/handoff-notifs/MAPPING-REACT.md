# Mapping prototype → composants React/MUI

Correspondance entre la maquette (`prototype/`) et le code à produire.
Le prototype est en JS vanille pour rester lisible ; chaque bloc a son équivalent React.

## Fichiers

| Prototype | React cible | Contenu |
|-----------|-------------|---------|
| `notifs/data.js` → `NOTIF_FACETS`, `NOTIF_PRIORITY` | `types.ts` + constantes | Enums facettes/priorités + tokens couleur |
| `notifs/data.js` → `EVENT_CATALOG` | `GET /event-catalog` | Catalogue eventKeys (préférences) |
| `notifs/data.js` → `NOTIFICATIONS` | `GET /notification/` | Réponse liste |
| `notifs/data.js` → `unreadCount()` (calculé dans app.js) | `GET /unread-count` | `{ total, actionRequired, byFacet }` |
| `notifs/app.js` → `renderBell` | `NotificationBell.tsx` | Badge = `actionRequired`, ring à l'arrivée |
| `notifs/app.js` → `renderPanel` | `NotificationPanel.tsx` | Popover/Drawer, tabs, footer |
| `notifs/app.js` → `rowHtml` | `NotificationRow.tsx` | Icône facette + pastille priorité + contexte + actions |
| `notifs/app.js` → chips dans `renderPanel` | `NotificationFacetChips.tsx` | Chips + compteurs `byFacet` |
| `notifs/app.js` → `showToast` | `NotificationToast.tsx` | Auto-dismiss 6s, Voir/Plus tard |
| `notifs/app.js` → `renderPrefs`/`prefRow` | `NotificationPreferencesSection.tsx` | Grille, verrou critical |
| `notifs/app.js` → `pushLive`/`triggerLive` | socket handler dans `NotificationProvider.tsx` | `NEW_NOTIFICATION` |
| `notifs/app.js` → `markRead`/`setStatus`/`markAllRead` | mutations `useNotifications.ts` | PUT read / status / read-all |

## Détails de comportement (déjà implémentés dans app.js — copie la logique)

- **`unreadCount()`** montre le calcul exact de `total` / `actionRequired` / `byFacet`
  (n'exclut ni `dismissed` ni `expired`). Côté prod, ces valeurs viennent de l'API —
  ne les recalcule pas, mais la logique t'indique la sémantique attendue.
- **`isActionRequired(n)`** = `(priority critical|high) && (status created|pending)` → onglet + badge.
- **`isUnread(n)`** = `readAt === null` → style ligne non lue.
- **`routeForLink(linkPath)`** = exemple de résolution de deep link ; en prod, `navigate(n.linkPath)`.
- **`animateOut`** : sortie de ligne à la validation (Terminer/Ignorer) — équivalent optimistic update.

## Tokens (dashboardTokens.ts)

```
primary #E6B022 · primaryDeep #B8881A · primarySoft #F4CF5E
error #c81e1e (critical) · warning #c46506 (high) · info #0673b3 (normal) · text3 #7a756c (low)
bg0 #f6f5f1 · bg1 #fff · bg2 #f0eee8 · border rgba(20,17,10,0.07)
```

## Facettes (couleurs + icônes, à garder identiques)

| facet | couleur | icône | sidebar |
|-------|---------|-------|---------|
| reservation | `#0673b3` | 🗓 | Réservations |
| guest_journey | `#0a8f5e` | 🧭 | Orchestration |
| orchestration | `#B8881A` | ⚙️ | Orchestration |
| message | `#8B5CF6` | 💬 | Inbox Guest |
| task | `#c46506` | ✅ | Task |
| concierge | `#0e7490` | 🛎 | Task |
| finance | `#0a8f5e` | 💰 | Finances |
| review | `#d97706` | ⭐ | Inbox Guest |
| lead | `#db2777` | 🎯 | Inbox Guest |

> ⚠️ En MUI, remplace les emojis par des icônes `@mui/icons-material` si la charte l'exige
> (ex. `EventOutlined`, `ExploreOutlined`, `SettingsSuggestOutlined`, `ChatBubbleOutline`,
> `CheckCircleOutline`, `RoomServiceOutlined`, `PaymentsOutlined`, `StarBorder`, `TrackChangesOutlined`).
