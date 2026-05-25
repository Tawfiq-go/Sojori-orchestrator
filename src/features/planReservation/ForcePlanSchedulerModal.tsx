import React, { useState } from 'react';
import * as fulltaskApi from '../../services/fulltaskApi';

export type SchedulerRunStats = {
  remindersSent: number;
  staffRemindersSent: number;
  assignmentsDone: number;
  escalations: number;
  messagesSent: number;
  waitingGuestPromoted?: number;
};

interface Props {
  open: boolean;
  reservationId: string;
  guestName: string;
  onClose: () => void;
  onDone: () => void;
}

export default function ForcePlanSchedulerModal({
  open,
  reservationId,
  guestName,
  onClose,
  onDone,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SchedulerRunStats | null>(null);

  if (!open) return null;

  const run = async () => {
    setLoading(true);
    setError(null);
    setStats(null);
    try {
      const res = await fulltaskApi.runPlanScheduler(reservationId);
      if (!res?.success) {
        setError(res?.error || 'Échec exécution');
        return;
      }
      setStats(res.scheduler as SchedulerRunStats);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="force-plan-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="force-plan-modal"
        role="dialog"
        aria-labelledby="force-plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="force-plan-modal-h">
          <h2 id="force-plan-title">Exécuter le plan (test)</h2>
          <button type="button" className="force-plan-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <p className="force-plan-modal-sub">
          Cron désactivé — lance relances, rappels staff, assignations, escalades et messages planifiés
          dont l&apos;échéance est passée pour <strong>{guestName}</strong>.
        </p>
        {error && <p className="force-plan-error">{error}</p>}
        {stats && (
          <ul className="force-plan-stats">
            <li>Relances client : {stats.remindersSent}</li>
            <li>Rappels staff : {stats.staffRemindersSent}</li>
            <li>Assignations : {stats.assignmentsDone}</li>
            <li>Escalades : {stats.escalations}</li>
            <li>Messages : {stats.messagesSent}</li>
          </ul>
        )}
        <div className="force-plan-actions">
          <button type="button" className="force-plan-btn secondary" onClick={onClose} disabled={loading}>
            Fermer
          </button>
          <button type="button" className="force-plan-btn primary" onClick={run} disabled={loading}>
            {loading ? 'Exécution…' : 'Exécuter maintenant'}
          </button>
        </div>
        <p className="force-plan-hint">Modale temporaire — retirer après les tests.</p>
      </div>
    </div>
  );
}
