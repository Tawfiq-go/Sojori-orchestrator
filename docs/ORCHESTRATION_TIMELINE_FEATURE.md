# 📊 Orchestration Timeline - Vue Détaillée des Workflows

**Date**: 15 Mai 2026
**Commit**: `8511c7a`
**Feature**: Timeline complète d'orchestration avec données de production

---

## 🎯 Objectif

Créer une page dédiée pour afficher tous les workflows d'une réservation, équivalent de l'onglet **"Chronologie"** dans l'ancien dashboard (`NewWorkflowTimeline.jsx`).

---

## ✅ Ce Qui A Été Implémenté

### 1. Page Timeline (`OrchestrationTimelinePage.tsx`)

**Route**: `/orchestration/timeline/:id`

**Fonctionnalités**:
- ✅ Récupère les données réelles via `GET /api/v1/orchestrator/reservations/:id`
- ✅ Affiche les informations de réservation (code, voyageur, listing, dates)
- ✅ Groupe les workflows par statut:
  - **Actifs** (PENDING, IN_PROGRESS) - 🟡 Orange
  - **Terminés** (COMPLETED, EXECUTED) - 🟢 Vert
  - **Échoués** (FAILED) - 🔴 Rouge
  - **Autres** (CANCELLED, SKIPPED) - ⚪ Gris
- ✅ Affiche chaque workflow avec détails:
  - Statut + icône
  - Type de catégorie (CHOICE_ARRIVAL, DECLARATION, etc.)
  - Timestamps (créé, terminé)

**Détails des Actions**:

**Actions Orchestration** (accordéons dépliables):
1. **📅 Demande Créneau** (`requestTimeslot`)
   - Template utilisé
   - Canal (WHATSAPP/EMAIL)
   - Heure sélectionnée (si réponse client)

2. **👤 Assignation Staff** (`assignStaff`)
   - Stratégie (PRIORITY/ROUND_ROBIN/MANUAL)
   - Staff assigné (nom)
   - Nombre de tentatives

3. **⏰ Escalade Deadline** (`deadlineEscalation`)
   - Type d'escalade (ADMIN/OWNER)
   - Deadline (heures avant check-in)

**Actions Notification**:
4. **🔔 Notification** (`sendNotification`)
   - Template de message
   - Canal (WHATSAPP/EMAIL/OTA)
   - Timing (IMMEDIATE, BEFORE_CHECKIN, etc.)
   - Date d'envoi (si envoyé)

**Statistiques Additionnelles**:
- **📋 Voyageurs**: Validés / Brouillon / Non enregistrés
- **🏛️ Déclaration**: Statut arrivée/départ + méthode

### 2. Navigation depuis Plans

**Modifications dans `OrchestrationPlansPage.tsx`**:
- ✅ Ajout du bouton **📊 Voir timeline complète**
- ✅ Navigation vers `/orchestration/timeline/:id` au clic
- ✅ Conserve le bouton 👁️ (modal rapide)
- ✅ Conserve le bouton ❌ (annuler plan)

**UX**:
```
Liste des plans
├─ 👁️ Voir détails (modal) → Aperçu rapide
├─ 📊 Timeline complète → Page dédiée avec tous les workflows
└─ ❌ Annuler plan → Confirmation puis annulation
```

### 3. Route Configuration

**`App.tsx`**:
```typescript
// Import
const OrchestrationTimelinePage = lazy(() =>
  import("./pages/OrchestrationTimelinePage").then(...)
);

// Route
<Route
  path="/orchestration/timeline/:id"
  element={<LazyRoute><OrchestrationTimelinePage /></LazyRoute>}
/>
```

---

## 🧪 Tests Effectués

### Test API Backend

**Endpoint**: `GET /api/v1/orchestrator/reservations/SJ-4OQHVT0P`

**Résultat**:
```json
{
  "success": true,
  "data": {
    "reservationCode": "SJ-4OQHVT0P",
    "guestName": "tawfiq gouach",
    "listingName": "Harcay CFC",
    "workflows": [...] // 14 workflows
  }
}
```

**Premier Workflow**:
```json
{
  "workflowId": "WF-GZCM1D4H",
  "category": "Message bienvenue",
  "status": "PENDING",
  "categoryType": "NOTIFICATION_ONLY",
  "actions": {
    "sendNotification": {
      "actionId": "ACT-...",
      "status": "PENDING",
      "config": {
        "templateName": "message_bienvenue",
        "channel": "WHATSAPP",
        "timing": "IMMEDIATE"
      }
    }
  }
}
```

### Navigation Testée

1. **Depuis Plans Page**:
   ```
   /admin/orchestrator
   → Click 📊 sur SJ-4OQHVT0P
   → /orchestration/timeline/SJ-4OQHVT0P
   ✅ Page charge avec 14 workflows
   ```

2. **URL Directe**:
   ```
   http://localhost:4000/orchestration/timeline/SJ-4OQHVT0P
   ✅ Fonctionne
   ```

3. **Bouton Retour**:
   ```
   Timeline page → Bouton "Retour"
   → Retour à /admin/orchestrator
   ✅ Fonctionne
   ```

