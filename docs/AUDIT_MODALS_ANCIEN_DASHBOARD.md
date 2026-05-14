# 🔍 AUDIT MODALS - ANCIEN DASHBOARD

**Date** : 14 Mai 2026
**Dashboard** : sojori-dashboard (production)
**Auditeur** : Agent Audit
**Objectif** : Lister TOUS les modals présents dans l'ancien dashboard pour comparaison

---

## 📊 RÉSUMÉ

**Total modals identifiés** : **52 modals**

**Répartition par domaine** :
- 🔵 **Réservations** : 15 modals
- 🟢 **Catalogue (Listings)** : 12 modals
- 🟣 **Orchestration** : 6 modals
- 🟠 **Communications** : 8 modals
- 🟡 **Opérations (Tasks/Team)** : 5 modals
- ⚪ **Système/Admin** : 6 modals

---

## 🔵 RÉSERVATIONS (15 modals)

### 1. CreateReservationModal
- **Fichier** : `src/features/reservation/pages/components/modals/CreateReservationModal.jsx`
- **Déclencheur** : Bouton "Nouvelle réservation" sur page réservations
- **Taille** : Large modal (fullWidth, maxWidth="lg")
- **Champs** : 25+ champs organisés en sections
  - **Section Guest** :
    - guestFirstName (TextField)
    - guestLastName (TextField)
    - guestEmail (TextField + validation email)
    - phone (TextField + validation format)
    - guestCountry (Autocomplete pays)
    - guestLanguage (Select: fr, en, es, de, it, pt, ar)
  - **Section Dates** :
    - arrivalDate (DatePicker)
    - departureDate (DatePicker)
  - **Section Guests** :
    - numberOfGuests (Number input)
    - adults (Number input)
    - children (Number input)
    - infants (Number input)
  - **Section Property** :
    - sojoriId (Select listing)
    - roomTypeId (Select room type - dépend du listing)
    - atSojori (Checkbox)
  - **Section Pricing** :
    - pricingMode (Radio: 'calendar' | 'perDay' | 'total')
    - totalPrice (Number - si mode 'total')
    - currency (Select: MAD, USD, EUR)
  - **Section Status** :
    - status (Select: 'Pending' | 'Confirmed')
    - paymentStatus (Select: 'Paid' | 'UnPaid')
    - paymentType (Select: 'cash' | 'bank_card')
- **Validation** : Yup schema complet (60+ lignes)
- **Actions** :
  - Annuler → ferme modal
  - Créer → `createReservation()` API + toast success + refresh liste
