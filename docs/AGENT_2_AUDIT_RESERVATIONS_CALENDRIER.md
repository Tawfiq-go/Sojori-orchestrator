# 🎫 AGENT 2 - AUDIT RÉSERVATIONS + CALENDRIER

**Ta mission** : Comparer les pages Réservations et Calendrier de l'ancien dashboard avec le nouveau, et lister TOUT ce qui manque.

---

## 📂 DASHBOARDS À COMPARER

**Ancien** : `/Users/gouacht/sojori-dashboard/` (React, opérationnel)
**Nouveau** : `/Users/gouacht/Sojori-orchestrator/` (Vite, design moderne)

---

## 🎯 TON TRAVAIL

### ÉTAPE 1 : Explorer l'ancien dashboard

**Cherche ces fichiers** dans `/Users/gouacht/sojori-dashboard/src/` :
- Fichiers contenant "reservation", "booking", "calendar", "calendrier"
- Dans `components/`, `pages/`, `views/`

**Pour chaque fichier trouvé, note** :
1. **Tableaux** : Liste TOUTES les colonnes affichées
2. **Formulaires** : Liste TOUS les champs
3. **Boutons** : Liste TOUS les boutons et leurs actions
4. **Filtres** : Liste TOUS les filtres disponibles
5. **Stats** : Liste TOUS les chiffres/KPIs affichés

### ÉTAPE 2 : Explorer le nouveau dashboard

**Cherche ces fichiers** dans `/Users/gouacht/Sojori-orchestrator/src/pages/` :
- `ReservationsPage.tsx`
- `CalendarInventoryPage.tsx`
- `InventoryPage.tsx`

**Fais la même chose** : liste colonnes, champs, boutons, filtres, stats

### ÉTAPE 3 : Comparer

Pour chaque donnée de l'ancien, vérifie si elle existe dans le nouveau.

---

## 📋 FORMAT DE RAPPORT

Crée un fichier `/Users/gouacht/Sojori-orchestrator/docs/AUDIT_AGENT_2_RESERVATIONS_CALENDRIER.md` avec ce format :

```markdown
# AUDIT AGENT 2 - Réservations + Calendrier

Date : [Date]
Agent : 2

---

## 🎫 PAGE : RÉSERVATIONS

### Ancien Dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/[chemin exact]`

**Colonnes du tableau** :
1. ID réservation
2. Guest (nom)
3. Property (nom listing)
4. Check-in (date)
5. Check-out (date)
6. Nuits
7. Montant total (€)
8. Statut (badge)
9. Source (OTA)
10. Commission (€)
11. Créé le (date)
12. [... liste TOUTES les colonnes]

**Filtres disponibles** :
- Par statut (Confirmée, Annulée, En attente, etc.)
- Par property
- Par source OTA
- Par dates (range)
- [... liste TOUS les filtres]

**Boutons/Actions** :
- "Créer réservation" → Ouvre modal
- "Exporter CSV" → Download
- "Voir détails" (par ligne) → Page détail
- "Modifier" → Modal édition
- "Annuler" → Confirmation
- [... liste TOUS les boutons]

**Stats affichées** :
- Total réservations : 234
- Revenus mois : 45,380 €
- Taux d'occupation : 87%
- ADR (Average Daily Rate) : 142 €
- [... liste TOUTES les stats]

**Formulaire "Créer réservation"** :
- Champ : Guest (select)
- Champ : Property (select)
- Champ : Check-in (date)
- Champ : Check-out (date)
- Champ : Nombre guests (number)
- Champ : Prix total (€)
- Champ : Source (select : Direct, Airbnb, Booking, etc.)
- Champ : Notes internes (textarea)
- [... liste TOUS les champs]

---

### Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/ReservationsPage.tsx`

**Colonnes du tableau** :
1. ID
2. Guest
3. Property
4. Check-in
5. Check-out
6. Montant
7. Statut
8. [... liste ce qui EXISTE déjà]

**Filtres disponibles** :
- Par statut
- [... liste ce qui EXISTE déjà]

**Boutons/Actions** :
- "Voir détails"
- [... liste ce qui EXISTE déjà]

**Stats affichées** :
- Total réservations
- Revenus
- [... liste ce qui EXISTE déjà]

