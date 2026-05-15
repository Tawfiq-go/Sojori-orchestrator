# 🧪 GUIDE DE TEST - APIs Réservations
## Comment tester les APIs entre Ancien et Nouveau Dashboard

**Date:** 2026-05-15
**Pour:** Développeurs, AI Agents, QA
**Objectif:** Valider que les APIs fonctionnent correctement dans les deux dashboards

---

## 🚀 DÉMARRAGE RAPIDE

### 1. Obtenir un Token JWT

#### Option A: Via sojori-dashboard (Ancien)
```bash
# 1. Se connecter au dashboard ancien
open https://dev.sojori.com

# 2. Ouvrir DevTools (F12)
# 3. Aller dans Application > Local Storage > https://dev.sojori.com
# 4. Copier la valeur de 'token' ou 'authToken'

export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Option B: Via Sojori-orchestrator (Nouveau)
```bash
# 1. Se connecter au nouveau dashboard
open http://localhost:4174

# 2. DevTools > Application > Cookies > localhost
# 3. Copier la valeur de 'token' ou regarder dans localStorage

export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Option C: Via API directe
```bash
curl -X POST https://dev.sojori.com/api/v1/user/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "your_email@example.com",
    "password": "your_password"
  }'

# Copier le token de la réponse
export JWT_TOKEN="le_token_recu"
```

### 2. Lancer les Tests

```bash
cd /Users/gouacht/Sojori-orchestrator

# Avec le token exporté:
./scripts/test-apis-comparison.sh

# Ou inline:
JWT_TOKEN="your_token" ./scripts/test-apis-comparison.sh

# Tester contre localhost:
BASE_URL="http://localhost:4007" JWT_TOKEN="your_token" ./scripts/test-apis-comparison.sh
```

---

## 📊 RÉSULTATS ATTENDUS

### ✅ Output Normal (Succès)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Test Comparaison APIs - Ancien vs Nouveau Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: Thu May 15 10:30:00 CEST 2026
Base URL: https://dev.sojori.com
Today: 2026-05-15
Tomorrow: 2026-05-16

📋 Test 1: Liste Réservations (ANCIEN)
Endpoint: /api/v1/reservations/reservations
✅ ANCIEN: Succès - 5 réservations chargées (total: 5, unmapped: 0)

📋 Test 2: Liste Réservations (NOUVEAU)
Endpoint: /api/v1/reservations
✅ NOUVEAU: Succès - 5 réservations chargées
ℹ️  Première réservation: John Doe → Appartement Paris

📋 Test 3: Détail Réservation (by-id)
Endpoint: /api/v1/reservations/by-id/:id
ℹ️  ID testé: 663a1b2c3d4e5f6a7b8c9d0e
✅ Détail: Succès
ℹ️  Guest: John Doe | Listing: Appartement Paris
ℹ️  Status: confirmed | 2 nuits | 250.00 EUR

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RÉSUMÉ DES TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests: 8
Réussis:     6 ✅
Échoués:     2 ❌
Taux réussite: 75%
```

### ❌ Output avec Erreurs (Token Invalide)
```
⚠️  JWT_TOKEN non configuré!
Usage: JWT_TOKEN='your_token' ./scripts/test-apis-comparison.sh
Ou: export JWT_TOKEN='your_token'
```

### ❌ Output avec Erreurs (API Down)
```
📋 Test 1: Liste Réservations (ANCIEN)
Endpoint: /api/v1/reservations/reservations
❌ ANCIEN: Échec - Connection refused
```

---

## 🔍 TESTS MANUELS (cURL)

### Test 1: Liste Réservations Check-in Aujourd'hui

```bash
# Ancien endpoint
curl -X GET \
  "https://dev.sojori.com/api/v1/reservations/reservations?dateType=arrival&startDate=2026-05-15&endDate=2026-05-16&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq

# Nouveau endpoint
curl -X GET \
  "https://dev.sojori.com/api/v1/reservations?dateType=arrival&startDate=2026-05-15&endDate=2026-05-16&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Test 2: Détail Réservation

```bash
RESERVATION_ID="663a1b2c3d4e5f6a7b8c9d0e"

curl -X GET \
  "https://dev.sojori.com/api/v1/reservations/by-id/${RESERVATION_ID}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Test 3: Réservation par Numéro (Ancien seulement)

```bash
RESERVATION_NUM="SJ-W1QS3UKJ"

curl -X GET \
  "https://dev.sojori.com/api/v1/reservations/by-reservation-number/${RESERVATION_NUM}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Test 4: Check-out Aujourd'hui

```bash
curl -X GET \
  "https://dev.sojori.com/api/v1/reservations?dateType=departure&startDate=2026-05-15&endDate=2026-05-16&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" | jq
```

---

## 📝 VÉRIFICATIONS MANUELLES UI

### Dans sojori-dashboard (Ancien)

1. **Se connecter**: https://dev.sojori.com
2. **Aller dans Réservations**: Menu → Réservations
3. **Vérifier**:
   - Liste des réservations affichée
   - Filtres fonctionnent (check-in today, checkout today, etc.)
   - Cliquer sur une réservation → Détail s'ouvre
   - Toutes les données affichées (guest, listing, dates, prix, etc.)

### Dans Sojori-orchestrator (Nouveau)

1. **Démarrer le serveur**:
```bash
cd /Users/gouacht/Sojori-orchestrator
npm start  # ou pnpm dev
```

2. **Se connecter**: http://localhost:4174

3. **Aller dans Réservations**: Menu → Activité → Réservations

