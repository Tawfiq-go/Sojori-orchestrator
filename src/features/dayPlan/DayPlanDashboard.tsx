// ════════════════════════════════════════════════════════════════════
// DayPlanDashboard.tsx — « Plan de Journée » : la journée compilée
// Fil d'exécution chronologique auto-coché · chaînes de turnover + marges
// Concept : docs/orchestration/PROPOSITION_OPS_PLAN_DE_JOURNEE_COMPILE_2026-07-08.md
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { DayPlanAction, DayPlanStep, DayPlanWeekDay } from '../../services/fulltaskApi';
import PlanManualAssignModal from '../planReservation/PlanManualAssignModal';
import EscaladeForceSlotModal from '../planReservation/EscaladeForceSlotModal';
import './dayPlan.css';

const KIND_EMOJI: Record<DayPlanStep['kind'], string> = {
  departure: '🛫',
  arrival: '🛬',
  cleaning: '🧹',
  task: '📋',
  message: '💬',
  relance: '🔔',
};

function toIso(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIso(new Date(y, m - 1, d + days));
}

function frDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function slackLabel(minutes: number): string {
  if (minutes < 0) return `chaîne cassée (${Math.abs(minutes)} min de dépassement)`;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `marge ${h}h${m ? String(m).padStart(2, '0') : ''}`;
  }
  return `marge ${minutes} min`;
}

