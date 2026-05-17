# 🤖 Configuration Tests pour Agents IA

Ce guide explique comment configurer l'environnement pour que les agents IA puissent tester les APIs sans problèmes d'authentification.

---

## 🎯 Problème

Les agents doivent tester les APIs backend (`dev.sojori.com`) depuis le frontend local, mais :
- ❌ Le X-Dev-Token seul ne suffit pas
- ❌ Le backend demande un JWT token valide
- ❌ Les agents ne peuvent pas se "connecter" facilement

---

## ✅ Solution : Token de Test Persistant

### Étape 1 : Obtenir un Token Valide

**Option A - Depuis le navigateur (recommandé) :**

1. Connecte-toi sur http://127.0.0.1:4174
2. Ouvre la console du navigateur (F12)
3. Copie ce code :

```javascript
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}
const token = getCookie('sojori_token');
console.log('SOJORI_API_TOKEN=' + token);
```

4. Copie le token affiché
5. Ajoute-le dans `.env.local` :

```bash
cd /Users/gouacht/Sojori-orchestrator
echo "VITE_TEST_TOKEN=<TON_TOKEN_ICI>" >> .env.local
```

**Option B - Générer un token de test (backend) :**

Demande à un dev backend de créer un token de test qui ne expire pas pendant 30 jours.

---

### Étape 2 : Configurer le Frontend pour Utiliser le Token de Test

Modifie `.env.local` :

```bash
# Mode dev : Bypass auth frontend
VITE_DISABLE_AUTH=true

# Token de test pour les appels API
VITE_TEST_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Dev token pour CORS
VITE_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIi...
```

---

### Étape 3 : Modifier apiClient.ts pour Utiliser le Token de Test

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/services/apiClient.ts`

Ajoute après ligne 26 :

```typescript
// 🧪 TEST MODE: Use test token if available
const TEST_TOKEN = import.meta.env.VITE_TEST_TOKEN;
if (isLocalhost && TEST_TOKEN) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${TEST_TOKEN}`;
  console.log('🧪 Test token configured for API calls');
}
```

---

## 🧪 Vérification

Teste que ça fonctionne :

```bash
# Lance le frontend
cd /Users/gouacht/Sojori-orchestrator
npm run dev

# Teste une API depuis la console du navigateur
fetch('https://dev.sojori.com/api/v1/listing/listings?page=0&limit=5')
  .then(r => r.json())
  .then(console.log)
```

Tu devrais voir les données, pas une erreur 401.

---

## 📋 Prompt pour les Agents

Maintenant, donne ce prompt aux agents :

```
SETUP DE TEST - TOKEN CONFIGURÉ

Le token de test est déjà configuré dans .env.local.
Tu peux maintenant :

1. Accéder au frontend sans login : http://127.0.0.1:4174/dashboard
2. Appeler les APIs directement : https://dev.sojori.com/api/v1/*

EXEMPLES DE TESTS :

# Listings
curl -H "Authorization: Bearer $VITE_TEST_TOKEN" \
     https://dev.sojori.com/api/v1/listing/listings?page=0&limit=5

# Dashboard stats
curl -H "Authorization: Bearer $VITE_TEST_TOKEN" \
     https://dev.sojori.com/api/v1/admin/dashboard/stats

IMPORTANT :
- ✅ Toutes les APIs sont accessibles avec le token de test
- ✅ Documente les écarts dans docs/AI-READ-API-PARITY.md
- ✅ Compare avec l'ancien dashboard (sojori-dashboard)

Maintenant, procède avec tes tests.
```

---

## 🔐 Sécurité

**⚠️ Important :**
- Le token de test est valide pendant 30 jours maximum
- NE JAMAIS commit `.env.local` dans git
- Le token de test a les mêmes permissions qu'un compte Admin
- À utiliser UNIQUEMENT en développement local

---

## 🐛 Troubleshooting

### "401 Unauthorized" malgré le token

```bash
# Vérifier que le token est bien défini
cat .env.local | grep VITE_TEST_TOKEN

# Vérifier qu'il n'a pas expiré (JWT decode)
node -e "console.log(JSON.parse(Buffer.from('HEADER.PAYLOAD.SIGNATURE'.split('.')[1], 'base64').toString()))"
```

### "CORS error"

```bash
# Vérifier que VITE_DEV_TOKEN est aussi défini
cat .env.local | grep VITE_DEV_TOKEN
```

---

## 📚 Références

- Backend auth: `/Users/gouacht/sojori-production/apps/srv-user/src/routes/auth`
- Frontend apiClient: `/Users/gouacht/Sojori-orchestrator/src/services/apiClient.ts`
- Mode dev: `/Users/gouacht/sojori-production/DEV_MODE.md`
