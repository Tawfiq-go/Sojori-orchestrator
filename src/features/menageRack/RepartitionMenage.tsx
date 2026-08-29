/**
 * Répartition ménage — « le geste du matin » (spec Sojori Housekeeping,
 * écran 3, version crédits). ÉDITABLE : le TAP-TAP est le geste principal
 * (« je touche une villa → je touche une FdM ») — le drag & drop n'est qu'un
 * bonus desktop, jamais le geste premier (doctrine du doc).
 *
 * Écritures via POST /tasks/menage/repartition/action — brique savePlan de
 * SM : idempotence, tâche née à l'assignation, annulation motivée (mêmes
 * motifs que SM), notifications policy. Optimiste + rollback + toast du
 * message serveur tel quel (422 compris), refetch en fond après succès.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { listingsService } from '../../services/listingsService';
import {
  getMenageRepartition,
  postMenageRepartitionAction,
} from '../../services/fulltaskApi';
import {
  applyAssign,
  applyUnassign,
  creditsLabel,
  gaugePct,
  listingIdOfVilla,
  minutesLabel,
  REPARTITION_CANCEL_REASONS,
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

/** Villa sélectionnée (mode cible) — depuis « À assigner » ou une colonne. */
type Pick = { villaId: string; roomName: string; durationMin: number; fromFdmId: string | null };
type ReasonTarget = { villaId: string; roomName: string };
type Toast = { kind: 'ok' | 'err'; text: string };

