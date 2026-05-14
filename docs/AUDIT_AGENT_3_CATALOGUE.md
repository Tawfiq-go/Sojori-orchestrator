# AUDIT AGENT 3 - CATALOGUE

Date : 14 Mai 2026
Agent : 3
Domaine : Listings / Pricing / Channels / Clients

---

## 📊 RÉSUMÉ EXÉCUTIF

**Pages auditées** : 4
**Colonnes / blocs de données manquants** : 90+
**Filtres manquants ou non branchés** : 25+
**Boutons / actions manquants ou non branchés** : 35+
**Stats / KPIs manquants** : 20+
**Formulaires / champs manquants** : 70+

**Priorité globale** : 🔴 HAUTE

### Conclusion rapide

Le nouveau `Sojori-orchestrator` couvre bien le **design de navigation Catalogue** et une partie du **vocabulaire visuel** des pages, mais reste majoritairement en **mode démonstration** :

- `ListingsPage.tsx`, `PricingPage.tsx`, `ChannelsPage.tsx` et `ClientsPage.tsx` existent bien.
- Les pages sont **visuellement avancées**, mais une grande partie des filtres, actions et vues restent **mockées, locales ou non persistées**.
- L’écart principal avec `sojori-dashboard` n’est pas le layout, mais la **densité de données métier**, la **profondeur fonctionnelle**, les **actions CRUD**, les **vues annexes** et les **formulaires réellement exploitables**.

---

## 📄 PAGE 1 : LISTINGS / ANNONCES

### Ancien Dashboard

**Fichiers principaux** :
- `/Users/gouacht/sojori-dashboard/src/features/listing/ListingSectionPage.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/listing/pages/listing.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/listing/pages/ListingInactive.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/listing/pages/BaseListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/listing/components/FilterListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/listing/components/ListingItem.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/listing/pages/details.page.js`
- `/Users/gouacht/sojori-dashboard/src/features/listing/components/NewListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/listing/components/forms/FormContainer.jsx`

**Routes principales** :
- `/admin/Listing?tab=active`
- `/admin/Listing?tab=inactive`
- `/admin/Listing/new`
- `/admin/Listing/edit/:listingId`

#### Tableaux / cartes / données visibles

L’ancien écran n’est pas un tableau classique : c’est une **liste de cards métier très riches** plus une **fiche détail** et un **formulaire multi-onglets**.

**Liste des annonces** :
- Visuel / image du bien
- Nom de l’annonce
- Ville / pays / localisation
- Type de bien / type d’unité
- Badges de structure (`Single`, `Multi`, etc.)
- Statut actif / inactif
- Signaux d’orchestration
- Signaux channel manager / OTA
- IDs RU et informations de mapping
- Accès rapides vers détail, édition, tâches, calendrier

**Fiche détail listing** :
- Overview listing
- Configuration check-in / check-out
- Room details
- Amenities
- Photos
- Carte / adresse
- Indicateurs d’activation Sojori / staging / channel manager / orchestration
- Capacité / bedrooms / beds / bathrooms / surface

#### Filtres

- `Quick Search`
- Filtre owner
- Filtre `Country`
- Filtre `City`
- Filtre `Unit Type`
- Pagination / taille de page
- Séparation active / inactive

#### Boutons / actions

- `Import from RU`
- `Créer nouveau`
- `Détails`
- `Éditer`
- `Tâches`
- `Calendrier`
- `Quick edit`
- Actions de configuration listing (orchestration, ménage, accès, WhatsApp, conciergerie, support, règles)
- `Save`
- `Sync with OTA`
- Navigation `Previous` / `Next` dans le formulaire

#### Stats / indicateurs

- Total listings côté pagination
- Signaux d’état par annonce
- Capacité maximale
- Nombre de chambres
- Nombre de lits
- Nombre de salles de bain
- Surface
- États Sojori / staging / check-in / orchestration / distribution

#### Formulaires / champs

Le formulaire ancien est **très dense** et réparti sur de nombreux onglets :

- `BasicInfo`
- `Address`
- `Media`
- `Amenities`
- `PriceAndFees`
- `AdditionalInfo`
- `ChannelManager`
- `RoomType`
- `Cleaning`
- `Services`
- `Others`
- `Deposit`
- `LicenseInfo`
- `AccessConfiguration`
- `Menu WhatsApp`
- `Conciergerie`
- `Support`
- `RulesAndInfo`

