# Nouvelles Fonctionnalités - Template System

## 🎯 Objectifs

Ajouter et simplifier les configurations templates pour améliorer l'expérience utilisateur et la cohérence des données.

---

## 1. 🧹 Ajout de la Configuration Ménage dans Templates

### Contexte
Actuellement, la configuration ménage existe uniquement au niveau de chaque listing individuel. Il n'y a **pas de template centralisé** pour le ménage, contrairement aux autres services (Support, Conciergerie, etc.).

### Besoin
Permettre de définir une configuration ménage par défaut dans `/admin/settings?tab=template`, qui pourra être :
- Diffusée à tous les nouveaux listings
- Synchronisée avec les listings existants

### Configuration à inclure

La configuration ménage doit inclure tous les paramètres actuellement disponibles dans l'onglet "Config orchestration" d'un listing :

#### a) **Paramètres généraux**
- Délai de notification avant arrivée
- Durée standard du ménage
- Temps de préparation
- Instructions spécifiques

#### b) **Types de ménage**
- Ménage de départ (checkout)
- Ménage intermédiaire (midstay)
- Ménage d'arrivée (check-in preparation)
- Ménage d'urgence

#### c) **Slots de ménage**
- Créneaux horaires disponibles
- Capacité par créneau
- Jours de la semaine
- Exceptions (jours fériés, etc.)

#### d) **Équipe de ménage**
- Assignment automatique / manuel
- Notifications
- Checklist de tâches

#### e) **Tarification**
- Prix par type de ménage
- Suppléments (linge, produits, etc.)
- Rabais / promotions

### Implémentation technique

**Nouveau composant** : `CleaningTemplateConfig.jsx`
- Similaire à `SupportCategoriesTemplate.jsx` et `ConciergeServicesTemplate.jsx`
- API backend : `GET/PUT /api/v1/admin/cleaning-template`
- Schéma MongoDB : dans la collection `adminConfig` ou nouvelle collection `cleaningTemplates`

---

## 2. 🆘 Simplification du Support

### Problème actuel
Le système de support actuel (22 catégories par défaut) est trop complexe et rigide. Les clients ne peuvent pas facilement ajouter leurs propres types de support.

### Nouvelle architecture

#### Structure hiérarchique à 3 niveaux

```
Niveau 1 (Catégorie principale)
  ├── Niveau 2 (Sous-catégorie)
  │     ├── Niveau 3 (Type spécifique)
  │     │     ├── Urgence (Critique / Haute / Normale / Basse)
  │     │     └── Paramètres
  │     └── ...
  └── ...
```

#### Exemples de structure

**Exemple 1 : Technique**
```
🔧 Technique
  ├── Électricité
  │   ├── Panne de courant (Urgence: CRITIQUE, verrou: ❌ modifiable)
  │   ├── Ampoule grillée (Urgence: BASSE, verrou: ❌ modifiable)
  │   └── Problème prise (Urgence: NORMALE, verrou: ❌ modifiable)
  ├── Plomberie
  │   ├── Fuite d'eau (Urgence: CRITIQUE, verrou: ✅ fixe)
  │   ├── WC bouché (Urgence: HAUTE, verrou: ❌ modifiable)
  │   └── ...
  └── ...
```

**Exemple 2 : Confort**
```
🛋️ Confort
  ├── Climatisation
  │   ├── Panne climatisation (Urgence: HAUTE en été, verrou: ❌ modifiable)
  │   ├── Réglage température (Urgence: BASSE, verrou: ❌ modifiable)
  │   └── ...
  ├── Chauffage
  └── ...
```

#### Fonctionnalités

