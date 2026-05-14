# 💬 AGENT 5 - PHASE 2 : COMPLÉTER COMMUNICATIONS

**Mission** : Corriger 5 blocages techniques + implémenter données manquantes (MOCK)

---

## 🔴 P0 - BLOCAGES CRITIQUES (À FAIRE EN PREMIER)

### 1. CommsPage.tsx - Brancher onSend

**PROBLÈME ACTUEL** :
```typescript
// CommsPage.tsx ligne ~150
<ChatThread conversation={selectedConversation} />
// ❌ Pas de prop onSend passé !
```

**FIX** :
```typescript
// Ajouter fonction
const handleSendMessage = (message: string) => {
  if (!selectedConversation) return;

  const newMessage = {
    id: `msg-${Date.now()}`,
    sender: 'me',
    text: message,
    timestamp: new Date().toISOString(),
    isAI: false,
  };

  // Update mockConversations
  setConversations(prev => prev.map(conv =>
    conv.id === selectedConversation.id
      ? {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: message,
          timestamp: newMessage.timestamp,
        }
      : conv
  ));

  // Toast
  toast.success('Message envoyé');
};

// Passer au composant
<ChatThread
  conversation={selectedConversation}
  onSend={handleSendMessage}
/>
```

---

### 2. OTAMessagesPage.tsx - Brancher onSend

**MÊME PROBLÈME** :
```typescript
<ChatThread conversation={selectedConversation} />
// ❌ Pas de onSend
```

**FIX** :
```typescript
const handleSendMessage = (message: string) => {
  if (!selectedConversation) return;

  const newMessage = {
    id: `msg-${Date.now()}`,
    sender: 'me',
    text: message,
    timestamp: new Date().toISOString(),
    platform: selectedConversation.platform, // airbnb/booking/vrbo
  };

  // Update OTA_CONVERSATIONS
  setConversations(prev => prev.map(conv =>
    conv.id === selectedConversation.id
      ? {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: message,
        }
      : conv
  ));

  toast.success(`Message envoyé via ${selectedConversation.platform}`);
};

<ChatThread
  conversation={selectedConversation}
  onSend={handleSendMessage}
/>
```

---

### 3. StaffWhatsAppPage.tsx - Brancher handleSendMessage

**PROBLÈME ACTUEL** :
```typescript
const handleSendMessage = () => {
  console.log('Send message:', message); // ❌
  setMessage('');
};
```

**FIX** :
```typescript
const handleSendMessage = () => {
  if (!message.trim() || !selectedConv) return;

  const newMessage = {
    id: `msg-${Date.now()}`,
    sender: 'me',
    text: message,
    timestamp: new Date().toISOString(),
    status: 'sent',
  };

  // Update conversation
  if (selectedConv.type === 'individual') {
    setIndividualConvs(prev => prev.map(conv =>
      conv.id === selectedConv.id
        ? {
            ...conv,
            messages: [...(conv.messages || []), newMessage],
            lastMessage: message,
            timestamp: newMessage.timestamp,
          }
        : conv
    ));
  } else {
    setGroupConvs(prev => prev.map(conv =>
      conv.id === selectedConv.id
        ? {
            ...conv,
            messages: [...(conv.messages || []), newMessage],
            lastMessage: message,
          }
        : conv
    ));
  }

  setMessage('');
  toast.success('Message envoyé');
};
```

**Brancher handleBroadcast** :
```typescript
const handleBroadcast = () => {
  console.log('Broadcast to:', broadcastRecipients, broadcastMessage); // ❌ REMPLACER

  if (!broadcastMessage.trim() || broadcastRecipients.length === 0) return;

  // Send to each
  broadcastRecipients.forEach(staffId => {
    const conv = STAFF_LIST.find(s => s.id === staffId);
    if (!conv) return;

    const newMessage = {
      id: `msg-${Date.now()}-${staffId}`,
      sender: 'me',
      text: broadcastMessage,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    // Update conversation (MOCK)
    // In real app, would call API
  });

  toast.success(`Message diffusé à ${broadcastRecipients.length} personnes`);
  setBroadcastModal(false);
  setBroadcastMessage('');
  setBroadcastRecipients([]);
};
```

---

### 4. ReviewsPage.tsx - Aligner contrat DataTable

**PROBLÈME ACTUEL** :
```typescript
<DataTable data={filteredReviews} /> // ❌ Attend `rows`
```

**FIX** :
```typescript
<DataTable rows={filteredReviews} columns={REVIEWS_COLUMNS} />
```

**Définir REVIEWS_COLUMNS** :
```typescript
const REVIEWS_COLUMNS = [
  { field: 'date', headerName: 'Date', width: 120 },
  { field: 'listing', headerName: 'Annonce', width: 180 },
  { field: 'guest', headerName: 'Voyageur', width: 150 },
  { field: 'platform', headerName: 'OTA', width: 100 },
  { field: 'rating', headerName: 'Note', width: 80 },
  { field: 'comment', headerName: 'Commentaire', width: 300 },
  { field: 'status', headerName: 'Statut', width: 120 },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 150,
    renderCell: (params) => (
      <>
        <IconButton onClick={() => handleReply(params.row.id)}>
          <ReplyIcon />
        </IconButton>
        <IconButton onClick={() => handleFlag(params.row.id)}>
          <FlagIcon />
        </IconButton>
      </>
    ),
  },
];
```

---

### 5. RequestsPage.tsx - Aligner contrats

**PROBLÈME 1** : DataTable
```typescript
<DataTable data={filteredRequests} /> // ❌ Attend `rows`
```

