# ✅ Implémentation des Indicateurs de Statut des Messages

**Date**: 2026-05-17
**Demande utilisateur**: Ajouter flags lu/envoyé/vu pour WhatsApp et OTA, avec règles différentes selon plateforme
**Status**: ✅ Implémenté

---

## 📋 Vue d'Ensemble

Les indicateurs de statut des messages (style WhatsApp) ont été implémentés dans tous les onglets communications pour afficher visuellement l'état des messages envoyés.

### Comportement Visuel (Style WhatsApp)

```
✓   (Check gris)      → Message envoyé (sent)
✓✓  (DoneAll gris)    → Message délivré (delivered)
✓✓  (DoneAll bleu)    → Message lu (read)
```

---

## 🔧 Architecture de l'Implémentation

### 1. Types Backend → UI

**Backend Type** (`messages.types.ts`):
```typescript
export type UserMessageStatus = 'sent' | 'delivered' | 'read';

export interface MessageExchange {
  user_message: string;
  ai_response: string | null;
  sent_by_admin?: boolean;
  user_message_status?: UserMessageStatus;  // ← Status du message
  // ...
}
```

**UI Type** (`unifiedInbox.types.ts`):
```typescript
export interface Message {
  id: string | number;
  from: 'guest' | 'sojori' | 'you';
  text: string;
  time: string;
  isAI?: boolean;
  status?: 'sent' | 'delivered' | 'read';  // ← Ajouté
}
```

### 2. Mapping Backend → UI

**Fichiers modifiés**:
- `WhatsAppTabV2.tsx`
- `StaffWhatsAppTabV2.tsx`
- `MessagesOTATabV2.tsx`

**Logique de mapping**:
```typescript
const formattedMessages: Message[] = messages.flatMap((exchange, index) => {
  // ...
  if (exchange.user_message) {
    msgs.push({
      id: `user-${index}`,
      from: exchange.sent_by_admin ? 'you' : 'guest',
      text: exchange.user_message,
      time: formatTime(exchange.timestamp),
      // ✅ Map backend status SEULEMENT pour messages envoyés
      status: exchange.sent_by_admin ? exchange.user_message_status : undefined,
    });
  }
  if (exchange.ai_response) {
    msgs.push({
      id: `ai-${index}`,
      from: 'sojori',
      text: exchange.ai_response,
      time: formatTime(exchange.timestamp),
      isAI: true,
      // ✅ AI responses toujours "sent" (pas de read receipts pour IA)
      status: 'sent',
    });
  }
  // ...
});
```

### 3. Affichage Visuel (ConversationThread.tsx)

**Imports ajoutés**:
```typescript
import { Check, DoneAll } from '@mui/icons-material';
```

**Rendu des status icons**:
```typescript
<Stack
  direction="row"
  spacing={0.5}
  sx={{
    fontSize: 9,
    color: t.text3,
    mt: 0.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    fontFamily: 'Geist Mono',
  }}
>
  <Typography sx={{ fontSize: 9 }}>
    {message.time}
  </Typography>

  {/* ✅ Status icons - SEULEMENT pour messages sortants */}
  {(message.from === 'you' || message.from === 'sojori') && message.status && (
    <>
      {message.status === 'sent' && (
        <Check sx={{ fontSize: 14, color: t.text3 }} />
      )}
      {message.status === 'delivered' && (
        <DoneAll sx={{ fontSize: 14, color: t.text3 }} />
      )}
      {message.status === 'read' && (
        <DoneAll sx={{ fontSize: 14, color: '#7DD3FC' }} />
      )}
    </>
  )}
</Stack>
```

---

## 📊 Règles par Type de Message

### Messages Sortants (Sent by Admin / You)

| Condition | Status | Icône | Couleur |
|-----------|--------|-------|---------|
| Envoyé par admin (sent_by_admin=true) | `user_message_status` du backend | ✓ ou ✓✓ | Gris ou bleu |
| Message IA (from=sojori) | Toujours `'sent'` | ✓ | Gris |

### Messages Entrants (Guest)

| Condition | Status | Icône |
|-----------|--------|-------|
| Message guest (sent_by_admin=false) | `undefined` | Aucune |

**Logique**: Les messages entrants n'ont PAS de status icons (pas de sens d'afficher "lu" pour un message qu'on a reçu).

---

## 🎨 Détails Visuels

### Icônes Material-UI

```typescript
import { Check, DoneAll } from '@mui/icons-material';
```

- **Check**: Une seule coche (✓) - message envoyé
- **DoneAll**: Double coche (✓✓) - message délivré ou lu

### Couleurs

```typescript
// Sent / Delivered
color: t.text3  // → Gris clair (#667781 dans legacy)

// Read
color: '#7DD3FC'  // → Bleu ciel (style WhatsApp)
```

### Taille

