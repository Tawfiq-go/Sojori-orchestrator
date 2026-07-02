import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { isListingCataloguePath } from '../constants/listingLayout';
import { isPmBusinessPath } from '../config/routeAccessPolicy';
import {
  AdminBusinessScopeAllAlert,
  AdminBusinessScopeUnsetAlert,
} from './AdminOwnerScope/AdminBusinessScopeAlerts';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import {
  DashboardChrome,
  DashboardShellContext,
  PageChromeContext,
  usePageChromeUpdater,
} from './DashboardShellLayout';

interface DashboardWrapperProps {
  children: React.ReactNode;
  breadcrumb?: string[];
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
 * Coquille de page : dans le shell persistant, ne rend que le contenu (sidebar/topbar inchangés).
 * Hors shell (legacy), monte encore DashboardLayout complet.
 */
export function DashboardWrapper({
  children,
  breadcrumb = [],
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

  usePageChromeUpdater(breadcrumb, listingCompact);

  const scopeAlerts =
    showOwnerFilter && pmBusiness && !disableScopeGate && ownerScopeAll ? (
      <AdminBusinessScopeAllAlert />
    ) : null;

  if (inShell) {
    if (scopeGate) {
      return <AdminBusinessScopeUnsetAlert />;
    }
    return (
      <>
        {scopeAlerts}
        {children}
      </>
    );
  }

  return (
    <DashboardChrome breadcrumb={breadcrumb} compactMain={listingCompact}>
      {scopeGate ? (
        <AdminBusinessScopeUnsetAlert />
      ) : (
        <Box>
          {scopeAlerts}
          {children}
        </Box>
      )}
    </DashboardChrome>
  );
}