✅ **Catégories par défaut (admin)** - Non modifiables
✅ **Catégories personnalisées (client)** - Ajoutables par le client
✅ **Verrouillage d'urgence** :
   - Certains types ont une urgence **fixe** (ex: Fuite d'eau = toujours CRITIQUE)
   - D'autres peuvent être **modifiés** par le client

✅ **Héritage depuis tasks** - Vérifier l'implémentation actuelle des tasks pour aligner les urgences

#### Interface utilisateur

**Admin Template** (`/admin/settings?tab=template`)
```
┌─────────────────────────────────────────────┐
│  🆘 Support - Configuration Template        │
├─────────────────────────────────────────────┤
│                                             │
│  📋 Catégories par défaut                   │
│  ┌──────────────────────────────────────┐  │
│  │ 🔧 Technique                         │  │
│  │   ├─ Électricité (3 types)          │  │
│  │   ├─ Plomberie (4 types)            │  │
│  │   └─ Serrurerie (2 types)           │  │
│  │                                       │  │
│  │ 🛋️ Confort                           │  │
│  │   ├─ Climatisation (3 types)        │  │
│  │   └─ Chauffage (2 types)            │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [+ Ajouter catégorie]  [Enregistrer]      │
└─────────────────────────────────────────────┘
```

**Listing Config** (`/listings/{id}`)
```
┌─────────────────────────────────────────────┐
│  🆘 Support - Configuration Listing         │
├─────────────────────────────────────────────┤
│                                             │
│  📋 Catégories héritées (admin)             │
│  [Même structure que template]              │
│                                             │
│  ➕ Catégories personnalisées                │
│  ┌──────────────────────────────────────┐  │
│  │ 🎭 Services VIP                      │  │
│  │   ├─ Majordome (Urgence: NORMALE)   │  │
│  │   └─ Chef privé (Urgence: BASSE)    │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [+ Ajouter catégorie custom]               │
│  [Synchroniser avec admin]  [Enregistrer]  │
└─────────────────────────────────────────────┘
```

---

## 3. 🏨 Simplification Conciergerie Personnalisé

### Problème actuel
La section "Personnalisé" dans la conciergerie est trop rigide. Les services "Transport" et "Courses" sont codés en dur, et il est difficile d'ajouter de nouveaux types de services génériques.

### Nouvelle architecture

#### Séparation claire

1. **Services fixes** (gardés à part) :
   - 🚗 Transport
   - 🛒 Courses

2. **Services personnalisés** (nouveau système générique) :
   - Structure flexible à 3 niveaux
   - Ajoutables par les clients

#### Structure hiérarchique

```
Service Personnalisé
  ├── Catégorie (Niveau 1)
  │     ├── Ville associée
  │     ├── Listings associés (de cette ville)
  │     ├── Sous-catégorie (Niveau 2)
  │     │     ├── Type spécifique (Niveau 3)
  │     │     │     ├── Nom (multilingue)
  │     │     │     ├── Description
  │     │     │     ├── Prix
  │     │     │     ├── Disponibilité
  │     │     │     └── Formulaire client (champs dynamiques)
  │     │     └── ...
  │     └── ...
  └── ...
```

#### Exemples de services personnalisés

**Exemple 1 : Kids Club**
```
👶 Kids Club
  Ville: Marrakech
  Listings: Villa Palm, Riad Jasmine, Apartment Sunset

  ├── Garde d'enfants
  │   ├── Babysitting (2h minimum)
  │   ├── Babysitting nuit
  │   └── Nounou à la journée
  ├── Activités enfants
  │   ├── Atelier créatif
  │   ├── Cours de natation
  │   └── Jeux extérieurs
  └── ...
```

**Exemple 2 : SPA & Bien-être**
```
💆 SPA & Bien-être
  Ville: Casablanca
  Listings: Appart Marina, Villa Anfa

  ├── Massages
  │   ├── Massage relaxant (60min)
  │   ├── Massage sportif (90min)
  │   └── Massage duo
  ├── Soins visage
  │   ├── Nettoyage de peau
  │   └── Soin anti-âge
  └── Hammam
      ├── Hammam traditionnel
      └── Hammam + gommage
```

**Exemple 3 : Guide touristique**
```
🗺️ Tourisme & Découverte
  Ville: Fès
  Listings: Riad Médina, Dar Heritage

  ├── Visites guidées
  │   ├── Visite Médina (3h)
  │   ├── Tour des tanneries (2h)
  │   └── Visite Palais + Jardins (4h)
  ├── Excursions
  │   ├── Journée désert
  │   ├── Cascade d'Akchour
  │   └── Volubilis + Meknès
  └── ...
```

#### Interface utilisateur

**Admin Template** (`/admin/settings?tab=template`)
```
┌─────────────────────────────────────────────┐
│  🏨 Conciergerie - Configuration Template   │
├─────────────────────────────────────────────┤
│                                             │
│  🚗 Transport (système dédié) →             │
│  🛒 Courses (système dédié) →               │
│                                             │
│  ──────────────────────────────────────    │
│                                             │
│  ➕ Services personnalisés (générique)       │
│  ┌──────────────────────────────────────┐  │
│  │ [+ Créer nouveau service]            │  │
│  │                                       │  │
│  │ Liste des services :                 │  │
│  │                                       │  │
│  │ 👶 Kids Club (3 villes, 12 listings) │  │
│  │ 💆 SPA & Bien-être (2 villes, 8 lis.)│  │
│  │ 🗺️ Tourisme (5 villes, 20 listings)  │  │
│  │ 🍽️ Chef à domicile (4 villes, 15 l.) │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [Enregistrer]                              │
└─────────────────────────────────────────────┘
```

**Ajout d'un service personnalisé**
```
┌─────────────────────────────────────────────┐
│  ➕ Nouveau Service Personnalisé             │
├─────────────────────────────────────────────┤
│                                             │
│  Niveau 1 - Catégorie principale            │
│  ┌──────────────────────────────────────┐  │
│  │ Nom:     [💆 SPA & Bien-être      ]  │  │
│  │ Ville:   [🏙️ Casablanca ▼]          │  │
│  │ Listings: ☑ Appart Marina            │  │
│  │           ☑ Villa Anfa               │  │
│  │           ☐ Riad Corniche            │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Niveau 2 - Sous-catégories                 │
│  ┌──────────────────────────────────────┐  │
│  │ ➕ Massages                           │  │
│  │ ➕ Soins visage                       │  │
│  │ ➕ Hammam                             │  │
│  │ [+ Ajouter sous-catégorie]           │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Niveau 3 - Types spécifiques              │
│  (Dans chaque sous-catégorie)               │
│  ┌──────────────────────────────────────┐  │
│  │ 📋 Massages                           │  │
│  │   ├─ Massage relaxant (60min) - 500dh│  │
│  │   ├─ Massage sportif (90min) - 700dh │  │
│  │   └─ [+ Ajouter type]                │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [Annuler]  [Enregistrer]                  │
└─────────────────────────────────────────────┘
```

#### Champs du formulaire client

Chaque service personnalisé peut définir des champs que le client devra remplir lors de la réservation :

**Exemple - Massage relaxant**
```json
{
  "clientFields": {
    "date": {
      "type": "datetime",
      "required": true,
      "label": {
        "fr": "Date et heure souhaitées",
        "en": "Desired date and time"
      }
    },
    "duration": {
      "type": "select",
      "required": true,
      "options": ["60min", "90min", "120min"],
      "label": {
        "fr": "Durée",
        "en": "Duration"
      }
    },
    "pressure": {
      "type": "select",
      "required": false,
      "options": ["Douce", "Moyenne", "Forte"],
      "label": {
        "fr": "Pression souhaitée",
        "en": "Desired pressure"
      }
    },
    "specialRequests": {
      "type": "textarea",
      "required": false,
      "label": {
        "fr": "Demandes spéciales",
        "en": "Special requests"
      }
    }
  }
}
```

---

## Récapitulatif des changements

| Feature | Statut | Priorité | Complexité |
|---------|--------|----------|------------|
| Ménage dans Templates | 🔨 À faire | 🔴 Haute | Moyenne |
| Support simplifié (3 niveaux) | 🔨 À faire | 🔴 Haute | Haute |
| Conciergerie personnalisée | 🔨 À faire | 🟡 Moyenne | Moyenne |

---

## Prochaines étapes

1. **Validation des spécifications** avec l'équipe
2. **Conception des schémas MongoDB**
3. **Développement backend (srv-admin API)**
4. **Développement frontend (composants React)**
5. **Migration des données existantes**
6. **Tests et déploiement**

---

Dernière mise à jour : 2026-05-20
