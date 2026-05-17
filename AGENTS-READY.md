# ✅ AGENTS - CONFIGURATION TERMINÉE

## Configuration Active

L'authentification est maintenant configurée pour permettre les tests sans token JWT.

### Backend (Production)
- **URL**: https://dev.sojori.com/api/v1/admin/*
- **Auth Bypass**: X-Dev-Token activé
- **Status**: ✅ Déployé et redémarré

### Frontend (Local)
- **URL**: http://127.0.0.1:4175/ (nouveau dashboard)
- **Auth Frontend**: Bypassed via VITE_DISABLE_AUTH=true
- **Status**: ✅ En cours d'exécution

---

## Pour les Agents IA : Comment Tester

### Option 1 : Appels API Directs (cURL)

Utilisez le header `X-Dev-Token` pour tous les appels API :

```bash
curl -H "X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=" \
     -H "Content-Type: application/json" \
     https://dev.sojori.com/api/v1/admin/dashboard/stats
```

### Option 2 : Frontend Local (Console Navigateur)

Le frontend sur http://127.0.0.1:4175/ ajoute automatiquement le X-Dev-Token à tous les appels.

Teste dans la console :

```javascript
// Devrait fonctionner sans 401
fetch('https://dev.sojori.com/api/v1/admin/dashboard/stats')
  .then(r => r.json())
  .then(d => console.log('✅ API data:', d))
  .catch(e => console.error('❌ Error:', e));
```

---

## Exemples d'APIs à Tester

### Admin Dashboard
```bash
curl -H "X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=" \
  https://dev.sojori.com/api/v1/admin/dashboard/stats
```

### Listings
```bash
curl -H "X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=" \
  "https://dev.sojori.com/api/v1/listing/listings?page=0&limit=5&paged=true"
```

### Chat Inbox
```bash
curl -H "X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=" \
  https://dev.sojori.com/api/v1/admin/chat-inbox/conversations
```

---

## Ce Qui a Été Configuré

### Backend Changes (srv-admin)
1. ✅ Ajout du check X-Dev-Token dans routes/index.ts (ligne 87-91)
2. ✅ DEV_TOKEN ajouté aux secrets Kubernetes
3. ✅ Déploiement srv-admin redémarré

### Frontend Changes (Sojori-orchestrator)
1. ✅ VITE_DISABLE_AUTH=true dans .env.local
2. ✅ VITE_DEV_TOKEN configuré
3. ✅ apiClient.ts ajoute automatiquement X-Dev-Token aux requêtes

---

## Vérification Rapide

```bash
# Test avec X-Dev-Token
curl -i -H "X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=" \
  https://dev.sojori.com/api/v1/admin/dashboard/stats

# Devrait retourner 200 avec les données
# Au lieu de 401 Unauthorized
```

---

## Notes Importantes

- ⚠️ **Token Expiration**: Le token expire le 2026-05-20 (dans 5 jours)
- ⚠️ **Sécurité**: X-Dev-Token fonctionne uniquement pour développement
- ⚠️ **Production**: Ne JAMAIS utiliser ce token en production réelle
- ✅ **Tous les services srv-admin**: Protégés par le même mécanisme

---

## Troubleshooting

### Si 401 Unauthorized persiste

```bash
# Vérifier que le pod srv-admin a bien redémarré
kubectl get pods -n production -l app=srv-admin

# Vérifier les logs
kubectl logs -n production -l app=srv-admin --tail=50 | grep "Dev-Token"

# Vérifier que le secret est bien configuré
kubectl get secret srv-admin-secrets -n production -o jsonpath='{.data.DEV_TOKEN}' | base64 -d
```

### Si frontend ne charge pas

```bash
# Vérifier .env.local
cat /Users/gouacht/Sojori-orchestrator/.env.local

# Relancer le frontend
cd /Users/gouacht/Sojori-orchestrator
npm run dev
```

---

## Prochaines Étapes

Les agents peuvent maintenant :
1. ✅ Tester toutes les APIs admin sans authentification
2. ✅ Documenter les écarts API dans docs/AI-READ-API-PARITY.md
3. ✅ Comparer avec l'ancien dashboard (http://localhost:4174)

**Aucune autre configuration nécessaire !**