**FIX** :
```typescript
<DataTable rows={filteredRequests} columns={REQUESTS_COLUMNS} />
```

**PROBLÈME 2** : KanbanBoard
```typescript
<KanbanBoard data={filteredRequests} columns={kanbanColumns} /> // ❌ Attend children
```

**FIX** :
```typescript
<KanbanBoard>
  {kanbanColumns.map(column => (
    <KanbanColumn key={column.id} title={column.title} status={column.id}>
      {filteredRequests
        .filter(req => req.status === column.id)
        .map(req => (
          <RequestCard key={req.id} request={req} />
        ))}
    </KanbanColumn>
  ))}
</KanbanBoard>
```

---

## 🟠 P1 - FILTRES & RECHERCHE

### WhatsApp Guests

**Ajouter filtres manquants** :
```typescript
const [filters, setFilters] = useState({
  reservation: '', // Search
  listing: 'all',
  canal: 'all',
  status: 'all', // responded/pending/archived
  dateRange: [null, null],
  client: '', // Search name/phone
  statsWhatsApp: 'all', // read/unread
});
```

**UI** :
- Barre recherche (reservation + client)
- FilterChips (listing, canal, status)
- Advanced (dateRange, statsWhatsApp)

---

### OTA Messages

**Ajouter filtres manquants** :
```typescript
const [filters, setFilters] = useState({
  ota: [], // Multi-select airbnb/booking/vrbo
  listing: 'all',
  status: 'all', // read/unread/archived
  dateRange: [null, null],
  searchTerm: '',
});
```

---

### Staff WhatsApp

**Ajouter filtres manquants** :
```typescript
const [filters, setFilters] = useState({
  role: 'all', // all/admin/staff/manager
  unreplied: false, // IMPORTANT !
  recent: false, // 24h
  searchPhone: '',
});
```

**UI** :
- FilterChips : All/Admin/Staff/Manager/Unreplied/Recent
- Badge count par filtre
- Recherche téléphone

---

### Reviews

**Ajouter recherche** :
```typescript
const [searchTerm, setSearchTerm] = useState('');

const filteredReviews = MOCK_REVIEWS.filter(r =>
  r.guest.toLowerCase().includes(searchTerm.toLowerCase()) ||
  r.comment.toLowerCase().includes(searchTerm.toLowerCase())
);
```

---

### Requests

**Ajouter filtre date** :
```typescript
const [dateRange, setDateRange] = useState([null, null]);

const filteredRequests = MOCK_REQUESTS.filter(req => {
  if (dateRange[0] && new Date(req.date) < dateRange[0]) return false;
  if (dateRange[1] && new Date(req.date) > dateRange[1]) return false;
  return true;
});
```

---

## 🟢 P2 - ACTIONS MÉTIER

### Reviews

**Actions manquantes** :
```typescript
handleExport() {
  // Generate CSV mock
  const csv = MOCK_REVIEWS.map(r => `${r.date},${r.listing},${r.guest},${r.rating}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reviews.csv';
  a.click();
  toast.success('Export téléchargé');
}

handleFlag(reviewId) {
  // Mark as problematic
  setReviews(prev => prev.map(r =>
    r.id === reviewId ? { ...r, flagged: true } : r
  ));
  toast.warning('Avis signalé');
}

handleNavigateCrossChannel(reservationId) {
  // Navigate to WhatsApp or OTA for same reservation
  navigate(`/communications/whatsapp?reservation=${reservationId}`);
}
```

---

### Requests

**Actions manquantes** :
```typescript
handleApprove(requestId) {
  setRequests(prev => prev.map(req =>
    req.id === requestId ? { ...req, status: 'approved' } : req
  ));
  toast.success('Demande approuvée');
}

handleReject(requestId, reason) {
  setRequests(prev => prev.map(req =>
    req.id === requestId ? { ...req, status: 'rejected', rejectReason: reason } : req
  ));
  toast.error('Demande rejetée');
}

handleAssignStaff(requestId, staffId) {
  setRequests(prev => prev.map(req =>
    req.id === requestId ? { ...req, assignedTo: staffId } : req
  ));
  toast.success('Staff assigné');
}

handleCreateTask(requestId) {
  // Navigate to tasks with pre-filled form
  navigate(`/tasks/new?request=${requestId}`);
}

handleAddPricing(requestId, amount) {
  setRequests(prev => prev.map(req =>
    req.id === requestId ? { ...req, additionalPrice: amount } : req
  ));
  toast.success('Prix ajouté');
}
```

---

## ✅ CHECKLIST

### Blocages (P0)
- [ ] CommsPage onSend branché
- [ ] OTAMessagesPage onSend branché
- [ ] StaffWhatsAppPage handleSendMessage réel
- [ ] StaffWhatsAppPage handleBroadcast réel
- [ ] ReviewsPage contrat DataTable aligné
- [ ] RequestsPage contrats alignés (DataTable + KanbanBoard)

### Filtres (P1)
- [ ] WhatsApp Guests : 6 filtres
- [ ] OTA Messages : 5 filtres
- [ ] Staff WhatsApp : 4 filtres (dont Unreplied!)
- [ ] Reviews : recherche texte
- [ ] Requests : filtre date

### Actions (P1)
- [ ] Reviews : export, flag, navigation cross-channel
- [ ] Requests : approve, reject, assign, create task, add pricing

### Bonus (P2)
- [ ] Simulation real-time (messages reçus après 2s)
- [ ] Templates messages (boutons rapides)
- [ ] Upload image/document (WhatsApp)

---

**Ordre** : P0 blocages → P1 filtres → P1 actions → P2 bonus
