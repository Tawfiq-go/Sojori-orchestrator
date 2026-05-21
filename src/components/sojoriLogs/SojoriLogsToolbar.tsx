import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatCasablancaDate } from '../../utils/dateFormatting';

type Props = {
  onRefresh: () => void;
  loading?: boolean;
};

/** Barre titre — même pattern que ChannelsHubToolbar (orange Sojori #FF6B35). */
export function SojoriLogsToolbar({ onRefresh, loading }: Props) {
  const [lastRefresh, setLastRefresh] = useState(() => new Date());

  const doRefresh = () => {
    setLastRefresh(new Date());
    onRefresh();
  };

  return (
    <div className="channels-hub-toolbar sticky top-0 z-20 bg-slate-50/95 backdrop-blur pb-1">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900">Logs API marché</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Appels API marché & listings — filtre owner session
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-500">{formatCasablancaDate(lastRefresh, 'HH:mm:ss')}</span>
              <button
                type="button"
                onClick={doRefresh}
                disabled={loading}
                className="h-7 w-7 inline-flex items-center justify-center rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
