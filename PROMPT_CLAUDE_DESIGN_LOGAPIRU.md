# Prompt Claude Design — Nouvel onglet « LogApiRU » (Sojori Orchestrator)

> Copier tout ce document dans Claude Design. Il contient le contexte produit, les données réelles disponibles, le design system Sojori, et les 3 vues à concevoir.

---

## 1. Contexte produit

**Sojori** est une plateforme de property management (conciergerie / location courte durée). Le dashboard admin est une app React (MUI + tokens custom) utilisée en interne par l'équipe ops.

Sojori est connecté au channel manager **Rental United (RU)** via une **API XML** (SOAP-like) : synchronisation des annonces, calendriers, prix, réservations, comptes owners, leads/messages. **Chaque échange requête/réponse XML est capturé en base** (collection MongoDB, rétention 30 jours) avec métadonnées d'audit riches.

**Problème actuel** : la vue existante des logs (`/channels`, onglet « API log (HTTP) ») est brute, très dense, illisible. On la garde telle quelle pour le debug bas niveau.

**Objectif** : concevoir un **nouvel onglet sidebar « LogApiRU »**, from scratch, qui offre :
1. Une **vue enrichie** — lisible, résumée, groupée par type d'API, avec contexte métier (listing, owner, réservation)
2. Une **vue échanges bruts** — les XML requête/réponse complets, mais présentés proprement
3. Une **vue synthèse/santé** — statistiques par type d'API (volumes, taux de succès, temps de réponse)

Cible : équipe ops technique interne. Desktop-first (écrans larges), pas de mobile prioritaire. Densité d'information élevée acceptée, mais **hiérarchie visuelle claire** — c'est le reproche principal fait à la vue actuelle.

---

## 2. Les données réelles disponibles (backend prêt, aucun endpoint à inventer)

