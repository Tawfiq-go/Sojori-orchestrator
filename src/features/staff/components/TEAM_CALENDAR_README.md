# 📅 Team Calendar View - Option C

## Vue d'ensemble

Une interface moderne de planning d'équipe qui affiche tous les membres du staff sur une grille hebdomadaire interactive, inspirée des meilleures pratiques de Claude Code et Calendly.

## 🚀 Fonctionnalités

### 1. **Vue Calendrier Team-Wide**
- ✅ Tous les membres visibles sur une grille hebdomadaire
- ✅ Click rapide sur une cellule pour ajouter/modifier des horaires
- ✅ Affichage visuel des horaires avec gradients de couleur
- ✅ Hover actions : Edit & Delete sur chaque slot

### 2. **Analytics & Insights**
- ✅ Statistiques en temps réel :
  - Total heures de l'équipe
  - Nombre de membres actifs
  - Moyenne d'heures par personne
  - Détection de conflits (à implémenter)
- ✅ Badges de statut : Surcharge / Full-time / Part-time / Léger

### 3. **Quick Actions & Templates**
- ✅ Templates prédéfinis :
  - 9-17 (Lun-Ven)
  - 8-16 (Lun-Ven)
  - 10-18 (7j/7)
- ✅ Application en masse à toute l'équipe
- ✅ Duplication de semaine
- ✅ Export (à implémenter)

### 4. **Navigation & Filtres**
- ✅ Navigation par semaine (précédent/suivant)
- ✅ Toggle Week/Month view
- ✅ Filtres par département (à connecter)
- ✅ Affichage du total hebdomadaire par personne

### 5. **Quick Add Dialog**
- ✅ Ajout rapide d'horaires avec un simple click
- ✅ Time picker visuel
- ✅ Calcul automatique de la durée
- ✅ Validation en temps réel

## 🎨 Design System

### Couleurs (Sojori Brand)
- **Primary**: `#E6B022` (Orange)
- **Primary Dark**: `#B8881A`
- **Success**: `#10B981`
- **Warning**: `#F59E0B`
- **Error**: `#EF4444`

### Composants
1. **Header** : Gradient orange avec stats cards
2. **Toolbar** : Filtres & quick templates
3. **Grid** : Table responsive avec sticky headers
4. **Cells** : Hover effects & quick actions
5. **Dialog** : Quick add modal

## 📦 Intégration

### Dans PublicStaffPlanning.jsx
```jsx
import TeamCalendarView from './TeamCalendarView';

// Toggle entre vue tableau et vue calendrier
<ToggleButtonGroup value={viewMode} onChange={setViewMode}>
  <ToggleButton value="table">Table View</ToggleButton>
  <ToggleButton value="calendar">Calendar View</ToggleButton>
</ToggleButtonGroup>

{viewMode === 'calendar' && (
  <TeamCalendarView
    staff={staff}
    onUpdateStaff={handleStaffUpdate}
    onBulkUpdate={handleBulkUpdate}
  />
)}
```

## 🔧 API Callbacks

### onUpdateStaff(staffId, newSchedule)
Appelé quand un horaire est modifié pour un membre

### onBulkUpdate(template)
Appelé quand un template est appliqué à toute l'équipe

## 🎯 Améliorations Futures

### Phase 2 (À implémenter)
- [ ] Drag & drop pour ajuster les horaires
- [ ] Détection automatique de conflits (overlap)
- [ ] Notifications de surcharge (>40h/semaine)
- [ ] Export vers Google Calendar / iCal
- [ ] Keyboard shortcuts (Ctrl+C pour copier, etc.)
- [ ] Undo/Redo
- [ ] Vue mensuelle complète
- [ ] Filtres avancés (département, rôle, etc.)
- [ ] Mode sombre

### Phase 3 (Avancé)
- [ ] Suggestions d'optimisation par IA
- [ ] Analyse de patterns (heures de pointe)
- [ ] Prévisions de charge
- [ ] Intégration avec système de paie
- [ ] Mobile responsive (swipe gestures)
- [ ] Collaboration en temps réel

## 💡 Usage

1. Accédez à `/admin/User/staff-planning`
2. Cliquez sur le toggle "Calendar View"
3. Cliquez sur une cellule vide pour ajouter un horaire
4. Hover sur un horaire existant pour Edit/Delete
5. Utilisez les templates rapides pour gagner du temps
6. Naviguez entre les semaines avec les flèches

## 🐛 Debug

Si le composant ne s'affiche pas :
1. Vérifiez que `TeamCalendarView.jsx` est bien importé
2. Vérifiez que `viewMode` state est bien défini
3. Vérifiez la console pour les erreurs
4. Vérifiez que les données `staff` sont bien chargées

## 📸 Screenshots

### Vue d'ensemble
![Team Calendar](screenshot_team_calendar.png)

### Quick Add Dialog
![Quick Add](screenshot_quick_add.png)

### Hover Actions
![Hover Actions](screenshot_hover.png)

---

**Créé le**: 2025-12-04
**Version**: 1.0.0
**Auteur**: Claude Code
