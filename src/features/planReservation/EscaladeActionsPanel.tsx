import { useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { FulltaskPlanDoc } from './buildPlanViewModel';
import EscaladeCallStaffModal from './EscaladeCallStaffModal';
import EscaladeForceSlotModal from './EscaladeForceSlotModal';
import PlanManualAssignModal from './PlanManualAssignModal';
import type { Escalade, StaffAssignmentPlan } from './types';

function telHref(phone: string): string {
  const digits = String(phone).replace(/\D/g, '');
  return digits ? `tel:+${digits.replace(/^\+/, '')}` : '';
}

function waHref(phone: string, text: string): string {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function ActionBtn({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`escalade-action-btn${danger ? ' escalade-action-btn--danger' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="escalade-action-btn-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

interface Props {
  reservationId: string;
  taskId: string;
  taskType: string;
  escalade: Escalade;
  guestPhone?: string;
  guestName?: string;
  reservationRef?: string;
  staffAssignment?: StaffAssignmentPlan;
  clientChosenTime?: string;
  onDispatched?: (planDoc?: FulltaskPlanDoc) => void;
}

export default function EscaladeActionsPanel({
  reservationId,
  taskId,
  taskType,
  escalade,
  guestPhone,
  guestName,
  reservationRef,
  staffAssignment,
  clientChosenTime,
  onDispatched,
}: Props) {
  const escaladeActive = escalade.status === 'active';
  const [forceSlotOpen, setForceSlotOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [callStaffOpen, setCallStaffOpen] = useState(false);
  const isGuestSlot = /^(arrival|departure)_(choose|declare)$/.test(taskType);
  const slotLabel = isGuestSlot
    ? clientChosenTime
      ? `Modifier l’heure · ${clientChosenTime}`
      : 'Choisir l’heure'
    : 'Forcer créneau';

  const defaultWaText = taskType.includes('departure')
    ? `Bonjour${guestName ? ` ${guestName.split(/\s+/)[0]}` : ''}, c'est l'équipe Sojori pour votre départ (${reservationRef || ''}). Pouvez-vous confirmer votre créneau ?`
    : `Bonjour${guestName ? ` ${guestName.split(/\s+/)[0]}` : ''}, c'est l'équipe Sojori pour votre arrivée (${reservationRef || ''}). Pouvez-vous confirmer votre créneau ?`;

  const callGuest = () => {
    const href = guestPhone ? telHref(guestPhone) : '';
    if (!href) {
      toast.warn('Téléphone client indisponible sur ce plan');
      return;
    }
    window.location.href = href;
  };

  const whatsAppGuest = () => {
    const href = guestPhone ? waHref(guestPhone, defaultWaText) : '';
    if (!href) {
      toast.warn('Téléphone client indisponible pour WhatsApp');
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const callAssignedStaff = () => {
    if (!staffAssignment?.staffName) {
      toast.warn('Aucun staff assigné sur cette séquence');
      return;
    }
    setCallStaffOpen(true);
  };

  const cancelTask = async () => {
    if (
      !window.confirm(
        'Annuler cette tâche ? La séquence passera en annulé (action irréversible côté opérations).',
      )
    ) {
      return;
    }
    try {
      const res = await fulltaskApi.deleteTask(taskId);
      if (res?.success === false) {
        toast.error(res?.error || 'Annulation refusée');
        return;
      }
      toast.success('Tâche annulée');
      onDispatched?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur annulation');
    }
  };

  return (
    <>
      <p
        className={`escalade-actions-hint${escaladeActive ? ' escalade-actions-hint--active' : ''}`}
      >
        {escaladeActive
          ? 'Escalade active — intervention admin.'
          : 'Actions admin — disponibles à tout moment (même avant deadline).'}
      </p>

      <div className="escalade-actions-grid">
        <ActionBtn icon="📞" label="Appeler le client" onClick={callGuest} />
        <ActionBtn icon="💬" label="WhatsApp client" onClick={whatsAppGuest} />
        <ActionBtn
          icon="📞"
          label={
            staffAssignment?.staffName
              ? `Appeler ${staffAssignment.staffName}`
              : 'Appeler staff assigné'
          }
          onClick={callAssignedStaff}
        />
        <ActionBtn icon="👤" label="Assigner staff" onClick={() => setAssignOpen(true)} />
        <ActionBtn icon="📋" label="Appeler un staff" onClick={() => setCallStaffOpen(true)} />
        <ActionBtn icon="⏰" label={slotLabel} onClick={() => setForceSlotOpen(true)} />
        <ActionBtn icon="❌" label="Annuler la tâche" danger onClick={() => void cancelTask()} />
      </div>

      <EscaladeForceSlotModal
        open={forceSlotOpen}
        reservationId={reservationId}
        taskId={taskId}
        taskType={taskType}
        mode={clientChosenTime ? 'modify' : 'choose'}
        initialTime={clientChosenTime}
        onClose={() => setForceSlotOpen(false)}
        onSubmitted={onDispatched}
      />
      <PlanManualAssignModal
        open={assignOpen}
        reservationId={reservationId}
        taskId={taskId}
        onClose={() => setAssignOpen(false)}
        onDone={onDispatched}
      />
      <EscaladeCallStaffModal
        open={callStaffOpen}
        reservationId={reservationId}
        taskId={taskId}
        highlightName={staffAssignment?.staffName}
        onClose={() => setCallStaffOpen(false)}
      />
    </>
  );
}
