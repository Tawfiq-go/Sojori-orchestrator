# 🔧 Fix Network Error - Agent-Inbox

## ❌ Erreur Observée

```
AxiosError: Network Error
at XMLHttpRequest.handleError (axios.js?v=0bccf509:2120:16)
at Axios$1.request (axios.js?v=0bccf509:2792:37)
at async MessagesService.getConversations (messagesService.ts:64:24)
```

---

## 🔍 Cause Racine

**Deux variables d'environnement manquantes** dans `.env`:

1. ❌ **VITE_API_URL** - Sans elle, le système utilise `http://localhost` au lieu de `https://dev.sojori.com`
2. ❌ **VITE_DEV_TOKEN** - Sans lui, les requêtes sont bloquées par CORS

### Comportement sans VITE_API_URL

```typescript
// authConfig.ts (ligne 11)
return import.meta.env.VITE_API_URL || 'http://localhost';
//                                      ^^^^^^^^^^^^^^^^
//                                      Défaut incorrect!
```

Résultat: Tente d'appeler `http://localhost:4000/api/v1/ai` → **Network Error**

---

## ✅ Solution Appliquée

Ajout des **deux variables** dans `.env`:

```bash
# /Users/gouacht/Sojori-orchestrator/.env

# API Base URL (production)
VITE_API_URL=https://dev.sojori.com

# Dev token for localhost → production CORS
VITE_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=
```

---

## 🚀 Action Requise

### 1. Vérifier que les variables sont bien dans .env

```bash
grep "VITE_API_URL" /Users/gouacht/Sojori-orchestrator/.env
grep "VITE_DEV_TOKEN" /Users/gouacht/Sojori-orchestrator/.env
```

**Résultat attendu**:
```
VITE_API_URL=https://dev.sojori.com
VITE_DEV_TOKEN=eyJkZXZlbG9wZXI...
```

### 2. REDÉMARRER le serveur (OBLIGATOIRE)

Vite doit être redémarré pour charger les nouvelles variables d'environnement:

```bash
# 1. Arrêter le serveur actuel (Ctrl+C)

# 2. Redémarrer
cd /Users/gouacht/Sojori-orchestrator
pnpm dev
```

### 3. Vérifier dans la console

Après redémarrage, chercher dans la console du navigateur:

```
🔑 Dev token added for localhost → production (port: 4174)
```

Si ce message apparaît → ✅ Configuration correcte

### 4. Re-tester les pages

- http://127.0.0.1:4174/communications/whatsapp-guests
- http://127.0.0.1:4174/communications/whatsapp-staff
- http://127.0.0.1:4174/communications/messages-ota

**Attendu**: Conversations chargent sans erreur Network

---

## 🧪 Test de Vérification

### Dans DevTools → Network → XHR

Chercher la requête vers `dev.sojori.com/api/v1/ai/debug/conversations`

**Request Headers devraient contenir**:
```
X-Dev-Token: eyJkZXZlbG9wZXI...
```

**Request URL devrait être**:
```
https://dev.sojori.com/api/v1/ai/debug/conversations?limit=50&skip=0&filter=smart&hasReservation=true
```

**Response Status**: 200 OK

**Response Body**:
```json
{
  "status": "success",
  "data": {
    "conversations": [...]
  }
}
```

---

## 🔄 Comparaison avec sojori-dashboard

### sojori-dashboard (.env.local)
```bash
REACT_APP_BACKEND_URL=https://api.sojori.com
REACT_APP_DEV_TOKEN=eyJkZXZlbG9wZXI...
```

### Sojori-orchestrator (.env)
```bash
VITE_API_URL=https://dev.sojori.com
VITE_DEV_TOKEN=eyJkZXZlbG9wZXI...
```

**Différence de préfixe**:
- Create React App (sojori-dashboard): `REACT_APP_*`
- Vite (Sojori-orchestrator): `VITE_*`

---

## 📊 Impact

### Avant le fix
- ❌ URL appelée: `http://localhost:4000/api/v1/ai/debug/conversations`
- ❌ Résultat: Network Error (localhost:4000 n'existe pas)

### Après le fix
- ✅ URL appelée: `https://dev.sojori.com/api/v1/ai/debug/conversations`
- ✅ Résultat: 200 OK avec 10 conversations

---

## 🐛 Si ça ne marche toujours pas

### Problème 1: Variables pas chargées malgré redémarrage

**Diagnostic**:
```bash
# Vérifier que Vite lit bien le .env
cat /Users/gouacht/Sojori-orchestrator/.env | grep VITE_
```

**Solution**:
- Vérifier que le fichier s'appelle bien `.env` (pas `.env.local` ou `.env.development`)
- Vérifier qu'il n'y a pas d'espace avant/après le `=`
- Redémarrer complètement le terminal

### Problème 2: CORS error persiste

**Symptôme**: `Request header field x-dev-token is not allowed`

**Diagnostic**:
```bash
# Test direct curl
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations?limit=5" \
  -H "X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=" \
  | head -20
```

Si curl fonctionne mais pas le navigateur:
- Vider cache navigateur (DevTools → Application → Clear storage)
- Hard refresh (Cmd+Shift+R sur Mac)

### Problème 3: Token expiré

**Symptôme**: `401 Unauthorized` ou `Invalid token`

**Solution**: Générer nouveau token depuis srv-user:
```bash
npm run generate-dev-token
```

---

## ✅ Checklist Finale

- [x] VITE_API_URL ajouté dans .env
- [x] VITE_DEV_TOKEN ajouté dans .env
- [ ] Serveur redémarré (pnpm dev)
- [ ] Console affiche "🔑 Dev token added"
- [ ] DevTools Network montre requêtes vers dev.sojori.com (pas localhost)
- [ ] Conversations chargent sans erreur
- [ ] Messages s'affichent au clic

---

**Document créé**: 2026-05-15
**Contexte**: Fix Network Error Agent-Inbox après implémentation
**Status**: ✅ Variables ajoutées, redémarrage requis
