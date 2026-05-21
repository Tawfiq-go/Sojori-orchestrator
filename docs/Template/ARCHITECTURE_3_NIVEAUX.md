# 🏗️ Architecture 3 Niveaux - Refonte Complète

**Date** : 2026-05-20

**Objectif** : Clarifier les 3 niveaux du système et ce qui doit être refait pour chacun

---

## 📊 Vue d'Ensemble

Le système Sojori a **3 NIVEAUX** distincts qui doivent être simplifiés :

```
┌─────────────────────────────────────────────────────┐
│  NIVEAU 1 : DASHBOARD (Property Manager)           │
│  Frontend : Sojori-orchestrator (React)             │
│  URL : /admin/settings?tab=template                 │
│  URL : /listings/{id} → Config orchestration        │
└─────────────────────────────────────────────────────┘
                          ↓
                   Configure via API
                          ↓
┌─────────────────────────────────────────────────────┐
│  NIVEAU 2 : BACKEND (APIs + Database)               │
│  Backend : srv-admin, srv-listing, srv-chatbot      │
│  MongoDB : adminConfig, listings, etc.              │
│  Stocke les configurations                          │
└─────────────────────────────────────────────────────┘
                          ↓
                   Utilisé par chatbot
                          ↓
┌─────────────────────────────────────────────────────┐
│  NIVEAU 3 : FLOWS WHATSAPP (Client)                 │
│  Flows JSON : flow_support.json, etc.               │
│  Via srv-chatbot : Envoi flows au client            │
│  Client WhatsApp : Rempli le flow                   │
└─────────────────────────────────────────────────────┘
```

---

## NIVEAU 1 : 🎨 DASHBOARD (Frontend)

### Où ?

**Repository** : `/Users/gouacht/Sojori-orchestrator/`

**Pages** :
- Admin Template : `/admin/settings?tab=template`
- Listing Config : `/listings/{id}` (onglet Config orchestration)

### Quoi ?

Interface pour que le **Property Manager** configure :

#### Admin Template (Default pour tous les listings)
```
/admin/settings?tab=template

Onglets :
├── 🆘 Support
├── 🏨 Conciergerie
├── 🧹 Ménage (nouveau)
└── 📜 Règles & Infos
```

#### Listing Config (Override par listing)
```
/listings/{listingId}

Même structure + bouton "Synchroniser avec admin"
```

### Composants React à créer/modifier

**Admin Template** :
```
/src/features/setting/components/
├── SimpleSupportConfig.jsx         (nouveau - remplace SupportCategoriesTemplate)
├── SimpleConciergeConfig.jsx       (nouveau - remplace ConciergeServicesTemplate)
├── SimpleCleaningConfig.jsx        (nouveau - à créer)
└── SimpleRulesConfig.jsx           (nouveau - remplace RulesAndInfos)
```

**Listing Config** :
```
/src/components/listing/form-v2/components/config/
├── ListingSimpleSupportPanel.jsx   (nouveau)
├── ListingSimpleConciergePanel.jsx (nouveau)
├── ListingSimpleCleaningPanel.jsx  (nouveau)
└── ListingSimpleRulesPanel.jsx     (nouveau)
```

### Interfaces à Créer (Maquettes)

Pour chaque service :

**Support** :
```
┌─────────────────────────────────────┐
│  🆘 Support - Configuration         │
├─────────────────────────────────────┤
│                                     │
│  Catégories disponibles :           │
│  ☑ 🔧 Technique                     │
│  ☑ 🛋️ Confort                      │
│  ☑ 💬 Question générale             │
│                                     │
│  [Enregistrer]                      │
└─────────────────────────────────────┘
```

**Conciergerie** :
```
┌─────────────────────────────────────┐
│  🏨 Conciergerie - Configuration    │
├─────────────────────────────────────┤
│                                     │
│  Services disponibles :             │
│  ☑ 🚗 Transport                     │
│  ☑ 🛒 Courses                       │
│  ☑ 🍽️ Restaurant                    │
│  ☑ 💆 SPA/Massage                   │
│  ☐ 👶 Babysitting                   │
│  ☐ 🗺️ Guide touristique             │
│                                     │
│  [+ Ajouter service personnalisé]   │
│  [Enregistrer]                      │
└─────────────────────────────────────┘
```

