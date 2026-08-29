/**
 * Rack ménage — « la journée » (spec Sojori Housekeeping, écran 1).
 *
 * L'écran que la gouvernante garde ouvert : une ligne par bien, l'axe horaire,
 * la fenêtre départ→arrivée en hachuré, le bloc de ménage posé dedans, le trait
 * rouge « maintenant ». Le retard est géométrique : le bloc dépasse la fenêtre.
 *
 * Source de données : GET /plans/day-plan (srv-fulltask) via getDayPlan —
 * chains (fenêtres + durée ménage) et steps departure/arrival/cleaning.
 * Toute la logique de mapping vit dans rackLogic.ts (pure, testée node:test).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { getDayPlan, type DayPlanResponse } from '../../services/fulltaskApi';
import {
  buildRackModel,
  hmLabel,
  hoursOf,
  pctOf,
  type RackRow,
} from './rackLogic';
import './menageRack.css';

/* ── Dates ─────────────────────────────────────────────────────────────── */

function toIsoDay(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function shiftDay(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toIsoDay(d);
}

function dayTitle(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

const POLL_MS = 60_000;
const TICK_MS = 30_000;

/* ── Composant ─────────────────────────────────────────────────────────── */

export function RackMenage() {
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [date, setDate] = useState<string>(() => toIsoDay(new Date()));
  const [plan, setPlan] = useState<DayPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingFilter, setListingFilter] = useState<string>('all');
  const [nowMin, setNowMin] = useState<number>(() => nowMinutes());

  const isToday = date === toIsoDay(new Date());

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await getDayPlan(date, requestOwnerId || undefined);
        setPlan(res);
        setError(null);
      } catch {
        if (!silent) setError('Impossible de charger le plan de la journée.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [date, requestOwnerId],
  );

  // Chargement + rafraîchissement « en direct » (aujourd'hui seulement).
  useEffect(() => {
    if (!scopeFetchReady) return;
    void load();
    if (!isToday) return;
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [scopeFetchReady, load, isToday]);

  // Trait « maintenant » : tick 30 s.
  useEffect(() => {
    if (!isToday) return;
    const id = window.setInterval(() => setNowMin(nowMinutes()), TICK_MS);
    return () => window.clearInterval(id);
  }, [isToday]);

  const model = useMemo(
    () => buildRackModel(plan ?? { steps: [], chains: [] }, isToday ? nowMin : null),
    [plan, isToday, nowMin],
  );

  const listingOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of model.rows) {
      if (!seen.has(row.listingId)) seen.set(row.listingId, row.listingName);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [model.rows]);

  const rows = useMemo(
    () => (listingFilter === 'all' ? model.rows : model.rows.filter((r) => r.listingId === listingFilter)),
    [model.rows, listingFilter],
  );

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
              {listingOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </span>
        </div>

        <div className="rkm-bd">
          {error && <div className="rkm-err">{error}</div>}

          <div className="rkm-strip">
            <span className="rkm-st">
              <b>{counters.aFaire}</b>
              <span>à faire</span>
            </span>
            <span className="rkm-st gd">
              <b>{counters.enCours}</b>
              <span>en cours</span>
            </span>
            <span className="rkm-st ok">
              <b>{counters.termines}</b>
              <span>terminés</span>
            </span>
            <span className={`rkm-st${counters.enRetard ? ' al' : ''}`}>
              <b>{counters.enRetard}</b>
              <span>en retard</span>
            </span>
            <span className="rkm-st">
              <b>
                {counters.departs}/{counters.arrivees}
              </b>
              <span>départs / arrivées</span>
            </span>
          </div>

          <div className="rkm-rack">
            <div className="rkm-rkhd">
              <span className="rkm-lft">Bien · fenêtre</span>
              <span className="rkm-hours">
                {ticks.map((t) => (
                  <i key={`l${t.min}`} style={{ left: `${t.pct}%` }} />
                ))}
                {ticks.map((t) => (
                  <span key={`t${t.min}`} style={{ left: `${t.pct}%` }}>
                    {t.label}
                  </span>
                ))}
                {nowPct != null && nowPct > 0 && nowPct < 100 && (
                  <span className={`rkm-now${nowPct < 12 ? ' flip' : ''}`} style={{ left: `${nowPct}%` }}>
                    <b>{hmLabel(nowMin)}</b>
                  </span>
                )}
              </span>
            </div>

            {loading && !plan ? (
              <div className="rkm-empty">Chargement du rack…</div>
            ) : rows.length === 0 ? (
              <div className="rkm-empty">Aucun mouvement ni ménage ce jour-là.</div>
            ) : (
              rows.map((row) => <RackRowView key={row.listingId} row={row} axis={axis} />)
            )}
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

function RackRowView({ row, axis }: { row: RackRow; axis: { startMin: number; endMin: number } }) {
  const b = row.block;
  const blkLeft = b ? pctOf(b.startMin, axis) : 0;
  const blkWidth = b ? Math.max(1.2, pctOf(b.endMin, axis) - blkLeft) : 0;
  const blkClass = b ? (b.unassigned && b.status !== 'doing' ? 'none' : b.status) : '';
  const icon =
    b == null ? '' : b.status === 'done' ? '✓' : b.status === 'doing' ? '●' : b.status === 'late' ? '⚠' : b.unassigned ? '＋' : '○';
  const who = b ? (b.staffName ?? 'à assigner') : '';

  return (
    <div className={`rkm-row${row.critical ? ' crit' : ''}`}>
      <span className="rkm-lb">
        <span className="v">
          {row.listingName}
          {row.critical && (
            <span className="rkm-pill err">{b?.unassigned ? 'personne' : 'serré'}</span>
          )}
        </span>
        <span className="w">{row.subtitle}</span>
      </span>
      <span className="rkm-tl">
        {row.window && (
          <span
            className={`win${row.window.tight ? ' tight' : ''}`}
            style={{
              left: `${pctOf(row.window.startMin, axis)}%`,
              width: `${pctOf(row.window.endMin, axis) - pctOf(row.window.startMin, axis)}%`,
            }}
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
        {b && (
          <span
            className={`rkm-blk ${blkClass}`}
            style={{ left: `${blkLeft}%`, width: `${blkWidth}%` }}
            title={`${who} · ${b.taskLabel} · ${b.statusLabel} (${hmLabel(b.startMin)} → ${hmLabel(b.endMin)})`}
          >
            {icon}
            <span className="lbl">
              <b>{who}</b> · {b.taskLabel.toLowerCase()}
              {b.status !== 'plan' ? ` · ${b.statusLabel}` : ''}
            </span>
          </span>
        )}
      </span>
    </div>
  );
}

export default RackMenage;
