# 🎨 CLAUDE DESIGN - COMPOSANTS MANQUANTS

**Mission** : Créer les composants Material-UI manquants identifiés dans les audits

**Context** : Tu as créé le design initial de Sojori-orchestrator. Les agents ont audité et identifié des composants manquants pour compléter les pages.

---

## 📋 COMPOSANTS À CRÉER

### 1. MODALS / DIALOGS

#### Modal "Créer/Modifier Réservation"
**Fichier** : `src/components/modals/CreateReservationModal.tsx`

**Design** :
- Modal large (900px)
- 2 colonnes : Formulaire (gauche 60%) + Résumé prix (droite 40%)
- Header : Titre + bouton fermer
- Footer : Annuler + Sauvegarder

**19 Champs** :
1. Guest (Autocomplete avec création rapide)
2. Property/Listing (Select)
3. Room Type (Select si multi-room)
4. Check-in (DatePicker) + Time (TimePicker)
5. Check-out (DatePicker) + Time (TimePicker)
6. Adultes (NumberInput)
7. Enfants (NumberInput)
8. Infants (NumberInput)
9. Prix/nuit (NumberInput €)
10. Prix total (calculé auto, modifiable)
11. Devise (Select: EUR/USD/MAD)
12. Source (Select: Direct/Airbnb/Booking/Vrbo)
13. Commission % (calculé auto, modifiable)
14. Commission € (calculé)
15. Code confirmation OTA (TextField)
16. Notes internes (Textarea)
17. Statut paiement (Select: Paid/Unpaid/Partial)
18. Email confirmation (Checkbox)
19. Créer tâches auto (Checkbox)

**Panneau résumé (droite)** :
- Prix/nuit × nuits = Sous-total
- Commission (-€)
- Total guest
- Net owner
- Couleurs : Aurora Soft Light

---

#### Modal "Créer/Modifier Tâche"
**Fichier** : `src/components/modals/CreateTaskModal.tsx`

**Design** :
- Modal très large (1000px) - beaucoup de champs
- Scroll interne si besoin
- Sections repliables (Accordion)

**Sections** :
1. **Informations de base** (toujours ouvert)
   - Type (Select depuis taskConfigs)
   - Nom (TextField)
   - SubType (Select dynamique)
   - Emergency (Select: Normal/Urgent/Critical)

2. **Dates & Horaires**
   - Start Date, End Date (DatePicker)
   - Start Hour, End Hour (TimePicker)
   - Duration (heures)
   - Timeslots (multi-select créneaux)

3. **Assignation**
   - Staff (Autocomplete avec recherche)
   - Listing (Select)
   - Réservation (TextField + bouton "Chercher")
   - Guest name (auto-rempli)

4. **Tarification**
   - Prix (€)
   - Paid (Checkbox)
   - Payment Mode (Select)
   - Request Payment (Yes/No)

5. **Détails supplémentaires**
   - Descriptions (Array avec Add/Remove)
   - Images (Upload multiple avec preview)
   - Services (Chips multi-select)
   - Presence (N/Y)

**Footer** :
- Boutons : Annuler / Supprimer (si édition) / Sauvegarder

---

#### Modal "Ajouter/Modifier Membre Team"
**Fichier** : `src/components/modals/AddTeamMemberModal.tsx`

**Design** :
- Modal large (800px)
- Tabs : Profil / Planning / Documents

**Tab Profil (17 champs)** :
1. Photo (Upload avatar)
2. Username
3. Staff Code (auto ou manual)
4. Email
5. Téléphone
6. Rôle principal (Select)
7. Sub-types (Multi-select chips)
8. Langues (Multi-select)
9. Compétences (Tags input)
10. Zone géographique (Select)
11. Statut (Radio: Actif/Inactif/En congé)
12. Date embauche (DatePicker)
13. Type contrat (Select)
14. Salaire/tarif (Number €)
15. Notes internes (Textarea)

**Tab Planning** :
- Grille 7 jours avec horaires (start-end par jour)
- Présent/Absent toggle

