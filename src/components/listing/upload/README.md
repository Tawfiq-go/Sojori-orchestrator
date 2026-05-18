# 📸 Système d'Upload d'Images Sojori Orchestrator

Système complet d'upload et de gestion des images pour les listings, répliqué depuis le dashboard legacy avec toutes les fonctionnalités.

## 🎯 Fonctionnalités

✅ **Upload multiple avec drag & drop**
✅ **Validation des dimensions** (min 1024×768px)
✅ **Types d'images via API** (`srv-listing/image-types-sojori`)
✅ **Gestion "Main Image" automatique** (première photo)
✅ **Réordonnancement** par drag & drop ou clic
✅ **Preview temps réel**
✅ **Redux integration** complète
✅ **Design cohérent** avec Orchestrator

## 📦 Composants

### `MediaGrid`
Grille principale de gestion des images avec :
- Upload par drag & drop ou bouton
- Réordonnancement des images
- Définir/retirer l'image principale (cover)
- Suppression d'images
- Affichage du badge "COVER" sur l'image principale

### `UploadDialog`
Dialog d'upload avec :
- Sélection multiple de fichiers
- Validation dimensions (1024×768 minimum)
- Sélection du type d'image pour chaque fichier
- Preview avant upload
- Gestion automatique "Main Image"

### `ImageTypeSelector`
Sélecteur de type d'image :
- Affichage multilingue (fr/en/es/ar)
- Désactivation automatique si type déjà utilisé
- Badge ⭐ pour "Main Image"

## 🚀 Utilisation

### 1. Dans un formulaire Formik

```tsx
import { PhotosTabReal } from '../components/listing/form-v2/tabs/PhotosTabReal';

function ListingForm() {
  const formik = useFormik({
    initialValues: {
      listingImages: [],
      airbnbHeroOrder: '',
      // ... autres champs
    },
    onSubmit: (values) => {
      // values.listingImages contient toutes les images
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <PhotosTabReal
        listingImages={formik.values.listingImages}
        onChange={(images) => formik.setFieldValue('listingImages', images)}
        airbnbHeroOrder={formik.values.airbnbHeroOrder}
        onAirbnbOrderChange={(order) => formik.setFieldValue('airbnbHeroOrder', order)}
      />
    </form>
  );
}
```

### 2. Avec useState simple

```tsx
import { MediaGrid } from '../components/listing/upload';

function MyComponent() {
  const [images, setImages] = useState([]);

  return (
    <MediaGrid
      listingImages={images}
      onChange={setImages}
    />
  );
}
```

## 📁 Structure des données

### ListingImage

```typescript
interface ListingImage {
  fileName?: string;          // Nom du fichier
  imageTypeId?: string;       // ID du type d'image (ObjectId)
  imageTypeRuId?: number[];   // IDs Rentals United
  sortOrder?: number;         // Ordre d'affichage (1, 2, 3...)
  url: string;                // URL GCS ou temporaire
}
```

### ImageType (depuis API)

```typescript
interface ImageType {
  _id: string;
  sojoriName?: {
    en?: string;
    fr?: string;
    es?: string;
    ar?: string;
  };
  airbnbCategory?: string;
  bookingCategory?: string;
  rentalAmenityIds?: number[];
  uiPriority?: number;
}
```

## 🔧 Configuration

### Redux Store

Le store doit inclure `uploadData` :

```typescript
import uploadReducer from './slices/UploadSlice';

const store = configureStore({
  reducer: {
    uploadData: uploadReducer,
    // ... autres reducers
  },
});
```

### API Endpoints

Les endpoints suivants doivent être configurés dans `authConfig.ts` :

- `UPLOAD_IMAGE`: Upload simple image
- `UPLOAD_IMAGE_MULTIPLE`: Upload multiple images
- `/listing/image-types-sojori`: Récupération des types d'images

## 🎨 Personnalisation

### Thème

Les couleurs sont définies dans la constante `T` :

```typescript
const T = {
  primary: '#b8851a',       // Or Sojori
  primaryDeep: '#876119',
  primaryTint: 'rgba(184,133,26,0.10)',
  // ...
};
```

### Dimensions minimales

Modifiez dans `utils/upload/dropzoneConfig.ts` :

```typescript
export const MIN_IMAGE_WIDTH = 1024;
export const MIN_IMAGE_HEIGHT = 768;
export const MAX_FILE_SIZE = 52428800; // 50 MB
```

## 🐛 Debug

Les logs sont activés en mode développement :

```typescript
import { logListingMedia } from '../utils/upload/helpers';

logListingMedia('mon.event', { data: 'foo' });
// Console: [MediaUpload] mon.event { data: 'foo' }
```

## 📝 Notes importantes

1. **Main Image** : La première image uploadée est automatiquement définie comme "Main Image"
2. **Validation** : Les images < 1024×768px sont rejetées
3. **Types d'images** : Chargés depuis `srv-listing` au format multilingue
4. **Ordre** : Le `sortOrder` est géré automatiquement (1, 2, 3...)
5. **GCS URLs** : Les URLs sont normalisées automatiquement

## 🔗 Dépendances

- `react-dropzone` : Drag & drop
- `react-toastify` : Notifications
- `@mui/material` : Composants UI
- `@reduxjs/toolkit` : State management
- `axios` (via apiClient) : Requêtes HTTP

## 📚 Références

- Dashboard legacy: `/Users/gouacht/sojori-dashboard/src/features/listing/components/forms/`
- API srv-listing: Port 4001, `/api/v1/listing/image-types-sojori`
- Redux: `/src/redux/slices/UploadSlice.ts`
