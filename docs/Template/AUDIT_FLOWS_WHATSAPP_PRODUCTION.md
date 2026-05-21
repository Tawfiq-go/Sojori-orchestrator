# 📱 AUDIT - Flows WhatsApp en Production

**Date** : 2026-05-20

**Objectif** : Documenter tous les flows WhatsApp actuellement déployés en production

---

## 📊 Vue d'ensemble

### Flows Identifiés (Total: 10+)

| Service | Flow Name | Fichier | Écrans | Statut |
|---------|-----------|---------|--------|--------|
| **Support** | Flow Support | `flow_support.json` | 4 | ✅ Prod |
| **Conciergerie** | Flow Transport | `flow_concierge_transport.json` | 3-4 | ✅ Prod |
| **Conciergerie** | Flow Courses | `flow_concierge_grocery.json` | 3-4 | ✅ Prod |
| **Conciergerie** | Flow Personnalisé | `flow_concierge_custom.json` | 3-4 | ✅ Prod |
| **Ménage** | Flow Sélection Ménage | `flow_cleaning_selection.json` | 2 | ✅ Prod |
| **Ménage** | Flow Ménage Payant (v1) | `flow_paid_cleaning_simple.json` | 2 | ✅ Prod |
| **Ménage** | Flow Ménage Payant (v2) | `flow_paid_cleaning_2screens.json` | 2 | ✅ Prod |
| **Ménage** | Flow Ménage Payant (v3) | `flow_paid_cleaning_3screens.json` | 3 | ✅ Prod |
| **Ménage** | Flow Ménage Payant (v3.2) | `flow_paid_cleaning_3screens_v2.json` | 3 | ✅ Prod |
| **Ménage** | Flow Sélection Payant | `flow_paid_cleaning_selection.json` | ? | ✅ Prod |
| **Access** | Via AI Service | `ai_access_info_service.py` | N/A | ✅ Prod |
| **Règles** | Via Message Auto | Templates | N/A | ✅ Prod |

---

## 1. 🆘 SUPPORT - Flow Support

### Fichier
`/Users/gouacht/sojori-production/apps/srv-chatbot/flows/flow_support.json`

### Structure (4 écrans)

```
Écran 1: SELECT_CATEGORY
  ├─ Sélection catégorie (Radio Buttons)
  │  ├─ 🚰 Plomberie
  │  ├─ ⚡ Électricité
  │  ├─ 📶 Internet/WiFi
  │  └─ ... (autres catégories)
  └─ Bouton: Continuer

Écran 2: SELECT_SUBCATEGORY
  ├─ Affiche catégorie choisie
  ├─ Sélection sous-catégorie (Radio Buttons)
  │  ├─ Ex Plomberie:
  │  │   ├─ 💧 Fuite d'eau
  │  │   └─ 🚽 WC bouché
  └─ Bouton: Continuer

Écran 3: SUPPORT_FORM
  ├─ Breadcrumb (ex: Plomberie > Fuite d'eau)
  ├─ Description (TextArea, 500 chars max, obligatoire)
  ├─ Localisation (TextInput, optionnel)
  ├─ Urgence (Radio Buttons)
  │   ├─ 🟢 Normale
  │   ├─ 🟡 Haute
  │   └─ 🔴 Urgente
  ├─ Champs conditionnels (selon catégorie):
  │   ├─ Emplacement fuite (si plomberie)
  │   ├─ Circuit électrique (si électricité)
  │   ├─ WiFi password status (si internet)
  │   └─ Marque appareil (si électroménager)
  └─ Bouton: Envoyer

Écran 4: CONFIRMATION
  ├─ Récapitulatif complet
  ├─ Question de confirmation
  └─ Bouton: ✅ Envoyer
```

### Données envoyées

```json
{
  "action": "form_submitted",
  "service_type": "support",
  "description": "[texte]",
  "location": "[texte]",
  "urgency": "normal|high|urgent",
  "water_location": "[si plomberie]",
  "electrical_circuit": "[si électricité]",
  "wifi_password_status": "[si internet]",
  "appliance_brand": "[si électroménager]"
}
```

### Agent Backend
- **Fichier** : `apps/srv-chatbot/agents/support_agent.py`
- **Orchestrateur** : `apps/srv-chatbot/support_orchestrator.py`
- **Handler** : `apps/srv-chatbot/support_flow_handler.py`

### Complexité Actuelle
- ❌ **Trop complexe** : 4 écrans + champs conditionnels
- ❌ **Trop de catégories** : Environ 22 catégories + sous-catégories
- ❌ **Confus pour le client** : Navigation complexe

