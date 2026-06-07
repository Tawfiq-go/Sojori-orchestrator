import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { FulltaskPlanDoc } from './buildPlanViewModel';

function parsePlanFromResponse(res: fulltaskApi.PlanDispatchApiResponse): FulltaskPlanDoc | undefined {
  const raw = res?.data;
  if (!raw || typeof raw !== 'object') return undefined;
  const doc = raw as FulltaskPlanDoc;
  return doc.reservationId ? doc : undefined;
}

interface Props {
  open: boolean;
  reservationId: string;
  taskId: string;
  onClose: () => void;
  onDone?: (planDoc?: FulltaskPlanDoc) => void;
}

export default function PlanManualAssignModal({
  open,
  reservationId,
  taskId,
  onClose,
  onDone,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<fulltaskApi.AssignationCandidate[]>([]);
  const [assignmentContext, setAssignmentContext] = useState<
    fulltaskApi.AssignationContext | undefined
  >(undefined);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fulltaskApi.listAssignationCandidates(reservationId, taskId);
      if (!res?.success) {
        toast.error(res?.error || 'Impossible de charger la liste staff');
        setCandidates([]);
        setAssignmentContext(undefined);
        return;
      }
      setCandidates(res.data || []);
      setAssignmentContext(res.assignmentContext);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur chargement staff');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [reservationId, taskId]);

  useEffect(() => {
    if (open) void loadCandidates();
    else setAssigningId(null);
  }, [open, loadCandidates]);

  const handleAssign = async (staffId: string) => {
    setAssigningId(staffId);
    try {
      const res = await fulltaskApi.runPlanAssignation(reservationId, taskId, staffId);
      const planDoc = parsePlanFromResponse(res);
      if (!res?.success) {
        toast.error(res?.error || 'Assignation refusée');
        if (planDoc) onDone?.(planDoc);
        return;
      }
      toast.success(`Assigné · ${res.dispatch?.label || 'staff'}`);
      onDone?.(planDoc);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur assignation');
    } finally {
      setAssigningId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="plan-assign-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="plan-assign-modal" role="dialog" aria-modal="true">
        <div className="plan-assign-modal-head">
          <h3>Assigner manuellement</h3>
          <button type="button" className="plan-assign-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        {assignmentContext ? (
          <div className="plan-assign-modal-context" role="status">
            <span className="plan-assign-modal-context-label">Créneau de la tâche</span>
            <strong className="plan-assign-modal-context-value">
              {assignmentContext.dayLabel} {assignmentContext.dateLabel}
              {' · '}
              {assignmentContext.timeLabel}
              {assignmentContext.endTimeLabel &&
              assignmentContext.endTimeLabel !== assignmentContext.timeLabel
                ? ` – ${assignmentContext.endTimeLabel}`
                : ''}
            </strong>
            <span className="plan-assign-modal-context-note">
              Vérifiez cette date/heure avant de choisir un staff.
            </span>
          </div>
        ) : null}
        <p className="plan-assign-modal-hint">
          Filtre : accès listing → types de tâche. Disponibles en premier ; assignation forcée
          possible (hors planning, quota ou conflit).
        </p>
        {loading ? (
          <p className="plan-assign-modal-empty">Chargement…</p>
        ) : candidates.length === 0 ? (
          <p className="plan-assign-modal-empty">Aucun staff éligible pour cette tâche.</p>
        ) : (
          <ul className="plan-assign-candidate-list">
            {candidates.map((c) => {
              const busy = assigningId === c.staffId;
              const available =
                c.availableForTask ??
                (c.planningOk && !c.atMaxCapacity && !c.timeConflict);
              const warn = !available;
              const badges: string[] = [];
              if (available) badges.push('disponible');
              if (!c.planningOk) badges.push('hors planning');
              if (c.timeConflict) badges.push('conflit horaire');
              if (c.atMaxCapacity) badges.push('quota jour');
              return (
                <li key={c.staffId} className={`plan-assign-candidate${warn ? ' warn' : ''}`}>
                  <div className="plan-assign-candidate-main">
                    <span className="plan-assign-candidate-name">{c.name}</span>
                    <span className="plan-assign-candidate-meta">
                      {c.contractType === 'salaried' ? 'Salarié' : 'Freelance'}
                      {' · '}
                      {c.load}/{c.maxTasksPerDay} tâches
                      {badges.length ? ` · ${badges.join(' · ')}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="plan-assign-pick-btn"
                    disabled={Boolean(assigningId)}
                    onClick={() => void handleAssign(c.staffId)}
                  >
                    {busy ? '…' : 'Choisir'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
