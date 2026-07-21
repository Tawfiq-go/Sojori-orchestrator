// ════════════════════════════════════════════════════════════════════
// FocusView.tsx — « Focus Orchestration » : la vitrine de l'orchestration
// Copilot commande naturelle + cartes turnover cinématiques (checkout →
// ménage → check-in) avec résolution de conflits en un clic.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  DayPlanAction,
  DayPlanChain,
  DayPlanResponse,
  DayPlanStep,
} from '../../services/fulltaskApi';
import './focusView.css';

type ChainCard = {
  chain: DayPlanChain;
  departure?: DayPlanStep;
  cleaning?: DayPlanStep;
  arrival?: DayPlanStep;
  attentionStep?: DayPlanStep;
};

type CopilotAnswer = {
  text: string;
  chainIds: string[];
  action?: { step: DayPlanStep; action: DayPlanAction } | null;
};

/* ─── Utils temps ─── */

function fmtTime(raw?: string | null): string {
  if (!raw) return '—';
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function toMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function nowMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function fmtDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m ? String(m).padStart(2, '0') : ''}`;
  }
  return `${minutes} min`;
}

function slackText(minutes: number): string {
  if (minutes < 0) return `${fmtDuration(Math.abs(minutes))} de dépassement`;
  return `marge ${fmtDuration(minutes)}`;
}

/* ─── Compteur animé ─── */

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) {
      setValue(target);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

/* ─── Copilot local : intentions sur le plan compilé ─── */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function buildAnswer(query: string, plan: DayPlanResponse, cards: ChainCard[]): CopilotAnswer {
  const q = normalize(query);
  const stats = plan.stats;

  /** Carte visée par nom de bien (si mentionné). */
  const targeted = cards.filter((c) => {
    const name = normalize(c.chain.listingName || '');
    if (!name) return false;
    return name
      .split(/[\s·|,-]+/)
      .filter((w) => w.length >= 4)
      .some((w) => q.includes(w));
  });
  const scope = targeted.length > 0 ? targeted : cards;

  const wantsCleaner = /(menage|cleaner|nettoyage|femme de chambre|cleaning)/.test(q);
  const wantsEarly = /(early|avance|plus tot|arrivee anticipee|check.?in)/.test(q);
  const wantsTight = /(serre|conflit|risque|casse|tendu|probleme|urgent)/.test(q);
  const wantsWho = /(qui|assigne|staff|equipe)/.test(q);
  const wantsArrivals = /(arrivee|arrivals|checkin)/.test(q);
  const wantsDepartures = /(depart|checkout)/.test(q);

  if (wantsTight) {
    const risky = cards.filter((c) => c.chain.status !== 'ok');
    if (risky.length === 0) {
      return {
        text: `Aucun turnover à risque aujourd'hui — les ${stats.turnovers} enchaînements ont tous une marge confortable. ✓`,
        chainIds: [],
      };
    }
    const worst = [...risky].sort((a, b) => a.chain.slackMinutes - b.chain.slackMinutes)[0];
    return {
      text: `${risky.length} turnover${risky.length > 1 ? 's' : ''} sous surveillance. Le plus critique : ${worst.chain.listingName} (${slackText(worst.chain.slackMinutes)}). Je te l'ai surligné — l'action à jouer est dessus.`,
      chainIds: risky.map((c) => c.chain.id),
      action: worst.attentionStep?.attention?.actions?.[0]
        ? { step: worst.attentionStep, action: worst.attentionStep.attention.actions[0] }
        : null,
    };
  }

  if (wantsCleaner || wantsEarly) {
    if (scope.length === 0) {
      return {
        text: `Pas de turnover concerné aujourd'hui${stats.arrivals ? ` — ${stats.arrivals} arrivée(s) sans départ le même jour, le ménage peut se faire en amont sans contrainte.` : '.'}`,
        chainIds: [],
      };
    }
    const c = scope[0];
    const staff = c.cleaning?.staffName;
    const windowLabel = `${fmtTime(c.cleaning?.time ?? c.departure?.time)} – ${fmtTime(c.chain.expectedCleaningEnd)}`;
    const arrivalT = fmtTime(c.arrival?.time);
    if (c.chain.status === 'broken') {
      return {
        text: `⚠ Sur ${c.chain.listingName}, la fenêtre ménage (${windowLabel}) dépasse l'arrivée de ${arrivalT} — early check-in impossible en l'état. Je te propose de ${staff ? `replanifier ${staff}` : 'assigner un cleaner'} ou décaler l'arrivée : bouton prêt sur la carte.`,
        chainIds: [c.chain.id],
        action: c.attentionStep?.attention?.actions?.[0]
          ? { step: c.attentionStep, action: c.attentionStep.attention.actions[0] }
          : null,
      };
    }
    return {
      text: `Oui — sur ${c.chain.listingName}, ${staff ? `${staff} est déjà sur le ménage` : 'la fenêtre ménage est calée'} (${windowLabel}), soit ${slackText(c.chain.slackMinutes)} avant l'arrivée de ${c.chain.arrivingGuestName || 'ton guest'} à ${arrivalT}. ${c.chain.slackMinutes >= 45 ? 'Un early check-in est jouable. ✓' : 'Marge courte : évite de promettre plus tôt.'}`,
      chainIds: [c.chain.id],
    };
  }

  if (wantsWho) {
    const withStaff = scope.filter((c) => c.cleaning?.staffName);
    if (withStaff.length === 0) {
      return {
        text: `Aucun cleaner assigné pour l'instant sur ${scope.length > 1 ? 'ces turnovers' : 'ce turnover'} — je peux t'ouvrir l'assignation depuis la carte.`,
        chainIds: scope.map((c) => c.chain.id),
      };
    }
    return {
      text: withStaff
        .map((c) => `${c.chain.listingName} → ${c.cleaning?.staffName} (${fmtTime(c.cleaning?.time ?? c.departure?.time)})`)
        .join(' · '),
      chainIds: withStaff.map((c) => c.chain.id),
    };
  }

  if (wantsArrivals && !wantsDepartures) {
    return {
      text: `${stats.arrivals} arrivée${stats.arrivals > 1 ? 's' : ''} aujourd'hui${stats.hourUnknown ? ` · ${stats.hourUnknown} sans heure confirmée` : ''}. Les turnovers du jour sont affichés ci-dessous.`,
      chainIds: cards.map((c) => c.chain.id),
    };
  }
  if (wantsDepartures) {
    return {
      text: `${stats.departures} départ${stats.departures > 1 ? 's' : ''} aujourd'hui. ${stats.turnovers} enchaîne${stats.turnovers > 1 ? 'nt' : ''} directement sur une arrivée.`,
      chainIds: cards.map((c) => c.chain.id),
    };
  }

  return {
    text: `Journée ${plan.fragility.label} : ${stats.turnovers} turnover${stats.turnovers > 1 ? 's' : ''}, ${stats.arrivals} arrivée(s), ${stats.departures} départ(s), ${stats.attention} décision(s) à prendre. Demande-moi par ex. « un cleaner est dispo pour un early check-in ? » ou « où sont mes turnovers serrés ? »`,
    chainIds: [],
  };
}

