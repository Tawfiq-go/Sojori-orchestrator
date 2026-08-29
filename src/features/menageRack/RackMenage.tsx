/**
 * Rack ménage — « la journée » (spec Sojori Housekeeping, écran 1).
 *
 * L'écran que la gouvernante garde ouvert : une ligne par chambre/villa, l'axe
 * horaire, la fenêtre départ→arrivée en hachuré, le bloc de ménage posé dedans,
 * le trait rouge « maintenant ». Le retard est géométrique : le bloc dépasse la
 * fenêtre.
 *
 * Sources de données :
 *  1. GET /tasks/menage/rack (srv-fulltask, dédié hôtel Mews/NOMMOS) — un bien
 *     précis choisi, ou « Tous les biens » = un appel par listing (6 en //).
 *  2. REPLI : GET /plans/day-plan (orchestration) quand l'endpoint rack n'est
 *     pas déployé (404) ou qu'aucun listing n'est connu — bandeau « données
 *     limitées ».
 * Toute la logique de mapping vit dans rackLogic.ts (pure, testée node:test).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { listingsService } from '../../services/listingsService';
import {
  getDayPlan,
  getMenageRack,
  type DayPlanResponse,
  type MenageRackRow,
} from '../../services/fulltaskApi';
import {
  buildRackModel,
  buildRackModelFromEndpoint,
  hmLabel,
  hoursOf,
  pctOf,
  primaryBlock,
  railMinWidthPx,
  rowBadge,
  type RackAxis,
  type RackRow,
} from './rackLogic';
import {
  dayTitle,
  is404,
  nowMinutes,
  pooled,
  shiftDay,
  toIsoDay,
  type ListingOption,
} from './menageShared';
import './menageRack.css';

const POLL_MS = 60_000;
const TICK_MS = 30_000;
const RACK_FETCH_CONCURRENCY = 6;

type RackSource = 'rack' | 'dayplan' | 'dayplan-fallback';

/* ── Composant ─────────────────────────────────────────────────────────── */

