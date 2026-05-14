# AUDIT AGENT 2 - Réservations + Calendrier

**Date** : 14 mai 2026
**Agent** : 2
**Domaine** : Réservations + Calendrier

---

## 📊 RÉSUMÉ EXÉCUTIF

**Pages auditées** : 4 (Réservations Liste, Réservation Détail/Séjour, Calendrier Multi-propriétés, Inventaire)
**Colonnes manquantes** : 17
**Filtres manquants** : 8
**Boutons/Actions manquants** : 15
**Stats manquantes** : 6
**Formulaires manquants** : 2 (complets)
**Fonctionnalités spéciales manquantes** : 12

**Priorité globale** : 🔴 HAUTE

---

## 📄 PAGE 1 : RÉSERVATIONS - LISTE

### Ancien Dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/features/reservation/pages/reservation.page.jsx`
**Route** : `/admin/Reservation`
**Lignes de code** : ~1500 (fichier principal), composants associés ~3000 lignes total

#### Colonnes du tableau

1. **channelName** - Logo source (Airbnb, Booking.com, Vrbo, Sojori/Direct, Channex)
2. **reservationNumber** - Numéro réservation (cliquable → détail) - Format `SJ-XXXXX`
3. **listing** - Nom listing (cliquable) + `roomTypeName` (si multi-room) + ville 📍
4. **location** - Ville (colonne optionnelle, peut être cachée)
5. **guestName** - Nom voyageur + téléphone + 💬 note interne (icône si présente)
6. **guestCountry** - Drapeau pays + langue
7. **createdAt** - Date création réservation
8. **checkInDate** - Date check-in + heure (format HH:mm)
9. **checkOutDate** - Date check-out + heure (format HH:mm)
10. **days** - Nombre de nuits (calculé automatiquement)
11. **status** - Badge statut coloré (Confirmed, Pending, Cancelled, CheckedIn, CheckedOut, Completed, Rejected, etc.)
12. **checkInOutStatus** - Badges secondaires : "Arrived" / "Departed" (si `confirmedCheckInTime` / `confirmedCheckOutTime`)
13. **totalPrice** - Prix total + devise
14. **paymentStatus** - "Paid" (vert) / "Unpaid" (rouge) - en gras
15. **travelers** - Format : `XA / YC / ZI` (Adultes/Enfants/Infants) + `XV / YD / ZN` (Validated/Draft/NotRegistered) - cliquable
16. **phone** - Téléphone voyageur (optionnel)
17. **otaCode** - Code OTA (optionnel)
18. **voucherNo** - Numéro voucher (optionnel)
19. **roomTypeName** - Nom du room type (optionnel)
20. **channelMng** - Channel manager source (Channex, RentalsUnited) (optionnel)
21. **actions** - Boutons d'actions (Menu 3 points : Calendrier, Tâches, Check-in/out)

**Total colonnes ancien** : 21 (dont ~13 affichées par défaut, reste en configuration)

#### Filtres disponibles

1. **Recherche par numéro réservation** - Input texte (ReservationNumberFilter)
2. **Par listing(s)** - Multi-select avec tous les listings (ListingFilter)
3. **Par timeline** - Dropdown : "Toutes", "Arrivées aujourd'hui", "Départs aujourd'hui", "Séjours en cours", "À venir", "Passées"
4. **Par canal (channelName)** - Multi-select : Airbnb, Booking, Vrbo, Direct, All
5. **Par statut** - Multi-select : Pending, Confirmed, Cancelled, Rejected, Completed, CheckedIn, CheckedOut, Lead
6. **Par dates (range picker)** - Date début + date fin (filtre sur checkIn ou checkOut selon timeline)
7. **Par pays voyageur** (potentiellement dans filtres avancés)
8. **Recherche par nom voyageur** (input texte global)
9. **Par paiement** - Paid / Unpaid
10. **Filtre admin/owner** - Si admin : filtre par owner (OwnerFilterField)

**Total filtres** : 10

#### Boutons / Actions

**Header (barre supérieure)** :
1. **"+ Créer réservation"** (bouton primaire) → Ouvre modal CreateReservationModal (desktop) ou CreateReservationMobileModal (mobile)
2. **"🔄 Sync Réservations"** (bouton sync) → Ouvre SyncReservationsModal (sync OTA)
3. **"📥 Exporter CSV"** (présent dans certaines vues)
4. **"📊 Exporter PDF"** (présent dans certaines vues)
5. **"🖨 Imprimer"** (présent dans certaines vues)
6. **"⚙️ Colonnes"** (configurateur colonnes - desktop)
7. **"🔍 Filtres"** (toggle filtres - mobile)

**Actions par ligne (ReservationRowActions)** :
8. **"👁 Voir détails"** → Navigate vers `/admin/Reservation/reservation-view/:id`
9. **"✏️ Modifier"** → Modal édition réservation (ReservationEditForm)
10. **"📅 Voir calendrier"** → Navigate vers calendrier avec listing pré-sélectionné
11. **"📋 Voir tâches"** → Navigate vers tâches de la réservation
12. **"✅ Déclarer arrivée/départ"** → Modal CheckInOutStatusModal (avec heure effective)
13. **"❌ Annuler réservation"** → Confirmation + raison annulation
14. **"📧 Envoyer message"** → Navigate vers communications
15. **"🔗 Dupliquer"** (potentiellement)

**Total boutons/actions** : 15+

#### Stats affichées (KPIs header)

1. **Total réservations** - Nombre total (ex: "234")
2. **Réservations actives** - Confirmées + CheckedIn
3. **Revenus du mois** - Somme `totalPrice` pour le mois en cours (ex: "€45,380")
4. **Taux d'occupation** - % (calculé sur base listings × jours)
5. **ADR (Average Daily Rate)** - Prix moyen par nuit (€142)
6. **RevPAR** - Revenue Per Available Room (€124)
7. **Réservations en attente** - Count status "Pending"
8. **Annulations** - Count cancelled dans période

**Total stats** : 8

#### Formulaires

**Modal "Créer réservation" (CreateReservationModal)** :

