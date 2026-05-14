# 🔄 WORKFLOW AUDIT → CORRECTION

**Pour le patron** : Ce document explique QUI fait QUOI et DANS QUEL ORDRE.

---

## 📊 WORKFLOW COMPLET

```
┌─────────────────────────────────────────────────────────────────┐
│                    ÉTAPE 1 : AUDIT                              │
│                                                                 │
│  👤 QUI ? Agent Audit (1 seul agent)                           │
│  📁 OÙ ? Les 2 projets (ancien ET nouveau)                     │
│  ⏱️  DURÉE ? 3-5 heures                                         │
│                                                                 │
│  📝 LIVRABLES :                                                 │
│     1. docs/AUDIT_MODALS_ANCIEN_DASHBOARD.md                   │
│     2. docs/MODALS_MANQUANTS.md                                │
│     3. docs/RAPPORT_AUDIT_PHASE2.md                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              ÉTAPE 2 : LECTURE & ASSIGNATION                    │
│                                                                 │
│  👤 QUI ? TOI (le patron)                                       │
│  📁 OÙ ? Lire les 3 livrables de l'Agent Audit                 │
│  ⏱️  DURÉE ? 30 minutes                                         │
│                                                                 │
│  📋 ACTIONS :                                                   │
│     1. Lire MODALS_MANQUANTS.md                                │
│     2. Lire RAPPORT_AUDIT_PHASE2.md                            │
│     3. Assigner chaque bug/modal à l'agent concerné            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                ÉTAPE 3 : CORRECTIONS                            │
│                                                                 │
│  👤 QUI ? Agents 1-5 (EN PARALLÈLE)                            │
│  📁 OÙ ? Sojori-orchestrator (le NOUVEAU)                      │
│  ⏱️  DURÉE ? 1-2 jours (selon nombre de bugs)                  │
│                                                                 │
│  CHAQUE AGENT REÇOIT :                                          │
│     • docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md                     │
│     • Sa section dans MODALS_MANQUANTS.md                      │
│     • Ses bugs dans RAPPORT_AUDIT_PHASE2.md                    │
│                                                                 │
│  CHAQUE AGENT CORRIGE :                                         │
│     • Ses bugs                                                  │
│     • Ses modals manquants                                      │
│     • Teste son travail                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              ÉTAPE 4 : VALIDATION FINALE                        │
│                                                                 │
│  👤 QUI ? Agent Audit (re-test)                                │
│  📁 OÙ ? Sojori-orchestrator (le NOUVEAU)                      │
│  ⏱️  DURÉE ? 1-2 heures                                         │
│                                                                 │
│  📋 ACTIONS :                                                   │
│     • Re-tester toutes les corrections                          │
│     • Vérifier que tous les bugs sont corrigés                  │
│     • Créer rapport final OK/NON OK                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 ÉTAPE 1 : AUDIT (MAINTENANT)

### Qui fait l'audit ?

**1 SEUL AGENT : Agent Audit**

Tu lui donnes :
```
Lis et exécute : docs/PROMPT_AGENT_AUDIT.md

D'abord lis : docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

Ta mission :
1. Auditer l'ancien dashboard (sojori-dashboard)
2. Comparer avec le nouveau (Sojori-orchestrator)
3. Créer 3 livrables (voir prompt)

