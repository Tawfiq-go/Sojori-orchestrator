# 🎯 PROMPT GLOBAL - Complétion Dashboard Sojori Orchestrator

**Date** : 14 Mai 2026
**Projet** : Sojori-orchestrator (`/Users/gouacht/Sojori-orchestrator`)
**Phase** : Phase 1 - MOCK (pas de backend)
**Objectif** : Compléter les pages STUB créées précédemment

---

## 📋 CONTEXTE DU PROJET

### Qu'est-ce que Sojori Orchestrator ?

Dashboard de gestion de propriétés courte durée (STR) pour gérants immobiliers. Interface React moderne qui centralise :
- Réservations multi-OTA
- Orchestration automatisée des tâches
- Communication guests/staff (WhatsApp, Email, OTA)
- Pricing dynamique
- Gestion d'inventaire
- CRM clients
- Analytics

### État Actuel

**✅ Pages COMPLÈTES** (6 pages faites par Claude Design) :
1. `ReservationsPage.tsx` - Liste réservations avec stats, filtres, table, 4,674 lignes
2. `CalendarInventoryPage.tsx` - Vue Gantt 21 jours, 5 propriétés, 1,884 lignes
3. `TasksPage.tsx` - Kanban 4 colonnes + liste + timeline, 34,928 lignes
4. `OrchestrationPage.tsx` - Chronologie événements par réservation, 18,655 lignes
5. `CommsPage.tsx` - WhatsApp guests avec AI suggestions, 4,172 lignes
6. `ListingsPage.tsx` - Grid cards avec photos, stats, channels, 2,819 lignes
7. `NewListingFormPage.tsx` - Formulaire listing 22 onglets, 34,146 lignes

**⚠️ Pages STUB** (créées par agents mais incomplètes) :
- `InventoryPage.tsx` (Agent 2) - 664 lignes mais manque interactions
- `PricingPage.tsx` (Agent 2) - 818 lignes mais manque interactions
- `ChannelsPage.tsx` (Agent 3) - 710 lignes mais manque interactions
- `ClientsPage.tsx` (Agent 3) - 653 lignes mais manque interactions
- `TeamPage.tsx` (Agent 4) - 380 lignes mais manque interactions
- `PlanningPage.tsx` (Agent 4) - 290 lignes mais manque interactions
- `StaffWhatsAppPage.tsx` (Agent 4) - 520 lignes mais manque interactions
- `ReviewsPage.tsx` (Agent 5) - 402 lignes mais manque interactions
- `RequestsPage.tsx` (Agent 5) - 670 lignes mais manque interactions
- `OTAMessagesPage.tsx` (Agent 5) - 358 lignes mais manque interactions

---

## 🎯 MISSION GLOBALE

**Transformer les pages STUB en pages COMPLÈTES** comme les 6 pages existantes.

### Ce qui manque dans les pages STUB :

❌ **Pas d'interactions** :
- Clics sur rows → rien ne se passe
- Boutons → ne font rien
- Filtres → affichés mais non fonctionnels
- Recherche → non implémentée

❌ **Pas de détails** :
- Pas de Drawers/Modals au clic
- Pas de formulaires d'édition
- Pas de vues détaillées
- Pas d'actions rapides

❌ **Stats hardcodées** :
- Chiffres fixes au lieu de calculs dynamiques
- Pas de graphiques
- Pas d'évolution temporelle

❌ **Données MOCK insuffisantes** :
- Seulement 10-15 entrées par page
- Manque de diversité
- Manque de cohérence

### Ce qu'on veut :

✅ **Interactions complètes** :
- Clic sur row → Drawer avec détails complets
- Boutons → Modals/Actions simulées
- Filtres → Filtrent vraiment les données affichées
- Recherche → Filtre en temps réel
- Tri → Réordonne les données
- Toggles → Changent la vue

✅ **Composants riches** :
- Drawers multi-onglets (comme TasksPage)
- Modals avec formulaires (comme NewListingFormPage)
- AI Cards avec suggestions
- Timelines d'événements
- Graphiques (tendances, distributions)

