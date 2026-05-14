# 🏠 AGENT 3 - PHASE 2 : COMPLÉTER CATALOGUE

**Mission** : Implémenter TOUTES les données manquantes avec MOCK data

---

## 🎯 PRIORITÉS

### P1 - LISTINGS

**1. Compléter NewListingFormPage.tsx - 18 onglets manquants**

Onglets à implémenter :
- `address` : Adresse complète (rue, ville, pays, code postal, coordonnées GPS)
- `extras` : Frais supplémentaires (late checkout, early checkin, etc.)
- `licenses` : Numéros licences touristiques
- `automsg` : Messages automatiques (confirmation, rappels, etc.)
- `whatsapp` : Menu WhatsApp personnalisé
- `concierge` : Services conciergerie
- `services` : Services additionnels
- `support` : Config support client
- `cleaning` : Instructions ménage
- `autotasks` : Tâches automatiques
- `roomtypes` : Types chambres (si multi-room)
- `deposit` : Caution/dépôt
- `rules` : Règles sécurité
- `houserules` : Règlement intérieur
- `access` : Instructions accès
- `wifi` : Config WiFi
- `iot` : Appareils connectés

**TON JOB** :
1. Créer composant pour chaque onglet
2. Formulaires MOCK (données sauvegardées localement)
3. Validation onglet (badge ✓ si complet)
4. Update complétion globale

**2. Ajouter filtres réels ListingsPage**

```typescript
// Filtres à brancher
- Quick Search (texte libre)
- Filtre owner (si admin)
- Filtre country (select)
- Filtre city (select peuplé depuis listings)
- Filtre type (select)
- Filtre active/inactive (toggle)
```

**3. Ajouter actions manquantes**

- "Détails" → Modal fiche complète
- "Éditer" → Navigate NewListingFormPage
- "Tâches" → Navigate /tasks avec filtre listing
- "Calendrier" → Navigate /calendar avec listing
- "Quick edit" → Drawer édition rapide (nom, prix base, statut)
- "Import from RU" → Modal import (MOCK)
- "Sync with OTA" → Toast "Sync lancée"

---

### P2 - PRICING

**1. Créer PricingRulesEditor**

Attendre composant Claude Design, puis intégrer.

**6 Familles de règles** :
- Month Wise (12 mois)
- Weekday (7 jours)
- Events (liste règles événements)
- Occupancy (règles occupation %)
- Long Stay (remises séjour long)
- Last Minute (remises/augmentations)

**Formulaires par famille** :
- Champs spécifiques (voir ancien dashboard)
- Switch actif/inactif
- Validation (dates, %, etc.)
- MOCK save

**2. Brancher actions PricingPage**

- "Appliquer suggestions" → Update prix cellules (MOCK)
- "Appliquer tout" → Confirmation + update masse
- "Sauvegarder" → Toast "Règles sauvegardées"
- "Activer/Désactiver dynamic pricing" → Toggle global

---

### P3 - CHANNELS

**1. Créer ChannelsDashboard**

Attendre composant Claude Design.

**Tabs à implémenter** :
- **Summary** : Stats webhooks, API calls, tableaux recap
- **Business** : Sub-tabs Messages/Réservations/Calendrier/Listing
- **Debug** : Logs détaillés
- **Cron** : Jobs planifiés
- **Mapping RU** : CRUD mapping champs

**2. Import RU Wizard**

Modal multi-étapes :
1. Sélection owner
2. Fetch properties (MOCK list)
3. Sélection properties
4. Mapping cities
5. Confirmation
6. Résultat import

**3. Actions channels**

- Refresh → Reload data (MOCK)
- Sync RU Countries/Languages → Toast
- Create/Edit/Delete mapping → CRUD MOCK
- Retry failed sync → Toast
- Activate/Deactivate canal → Update status

---

### P4 - CLIENTS

**1. Définir périmètre Clients**

DÉCISION : ClientsPage = Base CRM voyageurs uniquement

Créer pages séparées :
- `/clients` → Base clients voyageurs (actuel enrichi)
- `/clients/contacts` → WhatsApp contacts (nouveau)
- `/crm` → Leads/Demo/Pipeline (nouveau)
- `/onboarding` → Suivi activation owners (nouveau)

**2. Enrichir ClientsPage**

Colonnes manquantes :
- Role (si applicable)
- Owners associés (si admin)
- Status (actif/banned/deleted)

Filtres manquants :
- Show Deleted (checkbox)
- Show Banned (checkbox)
- Owner (multi-select si admin)

Actions manquantes :
- Voir détails → Modal fiche complète
- Modifier → Drawer édition
- Envoyer message → Navigate WhatsApp
- Créer réservation → Modal CreateReservation pré-rempli
- Marquer VIP → Toggle + save
- Supprimer → Confirmation

**3. Créer pages satellites**

**WhatsAppContactsPage** :
- Layout 3 colonnes (liste + thread + infos)
- Filtres avancés (owner, listing, langue, statut, dates)
- Thread messages (réutiliser composant)
- Panneau infos réservation

**CRMPage** :
- Tableau leads/demos
- Filtres (statut, qualification, source)
- Actions (qualifier, créer lead, supprimer)

**OnboardingPage** :
- Cards progression par owner
- Stats (total, en cours, bloqués, terminés)
- Actions (créer onboarding, modifier)

---

## ✅ CHECKLIST

- [ ] 18 onglets listing implémentés
- [ ] Filtres listings branchés
- [ ] Actions listings fonctionnelles
- [ ] PricingRulesEditor complet (6 familles)
- [ ] Actions pricing branchées
- [ ] ChannelsDashboard (5 tabs)
- [ ] Import RU Wizard
- [ ] ClientsPage enrichi
- [ ] WhatsAppContactsPage créé
- [ ] CRMPage créé
- [ ] OnboardingPage créé

---

**Ordre** : Listings → Pricing → Channels → Clients
