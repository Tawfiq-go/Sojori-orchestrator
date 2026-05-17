# 🚀 QUICK START - Configuration en 2 Minutes

## Problème Actuel

Tu vois des erreurs 401/404 parce que le backend demande un **JWT token valide**.

---

## ✅ Solution Rapide (2 étapes)

### Étape 1 : Obtenir Ton Token

**Ouvre la console du navigateur** sur http://localhost:4174/ (l'ancien dashboard qui fonctionne)

Copie/colle ce code dans la console :

```javascript
// Extraire les tokens depuis localStorage
const token = localStorage.getItem('token');
const refreshToken = localStorage.getItem('refreshToken');

// Créer le contenu du fichier .env.local
const envContent = `# Auto-generated - Token extrait le ${new Date().toLocaleString()}
VITE_DISABLE_AUTH=true
VITE_TEST_TOKEN=${token}
VITE_TEST_REFRESH_TOKEN=${refreshToken}
VITE_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=
`;

// Copier dans le clipboard
copy(envContent);
console.log('✅ Contenu copié dans le presse-papier !');
console.log('📋 Colle ça dans .env.local du nouveau dashboard');
console.log('');
console.log(envContent);
```

### Étape 2 : Créer le Fichier .env.local

```bash
cd /Users/gouacht/Sojori-orchestrator

# Colle le contenu copié depuis la console
pbpaste > .env.local

# Vérifie que c'est bon
cat .env.local

# Relance le frontend
npm run dev
```

---

## 🧪 Test Rapide

Une fois le token configuré, teste dans la console du navigateur (http://127.0.0.1:4175/) :

```javascript
// Devrait retourner les données, pas un 401
fetch('https://dev.sojori.com/api/v1/listing/listings?page=0&limit=5&paged=true')
  .then(r => r.json())
  .then(d => console.log('✅ API fonctionne:', d))
  .catch(e => console.error('❌ Erreur:', e));
```

---

## 🐛 Si Ça Ne Marche Toujours Pas

```bash
# Vérifie que le token est bien dans .env.local
cat .env.local | grep VITE_TEST_TOKEN

# Si vide, reconnecte-toi sur http://localhost:4174
# et refais l'étape 1
```

---

## 📋 Pour les Agents IA

Donne ce prompt aux agents :

```
TOKEN CONFIGURÉ - PRÊT POUR TESTS

Configuration :
- Frontend nouveau : http://127.0.0.1:4175/
- Backend : https://dev.sojori.com/api/v1/
- Token de test valide : Dans .env.local

Tu peux maintenant :
✅ Accéder au dashboard sans login
✅ Tester toutes les APIs avec authentification
✅ Documenter les écarts dans docs/AI-READ-API-PARITY.md

Procède avec tes tests.
```