✅ **Stats calculées dynamiquement** :
```typescript
// Exemple : calculer le taux d'occupation
const occupancyRate = (bookedDays / totalDays) * 100;

// PAS : const occupancyRate = 87.4; // ❌ hardcodé
```

✅ **Données MOCK réalistes** :
- 50+ entrées par type
- Noms, emails, téléphones réalistes
- Dates cohérentes (passé récent, futur proche)
- Relations entre données (client → réservations → messages)

---

## 🛠️ STACK TECHNIQUE

### Frontend
- **React** 18.3.1
- **TypeScript** 5.7
- **Vite** 8.0.12
- **React Router** 6.29
- **Material-UI** v9 (`@mui/material` v5.16.7)

### Styling
- **Material-UI sx props** uniquement
- **PAS Tailwind**, **PAS CSS-in-JS**, **PAS styled-components**
- Design system : Aurora Soft Light Theme

### Composants Réutilisables
Fichier : `/src/components/dashboard/DashboardV2.components.jsx`

**30+ composants disponibles** :
- `DashboardWrapper` - Layout principal avec sidebar
- `PageHeader` - Header de page avec title, count, actions
- `Panel` - Conteneur avec border/shadow
- `DataTable` - Tableau tri/filtrage/sélection
- `Badge` - Status badges (success/warning/error/info/ai)
- `StatsRow`, `StatCard` - Cards de stats avec trends
- `OrchestrationTimeline`, `TLEvent`, `TLDayLabel` - Timeline verticale
- `CalendarGantt` - Calendrier multi-propriétés
- `KanbanBoard` - Vue Kanban drag-ready
- `ChatLayout` - Layout chat (conversations + messages)
- `AIBanner`, `AIChip`, `AICard` - Composants IA
- `Revenue` - Montants formatés
- `ViewToggle` - Toggles de vue (table/kanban, jour/semaine)
- Et plus...

**Utilisation** :
```typescript
import {
  DashboardWrapper, PageHeader, Panel, DataTable,
  Badge, StatCard, AICard, btnPrimarySx
} from '../components/dashboard/DashboardV2.components';
```

### Design Tokens

**Couleurs** (disponibles via `tokens as t`) :
```typescript
import { tokens as t } from '../components/dashboard/DashboardV2.components';

t.primary      // '#e6b022' - Or Sojori
t.secondary    // '#8b5cf6' - Violet AI
t.accent       // '#06b6d4' - Cyan
t.success      // '#10b981' - Vert
t.warning      // '#f59e0b' - Orange
t.error        // '#ef4444' - Rouge
t.info         // '#3b82f6' - Bleu

t.bg0          // '#ffffff' - Background principal
t.bg1          // '#fafaf9' - Background panels
t.bg2          // '#f5f5f4' - Background hover
t.bg3          // '#e7e5e4' - Background disabled

t.text         // '#1c1917' - Texte principal
t.text2        // '#44403c' - Texte secondaire
t.text3        // '#78716c' - Texte tertiaire
t.text4        // '#a8a29e' - Texte disabled

t.border       // '#e7e5e4' - Bordures légères
t.borderStrong // '#d6d3d1' - Bordures fortes
```

**Boutons préfabriqués** :
```typescript
btnPrimarySx   // Bouton principal (or)
btnGhostSx     // Bouton ghost (transparent)
btnAiSx        // Bouton AI (violet)
btnSmSx        // Petit bouton
```

---

## 📐 STANDARDS DE CODE

### Structure d'une Page Type

