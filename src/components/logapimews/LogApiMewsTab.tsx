/**
 * LogApiMews — onglet Channels : échanges Mews Connector enrichis.
 * Port fidèle Claude Design « Sojori LogApiMews.html » : Synthèse / Journal / Drawer détail.
 * URL : /channels?tab=LogApiMews&mewsView=synthese|journal&hours=…&mewsOwner=…&callId=…
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchLogApiMewsList,
  fetchLogApiMewsStats,
  type LogApiMewsListResponse,
  type LogApiMewsStatsResponse,
} from '../../services/logApiMewsApi';
import { RU_PERIODS, clockTime, fmtN } from './logApiMewsMeta';
import { EMPTY_FILTERS, knownActions, type LogApiMewsFilters } from './logApiMewsFilters';
import { LogApiMewsSynthese } from './LogApiMewsSynthese';
import { LogApiMewsJournal } from './LogApiMewsJournal';
import { LogApiMewsDrawer } from './LogApiMewsDrawer';
import './logapimews.css';

type RuView = 'synthese' | 'journal';

const FILTER_PARAM_KEYS: Record<keyof LogApiMewsFilters, string> = {
  status: 'mewsStatus',
  dir: 'mewsDir',
  category: 'mewsCat',
  action: 'mewsAction',
  ownerId: 'mewsOwner',
  minDur: 'mewsMinDur',
  q: 'mewsQ',
  correlationId: 'mewsCid',
};

export function LogApiMewsTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  const view: RuView = searchParams.get('mewsView') === 'journal' ? 'journal' : 'synthese';
  const hoursParam = Number(searchParams.get('hours'));
  const hours = Number.isFinite(hoursParam) && hoursParam > 0 ? hoursParam : 24;
  const page = Math.max(1, Number(searchParams.get('mewsPage')) || 1);
  const callId = searchParams.get('callId');

  const filters: LogApiMewsFilters = useMemo(() => {
    const f = { ...EMPTY_FILTERS };
    for (const [key, param] of Object.entries(FILTER_PARAM_KEYS)) {
      const v = searchParams.get(param);
      if (v) (f as Record<string, string>)[key] = v;
    }
    return f;
  }, [searchParams]);

  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '') next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const setView = (v: RuView) => setParams({ mewsView: v === 'synthese' ? undefined : v });
  const setHours = (h: number) => setParams({ hours: String(h), mewsPage: undefined });
  const setPage = (p: number) => setParams({ mewsPage: p <= 1 ? undefined : String(p) });
  const setFilters = useCallback(
    (patch: Partial<LogApiMewsFilters>) => {
      const urlPatch: Record<string, string | undefined> = { mewsPage: undefined };
      for (const [key, value] of Object.entries(patch)) {
        urlPatch[FILTER_PARAM_KEYS[key as keyof LogApiMewsFilters]] = value || undefined;
      }
      setParams(urlPatch);
    },
    [setParams],
  );

  // ── Stats (Synthèse + options owners du Journal) ──
  const [stats, setStats] = useState<LogApiMewsStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [statsNonce, setStatsNonce] = useState(0);
  const scopeOwner = view === 'synthese' ? filters.ownerId : '';

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setStatsLoading(true);
        setStatsError(false);
      }
    });
    fetchLogApiMewsStats({ hours, ownerId: scopeOwner || undefined })
      .then((d) => {
        if (!cancelled) setStats(d);
      })
      .catch(() => {
        if (!cancelled) setStatsError(true);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hours, scopeOwner, statsNonce]);

  // ── Journal ──
  const [list, setList] = useState<LogApiMewsListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [listNonce, setListNonce] = useState(0);

  useEffect(() => {
    if (view !== 'journal') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setListLoading(true);
        setListError(false);
      }
    });
    fetchLogApiMewsList({
      page,
      limit: 50,
      hours,
      status: filters.status,
      dir: filters.dir,
      category: filters.category || '',
      action: filters.action,
      ownerId: filters.ownerId,
      correlationId: filters.correlationId,
      q: filters.q,
      minResponseTime: filters.minDur ? Number(filters.minDur) : undefined,
    })
      .then((d) => {
        if (!cancelled) setList(d);
      })
      .catch(() => {
        if (!cancelled) setListError(true);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, page, hours, filters, listNonce]);

  const actions = useMemo(() => {
    const set = new Set<string>(knownActions());
    for (const a of stats?.byAction ?? []) set.add(a.action);
    return [...set].sort();
  }, [stats]);

  const owners = stats?.byOwner ?? [];
  const journalIds = useMemo(() => (list?.items ?? []).map((i) => i.id), [list]);
  const journalCount = list?.pagination.total ?? null;

  const openCall = (id: string) => setParams({ callId: id });
  const closeCall = () => setParams({ callId: undefined });

  const filterCorrelation = (cid: string) => {
    setParams({
      mewsView: 'journal',
      mewsCid: cid,
      mewsStatus: undefined,
      mewsDir: undefined,
      mewsCat: undefined,
      mewsAction: undefined,
      mewsMinDur: undefined,
      mewsQ: undefined,
      mewsPage: undefined,
      callId: undefined,
    });
  };

  const selectAction = (action: string) => {
    setParams({
      mewsView: 'journal',
      mewsAction: action,
      mewsCid: undefined,
      mewsPage: undefined,
    });
  };

  const selectOwner = (ownerId: string) => {
    setParams({
      mewsView: 'journal',
      mewsOwner: ownerId,
      mewsCid: undefined,
      mewsPage: undefined,
    });
  };

  const filterStatus = (status: '' | 'error' | 'warning' | 'success') => {
    setParams({
      mewsView: 'journal',
      mewsStatus: status || undefined,
      mewsCid: undefined,
      mewsPage: undefined,
      callId: undefined,
    });
  };

  return (
    <div className="logapimews-root">
      <div className="lru-topbar">
        <h1>
          LogApiMews <span className="tag">Mews Connector · JSON</span>
        </h1>
        <span className="sub">Échanges API enrichis · rétention 30 j</span>
        <div className="viewtoggle">
          <button
            type="button"
            className={`vt ${view === 'synthese' ? 'on' : ''}`}
            onClick={() => setView('synthese')}
          >
            Synthèse
          </button>
          <button
            type="button"
            className={`vt ${view === 'journal' ? 'on' : ''}`}
            onClick={() => setView('journal')}
          >
            Journal{journalCount != null && <span className="n">{fmtN(journalCount)}</span>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--lru-text3)', fontWeight: 600 }}>Fenêtre</div>
        <div className="period">
          {RU_PERIODS.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`pd ${p.hours === hours ? 'on' : ''}`}
              onClick={() => setHours(p.hours)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {view === 'synthese' && (
          <div className="owner-scope">
            <span className="lbl">Owner</span>
            <div className="fsel">
              <select value={filters.ownerId} onChange={(e) => setFilters({ ownerId: e.target.value })}>
                <option value="">Tous les owners</option>
                {owners.map((o) => (
                  <option key={o.ownerId} value={o.ownerId}>
                    {o.ownerName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--lru-text3)',
            fontFamily: 'var(--lru-mono)',
          }}
        >
          MàJ {clockTime(new Date().toISOString())}
        </div>
      </div>

      {view === 'synthese' ? (
        <LogApiMewsSynthese
          stats={stats}
          loading={statsLoading}
          error={statsError}
          onRetry={() => setStatsNonce((n) => n + 1)}
          onSelectAction={selectAction}
          onSelectOwner={selectOwner}
          onFilterStatus={filterStatus}
        />
      ) : (
        <LogApiMewsJournal
          data={list}
          loading={listLoading}
          error={listError}
          onRetry={() => setListNonce((n) => n + 1)}
          filters={filters}
          onFiltersChange={setFilters}
          owners={owners}
          actions={actions}
          page={page}
          onPageChange={setPage}
          activeCallId={callId}
          onOpenCall={openCall}
        />
      )}

      <LogApiMewsDrawer
        callId={callId}
        ids={journalIds}
        enriched={callId ? (list?.items ?? []).find((i) => i.id === callId) ?? null : null}
        onClose={closeCall}
        onNavigate={openCall}
        onFilterCorrelation={filterCorrelation}
      />
    </div>
  );
}

export default LogApiMewsTab;