**Champs confirmés dans le code** :
- Nom
- Type de propriété
- Owner
- Active / staging / display home / OTA only
- Online check-in
- WiFi
- Currency
- Street / city / country / country code
- Descriptions multilingues
- Base price
- Extra guest fee
- Dynamic pricing
- Minut House / Channex / sync RU
- Deposit / payment methods / cancellation policies
- Toggles d’orchestration par scénario

---

### Nouveau Dashboard

**Fichiers** :
- `/Users/gouacht/Sojori-orchestrator/src/pages/ListingsPage.tsx`
- `/Users/gouacht/Sojori-orchestrator/src/pages/NewListingFormPage.tsx`

**Routes** :
- `/listings`
- `/listings/:id`

**Existe** : ✅ Oui

#### Tableaux / cartes / données visibles

**`ListingsPage.tsx`** :
- Header `Annonces`
- Badge `42 actives`
- Vue actuelle : **grid uniquement**
- 6 `ListingCard`
- Chaque carte affiche :
  - Nom
  - `place`
  - Note / avis
  - `OCC`
  - `ADR`
  - `RV/MO`
  - Canaux
  - Badge `Active` ou `Brouillon`

**Navigation réelle** :
- 3 cartes seulement ouvrent une fiche :
  - `/listings/villa-belvedere`
  - `/listings/dar-sojori`
  - `/listings/villa-atlas`
- Les autres cartes sont purement visuelles.

**`NewListingFormPage.tsx`** :
- Rail d’onglets à gauche
- Contenu central
- Aside à droite
- Données locales limitées à 3 listings mockés
- Si l’`id` n’est pas dans le mock : `Listing non trouvé`

#### Filtres

**Présents visuellement dans `ListingsPage.tsx`** :
- `Actives`
- `Type`
- `Ville`
- `Performance`

**Constat** :
- filtres décoratifs
- pas de vraie logique de filtrage
- pas de recherche texte
- pas de filtre owner

#### Boutons / actions

**`ListingsPage.tsx`** :
- `📥 Import OTA`
- `+ Nouvelle annonce`
- `✨ Finaliser avec AI` sur la carte brouillon

**`NewListingFormPage.tsx`** :
- `Preview`
- `+ AI assist`
- `Publish`
- `Re-scanner`
- `Valider tout`
- `Annuler`
- `Sauvegarder & continuer`
- `+ Ajouter photos`
- `+ Ajouter équipement`
- `+ Ajouter saison`
- `⚙️ Config`
- `+ Connecter canal`

#### Stats / indicateurs

- `42 actives` sur la liste
- Pourcentage global de complétion sur la fiche
- Carte `Complétion par onglet`
- Statuts de canaux dans l’onglet `channels`

#### Formulaires / champs

**Onglets réellement implémentés** :
- `basic`
- `media`
- `equipment`
- `pricing`
- `channels`

**Champs réellement visibles** :
- Nom
- Type
- Chambres
- Salles de bain
- Capacité
- Surface
- Lits
- Description courte
- Description longue
- Liste d’équipements
- Prix de base
- Frais de ménage
- Multiplicateur week-end
- Séjour minimum
- Cartes de canaux OTA avec statut et dernier sync

**Onglets présents dans le rail mais non implémentés ou incomplets** :
- `address`
- `extras`
- `licenses`
- `automsg`
- `whatsapp`
- `concierge`
- `services`
- `support`
- `cleaning`
- `autotasks`
- `roomtypes`
- `deposit`
- `rules`
- `houserules`
- `access`
- `wifi`
- `iot`

Le fichier contient un fallback explicite :
- `Contenu de cet onglet à implémenter`

---

### ❌ MANQUANT

#### Colonnes / données

- ❌ Vue liste détaillée exploitable en mode table
- ❌ Vue carte géographique réelle
- ❌ Owner sur la liste
- ❌ Pays / structure de localisation détaillée
- ❌ Type d’unité réellement filtrable et visible
- ❌ IDs RU / IDs externes par annonce
- ❌ Signaux d’orchestration au niveau listing
- ❌ Signaux channel manager détaillés
- ❌ Split actif / inactif réel
- ❌ Fiche détail complète équivalente à `details.page.js`

