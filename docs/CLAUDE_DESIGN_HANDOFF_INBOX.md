# 📦 HANDOFF COMPLET - Unified Inbox pour Claude Design

**Date**: 2026-05-17
**Mission**: Designer une inbox moderne ultra-professionnelle
**Status**: Package complet prêt pour design

---

## 🎯 OBJECTIF

Transformer l'inbox actuelle (fonctionnelle mais basique) en une **interface moderne, élégante et professionnelle** digne des meilleurs outils SaaS (Linear, Intercom, Front, etc.).

**Ce qui est déjà fait** ✅:
- Structure 3 colonnes (fixe)
- Scroll indépendant par zone
- Animations status messages (✓, ✓✓, ✓✓ bleu)
- Chargement parallèle messages + tâches
- Hauteur responsive (calc(100vh - 200px))

**Ce qu'on veut améliorer** 🎨:
- Design visuel des composants
- Hiérarchie de l'information
- Interactions et micro-animations
- Affichage des tâches (actuellement très basique)
- Quick actions / templates

---

## 📐 STRUCTURE ACTUELLE

### Layout 3 Colonnes

```
┌──────────────────────────────────────────────────────────────┐
│ InboxLayout (Container principal)                            │
│ Height: calc(100vh - 200px) | minHeight: 660px               │
│ overflow: hidden (✅ scroll géré par enfants)                │
├─────────────┬──────────────────────┬──────────────────────────┤
│ ThreadsList │ ConversationThread   │ ConversationDetails      │
│ (320px)     │ (flex: 1)            │ (360px)                  │
│             │                      │                          │
│ ✅ FIXE     │ ✅ FIXE              │ ✅ FIXE                  │
│ ✅ SCROLL   │ ✅ SCROLL            │ ✅ SCROLL                │
└─────────────┴──────────────────────┴──────────────────────────┘
```

### Zone 1: ThreadsList (Gauche - 320px)

**Fichier**: `src/components/unified-inbox/ThreadsList.tsx`

**Structure**:
```
┌─────────────────────┐
│ 🔍 Search bar       │ ← Sticky top
├─────────────────────┤
│ 📋 Thread 1         │ ↕
│ 📋 Thread 2         │ ↕ SCROLL
│ 📋 Thread 3         │ ↕ (overflowY: auto)
│ ...                 │ ↕
└─────────────────────┘
```

**Champs disponibles par Thread**:
```typescript
{
  id: string | number;
  name: string;                    // Nom du contact
  phone?: string;                  // Téléphone
  channel: ChannelType;            // 'wa' | 'ab' | 'bk' | 'em'
  channelColor: string;            // Couleur du channel
  preview: string;                 // Aperçu dernier message
  time: string;                    // "Il y a 2h"
  unread: number;                  // Badge nombre non lus
  avatarColor: string;             // Couleur avatar
  active?: boolean;                // Thread sélectionné
  listingName?: string;            // Nom propriété
  reservationNumber?: string;      // Numéro réservation
  checkInDate?: string;            // Date check-in
  status?: string;                 // "En ligne", etc.
  tasks?: ReservationTask[];       // Tâches liées
  tasksLoading?: boolean;          // Chargement tâches
}
```

**Design actuel**:
- Avatar circulaire (couleur aléatoire basée sur nom)
- Nom + preview sur 2 lignes
- Badge channel (emoji + couleur)
- Badge unread (si > 0)
- Time à droite
- Hover: fond primaryTint
- Active: fond primaryTint + border primary

### Zone 2: ConversationThread (Centre - flex)

**Fichier**: `src/components/unified-inbox/ConversationThread.tsx`

**Structure**:
```
┌─────────────────────────────────────┐
│ HEADER (flexShrink: 0)              │
│ Sarah Johnson · 🇺🇸                 │ ← Sticky top
│ 📱 +1 415 555 0123 · 🟢 En ligne    │
│ · SOJ-2026-08A1                     │
├─────────────────────────────────────┤
│ MESSAGES (flex: 1, overflowY: auto) │
│                                     │
│ [Guest] Bonjour...            12:30 │ ↕
│         ✓✓                          │ ↕ SCROLL
│                                     │ ↕
│ [Sojori] Bienvenue!           12:32 │ ↕
│          ✓✓ (bleu)                  │ ↕
├─────────────────────────────────────┤
│ QUICK TEMPLATES (flexShrink: 0)     │
│ [👋 Bienvenue] [🔑 Code] [📍 GPS]   │
├─────────────────────────────────────┤
│ INPUT BAR (flexShrink: 0)           │
│ [📎] [😊] [Input...] [✨ AI] [➤]    │ ← Sticky bottom
└─────────────────────────────────────┘
```

