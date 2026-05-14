# 🚀 PHASE 2 - RÉCAP LANCEMENT PARALLÈLE

**Date** : 14 Mai 2026
**Objectif** : Finaliser MOCK complet aujourd'hui
**Agents** : 5 en parallèle + Claude Design

---

## 📋 ORDRE DE LANCEMENT

### 1. CLAUDE DESIGN (EN PREMIER)

**Prompt** : `/Users/gouacht/Sojori-orchestrator/docs/PROMPT_CLAUDE_DESIGN_COMPOSANTS_MANQUANTS.md`

**Composants à créer** :
- Modals (5) : CreateReservation, CreateTask, AddTeamMember, EditPlanning, Broadcast
- Panels (1) : StaffTasksPanel
- Sections (2) : TravelersSection, FinancialSection
- Filtres (2) : AdvancedTaskFilters, ColumnSelector
- Vues (3) : ReservationsGanttView, PricingRulesEditor, ChannelsDashboard

**Total** : 13 composants

**Durée estimée** : 3-4h

**Livrable** : Fichiers `.tsx` dans `src/components/`

---

### 2. AGENTS 2-5 (EN PARALLÈLE - APRÈS DESIGN)

#### Agent 2 - Réservations + Calendrier
**Prompt** : `/Users/gouacht/Sojori-orchestrator/docs/PHASE2_PROMPT_AGENT_2.md`

**Tâches** :
- Intégrer 5 modals Claude Design
- Ajouter 15 colonnes
- Implémenter 8 filtres
- Ajouter 13 actions
- Fusionner Calendrier/Inventaire

**Durée estimée** : 6-8h

---

#### Agent 3 - Catalogue
**Prompt** : `/Users/gouacht/Sojori-orchestrator/docs/PHASE2_PROMPT_AGENT_3.md`

**Tâches** :
- Compléter 18 onglets listing
- Intégrer PricingRulesEditor
- Intégrer ChannelsDashboard
- Créer 3 pages satellites (WhatsAppContacts, CRM, Onboarding)

**Durée estimée** : 8-10h

---

#### Agent 4 - Opérations
**Prompt** : `/Users/gouacht/Sojori-orchestrator/docs/PHASE2_PROMPT_AGENT_4.md`

**Tâches** :
- Intégrer 4 modals Claude Design
- Ajouter 9 colonnes tasks + 9 team
- Implémenter 15 filtres tasks
- Ajouter actions par ligne (8 tasks, 8 team)
- Enrichir planning
- Intégrer StaffTasksPanel

**Durée estimée** : 8-10h

---

#### Agent 5 - Communications
**Prompt** : `/Users/gouacht/Sojori-orchestrator/docs/PHASE2_PROMPT_AGENT_5.md`

**Tâches** :
- 🔴 CORRIGER 6 blocages techniques (P0)
- Ajouter 20+ filtres
- Implémenter 15+ actions
- Brancher toutes les fonctions

**Durée estimée** : 4-6h

---

## 🎯 PRIORITÉS PAR AGENT

### Agent 5 (Communications) - PRIORITÉ MAXIMALE
**Pourquoi ?** : Blocages techniques empêchent pages de fonctionner

**Faire EN PREMIER** :
1. ✅ Brancher `onSend` (CommsPage, OTAMessagesPage)
2. ✅ Brancher `handleSendMessage` (StaffWhatsAppPage)
3. ✅ Aligner contrats DataTable (ReviewsPage, RequestsPage)

**Résultat** : 5 pages Communications fonctionnelles

---

### Agent 2 (Réservations)
**Priorité** : Formulaires

**Faire EN PREMIER** :
1. ✅ Intégrer CreateReservationModal
2. ✅ Intégrer TravelersSection
3. ✅ Ajouter colonnes essentielles (reservationNumber, phone, payment)

---

### Agent 4 (Opérations)
**Priorité** : Formulaires

**Faire EN PREMIER** :
1. ✅ Intégrer CreateTaskModal
2. ✅ Intégrer AddTeamMemberModal
3. ✅ Ajouter filtres avancés

---

### Agent 3 (Catalogue)
**Priorité** : Onglets listing

**Faire EN PREMIER** :
1. ✅ Compléter 6 onglets critiques (address, licenses, whatsapp, automsg, cleaning, access)
2. ✅ Brancher filtres listings
3. ✅ Intégrer PricingRulesEditor

---

## ⏱️ TIMELINE JOURNÉE

### 09:00-12:00 : Claude Design
- Créer 13 composants
- Tester en isolation
- Commit + push

### 12:00-13:00 : Pause

### 13:00-14:00 : Agents démarrent (P0 uniquement)
- Agent 5 : Corriger 6 blocages
- Autres agents : Intégrer modals

