# 🎨 DEMANDES CLAUDE DESIGN - MODALS MANQUANTS

**Date** : 14 Mai 2026
**Demandeur** : Patron (via Agent Audit)
**Destinataire** : Claude Design
**Contexte** : Phase 1 corrections - 8 modals critiques manquants

---

## 📋 RÉSUMÉ

Nous avons besoin de **8 modals supplémentaires** pour compléter le dashboard.

**Modals déjà livrés par Claude Design** (11) : ✅
- AddTeamMemberModal
- EditPlanningModal
- BroadcastModal
- StaffTasksPanel
- TravelersSection
- FinancialSection
- AdvancedTaskFilters
- ColumnSelector
- ReservationsGanttView
- PricingRulesEditor
- ChannelsDashboard

**Modals à créer** (8) : ⏳

---

## 🎨 MODAL #1 : AdminActionModal

### Priorité : P1 - BLOQUANT

### Agent demandeur : Agent 1 - Orchestration

### Contexte d'utilisation

Modal d'action admin depuis la timeline d'orchestration. Permet d'effectuer différentes actions sur une réservation (envoyer email, créer tâche, noter événement, etc.)

### Référence ancien dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/features/ultimateDashboard/components/orchestration/modals/AdminActionModal.jsx`

Tu peux consulter ce fichier pour voir l'implémentation existante.

### Spécifications détaillées

**Déclencheur** :
- Clic sur bouton "Action" dans timeline orchestration
- Ou clic droit sur événement timeline

**Props TypeScript** :
```typescript
interface AdminActionModalProps {
  open: boolean;
  onClose: () => void;
  reservation?: {
    id: string;
    code: string;
    guestName: string;
    listingName: string;
    checkIn: string;
    checkOut: string;
  };
  initialActionType?: 'email' | 'task' | 'note' | 'sms' | 'call';
  onAction: (action: AdminAction) => Promise<void>;
}

interface AdminAction {
  type: 'email' | 'task' | 'note' | 'sms' | 'call';
  data: Record<string, any>;
}
```

**Layout** :
- Taille : `maxWidth: 'md'` (medium)
- Header : Titre "Action Admin" + sous-titre avec info réservation
- Body : Form avec fields dynamiques selon type d'action
- Footer : Boutons Annuler + Exécuter

