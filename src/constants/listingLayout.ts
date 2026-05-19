/**
 * Marges listing / catalogue — ~25 % des valeurs Atelier 2026 (réduction ~75 %).
 * Revenir en arrière : git checkout dc777e4 -- src/constants/listingLayout.ts …
 */
export const LISTING_LAYOUT = {
  /** Conteneur page (ex. ListingFormShell) */
  pagePad: { xs: '8px 6px 16px', md: '6px 7px 12px' },
  formMaxWidth: '100%',
  /** Rail onglets — 260 px − 10 % */
  tabsRailWidth: 234,
  tabsRailPad: '8px 6px',
  /** Zone contenu onglet */
  contentPad: { xs: 1.5, md: '7px' },
  saveBarPadX: { xs: 1.5, md: '7px' },
  /** Onglet équipements */
  amenitiesMaxWidth: '100%',
  /** Zone main DashboardWrapper (espace sidebar app ↔ contenu) */
  mainPadX: { xs: '6px', md: '7px' },
  mainPadTop: { xs: '8px', md: '6px' },
  mainPadBottom: { xs: '8px', md: '12px' },
  topBarPadX: 1.5,
} as const;

export function isListingCataloguePath(pathname: string): boolean {
  return /^\/(listings|catalogue\/listings)(\/|$)/.test(pathname);
}