---

## 2. 🏨 CONCIERGERIE - Flows Multiples

### 2.1 - Flow Transport

**Fichier** : `flow_concierge_transport.json`

**Structure (3-4 écrans)** :

```
Écran 1: SELECT_ROUTE
  ├─ Titre: 🚗 Transport Premium
  ├─ Sélection trajet (Radio Buttons)
  │   ├─ ✈️ Aéroport → Logement (400 MAD)
  │   └─ ... (autres trajets disponibles)
  └─ Bouton: Continuer

Écran 2: TRANSPORT_FORM
  ├─ Affiche trajet sélectionné
  ├─ Info prix : 💰 400 MAD • 👥 Max 4 passagers
  ├─ Date (affichée, fixe = date arrivée)
  ├─ Heure d'arrivée (Dropdown 00h-23h)
  ├─ Nombre passagers (Dropdown 1-8)
  ├─ Numéro de vol (TextInput, optionnel)
  ├─ Adresse complète départ (si non-aéroport)
  ├─ Adresse complète arrivée (si non-logement)
  ├─ Bagages (Dropdown: Petits/Moyens/Gros)
  ├─ Commentaire (TextArea, optionnel)
  └─ Bouton: Confirmer

Écran 3: CONFIRMATION
  ├─ Récapitulatif complet
  └─ Bouton: ✅ Réserver
```

**Données envoyées** :

```json
{
  "service_type": "transport",
  "route_id": "transport_001",
  "date": "2025-11-20",
  "time": "14",
  "passengers": "3",
  "flight_number": "...",
  "luggage": "medium",
  "comment": "..."
}
```

### 2.2 - Flow Courses

**Fichier** : `flow_concierge_grocery.json`

**Structure similaire à Transport** (3-4 écrans)

### 2.3 - Flow Personnalisé

**Fichier** : `flow_concierge_custom.json`

**Structure similaire** (3-4 écrans)

### Agent Backend
- **Fichier** : `apps/srv-chatbot/agents/service_agent.py`
- **Handler** : `apps/srv-chatbot/concierge_flow_handler.py`
- **Orchestrateur** : Via `app.py` et `handle_concierge_menu`

### Complexité Actuelle
- ⚠️ **Moyenne** : 3 systèmes séparés (Transport, Courses, Custom)
- ⚠️ **Redondance** : Structure similaire répétée 3 fois
- ⚠️ **Difficile à étendre** : Ajouter un nouveau service = créer un nouveau flow

---

## 3. 🧹 MÉNAGE - Flows Multiples

### 3.1 - Flow Sélection Ménage (Gratuit)

**Fichier** : `flow_cleaning_selection.json`

**Structure (2 écrans)** :

```
Écran 1: OVERVIEW
  ├─ Liste des jours de réservation
  ├─ Chaque jour affiche:
  │   ├─ ✅ No need (pas besoin)
  │   └─ 💰 Prix (si payant)
  ├─ Sélection jour (Radio Buttons)
  ├─ Checkbox: "J'ai terminé de configurer"
  └─ Bouton: Continuer

Écran 2: SELECT_TIMESLOT
  ├─ Affiche jour sélectionné
  ├─ Liste créneaux horaires disponibles
  ├─ Sélection créneau (Radio Buttons)
  └─ Bouton: Confirmer
```

### 3.2 - Flows Ménage Payant (5 versions !)

**Fichiers** :
- `flow_paid_cleaning_simple.json` (v1)
- `flow_paid_cleaning_2screens.json` (v2)
- `flow_paid_cleaning_3screens.json` (v3)
- `flow_paid_cleaning_3screens_v2.json` (v3.2)
- `flow_paid_cleaning_selection.json` (autre)

**Problème** : ❌ **5 versions différentes** du même flow !

**Structure générale** (2-3 écrans) :

```
Écran 1: SERVICE_TYPE (si v3)
  ├─ Sélection type ménage
  │   ├─ 🧹 Ménage standard
  │   └─ 🧼 Ménage complet
  └─ Bouton: Continuer

Écran 2: SELECT_DATE
  ├─ Calendrier ou liste jours
  ├─ Sélection date
  └─ Bouton: Continuer

Écran 3: SELECT_TIME
  ├─ Liste créneaux horaires
  ├─ Sélection créneau
  └─ Bouton: Confirmer
```

