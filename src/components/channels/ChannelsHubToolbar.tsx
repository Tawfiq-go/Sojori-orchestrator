import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Zap } from 'lucide-react';
import { formatCasablancaDate } from '../../utils/dateFormatting';
import { dispatchChannelsRefresh } from '../../utils/channelsRefresh';
import { canonicalSectionTab, type SectionTab } from '../../utils/channelsUrlUtils';

type Props = {
  sectionHint?: string;
  sectionTab?: SectionTab;
};

/**
 * Barre titre Channels : refresh, période, indication de la section active.
 */
export function ChannelsHubToolbar({ sectionHint, sectionTab: sectionTabProp }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionTab = sectionTabProp ?? canonicalSectionTab(searchParams.get('tab'));
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const hoursParam = Number(searchParams.get('hours'));
  const hours = Number.isFinite(hoursParam) && hoursParam > 0 ? hoursParam : 72;

  const showHours = sectionTab === 'Sum' || sectionTab === 'Business';

  const doRefresh = () => {
    setLastRefresh(new Date());
    dispatchChannelsRefresh();
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      doRefresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh]);

  const sectionLabels: Record<string, string> = {
    Sum: 'Summary',
    Business: 'Business',
    Mapping: 'Mapping',
    Debug: 'Debug',
    Cron: 'Cron',
  };

  return (
    <div className="channels-hub-toolbar sticky top-0 z-20 bg-slate-50/95 backdrop-blur pb-1">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-sm font-bold text-slate-900">Channels · Rental United</div>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded channels-badge-section">
                  {sectionLabels[sectionTab] || sectionTab}
                </span>
                <span className="text-xs text-slate-500">{formatCasablancaDate(lastRefresh, 'HH:mm:ss')}</span>
              </div>
              {sectionHint ? (
                <p className="text-[11px] text-slate-500 mt-1 leading-snug max-w-3xl">{sectionHint}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {showHours && (
                <select
                  className="channels-select h-7 text-xs"
                  value={hours}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    const next = new URLSearchParams(searchParams);
                    next.set('hours', String(h));
                    setSearchParams(next, { replace: true });
                    doRefresh();
                  }}
                  aria-label="Période"
                >
                  <option value={6}>6h</option>
                  <option value={24}>24h</option>
                  <option value={72}>3j</option>
                  <option value={168}>7j</option>
                  <option value={720}>30j</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => setAutoRefresh((v) => !v)}
                className={`h-7 px-2 rounded text-xs font-semibold border ${
                  autoRefresh
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Zap size={11} className="inline mr-1" />
                {autoRefresh ? 'Auto' : 'Off'}
              </button>
              <button
                type="button"
                onClick={doRefresh}
                className="h-7 w-7 inline-flex items-center justify-center rounded channels-icon-btn-primary transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChannelsHubToolbar;