export function RackMenage() {
  const navigate = useNavigate();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [date, setDate] = useState<string>(() => toIsoDay(new Date()));
  const [listings, setListings] = useState<ListingOption[] | null>(null);
  const [listingFilter, setListingFilter] = useState<string>('all');
  const [rackRows, setRackRows] = useState<MenageRackRow[] | null>(null);
  const [plan, setPlan] = useState<DayPlanResponse | null>(null);
  const [source, setSource] = useState<RackSource>('dayplan');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState<number>(() => nowMinutes());

  const isToday = date === toIsoDay(new Date());

  /* ── Listings du scope (sélecteur + cibles endpoint rack) ── */
  useEffect(() => {
    if (!scopeFetchReady) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listingsService.getListings({
          page: 0,
          limit: 500,
          compact: true,
          useActiveFilter: true,
          active: true,
          filterOwnerId: requestOwnerId || undefined,
        });
        if (cancelled) return;
        const items = (res?.data?.items || [])
          .map((l: { id?: string; _id?: string; name?: string }) => ({
            id: String(l.id || l._id || ''),
            name: String(l.name || l.id || ''),
          }))
          .filter((l: ListingOption) => l.id);
        setListings(items);
        // Owner mono-listing (cas Ali/NOMMOS) : auto-sélection du bien.
        if (items.length === 1) setListingFilter(items[0].id);
      } catch {
        if (!cancelled) setListings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopeFetchReady, requestOwnerId]);

  /* ── Chargement des données ── */
  const load = useCallback(
    async (silent = false) => {
      if (listings == null) return; // attend la liste des biens
      if (!silent) setLoading(true);

      const targets: ListingOption[] =
        listingFilter !== 'all'
          ? [listings.find((l) => l.id === listingFilter) ?? { id: listingFilter, name: '' }]
          : listings;

      try {
        if (targets.length >= 1) {
          // Endpoint rack dédié — un appel par listing, 6 en parallèle max.
          const results = await pooled(targets, RACK_FETCH_CONCURRENCY, async (l) => {
            try {
              const res = await getMenageRack(l.id, date, requestOwnerId || undefined);
              return { ok: true as const, listing: l, rows: res?.data?.rows ?? [] };
            } catch (err) {
              return { ok: false as const, listing: l, notFound: is404(err) };
            }
          });
          const successes = results.filter((r) => r.ok);
          if (successes.length > 0) {
            const multi = targets.length > 1;
            const merged: MenageRackRow[] = successes.flatMap((r) =>
              r.rows.map((row) => ({
                ...row,
                id: `${r.listing.id}:${row.id}`,
                roomName:
                  multi && r.listing.name ? `${r.listing.name} — ${row.roomName}` : row.roomName,
              })),
            );
            setRackRows(merged);
            setSource('rack');
            setError(null);
            return;
          }
          if (results.every((r) => !r.ok && r.notFound)) {
            // Endpoint pas encore déployé → repli day-plan, bandeau « données limitées ».
            const res = await getDayPlan(date, requestOwnerId || undefined);
            setPlan(res);
            setSource('dayplan-fallback');
            setError(null);
            return;
          }
          throw new Error('rack fetch failed');
        }
        // Aucun listing connu : day-plan direct.
        const res = await getDayPlan(date, requestOwnerId || undefined);
        setPlan(res);
        setSource('dayplan');
        setError(null);
      } catch {
        if (!silent) setError('Impossible de charger le plan de la journée.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [listings, listingFilter, date, requestOwnerId],
  );

  // Chargement + rafraîchissement « en direct » (aujourd'hui seulement).
  useEffect(() => {
    if (!scopeFetchReady || listings == null) return;
    void load();
    if (!isToday) return;
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [scopeFetchReady, listings, load, isToday]);

  // Trait « maintenant » : tick 30 s.
  useEffect(() => {
    if (!isToday) return;
    const id = window.setInterval(() => setNowMin(nowMinutes()), TICK_MS);
    return () => window.clearInterval(id);
  }, [isToday]);

  /* Scroll horizontal de la timeline — pattern docs/scroll/README.md adapté en
     version « row » : listener wheel NON-PASSIF en capture sur le conteneur,
     qui consomme le geste tant qu'il peut défiler (indispensable Mac/React 19 ;
     couvre aussi molette verticale + Shift et trackpads récalcitrants). */
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      let dx = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (dx === 0) return;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dx *= 16;
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) dx *= el.clientWidth;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      const canRight = dx > 0 && el.scrollLeft < max - 1;
      const canLeft = dx < 0 && el.scrollLeft > 0;
      if (canRight || canLeft) {
        el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + dx));
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  const model = useMemo(() => {
    const now = isToday ? nowMin : null;
    if (source === 'rack' && rackRows) return buildRackModelFromEndpoint(rackRows, now);
    return buildRackModel(plan ?? { steps: [], chains: [] }, now);
  }, [source, rackRows, plan, isToday, nowMin]);

  const listingOptions = useMemo<ListingOption[]>(() => {
    if (listings?.length) return [...listings].sort((a, b) => a.name.localeCompare(b.name));
    // Repli : biens présents dans le day-plan.
    const seen = new Map<string, string>();
    for (const row of model.rows) {
      if (!seen.has(row.listingId)) seen.set(row.listingId, row.listingName);
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [listings, model.rows]);

  const rows = useMemo(() => {
    if (listingFilter === 'all' || source === 'rack') return model.rows;
    return model.rows.filter((r) => r.listingId === listingFilter);
  }, [model.rows, listingFilter, source]);

  const { axis, counters } = model;
  const ticks = hoursOf(axis);
  const nowPct = isToday ? pctOf(nowMin, axis) : null;

  return (
    <div className="rkm">
      <div className="rkm-app">
        <div className="rkm-hd">
          <div>
            <p className="rkm-cr">Ménage /</p>
            <h3>Le rack — {dayTitle(date)}</h3>
          </div>
          <span className="rkm-rt">
            <button type="button" className="rkm-lnk" onClick={() => navigate('/menage/semaine')}>
              Semaine
            </button>
            <button type="button" className="rkm-lnk" onClick={() => navigate('/menage/equipe')}>
              Équipe
            </button>
            {isToday && (
              <span className="rkm-live">
                <i />
                en direct
              </span>
            )}
            <button type="button" className="rkm-btn" onClick={() => setDate((d) => shiftDay(d, -1))}>
              ◀
            </button>
            <button
              type="button"
              className={`rkm-btn${isToday ? ' on' : ''}`}
              onClick={() => setDate(toIsoDay(new Date()))}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              className={`rkm-btn${date === shiftDay(toIsoDay(new Date()), 1) ? ' on' : ''}`}
              onClick={() => setDate(shiftDay(toIsoDay(new Date()), 1))}
            >
              Demain
            </button>
            <button type="button" className="rkm-btn" onClick={() => setDate((d) => shiftDay(d, 1))}>
              ▶
            </button>
            <select
              className="rkm-select"
              value={listingFilter}
              onChange={(e) => setListingFilter(e.target.value)}
              aria-label="Filtrer par bien"
            >
              <option value="all">Tous les biens</option>
              {listingOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rkm-btn pri"
              title="Répartition du jour — colonnes par femme de ménage"
              onClick={() => navigate('/menage/repartition')}
            >
              Répartir
            </button>
          </span>
        </div>

        <div className="rkm-bd">
          {error && <div className="rkm-err">{error}</div>}
          {source === 'dayplan-fallback' && (
            <div className="rkm-warn">
              Données limitées — le service rack ménage n'est pas encore disponible, affichage
              depuis le plan d'orchestration.
            </div>
          )}

          <div className="rkm-strip">
            <span className="rkm-st ok">
              <b>{counters.termines}</b>
              <span>terminés</span>
            </span>
            <span className="rkm-st gd">
              <b>{counters.enCours}</b>
              <span>en cours</span>
            </span>
            <span className="rkm-st">
              <b>{counters.aFaire}</b>
              <span>à venir</span>
            </span>
            <span className={`rkm-st${counters.sansPersonne ? ' al' : ''}`}>
              <b>{counters.sansPersonne}</b>
              <span>sans personne</span>
            </span>
            <span className={`rkm-st${counters.fenetresEnDanger ? ' al' : ''}`}>
              <b>{counters.fenetresEnDanger}</b>
              <span>{counters.fenetresEnDanger > 1 ? 'fenêtres en danger' : 'fenêtre en danger'}</span>
            </span>
            <span className="rkm-st">
              <b>
                {counters.departs}/{counters.arrivees}
              </b>
              <span>départs / arrivées</span>
            </span>
          </div>

          <div className="rkm-rack">
            <div className="rkm-scroll menage-rack-scroll" ref={scrollRef}>
              <div className="rkm-rail" style={{ minWidth: `${railMinWidthPx(axis)}px` }}>
                {/* Calques du rail : grille des heures (sous les blocs) et trait
                    « maintenant » (au-dessus) — positions en % du rail, donc
                    alignés avec fenêtres et blocs pendant le scroll. */}
                <span className="rkm-grid-overlay" aria-hidden="true">
                  {ticks.map((t) => (
                    <i key={`l${t.min}`} style={{ left: `${t.pct}%` }} />
                  ))}
                </span>
                {nowPct != null && nowPct > 0 && nowPct < 100 && (
                  <span className="rkm-now-overlay" aria-hidden="true">
                    <span className="rkm-nowline" style={{ left: `${nowPct}%` }} />
                  </span>
                )}

                <div className="rkm-rkhd">
                  <span className="rkm-lft">Bien · fenêtre</span>
                  <span className="rkm-hours">
                    {ticks.map((t) => (
                      <span key={`t${t.min}`} style={{ left: `${t.pct}%` }}>
                        {t.label}
                      </span>
                    ))}
                    {nowPct != null && nowPct > 0 && nowPct < 100 && (
                      <span
                        className={`rkm-nowbadge${nowPct < 12 ? ' flip' : ''}`}
                        style={{ left: `${nowPct}%` }}
                      >
                        {hmLabel(nowMin)}
                      </span>
                    )}
                  </span>
                </div>

                {loading && rows.length === 0 ? (
                  <div className="rkm-empty">Chargement du rack…</div>
                ) : rows.length === 0 ? (
                  <div className="rkm-empty">Aucun mouvement ni ménage ce jour-là.</div>
                ) : (
                  rows.map((row) => <RackRowView key={row.listingId} row={row} axis={axis} />)
                )}
              </div>
            </div>
          </div>

          <div className="rkm-lgd">
            <span>
              <i className="rkm-sw" style={{ background: 'var(--bg2)', border: '1px dashed var(--bd2)' }} /> à
              faire
            </span>
            <span>
              <i className="rkm-sw" style={{ background: 'var(--gold-tint)', borderColor: 'var(--gold)' }} /> en
              cours
            </span>
            <span>
              <i
                className="rkm-sw"
                style={{ background: 'var(--ok-bg)', borderColor: 'rgba(10,143,94,.35)' }}
              />{' '}
              terminé
            </span>
            <span>
              <i
                className="rkm-sw"
                style={{ background: 'var(--err-bg)', borderColor: 'rgba(200,30,30,.5)' }}
              />{' '}
              en retard — le bloc dépasse la fenêtre
            </span>
            <span>
              <i
                className="rkm-sw"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, rgba(230,176,34,.1) 0 4px, rgba(230,176,34,.2) 4px 8px)',
                  border: '1px dashed rgba(184,136,26,.6)',
                }}
              />{' '}
              fenêtre départ → arrivée
            </span>
            {isToday && <span>▌ trait rouge = maintenant</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Une ligne du rack ─────────────────────────────────────────────────── */

function RackRowView({ row, axis }: { row: RackRow; axis: RackAxis }) {
  const primary = primaryBlock(row);
  const badge = rowBadge(row);
  const winLeft = row.window ? (row.window.openStart ? 0 : pctOf(row.window.startMin, axis)) : 0;
  const winRight = row.window ? (row.window.openEnd ? 100 : pctOf(row.window.endMin, axis)) : 0;
  // Pastille façon doc : « personne » prime sur « serré ».
  const noOnePlanned = row.window != null && row.blocks.length === 0;
  const pill =
    noOnePlanned || (primary && primary.unassigned && primary.status !== 'done')
      ? 'personne'
      : row.window?.tight && primary != null && primary.status !== 'done'
        ? 'serré'
        : null;

  return (
    <div className={`rkm-row${row.critical ? ' crit' : ''}`}>
      <span className="rkm-lb">
        <span className="v">
          {row.listingName}
          {pill && <span className="rkm-pill err">{pill}</span>}
        </span>
        <span className="w">{row.subtitle}</span>
        {badge && (
          <span
            className={`sb sb-${primary && primary.unassigned && primary.status !== 'done' ? 'late' : (primary?.status ?? 'plan')}`}
          >
            {badge.icon} <b>{badge.who}</b> · {badge.detail}
          </span>
        )}
      </span>
      <span className="rkm-tl">
        {row.window && (
          <span
            className={`win${row.window.tight ? ' tight' : ''}${row.window.openEnd ? ' open-end' : ''}${row.window.openStart ? ' open-start' : ''}`}
            style={{ left: `${winLeft}%`, width: `${winRight - winLeft}%` }}
          />
        )}
        {row.departure && (
          <span className="rkm-mk out" style={{ left: `${pctOf(row.departure.min, axis)}%` }}>
            <b>{row.departure.estimated ? '≈ départ' : 'départ'}</b>
          </span>
        )}
        {row.arrival && (
          <span className="rkm-mk in" style={{ left: `${pctOf(row.arrival.min, axis)}%` }}>
            <b>{row.arrival.estimated ? '≈ arrivée' : 'arrivée'}</b>
          </span>
        )}
        {row.blocks.map((b, i) => {
          const left = pctOf(b.startMin, axis);
          const width = Math.max(1.2, pctOf(b.endMin, axis) - left);
          const cls = b.unassigned && b.status !== 'doing' ? 'none' : b.status;
          const icon =
            b.status === 'done' ? '✓' : b.status === 'doing' ? '●' : b.status === 'late' ? '⚠' : b.unassigned ? '＋' : '○';
          const who = b.staffName ?? 'à assigner';
          const showLbl = i === row.blocks.length - 1;
          return (
            <span
              key={`${b.taskLabel}:${b.startMin}:${i}`}
              className={`rkm-blk ${cls}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${who} · ${b.taskLabel} · ${b.statusLabel} (${hmLabel(b.startMin)} → ${hmLabel(b.endMin)})`}
            >
              {icon}
              {showLbl && (
                <span className="lbl">
                  <b>{who}</b> · {b.taskLabel.toLowerCase()}
                  {b.status !== 'plan' ? ` · ${b.statusLabel}` : ''}
                </span>
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
}

export default RackMenage;
