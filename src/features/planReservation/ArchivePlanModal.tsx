import React, { useState } from 'react';
import * as fulltaskApi from '../../services/fulltaskApi';

interface Props {
  open: boolean;
  reservationId: string;
  guestName: string;
  planCode: string;
  reservationRef: string;
  onClose: () => void;
  onDone: () => void;
}

export default function ArchivePlanModal({
  open,
  reservationId,
  guestName,
  planCode,
  reservationRef,
  onClose,
  onDone,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hardDelete, setHardDelete] = useState(false);

  if (!open) return null;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      if (hardDelete) {
        const res = await fulltaskApi.deletePlan(reservationId);
        if (!res?.success) {
          setError(res?.error || 'Suppression impossible');
          return;
        }
      } else {
        const res = await fulltaskApi.archivePlan(reservationId, {
          reason: 'Archivé depuis Plans — plan corrompu / remplacé',
        });
        if (!res?.success) {
          setError(res?.error || 'Archivage impossible');
          return;
        }
      }
      onDone();
      onClose();
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
        aria-labelledby="archive-plan-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="force-plan-modal-h">
          <h2 id="archive-plan-title">{hardDelete ? 'Supprimer le plan' : 'Archiver le plan'}</h2>
          <button type="button" className="force-plan-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <p className="force-plan-modal-sub">
          <strong>{planCode}</strong> · résa {reservationRef} · {guestName}
          <br />
          {hardDelete ? (
            <>
              Suppression <b>définitive</b> du document plan en base. Les tâches liées passent en
              annulées. Une nouvelle résa (ou un replay <code>create.reservation</code>) pourra
              recréer un plan propre.
            </>
          ) : (
            <>
              Le plan disparaît de la liste Plans et le scheduler ne le traite plus. Vous pourrez
              créer une <b>nouvelle réservation</b> (nouvel id) ou rejouer l&apos;événement AMQP sur
              la même résa après archivage.
            </>
          )}
        </p>
        <label className="archive-plan-hard">
          <input
            type="checkbox"
            checked={hardDelete}
            onChange={(e) => setHardDelete(e.target.checked)}
          />
          Supprimer définitivement (au lieu d&apos;archiver)
        </label>
        {error && <p className="force-plan-error">{error}</p>}
        <div className="force-plan-actions">
          <button type="button" className="force-plan-btn secondary" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button
            type="button"
            className={`force-plan-btn${hardDelete ? ' danger' : ' primary'}`}
            onClick={run}
            disabled={loading}
          >
            {loading ? '…' : hardDelete ? 'Supprimer' : 'Archiver'}
          </button>
        </div>
      </div>
    </div>
  );
}
