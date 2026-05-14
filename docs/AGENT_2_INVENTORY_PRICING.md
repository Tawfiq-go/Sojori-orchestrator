# 📊 AGENT 2 - INVENTORY + PRICING

**Mission** : Compléter les pages Inventaire et Tarification

---

## 📍 TON OBJECTIF

Transformer 2 pages STUB en pages COMPLÈTES avec interactions

**Pages** :
1. **InventoryPage** - Calendrier 90 jours avec clics et blocages
2. **PricingPage** - Règles de pricing + AI suggestions

---

## 📂 FICHIER 1 : INVENTORY

**Fichier** : `/src/pages/InventoryPage.tsx` (664 lignes actuellement)

### Ce qui MANQUE :

❌ Clic sur cellule → Rien ne se passe
❌ Pas de drawer de détails
❌ Pas de modal "Bloquer période"
❌ Stats hardcodées (pas calculées)

### Ce que tu dois AJOUTER :

```tsx
export function InventoryPage() {
  const [selectedCell, setSelectedCell] = useState(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);

  // MOCK Data 90 jours × 8 listings
  const listings = [/* 8 listings */];
  const bookings = [/* réservations */];

  // Stats CALCULÉES (pas hardcodées !)
  const totalDays = 90 * listings.length;
  const bookedDays = bookings.reduce((sum, b) => sum + b.length, 0);
  const occupancyRate = ((bookedDays / totalDays) * 100).toFixed(1);

  const handleCellClick = (listing, date, status) => {
    setSelectedCell({ listing, date, status });
  };

  return (
    <DashboardWrapper breadcrumb={['Calendrier', 'Inventaire']}>
      <PageHeader title="Inventaire · Calendrier 90j">
        <Button onClick={() => setBlockModalOpen(true)}>+ Bloquer période</Button>
      </PageHeader>

      {/* Stats CALCULÉES */}
      <StatsRow sx={{ mb: 3 }}>
        <StatCard icon="📊" label="Taux d'occupation" value={`${occupancyRate}%`} />
        <StatCard icon="📅" label="Jours disponibles" value={totalDays - bookedDays} />
      </StatsRow>

      {/* Calendrier avec onClick */}
      <CalendarGantt
        days={90}
        properties={listings}
        bookings={bookings}
        onCellClick={handleCellClick}  {/* ← IMPORTANT */}
      />

      {/* DRAWER Détails Cellule */}
      <Drawer anchor="right" open={!!selectedCell} onClose={() => setSelectedCell(null)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6">{selectedCell?.listing.name}</Typography>
          <Typography>{selectedCell?.date.toLocaleDateString()}</Typography>

          {selectedCell?.status === 'available' ? (
            <>
              <Badge variant="success">Disponible</Badge>
              <Button fullWidth sx={{ mt: 2 }} onClick={() => {
                setSelectedCell(null);
                setBlockModalOpen(true);
              }}>
                Bloquer cette période
              </Button>
            </>
          ) : (
            <>
              <Badge variant="error">Réservé</Badge>
              <Typography sx={{ mt: 2 }}>Réservation #1234</Typography>
              <Typography>Guest: Sarah Johnson</Typography>
              <Revenue amount={1840} currency="EUR" />
            </>
          )}
        </Box>
      </Drawer>

      {/* MODAL Bloquer Période */}
      <Modal open={blockModalOpen} onClose={() => setBlockModalOpen(false)}>
        <Box sx={{ p: 3, bgcolor: 'white', m: 'auto', mt: 10, maxWidth: 500 }}>
          <Typography variant="h6">Bloquer une période</Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Listing</InputLabel>
            <Select>
              {listings.map(l => <MenuItem value={l.id}>{l.name}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="Date début" type="date" fullWidth sx={{ mt: 2 }} />
          <TextField label="Date fin" type="date" fullWidth sx={{ mt: 2 }} />

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Raison</InputLabel>
            <Select>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="owner">Propriétaire</MenuItem>
              <MenuItem value="autre">Autre</MenuItem>
            </Select>
          </FormControl>

          <Button fullWidth variant="contained" sx={{ mt: 2 }}>
            Bloquer
          </Button>
        </Box>
      </Modal>
    </DashboardWrapper>
  );
}
```

---

## 📂 FICHIER 2 : PRICING

**Fichier** : `/src/pages/PricingPage.tsx` (818 lignes actuellement)

### Ce qui MANQUE :

❌ Clic sur ligne → Rien
❌ Pas de modal "Éditer règle"
❌ Pas de graphique évolution prix
❌ Règles non activables/désactivables

### Ce que tu dois AJOUTER :

