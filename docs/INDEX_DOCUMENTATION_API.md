# 📚 Index Documentation API - Sojori Orchestrator

**Dernière mise à jour:** 2026-05-15

---

## 🎯 PAR OÙ COMMENCER?

### Pour les Agents IA

**LIRE EN PREMIER:** [`AI-READ-API-PARITY.md`](./AI-READ-API-PARITY.md)
- Carte complète des APIs (tous domaines: auth, réservations, tâches, messages, etc.)
- Tableau de statut (SAME, PARTIAL, DASH_ONLY, ORCH_ONLY, MOCK)
- Écarts constatés

### Pour Résoudre le 404 sur Réservations

**RÉSUMÉ RAPIDE:** [`RESUME_TESTS_API_2026-05-15.md`](./RESUME_TESTS_API_2026-05-15.md)
- TL;DR du problème
- Findings principaux
- Prochaines étapes

**INVESTIGATION DÉTAILLÉE:** [`RESERVATIONS_404_INVESTIGATION.md`](./RESERVATIONS_404_INVESTIGATION.md)
- Analyse root cause
- Hypothèses testées
- Solutions proposées

### Pour Comparer Old vs New Dashboard

**RAPPORT COMPLET:** [`API_PARITY_TEST_RESULTS_2026-05-15.md`](./API_PARITY_TEST_RESULTS_2026-05-15.md)
- Tests effectués
- Configuration differences (centralized vs decentralized)
- Data mapping differences
- 31 APIs comparison table

**COMPARAISON RÉSERVATIONS:** [`API_COMPARISON_RESERVATIONS.md`](./API_COMPARISON_RESERVATIONS.md)
- 31 APIs réservations détaillées
- Structure requêtes/réponses
- Exemples curl

---

## 📋 TOUS LES DOCUMENTS

### Documentation API Générale

| Fichier | Description | Audience |
|---------|-------------|----------|
| [`AI-READ-API-PARITY.md`](./AI-READ-API-PARITY.md) | **🌟 Fichier maître** - Carte API complète old vs new | Agents IA, Devs |
| [`API-COMPARISON-SOJORI-DASHBOARD-VS-ORCHESTRATOR.md`](./API-COMPARISON-SOJORI-DASHBOARD-VS-ORCHESTRATOR.md) | Comparaison approfondie des dashboards | Devs, Architects |
| [`API_COMPARISON_TEST_GUIDE.md`](./API_COMPARISON_TEST_GUIDE.md) | Guide pour tester les APIs | QA, Devs |
| [`GUIDE_POUR_AGENTS_IA_FUTURS.md`](./GUIDE_POUR_AGENTS_IA_FUTURS.md) | Instructions pour agents IA futurs | AI Agents |

### Investigation 404 Réservations (2026-05-15)

| Fichier | Description | Status |
|---------|-------------|--------|
| [`RESUME_TESTS_API_2026-05-15.md`](./RESUME_TESTS_API_2026-05-15.md) | **Résumé exécutif** - TL;DR du problème | ✅ Final |
| [`API_PARITY_TEST_RESULTS_2026-05-15.md`](./API_PARITY_TEST_RESULTS_2026-05-15.md) | **Rapport détaillé** - Tests + findings | ✅ Final |
| [`TEST_RESULTS_FINAL_2026-05-15.md`](./TEST_RESULTS_FINAL_2026-05-15.md) | **Tests finaux effectués** - Résultats avec DISABLE_AUTH | ✅ Final |
| [`RESERVATIONS_404_INVESTIGATION.md`](./RESERVATIONS_404_INVESTIGATION.md) | Investigation complète du 404 | ✅ Final |
| [`FIX_404_RESERVATIONS.md`](./FIX_404_RESERVATIONS.md) | Tentative de fix (path endpoint) | ⚠️ Partial fix |
| [`API_COMPARISON_RESERVATIONS.md`](./API_COMPARISON_RESERVATIONS.md) | Comparaison 31 APIs réservations | ✅ Complete |
| [`API_TESTING_COMPARISON.md`](./API_TESTING_COMPARISON.md) | Plan de test API comparatif | 📝 Draft |

### Scripts de Test

| Fichier | Description | Usage |
|---------|-------------|-------|
| `/tmp/test-reservations-404-final.sh` | Script test automatisé (6 scénarios) | `bash /tmp/test-reservations-404-final.sh` |
| `/tmp/debug-reservations-404.md` | Guide debug étape par étape | Guide manuel |
| `scripts/test-api-parity-all.mjs` | Tests automatisés parité (tous domaines) | `node scripts/test-api-parity-all.mjs` |

---

## 🔍 PAR SUJET

### Authentification

**Problème identifié:**
- X-Dev-Token seul ne suffit pas
- Backend requiert JWT token + refresh token
- X-Dev-Token = CORS bypass, pas auth bypass

