# Brief Claude Desktop — Config Orch. NEW + WhatsApp Flows Guest

**Date :** 2026-05-23  
**Pour :** Claude Desktop (design UI + flows WhatsApp)  
**Par :** équipe Sojori (Cursor / audit architecture)  
**Listing exemple :** Harcay CFC — `6a0b4664172788ee7c3345bb` — Casablanca · Morocco  
**URL locale :** `http://127.0.0.1:4174/listings/6a0b4664172788ee7c3345bb?level=config-new`

---

## 1. Objectif de cette mission

Refondre **ensemble** (UI admin + flows WhatsApp guest) autour d’un principe unique :

> **Chaque écran de config listing doit décrire exactement ce que le voyageur verra dans WhatsApp, et quelle `Task` sera créée ou mise à jour dans `srv-fulltask`.**

Le chatbot guest ne fera **plus** :
- d’accès MongoDB cross-service,
- de RabbitMQ pour écrire des timeslots,
- d’appels à l’ancien `srv-task`.

Il fera **uniquement** :
- **HTTP → srv-reservations** (guest registration, checkins, whitelist),
- **HTTP → srv-fulltask** (`POST/PATCH /api/tasks`, lecture plan/config),
- **HTTP → srv-listing** (config services, menu, support categories).

**Mot d’ordre PO : SIMPLICITÉ**
- PM configure en **≤ 5 min**
- Voyageur comprend en **≤ 10 sec**
- **≤ 3 questions** par service guest
- **≤ 4 écrans** par flow WhatsApp

---

## 2. État actuel de l’UI (Sojori-orchestrator)

### 2.1 Navigation listing — 3 niveaux

| Niveau | Onglets | Rôle |
|--------|---------|------|
| **Détail listing** | 11 onglets OTA | General, Location, Photos, Pricing, etc. |
| **Config orchestration** (legacy) | 7 onglets | Orchestration, Ménage, Accès, Menu WA, Conciergerie, Support, Règles |
| **Config Orch. NEW** ✨ | **10 onglets** | **Cible de la refonte design** |

Source code tabs : `Sojori-orchestrator/src/components/listing/form-v2/ListingFormShell.jsx` → `CONFIG_NEW_TABS`.

### 2.2 Structure Config Orch. NEW (10 onglets)

```
Services
  🆘 Support
  🛎️ Conciergerie
  🏠 Ménage
  🧼 Ménage Sojori
  🚗 Transport
  🛒 Courses
  🚪 Instructions départ        ← (id: messages-config)

Communication
  💌 Service Client
  📱 Menu WhatsApp

Automation
  🧼 Automatisations           ← (id: orchestration-config)
```

**Exclu volontairement :** Vue d'ensemble (trop de bruit).

### 2.3 Design system existant

- Inspiré Claude Design : zips `~/Downloads/Sojori (38).zip` (Support) et `Sojori (39).zip` (PM bundle)
- Couleur primaire orchestrator : `#b8851a` (or) · AI : `#7c3aed`
- Registre champs schéma vs mockup : `Sojori-orchestrator/src/features/listing/components/ConfigOrchestration/pmConfigSchemaRegistry.ts`
- Doc design : `Sojori-orchestrator/docs/CONFIG_ORCH_NEW_DESIGN.md`

**Légende UI attendue sur chaque onglet :**
- Bordure normale + badge `✓ schéma` = persisté en Mongo (`srv-listing`)
- Bordure rouge + badge `⚠ mockup` = design Claude pas encore en BD

---

## 3. Résumé onglet par onglet — champs, BD, flow guest

### 3.1 🆘 Support

**Rôle PM :** définir les catégories de demande (urgence, champs, auto-réponse).  
**Rôle guest :** choisir catégorie → décrire problème → **créer task `support`** ou **`service_client`**.

| Champ UI (design) | Chemin Mongo | En BD ? | Impact flow guest |
|-------------------|--------------|---------|-------------------|
| Activer Support | `listing_chatbot_config.menuOptions[K]` | ✅ | Affiche menu K |
| Label FR catégorie | `listing_support_categories.categories[].name.fr` | ✅ | Titre radio flow |
| Icône | `categories[].icon` | ✅ | Emoji flow |
| Ordre | `categories[].displayOrder` | ✅ | Ordre affichage |
| **Urgence défaut** | `categories[].priority` (`normal\|high\|urgent`) | ✅ | Pré-sélection ou hidden |
| Choix urgence voyageur | `categories[].fields.__sojori.guestCanChoosePriority` | ✅ | Radio 🟢🟡🔴 dans flow |
| Champs dynamiques | `categories[].fields` (text, textarea, radio…) | ✅ schéma · ⚠ UI à venir | Écran formulaire flow |
| requiresPhoto | `categories[].requiresPhoto` | ✅ | **→ Meta Flow Image Picker (2025+)** |
| alertPM / requiresPMValidation | flags catégorie | ✅ | Priorité task + notif staff |

