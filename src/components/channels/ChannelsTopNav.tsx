/**
 * Navigation Channels — Business en 2 niveaux (section + domaine).
 */
import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RU_API_MAPPING } from '../../features/channels/data/ruApiMapping';
import { canonicalSectionTab, type SectionTab } from '../../utils/channelsUrlUtils';
import { parseMrSeg } from '../../utils/channelsSharedUtils';
import {
  API_DOMAIN_NAV,
  businessSectionFromBiz,
  BUSINESS_LEVEL1_NAV,
  level1NavDefaults,
  SUMMARY_VIEW_NAV,
  summaryViewFromParams,
  WEBHOOK_DOMAIN_NAV,
  type BusinessSection,
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
    defaults: { biz: 'api', api: 'r' },
  },
  { section: 'Mapping', label: 'Mapping', emoji: '🗺️', defaults: { mapSub: 'fields' } },
  { section: 'LogApiRU', label: 'LogApiRU', emoji: '🛰️' },
  { section: 'Debug', label: 'Debug', emoji: '🐛', defaults: { type: 'pull' } },
  { section: 'Cron', label: 'Cron', emoji: '⏰' },
];

const DEBUG_TYPES = [
  { type: 'pull', label: `Pull (${RU_API_MAPPING.pull.length})` },
  { type: 'push', label: `Push (${RU_API_MAPPING.push.length})` },
  { type: 'oauth', label: `OAuth (${RU_API_MAPPING.oauth.length})` },
  { type: 'webhooks', label: `Webhooks (${RU_API_MAPPING.webhooks.length})` },
  { type: 'rest', label: `REST (${REST_LIST.length})` },
  { type: 'http', label: 'HTTP brut' },
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
  const businessSection = businessSectionFromBiz(businessBiz);
  const apiSeg = parseMrSeg(searchParams.get('api'));
  const hookSeg = parseMrSeg(searchParams.get('hook'));
  const mapSub = useMemo(() => {
    const ms = (searchParams.get('mapSub') || 'fields').toLowerCase();
    return ms === 'list' || ms === 'rulist' ? 'list' : 'fields';
  }, [searchParams]);
  const ruListMode = searchParams.get('ruListMode') === 'languages' ? 'languages' : 'locations';
  const debugType = (searchParams.get('type') || 'pull').toLowerCase();
  const sumView = summaryViewFromParams(searchParams);

  const setSp = (patch: Record<string, string | undefined>) => {
    setSearchParams(patchParams(searchParams, patch), { replace: false });
  };

  const hours = Number(searchParams.get('hours'));
  const hoursVal = Number.isFinite(hours) && hours > 0 ? hours : 72;

  const hoursSelect = (extraClass = '') => (
    <select
      className={`channels-select h-7 text-xs shrink-0 ml-auto ${extraClass}`.trim()}
      value={hoursVal}
      onChange={(e) => setSp({ hours: e.target.value })}
      aria-label="Période"
    >
      <option value={6}>6h</option>
      <option value={24}>24h</option>
      <option value={72}>3j</option>
      <option value={168}>7j</option>
      <option value={720}>30j</option>
    </select>
  );

  const level1Active = (section: BusinessSection) => businessSection === section;

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

      {sectionTab === 'Sum' && (
        <NavBar>
          <div className="channels-tabs-container flex-wrap">
            {SUMMARY_VIEW_NAV.map(({ view, label, hint }) => (
              <TabBtn
                key={view}
                active={sumView === view}
                title={hint}
                onClick={() =>
                  setSp({
                    tab: 'Sum',
                    sumView: view === 'kpi' ? undefined : view,
                    biz: undefined,
                  })
                }
              >
                {label}
              </TabBtn>
            ))}
          </div>
          {hoursSelect()}
        </NavBar>
      )}

      {sectionTab === 'Business' && (
        <>
          <NavBar>
            <div className="channels-tabs-container flex-wrap">
              {BUSINESS_LEVEL1_NAV.map(({ section, label, hint }) => (
                <TabBtn
                  key={section}
                  active={level1Active(section)}
                  title={hint}
                  onClick={() => setSp(level1NavDefaults(section, apiSeg, hookSeg))}
                >
                  {label}
                </TabBtn>
              ))}
            </div>
            {hoursSelect()}
          </NavBar>

          {businessSection === 'api' && (
            <NavBar>
              <div className="channels-tabs-container flex-wrap">
                {API_DOMAIN_NAV.map(({ seg, label, hint }) => (
                  <TabBtn
                    key={seg}
                    active={apiSeg === seg}
                    title={hint}
                    onClick={() =>
                      setSp({ tab: 'Business', biz: 'api', api: seg, hook: undefined, docId: undefined })
                    }
                  >
                    {label}
                  </TabBtn>
                ))}
              </div>
            </NavBar>
          )}

          {businessSection === 'hooks' && (
            <NavBar>
              <div className="channels-tabs-container flex-wrap">
                {WEBHOOK_DOMAIN_NAV.map(({ seg, label, hint }) => (
                  <TabBtn
                    key={seg}
                    active={hookSeg === seg}
                    title={hint}
                    onClick={() =>
                      setSp({ tab: 'Business', biz: 'hooks', hook: seg, api: undefined, docId: undefined })
                    }
                  >
                    {label}
                  </TabBtn>
                ))}
              </div>
            </NavBar>
          )}
        </>
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
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-deep)] mr-1 shrink-0">
            Type
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
          {debugType === 'http' && hoursSelect('ml-0')}
        </NavBar>
      )}
    </div>
  );
}

export default ChannelsTopNav;
