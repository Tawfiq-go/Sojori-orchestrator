# AUDIT AGENT 5 - COMMUNICATIONS

**Date**: 2026-05-14  
**Scope**: `WhatsApp Guests`, `WhatsApp Staff`, `Messages OTA`, `Reviews`, `Requests`  
**Target repo**: `Sojori-orchestrator`  
**Reference repo**: `sojori-dashboard`

## Méthode

Audit fait en comparant l'ancien dashboard avec l'état actuel des pages `Sojori-orchestrator`, en distinguant:

- ce qui existait deja dans l'ancien produit
- ce qui est deja visible dans le nouveau
- ce qui manque encore pour atteindre un niveau migration/exploitation credible
- les blocages techniques immediats qui empechent certaines pages d'etre vraiment "done"

## PAGE 1 : WHATSAPP GUESTS

### Ancien dashboard

Reference principale: `AUDIT_WHATSAPP_PAGE.md`

L'ancien ecran couvrait un vrai hub 3 panneaux avec:

- liste de conversations paginee
- filtres combines (reservation, listing, canal, status, date, client, stats WhatsApp)
- WebSocket temps reel
- edition/envoi de messages
- pieces jointes images/documents
- templates
- selecteur AI ON/OFF + choix backend
- panneau de contexte reservation avec tabs WhatsApp / OTA / Review
- permissions RBAC

### Nouveau dashboard

Reference principale: `src/pages/CommsPage.tsx`

Deja present:

- layout 3 colonnes cohérent avec le design system
- liste de conversations mockees
- thread de messages avec suggestions AI visuelles
- aside reservation + actions rapides
- header coherent avec `CommunicationsSectionToggle`
- boutons header `Templates` et `Reponse AI`

### Manquant

- aucun vrai filtre exploitable
- aucune vraie recherche conversation/message
- aucune pagination
- aucune stat WhatsApp
- aucun mode AI reel (toggle backend absent)
- aucun contexte multi-canal OTA/Reviews dans le panneau droit
- aucune gestion permissions/RBAC
- aucune action archive / important / creation reservation depuis le chat
- aucune synchro temps reel
- aucun workflow reel pour templates, edition, upload image/pdf

### Blocage technique

- `ChatThread` expose un composeur, mais `CommsPage.tsx` ne passe pas `onSend` a ce composant: l'input est visuel mais non branche.

## PAGE 2 : WHATSAPP STAFF

### Ancien dashboard

Reference principale: `src/features/staffMessages/pages/StaffWhatsAppNew.jsx`

L'ancien ecran couvrait deja:

- chargement API reel des threads
- pagination + recherche
- filtres locaux par role / unreplied / recent
- envoi de message avec optimistic update
- integration taches via panneau lateral
- structure exploitable pour temps reel staff

### Nouveau dashboard

Reference principale: `src/pages/StaffWhatsAppPage.tsx`

Deja present:

- 2 modes `Individuels` / `Groupes`
- recherche texte
- badges non lus
- indicateur online pour les conversations individuelles
- thread de messages avec metadata sent/delivered
- aside info conversation / membres du groupe
- modal de broadcast multi-destinataires
- navigation/breadcrumb cohérents

### Manquant

- aucune source de donnees reelle
- aucun filtre metier par role / unreplied / recent
- aucune vraie gestion de groupes (creation, edition, membership)
- aucune integration tache/planning depuis le message
- aucune notification push / son / presence temps reel
- aucune statistique staff (messages par role, lecture, activite)

### Blocages techniques

- `handleSendMessage()` fait seulement un `console.log` puis vide l'input: pas d'envoi reel.
- `handleBroadcast()` fait seulement un `console.log`: broadcast non fonctionnel.

## PAGE 3 : OTA MESSAGES

### Ancien dashboard

Reference principale: `src/features/communications/components/OTAMessagesTab.jsx`

L'ancien ecran couvrait deja:

- vraies donnees API OTA
- recherche debouncee
- filtres/smart filters
- pagination / load more
- chargement des messages par thread
- auto-selection par reservation
- logique de status de sejour
- canal OTA normalise
- passerelles de navigation avec autres tabs communications

### Nouveau dashboard

Reference principale: `src/pages/OTAMessagesPage.tsx`

Deja present:

- layout 3 panneaux propre
- conversations mockees multi-OTA
- badges OTA dans header et dans l'aside
- details reservation/guest
- suggestions AI visuelles
- bloc de statut de synchronisation OTA
- quick actions visibles
- comptage unread + totaux OTA en header

### Manquant

- aucun vrai filtre par OTA / listing / statut
- aucune vraie recherche
- aucune pagination / load more
- aucune action `marquer lu`
- aucune action `archiver`
- aucune action `creer reservation` depuis le thread
- aucune vraie synchro OTA ou remontee d'erreurs
- aucune navigation conservee par reservation vers reviews / WhatsApp
- aucun calcul de temps de reponse / SLA

### Blocages techniques

- `ChatThread` affiche un composeur, mais `OTAMessagesPage.tsx` ne passe pas `onSend`: la reponse n'est pas branchee.
- le bandeau "Unified Inbox OTA - Messages Airbnb + Booking.com" ne reflete pas totalement les donnees mockees qui incluent aussi `Vrbo`.

## PAGE 4 : REVIEWS

### Ancien dashboard

Reference principale: `src/features/communications/components/ReviewsTab.jsx`

L'ancien ecran couvrait deja:

- chargement API reel
- recherche
- tri/filtrage
- pagination cursor
- details review enrichis
- envoi de reponse
- structure prete pour navigation cross-channel avec reservation partagee

