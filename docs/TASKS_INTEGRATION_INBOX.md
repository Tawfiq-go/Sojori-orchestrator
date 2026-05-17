# Integration des Taches dans l'Inbox - Documentation Complete

**Date**: 2026-05-17
**Feature**: Affichage des taches liees a chaque reservation dans l'inbox
**Status**: ✅ Implemente - En attente design Claude

---

## 🎯 Objectif

Pour chaque conversation dans l'inbox (WhatsApp Guests, OTA, etc.), afficher automatiquement les taches liees a la reservation du client dans le panel droit "CONTEXTE CONVERSATION".

---

## 📊 Architecture Technique

### 1. API Backend

**Endpoint interne srv-task**:
```
GET /api/v1/internal/tasks/reservation/:reservationId
```

**Parametres**:
- `reservationId`: Numero de reservation (ex: `SOJ-2026-08A1`)
- `includeCompleted` (query): `true` pour inclure taches terminees/annulees

**Reponse**:
```json
{
  "success": true,
  "data": {
    "reservationId": "SOJ-2026-08A1",
    "total": 3,
    "tasks": [
      {
        "taskId": "6745...",
        "taskCode": "TSK-001",
        "type": "cleaning",
        "status": "IN_PROGRESS",
        "scheduledFor": "2026-05-18T10:00:00Z",
        "deadline": "2026-05-18T14:00:00Z",
        "assignedStaff": {
          "name": "Marie Dupont",
          "phone": "+33612345678"
        }
      }
    ]
  }
}
```

---

## 🔧 Implementation Frontend

### 1. Service Layer (`tasksService.ts`)

**Nouvelle methode ajoutee**:
```typescript
async getTasksByReservation(
  reservationId: string,
  includeCompleted = false
): Promise<ReservationTasksResult>
```

**Fichier**: `/src/services/tasksService.ts:273-310`

**Comportement**:
- Appelle l'API interne srv-task
- Retourne un objet vide en cas d'erreur (pas de throw)
- Log les erreurs dans la console

---

### 2. Types (`tasks.types.ts` et `unifiedInbox.types.ts`)

**Nouveaux types ajoutes**:

```typescript
// tasks.types.ts
export interface ReservationTask {
  taskId: string;
  taskCode: string;
  type: string; // 'cleaning', 'transport', 'concierge'
  status: string;
  scheduledFor?: string;
  deadline?: string;
  assignedStaff?: {
    name: string;
    phone: string;
  } | null;
}

export interface ReservationTasksResult {
  success: boolean;
  data: {
    reservationId: string;
    total: number;
    tasks: ReservationTask[];
  };
}

// unifiedInbox.types.ts
export interface Thread {
  // ... champs existants
  tasks?: ReservationTask[];
  tasksLoading?: boolean;
}
```

---

### 3. Tabs de Communication

**Fichiers modifies**:
1. `WhatsAppTabV2.tsx`
2. `StaffWhatsAppTabV2.tsx`
3. `MessagesOTATabV2.tsx`

**Modifications apportees**:

#### a) Nouveaux states
```typescript
const [tasks, setTasks] = useState<ReservationTask[]>([]);
const [loadingTasks, setLoadingTasks] = useState(false);
```

#### b) Chargement parallele dans `handleSelectConversation`
```typescript
const handleSelectConversation = async (conv: Conversation) => {
  setActiveConversation(conv);
  setLoadingMessages(true);
  setLoadingTasks(true);
  setTasks([]);

  try {
    // Charger messages ET taches en parallele (Promise.all)
    const [messagesResponse, tasksResponse] = await Promise.all([
      messagesService.getConversationMessages(conv.phone, { limit: 50 }),
      conv.reservation_number
        ? tasksService.getTasksByReservation(conv.reservation_number, false)
        : Promise.resolve({ success: false, data: { reservationId: '', total: 0, tasks: [] } }),
    ]);

    if (messagesResponse.status === 'success') {
      setMessages(messagesResponse.data.exchanges);
    }

    if (tasksResponse.success && tasksResponse.data.tasks.length > 0) {
      console.log(`✅ ${tasksResponse.data.total} tache(s) trouvee(s)`);
      setTasks(tasksResponse.data.tasks);
    }
  } catch (err) {
    console.error('❌ Erreur chargement conversation:', err);
  } finally {
    setLoadingMessages(false);
    setLoadingTasks(false);
  }
};
```