/* ─── Vue ─── */

const SUGGESTIONS = [
  'Un cleaner est dispo pour un early check-in ?',
  'Où sont mes turnovers serrés ?',
  'Qui fait les ménages aujourd’hui ?',
];

export default function FocusView({
  plan,
  loading,
  onAction,
}: {
  plan: DayPlanResponse | null;
  loading: boolean;
  onAction: (step: DayPlanStep, action: DayPlanAction) => void;
}) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);
  const [typed, setTyped] = useState('');
  const [thinking, setThinking] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const cards = useMemo<ChainCard[]>(() => {
    if (!plan) return [];
    return (plan.chains ?? []).map((chain) => {
      const steps = plan.steps.filter((s) => s.chainId === chain.id);
      return {
        chain,
        departure: steps.find((s) => s.kind === 'departure'),
        cleaning: steps.find((s) => s.kind === 'cleaning'),
        arrival: steps.find((s) => s.kind === 'arrival'),
        attentionStep: steps.find((s) => s.state === 'attention'),
      };
    });
  }, [plan]);

  const highlighted = useMemo(() => new Set(answer?.chainIds ?? []), [answer]);

  /* Machine à écrire sur la réponse */
  useEffect(() => {
    if (!answer) return undefined;
    setTyped('');
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setTyped(answer.text.slice(0, i));
      if (i >= answer.text.length) clearInterval(t);
    }, 14);
    return () => clearInterval(t);
  }, [answer]);

  const ask = (raw?: string) => {
    const q = (raw ?? query).trim();
    if (!q || !plan) return;
    setQuery(q);
    setThinking(true);
    setAnswer(null);
    /* Petite latence volontaire : l'effet « réflexion » rend la réponse lisible. */
    window.setTimeout(() => {
      const a = buildAnswer(q, plan, cards);
      setThinking(false);
      setAnswer(a);
      if (a.chainIds.length > 0) {
        window.setTimeout(() => {
          gridRef.current
            ?.querySelector(`[data-chain="${a.chainIds[0]}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }, 650);
  };

  const stats = plan?.stats;
  const cTurnovers = useCountUp(stats?.turnovers ?? 0);
  const cArrivals = useCountUp(stats?.arrivals ?? 0);
  const cDepartures = useCountUp(stats?.departures ?? 0);
  const cAttention = useCountUp(stats?.attention ?? 0);
  const autoRate = stats && stats.steps > 0 ? Math.round((stats.done / stats.steps) * 100) : 0;
  const cAuto = useCountUp(autoRate);

  if (loading && !plan) {
    return <div className="fv-empty">Compilation de l'orchestration…</div>;
  }
  if (!plan) return <div className="fv-empty">Plan indisponible.</div>;

  return (
    <div className="fv-root">
      {/* ── Copilot ── */}
      <div className="fv-copilot">
        <div className="fv-copilot-glow" aria-hidden />
        <form
          className="fv-ask"
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <span className="fv-spark" aria-hidden>✦</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Demande à l'orchestrateur — « un cleaner dispo pour un early check-in ? »"
            aria-label="Question à l'orchestrateur"
          />
          <button type="submit" className="fv-send" aria-label="Envoyer">➤</button>
        </form>
        <div className="fv-suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
        {(thinking || answer) && (
          <div className="fv-answer" role="status">
            <span className="fv-answer-badge">✦ Orchestrateur</span>
            {thinking ? (
              <span className="fv-thinking"><i /><i /><i /></span>
            ) : (
              <span className="fv-answer-text">
                {typed}
                {typed.length < (answer?.text.length ?? 0) && <span className="fv-caret" />}
                {answer?.action && typed.length >= (answer?.text.length ?? 0) && (
                  <button
                    type="button"
                    className="fv-answer-cta"
                    onClick={() => onAction(answer.action!.step, answer.action!.action)}
                  >
                    {answer.action.action.label} →
                  </button>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Stats hero ── */}
      <div className="fv-stats">
        <div className="fv-stat" style={{ animationDelay: '0ms' }}>
          <b>{cTurnovers}</b><span>turnovers orchestrés</span>
        </div>
        <div className="fv-stat" style={{ animationDelay: '60ms' }}>
          <b>{cArrivals}</b><span>arrivées</span>
        </div>
        <div className="fv-stat" style={{ animationDelay: '120ms' }}>
          <b>{cDepartures}</b><span>départs</span>
        </div>
        <div className="fv-stat accent" style={{ animationDelay: '180ms' }}>
          <b>{cAuto}%</b><span>exécuté automatiquement</span>
        </div>
        <div className={`fv-stat ${(stats?.attention ?? 0) > 0 ? 'warn' : 'ok'}`} style={{ animationDelay: '240ms' }}>
          <b>{cAttention}</b><span>{(stats?.attention ?? 0) > 0 ? 'décisions requises' : 'décision requise — zéro ✓'}</span>
        </div>
      </div>

      {/* ── Cartes turnover ── */}
      {cards.length === 0 ? (
        <div className="fv-empty">
          Aucun turnover aujourd'hui — {stats?.arrivals ?? 0} arrivée(s) et {stats?.departures ?? 0} départ(s) sans enchaînement.
        </div>
      ) : (
        <div className="fv-grid" ref={gridRef}>
          {cards.map((c, idx) => (
            <TurnoverCard
              key={c.chain.id}
              card={c}
              index={idx}
              highlighted={highlighted.has(c.chain.id)}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Carte turnover façon « AI cohost » ─── */

function TurnoverCard({
  card,
  index,
  highlighted,
  onAction,
}: {
  card: ChainCard;
  index: number;
  highlighted: boolean;
  onAction: (step: DayPlanStep, action: DayPlanAction) => void;
}) {
  const { chain, departure, cleaning, arrival, attentionStep } = card;

  const depT = fmtTime(departure?.time);
  const cleanStart = fmtTime(cleaning?.time ?? departure?.time);
  const cleanEnd = fmtTime(chain.expectedCleaningEnd);
  const arrT = fmtTime(arrival?.time);

  /* Étape « en cours » selon l'heure réelle */
  const now = nowMinutes();
  const depM = toMinutes(departure?.time);
  const arrM = toMinutes(arrival?.time);
  const cleanEndM = toMinutes(fmtTime(chain.expectedCleaningEnd));
  let active: 'departure' | 'cleaning' | 'arrival' | 'done' | 'idle' = 'idle';
  if (depM != null && now >= depM) active = 'departure';
  if (depM != null && now >= depM && (cleanEndM == null || now < cleanEndM)) active = 'cleaning';
  else if (cleanEndM != null && now >= cleanEndM) active = 'arrival';
  if (arrM != null && now >= arrM) active = 'done';

  const statusClass = chain.status === 'broken' ? 'broken' : chain.status === 'tight' ? 'tight' : 'ok';
  const statusLabel =
    chain.status === 'broken'
      ? `⚠ ${slackText(chain.slackMinutes)}`
      : chain.status === 'tight'
        ? `⏱ ${slackText(chain.slackMinutes)}`
        : `✓ ${slackText(chain.slackMinutes)}`;

  const primaryAction = attentionStep?.attention?.actions?.[0];

  const stepState = (kind: 'departure' | 'cleaning' | 'arrival', step?: DayPlanStep) => {
    if (step?.state === 'done') return 'done';
    if (active === kind) return 'active';
    return 'todo';
  };

  return (
    <div
      className={`fv-card frag-${statusClass} ${highlighted ? 'is-hl' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
      data-chain={chain.id}
    >
      <div className="fv-card-hdr">
        <div className="fv-card-title">
          <span className="fv-card-spark" aria-hidden>✦</span>
          <span className="fv-card-name" title={chain.listingName}>{chain.listingName}</span>
        </div>
        <span className={`fv-card-status ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="fv-card-sub">Turnover plan · {fmtDuration(chain.cleaningDurationMinutes)} de ménage</div>

      <div className="fv-tl">
        <div className={`fv-tl-step ${stepState('departure', departure)}`}>
          <span className="fv-tl-dot"><i /></span>
          <span className="fv-tl-ico" aria-hidden>🛫</span>
          <span className="fv-tl-label">
            Départ {chain.departingGuestName || departure?.guestName || ''}
          </span>
          <span className="fv-tl-time">{depT}</span>
        </div>
        <div className={`fv-tl-step ${stepState('cleaning', cleaning)}`}>
          <span className="fv-tl-dot"><i /></span>
          <span className="fv-tl-ico" aria-hidden>🧹</span>
          <span className="fv-tl-label">
            Fenêtre ménage
            {cleaning?.staffName ? <em className="fv-tl-staff">· {cleaning.staffName}</em> : <em className="fv-tl-staff none">· à assigner</em>}
          </span>
          <span className="fv-tl-time">{cleanStart} – {cleanEnd}</span>
        </div>
        <div className={`fv-tl-step ${stepState('arrival', arrival)}`}>
          <span className="fv-tl-dot"><i /></span>
          <span className="fv-tl-ico" aria-hidden>🛬</span>
          <span className="fv-tl-label">
            Arrivée {chain.arrivingGuestName || arrival?.guestName || ''}
          </span>
          <span className="fv-tl-time">{arrT}</span>
        </div>
      </div>

      {attentionStep && primaryAction ? (
        <div className="fv-card-foot attn">
          <span className="fv-card-reason">{attentionStep.attention?.reason}</span>
          <button type="button" className="fv-card-cta" onClick={() => onAction(attentionStep, primaryAction)}>
            {primaryAction.label}
          </button>
        </div>
      ) : chain.status === 'broken' || (cleaning && !cleaning.staffName) ? (
        <div className="fv-card-foot attn">
          <span className="fv-card-reason">
            {chain.status === 'broken'
              ? 'Chaîne sous tension — vérifier heures de départ/arrivée et ménage.'
              : 'Ménage sans staff assigné — à sécuriser avant le jour J.'}
          </span>
        </div>
      ) : (
        <div className="fv-card-foot ok">
          <span className="fv-card-check">✓</span> Orchestré automatiquement
        </div>
      )}
    </div>
  );
}