---

## 📊 Comparaison Ancien vs Nouveau

### Ancien Dashboard (`NewWorkflowTimeline.jsx`)

**Fichier**: `/Users/gouacht/sojori-dashboard/src/features/ultimateDashboard/components/orchestration/NewWorkflowTimeline.jsx`

**Stats**:
- 📄 **7269 lignes** de code
- 🎨 Colonnes verticales pour chaque workflow
- 📅 Calendrier des exécutions planifiées
- 🔘 Actions manuelles (envoyer relance, créer tâche, définir heure)
- 📊 Audit trail détaillé par action
- 🔍 Message preview avec template expand

**Complexité**: Très élevée (gestion LM, retries, conditions, execution history)

### Nouveau Dashboard (`OrchestrationTimelinePage.tsx`)

**Fichier**: `/Users/gouacht/Sojori-orchestrator/src/pages/OrchestrationTimelinePage.tsx`

**Stats**:
- 📄 **600 lignes** de code (92% plus petit!)
- 📦 Cartes verticales groupées par statut
- 📋 Accordéons pour détails des actions
- ✅ Focus sur lisibilité et simplicité

**Complexité**: Modérée (affichage lecture seule, pas d'actions manuelles pour l'instant)

### Différences Clés

| Feature | Ancien | Nouveau | Status |
|---------|--------|---------|--------|
| Affichage workflows | ✅ Colonnes | ✅ Cartes | ✅ Équivalent |
| Statuts colorés | ✅ | ✅ | ✅ Équivalent |
| Détails actions | ✅ Inline | ✅ Accordéons | ✅ Amélioré |
| Registration stats | ✅ | ✅ | ✅ Équivalent |
| Declaration info | ✅ | ✅ | ✅ Équivalent |
| **Actions manuelles** | ✅ | ❌ | 🔴 TODO |
| Envoyer relance | ✅ | ❌ | 🔴 TODO |
| Créer tâche | ✅ | ❌ | 🔴 TODO |
| Définir heure | ✅ | ❌ | 🔴 TODO |
| Audit trail | ✅ | ❌ | 🔴 TODO |
| Message preview | ✅ | ❌ | 🔴 TODO |
| Execution calendar | ✅ | ❌ | 🔴 TODO |

---

## 🚀 Prochaines Étapes

### Phase 1: Actions Manuelles (Priorité P1) 🔴

Implémenter les actions critiques pour que la timeline soit fonctionnelle à 100%:

#### 1.1 Envoyer Relance (`POST /actions/:id/execute`)
```typescript
// À ajouter dans OrchestrationTimelinePage.tsx
const handleSendRelance = async (actionId: string) => {
  await fetch(`/api/v1/orchestrator/actions/${actionId}/execute`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reservationNumber: id }),
  });
  fetchPlan(); // Refresh
};
```

**Référence**: `useExecuteSendActionWithDialog.js` ligne 554

#### 1.2 Créer Tâche (`POST /actions/:id/execute` avec flag `create_task`)
```typescript
const handleCreateTask = async (actionId: string) => {
  // Similar to sendRelance but for task creation actions
};
```

**Référence**: `CreateTaskButton.jsx` ligne 828

#### 1.3 Définir Heure Manuellement (`POST /reservations/:id/timeslot/update-hour`)
```typescript
const handleSetTimeslot = async (timeslotCode: string, hour: number) => {
  await fetch(`/api/v1/orchestrator/reservations/${id}/timeslot/update-hour`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ timeslotCode, selected_hour: hour }),
  });
};
```

**Référence**: `TimeslotManualActions.jsx` ligne 976

### Phase 2: Audit Trail (Priorité P2) 🟡

#### 2.1 Historique d'Exécution par Action
```typescript
const [auditData, setAuditData] = useState(null);

useEffect(() => {
  // Fetch audit trail
  fetch(`/api/v1/orchestrator/workflow-audit/${workflowId}`)
    .then(res => res.json())
    .then(data => setAuditData(data.data));
}, [workflowId]);
```

**Endpoint**: `GET /api/v1/orchestrator/workflow-audit/:workflowId`
**Référence**: `NewWorkflowTimeline.jsx` ligne 1238

#### 2.2 Message Preview
- Afficher le contenu du message envoyé
- Template expansion avec variables
- Status delivery (sent/delivered/read)

**Endpoint**: `GET /api/v1/orchestrator/messages/:messageCode`
**Référence**: `MessageDetailPopup.jsx` ligne 1212

### Phase 3: Execution Calendar (Priorité P2) 🟡

Afficher le calendrier des exécutions planifiées (relances J+1, J+2, etc.)

**Format**:
```
┌─────────────────────────────────────────────┐
│ Relances Planifiées                         │
├─────────────────────────────────────────────┤
│ ✅ J-2 (13/05) → Envoyé                     │
│ ⏳ J-1 (14/05) → Programmé 11h00            │
│ ⏳ J+0 (15/05) → Programmé 15h00            │
│ 🔄 J+1 (16/05) → Last Minute (si besoin)    │
└─────────────────────────────────────────────┘
```