#### Filtres

- ❌ `Quick Search`
- ❌ Filtre owner
- ❌ Filtre country
- ❌ Filtre city réellement branché
- ❌ Filtre unit type réellement branché
- ❌ Filtre active / inactive réel
- ❌ Pagination métier

#### Boutons / actions

- ❌ `Détails` explicite
- ❌ `Éditer` explicite
- ❌ `Tâches`
- ❌ `Calendrier`
- ❌ `Quick edit`
- ❌ `Import from RU` réel
- ❌ `Créer nouveau` réellement branché
- ❌ `Sync with OTA`
- ❌ Navigation `Previous` / `Next`
- ❌ Actions métier de config listing existantes dans l’ancien

#### Stats

- ❌ Total listings vs actifs / inactifs
- ❌ États métier plus détaillés par annonce
- ❌ Vue synthétique sur distribution / orchestration

#### Formulaires

- ❌ Adresse complète
- ❌ Licences
- ❌ Messages auto
- ❌ Menu WhatsApp
- ❌ Conciergerie réellement configurée
- ❌ Services
- ❌ Support
- ❌ Ménage
- ❌ Tâches auto
- ❌ Types de chambres
- ❌ Caution / deposits
- ❌ Règles & sécurité
- ❌ Règles & informations
- ❌ Configuration accès
- ❌ WiFi
- ❌ Appareils IoT

---

### ⚠️ PRÉSENT MAIS NON BRANCHÉ / MOCK

- `ViewToggle` fixé sur `grid`
- boutons `Import OTA` et `+ Nouvelle annonce` sans workflow visible
- carte brouillon avec `console.log`
- seulement 3 fiches annonce réellement ouvrables
- données 100% locales
- assistant AI purement démonstratif

---

### 💡 RECOMMANDATIONS

**Option 1 : compléter la page existante**
- Brancher les filtres listings
- Ajouter la vraie segmentation active / inactive
- Étendre la fiche annonce pour couvrir les onglets critiques de l’ancien
- Ajouter au minimum les actions `éditer`, `calendrier`, `tâches`, `import RU`

**Option 2 : découper**
- Garder `ListingsPage.tsx` pour la vue catalogue
- Créer des vues dédiées pour :
  - détail listing
  - distribution OTA
  - opérations listing
  - configuration guest experience

---

## 📄 PAGE 2 : PRICING / TARIFICATION

### Ancien Dashboard

**Fichiers principaux** :
- `/Users/gouacht/sojori-dashboard/src/features/dynamicPricing/pages/DynamicPricingByListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/dynamicPricing/components/Listing/DynamicPricingByListingWidget.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/dynamicPricing/components/Listing/MonthWiseRuleListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/dynamicPricing/components/Listing/WeekdayRuleListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/dynamicPricing/components/Listing/EventRuleListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/dynamicPricing/components/Listing/OccupancyRuleListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/dynamicPricing/components/Listing/LongStayDiscountRuleListing.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/dynamicPricing/components/Listing/LastMinuteDiscountRuleListing.jsx`

**Route principale** :
- `/admin/DynamicPrice/ByListing`

#### Tableaux / structures visibles

L’ancien pricing est surtout un **éditeur de règles métier par listing** :

- bloc `Month Wise Rule`
- bloc `Weekday Rule`
- bloc `Event Rule`
- bloc `Occupancy Rule`
- bloc `Long Stay Discount`
- bloc `Last Minute / Early Bird Discount`

Il ne s’agit pas d’un simple mock calendrier, mais d’un **outil de configuration complet**.

#### Filtres

- Sélection de listing
- Navigation listing précédent / suivant
- Switch global d’activation dynamic pricing

#### Boutons / actions

- `Sauvegarder`
- Activer / désactiver dynamic pricing
- Ajouter / supprimer règle événement
- Ajouter / supprimer règle occupation
- Ajouter / supprimer règle long stay
- Ajouter / supprimer règle last minute / early bird
- Activer / désactiver chaque famille de règles

#### Stats / KPIs

