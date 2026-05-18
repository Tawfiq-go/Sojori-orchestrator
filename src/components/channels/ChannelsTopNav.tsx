/**
 * Navigation Channels en haut de page (legacy : navbar + barres d’onglets, sans sidebar).
 * Niveau 1 : sections · Niveau 2 : biz / mapSub / debug type · Niveau 3 : api / hook / ruListMode
 */
import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Home, UserRound } from 'lucide-react';
import { RU_API_MAPPING } from '../../features/channels/data/ruApiMapping';
import { canonicalSectionTab, type SectionTab } from '../../utils/channelsUrlUtils';
import { parseMrSeg } from '../../utils/channelsSharedUtils';
import { resolveBusinessViewTab } from '../../utils/businessTabHelpers';

const REST_LIST = RU_API_MAPPING.rest || [];

const MAIN_SECTIONS: Array<{
  section: SectionTab;
  label: string;
  emoji: string;
  defaults?: Record<string, string>;
}> = [
  { section: 'Sum', label: 'Summary', emoji: '📊' },
  { section: 'Business', label: 'Business', emoji: '💼', defaults: { biz: 'api', api: 'm' } },
  { section: 'Mapping', label: 'Mapping', emoji: '🗺️', defaults: { mapSub: 'fields' } },
  { section: 'Debug', label: 'Debug', emoji: '🐛', defaults: { type: 'pull' } },
  { section: 'Cron', label: 'Cron', emoji: '⏰' },
  { section: 'Import', label: 'Import RU', emoji: '📥' },
];

const API_SEGMENTS = [
  { seg: 'm', label: 'Messages' },
  { seg: 'rev', label: 'Reviews' },
  { seg: 'lead', label: 'Leads' },
  { seg: 'r', label: 'Réservations' },
  { seg: 'c', label: 'Calendrier' },
  { seg: 'l', label: 'Listing' },
  { seg: 'o', label: 'OAuth' },
  { seg: 'u', label: 'User' },
  { seg: 'd', label: 'Distribution' },
] as const;

const DEBUG_TYPES = [
  { type: 'pull', label: `Pull (${RU_API_MAPPING.pull.length})` },
  { type: 'push', label: `Push (${RU_API_MAPPING.push.length})` },
  { type: 'oauth', label: `OAuth (${RU_API_MAPPING.oauth.length})` },
  { type: 'webhooks', label: `Webhooks (${RU_API_MAPPING.webhooks.length})` },
  { type: 'rest', label: `REST (${REST_LIST.length})` },
] as const;

function patchParams(base: URLSearchParams, patch: Record<string, string | undefined>) {
  const next = new URLSearchParams(base);
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) next.delete(k);
    else next.set(k, v);
  }
  return next;
}

function NavBar({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-3 py-2 flex flex-wrap items-center gap-2">
      {children}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`channels-tab-button ${active ? 'channels-tab-button-active' : 'channels-tab-button-inactive'}`}
    >
      {children}
    </button>
  );
}