GO !
```

### Où donner ce prompt ?

**Dans Cursor** (ou Claude Code si tu préfères)

### Combien de temps ?

**3-5 heures** (l'agent fait tout seul)

### Livrables attendus

Quand Agent Audit a fini, tu auras **3 fichiers** :

1. **`docs/AUDIT_MODALS_ANCIEN_DASHBOARD.md`**
   - Liste exhaustive de TOUS les modals de l'ancien
   - Page par page, modal par modal

2. **`docs/MODALS_MANQUANTS.md`**
   - Liste des modals à créer PAR AGENT
   - Exemple :
     ```markdown
     ### Agent 1
     - Modal Détail Réservation (depuis timeline)
     - Modal XYZ

     ### Agent 2
     - Vue Séjour
     - Modal ABC

     ### Agent 3
     - ...
     ```

3. **`docs/RAPPORT_AUDIT_PHASE2.md`**
   - Rapport complet avec tous les bugs
   - Statistiques
   - Remarques par agent

---

## 🎯 ÉTAPE 2 : LECTURE & ASSIGNATION (TOI)

### Quand ?

**Après que Agent Audit a fini** (dans 3-5h)

### Que faire ?

1. **Lire les 3 livrables**
   ```bash
   cat docs/MODALS_MANQUANTS.md
   cat docs/RAPPORT_AUDIT_PHASE2.md
   ```

2. **Identifier les bugs par agent**

   Exemple de ce que tu vas trouver :
   ```markdown
   ### Agent 1 - Orchestration
   ❌ BUG-001 : Boutons timeline non fonctionnels
   ❌ MODAL-001 : Modal Détail Réservation manquant

   ### Agent 2 - Réservations
   ❌ BUG-002 : Vue Séjour manquante
   ❌ MODAL-002 : Modal XYZ manquant
   ```

3. **Préparer les prompts de correction** (voir Étape 3)

---

## 🎯 ÉTAPE 3 : CORRECTIONS (Agents 1-5)

### Qui corrige quoi ?

**Chaque agent corrige SES bugs** (en parallèle) :

| Agent | Bugs connus | + Bugs trouvés par audit |
|-------|-------------|--------------------------|
| **Agent 1** | Boutons Orchestration | + bugs trouvés |
| **Agent 2** | Vue Séjour | + bugs trouvés |
| **Agent 3** | ? | + bugs trouvés |
| **Agent 4** | ? | + bugs trouvés |
| **Agent 5** | ? | + bugs trouvés |

### Comment assigner les corrections ?

**Pour chaque agent, tu donnes un prompt comme ça** :

#### Exemple : Agent 1

```
Tu es Agent 1 - Auth + Orchestration.

IMPORTANT : Lis d'abord docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

Tu dois corriger ces bugs dans Sojori-orchestrator :

1. ❌ Boutons Plan Orchestration non fonctionnels
   - Référence : sojori-dashboard page Orchestration
   - Action : Brancher TOUS les boutons timeline
   - Modal à créer : Détail Réservation (s'inspirer de l'ancien)

2. [Autres bugs trouvés par audit - à copier depuis RAPPORT_AUDIT_PHASE2.md]

Workflow :
1. Lancer l'ancien : cd /Users/gouacht/sojori-dashboard && PORT=3000 npm start
2. Voir comment ça marche dans l'ancien
3. Coder dans le nouveau : cd /Users/gouacht/Sojori-orchestrator
4. Tester que ça marche

GO ! Commence par bug #1.
```

#### Exemple : Agent 2

```
Tu es Agent 2 - Réservations.

IMPORTANT : Lis d'abord docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

Tu dois corriger ces bugs dans Sojori-orchestrator :

1. ❌ Vue Séjour manquante (RÉGRESSION)
   - Référence : sojori-dashboard page Séjour
   - Action : Recréer cette page dans le nouveau
   - S'inspirer du code source de l'ancien

2. [Autres bugs trouvés par audit]

Workflow :
1. Lancer l'ancien et identifier la page Séjour
2. Noter la structure, les données affichées
3. Chercher le code source dans l'ancien
4. Recréer dans le nouveau

GO !
```

### Donner ces prompts où ?

**5 agents en parallèle** :
- Agent 1 → Cursor instance 1
- Agent 2 → Cursor instance 2 (ou Claude Code)
- Agent 3 → Cursor instance 3
- Agent 4 → Cursor instance 4
- Agent 5 → Cursor instance 5

Ou **1 seul agent séquentiel** si tu préfères :
- Agent 1 finit → puis Agent 2 → puis Agent 3 → etc.

### Combien de temps ?

**1-2 jours** (dépend du nombre de bugs trouvés)

---

## 🎯 ÉTAPE 4 : VALIDATION FINALE

### Qui valide ?

**Agent Audit** (le même qu'à l'Étape 1)

### Quand ?

**Après que tous les agents ont fini leurs corrections**

### Que faire ?

Tu donnes ce prompt à Agent Audit :

```
Tu es Agent Audit.

