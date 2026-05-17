# Handoff design — Formulaire listing Sojori Orchestrator ↔ srv-listing / OTA

## Objectif

Tu reçois un **kit JSON + instructions** pour **reconcevoir l’UI** du formulaire listing (écran type *New Listing* / fiche annonce) dans **Sojori Orchestrator** : remplacer l’affichage « mur de JSON » par des **formulaires, cartes, tableaux et états** alignés sur les **standards de lecture** des grandes OTA (Airbnb host, Booking extranet, Vrbo/Expedia) et des PMS / channel managers (Guesty, Hostaway, etc.), **sans perdre un champ** documenté ici.

## Contenu du ZIP

| Fichier | Rôle |
|---------|------|
| `manifest.json` | Version, chemins source code, liste des fichiers. |
| `tabs-order.json` | Ordre et libellés des onglets (LISTING / CONFIG / MORE). |
| `mock-form-schema.json` | Tous les champs du **formulaire mock** actuel (label, `path`, type, required). |
| `api-document-keys-by-tab.json` | Pour chaque onglet : clés du document **`GET /listings/by-id/:id`** utilisées pour le panneau « live ». |
| `srv-listing-top-level-keys-reference.json` | **Union** de champs top-level à ne pas oublier lors du regroupement visuel. |
| `integration-field-map.json` | **Pont** : onglet → chemins mock, source API, note de persistance (srv-listing vs CONFIG PUT). |
| `listing-by-id.sample-rich.json` | **Exemple unique** de document API enrichi pour prototypes / Figma variables. |
| `per-tab-live-payload-shapes.json` | Description de la **forme** du JSON par onglet (sans dupliquer tout le sample). |
| `ota-category-hints.json` | Propositions de **regroupement** façon Airbnb / Booking / Vrbo / PMS (non normatif). |

## Règles de travail (obligatoires)

1. **Exhaustivité** : chaque `path` de `mock-form-schema.json` et chaque clé listée dans `api-document-keys-by-tab.json` doit avoir une **place UI** (ou être explicitement marqué « masqué / consolidé dans X » avec justification).
2. **Pas de JSON pour l’utilisateur final** : le JSON fourni sert de **vérité technique** pour toi ; la livrable design est **composants + hiérarchie + états**.
3. **Source de vérité** : distinguer clairement **données srv-listing (API)** vs **brouillon local orchestrateur** vs **onglets CONFIG** (PUT JSON dédiés : whatsapp, concierge, support, rules, access).
4. **Cas Channex absent** : un listing **direct** peut ne pas avoir de `channexListingId` — l’UI doit l’afficher comme **information**, pas comme erreur bloquante.
5. **Chevauchements** : `deposit` + `extras`, `rules` (CONFIG) + `houserules` + `description`, `availability` qui utilise `pricing.minStay` dans le mock — **fusionner ou étiqueter** pour éviter la double saisie perçue.
6. **Localisation** : `description` côté API est souvent un **tableau par langue** ; prévoir UI multilingue (tabs de langue, ou ligne + indicateur langue).

## Livrables attendus du designer / modèle

1. **Matrice** : lignes = champs (mock path + clé API si applicable), colonnes = section UI proposée + composant + état lecture seule / éditable.
2. **Wireframes** desktop (1280–1440) : au minimum **basic**, **address**, **media**, **channels**, **pricing+availability**, **CONFIG access**.
3. **Design system** : tokens sémantiques (info / succès / avertissement), densité pro, accessibilité WCAG AA.
4. **Microcopy FR** pour bandeaux : « Données live srv-listing », « Brouillon catalogue local », « Sauvegarde via panneau CONFIG ».

## Références marché (à dépasser, pas copier)

Guesty, Hostaway, Airbnb (host), Booking (connectivity / extranet), Vrbo : retiens **regroupement logique** et **hiérarchie** ; évite la **fatigue visuelle** (trop de cartes identiques, statuts peu lisibles).

## Contact technique (implémentation future)

- Repo : **Sojori-orchestrator** (React + MUI).
- Fichiers clés listés dans `manifest.json`.

---

*Kit généré pour handoff design / Claude Design — ne pas utiliser comme contrat API officiel ; le schéma exact listing reste défini par srv-listing.*
