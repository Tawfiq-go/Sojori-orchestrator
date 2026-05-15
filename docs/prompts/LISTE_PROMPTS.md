# 📋 LISTE DES PROMPTS AGENTS

**Date** : 14 Mai 2026

Voici les 8 prompts pour intégrer les APIs backend dans Sojori-orchestrator.

---

## 🎯 COMMENT UTILISER

Pour chaque agent, dire :

```
Tu es [NOM_AGENT].

Lis et suis exactement ce qui est écrit dans :
/Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_[NOM].md

Commence par explorer le backend, puis crée le service, les types, et les pages.
```

---

## 📂 LISTE DES PROMPTS

| # | Agent | Fichier Prompt | Backend | Status |
|---|-------|----------------|---------|--------|
| 1 | Agent-Orchestration | `PROMPT_AGENT_ORCHESTRATION.md` | srv-orchestrator:4008 | ✅ Créé |
| 2 | Agent-Reservations | `PROMPT_AGENT_RESERVATIONS.md` | srv-reservations:4007 | ✅ Créé |
| 3 | Agent-Calendrier | `PROMPT_AGENT_CALENDRIER.md` | srv-calendar:4006 | En cours |
| 4 | Agent-Inbox | `PROMPT_AGENT_INBOX.md` | srv-chatbot:4000 | En cours |
| 5 | Agent-Tasks | `PROMPT_AGENT_TASKS.md` | srv-task:4005 | En cours |
| 6 | Agent-Annonces | `PROMPT_AGENT_ANNONCES.md` | srv-listing:4001 | En cours |
| 7 | Agent-Dashboard | `PROMPT_AGENT_DASHBOARD.md` | srv-admin:4002 | En cours |
| 8 | Agent-Analytics | `PROMPT_AGENT_ANALYTICS.md` | srv-admin:4002 | En cours |

---

## 📖 EXEMPLE D'USAGE

### Pour lancer Agent-Orchestration :

```
Tu es Agent-Orchestration.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_ORCHESTRATION.md

Fais exactement ce qui est demandé étape par étape.
```

### Pour lancer Agent-Dashboard :

```
Tu es Agent-Dashboard.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_DASHBOARD.md

IMPORTANT : Tu dois réutiliser le code de /Users/gouacht/sojori-dashboard
```

---

## ✅ CHECKLIST GLOBALE

- [ ] Agent-Orchestration terminé
- [ ] Agent-Reservations terminé
- [ ] Agent-Calendrier terminé
- [ ] Agent-Inbox terminé
- [ ] Agent-Tasks terminé
- [ ] Agent-Annonces terminé
- [ ] Agent-Dashboard terminé
- [ ] Agent-Analytics terminé

---

**Tous les prompts dans** : `/Users/gouacht/Sojori-orchestrator/docs/prompts/`