- Compteurs par famille de règles :
  - `Mois`
  - `Jours`
  - `Événements`
  - `Occupation`
  - `Long séjour`
  - `Dernier moment`

#### Formulaires / champs

**Month Wise Rule** :
- Jan à Dec
- switch actif

**Weekday Rule** :
- Mon à Sun
- switch actif

**Event Rule** :
- `from`
- `to`
- `Increase/Decrease`
- `% adjustment`
- `min_stay_arrival`
- `Event name`
- switch actif

**Occupancy Rule** :
- `Increase/Decrease`
- `% adjustment`
- plage `min`
- plage `max`
- switch actif

**Long Stay Discount** :
- `from`
- `to`
- `% adjustment`
- `If longer than`
- `and smaller than`
- switch actif

**Last Minute / Early Bird** :
- `from`
- `to`
- `% adjustment`
- `If booked within`
- `If booked at least`
- switch actif

---

### Nouveau Dashboard

**Fichier** :
- `/Users/gouacht/Sojori-orchestrator/src/pages/PricingPage.tsx`

**Route** :
- `/pricing`

**Existe** : ✅ Oui

#### Tableaux / structures visibles

- Calendrier mensuel de tarification
- Dialog détail d’un jour
- Table `Règles de Tarification`
- Dialog `Gestion des Règles de Tarification`
- Dialog `Événements Locaux`
- Carte `Analyse Concurrence`

#### Filtres / contrôles

- Sélecteur de listing
- Navigation mois précédent / suivant
- Toggle `Concurrence`
- Badge / chip nombre de règles actives
- Switch `Auto-apply suggestions`

#### Boutons / actions

- `⚙️ Règles`
- `📅 Événements`
- `✨ Appliquer suggestions`
- `✨ Appliquer tout`
- CTA d’application sur un jour
- Ouverture / fermeture dialogs

#### Stats / KPIs

- `Revenu actuel (mois)`
- `Revenu avec AI`
- `Gain potentiel`
- `vs Marché`

#### Formulaires / champs

**Réels** :
- `Select` du listing
- switch `Auto-apply suggestions`

**Présents mais limités** :
- les règles sont affichées dans des tables / cards
- pas de vrai formulaire d’édition détaillé comparable à l’ancien

---

### ❌ MANQUANT

#### Colonnes / données

- ❌ Éditeur métier complet par famille de règles
- ❌ Vue détaillée mois par mois réellement éditable
- ❌ Vue détaillée jours de semaine réellement éditable
- ❌ Configuration métier structurée des remises long séjour
- ❌ Configuration métier structurée des remises last minute / early bird
- ❌ Validation métier d’overlap visible et exploitable

#### Filtres

- ❌ Navigation par listing comparable à l’ancien (précédent / suivant)
- ❌ Pilotage fin par famille de règles
- ❌ Activation / désactivation métier persistée

#### Boutons / actions

- ❌ `Sauvegarder`
- ❌ Activer / désactiver dynamic pricing de façon persistée
- ❌ Ajouter vraie règle
- ❌ Supprimer vraie règle
- ❌ Modifier vraie règle
- ❌ Activer / désactiver chaque règle de façon persistée
- ❌ Appliquer suggestion de manière réelle

#### Stats

- ❌ Compteurs détaillés par famille (`Mois`, `Jours`, `Événements`, `Occupation`, `Long séjour`, `Dernier moment`)
- ❌ Vision de configuration actuelle réellement issue des règles actives

#### Formulaires

- ❌ 12 champs mensuels
- ❌ 7 champs weekday
- ❌ Formulaire complet événement
- ❌ Formulaire complet occupation
- ❌ Formulaire complet long stay
- ❌ Formulaire complet last minute / early bird

---

### ⚠️ PRÉSENT MAIS NON BRANCHÉ / MOCK

- mode `MOCK` explicite
- prix et concurrence générés localement
- `Math.random()` utilisé pour certaines données
- actions `Appliquer suggestions` / `Appliquer tout` via `alert()`
- pas de persistance backend
- pas de création / édition réelle de règles

---

### 💡 RECOMMANDATIONS

