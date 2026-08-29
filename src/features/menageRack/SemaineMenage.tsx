/**
 * Semaine ménage — « quel jour va déborder ? » (spec « desktop mobile
 * whatsapp », écran 1). Villas × 7 jours, un chip par ménage avec ses crédits ;
 * l'en-tête de colonne compare la charge (à faire + assigné) à la capacité de
 * l'équipe, colonne en tension surlignée.
 *
 * Mêmes mécaniques que Rack / Répartition : scope owner, auto-sélection
 * mono-listing, appels par listing (6 en //) fusionnés, scroll pattern maison
 * (colonne villas sticky, wheel non-passif) — 7 jours tiennent sans scroll sur
 * desktop large.
 *
 * Source : GET /tasks/menage/semaine (srv-fulltask) — 404 = pas déployé.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { listingsService } from '../../services/listingsService';
import { getMenageSemaine } from '../../services/fulltaskApi';
import { minutesLabel } from './repartitionLogic';
import {
  buildSemaineGrid,
  dayHeaderLabel,
  dayLoadLabel,
  resolveSemaineFetch,
  weekTitle,
  type SemaineCell,
  type SemaineData,
  type SemaineFetchResult,
  type SemaineState,
} from './semaineLogic';
import { is404, pooled, shiftDay, toIsoDay, type ListingOption } from './menageShared';
import './menageSemaine.css';

const POLL_MS = 120_000;
const FETCH_CONCURRENCY = 6;

export function SemaineMenage() {
  const navigate = useNavigate();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [start, setStart] = useState<string>(() => toIsoDay(new Date()));
  const [listings, setListings] = useState<ListingOption[] | null>(null);
  const [listingFilter, setListingFilter] = useState<string>('all');
  const [result, setResult] = useState<SemaineState | null>(null);
  const [loading, setLoading] = useState(true);

  const isCurrentWeek = start === toIsoDay(new Date());
  const today = toIsoDay(new Date());

  /* ── Listings du scope (même mécanique que le Rack) ── */
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
        if (items.length === 1) setListingFilter(items[0].id);
      } catch {
        if (!cancelled) setListings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopeFetchReady, requestOwnerId]);

  /* ── Chargement ── */
  const load = useCallback(
    async (silent = false) => {
      if (listings == null) return;
      if (!silent) setLoading(true);
      const targets: ListingOption[] =
        listingFilter !== 'all'
          ? [listings.find((l) => l.id === listingFilter) ?? { id: listingFilter, name: '' }]
          : listings;
      if (targets.length === 0) {
        setResult({ state: 'empty' });
        setLoading(false);
        return;
      }
      const results: SemaineFetchResult[] = await pooled(targets, FETCH_CONCURRENCY, async (l) => {
        try {
          const res = await getMenageSemaine(l.id, start, requestOwnerId || undefined);
          if (!res?.success || !res.data) return { ok: false as const, notFound: false };
          return { ok: true as const, data: res.data as SemaineData };
        } catch (err) {
          return { ok: false as const, notFound: is404(err) };
        }
      });
      setResult(resolveSemaineFetch(results));
      if (!silent) setLoading(false);
    },
    [listings, listingFilter, start, requestOwnerId],
  );

  useEffect(() => {
    if (!scopeFetchReady || listings == null) return;
    void load();
    if (!isCurrentWeek) return;
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [scopeFetchReady, listings, load, isCurrentWeek]);

  /* ── Scroll horizontal — pattern docs/scroll (wheel non-passif, capture) ── */
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

  const data = result?.state === 'ok' ? result.data : null;
  const grid = useMemo(
    () => (data ? buildSemaineGrid(data) : []),
    [data],
  );

  const listingOptions = useMemo<ListingOption[]>(
    () => (listings?.length ? [...listings].sort((a, b) => a.name.localeCompare(b.name)) : []),
    [listings],
  );

  return (
    <div className="rks">
      <div className="rks-app">
        <div className="rks-hd">
          <div>
            <p className="rks-cr">Ménage /</p>
            <h3>La semaine{data ? ` — ${weekTitle(data.days)}` : ''}</h3>
          </div>
          <span className="rks-rt">
            <button type="button" className="rks-lnk" onClick={() => navigate('/menage/rack')}>
              Rack
            </button>
            <button type="button" className="rks-lnk" onClick={() => navigate('/menage/repartition')}>
              Répartition
            </button>
            <button type="button" className="rks-btn" onClick={() => setStart((s) => shiftDay(s, -7))}>
              ◀
            </button>
            <button
              type="button"
              className={`rks-btn${isCurrentWeek ? ' on' : ''}`}
              onClick={() => setStart(toIsoDay(new Date()))}
            >
              Cette semaine
            </button>
            <button type="button" className="rks-btn" onClick={() => setStart((s) => shiftDay(s, 7))}>
              ▶
            </button>
            <select
              className="rks-select"
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
          </span>
        </div>

        <div className="rks-bd">
          {result?.state === 'unavailable' && (
            <div className="rks-warn">Disponible après la prochaine mise à jour.</div>
          )}
          {result?.state === 'error' && (
            <div className="rks-err">Impossible de charger la semaine.</div>
          )}

          {data && (
            <div className="rks-strip">
              <span className="rks-st gd">
                <b>{minutesLabel(data.totals.chargeMin)}</b>
                <span>de ménage</span>
              </span>
              <span className="rks-st">
                <b>{minutesLabel(data.totals.capacityMin)}</b>
                <span>capacité</span>
              </span>
              <span className={`rks-st${data.totals.tensionDays ? ' al' : ''}`}>
                <b>{data.totals.tensionDays}</b>
                <span>jour{data.totals.tensionDays > 1 ? 's' : ''} en tension</span>
              </span>
            </div>
          )}

          <div className="rks-wk">
            <div className="rks-scroll menage-rack-scroll" ref={scrollRef}>
              {loading && !data ? (
                <div className="rks-empty">Chargement de la semaine…</div>
              ) : result?.state === 'empty' ? (
                <div className="rks-empty">Aucune villa sur cette semaine.</div>
              ) : data ? (
                <div className="rks-grid">
                  <div className="hd rl">Villa</div>
                  {data.days.map((day) => (
                    <div
                      key={day.ymd}
                      className={`hd${day.tension ? ' tension' : day.ymd === today ? ' today' : ''}`}
                    >
                      <b>{dayHeaderLabel(day.ymd)}</b>
                      <span className="cr">{dayLoadLabel(day)}</span>
                      <span className="fdm">{day.fdmCount} FdM</span>
                    </div>
                  ))}
                  {grid.map((row) => (
                    <SemaineRow
                      key={row.villa.id}
                      row={row}
                      tensions={data.days.map((d) => d.tension)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rks-empty">—</div>
              )}
            </div>
          </div>

          <div className="rks-foot">
            <span>
              <i className="rks-sw" style={{ background: '#fff', border: '1.5px dashed var(--err)' }} /> à
              assigner
            </span>
            <span>
              <i
                className="rks-sw"
                style={{ background: 'var(--gold-tint)', border: '1px solid rgba(230,176,34,.4)' }}
              />{' '}
              assigné
            </span>
            <span>
              <i
                className="rks-sw"
                style={{ background: 'var(--ok-bg)', border: '1px solid rgba(10,143,94,.3)', opacity: 0.65 }}
              />{' '}
              fait
            </span>
            <span>
              <i
                className="rks-sw"
                style={{
                  background: 'repeating-linear-gradient(45deg, #f0eee8 0 4px, #e7e4dc 4px 8px)',
                }}
              />{' '}
              bloquée
            </span>
            <span>1 crédit = 1 minute de travail standard</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Une ligne de la grille ────────────────────────────────────────────── */

function SemaineRow({
  row,
  tensions,
}: {
  row: ReturnType<typeof buildSemaineGrid>[number];
  tensions: boolean[];
}) {
  if (row.blockedAll) {
    // Bloquée toute la semaine : une seule case sur 7 (façon doc, Villa 04).
    return (
      <>
        <div className="rl">{row.villa.title}</div>
        <div className="blocked" style={{ gridColumn: 'span 7', padding: 0 }}>
          <span className="rks-hs">bloquée — toute la semaine</span>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="rl">{row.villa.title}</div>
      {row.cells.map((cellData, i) => (
        <SemaineCellView
          key={`${row.villa.id}:${i}`}
          cell={cellData}
          tension={tensions[i] ?? false}
        />
      ))}
    </>
  );
}

function SemaineCellView({ cell, tension }: { cell: SemaineCell | null; tension: boolean }) {
  const cls = [cell?.blocked && !cell.menage ? 'blocked' : '', tension ? 'day-tension' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls || undefined}>
      {cell?.menage && (
        <span className={`rks-ch ${cell.menage.state}`} title={cell.menage.label}>
          {cell.menage.state === 'fait' ? `✓ ${cell.menage.label}` : cell.menage.label}
          <i>{cell.menage.creditsMin}</i>
        </span>
      )}
    </div>
  );
}

export default SemaineMenage;
