# ✅ AGENT 4 - PHASE 2 : COMPLÉTER OPÉRATIONS

**Mission** : 160+ éléments manquants à implémenter (MOCK)

---

## 🎯 P1 - TASKS (CRITIQUE)

### 1. Modal CreateTaskModal (29 champs)

**ATTENDRE** Claude Design, puis intégrer.

**Brancher dans TasksPage** :
- Bouton "+ Nouvelle tâche"
- Mode create/edit
- MOCK save → `mockTasks.push(newTask)`

**Implémenter** :
```typescript
handleCreateTask(taskData) {
  // Générer ID
  const newTask = {
    id: `task-${Date.now()}`,
    itemNumber: `TSK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    ...taskData,
    createdAt: new Date().toISOString(),
    status: 'CREATED',
  };

  // Add to mock
  mockTasks.push(newTask);

  // Toast
  toast.success('Tâche créée');

  // Close modal
  setModalOpen(false);
}
```

### 2. Ajouter 9 colonnes manquantes

```typescript
// Dans mockTasks, ajouter:
{
  itemNumber: 'TSK-A3F2D1',
  createdAt: '2025-05-14T10:30:00Z',
  details: { origin: 'task', subType: 'cleaning' },
  reservationNumber: 'SJ-12345', // + link
  guestName: 'John Doe',
  timeslotClient: '14:00-16:00',
  taskHour: { time: '15:00', source: 'client' }, // ou 'admin'/'default'
  paymentStatus: 'Paid',
  price: 50,
}
```

**Affichage colonnes** :
- itemNumber : Badge cliquable → modal détail
- details : `origin` chip + `subType` label
- reservationNumber : Link vers réservation
- timeslotClient : Si différent de taskHour, afficher les 2
- paymentStatus : Badge couleur

### 3. Filtres avancés (15+ filtres)

**Créer AdvancedTaskFilters** (attendre Claude Design).

```typescript
const [filters, setFilters] = useState({
  // Quick filters (existants)
  quick: 'all', // all/urgent/today/week/unassigned
  type: 'all',

  // NOUVEAUX
  origin: 'all', // all/task/client
  subTypes: [], // Multi-select
  statuses: [], // Multi-select 8 statuts
  listingIds: [],
  staffCodes: [],
  paymentStatus: 'all',
  hasAssociation: 'all',
  emergency: 'all',
  dateType: 'startDate', // ou 'createdAt'
  dateRange: [null, null],
  period: 'all', // today/tomorrow/week/all
  zones: [],
  statusCards: [], // vacant/occupied/etc
  searchTerm: '',
});
```

**Logique filtrage** :
```typescript
const filteredTasks = mockTasks.filter(task => {
  if (filters.origin !== 'all' && task.details.origin !== filters.origin) return false;
  if (filters.subTypes.length && !filters.subTypes.includes(task.details.subType)) return false;
  // ... etc
  return true;
});
```

**UI** :
- Accordion "Filtres avancés"
- Badge count filtres actifs
- Reset button

### 4. Actions par ligne (8 actions)

**Menu 3 points** sur chaque ligne :

```typescript
<IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
  <MoreVertIcon />
</IconButton>
<Menu anchorEl={anchorEl} open={Boolean(anchorEl)}>
  <MenuItem onClick={() => handleEdit(task.id)}>✏️ Modifier</MenuItem>
  <MenuItem onClick={() => handleChangeStatus(task.id)}>
    <StatusSubmenu /> {/* Dropdown 8 statuts */}
  </MenuItem>
  <MenuItem onClick={() => handleAssignStaff(task.id)}>👤 Assigner</MenuItem>
  <MenuItem onClick={() => handleDuplicate(task.id)}>📋 Dupliquer</MenuItem>
  <MenuItem onClick={() => handleComplete(task.id)}>✅ Marquer complétée</MenuItem>
  <MenuItem onClick={() => handleArchive(task.id)}>📦 Archiver</MenuItem>
  <MenuItem onClick={() => handleDelete(task.id)}>🗑️ Supprimer</MenuItem>
</Menu>
```

**Implémenter MOCK** :
- handleEdit → Ouvre modal en mode edit
- handleChangeStatus → Update status + toast
- handleAssignStaff → Modal sélection staff
- handleDuplicate → Clone task
- handleComplete → status = 'COMPLETED'
- handleArchive → isArchived = true
- handleDelete → Confirmation + splice

### 5. Pagination + Tri

```typescript
const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(25); // 10/25/50/100

const [sortConfig, setSortConfig] = useState({
  field: 'startDate',
  direction: 'asc',
});

const sortedTasks = [...filteredTasks].sort((a, b) => {
  if (sortConfig.field === 'startDate') {
    return sortConfig.direction === 'asc'
      ? new Date(a.startDate) - new Date(b.startDate)
      : new Date(b.startDate) - new Date(a.startDate);
  }
  // ... autres champs
});