### 2.1 Un enregistrement d'échange RU (collection `ChannelRuApiCall`)

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0d",
  "action": "Push_PutPrices_RQ",
  "status": "success",                    // 'success' | 'failed' | 'error'
  "statusCode": "0",                      // code RU : '0' = OK, '-5' = concurrence, '-6' = rate limit, 'ERROR'
  "responseMsg": "Success",
  "responseTime": 1234,                   // ms
  "createdAt": "2026-07-02T10:34:56.000Z",
  "auditContext": {
    "trigger": "channels.ru.outbound",    // source : outbound calendrier, listing-sync, reservations-pull, owner-ru-rest-proxy...
    "correlationId": "uuid-...",          // trace les opérations multi-appels (batch)
    "userId": "owner-123",
    "route": "POST /internal/listings/sync",
    "listingIds": ["listing-123"],
    "ownerIds": ["owner-456"],
    "roomTypeIds": ["room-789"],
    "modificationSource": "cron"          // manual | cron | webhook | dynamic-pricing...
  },
  "requestXml": "<Push_PutPrices_RQ>...</Push_PutPrices_RQ>",     // XML brut complet
  "responseXml": "<Push_PutPrices_RS>...</Push_PutPrices_RS>",    // XML brut complet
  "requestPayload": { },                  // requête structurée en JSON (sans auth)
  "responseJson": { }                     // réponse parsée en JSON
}
```

### 2.2 Les ~36 types d'API RU, en 2 familles et ~6 catégories

**Familles** : `Push` (Sojori → RU) et `Pull` (RU → Sojori).

| Catégorie | Exemples d'actions |
|---|---|
| **Calendrier** | `Push_PutAvbUnits_RQ` (disponibilités), `Push_PutPrices_RQ` (prix), `Push_PutLongStayDiscounts_RQ`, `Push_PutLastMinuteDiscounts_RQ`, `Push_PutSeasons_RQ`, `Pull_ListPropertyAvailabilityCalendar_RQ`, `Pull_ListPropertyPrices_RQ` |
| **Réservations** | `Pull_ListReservations_RQ`, `Push_ConfirmReservation_RQ`, `Push_PutConfirmedReservationMulti_RQ`, `Push_ModifyStay_RQ`, `Push_CancelReservation_RQ` |
| **Annonces (Listings)** | `Push_PutProperty_RQ`, `Push_PutBuilding_RQ`, `Pull_ListProperties_RQ`, `Pull_ListSpecProp_RQ`, `Pull_GetPropertyExternalListing_RQ` |
| **Owners / Comptes** | `Push_FillCompanyDetails_RQ`, `Push_CreateUser_RQ`, `Push_ArchiveUser_RQ`, `Pull_ListMyUsers_RQ` |
| **Leads / Messaging** | `Pull_GetLeads_RQ` |
| **Dictionnaires** | `Pull_ListAmenities_RQ`, `Pull_ListLanguages_RQ`, `Pull_ListLocations_RQ` |

Chaque action a un **displayName** français dans le catalogue backend (ex. `Push_PutPrices_RQ` → « Mise à jour des prix »).

### 2.3 Endpoints disponibles

1. **Liste paginée** — `GET /api-calls` : filtres `status`, `action`, `timeRange` (15m/1h/6h/24h/7d/30d), `startTime`/`endTime`, `minResponseTime`, `calendarScope`, `ownerRuQueue` ; pagination (limit max 200)
2. **Stats globales** — `GET /api-calls/stats` : `{ total, errors, slowQueries (>5s), avgResponseTime }`
3. **Détail d'un appel** — `GET /api-calls/:id` : document complet avec les XML
4. **Catalogue + usage** — `GET /ru-apis/catalog` : les 36 APIs avec `{ type, category, integrationStatus, usage: { totalCalls, successRate, avgResponseTime, lastUsed, lastStatus } }` sur 30 jours
5. **Deep-dive par API** — `GET /ru-apis/:apiName` : détail d'une API + 100 derniers appels

---

## 3. Design system Sojori (à respecter strictement)

```js
const tokens = {
  // Marque (or Sojori)
  primary:      '#E6B022',   // gold
  primaryDeep:  '#B8881A',
  primarySoft:  '#F4CF5E',
  primaryTint:  'rgba(230,176,34,0.10)',
  // Accent AI
  ai:           '#8B5CF6',   // violet
  aiTint:       'rgba(139,92,246,0.10)',
  // Sémantique
  success:      '#0a8f5e',
  warning:      '#c46506',
  error:        '#c81e1e',
  info:         '#0673b3',
  // Fonds (neutres chauds)
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#f0eee8', bg3: '#e7e4dc',
  // Texte
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  // Bordures
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};
```

- Thème clair uniquement, neutres chauds, cartes blanches `borderRadius: 10px`, bordures fines.
- Composants existants réutilisables : **Panel** (carte), **Badge** (success/warning/error/info), **ViewToggle** (onglets en chips), tables avec lignes expandables.
- Typo : sans-serif système, tailles compactes (12–14px pour la donnée, 11px pour les labels).
- Conventions visuelles suggérées : **Push** vs **Pull** différenciés visuellement (ex. flèche ↑ or / flèche ↓ bleu, ou badges directionnels) ; catégories avec code couleur discret.

---

## 4. Les 3 vues à concevoir

### Vue A — « Synthèse » (landing de l'onglet)
- **Bandeau KPI** : total appels (période), taux d'erreur, appels lents (>5s), temps de réponse moyen — avec sélecteur de période (1h / 6h / 24h / 7j / 30j)
- **Santé par API** : grille ou table des ~36 APIs regroupées par catégorie (Calendrier, Réservations, Annonces, Owners, Leads, Dictionnaires) — pour chaque API : displayName FR, direction Push/Pull, volume, taux de succès (mini-jauge ou sparkline), temps moyen, dernier appel + son statut
- Une API en erreur récente doit **sauter aux yeux** (état dégradé visible au premier regard)
- Clic sur une API → filtre la Vue B sur cette action

### Vue B — « Journal » (échanges enrichis, cœur de l'onglet)
- **Liste chronologique** paginée des échanges, une ligne = un appel, lisible sans expansion :
  - Heure (relative + absolue au survol)
  - Direction (Push/Pull) + catégorie (pastille couleur)
  - **Libellé humain** de l'action (ex. « Mise à jour des prix ») avec l'action technique en secondaire
  - Statut (badge sémantique) + code RU si erreur (`-5` concurrence, `-6` rate limit → libellés explicites)
  - Durée (ms, coloré si lent)
  - **Contexte métier** : chips listing / owner / réservation issus de l'auditContext
  - Source du déclenchement (cron, manuel, webhook, dynamic-pricing…)
- **Groupement par correlationId** : les appels d'un même batch visuellement liés (ex. bordure/indentation ou ligne parent repliable « Sync listing X — 4 appels »)
- **Barre de filtres** : période, statut, direction, catégorie, action précise, durée min, recherche listing/owner
- Clic sur une ligne → ouvre la Vue C (drawer latéral large ou expansion)

### Vue C — « Détail d'un échange » (le brut, mais propre)
- En-tête : action + displayName, statut, durée, date, contexte métier complet, trigger, correlationId (cliquable → voir les appels liés)
- **Deux panneaux Requête / Réponse** (côte à côte ou onglets) :
  - Toggle **XML brut** (pretty-printed, coloration syntaxique, repliable par nœud si possible) ↔ **JSON parsé**
  - Boutons copier
- Si erreur : encart d'erreur proéminent avec `statusCode` + `responseMsg` traduits en langage clair
- Navigation précédent/suivant entre les appels du journal sans fermer le détail

### Navigation interne de l'onglet
`LogApiRU` dans la sidebar → 3 sous-onglets (ViewToggle) : **Synthèse | Journal | (détail en drawer, pas un onglet)**. URL pilotée par search params (`?tab=LogApiRU&view=journal&callId=...`).

---

## 5. Livrables attendus

1. **Maquettes HTML/CSS haute fidélité** des 3 vues (desktop ~1440px), avec données réalistes issues des exemples ci-dessus (mélanger succès, erreurs `-6` rate limit, appels lents, batchs corrélés)
2. Un fichier **`_shared`** avec tokens + composants réutilisables (pattern déjà utilisé dans ce projet : cf. `src/components/calendar-views/_shared.tsx`)
3. États à couvrir : loading (skeleton), vide (aucun appel sur la période), erreur de chargement
4. Micro-interactions : hover lignes, expansion, transitions drawer

**Fidélité 100% attendue à l'intégration** — les maquettes seront transposées telles quelles en React/MUI.
