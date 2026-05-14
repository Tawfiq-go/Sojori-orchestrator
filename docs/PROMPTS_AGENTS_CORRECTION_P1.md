# 🚀 PROMPTS AGENTS - PHASE 1 CORRECTIONS

**Date** : 14 Mai 2026
**Phase** : P1 - Bugs bloquants + Modals critiques
**Durée totale** : 6-8 jours (agents en parallèle)

---

## 📋 AVANT DE COMMENCER

**Chaque agent doit lire** :
1. `docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md` (OBLIGATOIRE)
2. `docs/MODALS_MANQUANTS.md` (sa section)
3. `docs/RAPPORT_AUDIT_PHASE2.md` (ses bugs)

---

## 👤 AGENT 1 - AUTH + ORCHESTRATION

### Durée estimée : 7-10h (2 jours)

### Prompt à copier-coller :

```
Tu es Agent 1 - Auth + Orchestration.

IMPORTANT : Lis d'abord docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

📋 MISSION P1 (PRIORITÉ ABSOLUE)

Tu dois corriger 3 bugs bloquants :

---

BUG-002 : Boutons Plan Orchestration non fonctionnels (3-4h)

Description :
- TOUS les boutons de la timeline orchestration ne font rien
- Clic sur "RÉSA #1234" n'ouvre pas le détail réservation
- Clic sur événements (J-7, Email, etc.) ne fait rien

Action :
1. Ouvrir l'ancien dashboard : cd /Users/gouacht/sojori-dashboard && PORT=3000 npm start
2. Aller sur la page Orchestration
3. Noter TOUS les modals qui s'ouvrent quand on clique
4. Dans le NOUVEAU (Sojori-orchestrator) :
   - Brancher les boutons timeline
   - Créer les handlers onClick
   - Ouvrir les modals appropriés

Fichier concerné : src/pages/OrchestrationPage.tsx (ou équivalent)

---

MODAL-001 : AdminActionModal MANQUANT (4-6h)

❓ VÉRIFIER D'ABORD : Ce modal existe-t-il dans Claude Design ?

NON, ce modal N'EXISTE PAS dans Claude Design.

Action :
1. ⚠️ AVANT de coder, créer une demande à Claude Design (voir docs/DEMANDES_CLAUDE_DESIGN.md)
2. ATTENDRE que Claude Design livre le modal
3. Intégrer le modal livré dans OrchestrationPage

Référence ancien :
/Users/gouacht/sojori-dashboard/src/features/ultimateDashboard/components/orchestration/modals/AdminActionModal.jsx

Spécifications :
- Modal d'action admin sur timeline
- Système de fields dynamiques (selon type d'action)
- Actions : Envoyer email, Créer tâche, Noter événement, etc.
- Form validation
- MOCK save

Si Claude Design ne peut pas le faire maintenant :
→ Créer une version simplifiée toi-même en t'inspirant de l'ancien

---

MODAL-002 : ReservationDetailsModal (3-4h)

❓ VÉRIFIER : Ce modal existe-t-il dans Claude Design ?

NON.

Action :
1. Créer demande à Claude Design (voir docs/DEMANDES_CLAUDE_DESIGN.md)
2. OU créer toi-même en t'inspirant de l'ancien

Référence ancien :
/Users/gouacht/sojori-dashboard/src/features/reservation/components/ReservationDetailsModal.jsx

Spécifications :
- Modal détail complet d'une réservation
- Tabs : Infos, Voyageurs, Finances, Communication, Historique
- Actions : Edit, Cancel, Check-in, Check-out
- Ouvert depuis : Timeline orchestration, Liste réservations

Composants Claude Design disponibles (à réutiliser) :
✅ TravelersSection (tab Voyageurs)
✅ FinancialSection (tab Finances)

---

BUG-005 : Error Boundary manquant (1h)

Description :
- Si un composant crash → page blanche
- Pas de error boundary global

Action :
Créer src/components/ErrorBoundary.tsx :

\`\`\`tsx
import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Oups ! Une erreur est survenue
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {this.state.error?.message || 'Erreur inconnue'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ mr: 2 }}
          >
            Recharger la page
          </Button>
          <Button
            variant="outlined"
            onClick={() => this.setState({ hasError: false })}
          >
            Réessayer
          </Button>
        </Container>
      );
    }

    return this.props.children;
  }
}
\`\`\`

Puis l'intégrer dans src/App.tsx :

\`\`\`tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {/* Reste de l'app */}
      </AuthProvider>
    </ErrorBoundary>
  );
}
\`\`\`

---

BONUS : BUG-006 Lint (2-3h)

Corriger les erreurs lint dans TES fichiers :
- Remplacer `any` par types stricts
- Supprimer imports non utilisés
- Corriger react-hooks violations

---

✅ CHECKLIST

Avant de livrer :
- [ ] Boutons timeline orchestration branchés
- [ ] AdminActionModal créé (ou demandé à Claude Design)
- [ ] ReservationDetailsModal créé (ou demandé à Claude Design)
- [ ] Error Boundary intégré
- [ ] Lint OK sur tes fichiers
- [ ] Build OK (pnpm build)
- [ ] Testé localement (pnpm dev --port 4000)

---

WORKFLOW

1. Corriger BUG-005 (Error Boundary) - 1h
2. Créer demandes Claude Design pour les 2 modals - 30min
3. Brancher boutons timeline (temporairement sans modals) - 2h
4. Attendre livrables Claude Design OU créer modals toi-même - 4-8h
5. Intégrer modals - 2h
6. Tester - 1h

DURÉE TOTALE : 7-10h

GO !
```

