# AI-READ-API-PARITY — Carte API Dashboard ↔ Orchestrator

> **Fichier à lire en premier** pour tout agent IA qui compare ou migre les appels API entre :
> - **Ancien** : `/Users/gouacht/sojori-dashboard` (CRA, React)
> - **Nouveau** : `/Users/gouacht/Sojori-orchestrator` (Vite, TypeScript)
> - **Backend** : `/Users/gouacht/sojori-production` (microservices `srv-*`)

**Dernière mise à jour** : 2026-05-15  
**Tests automatisés** : `node scripts/test-api-parity-all.mjs` (depuis la racine de Sojori-orchestrator)

---

## Environnement `dev.sojori.com` — accès agents (sans JWT)

L’ingress **dev** peut assouplir l’auth pour certains **GET** ; ce n’est **pas** « tout ouvert » de façon homogène. **Smoke réel** (`node scripts/test-api-parity-all.mjs` sans token, 2026-05) :

| Zone | Sans Bearer |
|------|-------------|
| `GET /api/v1/task/tasks/search` | **200** si param **`ownerId`** (dummy ou `SOJORI_TEST_OWNER_ID`) |
| `GET /api/v1/task/staff-simplified` | **200** |
| `GET /api/v1/orchestrator/...` | **200** (liste, stats) |
| `GET /api/v1/crm/appointments` | **200** |
| `GET /api/v1/listing/listings` (et stats) | **401** « Unauthorized access » (auth encore exigée côté srv-listing) |
| `GET /api/v1/reservations/reservations` (et stats) | **401** idem |
| `/api/v1/user/auth/...` | JWT / refresh |
| `/api/v1/ai/...` | JWT ou règle dédiée |
| `GET /api/v1/calendar/calendar/occupancy-rate` | **`authenticateJWT`** (`srv-calendar`) → **401** sans Bearer |
| `GET /api/v1/admin/dashboard/overview` | Peut **500** si sous-appel **`/api/v1/message/get-message-kpis-live`** → **401** |
| `GET /api/v1/admin/analytics/snapshot` | **`period`** ∈ `7d`, `30d`, `3m`, `1y`, `custom` ; peut **timeout** serveur |

**Production** : JWT partout. Pas de secrets dans ce dépôt.

**Script** : sans token, les cas fragiles sont **ignorés** (smoke vert : tâches + orchestrator + CRM). **`--strict`** pour tout exécuter ; **`SOJORI_API_TOKEN`** pour la matrice complète.
## Démarrage rapide (agent IA)

```bash
cd /Users/gouacht/Sojori-orchestrator

# Optionnel : JWT (recommandé pour parité « comme le navigateur » et routes encore protégées)
export SOJORI_API_TOKEN="eyJ..."
# Optionnel : CORS localhost → prod
export SOJORI_DEV_TOKEN="..."   # = VITE_DEV_TOKEN dans .env

# Lancer la batterie de tests GET (lecture seule) — smoke sans token : 5 cas (tasks + orchestrator + CRM)
node scripts/test-api-parity-all.mjs

# Tous les cas même sans JWT (beaucoup d’échecs attendus)
node scripts/test-api-parity-all.mjs --strict

# Détail d’un domaine
node scripts/test-api-parity-all.mjs --only=auth,reservations,messages
```

**Docs complémentaires** (détail par endpoint WhatsApp, réservations, etc.) :
- `docs/API-COMPARISON-SOJORI-DASHBOARD-VS-ORCHESTRATOR.md`
- `docs/API_COMPARISON_TEST_GUIDE.md`
- `docs/GUIDE_POUR_AGENTS_IA_FUTURS.md`

---

## Légende statuts

| Statut | Signification |
|--------|----------------|
| **SAME** | Même URL + même service backend ; client TS vs JS seulement |
| **PARTIAL** | Même microservice, chemin ou params différents |
| **ORCH_ONLY** | Implémenté dans orchestrator, pas encore branché sur l’ancien dashboard |
| **DASH_ONLY** | Encore utilisé dans dashboard, pas migré dans orchestrator |
| **MOCK** | Page orchestrator en mock / localStorage, pas d’API live |

---

