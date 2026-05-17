# 🔐 Solution CORS Finale - Agent-Inbox

## ❌ Problème Original

```
Access to XMLHttpRequest at 'https://dev.sojori.com/api/v1/ai/debug/conversations'
from origin 'http://127.0.0.1:4174' has been blocked by CORS policy:
Request header field x-dev-token is not allowed by Access-Control-Allow-Headers
in preflight response.
```

---

## 🔍 Analyse du Problème

### Tentative 1: Utiliser X-Dev-Token (ÉCHEC)

**Approche initiale** (copiée depuis sojori-dashboard):
```typescript
// apiClient.ts
if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
  apiClient.defaults.headers.common['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
}
```

**Résultat**: ❌ Bloqué par CORS

**Pourquoi?**
- Le backend `dev.sojori.com` n'autorise **PAS** le header `X-Dev-Token` dans sa config CORS
- Le preflight OPTIONS échoue car `x-dev-token` n'est pas dans `Access-Control-Allow-Headers`
- Même si le backend srv-chatbot (app.py) a `allow_headers=["*"]`, il y a probablement un reverse proxy (Nginx/Traefik) qui filtre

### Test curl vs Navigateur

**Curl fonctionne** ✅:
```bash
curl "https://dev.sojori.com/api/v1/ai/debug/conversations?limit=2" \
  -H "X-Dev-Token: eyJkZXZlbG9wZXI..."
# → {"status":"success","data":{"conversations":[...]}}
```

**Navigateur échoue** ❌:
- Preflight OPTIONS est envoyé automatiquement par le navigateur
- Backend répond sans autoriser `X-Dev-Token`
- Requête GET est bloquée avant même d'être envoyée

---

## ✅ Solution Finale: Utiliser l'Authentification Utilisateur

### Principe

Au lieu d'utiliser un **dev token global** (`X-Dev-Token`), utiliser le **token d'authentification utilisateur** (`Authorization: Bearer`) qui est **déjà autorisé par CORS**.

### Implémentation

```typescript
// apiClient.ts - Ligne 18-36

// ❌ AVANT (causait CORS error)
if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
  apiClient.defaults.headers.common['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
}

// ✅ APRÈS (utilise auth utilisateur)
// X-Dev-Token commenté, on utilise Authorization: Bearer qui est déjà ajouté
// dans l'interceptor request (ligne 58-66)
```

### Flow d'Authentification

1. **Utilisateur se connecte** → Token JWT stocké dans localStorage
2. **apiClient interceptor** ajoute automatiquement:
   ```typescript
   config.headers.Authorization = `Bearer ${token}`;
   ```
3. **Backend accepte** ce header (déjà dans CORS allow list)
4. **Pas de problème CORS** ✅

---

## 🧪 Vérification

### Avant (avec X-Dev-Token)

**DevTools → Network → XHR → Request Headers**:
```
X-Dev-Token: eyJkZXZlbG9wZXI...
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
→ ❌ CORS error (X-Dev-Token non autorisé)

### Après (sans X-Dev-Token)

**DevTools → Network → XHR → Request Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```
→ ✅ Fonctionne (Authorization est autorisé)

---

## 📋 Changements Appliqués

### 1. apiClient.ts
```typescript
// Ligne 18-36
// X-Dev-Token commenté
console.log('🔐 Using user authentication (Authorization: Bearer) for API calls');
```

### 2. .env
```bash
# VITE_DEV_TOKEN plus nécessaire pour les appels API
# Gardé pour référence future si besoin
VITE_DEV_TOKEN=eyJkZXZlbG9wZXI...

# VITE_API_URL toujours nécessaire
VITE_API_URL=https://dev.sojori.com
```

### 3. Console Log
**Avant**: `🔑 Dev token added for localhost → production`
**Après**: `🔐 Using user authentication (Authorization: Bearer) for API calls`

---

## 🔐 Sécurité

### Approche X-Dev-Token (sojori-dashboard)

**Avantages**:
- Permet de tester sans créer de compte utilisateur
- Token global partagé entre développeurs

**Inconvénients**:
- ❌ Problèmes CORS avec certains backends
- ❌ Moins sécurisé (token partagé)
- ❌ Pas de traçabilité par utilisateur

### Approche Authorization Bearer (Sojori-orchestrator)

