import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardLayout } from './dashboard/DashboardV2.components';
import { isListingCataloguePath } from '../constants/listingLayout';
import { useDashboardChrome } from './useDashboardChrome';

/** Layout persistant : sidebar + topbar ne se remontent pas à chaque changement de route. */
export const DashboardShellContext = createContext(false);

export interface PageChromeContextValue {
  setBreadcrumb: (items: string[]) => void;
  setCompactMain: (compact: boolean) => void;
}

export const PageChromeContext = createContext<PageChromeContextValue | null>(null);

export function DashboardShellLayout() {
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [compactMain, setCompactMain] = useState(false);
  const chrome = useDashboardChrome();
  const mainRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const listingCompact = compactMain || isListingCataloguePath(location.pathname);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.search]);

  return (
    <DashboardShellContext.Provider value={true}>
      <PageChromeContext.Provider value={{ setBreadcrumb, setCompactMain }}>
        <DashboardLayout
          activePath={chrome.activePath}
          onNavigate={chrome.onNavigate}
          onLogout={chrome.onLogout}
          breadcrumb={breadcrumb}
          compactMain={listingCompact}
          user={chrome.user}
          mainRef={mainRef}
          persistent
        >
          <Outlet />
        </DashboardLayout>
      </PageChromeContext.Provider>
    </DashboardShellContext.Provider>
  );
}

export function usePageChromeUpdater(breadcrumb: string[], compactMain: boolean) {
  const inShell = useContext(DashboardShellContext);
  const pageChrome = useContext(PageChromeContext);

  useEffect(() => {
    if (!inShell || !pageChrome) return;
    pageChrome.setBreadcrumb(breadcrumb);
    pageChrome.setCompactMain(compactMain);
  }, [inShell, pageChrome, breadcrumb, compactMain]);
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
