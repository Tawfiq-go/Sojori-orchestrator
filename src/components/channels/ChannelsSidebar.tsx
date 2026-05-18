import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const SECTIONS = [
  { id: 'Sum', label: 'Summary', emoji: '📊', description: 'Analytics par jour' },
  {
    id: 'Business',
    label: 'Business',
    emoji: '💼',
    description: 'API, Logs, Hooks',
    children: [
      { id: 'api', label: 'API', emoji: '📡' },
      { id: 'logapi', label: 'API log (HTTP)', emoji: '🔶' },
      { id: 'hooks', label: 'Hooks', emoji: '🔗' },
      { id: 'owner', label: 'Owner', emoji: '👤' },
      { id: 'listing', label: 'Listing', emoji: '🏠' },
    ],
  },
  {
    id: 'Mapping',
    label: 'Mapping',
    emoji: '🗺️',
    description: 'RU mapping & lists',
    children: [
      { id: 'fields', label: 'RU mapping', emoji: '🗺️' },
      { id: 'list', label: 'RU list', emoji: '📋' },
    ],
  },
  { id: 'Cron', label: 'Cron', emoji: '⏰', description: 'Scheduled jobs' },
  { id: 'Debug', label: 'Debug', emoji: '🐛', description: 'Audit 45 API' },
  { id: 'Import', label: 'Import RU', emoji: '📥', description: 'Import properties from RU' },
] as const;

function resolveActiveSection(sp: URLSearchParams) {
  const tab = (sp.get('tab') || 'Sum').trim();
  const lo = tab.toLowerCase();
  if (lo === 'business' || lo === 'biz' || lo === 'api' || lo === 'hook') return 'Business';
  if (lo === 'mapping' || lo === 'geo' || lo === 'map' || lo === 'rulist') return 'Mapping';
  if (lo === 'debug' || lo === 'audit') return 'Debug';
  if (lo === 'cron' || lo === 'crons' || lo === 'jobs') return 'Cron';
  if (lo === 'import' || lo === 'onboard') return 'Import';
  return 'Sum';
}

function resolveActiveBizChild(sp: URLSearchParams) {
  return (sp.get('biz') || 'api').toLowerCase();
}

function resolveActiveMapChild(sp: URLSearchParams) {
  const ms = (sp.get('mapSub') || 'fields').toLowerCase();
  return ms === 'list' || ms === 'rulist' ? 'list' : 'fields';
}

export function ChannelsSidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = useMemo(() => resolveActiveSection(searchParams), [searchParams]);
  const activeBiz = useMemo(() => resolveActiveBizChild(searchParams), [searchParams]);
  const activeMap = useMemo(() => resolveActiveMapChild(searchParams), [searchParams]);

  const handleSectionClick = (sectionId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', sectionId);

    if (sectionId === 'Business') {
      if (!next.get('biz')) next.set('biz', 'api');
      if (!next.get('api')) next.set('api', 'm');
    } else if (sectionId === 'Mapping') {
      if (!next.get('mapSub')) next.set('mapSub', 'fields');
    } else if (sectionId === 'Debug' && !next.get('type')) {
      next.set('type', 'pull');
    }
    setSearchParams(next);
  };

  const handleChildClick = (sectionId: string, childId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new URLSearchParams(searchParams);
    next.set('tab', sectionId);

    if (sectionId === 'Business') {
      next.set('biz', childId);
      if (childId === 'api') {
        if (!next.get('api') || next.get('api') === 'g') next.set('api', 'm');
      } else if (childId === 'logapi') {
        next.set('api', 'g');
      } else if (childId === 'hooks') {
        if (!next.get('hook')) next.set('hook', 'm');
      } else {
        next.delete('api');
        next.delete('hook');
      }
    } else if (sectionId === 'Mapping') {
      next.set('mapSub', childId);
      if (childId === 'list' && !next.get('ruDictType')) next.set('ruDictType', '2');
    }
    setSearchParams(next);
  };

  return (
    <div className="channels-sidebar w-64 shrink-0 bg-white border-r border-slate-200 shadow-sm overflow-y-auto min-h-[calc(100vh-8rem)]">
      <div className="px-4 py-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Channels</h2>
        <p className="text-xs text-slate-500 mt-1">Dashboard admin</p>
      </div>

      <nav className="p-3 space-y-1">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          const hasChildren = section.children && section.children.length > 0;
          const activeChild =
            section.id === 'Business' ? activeBiz : section.id === 'Mapping' ? activeMap : null;

          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => handleSectionClick(section.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-all duration-150 ease-in-out
                  ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
                title={section.description}
              >
                <span className={`text-xl ${isActive ? '' : 'opacity-70'}`}>{section.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-800'}`}>
                    {section.label}
                  </div>
                  {!isActive && (
                    <div className="text-xs text-slate-500 truncate">{section.description}</div>
                  )}
                </div>
              </button>

              {isActive && hasChildren && section.children && (
                <div className="ml-5 mt-1 mb-1 space-y-0.5 border-l-2 border-orange-200 pl-3">
                  {section.children.map((child) => {
                    const isChildActive = activeChild === child.id;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={(e) => handleChildClick(section.id, child.id, e)}
                        className={`
                          w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left
                          transition-all duration-100
                          ${
                            isChildActive
                              ? 'bg-orange-50 text-orange-700 font-semibold'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                          }
                        `}
                      >
                        <span className="text-sm">{child.emoji}</span>
                        <span className="text-xs">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export default ChannelsSidebar;
