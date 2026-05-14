# 🎨 PROMPT CLAUDE DESIGN - MODALS P1

**Date** : 14 Mai 2026
**Mission** : Créer 8 modals manquants pour Phase 1
**Durée estimée** : 25-35h (ou moins si temps limité)
**Projet** : Sojori-orchestrator (nouveau dashboard)

---

## 🎯 TA MISSION

Tu es **Claude Design**. Tu as déjà livré **11 composants excellents** pour ce projet. 🎉

Maintenant on a besoin de **8 modals supplémentaires** pour compléter la Phase 1.

---

## 📋 CONTEXTE DU PROJET

### Projet actuel

**Chemin** : `/Users/gouacht/Sojori-orchestrator`

**Stack** :
- Vite 8 + React 18 + TypeScript 5.7
- Material-UI v9 (`@mui/material` v5.16.7)
- **IMPORTANT** : Utiliser `sx` props seulement, PAS de props Stack invalides
- Design system : **Aurora Soft Light**
  - Primary : `#e6b022` (gold)
  - Secondary : `#8b5cf6` (purple)
- Mode : MOCK (pas d'API réelles, localStorage)

### Tes composants déjà livrés (11) ✅

- `AddTeamMemberModal.tsx`
- `EditPlanningModal.tsx`
- `BroadcastModal.tsx`
- `StaffTasksPanel.tsx`
- `TravelersSection.tsx`
- `FinancialSection.tsx`
- `AdvancedTaskFilters.tsx`
- `ColumnSelector.tsx`
- `ReservationsGanttView.tsx`
- `PricingRulesEditor.tsx`
- `ChannelsDashboard.tsx`

**Ces composants sont déjà intégrés et fonctionnent bien** ! 👏

---

## 🎨 MODALS À CRÉER (8)

**Document de référence complet** : `docs/DEMANDES_CLAUDE_DESIGN.md`

Lis ce document pour les spécifications détaillées de chaque modal.

### Ordre de priorité

Si tu as le temps de faire les 8 → **PARFAIT** ! 🎉

Si temps limité, fais au moins les **4 premiers** (ordre décroissant d'importance) :

| # | Modal | Priorité | Agent | Complexité | Temps |
|---|-------|----------|-------|------------|-------|
| 1 | **AdminActionModal** | 🔴 CRITIQUE | Agent 1 | Haute | 4-6h |
| 2 | **MessageComposeModal** | 🔴 CRITIQUE | Agent 5 | Haute | 4-6h |
| 3 | **CheckInOutStatusModal** | 🟠 IMPORTANT | Agent 2 | Moyenne | 3-4h |
| 4 | **CancelReservationModal** | 🟠 IMPORTANT | Agent 2 | Moyenne | 3-4h |
| 5 | ImageGalleryModal | 🟡 UTILE | Agent 3 | Haute | 3-4h |
| 6 | ReservationDetailsModal | 🟡 UTILE | Agent 1 | Haute | 3-4h |
| 7 | ReviewComposeModal | 🟡 UTILE | Agent 5 | Moyenne | 3-4h |
| 8 | PdfViewerModal | 🟢 BONUS | Agent 3 | Faible | 2-3h |

---

## 📖 SPÉCIFICATIONS RÉSUMÉES

### 1. AdminActionModal 🔴

**Objectif** : Modal d'action admin sur timeline orchestration

**Features clés** :
- Sélecteur type action : Email, Task, Note, SMS, Call
- Champs dynamiques selon type (form builder)
- Validation contextuelle
- MOCK save

**Référence ancien** : `/Users/gouacht/sojori-dashboard/src/features/ultimateDashboard/components/orchestration/modals/AdminActionModal.jsx`

**Specs complètes** : `docs/DEMANDES_CLAUDE_DESIGN.md` section "MODAL #1"

---

### 2. MessageComposeModal 🔴

**Objectif** : Composer message WhatsApp/OTA/Email avec templates et programmation

**Features clés** :
- Multi-canal (WhatsApp, OTA, Email)
- Templates pré-définis
- Variables dynamiques ({guestName}, etc.)
- Rich text editor (si email)
- Pièces jointes
- Programmer envoi (date/heure future)
- Preview message

**Réutiliser** : Ton composant `BroadcastModal` pour inspiration multi-destinataires

**Référence ancien** : `/Users/gouacht/sojori-dashboard/src/features/communications/modals/ComposeMessageModal.jsx`

**Specs complètes** : `docs/DEMANDES_CLAUDE_DESIGN.md` section "MODAL #7"

---

### 3. CheckInOutStatusModal 🟠

**Objectif** : Déclarer arrivée/départ réservation

**Features clés** :
- 2 modes : Check-in OU Check-out
- Date/heure effective
- Statut (arrived, departed, no-show, early-departure, late-arrival)
- Notes
- Créer tâche auto (cleaning, inspection)

**Référence ancien** : `/Users/gouacht/sojori-dashboard/src/features/reservation/modals/CheckInOutModal.jsx`

**Specs complètes** : `docs/DEMANDES_CLAUDE_DESIGN.md` section "MODAL #3"

---

### 4. CancelReservationModal 🟠

**Objectif** : Annuler réservation avec remboursement et notifications

**Features clés** :
- Raison annulation (select)
- Type remboursement (none, partial, full)
- Si partial → montant
- Notifier client (checkbox)
- Créer crédit/voucher (checkbox)
- Double confirmation avant annulation

**Référence ancien** : `/Users/gouacht/sojori-dashboard/src/features/reservation/modals/CancelReservationModal.jsx`

**Specs complètes** : `docs/DEMANDES_CLAUDE_DESIGN.md` section "MODAL #4"

---

### 5. ImageGalleryModal 🟡

**Objectif** : Galerie photos listing avec gestion

**Features clés** :
- Carousel image principale + thumbnails
- Navigation (prev/next, keyboard, swipe)
- Zoom
- Upload nouvelles images
- Drag & drop réorganiser ordre
- Définir photo principale
- Supprimer images

**Référence ancien** : `/Users/gouacht/sojori-dashboard/src/components/media/ImageGalleryModal.jsx`

**Specs complètes** : `docs/DEMANDES_CLAUDE_DESIGN.md` section "MODAL #5"

---

### 6. ReservationDetailsModal 🟡

**Objectif** : Détail complet réservation avec tabs

**Features clés** :
- 5 tabs : Infos, Voyageurs, Finances, Communication, Historique
- Tab Voyageurs → **Réutiliser ton `TravelersSection`** ✅
- Tab Finances → **Réutiliser ton `FinancialSection`** ✅
- Actions rapides header (Edit, Cancel, Check-in, Check-out)
- Lecture seule + mode édition

**Référence ancien** : `/Users/gouacht/sojori-dashboard/src/features/reservation/components/ReservationDetailsModal.jsx`

**Specs complètes** : `docs/DEMANDES_CLAUDE_DESIGN.md` section "MODAL #2"

---

### 7. ReviewComposeModal 🟡

**Objectif** : Écrire avis pour guest

**Features clés** :
- Rating global (1-5 étoiles)
- 4 category ratings (Communication, Propreté, Respect, Recommandation)
- Commentaire public (textarea, min 50 char)
- Notes privées (textarea, optionnel)
- Recommander voyageur (oui/non)
- Templates pré-remplis
- Preview avis

**Référence ancien** : `/Users/gouacht/sojori-dashboard/src/features/reviews/modals/WriteReviewModal.jsx`

**Specs complètes** : `docs/DEMANDES_CLAUDE_DESIGN.md` section "MODAL #8"

---

### 8. PdfViewerModal 🟢

**Objectif** : Afficher PDF (contrats, factures, documents)

**Features clés** :
- PDF viewer (react-pdf ou iframe)
- Navigation pages (si multi-pages)
- Zoom in/out
- Download
- Imprimer

**Library** : `npm install react-pdf pdfjs-dist` (ou simple iframe)

**Specs complètes** : `docs/DEMANDES_CLAUDE_DESIGN.md` section "MODAL #6"

---

## ✅ RÈGLES À RESPECTER

### 1. TypeScript strict

```typescript
// ✅ BON - Toujours typer les props
interface MyModalProps {
  open: boolean;
  onClose: () => void;
  data: MyData;
  onSubmit: (result: MyResult) => Promise<void>;
}

// ❌ MAUVAIS - Pas de any
props: any
```

### 2. Material-UI v9 - sx props seulement

```tsx
// ✅ BON
<Stack sx={{ alignItems: 'center', justifyContent: 'space-between' }}>

// ❌ MAUVAIS - Ne marche pas en MUI v9
<Stack alignItems="center" justifyContent="space-between">
```

**IMPORTANT** : Ne JAMAIS utiliser `alignItems`, `justifyContent`, etc. comme props directes de Stack. Toujours dans `sx`.

### 3. Design Aurora Soft Light

```typescript
// Couleurs
const COLORS = {
  primary: '#e6b022',    // Gold
  secondary: '#8b5cf6',  // Purple
};

// Utilisation
<Button
  variant="contained"
  sx={{
    background: 'linear-gradient(135deg, #e6b022 0%, #f4c430 100%)',
    '&:hover': {
      background: 'linear-gradient(135deg, #f4c430 0%, #e6b022 100%)',
    }
  }}
>
  Action
</Button>
```

### 4. MOCK behavior

```typescript
// Simuler API call
const handleSubmit = async (data: FormData) => {
  setLoading(true);

  // Simuler délai
  await new Promise(resolve => setTimeout(resolve, 500));

  // Save dans localStorage (MOCK)
  const existing = JSON.parse(localStorage.getItem('myData') || '[]');
  existing.push(data);
  localStorage.setItem('myData', JSON.stringify(existing));

  // Callback
  await onSubmit(data);

  setLoading(false);
  onClose();
};
```

### 5. Structure fichier modal

```tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  // ... autres imports MUI
} from '@mui/material';

interface MyModalProps {
  open: boolean;
  onClose: () => void;
  // ... autres props
}

export const MyModal: React.FC<MyModalProps> = ({
  open,
  onClose,
  // ... props
}) => {
  const [formData, setFormData] = useState({ /* ... */ });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    // Validation
    // MOCK save
    // Callback
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Titre Modal</DialogTitle>

      <DialogContent>
        {/* Form fields */}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'En cours...' : 'Confirmer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MyModal;
```

---

## 📁 STRUCTURE FICHIERS

**Créer les fichiers dans** : `src/components/modals/`

**Nommage** :
- `AdminActionModal.tsx`
- `MessageComposeModal.tsx`
- `CheckInOutStatusModal.tsx`
- `CancelReservationModal.tsx`
- `ImageGalleryModal.tsx`
- `ReservationDetailsModal.tsx`
- `ReviewComposeModal.tsx`
- `PdfViewerModal.tsx`

**Chaque fichier doit** :
- Export named : `export const MyModal: React.FC<Props>`
- Export default : `export default MyModal;`
- Props interface au début
- TypeScript strict
- Comments JSDoc si complexe

---

## 🧪 COMMENT TESTER

Tu n'as PAS besoin de lancer l'app pour tester. Mais si tu veux :

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4000
# Ouvre http://localhost:4000
```

**Tests minimums** :
- TypeScript compile : `pnpm type-check`
- Pas d'erreur syntax
- Props bien typées
- Imports Material-UI corrects

---

## 📦 LIVRABLES ATTENDUS

**Si tu peux faire les 8 modals** :

1. `src/components/modals/AdminActionModal.tsx` ✅
2. `src/components/modals/MessageComposeModal.tsx` ✅
3. `src/components/modals/CheckInOutStatusModal.tsx` ✅
4. `src/components/modals/CancelReservationModal.tsx` ✅
5. `src/components/modals/ImageGalleryModal.tsx` ✅
6. `src/components/modals/ReservationDetailsModal.tsx` ✅
7. `src/components/modals/ReviewComposeModal.tsx` ✅
8. `src/components/modals/PdfViewerModal.tsx` ✅

**Si temps limité, fais au moins les 4 premiers** (ordre priorité ci-dessus).

---

## ⏱️ ESTIMATION TEMPS

**Si tu fais tout** : 25-35h

**Si les 4 premiers** : 14-20h

**Si les 2 premiers** (CRITIQUES) : 8-12h

**Choisis selon ton temps disponible** ! Même les 2 premiers seraient déjà ÉNORME. 🎉

---

## 📞 RÉFÉRENCE PROJET ANCIEN

**Chemin ancien dashboard** : `/Users/gouacht/sojori-dashboard`

Tu peux consulter les fichiers référence mentionnés dans `docs/DEMANDES_CLAUDE_DESIGN.md`.

**Mais ne modifie PAS l'ancien** ! C'est la prod. Seulement consultation.

---

## 🚀 WORKFLOW RECOMMANDÉ

### Option 1 : Tout faire d'un coup (si temps)

1. Lire `docs/DEMANDES_CLAUDE_DESIGN.md` complet
2. Créer les 8 fichiers .tsx
3. Commit :
```bash
git add src/components/modals/*.tsx
git commit -m "feat: add 8 modals P1 from Claude Design

- AdminActionModal (orchestration actions)
- MessageComposeModal (WhatsApp/OTA/Email)
- CheckInOutStatusModal (check-in/out)
- CancelReservationModal (annulation)
- ImageGalleryModal (photos listing)
- ReservationDetailsModal (détail résa)
- ReviewComposeModal (avis guest)
- PdfViewerModal (PDF viewer)

Design: Aurora Soft Light
Stack: MUI v9, TypeScript strict, MOCK
Refs: ancien dashboard + specs détaillées"
```

### Option 2 : Par batch (si temps limité)

**Batch 1 (CRITIQUES - 8-12h)** :
- AdminActionModal
- MessageComposeModal

Commit → Livrer → Passer au batch 2

**Batch 2 (IMPORTANTS - 6-8h)** :
- CheckInOutStatusModal
- CancelReservationModal

Commit → Livrer → Passer au batch 3

**Batch 3 (UTILES - 6-8h)** :
- ImageGalleryModal
- ReservationDetailsModal

**Batch 4 (BONUS - 5-7h)** :
- ReviewComposeModal
- PdfViewerModal

---

## ✅ CHECKLIST FINALE

Avant de livrer, vérifie :

- [ ] Tous les fichiers créés dans `src/components/modals/`
- [ ] TypeScript strict (pas de `any` dangereux)
- [ ] Props interfaces définies
- [ ] Material-UI imports corrects
- [ ] **sx props** utilisées (PAS de Stack props invalides)
- [ ] Design Aurora Soft Light (#e6b022 gold, #8b5cf6 purple)
- [ ] MOCK behavior (localStorage)
- [ ] Validation forms
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive (mobile + desktop)
- [ ] Comments JSDoc si complexe
- [ ] `pnpm type-check` → 0 erreur sur tes fichiers
- [ ] Commit + message clair

---

## 🎯 OBJECTIF FINAL

**Après ton travail** :

Les Agents 1-5 pourront :
- Importer tes modals
- Les intégrer dans leurs pages
- Brancher les actions
- Compléter Phase 1

**Ton impact** :
- Gain de **25-35h** pour les agents (si tu fais les 8)
- Cohérence design garantie (Aurora Soft Light)
- Code quality élevé (TypeScript strict)
- Respect standards projet

---

## 💬 SI QUESTIONS

- Specs complètes : `docs/DEMANDES_CLAUDE_DESIGN.md`
- Contexte global : `docs/RAPPORT_AUDIT_PHASE2.md`
- Ancien dashboard : `/Users/gouacht/sojori-dashboard`

---

## 🚀 GO !

**Commence par** :

1. Lire `docs/DEMANDES_CLAUDE_DESIGN.md`
2. Décider : Tout faire OU batch prioritaire
3. Créer les fichiers .tsx
4. Commit
5. Livrer

**Merci Claude Design ! Tu assures ! 🎨**

---

**Durée estimée** : 25-35h (ou moins si batch prioritaire)

**Deadline souhaitée** : 2-3 jours (si possible)

**Priorité** : Les 4 premiers modals en priorité absolue

**Bonne chance ! 🚀**
