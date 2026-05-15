# 🤖 AGENTS SPÉCIALISÉS - NOMS & RÉSUMÉ

**Date** : 14 Mai 2026
**Mission** : Intégration APIs backend dans Sojori-orchestrator
**Référence complète** : `docs/AGENTS_SPECIALISES_INTEGRATION_API.md`

---

## 📋 LISTE DES 8 AGENTS

| # | Nom Agent | Module | Backend Service | Approche | Prompt |
|---|-----------|--------|-----------------|----------|--------|
| 1 | **Agent-Orchestration** | Orchestration | srv-orchestrator (4008) | From scratch | `docs/prompts/PROMPT_AGENT_ORCHESTRATION.md` |
| 2 | **Agent-Reservations** | Réservations | srv-reservations (4007) | From scratch | `docs/prompts/PROMPT_AGENT_RESERVATIONS.md` |
| 3 | **Agent-Calendrier** | Calendrier | srv-calendar (4006) | From scratch | `docs/prompts/PROMPT_AGENT_CALENDRIER.md` |
| 4 | **Agent-Inbox** | Messagerie | srv-chatbot (4000) | From scratch | `docs/prompts/PROMPT_AGENT_INBOX.md` |
| 5 | **Agent-Tasks** | Tâches | srv-task (4005) | From scratch | `docs/prompts/PROMPT_AGENT_TASKS.md` |
| 6 | **Agent-Annonces** | Annonces/Catalogue | srv-listing (4001) | From scratch | `docs/prompts/PROMPT_AGENT_ANNONCES.md` |
| 7 | **Agent-Dashboard** | Dashboard KPIs | srv-admin (4002) | **Réutiliser sojori-dashboard** | `docs/prompts/PROMPT_AGENT_DASHBOARD.md` |
| 8 | **Agent-Analytics** | Analytics | srv-admin (4002) | **Réutiliser sojori-dashboard** | `docs/prompts/PROMPT_AGENT_ANALYTICS.md` |

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

### Phase 1 : Quick Wins (réutiliser code existant)
1. **Agent-Dashboard** → Réutiliser sojori-dashboard (2-3h)
2. **Agent-Analytics** → Réutiliser sojori-dashboard (2-3h)

### Phase 2 : UI déjà créée (connecter API)
3. **Agent-Calendrier** → UI MultiPropertyInventory existe (2-3h)
4. **Agent-Reservations** → UI ReservationSejourPage existe (2-3h)

### Phase 3 : Nouveaux modules
5. **Agent-Orchestration** → Workflow automation (3-4h)
6. **Agent-Tasks** → Task management (3-4h)
7. **Agent-Annonces** → Listings + channels (3-4h)

### Phase 4 : Module complexe
8. **Agent-Inbox** → WhatsApp + OTA messages (4-5h)

**Total estimé** : 22-30 heures (3-4 jours de travail)

---

## 📊 RÉSUMÉ PAR AGENT

### 1️⃣ Agent-Orchestration
**Mission** : Workflows automation
**Fichiers à créer** :
- `src/services/orchestrationService.ts`
- `src/types/orchestration.types.ts`
- `src/pages/OrchestrationPage.tsx`

**Pages** :
- `/orchestration` - Liste + création workflows

**APIs backend** :
- GET/POST/PUT/DELETE /api/v1/workflows
- POST /api/v1/workflows/:id/execute
- GET /api/v1/executions

---

### 2️⃣ Agent-Reservations
**Mission** : Gestion réservations
**Fichiers à créer** :
- `src/services/reservationsService.ts`
- `src/types/reservations.types.ts`
- `src/pages/ReservationsListPage.tsx`

**Fichiers à modifier** :
- `src/pages/ReservationSejourPage.tsx` (remplacer mock data)

**Pages** :
- `/reservations/list` - Tableau réservations
- `/reservations/sejour` - Vue calendrier (déjà créée)

**APIs backend** :
- GET/POST/PUT/DELETE /api/v1/reservations
- GET /api/v1/reservations/calendar

---

### 3️⃣ Agent-Calendrier
**Mission** : Calendrier disponibilité + prix
**Fichiers à créer** :
- `src/services/calendarService.ts`
- `src/types/calendar.types.ts`

**Fichiers à modifier** :
- `src/pages/CalendarInventoryPage.tsx` (remplacer generateDays)
- `src/components/MultiPropertyInventory.tsx` (utiliser vraies données)

**Pages** :
- `/calendar` - Calendrier multi (déjà créée)

**APIs backend** :
- GET /api/v1/calendar/:propertyId/:month
- PUT /api/v1/calendar/prices
- PUT /api/v1/calendar/availability

