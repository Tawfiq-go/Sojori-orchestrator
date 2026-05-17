# 📋 Intégration Panneau Détails Réservation & Suggestions IA

**Date**: 2026-05-17
**Objectif**: Ajouter panneau de détails (3e colonne) + vraies suggestions IA à tous les onglets communications

---

## ✅ Modifications Effectuées

### 1. Nouveau Composant: ConversationDetails

**Fichier**: `/src/components/unified-inbox/ConversationDetails.tsx`

Composant réutilisable pour afficher les détails de conversation dans une 3e colonne (basé sur `ChatAside` de LeadsTab).

**Features**:
- Adapté au type de conversation (whatsapp, staff, ota, leads, reviews)
- Affiche infos réservation: guest, propriété, plateforme, dates, prix
- Actions contextuelles selon plateforme (Airbnb Special Offer, liens Booking, etc.)
- Couleurs de badge dynamiques par plateforme

**Structure**:
```tsx
<ConversationDetails
  thread={activeThread}
  type="whatsapp"  // ou staff, ota, leads, reviews
  reservationData={{
    reservationNumber: '...',
    listingName: '...',
    channel: 'Airbnb',
    status: 'Active',
    checkInDate: '...',
    checkOutDate: '...',
    numberOfGuests: 2,
    totalPrice: 150,
    currency: 'EUR',
  }}
  onAction={(action) => {
    // Gérer actions: 'special-offer', 'view-platform', etc.
  }}
/>
```

**Sections affichées**:
- 📋 Détails (nom, téléphone, propriété, plateforme, statut, réservation)
- 📅 Dates (arrivée, départ, nombre de voyageurs)
- 💰 Prix (montant total)
- 💎 Actions Airbnb / 🛎️ Actions Booking (selon plateforme)

---

### 2. Mise à Jour: ConversationThread

**Fichier**: `/src/components/unified-inbox/ConversationThread.tsx`

**Changements**:
1. ✅ Ajout prop `onAISuggestion?: () => void`
2. ✅ Bouton "✨ Suggestion IA" connecté au callback (remplace "AI assist")
3. ✅ Suppression icône microphone (`AttachFile`) de l'input bar
4. ✅ Suppression import `AttachFile` de MUI

**Avant**:
```tsx
<IconButton size="small" sx={{ color: t.text3 }}>
  <AttachFile fontSize="small" />
</IconButton>
<TextField ... />
<IconButton onClick={handleSend}><Send /></IconButton>
```

**Après**:
```tsx
<TextField ... />
<IconButton onClick={handleSend}><Send /></IconButton>
```

---

### 3. Intégration: WhatsAppTabV2

**Fichier**: `/src/components/communications/WhatsAppTabV2.tsx`

**Ajouts**:
1. Import `ConversationDetails` + `AISuggestionModal`
2. État `showAIModal`
3. Prop `onAISuggestion` passée à `ConversationThread`
4. Rendu `ConversationDetails` avec données réservation
5. Modal `AISuggestionModal` avec contexte WhatsApp

**Layout**: 3 colonnes (ThreadsList + ConversationThread + ConversationDetails)

**Données réservation**:
```tsx
reservationData={{
  reservationNumber: activeConversation.reservation_number,
  listingName: activeConversation.listing_name,
  channel: 'WhatsApp',
  status: activeConversation.status || 'Active',
  checkInDate: activeConversation.checkin_date,
  checkOutDate: activeConversation.checkout_date,
}}
```

---

### 4. Intégration: StaffWhatsAppTabV2

**Fichier**: `/src/components/communications/StaffWhatsAppTabV2.tsx`

**Ajouts**: Identiques à WhatsAppTabV2
**Différences**:
- Type: `staff`
- Quick templates adaptés: "✅ Tâche assignée", "🕐 Rappel horaire", "📋 Instructions"
- Données simplifiées (pas de réservation complète)

---

### 5. Intégration: MessagesOTATabV2

**Fichier**: `/src/components/communications/MessagesOTATabV2.tsx`

**Ajouts**: Identiques à WhatsAppTabV2
**Différences**:
- Type: `ota`
- Quick templates adaptés: "📋 Réponse standard", "📅 Confirmer dates", "💰 Détails paiement"
- Channel détecté dynamiquement (Airbnb/Booking/VRBO)
- Action `view-platform` pour ouvrir lien externe

---

## 🎨 Design & UX

### Layout 3 Colonnes
```
┌─────────────────────────────────────────────────────────────┐
│  ThreadsList  │  ConversationThread  │  ConversationDetails │
│    (320px)    │      (flex grow)     │      (280px)         │
│               │                      │                      │
│  - Search     │  - Header           │  - 📋 Détails        │
│  - Filters    │  - Messages scroll  │  - 📅 Dates          │
│  - Conv list  │  - Quick templates  │  - 💰 Prix           │
│               │  - Input bar        │  - 💎 Actions        │
└─────────────────────────────────────────────────────────────┘
```

### Suggestions IA
- Bouton "✨ Suggestion IA" dans header de ConversationThread
- Ouvre `AISuggestionModal` avec contexte conversation
- Modal génère suggestion basée sur historique
- Utilisateur peut éditer puis utiliser suggestion

