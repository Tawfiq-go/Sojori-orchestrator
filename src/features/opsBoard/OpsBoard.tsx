/**
 * OpsBoard — design Claude + données live Nommos (HK Mews + résas BD).
 * FdM assign / colonne « ménage en cours » : pas encore branchés.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import './opsBoard.css';
import { useOpsBoardLive } from './useOpsBoardLive';
import { useOpsBoardPortfolio } from './useOpsBoardPortfolio';
import type { OpsAlert, OpsUnit, OpsUnitSt } from './opsBoardMap';

type Cat = 's' | 'vs' | 'vc';

const CAT: Record<Cat, string> = {
  s: 'Suite signature',
  vs: 'Villa signature',
  vc: 'Villa confort',
};

const COLS: Array<[string, string, (u: OpsUnit) => boolean]> = [
  ['occ', 'Occupées', (u) => u.st === 'occ'],
  ['dirty', 'À nettoyer', (u) => u.st === 'dirty'],
  ['doing', 'Ménage en cours', (u) => u.st === 'doing'],
  ['insp', 'Nettoyée · inspection', (u) => u.st === 'cleaned' || u.st === 'insp'],
  ['ready', 'Prêtes ✓', (u) => u.st === 'ready'],
];

const STL: Record<OpsUnitSt, string> = {
  occ: 'Occupée',
  dirty: 'À nettoyer',
  doing: 'Ménage en cours',
  cleaned: 'Nettoyée — attente inspection',
  insp: 'Inspection en cours',
  ready: 'Inspectée · prête',
};

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function minsSince(t: number): string {
  const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id="opsBoardGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4CF5E" />
          <stop offset="52%" stopColor="#E6B022" />
          <stop offset="100%" stopColor="#B8881A" />
        </linearGradient>
      </defs>
      <circle
        cx="20"
        cy="20"
        r="17"
        stroke="url(#opsBoardGold)"
        strokeWidth="2"
        fill="none"
        strokeDasharray="3 4"
        opacity=".5"
      />
      <path
        d="M 12 26 Q 20 26 20 20 Q 20 14 28 14"
        stroke="url(#opsBoardGold)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="20" r="2.5" fill="#E6B022" />
    </svg>
  );
}

function AlertIcon({ k }: { k: OpsAlert['k'] }) {
  if (k === 'photo') return null;
  if (k === 'crit') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C4483A" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 5v9m0 4v.1" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B8881A" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="13" r="7" />
      <path d="M12 10v4M9 3h6" />
    </svg>
  );
}

export default function OpsBoard() {
  const portfolio = useOpsBoardPortfolio();
  const [mode, setMode] = useState<'multi' | 'single' | null>(null);
  const effectiveMode = mode ?? portfolio.defaultMode;
  const live = useOpsBoardLive(effectiveMode, 0, portfolio.ready);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(0);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const prevStRef = useRef<Record<string, string>>({});
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!portfolio.ready) return;
    setMode((prev) => {
      if (prev && portfolio.availableModes.includes(prev)) return prev;
      return portfolio.defaultMode;
    });
  }, [portfolio.ready, portfolio.defaultMode, portfolio.availableModes]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
      setTick((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Flash sur changement de statut room (refresh poll)
  useEffect(() => {
    const next: Record<string, string> = {};
    const changed: string[] = [];
    for (const u of live.units) {
      const key = `${u.st || ''}|${u.hs || ''}`;
      next[u.id] = key;
      if (prevStRef.current[u.id] && prevStRef.current[u.id] !== key) changed.push(u.id);
    }
    prevStRef.current = next;
    if (changed.length === 0) return;
    setFlashIds(new Set(changed));
    const t = window.setTimeout(() => setFlashIds(new Set()), 1500);
    return () => window.clearTimeout(t);
  }, [live.units]);

  const units = live.units;
  const arrivals = live.arrivals;
  const alerts = live.alerts;
  const active = useMemo(() => units.filter((u) => !u.hs), [units]);
  const hs = useMemo(() => units.filter((u) => u.hs), [units]);

  const { deps, recs, arrs, menDone, menTot, inspDone, inspTot, packDone } = live.stats;
  const arrsSafe = Math.max(arrs, 1);

  void tick;

  const refreshedLabel = live.refreshedAt
    ? `${pad(live.refreshedAt.getHours())}:${pad(live.refreshedAt.getMinutes())}:${pad(live.refreshedAt.getSeconds())}`
    : '—';

  return (
    <div className={`ops-board${effectiveMode === 'single' ? ' mode-single' : ''}`}>
      <div className="board" ref={boardRef}>
        <header className="hd">
          <span className="brand">
            <BrandMark />
          </span>
          <span className="hotel">{live.hotelName}</span>
          <span className="sep" />
          {portfolio.showToggle ? (
            <span className="mode-toggle" role="group" aria-label="Mode">
              <button
                type="button"
                className="btn"
                aria-pressed={effectiveMode === 'multi'}
                onClick={() => setMode('multi')}
              >
                Multi
              </button>
              <button
                type="button"
                className="btn"
                aria-pressed={effectiveMode === 'single'}
                onClick={() => setMode('single')}
              >
                Single
              </button>
            </span>
          ) : portfolio.ready ? (
            <span className="mode-pill">{effectiveMode === 'multi' ? 'Multi' : 'Single'}</span>
          ) : null}
          {portfolio.showToggle || portfolio.ready ? <span className="sep" /> : null}
          <span className="clock">
            <b>
              {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
            </b>
            <span>
              {DAYS[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()]}
            </span>
          </span>
          <span className="meteo">
            <span className="m">
              <b>{deps}</b> départs
            </span>
            <span className="m">
              <b>{recs}</b> recouches
            </span>
            <span className="m">
              <b>{arrs}</b> arrivées
            </span>
            <span className="m hs">
              <b>{hs.length}</b> unités HS
            </span>
          </span>
          <span className="gauges">
            <span className={`gauge ${menDone >= menTot ? 'done' : ''}`}>
              <span className="t">Ménages</span>
              <span className="bar">
                <i style={{ width: `${(menDone / Math.max(menTot, 1)) * 100}%` }} />
              </span>
              <span className="n">
                {menDone} / {menTot}
              </span>
            </span>
            <span className={`gauge ${inspDone >= inspTot ? 'done' : ''}`}>
              <span className="t">Inspectées</span>
              <span className="bar">
                <i style={{ width: `${(inspDone / Math.max(inspTot, 1)) * 100}%` }} />
              </span>
              <span className="n">
                {inspDone} / {inspTot}
              </span>
            </span>
            <span className="gauge">
              <span className="t">Packs</span>
              <span className="bar">
                <i style={{ width: `${(packDone / arrsSafe) * 100}%` }} />
              </span>
              <span className="n">
                {packDone} / {arrs}
              </span>
            </span>
          </span>
          <button
            type="button"
            className="btn"
            title={`Dernier refresh ${refreshedLabel}`}
            onClick={() => live.refresh()}
            disabled={live.loading}
          >
            {live.loading ? '…' : 'Rafraîchir'}
          </button>
          <button
            type="button"
            className="btn"
            aria-pressed={showTomorrow}
            onClick={() => setShowTomorrow((v) => !v)}
          >
            Demain
          </button>
        </header>

        {live.error ? (
          <div className="ops-board-banner err" role="alert">
            Impossible de charger le board : {live.error}
          </div>
        ) : null}
        {!live.error && live.loading && units.length === 0 ? (
          <div className="ops-board-banner">
            {effectiveMode === 'multi'
              ? 'Chargement Multi (rooms + résas du jour)…'
              : 'Chargement Single (listings owner + résas du jour)…'}
          </div>
        ) : null}

        <div className="body">
          <div className="main">
            <div className="kan">
              {COLS.map(([k, title, filter]) => {
                const list = active.filter(filter);
                return (
                  <div className={`col c-${k}`} key={k}>
                    <span className="ch">
                      <b>{title}</b>
                      <span className="n">{list.length}</span>
                    </span>
                    <div className="drop">
                      {list.map((u) => {
                        const st = u.st!;
                        return (
                          <div
                            key={u.id}
                            className={`rc ${st} ${flashIds.has(u.id) ? 'flash' : ''}`}
                            data-fid={u.id}
                          >
                            <span className="top">
                              <span className="num">{u.n}</span>
                              <span className={`cat ${u.cat}`}>{u.badge || CAT[u.cat]}</span>
                            </span>
                            <span className="st">
                              <span className="dot" />
                              {STL[st]}
                            </span>
                            {u.who ? (
                              <span className="who">
                                <span className="av">{u.who[0]}</span>
                                {u.who}
                                {u.since != null ? <span className="tm">{minsSince(u.since)}</span> : null}
                              </span>
                            ) : null}
                            {st === 'occ' ? (
                              <>
                                <span className="meta">
                                  <b>{u.guest}</b>
                                  {u.dep2 ? ` · ${u.dep2}` : ''}
                                </span>
                                {u.rec ? (
                                  <span className={`flag ${/faite/.test(u.rec) ? 'ok' : 'busy'}`}>{u.rec}</span>
                                ) : null}
                              </>
                            ) : null}
                            {st === 'dirty' ? (
                              <>
                                <span className="meta">
                                  {u.dep ? (
                                    <>
                                      Départ déclaré <b>{u.dep}</b>
                                    </>
                                  ) : (
                                    <>À nettoyer</>
                                  )}
                                </span>
                                {!u.assign ? <span className="flag crit">Non assigné</span> : null}
                              </>
                            ) : null}
                            {st === 'ready' ? (
                              <>
                                <span className="meta">
                                  Arrivée <b>{u.arr}</b>
                                </span>
                                <span className={`flag ${u.packdone ? 'ok' : 'warn'}`}>{u.pack}</span>
                              </>
                            ) : null}
                            {st === 'cleaned' ? (
                              <span className="meta">En attente d’inspection</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hsrow">
              <span className="t">Hors service · {hs.length}</span>
              {hs.map((u) => (
                <span className="hsu" key={u.id}>
                  <i>{u.hs === 'OutOfOrder' ? 'OOO' : 'OOS'}</i>
                  {u.n}
                  <span>· {u.why}</span>
                </span>
              ))}
            </div>
          </div>

          <aside className="rail">
            <section className="pan">
              <span className="ph">
                <b>Arrivées du jour</b>
                <span className="n">
                  {arrivals.filter((a) => a.here).length} / {arrs}
                </span>
              </span>
              {arrivals.length === 0 && !live.loading ? (
                <p className="legend">Aucune arrivée aujourd’hui pour ce listing.</p>
              ) : null}
              {arrivals.map((a) => (
                <div key={a.id} className={`arr ${a.here ? 'here' : ''}`}>
                  <span className="h">{a.h}</span>
                  <span className="g">
                    {a.g}
                    {a.here ? ' ✓' : ''}
                  </span>
                  <span className="pk">
                    <span
                      className={`flag ${a.pack === 'done' ? 'ok' : a.pack === 'prep' ? 'warn' : 'crit'}`}
                    >
                      {a.pack === 'done'
                        ? 'Pack livré ✓'
                        : a.pack === 'prep'
                          ? 'Pack en cours'
                          : 'Pack à préparer'}
                    </span>
                  </span>
                  <span className="r">
                    → <b>{a.room}</b>
                    {a.note ? ` · ${a.note}` : ''}
                  </span>
                </div>
              ))}
            </section>

            <section className="pan">
              <span className="ph">
                <b>Alertes</b>
                <span className="n">{alerts.length}</span>
              </span>
              {alerts.length === 0 && !live.loading ? (
                <p className="legend">Rien à signaler pour l’instant.</p>
              ) : null}
              {alerts.map((a) => (
                <div className="al" key={`${a.k}-${a.t}`}>
                  <span className={`ic ${a.k === 'photo' ? 'ph' : a.k}`}>
                    <AlertIcon k={a.k} />
                  </span>
                  <span>
                    <b>{a.t}</b>
                    <span>{a.s}</span>
                  </span>
                </div>
              ))}
            </section>

            {showTomorrow ? (
              <section className="pan tm-pan">
                <span className="ph">
                  <b>Demain — aperçu</b>
                </span>
                <p className="legend">Aperçu J+1 pas encore branché (même sources résas).</p>
              </section>
            ) : (
              <p className="legend">
                {effectiveMode === 'multi'
                  ? 'Multi · Nommos prioritaire : une carte = une room. Plus tard : un board par établissement Multi.'
                  : 'Single : tous les listings individuels du owner (Multi / Nommos exclus).'}{' '}
                Si conflit → priorité Multi. Rafraîchir manuel · dernier {refreshedLabel}.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