**Catégories système :** `technical | access | equipment | lost_found | nuisance | information | emergency | other`

**Flow guest cible (simplifié) :**
```
Écran 1 : Choisir catégorie (depuis config listing, max 6 visibles)
Écran 2 : Description + urgence (si guestCanChoosePriority)
Écran 3 : Photo optionnelle (si requiresPhoto) — NOUVEAU Meta
→ POST srv-fulltask /api/tasks { type: "support", payload: {...} }
```

**Gap design :** UI éditeur de `categories[].fields` pas encore construite.

---

### 3.2 🛎️ Conciergerie (sur-mesure)

**Rôle PM :** bibliothèque services custom (SPA, babysitting, etc.).  
**Rôle guest :** choisir service → formulaire → **task `concierge`**.

| Champ UI | Chemin Mongo | En BD ? | Impact flow |
|----------|--------------|---------|-------------|
| Services | `listing_concierge_services.customServices[]` | ✅ | Liste services flow |
| Formules / prix | `customServices[].pricing.type` | ✅ | Affichage prix flow |
| Types prix | `quote \| fixed \| hourly \| per_person \| per_group \| hourly_per_person \| hourly_per_group` | ✅ | Label + calcul |
| Max personnes | `customServices[].capacity.maxPassengers` | ✅ | Validation flow |
| Disponibilités | `customServices[].availability` | ✅ | Filtrage avant envoi flow |
| clientFields | `customServices[].clientFields` | ✅ | Champs dynamiques flow |

**Pas de toggle global** sur cet onglet — activation via Menu WhatsApp + flag `orchestration_custom`.

---

### 3.3 🏠 Ménage (inclus + payant)

**Deux sous-blocs dans un onglet.**

#### Ménage inclus (gratuit)
| Champ | Mongo | Flow guest |
|-------|-------|------------|
| `orchestration_cleaning_free` | flag listing | Task auto `cleaning_free` (orchestrator) |
| `frequency[]`, `TS_CLEAN[]` | créneaux | Info texte — pas de flow |
| `includedCleaningDescription` | texte FR | Message WhatsApp informatif |
| `includedCleaningExtras[]` | options payantes add-on | Flow optionnel upsell |

#### Ménage payant (guest choisit créneau)
| Champ | Mongo | Flow guest |
|-------|-------|------------|
| `paidCleaningConfig.serviceTypes[]` | types, durée, prix | Écran 1 flow : choix type |
| `paidCleaningConfig.availableWeekdays` | jours permis | Filtre dates flow |
| `serviceTypes[].timeslots[]` | créneaux | Écran 2 flow : choix slot |
| `orchestration_cleaning_paid` | flag | Active menu I |

**Flow guest cible :**
```
Écran 1 : Types ménage (depuis serviceTypes[])
Écran 2 : Date + créneau (depuis timeslots / TS_CLEAN)
Écran 3 : Confirmation + prix
→ POST /api/tasks { type: "cleaning_paid", payload: { serviceTypeId, slot, price } }
   OU PATCH task existante waiting_guest
```

---

### 3.4 🧼 Ménage Sojori (checkout auto — staff only)

**Pas de flow guest.** Config ops/staff uniquement.

| Champ | Mongo | Automatisation |
|-------|-------|----------------|
| `cleaningOrchestration.enabled` | bool | Task `checkout_cleaning` auto post-checkout |
| `preferredDayAfterCheckout` | J+ | Date planifiée |
| `safetyMaxDirtyDays` | int | Escalade si logement DIRTY |
| `checklist[]` | items staff | App staff, pas WhatsApp guest |
| `orchestration_cleaning_sojori` | flag | Active catégorie |

---

### 3.5 🚗 Transport

**Rôle guest :** choisir route → passagers → date/heure → **task `transport`**.

