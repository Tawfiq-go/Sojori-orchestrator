/**
 * Équipe ménage — « qui travaille quand, quelle capacité, qui appeler ? »
 * (spec « écrans web complémentaires », écran 8). Le seul écran où l'on gère
 * des personnes plutôt que des chambres : numéro WhatsApp, langue, jours de
 * repos, plafond de crédits — et RIEN qui ressemble à une note (interdit doc).
 *
 * Sources : GET /tasks/menage/equipe (personnes + capacité jour par jour) ;
 * la charge prévue et la tension viennent de GET /tasks/menage/semaine (mêmes
 * 7 jours). PATCH …/equipe/:staffId/capacity : plafond éditable, optimiste +
 * rollback + toast. Extras : pas de modèle backend → carte « bientôt ».
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { listingsService } from '../../services/listingsService';
import { getMenageEquipe, getMenageSemaine, patchMenageEquipeCapacity } from '../../services/fulltaskApi';
import { minutesLabel } from './repartitionLogic';
import {
  dayHeaderLabel,
  dayLoadMin,
  formatCredits,
  mergeSemaineData,
  type SemaineData,
  type SemaineDay,
} from './semaineLogic';
import {
  CAPACITY_DEFAULT,
  applyCapacityPatch,
  clampCapacity,
  dayFullName,
  holeFromSemaine,
  hoursLabel,
  payLabel,
  resolveEquipeFetch,
  waLink,
  weekCapacityMin,
  workDayFlags,
  WEEKDAY_LETTERS,
  type EquipeFetchResult,
  type EquipeRow,
  type EquipeState,
} from './equipeLogic';
import { is404, pooled, toIsoDay, type ListingOption } from './menageShared';
import './menageEquipe.css';

const FETCH_CONCURRENCY = 6;

type Toast = { kind: 'ok' | 'err'; text: string };

export function EquipeMenage() {
  const navigate = useNavigate();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [listings, setListings] = useState<ListingOption[] | null>(null);
  const [listingFilter, setListingFilter] = useState<string>('all');
  const [result, setResult] = useState<EquipeState | null>(null);
  const [semaineDays, setSemaineDays] = useState<SemaineDay[] | null>(null);
  const [semaineCharge, setSemaineCharge] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Listings du scope (même mécanique que les autres écrans ménage) ── */
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

  /* ── Chargement : équipe + semaine (travail prévu / tension, mêmes 7 jours) ── */
  const load = useCallback(async () => {
    if (listings == null) return;
    setLoading(true);
    const targets: ListingOption[] =
      listingFilter !== 'all'
        ? [listings.find((l) => l.id === listingFilter) ?? { id: listingFilter, name: '' }]
        : listings;
    if (targets.length === 0) {
      setResult({ state: 'empty' });
      setLoading(false);
      return;
    }
    const start = toIsoDay(new Date());
    const [equipeResults, semaineResults] = await Promise.all([
      pooled(targets, FETCH_CONCURRENCY, async (l): Promise<EquipeFetchResult> => {
        try {
          const res = await getMenageEquipe(l.id, requestOwnerId || undefined);
          if (!res?.success || !res.data) return { ok: false, notFound: false };
          return { ok: true, data: res.data };
        } catch (err) {
          return { ok: false, notFound: is404(err) };
        }
      }),
      pooled(targets, FETCH_CONCURRENCY, async (l): Promise<SemaineData | null> => {
        try {
          const res = await getMenageSemaine(l.id, start, requestOwnerId || undefined);
          return res?.success && res.data ? (res.data as SemaineData) : null;
        } catch {
          return null;
        }
      }),
    ]);
    setResult(resolveEquipeFetch(equipeResults));
    const semaine = mergeSemaineData(semaineResults.filter((d): d is SemaineData => d != null));
    setSemaineDays(semaine?.days ?? null);
    setSemaineCharge(semaine ? semaine.days.reduce((s, d) => s + dayLoadMin(d), 0) : null);
    setLoading(false);
  }, [listings, listingFilter, requestOwnerId]);

  useEffect(() => {
    if (!scopeFetchReady || listings == null) return;
    void load();
  }, [scopeFetchReady, listings, load]);

  /* ── Plafond de crédits : save au blur, optimiste + rollback + toast ── */
  const saveCapacity = useCallback(
    async (row: EquipeRow, raw: string) => {
      if (result?.state !== 'ok') return;
      const parsed = Number(raw);
      const next = clampCapacity(parsed);
      if (!Number.isFinite(parsed) || next === row.capacityMin) return;
      const before = result.data.rows;
      setResult({ state: 'ok', data: { ...result.data, rows: applyCapacityPatch(before, row.id, next) } });
      setSavingId(row.id);
      try {
        const res = await patchMenageEquipeCapacity(row.id, next, requestOwnerId || undefined);
        if (!res?.success) throw new Error(res?.error || 'refusé');
        const serverValue = res.data?.capacityMin;
        if (typeof serverValue === 'number' && serverValue !== next) {
          setResult((cur) =>
            cur?.state === 'ok'
              ? { state: 'ok', data: { ...cur.data, rows: applyCapacityPatch(cur.data.rows, row.id, serverValue) } }
              : cur,
          );
        }
        showToast({ kind: 'ok', text: `Plafond de ${row.name} : ${serverValue ?? next} crédits / jour` });
      } catch {
        // Rollback : on remet les lignes d'avant l'optimiste.
        setResult((cur) => (cur?.state === 'ok' ? { state: 'ok', data: { ...cur.data, rows: before } } : cur));
        showToast({ kind: 'err', text: `Impossible d'enregistrer le plafond de ${row.name}` });
      } finally {
        setSavingId(null);
      }
    },
    [result, requestOwnerId, showToast],
  );

  const data = result?.state === 'ok' ? result.data : null;
  const capaciteSemaine = useMemo(() => (data ? weekCapacityMin(data.days) : 0), [data]);
  const tensionDays = useMemo(
    () => (semaineDays ? semaineDays.filter((d) => d.tension).length : 0),
    [semaineDays],
  );
  const hole = useMemo(() => (semaineDays ? holeFromSemaine(semaineDays) : null), [semaineDays]);
  const tensionByYmd = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const d of semaineDays ?? []) map.set(d.ymd, d.tension);
    return map;
  }, [semaineDays]);

  const listingOptions = useMemo<ListingOption[]>(
    () => (listings?.length ? [...listings].sort((a, b) => a.name.localeCompare(b.name)) : []),
    [listings],
  );

  return (
    <div className="rke">
      <div className="rke-app">
        <div className="rke-hd">
          <div>
            <p className="rke-cr">Ménage /</p>
            <h3>L'équipe</h3>
          </div>
          <span className="rke-rt">
            <button type="button" className="rke-lnk" onClick={() => navigate('/menage/rack')}>
              Rack
            </button>
            <button type="button" className="rke-lnk" onClick={() => navigate('/menage/repartition')}>
              Répartition
            </button>
            <button type="button" className="rke-lnk" onClick={() => navigate('/menage/semaine')}>
              Semaine
            </button>
            <select
              className="rke-select"
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

        <div className="rke-bd">
          {result?.state === 'unavailable' && (
            <div className="rke-warn">Disponible après la prochaine mise à jour.</div>
          )}
          {result?.state === 'error' && <div className="rke-err">Impossible de charger l'équipe.</div>}

          {data && (
            <>
              <div className="rke-strip">
                <span className="rke-st">
                  <b>{minutesLabel(capaciteSemaine)}</b>
                  <span>capacité semaine</span>
                </span>
                <span className="rke-st gd">
                  <b>{semaineCharge != null ? minutesLabel(semaineCharge) : '—'}</b>
                  <span>travail prévu</span>
                </span>
                <span className={`rke-st${tensionDays ? ' al' : ''}`}>
                  <b>{tensionDays}</b>
                  <span>jour{tensionDays > 1 ? 's' : ''} en tension</span>
                </span>
              </div>
              {hole && (
                <div className="rke-hole">
                  Le trou : {dayFullName(hole.ymd)}, {formatCredits(hole.missingMin)} crédits manquants.
                </div>
              )}

              <div className="rke-card">
                <span className="h">
                  <span>Les femmes de ménage</span>
                  <span className="sub">L·M·M·J·V·S·D — jours travaillés</span>
                </span>
                <div>
                  {data.rows.map((row) => (
                    <EquipeRowView
                      key={row.id}
                      row={row}
                      saving={savingId === row.id}
                      onSaveCapacity={(raw) => void saveCapacity(row, raw)}
                    />
                  ))}
                </div>
              </div>

              <div className="rke-card">
                <span className="h">
                  <span>Capacité jour par jour</span>
                </span>
                <div style={{ padding: '10px 12px' }}>
                  <div className="rke-days">
                    {data.days.map((day) => (
                      <div
                        key={day.ymd}
                        className={`rke-day${tensionByYmd.get(day.ymd) ? ' tension' : ''}`}
                      >
                        <b>{dayHeaderLabel(day.ymd)}</b>
                        <span className="cap">{formatCredits(day.capacityMin)}</span>
                        <span className="fdm">{day.fdmCount} FdM</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rke-soon">Carnet d'extras — bientôt.</div>
            </>
          )}

          {loading && !data && result?.state !== 'unavailable' && result?.state !== 'error' && (
            <div className="rke-empty">Chargement de l'équipe…</div>
          )}
          {!loading && result?.state === 'empty' && (
            <div className="rke-empty">Aucune personne dans l'équipe ménage.</div>
          )}
        </div>
      </div>
      {toast && <div className={`rke-toast ${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}

/* ── Une personne ──────────────────────────────────────────────────────── */

function EquipeRowView({
  row,
  saving,
  onSaveCapacity,
}: {
  row: EquipeRow;
  saving: boolean;
  onSaveCapacity: (raw: string) => void;
}) {
  const [draft, setDraft] = useState<string>(String(row.capacityMin));
  useEffect(() => setDraft(String(row.capacityMin)), [row.capacityMin]);

  const flags = workDayFlags(row.workDays);
  const link = waLink(row.phone);
  const initial = (row.name || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="rke-stf">
      <span className="av">{initial}</span>
      <span className="n1">{row.name}</span>
      <span className="n2">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer">
            {row.phone}
          </a>
        ) : (
          row.phone || '—'
        )}
        <span>· {row.lang || '—'}</span>
        <span>· {hoursLabel(row.hourStart, row.hourEnd)}</span>
        <span>· {payLabel(row.payMode, row.amount)}</span>
      </span>
      <span className="rr">
        <span className="rke-wkdays">
          {WEEKDAY_LETTERS.map((letter, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: position = jour de la semaine, stable
              key={i}
              className={`rke-wd${flags[i] ? ' on' : ''}`}
            >
              {letter}
            </span>
          ))}
        </span>
        <span className={`rke-cap${saving ? ' saving' : ''}`}>
          <input
            type="number"
            min={30}
            max={720}
            step={10}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => onSaveCapacity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            aria-label={`Plafond de crédits de ${row.name}`}
          />
          <span>/ jour</span>
          {row.capacityMin === CAPACITY_DEFAULT && <span className="def">défaut 300</span>}
        </span>
      </span>
    </div>
  );
}

export default EquipeMenage;