**Ménage** :
```
┌─────────────────────────────────────┐
│  🧹 Ménage - Configuration          │
├─────────────────────────────────────┤
│                                     │
│  ☑ 🧹 Ménage standard               │
│     • Arrivée : [✓ Auto]           │
│     • Départ : [✓ Auto]            │
│     • Durée : [2h]                 │
│                                     │
│  ☑ 🧼 Ménage complet                │
│     • Sur demande client            │
│     • Durée : [4h]                 │
│     • Supplément : [200 DH]        │
│                                     │
│  [Enregistrer]                      │
└─────────────────────────────────────┘
```

**Règles & Infos** :
```
┌─────────────────────────────────────┐
│  📜 Règles & Infos - Configuration  │
├─────────────────────────────────────┤
│                                     │
│  ✅ Règles de la maison             │
│  1. [Ex: Non fumeur]                │
│  2. [Ex: Animaux interdits]         │
│  3. [Ex: Calme après 22h]           │
│  4. [...]                           │
│  5. [...]                           │
│                                     │
│  🏠 Accès & Arrivée                 │
│  [Texte libre - instructions]       │
│                                     │
│  ℹ️ Infos utiles                    │
│  • WiFi : [...]                     │
│  • Parking : [...]                  │
│  • Urgences : [...]                 │
│                                     │
│  [Enregistrer]                      │
└─────────────────────────────────────┘
```

---

## NIVEAU 2 : 🔧 BACKEND (APIs + MongoDB)

### Où ?

**Repository** : `/Users/gouacht/sojori-production/`

**Services** :
- `apps/srv-admin/` - Gestion templates admin
- `apps/srv-listing/` - Application aux listings
- `apps/srv-chatbot/` - Envoi flows WhatsApp

### Quoi ?

**APIs à créer** :

#### srv-admin (Templates)

```javascript
// Support simplifié
GET    /api/v1/admin/simple-config/support/:ownerId?
PUT    /api/v1/admin/simple-config/support/:ownerId?
POST   /api/v1/admin/simple-config/support/reset/:ownerId?

// Conciergerie simplifiée
GET    /api/v1/admin/simple-config/concierge/:ownerId?
PUT    /api/v1/admin/simple-config/concierge/:ownerId?
POST   /api/v1/admin/simple-config/concierge/reset/:ownerId?

// Ménage (nouveau)
GET    /api/v1/admin/simple-config/cleaning/:ownerId?
PUT    /api/v1/admin/simple-config/cleaning/:ownerId?
POST   /api/v1/admin/simple-config/cleaning/reset/:ownerId?

// Règles simplifiées
GET    /api/v1/admin/simple-config/rules/:ownerId?
PUT    /api/v1/admin/simple-config/rules/:ownerId?
POST   /api/v1/admin/simple-config/rules/reset/:ownerId?
```

#### srv-listing (Application aux listings)

```javascript
// Synchronisation avec admin
POST   /api/v1/listing/:id/sync-simple-config
// Récupération config d'un listing
GET    /api/v1/listing/:id/simple-config
// Mise à jour config d'un listing
PUT    /api/v1/listing/:id/simple-config
```

#### srv-chatbot (Flows WhatsApp)

```javascript
// Envoi flow simplifié
POST   /api/v1/ai/send-simple-flow
// Réception réponse flow
POST   /api/v1/ai/flow-response
```

### Schémas MongoDB

**Collection : adminConfig**