### Actions Plateforme
- **Airbnb Leads**: Bouton "📨 Envoyer Special Offer" (rouge Airbnb #FF5A5F)
- **Airbnb/Booking confirmés**: Bouton "🔗 Voir sur [plateforme]" (couleur plateforme)

---

## 📊 API & Services

### messagesService

Toutes les APIs nécessaires existent déjà:

**WhatsApp**:
- `getConversations({ hasReservation: true })` - Liste conversations guests
- `getConversations({ hasReservation: false })` - Liste conversations staff
- `getConversationMessages(phone)` - Messages conversation
- `sendMessage({ phone, message })` - Envoyer message

**OTA (via srv-reservations)**:
- `getOTAThreads()` - Liste threads OTA confirmés
- `getOTAMessages(threadId)` - Messages thread
- `sendOTAMessage(threadId, message)` - Envoyer message

**Leads**:
- `getLeads()` - Liste demandes pré-réservation
- `getLeadMessages(threadId)` - Messages lead
- `sendLeadMessage(threadId, message)` - Envoyer message

**Reviews**:
- `getReviews()` - Liste avis clients
- `replyToReview(threadId, reply)` - Répondre avis

---

## 🔄 TODO: Améliorer Suggestions IA

### Actuellement (Mock)
`AISuggestionModal` génère une suggestion hardcodée après 1.5s.

### À Implémenter
1. Créer endpoint backend: `POST /api/v1/ai/generate-suggestion`
2. Payload:
```json
{
  "conversationHistory": [...],
  "guestName": "John Doe",
  "reservationNumber": "RES123",
  "type": "whatsapp",
  "context": {
    "listingName": "...",
    "checkInDate": "...",
    "lastMessage": "..."
  }
}
```
3. Backend utilise OpenAI GPT-4 pour générer suggestion contextuelle
4. Retourne 3 suggestions (court/moyen/long) + score confiance
5. Frontend affiche suggestions dans modal
6. Tracking: enregistrer usage suggestions (acceptée/rejetée/modifiée)

**Fichier à modifier**: `/src/components/communications/AISuggestionModal.tsx` ligne 46

---

## 📦 Fichiers Créés

```
src/
└── components/
    └── unified-inbox/
        └── ConversationDetails.tsx  ✅ Nouveau
```

---

## 📝 Fichiers Modifiés

```
src/
└── components/
    ├── unified-inbox/
    │   └── ConversationThread.tsx        ✅ Modifié
    └── communications/
        ├── WhatsAppTabV2.tsx             ✅ Modifié
        ├── StaffWhatsAppTabV2.tsx        ✅ Modifié
        └── MessagesOTATabV2.tsx          ✅ Modifié
```

---

## 🧪 Tests Manuels

### Checklist Validation

**WhatsApp Guests** (`/communications?tab=whatsapp`):
- [ ] 3 colonnes visibles (liste + thread + détails)
- [ ] Panneau détails affiche: nom, propriété, dates, status
- [ ] Bouton "✨ Suggestion IA" ouvre modal
- [ ] Modal génère suggestion (mock 1.5s)
- [ ] Utiliser suggestion envoie message
- [ ] Pas d'icône microphone dans input

**Staff WhatsApp** (`/communications?tab=staff`):
- [ ] Panneau détails adapté (pas de réservation complète)
- [ ] Quick templates staff corrects
- [ ] Modal IA fonctionne

**Messages OTA** (`/communications?tab=ota`):
- [ ] Panneau détails affiche plateforme (Airbnb/Booking)
- [ ] Couleur badge selon plateforme
- [ ] Action "Voir sur plateforme" disponible
- [ ] Modal IA fonctionne

---

## 🚀 Prochaines Étapes

### Priorité Haute
1. **Backend AI Suggestions**: Implémenter endpoint `/api/v1/ai/generate-suggestion`
2. **Détection Plateforme OTA**: Identifier Airbnb/Booking/VRBO depuis données conversation
3. **Actions Airbnb**: Implémenter modal Special Offer + appel API

### Priorité Moyenne
4. **Liens Externes**: Ouvrir réservations sur Airbnb/Booking (besoin URLs dans données)
5. **Profil Guest**: Implémenter bouton "Profil guest" (actuellement placeholder)
6. **Enrichir Contexte IA**: Ajouter plus de données (historique complet, préférences, etc.)

### Priorité Basse
7. **Aside Responsive**: Masquer panneau détails sur mobile (< 1200px)
8. **Toggle Aside**: Bouton pour afficher/masquer panneau détails
9. **Export Conversation**: Télécharger thread en PDF/TXT

---

## 📖 Références

- **Design source**: Claude Design - Unified Inbox.html (Sojori 25.zip)
- **Exemple implémentation**: `/src/components/communications/LeadsTab.tsx` (lignes 500-629)
- **Service API**: `/src/services/messagesService.ts`
- **Types**: `/src/types/unifiedInbox.types.ts`, `/src/types/messages.types.ts`

---

**Créé par**: Agent Claude Code
**Contexte**: Suite demande utilisateur "ajoute detail reservation comme lead... mettre partout suggestion AI"
