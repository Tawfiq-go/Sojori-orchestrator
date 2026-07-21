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

  /** Hors chaîne : arrivées/départs du jour + toute étape qui requiert une décision. */
  const soloTraffic = useMemo(() => {
    if (!plan) return [];
    return plan.steps.filter(
      (s) => !s.chainId && (s.kind === 'arrival' || s.kind === 'departure' || s.state === 'attention'),
    );
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
          />
        ))}

        {soloTraffic.length > 0 && (
          <>
            <div className="ck-board-title solo">
              <span>Trafic hors turnover</span>
            </div>
            <div className="ck-solo">
              {soloTraffic.map((s) => (
                <div
                  key={s.id}
                  className={`ck-solo-item ${s.state}`}
                  title={s.attention?.reason || s.title}
                >
                  <span className="ck-solo-kind">{CHECK_ICON[s.kind]}</span>
                  <span className="ck-solo-time">
                    {s.time ? fmtTime(s.time) : s.kind === 'cleaning' ? 'au départ' : '—:—'}
                  </span>
                  <span className="ck-solo-name" title={s.title}>
                    {s.kind === 'arrival' || s.kind === 'departure' ? s.listingName : s.title}
                  </span>
                  {s.guestName && <span className="ck-solo-guest">{s.guestName}</span>}
                  {s.state === 'attention' && s.attention?.actions?.[0] && (
                    <button type="button" onClick={() => runAction(s, s.attention!.actions[0])}>
                      {s.attention.actions[0].label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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

function checkDetail(s: DayPlanStep): string {
  if (s.state === 'done') return s.time ? `fait · ${s.time}` : 'fait';
  /* Règle métier : le ménage démarre à l'heure de départ client. */
  if (s.kind === 'cleaning') {
    const when = s.hourUnknown || !s.time ? 'au départ client' : `prévu ${s.time}`;
    return s.staffName ? when : `non assigné · ${when}`;
  }
  if (s.hourUnknown || (!s.time && (s.kind === 'departure' || s.kind === 'arrival'))) {
    const relance = s.nextRelanceAt ? ` · relance ${fmtTime(s.nextRelanceAt)}` : '';
    return `non choisie — défaut${relance}`;
  }
  if (s.registrationPending) return 'enregistrement en attente';
  return s.time ? `prévu ${s.time}` : 'en attente';
}

function FlightRow({
  flight,
  index,
  targeted,
  onAction,
}: {
  flight: Flight;
  index: number;
  targeted: boolean;
  onAction: (step: DayPlanStep, action: DayPlanAction) => void;
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
  /* Heures non choisies : la marge est calculée sur des défauts — pas une vraie alerte. */
  const statusChip = chain.hoursUnknown
    ? { cls: 'tight', txt: '⏳ heures à confirmer' }
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
          <span className="ck-node-time">{fmtTime(departure?.time)}</span>
          <span className={`ck-node-dot dep ${departure?.state === 'done' ? 'done' : ''}`} />
          <span className="ck-node-label">🛫 {chain.departingGuestName || 'Départ'}</span>
        </div>

        <div className="ck-seg">
          <div className="ck-seg-fill clean" style={{ width: `${chain.hoursUnknown ? 0 : cleanPct}%` }} />
          <span className="ck-seg-label">
            🧹 {cleaning?.staffName || <em>à assigner</em>}
            {chain.hoursUnknown
              ? ` · au départ client (${fmtDuration(chain.cleaningDurationMinutes)})`
              : ` · fin ${fmtTime(chain.expectedCleaningEnd)}`}
          </span>
        </div>

        <div className="ck-seg gap">
          <div className="ck-seg-fill" style={{ width: `${gapPct}%` }} />
        </div>

        <div className="ck-node">
          <span className="ck-node-time">{fmtTime(arrival?.time)}</span>
          <span className={`ck-node-dot arr ${arrival?.state === 'done' ? 'done' : ''}`} />
          <span className="ck-node-label">🛬 {chain.arrivingGuestName || 'Arrivée'}</span>
        </div>
      </div>

      {/* Checklist statuts + actions : enregistrement, choix d'heure, assignation… */}
      {orderedChecks.length > 0 && (
        <div className="ck-checks">
          {orderedChecks.map((s) => {
            const action = s.attention?.actions?.[0];
            const state = s.state === 'done' ? 'done' : s.state === 'attention' ? 'attn' : 'todo';
            return (
              <div key={s.id} className={`ck-check ${state}`} title={s.attention?.reason || s.title}>
                <span className="ck-check-state" aria-hidden>
                  {state === 'done' ? '✓' : state === 'attn' ? '!' : '·'}
                </span>
                <span className="ck-check-ico" aria-hidden>{CHECK_ICON[s.kind]}</span>
                <span className="ck-check-label">{checkLabel(s)}</span>
                <span className="ck-check-detail">{checkDetail(s)}</span>
                {action && (
                  <button type="button" className="ck-check-cta" onClick={() => onAction(s, action)}>
                    {action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

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