```javascript
{
  _id: ObjectId,
  ownerId: ObjectId,

  // Support simplifié
  simpleSupport: {
    enabled: true,
    categories: [
      { id: 'technical', name: { fr: 'Technique', en: 'Technical' }, enabled: true },
      { id: 'comfort', name: { fr: 'Confort', en: 'Comfort' }, enabled: true },
      { id: 'question', name: { fr: 'Question', en: 'Question' }, enabled: true }
    ]
  },

  // Conciergerie simplifiée
  simpleConcierge: {
    enabled: true,
    services: [
      {
        id: 'transport',
        name: { fr: 'Transport', en: 'Transport' },
        icon: '🚗',
        enabled: true,
        fields: [
          { id: 'destination', type: 'text', required: true },
          { id: 'datetime', type: 'datetime', required: true },
          { id: 'passengers', type: 'number', required: true }
        ]
      },
      {
        id: 'grocery',
        name: { fr: 'Courses', en: 'Grocery' },
        icon: '🛒',
        enabled: true,
        fields: [
          { id: 'list', type: 'textarea', required: true },
          { id: 'budget', type: 'number', required: false },
          { id: 'datetime', type: 'datetime', required: true }
        ]
      }
      // ... autres services
    ]
  },

  // Ménage (nouveau)
  simpleCleaning: {
    enabled: true,
    types: [
      {
        id: 'standard',
        name: { fr: 'Ménage standard', en: 'Standard cleaning' },
        icon: '🧹',
        auto: true,
        duration: 2,
        price: 0
      },
      {
        id: 'complete',
        name: { fr: 'Ménage complet', en: 'Complete cleaning' },
        icon: '🧼',
        auto: false,
        duration: 4,
        price: 200
      }
    ]
  },

  // Règles simplifiées
  simpleRules: {
    enabled: true,
    houseRules: [
      { fr: 'Non fumeur', en: 'No smoking' },
      { fr: 'Animaux interdits', en: 'No pets' },
      { fr: 'Calme après 22h', en: 'Quiet after 10pm' }
    ],
    accessInstructions: {
      fr: 'Instructions d\'accès en français...',
      en: 'Access instructions in english...'
    },
    usefulInfo: {
      wifi: { fr: 'Code WiFi: ...', en: 'WiFi code: ...' },
      parking: { fr: 'Parking gratuit devant', en: 'Free parking in front' },
      emergency: { fr: 'Urgences: +212...', en: 'Emergency: +212...' }
    }
  },

  version: 1,
  updatedAt: Date,
  createdAt: Date
}
```

**Collection : listings**

```javascript
{
  _id: ObjectId,
  // ... autres champs listing

  // Config orchestration simplifiée
  simpleConfig: {
    // Peut hériter de adminConfig ou override
    support: { /* même structure */ },
    concierge: { /* même structure */ },
    cleaning: { /* même structure */ },
    rules: { /* même structure */ },

    inheritFromAdmin: {
      support: true,
      concierge: true,
      cleaning: true,
      rules: false  // override local
    }
  }
}
```

### Fichiers Backend à créer/modifier

**srv-admin** :
```
apps/srv-admin/src/
├── routes/simpleConfig/
│   ├── getSimpleSupport.ts         (nouveau)
│   ├── updateSimpleSupport.ts      (nouveau)
│   ├── getSimpleConcierge.ts       (nouveau)
│   ├── updateSimpleConcierge.ts    (nouveau)
│   ├── getSimpleCleaning.ts        (nouveau)
│   ├── updateSimpleCleaning.ts     (nouveau)
│   ├── getSimpleRules.ts           (nouveau)
│   └── updateSimpleRules.ts        (nouveau)
├── db/models/
│   └── SimpleConfig.ts             (nouveau schéma)
└── services/
    └── simpleConfigService.ts      (nouveau)
```

**srv-listing** :
```
apps/srv-listing/src/
├── routes/listing/
│   ├── syncSimpleConfig.ts         (nouveau)
│   └── getSimpleConfig.ts          (nouveau)
└── services/
    └── simpleConfigService.ts      (nouveau)
```

---

## NIVEAU 3 : 📱 FLOWS WHATSAPP (Client)

### Où ?

**Repository** : `/Users/gouacht/sojori-production/apps/srv-chatbot/`

**Fichiers JSON** : `apps/srv-chatbot/flows/`

### Quoi ?

**Flows JSON à créer** (remplacer les 10+ existants par 4 simples) :

#### 1. flow_simple_support.json

**Structure (3 écrans)** :

