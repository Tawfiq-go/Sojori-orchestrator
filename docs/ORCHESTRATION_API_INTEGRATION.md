# 🟣 Orchestration API Integration

**Date**: 14 Mai 2026  
**Agent**: Agent-Orchestration  
**Backend**: srv-orchestrator (port 4008)  
**Frontend**: Sojori-orchestrator (port 4000)

---

## 📦 Fichiers Créés

### 1. Service Layer
**`src/services/orchestrationService.ts`** (152 lignes)
- Client API TypeScript pour srv-orchestrator
- 6 fonctions principales:
  - `getOrchestrationPlans()` - Liste des plans avec filtres
  - `getOrchestrationPlanDetail()` - Détail d'un plan
  - `cancelOrchestrationPlan()` - Annulation d'un plan
  - `getOrchestrationStats()` - Statistiques globales
  - `getOrchestrationPlansList()` - Alias pour liste simple
  - `getOrchestrationPlanByCode()` - Alias pour détail

### 2. Types TypeScript
**`src/types/orchestration.types.ts`** (300 lignes)
- Types complets mappés depuis WorkflowOrchestrationPlan (backend)
- Interfaces principales:
  - `CategoryWorkflow` - Workflow individuel avec actions
  - `OrchestrationPlan` - Plan résumé (liste)
  - `OrchestrationPlanDetail` - Plan complet (détail)
  - `OrchestrationStats` - Statistiques globales
  - `GetPlansParams` - Paramètres de requête
  - Actions: `RequestTimeslotAction`, `AssignStaffAction`, `DeadlineEscalationAction`, `SendNotificationAction`

### 3. Page UI
**`src/pages/OrchestrationPlansPage.tsx`** (630 lignes)
- Page complète avec liste + détail modal
- Features:
  - Tableau avec 7 colonnes (Réservation, Voyageur, Listing, Dates, Statut, Workflows, Actions)
  - Filtres: Statut (ACTIVE/COMPLETED/CANCELLED/ALL), Tri (recent/oldest/checkin)
  - Stats cards: Total/Actifs/Terminés/Actions en attente
  - Modal détail avec 4 tabs: Actifs/Terminés/Échecs/Tous
  - Affichage détaillé des workflows avec:
    - Registration stats (voyageurs validés/draft/non enregistrés)
    - Declaration info (statut déclaration + méthode)
    - Actions orchestration (demande créneau, assignation staff)
    - Actions notification (envoi messages)
  - Action "Annuler plan" avec confirmation

### 4. Route
**`src/App.tsx`** (modifié)
- Ajout de l'import `OrchestrationPlansPage`
- Ajout de la route `/orchestration/plans`

### 5. Documentation
- **`.env.example.orchestrator`** - Variables d'environnement
- **`docs/ORCHESTRATION_API_INTEGRATION.md`** - Ce fichier

---

## 🚀 Utilisation

### 1. Configuration Backend

**Démarrer srv-orchestrator avec docker-compose:**
```bash
cd /Users/gouacht/sojori-production
docker-compose -f docker-compose-v2.yml up -d srv-orchestrator
```

**Vérifier que srv-orchestrator est actif:**
```bash
curl http://localhost:4008/health
```

**Résultat attendu:**
```json
{
  "service": "srv-orchestrator",
  "version": "1.0.0",
  "status": "healthy",
  "mongodb": "connected",
  "rabbitmq": "connected",
  "ready": true
}
```

### 2. Configuration Frontend

**Créer `.env.local` dans Sojori-orchestrator:**
```bash
echo "VITE_SRV_ORCHESTRATOR_URL=http://localhost:4008" > .env.local
```

**Démarrer le frontend:**
```bash
cd /Users/gouacht/Sojori-orchestrator
npm run dev
```

### 3. Accéder à la page

**URL:** http://localhost:4000/orchestration/plans

**Navigation:**
- Dashboard > Pilotage > Orchestration API > Plans

---

## 📊 API Endpoints Backend

### GET `/api/v1/orchestrator/reservations`
Liste des plans d'orchestration avec filtres

**Query Params:**
- `limit` (number, default: 50) - Nombre de résultats
- `offset` (number, default: 0) - Pagination offset
- `listingId` (string, optional) - Filtrer par listing
- `reservationStatus` (enum, default: 'ACTIVE') - ACTIVE | COMPLETED | CANCELLED | ALL
- `sortBy` (enum, default: 'recent') - recent | oldest | checkin_asc | checkin_desc

**Response:**
```typescript
{
  success: true,
  data: OrchestrationPlan[],
  pagination: { limit, offset, total, countOnPage },
  filters: { listingId, reservationStatus, sortBy }
}
```

### GET `/api/v1/orchestrator/reservations/:reservationNumber`
Détail d'un plan d'orchestration

**Response:**
```typescript
{
  success: true,
  data: {
    reservationCode: string,
    planId: string,
    systemType: 'new',
    workflows: CategoryWorkflow[],
    // ... metadata
  }
}
```

### POST `/api/v1/orchestrator/reservations/:reservationNumber/cancel`
Annuler un plan d'orchestration

**Body:**
```json
{
  "reason": "Manually cancelled by admin"
}
```

**Response:**
```typescript
{
  success: true,
  message: "Plan cancelled for RESA-1234",
  data: { planId, cancelledAt, reason }
}
```

### GET `/api/v1/orchestrator/orchestration/stats`
Statistiques globales

**Response:**
```typescript
{
  success: true,
  data: {
    plans: { total, active, completed, withoutPlan },
    actions: { pending }
  }
}
```

