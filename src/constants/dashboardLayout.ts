/**
 * Espacement contenu pages dashboard — réf. Activité > Réservations (Liste).
 * Le shell (`DashboardLayout`) applique `padX` ; les pages utilisent `fillSx` sans max-width centré.
 */
export const DASHBOARD_PAGE = {
  pad: { xs: 1.5, md: 2 },
  padX: { xs: 2, md: 3 },
  /** Contenu remonté — le titre vit dans le fil d’Ariane topbar. */
  padY: { xs: 1, md: 1.5 },
} as const;

/** Pleine largeur utile — pas de max-width centré ni marge auto latérale. */
export const DASHBOARD_PAGE_FILL_SX = {
  width: '100%',
  maxWidth: 'none',
  mx: 0,
} as const;
