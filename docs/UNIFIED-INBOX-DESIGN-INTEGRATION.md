# 🎨 Unified Inbox - Integration Design Claude

## 📋 Résumé

Nouveau **Communications Hub Unified Inbox** créé depuis le design Claude Design (Unified Inbox.html).

**Date**: 2026-05-17
**Source design**: `/tmp/claude_code_handoff/site/Unified Inbox.html` (Sojori 25.zip)
**Fix de scroll**: Intégré depuis Sojori (26).zip

---

## ✅ Ce qui a été créé

### 1. Types TypeScript

**Fichier**: `/src/types/unifiedInbox.types.ts`

```typescript
export type ChannelType = 'all' | 'wa' | 'ab' | 'bk' | 'em' | 'vrbo';

export interface Channel {
  id: ChannelType;
  label: string;
  icon: string;
  color?: string;
  count: number;
}

export interface Thread {
  id: string | number;
  name: string;
  phone?: string;
  channel: ChannelType;
  channelColor: string;
  preview: string;
  time: string;
  unread: number;
  avatarColor: string;
  // ... métadonnées additionnelles
}

export interface Message {
  id: string | number;
  from: 'guest' | 'sojori' | 'you';
  text: string;
  time: string;
  isAI?: boolean;
}
```

### 2. Composants React

#### ChannelsRail (Col 1 - 80px)
**Fichier**: `/src/components/unified-inbox/ChannelsRail.tsx`

- Rail vertical avec 5 canaux (Tous, WhatsApp, Airbnb, Booking, Email)
- Icônes colorées par canal
- Badges de compteur (rouge) en haut à droite
- État actif avec bordure ambre
- **Fix scroll**: `minHeight: 0`, `overflow: hidden`

#### ThreadsList (Col 2 - 320px)
**Fichier**: `/src/components/unified-inbox/ThreadsList.tsx`

- Header fixe avec titre + search bar
- Liste scrollable de conversations
- Avatars colorés + badge canal en bas à droite
- Badge unread (compteur ambre)
- État actif avec bordure gauche ambre
- **Fix scroll**: `minHeight: 0`, `overflowY: auto`, `overscrollBehavior: contain`

#### ConversationThread (Col 3 - flex)
**Fichier**: `/src/components/unified-inbox/ConversationThread.tsx`

- Header fixe avec avatar, nom, métadonnées, boutons "Profil guest" + "✨ AI assist"
- Zone messages scrollable avec bulles in/out
- Bulles Sojori AI avec badge "✨ SOJORI AI · auto-réponse"
- Quick templates (chips cliquables)
- Input bar avec attach + send button
- **Fix scroll**: `useLayoutEffect` avec `scrollTop`, pas `scrollIntoView`

#### UnifiedInboxPage (Page principale)
**Fichier**: `/src/pages/UnifiedInboxPage.tsx`

- Container flex avec les 3 colonnes
- Header de page avec titre "💬 Unified Inbox"
- Mock data pour 5 canaux + 7 threads + 4 messages
- Gestion état (activeChannel, activeThread, searchTerm)
- **Fix scroll**: `maxHeight: 620`, `overflow: hidden` sur container

---

## 🎨 Design Appliqué

### Tokens Aurora
Tous les composants utilisent les tokens depuis `DashboardV2.components.jsx`:

```typescript
import { tokens as t } from '../components/dashboard/DashboardV2.components';

// Exemples
t.primary       // Ambre #b8851a
t.primaryTint   // Ambre transparent
t.bg1           // Background blanc
t.border        // Bordures
t.text, t.text2, t.text3, t.text4  // Hiérarchie texte
```

### Couleurs Canaux
- **WhatsApp**: `#25D366` (vert)
- **Airbnb**: `#FF5A5F` (rouge)
- **Booking**: `#003580` (bleu foncé)
- **Email**: `#a78bfa` (violet)
- **Badge unread**: `#ef4444` (rouge vif)

### Spacing & Sizing
- **ChannelsRail**: 80px largeur fixe
- **ThreadsList**: 320px largeur fixe
- **ConversationThread**: flex (prend le reste)
- **Container total**: 620px hauteur fixe
- **Avatars**: 38px (liste) / 36px (header thread)
- **Badge canal**: 16×16px en bas à droite avatar

---

## 🔧 Fix de Scroll Intégré

Tous les composants incluent le fix CSS du Sojori (26).zip :

### Container Principal (UnifiedInboxPage)
```tsx
<Box sx={{
  height: 620,
  maxHeight: 620,      // ← Ferme cascade
  overflow: 'hidden',  // ← Chaque enfant gère son scroll
}}>
  {/* 3 colonnes */}
</Box>
```

