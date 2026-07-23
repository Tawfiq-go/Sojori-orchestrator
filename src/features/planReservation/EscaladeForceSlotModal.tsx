import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { FulltaskPlanDoc } from './buildPlanViewModel';

interface Props {
  open: boolean;
  reservationId: string;
  taskId: string;
  taskType: string;
  /** choose = première fois · modify = déjà une heure (workflow terminé). */
  mode?: 'choose' | 'modify';
  initialTime?: string;
  onClose: () => void;
  onSubmitted?: (planDoc?: FulltaskPlanDoc) => void;
}

function hourFromHm(time?: string): number {
  const m = /^(\d{1,2}):/.exec(String(time || '').trim());
  if (!m) return 14;
  const h = Number(m[1]);
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 14;
}

export default function EscaladeForceSlotModal({
  open,
  reservationId,
  taskId,
  taskType,
  mode = 'choose',
  initialTime,
  onClose,
  onSubmitted,
}: Props) {
  const [hour, setHour] = useState(() => hourFromHm(initialTime));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setHour(hourFromHm(initialTime));
  }, [open, initialTime]);

  if (!open) return null;

  const isDeparture =
    taskType === 'departure_choose' || taskType === 'departure_declare';
  const kindLabel = isDeparture ? 'départ' : 'arrivée';
  const isModify = mode === 'modify';

  const handleSubmit = async () => {
    const time = `${String(hour).padStart(2, '0')}:00`;
    setLoading(true);
    try {
      const res = await fulltaskApi.forcePlanGuestSlot(reservationId, taskId, time);
      if (res?.success === false) {
        toast.error(res?.error || 'Impossible d’appliquer le créneau');
        return;
      }
      toast.success(
        isModify
          ? `Heure ${kindLabel} modifiée · ${time} (Accueil mis à jour si actif)`
          : `Créneau ${time} appliqué (${kindLabel}) — workflow terminé`,
      );
      onSubmitted?.(res?.data as FulltaskPlanDoc | undefined);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur créneau');
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
          <h3>
            {isModify ? 'Modifier' : 'Choisir'} l’heure {kindLabel}
          </h3>
          <button type="button" className="plan-assign-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <p className="plan-assign-modal-hint">
          {isModify
            ? 'Le workflow reste Terminé. Pas de nouvelle relance — met à jour la tâche Accueil si active.'
            : 'Enregistre l’heure, marque le workflow Terminé, stoppe les relances, crée/maj Accueil si actif.'}
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
            {loading ? '…' : isModify ? 'Modifier' : 'Appliquer'}
          </button>
        </div>
      </div>
    </div>
  );
}
