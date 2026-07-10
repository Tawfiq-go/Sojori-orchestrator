/** LogApiRU · Vue A — Synthèse : KPIs, santé par API (par catégorie), répartition par owner. */
import { useMemo } from 'react';
import type {
  LogApiRuActionStat,
  LogApiRuCategory,
  LogApiRuOwnerStat,
  LogApiRuStatsResponse,
} from '../../services/logApiRuApi';
import {
  CATEGORY_ORDER,
  RU_CATEGORIES,
  actionDir,
  actionLabel,
  absTime,
  fmtN,
  relTime,
  uiStatus,
} from './logApiRuMeta';
import { DirBadge, EmptyState, ErrorState, StatusBadge, msClass } from './logApiRuBits';

function successRate(a: LogApiRuActionStat): number {
  if (!a.calls) return 100;
  return Math.round((a.success / a.calls) * 1000) / 10;
}

function gaugeColor(pct: number): string {
  if (pct >= 98) return 'var(--lru-success)';
  if (pct >= 92) return 'var(--lru-warning)';
  return 'var(--lru-error)';
}

function isDegraded(a: LogApiRuActionStat): boolean {
  return uiStatus(a.lastStatus, a.lastStatusCode, a.lastResponseTime) !== 'success';
}

function SkeletonSynthese() {
  return (
    <div>
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div className="kpi" key={i}>
            <div className="skel" style={{ height: 11, width: 70 }} />
            <div className="skel" style={{ height: 28, width: 90, marginTop: 10 }} />
            <div className="skel" style={{ height: 10, width: 110, marginTop: 9 }} />
          </div>
        ))}
      </div>
      {[0, 1].map((i) => (
        <div className="catgroup" key={i}>
          <div className="skel" style={{ height: 16, width: 180, margin: '8px 0' }} />
          <div className="skel" style={{ height: 150, width: '100%', borderRadius: 10 }} />
        </div>
      ))}
    </div>
  );
}

export interface LogApiRuSyntheseProps {
  stats: LogApiRuStatsResponse | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSelectAction: (action: string) => void;
  onSelectOwner: (ownerId: string) => void;
}