```typescript
import React, { useState } from 'react';
import { Box, Button, Stack, Drawer } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, DataTable, Badge, AICard,
  btnPrimarySx, tokens as t
} from '../components/dashboard/DashboardV2.components';

export function MyPage() {
  // ──── State ────
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', search: '' });

  // ──── Mock Data ────
  const items = [
    { id: 1, name: 'Item 1', status: 'active', value: 1234 },
    // ... 50+ entrées
  ];

  // ──── Computed ────
  const filteredItems = items.filter(item => {
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const totalValue = filteredItems.reduce((sum, item) => sum + item.value, 0);

  // ──── Handlers ────
  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const handleCloseDrawer = () => {
    setSelectedItem(null);
  };

  // ──── Render ────
  return (
    <DashboardWrapper breadcrumb={['Section', 'Page']}>
      <PageHeader title="Ma Page" count={`${filteredItems.length} items`}>
        <Button sx={btnPrimarySx}>Action</Button>
      </PageHeader>

      {/* Stats */}
      <StatsRow sx={{ mb: 3 }}>
        <StatCard icon="📊" label="Total" value={totalValue} trend={+12} />
      </StatsRow>

      {/* Table */}
      <Panel>
        <DataTable
          columns={[
            { key: 'name', label: 'Nom', sortable: true },
            { key: 'status', label: 'Statut', render: (row) => <Badge variant="success">{row.status}</Badge> }
          ]}
          rows={filteredItems}
          onRowClick={handleRowClick}
        />
      </Panel>

      {/* Drawer Détails */}
      <Drawer anchor="right" open={!!selectedItem} onClose={handleCloseDrawer}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6">{selectedItem?.name}</Typography>
          {/* Détails complets... */}
        </Box>
      </Drawer>
    </DashboardWrapper>
  );
}
```

### Interactions Essentielles

**1. Clic sur Row → Drawer** :
```typescript
const handleRowClick = (row) => {
  setSelectedRow(row);
  setDrawerOpen(true);
};

<DataTable rows={data} onRowClick={handleRowClick} />

<Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
  {/* Contenu détails */}
</Drawer>
```

**2. Filtres Fonctionnels** :
```typescript
const [filters, setFilters] = useState({ status: 'all', search: '' });

const filteredData = data.filter(item => {
  if (filters.status !== 'all' && item.status !== filters.status) return false;
  if (filters.search && !item.name.includes(filters.search)) return false;
  return true;
});
```

**3. Recherche Temps Réel** :
```typescript
<TextField
  placeholder="Rechercher..."
  value={filters.search}
  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
/>
```

**4. Modal Formulaire** :
```typescript
const [modalOpen, setModalOpen] = useState(false);

<Button onClick={() => setModalOpen(true)}>Nouvelle entrée</Button>

<Modal open={modalOpen} onClose={() => setModalOpen(false)}>
  <Box sx={{ p: 3, bgcolor: 'white', m: 'auto', mt: 10, maxWidth: 500 }}>
    <Typography variant="h6">Formulaire</Typography>
    <TextField label="Nom" fullWidth sx={{ mt: 2 }} />
    <Button sx={{ mt: 2 }} onClick={handleSubmit}>Créer</Button>
  </Box>
</Modal>
```

---

## 📊 DONNÉES MOCK - STANDARDS

### Quantités Minimales

Par page :
- **InventoryPage** : 90 jours × 8 listings = 720 cellules
- **PricingPage** : 20 comparaisons, 10 règles, 5 événements
- **ChannelsPage** : 30 mappings, 100 logs
- **ClientsPage** : 50 clients
- **TeamPage** : 15 staff
- **PlanningPage** : 180 tâches (7 jours × 15 staff × ~1.7 tâches/jour)
- **StaffWhatsAppPage** : 200 messages
- **ReviewsPage** : 30 avis
- **RequestsPage** : 50 demandes
- **OTAMessagesPage** : 100 messages

### Réalisme

**Noms** : Utiliser des noms réalistes de différentes nationalités
```typescript
const guests = [
  { name: 'Sarah Johnson', country: '🇺🇸', email: 'sarah.j@gmail.com' },
  { name: 'Marco Rossi', country: '🇮🇹', email: 'marco.rossi@libero.it' },
  { name: 'Yumi Tanaka', country: '🇯🇵', email: 'yumi.t@yahoo.jp' },
  // ...
];
```

**Dates** : Cohérentes (passé récent, présent, futur proche)
```typescript
// Check-in hier, check-out dans 3 jours
const checkIn = new Date(Date.now() - 86400000); // -1 jour
const checkOut = new Date(Date.now() + 259200000); // +3 jours
```

