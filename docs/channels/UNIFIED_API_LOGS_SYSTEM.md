# Système Unifié de Logs API - Documentation Complète

**Date:** 2026-06-13
**Projet:** Sojori Orchestrator
**Module:** Channels / API Monitoring
**URL:** `http://127.0.0.1:4174/admin/unified`

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du système](#architecture-du-système)
3. [Composants créés](#composants-créés)
4. [Modes Business vs Debug](#modes-business-vs-debug)
5. [Sources supportées](#sources-supportées)
6. [Guide d'utilisation](#guide-dutilisation)
7. [Intégration avec les tabs existants](#intégration-avec-les-tabs-existants)
8. [URL et routes](#url-et-routes)

---

## Vue d'ensemble

### Objectif

Créer une interface unifiée pour visualiser et monitorer tous les appels API de Sojori, quelle que soit leur source (AirROI, Rental United, Webhooks, HTTP Ingress), avec **deux modes d'affichage distincts**:

- **Mode Business**: Données enrichies, contexte métier, lecture facilitée
- **Mode Debug**: Données brutes (XML/JSON), détails techniques, debugging

### Problème résolu

**Avant:**
- 3 interfaces différentes pour 3 sources différentes
- Code dupliqué entre BusinessTab et DebugApiTab
- Difficulté à maintenir la cohérence entre les modes
- Pas de composants réutilisables

**Après:**
- 1 seul composant `<UnifiedApiCallTable>` pour toutes les sources
- 2 modes clairement séparés (business/debug)
- Composants UI réutilisables (badges, icons, status)
- Architecture extensible pour nouvelles sources

### Règle critique respectée

**Pour RU (Rental United):**
- ✅ **Mode Debug**: `enriched = false` → Pas d'enrichissement, XML brut uniquement
- ✅ **Mode Business**: `enriched = true` → Données enrichies, JSON parsé

---

## Architecture du système

### Structure des fichiers

```
Sojori-orchestrator/
├── src/
│   ├── types/
│   │   └── unified-api-call.ts              # Types génériques
│   ├── utils/
│   │   ├── unified-transformers.ts          # Transformers par source
│   │   └── debugApiRowMapper.ts             # Mongo DebugApiTab → UnifiedApiCall
│   ├── components/unified/
│   │   ├── index.ts                         # Exports
│   │   ├── UnifiedApiCallTable.tsx          # Tableau principal ⭐
│   │   ├── UnifiedApiCallDetail.tsx         # Vue détaillée (expandable)
│   │   ├── UnifiedApiIcons.tsx              # Icônes par action
│   │   ├── UnifiedApiBadges.tsx             # Badges contextuels
│   │   └── UnifiedApiStatus.tsx             # Badges de statut
│   └── pages/
│       └── UnifiedApiDemo.tsx               # Page de démo
└── docs/
    ├── channels/
    │   └── UNIFIED_API_LOGS_SYSTEM.md       # Ce document
    └── monitoring/
        ├── AUDIT_DESIGN_SOJORI_ORCHESTRATOR_LOGS_2026-06-12.md
        ├── RU_INTERFACE_DESIGN_IMPROVEMENTS_2026-06-12.md
        ├── CHANNELS_UI_UNIFIED_DESIGN_2026-06-12.md
        └── UNIFIED_API_IMPLEMENTATION_GUIDE_2026-06-12.md
```

### Flux de données

```
Source Data (RU, AirROI, etc.)
        ↓
Transformer (transformRuApiCall, etc.)
        ↓
UnifiedApiCall (type générique)
        ↓
UnifiedApiCallTable (composant)
        ↓
UI (Business ou Debug mode)
```

---

## Composants créés

### 1. Types (`src/types/unified-api-call.ts`)

**Définit les types génériques pour toutes les sources:**

```typescript
export type ApiCallSource = 'airroi' | 'ru-api' | 'ru-webhook' | 'ingress';
export type ViewMode = 'business' | 'debug';

export interface UnifiedApiCall {
  id: string;
  source: ApiCallSource;
  timestamp: Date;
  action: string;
  request: ApiCallContent;
  response: ApiCallContent;
  status: 'success' | 'error' | 'warning';
  httpStatus?: number;
  durationMs: number;

  // Context business (optionnel)
  ownerId?: string;
  ownerName?: string;
  listingId?: string;
  listingName?: string;
  reservationId?: string;
  reservationCode?: string;
  channel?: string;
  triggeredBy?: string;
  correlationId?: string;

  metadata: Record<string, unknown>;
}
```

**Point clé:** Le champ `response.enriched` est **conditionnel** et ne sera rempli qu'en mode business.

### 2. Transformers (`src/utils/unified-transformers.ts`)

**Convertit les données source-specific en UnifiedApiCall:**

```typescript
// RU API
export function transformRuApiCall(ru: RuApiCall, enriched = false): UnifiedApiCall {
  return {
    // ... autres champs
    response: {
      format: 'xml',
      content: ru.responseXml,          // ← Toujours présent
      enriched: enriched ? ru.responseJson : undefined, // ← Conditionnel
    },
  };
}

// RU Webhook
export function transformRuWebhook(webhook: RuWebhook, enriched = false): UnifiedApiCall {
  return {
    // ... autres champs
    request: {
      format: 'xml',
      content: webhook.xmlData,
      enriched: enriched ? webhook.parsedData : undefined,
    },
  };
}

// AirROI (toujours JSON)
export function transformAirroiCall(airroi: AirroiCall): UnifiedApiCall {
  // Pas de paramètre enriched (toujours JSON)
}

// Ingress HTTP
export function transformIngressHttp(ingress: IngressHttp): UnifiedApiCall {
  // HTTP raw
}
```

### 3. Composants UI

#### `UnifiedApiCallTable.tsx` ⭐ (Composant principal)

**Props:**
```typescript
interface UnifiedApiCallTableProps {
  calls: UnifiedApiCall[];           // Données transformées
  viewMode: ViewMode;                // 'business' | 'debug'
  onCallClick?: (call: UnifiedApiCall) => void;
  showBusinessContext?: boolean;     // Afficher colonnes business
}
```

**Colonnes adaptatives selon mode:**

| Mode Business | Mode Debug |
|---------------|------------|
| Timestamp | Timestamp |
| Action | Action |
| Status | Status |
| **Context** (badges) | **Source** |
| Duration | **Req/Res Size** |
|  | Duration |

#### `UnifiedApiCallDetail.tsx` (Vue détaillée)

**Affichage conditionnel:**
- Mode Business: JSON enrichi + bouton "Show Raw"
- Mode Debug: XML/JSON brut uniquement

**3 tabs:**
- Request
- Response
- Metadata

#### `UnifiedApiIcons.tsx` (Icônes par action)

**30+ icônes mappées:**
- PutBlock → 🔒
- RemoveBlock → 🔓
- PullListOwnerBlock → 📥
- LNM_PutConfirmedReservation_RQ → ✅
- etc.

#### `UnifiedApiBadges.tsx` (Badges contextuels)

**Badges adaptatifs:**
- Channel (Airbnb 🏨, Booking 🏨, RU 🏨)
- Trigger (Auto ⚡ vs Manual 👤)
- Owner (👤)
- Listing (🏠)
- Reservation (📅)

#### `UnifiedApiStatus.tsx` (Badges de statut)

**Composants:**
- `StatusBadge`: Statut global (success ✓, error ✗, warning ⚠)
- `HttpStatusBadge`: HTTP status code avec couleur sémantique
- `DurationBadge`: Durée avec couleur selon performance
- `SizeBadge`: Taille (bytes, KB, MB)

### 4. Page de démo (`UnifiedApiDemo.tsx`)

**Fonctionnalités:**
- Toggle Business / Debug
- Stats (Total, Success, Errors, Avg Duration)
- Données mockées (2 RU + 1 AirROI)
- Démonstration interactive

---

## Modes Business vs Debug

### Mode Business

**Caractéristiques:**
- ✅ Données enrichies (JSON parsé)
- ✅ Contexte métier (owner, listing, reservation)
- ✅ Badges contextuels
- ✅ Vue simplifiée

**Colonnes:**
```
Timestamp | Action | Status | Context (badges) | Duration
```

**Détail (expandé):**
```
- JSON enrichi affiché par défaut
- Bouton "Show Raw" pour voir XML brut
- Metadata business (owner, listing, etc.)
```

**Code:**
```typescript
const enriched = true;
const calls = ruCalls.map(call => transformRuApiCall(call, enriched));

<UnifiedApiCallTable
  calls={calls}
  viewMode="business"
  showBusinessContext={true}
/>
```

### Mode Debug

**Caractéristiques:**
- ✅ Données brutes uniquement (XML/JSON)
- ✅ Pas d'enrichissement
- ✅ Colonnes techniques
- ✅ Debugging facilité

**Colonnes:**
```
Timestamp | Action | Status | Source | Req/Res Size | Duration
```

**Détail (expandé):**
```
- XML/JSON brut uniquement
- Syntax highlighting
- Bouton de copie
- Pas de JSON enrichi
```

**Code:**
```typescript
const enriched = false; // ← Important!
const calls = ruCalls.map(call => transformRuApiCall(call, enriched));

<UnifiedApiCallTable
  calls={calls}
  viewMode="debug"
  showBusinessContext={false}
/>
```

---

## Sources supportées

### 1. RU API (Rental United)

**Actions supportées:**
- **Pull** (GET): PullListOwnerBlock, PullListOwnerProp, LocationDetails, PullReservations, PullOwnerDetails
- **Push** (POST): PutBlock, RemoveBlock, NotificationReport, PushProperty, CancelReservation
- **OAuth**: OAuth, OAuthToken, OAuthRefresh
- **REST Messaging**: RU_REST_GET_api_messaging, RU_REST_POST_api_messaging

**Format:**
- Request: XML
- Response: XML + JSON enrichi (si business mode)

**Transformer:**
```typescript
transformRuApiCall(call, enriched)
```

### 2. RU Webhooks

**Events supportés:**
- LNM_PutConfirmedReservation_RQ → ✅
- LNM_CancelReservation_RQ → ❌
- LNM_GetLeads_RQ → 🎯
- LNM_PutReview_RQ → ⭐

**Format:**
- Request: XML (de RU vers nous)
- Response: XML (notre réponse)

**Transformer:**
```typescript
transformRuWebhook(webhook, enriched)
```

### 3. AirROI APIs

**Endpoints:**
- GET/POST/PATCH/DELETE /api/listings
- GET/POST /api/pricing
- PATCH /api/calendar
- GET /api/reviews

**Format:**
- Request: JSON
- Response: JSON

**Transformer:**
```typescript
transformAirroiCall(call) // Pas de paramètre enriched
```

### 4. Ingress HTTP

**Types:**
- POST /webhook
- GET /health
- POST /api/channels

**Format:**
- Request: HTTP raw
- Response: HTTP raw

**Transformer:**
```typescript
transformIngressHttp(call)
```

---

## Guide d'utilisation

### Import de base

```typescript
import { UnifiedApiCallTable } from '../components/unified';
import { transformRuApiCall } from '../utils/unified-transformers';
import type { RuApiCall } from '../utils/unified-transformers';
```

### Exemple minimal

```typescript
function MyApiTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const { data: ruCalls } = useQuery(['ru-calls'], fetchRuCalls);

  // Transformer selon le mode
  const enriched = viewMode === 'business';
  const unifiedCalls = ruCalls.map(call =>
    transformRuApiCall(call, enriched)
  );

  return (
    <UnifiedApiCallTable
      calls={unifiedCalls}
      viewMode={viewMode}
      showBusinessContext={viewMode === 'business'}
    />
  );
}
```

### Exemple avec toggle Business/Debug

```typescript
function RuCombinedTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const { data: calls } = useQuery(['ru-calls'], fetchRuCalls);

  const enriched = viewMode === 'business';
  const unifiedCalls = calls.map(call => transformRuApiCall(call, enriched));

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setViewMode('business')}
          className={viewMode === 'business' ? 'active' : ''}
        >
          Business
        </button>
        <button
          onClick={() => setViewMode('debug')}
          className={viewMode === 'debug' ? 'active' : ''}
        >
          Debug
        </button>
      </div>

      {/* Tableau */}
      <UnifiedApiCallTable
        calls={unifiedCalls}
        viewMode={viewMode}
        showBusinessContext={viewMode === 'business'}
      />
    </div>
  );
}
```

### Exemple multi-sources

```typescript
function AllSourcesTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const enriched = viewMode === 'business';

  const { data: ruCalls } = useQuery(['ru-calls'], fetchRuCalls);
  const { data: airroiCalls } = useQuery(['airroi-calls'], fetchAirroiCalls);
  const { data: webhooks } = useQuery(['ru-webhooks'], fetchRuWebhooks);

  // Transformer chaque source
  const ruUnified = ruCalls.map(c => transformRuApiCall(c, enriched));
  const airroiUnified = airroiCalls.map(c => transformAirroiCall(c));
  const webhookUnified = webhooks.map(w => transformRuWebhook(w, enriched));

  // Combiner et trier
  const allCalls = [...ruUnified, ...airroiUnified, ...webhookUnified].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <UnifiedApiCallTable
      calls={allCalls}
      viewMode={viewMode}
      showBusinessContext={viewMode === 'business'}
    />
  );
}
```

---

## Intégration avec les tabs existants

### Migrer BusinessTab.tsx

**Avant:**
```typescript
// BusinessTab.tsx (ancien)
function BusinessTab() {
  const { data: ruCalls } = useRuCalls();

  return <RuBusinessTable calls={ruCalls} />;
}
```

**Après:**
```typescript
// BusinessTab.tsx (nouveau)
import { UnifiedApiCallTable } from '../components/unified';
import { transformRuApiCall } from '../utils/unified-transformers';

function BusinessTab() {
  const { data: ruCalls } = useRuCalls();

  // Transformer avec enrichissement (business mode)
  const unifiedCalls = ruCalls.map(call =>
    transformRuApiCall(call, true) // ← enriched = true
  );

  return (
    <UnifiedApiCallTable
      calls={unifiedCalls}
      viewMode="business"
      showBusinessContext={true}
    />
  );
}
```

### Migrer DebugApiTab.tsx

**Avant:**
```typescript
// DebugApiTab.tsx (ancien)
function DebugApiTab() {
  const { data: ruCalls } = useRuCalls();

  return <RuDebugTable calls={ruCalls} />;
}
```

**Après:**
```typescript
// DebugApiTab.tsx (nouveau)
import { UnifiedApiCallTable } from '../components/unified';
import { transformRuApiCall } from '../utils/unified-transformers';

function DebugApiTab() {
  const { data: ruCalls } = useRuCalls();

  // Transformer SANS enrichissement (debug mode)
  const unifiedCalls = ruCalls.map(call =>
    transformRuApiCall(call, false) // ← enriched = false
  );

  return (
    <UnifiedApiCallTable
      calls={unifiedCalls}
      viewMode="debug"
      showBusinessContext={false}
    />
  );
}
```

---

## URL et routes

### URLs disponibles

| URL | Description |
|-----|-------------|
| `http://127.0.0.1:4174/admin/unified` | UI logs unifiée |
| `http://127.0.0.1:4174/admin/channels?tab=Debug` | Onglet Debug RU (composant unifié, mode brut) |
| `http://127.0.0.1:4174/admin/channels` | Interface principale channels (existante) |
| `http://127.0.0.1:4174/admin/sojori-logs` | Logs admin Sojori (existante) |

### Configuration route (App.tsx)

```typescript
// App.tsx
const UnifiedApiDemo = lazy(() =>
  import('./pages/UnifiedApiDemo').then((module) => ({ default: module.UnifiedApiDemo }))
);

// ...

<Route path="/admin/unified-api-demo" element={<LazyRoute><UnifiedApiDemo /></LazyRoute>} />
```

---

## Checklist de migration

Pour migrer un tab existant vers les composants unifiés:

- [x] **DebugApiTab** — intégré (2026-06-13) via `debugApiRowMapper.ts`, mode `debug`, lazy-load bodies conservé
- [ ] **BusinessTab** — à migrer (mode `business`, `enriched=true`)
- [ ] Identifier la source des données (RU API, RU Webhook, AirROI, Ingress)
- [ ] Identifier le mode (business ou debug)
- [ ] Vérifier que les données sources matchent le type attendu
- [ ] Importer le bon transformer
- [ ] Appliquer le transformer avec le bon paramètre `enriched`
- [ ] Remplacer l'ancien composant par `<UnifiedApiCallTable>`
- [ ] Tester l'affichage en mode business
- [ ] Tester l'affichage en mode debug
- [ ] Vérifier que les lignes sont expandables
- [ ] Vérifier que les badges/icônes sont corrects

---

## Règles critiques

### ✅ À FAIRE

1. **Toujours** utiliser `enriched = false` pour mode debug
2. **Toujours** utiliser `enriched = true` pour mode business
3. **Toujours** passer `viewMode` au composant `UnifiedApiCallTable`
4. **Toujours** vérifier que les données sources ont le bon format

### ❌ À NE PAS FAIRE

1. ❌ Ne **jamais** afficher `responseJson` en mode debug
2. ❌ Ne **jamais** utiliser `enriched = true` si les données ne sont pas disponibles
3. ❌ Ne **jamais** créer des composants custom quand `UnifiedApiCallTable` peut faire le job
4. ❌ Ne **jamais** modifier les transformers sans consulter cette doc

---

## Documents de référence

1. **`docs/monitoring/AUDIT_DESIGN_SOJORI_ORCHESTRATOR_LOGS_2026-06-12.md`**
   Audit initial du système de logs (backend srv-logs-proxy, MongoDB, RabbitMQ)

2. **`docs/monitoring/RU_INTERFACE_DESIGN_IMPROVEMENTS_2026-06-12.md`**
   Améliorations spécifiques RU (DebugApiTab.tsx, BusinessTab.tsx)

3. **`docs/monitoring/CHANNELS_UI_UNIFIED_DESIGN_2026-06-12.md`**
   Design unifié pour toutes les sources (wireframes, navigation)

4. **`docs/monitoring/UNIFIED_API_IMPLEMENTATION_GUIDE_2026-06-12.md`**
   Guide d'implémentation technique détaillé

5. **`docs/channels/UNIFIED_API_LOGS_SYSTEM.md`** (ce document)
   Documentation consolidée du système

---

**Fin du document**
**Dernière mise à jour:** 2026-06-13
**Auteur:** Claude Code