**Option 1 : enrichir `PricingPage.tsx`**
- garder le calendrier actuel
- ajouter un vrai panneau d’édition des règles
- brancher les actions de sauvegarde et d’activation

**Option 2 : double niveau**
- page 1 = pilotage visuel / calendrier
- page 2 = configuration avancée des règles par listing

---

## 📄 PAGE 3 : CHANNELS / CANAUX

### Ancien Dashboard

**Fichiers principaux** :
- `/Users/gouacht/sojori-dashboard/src/pages/Channels/ChannelsHubPage.jsx`
- `/Users/gouacht/sojori-dashboard/src/pages/Channels/components/ChannelsSidebar.jsx`
- `/Users/gouacht/sojori-dashboard/src/pages/Channels/components/ChannelsFooterNav.jsx`
- `/Users/gouacht/sojori-dashboard/src/pages/Channels/components/RuImportWizard.jsx`

**Routes principales** :
- `/admin/Channels?tab=Sum`
- `/admin/Channels?tab=Business&biz=api&api=m`
- `/admin/Channels?tab=Debug`
- `/admin/Channels?tab=Cron`
- `/admin/Channels?tab=Mapping&mapSub=fields`

#### Tableaux / colonnes

**Summary / Webhooks** :
- `Date`
- `Type`
- `Aujourd’hui`
- `OK`
- `Err`
- `Hier`
- `Δ`

**Direct API Calls** :
- `Action`
- `Total`
- `OK`
- `Err`

**Cron API Calls** :
- `Action`
- `Total`
- `OK`
- `Err`
- `Données`

**Business > Messages** :
- `Date`
- `Event`
- `Path`
- `Thread`
- `Message`
- `Guest`
- `Preview`
- `Correlation`

**Business > Réservations** :
- `Date`
- `Créée RU`
- `In`
- `Out`
- `Client`
- `Tél`
- `Ad`
- `Enf`
- `€`
- `OTA`
- `Map`
- `Listing`
- `Owner`
- `Path`
- `RU ID`

**Business > Calendrier** :
- `Quand`
- `Action`
- `Statut`
- `ms`
- `Prop`
- `Listing`
- `Owner`
- `Queue`
- `Source`
- `Prix`
- `Plages`
- `Modifs`
- `Réponse`

**Mapping RU fields** :
- `Code RU`
- `Nom Sojori`
- `Catégorie`
- `Priorité`
- `Actif`
- `Inclus outbound push`
- `Notes`
- `Actions`

**Import RU / résultats** :
- `RU ID`
- `Status`
- `Listing ID`
- `Calendar`
- `Errors`

#### Filtres

- time range `6h / 24h / 3j / 7j`
- filtres owner / listing
- reset
- navigation par sous-vues `Summary / Business / Debug / Cron / Mapping`
- navigation API `Messages / Reviews / Leads / Réservations / Calendrier / Listing / OAuth / User`
- filtres de type de mapping
- filtres d’import RU

#### Boutons / actions

- `Refresh`
- `Réinitialiser`
- `Sync RU Countries`
- `Sync RU Languages`
- `+ Nouvelle ligne`
- `Modifier`
- `Supprimer`
- `Retry`
- `Open Mapping Tab`
- `Activer`
- `Désactiver`
- `Fetch from RU`
- `Select all importable`
- `Next: Configure & Import`
- `Import X properties`

#### Stats / KPIs

- `Total API`
- `Succès API`
- `Échecs API`
- `Webhooks`
- `Hooks`
- `API direct`
- `API cron`
- cartes cron jobs
- dernier run
- durée
- owners
- failures
- correlation ID
- last error

#### Formulaires

**Mapping CRUD** :
- code RU
- nom Sojori
- catégorie
- priorité
- actif
- outbound push
- notes

**Import wizard** :
- sélection owner
- sélection propriétés
- sélection `Sojori City`
- confirmation import
- résultat d’import

---

### Nouveau Dashboard

**Fichier** :
- `/Users/gouacht/Sojori-orchestrator/src/pages/ChannelsPage.tsx`

**Route** :
- `/channels`

**Existe** : ✅ Oui

#### Tableaux / colonnes

**Vue `Aperçu connexions`** :
- `Canal OTA`
- `Statut`
- `Dernière sync`
- `Annonces mappées`
- `Syncs réussies`
- `Erreurs`
- `Uptime`

