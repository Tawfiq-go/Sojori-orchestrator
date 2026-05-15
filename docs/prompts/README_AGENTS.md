# 🤖 GUIDE RAPIDE - AGENTS SPÉCIALISÉS

**Date** : 14 Mai 2026

---

## 🎯 POUR LANCER UN AGENT

**Template simple** :

```
Tu es [NOM_AGENT].

Lis ce fichier :
/Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_[NOM].md

Suis les étapes exactement comme décrit.
```

---

## 📋 LES 8 AGENTS

### ✅ Prompts détaillés disponibles

1. **Agent-Orchestration** - Workflows automation
   - Fichier : `PROMPT_AGENT_ORCHESTRATION.md` ✅
   - Backend : srv-orchestrator (port 4008)

2. **Agent-Reservations** - Gestion réservations
   - Fichier : `PROMPT_AGENT_RESERVATIONS.md` ✅
   - Backend : srv-reservations (port 4007)

### 📝 Prompts à créer (structure identique)

3. **Agent-Calendrier** - Calendrier + prix
   - Backend : srv-calendar (4006)
   - Pages : CalendarInventoryPage (modifier)

4. **Agent-Inbox** - WhatsApp + Messages
   - Backend : srv-chatbot (4000)
   - Pages : WhatsAppGuestsPage, WhatsAppStaffPage, MessagesOTAPage

5. **Agent-Tasks** - Tâches équipe
   - Backend : srv-task (4005)
   - Pages : TasksListPage, TasksTeamPage, TasksPlanningPage

6. **Agent-Annonces** - Listings
   - Backend : srv-listing (4001)
   - Pages : ListingsPage, ChannelsPage, PricingPage

7. **Agent-Dashboard** - KPIs ⚠️ Réutiliser sojori-dashboard
   - Backend : srv-admin (4002)
   - Référence : `/Users/gouacht/sojori-dashboard`

8. **Agent-Analytics** - Analytics ⚠️ Réutiliser sojori-dashboard
   - Backend : srv-admin (4002)
   - Référence : `/Users/gouacht/sojori-dashboard`

---

## 🔧 STRUCTURE STANDARD POUR CHAQUE AGENT

Tous les agents (sauf Dashboard/Analytics) suivent la même structure :

### Étape 1 : Explorer backend
```bash
cat /Users/gouacht/sojori-production/apps/srv-[nom]/src/routes/*.ts
```

### Étape 2 : Créer service
```
src/services/[nom]Service.ts
```

### Étape 3 : Créer types
```
src/types/[nom].types.ts
```

### Étape 4 : Créer pages
```
src/pages/[Nom]Page.tsx
```

### Étape 5 : Ajouter routes
```
src/App.tsx (import + Route)
```

### Étape 6 : Tester
```bash
# Backend
docker-compose -f docker-compose-v2.yml up -d srv-[nom]
curl http://localhost:[PORT]/health

# Frontend
pnpm dev --port 4174
open http://localhost:4174/[route]
```

---

## 📚 DOCUMENTATION COMPLÈTE

- **Guide complet** : `docs/AGENTS_SPECIALISES_INTEGRATION_API.md` (700+ lignes)
- **Résumé** : `docs/AGENTS_NOMS_ET_RESUME.md`
- **Prompts** : `docs/prompts/PROMPT_AGENT_*.md`

---

## 🚀 ORDRE RECOMMANDÉ

**Phase 1** : Quick wins (4-6h)
1. Agent-Dashboard
2. Agent-Analytics

**Phase 2** : UI existe déjà (4-6h)
3. Agent-Calendrier
4. Agent-Reservations

**Phase 3** : Nouveaux modules (9-12h)
5. Agent-Orchestration
6. Agent-Tasks
7. Agent-Annonces

**Phase 4** : Complexe (4-5h)
8. Agent-Inbox

---

## ✅ RÈGLES POUR TOUS LES AGENTS

1. **Design** : TOUJOURS utiliser Aurora Soft Light (`t.primary`, `t.text`, etc.)
2. **API** : TOUJOURS gérer loading + error states
3. **TypeScript** : JAMAIS utiliser `any`
4. **Backend** : TOUJOURS vérifier les vraies routes avant de coder
5. **Sécurité** : AVANT toute modification de route ou d'API, lire `/Users/gouacht/sojori-production/SECURITY_RULES.md`
6. **Routes publiques** : JAMAIS sauf webhooks externes explicitement requis
7. **Validation** : TOUJOURS valider les inputs côté serveur et contrôler les rôles

---

**C'est tout ! Chaque agent a sa doc détaillée dans `PROMPT_AGENT_*.md`** 🚀