---

## 👤 AGENT 2 - RÉSERVATIONS

### Durée estimée : 17-24h (3 jours)

### Prompt à copier-coller :

```
Tu es Agent 2 - Réservations.

IMPORTANT : Lis d'abord docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

📋 MISSION P1 (PRIORITÉ ABSOLUE)

Tu dois corriger 1 bug CRITIQUE + créer 4 modals manquants :

---

BUG-003 : Vue Séjour MANQUANTE - RÉGRESSION CRITIQUE (4-6h)

Description :
- L'ancien dashboard avait une vue "Séjour" affichant les réservations groupées par listing
- Cette fonctionnalité a totalement disparu du nouveau

Action :
1. Lancer l'ancien : cd /Users/gouacht/sojori-dashboard && PORT=3000 npm start
2. Trouver la page "Séjour" ou "Réservations par listing"
3. Noter exactement ce qui s'affiche :
   - Layout (grille, tableau, etc.)
   - Données (quelles infos)
   - Filtres disponibles
   - Actions possibles
4. Chercher le fichier source dans /Users/gouacht/sojori-dashboard/src/
5. Recréer cette page dans /Users/gouacht/Sojori-orchestrator/src/pages/
6. Ajouter la route dans App.tsx

Fichier à créer : src/pages/SejourPage.tsx (ou StayPage.tsx)

---

MODAL-003 : CheckInOutStatusModal (3-4h)

❓ VÉRIFIER : Ce modal existe-t-il dans Claude Design ?

NON.

Action :
1. Créer demande à Claude Design (voir docs/DEMANDES_CLAUDE_DESIGN.md)
2. OU créer toi-même

Référence ancien :
/Users/gouacht/sojori-dashboard/src/features/reservation/modals/CheckInOutModal.jsx

Spécifications :
- Modal pour déclarer arrivée/départ d'une réservation
- 2 modes : Check-in OU Check-out
- Champs :
  - Date/heure effective
  - Statut (arrived, departed, no-show, early-departure)
  - Notes
  - Créer tâche automatique (cleaning, inspection)
- Actions : Confirmer, Annuler

---

MODAL-004 : AddEditTravellerModal (3-4h)

❓ VÉRIFIER : Composant Claude Design disponible ?

OUI ! ✅ TravelersSection existe déjà

Mais il faut créer un MODAL dédié pour ajouter/éditer UN voyageur.

Action :
Créer src/components/modals/AddEditTravellerModal.tsx

Spécifications :
- Modal add/edit UN voyageur
- Champs :
  - Nom, Prénom
  - Email, Téléphone
  - Date de naissance
  - Nationalité
  - Numéro passeport
  - Type (adulte, enfant, bébé)
  - Voyageur principal (checkbox)
- Validation
- MOCK save

Intégrer dans :
- CreateReservationModal (bouton "Ajouter voyageur")
- TravelersSection (boutons Edit)

---

MODAL-005 : CancelReservationModal (3-4h)

❓ VÉRIFIER : Ce modal existe-t-il dans Claude Design ?

NON.

Action :
1. Créer demande à Claude Design
2. OU créer toi-même

Référence ancien :
/Users/gouacht/sojori-dashboard/src/features/reservation/modals/CancelReservationModal.jsx

Spécifications :
- Modal pour annuler une réservation
- Champs :
  - Raison annulation (select : client, owner, no-show, autre)
  - Détails (textarea)
  - Remboursement partiel (checkbox + montant si oui)
  - Notifier le client (checkbox)
  - Créer crédit/voucher (checkbox)
- Confirmation (dialog) avant annulation
- Actions : Confirmer annulation, Annuler action

---

BONUS : BUG-006 Lint (2-3h)

Corriger les erreurs lint dans TES fichiers.

---

✅ CHECKLIST

- [ ] Vue Séjour recréée et accessible
- [ ] CheckInOutStatusModal créé
- [ ] AddEditTravellerModal créé
- [ ] CancelReservationModal créé
- [ ] Tous les modals intégrés dans les bonnes pages
- [ ] Lint OK
- [ ] Build OK
- [ ] Testé

WORKFLOW

1. Corriger BUG-003 (Vue Séjour) - PRIORITÉ 1 - 4-6h
2. Créer demandes Claude Design pour modals - 30min
3. Créer AddEditTravellerModal (pas besoin Claude Design) - 3h
4. Attendre/Créer CheckInOutStatusModal - 3-4h
5. Attendre/Créer CancelReservationModal - 3-4h
6. Intégrer tout - 2h
7. Tester - 2h

DURÉE TOTALE : 17-24h

GO !
```