## Tableau maître — domaines migrés (priorité produit)

| ID | Méthode | Endpoint (relatif `/api/v1/...`) | Dashboard — service → page(s) | Orchestrator — service → route | Statut |
|----|---------|-----------------------------------|----------------------------------|--------------------------------|--------|
| **AUTH** |
| A1 | POST | `user/auth/login` | `redux/api/AuthApi.js` → login | `authService.ts` → `/login` | SAME |
| A2 | GET | `user/auth/me` | Auth slice / layout | `authService.ts` → `AuthContext` | SAME |
| A3 | GET | `user/auth/valid-token-check` | axios interceptors | `apiClient.ts` interceptor | SAME |
| A4 | POST | `user/auth/logout` | Auth | `authService.ts` | SAME |
| **RÉSERVATIONS** |
| R1 | GET | `reservations/reservations?dateType&startDate&endDate` | `serverApi.reservation.jsx` `getReservations` → `reservation.page.jsx` | `reservationsService.getList` → `/reservations` | SAME |
| R2 | GET | `reservations/by-id/:id` | `getReservationsById` → `reservation-detail.jsx`, calendrier | `reservationsService.getById` → `/reservations/:id` | SAME |
| R3 | — | create / update / cancel | `serverApi.reservation.jsx` (plusieurs modals) | *commenté TODO* dans `reservationsService.ts` | DASH_ONLY |
| R4 | GET | `reservations/planning` | `fetchReservationsPlanning` → `useTimelineData.js` | — | DASH_ONLY |
| **TÂCHES** |
| T1 | GET | `task/tasks/search` | `TasksNew.jsx` → `tasks-new/search` (legacy) | `tasksService.getTasks` → `/tasks`, `/tasks/list` | PARTIAL |
| T2 | GET | `task/tasks-new/search` | `timelineApi.js` `fetchSearchTasksForStaff` → Staff view | `tasksService` utilise `/tasks/search` | PARTIAL |
| T3 | GET | `task/tasks/get-tasks` | `serverApi.task.jsx` → anciennes pages tâches | — | DASH_ONLY |
| T4 | POST | `task/tasks` | `create-task` legacy | `tasksService.createTask` | PARTIAL |
| T5 | PUT | `task/tasks/:id/assign` | `assign-task/:id` legacy | `tasksService.assignTask` → `/tasks/:id/assign` | PARTIAL |
| T6 | GET | `task/staff-simplified` | `serverApi.staffSimplified.js` | `tasksService.getStaff` → `/tasks/team` | SAME |
| T7 | GET | `task/listings` | tâches / filtres | `tasksService.getListings` | ORCH_ONLY |
| **MESSAGERIE (WhatsApp / debug)** |
| M1 | GET | `ai/debug/conversations` | `communicationsApi.js` `whatsappApi` → `WhatsAppTabNew.jsx` | `messagesService.getConversations` → `/communications/whatsapp-guests` | SAME |
| M2 | GET | `ai/debug/conversations/:phone` | `whatsappApi.getMessages` | `messagesService.getConversationMessages` | SAME |
| M3 | GET | `ai/debug/messages/:phone` | `whatsappApi.getRawMessages` | `messagesService.getRawMessages` | SAME |
| M4 | POST | `ai/debug/send-message` | `whatsappApi.sendMessage` | `messagesService.sendMessage` | SAME |
| M5 | GET | `ai/debug/storage-stats` | monitoring / debug | `messagesService.getStorageStats` | ORCH_ONLY |
| **OTA / Channex** |
| O1 | GET | `reservations/rentals/get-thread` | `communicationsApi` `otaMessagesApi` → `OTAMessagesTab.jsx` | `MessagesOTAPage` filtre `channel_name` sur M1 | PARTIAL |
| O2 | POST | `reservations/rentals/send-message` | OTA tab | `OTAMessagesPage.tsx` → **MOCK** UI | MOCK |
| O3 | POST | `reservations/channex/send-msg-by-channex` | messages / résa | — | DASH_ONLY |
| **LISTINGS** |
| L1 | GET | `listing/listings` | `serverApi.listing.js` | `listingsService` → `/listings`, catalogue | SAME |
| L2 | GET | `listing/listings/by-id/:id` | listing forms | `listingsService.getById` → `/listings/:id` | SAME |
| L3 | POST | `listing/listings/create` | create property | `listingsService.create` → `NewListingFormPage` | SAME |
| L4 | PUT | `listing/listings/update/:id` | update | `listingsService.update` | SAME |
| L5 | GET | `listing/listings/stats` | dashboard listing | `listingsService` / `dashboardService` | SAME |
| **CALENDRIER / INVENTAIRE** |
| C1 | GET | `calendar/:listingId/calendar` | `serverApi.calendar.js` | `calendarService.getMonthCalendar` → `/calendar` | SAME |
| C2 | PUT | `calendar/update-calendar` | calendrier | `calendarService.updateCalendar` | SAME |
| C3 | GET | `calendar/inventory/get-inventory` | `getInventoryForListings` → `InventoryCalendarNew.jsx` | `calendarService.getInventoryForListings` | SAME |
| **DASHBOARD / ANALYTICS** |
| D1 | GET | `admin/dashboard/overview` | charts / ultimate dashboard | `dashboardService.getSnapshot` → `/dashboard` | SAME |
| D2 | GET | `listing/listings/stats` | stats | `dashboardService` (agrégé) | SAME |
| D3 | GET | `reservations/reservations/stats` | stats | `dashboardService` | SAME |
| D4 | GET | `message/get-message-kpis-live` | KPIs messages | `dashboardService` | SAME |
| D5 | GET | `admin/analytics/snapshot` | — | `analyticsService` → `/analytics` | ORCH_ONLY |
| **ORCHESTRATION** |
| OCH1 | GET | `orchestrator/reservations` | `OrchestrationView.jsx` (fetch custom) | `orchestrationService.getOrchestrationPlans` → `/orchestration/plans` | PARTIAL |
| OCH2 | GET | `orchestrator/reservations/:code` | timeline / détail | `getOrchestrationPlanDetail` | PARTIAL |
| OCH3 | GET | `orchestrator/orchestration/stats` | stats header | `getOrchestrationStats` | SAME |
| OCH4 | POST | `orchestrator/reservations/:code/cancel` | annulation | `cancelOrchestrationPlan` | SAME |
| OCH5 | GET | `reservations/:id/timeline` | `timelineApi.js` | `OrchestrationPage` (partiel) | PARTIAL |
| OCH6 | — | config mail / task templates | `serverApi.orchestratorConfig.js` → Config views | `OrchestrationConfigPage` → **MOCK** | MOCK |
| **CRM** |
| CR1 | GET | `crm/appointments` | démo / onboarding CRM | `CRMPage` (à brancher) | DASH_ONLY / ORCH_ONLY |

