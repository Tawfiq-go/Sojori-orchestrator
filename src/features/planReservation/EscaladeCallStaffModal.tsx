import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';

interface Props {
  open: boolean;
  reservationId: string;
  taskId: string;
  /** Mettre en avant le staff déjà assigné (nom affiché plan). */
  highlightName?: string;
  onClose: () => void;
}

function telHref(phone: string): string {
  const digits = String(phone).replace(/\D/g, '');
  return digits ? `tel:+${digits.replace(/^\+/, '')}` : '';
}

export default function EscaladeCallStaffModal({
  open,
  reservationId,
  taskId,
  highlightName,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<fulltaskApi.AssignationCandidate[]>([]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fulltaskApi.listAssignationCandidates(reservationId, taskId);
      if (!res?.success) {
        toast.error(res?.error || 'Impossible de charger la liste staff');
        setCandidates([]);
        return;
      }
      setCandidates(res.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur chargement staff');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [reservationId, taskId]);

  useEffect(() => {
    if (open) void loadCandidates();
  }, [open, loadCandidates]);

  if (!open) return null;

  const sorted = [...candidates].sort((a, b) => {
    if (!highlightName) return 0;
    const ah = a.name === highlightName ? -1 : 0;
    const bh = b.name === highlightName ? -1 : 0;
    return ah - bh;
  });

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
          <h3>Appeler un staff</h3>
          <button type="button" className="plan-assign-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <p className="plan-assign-modal-hint">Liste éligible pour cette tâche — appel direct.</p>
        {loading ? (
          <p className="plan-assign-modal-empty">Chargement…</p>
        ) : sorted.length === 0 ? (
          <p className="plan-assign-modal-empty">Aucun staff éligible.</p>
        ) : (
          <ul className="plan-assign-candidate-list">
            {sorted.map((c) => {
              const href = telHref(c.phone);
              const highlighted = highlightName && c.name === highlightName;
              return (
                <li
                  key={c.staffId}
                  className={`plan-assign-candidate${highlighted ? ' escalade-staff-highlight' : ''}`}
                >
                  <div className="plan-assign-candidate-main">
                    <span className="plan-assign-candidate-name">
                      {c.name}
                      {highlighted ? ' · assigné' : ''}
                    </span>
                    <span className="plan-assign-candidate-meta">{c.phone || 'Téléphone manquant'}</span>
                  </div>
                  <a
                    className={`plan-assign-pick-btn${href ? '' : ' disabled'}`}
                    href={href || undefined}
                    onClick={(e) => {
                      if (!href) {
                        e.preventDefault();
                        toast.warn('Téléphone staff indisponible');
                      }
                    }}
                  >
                    Appeler
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