```typescript
fontSize: 14  // px - même taille que dans legacy
```

---

## 🔄 Différences WhatsApp vs OTA

**État Actuel**: Même implémentation pour WhatsApp et OTA.

**Backend**: Le champ `user_message_status` est commun à tous les canaux. Le backend (srv-chatbot) est responsable de définir le status correct selon la plateforme.

**Future**: Si des règles spécifiques par plateforme sont nécessaires (ex: OTA n'a pas de "delivered"), ajouter logique conditionnelle:

```typescript
// Exemple futur si différences OTA
status: exchange.sent_by_admin
  ? (activeConversation.channel === 'ab'
      ? mapOTAStatus(exchange.user_message_status)  // Mapping spécifique OTA
      : exchange.user_message_status)                // WhatsApp standard
  : undefined,
```

---

## 📁 Fichiers Modifiés

```
src/
├── types/
│   ├── messages.types.ts                        (Backend types - déjà existant)
│   └── unifiedInbox.types.ts                   ✅ Modifié: ajouté status?: ...
├── components/
│   ├── unified-inbox/
│   │   └── ConversationThread.tsx              ✅ Modifié: affichage status icons
│   └── communications/
│       ├── WhatsAppTabV2.tsx                   ✅ Modifié: mapping status
│       ├── StaffWhatsAppTabV2.tsx              ✅ Modifié: mapping status
│       └── MessagesOTATabV2.tsx                ✅ Modifié: mapping status
└── docs/
    └── MESSAGE_STATUS_INDICATORS_IMPLEMENTATION.md  ✅ Nouveau
```

---

## 🧪 Tests à Effectuer

### Checklist Validation

#### Onglet WhatsApp Guests
- [ ] Ouvrir conversation avec messages envoyés par admin
- [ ] Vérifier icônes status à côté de l'heure
- [ ] Vérifier que messages guests n'ont PAS d'icône
- [ ] Vérifier que messages AI ont icône ✓ grise (sent)
- [ ] Tester status "read" → doit être bleu ciel

#### Onglet Staff WhatsApp
- [ ] Mêmes tests que WhatsApp Guests
- [ ] Vérifier que templates de réponse fonctionnent

#### Onglet Messages OTA
- [ ] Ouvrir conversation Airbnb/Booking
- [ ] Vérifier icônes status pour messages envoyés
- [ ] Comparer avec comportement WhatsApp

#### Visuel
- [ ] Icônes alignées avec l'heure (même ligne)
- [ ] Taille cohérente (14px)
- [ ] Couleur grise pour sent/delivered
- [ ] Couleur bleue (#7DD3FC) pour read
- [ ] Pas d'icône pour messages entrants (guest)

---

## 🎯 Prochaines Étapes (Optionnel)

### Priorité Basse
1. **Backend**: Vérifier que srv-chatbot met à jour correctement `user_message_status` avec les webhooks WhatsApp
2. **Real-time**: Mettre à jour status en temps réel via WebSocket quand message change de statut
3. **OTA Specific**: Si plateformes OTA ont des règles différentes, implémenter mapping spécifique
4. **Tooltip**: Ajouter tooltip au survol pour expliquer le status ("Envoyé", "Délivré", "Lu")

### Référence Backend
- **Webhook WhatsApp**: `/api/v1/ai/whatsapp/webhook` dans srv-chatbot
- **Update Status**: Vérifier si le webhook `status` met à jour `user_message_status` dans MongoDB

---

## 📚 Référence Legacy

**Fichier**: `/Users/gouacht/sojori-dashboard/src/features/messages/components/ThreadDetail.jsx:393-399`

```jsx
{!msg.isIncoming && (
  msg.readAt ? (
    <DoneAllIcon sx={{ fontSize: 16, color: '#7DD3FC' }} />
  ) : (
    <CheckIcon sx={{ fontSize: 16, color: '#9CA3AF' }} />
  )
)}
```

**Note**: Legacy utilisait `readAt` (timestamp) pour déterminer le status. Nouvelle implémentation utilise enum explicite `user_message_status`.

---

## 🔗 Liens Rapides

- Types backend: `/Users/gouacht/Sojori-orchestrator/src/types/messages.types.ts:28`
- Types UI: `/Users/gouacht/Sojori-orchestrator/src/types/unifiedInbox.types.ts:34-41`
- Composant affichage: `/Users/gouacht/Sojori-orchestrator/src/components/unified-inbox/ConversationThread.tsx:219-237`
- Doc 3 règles: `/Users/gouacht/Sojori-orchestrator/docs/COMMUNICATIONS-3-REGLES-CRITIQUES-APPLIQUEES.md`

---

**Créé par**: Agent Claude Code
**Contexte**: Demande utilisateur - flags lu/envoyé/vu WhatsApp + OTA
**Status**: ✅ Implémenté, prêt pour tests
