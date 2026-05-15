# 🧪 Guide de Test API: sojori-dashboard vs Sojori-orchestrator

**Date**: 15 Mai 2026
**Objectif**: Comparer et tester tous les appels API entre l'ancien et le nouveau dashboard
**Pour**: Agents IA et développeurs futurs

---

## 📋 TABLE DES MATIÈRES

1. [Configuration](#configuration)
2. [Tests API de Base](#tests-api-de-base)
3. [Tableau de Comparaison Complet](#tableau-de-comparaison-complet)
4. [Tests Automatisés](#tests-automatisés)
5. [Checklist de Migration](#checklist-de-migration)

---

## 🔧 CONFIGURATION

### Backend API
- **Base URL Production**: `https://dev.sojori.com/api/v1/orchestrator`
- **Base URL Local**: `http://localhost:4010/api/v1/orchestrator`
- **Authentification**: Bearer Token (localStorage.getItem('token'))

### Ancien Dashboard (sojori-dashboard)
- **URL**: `https://dashboard.sojori.com`
- **Config**: `/Users/gouacht/sojori-dashboard/src/config/backendServer.config.js`
- **Routes orchestration**: `/admin/orchestrator/*`

### Nouveau Dashboard (Sojori-orchestrator)
- **URL Local**: `http://localhost:4000`
- **Service**: `/Users/gouacht/Sojori-orchestrator/src/services/orchestrationService.ts`
- **Routes orchestration**: `/orchestration/plans` + `/admin/orchestrator`

---

## ✅ TESTS API DE BASE

### Test 1: Liste des Réservations
```bash
# Test backend direct
curl -s "https://dev.sojori.com/api/v1/orchestrator/reservations?limit=10&offset=0&reservationStatus=ACTIVE&sortBy=recent" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Résultat attendu:
# {
#   "success": true,
#   "data": [/* array of plans */],
#   "pagination": { "total": 223, "limit": 10, "offset": 0 }
# }
```

**Ancien dashboard**: `OrchestrationView.jsx` appelle cet endpoint
**Nouveau dashboard**: `OrchestrationPlansPage.tsx` via `getOrchestrationPlans()`

✅ **Status**: IMPLÉMENTÉ

---

### Test 2: Stats Globales
```bash
# Test backend direct
curl -s "https://dev.sojori.com/api/v1/orchestrator/orchestration/stats" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Résultat attendu:
# {
#   "success": true,
#   "data": {
#     "plans": { "total": 223, "active": 116, "completed": 107 },
#     "actions": { "pending": 1618 }
#   }
# }
```

**Ancien dashboard**: Non utilisé (stats calculées côté frontend)
**Nouveau dashboard**: `OrchestrationPlansPage.tsx` via `getOrchestrationStats()`

✅ **Status**: IMPLÉMENTÉ

---

### Test 3: Détail d'un Plan
```bash
# Test backend direct
curl -s "https://dev.sojori.com/api/v1/orchestrator/reservations/SJ-4OQHVT0P" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Résultat attendu:
# {
#   "success": true,
#   "data": {
#     "reservationCode": "SJ-4OQHVT0P",
#     "workflows": [/* array of workflows */]
#   }
# }
```

**Ancien dashboard**: `NewWorkflowTimeline.jsx` (appel implicite)
**Nouveau dashboard**: `OrchestrationPlansPage.tsx` via `getOrchestrationPlanDetail()`

✅ **Status**: IMPLÉMENTÉ

---

### Test 4: Annuler un Plan
```bash
# Test backend direct
curl -X POST "https://dev.sojori.com/api/v1/orchestrator/reservations/SJ-4OQHVT0P/cancel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test cancellation"}' | jq

# Résultat attendu:
# {
#   "success": true,
#   "message": "Plan cancelled for SJ-4OQHVT0P"
# }
```

**Ancien dashboard**: `OrchestrationView.jsx` (bouton "Annuler Plan")
**Nouveau dashboard**: `OrchestrationPlansPage.tsx` via `cancelOrchestrationPlan()`

✅ **Status**: IMPLÉMENTÉ

---

## 📊 TABLEAU DE COMPARAISON COMPLET

| # | Endpoint | Ancien Dashboard | Nouveau Dashboard | Status | Priorité |
|---|----------|------------------|-------------------|--------|----------|
| **1. GESTION RÉSERVATIONS** |
| 1.1 | `GET /reservations` | ✅ OrchestrationView.jsx | ✅ OrchestrationPlansPage.tsx | ✅ DONE | P0 |
| 1.1b | `GET /reservations/:id` | ✅ NewWorkflowTimeline.jsx | ✅ OrchestrationTimelinePage.tsx | ✅ DONE | P0 |
| 1.2 | `POST /reservations/:id/plan-cron/run-once` | ✅ OrchestrationView.jsx | ❌ Non implémenté | 🔴 TODO | P1 |
| 1.3 | `POST /reservations/:id/recalculate` | ✅ OrchestrationView.jsx | ❌ Non implémenté | 🔴 TODO | P1 |
| 1.4 | `POST /reservations/:id/cancel` | ✅ OrchestrationView.jsx | ✅ OrchestrationPlansPage.tsx | ✅ DONE | P0 |
| 1.5 | `POST /reservations/:id/execute-all` | ✅ ReservationCard.jsx (DEPRECATED) | ❌ Non implémenté | ⚠️ SKIP | P3 |
| 1.6 | `GET /reservations/:id/last-execution` | ✅ LastExecutionView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 1.7 | `GET /reservations/:id/audit` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 1.8 | `GET /compare/:id` | ✅ WorkflowOrchestrationView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| **2. EXÉCUTION ACTIONS** |
| 2.1 | `POST /actions/:id/execute` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P1 |
| 2.2 | `POST /actions/:id/check-conditions` | ✅ ConditionCheckDialog.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| **3. LOGS & AUDIT** |
| 3.1 | `GET /message-logs/action/:id` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 3.2 | `GET /message-logs/message/:code` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 3.3 | `GET /messages/:code` | ✅ MessageDetailPopup.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 3.4 | `GET /action-logs/action/:id` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 3.5 | `GET /workflow-audit/:id` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 3.6 | `GET /audit-trail/:id` | ✅ AuditTrailView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 3.7 | `GET /audit-trail/:id/timeline` | ✅ AuditTrailView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 3.8 | `GET /task-creation-audit` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 3.9 | `GET /deadline-executions/:id` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| **4. ACTIONS DEADLINE** |
| 4.1 | `POST /deadline/:id/action` | ✅ DeadlineChoiceActions.jsx | ❌ Non implémenté | 🔴 TODO | P1 |
| **5. TIMESLOTS** |
| 5.1 | `POST /reservations/:id/timeslot/update-arrival-hour` | ✅ DeadlineChoiceActions.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 5.2 | `POST /reservations/:id/timeslot/update-hour` | ✅ DeadlineChoiceActions.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| **6. CRON & MONITORING** |
| 6.1 | `GET /cron/next-execution` | ✅ CronMonitoringView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 6.2 | `GET /cron/day-view` | ✅ CronMonitoringView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 6.3 | `GET /cron/schedule` | ✅ CronMonitoringView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| **7. ADMIN ACTION CENTER** |
| 7.1 | `GET /admin/action-centers/stats/summary` | ✅ AdminActionCenterView.jsx | ❌ Non implémenté | 🔴 TODO | P1 |
| 7.2 | `GET /admin/action-centers` | ✅ AdminActionCenterView.jsx | ❌ Non implémenté | 🔴 TODO | P1 |
| **8. CONFIGURATION** |
| 8.1 | `GET /config/message-templates` | ✅ ConfigMessagesView.jsx | ❌ Non implémenté | 🔴 TODO | P1 |
| 8.2 | `GET /config/message-template/:id` | ✅ ConfigMessagesView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 8.3 | `POST /config/message-template` | ✅ ConfigMessagesView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 8.4 | `PUT /config/message-template/:id` | ✅ ConfigMessagesView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 8.5 | `DELETE /config/message-template/:id` | ✅ ConfigMessagesView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 8.6 | `POST /config/message-template/preview` | ✅ ConfigMessagesView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 8.7 | `GET /config/task-template/:ownerId` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| 8.8 | `PUT /config/task-template/:ownerId` | ✅ NewWorkflowTimeline.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| **9. CONFLITS** |
| 9.1 | `GET /conflicts` | ✅ DailyOperationsView.jsx | ❌ Non implémenté | 🔴 TODO | P2 |
| **10. STATS** |
| 10.1 | `GET /orchestration/stats` | ❌ Non utilisé | ✅ OrchestrationPlansPage.tsx | ✅ DONE | P0 |

**Légende Priorité**:
- **P0**: Critique - Nécessaire pour fonctionnement de base
- **P1**: Important - Fonctionnalités principales
- **P2**: Utile - Fonctionnalités avancées
- **P3**: Optionnel - Peut être ignoré

**Stats** (mise à jour 15 Mai 2026):
- ✅ **Implémentés**: 6 endpoints (12%) - +1 avec timeline
- 🔴 **À implémenter**: 40 endpoints (80%)
- ⚠️ **À ignorer**: 1 endpoint (2%)
- 📊 **Total**: 50 endpoints identifiés

**Dernière addition**: `GET /reservations/:id` pour OrchestrationTimelinePage (commit `8511c7a`)

---

## 🧪 TESTS AUTOMATISÉS

### Script de Test Bash

Créer `/Users/gouacht/Sojori-orchestrator/scripts/test-api-comparison.sh`:

```bash
#!/bin/bash
# Test API Comparison Script
# Tests both old and new dashboard API calls

# Configuration
API_BASE="https://dev.sojori.com/api/v1/orchestrator"
TOKEN="${SOJORI_API_TOKEN:-YOUR_TOKEN_HERE}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 Testing Orchestration API Endpoints"
echo "======================================"
echo ""

# Test 1: Liste des réservations
echo "Test 1: GET /reservations"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/reservations?limit=10&offset=0&reservationStatus=ACTIVE&sortBy=recent" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  COUNT=$(echo "$BODY" | jq -r '.pagination.total // 0')
  echo -e "${GREEN}✅ PASS${NC} - HTTP 200 - Found ${COUNT} plans"
else
  echo -e "${RED}❌ FAIL${NC} - HTTP ${HTTP_CODE}"
  echo "$BODY" | jq
fi
echo ""

# Test 2: Stats globales
echo "Test 2: GET /orchestration/stats"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/orchestration/stats" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  TOTAL=$(echo "$BODY" | jq -r '.data.plans.total // 0')
  ACTIVE=$(echo "$BODY" | jq -r '.data.plans.active // 0')
  echo -e "${GREEN}✅ PASS${NC} - HTTP 200 - Total: ${TOTAL}, Active: ${ACTIVE}"
else
  echo -e "${RED}❌ FAIL${NC} - HTTP ${HTTP_CODE}"
fi
echo ""

# Test 3: Détail d'un plan (utilise le premier de la liste)
echo "Test 3: GET /reservations/:id (detail)"
FIRST_RESA=$(curl -s "${API_BASE}/reservations?limit=1&reservationStatus=ACTIVE" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.data[0].reservationNumber // ""')

if [ -n "$FIRST_RESA" ] && [ "$FIRST_RESA" != "null" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/reservations/${FIRST_RESA}" \
    -H "Authorization: Bearer ${TOKEN}")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" -eq 200 ]; then
    WORKFLOW_COUNT=$(echo "$BODY" | jq -r '.data.workflows | length // 0')
    echo -e "${GREEN}✅ PASS${NC} - HTTP 200 - Reservation: ${FIRST_RESA}, Workflows: ${WORKFLOW_COUNT}"
  else
    echo -e "${RED}❌ FAIL${NC} - HTTP ${HTTP_CODE}"
  fi
else
  echo -e "${YELLOW}⚠️ SKIP${NC} - No active reservations found"
fi
echo ""

# Test 4: Health check srv-orchestrator
echo "Test 4: Service Health"
RESPONSE=$(curl -s -w "\n%{http_code}" "https://dev.sojori.com/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ PASS${NC} - Service is healthy"
else
  echo -e "${RED}❌ FAIL${NC} - Service unhealthy (HTTP ${HTTP_CODE})"
fi
echo ""

echo "======================================"
echo "✅ Tests completed"
```

**Utilisation**:
```bash
# Avec token depuis env var
export SOJORI_API_TOKEN="your_token_here"
./scripts/test-api-comparison.sh

# Ou éditer le script directement
chmod +x scripts/test-api-comparison.sh
./scripts/test-api-comparison.sh
```

---

## 📝 CHECKLIST DE MIGRATION

### Phase 1: Fonctionnalités de Base (P0) ✅
- [x] Liste des réservations avec filtres
- [x] Stats globales (total/actif/terminé)
- [x] Détail d'un plan (workflows)
- [x] Annuler un plan
- [x] Route `/admin/orchestrator` (alias)

### Phase 2: Actions Critiques (P1) 🔴
- [ ] Exécuter cron plan-based (`POST /reservations/:id/plan-cron/run-once`)
- [ ] Recalculer un plan (`POST /reservations/:id/recalculate`)
- [ ] Exécuter une action manuelle (`POST /actions/:id/execute`)
- [ ] Admin Action Center stats (`GET /admin/action-centers/stats/summary`)
- [ ] Admin Action Center liste (`GET /admin/action-centers`)
- [ ] Templates de messages liste (`GET /config/message-templates`)
- [ ] Actions deadline (`POST /deadline/:id/action`)

### Phase 3: Logs & Audit (P2) 🔴
- [ ] Audit réservation (`GET /reservations/:id/audit`)
- [ ] Logs de message par action (`GET /message-logs/action/:id`)
- [ ] Détail message popup (`GET /messages/:code`)
- [ ] Audit trail complet (`GET /audit-trail/:id`)
- [ ] Timeline audit trail (`GET /audit-trail/:id/timeline`)
- [ ] Monitoring cron (`GET /cron/day-view`)
- [ ] Dernière exécution (`GET /reservations/:id/last-execution`)
- [ ] Comparer plan/réservation (`GET /compare/:id`)

### Phase 4: Configuration (P2) 🔴
- [ ] Créer template message (`POST /config/message-template`)
- [ ] Modifier template message (`PUT /config/message-template/:id`)
- [ ] Supprimer template message (`DELETE /config/message-template/:id`)
- [ ] Prévisualiser template (`POST /config/message-template/preview`)
- [ ] Task templates par owner (`GET /config/task-template/:ownerId`)
- [ ] Mettre à jour task template (`PUT /config/task-template/:ownerId`)

### Phase 5: Timeslots & Avancé (P2) 🔴
- [ ] Mettre à jour heure arrivée (`POST /reservations/:id/timeslot/update-arrival-hour`)
- [ ] Mettre à jour heure générique (`POST /reservations/:id/timeslot/update-hour`)
- [ ] Vérifier conditions action (`POST /actions/:id/check-conditions`)
- [ ] Détecter conflits (`GET /conflicts`)

---

## 🎯 RECOMMANDATIONS POUR AGENTS IA

### Avant de créer une nouvelle fonctionnalité:

1. **Consulter ce fichier** pour voir si l'endpoint existe déjà dans l'ancien dashboard
2. **Vérifier le backend** (`sojori-production/apps/srv-orchestrator/src/routes/`)
3. **Tester l'API directement** avec curl avant d'implémenter
4. **Suivre le pattern existant** dans `orchestrationService.ts`

### Pattern standard pour ajouter un endpoint:

```typescript
// 1. Ajouter les types dans orchestration.types.ts
export interface NewFeatureParams {
  id: string;
  param1: string;
}

export interface NewFeatureResponse {
  success: boolean;
  data: any;
}

// 2. Ajouter la fonction dans orchestrationService.ts
export async function newFeature(params: NewFeatureParams): Promise<NewFeatureResponse> {
  const response = await fetch(`${API_BASE}${API_PREFIX}/new-endpoint`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// 3. Tester avec curl
// curl -X POST "https://dev.sojori.com/api/v1/orchestrator/new-endpoint" \
//   -H "Authorization: Bearer TOKEN" \
//   -H "Content-Type: application/json" \
//   -d '{"id":"test"}'

// 4. Utiliser dans la page
import { newFeature } from '../services/orchestrationService';

const handleAction = async () => {
  try {
    const result = await newFeature({ id: 'test', param1: 'value' });
    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err);
  }
};
```

### Debugging checklist:

- [ ] Token présent dans localStorage? (`localStorage.getItem('token')`)
- [ ] URL correcte? (`https://dev.sojori.com/api/v1/orchestrator`)
- [ ] Headers corrects? (`Authorization: Bearer ${token}`)
- [ ] Backend accessible? (`curl https://dev.sojori.com/health`)
- [ ] CORS activé? (vérifier console browser)
- [ ] Response format? (`{ success: boolean, data: any, error?: string }`)

---

## 📚 RÉFÉRENCES

### Fichiers Importants

**Ancien Dashboard (sojori-dashboard)**:
- Config: `/Users/gouacht/sojori-dashboard/src/config/backendServer.config.js`
- API Client: `/Users/gouacht/sojori-dashboard/src/services/serverApi.orchestrator.js`
- Pages principales:
  - `/Users/gouacht/sojori-dashboard/src/views/orchestration/OrchestrationView.jsx`
  - `/Users/gouacht/sojori-dashboard/src/components/workflows/NewWorkflowTimeline.jsx`
  - `/Users/gouacht/sojori-dashboard/src/views/orchestration/ConfigOrchestrationView.jsx`

**Nouveau Dashboard (Sojori-orchestrator)**:
- Service: `/Users/gouacht/Sojori-orchestrator/src/services/orchestrationService.ts`
- Types: `/Users/gouacht/Sojori-orchestrator/src/types/orchestration.types.ts`
- Page: `/Users/gouacht/Sojori-orchestrator/src/pages/OrchestrationPlansPage.tsx`
- Routes: `/Users/gouacht/Sojori-orchestrator/src/App.tsx`

**Backend (sojori-production)**:
- Routes: `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/routes/`
- Model: `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/db/models/WorkflowOrchestrationPlan.ts`
- Service: `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/services/`

### Documentation Associée
- `ORCHESTRATION_API_INTEGRATION.md` - Guide d'intégration initial
- `ORCHESTRATION_API_FIX_REPORT.md` - Rapport de correction (URL + Auth)

---

**Créé le**: 15 Mai 2026
**Par**: Agent-Orchestration
**Pour**: Agents IA futurs et développeurs

**Dernière mise à jour**: 15 Mai 2026
**Status global**: 10% implémenté (5/50 endpoints)
