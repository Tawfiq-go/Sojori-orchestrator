# À remplir par le designer (retour ZIP)

## Fichiers modifiés

- [x] `src/pages/TasksPlanningPage.tsx` — En-tête contextuel (overline UPPERCASE
      + titre Geist `-0.025em`), retrait du gradient orange opérationnel et de
      l'ombre lourde, surface unifiée `bg1` + bordure tokens. Loading et erreur
      harmonisés (spinner ambre, fonte `13 px`).
- [x] `src/components/tasks/TasksStayPlanningChrome.tsx` — KPI strip refait :
      pills 999px, micro-icône ambre/vert/orange/rouge, chiffres en Geist Mono,
      labels UPPERCASE `0.08em`. Toolbar : surface `bg2`, bouton Auj. en
      gradient ambre (au lieu de `#FF6B35`), filtre annonces avec pill ambre
      sobre, légende en chips arrondies neutres. Toutes les bordures passent
      sur `tokens.border` / `tokens.borderStrong`.
- [x] `src/components/tasks/TasksStayGrid.tsx` — Palette barres réservations
      réharmonisée (ambre / violet AI / vert / bleu / orange / graphite / fuchsia),
      palette tâches alignée sur les couleurs sémantiques tokens, chip non-assigné
      avec halo rouge `#c81e1e`, chip staff en Geist Mono. Header dates en
      surface `bg2`, weekend = `bg3`, aujourd'hui = `primaryTint` + bordure
      ambre. Colonne « Propriétés » sticky : gradient ambre dignifié,
      lettering UPPERCASE `0.08em`. Dialog overflow : header avec border
      bottom, body sur `bg2`.
- [ ] `src/types/tasksPlanning.types.ts` — non modifié.
- [ ] `src/services/tasksService.ts` — non modifié.

## Breakpoints / maquettes

- **Desktop (≥ 960 px)** : layout horizontal complet. KPI strip 4 pills + label
  Aujourd'hui à gauche + compteur `N prop.` à droite. Toolbar : dates → nav →
  filtres → légende sur une seule ligne. Grille : 31 colonnes de 76 px,
  colonne `Propriétés` sticky 260 px.
- **Tablette (600–959 px portrait)** : KPI strip passe en bloc « ligne 1 =
  label/jour, ligne 2 = pills scrollables ». Toolbar reste sur une ligne avec
  scroll-x horizontal `WebkitOverflowScrolling: touch`. Le filtre annonces et
  la légende restent accessibles via le scroll.
- **Mobile (< 600 px)** : tap targets ≥ 26 px (boutons nav, filtres). La
  grille garde sa largeur native (31 × 76 px) et scrolle ; la colonne
  `Propriétés` reste sticky. Tooltip MUI fallback sur tap long.

## Notes libres

- Palette intégralement alignée sur l'export `tokens` de
  `DashboardV2.components.jsx` — l'ambre `#b8851a` remplace partout l'orange
  opérationnel `#FF6B35` hérité de StaffPlanningView.
- Le violet AI `#7c3aed` n'est utilisé que dans la palette des barres de
  réservation et le chip « Concierge » pour réserver l'accent IA aux actions
  proactives (suggestions, automation).
- Typo : tous les chiffres (compteurs, dates, jours, IDs réservations,
  initiales staff) passent en **Geist Mono** pour une lecture en grille plus
  nette ; les labels secs (KPI, header Propriétés, badge propreté) sont en
  `UPPERCASE letter-spacing 0.08em`.
- Accessibilité : focus-visible hérite du `:focus-visible` global ambre 2 px
  défini dans `index.css` (cohérent avec le reste du dashboard).
- Aucun changement de logique : `useEffect`, `tasksService.getReservationPlanning`,
  scope user, normalisation, `barGeometry`, sync scroll header/body et dialog
  overflow sont strictement préservés.
