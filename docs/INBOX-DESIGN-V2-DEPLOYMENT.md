# 🎨 Inbox Design V2 - Déploiement sur Toutes les Pages

## 📋 Résumé

Le **nouveau design Claude Inbox** (style 2 colonnes avec ThreadsList + ConversationThread) a été appliqué sur **toutes les pages de communications**.

**Date**: 2026-05-17
**Design source**: Claude Design - Unified Inbox.html

---

## ✅ Pages Mises à Jour

### 1. WhatsApp Guests
- **Route**: `/communications/whatsapp-guests`
- **Fichier**: `WhatsAppGuestsPageV2.tsx`
- **Titre**: 💬 WhatsApp Guests
- **Description**: Messagerie clients avec réservations actives
- **API**: `messagesService.getConversations({ hasReservation: true })`
- **Filtres**: Smart, Urgent, Non lus, Récents
- **Quick Templates**:
  - 👋 Bienvenue
  - 🗝️ Code accès
  - 📍 GPS

### 2. WhatsApp Staff
- **Route**: `/communications/whatsapp-staff`
- **Fichier**: `WhatsAppStaffPageV2.tsx`
- **Titre**: 👷 WhatsApp Staff
- **Description**: Messagerie équipe (ménage, maintenance, concierge)
- **API**: `messagesService.getConversations({ hasReservation: false })`
- **Filtres**: Récents, Non lus, Tous
- **Quick Templates**:
  - ✅ Tâche assignée
  - 🕐 Rappel horaire
  - 📋 Instructions

### 3. Messages OTA
- **Route**: `/communications/messages-ota`
- **Fichier**: `MessagesOTAPageV2.tsx`
- **Titre**: 📨 Messages OTA
- **Description**: Messages Airbnb, Booking, VRBO
- **API**: `messagesService.getOTAThreads()` (ou getConversations avec filtre)
- **Filtres**: Tous, Non lus, Récents
- **Quick Templates**:
  - 📋 Réponse standard
  - 📅 Confirmer dates
  - 💰 Détails paiement

---

## 🎨 Design Appliqué

### Structure 2 Colonnes
Toutes les pages utilisent maintenant `<InboxLayout>` qui contient :

```
┌─────────────────────────────────────────────┐
│  ThreadsList (320px)  │  ConversationThread │
│                       │     (flex)          │
│  - Header + Search    │  - Header + Actions │
│  - Liste scrollable   │  - Messages scroll  │
│  - Avatars + badges   │  - Quick templates  │
│                       │  - Input bar        │
└─────────────────────────────────────────────┘
```

**Plus de rail de canaux** sur les pages dédiées (réservé à Unified Inbox).

### Composants Réutilisés
- `InboxLayout` - Container avec fix scroll
- `ThreadsList` - Liste conversations col 1
- `ConversationThread` - Thread messages col 2

### Tokens Aurora
Tous les composants utilisent les tokens:
- `t.primary` - Ambre #b8851a
- `t.bg1`, `t.bg2` - Backgrounds
- `t.border` - Bordures
- `t.text`, `t.text2`, `t.text3` - Texte

---

## 🔧 Modifications Techniques

### Routes Mises à Jour (App.tsx)
```typescript
// Ancien
const WhatsAppGuestsPage = lazy(() =>
  import('./pages/WhatsAppGuestsPage').then(...)
);

// Nouveau
const WhatsAppGuestsPage = lazy(() =>
  import('./pages/WhatsAppGuestsPageV2').then(...)
);
```

### Fix de Scroll Intégré
Toutes les pages incluent le fix CSS:
- `maxHeight: 660` sur container
- `minHeight: 0` sur colonnes flex
- `overflowY: auto`, `overscrollBehavior: contain` sur zones scrollables
- `scrollTop` au lieu de `scrollIntoView()`

### Formatage des Données
Chaque page V2 convertit les données API vers les nouveaux types:

```typescript
// Conversion Conversation → Thread
const formattedThreads: Thread[] = conversations.map((conv) => ({
  id: conv.phone,
  name: conv.name || conv.phone,
  channel: 'wa',  // ou 'ab', 'bk', etc.
  channelColor: '#25D366',
  preview: conv.recent_exchanges[0]?.user_message,
  time: formatRelativeTime(conv.last_message_time),
  unread: conv.unread_count,
  avatarColor: getAvatarColor(conv.name),
  // ... métadonnées
}));

// Conversion MessageExchange → Message
const formattedMessages: Message[] = messages.flatMap((exchange) => {
  // Ajouter séparateur jour si besoin
  // Convertir user_message + ai_response
});
```

---

## 📁 Fichiers Créés

```
sojori-orchestrator/
├── src/
│   ├── components/
│   │   └── unified-inbox/
│   │       ├── InboxLayout.tsx              ✅ Nouveau
│   │       ├── ThreadsList.tsx              ✅ (réutilisé)
│   │       └── ConversationThread.tsx       ✅ (réutilisé)
│   ├── pages/
│   │   ├── WhatsAppGuestsPageV2.tsx         ✅ Nouveau
│   │   ├── WhatsAppStaffPageV2.tsx          ✅ Nouveau
│   │   └── MessagesOTAPageV2.tsx            ✅ Nouveau
│   ├── types/
│   │   └── unifiedInbox.types.ts            ✅ (déjà créé)
│   └── App.tsx                              ✅ Routes mises à jour
└── docs/
    ├── UNIFIED-INBOX-DESIGN-INTEGRATION.md  ✅ Doc design complet
    └── INBOX-DESIGN-V2-DEPLOYMENT.md        ✅ Ce fichier
```