---

## 🔍 Types de Workflows

### Mode ORCHESTRATION
Workflows avec interactions client + staff + deadlines

**1. RequestTimeslotAction (Demande Créneau)**
- Template WhatsApp/Email envoyé au client
- Deadline avec relances automatiques
- Réponse client enregistrée (timeslot choisi)

**2. AssignStaffAction (Assignation Staff)**
- Stratégie: PRIORITY | ROUND_ROBIN | MANUAL
- Tentatives jour J, J+1, J+2 avec retry
- Historique complet des tentatives
- Staff assigné + acceptation

**3. DeadlineEscalationAction (Escalade Deadline)**
- Escalade ADMIN | OWNER si deadline dépassée
- Notification automatique
- Résolution manuelle ou auto-resolve

### Mode NOTIFICATION_ONLY
Messages simples sans interaction

**SendNotificationAction**
- Template WhatsApp/Email/OTA
- Timing: IMMEDIATE, BEFORE_CHECKIN, AFTER_CHECKOUT, etc.
- Condition: ALWAYS | IF_NOT_DONE
- Envoi automatique à la date prévue

---

## 🎨 Design Patterns

### Colors
- **Purple** (#8b5cf6) - Orchestration theme color
- **Success** (#10b981) - Completed workflows
- **Warning** (#f59e0b) - Pending/In Progress
- **Error** (#ef4444) - Failed workflows
- **Info** (#06b6d4) - Notifications

### Components DashboardV2
- `Panel` - Conteneur avec bordure et padding
- `PageHeader` - En-tête avec titre + actions
- `Badge` - Chips avec variants (success/warning/error/neutral)

### Status Mapping
```typescript
PENDING → warning (orange)
IN_PROGRESS → info (cyan)
COMPLETED / EXECUTED → success (green)
FAILED → error (red)
CANCELLED / SKIPPED → text3 (gray)
```

---

## ✅ Fonctionnalités Implémentées

### Liste Plans
- [x] Tableau avec filtres (statut + tri)
- [x] Stats cards (total/actifs/terminés/en attente)
- [x] Pagination côté backend
- [x] Affichage réservations sans plan (flag `planNotCreated`)
- [x] Bouton actualiser
- [x] Onclick row → ouvre modal détail

### Détail Plan (Modal)
- [x] Informations réservation (listing, dates, IDs)
- [x] 4 tabs: Actifs / Terminés / Échecs / Tous
- [x] Affichage workflows avec:
  - [x] Statut + badges
  - [x] Registration stats (voyageurs)
  - [x] Declaration info (arrivée/départ)
  - [x] Actions orchestration détaillées
  - [x] Actions notification
  - [x] Timestamps (créé/terminé)
- [x] Scroll dans modal si trop de workflows

### Actions
- [x] Annuler plan avec confirmation
- [x] Gestion erreurs API avec Alert
- [x] Loading states (CircularProgress)

---

## 📝 TODO (Améliorations Futures)

### Backend API
- [ ] Force execution d'une action spécifique
- [ ] Réassigner staff manuellement
- [ ] Modifier deadline d'un workflow
- [ ] Recalculer plan si config change

### Frontend UI
- [ ] Filtre par listing (dropdown avec liste)
- [ ] Search bar (chercher par N° résa / guest name)
- [ ] Export CSV des plans
- [ ] Vue timeline graphique (comme OrchestrationPage actuelle)
- [ ] Bouton "Forcer exécution" pour chaque action
- [ ] Historique des modifications (audit log)
- [ ] Notification temps réel (WebSocket) si plan change

### Tests
- [ ] Tests unitaires orchestrationService.ts
- [ ] Tests E2E de la page complète
- [ ] Mock data pour développement hors ligne

---

## 🐛 Troubleshooting

### Erreur "Failed to fetch"
**Cause**: srv-orchestrator n'est pas démarré ou URL incorrecte

**Solution**:
```bash
# Vérifier srv-orchestrator
docker ps | grep srv-orchestrator
curl http://localhost:4008/health

# Vérifier .env.local
cat .env.local | grep VITE_SRV_ORCHESTRATOR_URL
```

### Erreur 404 "Reservation not found"
**Cause**: Le plan n'existe pas dans WorkflowOrchestrationPlan

**Solution**: Vérifier dans MongoDB ou créer une réservation test

### Empty response / No plans
**Cause**: Aucun plan dans la base de données

**Solution**:
```bash
# Créer une réservation test via srv-reservations
# Le consumer reservation.created va créer le plan automatiquement
```

### CORS Error
**Cause**: Frontend (port 4000) ne peut pas appeler backend (port 4008)

**Solution**: Vérifier que srv-orchestrator a CORS activé dans `index.ts`:
```typescript
app.use(cors())
```

---

## 📚 Références

### Backend
- **Model**: `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/db/models/WorkflowOrchestrationPlan.ts`
- **Routes**: `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/routes/orchestration.routes.ts`
- **Main**: `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/index.ts`

### Frontend
- **Service**: `/Users/gouacht/Sojori-orchestrator/src/services/orchestrationService.ts`
- **Types**: `/Users/gouacht/Sojori-orchestrator/src/types/orchestration.types.ts`
- **Page**: `/Users/gouacht/Sojori-orchestrator/src/pages/OrchestrationPlansPage.tsx`
- **Route**: `/Users/gouacht/Sojori-orchestrator/src/App.tsx`

---

**Livré par Agent-Orchestration le 14 Mai 2026** 🟣
