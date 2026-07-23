// ════════════════════════════════════════════════════════════════════
// AiCockpit.tsx — Cockpit IA · Orchestration
// Salle de contrôle plein écran : tableau de bord sombre, copilot en
// langage naturel, tableau de vol des turnovers, résolution de conflits.
// Design from scratch — indépendant du Plan de journée.
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type {
  DayPlanAction,
  DayPlanChain,
  DayPlanResponse,
  DayPlanStep,
} from '../../services/fulltaskApi';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import PlanManualAssignModal from '../planReservation/PlanManualAssignModal';
import EscaladeForceSlotModal from '../planReservation/EscaladeForceSlotModal';
import { ReservationRegistrationActions } from '../../components/reservations/ReservationRegistrationActions';
import './aiCockpit.css';

/* ─── Helpers temps ─── */

function toIso(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIso(new Date(y, m - 1, d + days));
}

function frDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtTime(raw?: string | null): string {
  if (!raw) return '—:—';
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function toMin(hhmm?: string | null): number | null {
  const m = hhmm ? /^(\d{1,2}):(\d{2})/.exec(hhmm) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function fmtDuration(minutes: number): string {
  const abs = Math.abs(minutes);
  if (abs >= 60) {
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${h}h${m ? String(m).padStart(2, '0') : ''}`;
  }
  return `${abs} min`;
}

/* ─── Types internes ─── */

type Flight = {
  chain: DayPlanChain;
  departure?: DayPlanStep;
  cleaning?: DayPlanStep;
  arrival?: DayPlanStep;
  attentionStep?: DayPlanStep;
  /** Toutes les étapes des 2 réservations de la chaîne — checklist statuts + actions. */
  checkSteps: DayPlanStep[];
};

type CopilotReply = {
  text: string;
  targets: string[];
  action?: { step: DayPlanStep; action: DayPlanAction } | null;
};

/* ─── Copilot local (plan compilé → réponse) ─── */

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function copilotReply(query: string, plan: DayPlanResponse, flights: Flight[]): CopilotReply {
  const q = norm(query);
  const { stats } = plan;

  const named = flights.filter((f) =>
    norm(f.chain.listingName || '')
      .split(/[\s·|,-]+/)
      .filter((w) => w.length >= 4)
      .some((w) => q.includes(w)),
  );
  const scope = named.length > 0 ? named : flights;

  const asksRisk = /(serre|conflit|risque|casse|tendu|urgent|probleme|danger)/.test(q);
  const asksClean = /(menage|cleaner|nettoyage|cleaning|femme)/.test(q);
  const asksEarly = /(early|avance|plus tot|anticip|check.?in)/.test(q);
  const asksWho = /(qui|staff|assigne|equipe)/.test(q);

  if (asksRisk) {
    const risky = flights.filter((f) => f.chain.status !== 'ok');
    if (!risky.length) {
      return { text: `Zéro risque détecté : les ${stats.turnovers} turnover(s) du jour ont une marge saine. ✓`, targets: [] };
    }
    const worst = [...risky].sort((a, b) => a.chain.slackMinutes - b.chain.slackMinutes)[0];
    return {
      text: `${risky.length} turnover(s) sous tension. Le plus critique : ${worst.chain.listingName} — ${worst.chain.slackMinutes < 0 ? `${fmtDuration(worst.chain.slackMinutes)} de dépassement` : `marge ${fmtDuration(worst.chain.slackMinutes)}`}. Ligne surlignée ci-dessous.`,
      targets: risky.map((f) => f.chain.id),
      action: worst.attentionStep?.attention?.actions?.[0]
        ? { step: worst.attentionStep, action: worst.attentionStep.attention.actions[0] }
        : null,
    };
  }

  if (asksClean || asksEarly) {
    if (!scope.length) {
      return { text: `Aucun turnover concerné — ${stats.arrivals} arrivée(s) sans départ le même jour : le ménage est libre de contrainte.`, targets: [] };
    }
    const f = scope[0];
    const win = `${fmtTime(f.cleaning?.time ?? f.departure?.time)} → ${fmtTime(f.chain.expectedCleaningEnd)}`;
    if (f.chain.status === 'broken') {
      return {
        text: `⚠ ${f.chain.listingName} : la fenêtre ménage (${win}) dépasse l'arrivée prévue à ${fmtTime(f.arrival?.time)}. Early check-in impossible en l'état — replanifie le ménage ou décale l'arrivée.`,
        targets: [f.chain.id],
        action: f.attentionStep?.attention?.actions?.[0]
          ? { step: f.attentionStep, action: f.attentionStep.attention.actions[0] }
          : null,
      };
    }
    return {
      text: `${f.chain.listingName} : ${f.cleaning?.staffName ? `${f.cleaning.staffName} est sur le ménage` : 'fenêtre ménage calée'} (${win}), marge ${fmtDuration(f.chain.slackMinutes)} avant ${f.chain.arrivingGuestName || 'l’arrivée'}. ${f.chain.slackMinutes >= 45 ? 'Early check-in jouable ✓' : 'Marge courte — ne promets pas plus tôt.'}`,
      targets: [f.chain.id],
    };
  }

  if (asksWho) {
    const withStaff = scope.filter((f) => f.cleaning?.staffName);
    if (!withStaff.length) {
      return { text: 'Aucun staff assigné sur les ménages de ces turnovers — à sécuriser depuis les lignes ci-dessous.', targets: scope.map((f) => f.chain.id) };
    }
    return {
      text: withStaff.map((f) => `${f.chain.listingName} → ${f.cleaning?.staffName}`).join(' · '),
      targets: withStaff.map((f) => f.chain.id),
    };
  }

  return {
    text: `Journée ${plan.fragility.label} : ${stats.turnovers} turnover(s), ${stats.arrivals} arrivée(s), ${stats.departures} départ(s), ${stats.attention} décision(s) humaine(s) restante(s). Essaie « où sont mes turnovers serrés ? »`,
    targets: [],
  };
}