**Avantages**:
- ✅ Pas de problème CORS (header déjà autorisé)
- ✅ Plus sécurisé (token par utilisateur)
- ✅ Traçabilité des actions par utilisateur
- ✅ Respect des meilleures pratiques OAuth2/JWT

**Inconvénients**:
- Nécessite que l'utilisateur soit connecté (acceptable pour un dashboard)

---

## 🚀 Démarrage Après Fix

### 1. Arrêter et redémarrer le serveur
```bash
# Le fichier apiClient.ts a été modifié
pnpm dev
```

### 2. Se connecter au dashboard
```
http://127.0.0.1:4174/login
```

**Credentials**: Utiliser un compte admin existant

### 3. Naviguer vers les pages messaging
- http://127.0.0.1:4174/communications/whatsapp-guests
- http://127.0.0.1:4174/communications/whatsapp-staff
- http://127.0.0.1:4174/communications/messages-ota

### 4. Vérifier dans DevTools

**Console**:
```
🔐 Using user authentication (Authorization: Bearer) for API calls
```

**Network → XHR → Request Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response**: 200 OK avec conversations

---

## 🆚 Comparaison avec sojori-dashboard

### sojori-dashboard

**Backend**: Probablement `api.sojori.com` qui autorise `X-Dev-Token` dans CORS

**Config**:
```javascript
// axios.config.js
if (isLocalhost && process.env.REACT_APP_DEV_TOKEN) {
  axios.defaults.headers.common['X-Dev-Token'] = process.env.REACT_APP_DEV_TOKEN;
}
```

**Fonctionne** car `api.sojori.com` autorise ce header.

### Sojori-orchestrator

**Backend**: `dev.sojori.com` qui **N'autorise PAS** `X-Dev-Token` dans CORS

**Solution**: Utiliser `Authorization: Bearer` qui est autorisé.

**Différence backend**:
- `api.sojori.com` vs `dev.sojori.com`
- Config CORS différente (probablement Nginx/Traefik différent)

---

## 🐛 Troubleshooting

### Erreur: "401 Unauthorized"

**Cause**: Token utilisateur expiré ou invalide

**Solution**:
1. Se déconnecter
2. Se reconnecter avec credentials valides
3. Le nouveau token sera automatiquement utilisé

### Erreur: "Network Error" persiste

**Cause**: `VITE_API_URL` pas configuré

**Solution**:
```bash
# Vérifier .env
grep VITE_API_URL .env
# Devrait afficher: VITE_API_URL=https://dev.sojori.com

# Si absent, ajouter
echo "VITE_API_URL=https://dev.sojori.com" >> .env

# Redémarrer
pnpm dev
```

### Question: "Puis-je tester sans me connecter?"

**Réponse**: Non avec l'approche actuelle.

**Alternatives**:
1. Se connecter normalement (recommandé)
2. Configurer le backend pour autoriser `X-Dev-Token` dans CORS
3. Utiliser un proxy local qui enlève le header problématique

---

## 📝 Notes pour Futurs Développeurs

### Pourquoi ne pas juste corriger CORS côté backend?

**Option 1**: Modifier srv-chatbot (app.py) ou le reverse proxy pour autoriser `X-Dev-Token`
- Nécessite accès backend + redéploiement
- Peut avoir des implications sécurité

**Option 2**: Utiliser Authorization Bearer (choisi)
- ✅ Aucun changement backend requis
- ✅ Plus sécurisé
- ✅ Meilleure pratique

### Si vous avez accès au backend

**Pour autoriser X-Dev-Token**, ajouter dans Nginx/Traefik:
```nginx
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Dev-Token' always;
```

Ou dans FastAPI CORS:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*", "X-Dev-Token"],  # Explicite
    ...
)
```

Mais **Authorization Bearer reste la meilleure approche** pour un dashboard authentifié.

---

## ✅ Checklist Finale

- [x] X-Dev-Token commenté dans apiClient.ts
- [x] Console log mis à jour (🔐 Using user authentication)
- [x] VITE_API_URL configuré dans .env
- [ ] Serveur redémarré
- [ ] Utilisateur connecté au dashboard
- [ ] Pages messaging testées
- [ ] Conversations chargent sans erreur CORS

---

**Document créé**: 2026-05-15
**Contexte**: Solution finale CORS après tentatives X-Dev-Token
**Status**: ✅ Fix appliqué, test utilisateur requis