#### Header Conversation

**Champs utilisés**:
```typescript
thread.name              // "Sarah Johnson"
thread.phone             // "+1 415 555 0123"
thread.status            // "En ligne"
thread.reservationNumber // "SOJ-2026-08A1"
```

**Design actuel**:
```
Sarah Johnson · 🇺🇸
📱 +1 415 555 0123  ·  🟢 En ligne  ·  SOJ-2026-08A1
└─ fontSize: 14, fontWeight: 600
   └─ fontSize: 11, Geist Mono, color: text3
```

**Drapeau détecté par**:
- `+1` → 🇺🇸
- `+33` → 🇫🇷
- `+212` → 🇲🇦

#### Messages

**Champs disponibles par Message**:
```typescript
{
  id: string | number;
  from: 'guest' | 'sojori' | 'you';
  text: string;
  time: string;                     // "12:30"
  isAI?: boolean;                   // Message généré par AI
  type?: 'message' | 'day-separator';
  status?: 'sent' | 'delivered' | 'read';  // ✅ ANIMATIONS
}
```

**Design actuel - Bulles**:
```typescript
// Guest (gauche)
bgcolor: 'rgba(255,255,255,0.04)'
border: `1px solid ${t.border}`
borderRadius: '12px'
maxWidth: '75%'
alignSelf: 'flex-start'

// Sojori (droite)
bgcolor: t.primaryTint
color: t.primary
borderRadius: '12px'
maxWidth: '75%'
alignSelf: 'flex-end'
```

**Status Indicators** (✅ IMPLÉMENTÉ):
```typescript
// Affiché en bas à droite des messages sortants
sent:      ✓        (1 checkmark gris)
delivered: ✓✓       (2 checkmarks gris)
read:      ✓✓       (2 checkmarks BLEU #0084FF)
```

**Implémentation**:
```typescript
{message.status === 'sent' && (
  <Typography sx={{ fontSize: 9, color: t.text4 }}>✓</Typography>
)}
{message.status === 'delivered' && (
  <Typography sx={{ fontSize: 9, color: t.text4 }}>✓✓</Typography>
)}
{message.status === 'read' && (
  <Typography sx={{ fontSize: 9, color: '#0084FF' }}>✓✓</Typography>
)}
```

#### Quick Templates

**Fichier**: `ConversationThread.tsx:271-302`

**Champs disponibles**:
```typescript
{
  id: string;
  label: string;    // "👋 Bienvenue"
  icon: string;     // "👋"
  text: string;     // Texte template
}
```

**Design actuel** (BOUTONS, pas chips):
```typescript
<Button
  startIcon={<span>{template.icon}</span>}
  sx={{
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'none',
    color: t.text2,
    bgcolor: 'rgba(255,255,255,0.04)',
    border: `1px solid ${t.border}`,
    borderRadius: '8px',
    px: 2,
    py: 0.75,
    '&:hover': {
      bgcolor: t.primaryTint,
      borderColor: t.primary,
    },
  }}
>
  {template.label.replace(/^[^\s]+\s/, '')}
</Button>
```

#### Input Bar

**Fichier**: `ConversationThread.tsx:294-366`

**Ordre** (✅ CONFORME Claude Design):
```
[📎 Attach] [😊 Emoji] [Input...........] [✨ AI] [➤ Send]
```

**Design actuel**:
```typescript
// Input
<TextField
  placeholder="Écrire un message…"
  multiline
  maxRows={4}
  sx={{
    flex: 1,
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(255,255,255,0.04)',
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
    },
  }}
/>

// Boutons
<IconButton size="small">
  <AttachFile fontSize="small" />
</IconButton>
```

### Zone 3: ConversationDetails (Droite - 360px)

**Fichier**: `src/components/unified-inbox/ConversationDetails.tsx`