---

### 4️⃣ Agent-Inbox
**Mission** : Messagerie WhatsApp + OTA
**Fichiers à créer** :
- `src/services/messagesService.ts`
- `src/types/messages.types.ts`
- `src/pages/WhatsAppGuestsPage.tsx`
- `src/pages/WhatsAppStaffPage.tsx`
- `src/pages/MessagesOTAPage.tsx`

**Pages** :
- `/communications/whatsapp-guests` - Chat guests
- `/communications/whatsapp-staff` - Chat staff
- `/communications/messages-ota` - Messages OTA

**APIs backend** :
- GET /api/v1/messages
- POST /api/v1/messages/send
- GET /api/v1/whatsapp/templates

---

### 5️⃣ Agent-Tasks
**Mission** : Gestion tâches équipe
**Fichiers à créer** :
- `src/services/tasksService.ts`
- `src/types/tasks.types.ts`
- `src/pages/TasksListPage.tsx`
- `src/pages/TasksTeamPage.tsx`
- `src/pages/TasksPlanningPage.tsx`

**Pages** :
- `/tasks/list` - Liste tâches
- `/tasks/team` - Équipe
- `/tasks/planning` - Planning Kanban

**APIs backend** :
- GET/POST/PUT/DELETE /api/v1/tasks
- PUT /api/v1/tasks/:id/status
- GET /api/v1/team

---

### 6️⃣ Agent-Annonces
**Mission** : Gestion annonces/listings
**Fichiers à créer** :
- `src/services/listingsService.ts`
- `src/types/listings.types.ts`
- `src/pages/ListingsPage.tsx`
- `src/pages/ListingDetailPage.tsx`
- `src/pages/ChannelsPage.tsx`
- `src/pages/PricingPage.tsx`

**Pages** :
- `/catalogue/listings` - Grille annonces
- `/catalogue/listings/:id` - Détail annonce
- `/catalogue/channels` - Canaux OTA
- `/catalogue/pricing` - Tarification

**APIs backend** :
- GET/POST/PUT/DELETE /api/v1/listings
- GET /api/v1/listings/:id/channels
- POST /api/v1/listings/:id/sync

---

### 7️⃣ Agent-Dashboard
**Mission** : Dashboard KPIs (RÉUTILISER sojori-dashboard)
**Référence** : `/Users/gouacht/sojori-dashboard`
**Fichiers à créer** :
- `src/services/dashboardService.ts` (copier de sojori-dashboard)
- `src/types/dashboard.types.ts`
- `src/pages/DashboardPage.tsx` (adapter design)

**Pages** :
- `/dashboard` - KPIs + charts

**APIs backend** :
- GET /api/v1/dashboard/stats
- GET /api/v1/dashboard/revenue
- GET /api/v1/dashboard/occupancy

**⚠️ IMPORTANT** : Copier la logique API de sojori-dashboard, adapter le design Aurora Soft Light

---

### 8️⃣ Agent-Analytics
**Mission** : Analytics détaillé (RÉUTILISER sojori-dashboard)
**Référence** : `/Users/gouacht/sojori-dashboard`
**Fichiers à créer** :
- `src/services/analyticsService.ts` (copier de sojori-dashboard)
- `src/types/analytics.types.ts`
- `src/pages/AnalyticsPage.tsx` (adapter design)

**Pages** :
- `/analytics` - Charts + filtres période

**APIs backend** :
- GET /api/v1/analytics/revenue
- GET /api/v1/analytics/occupancy
- GET /api/v1/analytics/performance
- GET /api/v1/analytics/export

**⚠️ IMPORTANT** : Copier la logique API + charts de sojori-dashboard, adapter le design Aurora Soft Light

---

## 🔧 COMMANDES POUR CHAQUE AGENT

### Démarrer le backend correspondant

```bash
cd /Users/gouacht/sojori-production

# Agent-Orchestration
docker-compose -f docker-compose-v2.yml up -d srv-orchestrator

# Agent-Reservations
docker-compose -f docker-compose-v2.yml up -d srv-reservations

# Agent-Calendrier
docker-compose -f docker-compose-v2.yml up -d srv-calendar

# Agent-Inbox
docker-compose -f docker-compose-v2.yml up -d srv-chatbot

# Agent-Tasks
docker-compose -f docker-compose-v2.yml up -d srv-task

# Agent-Annonces
docker-compose -f docker-compose-v2.yml up -d srv-listing

# Agent-Dashboard + Agent-Analytics
docker-compose -f docker-compose-v2.yml up -d srv-admin

# Tout démarrer en une fois
docker-compose -f docker-compose-v2.yml up -d
```