**Relations** : Données liées entre elles
```typescript
// Client → Réservations → Messages
const client = { id: 1, name: 'Sarah Johnson' };
const reservation = { id: 101, clientId: 1, listingId: 5, checkIn: '2026-05-12' };
const messages = [
  { id: 1001, reservationId: 101, text: 'Bonjour Sarah...' }
];
```

---

## 🎨 EXEMPLES DE FONCTIONNALITÉS COMPLÈTES

### Exemple 1 : InventoryPage - Clic sur Cellule

```typescript
export function InventoryPage() {
  const [selectedCell, setSelectedCell] = useState(null);

  const handleCellClick = (listing, date, status) => {
    setSelectedCell({ listing, date, status });
  };

  return (
    <>
      {/* Calendrier */}
      <CalendarGantt
        onCellClick={handleCellClick}
        // ...
      />

      {/* Drawer Détails Cellule */}
      <Drawer anchor="right" open={!!selectedCell} onClose={() => setSelectedCell(null)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6">{selectedCell?.listing.name}</Typography>
          <Typography>{selectedCell?.date.toLocaleDateString()}</Typography>
          <Badge variant={selectedCell?.status === 'available' ? 'success' : 'error'}>
            {selectedCell?.status}
          </Badge>

          {selectedCell?.status === 'available' ? (
            <Button fullWidth sx={{ mt: 2 }} onClick={handleBlockPeriod}>
              Bloquer cette période
            </Button>
          ) : (
            <Box>
              <Typography>Réservation #1234</Typography>
              <Typography>Guest: Sarah Johnson</Typography>
              <Revenue amount={1840} currency="EUR" />
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
}
```

### Exemple 2 : ClientsPage - Fiche Client Multi-Onglets

```typescript
export function ClientsPage() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('profil');

  return (
    <>
      <DataTable rows={clients} onRowClick={(client) => setSelectedClient(client)} />

      <Drawer anchor="right" open={!!selectedClient} onClose={() => setSelectedClient(null)}>
        <Box sx={{ width: 500, height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: `1px solid ${t.border}` }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar>{selectedClient?.name[0]}</Avatar>
              <Box>
                <Typography variant="h6">{selectedClient?.name}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedClient?.email}</Typography>
              </Box>
            </Stack>
          </Box>

          {/* Onglets */}
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label="Profil" value="profil" />
            <Tab label="Réservations" value="reservations" />
            <Tab label="Messages" value="messages" />
          </Tabs>

          {/* Contenu Onglets */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            {activeTab === 'profil' && <ProfileTab client={selectedClient} />}
            {activeTab === 'reservations' && <ReservationsTab client={selectedClient} />}
            {activeTab === 'messages' && <MessagesTab client={selectedClient} />}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
```

### Exemple 3 : ReviewsPage - AI Suggestion Réponse

```typescript
export function ReviewsPage() {
  const [selectedReview, setSelectedReview] = useState(null);
  const [response, setResponse] = useState('');

  const generateAIResponse = () => {
    // Simuler génération AI
    const aiResponse = `Merci ${selectedReview.guestName} pour votre retour ! Nous sommes ravis que vous ayez apprécié votre séjour. Au plaisir de vous accueillir à nouveau !`;
    setResponse(aiResponse);
  };

  return (
    <>
      <DataTable rows={reviews} onRowClick={(r) => setSelectedReview(r)} />

      <Drawer anchor="right" open={!!selectedReview}>
        <Box sx={{ width: 500, p: 3 }}>
          <Typography variant="h6">Avis de {selectedReview?.guestName}</Typography>
          <Rating value={selectedReview?.rating} readOnly />
          <Typography sx={{ mt: 2 }}>{selectedReview?.comment}</Typography>

          <Divider sx={{ my: 3 }} />

          <AICard
            title="Suggestion de réponse"
            content="Cliquez pour générer une réponse personnalisée avec l'AI"
            action={<Button onClick={generateAIResponse}>Générer</Button>}
          />

          <TextField
            label="Votre réponse"
            multiline
            rows={4}
            fullWidth
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            sx={{ mt: 2 }}
          />

          <Button fullWidth sx={{ mt: 2, ...btnPrimarySx }}>
            Publier la réponse
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
```