---

## 🚀 Accès aux Pages

### Pages Actives
```
http://localhost:4174/communications/whatsapp-guests
http://localhost:4174/communications/whatsapp-staff
http://localhost:4174/communications/messages-ota
```

### Page Unified Inbox (bonus)
```
http://localhost:4174/communications/unified-inbox
```
Garde le rail de canaux à gauche pour navigation entre types.

---

## 🧪 Tests Effectués

### ✅ Test 1: Chargement Pages
- [x] WhatsApp Guests charge et affiche conversations
- [x] WhatsApp Staff charge et affiche conversations
- [x] Messages OTA charge et affiche threads

### ✅ Test 2: Scroll Isolé
- [x] Seule la zone messages scroll, pas la liste
- [x] Pas de scroll de page
- [x] Auto-scroll intelligent fonctionne

### ✅ Test 3: Interaction
- [x] Clic conversation → messages s'affichent
- [x] Filtres fonctionnent
- [x] Search bar fonctionne
- [x] Quick templates cliquables

### ✅ Test 4: Design
- [x] Tokens Aurora appliqués correctement
- [x] Avatars colorés uniques par conversation
- [x] Badges unread visibles
- [x] Channel badges sur avatars (pour OTA multi-plateformes)

---

## 📊 Comparaison Avant / Après

### Avant (Ancien Design)
- **Layout**: Ancien `ChatLayout` de DashboardV2.components
- **Style**: Basique, bordures grises simples
- **Scroll**: Problématique avec `scrollIntoView()`
- **3 colonnes**: Liste + Thread + Aside (toujours visible)

### Après (Nouveau Design V2)
- **Layout**: Nouveau `InboxLayout` + composants modernes
- **Style**: Design Claude avec tokens Aurora, glass morphism
- **Scroll**: Fix robuste avec `scrollTop` + `overscrollBehavior`
- **2 colonnes**: Liste + Thread (Aside optionnel si besoin)
- **Quick templates**: Intégrés dans le thread
- **AI badges**: "✨ SOJORI AI" sur messages auto

---

## 🔮 Fonctionnalités à Ajouter (Futures)

### Priorité Haute
1. **Envoi messages réel** - Actuellement affiche console.log, brancher vraie API
2. **Quick templates dynamiques** - Charger depuis API selon contexte
3. **AI suggestions** - 3 suggestions contextuelles après chaque message guest

### Priorité Moyenne
4. **Pagination messages** - Charger historique en scrollant vers le haut
5. **Typing indicators** - "Guest est en train d'écrire..."
6. **Read receipts** - Coches bleues quand message lu
7. **Pièces jointes** - Upload images/PDF dans conversation

### Priorité Basse
8. **Aside panel** - Panneau latéral avec détails réservation (optionnel)
9. **Multi-sélection** - Sélectionner plusieurs conversations pour actions bulk
10. **Export conversations** - Télécharger thread en PDF/TXT

---

## ⚠️ Points d'Attention

### Anciennes Pages
Les fichiers `WhatsAppGuestsPage.tsx`, `WhatsAppStaffPage.tsx`, `MessagesOTAPage.tsx` (sans V2) existent toujours mais **ne sont plus utilisés**. Les routes pointent vers les V2.

**Recommandation**: Garder les anciens fichiers temporairement au cas où, puis les supprimer après validation complète.

### API Endpoints
Les pages V2 utilisent les **mêmes endpoints** que les anciennes:
- `messagesService.getConversations()`
- `messagesService.getConversationMessages()`
- `messagesService.sendMessage()`

Pas de changement backend nécessaire.

### Mock Channels
`ThreadsList` attend un tableau `channels` même sur pages dédiées. Solution actuelle: passer un mock avec 1 canal.

```typescript
const mockChannel = [{
  id: 'wa',
  label: 'WhatsApp',
  icon: '💬',
  color: '#25D366',
  count: conversations.length
}];
```

---

## 📖 Documentation Complète

- **Design complet**: `/docs/UNIFIED-INBOX-DESIGN-INTEGRATION.md`
- **Fix scroll technique**: `/docs/AGENT-INBOX-SCROLL-FIX-APPLIED.md`
- **Ce document**: `/docs/INBOX-DESIGN-V2-DEPLOYMENT.md`

---

## ✅ Checklist Validation

- [x] InboxLayout créé et testé
- [x] WhatsAppGuestsPageV2 créée avec design moderne
- [x] WhatsAppStaffPageV2 créée avec design moderne
- [x] MessagesOTAPageV2 créée avec design moderne
- [x] Routes mises à jour dans App.tsx
- [x] Fix de scroll intégré partout
- [x] Tokens Aurora appliqués
- [x] Quick templates configurés par page
- [x] Pages testées dans navigateur
- [ ] Validation utilisateur finale
- [ ] Intégration AI suggestions (à venir)
- [ ] Intégration templates dynamiques (à venir)

---

**Status**: ✅ **Déploiement V2 terminé sur 3 pages principales**

**Prochaines étapes**:
1. Valider le design avec l'utilisateur
2. Créer LeadsInboxPage et ReviewsInboxPage si besoin
3. Brancher les vraies APIs pour envoi messages
4. Ajouter AI suggestions et templates dynamiques

---

**Créé par**: Agent Claude Code
**Date**: 2026-05-17
**Design source**: Claude Design - Unified Inbox.html
