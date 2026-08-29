/**
 * Répartition ménage — « le geste du matin » (spec Sojori Housekeeping,
 * écran 3, version crédits). V1 LECTURE SEULE : pas de drag & drop, pas
 * d'écriture — l'assignation se fait dans SM pour l'instant.
 *
 * Une colonne par femme de ménage (jauge de crédits « 195 / 300 », liste des
 * ménages, terminés estompés ✓) ; la colonne « À assigner » EN TÊTE de
 * lecture, sticky à gauche. Mêmes mécaniques que le Rack : scope owner,
 * auto-sélection mono-listing, appels par listing (6 en parallèle) fusionnés,
 * scroll horizontal pattern maison (wheel non-passif + scrollbar visible).
 *
 * Source : GET /tasks/menage/repartition (srv-fulltask) — 404 = pas déployé.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { listingsService } from '../../services/listingsService';
import { getMenageRepartition } from '../../services/fulltaskApi';
import {
  creditsLabel,
  gaugePct,
  minutesLabel,
  resolveRepartitionFetch,
  sortColumnTasks,
  sortRepartitionColumns,
  type RepartitionColumn,
  type RepartitionData,
  type RepartitionFetchResult,
  type RepartitionState,
} from './repartitionLogic';
import { dayTitle, is404, pooled, shiftDay, toIsoDay, type ListingOption } from './menageShared';
import './menageRepartition.css';

const POLL_MS = 60_000;
const FETCH_CONCURRENCY = 6;

export function RepartitionMenage() {
  const navigate = useNavigate();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [date, setDate] = useState<string>(() => toIsoDay(new Date()));
  const [listings, setListings] = useState<ListingOption[] | null>(null);
  const [listingFilter, setListingFilter] = useState<string>('all');
  const [result, setResult] = useState<RepartitionState | null>(null);
  const [loading, setLoading] = useState(true);

  const isToday = date === toIsoDay(new Date());

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
      const results: RepartitionFetchResult[] = await pooled(
        targets,
        FETCH_CONCURRENCY,
        async (l) => {
          try {
            const res = await getMenageRepartition(l.id, date, requestOwnerId || undefined);
            if (!res?.success || !res.data) return { ok: false as const, notFound: false };
            return { ok: true as const, data: res.data as RepartitionData };
          } catch (err) {
            return { ok: false as const, notFound: is404(err) };
          }
        },
      );
      setResult(resolveRepartitionFetch(results));
      if (!silent) setLoading(false);
    },
    [listings, listingFilter, date, requestOwnerId],
  );

  useEffect(() => {
    if (!scopeFetchReady || listings == null) return;
    void load();
    if (!isToday) return;
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [scopeFetchReady, listings, load, isToday]);

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
  const columns = useMemo(() => (data ? sortRepartitionColumns(data.columns) : []), [data]);

  const listingOptions = useMemo<ListingOption[]>(
    () => (listings?.length ? [...listings].sort((a, b) => a.name.localeCompare(b.name)) : []),
    [listings],
  );

  return (
    <div className="rkr">
      <div className="rkr-app">
        <div className="rkr-hd">
          <div>
            <p className="rkr-cr">Ménage /</p>
            <h3>Répartition — {dayTitle(date)}</h3>
          </div>
          <span className="rkr-rt">
            <button type="button" className="rkr-lnk" onClick={() => navigate('/menage/rack')}>
              Rack
            </button>
            <button type="button" className="rkr-lnk" onClick={() => navigate('/menage/semaine')}>
              Semaine
            </button>
            <button type="button" className="rkr-lnk" onClick={() => navigate('/menage/equipe')}>
              Équipe
            </button>
            <button type="button" className="rkr-btn" onClick={() => setDate((d) => shiftDay(d, -1))}>
              ◀
            </button>
            <button
              type="button"
              className={`rkr-btn${isToday ? ' on' : ''}`}
              onClick={() => setDate(toIsoDay(new Date()))}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              className={`rkr-btn${date === shiftDay(toIsoDay(new Date()), 1) ? ' on' : ''}`}
              onClick={() => setDate(shiftDay(toIsoDay(new Date()), 1))}
            >
              Demain
            </button>
            <button type="button" className="rkr-btn" onClick={() => setDate((d) => shiftDay(d, 1))}>
              ▶
            </button>
            <select
              className="rkr-select"
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

        <div className="rkr-bd">
          {result?.state === 'unavailable' && (
            <div className="rkr-warn">Disponible après la prochaine mise à jour.</div>
          )}
          {result?.state === 'error' && (
            <div className="rkr-err">Impossible de charger la répartition de la journée.</div>
          )}

          {data && (
            <div className="rkr-strip">
              <span className={`rkr-st${data.totals.unassignedMin > 0 ? ' al' : ''}`}>
                <b>{minutesLabel(data.totals.unassignedMin)}</b>
                <span>à assigner</span>
              </span>
              <span className="rkr-st gd">
                <b>{minutesLabel(data.totals.assignedMin)}</b>
                <span>assigné</span>
              </span>
              <span className="rkr-st ok">
                <b>{minutesLabel(data.totals.doneMin)}</b>
                <span>fait</span>
              </span>
            </div>
          )}

          <div className="rkr-board">
            <div className="rkr-scroll menage-rack-scroll" ref={scrollRef}>
              {loading && !data ? (
                <div className="rkr-empty">Chargement de la répartition…</div>
              ) : result?.state === 'empty' ? (
                <div className="rkr-empty">Aucun ménage à répartir ce jour-là.</div>
              ) : data ? (
                <div className="rkr-cols">
                  <UnassignedColumn data={data} />
                  {columns.map((col) => (
                    <StaffColumn key={col.id} col={col} />
                  ))}
                </div>
              ) : (
                <div className="rkr-empty">—</div>
              )}
            </div>
          </div>

          <div className="rkr-foot">
            <span className="rkr-note">V1 lecture seule — l'assignation se fait dans SM.</span>
            <button
              type="button"
              className="rkr-btn pri"
              disabled
              title="L'assignation se fait dans SM pour l'instant"
            >
              Envoyer sur WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Colonne « À assigner » — en tête de lecture, sticky ── */