export function LogApiRuSynthese({
  stats,
  loading,
  error,
  onRetry,
  onSelectAction,
  onSelectOwner,
}: LogApiRuSyntheseProps) {
  const now = useMemo(() => new Date(), [stats]);

  if (loading) return <SkeletonSynthese />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (!stats || stats.kpis.total === 0) {
    return (
      <EmptyState
        title="Aucun appel sur cette période"
        detail="Aucun échange Rental United n’a été enregistré sur la fenêtre sélectionnée. Élargissez la période."
      />
    );
  }

  const { kpis, byAction, byOwner } = stats;
  const failing = kpis.errors + kpis.warnings;
  const errRate = kpis.total ? (failing / kpis.total) * 100 : 0;
  const degraded = byAction.filter(isDegraded);

  const byCategory = new Map<LogApiRuCategory, LogApiRuActionStat[]>();
  for (const a of byAction) {
    const list = byCategory.get(a.category) || [];
    list.push(a);
    byCategory.set(a.category, list);
  }

  return (
    <div>
      <div className="kpis">
        <div className="kpi">
          <div className="k">Appels API</div>
          <div className="v">{fmtN(kpis.total)}</div>
          <div className="trend">{byAction.length} APIs actives sur la fenêtre</div>
        </div>
        <div className={`kpi ${errRate > 2 ? 'warn' : 'ok'}`}>
          <div className="k">Taux d’erreur</div>
          <div className="v">
            {errRate.toFixed(1)}
            <small>%</small>
          </div>
          <div className="trend">
            {fmtN(kpis.errors)} échec{kpis.errors > 1 ? 's' : ''} · {fmtN(kpis.warnings)} retry
          </div>
        </div>
        <div className={`kpi ${kpis.slow > 0 ? 'err' : 'ok'}`}>
          <div className="k">
            Appels lents <span className="badge neutral" style={{ fontSize: 9 }}>&gt;5s</span>
          </div>
          <div className="v">{fmtN(kpis.slow)}</div>
          <div className="trend">sur la fenêtre sélectionnée</div>
        </div>
        <div className="kpi">
          <div className="k">Temps de réponse moy.</div>
          <div className="v">
            {kpis.avgResponseTime == null ? '—' : fmtN(kpis.avgResponseTime)}
            <small>ms</small>
          </div>
          <div className="trend">toutes APIs confondues</div>
        </div>
      </div>

      {degraded.length > 0 && (
        <div className="errbox warn" style={{ marginBottom: 16 }}>
          <span className="ic">⚠️</span>
          <div>
            <div className="et">
              {degraded.length} API{degraded.length > 1 ? 's' : ''} en état dégradé
            </div>
            <div className="ed">
              {degraded.map((a) => (
                <code key={a.action} style={{ marginRight: 4 }}>
                  {actionLabel(a.action)}
                </code>
              ))}{' '}
              — dernier appel non nominal. Cliquez la ligne pour filtrer le journal.
            </div>
          </div>
        </div>
      )}

      <div className="panel-h" style={{ border: 0, padding: '4px 2px 10px' }}>
        <span className="t">Santé par API</span>
        <span className="s">{byAction.length} endpoints · fenêtre sélectionnée</span>
      </div>

      {CATEGORY_ORDER.map((catKey) => {
        const cat = RU_CATEGORIES[catKey];
        const rows = byCategory.get(catKey) || [];
        if (!rows.length) return null;
        const deg = rows.filter(isDegraded).length;
        return (
          <div className="catgroup" key={catKey}>
            <div className="catgroup-h">
              <span className="cd" style={{ background: cat.color }} />
              {cat.label}
              <span className="cnt">{rows.length}</span>
              {deg > 0 && (
                <span className="deg">● {deg} dégradée{deg > 1 ? 's' : ''}</span>
              )}
            </div>
            <table className="api-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>API</th>
                  <th style={{ width: 70 }}>Sens</th>
                  <th className="num">Volume</th>
                  <th style={{ width: 160 }}>Taux de succès</th>
                  <th className="num">Temps moy.</th>
                  <th>Dernier appel</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pct = successRate(r);
                  const color = gaugeColor(pct);
                  return (
                    <tr
                      key={r.action}
                      className={isDegraded(r) ? 'degraded' : ''}
                      onClick={() => onSelectAction(r.action)}
                    >
                      <td>
                        <div className="api-name">{actionLabel(r.action)}</div>
                        <div className="api-action">{r.action}</div>
                      </td>
                      <td>
                        <DirBadge dir={actionDir(r.action)} />
                      </td>
                      <td className="num">{fmtN(r.calls)}</td>
                      <td>
                        <div className="gauge">
                          <div className="bar">
                            <div className="fill" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="pct" style={{ color }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="num">
                        <span className={`ms ${msClass(r.avgResponseTime)}`}>
                          {r.avgResponseTime == null ? '—' : `${fmtN(r.avgResponseTime)} ms`}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StatusBadge
                            status={uiStatus(r.lastStatus, r.lastStatusCode, r.lastResponseTime)}
                            statusCode={r.lastStatusCode}
                            label=""
                          />
                          <span className="lastcall" title={absTime(r.lastUsed)}>
                            {relTime(r.lastUsed, now)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {byOwner.length > 0 && (
        <div className="catgroup">
          <div className="panel-h" style={{ border: 0, padding: '12px 2px 10px' }}>
            <span className="t">Par owner</span>
            <span className="s">{byOwner.length} owners actifs · cliquez pour filtrer le journal</span>
          </div>
          <table className="api-table">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Owner</th>
                <th className="num">Appels</th>
                <th className="num">Échecs</th>
                <th className="num">Retries</th>
                <th className="num">Temps moy.</th>
                <th>Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {byOwner.map((o: LogApiRuOwnerStat) => (
                <tr
                  key={o.ownerId}
                  className={o.errors > 0 ? 'degraded' : ''}
                  onClick={() => onSelectOwner(o.ownerId)}
                >
                  <td>
                    <div className="api-name">👤 {o.ownerName}</div>
                    <div className="api-action">{o.ownerId}</div>
                  </td>
                  <td className="num">{fmtN(o.calls)}</td>
                  <td className="num" style={{ color: o.errors ? 'var(--lru-error)' : undefined }}>
                    {fmtN(o.errors)}
                  </td>
                  <td className="num" style={{ color: o.warnings ? 'var(--lru-warning)' : undefined }}>
                    {fmtN(o.warnings)}
                  </td>
                  <td className="num">
                    <span className={`ms ${msClass(o.avgResponseTime)}`}>
                      {o.avgResponseTime == null ? '—' : `${fmtN(o.avgResponseTime)} ms`}
                    </span>
                  </td>
                  <td>
                    <span className="lastcall" title={absTime(o.lastUsed)}>
                      {relTime(o.lastUsed, now)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