```json
{
  "version": "7.2",
  "routing_model": {
    "SELECT_CATEGORY": ["SUPPORT_DETAILS"],
    "SUPPORT_DETAILS": ["CONFIRMATION"]
  },
  "screens": [
    {
      "id": "SELECT_CATEGORY",
      "title": "🆘 Support",
      "data": {
        "categories": [
          { "id": "technical", "title": "🔧 Technique", "description": "Problème technique" },
          { "id": "comfort", "title": "🛋️ Confort", "description": "Problème de confort" },
          { "id": "question", "title": "💬 Question", "description": "Question générale" }
        ]
      }
    },
    {
      "id": "SUPPORT_DETAILS",
      "title": "📝 Détails",
      "data": {
        "description_label": "Décrivez le problème",
        "urgent_label": "C'est urgent ?"
      }
    },
    {
      "id": "CONFIRMATION",
      "title": "✅ Confirmation"
    }
  ]
}
```

**3 écrans. C'est tout.**

#### 2. flow_simple_concierge.json

**Structure (3-4 écrans)** :

```json
{
  "version": "7.2",
  "routing_model": {
    "SELECT_SERVICE": ["SERVICE_DETAILS"],
    "SERVICE_DETAILS": ["CONFIRMATION"]
  },
  "screens": [
    {
      "id": "SELECT_SERVICE",
      "title": "🏨 Conciergerie",
      "data": {
        "services": [
          { "id": "transport", "title": "🚗 Transport" },
          { "id": "grocery", "title": "🛒 Courses" },
          { "id": "restaurant", "title": "🍽️ Restaurant" },
          { "id": "spa", "title": "💆 SPA" },
          { "id": "babysitting", "title": "👶 Babysitting" },
          { "id": "guide", "title": "🗺️ Guide" }
        ]
      }
    },
    {
      "id": "SERVICE_DETAILS",
      "title": "📝 Détails",
      "comment": "Champs dynamiques selon service sélectionné (max 3 questions)"
    },
    {
      "id": "CONFIRMATION",
      "title": "✅ Confirmation"
    }
  ]
}
```

**3 écrans avec champs dynamiques.**

#### 3. flow_simple_cleaning.json

**Structure (3 écrans)** :

```json
{
  "version": "7.2",
  "routing_model": {
    "SELECT_TYPE": ["SELECT_DATETIME"],
    "SELECT_DATETIME": ["CONFIRMATION"]
  },
  "screens": [
    {
      "id": "SELECT_TYPE",
      "title": "🧹 Ménage",
      "data": {
        "types": [
          { "id": "standard", "title": "🧹 Ménage standard", "description": "2h • Gratuit" },
          { "id": "complete", "title": "🧼 Ménage complet", "description": "4h • 200 DH" }
        ]
      }
    },
    {
      "id": "SELECT_DATETIME",
      "title": "📅 Date & Heure",
      "data": {
        "date_label": "Quel jour ?",
        "time_label": "Quelle heure ?"
      }
    },
    {
      "id": "CONFIRMATION",
      "title": "✅ Confirmation"
    }
  ]
}
```

**3 écrans. Simple.**

#### 4. Message automatique (Règles)

**Pas de flow interactif** - Juste un message envoyé automatiquement :

```
📜 RÈGLES DE LA MAISON

✅ Règles importantes :
1. Non fumeur
2. Animaux interdits
3. Calme après 22h
4. Maximum 4 personnes
5. Respect des lieux

🏠 ACCÈS & ARRIVÉE
[Instructions d'accès...]

ℹ️ INFOS UTILES
• WiFi : [code]
• Parking : [info]
• Urgences : [contact]

Merci de respecter ces règles ! 🙏
```

**Optionnel : Bouton de confirmation** :
```
[✅ J'ai lu et j'accepte les règles]
```

### Fichiers Python à créer/modifier

**Agents** :
```
apps/srv-chatbot/agents/
├── simple_support_agent.py         (nouveau)
├── simple_concierge_agent.py       (nouveau)
├── simple_cleaning_agent.py        (nouveau)
└── simple_rules_agent.py           (nouveau)
```

**Handlers** :
```
apps/srv-chatbot/
├── simple_support_handler.py       (nouveau)
├── simple_concierge_handler.py     (nouveau)
├── simple_cleaning_handler.py      (nouveau)
└── simple_rules_handler.py         (nouveau)
```