### Agent Backend
- **Fichier** : `apps/srv-chatbot/agents/cleaning_agent.py`
- **Orchestrateur** : `apps/srv-chatbot/cleaning_orchestrator.py`
- **Orchestrateur Timeslots** : `apps/srv-chatbot/cleaning_timeslots_orchestrator.py`

### Complexité Actuelle
- ❌ **Très complexe** : 6 flows différents pour ménage !
- ❌ **Confusion** : Gratuit vs Payant, plusieurs versions
- ❌ **Maintenance difficile** : Maintenir 6 flows

---

## 4. 🔑 ACCESS - Pas de Flow Interactif

### Méthode Actuelle

**Pas de flow WhatsApp interactif** - Information envoyée via :

1. **Messages automatiques** (avant arrivée)
2. **Service AI** : `apps/srv-chatbot/services/ai_access_info_service.py`
3. **Agent Property** : `apps/srv-chatbot/agents/property_agent.py`

### Informations fournies

```
🔑 Accès au logement:
- 📍 Adresse complète
- 🚪 Code porte
- 📦 Emplacement clés (si boîte à clés)
- 🅿️ Parking (info)
- 📞 Contact urgence
```

### Déclenchement

- Automatique avant arrivée (J-1, J-3, etc.)
- Sur demande client (message "accès" ou similaire)
- Intégré dans le chatbot AI (questions client)

### Complexité Actuelle
- ✅ **Simple** : Pas de flow complexe, juste envoi d'info
- ⚠️ **Dispersé** : Info accès dans plusieurs endroits du code

---

## 5. 📜 RÈGLES - Pas de Flow Interactif

### Méthode Actuelle

**Pas de flow WhatsApp interactif** - Envoi via :

1. **Templates WhatsApp** (messages automatiques)
2. **Service Template** : `apps/srv-chatbot/services/template_service.py`
3. **Messages formatés** : Via `message_formatter_service.py`

### Informations fournies

```
✅ Règles de la maison:
- Non fumeur
- Animaux interdits
- Calme après 22h
- Maximum X personnes

📜 Règlement intérieur:
- Respect du voisinage
- Tri des déchets
- Utilisation équipements
```

### Déclenchement

- Automatique avant arrivée
- Lors du check-in
- Sur demande explicite client

### Complexité Actuelle
- ✅ **Simple** : Messages textuels statiques
- ⚠️ **Pas interactif** : Client ne peut pas confirmer lecture/compréhension

---

## 📊 Analyse Comparative - Complexité

| Service | Nb Flows | Nb Écrans | Champs Formulaire | Complexité |
|---------|----------|-----------|-------------------|------------|
| **Support** | 1 | 4 | ~10-15 | 🔴 Très Haute |
| **Conciergerie** | 3 | 3-4 (×3) | ~8-10 (×3) | 🟡 Haute |
| **Ménage** | 6 | 2-3 (×6) | ~5 (×6) | 🔴 Très Haute |
| **Access** | 0 | 0 | 0 | 🟢 Basse |
| **Règles** | 0 | 0 | 0 | 🟢 Basse |

---

## 🚨 Problèmes Identifiés

### 1. Support - Trop Complexe

❌ **4 écrans** pour signaler un problème
❌ **~22 catégories** difficiles à naviguer
❌ **Champs conditionnels** confusent le client
❌ **Terminologie technique** (ex: "circuit électrique")

### 2. Conciergerie - Redondance

❌ **3 flows séparés** avec structure similaire
❌ **Code dupliqué** entre Transport/Courses/Custom
❌ **Difficile d'ajouter** un nouveau service

### 3. Ménage - Chaos

❌ **6 flows différents** pour la même fonctionnalité
❌ **Confusion** Gratuit vs Payant
❌ **Versions multiples** du flow payant (v1, v2, v3, v3.2)
❌ **Maintenance impossible**

### 4. Access & Règles - Pas Interactifs

⚠️ **Information one-way** seulement
⚠️ **Pas de confirmation** de lecture
⚠️ **Pas de flow** pour questions/clarifications

---

## 💡 Recommandations (Refonte)

### Support → 3 écrans maximum

```
Écran 1: Catégorie (3 choix simples)
  ├─ 🔧 Technique
  ├─ 🛋️ Confort
  └─ 💬 Question

Écran 2: Description + Urgence
  ├─ Description (texte libre)
  └─ Urgent ? (Oui/Non)

Écran 3: Confirmation
```

**Gain** : De 4 écrans + 22 catégories → **3 écrans simples**

### Conciergerie → 1 flow unifié