const paginatedTasks = sortedTasks.slice(
  page * rowsPerPage,
  page * rowsPerPage + rowsPerPage
);
```

**UI** :
- TablePagination (MUI)
- Clic header colonne → Tri

---

## 🎯 P2 - TEAM

### 1. Modal AddTeamMemberModal (17 champs)

**ATTENDRE** Claude Design.

**Tabs** : Profil / Planning / Documents

**Implémenter MOCK** :
```typescript
handleAddTeamMember(memberData) {
  const newMember = {
    id: `staff-${Date.now()}`,
    staffCode: memberData.staffCode || `STF-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    ...memberData,
    createdAt: new Date().toISOString(),
  };
  mockTeamMembers.push(newMember);
  toast.success('Membre ajouté');
}
```

### 2. Colonnes manquantes (9)

```typescript
{
  staffCode: 'STF-A3F2',
  subTypes: ['cleaning', 'maintenance'],
  schedule: { // Par jour
    monday: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
    tuesday: [{ start: '08:00', end: '17:00' }],
    // ... 7 jours
  },
  languages: ['fr', 'en', 'ar'],
  skills: ['Ménage', 'Petite maintenance', 'Check-in'],
  zone: 'Marrakech Centre',
  hireDate: '2024-01-15',
  contractType: 'CDI',
  documents: [
    { name: 'Contrat.pdf', url: '/mock/doc1.pdf' },
    { name: 'ID.pdf', url: '/mock/doc2.pdf' },
  ],
}
```

**Affichage** :
- skills : Chips
- languages : Drapeaux emoji
- schedule : Icône 📅 avec tooltip
- documents : Count avec modal liste

### 3. Actions manquantes (8)

- Export liste (CSV) → Download MOCK
- Importer staff (CSV) → Upload + parse MOCK
- Message groupé → Navigate WhatsApp
- Voir profil complet → Drawer détail (onglets)
- Envoyer message WhatsApp → Navigate
- Assigner tâche → Modal CreateTask pré-rempli
- Désactiver/Activer → Toggle status
- Supprimer → Confirmation

---

## 🎯 P3 - PLANNING

### 1. Modal EditPlanningModal

**ATTENDRE** Claude Design.

**Fonctionnalités** :
- Présent/Absent toggle
- Array timings (add/remove)
- Validation (end > start)
- Copier vers autres jours
- MOCK save

### 2. Ajouter données cellule

**Actuellement** : Cellule = tâches assignées

**AJOUTER** : Horaires disponibilité

```typescript
// Cellule planning
{
  staffId: 'staff-1',
  date: '2025-05-14',
  present: true,
  timings: [
    { start: '08:00', end: '12:00' },
    { start: '14:00', end: '18:00' },
  ],
  totalHours: 8,
  tasks: [...], // Tâches assignées (existant)
}
```

**Affichage** :
- Si présent : Horaires + tâches
- Si absent : Badge "Absent"
- Color coding : Vert = dispo, Orange = occupé, Rouge = surchargé

### 3. Fonctionnalités manquantes

- Calcul automatique heures → `totalHours = timings.reduce(...)`
- Duplication planning → Copy week to next weeks
- Stats semaine → Total heures planifiées, moyenne/staff
- Export planning (PDF/Excel) → MOCK download

---

## 🎯 P4 - STAFF WHATSAPP

### 1. Panneau Tâches (StaffTasksPanel)

**ATTENDRE** Claude Design.

**Intégrer** :
- Drawer droit 400px
- Toggle depuis header
- Liste tâches du staff sélectionné
- Filtres rapides (status)
- Click tâche → Modal détail

### 2. Filtres manquants (6)

```typescript
- Admin (filter role)
- Staff (filter role)
- Manager (filter role)
- Unreplied (important !)
- Recent (24h)
- Recherche téléphone
```

**UI** :
- FilterChips au-dessus de la liste
- Badge count par filtre

### 3. Brancher actions

```typescript
// REMPLACER console.log par:

handleSendMessage(message) {
  const newMessage = {
    id: `msg-${Date.now()}`,
    sender: 'me',
    text: message,
    timestamp: new Date().toISOString(),
    status: 'sent',
  };

  // Add to thread
  mockThreads.find(t => t.id === selectedThread).messages.push(newMessage);

  // Clear input
  setMessage('');

  // Optimistic update
  toast.success('Message envoyé');
}

handleBroadcast(message, recipients) {
  recipients.forEach(staffId => {
    // Send message to each
    // MOCK: just toast
  });

  toast.success(`Message envoyé à ${recipients.length} personnes`);
  setModalOpen(false);
}
```

### 4. Real-time simulation (BONUS)

```typescript
// Simuler réception message après 2s
useEffect(() => {
  const timer = setTimeout(() => {
    const randomReply = {
      id: `msg-${Date.now()}`,
      sender: 'staff',
      text: 'Message reçu, je suis en route !',
      timestamp: new Date().toISOString(),
      status: 'delivered',
    };
    // Add to thread
    // Update unread count
  }, 2000);

  return () => clearTimeout(timer);
}, [selectedThread]);
```

---

## ✅ CHECKLIST

- [ ] Modal CreateTask (29 champs)
- [ ] 9 colonnes tasks
- [ ] 15 filtres avancés tasks
- [ ] 8 actions par ligne tasks
- [ ] Pagination + tri tasks
- [ ] Modal AddTeamMember (17 champs)
- [ ] 9 colonnes team
- [ ] 8 actions team
- [ ] Modal EditPlanning
- [ ] Données cellule planning enrichies
- [ ] Calcul heures + export planning
- [ ] Panneau tâches Staff WhatsApp
- [ ] 6 filtres Staff WhatsApp
- [ ] Actions send/broadcast branchées
- [ ] Tout fonctionne en MOCK

---

**Ordre** : Tasks → Team → Planning → Staff WhatsApp
