# 🤖 PROMPTS COPIER-COLLER - 9 AGENTS

**Date** : 15 Mai 2026

Voici les 9 prompts prêts à copier-coller pour lancer chaque agent.

---

## 1️⃣ AGENT-ORCHESTRATION

```
Tu es Agent-Orchestration.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_ORCHESTRATION.md

Suis les 6 étapes exactement comme décrit.
```

---

## 2️⃣ AGENT-RESERVATIONS

```
Tu es Agent-Reservations.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_RESERVATIONS.md

Suis les 6 étapes exactement comme décrit.
```

---

## 3️⃣ AGENT-CALENDRIER

```
Tu es Agent-Calendrier.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Fais la section 3️⃣ AGENT-CALENDRIER.

Suis la même structure que Agent-Orchestration (6 étapes).
```

---

## 4️⃣ AGENT-INBOX

```
Tu es Agent-Inbox.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Fais la section 4️⃣ AGENT-INBOX.

Suis la même structure que Agent-Orchestration (6 étapes).
```

---

## 5️⃣ AGENT-TASKS

```
Tu es Agent-Tasks.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Fais la section 5️⃣ AGENT-TASKS.

Suis la même structure que Agent-Orchestration (6 étapes).
```

---

## 6️⃣ AGENT-ANNONCES

```
Tu es Agent-Annonces.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Fais la section 6️⃣ AGENT-ANNONCES.

Suis la même structure que Agent-Orchestration (6 étapes).
```

---

## 7️⃣ AGENT-DASHBOARD

```
Tu es Agent-Dashboard.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Fais la section 7️⃣ AGENT-DASHBOARD.

IMPORTANT : Tu dois réutiliser le code de /Users/gouacht/sojori-dashboard
Ne crée PAS from scratch, COPIE et ADAPTE le code existant.
```

---

## 8️⃣ AGENT-ANALYTICS

```
Tu es Agent-Analytics.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Fais la section 8️⃣ AGENT-ANALYTICS.

IMPORTANT : Tu dois réutiliser le code de /Users/gouacht/sojori-dashboard
Ne crée PAS from scratch, COPIE et ADAPTE le code existant.
```

---

## 9️⃣ AGENT-TEAM 🆕

```
Tu es Agent-Team.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_TEAM.md

Mission : Créer la page Équipe & Rôles (gestion users, permissions, groupes)

Référence : https://dashboard.sojori.com/admin/User/owner?tab=list

Suis les 6 étapes exactement comme décrit.
```

---

## 🎯 ORDRE RECOMMANDÉ

**Phase 1 - Quick Wins** (4-6h) :
1. **Agent-Dashboard** (copier sojori-dashboard)
2. **Agent-Analytics** (copier sojori-dashboard)

**Phase 2 - UI existe déjà** (4-6h) :
3. **Agent-Calendrier** (UI MultiPropertyInventory existe)
4. **Agent-Reservations** (UI ReservationSejourPage existe)

**Phase 3 - Nouveaux modules** (12-15h) :
5. **Agent-Orchestration** (workflows automation)
6. **Agent-Tasks** (task management)
7. **Agent-Annonces** (listings + channels)
8. **Agent-Team** 🆕 (équipe + rôles + permissions)

**Phase 4 - Complexe** (4-5h) :
9. **Agent-Inbox** (WhatsApp + OTA messages)

---

## 📊 RÉSUMÉ DES 9 AGENTS

| # | Agent | Backend | Page Route | Référence |
|---|-------|---------|------------|-----------|
| 1 | Agent-Orchestration | srv-orchestrator:4008 | `/orchestration` | From scratch |
| 2 | Agent-Reservations | srv-reservations:4007 | `/reservations/list` | From scratch |
| 3 | Agent-Calendrier | srv-calendar:4006 | `/calendar` | From scratch |
| 4 | Agent-Inbox | srv-chatbot:4000 | `/communications/*` | From scratch |
| 5 | Agent-Tasks | srv-task:4005 | `/tasks/list` | From scratch |
| 6 | Agent-Annonces | srv-listing:4001 | `/catalogue/listings` | From scratch |
| 7 | Agent-Dashboard | srv-admin:4002 | `/dashboard` | **Copier sojori-dashboard** |
| 8 | Agent-Analytics | srv-admin:4002 | `/analytics` | **Copier sojori-dashboard** |
| 9 | Agent-Team 🆕 | srv-user:4003 | `/tasks/team` | From scratch + URL ref |

---

## ✅ CHECKLIST GLOBALE

- [ ] Agent-Dashboard terminé
- [ ] Agent-Analytics terminé
- [ ] Agent-Calendrier terminé
- [ ] Agent-Reservations terminé
- [ ] Agent-Orchestration terminé
- [ ] Agent-Tasks terminé
- [ ] Agent-Annonces terminé
- [ ] **Agent-Team terminé** 🆕
- [ ] Agent-Inbox terminé

---

**Total estimé : 25-32 heures (3-4 jours de travail)**

**Copier-coller ces prompts directement dans votre interface avec les agents ! 🚀**