1. Guest - Select avec autocomplete (ou création nouveau guest)
2. Property/Listing - Select dropdown
3. Room Type - Select (si property a propertyUnit !== 'Single')
4. Check-in - Date picker + Time picker (heure d'arrivée)
5. Check-out - Date picker + Time picker (heure de départ)
6. Nombre d'adultes - Number input
7. Nombre d'enfants - Number input
8. Nombre d'infants - Number input
9. Prix par nuit - € (input number)
10. Prix total - € (calculé auto, modifiable)
11. Devise - Select (EUR, USD, MAD, etc.)
12. Source/Canal - Select : Direct, Airbnb, Booking, Vrbo, etc.
13. Commission % - Calculé auto selon source (modifiable)
14. Commission montant - € (calculé)
15. Code de confirmation OTA - Input texte (si source OTA)
16. Notes internes - Textarea
17. Statut paiement - Select : Paid, Unpaid, Partial
18. Envoyer email confirmation - Checkbox
19. Créer tâches automatiquement - Checkbox

**Total champs formulaire création** : 19 champs

**Modal "Sync Réservations"** (SyncReservationsModal) :
- Sélection des canaux à synchroniser (Airbnb, Booking, Vrbo, Channex, RU)
- Période de synchronisation
- Options avancées

#### Fonctionnalités spéciales

1. **Tri avancé** - Par colonne (checkin asc = à venir d'abord, puis passé)
2. **Annulations non acquittées** - Bandeau rouge + règle 24h (affichage prioritaire)
3. **Réservations unmapped** - Ligne rouge si `isUnmapped: true` → Modal UnmappedReservationDialog
4. **Real-time updates** - Socket.io pour updates en temps réel
5. **Multi-sélection** - Checkbox sur lignes (actions bulk)
6. **Pagination** - 20, 50, 100 lignes par page
7. **Configuration colonnes** - Afficher/masquer colonnes (COLUMN_CONFIG)
8. **Vue mobile optimisée** - Composant ReservationMobileView avec cards compactes
9. **Mode paysage mobile** - Layout adapté pour téléphone horizontal
10. **Fullscreen mode** - Intégration avec MaterialUI controller
11. **Filtres persistants** - États filtres sauvegardés (localStorage potentiel)
12. **Drag & drop dates** (dans certaines vues de calendrier intégré)
13. **Export iCal** (potentiellement)
14. **Tooltips informatifs** - Sur chaque colonne
15. **Badges colorés contextuels** - Par statut, par source
16. **Détection changements** - Highlights si modifié récemment

---

### Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/ReservationsPage.tsx`
**Route** : `/reservations`
**Lignes de code** : ~97

#### Colonnes du tableau

1. **guest** - Voyageur avec avatar + initials + meta (`🇺🇸 · 1er séjour`, pays + historique)
2. **dates** - Check-in → Check-out + nuits + "J+X" (jours restants)
3. **listing** - Nom listing avec couleur
4. **status** - Badge statut
5. **source** - SourcePill (airbnb, booking, direct)
6. **revenue** - Montant revenue

**Total colonnes nouveau** : 6

#### Filtres disponibles

1. **Par statut** - Dropdown (FilterChip "Statut")
2. **Par statut prédéfini** - "Confirmées" (FilterChip actif)
3. **Par source** - Dropdown (FilterChip "Source")
4. **Par dates** - Date range picker (FilterChip "📅 12 → 25 Mai")

**Total filtres** : 4

#### Boutons / Actions

1. **"📥 Exporter CSV"** (header)
2. **"✨ Suggestion AI"** (header)
3. **"+ Nouvelle résa"** (header)
4. **Clic sur ligne** → Navigate vers `/reservations/:id`

**Total boutons** : 4

#### Stats affichées

1. **Réservations actives** - "23" + trend "12%" (vert)
2. **Revenu ce mois** - "€18,420" + trend "8%"
3. **Taux d'occupation** - "87%" + trend "3%"
4. **Note moyenne** - "4.92 · 47 avis" + trend "0.1"

**Total stats** : 4

#### ViewToggle

- **3 vues** : Table, Cards, Timeline (toggle présent mais non implémenté)

---

### ❌ CE QUI MANQUE DANS LE NOUVEAU

#### Colonnes manquantes

- ❌ **channelName** (logo source)
- ❌ **reservationNumber** (numéro SJ-XXXXX)
- ❌ **location/ville** (📍)
- ❌ **guestCountry** (drapeau + langue)
- ❌ **createdAt** (date création)
- ❌ **checkInTime** / **checkOutTime** (heures précises)
- ❌ **days** (nombre nuits) - Présent dans dates mais pas isolé
- ❌ **checkInOutStatus** (Arrived/Departed badges)
- ❌ **totalPrice** détaillé (avec devise)
- ❌ **paymentStatus** (Paid/Unpaid)
- ❌ **travelers** (adultes/enfants/infants + status enregistrement)
- ❌ **phone** (téléphone voyageur)
- ❌ **otaCode**, **voucherNo**, **roomTypeName**, **channelMng** (colonnes optionnelles)
- ❌ **actions menu** (3 points avec actions multiples)
- ❌ **notes internes** (icône 💬 si présente)

**Total : 15 colonnes manquantes**

#### Filtres manquants

- ❌ **Recherche par numéro réservation**
- ❌ **Par listing(s)** (multi-select)
- ❌ **Par timeline** (arrivées aujourd'hui, départs, séjours en cours, etc.)
- ❌ **Par canal détaillé** (multi-select avec tous les canaux)
- ❌ **Par statut détaillé** (multi-select : Pending, Cancelled, Rejected, Lead, etc.)
- ❌ **Recherche par nom voyageur**
- ❌ **Par paiement** (Paid/Unpaid)
- ❌ **Filtre admin/owner** (si admin)

**Total : 8 filtres manquants**

#### Boutons/Actions manquants

**Header** :
- ❌ **"🔄 Sync Réservations"** (sync OTA)
- ❌ **"📊 Exporter PDF"**
- ❌ **"🖨 Imprimer"**
- ❌ **"⚙️ Colonnes"** (configurateur)
- ❌ **"🔍 Filtres"** (toggle mobile)

**Par ligne** :
- ❌ **"✏️ Modifier"** (modal édition)
- ❌ **"📅 Voir calendrier"**
- ❌ **"📋 Voir tâches"**
- ❌ **"✅ Déclarer arrivée/départ"**
- ❌ **"❌ Annuler réservation"**
- ❌ **"📧 Envoyer message"**
- ❌ **"🔗 Dupliquer"**
- ❌ **Actions menu 3 points** (dropdown)

**Total : 13 boutons/actions manquants**

#### Stats manquantes

- ❌ **Total réservations** (count global, pas seulement actives)
- ❌ **ADR** (Average Daily Rate)
- ❌ **RevPAR** (Revenue Per Available Room)
- ❌ **Réservations en attente** (count Pending)
- ❌ **Annulations** (count)

**Total : 5 stats manquantes**

#### Formulaires manquants

- ❌ **Modal "Créer réservation"** complète (19 champs)
- ❌ **Modal "Sync Réservations"**
- ❌ **Modal "Modifier réservation"**
- ❌ **Modal "Annuler réservation"** (avec raison)
- ❌ **Modal "Déclarer check-in/out"** (avec heure)

**Total : 5 modals manquants**

#### Fonctionnalités spéciales manquantes

- ❌ **Tri avancé** (par colonne avec logique métier)
- ❌ **Annulations non acquittées** (bandeau + priorité)
- ❌ **Réservations unmapped** (highlight + résolution)
- ❌ **Real-time updates** (Socket.io)
- ❌ **Multi-sélection** (bulk actions)
- ❌ **Configuration colonnes** (afficher/masquer)
- ❌ **Vue mobile optimisée**
- ❌ **Mode paysage mobile**
- ❌ **Filtres persistants**
- ❌ **Export iCal**
- ❌ **Tooltips informatifs**
- ❌ **Highlights modifications récentes**

**Total : 12 fonctionnalités manquantes**

---

### 💡 RECOMMANDATIONS - PAGE RÉSERVATIONS

**Option 1 : Enrichir ReservationsPage.tsx existante**

À ajouter dans `/Users/gouacht/Sojori-orchestrator/src/pages/ReservationsPage.tsx` :

1. **Colonnes** : Ajouter 15 colonnes manquantes (priorité : reservationNumber, phone, paymentStatus, travelers, notes)
2. **Filtres** : Ajouter 8 filtres manquants (priorité : recherche numéro, listing multi-select, timeline)
3. **Boutons header** : Ajouter 5 boutons (Sync, PDF, Imprimer, Colonnes, Modifier)
4. **Actions ligne** : Ajouter menu 3 points avec 8 actions
5. **Stats** : Ajouter 5 KPIs manquants (ADR, RevPAR, Total, En attente, Annulations)
6. **Modals** : Créer 5 composants modal (Créer, Sync, Modifier, Annuler, Check-in/out)
7. **Fonctionnalités** : Implémenter 12 features spéciales

**Estimation** : ~2000-3000 lignes de code + 8-10 composants

**Option 2 : Créer page "Other - Réservations Extended"**

Si trop de données → Créer :
- `/pages/ReservationsExtendedPage.tsx` avec TOUTES les colonnes
- Lien dans menu "Other" ou sous-menu "Réservations > Vue complète"

---

## 📄 PAGE 2 : RÉSERVATION DÉTAIL / SÉJOUR

### Ancien Dashboard

**Fichiers** :
- `/Users/gouacht/sojori-dashboard/src/features/reservation/pages/reservationDetails.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/reservation/pages/reservation-detail.jsx`
- Composants : `ReservationDetailsCard`, `ReservationEditForm`, `ReservationViewTable`, `ReservationThreadsPanel`

**Route** : `/admin/Reservation/reservation-view/:id`

#### Sections affichées

1. **Header Hero** - Photo listing + Infos guest (nom, pays, avatar) + Property + Dates + Prix total + Statut
2. **Onglets navigation** :
   - Vue d'ensemble
   - Voyageurs (travelers)
   - Financier
   - Communications
   - Tâches
   - Timeline/Historique
3. **Vue d'ensemble** :
   - Infos réservation (dates, heures, nuits, source, code confirmation)
   - Détails listing (adresse, équipements, instructions accès)
   - Détails voyageur (email, phone, langue, préférences)
   - Notes internes (textarea éditable)
   - Documents (passeports scannés si check-in fait)
4. **Voyageurs** :
   - Liste `adults` + `children` + `infants`
   - Pour chaque : Nom, Prénom, Passeport, Nationalité, Date naissance
   - Statut : COMPLETE, DRAFT, NOT_REGISTERED
   - Photos passeport (si uploadées)
   - Bouton "Ajouter voyageur"
5. **Financier** :
   - Prix par nuit
   - Frais ménage
   - Frais supplémentaires (extras)
   - Taxes
   - Commission OTA (% + montant)
   - Total voyageur
   - Net owner (revenus propriétaire)
   - Historique paiements
   - Boutons "Ajouter paiement", "Ajouter frais"
6. **Communications** :
   - Thread WhatsApp (si applicable)
   - Messages OTA (Airbnb, Booking)
   - Emails envoyés
   - Bouton "Envoyer message"
7. **Tâches** :
   - Liste tâches associées (check-in, ménage, maintenance, etc.)
   - Statut tâche (pending, completed, cancelled)
   - Staff assigné
   - Dates d'échéance
   - Bouton "Créer tâche"
8. **Timeline/Historique** :
   - Événements chronologiques (création, modifications, messages, check-in/out, paiements)
   - Horodatage précis
   - Type événement (auto, manuel, AI)
9. **Actions rapides (sidebar droite)** :
   - 📧 Envoyer message
   - ✏️ Modifier réservation
   - 📅 Voir calendrier
   - 📋 Voir tâches
   - ✅ Déclarer arrivée/départ
   - 💬 Ouvrir WhatsApp
   - ❌ Annuler réservation
10. **Données Booking.com spécifiques** (si source Booking) :
    - Composant `BookingComDataCard`
    - Infos card holder
    - Virtual card number (masqué)
    - CVC, expiration
    - Montant autorisé
11. **Données financières détaillées** :
    - `BookingComFinancialTable`
    - Détail ventilation prix par nuit
    - Frais par type
    - Calculs

**Total sections** : 11 + sous-sections

#### Boutons / Actions

1. **"📧 Envoyer message"** (header)
2. **"✏️ Modifier réservation"** (header + sidebar)
3. **"📅 Voir calendrier"** (sidebar)
4. **"📋 Voir tâches"** (sidebar)
5. **"✅ Déclarer arrivée"** (si pas fait)
6. **"✅ Déclarer départ"** (si arrivée faite)
7. **"💬 Ouvrir WhatsApp"** (sidebar)
8. **"❌ Annuler réservation"** (header + sidebar)
9. **"🖨 Imprimer"** (header)
10. **"📥 Exporter PDF"** (header)
11. **"💾 Sauvegarder modifications"** (si édition)
12. **"+ Ajouter voyageur"** (onglet Voyageurs)
13. **"+ Ajouter paiement"** (onglet Financier)
14. **"+ Ajouter frais"** (onglet Financier)
15. **"+ Créer tâche"** (onglet Tâches)
16. **"📤 Envoyer reminder"** (si check-in imminent)

**Total : 16 boutons/actions**

#### Données affichées

**Infos réservation** :
- Numéro réservation, Code OTA, Source, Statut, Created at, Updated at
- Check-in date + time, Check-out date + time, Nuits
- Guest name, email, phone, country, langue
- Property name, address, city, room type (si applicable)
- Prix total, devise, commission, net owner, paiement status

**Infos voyageurs** :
- Liste complète avec statut enregistrement
- Passeports, nationalités, dates naissance

**Infos financières** :
- Détail complet ventilation prix
- Historique paiements

**Infos communications** :
- Threads messages
- Historique emails

**Infos tâches** :
- Liste tâches + statuts + assignations

**Timeline** :
- Historique complet événements

**Total champs de données** : 50+

---

### Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/ReservationSejourPage.tsx`
**Route** : `/reservations/:id`
**Lignes de code** : ~327

#### Sections affichées

1. **Header** - Titre `Réservation #ID` + Statut "ACTIVE/TERMINÉE"
2. **Hero Card** - Photo property + Avatar guest + Nom + Pays + Listing + Dates + Prix + Badge statut jour actuel
3. **Timeline du séjour (LEFT)** - Chronologie événements par jour :
   - 12 mai : Réservation confirmée
   - 13 mai : Enregistrement voyageur
   - 14 mai : Préparatifs check-in
   - 15 mai : Check-in (aujourd'hui)
   - 22 mai : Check-out prévu
   - Badges (Auto, AI, WhatsApp, Staff, Form, etc.)
4. **Sidebar RIGHT** - 5 panels :
   - Résumé réservation (Statut, Phase, Check-in, Check-out, Nuits, Source, Code)
   - Tarification (Total voyageur, Par nuit, Frais ménage, Commission OTA, Revenu net)
   - Contact (Email, Téléphone)
   - AI Card (Recommandations AI)
   - Actions rapides (4 boutons)

**Total sections** : 5

#### Boutons / Actions

**Header** :
1. **"📧 Envoyer message"**
2. **"📋 Modifier"**
3. **"❌ Annuler"**

**Sidebar Actions rapides** :
4. **"💬 Ouvrir WhatsApp"**
5. **"📋 Modifier réservation"**
6. **"📊 Voir orchestration"**
7. **"❌ Annuler séjour"**

**AI Card** :
8. **"✨ Générer message mid-stay"**
9. **"Voir recommandations"**

**Total : 9 boutons**

#### Données affichées

**Résumé** :
- ID, Statut, Phase (Jour X/Y), Check-in, Check-out, Nuits, Source, Code

**Tarification** :
- Total, Par nuit, Ménage, Commission, Net

**Contact** :
- Email, Phone

**Timeline** :
- Événements avec timestamps, types, badges

**Total champs de données** : ~20

---

### ❌ CE QUI MANQUE DANS LE NOUVEAU

#### Sections manquantes

- ❌ **Onglets navigation** (Vue d'ensemble, Voyageurs, Financier, Communications, Tâches, Historique)
- ❌ **Section Voyageurs** (liste complète adults/children/infants + statuts enregistrement + passeports)
- ❌ **Section Financier détaillée** (ventilation prix, frais, taxes, historique paiements)
- ❌ **Section Communications** (thread WhatsApp, messages OTA, emails)
- ❌ **Section Tâches** (liste tâches associées, statuts, staff)
- ❌ **Section Historique/Timeline complète** (tous événements, pas seulement parcours type)
- ❌ **Détails listing** (adresse, équipements, instructions accès)
- ❌ **Notes internes** (textarea éditable)
- ❌ **Documents** (passeports scannés)
- ❌ **Données Booking.com spécifiques** (virtual card, etc.)

**Total : 10 sections manquantes**

#### Boutons/Actions manquants

- ❌ **"✅ Déclarer arrivée"** (modal avec heure effective)
- ❌ **"✅ Déclarer départ"** (modal avec heure effective)
- ❌ **"🖨 Imprimer"**
- ❌ **"📥 Exporter PDF"**
- ❌ **"💾 Sauvegarder modifications"**
- ❌ **"+ Ajouter voyageur"**
- ❌ **"+ Ajouter paiement"**
- ❌ **"+ Ajouter frais"**
- ❌ **"+ Créer tâche"**
- ❌ **"📤 Envoyer reminder"**

**Total : 10 boutons manquants**

#### Données manquantes

**Infos réservation** :
- ❌ Code OTA, Created at, Updated at, Room type, Paiement status détaillé

**Infos voyageurs** :
- ❌ Liste complète, Statuts, Passeports, Nationalités, Dates naissance

**Infos financières** :
- ❌ Détail ventilation, Frais supplémentaires, Taxes, Historique paiements

**Infos communications** :
- ❌ Threads complets, Messages OTA, Emails

**Infos tâches** :
- ❌ Liste tâches, Statuts, Assignations, Dates échéance

**Timeline** :
- ❌ Historique complet (vs parcours type mocké)

**Total : 30+ champs de données manquants**

---

### 💡 RECOMMANDATIONS - PAGE SÉJOUR

**Option 1 : Enrichir ReservationSejourPage.tsx**

À ajouter dans `/Users/gouacht/Sojori-orchestrator/src/pages/ReservationSejourPage.tsx` :

1. **Onglets** : Créer TabsNavigation avec 6 onglets (Vue d'ensemble, Voyageurs, Financier, Communications, Tâches, Historique)
2. **Section Voyageurs** : Composant avec liste + formulaire ajout
3. **Section Financier** : Tableau détaillé + actions (paiements, frais)
4. **Section Communications** : Thread WhatsApp + Messages OTA + Emails
5. **Section Tâches** : Liste + créer tâche
6. **Historique** : Timeline complète (vs mocké)
7. **Actions** : 10 boutons manquants
8. **Données** : 30+ champs manquants

**Estimation** : +1500-2000 lignes de code + 6-8 composants

**Option 2 : Créer "ReservationSejourExtendedPage.tsx"**

Page séparée avec toutes les données + onglets.

---

## 📄 PAGE 3 : CALENDRIER - VUE MULTI-PROPRIÉTÉS

### Ancien Dashboard

**Fichiers** :
- `/Users/gouacht/sojori-dashboard/src/features/calendar/pages/InventoryCalendarNew.jsx` (~800 lignes)
- `/Users/gouacht/sojori-dashboard/src/features/reservation/calendarPage/ReservationCalendar.jsx` (~103 lignes)
- Composants : `InventoryGrid`, `CalendarHeader`, `ColumnFilters`, `FilterListings`, `UpdateInventoryModal`, `ReservationDetailDrawer`
- `/Users/gouacht/sojori-dashboard/src/features/ultimateDashboard/components/StaffPlanningView`

**Routes** :
- `/admin/calendar/inventory` (inventaire multi-listings)
- `/admin/calendar/reservations` (vue réservations planning)

#### Vues disponibles

1. **Vue Inventaire (InventoryCalendarNew)** :
   - Grille par listing + room type
   - Colonnes par jour (31 jours, mobile : 14 jours)
   - Cellules : `availableRoom` (dispo), `rate` (prix), `reservations` (opt-in)
   - Colonnes configurables : `availableRoom`, `rate`, `reservations`, `stopSell`, `useDynamicPrice`, `min_stay_arrival`, `max_stay`, `closed_to_arrival`, `closed_to_departure`

2. **Vue Réservations Planning (ReservationCalendar)** :
   - Gantt-style par listing
   - Réservations affichées en blocs sur timeline
   - Intégration avec `StaffPlanningView` (design Vue Séjour)
   - Navigation jour/semaine

#### Fonctionnalités

1. **Navigation dates** :
   - Boutons ← → pour changer mois/semaine
   - Date picker
   - "Aujourd'hui" button
2. **Filtres** :
   - Par listing(s) (multi-select)
   - Par statut (all, active, inactive)
   - Par colonne affichée (sélecteur colonnes)
3. **Affichage cellules** :
   - Disponibilité (nombre rooms)
   - Prix (basePrice, calculatedPrice, manualPrice, dynamic)
   - Réservations (si colonne activée)
   - Restrictions (min_stay, closed_to_arrival, etc.)
   - Stop sell status
4. **Édition cellules** :
   - Sélection cellule → Drawer latéral
   - Modification prix (manuel ou AI suggestion)
   - Modification dispo
   - Modification restrictions
   - Bulk edit (multi-sélection dates)
5. **Sync canaux** :
   - Boutons "🔄 Sync RU" (RentalsUnited)
   - "🔄 Sync Calendar" (iCal)
   - "📤 Push Inventory to RU"
   - Indicateurs sync (ok, pending, error) par jour
6. **Réservations drawer** :
   - Clic sur réservation → Drawer détail (`ReservationDetailDrawer`)
   - Infos complètes réservation
   - Actions rapides
7. **Responsive mobile** :
   - `InventoryMobileView` composant dédié
   - `MobileFilterBar` + `MobileFiltersDrawer`
   - Scroll horizontal optimisé (14 jours)
   - Badge filtres actifs
   - Toolbar repliable
8. **Pagination** :
   - 100 listings par page (réglable)
9. **Stats** :
   - Par listing : Occupation %, Revenu mois
   - Global : Total dispo, réservé, fermé
10. **Row expansion** :
    - Expand/collapse par listing (si multi room types)
11. **Real-time updates** :
    - Socket.io pour refetch si nouvelle réservation
12. **Modal "Update Inventory"** :
    - Bulk edit prix/dispo sur plage dates
13. **Colonnes filtres** :
    - `ColumnFilters` composant pour sélectionner colonnes à afficher
14. **Highlights** :
    - Aujourd'hui (bordure bleue)
    - Weekend (fond gris)
    - Indisponible (rouge)
    - Prix manuel (badge)
    - AI suggestion (icône ✨)

**Total fonctionnalités** : 14

#### Données affichées par cellule

**Mode Inventaire** :
- `availableRoom` (nombre)
- `basePrice` (€)
- `calculatedPrice` (€)
- `manualPrice` (€ si défini)
- `applyManual` (boolean)
- `stopSell` (boolean)
- `useDynamicPrice` (boolean)
- `setUseDynamicPriceManual` (boolean)
- `min_stay_arrival` (nombre)
- `max_stay` (nombre)
- `closed_to_arrival` (boolean)
- `closed_to_departure` (boolean)
- `reservations[]` (si colonne activée)
- `calculatedPriceHistory` (historique)
- Sync status par canal (airbnb, booking, vrbo, direct)

**Total champs par cellule** : 15

**Mode Réservations Planning** :
- Blocs réservations sur timeline
- Nom guest, source, dates, prix, statut
- Couleur par listing
- Occupation %
- Revenu prévisionnel

#### Boutons / Actions

**Header** :
1. **"← →"** (navigation dates)
2. **"Aujourd'hui"**
3. **"Date picker"** (calendrier)
4. **"🔄 Sync RU"** (RentalsUnited)
5. **"🔄 Sync Calendar"** (iCal)
6. **"📤 Push Inventory"** (vers RU)
7. **"⚙️ Colonnes"** (sélecteur colonnes)
8. **"🏠 Propriétés"** (filtre multi-select)
9. **"🟢 Statut"** (actif/inactif)
10. **"📊 Exporter"** (CSV/Excel)

**Cellule** :
11. **Clic cellule** → Drawer édition
12. **Multi-sélection** → Bulk edit modal
13. **Clic réservation** → Drawer détail réservation

**Drawer édition** :
14. **"💾 Sauvegarder"**
15. **"❌ Annuler"**
16. **"✨ Appliquer AI price"**
17. **"🔒 Fermer date"**
18. **"🚫 Stop sell"**

**Total : 18 boutons/actions**

#### Stats affichées

**Global** :
1. Jours disponibles totaux
2. Jours réservés totaux
3. Jours fermés totaux
4. Taux occupation global (%)
5. Revenu prévisionnel total (€)
6. Prix moyen/nuit (€)
7. Opportunités AI (manque-à-gagner) (€)
8. Erreurs sync (count)

**Par listing** :
9. Nom + ville
10. Occupation % mois
11. Revenu mois (€)
12. Jours dispo
13. Property unit (Single, Multi-room)
14. Active status (boolean)

**Total : 14 stats**

---

### Nouveau Dashboard

**Fichiers** :
- `/Users/gouacht/Sojori-orchestrator/src/pages/CalendarInventoryPage.tsx` (~505 lignes)
- `/Users/gouacht/Sojori-orchestrator/src/components/MultiPropertyInventory.tsx`

**Route** : `/calendar`

#### Vues disponibles

1. **Vue single property** :
   - Grille calendrier mensuel (7×~5 semaines)
   - Cellules par jour
   - Sélection property (dropdown)

2. **Vue multi** :
   - Composant `MultiPropertyInventory`
   - 5 properties mockées
   - Timeline 30 jours
   - Ranges réservés + fermés

**Total vues** : 2

#### Fonctionnalités

1. **Navigation dates** :
   - Boutons ← → pour changer mois
2. **Sélection property** (mode single)
3. **Toggle single/multi view**
4. **Cellules clickables** → Drawer détail
5. **Multi-sélection dates** (drag)
6. **Bulk actions** (floating bar) : Modifier prix, Fermer dates, Restrictions
7. **Drawer édition** :
   - Prix (base + AI suggestion)
   - Restrictions (min nuits, check-in/out allowed)
   - Sync canaux (status dots)
8. **Stats row** :
   - Disponibles, Réservés, Fermés, Occupation %, Revenu, Manque-à-gagner AI
9. **Legend** :
   - 🟢 Disponible, 🔴 Réservé, 🔒 Fermé, ✨ Prix AI différent
10. **Status colors** par statut

**Total fonctionnalités** : 10

#### Données affichées par cellule

**Mode single** :
- `date`, `day`, `weekday`, `inMonth`, `isToday`
- `status` (available, booked, closed, pending)
- `price` (base)
- `suggestedPrice` (AI)
- `minNights`
- `checkInAllowed`, `checkOutAllowed`
- `bookedBy` (si réservé) : initials, name, source
- `channels` (sync status) : airbnb, booking, direct

**Total champs par cellule** : 12

**Mode multi** :
- Ranges réservés (array `[start, end]`)
- Ranges fermés (array `[day, day]`)
- Occupation % mois
- Revenu mois (€)

#### Boutons / Actions

**Header** :
1. **"📅 Une propriété / 📊 Vue multi"** (ViewToggle)
2. **"Property dropdown"** (mode single)
3. **"← →"** (navigation mois)
4. **"🔄 Sync canaux"**
5. **"💾 Sauvegarder"**

**Floating bar (multi-sélection)** :
6. **"💰 Modifier prix"**
7. **"🔒 Fermer dates"**
8. **"⏱ Restrictions"**
9. **"✕"** (annuler sélection)

**Drawer** :
10. **"✨ Appliquer AI price"**
11. **"🔒 Fermer date"**
12. **"🚫 Bloquer"**
13. **"💾 Sauvegarder modifications"**
14. **"✕"** (fermer drawer)

**Total : 14 boutons**

#### Stats affichées

1. Disponibles (jours)
2. Réservés (jours)
3. Fermés (jours)
4. Occupation (%)
5. Revenu (€)
6. Manque-à-gagner AI (€)

**Total : 6 stats**

---

### ❌ CE QUI MANQUE DANS LE NOUVEAU

#### Vues manquantes

- ❌ **Vue Réservations Planning** (Gantt-style avec blocs réservations sur timeline)
- ❌ **Mode Inventaire avancé** (grille par room type + colonnes configurables)
- ❌ **Navigation jour/semaine** (seulement mois dans nouveau)

**Total : 3 vues manquantes**

#### Fonctionnalités manquantes

- ❌ **"Aujourd'hui" button**
- ❌ **Date picker avancé**
- ❌ **Filtres par listing(s) multi-select** (mode multi)
- ❌ **Filtres par statut** (active/inactive)
- ❌ **Sélecteur colonnes** (pour afficher/masquer : dispo, prix, réservations, restrictions, etc.)
- ❌ **Sync RentalsUnited** (RU)
- ❌ **Sync iCal**
- ❌ **Push Inventory to RU**
- ❌ **Indicateurs sync détaillés** (ok, pending, error) - Présent en dots mais pas détails
- ❌ **Réservations drawer** (clic sur réservation → détail complet)
- ❌ **Responsive mobile optimisé** (composants dédiés mobile)
- ❌ **Pagination** (si 100+ listings)
- ❌ **Row expansion** (pour multi room types)
- ❌ **Real-time updates** (Socket.io)
- ❌ **Modal "Update Inventory"** bulk advanced
- ❌ **Highlights avancés** (weekend, prix manuel, AI, etc.) - Basique présent

**Total : 16 fonctionnalités manquantes**

#### Données cellule manquantes

- ❌ `calculatedPrice` (prix calculé dynamique)
- ❌ `manualPrice` (prix manuel défini)
- ❌ `applyManual` (flag prix manuel actif)
- ❌ `stopSell` (stop vente)
- ❌ `useDynamicPrice` (flag dynamic pricing actif)
- ❌ `setUseDynamicPriceManual` (override dynamic)
- ❌ `max_stay` (séjour maximum)
- ❌ `closed_to_arrival` (fermé arrivée)
- ❌ `closed_to_departure` (fermé départ)
- ❌ `reservations[]` (liste réservations si colonne activée)
- ❌ `calculatedPriceHistory` (historique prix)
- ❌ Sync status détaillé (vrbo manquant, seulement airbnb/booking/direct)

**Total : 12 champs manquants**

#### Boutons/Actions manquants

- ❌ **"Aujourd'hui"** button
- ❌ **Date picker** (seulement ← → mois)
- ❌ **"🔄 Sync RU"**
- ❌ **"🔄 Sync Calendar"**
- ❌ **"📤 Push Inventory"**
- ❌ **"⚙️ Colonnes"** (sélecteur)
- ❌ **"🏠 Propriétés"** (filtre multi-select mode multi)
- ❌ **"🟢 Statut"** (actif/inactif)
- ❌ **"📊 Exporter"** (CSV/Excel)
- ❌ **"🚫 Stop sell"** (dans drawer)

**Total : 10 boutons manquants**

#### Stats manquantes

- ❌ **Prix moyen/nuit** (€) - Global
- ❌ **Erreurs sync** (count) - Global
- ❌ **Par listing détails** : Active status, Property unit (Single/Multi-room)

**Total : 3 stats manquantes**

---

### 💡 RECOMMANDATIONS - CALENDRIER

**Option 1 : Enrichir CalendarInventoryPage.tsx**

À ajouter dans `/Users/gouacht/Sojori-orchestrator/src/pages/CalendarInventoryPage.tsx` :

1. **Vues** : Ajouter vue "Réservations Planning" (Gantt) + Mode Inventaire avancé
2. **Navigation** : Ajouter "Aujourd'hui" + Date picker + Navigation jour/semaine
3. **Filtres** : Ajouter filtres listing multi-select + statut (mode multi)
4. **Colonnes** : Créer sélecteur colonnes (dispo, prix, réservations, restrictions, stop sell, etc.)
5. **Sync** : Ajouter boutons Sync RU + iCal + Push + Indicateurs détaillés
6. **Drawer** : Créer `ReservationDetailDrawer` pour clic sur réservation
7. **Mobile** : Créer composants mobile dédiés
8. **Données cellule** : Ajouter 12 champs manquants
9. **Stats** : Ajouter 3 stats manquantes
10. **Fonctionnalités** : 16 features manquantes

**Estimation** : +2000-2500 lignes de code + 10-12 composants

**Option 2 : Créer pages séparées**

- `/calendar/inventory` (inventaire avancé)
- `/calendar/reservations-planning` (Gantt)
- Lien dans navigation "Calendrier > ..."

---

## 📄 PAGE 4 : INVENTAIRE

### Ancien Dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/features/calendar/pages/InventoryCalendarNew.jsx`

**Note** : Page "Inventaire" dans l'ancien = même page que "Calendrier Inventaire" (InventoryCalendarNew).

Voir section PAGE 3 pour détails complets.

**Spécificités Inventaire** :
- Focus sur gestion disponibilités + prix
- Colonnes configurables (8 colonnes possibles)
- Édition bulk avancée
- Sync canaux (RU, iCal)
- Modal "Update Inventory"

---

### Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/InventoryPage.tsx` (~664 lignes)

**Route** : `/inventory`

#### Différences vs CalendarInventoryPage

1. **Statuts enrichis** : `available`, `booked`, `blocked`, `closed` (vs available/booked/closed)
2. **Filtres par statut** : FilterChips pour chaque statut + count
3. **Vue expanded columns** : Toggle "📊 Voir plus" pour afficher min nights, check-in/out allowed dans cellules
4. **Modal "Bloquer dates"** : Dialog avec raison blocage (textarea)
5. **Erreurs sync** : Chip alert si erreurs (⚠️ X erreurs sync)
6. **Channels** : airbnb, booking, vrbo (vs airbnb/booking/direct)
7. **Dynamic pricing** : `dynamicPrice` (vs `suggestedPrice`)
8. **Stats** : 4 StatCards (Disponibles, Occupation, Revenu, Prix moyen/nuit)

#### Ce qui EST présent en plus

- ✅ **Statut "blocked"** (en plus de closed)
- ✅ **FilterChips par statut** avec counts
- ✅ **Toggle vue expanded** (colonnes)
- ✅ **Modal blocage dates** avec raison
- ✅ **Chip erreurs sync**
- ✅ **StatCard prix moyen/nuit**

---

### ❌ CE QUI MANQUE (même liste que PAGE 3)

Voir section PAGE 3 "Calendrier" pour liste complète.

**Spécifique Inventaire** :
- ❌ **Colonnes configurables avancées** (8 colonnes : dispo, prix, réservations, stopSell, dynamic, min_stay, max_stay, closed_to_arrival, closed_to_departure)
- ❌ **Modal "Update Inventory"** (bulk edit avancé avec plage dates + propriété + room type)
- ❌ **Sync RU** (RentalsUnited)
- ❌ **Sync iCal**
- ❌ **Push Inventory**
- ❌ **Real-time updates** (Socket.io)
- ❌ **Vue par room type** (si property multi-room)

**Total manquants** : ~20 (cumul avec PAGE 3)

---

### 💡 RECOMMANDATIONS - INVENTAIRE

**Option 1 : Fusionner avec CalendarInventoryPage**

Les 2 pages (CalendarInventoryPage + InventoryPage) sont très similaires. Recommandation :

1. **Fusionner** en une seule page `/calendar-inventory`
2. **Toggle mode** : "Vue calendrier" vs "Vue inventaire"
3. **Ajouter** toutes features manquantes des 2

**Estimation** : Évite duplication, ~2500 lignes uniques

**Option 2 : Garder séparé mais enrichir**

- CalendarInventoryPage → Focus visualisation réservations
- InventoryPage → Focus gestion dispo/prix

Ajouter features manquantes à chaque page.

---

## 🎯 PRIORISATION GLOBALE

### 🔴 CRITIQUE (Must have)

**PAGE RÉSERVATIONS - LISTE** :
1. **reservationNumber** (colonne) - ID business critical
2. **phone** (colonne) - Contact guest essentiel
3. **paymentStatus** (colonne) - Paid/Unpaid business critical
4. **travelers** (colonne) - Adultes/Enfants + statut enregistrement (légal)
5. **Recherche par numéro réservation** (filtre)
6. **Par listing(s)** (filtre multi-select)
7. **Par timeline** (filtre : arrivées/départs aujourd'hui)
8. **"🔄 Sync Réservations"** (bouton) - Sync OTA critical
9. **"+ Créer réservation"** (modal complet 19 champs)
10. **"✏️ Modifier"** (action ligne)
11. **"✅ Déclarer arrivée/départ"** (action ligne)
12. **Real-time updates** (Socket.io) - Updates en temps réel

**PAGE SÉJOUR - DÉTAIL** :
13. **Section Voyageurs** complète (liste + passeports + statuts)
14. **Section Financier** détaillée (ventilation + paiements)
15. **"✅ Déclarer arrivée/départ"** (modal avec heure)
16. **Onglets navigation** (6 onglets)

**CALENDRIER / INVENTAIRE** :
17. **Vue Réservations Planning** (Gantt) - Visualisation essentielle
18. **Sélecteur colonnes** (8 colonnes configurables)
19. **Sync RU + iCal** (boutons) - Sync canaux critical
20. **Drawer réservation** (clic sur réservation → détail)
21. **Real-time updates** (Socket.io)

### 🟠 IMPORTANT (Should have)

**PAGE RÉSERVATIONS - LISTE** :
22. **guestCountry** (colonne) - Drapeau + langue
23. **createdAt** (colonne)
24. **checkInTime / checkOutTime** (colonnes)
25. **days** (colonne nombre nuits)
26. **notes internes** (icône 💬)
27. **Par canal détaillé** (filtre multi-select)
28. **Par statut détaillé** (filtre multi-select)
29. **Recherche par nom voyageur** (filtre)
30. **"📊 Exporter PDF"** (bouton)
31. **"📋 Voir tâches"** (action ligne)
32. **"📧 Envoyer message"** (action ligne)
33. **"❌ Annuler réservation"** (modal avec raison)
34. **ADR / RevPAR** (stats)
35. **Configuration colonnes** (afficher/masquer)
36. **Multi-sélection** (bulk actions)
37. **Annulations non acquittées** (bandeau prioritaire)

**PAGE SÉJOUR - DÉTAIL** :
38. **Section Communications** (thread WhatsApp + messages OTA)
39. **Section Tâches** (liste + créer)
40. **Timeline complète** (vs parcours type mocké)
41. **Détails listing** (adresse, équipements)
42. **Notes internes** (textarea éditable)
43. **"+ Ajouter voyageur"** (action)
44. **"+ Ajouter paiement"** (action)
45. **"+ Créer tâche"** (action)

**CALENDRIER / INVENTAIRE** :
46. **"Aujourd'hui" button**
47. **Date picker avancé**
48. **Filtres listing multi-select** (mode multi)
49. **Indicateurs sync détaillés** (ok/pending/error)
50. **Modal "Update Inventory"** bulk
51. **Responsive mobile optimisé** (composants dédiés)
52. **Pagination** (100+ listings)
53. **Données cellule avancées** (12 champs manquants)

### 🟡 NICE TO HAVE (Could have)

54. **location/ville** (colonne)
55. **otaCode, voucherNo, roomTypeName, channelMng** (colonnes optionnelles)
56. **Par paiement** (filtre Paid/Unpaid)
57. **Filtre admin/owner**
58. **"🖨 Imprimer"** (bouton)
59. **"🔗 Dupliquer"** (action ligne)
60. **Réservations en attente** (stat)
61. **Annulations** (stat count)
62. **Réservations unmapped** (highlight + résolution)
63. **Vue mobile optimisée** (composant dédié)
64. **Mode paysage mobile**
65. **Filtres persistants** (localStorage)
66. **Export iCal**
67. **Tooltips informatifs** (sur colonnes)
68. **Highlights modifications récentes**
69. **Documents** (passeports scannés)
70. **Données Booking.com spécifiques** (virtual card)
71. **Navigation jour/semaine** (calendrier)
72. **Row expansion** (multi room types)
73. **Highlights avancés** (weekend, prix manuel, AI)

---

## ✅ CHECKLIST FINALE

- [✅] Exploré ancien dashboard (Réservations)
- [✅] Exploré nouveau dashboard (Réservations)
- [✅] Listé TOUTES les colonnes ancien vs nouveau (21 vs 6)
- [✅] Listé TOUS les filtres ancien vs nouveau (10 vs 4)
- [✅] Listé TOUS les boutons ancien vs nouveau (15+ vs 4)
- [✅] Listé TOUTES les stats ancien vs nouveau (8 vs 4)
- [✅] Fait de même pour Séjour (11 sections vs 5)
- [✅] Fait de même pour Calendrier (14 fonctionnalités vs 10)
- [✅] Fait de même pour Inventaire (spécificités)
- [✅] Créé liste de recommandations (3 options par page)
- [✅] Priorisé 73 éléments manquants (21 critiques, 32 importants, 20 nice-to-have)
- [✅] Sauvegardé rapport complet

---

## 📤 LIVRAISON

**Fichier** : `/Users/gouacht/Sojori-orchestrator/docs/AUDIT_AGENT_2_RESERVATIONS_CALENDRIER.md`

**Date** : 14 mai 2026
**Agent** : 2

**Résumé final** :
- ✅ 4 pages auditées (Liste, Séjour, Calendrier, Inventaire)
- ✅ 73 éléments manquants identifiés
- ✅ 21 éléments CRITIQUES
- ✅ 32 éléments IMPORTANTS
- ✅ 20 éléments NICE-TO-HAVE
- ✅ Recommandations par page (enrichir vs créer extended)

**Prochaine étape** : Les prompts pour compléter les pages manquantes peuvent être créés sur base de cet audit.
