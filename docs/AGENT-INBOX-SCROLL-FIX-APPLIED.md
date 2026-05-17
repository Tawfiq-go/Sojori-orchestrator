# ✅ Agent Inbox - Scroll Fix Appliqué

## 📋 Résumé

Le **fix CSS pour le problème de scroll de l'inbox** fourni par Claude Design a été appliqué avec succès dans Sojori-orchestrator.

**Date d'application**: 2026-05-17
**Source**: `Downloads/Sojori (26).zip` - Claude Design delivery

---

## 🐛 Problème Corrigé

### Symptômes
- Lors du chargement de nouveaux messages, **toute la page scrollait** au lieu de juste la zone des messages
- La **liste des conversations (colonne gauche) bougeait** aussi
- Effet visuel perturbant : "tout bouge en même temps"

### Cause Racine (3 bugs empilés)
1. **`scrollIntoView()` remonte la cascade DOM** - L'API parcourt tous les ancêtres scrollables et les scroll un par un
2. **`min-height: 0` manquant sur flex children** - Bug flexbox classique. Un enfant `flex: 1 + overflow: auto` refuse de rétrécir sans `minHeight: 0`
3. **`overflow: hidden` insuffisant** - Sans `overflow: hidden` sur chaque colonne, la cascade scroll remonte du thread → grid → page

---

## ✅ Solution Appliquée

### 1. Composants Corrigés

**Fichier**: `/src/components/dashboard/DashboardV2.components.jsx`

#### ChatLayout (lignes 1386-1442)
```jsx
export const ChatLayout = React.memo(function ChatLayout({ children, mobileView = 'both' }) {
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '300px 1fr 280px', lg: '320px 1fr 300px' },
      height: 660,
      maxHeight: 660,           // ← FIX: Ferme la cascade scroll
      overflow: 'hidden',
      '& > *': {
        height: '100%',
        minHeight: 0,            // ← FIX FLEX CRITIQUE
        minWidth: 0,             // Pour ellipsis dans la liste
        overflow: 'hidden',      // Chaque colonne contient son scroll
      },
    }}>{children}</Box>
  );
});
```

#### ConversationList (lignes 1444-1489)
```jsx
export function ConversationList({ conversations, activeId, onSelect }) {
  return (
    <Box sx={{
      height: '100%',
      minHeight: 0,              // ← FIX FLEX
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header fixe */}
      <Box sx={{ p: '14px 16px', flexShrink: 0 }}>
        {/* Search bar */}
      </Box>

      {/* Liste scrollable */}
      <Box sx={{
        flex: 1,
        minHeight: 0,                    // ← FIX FLEX OBLIGATOIRE
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',   // ← Empêche cascade au parent
      }}>
        {conversations.map(c => <ConversationItem ... />)}
      </Box>
    </Box>
  );
}
```

#### ChatThread (lignes 1532-1680)
```jsx
export function ChatThread({ conv, messages, onSend }) {
  const messagesContainerRef = React.useRef(null);  // ← Changé: ref sur container

  // ✅ FIX SCROLL: scrollTop direct au lieu de scrollIntoView
  React.useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    // Auto-scroll uniquement si déjà en bas (comme WhatsApp)
    const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (wasAtBottom || messages?.length === 1) {
      el.scrollTop = el.scrollHeight;  // ← scroll DIRECT, pas scrollIntoView
    }
  }, [messages?.length]);  // ← Dépendance sur length, pas messages

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Header fixe */}
      <Stack sx={{ p: '12px 18px', flexShrink: 0 }}>
        {/* Avatar, name, actions */}
      </Stack>

      {/* Messages scrollable */}
      <Box
        ref={messagesContainerRef}   // ← FIX: Ref sur le container scrollable
        sx={{
          flex: 1,
          minHeight: 0,                    // ← FIX FLEX OBLIGATOIRE
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',   // ← Empêche cascade
          p: 2.25,
        }}
      >
        {messages.map((m, i) => <Message ... />)}
        {/* Plus de <div ref={messagesEndRef} /> */}
      </Box>

      {/* Input fixe */}
      <Box sx={{ p: '12px 18px', flexShrink: 0 }}>
        {/* TextField + send button */}
      </Box>
    </Box>
  );
}
```

### 2. Pages Nettoyées

Les pages suivantes ont été nettoyées pour **supprimer l'ancien pattern** `scrollIntoView()` :

#### `/src/pages/WhatsAppGuestsPage.tsx`
- ❌ Supprimé : `const messagesEndRef = useRef<HTMLDivElement>(null);`
- ❌ Supprimé : `useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);`
- ❌ Supprimé : `<div ref={messagesEndRef} />`
- ❌ Supprimé : import `useRef` (plus utilisé)

#### `/src/pages/WhatsAppStaffPage.tsx`
- ❌ Supprimé : `const messagesEndRef = useRef<HTMLDivElement>(null);`
- ❌ Supprimé : `useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);`
- ❌ Supprimé : `<div ref={messagesEndRef} />`
- ❌ Supprimé : import `useRef` (plus utilisé)

