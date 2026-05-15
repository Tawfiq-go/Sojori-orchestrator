# 📖 COMMENT UTILISER LES PROMPTS AGENTS

**Date** : 14 Mai 2026

---

## 🎯 TEMPLATE SIMPLE POUR LANCER UN AGENT

Copier-coller ce texte et remplacer `[NOM]` par le nom de l'agent :

```
Tu es Agent-[NOM].

Lis ces fichiers dans cet ordre :

1. /Users/gouacht/Sojori-orchestrator/docs/prompts/README_AGENTS.md
2. /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_[NOM].md

Suis les étapes exactement comme décrit.
Commence par explorer le backend.
```

---

## 📋 LES 8 AGENTS

### Agents avec prompts détaillés complets

1. **Agent-Orchestration**
   ```
   Tu es Agent-Orchestration.
   
   Lis :
   1. docs/prompts/README_AGENTS.md
   2. docs/prompts/PROMPT_AGENT_ORCHESTRATION.md
   
   Fais les 6 étapes.
   ```

2. **Agent-Reservations**
   ```
   Tu es Agent-Reservations.
   
   Lis :
   1. docs/prompts/README_AGENTS.md
   2. docs/prompts/PROMPT_AGENT_RESERVATIONS.md
   
   Fais les 6 étapes.
   ```

### Agents 3-8 (structure identique, voir PROMPT_AGENTS_RESTANTS.md)

3. **Agent-Calendrier**
4. **Agent-Inbox**
5. **Agent-Tasks**
6. **Agent-Annonces**
7. **Agent-Dashboard** ⚠️ Réutiliser sojori-dashboard
8. **Agent-Analytics** ⚠️ Réutiliser sojori-dashboard

Pour agents 3-8 :
```
Tu es Agent-[NOM].

Lis :
1. docs/prompts/README_AGENTS.md
2. docs/prompts/PROMPT_AGENTS_RESTANTS.md (ta section)

Structure identique aux agents 1-2.
```

---

## 📂 FICHIERS PROMPTS DISPONIBLES

```
docs/prompts/
├── README_AGENTS.md              ← Guide rapide
├── COMMENT_UTILISER.md           ← Ce fichier
├── LISTE_PROMPTS.md              ← Index
├── PROMPT_AGENT_ORCHESTRATION.md ← Détaillé complet
├── PROMPT_AGENT_RESERVATIONS.md  ← Détaillé complet
└── PROMPT_AGENTS_RESTANTS.md     ← Agents 3-8 (concis)
```

**Documentation complète** :
- `docs/AGENTS_SPECIALISES_INTEGRATION_API.md` (700+ lignes)
- `docs/AGENTS_NOMS_ET_RESUME.md` (résumé)

---

## ✅ EXEMPLE CONCRET

### Pour Agent-Orchestration

**Vous dites à l'agent** :
```
Tu es Agent-Orchestration.

Lis docs/prompts/PROMPT_AGENT_ORCHESTRATION.md

C'est ton guide complet. Suis-le étape par étape.
```

**L'agent va** :
1. Explorer backend srv-orchestrator (port 4008)
2. Créer `src/services/orchestrationService.ts`
3. Créer `src/types/orchestration.types.ts`
4. Créer `src/pages/OrchestrationPage.tsx`
5. Ajouter route dans `App.tsx`
6. Tester le tout

---

## 🚀 ORDRE RECOMMANDÉ

**Phase 1** : Quick wins
1. Agent-Dashboard (2-3h)
2. Agent-Analytics (2-3h)

**Phase 2** : UI existe déjà
3. Agent-Calendrier (2-3h)
4. Agent-Reservations (2-3h)

**Phase 3** : Nouveaux modules
5. Agent-Orchestration (3-4h)
6. Agent-Tasks (3-4h)
7. Agent-Annonces (3-4h)

**Phase 4** : Complexe
8. Agent-Inbox (4-5h)

---

## 🎯 CE QUE CHAQUE AGENT DOIT FAIRE

Tous les agents (sauf 7-8) :
1. ✅ Explorer backend (routes API)
2. ✅ Créer service (`[nom]Service.ts`)
3. ✅ Créer types (`[nom].types.ts`)
4. ✅ Créer page(s) React
5. ✅ Ajouter routes
6. ✅ Tester

Agents 7-8 (Dashboard/Analytics) :
1. ✅ Lire code sojori-dashboard
2. ✅ Copier logique API
3. ✅ Adapter design Aurora
4. ✅ Tester

---

**C'est tout ! Les prompts contiennent TOUT le détail.** 🚀
