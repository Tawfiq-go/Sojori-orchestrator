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
  DayBriefResult,
  DayPlanAction,
  DayPlanChain,
  DayPlanResponse,
  DayPlanStep,
  DayPlanWeekDay,
} from '../../services/fulltaskApi';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { useAuth } from '../../hooks/useAuth';
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

/** Dates de séjour compactes façon OTA : « 28 juil–5 août » (nb nuits en titre). */
function fmtStay(from?: string, to?: string): string | null {
  if (!from || !to) return null;
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const d = (x: Date) => x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${d(a)}–${d(b)}`;
}

function stayNights(from?: string, to?: string): string {
  if (!from || !to) return '';
  const n = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
  return n > 0 ? `${n} nuit${n > 1 ? 's' : ''}` : '';
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
  /** Résa hors enchaînement — même carte que turnover (piste + checklist + pied). */
  solo?: boolean;
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
  /** Listing / lieu — ligne secondaire (évite un pavé illisible). */
  where?: string;
  step?: DayPlanStep;
  action?: DayPlanAction;
  openPanel?: boolean;
  /** Dernier moment pour agir, en minutes depuis minuit — null si inconnu. Tri de la file. */
  deadlineMin?: number | null;
  /** 'HH:mm' affiché à côté du compte à rebours. */
  deadlineLabel?: string;
  /** Ce qui se passe si personne n'agit — factuel, pas générique. */
  consequence?: string;
};

/** ISO ou 'HH:mm' → minutes depuis minuit (heure locale). */
function deadlineToMin(raw?: string | null): number | null {
  if (!raw) return null;
  const hm = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function minToHm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** Compte à rebours lisible vs l'heure actuelle — « dans 3 h 40 » / « dépassé de 20 min ». */
function countdownLabel(deadlineMin: number, clock: Date): { txt: string; overdue: boolean; soon: boolean } {
  const nowMin = clock.getHours() * 60 + clock.getMinutes();
  const delta = deadlineMin - nowMin;
  if (delta < 0) return { txt: `dépassé de ${fmtDuration(-delta)}`, overdue: true, soon: false };
  if (delta === 0) return { txt: 'maintenant', overdue: false, soon: true };
  return { txt: `dans ${fmtDuration(delta)}`, overdue: false, soon: delta <= 90 };
}

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

/** Salutation selon l'heure — l'icône suit le moment de la journée. */
function greetingParts(hour: number): { icon: string; hello: string } {
  if (hour < 5) return { icon: '🌙', hello: 'Bonsoir' };
  if (hour < 12) return { icon: '☀️', hello: 'Bonjour' };
  if (hour < 18) return { icon: '🌤', hello: 'Bon après-midi' };
  return { icon: '🌙', hello: 'Bonsoir' };
}

export default function AiCockpit() {
  const navigate = useNavigate();
  /** ⚠️ Multi-tenant : toute donnée affichée/envoyée à l'IA est scopée owner. */
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const { user } = useAuth();
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
  /** Déclaration départ/arrivée — choix heure now ou passée. */
  const [declareCtx, setDeclareCtx] = useState<{
    step: DayPlanStep;
    kind: 'arrival' | 'departure';
  } | null>(null);
  /** Étape dont on inspecte les relances (panneau détail + actions). */
  const [relanceStep, setRelanceStep] = useState<DayPlanStep | null>(null);
  const [brief, setBrief] = useState<DayBriefResult | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  /** Radar J+7 — résumé par date (décisions, turnovers serrés) pour badger les boutons de jours. */
  const [week, setWeek] = useState<DayPlanWeekDay[] | null>(null);
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

  /* Brief IA — 1 fetch par date (le backend cache 10 min par owner/date et
     invalide sur changement du plan) ; bouton ↻ dans le bloc pour forcer. */
  const loadBrief = useCallback(async () => {
    if (!scopeFetchReady) return;
    setBriefLoading(true);
    try {
      setBrief(await fulltaskApi.getDayPlanBrief(date, requestOwnerId));
    } catch {
      setBrief(null);
    } finally {
      setBriefLoading(false);
    }
  }, [date, scopeFetchReady, requestOwnerId]);

  useEffect(() => {
    setBrief(null);
    void loadBrief();
  }, [loadBrief]);

  /* Radar J+7 — un fetch au montage (et par changement de scope), refresh toutes les 5 min. */
  useEffect(() => {
    if (!scopeFetchReady) return undefined;
    let alive = true;
    const fetchWeek = async () => {
      try {
        const res = await fulltaskApi.getDayPlanWeek(toIso(new Date()), 8, requestOwnerId);
        if (alive && res.success) setWeek(res.days);
      } catch {
        /* radar silencieux — le cockpit reste utilisable sans */
      }
    };
    void fetchWeek();
    const t = setInterval(() => void fetchWeek(), 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [scopeFetchReady, requestOwnerId]);

  const weekByDate = useMemo(() => {
    const m = new Map<string, DayPlanWeekDay>();
    for (const d of week ?? []) m.set(d.date, d);
    return m;
  }, [week]);

  /** Niveau de risque d'un jour pour le radar — pilote badge + couleur. */
  const dayRisk = useCallback(
    (iso: string): { count: number; level: 'high' | 'warn' | null } => {
      const d = weekByDate.get(iso);
      if (!d) return { count: 0, level: null };
      if (d.stats.attention > 0) return { count: d.stats.attention, level: 'high' };
      if (d.fragility.tightChains > 0 || d.fragility.label === 'tendue') {
        return { count: d.fragility.tightChains || d.stats.turnovers, level: 'warn' };
      }
      return { count: 0, level: null };
    },
    [weekByDate],
  );

  /* Prochaine tension — première journée à risque après aujourd'hui (bloc jour calme). */
  const nextTension = useMemo(() => {
    if (!week) return null;
    const today = toIso(new Date());
    for (const d of week) {
      if (d.date <= today) continue;
      const risk =
        d.stats.attention > 0 || d.fragility.tightChains > 0 || d.fragility.label === 'tendue';
      if (risk) return d;
    }
    return null;
  }, [week]);

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

  /**
   * Hors chaîne → mêmes Flight que les turnovers (piste heures + checklist + pied).
   * Une résa déjà dans une chaîne n'apparaît pas ici.
   */
  const soloFlights = useMemo<Flight[]>(() => {
    if (!plan) return [];
    const map = new Map<
      string,
      { reservationId: string; listingName: string; guestName?: string; listingId: string; steps: DayPlanStep[] }
    >();
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
        {
          reservationId: s.reservationId,
          listingName: s.listingName,
          guestName: s.guestName,
          listingId: s.listingId,
          steps: [],
        };
      if (!g.guestName && s.guestName) g.guestName = s.guestName;
      g.steps.push(s);
      map.set(s.reservationId, g);
    }
    const rank = (s: DayPlanStep) =>
      s.kind === 'departure' ? 0 : s.kind === 'arrival' ? 1 : s.kind === 'cleaning' ? 2 : s.kind === 'task' ? 3 : 4;
    const out: Flight[] = [];
    for (const g of map.values()) {
      g.steps.sort((a, b) => rank(a) - rank(b) || String(a.time || '').localeCompare(String(b.time || '')));
      const departure = g.steps.find((s) => s.kind === 'departure');
      const arrival = g.steps.find((s) => s.kind === 'arrival');
      const cleaning = g.steps.find((s) => s.kind === 'cleaning');
      const attentionStep = g.steps.find((s) => s.state === 'attention');
      const hoursUnknown = Boolean(departure?.hourUnknown || arrival?.hourUnknown);
      const needsAction = g.steps.some(
        (s) =>
          s.state === 'attention' ||
          (s.hourUnknown && s.state !== 'done') ||
          Boolean(s.registrationPending) ||
          (s.kind === 'cleaning' && s.state !== 'done' && !s.staffName),
      );
      out.push({
        solo: true,
        chain: {
          id: `solo:${g.reservationId}`,
          listingId: g.listingId,
          listingName: g.listingName,
          departingReservationId: departure?.reservationId || '',
          arrivingReservationId: arrival?.reservationId || g.reservationId,
          departingGuestName: departure?.guestName,
          arrivingGuestName: arrival?.guestName || g.guestName,
          slackMinutes: 0,
          status: needsAction ? 'tight' : 'ok',
          cleaningDurationMinutes: 0,
          expectedCleaningEnd: '',
          hoursUnknown,
        },
        departure,
        cleaning,
        arrival,
        attentionStep,
        checkSteps: g.steps,
      });
    }
    return out;
  }, [plan]);

  const targets = useMemo(() => new Set(reply?.targets ?? []), [reply]);

  /* ══ File de décisions : SOURCE UNIQUE de vérité pour le bandeau d'audit ET les
     chips « décision requise » des lignes. Chaque item porte deadline + conséquence ;
     tri par temps restant. Un step en state='attention' non couvert par une règle
     dédiée entre par la règle générique — le bandeau ne peut jamais être vert
     pendant qu'une ligne réclame une décision. ══ */
  const auditItems = useMemo<AuditItem[]>(() => {
    if (!plan) return [];
    const items: AuditItem[] = [];
    const covered = new Set<string>();
    const arrivalsToday = new Set(
      plan.steps.filter((s) => s.kind === 'arrival').map((s) => s.reservationId),
    );
    /** Arrivée non terminée sur un listing — pour dater les deadlines de ménage. */
    const arrivalByListing = new Map<string, DayPlanStep>();
    for (const s of plan.steps) {
      if (s.kind === 'arrival' && s.state !== 'done' && !arrivalByListing.has(s.listingId)) {
        arrivalByListing.set(s.listingId, s);
      }
    }
    const stepHm = (s?: DayPlanStep): string | undefined => s?.time ?? s?.estimatedTime ?? undefined;

    for (const s of plan.steps) {
      if (s.kind === 'arrival' && s.state !== 'done' && s.listingCleanliness === 'dirty') {
        covered.add(s.id);
        const hm = stepHm(s);
        const noCleaning = !plan.steps.some((x) => x.kind === 'cleaning' && x.listingId === s.listingId);
        items.push({
          id: `dirty:${s.id}`,
          sev: 'high',
          icon: '🧽',
          label: `Bien SALE — arrivée ${s.guestName ?? ''} · ${s.listingName}${noCleaning ? ' — aucun ménage planifié' : ''}`,
          consequence: `${s.guestName ?? 'Le client'} arrive ${s.hourUnknown ? `vers ${hm ?? '15:00'} (heure non confirmée)` : `à ${hm ?? '—'}`} sur un bien sale${noCleaning ? " et aucun ménage n'est planifié pour le rattraper" : ''}.`,
          deadlineMin: deadlineToMin(hm),
          deadlineLabel: hm,
          step: s,
          openPanel: Boolean(s.relances?.length),
          action: s.attention?.actions?.[0],
        });
      }
      if ((s.kind === 'departure' || s.kind === 'arrival') && s.state !== 'done' && s.hourUnknown) {
        covered.add(s.id);
        const hm = s.estimatedTime ?? '—';
        items.push({
          id: `hour:${s.id}`,
          sev: 'warn',
          icon: '⏱',
          label: `≈ ${hm} · heure ${s.kind === 'departure' ? 'de départ' : "d'arrivée"} non confirmée — ${s.guestName ?? ''} · ${s.listingName}`,
          consequence: `Le planning (ménage, turnover) est calé sur une heure par défaut — si le client ${s.kind === 'departure' ? 'part plus tard' : 'arrive plus tôt'}, la journée casse sans prévenir.`,
          deadlineMin: deadlineToMin(s.attention?.deadline ?? s.estimatedTime),
          deadlineLabel: s.estimatedTime,
          step: s,
          action: s.chooseTaskId
            ? { type: 'force_slot', label: 'Fixer une heure', taskId: s.chooseTaskId }
            : undefined,
          openPanel: Boolean(s.relances?.length),
        });
      }
      if (s.kind === 'cleaning' && s.state !== 'done' && !s.staffName) {
        covered.add(s.id);
        const arr = arrivalByListing.get(s.listingId);
        const arrHm = stepHm(arr);
        items.push({
          id: `staff:${s.id}`,
          sev: arr ? 'high' : 'warn',
          icon: '🧹',
          label: `Ménage non assigné · ${s.listingName}`,
          consequence: arr
            ? `Sans staff assigné, le ménage ne sera pas fait avant l'arrivée de ${arr.guestName ?? 'du prochain client'}${arrHm ? ` à ${arrHm}` : ''}.`
            : `Sans staff assigné, le ménage de ${s.listingName} ne sera pas fait aujourd'hui.`,
          deadlineMin: deadlineToMin(s.attention?.deadline ?? arrHm ?? s.time),
          deadlineLabel: arrHm ?? s.time ?? undefined,
          step: s,
          action: s.taskId ? { type: 'assign', label: 'Assigner un staff', taskId: s.taskId } : undefined,
        });
      }
      if (s.taskType === 'registration' && s.state !== 'done' && arrivalsToday.has(s.reservationId)) {
        if (s.registrationAtArrival) {
          /* Info seule — pas un point bloquant à traiter. */
          continue;
        }
        covered.add(s.id);
        const arrHm = stepHm(plan.steps.find((x) => x.kind === 'arrival' && x.reservationId === s.reservationId));
        items.push({
          id: `reg:${s.id}`,
          sev: 'warn',
          icon: '📋',
          label: `Enregistrement en attente — ${s.guestName ?? ''} · ${s.listingName}`,
          consequence: `Sans enregistrement voyageurs, les codes d'accès restent bloqués pour l'arrivée${arrHm ? ` de ${arrHm}` : ''}.`,
          deadlineMin: deadlineToMin(arrHm),
          deadlineLabel: arrHm,
          step: s,
          openPanel: true,
        });
      }
    }
    for (const c of plan.chains ?? []) {
      if (c.status === 'broken' && !c.hoursUnknown) {
        /* Arrivée = fin de ménage prévue + marge (négative sur une chaîne cassée). */
        const endMin = deadlineToMin(c.expectedCleaningEnd);
        const arrMin = endMin != null ? endMin + c.slackMinutes : null;
        items.push({
          id: `chain:${c.id}`,
          sev: 'high',
          icon: '⚠',
          label: `Chaîne de turnover cassée (${fmtDuration(c.slackMinutes)} de dépassement) · ${c.listingName}`,
          consequence: `Le ménage finira vers ${c.expectedCleaningEnd || '—'} — après l'arrivée de ${c.arrivingGuestName ?? 'du client'}${arrMin != null ? ` prévue à ${minToHm(arrMin)}` : ''}.`,
          deadlineMin: arrMin,
          deadlineLabel: arrMin != null ? minToHm(arrMin) : undefined,
        });
      }
    }
    /* Règle générique : toute décision requise (state='attention') non couverte ci-dessus.
       C'est elle qui garantit bandeau ⇔ chips cohérents (ex. « assignation bloquée »). */
    for (const s of plan.steps) {
      if (s.state !== 'attention' || covered.has(s.id)) continue;
      const attnMin = deadlineToMin(s.attention?.deadline ?? stepHm(s));
      items.push({
        id: `attn:${s.id}`,
        sev: 'high',
        icon: s.kind === 'message' ? '💬' : '✋',
        label: s.attention?.reason ?? s.title,
        where: s.listingName,
        consequence:
          s.kind === 'message'
            ? `Message client non parti${s.time ? ` (prévu ${s.time})` : ''} — ${s.guestName ?? 'le client'} ne l'a pas reçu.`
            : s.attention?.attempted
              ? `Auto épuisée · ${s.attention.attempted} — action humaine requise.`
              : `Action humaine requise.`,
        deadlineMin: attnMin,
        deadlineLabel: attnMin != null ? minToHm(attnMin) : undefined,
        step: s,
        action: s.attention?.actions?.[0],
        openPanel: Boolean(s.relances?.length),
      });
    }
    /* Tri par temps restant : dépassé/imminent d'abord, deadline inconnue en dernier ;
       sévérité en départage. */
    return items.sort((a, b) => {
      const da = a.deadlineMin ?? Number.POSITIVE_INFINITY;
      const db = b.deadlineMin ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.sev === b.sev ? 0 : a.sev === 'high' ? -1 : 1;
    });
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

  /* Déclarations constatées : popup heure (maintenant ou passée), jamais sans HH. */
  const declareGuest = useCallback((step: DayPlanStep, kind: 'arrival' | 'departure') => {
    setDeclareCtx({ step, kind });
  }, []);

  const setCleanStatus = useCallback(
    async (step: DayPlanStep, status: 'doing' | 'done') => {
      if (!step.taskId) return;
      try {
        await fulltaskApi.patchTaskStatus(step.taskId, status);
        toast.success(status === 'done' ? 'Ménage terminé ✓' : 'Ménage démarré');
        void load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Échec de la mise à jour du ménage');
      }
    },
    [load],
  );

  /** Minutes actuelles (mur local) — retards calculés uniquement sur le jour courant. */
  const nowMin = isToday ? clock.getHours() * 60 + clock.getMinutes() : null;

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
  /* Même source que le bandeau d'audit et les chips — jamais de KPI contradictoire. */
  const kAttn = useCountUp(auditItems.length);

  const dayPct = isToday
    ? Math.min(100, ((clock.getHours() * 60 + clock.getMinutes()) / 1440) * 100)
    : date < toIso(new Date()) ? 100 : 0;

  const greet = greetingParts(clock.getHours());
  const firstName = (user?.firstName ?? '').trim();
  const greetName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';
  const greetSub = !plan
    ? 'On compile ta journée…'
    : auditItems.length > 0
      ? `${auditItems.length} décision${auditItems.length > 1 ? 's' : ''} t'attend${auditItems.length > 1 ? 'ent' : ''} — la plus urgente d'abord.`
      : (stats?.turnovers ?? 0) > 0
        ? `${stats?.turnovers} turnover${(stats?.turnovers ?? 0) > 1 ? 's' : ''} au programme — tout roule pour l'instant.`
        : 'Journée calme devant toi — rien ne réclame ta décision.';

  return (
    <div className="ck-root">
      {/* ══ Accueil personnalisé — salutation selon l'heure + état de la journée ══ */}
      <div className="ck-greeting">
        <span className="ck-greeting-hello">
          {greet.icon} {greet.hello}
          {greetName ? ` ${greetName}` : ''}
        </span>
        <span className="ck-greeting-sub">{greetSub}</span>
      </div>

      {/* ══ Toolbar : LIVE + horloge + navigation date (le titre de page est déjà au-dessus) ══ */}
      <div className="ck-topbar">
        {isToday && (
          <span className="ck-live"><i aria-hidden />LIVE</span>
        )}
        <div className="ck-clock" aria-label="Heure actuelle">
          {clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        {/* Navigation rapide : Aujourd'hui → J+7 sans passer par le calendrier */}
        <div className="ck-quickdays">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => {
            const iso = addDaysIso(toIso(new Date()), d);
            const label = d === 0 ? "Aujourd'hui" : `J+${d}`;
            const risk = dayRisk(iso);
            const wd = weekByDate.get(iso);
            const title = wd
              ? `${frDate(iso)} — ${wd.stats.attention} décision(s), ${wd.stats.turnovers} turnover(s)${wd.fragility.tightChains ? `, ${wd.fragility.tightChains} serré(s)` : ''}`
              : frDate(iso);
            return (
              <button
                key={d}
                type="button"
                className={`${date === iso ? 'on' : ''}${risk.level ? ` risk-${risk.level}` : ''}`}
                title={title}
                onClick={() => setDate(iso)}
              >
                {label}
                {risk.level && risk.count > 0 && (
                  <span className={`ck-day-badge ${risk.level}`}>{risk.count}</span>
                )}
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

      {/* ══ File de décisions : source unique bandeau + chips, triée par temps restant ══ */}
      {plan && (
        <div className={`ck-audit ${auditItems.some((i) => i.sev === 'high') ? 'high' : auditItems.length ? 'warn' : 'ok'}`}>
          <div className="ck-audit-hdr">
            {auditItems.length
              ? `🚨 ${auditItems.length} décision${auditItems.length > 1 ? 's' : ''} — urgence`
              : '✓ Aucune décision en attente'}
          </div>
          {auditItems.map((it) => {
            const cd = isToday && it.deadlineMin != null ? countdownLabel(it.deadlineMin, clock) : null;
            return (
              <div key={it.id} className={`ck-audit-item ${it.sev}`}>
                <span className="ck-audit-ico" aria-hidden>{it.icon}</span>
                <div className="ck-audit-main">
                  <div className="ck-audit-top">
                    {cd ? (
                      <span className={`ck-audit-count ${cd.overdue ? 'overdue' : cd.soon ? 'soon' : ''}`}>
                        ⏳ {cd.txt}
                        {it.deadlineLabel ? ` · ${it.deadlineLabel}` : ''}
                      </span>
                    ) : it.deadlineLabel ? (
                      <span className="ck-audit-count">🕐 {it.deadlineLabel}</span>
                    ) : null}
                  </div>
                  <span className="ck-audit-lbl">{it.label}</span>
                  {it.where ? <span className="ck-audit-where" title={it.where}>{it.where}</span> : null}
                  {it.consequence && <div className="ck-audit-consequence">{it.consequence}</div>}
                </div>
                {it.step && it.openPanel && (
                  <button type="button" onClick={() => setRelanceStep(it.step!)}>Détails</button>
                )}
                {it.step && it.action && (
                  <button type="button" className="primary" onClick={() => runAction(it.step!, it.action!)}>
                    {it.action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ Jour calme → météo devant : la prochaine journée à risque du radar J+7 ══ */}
      {plan && auditItems.length === 0 && (stats?.turnovers ?? 0) === 0 && nextTension && (
        <div className="ck-next-tension">
          <span className="ck-next-tension-ico" aria-hidden>🌤</span>
          <span className="ck-next-tension-txt">
            Journée calme. <b>Prochaine tension : {frDate(nextTension.date)}</b> —{' '}
            {nextTension.stats.attention > 0 && `${nextTension.stats.attention} décision${nextTension.stats.attention > 1 ? 's' : ''} à préparer`}
            {nextTension.stats.attention > 0 && (nextTension.stats.turnovers > 0 || nextTension.fragility.tightChains > 0) && ', '}
            {nextTension.stats.turnovers > 0 && `${nextTension.stats.turnovers} turnover${nextTension.stats.turnovers > 1 ? 's' : ''}`}
            {nextTension.fragility.tightChains > 0 && ` dont ${nextTension.fragility.tightChains} serré${nextTension.fragility.tightChains > 1 ? 's' : ''}`}
            .
          </span>
          <button type="button" onClick={() => setDate(nextTension.date)}>
            Voir ce jour →
          </button>
        </div>
      )}

      {/* ══ Brief de l'orchestrateur — l'IA lit le plan et priorise les décisions ══ */}
      {plan && (briefLoading || brief?.success) && (
        <div className="ck-brief">
          <div className="ck-brief-hdr">
            <span>🧠 Lecture de l'orchestrateur</span>
            {brief?.model && <span className="ck-brief-model">{brief.model}{brief.cached ? ' · cache' : ''}</span>}
            <button
              type="button"
              className="ck-brief-refresh"
              onClick={() => void loadBrief()}
              disabled={briefLoading}
              aria-label="Rafraîchir le brief"
            >
              ↻
            </button>
          </div>
          {briefLoading && !brief ? (
            <div className="ck-brief-loading">Analyse du plan…</div>
          ) : (
            <>
              {brief?.brief && <p className="ck-brief-text">{brief.brief}</p>}
              {(brief?.decisions ?? []).map((d, i) => (
                <div key={`${d.stepId ?? i}`} className={`ck-brief-decision ${d.severity}`}>
                  <span className="ck-brief-sev">
                    {d.severity === 'critical' ? '🔴' : d.severity === 'important' ? '🟠' : '🔵'}
                    {d.deadline ? ` avant ${d.deadline}` : ''}
                  </span>
                  <div>
                    <div className="ck-brief-dtitle">{d.title}</div>
                    {d.consequence && <div className="ck-brief-dconsequence">{d.consequence}</div>}
                    {d.recommendation && <div className="ck-brief-dreco">→ {d.recommendation}</div>}
                  </div>
                </div>
              ))}
              {(brief?.risks?.length ?? 0) > 0 && (
                <div className="ck-brief-risks">
                  <div className="ck-brief-risks-hdr">
                    👁 Vert théorique — à surveiller (planifié, pas encore constaté)
                  </div>
                  {(brief?.risks ?? []).map((r, i) => (
                    <div key={i} className="ck-brief-risk">
                      <span className="ck-brief-risk-watch">
                        {r.watchAt ? `dès ${r.watchAt}` : 'en continu'}
                      </span>
                      <div>
                        <div className="ck-brief-risk-title">{r.title}</div>
                        <div className="ck-brief-risk-signal">✓ au vert quand : {r.signal}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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
            nowMin={nowMin}
            onDeclare={declareGuest}
            onCleanStatus={setCleanStatus}
          />
        ))}

        {soloFlights.length > 0 && (
          <>
            <div className="ck-board-title solo">
              <span>Hors turnover · par réservation</span>
              <span className="ck-board-hint">même piste (heures) + checklist + actions que les turnovers</span>
            </div>
            {soloFlights.map((f, i) => (
              <FlightRow
                key={f.chain.id}
                flight={f}
                index={i}
                targeted={targets.has(f.chain.id)}
                onAction={runAction}
                planDate={date}
                onOpenRelances={setRelanceStep}
                nowMin={nowMin}
                onDeclare={declareGuest}
                onCleanStatus={setCleanStatus}
              />
            ))}
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
      {declareCtx && (
        <DeclareTimePanel
          ctx={declareCtx}
          onClose={() => setDeclareCtx(null)}
          onDone={() => { setDeclareCtx(null); void load(); }}
        />
      )}
    </div>
  );
}

/* ─── Fixer une heure (choix admin) — même API que l'escalade, UI Cockpit ─── */

/** Heures : maintenant + heures passées du jour (si 13h → 13, 12, 11…). */
function declareHourOptions(now = new Date()): { hour: number; label: string; isNow: boolean }[] {
  const h = now.getHours();
  const out: { hour: number; label: string; isNow: boolean }[] = [
    { hour: h, label: `Maintenant · ${String(h).padStart(2, '0')}:00`, isNow: true },
  ];
  for (let i = 1; i <= Math.min(8, h); i++) {
    const hh = h - i;
    out.push({
      hour: hh,
      label: `${String(hh).padStart(2, '0')}:00`,
      isNow: false,
    });
  }
  return out;
}

function DeclareTimePanel({
  ctx,
  onClose,
  onDone,
}: {
  ctx: { step: DayPlanStep; kind: 'arrival' | 'departure' };
  onClose: () => void;
  onDone: () => void;
}) {
  const options = useMemo(() => declareHourOptions(new Date()), []);
  const [hour, setHour] = useState(options[0]?.hour ?? new Date().getHours());
  const [saving, setSaving] = useState(false);
  const isDeparture = ctx.kind === 'departure';

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const fn = isDeparture ? fulltaskApi.declareGuestDeparture : fulltaskApi.declareGuestArrival;
      const res = await fn(ctx.step.reservationId, hour);
      if (res?.success === false) throw new Error(res?.error || 'Échec de la déclaration');
      const hm = `${String(hour).padStart(2, '0')}:00`;
      toast.success(
        isDeparture
          ? `Départ constaté · ${hm} — ${ctx.step.guestName ?? 'client'} parti`
          : `Arrivée constatée · ${hm} — ${ctx.step.guestName ?? 'client'} sur place`,
      );
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la déclaration');
      setSaving(false);
    }
  };

  return (
    <div className="ck-relpop-backdrop" onClick={onClose} role="presentation">
      <div
        className="ck-relpop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={isDeparture ? 'Déclarer le départ' : "Déclarer l'arrivée"}
      >
        <div className="ck-relpop-hdr">
          <span>
            {isDeparture ? '✓ Déclarer départ' : '✓ Déclarer arrivée'}
            {ctx.step.guestName ? ` · ${ctx.step.guestName}` : ''}
          </span>
          <button type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="ck-slot-body">
          {ctx.step.listingName && <div className="ck-slot-listing">{ctx.step.listingName}</div>}
          <div className="ck-slot-context">
            <span className="ck-slot-tag">Heure constatée — maintenant ou passée (pas d’heure future)</span>
          </div>
          <div className="ck-slots">
            {options.map((o) => (
              <button
                key={o.hour}
                type="button"
                className={`ck-slot-chip ${hour === o.hour ? 'on' : ''}${o.isNow ? ' now' : ''}`}
                onClick={() => setHour(o.hour)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ck-relpop-actions">
          <button type="button" className="ck-relpop-send" disabled={saving} onClick={() => void submit()}>
            {saving ? '…' : `Confirmer · ${String(hour).padStart(2, '0')}:00`}
          </button>
          <button type="button" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

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

const INTENTIONAL_SKIP_REASONS = new Set([
  'regroupe_veille_depart',
  'reporte_avant_arrivee',
  'decale_collision_arrivee',
  'date_passee_creation',
  'no_body',
  'remplace_par_lm',
]);

function intentionalSkipLabel(reason?: string): string {
  switch (reason) {
    case 'regroupe_veille_depart':
      return 'sautée exprès · regroupée veille départ';
    case 'reporte_avant_arrivee':
      return 'reportée exprès · avant arrivée';
    case 'decale_collision_arrivee':
      return 'décalée exprès · collision arrivée';
    case 'date_passee_creation':
      return 'sautée exprès · date passée à la création';
    case 'remplace_par_lm':
      return 'sautée exprès · remplacée last-minute';
    case 'no_body':
      return 'sautée exprès · contenu manquant';
    default:
      return reason ? `sautée exprès · ${reason}` : 'sautée exprès';
  }
}

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
            const intentional =
              r.intentionalSkip === true ||
              (r.reason != null && INTENTIONAL_SKIP_REASONS.has(r.reason));
            const st =
              r.status === 'saute' && intentional
                ? { ico: '⏭', label: intentionalSkipLabel(r.reason), cls: 'skip intentional' }
                : (RELANCE_STATUS[r.status] ?? RELANCE_STATUS.en_attente);
            return (
              <div key={r.index} className={`ck-relpop-item ${st.cls}`}>
                <span className="ck-relpop-ico" aria-hidden>{st.ico}</span>
                <span className="ck-relpop-lbl">{r.label}</span>
                <span className="ck-relpop-when">
                  {st.label}{' '}
                  {fmtWhen(r.status === 'fait' && r.sentAt ? r.sentAt : r.scheduledAt, planDate)}
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
  const guest = s.guestName ? ` · ${s.guestName}` : '';
  /* Distinguer clairement « choisir l'heure » (souvent encore orange) vs enregistrement (peut être vert). */
  if (s.kind === 'departure') {
    if (s.hourUnknown && s.state !== 'done') return `Choisir départ${guest}`;
    return `Départ${guest}`;
  }
  if (s.kind === 'arrival') {
    if (s.hourUnknown && s.state !== 'done') return `Choisir arrivée${guest}`;
    return `Arrivée${guest}`;
  }
  if (s.kind === 'cleaning') return s.staffName ? `Ménage · ${s.staffName}` : 'Ménage';
  if (s.taskType === 'registration') return `Enregistrement${guest}`;
  const first = (s.title || '').split('·')[0]?.trim();
  return `${first || s.kind}${guest}`;
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
  nowMin,
  onDeclare,
  onCleanStatus,
}: {
  steps: DayPlanStep[];
  planDate: string;
  onAction: (step: DayPlanStep, action: DayPlanAction) => void;
  onOpenRelances: (step: DayPlanStep) => void;
  /** Minutes depuis minuit si on regarde AUJOURD'HUI — null sinon (pas de retard sur le futur/passé). */
  nowMin?: number | null;
  onDeclare?: (step: DayPlanStep, kind: 'arrival' | 'departure') => void;
  onCleanStatus?: (step: DayPlanStep, status: 'doing' | 'done') => void;
}) {
  if (!steps.length) return null;
  /* L'ordre est décidé par l'appelant (FlightRow) : événement client → son accueil →
     ménage → le reste. Ne pas re-trier ici. */
  return (
    <div className="ck-checks">
      {steps.map((s) => {
        const action = s.attention?.actions?.[0];
        const state = s.state === 'done' ? 'done' : s.state === 'attention' ? 'attn' : 'todo';
        /* Info client (départ/arrivée/message = tâche invisible, aucun staff) vs
           tâche staff (accueil, ménage…) — deux natures, deux styles. */
        const isGuestInfo = s.kind === 'departure' || s.kind === 'arrival' || s.kind === 'message' || s.kind === 'relance';
        const isRegistration = s.taskType === 'registration';
        const isCleaningTask = s.kind === 'cleaning' && Boolean(s.taskId);
        const clickable = Boolean(s.relances?.length) || isRegistration || isCleaningTask;
        const hourWarn = s.hourUnknown && s.state !== 'done';
        const cleaningUnassigned =
          s.kind === 'cleaning' && s.state !== 'done' && !s.staffName;
        const regBlocking = Boolean(s.registrationPending) && s.state !== 'done';
        /* Heure confirmée dépassée (+20 min de grâce) sans déclaration/constat → orange :
           c'est le « vert théorique » qui vient d'expirer. */
        const stepMin = toMin(s.time ?? undefined);
        const lateNotDone =
          nowMin != null &&
          s.state !== 'done' &&
          !s.hourUnknown &&
          stepMin != null &&
          nowMin > stepMin + 20 &&
          (s.kind === 'departure' || s.kind === 'arrival' || s.kind === 'cleaning');
        /* À l'arrivée = vigilance orange (non bloquant, mais à surveiller le jour J). */
        const regAtArrival =
          isRegistration && Boolean(s.registrationAtArrival) && s.state !== 'done';
        const isProblem =
          state === 'attn' || hourWarn || cleaningUnassigned || regBlocking || regAtArrival || lateNotDone;
        const timeChip = checkTimeChip(s);
        /* Boutons de déclaration — le staff/PM constate quand le client ou le terrain ne le fait pas. */
        const canDeclare =
          s.state !== 'done' && (s.kind === 'departure' || s.kind === 'arrival') && onDeclare;
        const canCleanAct = s.state !== 'done' && s.kind === 'cleaning' && Boolean(s.taskId) && onCleanStatus;
        return (
          <div
            key={s.id}
            className={`ck-check ${state} ${clickable ? 'has-rel' : ''} ${hourWarn ? 'hour-warn' : ''} ${isProblem ? 'problem' : ''} ${cleaningUnassigned ? 'staff-miss' : ''} ${regBlocking ? 'reg-block' : ''} ${regAtArrival ? 'reg-arrival' : ''} ${isGuestInfo ? 'guest-info' : 'staff-task'} ${lateNotDone ? 'late' : ''}`}
            title={s.attention?.reason || (clickable ? 'Voir relances & actions' : s.title)}
            onClick={clickable ? () => onOpenRelances(s) : undefined}
          >
            <span className="ck-check-state" aria-hidden>
              {state === 'done' ? '✓' : isProblem ? '!' : '·'}
            </span>
            <span
              className={`ck-check-nature ${isGuestInfo ? 'client' : 'staff'}`}
              title={isGuestInfo ? 'Info client — tâche invisible, aucun staff à mobiliser' : 'Tâche staff — quelqu’un doit la faire'}
            >
              {isGuestInfo ? 'client' : 'staff'}
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
            {canDeclare && (
              <button
                type="button"
                className={`ck-check-mini ${lateNotDone ? 'urgent' : ''}`}
                title={
                  s.kind === 'departure'
                    ? 'Déclarer le départ constaté — si le client ne le fait pas, le PM le fait'
                    : 'Déclarer l’arrivée constatée — si le client ne le fait pas, le PM le fait'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onDeclare!(s, s.kind as 'arrival' | 'departure');
                }}
              >
                {s.kind === 'departure' ? '✓ Déclarer départ' : '✓ Déclarer arrivée'}
              </button>
            )}
            {canCleanAct && s.taskStatus !== 'doing' && (
              <button
                type="button"
                className="ck-check-mini"
                title="Marquer le ménage commencé"
                onClick={(e) => {
                  e.stopPropagation();
                  onCleanStatus!(s, 'doing');
                }}
              >
                ▶ Début
              </button>
            )}
            {canCleanAct && (
              <button
                type="button"
                className={`ck-check-mini ${lateNotDone ? 'urgent' : ''}`}
                title="Marquer le ménage terminé — utilisable directement même sans « Début »"
                onClick={(e) => {
                  e.stopPropagation();
                  onCleanStatus!(s, 'done');
                }}
              >
                ✓ Fin
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function checkDetail(s: DayPlanStep, planDate?: string): string {
  /* L'heure est déjà en tête (ck-check-time) — ici uniquement le statut / suite.
     Deux étages : heure CONFIRMÉE (intention client) ≠ départ/arrivée DÉCLARÉ (fait).
     Idem ménage : accepté ≠ commencé ≠ fini. On éduque à déclarer. */
  if (s.state === 'done') {
    if (s.kind === 'departure') return 'parti ✓';
    if (s.kind === 'arrival') return 'arrivé ✓';
    return 'fait';
  }
  if (s.kind === 'cleaning') {
    if (!s.staffName) return 'non assigné';
    if (s.taskStatus === 'doing') return 'en cours 🧹';
    return s.hourUnknown || !s.time ? 'au départ client' : 'pas encore commencé';
  }
  if (s.kind === 'departure' || s.kind === 'arrival') {
    const parts: string[] = [];
    if (s.hourUnknown) parts.push('non confirmée');
    else parts.push(s.kind === 'departure' ? 'pas encore parti' : 'pas encore arrivé');
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

function hourNode(
  step: DayPlanStep | undefined,
  kind: 'dep' | 'arr',
  label: string,
) {
  const confirmed = Boolean(step?.time && !step.hourUnknown);
  const hm = step?.time
    ? fmtTime(step.time)
    : step?.estimatedTime
      ? `≈ ${step.estimatedTime}`
      : '—:—';
  return (
    <div className="ck-node">
      <span
        className={`ck-node-time ${confirmed ? 'ok' : 'bad'}`}
        title={
          confirmed
            ? kind === 'dep'
              ? 'Heure de départ confirmée (guest a choisi)'
              : "Heure d'arrivée confirmée (guest a choisi)"
            : kind === 'dep'
              ? 'Heure de départ non confirmée — défaut Sojori, relances en cours'
              : "Heure d'arrivée non confirmée — défaut Sojori, relances en cours"
        }
      >
        {hm}
      </span>
      <span
        className={`ck-node-dot ${kind} ${step?.state === 'done' ? 'done' : ''} ${confirmed ? 'ok' : 'bad'}`}
      />
      <span className="ck-node-label">
        {kind === 'dep' ? '🛫' : '🛬'} {label}
      </span>
    </div>
  );
}

function registrationSub(
  checkSteps: DayPlanStep[],
  arrival?: DayPlanStep,
) {
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
}

function FlightRow({
  flight,
  index,
  targeted,
  onAction,
  planDate,
  onOpenRelances,
  nowMin,
  onDeclare,
  onCleanStatus,
}: {
  flight: Flight;
  index: number;
  targeted: boolean;
  onAction: (step: DayPlanStep, action: DayPlanAction) => void;
  planDate: string;
  onOpenRelances: (step: DayPlanStep) => void;
  nowMin?: number | null;
  onDeclare?: (step: DayPlanStep, kind: 'arrival' | 'departure') => void;
  onCleanStatus?: (step: DayPlanStep, status: 'doing' | 'done') => void;
}) {
  const { chain, departure, cleaning, arrival, attentionStep, checkSteps, solo } = flight;

  /* Ordre STRICTEMENT chronologique dans chaque colonne (11:00 avant 12:00 avant 18:00).
     À heure égale : événement client d'abord, puis accueil, puis ménage, puis le reste. */
  const sideRank = (s: DayPlanStep) =>
    s.kind === 'departure' || s.kind === 'arrival'
      ? 0
      : s.taskType === 'receive_departure' || s.taskType === 'receive_arrival'
        ? 1
        : s.kind === 'cleaning'
          ? 2
          : 3;
  const bySideOrder = (list: DayPlanStep[]) =>
    [...list].sort(
      (a, b) =>
        (toMin(a.time ?? a.estimatedTime) ?? 9999) - (toMin(b.time ?? b.estimatedTime) ?? 9999) ||
        sideRank(a) - sideRank(b),
    );
  /* Turnover : deux colonnes côte à côte — côté départ (11:00) | côté arrivée (17:00). */
  const departureSide = bySideOrder(
    checkSteps.filter((s) => s.kind === 'cleaning' || s.reservationId === chain.departingReservationId),
  );
  const arrivalSide = bySideOrder(
    checkSteps.filter((s) => s.kind !== 'cleaning' && s.reservationId !== chain.departingReservationId),
  );
  const orderedChecks = solo ? bySideOrder(checkSteps) : [];

  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const depM = toMin(departure?.time ?? (departure?.hourUnknown ? departure.estimatedTime : null));
  const endHm = cleaningEndDisplay(chain, departure?.time ?? departure?.estimatedTime);
  const endM = toMin(endHm);
  const arrM = toMin(arrival?.time ?? arrival?.estimatedTime);

  /* Tâches staff horodatées = de VRAIS rectangles dans la pipeline, durée 30 min
     par défaut. Accueil départ (check-out) juste après le ménage ; accueil arrivée
     (check-in) après le nœud d'arrivée. Icône 🛎️ = accueil, vraie tâche visible. */
  const TASK_DUR_MIN = 30;
  const timedTasks = checkSteps
    .map((s) => ({ s, m: toMin(s.time) }))
    .filter((x): x is { s: DayPlanStep; m: number } => x.s.kind === 'task' && x.m != null);
  const tasksBetween =
    arrM != null ? timedTasks.filter((x) => x.m < arrM).sort((a, b) => a.m - b.m) : [];
  const tasksAfterArrival = arrM != null ? timedTasks.filter((x) => x.m >= arrM) : [];
  const betweenTasksMin = tasksBetween.length * TASK_DUR_MIN;
  const isReceive = (s: DayPlanStep) =>
    s.taskType === 'receive_departure' || s.taskType === 'receive_arrival';
  const taskIcon = (s: DayPlanStep): string => (isReceive(s) ? '🛎️' : '📋');
  const shortTaskName = (s: DayPlanStep): string =>
    s.taskType === 'receive_departure'
      ? 'accueil départ'
      : s.taskType === 'receive_arrival'
        ? 'accueil arrivée'
        : (s.title || '').split('·')[0].trim().toLowerCase();
  const taskSeg = (x: { s: DayPlanStep; m: number }) => (
    <div
      key={x.s.id}
      className={`ck-seg task ${x.s.state === 'done' ? 'done' : x.s.staffName ? 'staff-ok' : 'staff-miss'}`}
      style={{ flexGrow: TASK_DUR_MIN }}
      title={`${x.s.title} · ${x.s.time} · ${TASK_DUR_MIN} min · ${x.s.staffName ?? 'non assigné'}`}
    >
      <span className={`ck-seg-label ${x.s.staffName ? 'ok' : 'bad'}`}>
        {taskIcon(x.s)} {x.s.time} {isReceive(x.s) ? 'accueil' : shortTaskName(x.s)} · {TASK_DUR_MIN}m
      </span>
    </div>
  );

  const seg = (a: number | null, b: number | null): number => {
    if (a == null || b == null || b <= a) return 0;
    return Math.max(0, Math.min(1, (nowM - a) / (b - a)));
  };
  const cleanPct = seg(depM, endM) * 100;

  const status = chain.status;
  /* Solo : pas de marge turnover — on parle d'heure à confirmer / décision. */
  const statusChip = solo
    ? chain.hoursUnknown
      ? { cls: 'tight' as const, txt: '⏱ heure à confirmer' }
      : needsSoloAction(departure, arrival, cleaning, attentionStep)
        ? { cls: 'tight' as const, txt: '✋ décision requise' }
        : { cls: 'ok' as const, txt: '✓ en ordre' }
    : chain.hoursUnknown
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

  const cleanliness =
    arrival?.listingCleanliness ?? departure?.listingCleanliness ?? undefined;
  const cleanChip = cleanliness ? CLEAN_CHIP[cleanliness] : null;
  const needsAction = solo
    ? needsSoloAction(departure, arrival, cleaning, attentionStep)
    : Boolean(
        attentionStep ||
          (cleaning && !cleaning.staffName && cleaning.state !== 'done') ||
          (arrival && (arrival.hourUnknown || arrival.registrationPending)) ||
          (departure && departure.hourUnknown),
      );

  const guestBit = solo
    ? (arrival?.guestName || departure?.guestName || chain.arrivingGuestName || chain.departingGuestName)
    : null;

  return (
    <div
      className={`ck-flight ${statusChip.cls} ${needsAction ? 'needs-action' : ''} ${targeted ? 'is-target' : ''} ${solo ? 'solo' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 80}ms` }}
      data-flight={chain.id}
    >
      <div className="ck-flight-head">
        <span className="ck-flight-name" title={chain.listingName}>
          {chain.listingName}
          {guestBit ? ` · ${guestBit}` : ''}
        </span>
        <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
          {cleanChip && <span className={`ck-flight-chip ${cleanChip.cls}`}>{cleanChip.txt}</span>}
          <span className={`ck-flight-chip ${statusChip.cls}${solo && needsAction ? ' pulse' : ''}`}>
            {statusChip.txt}
          </span>
        </span>
      </div>

      {solo ? (
        /* Piste hors turnover : mêmes nœuds d'heures + ménage éventuel (pas de fausse marge). */
        <div className="ck-strip ck-strip-solo">
          {departure &&
            hourNode(departure, 'dep', chain.departingGuestName || departure.guestName || 'Départ')}
          {cleaning && (
            <div
              className={`ck-seg clean ${cleaning.staffName ? 'staff-ok' : 'staff-miss'}`}
              style={{ flexGrow: 50 }}
              title={
                cleaning.staffName
                  ? `Ménage assigné · ${cleaning.staffName}`
                  : 'Ménage non assigné'
              }
            >
              <span className={`ck-seg-label ${cleaning.staffName ? 'ok' : 'bad'}`}>
                🧹 {cleaning.staffName || <em>à assigner</em>}
                {cleaning.time || cleaning.estimatedTime
                  ? ` · ${cleaning.hourUnknown ? '≈ ' : ''}${cleaning.time || cleaning.estimatedTime}`
                  : ''}
              </span>
            </div>
          )}
          {arrival && (
            <div className="ck-node">
              <span
                className={`ck-node-time ${arrival.time && !arrival.hourUnknown ? 'ok' : 'bad'}`}
                title={
                  arrival.time && !arrival.hourUnknown
                    ? "Heure d'arrivée confirmée (guest a choisi)"
                    : "Heure d'arrivée non confirmée — défaut Sojori, relances en cours"
                }
              >
                {arrival.time
                  ? fmtTime(arrival.time)
                  : arrival.estimatedTime
                    ? `≈ ${arrival.estimatedTime}`
                    : '—:—'}
              </span>
              <span
                className={`ck-node-dot arr ${arrival.state === 'done' ? 'done' : ''} ${arrival.time && !arrival.hourUnknown ? 'ok' : 'bad'}`}
              />
              <span className="ck-node-label">
                🛬 {chain.arrivingGuestName || arrival.guestName || 'Arrivée'}
              </span>
              {registrationSub(checkSteps, arrival)}
              {arrival.hourUnknown && arrival.state !== 'done' && (
                <span className="ck-node-sub warn">choisir l’heure · pas encore fait</span>
              )}
            </div>
          )}
          {!departure && !arrival && !cleaning && (
            <div className="ck-node">
              <span className="ck-node-time">—:—</span>
              <span className="ck-node-dot" />
              <span className="ck-node-label">Étapes du jour</span>
            </div>
          )}
        </div>
      ) : (
        /* Piste turnover : segments PROPORTIONNELS aux durées réelles (ménage / marge) */
        <div className="ck-strip">
          {hourNode(departure, 'dep', chain.departingGuestName || 'Départ')}

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

          <div className="ck-joint">
            <span
              className={`ck-joint-time ${cleaning?.staffName && !chain.hoursUnknown ? 'ok' : chain.hoursUnknown || !cleaning?.staffName ? 'bad' : ''}`}
            >
              {chain.hoursUnknown ? `≈ ${endHm}` : endHm}
            </span>
            <span className={`ck-joint-dot ${cleaning?.staffName && !chain.hoursUnknown ? 'ok' : ''}`} />
            <span className="ck-joint-label">fin ménage</span>
          </div>

          {/* Accueil départ & autres tâches staff — rectangles à leur place, juste après le ménage. */}
          {tasksBetween.map(taskSeg)}

          <div
            className={`ck-seg margin ${chain.slackMinutes < 0 ? 'broken' : status === 'tight' || chain.hoursUnknown ? 'tight' : 'ok'}`}
            style={{ flexGrow: Math.max(Math.abs(chain.slackMinutes) - betweenTasksMin, 35) }}
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
                  ? "Heure d'arrivée confirmée (guest a choisi)"
                  : "Heure d'arrivée non confirmée — défaut Sojori, relances en cours"
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
            {registrationSub(checkSteps, arrival)}
          </div>

          {/* Accueil arrivée (check-in) & tâches après l'arrivée — rectangles avec durée. */}
          {tasksAfterArrival.map(taskSeg)}
        </div>
      )}

      {solo ? (
        <ChecksList
          steps={orderedChecks}
          planDate={planDate}
          onAction={onAction}
          onOpenRelances={onOpenRelances}
          nowMin={nowMin}
          onDeclare={onDeclare}
          onCleanStatus={onCleanStatus}
        />
      ) : (
        <div className="ck-checks-sides">
          <ChecksList
            steps={departureSide}
            planDate={planDate}
            onAction={onAction}
            onOpenRelances={onOpenRelances}
            nowMin={nowMin}
            onDeclare={onDeclare}
            onCleanStatus={onCleanStatus}
          />
          <ChecksList
            steps={arrivalSide}
            planDate={planDate}
            onAction={onAction}
            onOpenRelances={onOpenRelances}
            nowMin={nowMin}
            onDeclare={onDeclare}
            onCleanStatus={onCleanStatus}
          />
        </div>
      )}

      <div className="ck-flight-foot">
        {cta && attentionStep ? (
          <span className="ck-flight-reason warn">{attentionStep.attention?.reason}</span>
        ) : chain.hoursUnknown ? (
          <span className="ck-flight-reason warn">
            {solo
              ? 'Heure non confirmée par le guest — défaut Sojori affiché (≈), relances « choisir l’heure » en cours. L’enregistrement peut déjà être fait indépendamment.'
              : 'Heures non confirmées — marge estimée par défaut, relances client en cours.'}
          </span>
        ) : !solo && (status === 'broken' || (cleaning && !cleaning.staffName)) ? (
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

function needsSoloAction(
  departure?: DayPlanStep,
  arrival?: DayPlanStep,
  cleaning?: DayPlanStep,
  attentionStep?: DayPlanStep,
): boolean {
  return Boolean(
    attentionStep ||
      (cleaning && !cleaning.staffName && cleaning.state !== 'done') ||
      (arrival && (arrival.hourUnknown || arrival.registrationPending) && arrival.state !== 'done') ||
      (departure && departure.hourUnknown && departure.state !== 'done'),
  );
}
