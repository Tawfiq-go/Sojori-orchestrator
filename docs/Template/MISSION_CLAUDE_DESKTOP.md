# 🎯 MISSION pour Claude Desktop

**Priorité** : 🔴 **CRITIQUE**

**Date de création** : 2026-05-20

**Créé par** : Claude Code (session de transition)

---

## 📢 Message du Product Owner (Gouacht)

> "Franchement je ne suis pas content de la config de l'ensemble Ménage, Conciergerie, Support, Règles, Access.
>
> Je veux **DEUX CHOSES** :
>
> 1. **Simplicité** pour le property manager → faciliter la modélisation depuis template et depuis listing
> 2. **Facile à montrer au client** via WhatsApp Flow
>
> **Mot d'ordre : FACILITÉ** - On ne doit pas compliquer.
>
> Je veux une **REFONTE COMPLÈTE** de toute cette partie - **SIMPLIFICATION À MORT** de tout.
>
> Avec l'aide de Claude Desktop pour me faire :
> - Maquettes front
> - Maquettes flow WhatsApp
>
> On travaille **ensemble** (moi + Claude Desktop) pour après implémenter.
>
> Je suis **prêt à tout refaire** (front + backend) encore une fois pour la **SIMPLICITÉ**."

---

## 🎯 Ta Mission

### Objectif Principal

Créer des **maquettes** (mockups) ultra-simples pour :

1. **Interface Admin Template** (`/admin/settings?tab=template`)
2. **Interface Listing Config** (`/listings/{id}` → Config orchestration)
3. **WhatsApp Flows** pour les clients

### Règles absolues

⚠️ **SIMPLICITÉ AVANT TOUT**

- ✅ Un client WhatsApp doit comprendre en **10 secondes maximum**
- ✅ Un property manager doit configurer en **5 minutes maximum**
- ✅ **3 questions maximum** par service
- ✅ **4 écrans maximum** par WhatsApp Flow
- ✅ **Pas de jargon technique**

---

## 📚 Documents à lire OBLIGATOIREMENT

**Dans l'ordre** :

1. **`AUDIT_FLOWS_WHATSAPP_PRODUCTION.md`** ← **COMPRENDRE L'EXISTANT**
   - Audit complet des 10+ flows actuellement en prod
   - Structure détaillée de chaque flow
   - Problèmes identifiés avec preuves
   - **CRITIQUE** : Tu dois comprendre ce qui existe avant de simplifier

2. **`REFONTE_COMPLETE_SIMPLICITE.md`** ← **LA NOUVELLE VISION**
   - Nouvelle vision simplifiée
   - Exemples concrets pour chaque service
   - Comparaison avant/après

3. **`DEBRIEF_CLAUDE_DESKTOP.md`**
   - Contexte projet
   - Ce qui a été fait
   - Structure du code

4. **`SIDEBAR_TEMPLATE_SECTION.md`**
   - Structure actuelle de l'interface
   - Chemins des fichiers

5. **`README.md`**
   - Vue d'ensemble du système

---

## 🎨 Livrables Attendus

### Phase 1 : Maquettes (TON FOCUS)

#### 1.1 - Support

**Admin Template** :
```
Interface pour configurer les 3 catégories :
- 🔧 Technique
- 🛋️ Confort
- 💬 Question

Format : Figma, Excalidraw, ou description détaillée Markdown avec ASCII art
```

**Listing Config** :
```
Même chose + bouton "Synchroniser avec admin"
```

**WhatsApp Flow** :
```
Schéma du flow :
Écran 1 → Écran 2 → Écran 3 → Confirmation

Format : JSON WhatsApp Flow ou diagramme
```

#### 1.2 - Conciergerie

**Admin Template** :
```
Interface pour activer/configurer les services :
- 🚗 Transport
- 🛒 Courses
- 🍽️ Restaurant
- 💆 SPA
- 👶 Babysitting
- 🗺️ Guide
- + Personnalisé
```

**Listing Config** :
```
Même chose + synchronisation
```

**WhatsApp Flow** :
```
Flow pour chaque service (exemple complet pour Transport)
```

#### 1.3 - Ménage

**Admin Template** :
```
Interface pour configurer :
- 🧹 Ménage standard (auto)
- 🧼 Ménage complet (sur demande)
```

**Listing Config** :
```
Même chose + synchronisation
```

**WhatsApp Flow** :
```
Flow de demande de ménage
```