**Tab Documents** :
- Upload multiple (contrat, ID, etc.)

---

#### Modal "Modifier Planning Horaires"
**Fichier** : `src/components/modals/EditPlanningModal.tsx`

**Design** :
- Modal moyenne (600px)
- Simple et efficace

**Champs** :
- Jour sélectionné (affichage)
- Présent (Switch)
- Timings (Array)
  - Start (TimePicker)
  - End (TimePicker)
  - Bouton Add/Remove timing
- Copier vers autres jours (Multi-select jours)
- Appliquer à toutes les semaines (Checkbox)

**Validation** :
- End > Start
- Pas de chevauchement

---

#### Modal "Broadcast WhatsApp Staff"
**Fichier** : `src/components/modals/BroadcastModal.tsx`

**Design** :
- Modal large (700px)
- Liste sélection staff (gauche) + Preview message (droite)

**Contenu** :
- Checkbox list staff (avatar + nom + rôle)
- Count sélectionnés
- Message (Textarea)
- Templates (boutons rapides)
- Send (bouton primaire)

---

### 2. PANELS / DRAWERS

#### Panneau Tâches Staff (StaffTasksPanel)
**Fichier** : `src/components/panels/StaffTasksPanel.tsx`

**Design** :
- Drawer droit 400px
- Header : "Tâches de [Nom Staff]"
- Filtres rapides (chips statuts)
- Liste tâches scrollable
- Click tâche → Modal détail

**Contenu tâche** :
- Type emoji + nom
- Listing
- Date/heure
- Statut (badge)
- Bouton actions

---

#### Section Voyageurs (Réservation)
**Fichier** : `src/components/sections/TravelersSection.tsx`

**Design** :
- Tabs : Adultes / Enfants / Infants
- Liste avec cartes

**Carte voyageur** :
- Nom, Prénom
- Passeport (photo si uploadée)
- Nationalité (drapeau)
- Date naissance
- Statut (Badge: COMPLETE/DRAFT/NOT_REGISTERED)
- Boutons : Modifier / Supprimer

**Bouton** : + Ajouter voyageur

---

#### Section Financier (Réservation)
**Fichier** : `src/components/sections/FinancialSection.tsx`

**Design** :
- Cards + Tableau

**Cards résumé** :
- Prix total guest
- Commission OTA
- Net owner

**Tableau ventilation** :
- Prix par nuit × nuits
- Frais ménage
- Extras
- Taxes
- Total

**Actions** :
- + Ajouter paiement (modal)
- + Ajouter frais (modal)

---

### 3. COMPOSANTS FILTRES

#### FilterBar Avancé (Tasks)
**Fichier** : `src/components/filters/AdvancedTaskFilters.tsx`

**Design** :
- Accordéon replié par défaut
- Bouton "Filtres avancés" (badge count actifs)
- Grille responsive 3 colonnes

**15+ Filtres** :
- Origine (select)
- Sub-types (multi-select)
- Statuts (multi-select avec 8 options)
- Listing IDs (multi-select)
- Staff codes (multi-select)
- Payment status (select)
- Has association (radio)
- Emergency (select)
- Date Type (radio: startDate/createdAt)
- Date Range (2 date pickers)
- Period (chips: Today/Tomorrow/Week/All)
- Zones (multi-select)
- Status Cards (chips: Vacant/Occupied/etc.)
- Recherche texte
- Bouton Reset

---

#### Sélecteur Colonnes
**Fichier** : `src/components/filters/ColumnSelector.tsx`

**Design** :
- Popover depuis bouton "⚙️ Colonnes"
- Checkbox list colonnes disponibles
- Drag & drop pour réordonner
- Bouton "Tout afficher" / "Masquer tout"

---

### 4. VUES SPÉCIALES

#### Vue Gantt Réservations Planning
**Fichier** : `src/components/views/ReservationsGanttView.tsx`

**Design** :
- Timeline horizontale (jours)
- Lignes par listing
- Blocs réservations colorés par statut
- Hover → Tooltip détails
- Click → Navigate vers détail