**Vue `Mapping annonces`** :
- `Annonce Sojori`
- `Airbnb ID`
- `Booking.com ID`
- `VRBO ID`
- `Actions`

**Vue `Logs de sync`** :
- `Heure`
- `Canal`
- `Action`
- `Statut`
- `Message`
- `Durée`

#### Filtres

- filtres `Tous / Connectés / Erreurs / Déconnectés`
- filtre canal sur les logs
- pagination logs

#### Boutons / actions

- `📊 Rapport`
- `🔗 Connecter canal`
- switch entre les 3 vues
- `✏️ Modifier` dans le mapping

#### Stats / KPIs

- `Syncs aujourd'hui`
- `Taux de réussite`
- `Erreurs 24h`
- `Temps moyen`

#### Formulaires

- Aucun vrai formulaire complet de mapping ou de connexion OTA

---

### ❌ MANQUANT

#### Colonnes / données

- ❌ Vue `Summary` complète de l’ancien
- ❌ Vue `Business`
- ❌ Vue `Debug`
- ❌ Vue `Cron`
- ❌ Vue `Mapping` avancée RU
- ❌ Vue `Import RU`
- ❌ Colonnes métiers `OK / Err / Hier / Δ`
- ❌ colonnes détaillées des messages OTA
- ❌ colonnes détaillées des réservations OTA
- ❌ colonnes détaillées du calendrier OTA
- ❌ colonnes `Code RU / Nom Sojori / Catégorie / Priorité / Actif / Outbound / Notes`
- ❌ colonnes `Expedia ID` et `Direct ID` déjà présentes dans les mocks mais non affichées

#### Filtres

- ❌ time range `6h / 24h / 3j / 7j`
- ❌ filtre owner
- ❌ filtre listing
- ❌ filtres business par domaine API
- ❌ filtres debug / cron / mapping avancés
- ❌ filtres import RU

#### Boutons / actions

- ❌ `Refresh`
- ❌ `Réinitialiser`
- ❌ `Sync RU Countries`
- ❌ `Sync RU Languages`
- ❌ `+ Nouvelle ligne`
- ❌ `Supprimer`
- ❌ `Retry`
- ❌ `Open Mapping Tab`
- ❌ `Activer`
- ❌ `Désactiver`
- ❌ `Fetch from RU`
- ❌ `Select all importable`
- ❌ `Import X properties`

#### Stats

- ❌ KPIs `Total API / Succès API / Échecs API / Webhooks / Hooks / API direct / API cron`
- ❌ cartes cron jobs détaillées
- ❌ correlation ID / last error / owner counts

#### Formulaires

- ❌ CRUD mapping RU complet
- ❌ wizard d’import RU
- ❌ configuration OTA par canal
- ❌ paramètres API key / commission / statut par OTA

---

### ⚠️ PRÉSENT MAIS NON BRANCHÉ / MOCK

- données `CHANNELS_DATA` locales
- bouton `Rapport` non branché
- bouton `Connecter canal` non branché
- `Modifier` non branché
- colonne d’actions hover du `DataTable` purement visuelle

---

### 💡 RECOMMANDATIONS

**Option 1 : montée en charge progressive**
- conserver les 3 vues actuelles
- ajouter ensuite `Business`, `Cron`, `Mapping RU`, `Import RU`

**Option 2 : parité métier prioritaire**
- commencer par `Summary + Business + Mapping`
- différer `Debug` et `Cron` si besoin

---

## 📄 PAGE 4 : CLIENTS / CRM

### Ancien Dashboard

**Fichiers principaux** :
- `/Users/gouacht/sojori-dashboard/src/features/staff/Client.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staff/components/PublicClient.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staff/components/ClientFilters.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staff/Client.white.list.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/staff/components/PublicClientWhiteListGrouped.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/crm/pages/CrmHub.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/demo/pages/DemoRequests.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/lead/pages/lead.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/support-team/pages/SupportTeam.page.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/onboarding/pages/Onboarding.page.jsx`

**Routes principales** :
- `/admin/User/clients?tab=client`
- `/admin/User/clients?tab=client-white-list`
- plus les écrans CRM / Leads / Support / Onboarding

