# 📝 PROMPT CLAUDE DESIGN - Amélioration Navigation & Scroll

**Date** : 14 Mai 2026
**Mission** : Rendre la navigation fluide et agréable comme Claude Desktop
**Problème actuel** : Scroll Mac pas fluide, navigation lourde

---

## 🎯 OBJECTIF

Améliorer l'expérience de navigation et scroll du dashboard Sojori pour qu'elle soit **aussi fluide et naturelle que Claude Desktop**.

**Problèmes identifiés** :
1. ❌ Scroll Mac pas fluide (pas smooth)
2. ❌ Navigation lourde / pas réactive
3. ❌ Sidebar trop longue (beaucoup de sections)

---

## 📋 CONTEXTE TECHNIQUE

**Stack actuel** :
- React 18 + TypeScript
- Material-UI v9 (MUI v5.16.7)
- Vite 8
- Navigation : React Router v6
- Layout : `DashboardLayout` dans `src/components/dashboard/DashboardV2.components.jsx`

**Structure sidebar actuelle** :
```tsx
// 7 groupes de navigation
1. Pilotage (Dashboard, Analytics, Reports, Orchestration)
2. Calendrier
3. Réservations (Liste, Séjour)
4. Tâches (Liste, Équipe, Planning, Staff WhatsApp)
5. Communications (WhatsApp Guests, WhatsApp Staff, Messages OTA)
6. Service Client (Requests, Reviews)
7. Catalogue (Listings, Pricing, Channels, Clients)
```

---

## 🎨 RÉFÉRENCE : Claude Desktop

**Ce qui fonctionne bien dans Claude Desktop** :
- ✅ Scroll **momentum-based** (inertie naturelle)
- ✅ Navigation **instantanée** (pas de lag)
- ✅ Transitions **fluides** entre sections
- ✅ Sidebar **compacte** et organisée
- ✅ CSS **optimisé** pour performance

**Propriétés CSS utilisées** :
```css
/* Smooth scrolling avec momentum */
overflow-y: auto;
-webkit-overflow-scrolling: touch;
scroll-behavior: smooth;

/* Performance */
will-change: transform;
transform: translateZ(0);
backface-visibility: hidden;

/* Transitions fluides */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🔧 SOLUTIONS PROPOSÉES

### 1. **Améliorer le scroll (priorité HAUTE)**

**Modifications CSS à appliquer sur le container de la sidebar** :

```jsx
// Dans DashboardLayout, Box de la sidebar
<Box sx={{
  // Scroll fluide avec momentum
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch', // Important pour iOS/Mac
  scrollBehavior: 'smooth',

  // Performance GPU
  willChange: 'transform',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',

  // Masquer scrollbar (optionnel)
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    '&:hover': {
      background: 'rgba(0,0,0,0.2)',
    },
  },
}}>
```

**Pourquoi ça fonctionne** :
- `WebkitOverflowScrolling: 'touch'` → Active le momentum scrolling natif Mac/iOS
- `will-change: 'transform'` → Force GPU rendering
- `transform: translateZ(0)` → Crée un layer GPU séparé
- `backfaceVisibility: 'hidden'` → Évite les flickering

---

### 2. **Optimiser les transitions de navigation**

**Remplacer les transitions CSS lourdes par des transitions légères** :

```jsx
// Pour les NavItem, utiliser cubic-bezier optimisé
sx={{
  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)', // Easing optimisé
  '&:hover': {
    transform: 'translateX(2px)', // Plus léger que scale()
  },
}}
```

**Au lieu de** :
```jsx
// ❌ ÉVITER (lourd)
transition: 'all 0.3s ease-in-out',
transform: 'scale(1.05)',
```

---

### 3. **Réorganiser la sidebar (optionnel mais recommandé)**

**Problème** : Trop de sections → sidebar trop longue → scroll nécessaire

**Solution A : Collapsible sections** (comme VSCode)

```jsx
const [collapsed, setCollapsed] = useState({
  pilotage: false,
  taches: true,      // Collapsed by default
  comms: true,
  catalogue: true,
});

// Pour chaque groupe
<Box>
  <Stack
    direction="row"
    onClick={() => setCollapsed({...collapsed, taches: !collapsed.taches})}
    sx={{ cursor: 'pointer', p: '8px 16px', alignItems: 'center' }}
  >
    <Typography>Tâches & Opérations</Typography>
    <Box sx={{ ml: 'auto' }}>{collapsed.taches ? '›' : '∨'}</Box>
  </Stack>

  {!collapsed.taches && (
    <Stack>
      {/* Nav items */}
    </Stack>
  )}
</Box>
```

**Solution B : Tabs en haut** (comme Notion)

```jsx
const [activeTab, setActiveTab] = useState('pilotage');

