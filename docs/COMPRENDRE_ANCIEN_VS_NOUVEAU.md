# 📚 COMPRENDRE : ANCIEN vs NOUVEAU PROJET

**Pour tous les agents** : Lis ce document AVANT de commencer toute tâche.

---

## 🎯 IL Y A 2 PROJETS DISTINCTS

### 1️⃣ **ANCIEN PROJET** = sojori-dashboard

📁 **Chemin** : `/Users/gouacht/sojori-dashboard`

**C'est quoi ?**
- L'ancien dashboard Sojori
- **Déjà en PRODUCTION**
- Application React complète et fonctionnelle
- Utilisé actuellement par les utilisateurs

**Pourquoi c'est important pour toi ?**
- ✅ C'est la **RÉFÉRENCE** : tout ce qui existe ici DOIT exister dans le nouveau
- ✅ C'est la **SOURCE** : tu peux t'inspirer du code source
- ✅ C'est la **VÉRITÉ** : si une fonctionnalité existe ici, elle ne peut PAS manquer dans le nouveau

**Comment le voir ?**
```bash
cd /Users/gouacht/sojori-dashboard
# Lancer (vérifier la commande exacte - probablement:)
PORT=3000 npm start
# Ou:
HOST=localhost PORT=3000 npm start
```

**URL** : http://localhost:3000 (probablement)

**Code source** : Disponible dans `/Users/gouacht/sojori-dashboard/src/`

---

### 2️⃣ **NOUVEAU PROJET** = Sojori-orchestrator

📁 **Chemin** : `/Users/gouacht/Sojori-orchestrator`

**C'est quoi ?**
- Le **NOUVEAU** dashboard Sojori (refonte complète)
- **EN DÉVELOPPEMENT** (pas encore en production)
- Phase 2 vient d'être livrée (par toi et les autres agents)
- Stack moderne : Vite 8 + React 18 + TypeScript + Material-UI v9
- Design : Aurora Soft Light (#e6b022 gold, #8b5cf6 purple)

**Pourquoi c'est important pour toi ?**
- ⚠️ C'est LE projet sur lequel **TU TRAVAILLES**
- ⚠️ C'est ici que tu dois **AJOUTER/CORRIGER** du code
- ⚠️ Probablement **INCOMPLET** par rapport à l'ancien

**Comment le voir ?**
```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4000
```

**URL** : http://localhost:4000

**Code source** : Dans `/Users/gouacht/Sojori-orchestrator/src/`

---

## 📊 TABLEAU COMPARATIF

| Critère | ANCIEN (sojori-dashboard) | NOUVEAU (Sojori-orchestrator) |
|---------|---------------------------|-------------------------------|
| **Chemin** | `/Users/gouacht/sojori-dashboard` | `/Users/gouacht/Sojori-orchestrator` |
| **Port** | 3000 | 4000 |
| **Status** | ✅ Production | 🚧 Développement |
| **Complet ?** | ✅ Oui | ⚠️ Non (Phase 2 juste livrée) |
| **Stack** | React (ancien) | Vite + React 18 + TypeScript |
| **Design** | Ancien design | Aurora Soft Light |
| **Ton rôle** | 📖 RÉFÉRENCE (lire) | ✍️ TRAVAIL (écrire) |
| **Lancer** | `PORT=3000 npm start` | `pnpm dev --port 4000` |

---

## 🎯 TON RÔLE EN FONCTION DE TA MISSION

### Si tu es **Agent Audit**

**Ta mission** :
1. **Auditer l'ANCIEN** → Identifier TOUT ce qui existe
2. **Comparer avec le NOUVEAU** → Identifier ce qui manque
3. **Documenter** → Lister les bugs et modals manquants

**Tu dois** :
- Lancer les 2 projets en parallèle
- Comparer page par page
- Noter TOUT ce qui manque dans le nouveau

---

### Si tu es **Agent 1, 2, 3, 4 ou 5** (en phase de correction)

**Ta mission** :
1. **Consulter l'ANCIEN** → Voir comment la fonctionnalité marche
2. **Coder dans le NOUVEAU** → Ajouter/corriger la fonctionnalité
3. **Tester** → Vérifier que ça marche comme l'ancien

**Tu dois** :
- Regarder le code source de l'ancien (inspiration)
- Écrire le code dans le nouveau (implémentation)
- Ne JAMAIS modifier l'ancien (c'est la prod)

---

## 🚨 ERREURS COURANTES À ÉVITER

### ❌ ERREUR 1 : Confondre les projets
```
Mauvais : "Je vais modifier sojori-dashboard"
Bon     : "Je vais modifier Sojori-orchestrator en m'inspirant de sojori-dashboard"
```