Les Agents 1-5 ont corrigé leurs bugs. Tu dois re-tester TOUT.

Mission :
1. Lancer Sojori-orchestrator (port 4000)
2. Re-tester TOUTES les pages
3. Vérifier que TOUS les bugs sont corrigés
4. Créer docs/VALIDATION_FINALE.md avec :
   - ✅ Bugs corrigés
   - ❌ Bugs restants (si any)
   - 🎯 Recommandation : OK pour Phase 3 ? OUI/NON

GO !
```

### Durée

**1-2 heures**

### Si tout est OK

→ **Phase 3 : Connexion APIs réelles** 🚀

### Si bugs restants

→ **Re-correction** → **Re-validation**

---

## 📋 RÉSUMÉ POUR TOI

### MAINTENANT (Étape 1)

✅ **Lancer Agent Audit**

Prompt à copier-coller :
```
Lis et exécute : docs/PROMPT_AGENT_AUDIT.md
D'abord lis : docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md

Ta mission : auditer ancien vs nouveau, créer 3 livrables.
GO !
```

Où ? **Cursor** (ou Claude Code)

Attendre : **3-5 heures**

---

### DANS 3-5H (Étape 2)

✅ **Lire les 3 livrables** :
- `docs/AUDIT_MODALS_ANCIEN_DASHBOARD.md`
- `docs/MODALS_MANQUANTS.md`
- `docs/RAPPORT_AUDIT_PHASE2.md`

✅ **Préparer les prompts de correction** pour chaque agent

---

### APRÈS LECTURE (Étape 3)

✅ **Lancer Agents 1-5** avec leurs bugs respectifs

Chaque agent reçoit :
- `docs/COMPRENDRE_ANCIEN_VS_NOUVEAU.md` (à lire d'abord)
- Sa section de bugs depuis `RAPPORT_AUDIT_PHASE2.md`

Attendre : **1-2 jours**

---

### APRÈS CORRECTIONS (Étape 4)

✅ **Relancer Agent Audit** pour validation finale

Prompt : "Re-teste tout, crée VALIDATION_FINALE.md"

Attendre : **1-2h**

---

### SI VALIDATION OK

✅ **Phase 3 : APIs réelles** 🚀

---

## ❓ TES QUESTIONS RÉPONDUES

### Q : "Je donne le prompt à qui ?"

**R : Maintenant → Agent Audit (1 seul)**

Après → Agents 1-5 (chacun ses bugs)

---

### Q : "Agent Audit fait quoi exactement ?"

**R : Il compare ancien vs nouveau et liste TOUS les bugs/modals manquants**

Il ne corrige rien, il fait juste l'inventaire.

---

### Q : "Qui corrige les bugs ?"

**R : Agents 1-5, chacun corrige SES bugs**

Exemple :
- Agent 1 corrige Orchestration
- Agent 2 corrige Vue Séjour
- Etc.

---

### Q : "Je lance tous les agents en même temps ?"

**R : Non.**

1. D'abord Agent Audit seul (fait l'inventaire)
2. Puis Agents 1-5 en parallèle (corrigent)
3. Puis Agent Audit à nouveau (valide)

---

### Q : "Combien de temps au total ?"

**R : 2-3 jours**

- Audit : 3-5h
- Corrections : 1-2 jours
- Validation : 1-2h

---

## ✅ PRÊT ?

**Prochaine action IMMÉDIATE** :

👉 **Lancer Agent Audit** avec le prompt `docs/PROMPT_AGENT_AUDIT.md`

Puis attendre 3-5h pour les livrables.

🚀