---

### ❌ CE QUI MANQUE DANS LE NOUVEAU

**Colonnes manquantes** :
- ❌ Commission (€)
- ❌ Créé le (date)
- ❌ Nuits (nombre)
- [... liste TOUT ce qui manque]

**Filtres manquants** :
- ❌ Par source OTA
- ❌ Par dates (range picker)
- [... liste TOUT ce qui manque]

**Boutons manquants** :
- ❌ "Créer réservation"
- ❌ "Exporter CSV"
- ❌ "Modifier"
- ❌ "Annuler"
- [... liste TOUT ce qui manque]

**Stats manquantes** :
- ❌ ADR
- ❌ Taux d'occupation
- [... liste TOUT ce qui manque]

**Champs formulaire manquants** :
- ❌ Nombre guests
- ❌ Notes internes
- [... liste TOUT ce qui manque]

---

### 💡 RECOMMANDATIONS

**À AJOUTER dans ReservationsPage.tsx** :
1. Ajouter colonnes : Commission, Créé le, Nuits
2. Ajouter filtres : Source OTA, Date range
3. Ajouter boutons : Créer, Exporter, Modifier, Annuler
4. Ajouter stats : ADR, Taux occupation
5. Créer modal "Créer réservation" avec 8+ champs

**OU** :
Si trop de données manquantes → Créer page "Other - Réservations Extended" dans menu

---

## 📅 PAGE : CALENDRIER

[Même format que ci-dessus]

### Ancien Dashboard

**Fichier** : `/Users/gouacht/sojori-dashboard/src/[chemin]`

**Vues disponibles** :
- Vue mois
- Vue semaine
- Vue jour
- Vue Gantt
- [... liste TOUTES les vues]

**Fonctionnalités** :
- Drag & drop réservations
- Créer blocage manuel
- Modifier prix par jour
- Sync iCal
- [... liste TOUTES les fonctionnalités]

**Filtres** :
- Par property
- Par statut (dispo/réservé/bloqué)
- [... liste TOUS les filtres]

---

### Nouveau Dashboard

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/CalendarInventoryPage.tsx`

[Liste ce qui EXISTE]

---

### ❌ CE QUI MANQUE DANS LE NOUVEAU

[Liste TOUT ce qui manque]

---

### 💡 RECOMMANDATIONS

[Quoi ajouter où]

---

## 📊 RÉSUMÉ GLOBAL

**Total données manquantes** :
- XX colonnes
- XX filtres
- XX boutons
- XX stats
- XX champs formulaire
- XX fonctionnalités

**Priorité** :
1. 🔴 HAUTE : [Données critiques]
2. 🟠 MOYENNE : [Données importantes]
3. 🟡 BASSE : [Nice to have]

---

## ✅ CHECKLIST

- [ ] Exploré ancien dashboard (Réservations)
- [ ] Exploré nouveau dashboard (Réservations)
- [ ] Listé TOUTES les colonnes ancien vs nouveau
- [ ] Listé TOUS les filtres ancien vs nouveau
- [ ] Listé TOUS les boutons ancien vs nouveau
- [ ] Listé TOUTES les stats ancien vs nouveau
- [ ] Fait de même pour Calendrier
- [ ] Créé liste de recommandations
- [ ] Sauvegardé rapport complet

---

**Date de livraison** : [Date]
**Agent** : 2
```

---

## 🚨 IMPORTANT

- Sois **EXHAUSTIF** : Ne manque AUCUNE colonne, AUCUN bouton
- Si tu trouves un tableau avec 15 colonnes dans l'ancien et 8 dans le nouveau → Liste les 7 manquantes
- Si tu vois un formulaire avec 20 champs dans l'ancien et 10 dans le nouveau → Liste les 10 manquants
- **N'invente rien** : Copie exactement ce que tu vois dans le code
- **Cherche partout** : Regarde les modals, drawers, tooltips, etc.

---

## 📤 LIVRAISON

Quand tu as fini, envoie-moi le fichier :
`/Users/gouacht/Sojori-orchestrator/docs/AUDIT_AGENT_2_RESERVATIONS_CALENDRIER.md`

Je pourrai alors créer les prompts pour compléter les pages manquantes.