### Tester les APIs

```bash
# Health checks
curl http://localhost:4008/health  # Orchestrator
curl http://localhost:4007/health  # Reservations
curl http://localhost:4006/health  # Calendar
curl http://localhost:4000/health  # Chatbot (Inbox)
curl http://localhost:4005/health  # Tasks
curl http://localhost:4001/health  # Listing
curl http://localhost:4002/health  # Admin

# Tester une route
curl http://localhost:4008/api/v1/workflows
```

### Démarrer le frontend

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4174

# Ouvrir dans navigateur
open http://localhost:4174
```

---

## 📂 STRUCTURE FINALE ATTENDUE

Après le travail de tous les agents :

```
src/
├── services/
│   ├── orchestrationService.ts
│   ├── reservationsService.ts
│   ├── calendarService.ts
│   ├── messagesService.ts
│   ├── tasksService.ts
│   ├── listingsService.ts
│   ├── dashboardService.ts
│   └── analyticsService.ts
├── types/
│   ├── orchestration.types.ts
│   ├── reservations.types.ts
│   ├── calendar.types.ts
│   ├── messages.types.ts
│   ├── tasks.types.ts
│   ├── listings.types.ts
│   ├── dashboard.types.ts
│   └── analytics.types.ts
├── pages/
│   ├── OrchestrationPage.tsx
│   ├── ReservationsListPage.tsx
│   ├── ReservationSejourPage.tsx (modifié)
│   ├── CalendarInventoryPage.tsx (modifié)
│   ├── WhatsAppGuestsPage.tsx
│   ├── WhatsAppStaffPage.tsx
│   ├── MessagesOTAPage.tsx
│   ├── TasksListPage.tsx
│   ├── TasksTeamPage.tsx
│   ├── TasksPlanningPage.tsx
│   ├── ListingsPage.tsx
│   ├── ListingDetailPage.tsx
│   ├── ChannelsPage.tsx
│   ├── PricingPage.tsx
│   ├── DashboardPage.tsx
│   └── AnalyticsPage.tsx
└── App.tsx (toutes les routes ajoutées)
```

---

## ✅ CHECKLIST GLOBALE

### Avant de commencer
- [ ] Lire `AGENTS_SPECIALISES_INTEGRATION_API.md`
- [ ] Backend sojori-production accessible
- [ ] Docker Compose fonctionnel
- [ ] Frontend Sojori-orchestrator prêt

### Par agent
- [ ] Backend exploré (routes identifiées)
- [ ] Service créé
- [ ] Types créés
- [ ] Page(s) créée(s)
- [ ] Route(s) ajoutée(s)
- [ ] Tests passés
- [ ] Design Aurora Soft Light respecté

### Après tous les agents
- [ ] Toutes les pages fonctionnelles
- [ ] Toutes les APIs connectées
- [ ] Design cohérent partout
- [ ] Loading + Error states partout
- [ ] Application production-ready
- [ ] Documentation à jour
- [ ] Commit + Push

---

## 🎯 RÉSULTAT FINAL

**Dashboard Sojori complet avec** :
- ✅ 8 modules fonctionnels
- ✅ Toutes les APIs backend intégrées
- ✅ Design Aurora Soft Light cohérent
- ✅ UX fluide et performante
- ✅ Code TypeScript strict
- ✅ Ready for production 🚀

---

## 📝 PROMPTS DÉTAILLÉS

Chaque agent a un prompt détaillé dans `docs/prompts/` :

1. `PROMPT_AGENT_ORCHESTRATION.md` ✅ Créé
2. `PROMPT_AGENT_RESERVATIONS.md` (à créer)
3. `PROMPT_AGENT_CALENDRIER.md` (à créer)
4. `PROMPT_AGENT_INBOX.md` (à créer)
5. `PROMPT_AGENT_TASKS.md` (à créer)
6. `PROMPT_AGENT_ANNONCES.md` (à créer)
7. `PROMPT_AGENT_DASHBOARD.md` (à créer)
8. `PROMPT_AGENT_ANALYTICS.md` (à créer)

**Référence globale** : `AGENTS_SPECIALISES_INTEGRATION_API.md` (guide complet 700+ lignes)

---

**Prêt à lancer les agents ! 🚀**

**Ordre recommandé** :
1. Agent-Dashboard (quick win)
2. Agent-Analytics (quick win)
3. Agent-Calendrier (UI existe)
4. Agent-Reservations (UI existe)
5. Agent-Orchestration
6. Agent-Tasks
7. Agent-Annonces
8. Agent-Inbox