#### c) Ajout des tasks au thread actif
```typescript
const activeThread: Thread | null = activeConversation
  ? {
      // ... champs existants
      tasks,
      tasksLoading: loadingTasks,
    }
  : null;
```

---

### 4. Panel Droit (`ConversationDetails.tsx`)

**Nouvelle section `renderTasks()`**:

**Position**: Entre `renderPrice()` et `renderPlatformActions()` dans le layout

**Comportement**:
- Affiche un loader pendant le chargement (`thread.tasksLoading`)
- Affiche "Aucune tache active" si liste vide
- Affiche chaque tache avec:
  - Type avec emoji (🧹 Menage, 🚗 Transport, 🎯 Conciergerie, 🔧 Maintenance)
  - Code de la tache (ex: `TSK-001`)
  - Status avec couleur:
    - Vert (#4CAF50): completed, termine
    - Orange (#FF9800): in_progress, en cours
    - Rouge (#F44336): cancelled, annule
    - Gris (t.text3): autres
  - Date planifiee (si disponible)
  - Nom du staff assigne (si disponible)
- Compteur total en bas

**Code actuel**:
```typescript
const renderTasks = () => {
  if (!thread.tasks && !thread.tasksLoading) return null;

  const getTaskStatusColor = (status: string): string => {
    const s = status.toLowerCase();
    if (s.includes('completed') || s.includes('termine')) return '#4CAF50';
    if (s.includes('progress') || s.includes('cours')) return '#FF9800';
    if (s.includes('cancelled') || s.includes('annule')) return '#F44336';
    return t.text3;
  };

  const getTaskTypeLabel = (taskType: string): string => {
    const type = taskType.toLowerCase();
    if (type.includes('cleaning')) return '🧹 Menage';
    if (type.includes('transport')) return '🚗 Transport';
    if (type.includes('concierge')) return '🎯 Conciergerie';
    if (type.includes('maintenance')) return '🔧 Maintenance';
    return `📋 ${taskType}`;
  };

  return (
    <AsideSection title="📋 Taches liees">
      <Stack spacing={1.5}>
        {/* Loader */}
        {thread.tasksLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} sx={{ color: t.primary }} />
          </Box>
        )}

        {/* Aucune tache */}
        {!thread.tasksLoading && thread.tasks && thread.tasks.length === 0 && (
          <Typography sx={{ fontSize: 12, color: t.text3, fontStyle: 'italic', textAlign: 'center', py: 1 }}>
            Aucune tache active
          </Typography>
        )}

        {/* Liste des taches */}
        {!thread.tasksLoading && thread.tasks && thread.tasks.length > 0 && (
          <>
            {thread.tasks.map((task) => (
              <Box
                key={task.taskId}
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.04)',
                    borderColor: t.primary,
                  },
                }}
              >
                <Stack spacing={0.5}>
                  {/* Type + Code */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600 }}>
                      {getTaskTypeLabel(task.type)}
                    </Typography>
                    <Typography sx={{ fontSize: 10, fontFamily: 'Geist Mono', color: t.text3 }}>
                      {task.taskCode}
                    </Typography>
                  </Box>

                  {/* Status */}
                  <Chip
                    label={task.status}
                    size="small"
                    sx={{
                      bgcolor: getTaskStatusColor(task.status),
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 10,
                      height: 20,
                    }}
                  />

                  {/* Date planifiee */}
                  {task.scheduledFor && (
                    <Typography sx={{ fontSize: 10, color: t.text3 }}>
                      📅 {formatDate(task.scheduledFor)}
                    </Typography>
                  )}

                  {/* Staff assigne */}
                  {task.assignedStaff && (
                    <Typography sx={{ fontSize: 10, color: t.text2 }}>
                      👤 {task.assignedStaff.name}
                    </Typography>
                  )}
                </Stack>
              </Box>
            ))}

            {/* Compteur */}
            <Typography sx={{ fontSize: 10, color: t.text4, textAlign: 'center', mt: 1 }}>
              {thread.tasks.length} tache{thread.tasks.length > 1 ? 's' : ''} active{thread.tasks.length > 1 ? 's' : ''}
            </Typography>
          </>
        )}
      </Stack>
    </AsideSection>
  );
};
```

---

## 📐 Design Actuel vs Design Souhaite

### Design Actuel (Implementation de base)

```
┌─────────────────────────────────┐
│ 📋 Taches liees                 │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🧹 Menage      TSK-001       │ │
│ │ [IN_PROGRESS]                │ │
│ │ 📅 18 mai 2026               │ │
│ │ 👤 Marie Dupont              │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🚗 Transport   TSK-002       │ │
│ │ [COMPLETED]                  │ │
│ │ 📅 17 mai 2026               │ │
│ │ 👤 Jean Martin               │ │
│ └─────────────────────────────┘ │
│                                 │
│ 2 taches actives                │
└─────────────────────────────────┘
```

**Caracteristiques actuelles**:
- Box simple avec border
- Status en Chip de couleur
- Informations empilees verticalement
- Hover: border devient primary

---

## 🎨 Points a Ameliorer pour Claude Design

L'implementation actuelle est **fonctionnelle** mais pourrait beneficier d'ameliorations UX/UI:

### 1. Hierarchie Visuelle

**Actuel**: Tout a la meme importance
**Proposition**:
- Status plus proeminente (plus gros, badge au lieu de chip?)
- Type de tache en header avec icone plus grande
- Date et staff en metadata secondaire

### 2. Interactivite

**Actuel**: Hover change juste la bordure
**Propositions**:
- Cliquer pour voir details complets de la tache
- Badge "Nouveau" pour taches recentes (creees < 24h)
- Indication visuelle si tache urgente (deadline proche)

### 3. Organisation

**Actuel**: Liste chronologique simple
**Propositions**:
- Grouper par status (En cours / A venir / Terminees)
- Trier par date planifiee (prochaines en premier)
- Afficher timeline visuelle pour les taches du jour

### 4. Informations Complementaires

**Manquant actuellement**:
- Duree estimee de la tache
- Progression (ex: "2/5 etapes")
- Commentaires/notes
- Photos (pour maintenance)
- Deadline avec alerte si proche

### 5. Actions Rapides

**Manquant actuellement**:
- Bouton "Voir details"
- Bouton "Contacter staff"
- Bouton "Marquer comme complete" (selon permissions)
- Bouton "Signaler probleme"

---

## 📊 Exemples d'Utilisation

### Exemple 1: Guest WhatsApp avec 3 taches

**Contexte**:
- Reservation: SOJ-2026-08A1
- Guest: Sarah Johnson
- Check-in: 18 mai 2026

**Taches affichees**:
1. 🧹 Menage (IN_PROGRESS) - Marie Dupont - 18 mai 10h
2. 🚗 Transport aeroport (ASSIGNED) - En attente - 18 mai 14h
3. 🎯 Welcome pack (COMPLETED) - Jean Martin - 17 mai

### Exemple 2: Message OTA avec 1 tache

**Contexte**:
- Reservation Airbnb: AB-2026-1234
- Channel: Airbnb
- Check-in: 20 mai 2026

**Taches affichees**:
1. 🧹 Menage de depart (CREATED) - Non assigne - 25 mai 11h

### Exemple 3: Aucune tache

**Contexte**:
- Reservation: SOJ-2026-08B2
- Toutes les taches terminees ou annulees

**Affichage**:
```
📋 Taches liees
───────────────
Aucune tache active
```

---

## 🧪 Tests a Effectuer

### Test 1: Chargement Normal
1. Ouvrir `/communications?tab=whatsapp`
2. Selectionner une conversation avec reservation
3. Verifier:
   - [ ] Loader s'affiche pendant chargement
   - [ ] Taches apparaissent dans panel droit
   - [ ] Compteur correct (ex: "3 taches actives")
   - [ ] Chaque tache affiche: type, code, status, date, staff

### Test 2: Aucune Tache
1. Selectionner conversation sans taches
2. Verifier:
   - [ ] Message "Aucune tache active" affiche
   - [ ] Pas d'erreur console

### Test 3: Erreur API
1. Couper srv-task
2. Selectionner conversation
3. Verifier:
   - [ ] Pas de crash
   - [ ] Log erreur dans console
   - [ ] Affiche "Aucune tache active" (fallback)

### Test 4: Performance
1. Selectionner plusieurs conversations rapidement
2. Verifier:
   - [ ] Pas de lag
   - [ ] Taches se chargent en parallele avec messages
   - [ ] Annulation propre si changement rapide

---

## 📁 Fichiers Modifies

```
src/
├── services/
│   └── tasksService.ts                   ✅ +getTasksByReservation()
├── types/
│   ├── tasks.types.ts                     ✅ +ReservationTask, +ReservationTasksResult
│   └── unifiedInbox.types.ts              ✅ Thread.tasks, Thread.tasksLoading
├── components/
│   ├── unified-inbox/
│   │   └── ConversationDetails.tsx        ✅ +renderTasks()
│   └── communications/
│       ├── WhatsAppTabV2.tsx              ✅ Fetch tasks on conversation select
│       ├── StaffWhatsAppTabV2.tsx         ✅ Fetch tasks (moins utilise)
│       └── MessagesOTATabV2.tsx           ✅ Fetch tasks on conversation select
└── docs/
    └── TASKS_INTEGRATION_INBOX.md         ✅ Ce document
```

---

## 🚀 Prochaines Etapes

### Pour l'Utilisateur
1. Tester l'implementation actuelle
2. Verifier que les taches s'affichent correctement
3. Envoyer ce document a Claude Design pour ameliorations

### Pour Claude Design
1. Analyser le design actuel (screenshots + ce doc)
2. Proposer ameliorations UX/UI:
   - Hierarchie visuelle
   - Interactions
   - Informations complementaires
   - Actions rapides
3. Fournir specs detaillees pour implementation

### Pour Implementation Future
- [ ] Ajouter filtres (Actives / Terminees / Toutes)
- [ ] Ajouter tri (Date / Type / Status)
- [ ] Ajouter actions rapides (selon permissions user)
- [ ] Ajouter details expandables
- [ ] Ajouter notifications pour taches urgentes
- [ ] Ajouter timeline visuelle pour taches du jour

---

## 💡 Notes Techniques

### Performance
- Les taches sont chargees en **parallele** avec les messages (Promise.all)
- Pas de re-fetch si on re-selectionne la meme conversation (a implementer si besoin)
- API retourne seulement taches actives par defaut (`includeCompleted=false`)

### Gestion Erreurs
- Erreur API → log console + affichage "Aucune tache active"
- Pas de throw pour eviter crash de l'UI
- Fallback gracieux sur objet vide

### Compatibilite
- WhatsApp Guests: ✅ Reservation toujours presente
- OTA Messages: ✅ Reservation toujours presente
- Staff WhatsApp: ⚠️ Rarement des reservations (support fonctionne quand meme)

---

**Cree par**: Agent Claude Code
**Contexte**: Integration taches dans inbox pour meilleure visibilite operations
**Status**: ✅ Implementation fonctionnelle - En attente design final

**Pour Claude Design**: Ce document contient TOUTES les informations techniques necessaires pour proposer des ameliorations UI/UX. L'implementation actuelle est fonctionnelle mais basique. Libre a toi de proposer un design plus elegant et intuitif!
