# 🤖 PROMPTS COPIER-COLLER - 9 AGENTS

**Date** : 15 Mai 2026

---

## 1️⃣ AGENT-ORCHESTRATION

```
Tu es Agent-Orchestration.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_ORCHESTRATION.md

Suis les 6 étapes.
```

---

## 2️⃣ AGENT-RESERVATIONS

```
Tu es Agent-Reservations.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_RESERVATIONS.md

Suis les 6 étapes.
```

---

## 3️⃣ AGENT-CALENDRIER

```
Tu es Agent-Calendrier.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Section 3️⃣ AGENT-CALENDRIER.
```

---

## 4️⃣ AGENT-INBOX

```
Tu es Agent-Inbox.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Section 4️⃣ AGENT-INBOX.
```

---

## 5️⃣ AGENT-TASKS

```
Tu es Agent-Tasks.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Section 5️⃣ AGENT-TASKS.
```

---

## 6️⃣ AGENT-ANNONCES

```
Tu es Agent-Annonces.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Section 6️⃣ AGENT-ANNONCES.
```

---

## 7️⃣ AGENT-DASHBOARD

```
Tu es Agent-Dashboard.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Section 7️⃣ AGENT-DASHBOARD.

IMPORTANT : Copier code de /Users/gouacht/sojori-dashboard
```

---

## 8️⃣ AGENT-ANALYTICS

```
Tu es Agent-Analytics.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENTS_RESTANTS.md

Section 8️⃣ AGENT-ANALYTICS.

IMPORTANT : Copier code de /Users/gouacht/sojori-dashboard
```

---

## 9️⃣ AGENT-ADMIN 🆕

```
Tu es Agent-Admin.

Lis /Users/gouacht/Sojori-orchestrator/docs/prompts/PROMPT_AGENT_TEAM.md

Mission : Créer page Administration (Users, Rôles, Permissions, Groupes)

Référence : https://dashboard.sojori.com/admin/User/owner?tab=list

IMPORTANT : 
1. Créer nouvelle section "Administration" dans sidebar
2. Route : /admin/users (pas /tasks/team)
3. Tabs : Users | Rôles | Permissions | Groupes
```

---

## 📍 NOUVELLE SECTION SIDEBAR

Pour Agent-Admin, ajouter dans `DashboardV2.components.jsx` :

```javascript
{
  group: 'administration',
  label: 'Administration',
  items: [
    { id: 'admin/users', label: 'Équipe & Rôles', icon: '👥' },
    { id: 'admin/permissions', label: 'Permissions', icon: '🔐' },
    { id: 'admin/settings', label: 'Paramètres', icon: '⚙️' },
  ],
}
```

---

## 🎯 ORDRE RECOMMANDÉ

**Phase 1** : Dashboard + Analytics (4-6h)
**Phase 2** : Calendrier + Réservations (4-6h)
**Phase 3** : Orchestration + Tasks + Annonces + Admin (12-15h)
**Phase 4** : Inbox (4-5h)

**Total : 25-32h**

---

**Prêt ! 🚀**