#### 1.4 - Règles & Infos

**Admin Template** :
```
Interface pour :
- ✅ Règles de la maison (5 points max)
- 🏠 Accès & Arrivée (texte simple)
- ℹ️ Infos utiles (liste)
```

**Listing Config** :
```
Même chose + synchronisation
```

**WhatsApp Message** :
```
Message automatique envoyé avant arrivée
(pas un flow interactif, juste un message)
```

---

## 🛠️ Outils Suggérés

### Pour les Maquettes Frontend

**Option 1 : Figma** (idéal)
- Créer un projet "Sojori - Config Simplifiée"
- Partager le lien

**Option 2 : Excalidraw** (rapide)
- Dessiner les interfaces
- Exporter en PNG

**Option 3 : Markdown + ASCII Art** (minimaliste)
- Décrire avec des boxes en texte
- Comme dans `REFONTE_COMPLETE_SIMPLICITE.md`

### Pour les WhatsApp Flows

**Option 1 : JSON WhatsApp Flow** (technique)
```json
{
  "version": "3.0",
  "screens": [
    {
      "id": "SCREEN_1",
      "title": "Type de problème",
      "data": { ... }
    }
  ]
}
```

**Option 2 : Diagramme Flow** (visuel)
- Mermaid, Excalidraw, ou description textuelle

**Option 3 : Storyboard** (simple)
```
Écran 1 : [Screenshot/Description]
  ↓ [Action utilisateur]
Écran 2 : [Screenshot/Description]
  ↓ [Action utilisateur]
...
```

---

## 📋 Checklist Détaillée

### Étape 1 : Préparation
- [ ] Lire `REFONTE_COMPLETE_SIMPLICITE.md` (30 min)
- [ ] Lire `DEBRIEF_CLAUDE_DESKTOP.md` (20 min)
- [ ] Lire `SIDEBAR_TEMPLATE_SECTION.md` (10 min)
- [ ] Comprendre les problèmes actuels (15 min)

**Total** : ~1h15 de lecture

### Étape 2 : Maquettes Support
- [ ] Maquette Admin Template (interface)
- [ ] Maquette Listing Config (interface)
- [ ] Flow WhatsApp (3-4 écrans)
- [ ] Présenter à Gouacht pour validation

### Étape 3 : Maquettes Conciergerie
- [ ] Maquette Admin Template (liste services)
- [ ] Maquette Listing Config (+ sync)
- [ ] Flow WhatsApp Transport (exemple détaillé)
- [ ] Flow WhatsApp Courses (exemple détaillé)
- [ ] Structure générique pour autres services
- [ ] Présenter à Gouacht pour validation

### Étape 4 : Maquettes Ménage
- [ ] Maquette Admin Template (2 types)
- [ ] Maquette Listing Config (+ sync)
- [ ] Flow WhatsApp demande ménage
- [ ] Présenter à Gouacht pour validation

### Étape 5 : Maquettes Règles & Infos
- [ ] Maquette Admin Template (3 sections)
- [ ] Maquette Listing Config (+ sync)
- [ ] Message WhatsApp automatique
- [ ] Présenter à Gouacht pour validation

### Étape 6 : Consolidation
- [ ] Regrouper toutes les maquettes
- [ ] Créer un document de présentation complet
- [ ] Validation finale avec Gouacht

### Étape 7 : Specs Techniques (après validation)
- [ ] Documenter nouveaux schémas MongoDB
- [ ] Documenter nouvelles routes API
- [ ] Documenter composants React
- [ ] Plan de migration des données existantes

---

## 💡 Conseils pour Réussir

### Pense SIMPLE

❌ **Mauvais exemple** :
```
Support → Catégorie → Sous-catégorie → Type → Urgence →
Priorité → Assignation → Estimation temps → ...
```

✅ **Bon exemple** :
```
Support → 3 choix → Description → Urgent ? → Fini.
```

### Pense CLIENT WHATSAPP

Imagine que tu expliques à ta grand-mère comment demander de l'aide :
- Elle doit comprendre immédiatement
- Pas plus de 3 questions
- Des choix clairs
- Pas de termes techniques

### Pense PROPERTY MANAGER PRESSÉ

Le property manager a 10 listings à configurer :
- Il ne doit pas lire de documentation
- Tout doit être évident
- Minimum de clics
- Configuration rapide

---

## 🤝 Collaboration avec Gouacht

### Workflow proposé