**Features** :
- Navigation semaine/mois
- Zoom in/out
- Filtres listing

---

#### Éditeur Règles Pricing
**Fichier** : `src/components/pricing/PricingRulesEditor.tsx`

**Design** :
- Tabs : Month / Weekday / Events / Occupancy / Long Stay / Last Minute
- Chaque tab = formulaire spécifique

**Tab Month Wise** :
- 12 sliders (Jan à Dec)
- % increase/decrease
- Switch actif

**Tab Events** :
- Liste règles (cards)
- Bouton + Ajouter
- Champs : from, to, %, min_stay, name

**Tab Occupancy** :
- Range sliders (min/max %)
- % adjustment
- Switch actif

Etc.

---

#### Channels Dashboard (Vues Summary/Business/Mapping)
**Fichier** : `src/components/channels/ChannelsDashboard.tsx`

**Design** :
- Tabs : Summary / Business / Debug / Cron / Mapping
- Chaque tab = tableau spécifique

**Summary** :
- Stats cards
- Tableau webhooks (colonnes: Date/Type/Aujourd'hui/OK/Err)
- Graphiques API calls

**Business** :
- Sub-tabs : Messages / Réservations / Calendrier
- Tableaux détaillés par domaine

**Mapping** :
- CRUD mapping RU
- Tableau éditable

---

## 🎨 GUIDELINES DESIGN

### Couleurs Aurora Soft Light
```typescript
primary: '#e6b022',     // Gold
secondary: '#8b5cf6',   // Purple/AI
success: '#10b981',     // Green
error: '#ef4444',       // Red
warning: '#f59e0b',     // Orange
info: '#3b82f6',        // Blue
```

### Composants Material-UI v9
- `<Dialog>` pour modals
- `<Drawer>` pour panels
- `<Accordion>` pour sections repliables
- `<Tabs>` pour navigation interne
- `<Autocomplete>` pour selects avec recherche
- `<Chip>` pour badges/tags
- `<TextField>` avec `multiline` pour textarea
- `<DatePicker>` / `<TimePicker>` (MUI X)

### Typographie
- Titres modals : `variant="h5"`
- Sections : `variant="h6"`
- Labels : `variant="body2"` + `color="text.secondary"`
- Valeurs : `variant="body1"`

### Spacing
- Padding modal : `p={3}`
- Gap grille : `gap={2}`
- Margin sections : `mb={3}`

### Responsive
- Grille : `<Grid container spacing={2}>`
- Breakpoints : `xs={12} sm={6} md={4}`
- Mobile : Dialog fullScreen si `useMediaQuery('(max-width:600px)')`

---

## 📦 STRUCTURE FICHIERS

```
src/
├── components/
│   ├── modals/
│   │   ├── CreateReservationModal.tsx
│   │   ├── CreateTaskModal.tsx
│   │   ├── AddTeamMemberModal.tsx
│   │   ├── EditPlanningModal.tsx
│   │   └── BroadcastModal.tsx
│   ├── panels/
│   │   └── StaffTasksPanel.tsx
│   ├── sections/
│   │   ├── TravelersSection.tsx
│   │   └── FinancialSection.tsx
│   ├── filters/
│   │   ├── AdvancedTaskFilters.tsx
│   │   └── ColumnSelector.tsx
│   ├── views/
│   │   └── ReservationsGanttView.tsx
│   ├── pricing/
│   │   └── PricingRulesEditor.tsx
│   └── channels/
│       └── ChannelsDashboard.tsx
```

---

## ✅ CHECKLIST LIVRAISON

Pour chaque composant :
- [ ] Props TypeScript typées
- [ ] MOCK data intégré (pas d'API calls)
- [ ] Validation formulaires (si applicable)
- [ ] Responsive (mobile + desktop)
- [ ] Accessibilité (labels, aria)
- [ ] Cohérent avec design system
- [ ] Commentaires explicatifs

---

**Livrable** : Tous les fichiers `.tsx` dans `src/components/` avec MOCK data fonctionnel

**Next step** : Une fois créés, les agents intégreront ces composants dans leurs pages respectives.
