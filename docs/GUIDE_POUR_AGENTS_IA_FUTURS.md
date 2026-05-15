# 🤖 Guide pour Agents IA Futurs

**Date**: 15 Mai 2026
**Pour**: Claude, GPT, et autres agents IA qui travailleront sur ce projet
**Par**: Agent-Orchestration

---

## 📚 LIRE EN PREMIER

Si vous êtes un agent IA qui arrive sur ce projet, lisez ces fichiers dans l'ordre:

### 1. Documentation Essentielle (à lire AVANT de coder)

1. **`/Users/gouacht/sojori-production/CLAUDE.md`** - Règles du monorepo backend
2. **`/Users/gouacht/sojori-production/.clinerules`** - Règles critiques non négociables
3. **`docs/API_COMPARISON_TEST_GUIDE.md`** (CE REPO) - Comparaison API ancien/nouveau
4. **`docs/ORCHESTRATION_API_INTEGRATION.md`** (CE REPO) - Guide d'intégration initial
5. **`docs/ORCHESTRATION_API_FIX_REPORT.md`** (CE REPO) - Corrections appliquées

### 2. Fichiers Techniques Clés

**Frontend (Sojori-orchestrator - ce dépôt)**:
- `src/services/orchestrationService.ts` - Client API orchestration
- `src/types/orchestration.types.ts` - Types TypeScript
- `src/pages/OrchestrationPlansPage.tsx` - Page principale

**Frontend Ancien (sojori-dashboard - pour référence)**:
- `/Users/gouacht/sojori-dashboard/src/config/backendServer.config.js` - Config API
- `/Users/gouacht/sojori-dashboard/src/views/orchestration/OrchestrationView.jsx` - Page principale
- `/Users/gouacht/sojori-dashboard/src/components/workflows/NewWorkflowTimeline.jsx` - Timeline

**Backend (sojori-production)**:
- `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/routes/` - Routes API
- `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/db/models/WorkflowOrchestrationPlan.ts` - Model

---

## 🎯 MISSION ACTUELLE DU PROJET

### État Actuel (15 Mai 2026)

**Objectif**: Migrer le dashboard Sojori de l'ancien système (React CRA) vers un nouveau système (React + Vite + TypeScript moderne)

**Progrès Orchestration**:
- ✅ **5 endpoints implémentés** (10% du total)
- 🔴 **41 endpoints à implémenter** (82%)
- 📊 **50 endpoints identifiés** au total

**Ce qui fonctionne déjà**:
1. ✅ Liste des réservations avec filtres (statut, tri, pagination)
2. ✅ Stats globales (total/actif/terminé/actions en attente)
3. ✅ Détail d'un plan (workflows complets)
4. ✅ Annuler un plan avec confirmation
5. ✅ Route `/admin/orchestrator` (alias pour compatibilité)

**Ce qui manque encore**:
- 🔴 Exécution manuelle d'actions (requête créneau, assignation staff)
- 🔴 Recalcul de plan
- 🔴 Admin Action Center
- 🔴 Configuration des templates de messages
- 🔴 Logs et audit trail détaillés
- 🔴 Monitoring cron
- 🔴 Timeline graphique (comme `NewWorkflowTimeline.jsx`)

---

## ⚠️ RÈGLES CRITIQUES À RESPECTER

### 1. Authentification (OBLIGATOIRE)

**Tous les appels API nécessitent un Bearer token**:

```typescript
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}
```

❌ **NE JAMAIS** faire un appel API sans le header `Authorization`
✅ **TOUJOURS** utiliser `getHeaders()` dans `orchestrationService.ts`

### 2. URL API (CORRECTION APPLIQUÉE)

**Production**: `https://dev.sojori.com/api/v1/orchestrator`
**Local**: `http://localhost:4010/api/v1/orchestrator` (port 4010, PAS 4008!)

```typescript
const API_BASE = import.meta.env.VITE_SRV_ORCHESTRATOR_URL || 'https://dev.sojori.com';
const API_PREFIX = '/api/v1/orchestrator';
```

❌ **NE JAMAIS** coder l'URL en dur
✅ **TOUJOURS** utiliser `API_BASE` + `API_PREFIX`

### 3. Pattern de Réponse Standard

