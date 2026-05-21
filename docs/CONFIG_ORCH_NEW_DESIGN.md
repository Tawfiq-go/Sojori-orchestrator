# Config Orch. NEW — design Claude + schéma Mongo

**App** : `Sojori-orchestrator` (pas `sojori-dashboard`) · URL listing : `http://127.0.0.1:4174/listings/:id?level=config-new`

## Sources design

- `~/Downloads/Sojori (38).zip` — Support (`SupportConfigTab.tsx`)
- `~/Downloads/Sojori (39).zip` — Bundle PM (`SHARED.tsx`, `GroceriesTab.tsx`, `types.ts`)

## Navigation (sans Vue d'ensemble)

Onglet **Config Orch. NEW** → 9 sections :

| Groupe | Onglets |
|--------|---------|
| Services | Support, Conciergerie, Ménage, Transport, Courses |
| Communication | Service Client, Messages, WhatsApp |
| Automation | Automatisations |

## Lecture schéma vs mockup

Chaque onglet affiche une **légende** + champs avec :

- **Bordure normale** + badge `✓ schéma` = chemin Mongo documenté
- **Bordure rouge** + badge `⚠ mockup` = design Claude pas encore en BD

Registre : `src/features/listing/components/ConfigOrchestration/pmConfigSchemaRegistry.ts`

## APIs réelles (srv-listing)

| Onglet | API |
|--------|-----|
| Support | `GET/PUT /api/v1/listing/listing-support-categories/:listingId` — **pas de toggle Activer** (activation via Menu WhatsApp) |
| Conciergerie / Transport / Courses | `GET/PUT /api/v1/listing/concierge-config/:listingId` (`customServices`, `transportServices`, `groceryServices`) |
| Menu WhatsApp | **Identique** à l’onglet « Config orchestration » → `ChatbotMenuConfig` (`listing-chatbot-config`). **Pas** de légende schéma/mockup. |
| Messages | `listing.messageCheckout[]` (document listing) |
| Automatisations | `listing.orchestration_*` + `cleaningOrchestration` |

Les routes fictives `/internal/:id/support-config` etc. ont été retirées au profit des routes ci-dessus.
