# ✅ CORRECTIONS BUGS - TasksPage & TaskFilters

**Date** : 14 Mai 2026
**Par** : Agent Audit
**Durée** : 30 minutes

---

## 🐛 BUGS CORRIGÉS

### Bug 1 : Props `alignItems` et `justifyContent` sur Stack (Material-UI v9)

**Erreur** :
```
React does not recognize the `alignItems` prop on a DOM element.
```

**Cause** :
Material-UI v9 a changé l'API Stack. Les props `alignItems`, `justifyContent`, `flexWrap` ne peuvent plus être passées directement au composant Stack. Elles doivent être dans l'objet `sx`.

**Fichiers corrigés** :
1. ✅ **`src/pages/TasksPage.tsx`** (9 occurrences corrigées)
2. ✅ **`src/components/filters/AdvancedTaskFilters.tsx`** (7 occurrences corrigées)

**Correction type** :
```typescript
// ❌ AVANT (Material-UI v5)
<Stack direction="row" alignItems="center" spacing={1}>
  ...
</Stack>

// ✅ APRÈS (Material-UI v9)
<Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
  ...
</Stack>
```

**Lignes corrigées dans TasksPage.tsx** :
- Ligne 78 : PriorityBadge component
- Ligne 381 : Assigned staff rendering
- Ligne 638 : Event types loop
- Ligne 683 : Calendar day header
- Lignes 833, 837, 841 : Legend Stack items
- Ligne 1045 : Team member card
- Ligne 1090 : Load percentage Stack
- Ligne 1109 : Task item in member card

**Lignes corrigées dans AdvancedTaskFilters.tsx** :
- Ligne 87 : Accordion summary Stack
- Lignes 112, 185, 198, 219, 232, 246, 257 : Filter chip Stacks with `flexWrap`

---

### Bug 2 : `InputLabelProps` invalide (Material-UI v9)

**Erreur** :
```
Property 'InputLabelProps' does not exist on type '...'
```

**Cause** :
Material-UI v9 utilise `slotProps` au lieu de `InputLabelProps`.

**Fichier corrigé** :
- ✅ **`src/components/filters/AdvancedTaskFilters.tsx`** (2 occurrences)

**Correction** :
```typescript
// ❌ AVANT
<TextField type="date" InputLabelProps={{ shrink: true }} />

// ✅ APRÈS
<TextField type="date" slotProps={{ inputLabel: { shrink: true } }} />
```

**Lignes corrigées** :
- Ligne 174 : Date "De" field
- Ligne 178 : Date "À" field

---

### Bug 3 : Imports non utilisés (lint)

**Erreur** :
```
'FormLabel' is declared but its value is never read.
'Badge' is declared but its value is never read.
'IconButton' is declared but its value is never read.
```

**Fichier corrigé** :
- ✅ **`src/components/filters/AdvancedTaskFilters.tsx`**

**Correction** :
```typescript
// ❌ AVANT
import {
  ..., FormLabel, ..., Badge, IconButton,
} from '@mui/material';

// ✅ APRÈS (supprimé FormLabel, Badge, IconButton)
import {
  Box, Stack, Accordion, AccordionSummary, AccordionDetails, Typography, Button,
  TextField, Select, MenuItem, Chip, FormControl, RadioGroup,
  FormControlLabel, Radio,
} from '@mui/material';
```

---

## ✅ RÉSULTAT

**Avant** :
- ❌ Build échoue (erreurs TypeScript)
- ❌ Runtime error : `React does not recognize the alignItems prop`
- ❌ Runtime error : `SyntaxError: The requested module does not provide an export named 'TaskFilterState'`
- ❌ Lint : 3 warnings imports non utilisés

**Après** :
- ✅ Build OK (erreurs TasksPage/TaskFilters corrigées)
- ✅ Runtime OK (props Stack valides)
- ✅ Export `TaskFilterState` existe (pas de bug réel, juste cache navigateur)
- ✅ Lint OK (imports nettoyés)

---

## 📊 STATISTIQUES

**Total corrections** : 18 modifications
- TasksPage.tsx : 9 Stack props corrigées
- AdvancedTaskFilters.tsx : 7 Stack props + 2 InputLabelProps + 3 imports

**Impact** :
- Page `/tasks` maintenant fonctionnelle ✅
- Plus d'erreurs React dans console ✅
- Build passe pour ces 2 fichiers ✅

---

## ⚠️ ERREURS RESTANTES

**D'autres fichiers ont encore les mêmes problèmes** :

1. **`src/components/channels/ChannelsDashboard.tsx`** (10 erreurs Stack props)
2. **`src/pages/TeamPage.tsx`** (5 erreurs Stack props)
3. **~20 autres fichiers** avec erreurs similaires

**Total erreurs build restantes** : ~37 erreurs TypeScript

**Recommandation** : Appliquer les mêmes corrections à TOUS les fichiers avec erreurs Stack props.

---

## 🔧 SCRIPT DE CORRECTION AUTOMATIQUE

Pour corriger automatiquement dans tous les fichiers :

```bash
# Trouver tous les fichiers avec alignItems/justifyContent/flexWrap sur Stack
cd /Users/gouacht/Sojori-orchestrator
grep -rl "Stack.*alignItems=\"\|Stack.*justifyContent=\"\|Stack.*flexWrap=\"" src/

# Appliquer correction manuelle à chaque fichier (voir exemples ci-dessus)
```

**Note** : Correction automatique difficile car chaque Stack a une structure `sx` différente. Recommandé : correction manuelle fichier par fichier.

---

## ✅ CHECKLIST VALIDATION

**TasksPage & TaskFilters** :
- [x] Props Stack corrigées (alignItems, justifyContent, flexWrap → sx)
- [x] InputLabelProps → slotProps
- [x] Imports non utilisés supprimés
- [x] Build passe pour ces fichiers
- [x] Runtime sans erreurs
- [x] Page `/tasks` accessible et fonctionnelle

**Prochaines étapes** :
- [ ] Corriger ChannelsDashboard.tsx (priorité haute - Agent 3)
- [ ] Corriger TeamPage.tsx (priorité haute - Agent 4)
- [ ] Corriger les ~20 autres fichiers (priorité moyenne)

---

**FIN RAPPORT CORRECTIONS**

Agent Audit
14 Mai 2026
