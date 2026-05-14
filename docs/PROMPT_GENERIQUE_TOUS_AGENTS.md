# 🎯 PROMPT GÉNÉRIQUE - TOUS LES AGENTS

**À copier-coller pour TOUS les agents (2, 3, 4, 5)**

---

## 📋 CONTEXTE DU PROJET

Nous avons 2 dashboards :

1. **sojori-dashboard** (ancien) - `/Users/gouacht/sojori-dashboard/`
   - React ancien
   - OPÉRATIONNEL avec backend + vraies données
   - Interface complète avec TOUTES les données

2. **Sojori-orchestrator** (nouveau) - `/Users/gouacht/Sojori-orchestrator/`
   - Vite + React 18 + TypeScript
   - Design moderne fait par Claude Design
   - Seulement le DESIGN pour l'instant (données MOCK)

---

## 🎯 TA MISSION

**Comparer l'ancien et le nouveau dashboard et lister TOUTES les données qui manquent dans le nouveau.**

### Phase actuelle : AUDIT

On est en **Phase 1 : Audit comparatif**

**Ce que tu DOIS faire** :
1. ✅ Explorer l'ancien dashboard (ton domaine)
2. ✅ Explorer le nouveau dashboard (ton domaine)
3. ✅ Comparer page par page
4. ✅ Lister TOUT ce qui manque dans le nouveau
5. ✅ Créer un rapport détaillé

**Ce que tu NE dois PAS faire** :
- ❌ Modifier le code
- ❌ Ajouter des fonctionnalités
- ❌ Connecter des APIs
- ❌ Coder quoi que ce soit

**Plus tard (Phase 2)** : Quelqu'un d'autre ajoutera les données manquantes
**Encore plus tard (Phase 3)** : On connectera les vraies APIs

---

## 📂 STRUCTURE DES DASHBOARDS

### Ancien dashboard (`sojori-dashboard`)

```
/Users/gouacht/sojori-dashboard/
├── src/
│   ├── components/        # Composants React
│   ├── pages/            # Pages principales
│   ├── views/            # Vues
│   ├── redux/            # State management
│   └── services/         # API calls
```

**Cherche** : Fichiers .jsx, .js avec des tableaux, formulaires, boutons

### Nouveau dashboard (`Sojori-orchestrator`)

```
/Users/gouacht/Sojori-orchestrator/
├── src/
│   ├── pages/            # Pages TypeScript
│   ├── components/       # Composants
│   └── ...
```

---

## 🔍 CE QU'IL FAUT AUDITER

Pour CHAQUE page de ton domaine, note :

### 1. TABLEAUX

Liste **TOUTES** les colonnes affichées :

**Exemple** :
```markdown
**Ancien dashboard - Table Réservations** :
1. ID
2. Guest (nom + photo)
3. Property (nom listing)
4. Check-in (date)
5. Check-out (date)
6. Nuits (nombre)
7. Montant total (€)
8. Commission (€)
9. Net owner (€)
10. Statut (badge coloré)
11. Source (Airbnb/Booking/Direct)
12. Créé le (date + heure)
13. Modifié le (date)
14. Actions (boutons Voir/Modifier/Annuler)
```

**Nouveau dashboard - Table Réservations** :
```markdown
1. ID
2. Guest
3. Property
4. Check-in
5. Check-out
6. Montant
7. Statut
8. Actions (Voir)
```

**Manque** :
- ❌ Nuits
- ❌ Commission
- ❌ Net owner
- ❌ Source
- ❌ Créé le
- ❌ Modifié le
- ❌ Boutons Modifier/Annuler

### 2. FILTRES

Liste **TOUS** les filtres disponibles :

**Exemple** :
```markdown
**Ancien** :
- Filtre par statut (dropdown: Toutes, Confirmée, Annulée, En attente)
- Filtre par property (multi-select)
- Filtre par source OTA (multi-select)
- Filtre par dates (date range picker)
- Recherche par guest name (input texte)

**Nouveau** :
- Filtre par statut (dropdown)

**Manque** :
- ❌ Filtre par property
- ❌ Filtre par source OTA
- ❌ Filtre par dates
- ❌ Recherche par guest
```