**Docs:**
- [`API_PARITY_TEST_RESULTS_2026-05-15.md`](./API_PARITY_TEST_RESULTS_2026-05-15.md) - Section "Root Cause Analysis"
- [`RESUME_TESTS_API_2026-05-15.md`](./RESUME_TESTS_API_2026-05-15.md) - Section "Authentification"

### Configuration (BASE_URL)

**Problème identifié:**
- Old: Config centralisée (`backendServer.config.js`)
- New: Config décentralisée (chaque service son BASE_URL)

**Docs:**
- [`API_PARITY_TEST_RESULTS_2026-05-15.md`](./API_PARITY_TEST_RESULTS_2026-05-15.md) - Section "Configuration Differences"
- [`RESUME_TESTS_API_2026-05-15.md`](./RESUME_TESTS_API_2026-05-15.md) - Section "Problèmes Identifiés #1"

**Recommandation:** Créer `src/config/apiConfig.ts` centralisé

### Data Mapping

**Problème identifié:**
- Old: Mapping uniforme (`mapReservationData()` partout)
- New: Mapping partiel (detail seulement, pas list)

**Docs:**
- [`API_PARITY_TEST_RESULTS_2026-05-15.md`](./API_PARITY_TEST_RESULTS_2026-05-15.md) - Section "Data Mapping Differences"
- [`RESUME_TESTS_API_2026-05-15.md`](./RESUME_TESTS_API_2026-05-15.md) - Section "Problèmes Identifiés #2"

**Recommandation:** Appliquer mapping uniformément

### APIs Manquantes

**Status:** 2/31 APIs réservations implémentées (6.5%)

**Manquantes (29):**
- Search (by number, by phone)
- CRUD (create, update, delete, cancel)
- Guest actions (declare arrival/departure)
- Analytics (stats, revenue, channels)

**Docs:**
- [`API_COMPARISON_RESERVATIONS.md`](./API_COMPARISON_RESERVATIONS.md) - Liste complète 31 APIs
- [`API_PARITY_TEST_RESULTS_2026-05-15.md`](./API_PARITY_TEST_RESULTS_2026-05-15.md) - Table détaillée avec status

---

## 🚀 GUIDES D'ACTION

### "Je veux tester les APIs maintenant"

1. **Obtenir JWT token:**
   ```bash
   # Option 1: Login API
   curl -X POST 'https://dev.sojori.com/api/v1/user/auth/login' \
     -H 'Content-Type: application/json' \
     -d '{"email":"user@sojori.com","password":"..."}'

   # Option 2: Copier depuis navigateur
   # DevTools > Application > Local Storage > 'token'
   ```

2. **Lancer tests:**
   ```bash
   export JWT_TOKEN="..."
   bash /tmp/test-reservations-404-final.sh
   ```

3. **Voir résultats:**
   - Lire output du script
   - Comparer avec expected results dans `API_TESTING_COMPARISON.md`

### "Je veux implémenter les APIs manquantes"

1. **Lire référence old dashboard:**
   - File: `sojori-dashboard/src/features/reservation/services/serverApi.reservation.jsx`
   - Voir implémentation de chaque API

2. **Vérifier backend endpoint existe:**
   - File: `sojori-production/apps/srv-reservations/src/routes/reservation/index.ts`
   - Confirmer route + middleware auth

3. **Implémenter dans new dashboard:**
   - File: `Sojori-orchestrator/src/services/reservationsService.ts`
   - Suivre pattern existant (`getList()`, `getById()`)

4. **Tester:**
   - Ajouter au script de test
   - Comparer old vs new response

### "Je veux corriger le 404"

**Spoiler:** Ce n'est pas vraiment un 404, c'est un 401 (auth required)

1. **Lire investigation:**
   - [`RESERVATIONS_404_INVESTIGATION.md`](./RESERVATIONS_404_INVESTIGATION.md)
   - [`RESUME_TESTS_API_2026-05-15.md`](./RESUME_TESTS_API_2026-05-15.md)

2. **Vérifier frontend envoie JWT:**
   - DevTools > Network > Headers
   - Doit contenir: `Authorization: Bearer ...`

3. **Si header manquant:**
   - Vérifier `src/services/apiClient.ts` interceptors
   - Vérifier token dans localStorage

4. **Si header présent mais 401:**
   - Token expiré? (vérifier `exp` dans JWT)
   - Token invalide? (essayer re-login)
   - Role incorrect? (backend requiert SuperAdmin/Admin/Owner/Worker)

### "Je veux migrer complètement de l'ancien dashboard"

**Checklist complète:**

- [ ] **Auth**
  - [ ] Login/logout
  - [ ] Token refresh
  - [ ] Role-based access

