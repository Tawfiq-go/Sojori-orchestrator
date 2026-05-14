# 🎨 PROMPT AGENT 1 - CORRECTION AUTH (Couleurs + Contenu)

**Date** : 14 Mai 2026
**Agent** : Agent 1 - Auth
**Mission** : Harmoniser couleurs et contenu de la page Login avec Aurora Soft Light
**Durée estimée** : 30min - 1h

---

## 🎯 TA MISSION

Tu dois corriger **BUG-AUTH-001** : Harmoniser les couleurs et le contenu de la page Login avec le design Aurora Soft Light.

**Référence audit patron** : `docs/AUDIT_PATRON_AUTH_AGENT1.md`

---

## 📋 CONTEXTE

**Problème actuel** :
- LoginPage utilise couleurs violet/purple (`#667eea`, `#764ba2`)
- Reste de l'app utilise **Aurora Soft Light** (`#e6b022` gold, `#8b5cf6` purple)
- Texte en anglais ("Welcome to Sojori", "Sign in", etc.)

**Objectif** :
- Harmoniser les couleurs avec Aurora Soft Light
- Franciser le contenu (optionnel mais recommandé)
- Garder le design moderne et professionnel

---

## 🎨 DESIGN AURORA SOFT LIGHT

### Couleurs officielles

```typescript
const AURORA_COLORS = {
  primary: '#e6b022',    // Gold (boutons principaux, accents)
  secondary: '#8b5cf6',  // Purple/AI (boutons secondaires, liens)

  // Gradients
  primaryGradient: 'linear-gradient(135deg, #e6b022 0%, #f4c430 100%)',
  secondaryGradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
  mixedGradient: 'linear-gradient(135deg, #e6b022 0%, #8b5cf6 100%)',

  // Background
  bgGradient: 'linear-gradient(135deg, #e6b022 10%, #8b5cf6 90%)',
};
```

### Où les utiliser