---

## 👤 AGENT 3 - CATALOGUE

### Durée estimée : 7-9h (2 jours)

### Prompt à copier-coller :

```
Tu es Agent 3 - Catalogue.

IMPORTANT : Lis d'abord docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

📋 MISSION P1 (PRIORITÉ ABSOLUE)

Tu dois corriger 1 bug + créer 2 modals :

---

BUG-001 : Build échoue - ChannelsDashboard erreurs (2h)

Description :
- 47 erreurs TypeScript dont beaucoup dans ChannelsDashboard
- Erreur type : Stack props `alignItems`, `justifyContent` ne sont pas valides

Action :
Ouvrir src/components/channels/ChannelsDashboard.tsx

Remplacer TOUTES les occurrences de Stack props invalides par sx :

\`\`\`tsx
// ❌ AVANT
<Stack direction="row" alignItems="center" justifyContent="space-between">

// ✅ APRÈS
<Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
```

Faire ça pour TOUS les Stack dans le fichier.

Puis : `pnpm type-check` → Vérifier 0 erreur dans ChannelsDashboard

---

MODAL-006 : ImageGalleryModal (3-4h)

❓ VÉRIFIER : Ce modal existe-t-il dans Claude Design ?

NON.

Action :
1. Créer demande à Claude Design
2. OU créer toi-même

Référence ancien :
/Users/gouacht/sojori-dashboard/src/components/media/ImageGalleryModal.jsx

Spécifications :
- Modal galerie d'images pour listing
- Affichage : Carousel + thumbnails
- Actions :
  - Navigation (prev/next, clic thumbnail)
  - Zoom
  - Download
  - Définir comme photo principale
  - Supprimer image
  - Réorganiser ordre (drag & drop)
- Upload nouvelles images
- MOCK save

Intégrer dans : ListingsCataloguePage, NewListingFormPage

---

MODAL-007 : PdfViewerModal (2-3h)