**Champs (dynamiques selon type d'action)** :

**Si type = 'email'** :
- Destinataire (select : guest, owner, staff, custom)
- Sujet (textfield)
- Message (textarea, 5 lignes min)
- Template (select : pré-définis)
- Pièces jointes (file upload, max 3)
- Copie à moi (checkbox)

**Si type = 'task'** :
- Titre tâche (textfield, required)
- Description (textarea)
- Assigné à (select staff, required)
- Priorité (select : low, medium, high, urgent)
- Date limite (date picker)
- Lié à réservation actuelle (checkbox, checked par défaut)

**Si type = 'note'** :
- Type note (select : interne, pour client, pour staff)
- Note (textarea, required)
- Important (checkbox)
- Visible dans timeline (checkbox, checked par défaut)

**Si type = 'sms'** :
- Destinataire (phone)
- Message (textarea, max 160 caractères)
- Template SMS (select)

**Si type = 'call'** :
- Type appel (select : entrant, sortant, manqué)
- Durée (number, minutes)
- Notes appel (textarea)
- Planifier rappel (checkbox + datetime si oui)

**Validation** :
- Champs required selon type
- Email valide si email
- Phone valide si SMS
- Max lengths respectés

**Actions** :
- Bouton "Annuler" (variant: outlined)
- Bouton "Exécuter" (variant: contained, primary)
- Si `onAction` en cours → loading state
- Après succès → toast + fermeture modal
- Si erreur → afficher erreur en haut du form

**Design Aurora Soft Light** :
- Primary color : #e6b022 (gold)
- Secondary color : #8b5cf6 (purple)
- Type selector : Chips ou Tabs en haut du modal
- Icons par type : Email, Task, Note, SMS, Call

**MOCK behavior** :
- `onAction` appelé avec les données du form
- Pas de vraie API call
- Simuler délai 500ms puis success

### Fichier de sortie

`src/components/modals/AdminActionModal.tsx`

### Dépendances

```bash
# Déjà installées
@mui/material
@mui/icons-material
react
```

---

## 🎨 MODAL #2 : ReservationDetailsModal

### Priorité : P1 - BLOQUANT

### Agent demandeur : Agent 1 - Orchestration

### Contexte d'utilisation

Modal détail complet d'une réservation. Affiche toutes les infos de la réservation avec tabs pour organiser le contenu. Ouvert depuis timeline orchestration ou liste réservations.

### Référence ancien dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/features/reservation/components/ReservationDetailsModal.jsx`

### Spécifications détaillées

**Déclencheur** :
- Clic sur code réservation (#1234) dans timeline
- Clic sur ligne réservation dans liste

**Props TypeScript** :
```typescript
interface ReservationDetailsModalProps {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  onUpdate?: (data: Partial<Reservation>) => Promise<void>;
}

interface Reservation {
  id: string;
  code: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  guest: Guest;
  listing: Listing;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  totalPrice: number;
  source: string;
  // ... etc
}
```

**Layout** :
- Taille : `maxWidth: 'lg'` (large, fullscreen sur mobile)
- Header : Code réservation + status badge + actions rapides
- Body : Tabs (5 tabs)
- Footer : Boutons Fermer + Éditer réservation

**Tabs** :

**Tab 1 : Informations** (default)
- Grid layout 2 colonnes
- Section Guest (nom, email, phone, notes)
- Section Listing (nom, adresse, type)
- Section Dates (check-in, check-out, durée)
- Section Prix (total, payé, reste, méthode paiement)
- Section Source (canal, ref booking, commission)

**Tab 2 : Voyageurs**
- Réutiliser composant Claude Design `TravelersSection`
- Props à passer :
  ```typescript
  <TravelersSection
    reservationId={reservationId}
    travelers={reservation.travelers}
    onUpdate={(travelers) => handleUpdateTravelers(travelers)}
  />
  ```

**Tab 3 : Finances**
- Réutiliser composant Claude Design `FinancialSection`
- Props à passer :
  ```typescript
  <FinancialSection
    reservation={reservation}
    onUpdate={(financial) => handleUpdateFinancial(financial)}
  />
  ```

**Tab 4 : Communication**
- Timeline messages avec guest
- Bouton "Envoyer message" → ouvre MessageComposeModal
- Affichage : Date + sender + message preview
- Clic sur message → expand details

**Tab 5 : Historique**
- Timeline événements réservation
- Affichage : Date + type événement + user + détails
- Exemples : Créée, Confirmée, Modifiée, Check-in, Check-out, Annulée
- Icon par type événement

**Actions rapides (header)** :
- Bouton "Éditer" → mode édition ou ouvre EditReservationModal
- Bouton "Annuler" → ouvre CancelReservationModal
- Bouton "Check-in" (si applicable) → ouvre CheckInOutStatusModal
- Bouton "Check-out" (si applicable) → ouvre CheckInOutStatusModal
- Menu "..." → Plus d'actions (dupliquer, exporter PDF, etc.)

**Validation** :
- Lecture seule par défaut
- Édition possible via bouton "Éditer"

**Design Aurora Soft Light** :
- Tabs Material-UI
- Status badge coloré (confirmed: green, pending: orange, cancelled: red, completed: blue)
- Icons contextuels

**MOCK behavior** :
- Charger données MOCK depuis localStorage
- `onUpdate` appelé si modification
- Simuler save

### Fichier de sortie

`src/components/modals/ReservationDetailsModal.tsx`

### Dépendances

```typescript
// Composants Claude Design à réutiliser
import { TravelersSection } from '../sections/TravelersSection';
import { FinancialSection } from '../sections/FinancialSection';
```

---

## 🎨 MODAL #3 : CheckInOutStatusModal

### Priorité : P1 - BLOQUANT

### Agent demandeur : Agent 2 - Réservations

### Contexte d'utilisation

Modal pour déclarer l'arrivée (check-in) ou le départ (check-out) d'une réservation avec statut et notes.

### Référence ancien dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/features/reservation/modals/CheckInOutModal.jsx`

### Spécifications détaillées

**Déclencheur** :
- Bouton "Check-in" sur réservation
- Bouton "Check-out" sur réservation

**Props TypeScript** :
```typescript
interface CheckInOutStatusModalProps {
  open: boolean;
  onClose: () => void;
  reservation: {
    id: string;
    code: string;
    guestName: string;
    listingName: string;
    expectedCheckIn: string;  // Date attendue
    expectedCheckOut: string; // Date attendue
  };
  mode: 'checkin' | 'checkout';
  onConfirm: (data: CheckInOutData) => Promise<void>;
}

interface CheckInOutData {
  actualDateTime: string;
  status: 'arrived' | 'departed' | 'no-show' | 'early-departure' | 'late-arrival';
  notes: string;
  createTask: boolean;
  taskType?: 'cleaning' | 'inspection' | 'maintenance';
}
```

**Layout** :
- Taille : `maxWidth: 'sm'` (small)
- Header : Titre dynamique ("Check-in" ou "Check-out") + info réservation
- Body : Form
- Footer : Annuler + Confirmer

**Champs** :

**Date/heure effective** (datetime-local, required)
- Label : "Date et heure de [arrivée/départ] effective"
- Default : Maintenant
- Min/Max : Selon mode (check-in: aujourd'hui - 7j à aujourd'hui + 1j, etc.)

**Statut** (select, required)
- Si mode = 'checkin' :
  - arrived (Arrivé)
  - late-arrival (Arrivé en retard)
  - no-show (Absent - No Show)
- Si mode = 'checkout' :
  - departed (Parti)
  - early-departure (Parti en avance)
  - no-show (Toujours absent)

**Notes** (textarea, optional)
- Label : "Notes / Observations"
- Placeholder : "État des lieux, remarques, incidents..."
- Rows : 4

**Créer tâche automatique** (checkbox)
- Label : "Créer une tâche automatique"
- Si checked → afficher select type tâche :
  - Si checkin : "inspection" (Inspection arrivée)
  - Si checkout : "cleaning" (Nettoyage après départ), "inspection" (État des lieux départ)
- Default : checked

**Validation** :
- Date/heure required
- Statut required
- Si no-show → afficher warning "Le client sera marqué comme absent"

**Actions** :
- Bouton "Annuler"
- Bouton "Confirmer [Check-in/Check-out]" (primary)
- Loading state pendant `onConfirm`

**Design Aurora Soft Light** :
- Icônes : CheckCircle (arrived), Warning (no-show), Clock (late/early)
- Status badge preview
- Warning alert si no-show

**MOCK behavior** :
- `onConfirm` appelé avec données
- Simuler save
- Toast success + fermeture

### Fichier de sortie

`src/components/modals/CheckInOutStatusModal.tsx`

---

## 🎨 MODAL #4 : CancelReservationModal

### Priorité : P1 - BLOQUANT

### Agent demandeur : Agent 2 - Réservations

### Contexte d'utilisation

Modal pour annuler une réservation avec raison, gestion remboursement, et notifications.

### Référence ancien dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/features/reservation/modals/CancelReservationModal.jsx`

### Spécifications détaillées

**Déclencheur** :
- Bouton "Annuler réservation" dans menu actions
- Action rapide dans liste

**Props TypeScript** :
```typescript
interface CancelReservationModalProps {
  open: boolean;
  onClose: () => void;
  reservation: {
    id: string;
    code: string;
    guestName: string;
    guestEmail: string;
    listingName: string;
    totalPrice: number;
    amountPaid: number;
    checkIn: string;
    checkOut: string;
  };
  onConfirm: (data: CancelData) => Promise<void>;
}

interface CancelData {
  reason: 'client_request' | 'owner_decision' | 'no_show' | 'force_majeure' | 'other';
  reasonDetails: string;
  refundType: 'none' | 'partial' | 'full';
  refundAmount?: number;
  notifyGuest: boolean;
  createCredit: boolean;
  creditAmount?: number;
}
```

**Layout** :
- Taille : `maxWidth: 'md'` (medium)
- Header : "Annuler la réservation" + warning icon + code réservation
- Body : Form en sections
- Footer : Annuler + Confirmer annulation (red, danger)

**Section 1 : Raison de l'annulation**

**Raison** (select, required)
- client_request : "Demande du client"
- owner_decision : "Décision du propriétaire"
- no_show : "Client absent (No Show)"
- force_majeure : "Force majeure"
- other : "Autre raison"

**Détails** (textarea, required)
- Label : "Détails de l'annulation"
- Placeholder : "Expliquez la raison de l'annulation..."
- Rows : 4
- Required

**Section 2 : Remboursement**

**Type de remboursement** (radio group, required)
- none : "Aucun remboursement"
- partial : "Remboursement partiel"
- full : "Remboursement total"

**Si partial selected** :
- Montant remboursement (number, required)
- Min : 0
- Max : {reservation.amountPaid}
- Suffix : "€"
- Helper text : "Montant payé : {amountPaid}€"

**Si full selected** :
- Afficher info : "Remboursement total de {amountPaid}€"

**Section 3 : Actions complémentaires**

**Notifier le client** (checkbox)
- Label : "Envoyer un email de confirmation au client"
- Helper text : "Email sera envoyé à {guestEmail}"
- Default : checked

**Créer un crédit/voucher** (checkbox)
- Label : "Créer un crédit pour une prochaine réservation"
- Si checked → afficher :
  - Montant crédit (number)
  - Default : montant remboursé
  - Validité (date picker, default : +1 an)

**Section 4 : Confirmation**

**Afficher warning** :
```
⚠️ ATTENTION
Cette action est irréversible. La réservation sera définitivement annulée.
- Le calendrier sera libéré
- Les paiements seront traités selon le remboursement choisi
- Le client sera notifié si l'option est cochée
```

**Validation** :
- Raison required
- Détails required (min 10 caractères)
- Type remboursement required
- Si partial : montant required et valide
- Si crédit : montant required

**Actions** :
- Bouton "Annuler" (retour sans annuler réservation)
- Bouton "Confirmer l'annulation" (red, danger)
  - Double confirmation (dialog) avant vraie annulation
  - "Êtes-vous sûr de vouloir annuler cette réservation ?"
  - Loading state pendant `onConfirm`

**Design Aurora Soft Light** :
- Warning icon et couleur rouge pour danger
- Sections bien séparées (Divider)
- Preview montants (paid, refund, crédit) en temps réel

**MOCK behavior** :
- `onConfirm` appelé avec données
- Simuler save
- Toast success "Réservation annulée" + fermeture
- Si notifyGuest : toast "Email envoyé au client"

### Fichier de sortie

`src/components/modals/CancelReservationModal.tsx`

---

## 🎨 MODAL #5 : ImageGalleryModal

### Priorité : P1 - BLOQUANT

### Agent demandeur : Agent 3 - Catalogue

### Contexte d'utilisation

Modal galerie d'images pour un listing avec carousel, thumbnails, et gestion (upload, delete, réorganiser, définir principale).

### Référence ancien dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/components/media/ImageGalleryModal.jsx`

### Spécifications détaillées

**Déclencheur** :
- Clic sur photo listing dans ListingsCataloguePage
- Onglet "Photos" dans NewListingFormPage

**Props TypeScript** :
```typescript
interface ImageGalleryModalProps {
  open: boolean;
  onClose: () => void;
  listingId: string;
  images: Image[];
  onUpdate: (images: Image[]) => Promise<void>;
}

interface Image {
  id: string;
  url: string;
  title?: string;
  isPrimary: boolean;
  order: number;
}
```

**Layout** :
- Taille : `maxWidth: false` (fullscreen style, mais dialog)
- Header : Titre "Galerie Photos" + nom listing + bouton fermer
- Body : 2 colonnes
  - Gauche (70%) : Carousel image principale
  - Droite (30%) : Thumbnails scrollable + actions
- Footer : Bouton "Upload nouvelles photos" + Enregistrer

**Colonne gauche : Carousel**

**Image principale** (grande taille)
- Affichage : Image actuelle (selected thumbnail)
- Navigation :
  - Flèches prev/next (overlay sur image)
  - Keyboard : ← → pour naviguer
  - Swipe touch sur mobile
- Zoom :
  - Bouton zoom in/out
  - Ou pinch sur mobile
  - Ou clic sur image → modal fullscreen zoom
- Info overlay (bottom) :
  - Titre image (editable inline)
  - Badge "Photo principale" si isPrimary
  - Compteur "3 / 12"

**Colonne droite : Thumbnails + Actions**

**Thumbnails grid** (scrollable)
- Grid 2 colonnes
- Thumbnail clickable → devient image principale
- Thumbnail selected → border gold (#e6b022)
- Drag & drop pour réorganiser ordre
- Overlay actions sur hover :
  - Icon "Star" → Définir comme principale
  - Icon "Delete" → Supprimer

**Actions rapides** (boutons en haut colonne droite)
- "Définir comme principale" (si pas déjà)
- "Télécharger" (download image actuelle)
- "Supprimer" (delete image actuelle avec confirmation)

**Upload nouvelles photos** (footer)
- Bouton "Upload" → file input (multiple)
- Accepter : .jpg, .jpeg, .png, .webp
- Max size : 5MB par image
- Max total : 20 images
- Après upload → ajouter à thumbnails
- Auto set first uploaded comme principale si pas de principale

**Validation** :
- Au moins 1 image required
- Au moins 1 image principale required
- Order unique pour chaque image

**Actions** :
- Bouton "Fermer" (sans save si pas modifs)
- Bouton "Enregistrer" (primary, si modifs)
  - Appelle `onUpdate` avec images array
  - Loading state
  - Toast success

**Design Aurora Soft Light** :
- Thumbnails border gold si selected
- Badge principale gold
- Icons Material-UI
- Smooth transitions

**MOCK behavior** :
- Images stockées dans localStorage
- Upload simulé (file → base64 → localStorage)
- Delete, reorder → update localStorage
- `onUpdate` appelé

### Fichier de sortie

`src/components/modals/ImageGalleryModal.tsx`

### Dépendances

```bash
# Peut-être besoin d'installer
npm install react-image-gallery
# OU utiliser Material-UI ImageList + Dialog seulement
```

---

## 🎨 MODAL #6 : PdfViewerModal

### Priorité : P1 - IMPORTANT

### Agent demandeur : Agent 3 - Catalogue

### Contexte d'utilisation

Modal pour afficher un PDF (contrats, factures, documents) avec viewer, navigation, zoom, download.

### Spécifications détaillées

**Déclencheur** :
- Clic sur document PDF dans liste documents
- Clic sur facture dans finances

**Props TypeScript** :
```typescript
interface PdfViewerModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  pdfName: string;
  allowDownload?: boolean;
  allowPrint?: boolean;
}
```

**Layout** :
- Taille : `maxWidth: 'lg'` (large, ou fullscreen)
- Header : Nom document + actions (download, print, fermer)
- Body : PDF viewer
- Footer : Navigation pages (si multi-pages)

**PDF Viewer**

**Options d'implémentation** :

Option A (recommandée) : `react-pdf`
```bash
npm install react-pdf pdfjs-dist
```

Option B : Simple iframe
```tsx
<iframe src={pdfUrl} style={{ width: '100%', height: '600px' }} />
```

**Features** :
- Affichage PDF page par page
- Navigation pages (prev/next si multi-pages)
- Zoom in/out
- Fit to width / Fit to page
- Page counter "Page 2 / 5"

**Actions (header)** :
- Bouton "Télécharger" (si allowDownload)
  - Download PDF
  - Nom fichier : pdfName
- Bouton "Imprimer" (si allowPrint)
  - window.print() sur PDF
- Bouton "Fermer"

**Navigation (footer, si multi-pages)** :
- Bouton "← Page précédente"
- Input page number (direct jump)
- Text "Page X / Y"
- Bouton "Page suivante →"

**Keyboard shortcuts** :
- ← → : Navigation pages
- + - : Zoom
- ESC : Fermer

**Design Aurora Soft Light** :
- Toolbar actions en haut
- PDF viewer centré
- Loading skeleton pendant chargement

**MOCK behavior** :
- `pdfUrl` peut être :
  - URL externe (https://...)
  - Base64 data URL
  - Blob URL
- Gestion erreur si PDF invalide

### Fichier de sortie

`src/components/modals/PdfViewerModal.tsx`

### Dépendances

```bash
npm install react-pdf pdfjs-dist
```

---

## 🎨 MODAL #7 : MessageComposeModal

### Priorité : P1 - BLOQUANT

### Agent demandeur : Agent 5 - Communications

### Contexte d'utilisation

Modal universel pour composer un message WhatsApp, OTA, ou Email avec templates, variables dynamiques, pièces jointes, et programmation.

### Référence ancien dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/features/communications/modals/ComposeMessageModal.jsx`

### Spécifications détaillées

**Déclencheur** :
- Bouton "Nouveau message" dans CommsPage
- Bouton "Répondre" sur conversation
- Action "Envoyer message" depuis réservation

**Props TypeScript** :
```typescript
interface MessageComposeModalProps {
  open: boolean;
  onClose: () => void;
  defaultRecipient?: Contact;
  defaultChannel?: 'whatsapp' | 'ota' | 'email';
  replyTo?: Message;
  onSend: (message: MessageData) => Promise<void>;
}

interface MessageData {
  recipients: string[];  // IDs ou emails
  channel: 'whatsapp' | 'ota' | 'email';
  subject?: string;      // Si email
  body: string;
  templateId?: string;
  attachments?: File[];
  scheduledAt?: string;  // Si programmé
}
```

**Layout** :
- Taille : `maxWidth: 'md'` (medium)
- Header : "Nouveau message" ou "Répondre à {name}"
- Body : Form
- Footer : Actions (Brouillon, Programmer, Envoyer)

**Champs** :

**Canal** (tabs ou select, required)
- WhatsApp
- OTA Message (Airbnb, Booking.com, etc.)
- Email

**Destinataire(s)** (autocomplete multi, required)
- Si defaultRecipient → pré-rempli
- Search : Guests, Staff, custom email/phone
- Multi-select (plusieurs destinataires)
- Chips affichés

**Sujet** (textfield, si canal = email)
- Required si email
- Hidden si WhatsApp/OTA

**Template** (select, optional)
- Liste templates pré-définis selon canal
- Categories : Bienvenue, Rappel, Confirmation, Check-in, Check-out, etc.
- Si selected → pré-remplit body avec template

**Corps du message** (textarea rich text)
- Label : "Message"
- Rows : 10
- Rich text editor (bold, italic, links, etc.) si email
- Plain text si WhatsApp/OTA
- Variables dynamiques disponibles :
  - {guestName}, {listingName}, {checkIn}, {checkOut}, {code}, etc.
  - Bouton "Insérer variable" → menu select variable → insert à cursor position
- Compteur caractères si WhatsApp/SMS
- Preview variables remplacées (live preview panel)

**Pièces jointes** (file upload, si email ou WhatsApp)
- Drag & drop zone
- Max 3 files
- Max 5MB par file
- Types acceptés : images, PDF, documents
- Liste files avec preview + bouton remove

**Programmer l'envoi** (checkbox + datetime picker)
- Label : "Programmer l'envoi"
- Si checked → afficher datetime picker
- Default : maintenant
- Min : maintenant
- Helper text : "Le message sera envoyé automatiquement à la date choisie"

**Preview panel** (collapsible, à droite ou en bas)
- Affiche le message final avec variables remplacées
- Format selon canal (WhatsApp style, Email style, etc.)

**Validation** :
- Destinataires required (min 1)
- Canal required
- Sujet required si email
- Corps message required (min 10 caractères)
- Si programmé : date future required

**Actions** :
- Bouton "Fermer" / "Annuler"
- Bouton "Enregistrer brouillon" (outlined)
  - Save dans localStorage
  - Toast "Brouillon enregistré"
- Bouton "Programmer" (si date sélectionnée, outlined)
  - Appelle `onSend` avec scheduledAt
  - Toast "Message programmé pour le {date}"
- Bouton "Envoyer maintenant" (primary)
  - Appelle `onSend`
  - Loading state
  - Toast "Message envoyé"
  - Fermeture modal

**Design Aurora Soft Light** :
- Tabs ou select pour canal
- Rich text editor simple
- Variables en chips gold
- Preview panel avec style canal

**MOCK behavior** :
- Templates stockés en dur ou localStorage
- `onSend` simulé
- Attachments → base64 localStorage
- Scheduled messages → localStorage avec timestamp

**Composant Claude Design disponible** :
✅ `BroadcastModal` existe déjà (pour multi-destinataires)

Tu peux t'en inspirer mais MessageComposeModal est plus complet (templates, variables, programmation, attachments).

### Fichier de sortie

`src/components/modals/MessageComposeModal.tsx`

### Dépendances

```bash
# Rich text editor (optionnel)
npm install react-quill
# OU
npm install @mui/x-editor (si existe)
# OU utiliser TextField multiline seulement
```

---

## 🎨 MODAL #8 : ReviewComposeModal

### Priorité : P1 - IMPORTANT

### Agent demandeur : Agent 5 - Communications

### Contexte d'utilisation

Modal pour écrire une review (avis) pour un guest après son séjour avec rating global, catégories, commentaire public, notes privées.

### Référence ancien dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/features/reviews/modals/WriteReviewModal.jsx`

### Spécifications détaillées

**Déclencheur** :
- Bouton "Écrire un avis" dans ReviewsPage
- Action "Laisser avis" depuis réservation terminée

**Props TypeScript** :
```typescript
interface ReviewComposeModalProps {
  open: boolean;
  onClose: () => void;
  reservation?: {
    id: string;
    code: string;
    guestName: string;
    checkOut: string;
  };
  onSubmit: (review: ReviewData) => Promise<void>;
}

interface ReviewData {
  reservationId: string;
  overallRating: number;  // 1-5
  categoryRatings: {
    communication: number;
    cleanliness: number;
    respectRules: number;
    recommendation: number;
  };
  publicComment: string;
  privateNotes?: string;
  wouldRecommend: boolean;
}
```

**Layout** :
- Taille : `maxWidth: 'md'` (medium)
- Header : "Écrire un avis pour {guestName}"
- Body : Form en sections
- Footer : Brouillon + Publier

**Section 1 : Réservation**

**Info réservation** (read-only, si passée en props)
- Code réservation
- Nom guest
- Date séjour
- Si pas de réservation passée → Select réservation (completed seulement)

**Section 2 : Évaluation globale**

**Rating global** (stars, 1-5, required)
- Label : "Évaluation globale"
- 5 étoiles cliquables (Material-UI Rating)
- Large size
- Hover text : "Très mauvais", "Mauvais", "Moyen", "Bon", "Excellent"

**Section 3 : Évaluations par catégorie**

**4 catégories** (chacune stars 1-5, required)

1. Communication
   - Label : "Communication"
   - Description : "Le voyageur a-t-il communiqué clairement ?"

2. Propreté
   - Label : "Propreté"
   - Description : "Le logement a-t-il été laissé propre ?"

3. Respect des règles
   - Label : "Respect des règles"
   - Description : "Le voyageur a-t-il respecté les règles du logement ?"

4. Recommandation
   - Label : "Recommanderiez-vous ce voyageur ?"
   - Description : "L'accueilleriez-vous à nouveau ?"

**Section 4 : Commentaire**

**Commentaire public** (textarea, required)
- Label : "Commentaire public"
- Description : "Ce commentaire sera visible par le voyageur et d'autres hôtes"
- Placeholder : "Décrivez votre expérience avec ce voyageur..."
- Rows : 5
- Min length : 50 caractères
- Max length : 500 caractères
- Compteur caractères

**Templates** (select, optional)
- Liste templates pré-remplis selon rating global
- Exemples :
  - Si 5 étoiles : "Excellent voyageur, très respectueux, communication fluide..."
  - Si 3 étoiles : "Séjour correct, quelques points d'amélioration..."
  - Si 1-2 étoiles : "Malheureusement nous avons rencontré quelques problèmes..."
- Si selected → pré-remplit textarea (modifiable)

**Section 5 : Notes privées**

**Notes privées** (textarea, optional)
- Label : "Notes privées (visibles uniquement par vous)"
- Description : "Ces notes ne seront PAS partagées avec le voyageur"
- Placeholder : "Notes internes, incidents, points à retenir..."
- Rows : 3
- Max length : 300 caractères

**Section 6 : Recommandation finale**

**Recommander ce voyageur** (switch/checkbox, required)
- Label : "Je recommande ce voyageur à d'autres hôtes"
- Helper text : "Cette information sera visible sur le profil du voyageur"
- Default : true si overall rating >= 4, false sinon

**Preview panel** (collapsible)
- Affiche preview de la review comme elle apparaîtra
- Étoiles globales
- Commentaire public
- Badge "Recommandé" si oui

**Validation** :
- Réservation required
- Rating global required
- 4 category ratings required
- Commentaire public required (min 50 char)
- Recommandation required (oui/non)

**Actions** :
- Bouton "Annuler"
- Bouton "Enregistrer brouillon" (outlined)
  - Save localStorage
  - Toast "Brouillon enregistré"
- Bouton "Publier l'avis" (primary)
  - Appelle `onSubmit`
  - Loading state
  - Confirmation dialog avant submit :
    - "Vous êtes sur le point de publier cet avis. Une fois publié, il ne pourra plus être modifié. Continuer ?"
  - Toast "Avis publié"
  - Fermeture modal

**Design Aurora Soft Light** :
- Stars gold (#e6b022) quand sélectionnées
- Sections bien séparées (Divider)
- Preview panel avec card style
- Badge "Recommandé" gold

**MOCK behavior** :
- `onSubmit` simulé
- Save brouillon localStorage
- Templates pré-définis

### Fichier de sortie

`src/components/modals/ReviewComposeModal.tsx`

### Dépendances

```bash
# Déjà installé
@mui/material (Rating component)
```

---

## ✅ RÉSUMÉ DEMANDES

| # | Modal | Agent | Priorité | Complexité | Temps estimé |
|---|-------|-------|----------|------------|--------------|
| 1 | AdminActionModal | Agent 1 | P1 | Haute | 4-6h |
| 2 | ReservationDetailsModal | Agent 1 | P1 | Haute | 3-4h |
| 3 | CheckInOutStatusModal | Agent 2 | P1 | Moyenne | 3-4h |
| 4 | CancelReservationModal | Agent 2 | P1 | Moyenne | 3-4h |
| 5 | ImageGalleryModal | Agent 3 | P1 | Haute | 3-4h |
| 6 | PdfViewerModal | Agent 3 | P1 | Faible | 2-3h |
| 7 | MessageComposeModal | Agent 5 | P1 | Haute | 4-6h |
| 8 | ReviewComposeModal | Agent 5 | P1 | Moyenne | 3-4h |
| **TOTAL** | **8 modals** | **5 agents** | **P1** | - | **25-35h** |

---

## 🎨 POUR CLAUDE DESIGN

**Si tu peux créer ces 8 modals** :

1. Lire attentivement chaque spécification
2. Respecter le design Aurora Soft Light (#e6b022 gold, #8b5cf6 purple)
3. Utiliser Material-UI v9 (sx props seulement, pas de Stack props invalides)
4. TypeScript strict
5. MOCK behavior (localStorage)
6. Responsive mobile + desktop
7. Créer les fichiers dans `src/components/modals/`
8. Livrer via fichiers .tsx complets

**Si certains modals sont trop complexes ou hors scope** :

Dis-moi lesquels et les agents les créeront eux-mêmes en s'inspirant de l'ancien dashboard.

**Ordre de priorité si temps limité** :

1. AdminActionModal (Agent 1, bloquant orchestration)
2. MessageComposeModal (Agent 5, bloquant communications)
3. CheckInOutStatusModal (Agent 2, critique réservations)
4. CancelReservationModal (Agent 2, critique réservations)
5. ImageGalleryModal (Agent 3, important UX)
6. ReservationDetailsModal (Agent 1, important)
7. ReviewComposeModal (Agent 5, important)
8. PdfViewerModal (Agent 3, nice to have)

---

## 📞 CONTACT

Si questions sur les specs, consulte :
- `docs/AUDIT_MODALS_ANCIEN_DASHBOARD.md` (détails tous modals ancien)
- `docs/MODALS_MANQUANTS.md` (contexte global)
- Ancien dashboard : `/Users/gouacht/sojori-dashboard/src/`

---

**Merci Claude Design ! 🎨**
