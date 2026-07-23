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

/** Fin ménage en HH:mm mur — priorise le champ API, sinon départ + durée (pas d'ISO local). */
function cleaningEndDisplay(
  chain: DayPlanChain,
  departureHm?: string | null,
): string {
  if (chain.expectedCleaningEndHm && /^\d{1,2}:\d{2}/.test(chain.expectedCleaningEndHm)) {
    return chain.expectedCleaningEndHm.slice(0, 5);
  }
  const start = toMin(departureHm);
  if (start != null && chain.cleaningDurationMinutes > 0) {
    const total = start + chain.cleaningDurationMinutes;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return fmtTime(chain.expectedCleaningEnd);
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

type AuditItem = {
  id: string;
  sev: 'high' | 'warn';
  icon: string;
  label: string;
  step?: DayPlanStep;
  action?: DayPlanAction;
  openPanel?: boolean;
};

/** Chip d'état de propreté du bien (source srv-listing). */
const CLEAN_CHIP: Record<string, { cls: string; txt: string }> = {
  clean: { cls: 'ok', txt: '🧼 propre' },
  dirty: { cls: 'broken', txt: '🧽 SALE' },
  in_progress: { cls: 'tight', txt: '🧹 ménage en cours' },
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
    const win = `${fmtTime(f.cleaning?.time ?? f.departure?.time)} → ${cleaningEndDisplay(f.chain, f.departure?.time ?? f.departure?.estimatedTime)}`;
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
  const [slotCtx, setSlotCtx] = useState<{
    reservationId: string;
    taskId: string;
    taskType: string;
    step?: DayPlanStep;
  } | null>(null);
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
    /* Une réservation membre d'une chaîne est déjà couverte par la checklist du turnover
       (même quand certaines de ses étapes ne portent pas de chainId, ex. enregistrement). */
    const chained = new Set<string>();
    for (const c of plan.chains ?? []) {
      chained.add(c.departingReservationId);
      chained.add(c.arrivingReservationId);
    }
    for (const s of plan.steps) {
      if (s.chainId || chained.has(s.reservationId)) continue;
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

  /* ══ Audit du jour : les problèmes à traiter, pas juste de l'affichage ══ */
  const auditItems = useMemo<AuditItem[]>(() => {
    if (!plan) return [];
    const items: AuditItem[] = [];
    const arrivalsToday = new Set(
      plan.steps.filter((s) => s.kind === 'arrival').map((s) => s.reservationId),
    );
    for (const s of plan.steps) {
      if (s.kind === 'arrival' && s.state !== 'done' && s.listingCleanliness === 'dirty') {
        items.push({
          id: `dirty:${s.id}`,
          sev: 'high',
          icon: '🧽',
          label: `Bien SALE — arrivée ${s.guestName ?? ''} · ${s.listingName}${plan.steps.some((x) => x.kind === 'cleaning' && x.listingId === s.listingId) ? '' : ' — aucun ménage planifié'}`,
          step: s,
          openPanel: Boolean(s.relances?.length),
          action: s.attention?.actions?.[0],
        });
      }
      if ((s.kind === 'departure' || s.kind === 'arrival') && s.state !== 'done' && s.hourUnknown) {
        const hm = s.estimatedTime ?? '—';
        items.push({
          id: `hour:${s.id}`,
          sev: 'warn',
          icon: '⏱',
          label: `≈ ${hm} · heure ${s.kind === 'departure' ? 'de départ' : "d'arrivée"} non confirmée — ${s.guestName ?? ''} · ${s.listingName}`,
          step: s,
          action: s.chooseTaskId
            ? { type: 'force_slot', label: 'Fixer une heure', taskId: s.chooseTaskId }
            : undefined,
          openPanel: Boolean(s.relances?.length),
        });
      }
      if (s.kind === 'cleaning' && s.state !== 'done' && !s.staffName) {
        items.push({
          id: `staff:${s.id}`,
          sev: 'warn',
          icon: '🧹',
          label: `Ménage non assigné · ${s.listingName}`,
          step: s,
          action: s.taskId ? { type: 'assign', label: 'Assigner un staff', taskId: s.taskId } : undefined,
        });
      }
      if (s.taskType === 'registration' && s.state !== 'done' && arrivalsToday.has(s.reservationId)) {
        if (s.registrationAtArrival) {
          /* Info seule — pas un point bloquant à traiter. */
          continue;
        }
        items.push({
          id: `reg:${s.id}`,
          sev: 'warn',
          icon: '📋',
          label: `Enregistrement en attente — ${s.guestName ?? ''} · ${s.listingName}`,
          step: s,
          openPanel: true,
        });
      }
    }
    for (const c of plan.chains ?? []) {
      if (c.status === 'broken' && !c.hoursUnknown) {
        items.push({
          id: `chain:${c.id}`,
          sev: 'high',
          icon: '⚠',
          label: `Chaîne de turnover cassée (${fmtDuration(c.slackMinutes)} de dépassement) · ${c.listingName}`,
        });
      }
    }
    return items.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'high' ? -1 : 1));
  }, [plan]);

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
        step,
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
      {/* ══ Toolbar : LIVE + horloge + navigation date (le titre de page est déjà au-dessus) ══ */}
      <div className="ck-topbar">
        {isToday && (
          <span className="ck-live"><i aria-hidden />LIVE</span>
        )}
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

      {/* ══ Audit du jour : problèmes à traiter, avec action directe ══ */}
      {plan && (
        <div className={`ck-audit ${auditItems.some((i) => i.sev === 'high') ? 'high' : auditItems.length ? 'warn' : 'ok'}`}>
          <div className="ck-audit-hdr">
            {auditItems.length
              ? `🚨 Audit du jour · ${auditItems.length} point${auditItems.length > 1 ? 's' : ''} à traiter`
              : '✓ Audit du jour — rien à signaler'}
          </div>
          {auditItems.map((it) => (
            <div key={it.id} className={`ck-audit-item ${it.sev}`}>
              <span className="ck-audit-ico" aria-hidden>{it.icon}</span>
              <span className="ck-audit-lbl">{it.label}</span>
              {it.step && it.openPanel && (
                <button type="button" onClick={() => setRelanceStep(it.step!)}>Détails</button>
              )}
              {it.step && it.action && (
                <button type="button" className="primary" onClick={() => runAction(it.step!, it.action!)}>
                  {it.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
              const hasProblem = g.steps.some(
                (s) =>
                  s.state === 'attention' ||
                  (s.hourUnknown && s.state !== 'done') ||
                  Boolean(s.registrationPending) ||
                  (s.kind === 'cleaning' && s.state !== 'done' && !s.staffName),
              );
              const soloClean = g.steps.find((s) => s.listingCleanliness)?.listingCleanliness;
              const soloCleanChip = soloClean ? CLEAN_CHIP[soloClean] : null;
              return (
                <div
                  key={g.reservationId}
                  className={`ck-flight ${soloClean === 'dirty' ? 'broken' : hasProblem ? 'tight needs-action' : 'ok'}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
                >
                  <div className="ck-flight-head">
                    <span className="ck-flight-name" title={g.listingName}>
                      {g.listingName}
                      {g.guestName ? ` · ${g.guestName}` : ''}
                    </span>
                    <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
                      {soloCleanChip && (
                        <span className={`ck-flight-chip ${soloCleanChip.cls}`}>{soloCleanChip.txt}</span>
                      )}
                      {hasProblem ? (
                        <span className="ck-flight-chip tight pulse">✋ décision requise</span>
                      ) : (
                        <span className="ck-flight-chip ok">✓ en ordre</span>
                      )}
                    </span>
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
        <ForceSlotPanel
          ctx={slotCtx}
          onClose={() => setSlotCtx(null)}
          onDone={() => { setSlotCtx(null); void load(); }}
        />
      )}
    </div>
  );
}

/* ─── Fixer une heure (choix admin) — même API que l'escalade, UI Cockpit ─── */

function ForceSlotPanel({
  ctx,
  onClose,
  onDone,
}: {
  ctx: { reservationId: string; taskId: string; taskType: string; step?: DayPlanStep };
  onClose: () => void;
  onDone: () => void;
}) {
  const isDeparture = ctx.taskType === 'departure_choose';
  const suggestions = isDeparture
    ? ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00']
    : ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  const [time, setTime] = useState(
    ctx.step?.time ?? ctx.step?.estimatedTime ?? (isDeparture ? '11:00' : '15:00'),
  );
  const [saving, setSaving] = useState(false);

  const sent = (ctx.step?.relances ?? []).filter((r) => r.status === 'fait').length;
  const totalRel = ctx.step?.relances?.length ?? 0;

  const submit = async () => {
    if (saving || !/^\d{2}:\d{2}$/.test(time)) return;
    setSaving(true);
    try {
      const res = await fulltaskApi.forcePlanGuestSlot(ctx.reservationId, ctx.taskId, time);
      if (res?.success === false) {
        toast.error(res?.error || 'Impossible de fixer le créneau');
        setSaving(false);
        return;
      }
      toast.success(`Heure ${isDeparture ? 'de départ' : "d'arrivée"} fixée à ${time}`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur en fixant le créneau');
      setSaving(false);
    }
  };

  return (
    <div className="ck-relpop-backdrop" onClick={onClose} role="presentation">
      <div className="ck-relpop" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Fixer une heure">
        <div className="ck-relpop-hdr">
          <span>
            🕐 Fixer l'heure {isDeparture ? 'de départ' : "d'arrivée"}
            {ctx.step?.guestName ? ` · ${ctx.step.guestName}` : ''}
          </span>
          <button type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="ck-slot-body">
          {ctx.step?.listingName && <div className="ck-slot-listing">{ctx.step.listingName}</div>}
          <div className="ck-slot-context">
            {ctx.step?.estimatedTime && (
              <span className="ck-slot-tag warn">défaut actuel ≈ {ctx.step.estimatedTime}</span>
            )}
            {totalRel > 0 && (
              <span className="ck-slot-tag">
                🔔 {sent}/{totalRel} relance{totalRel > 1 ? 's' : ''} envoyée{sent > 1 ? 's' : ''} — sans réponse
              </span>
            )}
          </div>

          <div className="ck-slots">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className={`ck-slot-chip ${time === s ? 'on' : ''}`}
                onClick={() => setTime(s)}
              >
                {s}
              </button>
            ))}
            <input
              type="time"
              className="ck-relpop-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label="Heure précise"
            />
          </div>

          <div className="ck-slot-note">
            Même effet que WhatsApp : tâche fulltask → plan (relances « choisir l’heure » clôturées) →
            résa + chatbot. Ne renvoie pas les messages de choix ; recalcule les relances
            « déclarer arrivée/départ » sur la nouvelle heure.
          </div>
        </div>

        <div className="ck-relpop-actions">
          <button type="button" className="primary" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Application…' : `✓ Valider ${time}`}
          </button>
          <button type="button" onClick={onClose}>Annuler</button>
        </div>
      </div>
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
  const [extraChannel, setExtraChannel] = useState<'whatsapp' | 'OTA' | null>(null);
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
  const canExtraRelance =
    Boolean(relanceTaskId) &&
    (step.kind === 'arrival' ||
      step.kind === 'departure' ||
      step.taskType === 'registration' ||
      step.taskType === 'arrival_choose' ||
      step.taskType === 'departure_choose' ||
      Boolean(step.relances?.length) ||
      Boolean(step.chooseTaskId));

  const sendNow = async () => {
    if (!nextPending || !relanceTaskId || sending) return;
    setSending(true);
    try {
      const res = await fulltaskApi.sendPlanRelance(step.reservationId, relanceTaskId, nextPending.index);
      if (res?.success === false) throw new Error(res?.error || 'Échec envoi');
      toast.success(`Relance « ${nextPending.label} » envoyée`);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec envoi de la relance');
      setSending(false);
    }
  };

  const sendExtra = async (channel: 'whatsapp' | 'OTA') => {
    if (!relanceTaskId || sending || extraChannel) return;
    setExtraChannel(channel);
    try {
      const res = await fulltaskApi.sendExtraPlanRelance(step.reservationId, relanceTaskId, channel);
      if (res?.success === false) throw new Error(res?.error || 'Échec envoi');
      const ch = channel === 'whatsapp' ? 'WhatsApp' : 'OTA';
      toast.success(`Relance admin envoyée via ${ch} — trace ajoutée au plan`);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec relance admin');
      setExtraChannel(null);
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
          <div className="ck-relpop-reg ck-relpop-reg-stack">
            <div className="ck-relpop-reg-title">📝 Enregistrement voyageurs</div>
            <div className="ck-relpop-reg-hint">
              Cliquez pour ouvrir le formulaire (saisie / finalisation) — le compteur reste à jour.
            </div>
            <ReservationRegistrationActions
              reservationId={step.reservationId}
              variant="button"
              deferredToArrival={step.registrationAtArrival}
              onRegistrationUpdated={() => setRegTouched(true)}
              onDeferredToArrival={() => setRegTouched(true)}
            />
          </div>
        )}

        <div className="ck-relpop-actions">
          {nextPending && relanceTaskId && (
            <button type="button" className="primary" disabled={sending || Boolean(extraChannel)} onClick={() => void sendNow()}>
              {sending ? 'Envoi…' : '📨 Relancer maintenant'}
            </button>
          )}
          {canExtraRelance && (
            <>
              <button
                type="button"
                className="primary"
                disabled={sending || Boolean(extraChannel)}
                title="Nouvelle relance WhatsApp — laisse une trace sur le plan"
                onClick={() => void sendExtra('whatsapp')}
              >
                {extraChannel === 'whatsapp' ? 'Envoi WA…' : '💬 Relancer WhatsApp'}
              </button>
              <button
                type="button"
                disabled={sending || Boolean(extraChannel)}
                title="Nouvelle relance OTA — laisse une trace sur le plan"
                onClick={() => void sendExtra('OTA')}
              >
                {extraChannel === 'OTA' ? 'Envoi OTA…' : '🏨 Relancer OTA'}
              </button>
            </>
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
  if (s.kind === 'departure') return `Départ${s.guestName ? ` · ${s.guestName}` : ''}`;
  if (s.kind === 'arrival') return `Arrivée${s.guestName ? ` · ${s.guestName}` : ''}`;
  if (s.kind === 'cleaning') return s.staffName ? `Ménage · ${s.staffName}` : 'Ménage';
  const first = (s.title || '').split('·')[0]?.trim();
  return `${first || s.kind}${s.guestName ? ` · ${s.guestName}` : ''}`;
}

/** Heure affichée en tête de ligne : choisie, ou ≈ défaut si encore inconnue. */
function checkTimeChip(s: DayPlanStep): { text: string; approx: boolean } | null {
  if (s.kind === 'departure' || s.kind === 'arrival') {
    if (s.time) return { text: s.time, approx: false };
    if (s.estimatedTime) return { text: s.estimatedTime, approx: true };
    return { text: '—:—', approx: true };
  }
  if (s.kind === 'cleaning') {
    if (s.time) return { text: s.time, approx: false };
    if (s.estimatedTime) return { text: s.estimatedTime, approx: true };
    return null;
  }
  if (s.time) return { text: s.time, approx: Boolean(s.hourUnknown) };
  return null;
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
        const hourWarn = s.hourUnknown && s.state !== 'done';
        const cleaningUnassigned =
          s.kind === 'cleaning' && s.state !== 'done' && !s.staffName;
        const regBlocking = Boolean(s.registrationPending) && s.state !== 'done';
        /* À l'arrivée = vigilance orange (non bloquant, mais à surveiller le jour J). */
        const regAtArrival =
          isRegistration && Boolean(s.registrationAtArrival) && s.state !== 'done';
        const isProblem =
          state === 'attn' || hourWarn || cleaningUnassigned || regBlocking || regAtArrival;
        const timeChip = checkTimeChip(s);
        return (
          <div
            key={s.id}
            className={`ck-check ${state} ${clickable ? 'has-rel' : ''} ${hourWarn ? 'hour-warn' : ''} ${isProblem ? 'problem' : ''} ${cleaningUnassigned ? 'staff-miss' : ''} ${regBlocking ? 'reg-block' : ''} ${regAtArrival ? 'reg-arrival' : ''}`}
            title={s.attention?.reason || (clickable ? 'Voir relances & actions' : s.title)}
            onClick={clickable ? () => onOpenRelances(s) : undefined}
          >
            <span className="ck-check-state" aria-hidden>
              {state === 'done' ? '✓' : isProblem ? '!' : '·'}
            </span>
            {timeChip && (
              <span
                className={`ck-check-time ${timeChip.approx ? 'approx bad' : 'ok'}`}
                title={timeChip.approx ? 'Heure par défaut — non confirmée' : 'Heure confirmée'}
              >
                {timeChip.approx ? `≈ ${timeChip.text}` : timeChip.text}
              </span>
            )}
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
  /* L'heure est déjà en tête (ck-check-time) — ici uniquement le statut / suite. */
  if (s.state === 'done') return 'fait';
  if (s.kind === 'cleaning') {
    const when =
      s.hourUnknown || !s.time ? 'au départ client' : 'confirmé';
    return s.staffName ? when : `non assigné · ${when}`;
  }
  if (s.kind === 'departure' || s.kind === 'arrival') {
    const parts: string[] = [];
    if (s.hourUnknown) parts.push('non confirmée');
    else parts.push('confirmée');
    if (s.registrationAtArrival) parts.push('à l’arrivée');
    else if (s.registrationPending) parts.push('enregistrement en attente');
    if (s.nextRelanceAt && s.hourUnknown) {
      parts.push(`relance ${fmtWhen(s.nextRelanceAt, planDate)}`);
    }
    return parts.join(' · ');
  }
  if (s.registrationAtArrival) return 'à l’arrivée · non bloquant';
  if (s.registrationPending) return 'enregistrement en attente';
  if (
    (s.taskType === 'receive_arrival' || s.taskType === 'receive_departure') &&
    s.checklist?.length
  ) {
    const req = s.checklist.filter((c) => c.required).length;
    const parts = [`${s.checklist.length} pts checklist`];
    if (req) parts.push(`${req} oblig.`);
    if (s.staffName) parts.push(s.staffName);
    else parts.push('non assigné');
    return parts.join(' · ');
  }
  return s.meta || 'en attente';
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
  const endHm = cleaningEndDisplay(chain, departure?.time ?? departure?.estimatedTime);
  const endM = toMin(endHm);

  const seg = (a: number | null, b: number | null): number => {
    if (a == null || b == null || b <= a) return 0;
    return Math.max(0, Math.min(1, (nowM - a) / (b - a)));
  };
  const cleanPct = seg(depM, endM) * 100;

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

  /* État de propreté du bien — visible dès l'en-tête du turnover. */
  const cleanliness =
    arrival?.listingCleanliness ?? departure?.listingCleanliness ?? undefined;
  const cleanChip = cleanliness ? CLEAN_CHIP[cleanliness] : null;
  const needsAction = Boolean(
    attentionStep ||
      (cleaning && !cleaning.staffName && cleaning.state !== 'done') ||
      (arrival && (arrival.hourUnknown || arrival.registrationPending)) ||
      (departure && departure.hourUnknown),
  );

  return (
    <div
      className={`ck-flight ${statusChip.cls} ${needsAction ? 'needs-action' : ''} ${targeted ? 'is-target' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 80}ms` }}
      data-flight={chain.id}
    >
      <div className="ck-flight-head">
        <span className="ck-flight-name" title={chain.listingName}>{chain.listingName}</span>
        <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
          {cleanChip && <span className={`ck-flight-chip ${cleanChip.cls}`}>{cleanChip.txt}</span>}
          <span className={`ck-flight-chip ${statusChip.cls}`}>{statusChip.txt}</span>
        </span>
      </div>

      {/* Piste temporelle : segments PROPORTIONNELS aux durées réelles (ménage / marge) */}
      <div className="ck-strip">
        <div className="ck-node">
          <span
            className={`ck-node-time ${departure?.time && !departure.hourUnknown ? 'ok' : 'bad'}`}
            title={
              departure?.time && !departure.hourUnknown
                ? 'Heure de départ confirmée'
                : 'Heure de départ non confirmée'
            }
          >
            {departure?.time
              ? fmtTime(departure.time)
              : departure?.estimatedTime
                ? `≈ ${departure.estimatedTime}`
                : '—:—'}
          </span>
          <span className={`ck-node-dot dep ${departure?.state === 'done' ? 'done' : ''} ${departure?.time && !departure.hourUnknown ? 'ok' : 'bad'}`} />
          <span className="ck-node-label">🛫 {chain.departingGuestName || 'Départ'}</span>
        </div>

        {/* Ménage — largeur ∝ durée */}
        <div
          className={`ck-seg clean ${cleaning?.staffName ? 'staff-ok' : 'staff-miss'}`}
          style={{ flexGrow: Math.max(chain.cleaningDurationMinutes, 45) }}
          title={
            cleaning?.staffName
              ? `Ménage assigné · ${fmtDuration(chain.cleaningDurationMinutes)}`
              : `Ménage non assigné · ${fmtDuration(chain.cleaningDurationMinutes)}`
          }
        >
          <div className="ck-seg-fill clean" style={{ width: `${chain.hoursUnknown ? 0 : cleanPct}%` }} />
          <span className={`ck-seg-label ${cleaning?.staffName ? 'ok' : 'bad'}`}>
            🧹 {cleaning?.staffName || <em>à assigner</em>} · {fmtDuration(chain.cleaningDurationMinutes)}
          </span>
        </div>

        {/* Jonction : heure de fin de ménage */}
        <div className="ck-joint">
          <span
            className={`ck-joint-time ${cleaning?.staffName && !chain.hoursUnknown ? 'ok' : chain.hoursUnknown || !cleaning?.staffName ? 'bad' : ''}`}
          >
            {chain.hoursUnknown ? `≈ ${endHm}` : endHm}
          </span>
          <span className={`ck-joint-dot ${cleaning?.staffName && !chain.hoursUnknown ? 'ok' : ''}`} />
          <span className="ck-joint-label">fin ménage</span>
        </div>

        {/* Marge — largeur ∝ durée, couleur par état */}
        <div
          className={`ck-seg margin ${chain.slackMinutes < 0 ? 'broken' : status === 'tight' || chain.hoursUnknown ? 'tight' : 'ok'}`}
          style={{ flexGrow: Math.max(Math.abs(chain.slackMinutes), 35) }}
          title={chain.slackMinutes >= 0 ? `Marge ${fmtDuration(chain.slackMinutes)}` : `Dépassement ${fmtDuration(chain.slackMinutes)}`}
        >
          <span className="ck-seg-label">
            {chain.slackMinutes >= 0
              ? `${chain.hoursUnknown ? '≈ ' : ''}+${fmtDuration(chain.slackMinutes)} de marge`
              : `⚠ −${fmtDuration(chain.slackMinutes)}`}
          </span>
        </div>

        <div className="ck-node">
          <span
            className={`ck-node-time ${arrival?.time && !arrival.hourUnknown ? 'ok' : 'bad'}`}
            title={
              arrival?.time && !arrival.hourUnknown
                ? "Heure d'arrivée confirmée"
                : "Heure d'arrivée non confirmée"
            }
          >
            {arrival?.time
              ? fmtTime(arrival.time)
              : arrival?.estimatedTime
                ? `≈ ${arrival.estimatedTime}`
                : '—:—'}
          </span>
          <span className={`ck-node-dot arr ${arrival?.state === 'done' ? 'done' : ''} ${arrival?.time && !arrival.hourUnknown ? 'ok' : 'bad'}`} />
          <span className="ck-node-label">🛬 {chain.arrivingGuestName || 'Arrivée'}</span>
          {(() => {
            const reg = checkSteps.find((s) => s.taskType === 'registration');
            if (!reg && !arrival?.registrationPending && !arrival?.registrationAtArrival) return null;
            const atArrival = Boolean(arrival?.registrationAtArrival || reg?.registrationAtArrival);
            const done = reg?.state === 'done';
            const label = done
              ? 'enregistré'
              : atArrival
                ? 'à l’arrivée · non bloquant'
                : 'enregistrement en attente';
            return (
              <span className={`ck-node-sub ${done ? 'ok' : 'warn'}`}>
                📋 {label}
              </span>
            );
          })()}
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