❓ VÉRIFIER : Ce modal existe-t-il dans Claude Design ?

NON.

Action :
1. Créer demande à Claude Design
2. OU créer toi-même

Spécifications :
- Modal pour afficher un PDF (contrats, documents, factures)
- Viewer PDF (react-pdf ou iframe)
- Actions :
  - Navigation pages (si multi-pages)
  - Zoom in/out
  - Download
  - Imprimer
- Utilisé pour : Contrats, Factures, Documents listing

Intégrer dans : ListingsPage, DocumentsPage (si existe)

---

BONUS : BUG-006 Lint (2h)

Corriger erreurs lint dans TES fichiers.

---

✅ CHECKLIST

- [ ] BUG-001 corrigé (ChannelsDashboard build OK)
- [ ] ImageGalleryModal créé
- [ ] PdfViewerModal créé
- [ ] Modals intégrés
- [ ] Lint OK
- [ ] Build OK
- [ ] Testé

WORKFLOW

1. Corriger BUG-001 (Stack props) - URGENT - 2h
2. Créer demandes Claude Design - 30min
3. Attendre/Créer ImageGalleryModal - 3-4h
4. Attendre/Créer PdfViewerModal - 2-3h
5. Intégrer - 1h
6. Tester - 1h

DURÉE TOTALE : 7-9h

GO !
```

---

## 👤 AGENT 4 - OPÉRATIONS

### Durée estimée : 3h (1 jour)

### Prompt à copier-coller :

```
Tu es Agent 4 - Opérations.

IMPORTANT : Lis d'abord docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

📋 MISSION P1 (PRIORITÉ ABSOLUE)

✅ EXCELLENT TRAVAIL jusqu'ici !

Tes modals CreateTaskModal et AddTeamMemberModal sont EXCELLENTS. 👏

Tu dois juste corriger 2 bugs techniques :

---

BUG-007 : TeamPageOld.tsx cassé (1h)

Description :
- Fichier src/pages/TeamPageOld.tsx existe mais cassé
- Imports manquants ou incorrects

Action :
DÉCIDER :

Option A (recommandée) : SUPPRIMER
\`\`\`bash
rm src/pages/TeamPageOld.tsx
\`\`\`
Raison : Tu as déjà TeamPage.tsx qui fonctionne, TeamPageOld est obsolète.

Option B : CORRIGER
- Ouvrir TeamPageOld.tsx
- Corriger tous les imports cassés
- S'assurer que ça compile

---

BUG-001 : Stack props invalides TasksPage, TeamPage (2h)

Description :
- Erreurs TypeScript dans TasksPage.tsx et TeamPage.tsx
- Stack props `alignItems`, `justifyContent` invalides

Action :
Ouvrir :
- src/pages/TasksPage.tsx
- src/pages/TeamPage.tsx

Remplacer TOUTES les occurrences :

\`\`\`tsx
// ❌ AVANT
<Stack alignItems="center" justifyContent="space-between">

// ✅ APRÈS
<Stack sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
\`\`\`

Vérifier : `pnpm type-check` → 0 erreur dans tes fichiers

---

BONUS : BUG-006 Lint (1h)

Corriger erreurs lint dans TES fichiers.

---

✅ CHECKLIST

- [ ] TeamPageOld.tsx supprimé OU corrigé
- [ ] Stack props corrigés dans TasksPage
- [ ] Stack props corrigés dans TeamPage
- [ ] Lint OK
- [ ] Build OK
- [ ] Testé

WORKFLOW

1. Supprimer TeamPageOld.tsx - 5min
2. Corriger Stack props TasksPage - 1h
3. Corriger Stack props TeamPage - 1h
4. Lint cleanup - 1h

DURÉE TOTALE : 3h

GO !
```

---

## 👤 AGENT 5 - COMMUNICATIONS

### Durée estimée : 7-10h (2 jours)

### Prompt à copier-coller :

