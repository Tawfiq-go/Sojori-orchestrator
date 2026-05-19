# 🧪 Guide de Test - Système d'Upload Photos

## ✅ Checklist de vérification rapide

Avant de tester, assurez-vous que :

- [x] Redux store configuré ✅
- [x] API endpoints configurés ✅
- [x] react-dropzone installé ✅
- [x] Tous les fichiers créés ✅
- [x] Pas d'erreurs TypeScript ✅

---

## 🚀 Démarrage

### 1. Lancer l'environnement de dev

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev
```

L'application devrait démarrer sur `http://localhost:4174`

---

## 🧪 Tests fonctionnels

### Test 1: Vérifier compilation TypeScript

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm tsc --noEmit
```

**Résultat attendu:** Aucune erreur ✅

---

### Test 2: Vérifier les imports

Créez un fichier test temporaire :

```tsx
// src/test-imports.tsx
import { PhotosTabReal } from './components/listing/form-v2/tabs/PhotosTabReal';
import { MediaGrid, UploadDialog } from './components/listing/upload';
import { getImageTypesSojori } from './services/imageTypesService';
import { uploadImageToAPI } from './redux/slices/UploadSlice';

console.log('✅ All imports working');
```

```bash
pnpm tsc src/test-imports.tsx --noEmit
```

**Résultat attendu:** Aucune erreur

---

### Test 3: Intégration dans une page de test

Créez une page de test simple :

```tsx
// src/pages/TestPhotosPage.tsx
import React, { useState } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PhotosTabReal } from '../components/listing/form-v2/tabs/PhotosTabReal';
import { toast } from 'react-toastify';

export function TestPhotosPage() {
  const [listingImages, setListingImages] = useState([]);

  const handleSave = () => {
    console.log('Images à sauvegarder:', listingImages);
    toast.success(`${listingImages.length} image(s) prête(s) à sauvegarder`);
  };

  return (
    <DashboardWrapper breadcrumb={['Test', 'Upload Photos']}>
      <Container maxWidth="lg">
        <Typography variant="h3" sx={{ mb: 3 }}>
          Test Upload Photos
        </Typography>

        <PhotosTabReal
          listingImages={listingImages}
          onChange={setListingImages}
        />

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={handleSave}>
            Sauvegarder ({listingImages.length})
          </Button>
          <Button variant="outlined" onClick={() => setListingImages([])}>
            Réinitialiser
          </Button>
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            <pre>{JSON.stringify(listingImages, null, 2)}</pre>
          </Typography>
        </Box>
      </Container>
    </DashboardWrapper>
  );
}
```

Ajoutez la route dans votre routeur :

```tsx
// src/App.tsx ou routes
import { TestPhotosPage } from './pages/TestPhotosPage';

<Route path="/test/photos" element={<TestPhotosPage />} />
```

---

### Test 4: Scénarios d'utilisation

#### Scénario A: Upload simple via dialog

1. Naviguer vers `/test/photos`
2. Cliquer sur "Parcourir les fichiers"
3. Sélectionner 1 image valide (≥1024×768px)
4. ✅ Vérifier: Image apparaît dans la grille
5. ✅ Vérifier: Badge "COVER" visible
6. ✅ Vérifier: Numéro "1" affiché

#### Scénario B: Upload multiple drag & drop

1. Préparer 5 images valides sur le bureau
2. Drag & drop sur la zone d'upload
3. ✅ Vérifier: 5 images apparaissent
4. ✅ Vérifier: Première a badge "COVER"
5. ✅ Vérifier: Numéros 1-5 visibles
6. ✅ Vérifier: Toast "5 image(s) uploadée(s)"

#### Scénario C: Validation dimensions

1. Préparer 1 image < 1024×768px (ex: 800×600)
2. Essayer d'uploader
3. ✅ Vérifier: Toast d'erreur affiché
4. ✅ Vérifier: Message indique dimensions exactes
5. ✅ Vérifier: Image n'est pas ajoutée

#### Scénario D: Réordonnancement

1. Uploader 3 images
2. Cliquer sur image #3
3. ✅ Vérifier: Toast "Image sélectionnée"
4. ✅ Vérifier: Bordure dorée sur image #3
5. Cliquer sur image #1
6. ✅ Vérifier: Image #3 est maintenant à la position #1
7. ✅ Vérifier: Toast "Image déplacée avec succès"

#### Scénario E: Définir image principale

1. Uploader 3 images
2. Hover sur image #2
3. Cliquer sur bouton ⭐
4. ✅ Vérifier: Badge "COVER" déplacé sur image #2
5. ✅ Vérifier: Image #2 déplacée en position #1
6. ✅ Vérifier: Toast "Image principale mise à jour"

#### Scénario F: Suppression

1. Uploader 3 images
2. Hover sur image #2
3. Cliquer sur bouton 🗑
4. ✅ Vérifier: Image supprimée
5. ✅ Vérifier: Numérotation recalculée (1, 2 au lieu de 1, 2, 3)
6. ✅ Vérifier: Toast "Image supprimée"

#### Scénario G: Types d'images

1. Cliquer "Parcourir les fichiers"
2. Sélectionner 1 image
3. ✅ Vérifier: Select "Type d'image" visible
4. ✅ Vérifier: Liste des types chargée
5. ✅ Vérifier: "Main Image ⭐" présent
6. Sélectionner un type
7. Uploader
8. ✅ Vérifier: Type correctement assigné

---

## 🔍 Tests API

### Vérifier endpoint image types

```bash
# Si srv-listing tourne sur localhost:4001
curl -s http://localhost:4001/api/v1/listing/image-types-sojori?priority=1,2,3 | jq