1. **Tu crées** les maquettes pour 1 service (ex: Support)
2. **Tu présentes** à Gouacht
3. **Gouacht valide** ou demande ajustements
4. **Tu ajustes** si nécessaire
5. **Validation finale** de ce service
6. **Passer au suivant** (Conciergerie, etc.)

### Format de présentation

Pour chaque service, présente :

```markdown
# [Service] - Maquettes

## 1. Admin Template
[Image/Description]

## 2. Listing Config
[Image/Description]

## 3. WhatsApp Flow
[Diagramme/JSON]

## 4. Rationale
Pourquoi ces choix ?
- Simplicité : [explication]
- UX client : [explication]
- UX property manager : [explication]
```

---

## ⚠️ Pièges à Éviter

### ❌ Trop de détails techniques
Concentre-toi sur l'**expérience utilisateur**, pas sur l'implémentation technique.

### ❌ Copier l'existant
L'existant est **trop complexe**. Pars de zéro avec la simplicité en tête.

### ❌ Ajouter des features
Résiste à la tentation d'ajouter des options "au cas où". **MOINS = PLUS**.

### ❌ Négliger WhatsApp Flow
Le client WhatsApp est **aussi important** que le property manager. Peut-être **plus important**.

---

## 🎯 Critères de Succès

### Pour les Maquettes

✅ **Gouacht dit** : "Oui ! C'est exactement ce que je veux !"

✅ **Tu peux expliquer** chaque écran à quelqu'un qui ne connaît pas Sojori en 2 minutes

✅ **Un client WhatsApp** peut utiliser le flow sans aide

✅ **Un property manager** peut configurer en moins de 5 minutes

### Pour le Projet Global

✅ **Simplicité maximale** atteinte

✅ **Code maintenable** (après implémentation)

✅ **Expérience client** excellente

---

## 📞 Questions Fréquentes

### Q: Dois-je connaître React/MongoDB/etc. ?

**R:** Non, pour les maquettes, concentre-toi sur l'**UX** et la **simplicité**. Les specs techniques viendront après validation.

### Q: Puis-je proposer des améliorations ?

**R:** Oui, mais **seulement si elles simplifient encore plus**. Pas de feature creep.

### Q: Combien de temps pour les maquettes ?

**R:** Estimation :
- Support : 2-3h
- Conciergerie : 3-4h
- Ménage : 2h
- Règles : 1-2h
- **Total : ~8-13h**

### Q: Et si je ne suis pas sûr d'un choix ?

**R:** **Propose 2-3 options** et demande l'avis de Gouacht. C'est mieux que de bloquer.

---

## 🚀 Prochaines Étapes (Après Maquettes)

Une fois les maquettes validées :

1. **Specs Techniques Détaillées**
   - Schémas MongoDB
   - Routes API
   - Composants React

2. **Plan de Migration**
   - Conversion données existantes
   - Script de migration
   - Rollback strategy

3. **Implémentation**
   - Backend (srv-admin, srv-listing)
   - Frontend (Sojori-orchestrator)
   - Tests

4. **Déploiement**
   - Staging
   - Tests utilisateurs
   - Production

---

## 📦 Ressources Disponibles

### Documentation Projet
- `/Users/gouacht/Sojori-orchestrator/docs/Template/` (tous les docs)
- `/Users/gouacht/Sojori-orchestrator/docs/` (documentation générale)

### Code Source
- Frontend : `/Users/gouacht/Sojori-orchestrator/src/`
- Backend : `/Users/gouacht/sojori-production/apps/`

### Exemples Existants
- Support actuel : `/src/features/setting/components/SupportCategoriesTemplate.jsx`
- Conciergerie actuelle : `/src/features/setting/components/ConciergeServicesTemplate.jsx`

**Note** : Ne les copie pas ! Utilise-les seulement pour comprendre ce qui existe.

---

## 💬 Contact

**Product Owner** : Gouacht

**Ton rôle** : Créer les maquettes ultra-simples qui rendront l'expérience client et property manager excellente.

**Sa phrase clé** : "Je suis prêt à tout refaire pour la **SIMPLICITÉ**"

---

**🎨 À toi de jouer ! On compte sur toi pour créer quelque chose de vraiment simple et efficace.**

**Let's make Sojori's configuration DEAD SIMPLE! 🚀**

---

Dernière mise à jour : 2026-05-20
Document créé par : Claude Code (pour Claude Desktop)
