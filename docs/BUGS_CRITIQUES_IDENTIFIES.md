# 🚨 BUGS CRITIQUES IDENTIFIÉS PAR LE PATRON

**Date** : 14 Mai 2026
**Source** : Retour patron après livraison Phase 2
**Status** : BLOQUANT - À corriger avant Phase 3

---

## ❌ BUG #1 : VUE SÉJOUR MANQUANTE (RÉGRESSION)

### Description
La vue "Séjour" permettant d'afficher les réservations groupées par listing (multi-listings) a disparu ou n'a pas été migrée dans le nouveau dashboard.

### Ancien comportement
- Page dédiée affichant les réservations organisées par listing
- Permettait de voir toutes les réservations d'un listing donné
- **Cette fonctionnalité existait déjà dans l'ancien dashboard**

### Nouveau comportement
- ❌ Page introuvable ou fonctionnalité absente

### Impact
- **BLOQUANT** - Fonctionnalité critique pour la gestion multi-listings
- Régression majeure

### Agent responsable
**Agent 2 - Réservations**

### Action requise
1. Auditer la page "Séjour" dans `/Users/gouacht/sojori-dashboard`
2. Identifier la structure et les fonctionnalités
3. Recréer cette vue dans le nouveau dashboard
4. S'inspirer du code existant
5. Si besoin de design → demander à Claude Design

### Fichiers concernés
- À identifier dans `sojori-dashboard`
- À créer dans `Sojori-orchestrator/src/pages/`

---

## ❌ BUG #2 : BOUTONS PLAN ORCHESTRATION NON FONCTIONNELS

### Description
Tous les boutons de la page "Plan d'Orchestration" ne fonctionnent pas. Aucune interaction n'est branchée.

### Exemples de bugs
1. **Clic sur "RÉSA #1234"** dans la timeline
   - Attendu : Ouvre le modal détail réservation
   - Résultat : ❌ Rien ne se passe

2. **Clic sur "Message bienvenue"** (événement timeline)
   - Attendu : Ouvre le détail du message ou action associée
   - Résultat : ❌ Rien ne se passe

3. **Clic sur événements J-7, Email, etc.**
   - Attendu : Actions appropriées
   - Résultat : ❌ Rien ne se passe

### Ancien comportement (référence)
```
Orchestration · Plan d'orchestration
RÉSA #1234          ← Cliquable → Ouvre modal détail
📨 J-7
Message bienvenue   ← Cliquable → Ouvre modal/action
1/1 Complété
📧 Email
📧 Notification envoyée
Email · 07/05 17:00
```

### Nouveau comportement
- ❌ Timeline affichée mais non interactive
- ❌ Aucun modal ne s'ouvre
- ❌ Aucune action branchée

### Impact
- **BLOQUANT** - Page orchestration inutilisable
- Fonctionnalité centrale du dashboard non fonctionnelle

### Agent responsable
**Agent 1 - Auth + Orchestration**

### Action requise
1. Auditer la page Orchestration dans `/Users/gouacht/sojori-dashboard`
2. Identifier TOUS les modals déclenchés depuis la timeline
3. Brancher TOUS les boutons/clics de la timeline
4. Intégrer les modals manquants (probablement modal détail réservation)
5. S'inspirer du code existant
6. Si besoin de design → demander à Claude Design

### Fichiers concernés
- `src/pages/OrchestrationPage.tsx` (ou équivalent)
- Composants timeline à identifier
- Modals à créer/intégrer

---

## ❌ BUG #3 : ERREUR REACT NON GÉRÉE

### Description
Erreur React apparaissant dans la console, composant qui crash.

### Erreur console
```
client:510 An error occurred in one of your React components.

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://react.dev/link/error-boundaries to learn more about error boundaries.

(anonymous) @ client:510
defaultOnUncaughtError @ react-dom_client.js?v=9abed9df:5258
logUncaughtError @ react-dom_client.js?v=9abed9df:5287
runWithFiberInDEV @ react-dom_client.js?v=9abed9df:851
lane.callback @ react-dom_client.js?v=9abed9df:5315
callCallback @ react-dom_client.js?v=9abed9df:4095
commitCallbacks @ react-dom_client.js?v=9abed9df:4103
runWithFiberInDEV @ react-dom_client.js?v=9abed9df:851
commitLayoutEffectOnFiber @ react-dom_client.js?v=9abed9df:6986
flushLayoutEffects @ react-dom_client.js?v=9abed9df:8671
commitRoot @ react-dom_client.js?v=9abed9df:8584
commitRootWhenReady @ react-dom_client.js?v=9abed9df:8079
```

### Impact
- Composant(s) crash
- Mauvaise expérience utilisateur
- Possibles pages blanches

### Agent responsable
**À identifier** - Dépend du composant qui crash

### Action requise
1. Identifier le composant qui cause l'erreur
2. Déboguer et corriger l'erreur
3. Ajouter des error boundaries pour capturer les erreurs
4. Tester que l'erreur ne se reproduit plus

### Fichiers concernés
- À identifier via debugging

---

## 🎯 MISSION AGENT AUDIT

### Objectif principal
**Auditer TOUS les modals de l'ancien dashboard** et créer une liste exhaustive des modals manquants dans le nouveau.

### Pourquoi c'est critique
Les bugs ci-dessus montrent que :
1. Des fonctionnalités ont été oubliées (Vue Séjour)
2. Des modals ne sont pas branchés (Orchestration)
3. Probablement **beaucoup d'autres modals manquants**

### Méthodologie
1. **Parcourir TOUTES les pages** de `/Users/gouacht/sojori-dashboard`
2. **Cliquer sur TOUS les boutons** pour identifier les modals
3. **Noter chaque modal** avec :
   - Nom du modal
   - Page où il apparaît
   - Déclencheur (bouton/action)
   - Contenu (champs, sections)
   - Agent concerné
4. **Comparer avec le nouveau** dashboard
5. **Créer une liste des modals manquants** par agent

### Livrables attendus
1. ✅ `docs/AUDIT_MODALS_ANCIEN_DASHBOARD.md` - Inventaire complet
2. ✅ `docs/MODALS_MANQUANTS.md` - Liste par agent des modals à créer
3. ✅ `docs/RAPPORT_AUDIT_PHASE2.md` - Rapport complet avec tous les bugs

---

## 📊 SYNTHÈSE

### Bugs bloquants identifiés : 3
1. ❌ Vue Séjour manquante (Agent 2)
2. ❌ Boutons Orchestration non fonctionnels (Agent 1)
3. ❌ Erreur React non gérée (Agent à identifier)

### Bugs potentiels (à confirmer par audit) : ???
- Probablement **beaucoup d'autres modals manquants**
- À identifier via audit complet de l'ancien dashboard

### Prochaine étape
**Lancer Agent Audit** avec le prompt `docs/PROMPT_AGENT_AUDIT.md`

---

## 🚀 POUR LE PATRON

**Tu peux maintenant** :

1. **Lancer Agent Audit** (Cursor ou autre)
   - Copier-coller le prompt : `docs/PROMPT_AGENT_AUDIT.md`
   - Laisser tourner 3-5h
   - Attendre les 3 livrables

2. **Après l'audit** :
   - Lire `docs/MODALS_MANQUANTS.md`
   - Assigner les modals manquants à chaque agent
   - Si besoin de design → demander à Claude Design
   - Lancer les corrections

3. **Une fois corrigé** :
   - Re-tester
   - Passer à Phase 3 (APIs réelles)

**Estimation totale avant Phase 3** : 1-2 jours (audit + corrections)