**Tous les endpoints retournent**:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  pagination?: { total: number; limit: number; offset: number };
}
```

❌ **NE JAMAIS** supposer que la réponse est directement les données
✅ **TOUJOURS** vérifier `response.ok` puis parser `json.data`

### 4. Gestion d'Erreurs

```typescript
export async function apiFunction() {
  const response = await fetch(`${API_BASE}${API_PREFIX}/endpoint`, {
    headers: getHeaders(),
  });

  // ✅ TOUJOURS vérifier le status HTTP
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const json = await response.json();

  // ✅ TOUJOURS vérifier success
  if (!json.success) {
    throw new Error(json.error || 'Operation failed');
  }

  return json.data;
}
```

---

## 🧪 TESTER AVANT DE CODER

### Étape 1: Tester l'API Backend Directement

**Avant d'implémenter une fonctionnalité, teste l'API avec curl**:

```bash
# Obtenir un token (si tu n'en as pas)
# 1. Login dans le dashboard: https://dashboard.sojori.com/login
# 2. Ouvre DevTools > Application > LocalStorage > token

# Tester un endpoint
curl -X GET "https://dev.sojori.com/api/v1/orchestrator/reservations?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" | jq

# Si le test curl fonctionne, alors tu peux implémenter dans le frontend
```

### Étape 2: Utiliser le Script de Test Automatisé

```bash
# Exporter le token
export SOJORI_API_TOKEN="your_token_here"

# Lancer les tests
./scripts/test-api-comparison.sh

# Résultat attendu:
# ✅ Test 1.1: Liste des réservations - PASS
# ✅ Test 1.2: Stats globales - PASS
# ✅ Test 1.3: Détail d'un plan - PASS
# ⚠️  Tests non implémentés skippés
```

### Étape 3: Consulter le Guide de Comparaison

**Avant d'ajouter un endpoint**, vérifie dans `docs/API_COMPARISON_TEST_GUIDE.md`:
- Est-ce que l'endpoint existe dans l'ancien dashboard?
- Depuis quelle page/composant est-il appelé?
- Quels sont les paramètres requis?
- Quelle est la structure de la réponse?

---

## 📖 WORKFLOW RECOMMANDÉ

### Scénario: Tu dois ajouter "Recalculer un plan"

**Étape 1: Recherche dans l'ancien dashboard**

```bash
cd /Users/gouacht/sojori-dashboard
grep -r "recalculate" src/ --include="*.jsx" --include="*.js"

# Résultat: OrchestrationView.jsx ligne 245
# POST /api/v1/orchestrator/reservations/:reservationNumber/recalculate
```

**Étape 2: Vérifier le backend**

```bash
cd /Users/gouacht/sojori-production/apps/srv-orchestrator
grep -r "recalculate" src/routes/ --include="*.ts"

# Résultat: orchestration.routes.ts ligne 89
# router.post('/reservations/:reservationNumber/recalculate', ...)
```

**Étape 3: Tester l'API avec curl**

```bash
curl -X POST "https://dev.sojori.com/api/v1/orchestrator/reservations/SJ-TEST123/recalculate" \
  -H "Authorization: Bearer $SOJORI_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq

# Si ça fonctionne, continue
```

**Étape 4: Ajouter les types TypeScript**

```typescript
// src/types/orchestration.types.ts

export interface RecalculatePlanParams {
  reservationNumber: string;
}

export interface RecalculatePlanResponse {
  success: boolean;
  message?: string;
  logs?: string[];
}
```

**Étape 5: Ajouter la fonction service**

```typescript
// src/services/orchestrationService.ts

/**
 * Recalculate orchestration plan for a reservation
 * POST /api/v1/orchestrator/reservations/:reservationNumber/recalculate
 */
