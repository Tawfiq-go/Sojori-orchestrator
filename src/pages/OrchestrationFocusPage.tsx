// ════════════════════════════════════════════════════════════════════
// OrchestrationFocusPage.tsx — /orchestration/focus
// Page vitrine de l'orchestration : Copilot en langage naturel +
// turnovers cinématiques. Indépendante du Plan de journée.
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import * as fulltaskApi from '../services/fulltaskApi';
import type { DayPlanAction, DayPlanStep } from '../services/fulltaskApi';
import PlanManualAssignModal from '../features/planReservation/PlanManualAssignModal';
import EscaladeForceSlotModal from '../features/planReservation/EscaladeForceSlotModal';
import FocusView from '../features/dayPlan/FocusView';

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

export function OrchestrationFocusPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => toIso(new Date()));
  const [plan, setPlan] = useState<fulltaskApi.DayPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignCtx, setAssignCtx] = useState<{ reservationId: string; taskId: string } | null>(null);
  const [slotCtx, setSlotCtx] = useState<{ reservationId: string; taskId: string; taskType: string } | null>(null);

  const isToday = date === toIso(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fulltaskApi.getDayPlan(date);
      setPlan(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur chargement de l'orchestration");
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

  const handleAction = (step: DayPlanStep, action: DayPlanAction) => {
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

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Focus']}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            Orchestration en direct
            {isToday && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#0a8f5e', background: 'rgba(10,143,94,0.10)', padding: '4px 10px', borderRadius: 99,
              }}>
                <i style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#0a8f5e',
                  animation: 'fv-pulse-dot 1.6s ease-in-out infinite',
                }} />
                le plan s'exécute
              </span>
            )}
          </h1>
          <div style={{ fontSize: 12, color: '#7a756c', fontWeight: 600, marginTop: 3 }}>
            {isToday ? "Aujourd'hui" : frDateLabel(date)}
            {plan ? ` · compilé ${new Date(plan.compiledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid rgba(20,17,10,0.08)', borderRadius: 11, padding: 4 }}>
          <FocusNavBtn onClick={() => setDate(addDaysIso(date, -1))} label="←" title="Jour précédent" />
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Choisir une date"
            style={{
              border: 0, outline: 'none', font: 'inherit', fontSize: 12.5, fontWeight: 700,
              color: '#14110a', background: 'transparent', padding: '6px 4px',
            }}
          />
          <FocusNavBtn onClick={() => setDate(addDaysIso(date, 1))} label="→" title="Jour suivant" />
          {!isToday && <FocusNavBtn onClick={() => setDate(toIso(new Date()))} label="Aujourd'hui" title="Revenir à aujourd'hui" />}
          <FocusNavBtn onClick={() => void load()} label="⟳" title="Actualiser" />
        </div>
      </div>

      <FocusView plan={plan} loading={loading} onAction={handleAction} />

      <style>{'@keyframes fv-pulse-dot { 50% { opacity: 0.35; transform: scale(0.8); } }'}</style>

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
    </DashboardWrapper>
  );
}

function FocusNavBtn({ onClick, label, title }: { onClick: () => void; label: string; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 8,
        font: 'inherit', fontSize: 12, fontWeight: 750, color: '#55504a', padding: '7px 10px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f0eee8'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}

export default OrchestrationFocusPage;
