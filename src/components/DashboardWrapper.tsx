import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { isListingCataloguePath } from '../constants/listingLayout';
import {
  DashboardChrome,
  DashboardShellContext,
  usePageChromeUpdater,
} from './DashboardShellLayout';

interface DashboardWrapperProps {
  children: React.ReactNode;
  breadcrumb?: string[];
  /** Formulaire listing plein écran : marges main réduites, hauteur utile maximale */
  compactMain?: boolean;
}

/**
 * Coquille de page : dans le shell persistant, ne rend que le contenu (sidebar/topbar inchangés).
 * Hors shell (legacy), monte encore DashboardLayout complet.
 */
export function DashboardWrapper({ children, breadcrumb = [], compactMain = false }: DashboardWrapperProps) {
  const inShell = useContext(DashboardShellContext);
  const location = useLocation();
  const listingCompact = compactMain || isListingCataloguePath(location.pathname);

  usePageChromeUpdater(breadcrumb, listingCompact);

  if (inShell) {
    return <>{children}</>;
  }

  return (
    <DashboardChrome breadcrumb={breadcrumb} compactMain={listingCompact}>
      {children}
    </DashboardChrome>
  );
}