function UnassignedColumn({ data }: { data: RepartitionData }) {
  const total = data.unassigned.reduce((sum, u) => sum + (u.durationMin || 0), 0);
  return (
    <div className="rkr-col unassigned">
      <div className="rkr-colhd">
        <span className="nm">À assigner</span>
        <span className={`cred${total > 0 ? ' over' : ''}`}>
          <b>{minutesLabel(total)}</b>
          <span>
            {data.unassigned.length} ménage{data.unassigned.length > 1 ? 's' : ''}
          </span>
        </span>
      </div>
      <div className="rkr-tasks">
        {data.unassigned.length === 0 ? (
          <span className="rkr-none">Tout est assigné ✓</span>
        ) : (
          data.unassigned.map((u) => (
            <div key={u.id} className="rkr-task">
              <span className="r1">
                {u.roomName}
                <span className="dur">{minutesLabel(u.durationMin)}</span>
              </span>
              <span className="r2">{u.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Colonne d'une femme de ménage ── */

function StaffColumn({ col }: { col: RepartitionColumn }) {
  const tasks = sortColumnTasks(col.tasks);
  return (
    <div className="rkr-col">
      <div className="rkr-colhd">
        <span className="nm">
          {col.name}
          {!col.worksToday && <span className="off">(repos)</span>}
        </span>
        <span className={`cred${col.overCapacity ? ' over' : ''}`}>
          <b>{creditsLabel(col.assignedMin, col.capacityMin)}</b>
          <span>crédits</span>
        </span>
        <span className={`rkr-gauge${col.overCapacity ? ' over' : ''}`}>
          <i style={{ width: `${gaugePct(col.assignedMin, col.capacityMin)}%` }} />
        </span>
      </div>
      <div className="rkr-tasks">
        {tasks.length === 0 ? (
          <span className="rkr-none">Aucun ménage</span>
        ) : (
          tasks.map((t, i) => (
            <div key={`${t.roomName}:${t.hm ?? ''}:${i}`} className={`rkr-task ${t.status}`}>
              <span className="r1">
                {t.status === 'done' ? '✓ ' : ''}
                {t.roomName}
                <span className="dur">{minutesLabel(t.durationMin)}</span>
              </span>
              <span className="r2">
                {t.label}
                {t.hm ? ` · ${t.hm.replace(':', 'h')}` : ''}
                {t.status === 'doing' ? ' · en cours' : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RepartitionMenage;