4. **Vérifier**:
   - ✅ Liste des réservations affichée
   - ✅ Filtres fonctionnent (check-in today, checkout today, etc.)
   - ✅ Badges de count affichés
   - ❌ Cliquer sur réservation → Détail (TODO)
   - ❌ Actions (edit, cancel, etc.) (TODO)

---

## 🐛 DEBUGGING

### Problème 1: "401 Unauthorized"

**Cause:** Token JWT invalide ou expiré

**Solution:**
```bash
# 1. Obtenir un nouveau token (voir section Démarrage Rapide)
# 2. Vérifier que le token est bien exporté
echo $JWT_TOKEN

# 3. Tester manuellement
curl -X GET "https://dev.sojori.com/api/v1/reservations?limit=1" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Problème 2: "404 Not Found"

**Cause:** Endpoint n'existe pas ou mauvaise URL

**Solution:**
```bash
# Vérifier l'URL de base
echo $BASE_URL

# Tester health check
curl https://dev.sojori.com/health
curl http://localhost:4007/health
```

### Problème 3: "CORS Error" (dans browser)

**Cause:** CSP ou CORS mal configuré

**Solution:**
```typescript
// Vérifier vite.config.ts
// File: /Users/gouacht/Sojori-orchestrator/vite.config.ts

server: {
  headers: {
    'Content-Security-Policy': [
      "connect-src 'self' https://dev.sojori.com wss://dev.sojori.com http://localhost:4007",
      // ...
    ].join('; '),
  },
}
```

### Problème 4: "Empty Response []"

**Cause:** Pas de réservations dans la plage de dates

**Solution:**
```bash
# Tester avec une plage plus large
curl -X GET \
  "https://dev.sojori.com/api/v1/reservations?limit=100" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq 'length'

# Si toujours vide, créer des données de test
```

---

## 📚 FICHIERS UTILES

| Fichier | Description |
|---------|-------------|
| `docs/API_TESTING_COMPARISON.md` | Liste complète des 31 APIs + détails |
| `docs/API_COMPARISON_RESERVATIONS.md` | Comparaison structure données |
| `scripts/test-apis-comparison.sh` | Script de test automatique |
| `src/services/reservationsService.ts` | Service API nouveau dashboard |
| `/Users/gouacht/sojori-dashboard/src/features/reservation/services/serverApi.reservation.jsx` | Service API ancien dashboard |

---

## 🎯 CHECKLIST POUR AI AGENTS

Quand un AI agent doit tester les APIs:

```markdown
- [ ] Obtenir JWT token valide
- [ ] Exporter JWT_TOKEN en variable d'env
- [ ] Lancer ./scripts/test-apis-comparison.sh
- [ ] Vérifier que tests core (1-3) passent
- [ ] Si échec: Debug selon section Debugging
- [ ] Documenter les résultats
- [ ] Mettre à jour status dans API_TESTING_COMPARISON.md
```

---

## 🚦 CRITÈRES DE SUCCÈS

### Minimum Viable (Phase 1)
- ✅ Test 1: Liste réservations (nouveau endpoint) passe
- ✅ Test 2: Détail réservation passe
- ✅ Test 3: Auth valide (au moins 1 test réussi)

### Feature Complete (Phase 2)
- ✅ Tous les tests core passent (1-5)
- ✅ by-reservation-number implémenté
- ✅ CRUD endpoints implémentés
- ✅ Check-in/out endpoints implémentés

### Full Parity (Phase 3)
- ✅ Tous les 31 endpoints de l'ancien dashboard migrés
- ✅ Tests automatiques couvrent 100% des endpoints
- ✅ UI nouveau dashboard = parité avec ancien

---

## 💡 TIPS POUR DÉVELOPPEURS

### Ajouter un Nouveau Test

```bash
# Éditer scripts/test-apis-comparison.sh

# Ajouter avant le résumé final:
print_test "N" "Nom du Test" "/api/v1/endpoint"

response=$(curl -s -X GET \
  "${BASE_URL}/api/v1/endpoint" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
  print_success "Test réussi"
else
  print_failure "Test échoué"
fi
```

### Tester Localement

```bash
# Démarrer srv-reservations local
cd /Users/gouacht/sojori-production
pnpm --filter srv-reservations dev

# Tester contre localhost
BASE_URL="http://localhost:4002" \
JWT_TOKEN="your_token" \
./scripts/test-apis-comparison.sh
```

### Comparer Réponses

```bash
# Sauvegarder réponse ancien
curl "https://dev.sojori.com/api/v1/reservations/reservations?limit=1" \
  -H "Authorization: Bearer $JWT_TOKEN" > /tmp/old.json

# Sauvegarder réponse nouveau
curl "https://dev.sojori.com/api/v1/reservations?limit=1" \
  -H "Authorization: Bearer $JWT_TOKEN" > /tmp/new.json

# Comparer
diff <(jq -S . /tmp/old.json) <(jq -S . /tmp/new.json)
```

---

## 📞 SUPPORT

**Problèmes?**
- Voir `docs/API_TESTING_COMPARISON.md` pour détails
- Voir `docs/SECURITY_AUDIT_RESERVATIONS.md` pour sécurité
- Check logs backend: `kubectl logs -f deployment/srv-reservations`

**Questions?**
- GitHub Issues: https://github.com/My-Sojori/sojori-production/issues

---

**Document créé par:** Agent-Reservations
**Date:** 2026-05-15
**Status:** ✅ Prêt pour utilisation