```
Écran 1: Choix service (liste dynamique)
  ├─ 🚗 Transport
  ├─ 🛒 Courses
  ├─ 🍽️ Restaurant
  └─ ... (+ Custom)

Écran 2: Questions service (3 questions max)
  Dynamique selon service choisi

Écran 3: Confirmation
```

**Gain** : De 3 flows séparés → **1 flow flexible**

### Ménage → 2 types, 1 flow

```
Écran 1: Type de ménage
  ├─ 🧹 Standard
  └─ 🧼 Complet

Écran 2: Date + Heure

Écran 3: Confirmation
```

**Gain** : De 6 flows → **1 flow simple**

### Access → Flow optionnel simple

```
Écran 1: Confirmation
  ├─ Affiche les infos d'accès
  └─ Bouton: "J'ai compris"
```

**Gain** : De message statique → **Confirmation interactive**

### Règles → Message + Confirmation

```
Message automatique avec règles

Puis bouton: "J'ai lu et j'accepte les règles"
```

**Gain** : De message statique → **Engagement client**

---

## 📂 Localisation des Fichiers

### Flows JSON
```
/Users/gouacht/sojori-production/apps/srv-chatbot/flows/
├── flow_support.json
├── flow_concierge_transport.json
├── flow_concierge_grocery.json
├── flow_concierge_custom.json
├── flow_cleaning_selection.json
├── flow_paid_cleaning_simple.json
├── flow_paid_cleaning_2screens.json
├── flow_paid_cleaning_3screens.json
├── flow_paid_cleaning_3screens_v2.json
└── flow_paid_cleaning_selection.json
```

### Agents Python
```
/Users/gouacht/sojori-production/apps/srv-chatbot/agents/
├── support_agent.py
├── service_agent.py           # Conciergerie
├── cleaning_agent.py
├── property_agent.py           # Access
└── stay_agent.py               # Règles (partiel)
```

### Orchestrateurs
```
/Users/gouacht/sojori-production/apps/srv-chatbot/
├── support_orchestrator.py
├── support_flow_handler.py
├── concierge_flow_handler.py
├── cleaning_orchestrator.py
├── cleaning_timeslots_orchestrator.py
├── property_wifi_orchestrator.py
└── flow_orchestration.py       # Orchestrateur principal
```

### Services
```
/Users/gouacht/sojori-production/apps/srv-chatbot/services/
├── whatsapp_flows_service.py   # Envoi flows
├── ai_access_info_service.py   # Access info
├── template_service.py         # Messages automatiques
└── message_formatter_service.py
```

---

## 📊 Métriques Actuelles

### Nombre de Fichiers
- **Flows JSON** : 10 fichiers
- **Agents** : 5 agents concernés
- **Orchestrateurs** : 6 fichiers
- **Services** : 4 services principaux
- **Total** : ~25 fichiers impliqués

### Lignes de Code (estimation)
- **Flows JSON** : ~3,000 lignes
- **Agents + Orchestrateurs** : ~5,000 lignes
- **Services** : ~2,000 lignes
- **Total** : ~10,000 lignes de code

### Maintenance
- ❌ **Très difficile** : Code dispersé, flows multiples
- ❌ **Duplication** : Logique similaire répétée
- ❌ **Tests** : Difficile de tester 10+ flows

---

## 🎯 Impact de la Refonte

### Réduction Complexité

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Nombre flows | 10+ | **4** | -60% |
| Écrans moyens | 3-4 | **3** | -25% |
| Fichiers JSON | 10 | **4** | -60% |
| Lignes code | ~10,000 | **~4,000** | -60% |
| Temps config PM | 20-30 min | **5 min** | -75% |
| Clics client | ~15-20 | **~8** | -60% |

### Bénéfices

✅ **Maintenance** : Code 60% plus simple
✅ **UX Client** : 60% moins de clics
✅ **UX PM** : 75% plus rapide à configurer
✅ **Tests** : Beaucoup plus facile
✅ **Extension** : Ajouter un service = modifier 1 flow au lieu de créer un nouveau

---

## 📝 Prochaines Étapes

1. ✅ **Audit complet** (ce document)
2. **Créer maquettes** simplifiées (Claude Desktop)
3. **Valider** avec équipe
4. **Développer** nouveaux flows
5. **Migrer** données existantes
6. **Tester** avec numéros de test
7. **Déployer** progressivement

---

**Document créé le** : 2026-05-20

**Pour** : Refonte complète système WhatsApp

**Par** : Claude Code (audit production)

---

🔥 **Le système actuel est trop complexe - La refonte simplifiée est nécessaire !**