#### Tableaux / colonnes

Le domaine `Clients` de l’ancien dashboard est **éclaté** entre :
- `Direct Guests`
- `WhatsApp Contacts`
- `Demo Requests`
- `Leads`
- `Support`
- `Onboarding`

**Direct Guests** :
- `Username`
- `Email Address`
- `Role`
- `Owners`
- `Status`

**WhatsApp Contacts** :
- `Lng`
- `Blq`
- `Com`
- `Réservation`
- `Listing`
- `Dates`
- `A/C/I`
- `V/D/N`
- `Arrivée`
- `Départ`
- `Statut`
- `WhatsApp`
- `Act`

**Demo Requests** :
- `Source`
- `Email`
- `Tél.`
- `Nom`
- `Entreprise`
- `Biens`
- `Timeline`
- `PMS`
- `Channel Manager`
- `Tarif dyn.`
- `Type`
- `Statut`
- `Qualif.`
- `Créé le`
- `Actions`

**Leads** :
- `Lead`
- `Created At`
- `Phone`
- `Company`
- `Timeline`
- `Solutions`
- `Growth Plan`
- `Client Type`
- `Industry`
- `Action`

**Support > Rendez-vous** :
- `Créé le`
- `Date & créneau`
- `Agent`
- `Nom & prénom`
- `Email`
- `Téléphone`
- `Email envoyé`
- `Résumé`
- `Fiche détail`
- `Actions`

**Onboarding** :
- `Owner`
- `Statut`
- `Étape`
- `Progression`
- `Listings`
- `Dernière MAJ`

#### Filtres

**Direct Guests** :
- recherche username
- `Show Deleted`
- `Show Banned`

**WhatsApp Contacts** :
- recherche téléphone / nom / réservation
- filtre owner
- multi-select listing
- multi-select langue
- radios statut
- radios communication
- radios statut réservation
- plage de dates
- type arrivée / départ
- statut check-in
- nombre de réservations
- reset global

**Demo Requests** :
- recherche globale
- filtre statut
- filtre qualification

**Leads** :
- recherche texte
- filtre lead
- reset

**Onboarding** :
- recherche owner
- filtre statut

#### Boutons / actions

- `Actualiser`
- `Voir les détails`
- `Supprimer`
- `Qualifier`
- `Supprimer le RDV uniquement`
- `Supprimer la demande`
- `Create New Lead Detail`
- `Edit/Complete detail`
- `Delete`
- `Nouveau`
- `Refresh`
- `Modif`
- `Voir détail réservation`
- `Gérer les réservations de ce numéro`
- `Nouvel Agent`
- `Modifier`
- `Supprimer`
- `Générer`

#### Stats / KPIs

- total clients
- total contacts
- nombre d’agents
- nombre de rendez-vous
- onboarding :
  - `Total`
  - `En cours`
  - `Bloqués`
  - `Terminés`

#### Formulaires

- détail demande démo
- édition lead
- dialog rendez-vous
- dialog agent
- onboarding creation
- sidebar modification client
- filtres avancés WhatsApp contacts

---

### Nouveau Dashboard

**Fichier** :
- `/Users/gouacht/Sojori-orchestrator/src/pages/ClientsPage.tsx`

**Route** :
- `/clients`

**Existe** : ✅ Oui

#### Tableaux / colonnes

**Colonnes visibles par défaut** :
- `Client`
- `Pays`
- `Nb séjours`
- `Revenu total`
- `Dernière visite`
- `Note moyenne`
- `VIP`
- `Tags`

**Colonnes masquées / affichables en bloc** :
- `Moy/séjour`
- `Téléphone`
- `1ère résa`
- `Listing préféré`

#### Filtres

- recherche nom / email
- filtre pays
- filtre nombre de séjours
- filtre statut `VIP / Standard`
- filtre tags

#### Boutons / actions

- `📊 Export CSV`
- `🔧 Colonnes`
- `+ Ajouter client`

#### Stats / KPIs

- `Total clients`
- `Clients VIP`
- `Revenu moyen`
- `Note moyenne`

#### Formulaires

- Aucun vrai formulaire CRUD client

---

### ❌ MANQUANT

