/** Footer navigation — aligné legacy ChannelsFooterNav (ids Sum | Api | Debug | Map | Cron | Import). */

const TABS = [
  { id: 'Sum', section: 'Sum', label: 'Summary', emoji: '📊' },
  { id: 'Api', section: 'Business', label: 'Business', emoji: '💼' },
  { id: 'Debug', section: 'Debug', label: 'Debug', emoji: '🐛' },
  { id: 'Map', section: 'Mapping', label: 'Mapping', emoji: '🗺️' },
  { id: 'Cron', section: 'Cron', label: 'Cron', emoji: '⏰' },
  { id: 'Import', section: 'Import', label: 'Import', emoji: '📥' },
] as const;

export type ChannelsFooterTabId = (typeof TABS)[number]['id'];

function footerTabFromSection(section: string): ChannelsFooterTabId {
  if (section === 'Business') return 'Api';
  if (section === 'Mapping') return 'Map';
  if (section === 'Debug') return 'Debug';
  if (section === 'Cron') return 'Cron';
  if (section === 'Import') return 'Import';
  return 'Sum';
}

export function ChannelsFooterNav({
  sectionTab,
  onNavigate,
}: {
  sectionTab: string;
  onNavigate: (section: string, defaults?: Record<string, string>) => void;
}) {
  const activeTab = footerTabFromSection(sectionTab);

  return (
    <div className="channels-footer-nav sticky bottom-0 z-30 bg-white border-t-2 border-slate-300 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around max-w-4xl mx-auto py-2 px-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                const defaults: Record<string, string> = {};
                if (tab.section === 'Business') {
                  defaults.biz = 'api';
                  defaults.api = 'm';
                }
                if (tab.section === 'Mapping') {
                  defaults.mapSub = 'fields';
                }
                if (tab.section === 'Debug') {
                  defaults.type = 'pull';
                }
                onNavigate(tab.section, defaults);
              }}
              className={`
                flex flex-col items-center justify-center gap-1 px-4 py-2.5 rounded-xl
                min-w-[80px] transition-all duration-200 ease-in-out
                ${
                  isActive
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                    : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
              title={tab.label}
            >
              <span className={`text-2xl ${isActive ? '' : 'opacity-70'}`}>{tab.emoji}</span>
              <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-700'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ChannelsFooterNav;
