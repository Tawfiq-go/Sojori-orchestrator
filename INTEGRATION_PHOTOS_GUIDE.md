# 🚀 Guide d'intégration du système d'upload d'images

Ce guide explique comment intégrer le nouveau système d'upload d'images dans vos pages.

## ✅ Ce qui a été fait

1. ✅ **Redux UploadSlice** - Gestion d'état pour les uploads
2. ✅ **Service imageTypesService** - API pour récupérer les types d'images
3. ✅ **Composants UI complets** :
   - `MediaGrid` - Grille principale avec drag & drop
   - `UploadDialog` - Dialog d'upload avec validation
   - `ImageTypeSelector` - Sélecteur de types
4. ✅ **PhotosTabReal** - Tab complet prêt à l'emploi
5. ✅ **Validation dimensions** - Min 1024×768px
6. ✅ **Gestion Main Image** - Automatique sur première photo

## 📋 Étapes d'intégration

### Étape 1: Dans votre formulaire listing

Remplacez l'ancien `PhotosTab` par `PhotosTabReal` :

```tsx
// AVANT (démo)
import { PhotosTab } from './components/listing/form-v2/tabs/PhotosAmenitiesTabs';

// APRÈS (fonctionnel)
import { PhotosTabReal } from './components/listing/form-v2/tabs/PhotosTabReal';

function ListingEditPage() {
  // Exemple avec Formik
  const formik = useFormik({
    initialValues: {
      listingImages: [], // Tableau d'images
      airbnbHeroOrder: '', // Ordre spécifique Airbnb (optionnel)
    },
    onSubmit: async (values) => {
      // Sauvegarder values.listingImages
      await saveListing(values);
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      {/* Autres champs... */}

      <PhotosTabReal
        listingImages={formik.values.listingImages}
        onChange={(images) => formik.setFieldValue('listingImages', images)}
        airbnbHeroOrder={formik.values.airbnbHeroOrder}
        onAirbnbOrderChange={(order) => formik.setFieldValue('airbnbHeroOrder', order)}
      />

      <Button type="submit">Sauvegarder</Button>
    </form>
  );
}
```

### Étape 2: Exemple page création listing

```tsx
// src/pages/ListingCreatePage.tsx
import React from 'react';
import { useFormik } from 'formik';
import { PhotosTabReal } from '../components/listing/form-v2/tabs/PhotosTabReal';
import { listingsService } from '../services/listingsService';

function ListingCreatePage() {
  const formik = useFormik({
    initialValues: {
      name: '',
      city: '',
      listingImages: [],
      airbnbHeroOrder: '',
    },
    onSubmit: async (values) => {
      try {
        await listingsService.createListing(values);
        toast.success('Listing créé avec succès !');
      } catch (error) {
        toast.error('Erreur lors de la création');
      }
    },
  });

  return (
    <DashboardWrapper>
      <form onSubmit={formik.handleSubmit}>
        <TextField
          label="Nom du listing"
          value={formik.values.name}
          onChange={(e) => formik.setFieldValue('name', e.target.value)}
        />

        <PhotosTabReal
          listingImages={formik.values.listingImages}
          onChange={(images) => formik.setFieldValue('listingImages', images)}
        />

        <Button type="submit">Créer le listing</Button>
      </form>
    </DashboardWrapper>
  );
}
```

### Étape 3: Utilisation standalone (sans Formik)

```tsx
import { useState } from 'react';
import { MediaGrid } from '../components/listing/upload';

function MyPhotosPage() {
  const [images, setImages] = useState([]);

  const handleSave = async () => {
    // Sauvegarder images
    await api.post('/listings/123/images', { listingImages: images });
  };

  return (
    <div>
      <MediaGrid
        listingImages={images}
        onChange={setImages}
      />
      <Button onClick={handleSave}>Sauvegarder</Button>
    </div>
  );
}
```

## 🔧 Configuration requise

### 1. Redux Store (déjà fait ✅)

Le store a déjà été mis à jour dans `/src/redux/store.ts` :

