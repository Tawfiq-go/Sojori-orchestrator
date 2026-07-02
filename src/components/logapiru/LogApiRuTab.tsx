/**
 * LogApiRU — onglet Channels : échanges Rental United enrichis.
 * Port fidèle Claude Design « Sojori LogApiRU.html » : Synthèse / Journal / Drawer détail.
 * URL : /channels?tab=LogApiRU&ruView=synthese|journal&hours=…&ruOwner=…&callId=…
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchLogApiRuList,
  fetchLogApiRuStats,
  type LogApiRuListResponse,
  type LogApiRuStatsResponse,
} from '../../services/logApiRuApi';
import { RU_PERIODS, clockTime, fmtN } from './logApiRuMeta';
import { EMPTY_FILTERS, knownActions, type LogApiRuFilters } from './logApiRuFilters';
import { LogApiRuSynthese } from './LogApiRuSynthese';
import { LogApiRuJournal } from './LogApiRuJournal';
import { LogApiRuDrawer } from './LogApiRuDrawer';
import './logapiru.css';

type RuView = 'synthese' | 'journal';

const FILTER_PARAM_KEYS: Record<keyof LogApiRuFilters, string> = {
  status: 'ruStatus',
  dir: 'ruDir',
  category: 'ruCat',
  action: 'ruAction',
  ownerId: 'ruOwner',
  minDur: 'ruMinDur',
  q: 'ruQ',
  correlationId: 'ruCid',
};

export function LogApiRuTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  const view: RuView = searchParams.get('ruView') === 'journal' ? 'journal' : 'synthese';
  const hoursParam = Number(searchParams.get('hours'));
  const hours = Number.isFinite(hoursParam) && hoursParam > 0 ? hoursParam : 24;
  const page = Math.max(1, Number(searchParams.get('ruPage')) || 1);
  const callId = searchParams.get('callId');

  const filters: LogApiRuFilters = useMemo(() => {
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

  const setView = (v: RuView) => setParams({ ruView: v === 'synthese' ? undefined : v });
  const setHours = (h: number) => setParams({ hours: String(h), ruPage: undefined });
  const setPage = (p: number) => setParams({ ruPage: p <= 1 ? undefined : String(p) });
  const setFilters = useCallback(
    (patch: Partial<LogApiRuFilters>) => {
      const urlPatch: Record<string, string | undefined> = { ruPage: undefined };
      for (const [key, value] of Object.entries(patch)) {
        urlPatch[FILTER_PARAM_KEYS[key as keyof LogApiRuFilters]] = value || undefined;
      }
      setParams(urlPatch);
    },
    [setParams],
  );

  // ── Stats (Synthèse + options owners du Journal) ──
  const [stats, setStats] = useState<LogApiRuStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [statsNonce, setStatsNonce] = useState(0);
  const scopeOwner = view === 'synthese' ? filters.ownerId : '';

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(false);
    fetchLogApiRuStats({ hours, ownerId: scopeOwner || undefined })
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
  const [list, setList] = useState<LogApiRuListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [listNonce, setListNonce] = useState(0);

  useEffect(() => {
    if (view !== 'journal') return;
    let cancelled = false;
    setListLoading(true);
    setListError(false);
    fetchLogApiRuList({
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
      ruView: 'journal',
      ruCid: cid,
      ruStatus: undefined,
      ruDir: undefined,
      ruCat: undefined,
      ruAction: undefined,
      ruMinDur: undefined,
      ruQ: undefined,
      ruPage: undefined,
      callId: undefined,
    });
  };

  const selectAction = (action: string) => {
    setParams({
      ruView: 'journal',
      ruAction: action,
      ruCid: undefined,
      ruPage: undefined,
    });
  };

  const selectOwner = (ownerId: string) => {
    setParams({
      ruView: 'journal',
      ruOwner: ownerId,
      ruCid: undefined,
      ruPage: undefined,
    });
  };

  return (
    <div className="logapiru-root">
      <div className="lru-topbar">
        <h1>
          LogApiRU <span className="tag">Rental United · XML</span>
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
        <LogApiRuSynthese
          stats={stats}
          loading={statsLoading}
          error={statsError}
          onRetry={() => setStatsNonce((n) => n + 1)}
          onSelectAction={selectAction}
          onSelectOwner={selectOwner}
        />
      ) : (
        <LogApiRuJournal
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

      <LogApiRuDrawer
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

export default LogApiRuTab;
