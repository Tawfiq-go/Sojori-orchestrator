import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardLayout } from './dashboard/DashboardV2.components';
import { isListingCataloguePath } from '../constants/listingLayout';
import { isPmBusinessPath } from '../config/routeAccessPolicy';
import { useDashboardChrome } from './useDashboardChrome';
import { PmSimulationProvider } from '../context/PmSimulationContext';
import { AdminOwnerFilterProvider, useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { useAuth } from '../hooks/useAuth';
import { toLegacyAuthUser } from '../utils/legacyAuthUser';
import { canSelectOwnerInAdminFilter } from '../utils/taskScope.utils';

/** Layout persistant : sidebar + topbar ne se remontent pas à chaque changement de route. */
export const DashboardShellContext = createContext(false);

export interface PageChromeContextValue {
  setBreadcrumb: (items: string[]) => void;
  setCompactMain: (compact: boolean) => void;
}

export const PageChromeContext = createContext<PageChromeContextValue | null>(null);

function ShellTopBarScope({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user: authUser } = useAuth();
  const user = useMemo(() => toLegacyAuthUser(authUser), [authUser]);
  const { simulatedOwnerId } = useAdminOwnerFilter();
  const showAdminScopeInTopBar = useMemo(() => {
    if (!canSelectOwnerInAdminFilter(user) || simulatedOwnerId) return false;
    return isPmBusinessPath(location.pathname);
  }, [user, simulatedOwnerId, location.pathname]);

  return (
    <DashboardShellInner adminScopeInTopBar={showAdminScopeInTopBar}>
      {children}
    </DashboardShellInner>
  );
}

function DashboardShellInner({
  children,
  adminScopeInTopBar,
}: {
  children: ReactNode;
  adminScopeInTopBar: boolean;
}) {
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [compactMain, setCompactMain] = useState(false);
  const chrome = useDashboardChrome();
  const mainRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const listingCompact = compactMain || isListingCataloguePath(location.pathname);

  const setBreadcrumbIfChanged = useCallback((items: string[]) => {
    setBreadcrumb((prev) => {
      if (prev.length === items.length && prev.every((v, i) => v === items[i])) return prev;
      return items;
    });
  }, []);

  const setCompactMainIfChanged = useCallback((next: boolean) => {
    setCompactMain((prev) => (prev === next ? prev : next));
  }, []);

  const pageChromeValue = useMemo(
    () => ({
      setBreadcrumb: setBreadcrumbIfChanged,
      setCompactMain: setCompactMainIfChanged,
    }),
    [setBreadcrumbIfChanged, setCompactMainIfChanged],
  );

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.search]);

  return (
    <PageChromeContext.Provider value={pageChromeValue}>
      <DashboardLayout
        activePath={chrome.activePath}
        onNavigate={chrome.onNavigate}
        onLogout={chrome.onLogout}
        breadcrumb={breadcrumb}
        compactMain={listingCompact}
        adminScopeInTopBar={adminScopeInTopBar}
        user={chrome.user}
        mainRef={mainRef}
        persistent
      >
        {children}
      </DashboardLayout>
    </PageChromeContext.Provider>
  );
}

export function DashboardShellLayout() {
  return (
    <DashboardShellContext.Provider value={true}>
      <PmSimulationProvider>
        <AdminOwnerFilterProvider>
          <ShellTopBarScope>
            <Outlet />
          </ShellTopBarScope>
        </AdminOwnerFilterProvider>
      </PmSimulationProvider>
    </DashboardShellContext.Provider>
  );
}

export function usePageChromeUpdater(breadcrumb: string[], compactMain: boolean) {
  const inShell = useContext(DashboardShellContext);
  const pageChrome = useContext(PageChromeContext);
  const breadcrumbKey = breadcrumb.join('\u0000');

  useEffect(() => {
    if (!inShell || !pageChrome) return;
    pageChrome.setBreadcrumb(breadcrumb);
    pageChrome.setCompactMain(compactMain);
  }, [inShell, pageChrome, breadcrumbKey, compactMain, breadcrumb]);
}

export function DashboardChrome({
  children,
  breadcrumb = [],
  compactMain = false,
}: {
  children: ReactNode;
  breadcrumb?: string[];
  compactMain?: boolean;
}) {
  const chrome = useDashboardChrome();
  return (
    <DashboardLayout
      activePath={chrome.activePath}
      onNavigate={chrome.onNavigate}
      onLogout={chrome.onLogout}
      breadcrumb={breadcrumb}
      compactMain={compactMain}
      user={chrome.user}
    >
      {children}
    </DashboardLayout>
  );
}