### 3. BOUTONS / ACTIONS

Liste **TOUS** les boutons :

**Exemple** :
```markdown
**Ancien** :
- "Créer réservation" (header) → Ouvre modal
- "Exporter CSV" (header) → Download
- "Exporter PDF" (header) → Download
- "Imprimer" (header) → Print
- "Voir détails" (par ligne) → Navigate
- "Modifier" (par ligne) → Modal
- "Annuler" (par ligne) → Confirmation
- "Dupliquer" (par ligne) → Modal pré-rempli

**Nouveau** :
- "Voir détails" (par ligne)

**Manque** :
- ❌ Créer réservation
- ❌ Exporter CSV/PDF
- ❌ Imprimer
- ❌ Modifier
- ❌ Annuler
- ❌ Dupliquer
```

### 4. STATS / KPIs

Liste **TOUS** les chiffres affichés :

**Exemple** :
```markdown
**Ancien** :
- Total réservations : 234
- Réservations confirmées : 198
- Revenus du mois : 45,380 €
- Taux d'occupation : 87.4%
- ADR (Average Daily Rate) : 142 €
- RevPAR : 124 €
- Réservations en attente : 12

**Nouveau** :
- Total réservations : 234
- Revenus : 45,380 €

**Manque** :
- ❌ Réservations confirmées
- ❌ Taux d'occupation
- ❌ ADR
- ❌ RevPAR
- ❌ En attente
```

### 5. FORMULAIRES

Liste **TOUS** les champs de formulaire :

**Exemple** :
```markdown
**Ancien - Modal "Créer réservation"** :
1. Guest (select avec autocomplete)
2. Property (select)
3. Check-in (date picker)
4. Check-out (date picker)
5. Nombre de guests (number)
6. Nombre d'adultes (number)
7. Nombre d'enfants (number)
8. Prix par nuit (€)
9. Prix total (€ - calculé auto)
10. Source (select: Direct, Airbnb, Booking, Vrbo, etc.)
11. Commission (% - calculé auto selon source)
12. Notes internes (textarea)
13. Envoyer email confirmation (checkbox)

**Nouveau** :
[Formulaire n'existe pas]

**Manque** :
- ❌ Tout le formulaire
```

### 6. FONCTIONNALITÉS SPÉCIALES

**Exemple** :
```markdown
**Ancien** :
- Drag & drop pour changer dates
- Export iCal
- Sync auto OTA (toutes les 5 min)
- Notifications temps réel
- Multi-sélection bulk actions

**Nouveau** :
- Rien

**Manque** :
- ❌ Tout
```

---

## 📋 FORMAT DU RAPPORT

Crée un fichier markdown dans `/Users/gouacht/Sojori-orchestrator/docs/` avec ce nom :
- `AUDIT_AGENT_2_[TON_DOMAINE].md`
- `AUDIT_AGENT_3_[TON_DOMAINE].md`
- etc.

**Structure du rapport** :

```markdown
# AUDIT AGENT [X] - [Ton domaine]

Date : [Date d'aujourd'hui]
Agent : [Numéro]
Domaine : [Pages auditées]

---

## 📊 RÉSUMÉ EXÉCUTIF

**Pages auditées** : X
**Colonnes manquantes** : XX
**Filtres manquants** : XX
**Boutons manquants** : XX
**Stats manquantes** : XX
**Formulaires manquants** : XX

**Priorité globale** : 🔴 HAUTE / 🟠 MOYENNE / 🟡 BASSE

---

## 📄 PAGE 1 : [NOM]

### Ancien Dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/[chemin exact]`
**Route** : `/[route]`

#### Tableaux
[Liste TOUTES les colonnes]

#### Filtres
[Liste TOUS les filtres]

#### Boutons
[Liste TOUS les boutons]

#### Stats
[Liste TOUTES les stats]

#### Formulaires
[Liste TOUS les champs]

---

### Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/[nom].tsx`
**Existe** : ✅ Oui / ❌ Non

[Même chose que ancien]

---

### ❌ MANQUANT

**Colonnes** :
- ❌ [Colonne 1]
- ❌ [Colonne 2]

**Filtres** :
- ❌ [Filtre 1]

**Boutons** :
- ❌ [Bouton 1]

**Stats** :
- ❌ [Stat 1]

**Formulaires** :
- ❌ [Formulaire complet]

---

### 💡 RECOMMANDATIONS

**Option 1 : Ajouter dans page existante**
- Ajouter XX colonnes
- Ajouter XX filtres
- Ajouter XX boutons
- Créer modal avec XX champs

**Option 2 : Créer page "Other"**
Si trop de données manquantes → Créer page séparée "Other - [Nom Extended]"

---

[Répéter pour chaque page de ton domaine]

---

## 🎯 PRIORISATION

### 🔴 CRITIQUE (Must have)
- [Données business critical]

### 🟠 IMPORTANT (Should have)
- [Données importantes]

### 🟡 NICE TO HAVE (Could have)
- [Données bonus]

---

## ✅ CHECKLIST

- [ ] Exploré ancien dashboard
- [ ] Listé toutes pages de mon domaine
- [ ] Pour chaque page : listé colonnes
- [ ] Pour chaque page : listé filtres
- [ ] Pour chaque page : listé boutons
- [ ] Pour chaque page : listé stats
- [ ] Pour chaque page : listé formulaires
- [ ] Exploré nouveau dashboard
- [ ] Fait comparaison complète
- [ ] Créé recommandations
- [ ] Sauvegardé rapport
```

---

## 🚨 RÈGLES IMPORTANTES

### DO ✅

- ✅ Sois EXHAUSTIF : Ne manque RIEN
- ✅ Copie EXACTEMENT ce que tu vois dans le code
- ✅ Si un tableau a 20 colonnes dans l'ancien, liste les 20
- ✅ Cherche dans TOUS les fichiers (components, modals, drawers)
- ✅ Note même les petites choses (tooltips, icônes, badges)
- ✅ Utilise la fonction Read pour lire les fichiers
- ✅ Utilise Grep pour chercher des mots-clés
- ✅ Sauvegarde ton rapport complet

### DON'T ❌

- ❌ N'invente rien
- ❌ Ne modifie aucun fichier
- ❌ Ne code rien
- ❌ Ne fais pas de suppositions
- ❌ N'oublie aucune colonne/bouton
- ❌ Ne résume pas (on veut TOUT)

---

## 🔧 OUTILS À UTILISER

### Chercher des fichiers
```bash
# Exemple : Chercher fichiers réservations
Glob: **/Reservation*.jsx dans /Users/gouacht/sojori-dashboard/src/
Glob: **/Booking*.jsx
```

### Lire un fichier
```bash
Read: /Users/gouacht/sojori-dashboard/src/components/ReservationsList.jsx
```

### Chercher du texte
```bash
Grep: "className.*table" dans /Users/gouacht/sojori-dashboard/src/
Grep: "onClick" pour trouver boutons
```

---

## 📤 LIVRAISON

**Fichier à créer** : `/Users/gouacht/Sojori-orchestrator/docs/AUDIT_AGENT_[X]_[DOMAINE].md`

**Format** : Markdown complet selon template ci-dessus

**Contenu minimum** :
- Résumé exécutif
- 1 section par page auditée
- Comparaison ancien vs nouveau
- Liste complète de ce qui manque
- Recommandations

---

## 🎯 TON DOMAINE SPÉCIFIQUE

**Regarde ton prompt spécifique** pour savoir quelles pages tu dois auditer :
- Agent 2 → Réservations + Calendrier
- Agent 3 → Catalogue (Listings, Pricing, Channels, Clients)
- Agent 4 → Opérations (Tasks, Team, Planning)
- Agent 5 → Communications (Messages, Reviews, Requests)

---

**Bon courage ! Sois exhaustif, ne manque rien !** 🚀