### Nouveau dashboard

References principales: `src/pages/ReviewsPage.tsx`, `docs/REVIEWS_REQUESTS_OTA_REPORT.md`

Deja present:

- DataTable prevue avec colonnes utiles (date, listing, guest, OTA, note, commentaire, statut, actions)
- filtres OTA / note / listing / statut
- stats globales + par OTA
- modal de reponse
- suggestions AI de reponse
- badge urgent pour reviews sensibles

### Manquant

- aucune recherche texte
- aucun graphe de tendance / distribution d'etoiles
- aucun export
- aucune action `signaler probleme`
- aucune gestion de langue/template par plateforme
- aucune navigation cross-channel vers WhatsApp/OTA pour la meme reservation

### Blocage technique

- `ReviewsPage.tsx` passe `data={filteredReviews}` a `DataTable`, alors que le composant partage attend `rows`. En l'etat, la page n'est pas fiable tant que ce contrat n'est pas aligne.

## PAGE 5 : REQUESTS

### Ancien dashboard

Reference la plus proche trouvee: `src/features/demo/pages/DemoRequests.page.jsx`

Important: la reference historique trouvee dans `sojori-dashboard` concerne surtout des demandes demo/commerciales, pas un vrai module moderne de demandes guests post-reservation. La comparaison est donc partielle sur cette page.

Ce qui existait cote legacy:

- table riche avec pagination
- recherche globale
- filtres de statut/qualification
- detail modal
- menu d'actions contextuelles
- feedback utilisateur via snackbar

### Nouveau dashboard

References principales: `src/pages/RequestsPage.tsx`, `docs/REVIEWS_REQUESTS_OTA_REPORT.md`

Deja present:

- vue table + vue kanban
- colonnes metier coherentes pour des demandes guests
- filtres type / statut / priorite / listing
- stats de synthese
- modal detail avec historique
- CTA visuels `Modifier statut` et `Message guest`

### Manquant

- aucun filtre date
- aucune vraie action `approuver`
- aucune vraie action `rejeter`
- aucune vraie action `assigner staff`
- aucune gestion de prix additionnel / upsell
- aucune note interne operateur
- aucune creation de tache liee depuis la demande
- aucune persistence reelle des changements de statut

### Blocages techniques

- `RequestsPage.tsx` passe `data={filteredRequests}` a `DataTable`, alors que le composant partage attend `rows`.
- `RequestsPage.tsx` passe un prop `columns` a `KanbanBoard`, alors que `KanbanBoard` du design system attend des `children`. La vue kanban n'est donc pas alignee avec l'API du composant partage.

## Priorites de completion

### P0 - Blocants avant toute "fin de migration"

- brancher les actions d'envoi sur `WhatsApp Guests`
- brancher les actions d'envoi sur `Messages OTA`
- remplacer les `console.log` de `WhatsApp Staff` par de vraies actions
- aligner `ReviewsPage` sur le vrai contrat `DataTable`
- aligner `RequestsPage` sur les vrais contrats `DataTable` + `KanbanBoard`

### P1 - Parite fonctionnelle minimum

- remettre recherche + filtres reels sur `WhatsApp Guests`
- remettre recherche + filtres reels sur `OTA Messages`
- remettre filtres role/unreplied/recent sur `WhatsApp Staff`
- ajouter actions metier reviews (export, signalement, navigation cross-channel)
- ajouter actions metier requests (approve/reject/assign/task/pricing)

### P2 - Niveau produit fort

- WebSocket / temps reel sur Guests, Staff, OTA
- contexte reservation unifie entre WhatsApp / OTA / Reviews
- instrumentation SLA / temps de reponse / stats
- gestion permissions/RBAC visible dans le front

## Resume

- `WhatsApp Guests`: belle base visuelle, mais encore tres loin du niveau legacy fonctionnel
- `WhatsApp Staff`: UX mockee correcte, mais pas encore branchee
- `Messages OTA`: visuellement convaincant, fonctionnellement encore demo
- `Reviews`: meilleure couverture metier apparente, mais page encore fragilisee par un contrat composant non aligne
- `Requests`: bon squelette produit, mais actions coeur de workflow encore absentes et vue kanban techniquement non alignee

### Comptage synthese

Au minimum, l'audit remonte:

- **5 blocages techniques immediats**
- **12+ filtres/recherches encore absents**
- **18+ actions metier absentes ou non branchees**
- **5 pages sur 5** encore en statut "preparation/demo avancee" plutot que "migration finie"

## Fichiers de reference consultes

- `sojori-dashboard/AUDIT_WHATSAPP_PAGE.md`
- `sojori-dashboard/COMMUNICATIONS_HUB_ARCHITECTURE.md`
- `sojori-dashboard/src/features/staffMessages/pages/StaffWhatsAppNew.jsx`
- `sojori-dashboard/src/features/communications/components/OTAMessagesTab.jsx`
- `sojori-dashboard/src/features/communications/components/ReviewsTab.jsx`
- `sojori-dashboard/src/features/demo/pages/DemoRequests.page.jsx`
- `Sojori-orchestrator/src/pages/CommsPage.tsx`
- `Sojori-orchestrator/src/pages/StaffWhatsAppPage.tsx`
- `Sojori-orchestrator/src/pages/OTAMessagesPage.tsx`
- `Sojori-orchestrator/src/pages/ReviewsPage.tsx`
- `Sojori-orchestrator/src/pages/RequestsPage.tsx`
- `Sojori-orchestrator/src/components/dashboard/DashboardV2.components.jsx`