#### Colonnes / données

- ❌ vue `Direct Guests`
- ❌ vue `WhatsApp Contacts`
- ❌ vue `Demo Requests`
- ❌ vue `Leads`
- ❌ vue `Support`
- ❌ vue `Onboarding`
- ❌ colonnes `Role / Owners / Status` de `Direct Guests`
- ❌ colonnes de réservation et communication des contacts WhatsApp
- ❌ colonnes business CRM (`Entreprise`, `PMS`, `Channel Manager`, `Tarif dyn.`, `Qualification`, etc.)
- ❌ colonnes support / rendez-vous
- ❌ colonnes onboarding

#### Filtres

- ❌ `Show Deleted`
- ❌ `Show Banned`
- ❌ filtre owner
- ❌ filtre multi-listing
- ❌ filtre langue
- ❌ filtres communication / réservation / check-in
- ❌ filtre qualification
- ❌ filtre support / agent / planning
- ❌ filtres onboarding

#### Boutons / actions

- ❌ `Voir les détails`
- ❌ `Qualifier`
- ❌ `Supprimer`
- ❌ `Create New Lead Detail`
- ❌ `Edit/Complete detail`
- ❌ `Refresh`
- ❌ `Modif`
- ❌ `Voir détail réservation`
- ❌ `Gérer les réservations de ce numéro`
- ❌ `Nouvel Agent`
- ❌ `Générer`

#### Stats

- ❌ stats onboarding (`Total / En cours / Bloqués / Terminés`)
- ❌ compteurs support
- ❌ total WhatsApp contacts
- ❌ métriques CRM commerciales

#### Formulaires

- ❌ fiche client détaillée
- ❌ édition client
- ❌ envoi message
- ❌ création réservation depuis client
- ❌ marquage VIP métier
- ❌ filtres avancés WhatsApp contacts
- ❌ formulaires CRM / leads / support / onboarding

---

### ⚠️ PRÉSENT MAIS NON BRANCHÉ / MOCK

- `Export CSV` sans logique branchée
- `+ Ajouter client` sans workflow
- `Colonnes` bascule un bloc fixe, pas un vrai sélecteur de colonnes
- données locales uniquement
- colonne d’actions hover du `DataTable` purement visuelle

---

### 💡 RECOMMANDATIONS

**Option 1 : définir le vrai périmètre**
- si `Clients` doit être une simple base CRM voyageurs, il faut le dire explicitement
- sinon la page doit agréger au moins `Direct Guests + WhatsApp Contacts + CRM`

**Option 2 : découper le domaine**
- `/clients` = base clients voyageurs
- `/clients/contacts` = WhatsApp contacts
- `/crm` = demandes / leads / pipeline
- `/onboarding` = suivi activation

---

## 🎯 PRIORISATION

### 🔴 CRITIQUE (Must have)

- Brancher les pages Catalogue sur de vraies données au lieu des mocks
- Rendre fonctionnels les filtres et actions majeures des 4 pages
- Compléter `NewListingFormPage.tsx` sur les onglets métier manquants
- Étendre `ChannelsPage.tsx` au minimum avec `Summary`, `Business`, `Mapping RU`
- Définir clairement le périmètre fonctionnel de `ClientsPage.tsx`

### 🟠 IMPORTANT (Should have)

- Ajouter les vraies vues table / map pour les listings
- Ajouter la persistance réelle des règles de pricing
- Ajouter les formulaires CRUD manquants côté channels / clients
- Ajouter les détails listing et clients

### 🟡 NICE TO HAVE (Could have)

- Raffiner la personnalisation des colonnes
- Ajouter exports, bulk actions, actions secondaires
- Ajouter vues annexes debug / cron / support avancé

---

## ✅ CHECKLIST

- [x] Exploré ancien dashboard
- [x] Listé toutes pages de mon domaine
- [x] Pour chaque page : listé colonnes / blocs de données
- [x] Pour chaque page : listé filtres
- [x] Pour chaque page : listé boutons
- [x] Pour chaque page : listé stats
- [x] Pour chaque page : listé formulaires
- [x] Exploré nouveau dashboard
- [x] Fait comparaison complète
- [x] Créé recommandations
- [x] Sauvegardé rapport