### Colonnes Scrollables (ThreadsList, ConversationThread)
```tsx
<Box sx={{
  flex: 1,
  minHeight: 0,                    // ← CRITIQUE pour flex
  overflowY: 'auto',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',   // ← Bloque cascade au parent
}}>
  {/* Contenu scrollable */}
</Box>
```

### Auto-Scroll Messages (ConversationThread)
```tsx
const messagesContainerRef = useRef<HTMLDivElement>(null);

useLayoutEffect(() => {
  const el = messagesContainerRef.current;
  if (!el) return;

  // Auto-scroll uniquement si déjà en bas (style WhatsApp)
  const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  if (wasAtBottom || messages.length === 1) {
    el.scrollTop = el.scrollHeight;  // ← scrollTop direct, pas scrollIntoView
  }
}, [messages.length]);  // ← Dépendance sur length, pas messages
```

---

## 🚀 Utilisation

### Route
```
http://localhost:4174/communications/unified-inbox
```

### Dans App.tsx
```tsx
const UnifiedInboxPage = lazy(() =>
  import('./pages/UnifiedInboxPage').then((module) => ({ default: module.default }))
);

// Route
<Route path="/communications/unified-inbox" element={<LazyRoute><UnifiedInboxPage /></LazyRoute>} />
```

### État Initial
La page utilise **mock data** pour le moment :
- 5 canaux (Tous, WA, AB, BK, EM)
- 7 conversations (Sarah Johnson, Marco Rossi, Aisha Khalil, etc.)
- 4 messages dans le thread actif
- 3 quick templates

---

## 🔌 Prochaines Étapes (Intégration API)

### 1. Remplacer Mock Data par API

#### Charger les canaux
```typescript
// Dans UnifiedInboxPage.tsx
useEffect(() => {
  const loadChannels = async () => {
    const response = await messagesService.getChannelsCounts();
    setChannels(response.data.channels);
  };
  loadChannels();
}, []);
```

#### Charger les threads
```typescript
const loadThreads = async (channelFilter: ChannelType) => {
  const response = await messagesService.getConversations({
    filter: channelFilter,
    limit: 50,
  });
  setThreads(response.data.conversations);
};
```

#### Charger les messages
```typescript
const loadMessages = async (threadId: string | number) => {
  const response = await messagesService.getConversationMessages(
    threadId,
    { limit: 100 }
  );
  setMessages(response.data.exchanges);
};
```

### 2. Implémenter l'Envoi de Messages

```typescript
const handleSendMessage = async (text: string) => {
  if (!activeThread) return;

  try {
    await messagesService.sendMessage({
      phone: activeThread.phone,
      message: text,
      channel: activeThread.channel,
    });

    // Recharger les messages
    await loadMessages(activeThread.id);
  } catch (error) {
    console.error('Erreur envoi message:', error);
  }
};
```

### 3. Quick Templates Dynamiques

```typescript
const loadQuickTemplates = async (context: string) => {
  const response = await messagesService.getQuickTemplates({
    context,  // 'check-in', 'support', 'booking', etc.
    language: 'fr',
  });
  setQuickTemplates(response.data.templates);
};
```

### 4. AI Suggestions

```typescript
const loadAISuggestions = async (threadId: string | number) => {
  const response = await messagesService.getAISuggestions({
    conversationId: threadId,
    count: 3,
  });
  setAISuggestions(response.data.suggestions);
};
```

### 5. Filtrage par Canal

```typescript
const handleSelectChannel = (channelId: ChannelType) => {
  setActiveChannel(channelId);
  loadThreads(channelId);  // Recharger avec filtre
};
```

### 6. Search

```typescript
const handleSearchChange = (term: string) => {
  setSearchTerm(term);
  // Debounce + API call
  debouncedLoadThreads(activeChannel, term);
};
```

---

## 📊 Comparaison avec Pages Existantes

### Pages Anciennes (à migrer?)
- `/communications/whatsapp-guests` - WhatsAppGuestsPage.tsx
- `/communications/whatsapp-staff` - WhatsAppStaffPage.tsx
- `/communications/messages-ota` - MessagesOTAPage.tsx

### Unified Inbox (nouvelle)
- `/communications/unified-inbox` - UnifiedInboxPage.tsx
- **Avantages**:
  - Tous les canaux en un seul endroit
  - Design moderne avec rail de canaux
  - Quick templates + AI suggestions intégrés
  - Fix de scroll robuste
  - Tokens Aurora cohérents