**Structure**:
```
┌────────────────────────────┐
│ ● CONTEXTE CONVERSATION    │ ← Header sticky
│ Réservation active         │
├────────────────────────────┤
│ 📋 Détails                 │ ↕
│   Contact                  │ ↕
│   Téléphone                │ ↕
│   Propriété                │ ↕ SCROLL
│   Plateforme               │ ↕
│   Statut                   │ ↕
│                            │ ↕
│ 📅 Dates                   │ ↕
│   Arrivée: 18 mai          │ ↕
│   Départ: 25 mai           │ ↕
│   Voyageurs: 2             │ ↕
│                            │ ↕
│ 💰 Prix                    │ ↕
│   1200 EUR                 │ ↕
│                            │ ↕
│ 📋 Tâches liées            │ ↕ ← NOUVELLE SECTION
│   [🧹 Ménage TSK-001]      │ ↕
│   [🚗 Transport TSK-002]   │ ↕
│                            │ ↕
│ 💎 Actions Airbnb          │ ↕
│   [Voir sur Airbnb]        │ ↕
├────────────────────────────┤
│ [📋 Voir réservation...]   │ ← Button sticky bottom
└────────────────────────────┘
```

#### Section Détails

**Champs disponibles**:
```typescript
reservationData: {
  reservationNumber?: string;   // "SOJ-2026-08A1"
  listingName?: string;          // "Villa Sunset"
  channel?: string;              // "Airbnb", "Booking.com"
  status?: string;               // "Confirmée"
  checkInDate?: string;          // "2026-05-18"
  checkOutDate?: string;         // "2026-05-25"
  numberOfGuests?: number;       // 2
  totalPrice?: number;           // 1200
  currency?: string;             // "EUR"
  hasReplied?: boolean;          // true
}

thread: {
  name: string;                  // "Sarah Johnson"
  phone?: string;                // "+33612345678"
}
```

#### Section Tâches (✅ NOUVEAU - BASIQUE)

**Fichier**: `ConversationDetails.tsx:196-254`

**Champs disponibles par tâche**:
```typescript
ReservationTask {
  taskId: string;              // "674abc..."
  taskCode: string;            // "TSK-001"
  type: string;                // "cleaning", "transport", "concierge", "maintenance"
  status: string;              // "CREATED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"
  scheduledFor?: string;       // "2026-05-18T10:00:00Z"
  deadline?: string;           // "2026-05-18T14:00:00Z"
  assignedStaff?: {
    name: string;              // "Marie Dupont"
    phone: string;             // "+33612345678"
  } | null;
}
```

**Design actuel** (TRÈS BASIQUE):
```typescript
<Box
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
  {/* Type + Code */}
  <Typography fontSize={11} fontWeight={600}>
    🧹 Ménage
  </Typography>
  <Typography fontSize={10} fontFamily="Geist Mono">
    TSK-001
  </Typography>

  {/* Status */}
  <Chip
    label="IN_PROGRESS"
    sx={{
      bgcolor: '#FF9800',  // Orange
      color: '#fff',
      fontSize: 10,
      height: 20,
    }}
  />

  {/* Date */}
  <Typography fontSize={10} color={t.text3}>
    📅 18 mai 2026
  </Typography>

  {/* Staff */}
  <Typography fontSize={10}>
    👤 Marie Dupont
  </Typography>
</Box>
```

**Mapping Type → Emoji**:
```typescript
cleaning    → 🧹 Ménage
transport   → 🚗 Transport
concierge   → 🎯 Conciergerie
maintenance → 🔧 Maintenance
other       → 📋 {type}
```

**Mapping Status → Couleur**:
```typescript
completed/terminé   → 🟢 #4CAF50
in_progress/cours   → 🟠 #FF9800
cancelled/annulé    → 🔴 #F44336
autres              → ⚪ t.text3
```

---

## 🎨 DESIGN SYSTEM ACTUEL

### Tokens (DashboardV2.components)

```typescript
export const tokens = {
  // Backgrounds
  bg1: '#0A0908',           // Background principal
  bg2: '#1A1817',           // Background secondaire
  bg3: '#2A2726',           // Background tertiaire

  // Text
  text1: '#FAFAF9',         // Text principal
  text2: '#E7E5E4',         // Text secondaire
  text3: '#A8A29E',         // Text tertiaire
  text4: '#78716C',         // Text disabled

  // Brand
  primary: '#F59E0B',       // Amber 500 (jaune/or Sojori)
  primaryTint: 'rgba(245, 158, 11, 0.12)',

  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
};
```

### Typography

```typescript
// Headers
fontSize: 14, fontWeight: 600

// Body
fontSize: 13, fontWeight: 400

// Metadata
fontSize: 11, color: t.text3, fontFamily: 'Geist Mono'

// Small
fontSize: 10, color: t.text4
```

---

