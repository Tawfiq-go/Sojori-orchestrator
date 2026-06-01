import { useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { FulltaskPlanDoc } from './buildPlanViewModel';
import PlanManualAssignModal from './PlanManualAssignModal';

function parsePlanFromResponse(res: fulltaskApi.PlanDispatchApiResponse): FulltaskPlanDoc | undefined {
  const raw = res?.data;
  if (!raw || typeof raw !== 'object') return undefined;
  const doc = raw as FulltaskPlanDoc;
  return doc.reservationId ? doc : undefined;
}

interface Props {
  reservationId: string;
  taskId: string;
  wasAssigned?: boolean;
  disabled?: boolean;
  onDone?: (planDoc?: FulltaskPlanDoc) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export default function PlanAssignButtons({
  reservationId,
  taskId,
  wasAssigned,
  disabled,
  onDone,
  onLoadingChange,
}: Props) {
  const [autoLoading, setAutoLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const setBusy = (busy: boolean) => {
    setAutoLoading(busy);
    onLoadingChange?.(busy);
  };

  const runAuto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || autoLoading) return;
    setBusy(true);
    try {
      const res = await fulltaskApi.runPlanAssignation(reservationId, taskId);
      const planDoc = parsePlanFromResponse(res);
      if (!res?.success) {
        toast.error(res?.error || 'Assignation auto refusée');
        if (planDoc) onDone?.(planDoc);
        return;
      }
      toast.success(`Assigné auto · ${res.dispatch?.label || 'staff'}`);
      onDone?.(planDoc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur assignation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="plan-assign-actions">
        <button
          type="button"
          className={`plan-assign-btn plan-assign-btn--auto${autoLoading ? ' plan-assign-btn--loading' : ''}`}
          disabled={disabled || autoLoading}
          title={wasAssigned ? 'Relancer assignation automatique' : 'Assigner automatiquement'}
          onClick={(e) => void runAuto(e)}
        >
          {autoLoading ? '…' : 'Auto'}
        </button>
        <button
          type="button"
          className="plan-assign-btn plan-assign-btn--manual"
          disabled={disabled || autoLoading}
          title="Choisir un staff dans la liste filtrée"
          onClick={(e) => {
            e.stopPropagation();
            setManualOpen(true);
          }}
        >
          Manuel
        </button>
      </div>
      <PlanManualAssignModal
        open={manualOpen}
        reservationId={reservationId}
        taskId={taskId}
        onClose={() => setManualOpen(false)}
        onDone={onDone}
      />
    </>
  );
}