| Champ UI | Mongo | Flow guest |
|----------|-------|------------|
| Routes | `transportServices[]` | Liste routes flow |
| Nom route FR | `name.fr` | Label radio |
| **Type trajet** | `route.journeyTag` : `arrival \| departure \| other` | Badge + filtre menu |
| Provenance | `route.from` + `departureType` | Fixe ou saisie |
| Destination | `route.to` + `arrivalType` | Fixe ou saisie |
| Point navette | `route.externalLabel`, `externalKind: airport\|station\|other` | Label aéroport/gare |
| Logement fixe | `route.propertyName`, `propertyAddress` | Grisé si arrival/departure |
| **Prix** | `pricing.amount` | Affiché confirmation |
| **Type prix** | `pricing.type: total \| per_person` | Calcul total flow |
| Durée | `route.estimatedDuration` | Info |
| Max passagers | `capacity.maxPassengers` | Stepper flow |
| Disponibilités | `availability` | Fenêtre résa |

**Flow guest cible (≤ 4 écrans) :**
```
Écran 1 : Choisir route (ex: Aéroport → Logement)
Écran 2 : Date + heure + nb passagers
Écran 3 : Récap prix (total ou × personnes)
→ POST /api/tasks { type: "transport", payload: { routeId, passengers, scheduledAt, price } }
```

---

### 3.6 🛒 Courses

**Rôle guest :** liste courses texte libre → **task `groceries`**.

| Champ UI | Mongo | En BD ? | Flow |
|----------|-------|---------|------|
| Frais de service | `groceryServices[].pricing.serviceFee` | ✅ | Ligne prix flow |
| Devise | `pricing.currency` | ✅ | MAD |
| Note voyageur | `description.fr` | ✅ | Texte intro flow |
| Jours disponibles | design `availability.daysOfWeek` | ❌ mockup | À mapper ou retirer du design |
| Créneaux horaires | design `timeSlots` | ❌ mockup | Idem |
| Délai minimum | design `deliveryLeadTimeHours` | ❌ mockup | Idem |
| Catalogue produits | design `products[]` | ❌ retiré | **Texte libre uniquement** (décision PO) |

**Flow guest cible :**
```
Écran 1 : Liste courses (TextArea) + frais service affiché
Écran 2 : Date souhaitée livraison
Écran 3 : Confirmation
→ POST /api/tasks { type: "groceries", payload: { listText, serviceFee, deliveryDate } }
```

---

### 3.7 🚪 Instructions départ (+ taxe de séjour)

| Champ | Mongo | Canal |
|-------|-------|-------|
| Instructions départ FR | `messageCheckout[0]` | Message auto WhatsApp (pas flow) |
| Taxe séjour enabled | `cityTaxEnabled` | Message récap |
| Montant / adulte / nuit | `cityTaxPerAdultPerNight` | Calcul |
| Exemption enfants | `cityTaxExemptChildren`, `cityTaxExemptBelowAge` | Mention légale |

**Pas de task guest** — message planifié orchestration.

---

### 3.8 💌 Service Client

| Champ | Mongo | En BD ? |
|-------|-------|---------|
| Menu WhatsApp L | `listing_chatbot_config` code L | ✅ |
| SLA réponse | design `responseSlaHours` | ❌ mockup |
| Objets / sujets | design `subjects[]` | ❌ mockup — **collection à créer** |

**Flow guest :** message texte simple ou mini-flow 2 écrans → task `service_client`.

---

### 3.9 📱 Menu WhatsApp

**Identique à l’onglet legacy** — composant `ChatbotMenuConfig`.

Chaque option menu = contrat d’action guest :

| Code | Label défaut | Action | Crée task ? | Type fulltask |
|------|--------------|--------|-------------|---------------|
| A | Menu | show_main_menu | non | — |
| B | Langue | change_language | non | — |
| C | Ma réservation | show_reservation_details | non | — |
| D | Horaires | select_arrival_time | oui | `arrival_choose` / `departure_choose` |
| E | Enregistrement | guest_registration | non* | `registration` (orchestrator) |
| F | Accès | show_access_info | non | — |
| G | Propriété/WiFi | show_property_info | non | — |
| H | Règles | show_house_rules | non | — |
| I | Ménage | request_cleaning_service | oui | `cleaning_paid` |
| J | Conciergerie | show_concierge_menu | oui | hub → transport/groceries/concierge |
| K | Support | contact_support | oui | `support` |

\* E : orchestrator crée/met à jour task `registration` ; le guest remplit via flow.

**Disponibilité menu :** `always | time_window | after_booking_confirmed | conditional_and_time`  
Références : `before_checkin`, `on_checkin_day`, `after_checkin`, `before_checkout`, etc.

**Demande design :** visualiser sur chaque ligne menu → **quel flow WhatsApp** + **quelle task** + **fenêtre dispo**.

---

### 3.10 🧼 Automatisations

**Rôle :** flags `listing.orchestration_*` — active/désactive les workflows `srv-fulltask` par listing.