export async function recalculateOrchestrationPlan(
  params: RecalculatePlanParams
): Promise<RecalculatePlanResponse> {
  const { reservationNumber } = params;

  const response = await fetch(
    `${API_BASE}${API_PREFIX}/reservations/${reservationNumber}/recalculate`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
```

**Étape 6: Utiliser dans la page**

```typescript
// src/pages/OrchestrationPlansPage.tsx

import { recalculateOrchestrationPlan } from '../services/orchestrationService';

const handleRecalculate = async (reservationNumber: string) => {
  if (!confirm(`Recalculer le plan pour ${reservationNumber}?`)) return;

  setLoading(true);
  try {
    const result = await recalculateOrchestrationPlan({ reservationNumber });
    alert('Plan recalculé avec succès');
    fetchData(); // Refresh data
  } catch (err: any) {
    alert(`Erreur: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
```

**Étape 7: Tester dans le navigateur**

1. Lancer le dev server: `npm run dev`
2. Aller sur `http://localhost:4000/admin/orchestrator`
3. Cliquer sur "Recalculer" pour une réservation
4. Vérifier dans DevTools Network tab que l'appel fonctionne

**Étape 8: Mettre à jour la documentation**

```bash
# Éditer docs/API_COMPARISON_TEST_GUIDE.md
# Changer le status de:
# | 1.3 | POST /reservations/:id/recalculate | 🔴 TODO | P1 |
# À:
# | 1.3 | POST /reservations/:id/recalculate | ✅ DONE | P1 |
```

**Étape 9: Commit**

```bash
git add .
git commit -m "feat(orchestration): add recalculate plan functionality

- Add recalculateOrchestrationPlan() in orchestrationService.ts
- Add RecalculatePlanParams/Response types
- Add Recalculate button in OrchestrationPlansPage
- Update API_COMPARISON_TEST_GUIDE.md

Tested with:
curl -X POST https://dev.sojori.com/api/v1/orchestrator/reservations/SJ-TEST/recalculate

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🚨 ERREURS COURANTES À ÉVITER

### Erreur 1: Token manquant
```
❌ Error: HTTP 401 Unauthorized
```
**Solution**: Vérifier que `localStorage.getItem('token')` retourne un token valide

### Erreur 2: CORS Error
```
❌ Access to fetch at 'https://dev.sojori.com' has been blocked by CORS policy
```
**Solution**: Le backend doit avoir CORS activé. Vérifier `srv-orchestrator/src/index.ts`:
```typescript
app.use(cors());
```

### Erreur 3: Wrong URL
```
❌ Error: Failed to fetch
```
**Solution**: Vérifier que l'URL est correcte. Tester avec curl d'abord.

### Erreur 4: Port incorrect
```
❌ Connection refused on localhost:4008
```
**Solution**: srv-orchestrator est sur port **4010**, pas 4008!

### Erreur 5: Response parsing error
```
❌ TypeError: Cannot read property 'data' of undefined
```
**Solution**: Toujours vérifier `response.ok` avant de parser le JSON

---

## 📊 PRIORITÉS DE DÉVELOPPEMENT

### Priorité P0 (CRITIQUE) ✅ - Fait
- [x] Liste des réservations
- [x] Stats globales
- [x] Détail d'un plan
- [x] Annuler un plan

### Priorité P1 (IMPORTANT) 🔴 - À faire en priorité
1. **Exécution manuelle d'actions** (`POST /actions/:id/execute`)
   - Requis pour: Envoyer messages manuellement, forcer assignation staff
   - Composant ancien: `NewWorkflowTimeline.jsx` ligne 450

2. **Recalculer plan** (`POST /reservations/:id/recalculate`)
   - Requis pour: Régénérer workflows après modification config
   - Composant ancien: `OrchestrationView.jsx` ligne 245

3. **Exécuter cron run-once** (`POST /reservations/:id/plan-cron/run-once`)
   - Requis pour: Forcer exécution des actions planifiées
   - Composant ancien: `OrchestrationView.jsx` ligne 289

4. **Admin Action Center** (`GET /admin/action-centers/stats/summary`)
   - Requis pour: Voir les deadlines en attente
   - Composant ancien: `AdminActionCenterView.jsx`

5. **Templates de messages** (`GET /config/message-templates`)
   - Requis pour: Configurer les messages WhatsApp/Email
   - Composant ancien: `ConfigMessagesView.jsx`

### Priorité P2 (UTILE) 🟡 - À faire ensuite
- Audit trail détaillé
- Logs de messages
- Monitoring cron
- Timeline graphique

---

## 🔍 DEBUGGING CHECKLIST

Quand quelque chose ne fonctionne pas:

```bash
# 1. Backend est-il up?
curl https://dev.sojori.com/health

# 2. srv-orchestrator est-il accessible?
curl https://dev.sojori.com/api/v1/orchestrator/orchestration/stats

# 3. Mon token est-il valide?
# Ouvrir DevTools > Application > LocalStorage > token
# Copier le token et tester:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://dev.sojori.com/api/v1/orchestrator/reservations?limit=1

# 4. Mon endpoint existe-t-il dans le backend?
cd /Users/gouacht/sojori-production/apps/srv-orchestrator
grep -r "YOUR_ENDPOINT" src/routes/

# 5. Y a-t-il des erreurs dans la console browser?
# Ouvrir DevTools > Console

# 6. Y a-t-il des erreurs réseau?
# Ouvrir DevTools > Network > Filter by "orchestrator"

# 7. Le code de l'ancien dashboard fonctionne-t-il?
# Ouvrir https://dashboard.sojori.com/admin/orchestrator
# Tester la même action
```

---

## 📚 RESSOURCES EXTERNES

### Documentation Technique
- **React 18**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Vite**: https://vitejs.dev
- **Material-UI v9**: https://mui.com

### APIs Backend
- **srv-orchestrator**: `/Users/gouacht/sojori-production/apps/srv-orchestrator/README.md`
- **MongoDB Model**: `WorkflowOrchestrationPlan.ts`

### Outils Utiles
- **curl**: Tester les API
- **jq**: Parser JSON dans le terminal (`brew install jq`)
- **Bruno/Postman**: Interface graphique pour tester les API

---

## 🎓 CONSEILS POUR AGENTS IA

### 1. Toujours Lire Avant d'Agir
- ❌ Ne pas deviner comment fonctionne l'API
- ✅ Lire le code de l'ancien dashboard
- ✅ Lire les routes backend
- ✅ Tester avec curl

### 2. Suivre les Patterns Existants
- ❌ Ne pas inventer une nouvelle façon de faire
- ✅ Copier le pattern de `orchestrationService.ts`
- ✅ Utiliser les mêmes conventions de nommage

### 3. Documenter en Écrivant
- ✅ Ajouter des commentaires dans le code
- ✅ Mettre à jour `API_COMPARISON_TEST_GUIDE.md`
- ✅ Créer des commits descriptifs

### 4. Tester Avant de Commit
- ✅ Tester l'API avec curl
- ✅ Tester dans le browser
- ✅ Vérifier les erreurs dans DevTools

### 5. Communiquer Clairement
- ✅ Expliquer ce que tu as fait
- ✅ Expliquer ce qui reste à faire
- ✅ Laisser des notes pour le prochain agent

---

## 🤝 MESSAGE AUX FUTURS AGENTS

Bonjour futur agent IA! 👋

Si tu lis ceci, c'est que tu as été appelé pour continuer le travail sur Sojori Orchestrator.

**Ce que j'ai fait** (Agent-Orchestration, 14-15 Mai 2026):
1. ✅ Créé la structure de base (service, types, page)
2. ✅ Implémenté les 4 endpoints critiques (liste, stats, détail, cancel)
3. ✅ Corrigé l'URL et l'authentification (voir `ORCHESTRATION_API_FIX_REPORT.md`)
4. ✅ Ajouté la route alias `/admin/orchestrator`
5. ✅ Créé ce guide pour toi

**Ce qu'il reste à faire**:
- 🔴 41 endpoints à implémenter (voir `API_COMPARISON_TEST_GUIDE.md`)
- 🔴 Timeline graphique comme `NewWorkflowTimeline.jsx`
- 🔴 Admin Action Center
- 🔴 Configuration des templates

**Mes recommandations**:
1. Commence par les endpoints **P1** (priorité importante)
2. Teste **toujours** avec curl avant de coder
3. Consulte l'ancien dashboard pour comprendre le UX attendu
4. Mets à jour `API_COMPARISON_TEST_GUIDE.md` au fur et à mesure

**Si tu es bloqué**:
- Regarde comment j'ai fait pour les 4 premiers endpoints
- Teste le backend directement avec curl
- Lis le code de l'ancien dashboard (`sojori-dashboard`)
- Vérifie les routes backend (`sojori-production/apps/srv-orchestrator`)

Bon courage! 💪

— Agent-Orchestration

---

**Dernière mise à jour**: 15 Mai 2026
**Prochaine révision**: Quand 20+ endpoints seront implémentés