**Orchestrateur** :
```
apps/srv-chatbot/
└── simple_flow_orchestrator.py     (nouveau - unifié)
```

---

## 📊 Comparaison Globale : Avant vs Après

### NIVEAU 1 : Dashboard

| Élément | Avant | Après |
|---------|-------|-------|
| Composants React | ~8 fichiers | **4 fichiers** |
| Lignes de code | ~3,000 | **~1,200** |
| Temps config | 20-30 min | **5 min** |
| Onglets | 6 | **4** |

### NIVEAU 2 : Backend

| Élément | Avant | Après |
|---------|-------|-------|
| Routes API | ~20 | **12** |
| Schémas MongoDB | Dispersés | **1 centralisé** |
| Collections | Multiples | **2 (adminConfig + listings)** |
| Lignes de code | ~5,000 | **~2,000** |

### NIVEAU 3 : Flows WhatsApp

| Élément | Avant | Après |
|---------|-------|-------|
| Flows JSON | **10+** | **4** |
| Écrans moyens | 3-4 | **3** |
| Fichiers Python | ~10 | **5** |
| Lignes de code | ~10,000 | **~4,000** |

### TOTAL GLOBAL

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Fichiers totaux | ~40 | **~20** | **-50%** |
| Lignes de code | ~18,000 | **~7,200** | **-60%** |
| Complexité | 🔴 Très Haute | 🟢 **Basse** | **-80%** |
| Temps formation | 2h | **10 min** | **-92%** |

---

## 🎯 Ce que Claude Desktop doit créer

### Phase 1 : Maquettes (PRIORITÉ)

Pour **chaque niveau** :

#### NIVEAU 1 : Maquettes Dashboard
- Interface Admin Template (4 onglets)
- Interface Listing Config (4 onglets + sync)
- Format : Figma, Excalidraw, ou ASCII art

#### NIVEAU 2 : Specs Backend
- Schémas MongoDB détaillés
- Routes API (endpoints + payload)
- Logique de synchronisation

#### NIVEAU 3 : Maquettes Flows WhatsApp
- 4 flows JSON (structure complète)
- Diagrammes de navigation
- Exemples de données

### Phase 2 : Validation

Présenter les 3 niveaux ensemble :
- Dashboard (comment le PM configure)
- Backend (comment c'est stocké)
- Flows WhatsApp (comment le client utilise)

### Phase 3 : Implémentation

Après validation, implémenter dans l'ordre :
1. Backend (APIs + MongoDB)
2. Dashboard (React components)
3. Flows WhatsApp (JSON + handlers)

---

## 📋 Checklist pour Claude Desktop

### Comprendre les 3 niveaux
- [ ] Lire ce document
- [ ] Comprendre le lien Dashboard → Backend → Flows
- [ ] Identifier les dépendances

### Créer les maquettes
- [ ] Niveau 1 : Maquettes Dashboard (Support, Conciergerie, Ménage, Règles)
- [ ] Niveau 2 : Specs Backend (Schémas + APIs)
- [ ] Niveau 3 : Flows WhatsApp (4 flows JSON)

### Présenter
- [ ] Document complet avec les 3 niveaux
- [ ] Expliquer le flow de bout en bout
- [ ] Recueillir feedback

---

## 🔗 Liens entre les Niveaux

### Exemple : Support

```
1. Property Manager (NIVEAU 1 - Dashboard)
   ↓ Configure dans /admin/settings

2. Backend (NIVEAU 2)
   ↓ Stocke dans MongoDB (adminConfig.simpleSupport)

3. Client (NIVEAU 3 - WhatsApp)
   ↓ Reçoit flow_simple_support.json
   ↓ Remplit et soumet

4. Backend (NIVEAU 2)
   ↓ Crée une task support

5. Property Manager (NIVEAU 1)
   ↓ Reçoit notification
   ↓ Traite la demande
```

**Les 3 niveaux sont connectés !**

---

**Document créé le** : 2026-05-20

**Pour** : Clarifier la structure complète du système

**Les 3 niveaux doivent être simplifiés ENSEMBLE !**
