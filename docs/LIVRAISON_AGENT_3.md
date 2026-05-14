# Livraison Agent 3 - Catalogue

## Perimetre livre

Implementation complete de la section Catalogue du nouveau dashboard `Sojori-orchestrator`, en mode mock/localStorage, sur 4 blocs:

- Listings / Annonces
- Pricing / Tarification
- Channels / Canaux
- Clients / CRM

## 1. Listings

Livraison effectuee:

- nouvelle page `src/pages/ListingsCataloguePage.tsx`
- filtres relies aux donnees mock: recherche, owner, pays, ville, type, statut
- vues `grid`, `table`, `map`
- actions listing: details, edit, tasks, calendrier, quick edit, sync OTA mock
- import RU mock depuis un dialogue dedie
- formulaire listing complet dans `src/pages/NewListingFormPage.tsx`
- gestion create/edit via `localStorage`
- completion par onglet + completion globale
- 18 onglets pilotes par schema avec sauvegarde par section

## 2. Pricing

Livraison effectuee:

- page `src/pages/PricingPage.tsx` branchee sur les profils mock
- calendrier de prix avec suggestions et overrides
- application suggestion par jour ou en masse
- editeur `src/components/catalogue/PricingRulesEditor.tsx`
- 6 familles de regles:
  - Month
  - Weekday
  - Events
  - Occupancy
  - LongStay
  - LastMinute

## 3. Channels

Livraison effectuee:

- page `src/pages/ChannelsPage.tsx`
- dashboard `src/components/catalogue/ChannelsDashboard.tsx`
- 5 tabs:
  - Summary
  - Business
  - Debug
  - Cron
  - Mapping
- CRUD mock des mappings RU
- wizard d'import RU multi-etapes
- toggles et actions mock pour canaux et cron

## 4. Clients / CRM

Livraison effectuee:

- enrichissement de `src/pages/ClientsPage.tsx`
- colonnes, filtres, stats, actions, edition, detail, suppression mock
- creation des pages satellites:
  - `src/pages/WhatsAppContactsPage.tsx`
  - `src/pages/CRMPage.tsx`
  - `src/pages/OnboardingPage.tsx`
- routage ajoute dans `src/App.tsx`
- navigation sidebar corrigee dans `src/components/DashboardWrapper.tsx`

## 5. Base mock partagee

Ajouts structurants:

- `src/data/catalogueMock.ts` pour centraliser les seeds, types et getters/setters mock
- `src/utils/mockStorage.ts` pour encapsuler `localStorage`
- `src/components/ActionToast.tsx` pour les retours utilisateur

## Verification

Verification effectuee sur le repo `Sojori-orchestrator`:

- `pnpm exec tsc --noEmit` OK
- diagnostics linter IDE OK sur les fichiers modifies

## Notes

- livraison volontairement en mode mock, sans branchement API
- persistance locale via `localStorage`
- objectif: rendre le perimetre Catalogue navigable, demonstrable et complet cote UX avant integration backend