| Flag listing | Task type fulltask | Guest action |
|--------------|-------------------|--------------|
| `orchestration_choose_arrival` | `arrival_choose` | Flow horaires arrivée |
| `orchestration_choose_departure` | `departure_choose` | Flow horaires départ |
| `orchestration_declare_arrival` | `arrival_declare` | Bouton/texte déclaration |
| `orchestration_declare_departure` | `departure_declare` | Idem |
| `orchestration_registration` | `registration` | Flow enregistrement E |
| `orchestration_cleaning_free` | `cleaning_free` | Auto |
| `orchestration_cleaning_paid` | `cleaning_paid` | Flow ménage |
| `orchestration_cleaning_sojori` | `checkout_cleaning` | Auto staff |
| `orchestration_transport` | `transport` | Flow transport |
| `orchestration_grocery` | `groceries` | Flow courses |
| `orchestration_custom` | `concierge` | Flow sur-mesure |
| `orchestration_support` | `support` | Flow support |
| `orchestration_service_client` | `service_client` | Contact SC |

Mapping code : `apps/srv-fulltask` → `listingOrchestrationMap.ts`

**Demande design :** toggle par type + lien vers onglet service + preview relances (read-only depuis `orchestration_configs` global).

---

## 4. Enregistrement voyageurs (E) — Meta Flow Images 🆕

### Contexte
Meta WhatsApp Flows supporte désormais **l’upload d’images dans le flow** (composant type media/image picker — vérifier doc Meta Flows API v21+).

### Objectif
Remplacer le pipeline actuel :
```
Photo WhatsApp hors flow → OCR webhook → flow check-in dynamic
```
par :
```
Flow E intégré : saisie voyageur + upload passeport IN-FLOW → srv-reservations API
```

### Flow guest cible (E — registration)

```
Écran 1 : Liste voyageurs (ajouter / modifier)
Écran 2 : Fiche voyageur
  - Prénom, nom, nationalité, n° passeport
  - 📷 Upload photo passeport (Meta Flow Image) ← NOUVEAU
Écran 3 : Récap + validation
→ HTTP srv-reservations : guest-registration endpoints
→ PATCH srv-fulltask task registration { status, payload.members[] }
→ Optionnel : publish fulltask.guest.checkedIn quand complet
```

### Demande design Claude Desktop
1. Maquette écran upload image in-flow (UX mobile, bouton caméra/galerie)
2. États : uploading, OCR pending, OCR success avec champs pré-remplis, OCR fail → saisie manuelle
3. Lier champs flow aux paths API `reservations/{id}/guest-registration/members`
4. Prévoir max voyageurs (ex: 6) sans écran par voyageur statique (éviter flow_multi_v72_hybrid 2780 lignes)

---

## 5. Modèle Task srv-fulltask (contrat backend)

```typescript
POST /api/tasks
{
  type: 'arrival_choose' | 'departure_choose' | 'cleaning_paid' | 'transport' |
        'groceries' | 'concierge' | 'support' | 'service_client' | 'registration' | ...,
  listingId, reservationId, guestPhone, guestName,
  status?: 'waiting_guest' | 'new' | ...,
  priority?: 'normal' | 'urgent' | 'critical',
  scheduledDate?, scheduledAt?,
  payload: { /* spécifique au flow — voir mapping par onglet */ }
}

PATCH /api/tasks/:id/payload   // guest modifie choix (créneau, formulaire)
GET  /api/plans/:reservationId // lire séquence orchestration
GET  /api/task-config/:ownerId // config owner (templates relances)
```

**Règle :** chaque champ visible dans un flow guest doit avoir **soit** un champ config listing **soit** une valeur dérivée réservation (dates, nb adultes, etc.).

---

## 6. Ce que Claude Desktop doit livrer

### Phase A — Audit design vs schéma (1 session)
Pour chaque onglet Config Orch. NEW :
- [ ] Liste champs avec statut `✓ schéma` / `⚠ mockup` (aligné `pmConfigSchemaRegistry.ts`)
- [ ] Proposer **suppression** des champs mockup inutiles OU **spec BD** si nécessaires
- [ ] Wireframe **preview WhatsApp** à droite de chaque onglet (mini mockup phone)

### Phase B — Maquettes UI admin (Figma / Claude Design / zip)
- [ ] Support : éditeur catégories + urgence + champs dynamiques + toggle photo
- [ ] Transport : builder routes (arrivée/départ/autre) + prix total/per_person
- [ ] Courses : simplifié (frais + texte libre, sans catalogue)
- [ ] Ménage : split visuel inclus vs payant
- [ ] Menu WhatsApp : table Action → Flow → Task type → Disponibilité
- [ ] Automatisations : toggles flags + timeline read-only relances

