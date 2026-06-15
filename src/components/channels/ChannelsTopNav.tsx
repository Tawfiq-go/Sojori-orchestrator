/**
 * Navigation Channels — Business organisé par sens métier puis domaine.
 * URL legacy : biz=api|hooks|logapi|owner|listing + api= / hook=
 */
import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Home, UserRound } from 'lucide-react';
import { RU_API_MAPPING } from '../../features/channels/data/ruApiMapping';
import { canonicalSectionTab, type SectionTab } from '../../utils/channelsUrlUtils';
import { parseMrSeg } from '../../utils/channelsSharedUtils';
import { resolveBusinessViewTab } from '../../utils/businessTabHelpers';
import {
  bizFromBusinessFlow,
  businessFlowFromBiz,
  BUSINESS_FLOW_NAV,
  BUSINESS_STATS_NAV,
  INBOUND_HOOK_DOMAIN_NAV,
  OUTBOUND_DOMAIN_NAV,
  type BusinessFlow,
} from '../../utils/channelsBusinessNav';

const REST_LIST = RU_API_MAPPING.rest || [];

const MAIN_SECTIONS: Array<{
  section: SectionTab;
  label: string;
  emoji: string;
  defaults?: Record<string, string>;
}> = [
  { section: 'Sum', label: 'Summary', emoji: '📊' },
  {
    section: 'Business',
    label: 'Business',
    emoji: '💼',
    defaults: { biz: 'api', api: 'm' },
  },
  { section: 'Mapping', label: 'Mapping', emoji: '🗺️', defaults: { mapSub: 'fields' } },
  { section: 'Debug', label: 'Debug', emoji: '🐛', defaults: { type: 'pull' } },
  { section: 'Cron', label: 'Cron', emoji: '⏰' },
  { section: 'Import', label: 'Import RU', emoji: '📥' },
];

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

function flowDefaults(flow: BusinessFlow, apiSeg: string, hookSeg: string): Record<string, string | undefined> {
  const biz = bizFromBusinessFlow(flow);
  if (flow === 'out') {
    return { tab: 'Business', biz, api: apiSeg === 'g' ? 'm' : apiSeg || 'm', hook: undefined };
  }
  if (flow === 'in-hook') {
    return { tab: 'Business', biz, hook: hookSeg || 'm', api: undefined, docId: undefined };
  }
  if (flow === 'in-http') {
    return { tab: 'Business', biz, api: 'g', hook: undefined };
  }
  return { tab: 'Business', biz, api: undefined, hook: undefined };
}

export function ChannelsTopNav() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionTab = canonicalSectionTab(searchParams.get('tab'));
  const businessBiz = (searchParams.get('biz') || 'api').toLowerCase();
  const businessFlow = businessFlowFromBiz(businessBiz);
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

  const hoursSelect = (extraClass = '') => (
    <select
      className={`channels-select h-7 text-xs shrink-0 ${extraClass}`.trim()}
      value={hoursVal}
      onChange={(e) => setSp({ hours: e.target.value })}
      aria-label="Période"
    >
      <option value={6}>6h</option>
      <option value={24}>24h</option>
      <option value={72}>3j</option>
      <option value={168}>7j</option>
    </select>
  );

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
        <>
          <NavBar>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mr-1 shrink-0">
              Flux
            </span>
            <div className="channels-tabs-container flex-wrap">
              {BUSINESS_FLOW_NAV.map(({ flow, label, hint }) => (
                <TabBtn
                  key={flow}
                  active={businessFlow === flow}
                  title={hint}
                  onClick={() => setSp(flowDefaults(flow, apiSeg, hookSeg))}
                >
                  {label}
                </TabBtn>
              ))}
            </div>
            <span className="w-px h-5 bg-slate-200 mx-0.5 hidden sm:block" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mr-1 shrink-0">
              Synthèse
            </span>
            <div className="channels-tabs-container flex-wrap">
              {BUSINESS_STATS_NAV.map(({ flow, label, hint }) => (
                <TabBtn
                  key={flow}
                  active={businessFlow === flow}
                  title={hint}
                  onClick={() => setSp(flowDefaults(flow, apiSeg, hookSeg))}
                >
                  <span className="inline-flex items-center gap-1">
                    {flow === 'stats-owner' ? (
                      <UserRound size={12} strokeWidth={2.5} />
                    ) : (
                      <Home size={12} strokeWidth={2.5} />
                    )}
                    {label.replace('Synthèse · ', '')}
                  </span>
                </TabBtn>
              ))}
            </div>
          </NavBar>
        </>
      )}

      {sectionTab === 'Business' && businessFlow === 'out' && (
        <NavBar>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mr-1 shrink-0">
            Domaine
          </span>
          {showHours && hoursSelect()}
          <div className="channels-tabs-container flex-wrap">
            {OUTBOUND_DOMAIN_NAV.map(({ seg, label, hint }) => (
              <TabBtn
                key={seg}
                active={apiSeg === seg}
                title={hint}
                onClick={() => setSp({ tab: 'Business', biz: 'api', api: seg })}
              >
                {label}
              </TabBtn>
            ))}
          </div>
        </NavBar>
      )}

      {sectionTab === 'Business' && businessFlow === 'in-http' && (
        <NavBar>
          <span className="text-[10px] text-slate-500 mr-2">
            Requêtes HTTP reçues par srv-channels (collection logapis) — avant routage métier
          </span>
          {hoursSelect()}
        </NavBar>
      )}

      {sectionTab === 'Business' && businessFlow === 'in-hook' && (
        <NavBar>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mr-1 shrink-0">
            Domaine
          </span>
          {hoursSelect()}
          <div className="channels-tabs-container flex-wrap">
            {INBOUND_HOOK_DOMAIN_NAV.map(({ seg, label, hint }) => (
              <TabBtn
                key={seg}
                active={hookSeg === seg}
                title={hint}
                onClick={() =>
                  setSp({ tab: 'Business', biz: 'hooks', hook: seg, docId: undefined })
                }
              >
                {label}
              </TabBtn>
            ))}
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
              onClick={() =>
                setSp({
                  tab: 'Mapping',
                  mapSub: 'list',
                  ruDictType: searchParams.get('ruDictType') || '2',
                })
              }
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
          <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 mr-1 shrink-0">
            ① Type
          </span>
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