### 14:00-18:00 : Agents travaillent (P1)
- Agent 2 : Colonnes + filtres
- Agent 3 : Onglets listing
- Agent 4 : Filtres + actions
- Agent 5 : Filtres + actions

### 18:00-19:00 : Tests
- Toi : Tester toutes les pages
- Identifier bugs
- Créer liste corrections

### 19:00-21:00 : Corrections (si nécessaire)
- Agents corrigent bugs identifiés

### 21:00 : Livraison finale
- Commit + push
- Documentation mise à jour

---

## ✅ CHECKLIST VALIDATION

### Claude Design
- [ ] 13 composants créés
- [ ] TypeScript sans erreurs
- [ ] Props documentées
- [ ] MOCK data intégré
- [ ] Responsive (mobile + desktop)

### Agent 2
- [ ] 5 modals intégrés
- [ ] 15 colonnes affichées
- [ ] 8 filtres fonctionnels
- [ ] 13 actions cliquables
- [ ] Calendrier/Inventaire fusionnés

### Agent 3
- [ ] 18 onglets listing implémentés
- [ ] PricingRulesEditor intégré
- [ ] ChannelsDashboard intégré
- [ ] 3 pages satellites créées

### Agent 4
- [ ] 4 modals intégrés
- [ ] 18 colonnes ajoutées (tasks + team)
- [ ] 15 filtres tasks
- [ ] 16 actions implémentées
- [ ] Planning enrichi
- [ ] StaffTasksPanel intégré

### Agent 5
- [ ] 6 blocages corrigés
- [ ] 20 filtres ajoutés
- [ ] 15 actions branchées
- [ ] Toutes pages Communications fonctionnelles

---

## 🧪 TESTS À FAIRE (TOI)

### Réservations
1. Créer nouvelle résa → Formulaire 19 champs OK
2. Ajouter voyageur → Section voyageurs OK
3. Filtrer par listing → Filtre OK
4. Clic actions menu → Toutes actions OK
5. Vue calendrier → Drag & drop OK

### Catalogue
1. Créer listing → 22 onglets accessibles
2. Modifier règle pricing → Éditeur OK
3. Import RU → Wizard OK
4. Voir clients → Pages satellites OK

### Opérations
1. Créer tâche → Formulaire 29 champs OK
2. Filtrer tasks → Filtres avancés OK
3. Ajouter membre team → Formulaire 17 champs OK
4. Modifier planning → Horaires OK
5. WhatsApp staff → Envoi message OK

### Communications
1. Envoyer message WhatsApp → Message envoyé
2. Envoyer message OTA → Message envoyé
3. Staff WhatsApp broadcast → Broadcast OK
4. Répondre review → Modal OK
5. Approuver request → Status updated

---

## 🐛 SI BUGS

**Processus** :
1. Noter bug dans fichier `BUGS_PHASE2.md`
2. Assigner à l'agent responsable
3. Agent corrige en priorité
4. Re-tester

**Bugs bloquants** (à corriger immédiatement) :
- Crash app
- Page blanche
- Bouton ne fait rien

**Bugs non-bloquants** (à corriger après) :
- Design cassé (mobile)
- Tooltip manquant
- Texte non traduit

---

## 📊 MÉTRIQUES SUCCÈS

**Critères validation** :
- ✅ 0 blocage technique (5 actuels corrigés)
- ✅ 80%+ formulaires CRUD fonctionnels
- ✅ 70%+ filtres implémentés
- ✅ 100% actions principales branchées (pas console.log)
- ✅ Toutes pages cliquables (pas page blanche)

**Si métriques atteintes** : Phase 2 MOCK terminée ✅

**Sinon** : Continuer demain avec agents manquants

---

## 🚀 COMMANDES LANCEMENT

### Claude Design
```bash
# Session 1 - Claude Design
# Copier-coller : PROMPT_CLAUDE_DESIGN_COMPOSANTS_MANQUANTS.md
```

### Agent 2
```bash
# Session 2 - Agent 2
# Copier-coller : PHASE2_PROMPT_AGENT_2.md
```

### Agent 3
```bash
# Session 3 - Agent 3
# Copier-coller : PHASE2_PROMPT_AGENT_3.md
```

### Agent 4
```bash
# Session 4 - Agent 4
# Copier-coller : PHASE2_PROMPT_AGENT_4.md
```

### Agent 5
```bash
# Session 5 - Agent 5
# Copier-coller : PHASE2_PROMPT_AGENT_5.md
```

---

## 📝 NOTES IMPORTANTES

1. **Ordre critique** : Claude Design AVANT les agents
2. **Agents en parallèle** : Pas d'interdépendances
3. **MOCK seulement** : Pas d'API calls
4. **Toasts partout** : Feedback utilisateur
5. **Pas de optimisation** : Focus fonctionnel d'abord

---

**C'EST PARTI ! Bonne chance !** 🚀
