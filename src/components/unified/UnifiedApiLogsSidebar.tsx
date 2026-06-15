import { Link, useLocation } from 'react-router-dom';
import { buildRuChannelsNavLinks } from '../../data/sojoriLogsRuNavLinks';

const RU_LINKS = buildRuChannelsNavLinks();

type SidebarLink = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  depth: number;
};

const TOP_LINKS: SidebarLink[] = [
  {
    id: 'unified',
    label: 'Unifié',
    hint: 'UI logs API unifiée',
    href: '/admin/unified',
    depth: 0,
  },
  {
    id: 'airroi',
    label: 'AirROI',
    hint: 'API marché & listings',
    href: '/admin/sojori-logs',
    depth: 0,
  },
];

function isActive(href: string, pathname: string, search: string): boolean {
  const [path, query] = href.split('?');
  if (pathname !== path) return false;
  if (!query) return true;
  const expected = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  for (const [k, v] of expected.entries()) {
    if (current.get(k) !== v) return false;
  }
  return true;
}

export function UnifiedApiLogsSidebar() {
  const location = useLocation();

  const renderLink = (link: SidebarLink) => {
    const active = isActive(link.href, location.pathname, location.search);
    return (
      <li key={link.id}>
        <Link
          to={link.href}
          title={link.hint}
          className={
            active
              ? 'sojori-logs-section-btn sojori-logs-section-btn-active block w-full text-left rounded-md py-1.5 transition-colors'
              : 'sojori-logs-section-btn sojori-logs-section-btn-inactive block w-full text-left rounded-md py-1.5 hover:bg-slate-50 transition-colors'
          }
          style={{
            paddingLeft: link.depth === 0 ? 10 : link.depth === 1 ? 18 : 26,
            paddingRight: 10,
            fontSize: link.depth === 0 ? 12 : 11,
            fontWeight: link.depth === 0 ? 600 : 500,
            color: active ? undefined : link.depth === 0 ? '#1e293b' : '#475569',
            borderLeftColor: active ? '#FF6B35' : undefined,
          }}
        >
          {link.label}
        </Link>
      </li>
    );
  };

  return (
    <nav className="sojori-logs-section-nav shrink-0 w-[240px]" aria-label="Navigation logs API">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden sticky top-[72px] max-h-[calc(100vh-96px)] flex flex-col">
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Logs API</div>
          <div className="text-[10px] text-slate-500 mt-0.5">UI unifiée · AirROI · RU</div>
        </div>

        <div className="p-1.5 overflow-y-auto flex-1 min-h-0">
          <ul className="space-y-0.5 mb-3">{TOP_LINKS.map(renderLink)}</ul>

          <div className="border-t border-slate-100 pt-2 mt-1">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Rental United
            </div>
            <p className="px-2 pb-2 text-[10px] text-slate-500 leading-snug">
              Business enrichi · Debug brut · Cron · Import
            </p>
            <ul className="space-y-0.5">{RU_LINKS.map(renderLink)}</ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