**Référence**: `NewWorkflowTimeline.jsx` ligne 200-500 (execution calendar logic)

---

## 📚 Références Code

### Backend (sojori-production)

**Routes Orchestration**:
- `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/routes/orchestration.routes.ts`
  - `GET /reservations/:id` - Plan detail
  - `POST /actions/:id/execute` - Execute action
  - `POST /reservations/:id/timeslot/update-hour` - Set timeslot

**Model**:
- `/Users/gouacht/sojori-production/apps/srv-orchestrator/src/db/models/WorkflowOrchestrationPlan.ts`

### Frontend Ancien (sojori-dashboard)

**Composants Référence**:
- `NewWorkflowTimeline.jsx` (7269 lignes) - Timeline complète
- `ActionCard.tsx` - Carte d'action individuelle
- `useExecuteSendActionWithDialog.js` - Hook pour envoyer messages
- `CreateTaskButton.jsx` - Bouton créer tâche
- `TimeslotManualActions.jsx` - Actions manuelles timeslot
- `DeadlineChoiceActions.jsx` - Actions deadline

### Frontend Nouveau (Sojori-orchestrator)

**Fichiers Créés**:
- `src/pages/OrchestrationTimelinePage.tsx` (600 lignes)
- `src/services/orchestrationService.ts` - Client API
- `src/types/orchestration.types.ts` - Types

**Fichiers Modifiés**:
- `src/App.tsx` - Route configuration
- `src/pages/OrchestrationPlansPage.tsx` - Navigation button

---

## 🎨 Design Choices

### Pourquoi des Cartes au lieu de Colonnes?

**Ancien système** (colonnes verticales):
```
┌──────────┬──────────┬──────────┬──────────┐
│ Message  │ Choisir  │ Déclarer │ Créer    │
│ bienvenue│ arrivée  │ arrivée  │ tâche    │
│          │          │          │          │
│ [Card]   │ [Card]   │ [Card]   │ [Card]   │
│ [Card]   │ [Card]   │ [Card]   │ [Card]   │
│ [Card]   │          │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

**Problème**: Difficile de voir tous les détails sans scroller horizontalement.

**Nouveau système** (cartes verticales groupées):
```
⚠️ Workflows Actifs (3)
├─ [Card] Message bienvenue
├─ [Card] Choisir arrivée
└─ [Card] Déclarer arrivée

✅ Workflows Terminés (8)
├─ [Card] Créer tâche
├─ [Card] Assigner staff
└─ ...

❌ Workflows Échoués (1)
└─ [Card] Email bounce
```

**Avantages**:
- ✅ Scroll vertical (plus naturel)
- ✅ Groupement par statut (vue d'ensemble)
- ✅ Plus d'espace pour détails
- ✅ Mobile-friendly

### Accordéons pour Actions

**Raison**: Éviter le surcharge visuelle. L'utilisateur peut dépli

er uniquement ce qui l'intéresse.

**Exemple**:
```
📅 Demande Créneau [PENDING] ▼
├─ Template: choix_arrivee_v2
├─ Canal: WHATSAPP
└─ 3 relances planifiées
```

---

## 📊 Statistiques Finales

### Lignes de Code

| Composant | Ancien | Nouveau | Réduction |
|-----------|--------|---------|-----------|
| Timeline complète | 7269 | 600 | **-92%** |
| Service API | N/A | 180 | +180 |
| Types | N/A | 300 | +300 |
| **Total** | **7269** | **1080** | **-85%** |

### Fonctionnalités

| Feature | Ancien | Nouveau | Status |
|---------|--------|---------|--------|
| Lecture workflows | ✅ | ✅ | ✅ Complet |
| Actions manuelles | ✅ | ❌ | 🔴 30% TODO |
| Audit trail | ✅ | ❌ | 🔴 TODO |
| **Global** | **100%** | **40%** | **🟡 En cours** |

---

## ✅ Résumé

**Ce qui fonctionne maintenant**:
1. ✅ Navigation depuis `/admin/orchestrator` avec bouton 📊
2. ✅ Page timeline `/orchestration/timeline/:id`
3. ✅ Récupération données réelles API
4. ✅ Affichage workflows groupés par statut
5. ✅ Détails actions (accordéons)
6. ✅ Registration stats + Declaration info
7. ✅ Bouton Retour + Rafraîchir

**Ce qui reste à faire**:
- 🔴 Actions manuelles (envoyer relance, créer tâche, définir heure)
- 🔴 Audit trail par action
- 🔴 Message preview
- 🔴 Execution calendar

**Pour tester**:
```bash
# 1. Démarrer le dev server
cd /Users/gouacht/Sojori-orchestrator
npm run dev

# 2. Aller sur
http://localhost:4000/admin/orchestrator

# 3. Cliquer sur 📊 pour n'importe quelle réservation

# 4. Ou URL directe:
http://localhost:4000/orchestration/timeline/SJ-4OQHVT0P
```

---

**Livré le**: 15 Mai 2026
**Par**: Agent-Orchestration
**Commit**: `8511c7a`
**Status**: ✅ Phase lecture implémentée, 🔴 Actions manuelles à venir