#### `/src/pages/MessagesOTAPage.tsx`
- ✅ Déjà propre, n'utilisait pas `scrollIntoView()`

---

## 🎁 Bonus Inclus

### 1. Auto-scroll Intelligent (style WhatsApp)
Le scroll ne saute en bas **que si l'user était déjà en bas** (seuil 80px). Si l'user a remonté pour lire un ancien message → on ne dérange pas.

```jsx
const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
if (wasAtBottom || messages?.length === 1) {
  el.scrollTop = el.scrollHeight;
}
```

### 2. useLayoutEffect au lieu de useEffect
Exécute **avant le paint**, donc pas de flicker visuel.

### 3. Dependency sur `messages.length`
Au lieu de `messages` → évite les re-runs sur des références différentes mais même contenu.

---

## 🚀 Comment Tester

### 1. Accéder aux pages
Le serveur dev tourne déjà sur `localhost:4174` (PID 67627).

```bash
# Vérifier que le serveur tourne
lsof -i :4174

# Ouvrir les pages
open http://localhost:4174/communications/whatsapp-guests
open http://localhost:4174/communications/whatsapp-staff
open http://localhost:4174/communications/messages-ota
```

### 2. Tests à effectuer

#### ✅ Test 1: Scroll isolé
1. Charger une conversation longue (50+ messages)
2. **Vérifier**: La liste gauche **ne bouge pas** quand les messages s'affichent
3. **Vérifier**: Seule la zone des messages scroll

#### ✅ Test 2: Auto-scroll intelligent
1. Remonter dans l'historique des messages (scroll up)
2. Recevoir un nouveau message (ou en envoyer un)
3. **Vérifier**: Le scroll **ne saute pas** en bas (car l'user lisait l'historique)
4. Descendre manuellement en bas
5. Recevoir un nouveau message
6. **Vérifier**: Cette fois le scroll **saute en bas** (car l'user était déjà en bas)

#### ✅ Test 3: Performance
1. Ouvrir la console navigateur
2. Vérifier qu'il n'y a **pas de console.warn** ou de re-renders excessifs
3. Le composant `ChatLayout` doit se re-render **seulement quand nécessaire**

#### ✅ Test 4: Mobile responsive
1. Ouvrir DevTools → mode mobile
2. **Vérifier**: Les 3 colonnes se réduisent à 1 colonne sur mobile
3. **Vérifier**: Pas de scroll horizontal de page

---

## ⚠️ Notes Importantes

### Composants Legacy Non Touchés
Les anciens composants "Tab" dans `/src/components/communications/` utilisent encore `scrollIntoView()` :
- `WhatsAppTab.tsx`
- `StaffWhatsAppTab.tsx`
- `MessagesOTATab.tsx`
- `LeadsTab.tsx`

**Raison**: Ces composants sont utilisés dans `CommunicationsHubPage.tsx` (page legacy avec onglets).
**Recommandation**: Migrer cette page vers les nouvelles pages dédiées, puis supprimer les anciens composants.

### Re-renders (Bonus facultatif)
Si `ChatLayout` se re-render 8× au chargement, optimiser avec `useMemo` :

```jsx
// Dans le parent qui rend <ChatLayout>
const conversationList = React.useMemo(
  () => <ConversationList conversations={conversations} ... />,
  [conversations]
);
const chatThread = React.useMemo(
  () => <ChatThread messages={messages} ... />,
  [messages]
);
```

---

## 📖 Références

- **Source du fix**: `Downloads/Sojori (26).zip` - Claude Design
- **README original**: `/tmp/delivery/sojori-inbox-scroll-fix/README.md`
- **Diagnostic complet**: Voir README dans le ZIP

### Fichiers Clés
- `/src/components/dashboard/DashboardV2.components.jsx` - Composants corrigés (ChatLayout, ConversationList, ChatThread)
- `/src/pages/WhatsAppGuestsPage.tsx` - Page Guests nettoyée
- `/src/pages/WhatsAppStaffPage.tsx` - Page Staff nettoyée
- `/src/pages/MessagesOTAPage.tsx` - Page OTA (déjà propre)

---

## ✅ Checklist de Validation

- [x] Fix CSS appliqué dans `ChatLayout` (maxHeight, minHeight, overflow)
- [x] Fix CSS appliqué dans `ConversationList` (minHeight, overscrollBehavior)
- [x] Fix CSS appliqué dans `ChatThread` (minHeight, overscrollBehavior, scrollTop)
- [x] `scrollIntoView()` remplacé par `scrollTop` dans `ChatThread`
- [x] `useLayoutEffect` au lieu de `useEffect`
- [x] Ancien pattern supprimé dans `WhatsAppGuestsPage.tsx`
- [x] Ancien pattern supprimé dans `WhatsAppStaffPage.tsx`
- [x] Serveur dev vérifié (tourne sur port 4174)
- [ ] Tests manuels effectués (à faire par l'utilisateur)
- [ ] Validation finale (ouvrir pages dans navigateur)

---

**Status**: ✅ **Fix appliqué et prêt pour tests utilisateur**

**Prochaine étape**: Tester manuellement les 3 pages dans le navigateur et valider le comportement de scroll.
