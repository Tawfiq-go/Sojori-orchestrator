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

## 6. Integration composants Claude Design

Mise a jour finale effectuee en restant strictement dans le scope Agent 3 du prompt composants:

- `src/pages/PricingPage.tsx` branche maintenant le composant Claude Design `src/components/pricing/PricingRulesEditor.tsx`
- `src/pages/ChannelsPage.tsx` utilise maintenant le dashboard riche `src/components/catalogue/ChannelsDashboard.tsx` sur la route live pour exposer les dialogs utiles
- `src/pages/ListingsCataloguePage.tsx` integre `src/components/filters/ColumnSelector.tsx`
- `src/pages/ClientsPage.tsx` integre `src/components/filters/ColumnSelector.tsx`

Adjustements faits uniquement pour rendre cette integration exploitable:

- `src/components/pricing/PricingRulesEditor.tsx`
  - ajout du support `initialTab`
  - synchro de l'etat interne avec les props recues
- `src/components/channels/ChannelsDashboard.tsx`
  - ajout du sous-onglet `Listings` dans la tab `Business`

## 7. Fichiers Agent 3 touches pour la passe finale

- `src/components/pricing/PricingRulesEditor.tsx`
- `src/components/channels/ChannelsDashboard.tsx`
- `src/pages/PricingPage.tsx`
- `src/pages/ChannelsPage.tsx`
- `src/pages/ListingsCataloguePage.tsx`
- `src/pages/ClientsPage.tsx`

## 8. Statut final

- scope Agent 3 traite uniquement
- composants Agent 3 integres
- typecheck OK
- lints sur fichiers modifies OK

## 9. Auto-audit modals Agent 3

Auto-audit realise sur l'ancien `sojori-dashboard` puis reproduction ciblee dans `Sojori-orchestrator` sur les interactions les plus utiles du perimetre Catalogue.

### Modals / drawers ajoutes ou reactivees

- `src/pages/ChannelsPage.tsx`
  - rebranchement du dashboard channels riche avec:
    - dialog CRUD mapping RU
    - wizard d'import RU multi-etapes
- `src/pages/ListingsCataloguePage.tsx`
  - dialog `Distribution OTA`
  - dialog `Configuration listing`
    - sections: orchestration, acces, WhatsApp, conciergerie, support, regles, menage & services
- `src/components/pricing/PricingRulesEditor.tsx`
  - dialog de confirmation avant suppression d'une regle
- `src/pages/ClientsPage.tsx`
  - dialog de confirmation avant suppression client
- `src/pages/WhatsAppContactsPage.tsx`
  - dialog `Filtres avances WhatsApp`
  - dialog `Detail reservation`
  - drawer `Modifier contact WhatsApp`
- `src/pages/CRMPage.tsx`
  - dialog `Detail opportunite`
  - dialog de confirmation suppression lead
- `src/pages/OnboardingPage.tsx`
  - dialog `Detail onboarding`

### Verification de cette passe

- `pnpm exec tsc --noEmit` OK apres ajout des modals
- diagnostics IDE OK sur les fichiers Agent 3 modifies

## Notes

- livraison volontairement en mode mock, sans branchement API
- persistance locale via `localStorage`
- objectif: rendre le perimetre Catalogue navigable, demonstrable et complet cote UX avant integration backend