---

## Pages orchestrator → services (référence routes)

| Route orchestrator | Fichier page | Service(s) API |
|--------------------|--------------|----------------|
| `/dashboard` | `DashboardPage.tsx` | `dashboardService` |
| `/analytics` | `AnalyticsPage.tsx` | `analyticsService` |
| `/reservations` | `ReservationsPage.tsx` | `reservationsService` |
| `/reservations/:id` | `ReservationSejourPage.tsx` | `reservationsService` |
| `/calendar` | `CalendarInventoryPage.tsx` | `calendarService`, `listingsService` |
| `/tasks`, `/tasks/list` | `TasksListPage.tsx` | `tasksService` |
| `/tasks/team` | `TasksTeamPage.tsx` | `tasksService` |
| `/tasks/planning` | `TasksPlanningPage.tsx` | `tasksService` |
| `/communications/whatsapp-guests` | `WhatsAppGuestsPage.tsx` | `messagesService` |
| `/communications/whatsapp-staff` | `WhatsAppStaffPage.tsx` | `messagesService` |
| `/communications/messages-ota` | `MessagesOTAPage.tsx` | `messagesService` (filtre OTA) |
| `/communications/whatsapp` | `CommsPage.tsx` | **MOCK** (conversations locales) |
| `/communications/ota` | `OTAMessagesPage.tsx` | **MOCK** + templates compose |
| `/orchestration/plans` | `OrchestrationPlansPage.tsx` | `orchestrationService` |
| `/orchestration`, `/orchestration/timeline/:id` | `OrchestrationPage.tsx` | `orchestrationService` + mock timeline |
| `/listings`, `/catalogue/listings` | `ListingsOverviewPage.tsx` | `listingsService` |
| `/listings/:id` | `NewListingFormPage.tsx` | `listingsService` |
| `/login` … | `LoginPage.tsx` etc. | `authService` |