---

## ✅ CHECKLIST AVANT LIVRAISON

Pour chaque page que tu complètes, vérifie :

### Fonctionnel
- [ ] Toutes les interactions fonctionnent (clics, hover, focus)
- [ ] Tous les boutons font quelque chose (même si simulation)
- [ ] Tous les filtres filtrent vraiment les données
- [ ] La recherche filtre en temps réel
- [ ] Les modals/drawers s'ouvrent et se ferment
- [ ] Les formulaires valident les champs
- [ ] Les stats sont calculées dynamiquement (pas hardcodées)

### Données
- [ ] Au moins 50+ entrées MOCK par type de données
- [ ] Données réalistes (noms, emails, dates, montants)
- [ ] Données cohérentes entre elles (relations)
- [ ] Variété (statuts différents, pays différents, etc.)

### Design
- [ ] Utilise les composants de DashboardV2.components.jsx
- [ ] Utilise sx props Material-UI (pas Tailwind, pas CSS-in-JS)
- [ ] Respecte le design system Aurora Soft (couleurs, espacements)
- [ ] Responsive (mobile, tablette, desktop)
- [ ] Accessibilité (labels, aria, contraste)

### Code
- [ ] TypeScript sans erreurs
- [ ] Imports corrects
- [ ] Pas de console.log oubliés
- [ ] Code commenté (sections principales)
- [ ] Nommage cohérent (camelCase, PascalCase)

### Performance
- [ ] Pas de re-renders inutiles
- [ ] Pas de calculs lourds dans le render
- [ ] Données MOCK en dehors du composant ou en useMemo

---

## 🚫 À NE PAS FAIRE

❌ **N'utilise PAS** :
- Tailwind CSS (on utilise Material-UI sx props)
- CSS-in-JS styled-components
- Hardcoded stats (calcule-les dynamiquement)
- Appels API (on est en mode MOCK Phase 1)
- console.log dans le code final

❌ **Ne crée PAS** :
- Nouveaux composants dans le fichier page (utilise ceux de DashboardV2.components.jsx)
- Nouveaux fichiers de services (pas de backend en Phase 1)
- Nouveaux design tokens (utilise `tokens as t`)

❌ **Ne laisse PAS** :
- Boutons sans action
- Filtres non fonctionnels
- Drawers vides
- Formulaires sans validation
- Stats à 0 ou hardcodées

---

## 📚 RESSOURCES

### Fichiers à consulter AVANT de coder

**Pages complètes de référence** :
- `/src/pages/ReservationsPage.tsx` - Exemple de table avec filtres
- `/src/pages/TasksPage.tsx` - Exemple de Kanban + Timeline
- `/src/pages/OrchestrationPage.tsx` - Exemple de Timeline détaillée
- `/src/pages/CommsPage.tsx` - Exemple de ChatLayout
- `/src/pages/NewListingFormPage.tsx` - Exemple de formulaire complexe

**Composants** :
- `/src/components/dashboard/DashboardV2.components.jsx` - Tous les composants réutilisables
- `/src/components/DashboardWrapper.tsx` - Layout principal

**Config** :
- `/src/App.tsx` - Routes
- `/tsconfig.json` - Config TypeScript

### Aide

Si tu as besoin d'aide :
1. Consulte les pages complètes pour voir comment elles font
2. Cherche dans DashboardV2.components.jsx si un composant existe déjà
3. Regarde les tokens disponibles pour les couleurs/espacements
4. Demande-moi si tu bloques vraiment

---

## 🎯 TON OBJECTIF

**Transformer une page STUB en page COMPLÈTE** en ajoutant :
1. **Interactions** (clics → drawers/modals)
2. **Fonctionnalités** (filtres, recherche, tri)
3. **Données MOCK** (50+ entrées réalistes)
4. **Stats calculées** (dynamiques, pas hardcodées)
5. **Design soigné** (Material-UI, Aurora Soft)

**Résultat attendu** : Une page aussi complète que `ReservationsPage`, `TasksPage` ou `CommsPage`.

---

🚀 **Prêt à compléter ta page ?**