export function ChannelsTopNav() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionTab = canonicalSectionTab(searchParams.get('tab'));
  const businessBiz = (searchParams.get('biz') || 'api').toLowerCase();
  const viewTab = resolveBusinessViewTab(businessBiz);
  const apiSeg = parseMrSeg(searchParams.get('api'));
  const hookSeg = parseMrSeg(searchParams.get('hook'));
  const mapSub = useMemo(() => {
    const ms = (searchParams.get('mapSub') || 'fields').toLowerCase();
    return ms === 'list' || ms === 'rulist' ? 'list' : 'fields';
  }, [searchParams]);
  const ruListMode = searchParams.get('ruListMode') === 'languages' ? 'languages' : 'locations';
  const debugType = (searchParams.get('type') || 'pull').toLowerCase();

  const setSp = (patch: Record<string, string | undefined>) => {
    setSearchParams(patchParams(searchParams, patch), { replace: false });
  };

  const hours = Number(searchParams.get('hours'));
  const hoursVal = Number.isFinite(hours) && hours > 0 ? hours : 72;

  const showHours =
    sectionTab === 'Sum' ||
    sectionTab === 'Business' ||
    (sectionTab === 'Business' && viewTab === 'Hook');

  return (
    <div className="channels-top-nav space-y-2" aria-label="Navigation Channels">
      <NavBar>
        <div className="channels-tabs-container flex-wrap">
          {MAIN_SECTIONS.map((t) => (
            <TabBtn
              key={t.section}
              active={sectionTab === t.section}
              title={t.label}
              onClick={() => setSp({ tab: t.section, ...t.defaults })}
            >
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>{t.emoji}</span>
                <span>{t.label}</span>
              </span>
            </TabBtn>
          ))}
        </div>
      </NavBar>

      {sectionTab === 'Business' && (
        <NavBar>
          <div className="channels-tabs-container flex-wrap">
            <TabBtn
              active={businessBiz === 'api'}
              onClick={() => setSp({ tab: 'Business', biz: 'api', api: apiSeg === 'g' ? 'm' : apiSeg || 'm' })}
            >
              API
            </TabBtn>
            <TabBtn
              active={businessBiz === 'logapi'}
              onClick={() => setSp({ tab: 'Business', biz: 'logapi', api: 'g' })}
            >
              API log (HTTP)
            </TabBtn>
            <TabBtn
              active={businessBiz === 'hooks'}
              onClick={() => setSp({ tab: 'Business', biz: 'hooks', hook: hookSeg || 'm' })}
            >
              Hooks
            </TabBtn>
            <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden />
            <TabBtn
              active={businessBiz === 'owner'}
              onClick={() => setSp({ tab: 'Business', biz: 'owner', api: undefined, hook: undefined })}
            >
              <span className="inline-flex items-center gap-1">
                <UserRound size={12} strokeWidth={2.5} />
                Owner
              </span>
            </TabBtn>
            <TabBtn
              active={businessBiz === 'listing'}
              onClick={() => setSp({ tab: 'Business', biz: 'listing', api: undefined, hook: undefined })}
            >
              <span className="inline-flex items-center gap-1">
                <Home size={12} strokeWidth={2.5} />
                Listing
              </span>
            </TabBtn>
          </div>
        </NavBar>
      )}

      {sectionTab === 'Business' && viewTab === 'Api' && businessBiz === 'api' && (
        <NavBar>
          {showHours && (
            <select
              className="channels-select h-7 text-xs shrink-0"
              value={hoursVal}
              onChange={(e) => setSp({ hours: e.target.value })}
              aria-label="Période"
            >
              <option value={6}>6h</option>
              <option value={24}>24h</option>
              <option value={72}>3j</option>
              <option value={168}>7j</option>
            </select>
          )}
          <div className="channels-tabs-container flex-wrap">
            {API_SEGMENTS.map(({ seg, label }) => (
              <TabBtn
                key={seg}
                active={apiSeg === seg}
                onClick={() => setSp({ tab: 'Business', biz: 'api', api: seg })}
              >
                {label}
              </TabBtn>
            ))}
          </div>
        </NavBar>
      )}

      {sectionTab === 'Business' && businessBiz === 'logapi' && (
        <NavBar>
          <select
            className="channels-select h-7 text-xs"
            value={hoursVal}
            onChange={(e) => setSp({ hours: e.target.value })}
          >
            <option value={6}>6h</option>
            <option value={24}>24h</option>
            <option value={72}>3j</option>
            <option value={168}>7j</option>
          </select>
        </NavBar>
      )}

      {sectionTab === 'Business' && viewTab === 'Hook' && (
        <NavBar>
          <select
            className="channels-select h-7 text-xs"
            value={hoursVal}
            onChange={(e) => setSp({ hours: e.target.value })}
          >
            <option value={24}>24h</option>
            <option value={72}>3j</option>
            <option value={168}>7j</option>
          </select>
          <div className="channels-tabs-container flex-wrap">
            <TabBtn
              active={hookSeg === 'm'}
              onClick={() => setSp({ tab: 'Business', biz: 'hooks', hook: 'm' })}
            >
              Messages
            </TabBtn>
            <TabBtn
              active={hookSeg === 'r'}
              onClick={() => setSp({ tab: 'Business', biz: 'hooks', hook: 'r' })}
            >
              Réservations
            </TabBtn>
          </div>
        </NavBar>
      )}

      {sectionTab === 'Mapping' && (
        <NavBar>
          <div className="channels-tabs-container flex-wrap">
            <TabBtn
              active={mapSub === 'fields'}
              onClick={() => setSp({ tab: 'Mapping', mapSub: 'fields' })}
            >
              RU mapping (champs)
            </TabBtn>
            <TabBtn
              active={mapSub === 'list'}
              onClick={() => setSp({ tab: 'Mapping', mapSub: 'list', ruDictType: searchParams.get('ruDictType') || '2' })}
            >
              Dictionnaires RU
            </TabBtn>
          </div>
        </NavBar>
      )}

      {sectionTab === 'Mapping' && mapSub === 'list' && (
        <NavBar>
          <div className="channels-tabs-container flex-wrap">
            <TabBtn
              active={ruListMode === 'locations'}
              onClick={() => setSp({ tab: 'Mapping', mapSub: 'list', ruListMode: undefined })}
            >
              Pays / lieux
            </TabBtn>
            <TabBtn
              active={ruListMode === 'languages'}
              onClick={() => setSp({ tab: 'Mapping', mapSub: 'list', ruListMode: 'languages' })}
            >
              Langues
            </TabBtn>
          </div>
        </NavBar>
      )}

      {sectionTab === 'Debug' && (
        <NavBar>
          <div className="channels-tabs-container flex-wrap">
            {DEBUG_TYPES.map(({ type, label }) => (
              <TabBtn
                key={type}
                active={debugType === type}
                onClick={() => setSp({ tab: 'Debug', type, api: undefined, docId: undefined })}
              >
                {label}
              </TabBtn>
            ))}
          </div>
        </NavBar>
      )}
    </div>
  );
}

export default ChannelsTopNav;