---

## Pages dashboard clés → services (référence)

| Zone produit | Page dashboard | Fichier API principal |
|--------------|----------------|------------------------|
| Réservations liste | `reservation.page.jsx` | `serverApi.reservation.jsx` |
| Détail résa | `reservation-detail.jsx` | `serverApi.reservation.jsx` |
| Calendrier inventaire | `InventoryCalendarNew.jsx` | `serverApi.calendar.js` + résa |
| Tâches nouvelle UI | `TasksNew.jsx` | `tasks-new/search` (axios direct) |
| Tâches legacy | divers | `serverApi.task.jsx` |
| WhatsApp inbox | `WhatsAppTabNew.jsx` | `communicationsApi.js` |
| OTA inbox | `OTAMessagesTab.jsx` | `communicationsApi.js` `otaMessagesApi` |
| Orchestration | `OrchestrationView.jsx`, `NewWorkflowTimeline.jsx` | mix orchestrator + comms + `timelineApi.js` |
| Listings | formulaires listing | `serverApi.listing.js` |
| Settings orchestration | `ConfigOrchestrationView.jsx` | `serverApi.orchestratorConfig.js` |

---

## Ce qui n’est PAS encore testé automatiquement

- WebSockets (`SOCKET_URL` dans `serverApi.reservation.jsx`)
- Upload médias / signed-url GCS
- Monitoring (Grafana, RabbitMQ, DLQ) — pages `/monitoring/*` dashboard only
- Financial, dynamic pricing, Minut, Channex hub — **DASH_ONLY**
- POST destructifs (cancel plan, send message) — script en mode `--read-only` par défaut

---

## Checklist manuelle après `test-api-parity-all.mjs`

1. Ouvrir **dashboard** : `sojori-dashboard` → login → Réservations, WhatsApp, Tâches.
2. Ouvrir **orchestrator** : `pnpm dev` → mêmes écrans.
3. Comparer Network tab : même host `dev.sojori.com` (ou ports locaux 400x), mêmes paths que colonne Endpoint ci-dessus.
4. Noter les écarts dans ce fichier (section « Écarts constatés » ci-dessous).

### Écarts constatés (à remplir par l'agent suivant)

| Date | ID | Observation | Action |
|------|-----|-------------|--------|
| 2026-05-15 | R1 | 404 sur `/api/v1/reservations/reservations` causé par X-Dev-Token désactivé dans `apiClient.ts` | ✅ RÉSOLU: Re-enabled X-Dev-Token (lignes 30-44). Backend a `DISABLE_AUTH=true`, Ingress autorise X-Dev-Token dans CORS. Restart dev server requis. |
| 2026-05-15 | AUTH | Backend srv-reservations avec `DISABLE_AUTH=true` fonctionne sans JWT, mais CORS requiert X-Dev-Token pour localhost→prod | Confirmé via `curl` direct. X-Dev-Token ≠ auth, c'est pour CORS seulement. |
| 2026-05-15 | R1 | Endpoint path: Backend supporte `/reservations/reservations` (legacy) ET `/reservations` (moderne) via routes L32-34 `index.ts` | Utiliser `/reservations/reservations` pour compatibilité old dashboard |
| 2026-05-15 | R1 | Response structure: Backend retourne `{success, data[], unmappedReservation[], total}` pas array direct | Frontend doit extraire `response.data.data` - déjà fixé ligne 92 `reservationsService.ts` |

---

## Fichiers source à grep en priorité

**Orchestrator** : `src/services/*.ts`, `src/config/authConfig.ts`  
**Dashboard** : `src/features/*/services/serverApi*`, `src/features/communications/services/communicationsApi.js`, `src/config/backendServer.config.js`  
**Backend routes** : `sojori-production/apps/srv-*/src/routes/`