### Recommandation
**Garder les deux** pour le moment :
1. Unified Inbox = vue d'ensemble tous canaux
2. Pages dédiées = vues spécialisées avec filtres avancés

Possibilité de **migrer progressivement** vers Unified Inbox si validation positive.

---

## 🧪 Tests à Effectuer

### Test 1: Scroll Isolé
1. Ouvrir `/communications/unified-inbox`
2. Sélectionner une conversation longue
3. **Vérifier**: Seule la zone messages scroll, pas la liste ni le rail
4. **Vérifier**: Pas de scroll de page

### Test 2: Auto-Scroll Intelligent
1. Remonter dans l'historique messages
2. Envoyer un message
3. **Vérifier**: Le scroll **ne saute pas** en bas (car user lisait l'historique)
4. Descendre manuellement en bas
5. Envoyer un message
6. **Vérifier**: Cette fois le scroll **saute en bas**

### Test 3: Changement de Canal
1. Cliquer sur "WhatsApp" dans le rail
2. **Vérifier**: Liste threads se filtre
3. **Vérifier**: Compteur badge se met à jour

### Test 4: Search
1. Taper dans la search bar
2. **Vérifier**: Threads se filtrent en temps réel
3. **Vérifier**: Pas de lag

### Test 5: Quick Templates
1. Cliquer sur un template "👍 Confirmer arrivée"
2. **Vérifier**: Input se pré-remplit avec le texte
3. **Vérifier**: Possibilité de modifier avant envoi

### Test 6: Mobile Responsive
1. Ouvrir DevTools → mode mobile
2. **Vérifier**: Les 3 colonnes s'adaptent (à implémenter si besoin)

---

## 📁 Structure Fichiers

```
sojori-orchestrator/
├── src/
│   ├── components/
│   │   └── unified-inbox/
│   │       ├── ChannelsRail.tsx          ✅ Créé
│   │       ├── ThreadsList.tsx           ✅ Créé
│   │       └── ConversationThread.tsx    ✅ Créé
│   ├── pages/
│   │   └── UnifiedInboxPage.tsx          ✅ Créé
│   ├── types/
│   │   └── unifiedInbox.types.ts         ✅ Créé
│   └── App.tsx                           ✅ Route ajoutée
└── docs/
    ├── AGENT-INBOX-SCROLL-FIX-APPLIED.md  ✅ Fix scroll doc
    └── UNIFIED-INBOX-DESIGN-INTEGRATION.md ✅ Ce fichier
```

---

## ⚠️ Notes Importantes

### Tokens Aurora
Tous les composants importent les tokens depuis `DashboardV2.components.jsx`. **Ne pas dupliquer les tokens** ailleurs.

### Fix de Scroll
Le fix est **intégré dans chaque composant**. Ne pas modifier les propriétés CSS suivantes sans tester :
- `minHeight: 0` sur colonnes flex
- `overscrollBehavior: 'contain'` sur zones scrollables
- `scrollTop` au lieu de `scrollIntoView()`

### Mock Data
Les données actuelles sont **hardcodées** dans UnifiedInboxPage.tsx. Elles servent de **démo visuelle** et doivent être remplacées par des API calls.

### Performance
- `useLayoutEffect` au lieu de `useEffect` → exécute avant paint, pas de flicker
- Dépendance `messages.length` au lieu de `messages` → évite re-runs inutiles
- Lazy loading des composants dans App.tsx → chargement différé

---

## 🎯 Checklist Validation

- [x] Types TypeScript créés
- [x] ChannelsRail.tsx créé avec tokens Aurora
- [x] ThreadsList.tsx créé avec fix scroll
- [x] ConversationThread.tsx créé avec auto-scroll intelligent
- [x] UnifiedInboxPage.tsx créé avec mock data
- [x] Route ajoutée dans App.tsx
- [x] Fix de scroll intégré partout
- [x] Documentation créée
- [ ] Tests manuels effectués
- [ ] Validation utilisateur
- [ ] Intégration API (à faire)
- [ ] Quick templates dynamiques (à faire)
- [ ] AI suggestions (à faire)

---

## 🚀 Prochaine Action

**Tester dans le navigateur** :
```bash
# Serveur déjà lancé sur port 4174
open http://localhost:4174/communications/unified-inbox
```

Vérifier :
1. Design s'affiche correctement
2. Scroll fonctionne (seules les bonnes zones scroll)
3. Sélection thread fonctionne
4. Input message fonctionne
5. Pas d'erreurs console

---

**Créé par**: Agent Claude Code
**Date**: 2026-05-17
**Source design**: Claude Design - Unified Inbox.html (Sojori 25.zip)
**Fix scroll**: Sojori (26).zip