- [ ] **Réservations (31 APIs)**
  - [x] getList (✅ implémenté)
  - [x] getById (✅ implémenté)
  - [ ] 29 APIs manquantes (voir [`API_COMPARISON_RESERVATIONS.md`](./API_COMPARISON_RESERVATIONS.md))

- [ ] **Listings**
  - [ ] CRUD operations
  - [ ] Stats

- [ ] **Calendar**
  - [ ] Month view
  - [ ] Inventory management

- [ ] **Tasks**
  - [ ] Search & filters
  - [ ] CRUD
  - [ ] Assignment

- [ ] **Messages**
  - [ ] WhatsApp guests
  - [ ] WhatsApp staff
  - [ ] OTA messages

- [ ] **Orchestration**
  - [ ] Plans list
  - [ ] Timeline view
  - [ ] Config

- [ ] **Analytics**
  - [ ] Dashboard
  - [ ] Reports

---

## 📊 MÉTRIQUES

### État Actuel (2026-05-15)

| Domaine | APIs Old | APIs New | % Implémenté |
|---------|----------|----------|--------------|
| Auth | 4 | 4 | 100% ✅ |
| Réservations | 31 | 2 | 6.5% ❌ |
| Listings | ~15 | ? | ? |
| Calendar | ~10 | ? | ? |
| Tasks | ~20 | ? | ? |
| Messages | ~15 | ? | ? |
| Orchestration | ~10 | ? | ? |
| Analytics | ~8 | ? | ? |

**Note:** Chiffres exacts pour domaines non-réservations à vérifier dans `AI-READ-API-PARITY.md`

### Priorités Implémentation

**P0 - Critique (bloquer la migration):**
- Search réservations (by number, by phone)
- CRUD réservations basique (create, update, cancel)

**P1 - Important (features quotidiennes):**
- Guest actions (declare arrival/departure)
- Stats réservations (pour reporting)
- Messages WhatsApp (communication guests)

**P2 - Nice to have:**
- Analytics avancées
- Planning & timeline
- Configuration orchestration

---

## 🔗 LIENS EXTERNES

### Code Source

**Old Dashboard:**
- Repo: `/Users/gouacht/sojori-dashboard`
- Config: `src/config/backendServer.config.js`
- APIs: `src/features/*/services/serverApi*.js`

**New Dashboard:**
- Repo: `/Users/gouacht/Sojori-orchestrator`
- Config: `.env`, `src/services/apiClient.ts`
- APIs: `src/services/*.ts`

**Backend:**
- Repo: `/Users/gouacht/sojori-production`
- Routes: `apps/srv-*/src/routes/`
- Auth: `apps/srv-*/src/passportConfig/`

---

## 💡 POUR LES AGENTS IA FUTURS

### Avant de modifier du code API

1. **LIRE [`AI-READ-API-PARITY.md`](./AI-READ-API-PARITY.md)** - Vérifier si API déjà implémentée
2. **VÉRIFIER old dashboard** - Voir comment c'était fait avant
3. **TESTER backend endpoint** - Confirmer qu'il marche (avec JWT)
4. **IMPLÉMENTER** - Suivre pattern existant
5. **METTRE À JOUR docs** - Ajouter écart dans `AI-READ-API-PARITY.md`

### Avant de tester des APIs

1. **Obtenir JWT token** (voir guide ci-dessus)
2. **Exporter token:** `export JWT_TOKEN="..."`
3. **Lancer script de test**
4. **Documenter résultats** dans `AI-READ-API-PARITY.md` section "Écarts constatés"

### Avant de créer un nouveau document

1. **Vérifier cet index** - Doc existe déjà?
2. **Lire docs existantes** - Éviter duplication
3. **Nommer clairement** - Préfixe par sujet (API_, RESERVATIONS_, etc.)
4. **Ajouter à cet index** - Faciliter découverte

---

## ✅ STATUT GLOBAL

**Date:** 2026-05-15

**Investigation 404:** ✅ **TERMINÉE**
- Root cause identifié: 401 (auth required), pas 404
- X-Dev-Token seul insuffisant
- JWT token requis pour tous les endpoints protégés

**Tests API:** ⏸️ **EN PAUSE**
- Bloqué par besoin de JWT token valide
- Script de test prêt (`/tmp/test-reservations-404-final.sh`)
- Attente credentials ou login flow

**Documentation:** ✅ **COMPLÈTE**
- 6 docs créés (investigation, comparison, tests)
- Index créé (ce fichier)
- Écarts documentés dans `AI-READ-API-PARITY.md`

**Implémentation:** ❌ **EN COURS** (6.5% pour réservations)
- 2/31 APIs réservations implémentées
- 29 APIs à implémenter (estimation: 1 semaine)
- Config à centraliser
- Mapping à standardiser

---

**Créé:** 2026-05-15
**Par:** Assistant AI
**Prochain agent:** Obtenir JWT token → Relancer tests → Implémenter APIs manquantes