```tsx
export function PricingPage() {
  const [selectedRule, setSelectedRule] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // MOCK Data
  const rules = [
    { id: 1, name: 'Weekend +20%', active: true, adjustment: 20, type: 'percent' },
    { id: 2, name: 'Long séjour -10%', active: false, adjustment: -10, type: 'percent' },
    // ... 10 règles
  ];

  const handleToggleRule = (ruleId) => {
    // Toggle actif/inactif (simulé)
    console.log('Toggle rule', ruleId);
  };

  const handleEditRule = (rule) => {
    setSelectedRule(rule);
    setEditModalOpen(true);
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Tarification']}>
      <PageHeader title="Tarification Dynamique">
        <Button onClick={() => {
          setSelectedRule(null);
          setEditModalOpen(true);
        }}>
          + Nouvelle règle
        </Button>
      </PageHeader>

      {/* Stats */}
      <StatsRow sx={{ mb: 3 }}>
        <StatCard icon="📈" label="Prix moyen" value="€142/nuit" />
        <StatCard icon="✅" label="Règles actives" value={rules.filter(r => r.active).length} />
      </StatsRow>

      {/* AI Card Suggestions */}
      <AICard
        title="Suggestions AI"
        sx={{ mb: 3 }}
      >
        <Typography sx={{ fontSize: 13 }}>
          • Augmenter de 15% ce weekend (festival local)<br />
          • Baisser de 10% les 5 prochains jours (gap de dispo)<br />
          • Activer tarif long séjour pour janvier
        </Typography>
      </AICard>

      {/* Tableau Règles */}
      <Panel>
        <Typography variant="h6" sx={{ mb: 2 }}>Règles de Pricing</Typography>

        <DataTable
          columns={[
            { key: 'name', label: 'Nom' },
            {
              key: 'active',
              label: 'Statut',
              render: (row) => (
                <Switch
                  checked={row.active}
                  onChange={() => handleToggleRule(row.id)}
                />
              )
            },
            { key: 'adjustment', label: 'Ajustement', render: (row) => `${row.adjustment}%` },
            {
              key: 'actions',
              label: '',
              render: (row) => (
                <Button size="small" onClick={() => handleEditRule(row)}>
                  Éditer
                </Button>
              )
            }
          ]}
          rows={rules}
        />
      </Panel>

      {/* MODAL Éditer Règle */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <Box sx={{ p: 3, bgcolor: 'white', m: 'auto', mt: 10, maxWidth: 500 }}>
          <Typography variant="h6">
            {selectedRule ? 'Éditer la règle' : 'Nouvelle règle'}
          </Typography>

          <TextField
            label="Nom de la règle"
            fullWidth
            sx={{ mt: 2 }}
            defaultValue={selectedRule?.name}
          />

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select defaultValue={selectedRule?.type || 'percent'}>
              <MenuItem value="percent">Pourcentage (%)</MenuItem>
              <MenuItem value="fixed">Montant fixe (€)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Ajustement"
            type="number"
            fullWidth
            sx={{ mt: 2 }}
            defaultValue={selectedRule?.adjustment}
          />

          <Button fullWidth variant="contained" sx={{ mt: 2 }}>
            {selectedRule ? 'Sauvegarder' : 'Créer'}
          </Button>
        </Box>
      </Modal>
    </DashboardWrapper>
  );
}
```

---

## ✅ CHECKLIST

- [ ] **InventoryPage** : Clic cellule → Drawer détails
- [ ] **InventoryPage** : Modal "Bloquer période" avec formulaire
- [ ] **InventoryPage** : Stats calculées dynamiquement
- [ ] **PricingPage** : Toggle activer/désactiver règles
- [ ] **PricingPage** : Clic règle → Modal édition
- [ ] **PricingPage** : AICard avec 3+ suggestions
- [ ] **PricingPage** : Bouton "Nouvelle règle"
- [ ] Données MOCK : 90j × 8 listings, 10+ règles

---

## 📋 CE QUE TU ME RETOURNES

```markdown
# Agent 2 - Inventory + Pricing

## ✅ Complété

### InventoryPage :
- **Lignes** : 664 → XXX (+YYY ajoutées)
- [x] Drawer détails cellule
- [x] Modal bloquer période
- [x] Stats calculées
- [x] 720 cellules MOCK (90j × 8)

### PricingPage :
- **Lignes** : 818 → XXX (+YYY ajoutées)
- [x] Toggle règles
- [x] Modal éditer règle
- [x] AICard suggestions
- [x] 10+ règles MOCK

## ✅ Prêt pour Tests
Oui / Non
```