```typescript
import uploadReducer from './slices/UploadSlice';

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    uploadData: uploadReducer, // ✅ Déjà ajouté
  },
});
```

### 2. API Endpoints (déjà fait ✅)

Dans `/src/config/authConfig.ts` :

```typescript
export const MICROSERVICE_BASE_URL = {
  // ...
  UPLOAD_IMAGE: '...', // ✅ Déjà ajouté
  UPLOAD_IMAGE_MULTIPLE: '...', // ✅ Déjà ajouté
};
```

### 3. Toast Notifications

Assurez-vous que ToastContainer est dans votre App :

```tsx
// src/App.tsx ou main.tsx
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <>
      <YourRoutes />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
}
```

## 📊 Format des données

### Exemple de listingImages après upload

```json
[
  {
    "fileName": "image_1234567890_0",
    "imageTypeId": "507f1f77bcf86cd799439011",
    "imageTypeRuId": [1],
    "sortOrder": 1,
    "url": "https://storage.googleapis.com/sojori-bucket/listing/abc123.jpg"
  },
  {
    "fileName": "image_1234567890_1",
    "imageTypeId": "507f1f77bcf86cd799439012",
    "imageTypeRuId": [2],
    "sortOrder": 2,
    "url": "https://storage.googleapis.com/sojori-bucket/listing/def456.jpg"
  }
]
```

## 🎯 Fonctionnalités disponibles

### Dans MediaGrid

- ✅ Drag & drop pour upload
- ✅ Clic pour sélectionner fichiers
- ✅ Validation 1024×768px minimum
- ✅ Réordonnancement par clic (sélection + destination)
- ✅ Définir image principale (bouton ⭐)
- ✅ Supprimer une image (bouton 🗑)
- ✅ Badge "COVER" sur l'image principale
- ✅ Numérotation automatique (1, 2, 3...)

### Dans UploadDialog

- ✅ Preview avant upload
- ✅ Sélection du type pour chaque image
- ✅ Validation dimensions avec message d'erreur
- ✅ Gestion "Main Image" automatique
- ✅ Multi-sélection de fichiers
- ✅ Ajout progressif (bouton "Ajouter plus")

## 🧪 Test de l'intégration

### 1. Lancer le serveur

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev
```

### 2. Naviguer vers la page listing

```
http://localhost:4174/listings/{id}
```

### 3. Vérifier les fonctionnalités

- [ ] Upload par drag & drop fonctionne
- [ ] Upload par bouton "Parcourir" fonctionne
- [ ] Validation dimensions (essayer < 1024×768)
- [ ] Réordonnancement des images
- [ ] Définir/retirer image principale
- [ ] Suppression d'images
- [ ] Badge "COVER" affiché correctement
- [ ] Types d'images chargés depuis API
- [ ] Sauvegarde correcte dans le backend

## 🐛 Troubleshooting

### Les types d'images ne se chargent pas

Vérifiez que `srv-listing` est accessible :

```bash
curl http://localhost:4001/api/v1/listing/image-types-sojori?priority=1,2,3
```

### L'upload échoue

1. Vérifiez les tokens d'auth dans le store Redux
2. Vérifiez l'URL d'upload dans la console réseau
3. Vérifiez les logs dans la console (mode dev)

### Images trop petites rejetées

C'est normal ! Minimum requis : **1024×768px**

Modifiez dans `/src/utils/upload/dropzoneConfig.ts` si besoin.

## 📚 Documentation complète

Voir `/src/components/listing/upload/README.md` pour :
- API détaillée des composants
- Types TypeScript
- Personnalisation du thème
- Configuration avancée

## ✨ Prochaines étapes possibles

- [ ] Ajouter édition de légendes par image
- [ ] Ajouter crop/resize avant upload
- [ ] Ajouter support vidéo et tour 360°
- [ ] Ajouter filtres par catégorie d'image
- [ ] Ajouter bulk actions (supprimer plusieurs)

---

**Besoin d'aide ?** Consultez le README dans `/src/components/listing/upload/README.md`