export function DayPlanDashboard() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => toIso(new Date()));
  const [plan, setPlan] = useState<fulltaskApi.DayPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignCtx, setAssignCtx] = useState<{ reservationId: string; taskId: string } | null>(null);
  const [slotCtx, setSlotCtx] = useState<{ reservationId: string; taskId: string; taskType: string } | null>(null);
  const [week, setWeek] = useState<DayPlanWeekDay[]>([]);
  const [batchHour, setBatchHour] = useState(16);
  const [batchLoading, setBatchLoading] = useState(false);

  const isToday = date === toIso(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fulltaskApi.getDayPlan(date);
      setPlan(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur chargement du plan de journée');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const [weekStart, setWeekStart] = useState(() => toIso(new Date()));

  const loadWeek = useCallback(async () => {
    try {
      const res = await fulltaskApi.getDayPlanWeek(weekStart);
      setWeek(res.days || []);
    } catch {
      setWeek([]);
    }
  }, [weekStart]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  /* La bande semaine suit la date sélectionnée : si elle sort de la
     fenêtre affichée (7 jours), la fenêtre glisse pour la contenir. */
  useEffect(() => {
    const weekEnd = addDaysIso(weekStart, 6);
    if (date < weekStart) setWeekStart(date);
    else if (date > weekEnd) setWeekStart(addDaysIso(date, -6));
  }, [date, weekStart]);

  const shiftDate = (days: number) => {
    setDate(addDaysIso(date, days));
  };

  const handleAction = (step: DayPlanStep, action: DayPlanAction) => {
    if (action.type === 'plan') {
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
      return;
    }
    if (action.type === 'relance_guest') {
      navigate(`/orchestration/plans?reservationId=${encodeURIComponent(step.reservationId)}`);
    }
  };

  /** Étapes « sans heure » groupables : une action force_slot disponible chacune. */
  const batchableSlots = useMemo(() => {
    const steps = plan?.steps ?? [];
    return steps
      .filter((s) => s.hourUnknown && s.state === 'attention')
      .map((s) => ({ step: s, action: s.attention?.actions.find((a) => a.type === 'force_slot') }))
      .filter((x): x is { step: DayPlanStep; action: DayPlanAction & { taskId: string } } =>
        Boolean(x.action?.taskId),
      );
  }, [plan]);

  const applyBatchSlots = async () => {
    if (!batchableSlots.length) return;
    const time = `${String(batchHour).padStart(2, '0')}:00`;
    setBatchLoading(true);
    let ok = 0;
    let ko = 0;
    for (const { step, action } of batchableSlots) {
      try {
        const res = await fulltaskApi.forcePlanGuestSlot(step.reservationId, action.taskId, time);
        if (res?.success === false) ko++;
        else ok++;
      } catch {
        ko++;
      }
    }
    setBatchLoading(false);
    if (ok) toast.success(`${time} appliqué à ${ok} réservation${ok > 1 ? 's' : ''}`);
    if (ko) toast.error(`${ko} échec${ko > 1 ? 's' : ''} — voir les plans concernés`);
    void load();
  };

  const { unknownSteps, timedSteps } = useMemo(() => {
    const steps = plan?.steps ?? [];
    return {
      unknownSteps: steps.filter((s) => s.time == null),
      timedSteps: steps.filter((s) => s.time != null),
    };
  }, [plan]);

  const stats = plan?.stats;
  const fragility = plan?.fragility;
  const nextAttentionLabel = useMemo(() => {
    if (!isToday || !plan) return null;
    if (!plan.nextAttentionAt) return stats && stats.attention > 0 ? null : 'Rien ne requiert ton attention.';
    const d = new Date(plan.nextAttentionAt);
    return `Prochaine intervention : ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, [isToday, plan, stats]);

  return (
    <div className="dp-root">
      <div className="dp-hdr">
        <div>
          <div className="dp-title">
            Plan de journée · {frDateLabel(date)}
            {isToday && <span className="dp-live">le plan s'exécute</span>}
          </div>
          <div className="dp-sub">
            {plan
              ? `Compilé ${new Date(plan.compiledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${stats?.steps ?? 0} étapes · ${stats?.arrivals ?? 0} arrivées · ${stats?.departures ?? 0} départs · ${stats?.turnovers ?? 0} turnovers`
              : loading
                ? 'Compilation…'
                : '—'}
          </div>
        </div>
        <div className="dp-datenav">
          <button type="button" onClick={() => shiftDate(-1)} aria-label="Jour précédent">←</button>
          <input
            type="date"
            className="dp-dateinput"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
            aria-label="Choisir une date"
          />
          <button type="button" onClick={() => shiftDate(1)} aria-label="Jour suivant">→</button>
          {!isToday && (
            <button type="button" onClick={() => setDate(toIso(new Date()))}>
              Aujourd'hui
            </button>
          )}
          <button type="button" onClick={() => void load()} aria-label="Actualiser">⟳</button>
        </div>
      </div>

      {week.length > 0 && (
        <div className="dp-week">
          {week.map((d) => {
            const [, , dayNum] = d.date.split('-');
            const dayName = new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' });
            return (
              <button
                key={d.date}
                type="button"
                className={`dp-wday frag-${d.fragility.label} ${d.date === date ? 'active' : ''}`}
                onClick={() => setDate(d.date)}
                title={`${d.stats.arrivals} arrivées · ${d.stats.departures} départs · ${d.stats.turnovers} turnovers · ${d.stats.attention} décision(s)`}
              >
                <span className="dp-wday-name">{dayName} {Number(dayNum)}</span>
                <span className="dp-wday-counts">
                  🛬{d.stats.arrivals} 🛫{d.stats.departures}
                  {d.stats.turnovers > 0 && <> 🔄{d.stats.turnovers}</>}
                </span>
                {d.stats.attention > 0 ? (
                  <span className="dp-wday-attn">✋ {d.stats.attention}</span>
                ) : (
                  <span className="dp-wday-ok">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {plan && stats && (
        <div className="dp-chips">
          <span className={`dp-chip frag-${fragility?.label ?? 'calme'}`}>
            {fragility?.label === 'tendue' && '⚡ '}
            Journée {fragility?.label ?? 'calme'}
            {fragility && fragility.tightChains > 0 &&
              ` · ${fragility.tightChains} chaîne${fragility.tightChains > 1 ? 's' : ''} serrée${fragility.tightChains > 1 ? 's' : ''}${fragility.window ? ` (${fragility.window.from}–${fragility.window.to})` : ''}`}
          </span>
          {stats.attention > 0 ? (
            <span className="dp-chip attn">✋ {stats.attention} décision{stats.attention > 1 ? 's' : ''} requise{stats.attention > 1 ? 's' : ''}</span>
          ) : (
            <span className="dp-chip ok">✓ Aucune intervention requise</span>
          )}
          <span className="dp-chip neutral">{stats.done}/{stats.steps} étapes validées</span>
          {nextAttentionLabel && <span className="dp-chip free">☕ {nextAttentionLabel}</span>}
        </div>
      )}

      {loading && !plan && <div className="dp-empty">Compilation du plan de journée…</div>}
      {!loading && plan && plan.steps.length === 0 && (
        <div className="dp-empty">Aucune activité planifiée ce jour — journée libre.</div>
      )}

      {unknownSteps.length > 0 && (
        <div className="dp-section">
          <div className="dp-section-title">⏱ Sans heure choisie ({unknownSteps.length})</div>
          {batchableSlots.length >= 2 && (
            <div className="dp-batch">
              <span className="dp-batch-label">
                Décision groupée : fixer la même heure pour les {batchableSlots.length} réservations sans réponse
              </span>
              <select
                value={batchHour}
                onChange={(e) => setBatchHour(Number(e.target.value))}
                aria-label="Heure par défaut"
              >
                {[12, 13, 14, 15, 16, 17, 18, 19].map((h) => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
              <button type="button" className="primary" disabled={batchLoading} onClick={() => void applyBatchSlots()}>
                {batchLoading ? 'Application…' : `Appliquer à tous (${batchableSlots.length})`}
              </button>
            </div>
          )}
          {unknownSteps.map((s) => (
            <StepRow key={s.id} step={s} onAction={handleAction} />
          ))}
        </div>
      )}

      {timedSteps.length > 0 && (
        <div className="dp-section">
          <div className="dp-section-title">Fil de la journée</div>
          {timedSteps.map((s) => (
            <StepRow key={s.id} step={s} onAction={handleAction} />
          ))}
        </div>
      )}

      {assignCtx && (
        <PlanManualAssignModal
          open
          reservationId={assignCtx.reservationId}
          taskId={assignCtx.taskId}
          onClose={() => setAssignCtx(null)}
          onDone={() => {
            setAssignCtx(null);
            void load();
          }}
        />
      )}

      {slotCtx && (
        <EscaladeForceSlotModal
          open
          reservationId={slotCtx.reservationId}
          taskId={slotCtx.taskId}
          taskType={slotCtx.taskType}
          onClose={() => setSlotCtx(null)}
          onSubmitted={() => {
            setSlotCtx(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function StepRow({ step, onAction }: { step: DayPlanStep; onAction: (s: DayPlanStep, a: DayPlanAction) => void }) {
  const dotClass = step.state === 'done' ? 'done' : step.state === 'attention' ? 'attn' : 'todo';
  return (
    <div className={`dp-row ${step.state === 'attention' ? 'is-attn' : ''}`}>
      <div className="dp-time">{step.time ?? '—'}</div>
      <div className="dp-railwrap">
        <div className={`dp-dot ${dotClass}`}>{step.state === 'done' ? '✓' : step.state === 'attention' ? '!' : ''}</div>
        <div className="dp-rail" />
      </div>
      <div className="dp-body">
        <div className="dp-line1">
          <span className="dp-emoji">{KIND_EMOJI[step.kind]}</span>
          <span className="dp-steptitle">{step.title}</span>
          {step.guestName && <span className="dp-guest">{step.guestName}</span>}
          {step.staffName && <span className="dp-staff">👤 {step.staffName}</span>}
          {step.chainId && step.slackMinutes != null && (
            <span className={`dp-slack ${step.slackMinutes < 0 ? 'broken' : step.slackMinutes < 30 ? 'tight' : 'ok'}`}>
              🔄 {slackLabel(step.slackMinutes)}
            </span>
          )}
          {step.state === 'done' && step.auto && <span className="dp-auto">auto</span>}
        </div>
        {step.meta && <div className="dp-meta">{step.meta}</div>}
        {step.attention && (
          <div className="dp-attn-card">
            <div className="dp-attn-reason">{step.attention.reason}</div>
            {step.attention.attempted && (
              <div className="dp-attn-attempted">Déjà tenté : {step.attention.attempted}</div>
            )}
            {step.attention.deadline && (
              <div className="dp-attn-deadline">
                À traiter avant{' '}
                {new Date(step.attention.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <div className="dp-attn-actions">
              {step.attention.actions.map((a, i) => (
                <button key={`${a.type}-${i}`} type="button" className={i === 0 ? 'primary' : ''} onClick={() => onAction(step, a)}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DayPlanDashboard;
