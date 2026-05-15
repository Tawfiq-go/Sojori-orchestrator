# 🧪 API COMPARISON - sojori-dashboard vs Sojori-orchestrator

**Date:** 2026-05-14
**Objectif:** Comparer les appels API entre les deux systèmes pour validation
**Status:** ✅ Prêt pour tests

---

## 📋 TABLE DES MATIÈRES

1. [WhatsApp Conversations API](#1-whatsapp-conversations-api)
2. [WhatsApp Messages API](#2-whatsapp-messages-api)
3. [Send Message API](#3-send-message-api)
4. [Search by Reservation API](#4-search-by-reservation-api)
5. [OTA Messages API](#5-ota-messages-api)
6. [Tests de validation](#6-tests-de-validation)

---

## 1️⃣ WhatsApp Conversations API

### **🎯 Objectif**
Récupérer la liste des conversations WhatsApp avec pagination et filtres.

### **📍 Endpoint Backend**
```
GET /api/v1/ai/debug/conversations
```

---

### **🟦 sojori-dashboard**

#### **Fichier source**
```
/Users/gouacht/sojori-dashboard/src/features/communications/services/communicationsApi.js
Ligne 14-35
```

#### **Code utilisé**
```javascript
// communicationsApi.js - whatsappApi.getConversations()
const whatsappApi = {
  getConversations: async (params = {}) => {
    const limit = params.limit || 25;
    const page = params.page ?? 0;
    const skip = page * limit;

    const requestParams = {
      limit,
      skip,
      filter: params.filter ?? 'recent',
      hasReservation: params.hasReservation
    };

    if (params.sortBy) requestParams.sortBy = params.sortBy;
    if (params.search) requestParams.search = params.search;
    if (params.owner_id) requestParams.owner_id = params.owner_id;

    const response = await axios.get(
      `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations`,
      { params: requestParams }
    );

    return response.data;
  }
};
```

#### **Appelé depuis**
```
/Users/gouacht/sojori-dashboard/src/features/communications/components/WhatsAppTabNew.jsx
Ligne 455 (fonction fetchThreads)
```

#### **Exemple d'appel**
```javascript
const response = await communicationsApi.whatsapp.getConversations({
  page: 0,
  limit: 50,
  filter: 'recent',
  owner_id: filterOwnerId
});
```

---

### **🟩 Sojori-orchestrator**

#### **Fichier source**
```
/Users/gouacht/Sojori-orchestrator/src/services/messagesService.ts
Ligne 28-78
```

#### **Code utilisé**
```typescript
// messagesService.ts - getConversations()
async getConversations(params?: {
  limit?: number;
  skip?: number;
  page?: number;
  search?: string;
  filter?: ConversationFilter;
  hasReservation?: boolean;
  owner_id?: string;
  sortBy?: string;
}): Promise<ConversationsResponse> {
  const limit = params?.limit || 25;
  const page = params?.page ?? 0;
  const skip = params?.skip ?? (page * limit);

  const requestParams: any = {
    limit,
    skip,
    filter: params?.filter ?? 'recent',
  };

  if (params?.hasReservation !== undefined) {
    requestParams.hasReservation = params.hasReservation;
  }
  if (params?.sortBy) requestParams.sortBy = params.sortBy;
  if (params?.search) requestParams.search = params.search;
  if (params?.owner_id) requestParams.owner_id = params.owner_id;

  const response = await apiClient.get<ConversationsResponse>(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations`,
    { params: requestParams }
  );

  return response.data;
}
```

#### **Appelé depuis**
```
/Users/gouacht/Sojori-orchestrator/src/pages/WhatsAppGuestsPage.tsx
Ligne 47 (fonction loadConversations)
```

#### **Exemple d'appel**
```typescript
const response = await messagesService.getConversations({
  filter: activeFilter,
  search: searchTerm || undefined,
  hasReservation: true,
  limit: 50,
});
```

---

### **✅ Test de comparaison**

#### **Test curl prod**
```bash
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations?limit=5&filter=recent&hasReservation=true" \
  | jq '{status:.status, total:.data.total, count:(.data.conversations|length)}'
```

#### **Résultat attendu**
```json
{
  "status": "success",
  "total": 10,
  "count": 5
}
```

#### **Différences**
| Aspect | sojori-dashboard | Sojori-orchestrator | Compatible? |
|--------|------------------|---------------------|-------------|
| URL | ✅ Identique | ✅ Identique | ✅ OUI |
| Params | ✅ Identique | ✅ Identique | ✅ OUI |
| Pagination | `page * limit` | `page * limit` | ✅ OUI |
| Types | JavaScript | TypeScript | ✅ OUI |

---

## 2️⃣ WhatsApp Messages API

### **🎯 Objectif**
Récupérer les messages d'une conversation (2 formats : raw + exchanges).

### **📍 Endpoints Backend**
```
GET /api/v1/ai/debug/messages/:phone         (raw - documents MongoDB)
GET /api/v1/ai/debug/conversations/:phone    (exchanges - groupés)
```

---

### **🟦 sojori-dashboard**

#### **Fichier source**
```
/Users/gouacht/sojori-dashboard/src/features/communications/services/communicationsApi.js
Ligne 88-104 (getRawMessages)
Ligne 37-53 (getMessages - exchanges)
```

#### **Code utilisé**
```javascript
// Format RAW (préféré)
getRawMessages: async (phone, options = {}) => {
  const params = {};
  if (options.limit) params.limit = options.limit;
  if (options.before) params.before = options.before;
  if (options.before_message_id) params.before_message_id = options.before_message_id;

  const response = await axios.get(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/messages/${encodeURIComponent(phone)}`,
    { params, timeout: 60000 }
  );

  return response.data;
}

// Format EXCHANGES (fallback)
getMessages: async (phone, options = {}) => {
  const params = {};
  if (options.limit) params.limit = options.limit;
  if (options.before) params.before = options.before;

  const response = await axios.get(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations/${encodeURIComponent(phone)}`,
    { params }
  );

  return response.data;
}
```

#### **Appelé depuis**
```
/Users/gouacht/sojori-dashboard/src/features/communications/components/WhatsAppTabNew.jsx
Ligne 520 (getRawMessages)
Ligne 531 (getMessages fallback)
```

#### **Logique de fallback**
```javascript
// 1. Essayer getRawMessages (documents MongoDB)
let rows = [];
try {
  const raw = await communicationsApi.whatsapp.getRawMessages(phone, { limit: 80 });
  if (raw?.status === 'success' && raw.data?.messages) {
    rows = rawRowsToHubMessages(raw.data.messages, thread);
  }
} catch (_e) {
  // 2. Fallback sur getMessages (exchanges)
  const res = await communicationsApi.whatsapp.getMessages(phone, { limit: 80 });
  if (res?.status === 'success' && res.data?.exchanges) {
    rows = exchangesToHubMessages(res.data.exchanges, thread);
  }
}
```

---

### **🟩 Sojori-orchestrator**

#### **Fichier source**
```
/Users/gouacht/Sojori-orchestrator/src/services/messagesService.ts
Ligne 86-113 (getRawMessages)
Ligne 121-153 (getConversationMessages - exchanges)
```

#### **Code utilisé**
```typescript
// Format RAW
async getRawMessages(
  phone: string,
  options?: {
    limit?: number;
    before?: string;
    before_message_id?: string;
  }
): Promise<any> {
  const params: any = {};
  if (options?.limit) params.limit = options.limit;
  if (options?.before) params.before = options.before;
  if (options?.before_message_id) params.before_message_id = options.before_message_id;

  const response = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/messages/${encodeURIComponent(phone)}`,
    { params, timeout: 60000 }
  );

  return response.data;
}

// Format EXCHANGES
async getConversationMessages(
  phone: string,
  options?: {
    limit?: number;
    skip?: number;
    before?: string;
    before_message_id?: string;
  }
): Promise<ConversationDetailResponse> {
  const params: any = {};
  if (options?.skip) params.skip = options.skip;
  if (options?.limit) params.limit = options.limit;
  if (options?.before) params.before = options.before;
  if (options?.before_message_id) params.before_message_id = options.before_message_id;

  const response = await apiClient.get<ConversationDetailResponse>(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations/${encodeURIComponent(phone)}`,
    { params }
  );

  return response.data;
}
```

#### **Appelé depuis**
```
/Users/gouacht/Sojori-orchestrator/src/pages/WhatsAppGuestsPage.tsx
Ligne 79 (getConversationMessages - utilise exchanges pour l'instant)
```

#### **⚠️ TODO: Implémenter fallback**
```typescript
// À FAIRE : Ajouter logique de fallback comme sojori-dashboard
try {
  const raw = await messagesService.getRawMessages(conv.phone, { limit: 80 });
  if (raw?.status === 'success' && raw.data?.messages) {
    // Utiliser raw messages
  }
} catch {
  // Fallback sur exchanges
  const response = await messagesService.getConversationMessages(conv.phone, { limit: 80 });
}
```

---

### **✅ Test de comparaison**

#### **Test curl prod (raw)**
```bash
curl -s "https://dev.sojori.com/api/v1/ai/debug/messages/212664473257?limit=5" \
  | jq '{status:.status, phone:.data.phone, count:(.data.messages|length), has_more:.data.has_more_older}'
```

#### **Test curl prod (exchanges)**
```bash
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations/212664473257?limit=5" \
  | jq '{status:.status, phone:.data.phone, count:(.data.exchanges|length)}'
```

#### **Différences**
| Aspect | sojori-dashboard | Sojori-orchestrator | Compatible? |
|--------|------------------|---------------------|-------------|
| URL raw | ✅ Identique | ✅ Identique | ✅ OUI |
| URL exchanges | ✅ Identique | ✅ Identique | ✅ OUI |
| Fallback logic | ✅ Implémenté | ⚠️ À FAIRE | ⚠️ PARTIEL |
| Pagination | ✅ before/before_msg | ✅ before/before_msg | ✅ OUI |

---

## 3️⃣ Send Message API

### **🎯 Objectif**
Envoyer un message WhatsApp depuis le dashboard (admin).

### **📍 Endpoint Backend**
```
POST /api/v1/ai/debug/send-message
```

---

### **🟦 sojori-dashboard**

#### **Fichier source**
```
/Users/gouacht/sojori-dashboard/src/features/communications/services/communicationsApi.js
Ligne 55-67
```

#### **Code utilisé**
```javascript
sendMessage: async (phone, message) => {
  const response = await axios.post(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/send-message`,
    { phone, message },
    { timeout: 15000 }
  );

  return response.data;
}
```

#### **Appelé depuis**
```
/Users/gouacht/sojori-dashboard/src/features/communications/components/WhatsAppTabNew.jsx
Ligne 664 (handleSendMessage)
```

---

### **🟩 Sojori-orchestrator**

#### **Fichier source**
```
/Users/gouacht/Sojori-orchestrator/src/services/messagesService.ts
Ligne 161-183
```

#### **Code utilisé**
```typescript
async sendMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
  const response = await apiClient.post<SendMessageResponse>(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/send-message`,
    {
      phone: data.phone,
      message: data.message,
    },
    { timeout: 15000 }
  );

  return response.data;
}
```

#### **Appelé depuis**
```
/Users/gouacht/Sojori-orchestrator/src/pages/WhatsAppGuestsPage.tsx
Ligne 110 (handleSendMessage)
```

---

### **✅ Test de comparaison**

#### **Différences**
| Aspect | sojori-dashboard | Sojori-orchestrator | Compatible? |
|--------|------------------|---------------------|-------------|
| URL | ✅ Identique | ✅ Identique | ✅ OUI |
| Body | `{phone, message}` | `{phone, message}` | ✅ OUI |
| Timeout | 15s | 15s | ✅ OUI |
| Types | JavaScript | TypeScript | ✅ OUI |

---

## 4️⃣ Search by Reservation API

### **🎯 Objectif**
Rechercher une conversation par numéro de réservation.

### **📍 Endpoint Backend**
```
GET /api/v1/ai/debug/conversations?search=SJ-XXXXX
```

---

### **🟦 sojori-dashboard**

#### **Fichier source**
```
/Users/gouacht/sojori-dashboard/src/features/communications/services/communicationsApi.js
Ligne 69-83
```

#### **Code utilisé**
```javascript
getByReservation: async reservationNumber => {
  const response = await axios.get(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations`,
    {
      params: {
        limit: 25,
        skip: 0,
        search: reservationNumber
      }
    }
  );

  return response.data;
}
```

#### **Appelé depuis**
```
/Users/gouacht/sojori-dashboard/src/features/communications/components/WhatsAppTabNew.jsx
Ligne 352 (recherche par réservation depuis props)
```

---

### **🟩 Sojori-orchestrator**

#### **Fichier source**
```
/Users/gouacht/Sojori-orchestrator/src/services/messagesService.ts
Ligne 189-207
```

#### **Code utilisé**
```typescript
async getByReservation(reservationNumber: string): Promise<ConversationsResponse> {
  const response = await apiClient.get<ConversationsResponse>(
    `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations`,
    {
      params: {
        limit: 25,
        skip: 0,
        search: reservationNumber,
      },
    }
  );

  return response.data;
}
```

#### **Appelé depuis**
```
⚠️ Pas encore utilisé dans les pages
TODO: Ajouter fonctionnalité recherche par réservation
```

---

### **✅ Test de comparaison**

#### **Test curl prod**
```bash
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations?search=SJ-4OQHVT0P&limit=5" \
  | jq '{status:.status, count:(.data.conversations|length), first:(.data.conversations[0].reservation_id)}'
```

#### **Différences**
| Aspect | sojori-dashboard | Sojori-orchestrator | Compatible? |
|--------|------------------|---------------------|-------------|
| URL | ✅ Identique | ✅ Identique | ✅ OUI |
| Params | ✅ Identique | ✅ Identique | ✅ OUI |
| Usage | ✅ Utilisé | ⚠️ À FAIRE | ⚠️ PARTIEL |

---

## 5️⃣ OTA Messages API

### **🎯 Objectif**
Récupérer les messages OTA (Airbnb, Booking, etc.).

### **📍 Endpoint Backend**
```
GET /api/v1/reservations/rentals/get-thread
```

---

### **🟦 sojori-dashboard**

#### **Fichier source**
```
/Users/gouacht/sojori-dashboard/src/features/communications/services/communicationsApi.js
Ligne 112-131
```

#### **Code utilisé**
```javascript
const otaMessagesApi = {
  getThreads: async (params = {}) => {
    const response = await axios.get(
      `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-thread`,
      {
        params: {
          page: params.page || 0,
          limit: params.limit || 25,
          msgLimit: 0,
          reservationNumber: params.search || undefined,
          sortBy: params.sortBy || undefined,
          source: 'reservation',
          ...(params.ownerId ? { ownerId: params.ownerId } : {}),
        }
      }
    );

    return response.data;
  }
};
```

---

### **🟩 Sojori-orchestrator**

#### **Fichier source**
```
⚠️ Pas encore implémenté
TODO: Créer otaMessagesService.ts
```

#### **Code à ajouter**
```typescript
// À CRÉER : src/services/otaMessagesService.ts
import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

class OTAMessagesService {
  async getThreads(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    ownerId?: string;
  }) {
    const response = await apiClient.get(
      `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-thread`,
      {
        params: {
          page: params?.page || 0,
          limit: params?.limit || 25,
          msgLimit: 0,
          reservationNumber: params?.search,
          sortBy: params?.sortBy,
          source: 'reservation',
          ...(params?.ownerId ? { ownerId: params.ownerId } : {}),
        }
      }
    );

    return response.data;
  }
}

export const otaMessagesService = new OTAMessagesService();
export default otaMessagesService;
```

---

### **✅ Test de comparaison**

#### **Différences**
| Aspect | sojori-dashboard | Sojori-orchestrator | Compatible? |
|--------|------------------|---------------------|-------------|
| Service | ✅ Implémenté | ❌ À FAIRE | ❌ NON |
| Page OTA | ✅ Fonctionnel | ⚠️ Mock | ⚠️ PARTIEL |

---

## 6️⃣ Tests de Validation

### **📋 Checklist de tests**

#### **Test 1: Conversations WhatsApp**
```bash
# Dashboard
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations?limit=5" | jq .

# Orchestrator - Vérifier dans DevTools Network
# URL: /api/v1/ai/debug/conversations?limit=25&skip=0&filter=recent&hasReservation=true
```

- [ ] Même endpoint utilisé
- [ ] Mêmes paramètres
- [ ] Même structure réponse
- [ ] Pagination identique

---

#### **Test 2: Messages conversation**
```bash
# Dashboard (essaie raw d'abord)
curl -s "https://dev.sojori.com/api/v1/ai/debug/messages/212664473257?limit=5" | jq .

# Orchestrator (utilise exchanges)
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations/212664473257?limit=5" | jq .
```

- [ ] Raw messages endpoint existe
- [ ] Exchanges endpoint existe
- [ ] TODO: Ajouter fallback logic dans Orchestrator
- [ ] Messages s'affichent correctement

---

#### **Test 3: Envoi message**
```bash
# Test manuel depuis UI
# 1. Ouvrir WhatsApp Guests
# 2. Sélectionner conversation
# 3. Envoyer message "Test depuis orchestrator"
# 4. Vérifier dans DevTools Network: POST /api/v1/ai/debug/send-message
```

- [ ] Endpoint correct
- [ ] Body `{phone, message}` correct
- [ ] Message envoyé avec succès
- [ ] Message visible après refresh

---

#### **Test 4: Recherche réservation**
```bash
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations?search=SJ-4OQHVT0P" | jq .
```

- [ ] Endpoint fonctionne
- [ ] TODO: Ajouter UI recherche dans Orchestrator
- [ ] Résultats corrects

---

#### **Test 5: Messages OTA**
```bash
curl -s "https://dev.sojori.com/api/v1/reservations/rentals/get-thread?page=0&limit=5" | jq .
```

- [ ] TODO: Créer otaMessagesService
- [ ] TODO: Connecter MessagesOTAPage à l'API
- [ ] Vérifier structure données OTA

---

## 🎯 RÉSUMÉ - État d'implémentation

| API | sojori-dashboard | Sojori-orchestrator | Status |
|-----|------------------|---------------------|--------|
| **Conversations** | ✅ Complet | ✅ Complet | ✅ 100% |
| **Messages (exchanges)** | ✅ Complet | ✅ Complet | ✅ 100% |
| **Messages (raw)** | ✅ Complet | ✅ Code prêt | ⚠️ 80% |
| **Send message** | ✅ Complet | ✅ Complet | ✅ 100% |
| **Search reservation** | ✅ Complet | ✅ Code prêt | ⚠️ 80% |
| **OTA threads** | ✅ Complet | ❌ À FAIRE | ❌ 0% |
| **Fallback logic** | ✅ Implémenté | ❌ À FAIRE | ❌ 0% |

---

## 📝 TODO - Prochaines étapes

### **Priorité HAUTE** 🔴

1. **Ajouter fallback logic messages** (comme sojori-dashboard)
   ```typescript
   // WhatsAppGuestsPage.tsx - handleSelectConversation
   try {
     const raw = await messagesService.getRawMessages(phone, { limit: 80 });
     // Use raw
   } catch {
     const exchanges = await messagesService.getConversationMessages(phone, { limit: 80 });
     // Use exchanges
   }
   ```

2. **Implémenter OTA service**
   - Créer `src/services/otaMessagesService.ts`
   - Connecter `MessagesOTAPage.tsx` à l'API
   - Tester avec vraies données

### **Priorité MOYENNE** 🟡

3. **Ajouter UI recherche par réservation**
   - Input de recherche dans WhatsAppGuestsPage
   - Utiliser `messagesService.getByReservation()`

4. **Améliorer pagination messages**
   - Load more (scroll infini)
   - Utiliser `before` / `before_message_id`

### **Priorité BASSE** 🟢

5. **WebSocket real-time** (comme sojori-dashboard)
6. **Mobile responsive**
7. **Templates WhatsApp**

---

## 🧪 GUIDE DE TEST COMPLET

### **Pour un autre AI qui vient après**

1. **Lire ce fichier** en entier
2. **Comparer** les deux implémentations (dashboard vs orchestrator)
3. **Tester** chaque API avec curl
4. **Vérifier** dans DevTools Network que les calls sont identiques
5. **Implémenter** les TODOs manquants
6. **Valider** avec les tests de ce document

---

**📚 FICHIER CRÉÉ POUR:** Faciliter la comparaison et validation des APIs entre les 2 systèmes
**🎯 UTILISATION:** Tests, debugging, onboarding nouveaux développeurs/AI
**✅ STATUS:** Prêt pour utilisation