export function RepartitionMenage() {
  const navigate = useNavigate();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [date, setDate] = useState<string>(() => toIsoDay(new Date()));
  const [listings, setListings] = useState<ListingOption[] | null>(null);
  const [listingFilter, setListingFilter] = useState<string>('all');
  const [result, setResult] = useState<RepartitionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<Pick | null>(null);
  const [reasonFor, setReasonFor] = useState<ReasonTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

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
    setPick(null);
    setReasonFor(null);
    if (!isToday) return;
    const id = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [scopeFetchReady, listings, load, isToday]);

  /* ── Échap : sortir du mode cible / fermer le menu motifs ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPick(null);
        setReasonFor(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Écritures : optimiste + rollback + toast serveur + refetch fond ── */
  const doPost = useCallback(
    async (
      villaId: string,
      fdmId: string,
      reason: string | undefined,
      optimistic: (data: RepartitionData) => RepartitionData | null,
    ) => {
      if (result?.state !== 'ok' || busy) return;
      const before = result.data;
      const next = optimistic(before);
      if (!next) {
        setPick(null);
        return;
      }
      setResult({ state: 'ok', data: next });
      setPick(null);
      setReasonFor(null);
      setBusy(true);
      try {
        const res = await postMenageRepartitionAction({
          listingId: listingIdOfVilla(villaId),
          ownerId: requestOwnerId || undefined,
          date,
          villaId,
          fdmId,
          ...(reason ? { reason } : {}),
        });
        if (res?.success) {
          showToast({ kind: 'ok', text: res.data?.message || 'Enregistré.' });
          void load(true); // refetch en fond — le serveur reste la vérité
        } else {
          setResult({ state: 'ok', data: before });
          showToast({ kind: 'err', text: res?.data?.message || res?.error || 'Action refusée.' });
        }
      } catch {
        setResult({ state: 'ok', data: before });
        showToast({ kind: 'err', text: "Erreur réseau — rien n'a été modifié." });
      } finally {
        setBusy(false);
      }
    },
    [result, busy, requestOwnerId, date, showToast, load],
  );

  const doAssign = useCallback(
    (villaId: string, fdmId: string) =>
      void doPost(villaId, fdmId, undefined, (d) => applyAssign(d, villaId, fdmId)),
    [doPost],
  );

  const doUnassign = useCallback(
    (villaId: string, reason: string) =>
      void doPost(villaId, 'unassign', reason, (d) => applyUnassign(d, villaId)),
    [doPost],
  );

  const data = result?.state === 'ok' ? result.data : null;
  const columns = useMemo(() => (data ? sortRepartitionColumns(data.columns) : []), [data]);

  const listingOptions = useMemo<ListingOption[]>(
    () => (listings?.length ? [...listings].sort((a, b) => a.name.localeCompare(b.name)) : []),
    [listings],
  );

  const togglePick = useCallback((p: Pick) => {
    setPick((cur) => (cur?.villaId === p.villaId ? null : p));
  }, []);

  /* Drop bonus : dataTransfer porte le villaId. */
  const onDropVilla = useCallback(
    (e: React.DragEvent, fdmId: string | 'unassign') => {
      e.preventDefault();
      const villaId = e.dataTransfer.getData('text/plain');
      if (!villaId || result?.state !== 'ok') return;
      if (fdmId === 'unassign') {
        const src = result.data.columns
          .flatMap((c) => c.tasks)
          .find((t) => t.villaId === villaId && t.status !== 'done');
        if (src) setReasonFor({ villaId, roomName: src.roomName });
        return;
      }
      doAssign(villaId, fdmId);
    },
    [result, doAssign],
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
              <span className="rkr-hint">
                {pick
                  ? `${pick.roomName} sélectionnée — touchez une FdM (Échap pour annuler)`
                  : 'Touchez une villa puis une FdM — ou glissez-déposez.'}
              </span>
            </div>
          )}

          <div className="rkr-board">
            <div className="rkr-scroll menage-rack-scroll">
              {loading && !data ? (
                <div className="rkr-empty">Chargement de la répartition…</div>
              ) : result?.state === 'empty' ? (
                <div className="rkr-empty">Aucun ménage à répartir ce jour-là.</div>
              ) : data ? (
                <div className="rkr-cols">
                  <UnassignedColumn
                    data={data}
                    pick={pick}
                    busy={busy}
                    onPick={togglePick}
                    onAskUnassign={(t) => setReasonFor(t)}
                    onDropVilla={onDropVilla}
                  />
                  {columns.map((col) => (
                    <StaffColumn
                      key={col.id}
                      col={col}
                      pick={pick}
                      busy={busy}
                      onPick={togglePick}
                      onAssign={doAssign}
                      onAskUnassign={(t) => setReasonFor(t)}
                      onDropVilla={onDropVilla}
                    />
                  ))}
                </div>
              ) : (
                <div className="rkr-empty">—</div>
              )}
            </div>
          </div>

          <div className="rkr-foot">
            <span className="rkr-note">
              Tap-tap : villa puis FdM. Annulation motivée — mêmes motifs que SM.
            </span>
            <button
              type="button"
              className="rkr-btn pri"
              disabled
              title="Les FdM sont notifiées selon la politique du listing"
            >
              Envoyer sur WhatsApp
            </button>
          </div>
        </div>
      </div>

      {reasonFor && (
        <div
          className="rkr-reasons-backdrop"
          onClick={() => setReasonFor(null)}
          onKeyDown={() => {}}
          role="presentation"
        >
          <div
            className="rkr-reasons"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="dialog"
            aria-label="Motif d'annulation"
          >
            <p className="t">Annuler {reasonFor.roomName} — motif</p>
            {REPARTITION_CANCEL_REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                className="rkr-btn reason"
                disabled={busy}
                onClick={() => doUnassign(reasonFor.villaId, r.id)}
              >
                {r.title}
              </button>
            ))}
            <button type="button" className="rkr-lnk" onClick={() => setReasonFor(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`rkr-toast ${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}

/* ── Colonne « À assigner » — en tête de lecture, sticky, cible du retour ── */

function UnassignedColumn({
  data,
  pick,
  busy,
  onPick,
  onAskUnassign,
  onDropVilla,
}: {
  data: RepartitionData;
  pick: Pick | null;
  busy: boolean;
  onPick: (p: Pick) => void;
  onAskUnassign: (t: ReasonTarget) => void;
  onDropVilla: (e: React.DragEvent, fdmId: string | 'unassign') => void;
}) {
  const total = data.unassigned.reduce((sum, u) => sum + (u.durationMin || 0), 0);
  // Cible « ↩ À assigner » quand une tâche de colonne est sélectionnée.
  const targetable = pick != null && pick.fromFdmId != null && !busy;
  return (
    <div
      className={`rkr-col unassigned${targetable ? ' targetable' : ''}`}
      onClick={
        targetable && pick
          ? () => onAskUnassign({ villaId: pick.villaId, roomName: pick.roomName })
          : undefined
      }
      onKeyDown={() => {}}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropVilla(e, 'unassign')}
      role={targetable ? 'button' : undefined}
    >
      <div className="rkr-colhd">
        <span className="nm">À assigner</span>
        {targetable ? (
          <span className="assign-chip">↩ À assigner (motif)</span>
        ) : (
          <span className={`cred${total > 0 ? ' over' : ''}`}>
            <b>{minutesLabel(total)}</b>
            <span>
              {data.unassigned.length} ménage{data.unassigned.length > 1 ? 's' : ''}
            </span>
          </span>
        )}
      </div>
      <div className="rkr-tasks">
        {data.unassigned.length === 0 ? (
          <span className="rkr-none">Tout est assigné ✓</span>
        ) : (
          data.unassigned.map((u) => (
            <div
              key={u.id}
              className={`rkr-task pickable${pick?.villaId === u.id ? ' picked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!busy)
                  onPick({ villaId: u.id, roomName: u.roomName, durationMin: u.durationMin, fromFdmId: null });
              }}
              onKeyDown={() => {}}
              role="button"
              tabIndex={0}
              draggable={!busy}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', u.id)}
            >
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

function StaffColumn({
  col,
  pick,
  busy,
  onPick,
  onAssign,
  onAskUnassign,
  onDropVilla,
}: {
  col: RepartitionColumn;
  pick: Pick | null;
  busy: boolean;
  onPick: (p: Pick) => void;
  onAssign: (villaId: string, fdmId: string) => void;
  onAskUnassign: (t: ReasonTarget) => void;
  onDropVilla: (e: React.DragEvent, fdmId: string | 'unassign') => void;
}) {
  const tasks = sortColumnTasks(col.tasks);
  const targetable = pick != null && pick.fromFdmId !== col.id && !busy;
  return (
    <div
      className={`rkr-col${targetable ? ' targetable' : ''}`}
      onClick={targetable && pick ? () => onAssign(pick.villaId, col.id) : undefined}
      onKeyDown={() => {}}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropVilla(e, col.id)}
      role={targetable ? 'button' : undefined}
    >
      <div className="rkr-colhd">
        <span className="nm">
          {col.name}
          {!col.worksToday && <span className="off">(repos)</span>}
        </span>
        {targetable && pick ? (
          <span className="assign-chip">
            Assigner à {col.name} (+{minutesLabel(pick.durationMin)})
          </span>
        ) : (
          <span className={`cred${col.overCapacity ? ' over' : ''}`}>
            <b>{creditsLabel(col.assignedMin, col.capacityMin)}</b>
            <span>crédits</span>
          </span>
        )}
        <span className={`rkr-gauge${col.overCapacity ? ' over' : ''}`}>
          <i style={{ width: `${gaugePct(col.assignedMin, col.capacityMin)}%` }} />
        </span>
      </div>
      <div className="rkr-tasks">
        {tasks.length === 0 ? (
          <span className="rkr-none">Aucun ménage</span>
        ) : (
          tasks.map((t, i) => {
            const actionable = t.status !== 'done' && Boolean(t.villaId);
            const picked = actionable && pick?.villaId === t.villaId;
            return (
              <div
                key={`${t.roomName}:${t.hm ?? ''}:${i}`}
                className={`rkr-task ${t.status}${actionable ? ' pickable' : ''}${picked ? ' picked' : ''}`}
                onClick={
                  actionable
                    ? (e) => {
                        e.stopPropagation();
                        if (!busy && t.villaId)
                          onPick({
                            villaId: t.villaId,
                            roomName: t.roomName,
                            durationMin: t.durationMin,
                            fromFdmId: col.id,
                          });
                      }
                    : undefined
                }
                onKeyDown={() => {}}
                role={actionable ? 'button' : undefined}
                tabIndex={actionable ? 0 : undefined}
                draggable={actionable && !busy}
                onDragStart={
                  actionable ? (e) => e.dataTransfer.setData('text/plain', t.villaId ?? '') : undefined
                }
              >
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
                {actionable && (
                  <button
                    type="button"
                    className="rkr-x"
                    title="Annuler — motif"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (t.villaId) onAskUnassign({ villaId: t.villaId, roomName: t.roomName });
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RepartitionMenage;
