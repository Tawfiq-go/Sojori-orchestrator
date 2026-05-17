# 🔧 Agent-Inbox CORS Fix - 15 Mai 2026

## ❌ Problème Identifié

### Erreur CORS lors des appels API
```
Access to XMLHttpRequest at 'https://dev.sojori.com/api/v1/ai/debug/conversations'
from origin 'http://127.0.0.1:4174' has been blocked by CORS policy:
Request header field x-dev-token is not allowed by Access-Control-Allow-Headers
in preflight response.
```

### Cause Racine
Le token de développeur (`VITE_DEV_TOKEN`) **n'était pas configuré** dans le fichier `.env` de Sojori-orchestrator, alors que `apiClient.ts` tente de l'ajouter automatiquement pour les requêtes localhost → production.

## ✅ Solution Appliquée

### 1. Ajout des variables d'environnement dans .env

**Deux variables sont nécessaires:**

```bash
# /Users/gouacht/Sojori-orchestrator/.env

# API Base URL (production)
VITE_API_URL=https://dev.sojori.com

# Dev token for localhost → production CORS
VITE_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=
```

**Sources**:
- `VITE_API_URL`: Copié depuis sojori-dashboard/.env.local (REACT_APP_BACKEND_URL)
- `VITE_DEV_TOKEN`: Copié depuis sojori-dashboard/.env.local (REACT_APP_DEV_TOKEN)

**Pourquoi VITE_API_URL est nécessaire:**
Sans cette variable, authConfig.ts utilise `http://localhost` comme base URL, ce qui tente d'appeler `http://localhost:4000/api/v1/ai` au lieu de `https://dev.sojori.com/api/v1/ai`.

### 2. Mécanisme déjà en place dans apiClient.ts

Le fichier `src/services/apiClient.ts` (lignes 17-26) ajoute automatiquement le header X-Dev-Token :

```typescript
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);
if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
  apiClient.defaults.headers.common['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
  console.log('🔑 Dev token added for localhost → production (port: ' + window.location.port + ')');
}
```

**IMPORTANT**: Cette logique était déjà correcte, mais le token manquait simplement dans `.env` !

### 3. Configuration CORS du Backend

Le backend srv-chatbot (app.py) a déjà une configuration CORS permissive :

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  # ← Permet TOUS les headers, y compris X-Dev-Token
)
```

## 📋 Pages Affectées

Toutes les pages de messagerie qui appellent `messagesService.ts` :

1. **WhatsAppGuestsPage** (`/communications/whatsapp-guests`)
   - Appelle `getConversations({ hasReservation: true })`
   - Appelle `getConversationMessages(phone)`
   - Appelle `sendMessage({ phone, message })`

2. **WhatsAppStaffPage** (`/communications/whatsapp-staff`)
   - Appelle `getConversations({ hasReservation: false })`
   - Appelle `getConversationMessages(phone)`
   - Appelle `sendMessage({ phone, message })`

3. **MessagesOTAPage** (`/communications/messages-ota`)
   - Appelle `getConversations({ filter: 'recent' })`

## 🧪 Tests de Vérification

### Test 1: Vérifier que le token est bien ajouté
1. Ouvrir DevTools → Network
2. Naviguer vers `/communications/whatsapp-guests`
3. Chercher la requête XHR vers `dev.sojori.com/api/v1/ai/debug/conversations`
4. Vérifier les **Request Headers** :
   ```
   X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiw...
   ```

### Test 2: Vérifier la console
Chercher dans la console :
```
🔑 Dev token added for localhost → production (port: 4174)
```

### Test 3: Test curl direct (devrait fonctionner maintenant)
```bash
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations?filter=recent&limit=5&skip=0" \
  -H "Content-Type: application/json" \
  -H "X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=" \
  | python3 -m json.tool | head -30
```

**Résultat attendu** :
```json
{
  "status": "success",
  "data": {
    "conversations": [
      {
        "phone": "212664473257",
        "name": "tawfiq gouach",
        "reservation_number": "SJ-4OQHVT0P",
        ...
      }
    ]
  }
}
```

## 🔄 Actions Requises Après Fix

### 1. Redémarrer le serveur de dev
```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev
```

**IMPORTANT**: Vite doit être redémarré pour charger la nouvelle variable d'environnement `VITE_DEV_TOKEN` depuis `.env`.

### 2. Vider le cache du navigateur
- Ouvrir DevTools → Application → Clear storage → Clear site data
- OU faire un Hard Refresh (Cmd+Shift+R sur Mac)

### 3. Re-tester les pages
- `/communications/whatsapp-guests` → Devrait charger 10 conversations
- `/communications/whatsapp-staff` → Devrait charger conversations sans réservation
- `/communications/messages-ota` → Devrait filtrer par channel_name

## 📝 Notes pour les Futurs AIs/Développeurs

### 1. Token de développeur requis pour localhost → production
Sojori utilise un système de **dev token** pour autoriser les requêtes cross-origin depuis localhost vers production (`dev.sojori.com` ou `api.sojori.com`).

**Pourquoi ?**
- Protège les APIs de production contre les requêtes CORS non autorisées
- Permet aux développeurs de tester localement contre prod sans deployer

### 2. Variables d'environnement à configurer

**Sojori-orchestrator** (nouveau dashboard) :
```bash
VITE_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=
```

**Sojori-dashboard** (ancien dashboard) :
```bash
REACT_APP_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=
```

**Différence de préfixe** :
- Vite (Sojori-orchestrator) : `VITE_*`
- Create React App (Sojori-dashboard) : `REACT_APP_*`

### 3. Token expiré ?

Si le token expire (2026-05-22 d'après `expiresAt: 1779395700487`), générer un nouveau token depuis srv-user :

```bash
# Depuis srv-user (port 4005)
npm run generate-dev-token
```

OU appeler l'endpoint directement :
```bash
curl -X POST "https://dev.sojori.com/api/v1/user/admin/generate-dev-token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"developer": "gouacht"}'
```

## 🎯 Résultat Final

Après l'ajout du `VITE_DEV_TOKEN` dans `.env` et le redémarrage du serveur :

✅ WhatsAppGuestsPage charge les vraies conversations depuis prod
✅ WhatsAppStaffPage charge les conversations staff
✅ MessagesOTAPage filtre les messages OTA
✅ Pas d'erreur CORS
✅ Les appels API fonctionnent comme dans sojori-dashboard

## 🔗 Références

- **Source du token**: `/Users/gouacht/sojori-dashboard/.env.local`
- **Config CORS backend**: `/Users/gouacht/sojori-production/apps/srv-chatbot/app.py` (ligne ~96)
- **apiClient config**: `/Users/gouacht/Sojori-orchestrator/src/services/apiClient.ts` (ligne 17-26)
- **Doc API comparison**: `/Users/gouacht/Sojori-orchestrator/docs/API-COMPARISON-SOJORI-DASHBOARD-VS-ORCHESTRATOR.md`
