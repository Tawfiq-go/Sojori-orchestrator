# Guide d'implémentation - Unified API Components

**Date:** 2026-06-12
**Auteur:** Claude Code
**Objectif:** Documentation complète pour utiliser les composants unifiés d'API calls

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Usage des composants](#usage-des-composants)
5. [Transformers par source](#transformers-par-source)
6. [Modes Business vs Debug](#modes-business-vs-debug)
7. [Intégration avec les tabs existants](#intégration-avec-les-tabs-existants)
8. [Exemples d'usage](#exemples-dusage)

---

## Vue d'ensemble

### Problème résolu

Avant cette implémentation, chaque source d'API (AirROI, RU APIs, RU Webhooks, Ingress HTTP) avait son propre composant avec:
- Logique dupliquée
- Interfaces incohérentes
- Difficulté à maintenir 2 modes (business/debug)

### Solution apportée

**Un seul composant réutilisable** (`UnifiedApiCallTable`) qui:
- ✅ Accepte n'importe quelle source via un type unifié
- ✅ Supporte 2 modes: business (enrichi) et debug (brut)
- ✅ Réutilise les mêmes composants UI (badges, icons, status)
- ✅ Respecte la règle: **debug = brut, business = enrichi**

---

## Architecture

```
src/
├── types/
│   └── unified-api-call.ts          # Types génériques UnifiedApiCall
├── utils/
│   └── unified-transformers.ts      # Transformers par source
├── components/unified/
│   ├── index.ts                     # Exports
│   ├── UnifiedApiCallTable.tsx      # Tableau principal
│   ├── UnifiedApiCallDetail.tsx     # Vue détaillée (expandable)
│   ├── UnifiedApiIcons.tsx          # Icônes par action
│   ├── UnifiedApiBadges.tsx         # Badges contextuels
│   └── UnifiedApiStatus.tsx         # Badges de statut
└── pages/
    └── UnifiedApiDemo.tsx           # Page de démo
```

---

## Installation & Setup

### 1. Vérifier les fichiers créés

Tous les fichiers suivants doivent être présents:

```bash
# Types
src/types/unified-api-call.ts

# Transformers
src/utils/unified-transformers.ts

# Composants
src/components/unified/index.ts
src/components/unified/UnifiedApiCallTable.tsx
src/components/unified/UnifiedApiCallDetail.tsx
src/components/unified/UnifiedApiIcons.tsx
src/components/unified/UnifiedApiBadges.tsx
src/components/unified/UnifiedApiStatus.tsx

# Demo
src/pages/UnifiedApiDemo.tsx
```

### 2. Installer les dépendances (si nécessaire)

Les composants utilisent uniquement:
- React (déjà installé)
- TailwindCSS (déjà configuré)

Aucune dépendance supplémentaire requise.

---

## Usage des composants

### Import de base

```tsx
import { UnifiedApiCallTable } from '../components/unified';
import { transformRuApiCall } from '../utils/unified-transformers';
import type { RuApiCall } from '../utils/unified-transformers';
```

### Exemple minimal

```tsx
function MyApiTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('business');

  // Récupérer les données depuis l'API
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

---

## Transformers par source

### RU API Calls

**Important:** Le transformer a un paramètre `enriched` qui contrôle si les données enrichies sont incluses.

```tsx
import { transformRuApiCall } from '../utils/unified-transformers';
import type { RuApiCall } from '../utils/unified-transformers';

// Mode Debug: enriched = false (pas d'enrichissement)
const debugCalls = ruCalls.map(call =>
  transformRuApiCall(call, false)
);

// Mode Business: enriched = true (avec enrichissement)
const businessCalls = ruCalls.map(call =>
  transformRuApiCall(call, true)
);
```

**Type d'entrée attendu:**

```typescript
interface RuApiCall {
  id: string;
  createdAt: Date;
  action: string;
  requestXml: string;          // ← XML brut (toujours présent)
  responseXml: string;         // ← XML brut (toujours présent)
  responseJson?: Record<string, unknown>; // ← JSON enrichi (optionnel, business mode)
  status: 'success' | 'failed' | 'error';
  statusCode?: string;
  responseMsg?: string;
  httpStatus?: number;
  responseTime: number;
  ownerId?: string;
  ownerName?: string;
  listingId?: string;
  listingName?: string;
  orchestrationId?: string;
  reservationId?: string;
  reservationCode?: string;
  channel?: string;
  triggeredBy?: string;
}
```

### RU Webhooks

```tsx
import { transformRuWebhook } from '../utils/unified-transformers';

const enriched = viewMode === 'business';
const webhookCalls = webhooks.map(webhook =>
  transformRuWebhook(webhook, enriched)
);
```

### AirROI Calls

```tsx
import { transformAirroiCall } from '../utils/unified-transformers';

const airroiCalls = calls.map(call =>
  transformAirroiCall(call) // Pas de paramètre enriched (toujours JSON)
);
```

### Ingress HTTP

```tsx
import { transformIngressHttp } from '../utils/unified-transformers';

const ingressCalls = calls.map(call =>
  transformIngressHttp(call)
);
```

---

## Modes Business vs Debug

### Mode Business

**Caractéristiques:**
- ✅ Données enrichies affichées (JSON parsé)
- ✅ Colonnes contextuelles (owner, listing, reservation)
- ✅ Badges contextuels (channel, trigger type)
- ✅ Vue simplifiée pour lecture métier

**Colonnes affichées:**
- Timestamp
- Action
- Status
- **Context** (badges: channel, trigger, owner, listing, etc.)
- Duration

**Détail (ligne expandée):**
- JSON enrichi affiché par défaut
- Bouton "Show Raw" pour voir XML/JSON brut si besoin

### Mode Debug

**Caractéristiques:**
- ✅ Données brutes uniquement (XML/JSON non parsé)
- ✅ Colonnes techniques (source, sizes)
- ✅ Pas d'enrichissement
- ✅ Vue technique pour debugging

**Colonnes affichées:**
- Timestamp
- Action
- Status
- **Source** (airroi, ru-api, ru-webhook, ingress)
- **Req/Res Size** (bytes)
- Duration

**Détail (ligne expandée):**
- XML/JSON brut uniquement
- Syntax highlighting
- Bouton de copie
- Pas d'enrichissement

---

## Intégration avec les tabs existants

### Migrer BusinessTab.tsx

**Avant:**
```tsx
// BusinessTab.tsx (ancien)
function BusinessTab() {
  const { data: ruCalls } = useRuCalls();

  return (
    <div>
      {/* Logique custom pour RU business */}
      <RuBusinessTable calls={ruCalls} />
    </div>
  );
}
```

**Après:**
```tsx
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
```tsx
// DebugApiTab.tsx (ancien)
function DebugApiTab() {
  const { data: ruCalls } = useRuCalls();

  return (
    <div>
      {/* Logique custom pour RU debug */}
      <RuDebugTable calls={ruCalls} />
    </div>
  );
}
```

**Après:**
```tsx
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

### Migrer un tab multi-sources

Si un tab affiche plusieurs sources (ex: AirROI + RU):

```tsx
function CombinedTab() {
  const { data: ruCalls } = useRuCalls();
  const { data: airroiCalls } = useAirroiCalls();

  const viewMode = 'business'; // ou 'debug'
  const enriched = viewMode === 'business';

  // Transformer chaque source
  const ruUnified = ruCalls.map(call => transformRuApiCall(call, enriched));
  const airroiUnified = airroiCalls.map(call => transformAirroiCall(call));

  // Combiner et trier par timestamp
  const allCalls = [...ruUnified, ...airroiUnified].sort(
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

## Exemples d'usage

### Exemple 1: Tab RU Business simple

```tsx
import { UnifiedApiCallTable } from '../components/unified';
import { transformRuApiCall } from '../utils/unified-transformers';

export function RuBusinessTab() {
  const { data: calls } = useQuery(['ru-calls'], fetchRuCalls);

  const unifiedCalls = calls.map(call => transformRuApiCall(call, true));

  return (
    <div className="space-y-4">
      <h2>RU API Calls - Business View</h2>
      <UnifiedApiCallTable
        calls={unifiedCalls}
        viewMode="business"
        showBusinessContext={true}
      />
    </div>
  );
}
```

### Exemple 2: Tab RU Debug simple

```tsx
import { UnifiedApiCallTable } from '../components/unified';
import { transformRuApiCall } from '../utils/unified-transformers';

export function RuDebugTab() {
  const { data: calls } = useQuery(['ru-calls'], fetchRuCalls);

  const unifiedCalls = calls.map(call => transformRuApiCall(call, false));

  return (
    <div className="space-y-4">
      <h2>RU API Calls - Debug View (Raw XML)</h2>
      <UnifiedApiCallTable
        calls={unifiedCalls}
        viewMode="debug"
        showBusinessContext={false}
      />
    </div>
  );
}
```

### Exemple 3: Tab avec toggle Business/Debug

```tsx
import { useState } from 'react';
import { UnifiedApiCallTable } from '../components/unified';
import { transformRuApiCall } from '../utils/unified-transformers';
import type { ViewMode } from '../types/unified-api-call';

export function RuCombinedTab() {
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

### Exemple 4: Multi-sources (RU + AirROI + Webhooks)

```tsx
import { UnifiedApiCallTable } from '../components/unified';
import {
  transformRuApiCall,
  transformAirroiCall,
  transformRuWebhook
} from '../utils/unified-transformers';

export function AllSourcesTab() {
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

## Résumé des règles critiques

### ✅ À FAIRE

1. **Toujours** utiliser `enriched = false` pour mode debug
2. **Toujours** utiliser `enriched = true` pour mode business
3. **Toujours** passer `viewMode` au composant `UnifiedApiCallTable`
4. **Toujours** vérifier que les données sources ont le bon format (voir types)

### ❌ À NE PAS FAIRE

1. ❌ Ne **jamais** afficher `responseJson` en mode debug
2. ❌ Ne **jamais** utiliser `enriched = true` si les données ne sont pas disponibles
3. ❌ Ne **jamais** créer des composants custom quand `UnifiedApiCallTable` peut faire le job
4. ❌ Ne **jamais** modifier les transformers sans lire ce guide

---

## Checklist de migration

Pour migrer un tab existant vers les composants unifiés:

- [ ] Identifier la source des données (RU API, RU Webhook, AirROI, Ingress)
- [ ] Identifier le mode (business ou debug)
- [ ] Vérifier que les données sources matchent le type attendu (voir `unified-transformers.ts`)
- [ ] Importer le bon transformer
- [ ] Appliquer le transformer avec le bon paramètre `enriched`
- [ ] Remplacer l'ancien composant par `<UnifiedApiCallTable>`
- [ ] Tester l'affichage en mode business
- [ ] Tester l'affichage en mode debug
- [ ] Vérifier que les lignes sont expandables
- [ ] Vérifier que les badges/icônes sont corrects

---

## Support & Questions

Pour toute question ou bug:
1. Lire ce guide en entier
2. Vérifier les types dans `unified-api-call.ts`
3. Vérifier les transformers dans `unified-transformers.ts`
4. Tester avec la page de démo `UnifiedApiDemo.tsx`

---

**Fin du guide**