```
Tu es Agent 5 - Communications.

IMPORTANT : Lis d'abord docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

📋 MISSION P1 (PRIORITÉ ABSOLUE)

Tu dois créer 2 modals critiques :

---

MODAL-008 : MessageComposeModal (4-6h)

❓ VÉRIFIER : Ce modal existe-t-il dans Claude Design ?

NON.

Action :
1. Créer demande à Claude Design (PRIORITÉ)
2. OU créer toi-même

Référence ancien :
/Users/gouacht/sojori-dashboard/src/features/communications/modals/ComposeMessageModal.jsx

Spécifications :
- Modal pour composer message WhatsApp/OTA
- Champs :
  - Destinataire (select : guest, staff, multiple)
  - Canal (WhatsApp, OTA Message, Email)
  - Sujet (si email)
  - Message (textarea rich text)
  - Templates (select pré-définis)
  - Variables dynamiques ({guestName}, {checkIn}, etc.)
  - Pièces jointes (upload)
  - Programmer envoi (date/heure future)
- Preview message
- Actions : Envoyer maintenant, Programmer, Brouillon
- MOCK save

Intégrer dans :
- CommsPage (bouton "Nouveau message")
- OTAMessagesPage
- StaffWhatsAppPage

Composant Claude Design disponible :
✅ BroadcastModal (réutiliser pour multi-destinataires)

---

MODAL-009 : ReviewComposeModal (3-4h)

❓ VÉRIFIER : Ce modal existe-t-il dans Claude Design ?

NON.

Action :
1. Créer demande à Claude Design
2. OU créer toi-même

Référence ancien :
/Users/gouacht/sojori-dashboard/src/features/reviews/modals/WriteReviewModal.jsx

Spécifications :
- Modal pour écrire review pour un guest
- Champs :
  - Réservation (select)
  - Guest (auto-rempli depuis résa)
  - Rating (1-5 étoiles) - global
  - Catégories ratings (Communication, Propreté, Respect, etc.) - 1-5 chacune
  - Commentaire public (textarea)
  - Notes privées (textarea, visible seulement propriétaire)
  - Recommander ce voyageur ? (oui/non)
- Templates review (pré-remplis)
- Preview
- Actions : Publier, Brouillon
- MOCK save

Intégrer dans :
- ReviewsPage (bouton "Écrire un avis")
- ReservationsPage (action "Laisser avis")

---

BONUS : BUG-006 Lint (2h)

Corriger erreurs lint dans TES fichiers.

---

✅ CHECKLIST

- [ ] MessageComposeModal créé
- [ ] ReviewComposeModal créé
- [ ] Modals intégrés dans pages appropriées
- [ ] Lint OK
- [ ] Build OK
- [ ] Testé

WORKFLOW

1. Créer demandes Claude Design - 30min
2. Attendre/Créer MessageComposeModal - 4-6h
3. Attendre/Créer ReviewComposeModal - 3-4h
4. Intégrer modals - 2h
5. Tester - 1h

DURÉE TOTALE : 7-10h

GO !
```

---

## ✅ RÉSUMÉ GLOBAL

| Agent   | Durée P1 | Bugs critiques | Modals P1 | Demandes Claude Design |
|---------|----------|----------------|-----------|------------------------|
| Agent 1 | 7-10h    | 2 (BUG-002, BUG-005) | 2 | 2 (AdminAction, ReservationDetails) |
| Agent 2 | 17-24h   | 1 (BUG-003) | 4 | 2 (CheckInOut, CancelReservation) |
| Agent 3 | 7-9h     | 1 (BUG-001) | 2 | 2 (ImageGallery, PdfViewer) |
| Agent 4 | 3h       | 2 (BUG-007, BUG-001) | 0 | 0 |
| Agent 5 | 7-10h    | 0 | 2 | 2 (MessageCompose, ReviewCompose) |
| **TOTAL** | **48-61h** | **8 bugs** | **10 modals** | **8 modals** |

**Si agents en parallèle** : 6-8 jours

---

## 🎨 PROCHAINE ÉTAPE

Voir `docs/DEMANDES_CLAUDE_DESIGN.md` pour les demandes de modals manquants.

---

**Bonne chance à tous ! 🚀**