### ❌ ERREUR 2 : Modifier l'ancien
```
Mauvais : "J'ai corrigé le bug dans /Users/gouacht/sojori-dashboard"
Bon     : "J'ai regardé sojori-dashboard et copié la solution dans Sojori-orchestrator"
```

### ❌ ERREUR 3 : Ignorer l'ancien
```
Mauvais : "Je vais créer le modal de zéro"
Bon     : "Je vais d'abord voir comment le modal existe dans l'ancien, puis le recréer"
```

### ❌ ERREUR 4 : Travailler sur le mauvais port
```
Mauvais : "Le nouveau est sur port 3000"
Bon     : "L'ANCIEN est sur 3000, le NOUVEAU sur 4000"
```

---

## 📋 CHECKLIST AVANT DE COMMENCER

Avant de commencer une tâche, vérifie :

- [ ] Je sais quel est l'ANCIEN projet (`sojori-dashboard`)
- [ ] Je sais quel est le NOUVEAU projet (`Sojori-orchestrator`)
- [ ] Je sais lequel je dois MODIFIER (le nouveau)
- [ ] Je sais lequel je dois CONSULTER (l'ancien)
- [ ] Je connais les chemins des 2 projets
- [ ] Je connais les ports des 2 projets (3000 vs 4000)
- [ ] Je ne vais PAS modifier l'ancien (production)

---

## 🎯 EXEMPLES CONCRETS

### Exemple 1 : Corriger "Vue Séjour manquante"

**Mauvais workflow** :
1. ❌ Créer une nouvelle page de zéro dans le nouveau
2. ❌ Deviner ce qu'elle doit contenir

**Bon workflow** :
1. ✅ Lancer l'ancien : `cd /Users/gouacht/sojori-dashboard && PORT=3000 npm start`
2. ✅ Ouvrir http://localhost:3000 et aller sur la page "Séjour"
3. ✅ Noter exactement ce qui s'affiche (layout, données, filtres, actions)
4. ✅ Chercher le fichier source dans `/Users/gouacht/sojori-dashboard/src/pages/`
5. ✅ Lire le code source pour comprendre la logique
6. ✅ Lancer le nouveau : `cd /Users/gouacht/Sojori-orchestrator && pnpm dev --port 4000`
7. ✅ Créer/modifier la page dans `/Users/gouacht/Sojori-orchestrator/src/pages/`
8. ✅ Tester que ça marche comme l'ancien

---

### Exemple 2 : Brancher boutons Orchestration

**Mauvais workflow** :
1. ❌ Deviner ce que le bouton doit faire
2. ❌ Créer un modal random

**Bon workflow** :
1. ✅ Lancer l'ancien dashboard
2. ✅ Cliquer sur le bouton "RÉSA #1234" et voir ce qui s'ouvre
3. ✅ Noter le contenu exact du modal (champs, sections, boutons)
4. ✅ Chercher le composant modal dans le code source de l'ancien
5. ✅ S'inspirer de ce code pour créer le modal dans le nouveau
6. ✅ Brancher le bouton dans le nouveau pour ouvrir ce modal
7. ✅ Tester que ça marche pareil

---

## 🔑 RÈGLES D'OR

1. **L'ANCIEN = RÉFÉRENCE** → Ne jamais inventer, toujours copier l'existant
2. **LE NOUVEAU = TRAVAIL** → C'est ici que tu écris le code
3. **CODE SOURCE DISPONIBLE** → Toujours regarder l'ancien avant de coder
4. **NE JAMAIS MODIFIER L'ANCIEN** → C'est la production, touche pas !
5. **2 PORTS DIFFÉRENTS** → 3000 (ancien) vs 4000 (nouveau)

---

## 📞 EN CAS DE DOUTE

**Question** : "Je ne sais pas sur quel projet travailler ?"
**Réponse** : **TOUJOURS le nouveau** (`Sojori-orchestrator`), en **consultant** l'ancien

**Question** : "Je ne trouve pas une fonctionnalité ?"
**Réponse** : Vérifie d'abord si elle existe dans **l'ancien** (`sojori-dashboard`)

**Question** : "Le code ne marche pas ?"
**Réponse** : Compare avec **l'ancien** pour voir comment c'était fait

**Question** : "Je dois corriger un bug ?"
**Réponse** : Corrige dans **le nouveau**, vérifie que l'ancien n'a pas le même bug

---

## ✅ TU AS COMPRIS SI...

- ✅ Tu peux expliquer la différence entre les 2 projets
- ✅ Tu sais lequel est en production (l'ancien)
- ✅ Tu sais lequel tu modifies (le nouveau)
- ✅ Tu sais où chercher les références (l'ancien)
- ✅ Tu connais les 2 chemins et les 2 ports
- ✅ Tu ne vas jamais modifier l'ancien

**Si oui → Go ! Tu peux commencer ta mission 🚀**

**Si non → Relis ce document !**
