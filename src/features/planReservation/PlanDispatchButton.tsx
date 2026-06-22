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
  /** Indique qu’un envoi a déjà eu lieu — renvoi avec confirmation. */
  wasSent?: boolean;
  itemLabel?: string;
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
  itemLabel = 'ce message',
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

    const isClientMessage = kind === 'message' || kind === 'relance';
    let forceResend = false;
    if (wasSent && isClientMessage) {
      const ok = window.confirm(
        `« ${itemLabel} » a déjà été envoyé avec succès au client (WhatsApp ou OTA/email).\n\nRenvoyer quand même ?`,
      );
      if (!ok) return;
      forceResend = true;
    }

    setBusy(true);
    console.log('[dispatch-test] PlanDispatchButton click', {
      reservationId,
      kind,
      messageIndex,
      taskId,
      itemIndex,
      wasSent,
    });
    try {
      let res: fulltaskApi.PlanDispatchApiResponse;
      if (kind === 'message' && messageIndex != null) {
        res = await fulltaskApi.sendPlanMessage(reservationId, messageIndex, { forceResend });
      } else if (kind === 'relance' && taskId && itemIndex != null) {
        res = await fulltaskApi.sendPlanRelance(reservationId, taskId, itemIndex, { forceResend });
      } else if (kind === 'staff_reminder' && taskId && itemIndex != null) {
        res = await fulltaskApi.sendPlanStaffReminder(reservationId, taskId, itemIndex);
      } else if (kind === 'assignment' && taskId) {
        res = await fulltaskApi.runPlanAssignation(reservationId, taskId);
      } else {
        throw new Error('Paramètres envoi manquants');
      }

      const planDoc = parsePlanFromResponse(res);
      const msg = planDoc?.messages?.[messageIndex ?? -1] as
        | { label?: string; messageId?: string; status?: string; canal?: string }
        | undefined;

      console.log('[dispatch-test] PlanDispatchButton result', {
        success: res?.success,
        channel: res?.dispatch?.channel,
        error: res?.error,
        messageLabel: msg?.label,
        messageId: msg?.messageId,
        messageStatus: msg?.status,
        messageCanal: msg?.canal,
      });

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
      console.error('[dispatch-test] PlanDispatchButton error', err);
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
        ? 'Renvoyer au client (confirmation requise)'
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
