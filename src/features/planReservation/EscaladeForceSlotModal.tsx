import { useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { FulltaskPlanDoc } from './buildPlanViewModel';

interface Props {
  open: boolean;
  reservationId: string;
  taskId: string;
  taskType: string;
  onClose: () => void;
  onSubmitted?: (planDoc?: FulltaskPlanDoc) => void;
}

export default function EscaladeForceSlotModal({
  open,
  reservationId,
  taskId,
  taskType,
  onClose,
  onSubmitted,
}: Props) {
  const [hour, setHour] = useState(14);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isDeparture =
    taskType === 'departure_choose' || taskType === 'departure_declare';

  const handleSubmit = async () => {
    const time = `${String(hour).padStart(2, '0')}:00`;
    setLoading(true);
    try {
      const res = await fulltaskApi.forcePlanGuestSlot(reservationId, taskId, time);
      if (res?.success === false) {
        toast.error(res?.error || 'Impossible de forcer le créneau');
        return;
      }
      toast.success(`Créneau ${time} appliqué (${isDeparture ? 'départ' : 'arrivée'})`);
      onSubmitted?.(res?.data as FulltaskPlanDoc | undefined);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur forçage créneau');
    } finally {
      setLoading(false);
    }
  };

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
          <h3>Forcer le créneau {isDeparture ? 'départ' : 'arrivée'}</h3>
          <button type="button" className="plan-assign-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <p className="plan-assign-modal-hint">
          Choix admin — enregistré sur la tâche et le plan (relances client marquées OK si applicable).
        </p>
        <label className="escalade-force-slot-label">
          Heure
          <select
            className="escalade-force-slot-select"
            value={hour}
            disabled={loading}
            onChange={(e) => setHour(Number(e.target.value))}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
        <div className="escalade-force-slot-actions">
          <button type="button" className="escalade-action-btn" disabled={loading} onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="escalade-action-btn escalade-action-btn--primary"
            disabled={loading}
            onClick={() => void handleSubmit()}
          >
            {loading ? 'Application…' : 'Appliquer'}
          </button>
        </div>
      </div>
    </div>
  );
}