# Résultat attendu:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "sojoriName": {
        "en": "Main Image",
        "fr": "Image principale"
      },
      "rentalAmenityIds": [1],
      "uiPriority": 1
    }
    // ... autres types
  ]
}
```

### Vérifier endpoint upload (nécessite auth)

```bash
# Récupérer un token valide depuis Redux DevTools
TOKEN="votre_token_ici"

# Test upload single
curl -X POST http://localhost:4006/api/v1/admin/uploads/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "media=@/path/to/image.jpg" \
  -F "type=listing" \
  -F "name=test123"

# Résultat attendu:
{
  "success": true,
  "url": "https://storage.googleapis.com/...",
  "fileName": "..."
}
```

---

## 🐛 Troubleshooting

### Erreur: "Failed to load image types"

**Cause:** srv-listing n'est pas accessible

**Solution:**
```bash
# Vérifier srv-listing
curl http://localhost:4001/health

# Si pas de réponse, démarrer srv-listing
cd /Users/gouacht/sojori-production/apps/srv-listing
pnpm dev
```

---

### Erreur: Upload échoue avec 401

**Cause:** Token d'authentification manquant ou expiré

**Solution:**
1. Ouvrir Redux DevTools
2. Vérifier `state.auth.token`
3. Si absent, se reconnecter
4. Vérifier `VITE_DEV_TOKEN` dans `.env`

---

### Erreur: "Image trop petite" alors qu'elle est grande

**Cause:** Format d'image corrompu ou dimensions pas détectées

**Solution:**
1. Ouvrir l'image dans un éditeur
2. Vérifier les vraies dimensions (propriétés fichier)
3. Ré-exporter l'image si besoin
4. Essayer avec une autre image

---

### Images ne s'affichent pas dans la grille

**Cause:** URLs invalides ou CORS

**Solution:**
1. Ouvrir DevTools Console
2. Chercher erreurs CORS ou 404
3. Vérifier format des URLs dans state
4. Vérifier accès GCS bucket

---

### Dialog ne s'ouvre pas au clic

**Cause:** Event propagation bloqué

**Solution:**
1. Vérifier Console pour erreurs
2. Désactiver temporairement drag & drop
3. Utiliser bouton au lieu de la zone

---

## 📊 Métriques à vérifier

### Performance

```typescript
// Dans la console browser
const imgs = document.querySelectorAll('img[src*="storage.googleapis"]');
console.log(`${imgs.length} images chargées`);

// Temps de chargement
performance.measure('upload-time');
```

### Redux State

```typescript
// Redux DevTools
state.uploadData.loading  // false quand terminé
state.uploadData.error    // null si OK
state.uploadData.iconUrl  // URL dernière image
```

### Network

Dans DevTools → Network :
- ✅ Requête `image-types-sojori` → 200 OK
- ✅ Requête `uploads/multiple` → 200 OK
- ✅ Headers Authorization présents
- ✅ FormData contient `media`, `type`, `name`

---

## ✅ Checklist finale

Avant de déployer en production :

- [ ] Tous les tests manuels passent
- [ ] Pas d'erreurs Console
- [ ] Pas d'erreurs TypeScript
- [ ] Performance acceptable (upload < 10s pour 5 images)
- [ ] UI responsive sur mobile
- [ ] Toast notifications fonctionnent
- [ ] Validation dimensions stricte
- [ ] Types d'images chargés correctement
- [ ] Main Image gérée automatiquement
- [ ] Réordonnancement fonctionne
- [ ] Suppression fonctionne
- [ ] Sauvegarde dans Formik fonctionne

---

## 🎯 Test de non-régression

Si vous modifiez le code, re-tester :

1. Upload simple ✅
2. Upload multiple ✅
3. Validation dimensions ✅
4. Réordonnancement ✅
5. Main Image ✅
6. Suppression ✅
7. Types d'images ✅

---

## 📝 Rapport de test

Template pour documenter vos tests :

```markdown
## Test Report - [DATE]

**Testeur:** [NOM]
**Version:** 1.0.0
**Environnement:** Dev / Staging / Prod

### Résultats

| Test | Status | Notes |
|------|--------|-------|
| Upload simple | ✅ / ❌ | |
| Upload multiple | ✅ / ❌ | |
| Validation | ✅ / ❌ | |
| Réordonnancement | ✅ / ❌ | |
| Main Image | ✅ / ❌ | |
| Suppression | ✅ / ❌ | |
| Types API | ✅ / ❌ | |

### Bugs trouvés

1. [Description]
2. [Description]

### Recommandations

1. [Recommandation]
```

---

**Bon test ! 🧪**
