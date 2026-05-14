# ✅ AGENT 4 - AUDIT OPÉRATIONS

**AVANT DE COMMENCER** : Lis `/Users/gouacht/Sojori-orchestrator/docs/PROMPT_GENERIQUE_TOUS_AGENTS.md`

---

## 🎯 TON DOMAINE

Tu audites les pages **OPÉRATIONS** :

1. **Tasks / Tâches**
2. **Team / Équipe** (staff management)
3. **Planning** (planning hebdo/mensuel)
4. **Staff WhatsApp** (communication équipe)

---

## 📂 FICHIERS À CHERCHER

### Ancien dashboard (`/Users/gouacht/sojori-dashboard/src/`)

Cherche ces mots-clés :
- `task`, `tache`, `todo`, `checklist`
- `team`, `staff`, `employee`, `worker`, `equipe`
- `planning`, `schedule`, `calendar`
- `whatsapp`, `chat`, `message`

**Exemples de fichiers possibles** :
- `components/TasksList.jsx`
- `components/TaskBoard.jsx`
- `pages/Team.jsx`
- `components/StaffManager.jsx`
- `views/Planning.jsx`

### Nouveau dashboard (`/Users/gouacht/Sojori-orchestrator/src/pages/`)

- `TasksPage.tsx`
- `TeamPage.tsx`
- `PlanningPage.tsx`
- `StaffWhatsAppPage.tsx`

---

## 📋 CE QUE TU DOIS AUDITER

### PAGE 1 : TASKS

**Dans l'ancien, cherche** :
- Tableau tâches : TOUTES les colonnes (titre, type, assigné à, property, date, statut, priorité, etc.)
- Vue Kanban : colonnes (À faire, En cours, Bloqué, Terminé)
- Filtres : Par type (ménage, maintenance, check-in, etc.), par staff, par property, par date
- Formulaire création tâche : TOUS les champs
- Actions : Créer, Modifier, Dupliquer, Assigner, Marquer terminée
- Stats : Total tâches, en cours, en retard, par staff

**Compare avec nouveau** :
- `TasksPage.tsx` (Kanban + Liste + Timeline)

### PAGE 2 : TEAM

**Dans l'ancien, cherche** :
- Tableau staff : TOUTES les colonnes (nom, rôle, téléphone, email, langues, compétences, statut, etc.)
- Fiche staff : onglets (Profil, Planning, Performance, Paiements)
- Filtres : Par rôle, par statut (actif/inactif), par disponibilité
- Actions : Ajouter membre, Modifier, Désactiver, Envoyer message
- Stats : Total staff, actifs, occupés aujourd'hui, rating moyen

**Compare avec nouveau** :
- `TeamPage.tsx`

### PAGE 3 : PLANNING

**Dans l'ancien, cherche** :
- Vue calendrier : Jour/Semaine/Mois
- Tâches affichées : infos visibles (staff, listing, horaire, type)
- Drag & drop : fonctionnalité
- Filtres : Par staff, par type, par listing
- Création rapide : clic sur cellule → formulaire
- Stats : Charge de travail par staff, tâches non assignées

**Compare avec nouveau** :
- `PlanningPage.tsx`

### PAGE 4 : STAFF WHATSAPP

**Dans l'ancien, cherche** :
- Liste conversations : colonnes (nom staff, dernier message, timestamp, non lus)
- Zone messages : affichage (qui parle, timestamp, status, images/docs)
- Fonctionnalités : Envoyer, Joindre fichier, Templates, Emojis
- Actions spéciales : Créer tâche depuis message, Marquer important
- Recherche dans messages

**Compare avec nouveau** :
- `StaffWhatsAppPage.tsx`

---

## 📊 RAPPORT À CRÉER

**Fichier** : `/Users/gouacht/Sojori-orchestrator/docs/AUDIT_AGENT_4_OPERATIONS.md`

**Structure** :
```markdown
# AUDIT AGENT 4 - OPÉRATIONS

## PAGE 1 : TASKS
[Ancien vs Nouveau vs Manquant]

## PAGE 2 : TEAM
[Ancien vs Nouveau vs Manquant]

## PAGE 3 : PLANNING
[Ancien vs Nouveau vs Manquant]

## PAGE 4 : STAFF WHATSAPP
[Ancien vs Nouveau vs Manquant]

## RÉSUMÉ
- XX colonnes manquantes
- XX filtres manquants
- XX boutons manquants
```

---

## ✅ CHECKLIST

- [ ] Cherché fichiers tasks dans ancien
- [ ] Cherché fichiers team/staff dans ancien
- [ ] Cherché fichiers planning dans ancien
- [ ] Cherché fichiers chat/messages dans ancien
- [ ] Comparé avec nouveau (4 pages)
- [ ] Listé TOUT ce qui manque
- [ ] Créé rapport complet

---

**Fichier à livrer** : `AUDIT_AGENT_4_OPERATIONS.md`
