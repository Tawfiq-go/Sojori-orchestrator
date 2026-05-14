# 🏠 AGENT 3 - COMPOSANTS CLAUDE DESIGN DISPONIBLES

**Pour toi** : Tu travailles sur **Catalogue (Listings, Pricing, Channels, Clients)**

Claude Design a livré **3 composants** que tu peux utiliser maintenant.

---

## ✅ TES COMPOSANTS

### 1. **PricingRulesEditor** (`src/components/pricing/PricingRulesEditor.tsx`)

**Utilisation** : Page Pricing - Éditer les règles de pricing dynamique

**Props** :
```typescript
interface PricingRulesEditorProps {
  listingId: string;
  rules: PricingRules;
  onSave: (rules: PricingRules) => void;
}

interface PricingRules {
  monthWise: MonthRule[];  // 12 mois
  weekday: WeekdayRule[];  // 7 jours
  events: EventRule[];
  occupancy: OccupancyRule[];
  longStay: LongStayRule[];
  lastMinute: LastMinuteRule[];
}
```

**Import** :
```typescript
import { PricingRulesEditor } from '../components/pricing/PricingRulesEditor';
```

**Exemple** :
```typescript
// Dans ta PricingPage.tsx
<PricingRulesEditor
  listingId={selectedListing.id}
  rules={pricingRules}
  onSave={(rules) => {
    setPricingRules(rules);
    toast.success('Règles pricing sauvegardées');
  }}
/>
```

**6 Tabs** :
- Month Wise : Ajustements par mois (Janvier +20%, Août +50%, etc.)
- Weekday : Ajustements par jour (Vendredi +30%, Samedi +40%)
- Events : Règles événements (Coachella, Nouvel An, etc.)
- Occupancy : Ajustements selon taux occupation (50% → -10%, 90% → +20%)
- Long Stay : Remises séjour long (7j → -10%, 30j → -25%)
- Last Minute : Remises/augmentations last minute (J-3 → -15%)

---

### 2. **ChannelsDashboard** (`src/components/channels/ChannelsDashboard.tsx`)

**Utilisation** : Page Channels - Dashboard complet gestion canaux

**Props** :
```typescript
interface ChannelsDashboardProps {
  data: ChannelsData;
  onAction: (action: ChannelAction, payload: any) => void;
}

interface ChannelsData {
  summary: SummaryStats;
  business: BusinessMetrics;
  debug: DebugLogs[];
  cron: CronJobs[];
  mapping: RuMapping[];
}
```

**Import** :
```typescript
import { ChannelsDashboard } from '../components/channels/ChannelsDashboard';
```

**Exemple** :
```typescript
// Dans ta ChannelsPage.tsx
<ChannelsDashboard
  data={channelsData}
  onAction={(action, payload) => {
    switch(action) {
      case 'sync-ru-countries':
        handleSyncRuCountries();
        break;
      case 'create-mapping':
        handleCreateMapping(payload);
        break;
      case 'import-ru-properties':
        handleImportRuProperties(payload);
        break;
    }
  }}
/>
```

**5 Tabs** :
- Summary : Stats webhooks, API calls, tableaux recap
- Business : Sub-tabs Messages/Réservations/Calendrier/Listing
- Debug : Logs détaillés avec filtres
- Cron : Jobs planifiés (status, dernière exécution, prochaine)
- Mapping RU : CRUD mapping champs (City → RU City, etc.)

---

### 3. **ColumnSelector** (`src/components/filters/ColumnSelector.tsx`)

**Utilisation** : Modal pour sélectionner colonnes visibles (listings, clients)

**Props** :
```typescript
interface ColumnSelectorProps {
  open: boolean;
  onClose: () => void;
  columns: Column[];
  onSave: (visibleColumns: string[]) => void;
}

interface Column {
  id: string;
  label: string;
  visible: boolean;
}
```

**Import** :
```typescript
import { ColumnSelector } from '../components/filters/ColumnSelector';
```

**Exemple** :
```typescript
// Dans ListingsPage.tsx
const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);

<Button onClick={() => setColumnSelectorOpen(true)}>
  ⚙️ Colonnes
</Button>

<ColumnSelector
  open={columnSelectorOpen}
  onClose={() => setColumnSelectorOpen(false)}
  columns={ALL_COLUMNS.map(col => ({
    id: col.key,
    label: col.label,
    visible: visibleColumns.includes(col.key),
  }))}
  onSave={(newVisibleColumns) => {
    setVisibleColumns(newVisibleColumns);
    setColumnSelectorOpen(false);
    toast.success('Colonnes mises à jour');
  }}
/>
```

---

## 🎯 OÙ LES UTILISER

| Composant | Page | Où exactement |
|-----------|------|---------------|
| PricingRulesEditor | PricingPage | Remplacer le placeholder actuel par ce composant complet |
| ChannelsDashboard | ChannelsPage | Composant principal de la page (remplacer placeholder) |
| ColumnSelector | ListingsPage, ClientsPage | Bouton header "⚙️ Colonnes" |

---

## ✅ CHECKLIST INTÉGRATION

- [ ] Importer les 3 composants
- [ ] Remplacer placeholder PricingPage par PricingRulesEditor
- [ ] Remplacer placeholder ChannelsPage par ChannelsDashboard
- [ ] Ajouter bouton ColumnSelector dans ListingsPage
- [ ] Ajouter bouton ColumnSelector dans ClientsPage

---

**Les composants sont PRÊTS. Intègre-les maintenant !** 🚀
