/**
 * Espacement contenu pages dashboard — réf. Activité > Réservations (Liste).
 * Le shell (`DashboardLayout`) applique `padX` ; les pages utilisent `fillSx` sans max-width centré.
 */
export const DASHBOARD_PAGE = {
  pad: { xs: 2, md: 3 },
  padX: { xs: 2, md: 3 },
  padY: { xs: 2, md: 3 },
} as const;

/** Pleine largeur utile — pas de max-width centré ni marge auto latérale. */
export const DASHBOARD_PAGE_FILL_SX = {
  width: '100%',
  maxWidth: 'none',
  mx: 0,
} as const;
