# Staff Planning Views Documentation

## Vue d'ensemble

L'application dispose maintenant de **deux vues de planning** pour configurer les horaires du staff :

### 📋 Vue Liste (Ancienne) - `ModifyStaffPlanning.jsx`
- **Style** : Liste verticale des jours avec formulaires
- **Avantages** :
  - Simple et familière
  - Bon pour saisie précise des horaires
  - Compact pour petits écrans
- **Utilisation** :
  - Idéale pour ajustements fins
  - Préférée pour saisie rapide de quelques horaires

### 📅 Vue Calendrier (Nouvelle) - `ModifyStaffPlanningNew.jsx`
- **Style** : Grille calendrier hebdomadaire type Google Calendar
- **Avantages** :
  - Vision globale de la semaine
  - Ajout ultra-rapide par clic
  - Blocs visuels colorés
  - Templates pré-configurés
  - Statistiques en temps réel
  - Actions rapides (copier, effacer)
- **Utilisation** :
  - Idéale pour planification hebdomadaire
  - Préférée pour vue d'ensemble

## 🔄 Wrapper - `ModifyStaffPlanningWrapper.jsx`

Le wrapper permet de basculer entre les deux vues via un bouton flottant :

- **Icône Grille (📊)** : Passer à la vue Calendrier
- **Icône Liste (📋)** : Passer à la vue Liste
- **Position** : Coin supérieur droit du modal
- **Par défaut** : Vue Calendrier (nouvelle)

## 🎯 Comment utiliser

### Pour l'utilisateur final :
1. Ouvrir le planning d'un staff
2. Utiliser le bouton en haut à droite pour changer de vue
3. Choisir la vue la plus adaptée à la tâche

### Pour le développeur :

```javascript
// Importer le wrapper
import ModifyStaffPlanningWrapper from './components/ModifyStaffPlanningWrapper';

// Utiliser comme avant
<ModifyStaffPlanningWrapper
  open={openModal}
  handleClose={handleCloseModal}
  staff={selectedStaff}
  onStaffUpdate={handleStaffUpdate}
/>
```

## 📂 Fichiers

```
src/features/staff/components/
├── ModifyStaffPlanning.jsx          # Vue Liste (ancienne)
├── ModifyStaffPlanningNew.jsx       # Vue Calendrier (nouvelle) ⭐
├── ModifyStaffPlanningWrapper.jsx   # Wrapper pour basculer
└── PublicStaffPlanning.jsx          # Page principale (utilise le wrapper)
```

## 🎨 Design

- **Couleur principale** : Orange (#E6B022)
- **Gradients** : Oui (vue calendrier)
- **Responsive** : Oui
- **Animations** : Transitions fluides

## 🚀 Fonctionnalités Vue Calendrier

1. **Stats en temps réel**
   - Total heures hebdomadaires
   - Jours actifs
   - Moyenne par jour

2. **Actions rapides par jour**
   - Ajouter shift 9-17
   - Copier vers autres jours
   - Effacer le jour

3. **Templates rapides**
   - 9-17 (Lun-Ven)
   - 8-16 (Lun-Ven)
   - 10-18 (7j/7)
   - Tout effacer

4. **Grille interactive**
   - Clic pour ajouter 1h de shift
   - Blocs visuels proportionnels
   - Suppression directe sur le bloc
   - Prévention des chevauchements

## ⚙️ Configuration

Pour changer la vue par défaut, modifier dans `ModifyStaffPlanningWrapper.jsx` :

```javascript
const [useNewView, setUseNewView] = useState(true); // true = Vue Calendrier, false = Vue Liste
```

## 🔮 Évolutions futures possibles

- [ ] Drag & Drop pour déplacer les blocs
- [ ] Zoom sur la timeline (6h-22h, 0h-24h, etc.)
- [ ] Export PDF du planning
- [ ] Comparaison multi-staff
- [ ] Indicateurs de conflit/chevauchement entre staff
- [ ] Dark mode