/* ─── Compteur animé ─── */

function useCountUp(target: number, ms = 800): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target <= 0) { setV(target); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round((1 - (1 - p) ** 3) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/* ─── Composant principal ─── */

const PROMPTS = [
  'Où sont mes turnovers serrés ?',
  'Un cleaner dispo pour un early check-in ?',
  'Qui fait les ménages ?',
];

export default function AiCockpit() {
  const navigate = useNavigate();
  /** ⚠️ Multi-tenant : toute donnée affichée/envoyée à l'IA est scopée owner. */
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [date, setDate] = useState(() => toIso(new Date()));
  const [plan, setPlan] = useState<DayPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(() => new Date());
  const [query, setQuery] = useState('');
  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState<CopilotReply | null>(null);
  const [typed, setTyped] = useState('');
  const [assignCtx, setAssignCtx] = useState<{ reservationId: string; taskId: string } | null>(null);
  const [slotCtx, setSlotCtx] = useState<{ reservationId: string; taskId: string; taskType: string } | null>(null);
  /** Étape dont on inspecte les relances (panneau détail + actions). */
  const [relanceStep, setRelanceStep] = useState<DayPlanStep | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const isToday = date === toIso(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (!scopeFetchReady) return;
    setLoading(true);
    try {
      setPlan(await fulltaskApi.getDayPlan(date, requestOwnerId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur chargement cockpit');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [date, scopeFetchReady, requestOwnerId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const flights = useMemo<Flight[]>(() => {
    if (!plan) return [];
    return (plan.chains ?? []).map((chain) => {
      const steps = plan.steps.filter((s) => s.chainId === chain.id);
      /* Toutes les étapes des 2 réservations (enregistrement, choix d'heure,
         relances…) — pas seulement celles taguées chainId. */
      const checkSteps = plan.steps.filter(
        (s) =>
          (s.reservationId === chain.departingReservationId ||
            s.reservationId === chain.arrivingReservationId) &&
          (s.kind !== 'message' || s.state === 'attention'),
      );
      return {
        chain,
        departure: steps.find((s) => s.kind === 'departure'),
        cleaning: steps.find((s) => s.kind === 'cleaning'),
        arrival: steps.find((s) => s.kind === 'arrival'),
        attentionStep: steps.find((s) => s.state === 'attention'),
        checkSteps,
      };
    });
  }, [plan]);

  /** Hors chaîne : mêmes checklists complètes que les turnovers, groupées par réservation. */
  const soloGroups = useMemo(() => {
    if (!plan) return [];
    const map = new Map<
      string,
      { reservationId: string; listingName: string; guestName?: string; steps: DayPlanStep[] }
    >();
    for (const s of plan.steps) {
      if (s.chainId) continue;
      if (s.kind === 'message' && s.state !== 'attention') continue;
      const g =
        map.get(s.reservationId) ??
        { reservationId: s.reservationId, listingName: s.listingName, guestName: s.guestName, steps: [] };
      if (!g.guestName && s.guestName) g.guestName = s.guestName;
      g.steps.push(s);
      map.set(s.reservationId, g);
    }
    const rank = (s: DayPlanStep) =>
      s.kind === 'departure' ? 0 : s.kind === 'arrival' ? 1 : s.kind === 'cleaning' ? 2 : s.kind === 'task' ? 3 : 4;
    for (const g of map.values()) {
      g.steps.sort((a, b) => rank(a) - rank(b) || String(a.time || '').localeCompare(String(b.time || '')));
    }
    return [...map.values()];
  }, [plan]);

  const targets = useMemo(() => new Set(reply?.targets ?? []), [reply]);

  useEffect(() => {
    if (!reply) return undefined;
    setTyped('');
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setTyped(reply.text.slice(0, i));
      if (i >= reply.text.length) clearInterval(t);
    }, 13);
    return () => clearInterval(t);
  }, [reply]);

  const showReply = useCallback((r: CopilotReply) => {
    setThinking(false);
    setReply(r);
    if (r.targets.length) {
      window.setTimeout(() => {
        boardRef.current
          ?.querySelector(`[data-flight="${r.targets[0]}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, []);

  const ask = (raw?: string) => {
    const q = (raw ?? query).trim();
    if (!q || !plan) return;
    setQuery(q);
    setThinking(true);
    setReply(null);

    /* Suggestions connues → moteur local : instantané et sait surligner les lignes. */
    if (raw !== undefined || PROMPTS.includes(q)) {
      window.setTimeout(() => showReply(copilotReply(q, plan, flights)), 600);
      return;
    }

    /* Question libre → Haiku côté backend (plan déjà scopé owner là-bas). */
    void (async () => {
      try {
        const res = await fulltaskApi.askDayPlanCopilot(q, date, requestOwnerId);
        if (res.success && res.answer) {
          showReply({ text: res.answer, targets: [] });
          return;
        }
        /* IA non configurée / indisponible → repli sur le moteur local. */
        showReply(copilotReply(q, plan, flights));
      } catch {
        showReply(copilotReply(q, plan, flights));
      }
    })();
  };

  const runAction = (step: DayPlanStep, action: DayPlanAction) => {
    if (action.type === 'plan' || action.type === 'relance_guest') {
      navigate(`/orchestration/plans?reservationId=${encodeURIComponent(step.reservationId)}`);
      return;
    }
    if (action.type === 'assign' && action.taskId) {
      setAssignCtx({ reservationId: step.reservationId, taskId: action.taskId });
      return;
    }
    if (action.type === 'call' && action.phone) {
      window.open(`tel:${action.phone}`, '_self');
      return;
    }
    if (action.type === 'force_slot' && action.taskId) {
      setSlotCtx({
        reservationId: step.reservationId,
        taskId: action.taskId,
        taskType: step.kind === 'departure' ? 'departure_choose' : 'arrival_choose',
      });
    }
  };

  const stats = plan?.stats;
  const kTurn = useCountUp(stats?.turnovers ?? 0);
  const kArr = useCountUp(stats?.arrivals ?? 0);
  const kDep = useCountUp(stats?.departures ?? 0);
  const kAuto = useCountUp(stats && stats.steps > 0 ? Math.round((stats.done / stats.steps) * 100) : 0);
  const kAttn = useCountUp(stats?.attention ?? 0);

  const dayPct = isToday
    ? Math.min(100, ((clock.getHours() * 60 + clock.getMinutes()) / 1440) * 100)
    : date < toIso(new Date()) ? 100 : 0;

  return (
    <div className="ck-root">
      {/* ══ Barre haute : identité + horloge + date ══ */}
      <div className="ck-topbar">
        <div className="ck-brand">
          <span className="ck-brand-orb" aria-hidden />
          <div>
            <div className="ck-brand-name">Cockpit IA</div>
            <div className="ck-brand-sub">Orchestration Sojori</div>
          </div>
          {isToday && (
            <span className="ck-live"><i aria-hidden />LIVE</span>
          )}
        </div>
        <div className="ck-clock" aria-label="Heure actuelle">
          {clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        {/* Navigation rapide : Aujourd'hui / J+1 / J+2 / J+3 sans passer par le calendrier */}
        <div className="ck-quickdays">
          {[0, 1, 2, 3].map((d) => {
            const iso = addDaysIso(toIso(new Date()), d);
            const label = d === 0 ? "Aujourd'hui" : `J+${d}`;
            return (
              <button
                key={d}
                type="button"
                className={date === iso ? 'on' : ''}
                title={frDate(iso)}
                onClick={() => setDate(iso)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="ck-datenav">
          <button type="button" onClick={() => setDate(addDaysIso(date, -1))} aria-label="Jour précédent">‹</button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Date du cockpit"
          />
          <button type="button" onClick={() => setDate(addDaysIso(date, 1))} aria-label="Jour suivant">›</button>
          {!isToday && (
            <button type="button" className="ck-today" onClick={() => setDate(toIso(new Date()))}>Aujourd'hui</button>
          )}
        </div>
      </div>

      {/* ══ Progression de la journée ══ */}
      <div className="ck-dayline" title={`${frDate(date)} — ${Math.round(dayPct)}% de la journée`}>
        <span className="ck-dayline-label">{isToday ? 'aujourd\'hui' : frDate(date)}</span>
        <div className="ck-dayline-track">
          <div className="ck-dayline-fill" style={{ width: `${dayPct}%` }} />
          {isToday && <div className="ck-dayline-cursor" style={{ left: `${dayPct}%` }} />}
        </div>
        <span className="ck-dayline-edge">00:00</span>
        <span className="ck-dayline-edge end">24:00</span>
      </div>

      {/* ══ Copilot ══ */}
      <div className="ck-console">
        <form
          className="ck-ask"
          onSubmit={(e) => { e.preventDefault(); ask(); }}
        >
          <span className="ck-ask-orb" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Parle à ton orchestrateur…"
            aria-label="Question à l'orchestrateur"
          />
          <button type="submit" aria-label="Envoyer">⏎</button>
        </form>
        <div className="ck-prompts">
          {PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => ask(p)}>{p}</button>
          ))}
        </div>
        {(thinking || reply) && (
          <div className="ck-reply" role="status">
            {thinking ? (
              <span className="ck-dots"><i /><i /><i /></span>
            ) : (
              <>
                <span>
                  {typed}
                  {typed.length < (reply?.text.length ?? 0) && <b className="ck-caret" />}
                </span>
                {reply?.action && typed.length >= (reply?.text.length ?? 0) && (
                  <button
                    type="button"
                    className="ck-reply-cta"
                    onClick={() => runAction(reply.action!.step, reply.action!.action)}
                  >
                    {reply.action.action.label} →
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ KPI ══ */}
      <div className="ck-kpis">
        <Kpi value={String(kTurn)} label="turnovers" delay={0} />
        <Kpi value={String(kArr)} label="arrivées" delay={60} />
        <Kpi value={String(kDep)} label="départs" delay={120} />
        <Kpi value={`${kAuto}%`} label="auto-exécuté" tone="ai" delay={180} />
        <Kpi value={String(kAttn)} label={kAttn > 0 ? 'décisions requises' : 'décision requise ✓'} tone={kAttn > 0 ? 'warn' : 'ok'} delay={240} />
      </div>

      {/* ══ Tableau de vol des turnovers ══ */}
      <div className="ck-board" ref={boardRef}>
        <div className="ck-board-title">
          <span>Tableau de vol · turnovers</span>
          <span className="ck-board-hint">départ → ménage → arrivée</span>
        </div>

        {loading && !plan && <div className="ck-empty">Compilation du plan…</div>}
        {plan && flights.length === 0 && (
          <div className="ck-empty">
            Aucun turnover — {stats?.arrivals ?? 0} arrivée(s), {stats?.departures ?? 0} départ(s) sans enchaînement.
          </div>
        )}

        {flights.map((f, i) => (
          <FlightRow
            key={f.chain.id}
            flight={f}
            index={i}
            targeted={targets.has(f.chain.id)}
            onAction={runAction}
            planDate={date}
            onOpenRelances={setRelanceStep}
          />
        ))}

        {soloGroups.length > 0 && (
          <>
            <div className="ck-board-title solo">
              <span>Hors turnover · par réservation</span>
              <span className="ck-board-hint">mêmes checklists et actions que les turnovers</span>
            </div>
            {soloGroups.map((g, i) => {
              const attn = g.steps.find((s) => s.state === 'attention');
              return (
                <div
                  key={g.reservationId}
                  className={`ck-flight ${attn ? 'tight' : 'ok'}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
                >
                  <div className="ck-flight-head">
                    <span className="ck-flight-name" title={g.listingName}>
                      {g.listingName}
                      {g.guestName ? ` · ${g.guestName}` : ''}
                    </span>
                    {attn ? (
                      <span className="ck-flight-chip tight">✋ décision requise</span>
                    ) : (
                      <span className="ck-flight-chip ok">✓ en ordre</span>
                    )}
                  </div>
                  <ChecksList
                    steps={g.steps}
                    planDate={date}
                    onAction={runAction}
                    onOpenRelances={setRelanceStep}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>

      {relanceStep && (
        <RelancesPanel
          step={relanceStep}
          planDate={date}
          onClose={() => setRelanceStep(null)}
          onAction={(s, a) => {
            setRelanceStep(null);
            runAction(s, a);
          }}
          onReload={() => {
            setRelanceStep(null);
            void load();
          }}
        />
      )}

      {assignCtx && (
        <PlanManualAssignModal
          open
          reservationId={assignCtx.reservationId}
          taskId={assignCtx.taskId}
          onClose={() => setAssignCtx(null)}
          onDone={() => { setAssignCtx(null); void load(); }}
        />
      )}
      {slotCtx && (
        <EscaladeForceSlotModal
          open
          reservationId={slotCtx.reservationId}
          taskId={slotCtx.taskId}
          taskType={slotCtx.taskType}
          onClose={() => setSlotCtx(null)}
          onSubmitted={() => { setSlotCtx(null); void load(); }}
        />
      )}
    </div>
  );
}

/* ─── Panneau relances : historique complet + actions ─── */

const RELANCE_STATUS: Record<string, { ico: string; label: string; cls: string }> = {
  fait: { ico: '✓', label: 'envoyée', cls: 'done' },
  en_attente: { ico: '→', label: 'planifiée', cls: 'todo' },
  en_cours: { ico: '…', label: 'en cours', cls: 'todo' },
  saute: { ico: '⏭', label: 'sautée', cls: 'skip' },
  echec: { ico: '✗', label: 'échec', cls: 'fail' },
};

function RelancesPanel({
  step,
  planDate,
  onClose,
  onAction,
  onReload,
}: {
  step: DayPlanStep;
  planDate: string;
  onClose: () => void;
  onAction: (s: DayPlanStep, a: DayPlanAction) => void;
  onReload: () => void;
}) {
  const [sending, setSending] = useState(false);
  /* Ménage : choisir/modifier l'heure — patch du scheduledDate de la tâche (même API que la page Tâches). */
  const [cleanTime, setCleanTime] = useState(step.time ?? step.estimatedTime ?? '11:00');
  const [savingTime, setSavingTime] = useState(false);
  /* ⚠️ ReservationRegistrationActions appelle onRegistrationUpdated dès le chargement
     (synchro compteurs) : ne JAMAIS fermer le panneau sur ce callback — on marque
     « touché » et on recharge le plan à la fermeture. */
  const [regTouched, setRegTouched] = useState(false);
  const close = () => (regTouched ? onReload() : onClose());
  const relances = step.relances ?? [];
  const nextPending = relances.find((r) => r.status === 'en_attente');
  /* choose-task (départ/arrivée) sinon la tâche elle-même (ex. enregistrement). */
  const relanceTaskId = step.chooseTaskId ?? step.taskId;

  const sendNow = async () => {
    if (!nextPending || !relanceTaskId || sending) return;
    setSending(true);
    try {
      await fulltaskApi.sendPlanRelance(step.reservationId, relanceTaskId, nextPending.index);
      toast.success(`Relance « ${nextPending.label} » envoyée`);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec envoi de la relance');
      setSending(false);
    }
  };

  return (
    <div className="ck-relpop-backdrop" onClick={close} role="presentation">
      <div className="ck-relpop" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Relances">
        <div className="ck-relpop-hdr">
          <span>{CHECK_ICON[step.kind]} {checkLabel(step)}</span>
          <button type="button" onClick={close} aria-label="Fermer">✕</button>
        </div>

        <div className="ck-relpop-list">
          {relances.length === 0 && (
            <div className="ck-relpop-empty">Aucune relance planifiée pour cette étape.</div>
          )}
          {relances.map((r) => {
            const st = RELANCE_STATUS[r.status] ?? RELANCE_STATUS.en_attente;
            return (
              <div key={r.index} className={`ck-relpop-item ${st.cls}`}>
                <span className="ck-relpop-ico" aria-hidden>{st.ico}</span>
                <span className="ck-relpop-lbl">{r.label}</span>
                <span className="ck-relpop-when">
                  {st.label} {fmtWhen(r.status === 'fait' && r.sentAt ? r.sentAt : r.scheduledAt, planDate)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ménage : choisir / modifier l'heure (patch scheduledDate de la tâche) */}
        {step.kind === 'cleaning' && step.taskId && (
          <div className="ck-relpop-reg">
            <span>🕐 Heure du ménage :</span>
            <input
              type="time"
              className="ck-relpop-time"
              value={cleanTime}
              onChange={(e) => setCleanTime(e.target.value)}
              aria-label="Heure du ménage"
            />
            <button
              type="button"
              className="ck-relpop-apply"
              disabled={savingTime || !/^\d{2}:\d{2}$/.test(cleanTime)}
              onClick={() =>
                void (async () => {
                  setSavingTime(true);
                  try {
                    const res = await fulltaskApi.patchTask(step.taskId!, {
                      scheduledDate: `${planDate}T${cleanTime}:00`,
                    });
                    if (res?.success === false) throw new Error(res?.error || 'Mise à jour refusée');
                    toast.success(`Ménage planifié à ${cleanTime}`);
                    onReload();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Échec mise à jour de l'heure");
                    setSavingTime(false);
                  }
                })()
              }
            >
              {savingTime ? '…' : 'Appliquer'}
            </button>
          </div>
        )}

        {/* Enregistrement : finalisation voyageurs — même API que la page Réservations */}
        {step.taskType === 'registration' && (
          <div className="ck-relpop-reg">
            <span>📝 Finaliser l'enregistrement voyageurs :</span>
            <ReservationRegistrationActions
              reservationId={step.reservationId}
              onRegistrationUpdated={() => setRegTouched(true)}
            />
          </div>
        )}

        <div className="ck-relpop-actions">
          {nextPending && relanceTaskId && (
            <button type="button" className="primary" disabled={sending} onClick={() => void sendNow()}>
              {sending ? 'Envoi…' : '📨 Relancer maintenant'}
            </button>
          )}
          {step.chooseTaskId && (
            <button
              type="button"
              onClick={() =>
                onAction(step, { type: 'force_slot', label: 'Fixer une heure', taskId: step.chooseTaskId })
              }
            >
              🕐 Fixer une heure
            </button>
          )}
          {step.kind === 'cleaning' && step.taskId && (
            <button
              type="button"
              onClick={() =>
                onAction(step, {
                  type: 'assign',
                  label: step.staffName ? 'Modifier le staff' : 'Assigner un staff',
                  taskId: step.taskId,
                })
              }
            >
              👤 {step.staffName ? 'Modifier le staff' : 'Assigner un staff'}
            </button>
          )}
          {step.guestPhone && (
            <button
              type="button"
              onClick={() => onAction(step, { type: 'call', label: 'Appeler', phone: step.guestPhone })}
            >
              📞 Appeler
            </button>
          )}
          <button type="button" onClick={() => onAction(step, { type: 'plan', label: 'Voir le plan' })}>
            Voir le plan
          </button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ value, label, tone, delay }: { value: string; label: string; tone?: 'ai' | 'warn' | 'ok'; delay: number }) {
  return (
    <div className={`ck-kpi ${tone ?? ''}`} style={{ animationDelay: `${delay}ms` }}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

/* ─── Ligne du tableau de vol ─── */

const CHECK_ICON: Record<DayPlanStep['kind'], string> = {
  departure: '🛫',
  arrival: '🛬',
  cleaning: '🧹',
  task: '📋',
  message: '💬',
  relance: '🔔',
};

function checkLabel(s: DayPlanStep): string {
  if (s.kind === 'departure') return `Heure départ${s.guestName ? ` · ${s.guestName}` : ''}`;
  if (s.kind === 'arrival') return `Heure arrivée${s.guestName ? ` · ${s.guestName}` : ''}`;
  if (s.kind === 'cleaning') return s.staffName ? `Ménage · ${s.staffName}` : 'Ménage';
  const first = (s.title || '').split('·')[0]?.trim();
  return `${first || s.kind}${s.guestName ? ` · ${s.guestName}` : ''}`;
}

/** « 11:00 » si le jour du plan, sinon « 24/07 11:00 » — plus jamais d'heure sans jour ambigu. */
function fmtWhen(iso: string, planDate?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const z = (n: number) => String(n).padStart(2, '0');
  const dayKey = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  const hm = `${z(d.getHours())}:${z(d.getMinutes())}`;
  return planDate && dayKey === planDate ? hm : `${z(d.getDate())}/${z(d.getMonth() + 1)} ${hm}`;
}

/** Checklist réutilisable (turnovers + réservations hors chaîne) : statuts, badges 🔔, actions. */
function ChecksList({
  steps,
  planDate,
  onAction,
  onOpenRelances,
}: {
  steps: DayPlanStep[];
  planDate: string;
  onAction: (step: DayPlanStep, action: DayPlanAction) => void;
  onOpenRelances: (step: DayPlanStep) => void;
}) {
  if (!steps.length) return null;
  return (
    <div className="ck-checks">
      {steps.map((s) => {
        const action = s.attention?.actions?.[0];
        const state = s.state === 'done' ? 'done' : s.state === 'attention' ? 'attn' : 'todo';
        const isRegistration = s.taskType === 'registration';
        const isCleaningTask = s.kind === 'cleaning' && Boolean(s.taskId);
        const clickable = Boolean(s.relances?.length) || isRegistration || isCleaningTask;
        return (
          <div
            key={s.id}
            className={`ck-check ${state} ${clickable ? 'has-rel' : ''}`}
            title={s.attention?.reason || (clickable ? 'Voir relances & actions' : s.title)}
            onClick={clickable ? () => onOpenRelances(s) : undefined}
          >
            <span className="ck-check-state" aria-hidden>
              {state === 'done' ? '✓' : state === 'attn' ? '!' : '·'}
            </span>
            <span className="ck-check-ico" aria-hidden>{CHECK_ICON[s.kind]}</span>
            <span className="ck-check-label">{checkLabel(s)}</span>
            <span className="ck-check-detail">{checkDetail(s, planDate)}</span>
            {Boolean(s.relances?.length) && (
              <span className="ck-check-rel" aria-hidden>🔔{s.relances!.length}</span>
            )}
            {action && (
              <button
                type="button"
                className="ck-check-cta"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(s, action);
                }}
              >
                {action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function checkDetail(s: DayPlanStep, planDate?: string): string {
  if (s.state === 'done') return s.time ? `fait · ${s.time}` : 'fait';
  /* Règle métier : le ménage démarre à l'heure de départ client. */
  if (s.kind === 'cleaning') {
    const when =
      s.hourUnknown || !s.time
        ? `au départ client${s.estimatedTime ? ` ≈ ${s.estimatedTime}` : ''}`
        : `prévu ${s.time}`;
    return s.staffName ? when : `non assigné · ${when}`;
  }
  if (s.hourUnknown || (!s.time && (s.kind === 'departure' || s.kind === 'arrival'))) {
    const est = s.estimatedTime ? `défaut ≈ ${s.estimatedTime}` : 'non choisie';
    const relance = s.nextRelanceAt ? ` · relance ${fmtWhen(s.nextRelanceAt, planDate)}` : '';
    return `${est}${relance}`;
  }
  const rel = s.nextRelanceAt ? ` · relance ${fmtWhen(s.nextRelanceAt, planDate)}` : '';
  if (s.registrationPending) return `enregistrement en attente${rel}`;
  return s.time ? `prévu ${s.time}${rel}` : `en attente${rel}`;
}

function FlightRow({
  flight,
  index,
  targeted,
  onAction,
  planDate,
  onOpenRelances,
}: {
  flight: Flight;
  index: number;
  targeted: boolean;
  onAction: (step: DayPlanStep, action: DayPlanAction) => void;
  planDate: string;
  onOpenRelances: (step: DayPlanStep) => void;
}) {
  const { chain, departure, cleaning, arrival, attentionStep, checkSteps } = flight;

  /* Checklist ordonnée : côté départ → ménage → côté arrivée. */
  const orderedChecks = [...checkSteps].sort((a, b) => {
    const side = (s: DayPlanStep) =>
      s.kind === 'cleaning' ? 1 : s.reservationId === chain.departingReservationId ? 0 : 2;
    const rank = (s: DayPlanStep) =>
      s.kind === 'departure' || s.kind === 'arrival' ? 0 : s.kind === 'task' ? 1 : 2;
    return side(a) - side(b) || rank(a) - rank(b) || String(a.time || '').localeCompare(String(b.time || ''));
  });

  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const depM = toMin(departure?.time);
  const arrM = toMin(arrival?.time);
  const endM = toMin(fmtTime(chain.expectedCleaningEnd));

  const seg = (a: number | null, b: number | null): number => {
    if (a == null || b == null || b <= a) return 0;
    return Math.max(0, Math.min(1, (nowM - a) / (b - a)));
  };
  const cleanPct = seg(depM, endM) * 100;
  const gapPct = seg(endM, arrM) * 100;

  const status = chain.status;
  /* Heures non choisies : marge estimée sur les défauts (départ 11:00 / arrivée 15:00). */
  const statusChip = chain.hoursUnknown
    ? {
        cls: chain.slackMinutes < 0 ? 'broken' : 'tight',
        txt:
          chain.slackMinutes < 0
            ? `⏳ dépassement est. ${fmtDuration(chain.slackMinutes)} · à confirmer`
            : `⏳ marge est. ${fmtDuration(chain.slackMinutes)} · à confirmer`,
      }
    : status === 'broken'
      ? { cls: 'broken', txt: `⚠ ${fmtDuration(chain.slackMinutes)} de dépassement` }
      : status === 'tight'
        ? { cls: 'tight', txt: `⏱ marge ${fmtDuration(chain.slackMinutes)}` }
        : { cls: 'ok', txt: `✓ marge ${fmtDuration(chain.slackMinutes)}` };

  const cta = attentionStep?.attention?.actions?.[0];

  return (
    <div
      className={`ck-flight ${statusChip.cls} ${targeted ? 'is-target' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 80}ms` }}
      data-flight={chain.id}
    >
      <div className="ck-flight-head">
        <span className="ck-flight-name" title={chain.listingName}>{chain.listingName}</span>
        <span className={`ck-flight-chip ${statusChip.cls}`}>{statusChip.txt}</span>
      </div>

      <div className="ck-strip">
        <div className="ck-node">
          <span className="ck-node-time">
            {departure?.time
              ? fmtTime(departure.time)
              : departure?.estimatedTime
                ? `≈ ${departure.estimatedTime}`
                : '—:—'}
          </span>
          <span className={`ck-node-dot dep ${departure?.state === 'done' ? 'done' : ''}`} />
          <span className="ck-node-label">🛫 {chain.departingGuestName || 'Départ'}</span>
        </div>

        <div className="ck-seg">
          <div className="ck-seg-fill clean" style={{ width: `${chain.hoursUnknown ? 0 : cleanPct}%` }} />
          <span className="ck-seg-label">
            🧹 {cleaning?.staffName || <em>à assigner</em>}
            {chain.hoursUnknown
              ? ` · au départ client · ≈ fin ${fmtTime(chain.expectedCleaningEnd)}`
              : ` · fin ${fmtTime(chain.expectedCleaningEnd)}`}
          </span>
        </div>

        <div className="ck-seg gap">
          <div className="ck-seg-fill" style={{ width: `${gapPct}%` }} />
        </div>

        <div className="ck-node">
          <span className="ck-node-time">
            {arrival?.time
              ? fmtTime(arrival.time)
              : arrival?.estimatedTime
                ? `≈ ${arrival.estimatedTime}`
                : '—:—'}
          </span>
          <span className={`ck-node-dot arr ${arrival?.state === 'done' ? 'done' : ''}`} />
          <span className="ck-node-label">🛬 {chain.arrivingGuestName || 'Arrivée'}</span>
        </div>
      </div>

      {/* Checklist statuts + actions : enregistrement, choix d'heure, assignation… */}
      <ChecksList steps={orderedChecks} planDate={planDate} onAction={onAction} onOpenRelances={onOpenRelances} />

      <div className="ck-flight-foot">
        {cta && attentionStep ? (
          <span className="ck-flight-reason warn">{attentionStep.attention?.reason}</span>
        ) : chain.hoursUnknown ? (
          <span className="ck-flight-reason warn">
            Heures non confirmées — marge estimée par défaut, relances client en cours.
          </span>
        ) : status === 'broken' || (cleaning && !cleaning.staffName) ? (
          <span className="ck-flight-reason warn">
            {status === 'broken'
              ? 'Chaîne sous tension — vérifier les heures et le ménage.'
              : 'Ménage sans staff — à sécuriser avant le jour J.'}
          </span>
        ) : (
          <span className="ck-flight-auto"><i>✓</i> orchestré automatiquement</span>
        )}
      </div>
    </div>
  );
}