## ✅ CE QUI EST DÉJÀ IMPLÉMENTÉ

### 1. Scroll Indépendant
- ✅ ThreadsList: `overflowY: 'auto'`
- ✅ Messages: `flex: 1, overflowY: 'auto'`
- ✅ ConversationDetails: `flex: 1, overflowY: 'auto'`
- ✅ Container: `overflow: 'hidden'`

### 2. Hauteur Responsive
- ✅ `height: calc(100vh - 200px)`
- ✅ `minHeight: 660px`
- ✅ `maxHeight: calc(100vh - 180px)`

### 3. Status Messages Animés
- ✅ sent: ✓ (gris)
- ✅ delivered: ✓✓ (gris)
- ✅ read: ✓✓ (bleu #0084FF)

### 4. Input Bar Conforme
- ✅ Ordre: [📎] [😊] [Input] [✨] [➤]
- ✅ Emoji icon présent

### 5. Quick Templates Style Boutons
- ✅ Boutons (pas chips)
- ✅ startIcon avec emoji
- ✅ Hover → primary

### 6. Header Format Claude
- ✅ Nom + drapeau
- ✅ Téléphone + status + réservation
- ✅ Geist Mono pour metadata

### 7. Panel Titre
- ✅ "● CONTEXTE CONVERSATION"
- ✅ Dot + uppercase + Geist Mono

### 8. Tâches Intégrées
- ✅ API fetching parallèle
- ✅ Section "📋 Tâches liées"
- ✅ Affichage type, status, date, staff
- ⚠️ Design TRÈS basique (à améliorer!)

---

## 🎯 CE QU'ON VEUT AMÉLIORER

### 1. ThreadsList (Gauche)

**Actuellement**: Liste simple
**Souhaité**:
- [ ] Meilleure hiérarchie visuelle (nom > preview > metadata)
- [ ] Badge unread plus proéminent
- [ ] Animation au hover plus smooth
- [ ] Grouping par status (active/snoozed/archived)?
- [ ] Tri/filtres visuels

### 2. Messages (Centre)

**Actuellement**: Bulles basiques
**Souhaité**:
- [ ] Bulles plus modernes (ombres subtiles?)
- [ ] Meilleure typographie
- [ ] Timestamps plus discrets
- [ ] Séparateurs de jours plus élégants
- [ ] Animation apparition messages
- [ ] Indication "en train d'écrire..."
- [ ] Avatar pour messages staff/AI

### 3. Quick Templates

**Actuellement**: Boutons simples en ligne
**Souhaité**:
- [ ] Design plus moderne
- [ ] Icônes plus grandes
- [ ] Scroll horizontal si trop de templates
- [ ] Animation au clic
- [ ] Preview du texte au hover?

### 4. Input Bar

**Actuellement**: Fonctionnel mais basique
**Souhaité**:
- [ ] Design plus moderne
- [ ] Border focus plus visible
- [ ] Bouton Send plus proéminent quand texte présent
- [ ] Compteur caractères pour longs messages
- [ ] Support mentions (@staff)
- [ ] Support emojis picker

### 5. Tâches (PRIORITÉ! 🔥)

**Actuellement**: Box très basique
**Souhaité**:
- [ ] Design professionnel moderne
- [ ] Timeline visuelle pour tâches du jour
- [ ] Status plus visuel (pas juste chip)
- [ ] Actions rapides (voir détails, contacter staff)
- [ ] Grouping par status ou date
- [ ] Indication urgence (deadline proche)
- [ ] Photos pour maintenance
- [ ] Progression (ex: "2/5 étapes")

**Inspiration**: Linear tasks, Asana cards, Monday.com items

### 6. Panel Détails Général

**Actuellement**: Sections empilées simples
**Souhaité**:
- [ ] Meilleure séparation visuelle entre sections
- [ ] Icons plus cohérents
- [ ] Chips plateforme plus beaux (Airbnb rouge, Booking bleu)
- [ ] Prix plus proéminent
- [ ] Timeline check-in/out visuelle

---

## 📦 FICHIERS À MODIFIER

### Fichiers Principaux (à inclure dans le zip)

```
src/components/unified-inbox/
├── InboxLayout.tsx                 ← Container 3 colonnes
├── ThreadsList.tsx                 ← Liste conversations (gauche)
├── ConversationThread.tsx          ← Messages + input (centre)
└── ConversationDetails.tsx         ← Panel détails + tâches (droite)

src/components/communications/
├── WhatsAppTabV2.tsx               ← Utilise InboxLayout (guests)
├── StaffWhatsAppTabV2.tsx          ← Utilise InboxLayout (staff)
└── MessagesOTATabV2.tsx            ← Utilise InboxLayout (OTA)

src/types/
├── unifiedInbox.types.ts           ← Types Thread, Message, etc.
└── tasks.types.ts                  ← Types ReservationTask

src/components/dashboard/
└── DashboardV2.components.jsx      ← Tokens design system
```

### Fichiers de Référence (pour contexte)

```
docs/
├── INBOX_RESPONSIVE_HEIGHT.md           ← Fix hauteur responsive
├── FINAL_CLAUDE_DESIGN_CONFORMITY.md    ← Conformité design
├── TASKS_INTEGRATION_INBOX.md           ← Intégration tâches
└── CLAUDE_DESIGN_HANDOFF_INBOX.md       ← Ce document
```

---

## 🎨 INSPIRATIONS & RÉFÉRENCES

### Inbox Modernes à S'inspirer

1. **Linear** - Tâches et status
2. **Intercom** - Messages et conversations
3. **Front** - Email inbox collaborative
4. **Superhuman** - Speed et shortcuts
5. **Notion** - Hiérarchie information
6. **Slack** - Messages et threads

### Principes de Design

- ✨ **Clarté**: Hiérarchie visuelle évidente
- ⚡ **Rapidité**: Impression de vitesse (animations)
- 🎯 **Focus**: Pas de distraction
- 🌓 **Dark mode**: Design cohérent avec bg sombre
- 📱 **Responsive**: S'adapte à différentes tailles

---

## 📋 CHECKLIST DESIGN À GÉNÉRER

### Pour ThreadsList
- [ ] Card design moderne
- [ ] Badge unread élégant
- [ ] Hover states smooth
- [ ] Avatar design cohérent
- [ ] Metadata hiérarchie claire

### Pour Messages
- [ ] Bulles modernes (guest vs sojori)
- [ ] Status indicators élégants
- [ ] Timestamps discrets
- [ ] Séparateurs jours
- [ ] Animation apparition

### Pour Quick Templates
- [ ] Boutons modernes
- [ ] Icônes grandes et claires
- [ ] Scroll horizontal smooth
- [ ] Hover/active states

### Pour Input Bar
- [ ] Design moderne
- [ ] Focus states
- [ ] Boutons iconographiques
- [ ] Send button proéminent

### Pour Tâches (PRIORITÉ)
- [ ] Card design professionnel
- [ ] Status visuel moderne
- [ ] Timeline/progression
- [ ] Actions rapides
- [ ] Metadata claire (date, staff)
- [ ] Grouping/organisation

### Pour Panel Détails
- [ ] Sections bien séparées
- [ ] Icons cohérents
- [ ] Chips modernes
- [ ] Prix proéminent
- [ ] Boutons actions

---

## 💬 MESSAGE POUR CLAUDE DESIGN

Salut Claude Design! 👋

Je t'envoie un package complet de notre **Unified Inbox** actuellement fonctionnelle mais avec un design basique.

**Mission**: Transformer ça en une inbox **ultra-moderne et professionnelle** digne de Linear/Intercom/Front.

**Ce qui est déjà solide techniquement**:
- ✅ Structure 3 colonnes fixe
- ✅ Scroll indépendant par zone
- ✅ Hauteur responsive
- ✅ Animations status messages
- ✅ Intégration tâches (fetch parallèle)

**Ce qui a besoin de ton talent**:
- 🎨 Design visuel moderne
- 📊 Hiérarchie information
- ✨ Micro-animations
- 🔥 Affichage tâches (actuellement très basique!)

**Fichiers joints**:
- Tous les composants inbox
- Documentation complète
- Types TypeScript avec TOUS les champs disponibles
- Design system actuel (tokens)

**Livrables attendus**:
1. Composants redesignés (code complet)
2. Nouvelles animations/transitions
3. Design moderne pour les tâches (priorité!)
4. Documentation des changements

**Contraintes**:
- Garder la structure 3 colonnes
- Respecter le dark mode (tokens actuels)
- Rester en TypeScript + Material-UI
- Garder les champs de données existants

**Go wild!** Propose ce qu'il y a de mieux. L'objectif: une inbox qui fait dire "Wow!" 🚀

---

**Créé par**: Agent Claude Code
**Pour**: Claude Design
**Package**: Prêt à zipper et envoyer
