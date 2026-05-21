import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  SOJORI_LOG_TAB_ALL,
  buildSojoriLogTabs,
  filterSojoriLogTabs,
  groupFilteredTabs,
  type SojoriLogTabView,
} from '../../data/airroiLogTabs';

type Props = {
  activeId: string;
  onSelect: (endpointId: string) => void;
  availableEndpoints?: Array<{ endpoint?: string; id?: string; label?: string }>;
};

function EndpointTabChip({
  tab,
  active,
  onClick,
}: {
  tab: SojoriLogTabView;
  active: boolean;
  onClick: () => void;
}) {
  const isAll = tab.id === SOJORI_LOG_TAB_ALL;

  return (
    <button
      type="button"
      onClick={onClick}
      title={isAll ? 'Tous les endpoints' : tab.displayLabel}
      className={`sojori-logs-ep-tab ${active ? 'sojori-logs-ep-tab-active' : 'sojori-logs-ep-tab-inactive'}`}
    >
      {isAll ? (
        <span className="sojori-logs-ep-tab-label sojori-logs-ep-tab-label--solo">Tout</span>
      ) : (
        <>
          <span className="sojori-logs-ep-tab-label">{tab.shortLabel}</span>
          <span className="sojori-logs-ep-tab-api">{tab.id}</span>
        </>
      )}
    </button>
  );
}

export function SojoriLogsEndpointTabs({ activeId, onSelect, availableEndpoints = [] }: Props) {
  const [tabSearch, setTabSearch] = useState('');

  const allTabs = useMemo(() => buildSojoriLogTabs(availableEndpoints), [availableEndpoints]);
  const filtered = useMemo(() => filterSojoriLogTabs(allTabs, tabSearch), [allTabs, tabSearch]);
  const sections = useMemo(() => groupFilteredTabs(filtered), [filtered]);

  const totalEndpoints = allTabs.filter((t) => t.id !== SOJORI_LOG_TAB_ALL).length;
  const shownCount = filtered.filter((t) => t.id !== SOJORI_LOG_TAB_ALL).length;

  return (
    <div className="sojori-logs-endpoints-panel bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 mb-3 pb-2 border-b border-slate-100">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="search"
            value={tabSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            placeholder="Filtrer par API ou libellé…"
            className="sojori-logs-ep-search w-full pl-8 pr-8"
            aria-label="Filtrer les onglets endpoint"
          />
          {tabSearch ? (
            <button
              type="button"
              onClick={() => setTabSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <span className="text-[11px] text-slate-500 whitespace-nowrap">
          {tabSearch
            ? `${shownCount} / ${totalEndpoints} endpoints`
            : `${totalEndpoints} endpoints`}
        </span>
      </div>

      <div className="sojori-logs-ep-sections space-y-5 max-h-[420px] overflow-y-auto pr-1">
        {sections.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Aucun endpoint ne correspond à la recherche.</p>
        ) : (
          sections.map((section) => (
            <section key={section.group} aria-label={section.label}>
              <h3 className="sojori-logs-ep-section-title">{section.label}</h3>
              <div className="sojori-logs-ep-grid">
                {section.items.map((tab) => (
                  <EndpointTabChip
                    key={tab.id}
                    tab={tab}
                    active={activeId === tab.id}
                    onClick={() => onSelect(tab.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
