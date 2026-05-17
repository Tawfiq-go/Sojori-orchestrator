# 🔑 Solution X-Dev-Token Manuel - Agent-Inbox

## ✅ Solution Appliquée

**Approche adoptée**: Ajouter `X-Dev-Token` **manuellement** dans chaque requête du service, comme le font déjà `reservationsService`, `listingsService`, et `calendarService`.

---

## 🔍 Pourquoi Cette Approche?

### Problème avec apiClient.ts global

**Tentative initiale** (ligne 31-44 de apiClient.ts):
```typescript
// ❌ Ne fonctionne PAS pour toutes les requêtes
if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
  apiClient.defaults.headers.common['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
}
```

**Problème**: Le header est ajouté aux `defaults` mais certaines requêtes ne l'héritent pas correctement (timing issue ou cache axios).

### Solution: Ajouter manuellement dans chaque service

**Ce qui fonctionne** (comme reservationsService.ts ligne 95-109):
```typescript
// ✅ Fonctionne à 100%
const headers: Record<string, string> = {};

if (typeof window !== 'undefined') {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0';

  if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
    headers['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
  }
}

const response = await apiClient.get(url, { headers });
```

---

## 📝 Changements Appliqués

### messagesService.ts - 3 méthodes modifiées

#### 1. getConversations (ligne 54-77)

**Avant**:
```typescript
const response = await apiClient.get<ConversationsResponse>(
  `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations`,
  { params: requestParams }
);
```

**Après**:
```typescript
// 🔑 Add X-Dev-Token for localhost → production
const headers: Record<string, string> = {};

if (typeof window !== 'undefined') {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0';

  if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
    headers['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
    console.log('🔑 X-Dev-Token added to conversations request');
  }
}

const response = await apiClient.get<ConversationsResponse>(
  `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations`,
  { params: requestParams, headers }  // ← headers ajouté
);
```

#### 2. getConversationMessages (ligne 135-171)

Même pattern appliqué pour:
```typescript
const response = await apiClient.get<ConversationDetailResponse>(
  `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations/${encodeURIComponent(phone)}`,
  { params: Object.keys(params).length ? params : undefined, headers }
);
```

#### 3. sendMessage (ligne 188-210)

Même pattern appliqué pour:
```typescript
const response = await apiClient.post<SendMessageResponse>(
  `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/send-message`,
  { phone: data.phone, message: data.message },
  { timeout: 15000, headers }
);
```

---

## 🆚 Comparaison avec Autres Services

### reservationsService.ts (référence)
```typescript
// Ligne 95-114
const headers: Record<string, string> = {};

if (typeof window !== 'undefined') {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0';

  if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
    headers['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
    console.log('🔑 X-Dev-Token added to reservations request (fix 404)');
  }
}

const response = await apiClient.get(url, {
  headers,
  validateStatus: (status) => (status >= 200 && status < 300) || status === 404
});
```

### messagesService.ts (nouveau)
```typescript
// Même pattern exact
const headers: Record<string, string> = {};

if (typeof window !== 'undefined') {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0';

  if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
    headers['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
    console.log('🔑 X-Dev-Token added to conversations request');
  }
}

const response = await apiClient.get(url, { params, headers });
```

**Consistance**: ✅ Exactement le même pattern dans tous les services

---

## 🧪 Vérification

### 1. Console Logs

**Après fix**, vous devriez voir dans la console:
```
🔑 Dev token added for localhost → production (port: 4174)
🔑 X-Dev-Token added to conversations request
```

### 2. DevTools Network

**Request Headers** devraient maintenant inclure:
```
X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 3. Response

**Status**: 200 OK
**Body**:
```json
{
  "status": "success",
  "data": {
    "conversations": [
      {
        "phone": "212664473257",
        "name": "tawfiq gouach",
        ...
      }
    ]
  }
}
```

---

## 🚀 Pour Tester

### 1. Redémarrer le serveur

```bash
pnpm dev
```

**Important**: Le fichier `messagesService.ts` a été modifié, le serveur doit recharger.

### 2. Naviguer vers les pages

- http://127.0.0.1:4174/communications/whatsapp-guests
- http://127.0.0.1:4174/communications/whatsapp-staff
- http://127.0.0.1:4174/communications/messages-ota

### 3. Vérifier

✅ **Conversations chargent** sans erreur CORS
✅ **Console affiche** "🔑 X-Dev-Token added to conversations request"
✅ **DevTools Network** montre X-Dev-Token dans headers
✅ **Messages s'affichent** au clic sur conversation

---

## 💡 Pourquoi Cette Approche Est Meilleure

### Avantages

1. **Consistance** ✅
   - Même pattern que reservations, listings, calendar
   - Facile à comprendre pour les futurs développeurs

2. **Contrôle explicite** ✅
   - Chaque service contrôle ses propres headers
   - Pas de magie cachée dans apiClient.ts

3. **Debugging facile** ✅
   - Console log dans chaque service
   - On sait exactement quelle requête ajoute le token

4. **Fonctionne à 100%** ✅
   - Prouvé par reservations/listings/calendar
   - Pas de timing issues

### Inconvénients

1. **Code dupliqué** ⚠️
   - Même bloc de code dans chaque service
   - Mais acceptable pour la clarté

2. **Maintenance** ⚠️
   - Si on change le pattern, il faut update tous les services
   - Mais rare en pratique

---

## 🔧 Alternative Future: Helper Function

**Si duplication devient problème**, créer helper:

```typescript
// src/utils/devTokenHelper.ts
export function getDevTokenHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0';

    if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
      headers['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
    }
  }

  return headers;
}
```

**Usage**:
```typescript
import { getDevTokenHeaders } from '../utils/devTokenHelper';

const response = await apiClient.get(url, {
  params,
  headers: getDevTokenHeaders()
});
```

**Mais pas urgent** - pattern actuel fonctionne bien.

---

## 📋 Services Mis à Jour

| Service | Status | X-Dev-Token Manuel |
|---------|--------|-------------------|
| reservationsService.ts | ✅ Déjà fait | Oui (ligne 95-109) |
| listingsService.ts | ✅ Déjà fait | Oui |
| calendarService.ts | ✅ Déjà fait | Oui |
| **messagesService.ts** | ✅ **FIX APPLIQUÉ** | **Oui (3 méthodes)** |

---

## ✅ Checklist Finale

- [x] messagesService.ts modifié (3 méthodes)
- [x] Pattern identique à reservationsService.ts
- [x] Console logs ajoutés pour debugging
- [ ] Serveur redémarré
- [ ] Pages testées
- [ ] Conversations chargent
- [ ] Messages s'affichent
- [ ] Envoi message fonctionne

---

**Document créé**: 2026-05-15
**Contexte**: Fix CORS en suivant le pattern des autres services
**Status**: ✅ Code modifié, test utilisateur requis