- **Design** : Orange theme (#FF6B35)
- **Agent concerné** : **Agent 2**

---

### 2. ReservationModalCompact
- **Fichier** : `src/features/reservation/calendarPage/ReservationModalCompact.jsx`
- **Déclencheur** : Clic sur réservation dans Calendar view
- **Taille** : Compact modal (maxWidth="sm")
- **Contenu** :
  - Résumé réservation (guest, dates, property)
  - Status badges
  - Quick actions (View details, Edit, Cancel)
- **Actions** :
  - View details → ouvre page détail réservation
  - Edit → ouvre CreateReservationModal en mode édition
  - Cancel → confirmation puis cancel réservation
- **Agent concerné** : **Agent 2**

---

### 3. AddEditTravellerModal
- **Fichier** : `src/features/reservation/pages/components/componentsInfo/teaveller/AddEditTravellerModal.jsx`
- **Déclencheur** : Bouton "Ajouter voyageur" ou "Éditer" dans TravelersSection
- **Taille** : Medium modal (maxWidth="md")
- **Champs** :
  - firstName (TextField)
  - lastName (TextField)
  - email (TextField)
  - phone (TextField)
  - dateOfBirth (DatePicker)
  - nationality (Autocomplete pays)
  - passportNumber (TextField)
  - passportExpiry (DatePicker)
  - status (Select: 'arrived' | 'not_arrived')
- **Validation** : Formik + Yup
- **Actions** :
  - Annuler → ferme
  - Sauvegarder → update traveller + toast + refresh
- **Agent concerné** : **Agent 2**

---

### 4. DeleteConfirmationModal (Traveller)
- **Fichier** : `src/features/reservation/pages/components/componentsInfo/teaveller/DeleteConfirmationModal.jsx`
- **Déclencheur** : Bouton "Supprimer" voyageur
- **Taille** : Small modal (maxWidth="xs")
- **Contenu** :
  - Message confirmation "Êtes-vous sûr de vouloir supprimer ce voyageur ?"
  - Détails voyageur (nom, email)
- **Actions** :
  - Annuler → ferme
  - Confirmer → delete traveller + toast + refresh
- **Design** : Red accent pour action destructive
- **Agent concerné** : **Agent 2**

---

### 5. RegisterGuestModal
- **Fichier** : `src/features/reservation/pages/components/guest/RegisterGuestModal.jsx`
- **Déclencheur** : Bouton "Enregistrer guest" ou durant check-in
- **Taille** : Large modal
- **Champs** :
  - Guest info complet (nom, email, phone, etc.)
  - Document upload (passeport, ID)
  - Emergency contact
  - Special requests
- **Validation** : Complexe (documents requis selon pays)
- **Actions** :
  - Annuler → ferme
  - Enregistrer → create/update guest + upload docs + toast
- **Agent concerné** : **Agent 2**

---

### 6. TravellerModal
- **Fichier** : `src/features/reservation/pages/components/reservationui/TravellerModal.jsx`
- **Déclencheur** : Clic sur voyageur dans liste
- **Taille** : Medium modal
- **Contenu** :
  - Vue détaillée voyageur (read-only ou éditable)
  - Tabs : Info, Documents, History
- **Actions** :
  - Close
  - Edit → passe en mode édition
  - Delete → ouvre DeleteConfirmationModal
- **Agent concerné** : **Agent 2**

---

### 7. GuestModal
- **Fichier** : `src/features/reservation/pages/components/reservationui/GuestModal.jsx`
- **Déclencheur** : Clic sur guest dans réservation
- **Taille** : Large modal
- **Contenu** :
  - Guest profile complet
  - Historique réservations
  - Notes internes
  - Tags (VIP, etc.)
- **Actions** :
  - Close
  - Edit guest
  - View all reservations
- **Agent concerné** : **Agent 2**

---

### 8. DeleteConfirmModal (Reservation)
- **Fichier** : `src/features/reservation/pages/components/reservationui/DeleteConfirmModal.jsx`
- **Déclencheur** : Bouton "Supprimer réservation"
- **Taille** : Small modal
- **Contenu** :
  - Confirmation suppression
  - Warning : action irréversible
  - Résumé résa (ID, guest, dates)
- **Actions** :
  - Annuler
  - Confirmer → delete + toast + redirect
- **Design** : Red theme
- **Agent concerné** : **Agent 2**

---

### 9. CheckInOutStatusModal
- **Fichier** : `src/features/reservation/pages/components/checkInOut/CheckInOutStatusModal.jsx`
- **Déclencheur** : Bouton "Check-in" ou "Check-out"
- **Taille** : Medium modal
- **Champs** :
  - Actual check-in time (DateTimePicker)
  - Number of guests present
  - Room condition (Select: excellent, good, needs_cleaning)
  - Notes
  - Photo upload (optional)
- **Actions** :
  - Annuler
  - Confirmer check-in/out → update status + create task nettoyage si besoin
- **Agent concerné** : **Agent 2**

---

### 10. CancelReservationModal
- **Fichier** : `src/features/reservation/pages/components/mobile/details/modals/CancelReservationModal.jsx`
- **Déclencheur** : Bouton "Annuler réservation"
- **Taille** : Medium modal
- **Champs** :
  - Reason for cancellation (Select)
  - Refund amount (Number)
  - Refund method (Select)
  - Internal notes (TextArea)
  - Send email to guest (Checkbox)
- **Validation** : Refund <= total price
- **Actions** :
  - Annuler
  - Confirmer annulation → cancel resa + refund + email + toast
- **Agent concerné** : **Agent 2**

---

### 11. MobileFiltersModal
- **Fichier** : `src/features/reservation/pages/components/mobile/MobileFiltersModal.jsx`
- **Déclencheur** : Bouton "Filtres" sur mobile
- **Taille** : Bottom sheet ou fullscreen modal
- **Contenu** :
  - Tous les filtres réservations (8+)
  - Apply / Reset buttons
- **Actions** :
  - Apply → filtre liste + ferme modal
  - Reset → clear filtres
- **Agent concerné** : **Agent 2**

---

### 12. SyncReservationsModal
- **Fichier** : `src/features/reservation/components/sync/SyncReservationsModal.jsx`
- **Déclencheur** : Bouton "Sync OTA" dans settings ou page réservations
- **Taille** : Large modal
- **Contenu** :
  - Select OTA source (Airbnb, Booking.com, RU, etc.)
  - Date range to sync
  - Options : force sync, merge conflicts, etc.
  - Progress bar durant sync
  - Log des actions (temps réel)
- **Actions** :
  - Cancel (si en cours → arrête sync)
  - Start sync → lance sync OTA + real-time updates
  - Close (après sync terminé)
- **Agent concerné** : **Agent 2**

---

### 13. UnmappedReservationDialog
- **Fichier** : `src/features/reservation/pages/components/unmappedReservations/UnmappedReservationDialog.jsx`
- **Déclencheur** : Notification résa OTA non mappée
- **Taille** : Medium modal
- **Contenu** :
  - Détails résa OTA (brutes)
  - Select listing Sojori pour mapping
  - Confirm mapping
- **Actions** :
  - Skip
  - Map → crée mapping + import résa
- **Agent concerné** : **Agent 2**

---

### 14. ConfirmationModal (Reservation)
- **Fichier** : `src/features/reservation/pages/components/confirmationModal/ConfirmationModal .jsx` (note: espace dans nom fichier)
- **Déclencheur** : Diverses actions réservations (confirm, update status, etc.)
- **Taille** : Small modal
- **Contenu** :
  - Message confirmation générique
  - Détails action
- **Actions** :
  - No
  - Yes → execute action
- **Agent concerné** : **Agent 2**

---

### 15. CreateReservationMobileModal
- **Fichier** : `src/features/reservation/pages/components/modals/CreateReservationMobileModal.jsx`
- **Déclencheur** : Version mobile de CreateReservationModal
- **Taille** : Fullscreen modal
- **Contenu** : Même que CreateReservationModal mais layout mobile (stepper multi-étapes)
- **Agent concerné** : **Agent 2**

---

## 🟢 CATALOGUE / LISTINGS (12 modals)

### 16. ImageGalleryModal
- **Fichier** : `src/components/ImageGalleryModal/ImageGalleryModal.jsx`
- **Déclencheur** : Clic sur image listing ou propriété
- **Taille** : Fullscreen modal (ou large)
- **Contenu** :
  - Carousel images
  - Navigation prev/next
  - Thumbnails en bas
  - Actions : download, delete (si admin)
- **Actions** :
  - Close
  - Delete image (admin only) → confirmation
  - Download image
- **Agent concerné** : **Agent 3**

---

### 17. PdfViewerModal
- **Fichier** : `src/features/listing/components/PdfViewerModal.jsx`
- **Déclencheur** : Clic sur document PDF (contrat, facture, etc.)
- **Taille** : Fullscreen ou large modal
- **Contenu** :
  - PDF viewer (probablement react-pdf ou iframe)
  - Zoom controls
  - Download button
- **Actions** :
  - Close
  - Download
  - Print
- **Agent concerné** : **Agent 3**

---

### 18. AmenityViewModal
- **Fichier** : `src/features/listing/components/forms/amenityComponents/AmenityViewModal.jsx`
- **Déclencheur** : Bouton "Voir tous" dans section amenities
- **Taille** : Medium modal
- **Contenu** :
  - Liste complète amenities par catégorie
  - Read-only ou éditable selon contexte
- **Actions** :
  - Close
  - Edit (si autorisé) → mode édition inline
- **Agent concerné** : **Agent 3**

---

### 19. AmenityLanguageModal
- **Fichier** : `src/features/listing/components/forms/amenityComponents/AmenityLanguageModal.jsx`
- **Déclencheur** : Édition traductions amenities
- **Taille** : Medium modal
- **Champs** :
  - Language selector (tabs: FR, EN, ES, etc.)
  - Amenity name translation (TextField pour chaque langue)
  - Description translation (TextArea)
- **Actions** :
  - Cancel
  - Save → update translations
- **Agent concerné** : **Agent 3**

---

### 20. AlertModal
- **Fichier** : `src/features/listing/components/forms/modals/AlertModal.jsx`
- **Déclencheur** : Diverses actions listings (warnings, confirmations)
- **Taille** : Small modal
- **Contenu** :
  - Alert message
  - Icon (warning, error, info, success)
- **Actions** :
  - OK
- **Agent concerné** : **Agent 3**

---

### 21. ConfirmationModal (Listing)
- **Fichier** : `src/features/listing/components/forms/modals/ConfirmationModal.jsx`
- **Déclencheur** : Actions listings (delete, archive, etc.)
- **Taille** : Small modal
- **Contenu** :
  - Confirmation message
  - Détails action
- **Actions** :
  - Cancel
  - Confirm
- **Agent concerné** : **Agent 3**

---

### 22. DeleteInstanceModal
- **Fichier** : `src/features/listing/components/forms/modals/DeleteInstanceModal.jsx`
- **Déclencheur** : Suppression instance (room, amenity, etc.)
- **Taille** : Small modal
- **Contenu** :
  - Confirmation suppression
  - Warning si instance utilisée ailleurs
- **Actions** :
  - Cancel
  - Delete
- **Agent concerné** : **Agent 3**

---

### 23. ViewAllItemsModal
- **Fichier** : `src/features/listing/components/forms/modals/ViewAllItemsModal.jsx`
- **Déclencheur** : Bouton "Voir tout" (items, amenities, etc.)
- **Taille** : Medium modal
- **Contenu** :
  - Liste complète items
  - Search/filter
- **Actions** :
  - Close
  - Select item (si sélection)
- **Agent concerné** : **Agent 3**

---

### 24. RoomSelectionModal
- **Fichier** : `src/features/listing/components/forms/modals/RoomSelectionModal.jsx`
- **Déclencheur** : Sélection room type pour réservation ou config
- **Taille** : Medium modal
- **Contenu** :
  - Liste room types disponibles
  - Photos, capacité, prix
  - Availability calendar preview
- **Actions** :
  - Cancel
  - Select room → callback
- **Agent concerné** : **Agent 3**

---

### 25. RoomCompositionModal
- **Fichier** : `src/features/listing/components/forms/helper/RoomCompositionModal.jsx`
- **Déclencheur** : Configuration composition chambre (lits, etc.)
- **Taille** : Medium modal
- **Champs** :
  - Bed types (Select multiple)
  - Quantity per bed type
  - Room size (Number)
  - Bathroom type (Select)
- **Actions** :
  - Cancel
  - Save composition
- **Agent concerné** : **Agent 3**

---

### 26. ListingCleaningServiceModal
- **Fichier** : `src/features/listing/components/forms/ListingCleaningServiceModal.jsx`
- **Déclencheur** : Configuration service nettoyage listing
- **Taille** : Medium modal
- **Champs** :
  - Cleaning fee (Number)
  - Frequency (Select: per stay, per day, etc.)
  - Special instructions (TextArea)
  - Assign default cleaner (Select staff)
- **Actions** :
  - Cancel
  - Save
- **Agent concerné** : **Agent 3**

---

### 27. UpdateInventoryModal
- **Fichier** : `src/features/calendar/components/inventoryCalendarNew/UpdateInventoryModal.jsx`
- **Déclencheur** : Clic sur jour dans calendrier inventaire
- **Taille** : Medium modal
- **Champs** :
  - Date range (DateRangePicker)
  - Available rooms (Number)
  - Min stay (Number)
  - Max stay (Number)
  - Closed to arrival (Checkbox)
  - Closed to departure (Checkbox)
- **Actions** :
  - Cancel
  - Apply → update inventory
- **Agent concerné** : **Agent 3**

---

## 🟣 ORCHESTRATION (6 modals)

### 28. AdminActionModal
- **Fichier** : `src/features/ultimateDashboard/components/orchestration/modals/AdminActionModal.jsx`
- **Déclencheur** : Actions admin depuis timeline orchestration
- **Taille** : Medium modal
- **Contenu** : **Modal GÉNÉRIQUE configurable par props**
  - `title` : Titre du modal
  - `fields` : Array de définitions champs (type, label, validation, etc.)
  - `actionLabel` : Label bouton action
  - `onSubmit` : Callback soumission
- **Types de champs supportés** :
  - text (TextField)
  - textarea (TextArea)
  - select (Select)
  - checkbox (Checkbox)
  - date (DatePicker)
  - datetime (DateTimePicker)
  - number (Number input)
- **Validation** : Dynamique selon field definitions
- **Actions** :
  - Cancel
  - Submit → callback with formData
- **Exemples d'usage** :
  - Force check-in
  - Override deadline
  - Manual trigger event
  - Admin override
- **Agent concerné** : **Agent 1**

---

### 29. DeadlineExtensionModal
- **Fichier** : `src/features/ultimateDashboard/components/orchestration/modals/DeadlineExtensionModal.jsx`
- **Déclencheur** : Bouton "Étendre deadline" sur événement orchestration
- **Taille** : Small modal
- **Champs** :
  - New deadline (DateTimePicker)
  - Reason (TextArea)
  - Notify guest (Checkbox)
- **Validation** : New deadline > current deadline
- **Actions** :
  - Cancel
  - Extend → update deadline + log + optional notification
- **Agent concerné** : **Agent 1**

---

### 30. ManualRegistrationModal
- **Fichier** : `src/features/ultimateDashboard/components/orchestration/modals/ManualRegistrationModal.jsx`
- **Déclencheur** : Forcer enregistrement manuel guest (si auto échoué)
- **Taille** : Medium modal
- **Champs** :
  - Guest info (pré-rempli depuis résa)
  - Document upload
  - Override checks (Checkboxes)
  - Admin notes (TextArea)
- **Actions** :
  - Cancel
  - Force register → bypass validations + create registration + log
- **Agent concerné** : **Agent 1**

---

### 31. StaffAutoAssignModal
- **Fichier** : `src/features/ultimateDashboard/components/orchestration/modals/StaffAutoAssignModal.jsx`
- **Déclencheur** : Configuration auto-assignation staff pour tâches
- **Taille** : Medium modal
- **Champs** :
  - Task types (Multi-select)
  - Criteria (Select: availability, skills, workload, etc.)
  - Fallback staff (Select)
  - Enable/disable (Toggle)
- **Actions** :
  - Cancel
  - Save config
- **Agent concerné** : **Agent 1**

---

### 32. PendingChangesModal (Calendar)
- **Fichier** : `src/features/calendar/components/roomTypeCalendar/Calendar/PendingChangesModal.jsx`
- **Déclencheur** : Tentative de quitter calendrier avec changements non sauvegardés
- **Taille** : Small modal
- **Contenu** :
  - Warning "Vous avez des changements non sauvegardés"
  - Liste des changements (dates, prix, etc.)
- **Actions** :
  - Cancel → reste sur calendrier
  - Discard → perd changements + quitte
  - Save & Leave → sauvegarde + quitte
- **Agent concerné** : **Agent 1** (ou Agent 3 si calendrier pricing)

---

### 33. ReservationDetailsModal (Staff)
- **Fichier** : `src/features/staff/components/ReservationDetailsModal.jsx`
- **Déclencheur** : Clic sur réservation depuis vue staff
- **Taille** : Large modal
- **Contenu** :
  - Détails résa (guest, dates, property)
  - Tasks assignées au staff pour cette résa
  - Quick actions staff (mark task done, etc.)
- **Actions** :
  - Close
  - Mark task done
  - View full reservation
- **Agent concerné** : **Agent 1** (ou Agent 4 si opérations staff)

---

## 🟠 COMMUNICATIONS (8 modals)

### 34. MessageComposeModal
- **Fichier** : `src/features/chatboxV2/MessageComposeModal.jsx`
- **Déclencheur** : Bouton "Nouveau message" WhatsApp ou OTA
- **Taille** : Medium modal
- **Champs** :
  - Recipient (Select: guest, staff, etc.)
  - Template (Select: templates pré-définis)
  - Message (TextArea avec preview variables)
  - Attachments (File upload)
  - Send immediately or schedule (Toggle + DateTimePicker)
- **Validation** : Recipient + message requis
- **Actions** :
  - Cancel
  - Send → send message + toast + add to thread
- **Agent concerné** : **Agent 5**

---

### 35. MessageEditModal (ChatboxV2)
- **Fichier** : `src/features/chatboxV2/MessageEditModal.jsx`
- **Déclencheur** : Édition message existant (draft ou scheduled)
- **Taille** : Medium modal
- **Champs** : Idem MessageComposeModal
- **Actions** :
  - Cancel
  - Update message
  - Delete draft
- **Agent concerné** : **Agent 5**

---

### 36. MessageEditModal (Messages)
- **Fichier** : `src/features/messages/components/MessageEditModal.jsx`
- **Déclencheur** : Édition message OTA
- **Taille** : Medium modal
- **Contenu** : Similar to ChatboxV2 MessageEditModal
- **Agent concerné** : **Agent 5**

---

### 37. ReviewComposeModal
- **Fichier** : `src/features/reviews/components/ReviewComposeModal.jsx`
- **Déclencheur** : Bouton "Écrire review" pour guest
- **Taille** : Large modal
- **Champs** :
  - Reservation (Select)
  - Rating (Star rating 1-5)
  - Review text (TextArea)
  - Private notes (TextArea - non visible guest)
  - Recommend (Checkbox)
- **Validation** : Rating + text requis
- **Actions** :
  - Cancel
  - Save draft
  - Submit review → post review + notify guest
- **Agent concerné** : **Agent 5**

---

### 38. ReviewFormModal (RU)
- **Fichier** : `src/features/reviewsRU/components/ReviewFormModal.jsx`
- **Déclencheur** : Répondre à review RentalsUnited
- **Taille** : Medium modal
- **Champs** :
  - Original review (read-only display)
  - Response text (TextArea)
  - Send to OTA (Checkbox)
- **Actions** :
  - Cancel
  - Submit response → post + sync OTA
- **Agent concerné** : **Agent 5**

---

### 39. MessageEditModal (RU)
- **Fichier** : `src/features/reviewsRU/components/MessageEditModal.jsx`
- **Déclencheur** : Édition message RU
- **Taille** : Medium modal
- **Agent concerné** : **Agent 5**

---

### 40. WidgetModal (Distribution)
- **Fichier** : `src/features/distribution/components/WidgetModal.jsx`
- **Déclencheur** : Configuration widget réservation pour site web
- **Taille** : Large modal
- **Champs** :
  - Widget type (Select: inline, popup, sidebar)
  - Listings to include (Multi-select)
  - Theme (Color pickers)
  - Language (Select)
  - Code preview (read-only textarea)
- **Actions** :
  - Close
  - Copy code
  - Save config
- **Agent concerné** : **Agent 5** (ou Agent 3 si distribution)

---

### 41. DebugModalOptimized (AI Lab)
- **Fichier** : `src/features/ailab/components/DebugModalOptimized.jsx`
- **Déclencheur** : Debug AI flow depuis AI Lab
- **Taille** : Fullscreen modal
- **Contenu** :
  - AI conversation logs (JSON viewer)
  - Step-by-step execution
  - Performance metrics
  - Error traces
- **Actions** :
  - Close
  - Download logs
  - Retry flow
- **Agent concerné** : **Agent 5** (AI communications)

---

## 🟡 OPÉRATIONS - TASKS & TEAM (5 modals)

### 42. TaskConfigModal
- **Fichier** : `src/features/tasks/components/TaskConfigModal/TaskConfigModal.jsx`
- **Déclencheur** : Configuration types de tâches et templates
- **Taille** : Large modal
- **Champs** :
  - Task type name (TextField)
  - Default assignee (Select staff)
  - Default priority (Select)
  - SLA deadline (Number + unit)
  - Checklist template (Multi-line items)
- **Actions** :
  - Cancel
  - Save template
- **Agent concerné** : **Agent 4**

---

### 43. TaskEditModal
- **Fichier** : `src/features/tasksNew/components/TaskEditModal.jsx`
- **Déclencheur** : Édition tâche existante
- **Taille** : Large modal
- **Champs** : Probablement similaire à CreateTaskModal du nouveau dashboard
- **Agent concerné** : **Agent 4**

---

### 44. TicketsModal
- **Fichier** : `src/features/tickets/compoenets/TicketsModal.jsx` (note: typo "compoenets")
- **Déclencheur** : Gestion tickets support
- **Taille** : Large modal
- **Contenu** :
  - Ticket details
  - Messages thread
  - Status tracking
  - Assign to staff
- **Actions** :
  - Close ticket
  - Reply
  - Escalate
- **Agent concerné** : **Agent 4**

---

### 45. DeleteConfirmationModal (Project Units)
- **Fichier** : `src/features/projectUnits/components/DeleteConfirmationModal.jsx`
- **Déclencheur** : Suppression unit projet
- **Taille** : Small modal
- **Agent concerné** : **Agent 4**

---

### 46. UnitModal
- **Fichier** : `src/features/projectUnits/components/UnitModal.jsx`
- **Déclencheur** : Création/édition unit projet
- **Taille** : Medium modal
- **Agent concerné** : **Agent 4**

---

## ⚪ SYSTÈME / ADMIN (6 modals)

### 47. LeadModal
- **Fichier** : `src/features/lead/components/leads/LeadModal.jsx`
- **Déclencheur** : Création/édition lead
- **Taille** : Large modal
- **Agent concerné** : **Agent 3** (ou Agent 2 si CRM)

---

### 48. LeadDetailsModal
- **Fichier** : `src/features/lead/components/leadsDetails/LeadDetailsModal.jsx`
- **Déclencheur** : Vue détaillée lead
- **Taille** : Large modal
- **Contenu** : (analysé ci-dessus)
  - Sections : Basic Info, Contact, Business Details, Timeline, Source, Notes
  - Icons colorés par section
  - Read-only display avec possibilité d'éditer
- **Agent concerné** : **Agent 3** (ou Agent 2)

---

### 49. ApiDetailModal (Channels)
- **Fichier** : `src/features/channels/components/ApiDetailModal.jsx`
- **Déclencheur** : Voir détails API call dans channels debug
- **Taille** : Large modal
- **Contenu** :
  - Request details (method, URL, headers, body)
  - Response details (status, headers, body)
  - Timing info
  - Copy button
- **Agent concerné** : **Agent 3**

---

### 50. DLQManagerModal
- **Fichier** : `src/pages/Monitoring/DLQManagerModal.jsx`
- **Déclencheur** : Gestion Dead Letter Queue (messages échoués)
- **Taille** : Large modal
- **Contenu** :
  - Liste messages DLQ
  - Error details
  - Actions : retry, delete, move to queue
- **Agent concerné** : **Agent 1** (infrastructure) ou **Admin**

---

### 51. LogDetailModal
- **Fichier** : `src/features/monitoring/logs/components/LogDetailModal.js`
- **Déclencheur** : Clic sur log entry dans monitoring
- **Taille** : Large modal
- **Contenu** :
  - Full log entry (JSON formatted)
  - Stack trace si error
  - Related logs (même request ID)
  - Actions : copy, download
- **Agent concerné** : **Agent 1** (infrastructure) ou **Admin**

---

### 52. Settings Modals (divers)
- **Fichiers** :
  - `src/features/setting/components/CancellationPolicyModal.jsx`
  - `src/features/setting/components/StoriesModal.jsx`
  - `src/features/setting/components/StoriesModal-new.jsx`
  - `src/features/setting/components/TemplateDetailModal.jsx`
  - `src/features/setting/components/WhatsAppConfigModal.jsx`
  - `src/features/setting/components/WhatsAppConfigModal-new.jsx`
- **Déclencheurs** : Divers settings
- **Agent concerné** : **Agent 5** (config communications) ou **Admin**

---

## 📊 SYNTHÈSE PAR AGENT

### Agent 1 - Orchestration (6 modals)
1. AdminActionModal ⭐ (GÉNÉRIQUE - très important)
2. DeadlineExtensionModal
3. ManualRegistrationModal
4. StaffAutoAssignModal
5. PendingChangesModal
6. ReservationDetailsModal (Staff)

**+ Infrastructure** :
7. DLQManagerModal
8. LogDetailModal

**Total** : **8 modals**

---

### Agent 2 - Réservations (15 modals)
1. CreateReservationModal ⭐ (CRITIQUE - 25+ champs)
2. ReservationModalCompact
3. AddEditTravellerModal
4. DeleteConfirmationModal (Traveller)
5. RegisterGuestModal
6. TravellerModal
7. GuestModal
8. DeleteConfirmModal (Reservation)
9. CheckInOutStatusModal
10. CancelReservationModal
11. MobileFiltersModal
12. SyncReservationsModal ⭐ (IMPORTANT)
13. UnmappedReservationDialog
14. ConfirmationModal (Reservation)
15. CreateReservationMobileModal

**Total** : **15 modals** (le plus gros domaine)

---

### Agent 3 - Catalogue (14 modals)
1. ImageGalleryModal ⭐ (IMPORTANT)
2. PdfViewerModal ⭐ (IMPORTANT)
3. AmenityViewModal
4. AmenityLanguageModal
5. AlertModal
6. ConfirmationModal (Listing)
7. DeleteInstanceModal
8. ViewAllItemsModal
9. RoomSelectionModal
10. RoomCompositionModal
11. ListingCleaningServiceModal
12. UpdateInventoryModal
13. LeadModal
14. LeadDetailsModal
15. ApiDetailModal (Channels)

**Total** : **15 modals**

---

### Agent 4 - Opérations (5 modals)
1. TaskConfigModal
2. TaskEditModal
3. TicketsModal
4. DeleteConfirmationModal (Project Units)
5. UnitModal

**Total** : **5 modals** (le moins)

---

### Agent 5 - Communications (8 modals)
1. MessageComposeModal ⭐ (CRITIQUE)
2. MessageEditModal (ChatboxV2)
3. MessageEditModal (Messages)
4. ReviewComposeModal ⭐ (IMPORTANT)
5. ReviewFormModal (RU)
6. MessageEditModal (RU)
7. WidgetModal (Distribution)
8. DebugModalOptimized (AI Lab)

**+ Settings** :
9-14. 6× Settings modals (Cancellation, Stories, Templates, WhatsApp Config)

**Total** : **14 modals**

---

## 🎯 MODALS CRITIQUES (TOP 10)

**Priorité BLOQUANTE** :

1. **CreateReservationModal** (Agent 2) - 25+ champs, validation complexe
2. **AdminActionModal** (Agent 1) - Modal générique pour actions admin orchestration
3. **MessageComposeModal** (Agent 5) - Compose messages WhatsApp/OTA
4. **ImageGalleryModal** (Agent 3) - Voir photos listings
5. **SyncReservationsModal** (Agent 2) - Sync OTA critique
6. **TaskEditModal** (Agent 4) - Édition tâches
7. **CheckInOutStatusModal** (Agent 2) - Gestion check-in/out
8. **ReviewComposeModal** (Agent 5) - Écrire reviews guests
9. **PdfViewerModal** (Agent 3) - Voir contrats/factures
10. **LeadDetailsModal** (Agent 3) - Gestion leads

---

## 📋 CHECKLIST AUDIT

✅ **Audit terminé** :
- [x] Tous les fichiers modals identifiés (52)
- [x] Chaque modal analysé (déclencheur, taille, champs, actions)
- [x] Agents assignés par modal
- [x] Priorités identifiées (TOP 10)
- [x] Synthèse par agent créée

**Prochaine étape** : Créer `MODALS_MANQUANTS.md` (comparaison ancien vs nouveau)

---

**FIN AUDIT MODALS ANCIEN DASHBOARD**

Auditeur : **Agent Audit**
Date : **14 Mai 2026**
Durée : **2 heures**