- **Background page** : `mixedGradient` ou `bgGradient`
- **Bouton Sign in** : `primaryGradient` (gold)
- **Icons, accents** : `primary` (#e6b022)
- **Liens** : `secondary` (#8b5cf6)

---

## 📝 FICHIER À MODIFIER

**Fichier unique** : `src/pages/LoginPage.tsx`

---

## 🔧 MODIFICATIONS À FAIRE

### 1. Background page (ligne ~109)

**❌ Avant** :
```tsx
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
```

**✅ Après** :
```tsx
background: 'linear-gradient(135deg, #e6b022 10%, #8b5cf6 90%)',
```

---

### 2. Icon Email (ligne ~158)

**❌ Avant** :
```tsx
<EmailIcon sx={{ color: '#667eea' }} />
```

**✅ Après** :
```tsx
<EmailIcon sx={{ color: '#e6b022' }} />
```

---

### 3. TextField Email hover/focus (lignes ~166-171)

**❌ Avant** :
```tsx
'&:hover .MuiOutlinedInput-notchedOutline': {
  borderColor: '#667eea',
},
'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
  borderColor: '#667eea',
}
```

**✅ Après** :
```tsx
'&:hover .MuiOutlinedInput-notchedOutline': {
  borderColor: '#e6b022',
},
'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
  borderColor: '#e6b022',
}
```

---

### 4. Icon Lock Password (ligne ~190)

**❌ Avant** :
```tsx
<LockIcon sx={{ color: '#667eea' }} />
```

**✅ Après** :
```tsx
<LockIcon sx={{ color: '#e6b022' }} />
```

---

### 5. TextField Password hover/focus (lignes ~206-210)

**❌ Avant** :
```tsx
'&:hover .MuiOutlinedInput-notchedOutline': {
  borderColor: '#667eea',
},
'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
  borderColor: '#667eea',
}
```

**✅ Après** :
```tsx
'&:hover .MuiOutlinedInput-notchedOutline': {
  borderColor: '#e6b022',
},
'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
  borderColor: '#e6b022',
}
```

---

### 6. Bouton Sign in (lignes ~245-248)

**❌ Avant** :
```tsx
background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
'&:hover': {
  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
}
```

**✅ Après** :
```tsx
background: 'linear-gradient(135deg, #e6b022 0%, #f4c430 100%)',
'&:hover': {
  background: 'linear-gradient(135deg, #f4c430 0%, #e6b022 100%)',
}
```

---

### 7. Lien "Create one" (ligne ~287)

**❌ Avant** :
```tsx
<Box component={RouterLink} to="/register" sx={{ color: '#667eea', fontWeight: 600 }}>
  Create one
</Box>
```

**✅ Après** :
```tsx
<Box component={RouterLink} to="/register" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
  Create one
</Box>
```

---

### 8. (OPTIONNEL) Franciser le contenu

Si tu veux mettre en français (recommandé mais optionnel) :

**Ligne ~122-126** :
```tsx
// ❌ Avant
<Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
  Welcome to Sojori
</Typography>
<Typography variant="body1" color="text.secondary">
  Mock authentication for the new orchestration experience.
</Typography>

// ✅ Après
<Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
  Bienvenue sur Sojori
</Typography>
<Typography variant="body1" color="text.secondary">
  Authentification pour la nouvelle expérience d'orchestration.
</Typography>
```

**Ligne ~129-133** :
```tsx
// ❌ Avant
<Typography variant="h5" component="h2" sx={{ mb: 1, fontWeight: 600 }}>
  Sign in
</Typography>
<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
  Use any valid email/password or pick a seeded demo account.
</Typography>

// ✅ Après
<Typography variant="h5" component="h2" sx={{ mb: 1, fontWeight: 600 }}>
  Connexion
</Typography>
<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
  Utilisez n'importe quel email/mot de passe valide ou choisissez un compte démo.
</Typography>
```

**Ligne ~226-227** :
```tsx
// ❌ Avant
<FormControlLabel
  control={...}
  label="Remember me"
/>

// ✅ Après
<FormControlLabel
  control={...}
  label="Se souvenir de moi"
/>
```

**Ligne ~228-230** :
```tsx
// ❌ Avant
<Button component={RouterLink} to="/forgot-password" sx={{ textTransform: 'none' }}>
  Forgot password?
</Button>

// ✅ Après
<Button component={RouterLink} to="/forgot-password" sx={{ textTransform: 'none' }}>
  Mot de passe oublié ?
</Button>
```

**Ligne ~251** :
```tsx
// ❌ Avant
{loading ? 'Signing in...' : 'Sign in'}

// ✅ Après
{loading ? 'Connexion...' : 'Se connecter'}
```

**Ligne ~274** :
```tsx
// ❌ Avant
<Divider>or continue with</Divider>

// ✅ Après
<Divider>ou continuer avec</Divider>
```

**Ligne ~285-289** :
```tsx
// ❌ Avant
<Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
  No account yet?{' '}
  <Box component={RouterLink} to="/register" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
    Create one
  </Box>
</Typography>

// ✅ Après
<Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
  Pas encore de compte ?{' '}
  <Box component={RouterLink} to="/register" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
    Créer un compte
  </Box>
</Typography>
```

---

## ✅ CHECKLIST

Avant de terminer, vérifie :

### Couleurs
- [ ] Background page : gradient gold → purple
- [ ] Icon Email : gold (#e6b022)
- [ ] Icon Lock : gold (#e6b022)
- [ ] TextField borders hover/focus : gold (#e6b022)
- [ ] Bouton "Sign in" : gradient gold (#e6b022 → #f4c430)
- [ ] Lien "Create one" : purple (#8b5cf6)

### Contenu (optionnel)
- [ ] Titre : "Bienvenue sur Sojori"
- [ ] Sous-titre : traduit
- [ ] "Connexion" au lieu de "Sign in"
- [ ] "Se souvenir de moi"
- [ ] "Mot de passe oublié ?"
- [ ] "Se connecter" / "Connexion..."
- [ ] "ou continuer avec"
- [ ] "Pas encore de compte ?" / "Créer un compte"

### Test
- [ ] `pnpm dev --port 4000`
- [ ] Ouvrir http://localhost:4000/login
- [ ] Vérifier que les couleurs sont gold/purple (Aurora Soft Light)
- [ ] Vérifier que le design est toujours moderne
- [ ] Tester le login avec demo account

---

## 🚀 WORKFLOW

### 1. Lire le fichier actuel
```bash
# Tu as déjà accès au fichier
cat src/pages/LoginPage.tsx
```

### 2. Modifier les couleurs

Utilise l'outil Edit pour remplacer **TOUTES les occurrences** :
- `#667eea` → `#e6b022` (gold)
- `#764ba2` → `#8b5cf6` (purple)

**ATTENTION** : Il y a plusieurs endroits à changer (background, icons, borders, bouton, lien)

### 3. (Optionnel) Franciser le contenu

Remplacer les textes anglais par français (voir liste ci-dessus)

### 4. Tester

```bash
pnpm dev --port 4000
# Ouvrir http://localhost:4000/login
```

Vérifier :
- ✅ Background : gradient gold → purple
- ✅ Icons : gold
- ✅ Bouton "Sign in" : gold
- ✅ Lien : purple
- ✅ Design toujours moderne

### 5. Commit

```bash
git add src/pages/LoginPage.tsx
git commit -m "fix(auth): harmonise couleurs Login avec Aurora Soft Light

- Background: gradient #e6b022 → #8b5cf6
- Icons email/lock: gold #e6b022
- TextField borders: gold #e6b022
- Bouton Sign in: gradient gold
- Lien Create account: purple #8b5cf6
- (optionnel) Contenu francisé

BUG-AUTH-001 corrigé"
```

---

## 📝 NOTES

**Pourquoi ces couleurs ?**
- **Gold (#e6b022)** : Couleur principale de Sojori, chaleur, confiance
- **Purple (#8b5cf6)** : Couleur secondaire, modernité, AI/tech
- Ensemble : Aurora Soft Light (design system du nouveau dashboard)

**Francisation** :
- Optionnel mais recommandé
- Dashboard principal est en français
- Cohérence de l'expérience utilisateur

**Design** :
- Le gradient gold → purple est visuellement très proche du violet actuel
- L'impact visuel sera subtil mais cohérent
- Le design reste moderne et professionnel

---

## 🎯 OBJECTIF FINAL

**Après tes modifications** :
- ✅ LoginPage utilise Aurora Soft Light (gold + purple)
- ✅ Cohérence visuelle avec le reste de l'app
- ✅ (Optionnel) Interface en français
- ✅ BUG-AUTH-001 corrigé

**Durée estimée** : 30min - 1h

**GO ! Commence par lire le fichier `src/pages/LoginPage.tsx` 🚀**