### Phase C — Maquettes WhatsApp Flows (6 flows)
| # | Flow | Écrans max | Source config |
|---|------|------------|---------------|
| 1 | Enregistrement E + **images Meta** | 4 | guest registration + menu E |
| 2 | Horaires D | 3 | TS / task arrival_choose & departure_choose |
| 3 | Ménage payant I | 3 | paidCleaningConfig |
| 4 | Transport | 3 | transportServices[] |
| 5 | Courses | 2 | groceryServices[] |
| 6 | Support | 3 | listing_support_categories |

Format livrable : JSON WhatsApp Flow draft **ou** diagramme écran par écran avec `data_schema` et `payload` task.

### Phase D — Alignement Claude Design
- Reprendre tokens visuels Sojori (or `#b8851a`, fond `#f6f5f1`)
- S'inspirer zips `Sojori (38).zip` et `Sojori (39).zip`
- Mettre à jour zip design → `~/Downloads/Sojori (40).zip` avec changelog

---

## 7. Principes de simplification (non négociables)

1. **Un service = un onglet = un flow = un task type** (sauf hub Conciergerie J)
2. **Pas de toggle global redondant** — activation via Menu WhatsApp + flag orchestration
3. **Champs mockup** : soit on les implémente en BD, soit on les retire du design
4. **Preview live** : PM voit le flow guest avant de sauvegarder
5. **Pas de jargon** : "Route", "Créneau", "Urgence" — pas "payload", "orchestration_choose_arrival"
6. **FR d'abord** — EN/AR copie auto ou phase 2

---

## 8. Fichiers de référence à lire

| Document | Chemin |
|----------|--------|
| Design Config Orch NEW | `Sojori-orchestrator/docs/CONFIG_ORCH_NEW_DESIGN.md` |
| Mission Claude Desktop | `Sojori-orchestrator/docs/Template/MISSION_CLAUDE_DESKTOP.md` |
| Audit flows prod | `Sojori-orchestrator/docs/Template/AUDIT_FLOWS_WHATSAPP_PRODUCTION.md` |
| Audit structure listing | `sojori-production/download/AUDIT_CONFIG_LISTING_STRUCTURE_2026-05-21.zip` |
| Registre schéma UI | `Sojori-orchestrator/.../pmConfigSchemaRegistry.ts` |
| Menu WhatsApp guide | `sojori-production/docs/guide/new-collection-listing-chatbot-menu.md` |
| Seed orchestration | `sojori-production/docs/guides/SEED_ORCHESTRATION_FINAL.md` |
| Audit comm chatbot | conversation Cursor 2026-05-23 (flows + API vs RabbitMQ) |

---

## 9. Gaps connus à résoudre dans le design

| Gap | Recommandation design |
|-----|----------------------|
| Courses : jours/créneaux mockup | Retirer du UI ou mapper vers `availability.type/time_window` |
| Service Client : subjects[] | Créer collection OU réutiliser support categories light |
| Support : éditeur fields | Priorité P0 — bloque flow support |
| Enregistrement : OCR hors flow | Migrer vers Meta Flow Image upload |
| Doublon menu I + M (chatbot legacy) | Design : une seule entrée « Ménage » |
| Config vs Config NEW coexist | À terme : deprecate Config legacy, garder NEW only |

---

## 10. Prompt suggéré pour Claude Desktop

```
Tu travailles sur Sojori — plateforme location courte durée.

Contexte : lis le fichier BRIEF_CLAUDE_DESKTOP_CONFIG_ORCH_WHATSAPP.md (section 1-9).

Mission :
1. Proposer maquettes UI pour les 10 onglets Config Orch. NEW (listing Harcay CFC)
2. Pour chaque onglet Services, dessiner le flow WhatsApp guest associé (max 4 écrans)
3. Spécifier le payload srv-fulltask POST /api/tasks pour chaque flow
4. Flow Enregistrement (E) : intégrer upload image Meta in-flow pour passeport
5. Marquer chaque champ UI : ✓ schéma ou ⚠ mockup (cf. pmConfigSchemaRegistry)
6. Livrable : Figma/Claude Design + JSON flows draft + changelog vs Sojori (39).zip

Contraintes : simplicité PM (5 min config), simplicité guest (10 sec compréhension).
Ne pas proposer RabbitMQ ni accès Mongo direct côté chatbot.
```

---

**Contact technique :** repo `sojori-production` (backend) + `Sojori-orchestrator` (frontend port 4174)
