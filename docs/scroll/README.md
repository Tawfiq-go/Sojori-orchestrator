# Scroll des modales (Sojori Orchestrator)

Guide pour reproduire le scroll fiable des modales à contenu long (trackpad Mac, React 19, MUI `Dialog`).

## Problème

Sur plusieurs modales (`Dialog` MUI + `DialogContent` avec `overflowY: auto`), la molette / le trackpad ne faisait pas défiler le contenu :

- Le scroll était « mangé » par le body ou par `scroll-lock` de MUI.
- `overflow` sur `DialogContent` seul ne suffisait pas sur Mac.
- Avec beaucoup de contenu (formulaire réservation, grille de vignettes upload), la zone centrale restait bloquée.

## Solution (pattern validé)

Référence : **Nouvelle réservation** (`/reservations` → modale 🎫).

### 1. Structure du `Dialog`

| Règle | Détail |
|--------|--------|
| `disableScrollLock` | Évite que MUI bloque le scroll de la page et interfère avec la colonne interne. |
| Paper hauteur fixe | Ex. `height: min(84vh, 740px)`, `overflow: hidden` sur le paper — **pas** de scroll sur le paper. |
| Grille 3 lignes | `gridTemplateRows: 'auto 1fr auto'` → header fixe, corps scrollable, footer fixe. |
| Pas de `DialogContent` scrollable | Remplacer par des `Box` + `ModalScrollColumn` pour le corps. |

### 2. Composant `ModalScrollColumn`

Fichier : `src/components/common/ModalScrollColumn.tsx`

- Colonne avec `overflowY: scroll`, `minHeight: 0`, `flex: 1`.
- Listener `wheel` en **`{ passive: false, capture: true }`** pour appeler `preventDefault()` quand la colonne peut encore scroller (indispensable sur Mac / React 19).
- Prop `active={open}` : n’attache le listener que quand la modale est ouverte.

```tsx
<ModalScrollColumn
  active={open}
  className="ma-modale-scroll"
  wrapperSx={{ minHeight: 0 }}
  innerSx={{ px: 2, py: 2 }}
>
  {/* contenu long */}
</ModalScrollColumn>
```

### 3. Styles scrollbar (`index.css`)

Ajouter la classe CSS dans le bloc partagé (voir `src/index.css`) :

- `.create-reservation-form-scroll` — formulaire réservation (colonne gauche)
- `.create-reservation-summary-scroll` — récap réservation (colonne droite)
- `.upload-images-modal-scroll` — modale upload images listing

Ces classes forcent une scrollbar visible (`scrollbar-width: thin`, couleurs Sojori) et évitent les globals qui mettent les scrollbars en `transparent`.

## Modales concernées

| Modale | Fichier | Classe CSS |
|--------|---------|------------|
| Nouvelle réservation | `src/components/modals/CreateReservationModal.tsx` | `create-reservation-form-scroll`, `create-reservation-summary-scroll` |
| Upload images (listing) | `src/components/listing/upload/UploadDialog.tsx` | `upload-images-modal-scroll` |

## Checklist nouvelle modale

1. [ ] `Dialog` avec `disableScrollLock` et paper `overflow: hidden` + hauteur max explicite.
2. [ ] Shell interne `display: grid`, `gridTemplateRows: 'auto 1fr auto'`, `height: '100%'`, `minHeight: 0`.
3. [ ] Header et footer en `flexShrink: 0` (hors de la zone scroll).
4. [ ] Corps dans `<ModalScrollColumn active={open} className="…">`.
5. [ ] Nouvelle classe dans `index.css` (copier le bloc `.create-reservation-form-scroll`).
6. [ ] Tester : trackpad + molette, contenu plus haut que la modale, champs / menus déroulants dans la zone scroll.

## Anti-patterns

- ❌ `scroll="paper"` ou `overflowY: auto` uniquement sur `DialogContent`.
- ❌ Hauteur 100% sans `minHeight: 0` sur les enfants flex/grid (le scroll ne s’active pas).
- ❌ Listener `wheel` en `passive: true` (impossible de `preventDefault`).
- ❌ Oublier `disableScrollLock` si le scroll de la colonne reste capricieux.

## Historique

- **2026-05-18** — Pattern extrait de `CreateReservationModal`, appliqué à `UploadDialog` (upload photos listing, lots 5 fichiers, barre de progression). Composant partagé `ModalScrollColumn`.