<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
  <Tab value="pilotage" label="Pilotage" />
  <Tab value="operations" label="Opérations" />
  <Tab value="catalogue" label="Catalogue" />
</Tabs>

{activeTab === 'pilotage' && <PilotageNav />}
{activeTab === 'operations' && <OperationsNav />}
{activeTab === 'catalogue' && <CatalogueNav />}
```

**Solution C : Sidebar réduite par défaut** (comme Gmail)

```jsx
const [sidebarExpanded, setSidebarExpanded] = useState(false);

<Box sx={{ width: sidebarExpanded ? 240 : 72 }}>
  {sidebarExpanded ? (
    // Full labels
    <NavItem label="Dashboard" icon="📊" />
  ) : (
    // Icons only
    <Tooltip title="Dashboard"><IconButton>📊</IconButton></Tooltip>
  )}
</Box>
```

---

### 4. **Virtual scrolling pour listes longues**

Si vous avez beaucoup d'items dans la navigation, utilisez `react-window` :

```bash
pnpm add react-window
```

```jsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={navItems.length}
  itemSize={44}
  width="100%"
>
  {({ index, style }) => (
    <NavItem key={index} style={style} {...navItems[index]} />
  )}
</FixedSizeList>
```

---

## ✅ CHECKLIST IMPLÉMENTATION

### Étape 1 : Scroll fluide (15 min)
- [ ] Ajouter `WebkitOverflowScrolling: 'touch'`
- [ ] Ajouter `will-change: 'transform'`
- [ ] Ajouter `transform: translateZ(0)`
- [ ] Tester scroll sur Mac (momentum)

### Étape 2 : Optimiser transitions (10 min)
- [ ] Remplacer `ease-in-out` par `cubic-bezier(0.4, 0, 0.2, 1)`
- [ ] Réduire durée à 0.15s (au lieu de 0.3s)
- [ ] Utiliser `translateX` au lieu de `scale`

### Étape 3 : Réorganiser sidebar (30-60 min - optionnel)
- [ ] Choisir solution (A, B ou C)
- [ ] Implémenter collapsible sections OU tabs OU sidebar réduite
- [ ] Tester UX

### Étape 4 : Polish (10 min)
- [ ] Customiser scrollbar (fine, discrete)
- [ ] Ajouter transitions sur collapse/expand
- [ ] Tester performance (Chrome DevTools → Performance)

---

## 📝 FICHIERS À MODIFIER

**Fichier principal** : `src/components/dashboard/DashboardV2.components.jsx`

**Sections à modifier** :
1. **DashboardLayout** (ligne ~160-280) → Container sidebar
2. **NavItem** (ligne ~300-350) → Transitions hover
3. **Navigation structure** (ligne ~90-150) → Collapsible groups (optionnel)

---

## 🚀 COMMANDES

```bash
# Tester localement
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4000

# Ouvrir dans navigateur
open http://localhost:4000

# Tester performance
# Chrome DevTools > Performance > Record > Scroll sidebar > Stop
```

---

## 🎯 RÉSULTAT ATTENDU

**Après modifications** :
- ✅ Scroll sidebar **fluide avec momentum** (comme Claude Desktop)
- ✅ Navigation **instantanée** sans lag
- ✅ Transitions **douces** et performantes
- ✅ Sidebar **organisée** et moins chargée (si collapsible activé)
- ✅ **60 FPS** constant pendant scroll

**Métrique cible** :
- Scroll FPS : **60 FPS** (actuellement probablement 30-40 FPS)
- Time to Interactive : < 100ms
- Perception utilisateur : "Aussi fluide que Claude Desktop"

---

## 💡 NOTES

**Pourquoi Mac scroll n'est pas fluide** :
- Sans `-webkit-overflow-scrolling: touch` → pas de momentum natif
- Sans GPU acceleration → rendering CPU (lent)
- Trop de repaints → browser doit recalculer layout

**Référence technique** :
- [MDN: -webkit-overflow-scrolling](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-overflow-scrolling)
- [Google: Rendering Performance](https://web.dev/rendering-performance/)
- [CSS Triggers: what triggers layout/paint/composite](https://csstriggers.com/)

---

## 🔥 QUICK FIX (si pas le temps)

**Modification minimale pour scroll fluide (30 secondes)** :

```jsx
// Dans DashboardLayout, trouver le Box de la sidebar et ajouter :
sx={{
  // ... existing styles
  WebkitOverflowScrolling: 'touch',
  willChange: 'transform',
  transform: 'translateZ(0)',
}}
```

**Cette seule modification devrait déjà améliorer significativement le scroll Mac.**

---

**Prêt à implémenter ?** 🚀
