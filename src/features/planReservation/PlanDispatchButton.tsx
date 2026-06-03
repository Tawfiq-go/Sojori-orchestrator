import { useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { FulltaskPlanDoc } from './buildPlanViewModel';

type DispatchKind = 'message' | 'relance' | 'staff_reminder' | 'assignment';

interface Props {
  reservationId: string;
  kind: DispatchKind;
  messageIndex?: number;
  taskId?: string;
  itemIndex?: number;
  disabled?: boolean;
  /** Indique qu’un envoi a déjà eu lieu (bouton reste actif pour renvoyer). */
  wasSent?: boolean;
  onDone?: (planDoc?: FulltaskPlanDoc) => void;
  onLoadingChange?: (loading: boolean) => void;
}

function parsePlanFromResponse(res: fulltaskApi.PlanDispatchApiResponse): FulltaskPlanDoc | undefined {
  const raw = res?.data;
  if (!raw || typeof raw !== 'object') return undefined;
  const doc = raw as FulltaskPlanDoc;
  return doc.reservationId ? doc : undefined;
}

function successLabel(kind: DispatchKind, channel?: string): string {
  const ch = channel ? ` · ${String(channel).toUpperCase()}` : '';
  if (kind === 'assignment') return 'Assignation lancée';
  if (kind === 'staff_reminder') return `Rappel staff envoyé${ch}`;
  if (kind === 'relance') return `Relance envoyée${ch}`;
  return `Message envoyé${ch}`;
}

export default function PlanDispatchButton({
  reservationId,
  kind,
  messageIndex,
  taskId,
  itemIndex,
  disabled,
  wasSent,
  onDone,
  onLoadingChange,
}: Props) {
  const [loading, setLoading] = useState(false);

  const canSend = !disabled && !loading;

  const setBusy = (busy: boolean) => {
    setLoading(busy);
    onLoadingChange?.(busy);
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canSend) return;
    setBusy(true);
    try {
      let res: fulltaskApi.PlanDispatchApiResponse;
      if (kind === 'message' && messageIndex != null) {
        res = await fulltaskApi.sendPlanMessage(reservationId, messageIndex);
      } else if (kind === 'relance' && taskId && itemIndex != null) {
        res = await fulltaskApi.sendPlanRelance(reservationId, taskId, itemIndex);
      } else if (kind === 'staff_reminder' && taskId && itemIndex != null) {
        res = await fulltaskApi.sendPlanStaffReminder(reservationId, taskId, itemIndex);
      } else if (kind === 'assignment' && taskId) {
        res = await fulltaskApi.runPlanAssignation(reservationId, taskId);
      } else {
        throw new Error('Paramètres envoi manquants');
      }

      const planDoc = parsePlanFromResponse(res);

      if (!res?.success) {
        toast.error(res?.error || 'Action refusée');
        if (planDoc) onDone?.(planDoc);
        return;
      }

      const stub = res.dispatch?.stubOnly === true;
      const label = successLabel(kind, res.dispatch?.channel);
      toast.success(stub ? 'Enregistré (mode test)' : label);
      onDone?.(planDoc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const title =
    kind === 'assignment'
      ? wasSent
        ? 'Relancer l’assignation staff'
        : 'Lancer l’assignation staff'
      : wasSent
        ? 'Renvoyer (toujours possible)'
        : 'Envoyer maintenant';

  return (
    <button
      type="button"
      className={`plan-send-btn${loading ? ' plan-send-btn--loading' : ''}${wasSent ? ' plan-send-btn--resent' : ''}`}
      disabled={!canSend}
      title={title}
      onClick={(e) => void handleClick(e)}
      aria-busy={loading}
    >
      {loading ? '…' : wasSent ? '↻' : '▶'}
    </button>
  );
}
