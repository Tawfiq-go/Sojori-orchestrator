import { useContext, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { resolvePageChrome } from '../config/pageChromeRegistry';
import { isListingCataloguePath } from '../constants/listingLayout';
import { isPmBusinessPath } from '../config/routeAccessPolicy';
import {
  AdminBusinessScopeAllAlert,
  AdminBusinessScopeUnsetAlert,
} from './AdminOwnerScope/AdminBusinessScopeAlerts';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { PageHeader } from './dashboard/DashboardV2.components';
import {
  DashboardShellContext,
  PageChromeContext,
  usePageChromeUpdater,
} from './DashboardShellLayout';

interface DashboardWrapperProps {
  children: React.ReactNode;
  breadcrumb?: string[];
  /** Titre H1 — défaut : registre sidebar ou dernier segment du fil d’Ariane */
  title?: string;
  /** Chip à droite du titre (ex. période, mois courant) */
  titleMeta?: ReactNode;
  /** Actions alignées à droite du titre (boutons, toggles…) */
  headerActions?: ReactNode;
  /** Ne pas afficher l’en-tête standard (page avec PageHeader custom) */
  hidePageHeader?: boolean;
  /** Formulaire listing plein écran : marges main réduites, hauteur utile maximale */
  compactMain?: boolean;
  /**
   * Désactive le masquage auto du contenu quand le scope admin n’est pas choisi
   * (ex. dashboard avec header et alertes custom).
   */
  disableScopeGate?: boolean;
  /** @deprecated Le shell détecte automatiquement les URLs métier PM. */
  adminScopeInTopBar?: boolean;
}

/**
 * Contenu de page uniquement.
 * Sidebar + topbar viennent exclusivement de `DashboardShellLayout` (route parent).
 * Ne jamais remonter `DashboardChrome` ici — sinon double sidebar / double topbar.
 */
export function DashboardWrapper({
  children,
  breadcrumb = [],
  title,
  titleMeta,
  headerActions,
  hidePageHeader = false,
  compactMain = false,
  disableScopeGate = false,
}: DashboardWrapperProps) {
  const shellFlag = useContext(DashboardShellContext);
  const pageChrome = useContext(PageChromeContext);
  const inShell = shellFlag || pageChrome != null;
  const location = useLocation();
  const listingCompact = compactMain || isListingCataloguePath(location.pathname);
  const { showOwnerFilter, ownerScopeUnset, ownerScopeAll } = useAdminOwnerFilter();
  const pmBusiness = isPmBusinessPath(location.pathname);
  const scopeGate = !disableScopeGate && showOwnerFilter && pmBusiness && ownerScopeUnset;

  const registryChrome = resolvePageChrome(location.pathname);
  const effectiveBreadcrumb =
    breadcrumb.length > 0 ? breadcrumb : (registryChrome?.breadcrumb ?? []);
  const effectiveTitle =
    title ??
    registryChrome?.title ??
    (effectiveBreadcrumb.length > 0
      ? effectiveBreadcrumb[effectiveBreadcrumb.length - 1]
      : undefined);

  const showPageHeader =
    !hidePageHeader && !!effectiveTitle && !isListingCataloguePath(location.pathname);

  usePageChromeUpdater(effectiveBreadcrumb, listingCompact);

  if (import.meta.env.DEV && !inShell) {
    // Contexte shell perdu (souvent après HMR) — on n’empile plus un 2e chrome.
    console.warn(
      '[DashboardWrapper] hors DashboardShellLayout — contenu sans chrome (évite double sidebar). path=',
      location.pathname,
    );
  }

  const scopeAlerts =
    showOwnerFilter && pmBusiness && !disableScopeGate && ownerScopeAll ? (
      <AdminBusinessScopeAllAlert />
    ) : null;

  const pageHeader = showPageHeader ? (
    <PageHeader title={effectiveTitle} count={titleMeta}>
      {headerActions}
    </PageHeader>
  ) : null;

  if (scopeGate) {
    return <AdminBusinessScopeUnsetAlert />;
  }

  return (
    <>
      {scopeAlerts}
      {pageHeader}
      {children}
    </>
  );
}
