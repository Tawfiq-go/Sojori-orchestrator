import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import EscaladeForceSlotModal from './EscaladeForceSlotModal';
import PlanAssignButtons from './PlanAssignButtons';
import type { FulltaskPlanDoc } from './buildPlanViewModel';

const GUEST_SLOT_TYPES = new Set([
  'arrival_choose',
  'departure_choose',
  'arrival_declare',
  'departure_declare',
]);

/** Relancer client (Actions admin) — pas de bloc Relances en mode Manuel. */
const GUEST_RELANCE_TYPES = new Set([
  'arrival_choose',
  'departure_choose',
  'arrival_declare',
  'departure_declare',
  'registration',
]);

/**
 * Tâches ops staff — Assigner / Rappeler dans Actions admin (sans dépendre des blocs Auto).
 * Inclut checkout_cleaning (Ménage Sojori) + aliases grocery/groceries/concierge.
 */
const GUEST_ONLY_TYPES = new Set([
  'arrival_choose',
  'departure_choose',
  'arrival_declare',
  'departure_declare',
  'registration',
]);

function isStaffAssignableType(taskType: string): boolean {
  if (!taskType || GUEST_ONLY_TYPES.has(taskType)) return false;
  return true;
}

export default function SequenceGuestOpsBar({
  reservationId,
  taskId,
  taskType,
  hasAssignation,
  staffAssigned,
  actionCompleted,
  clientChosenTime,
  checkInIso,
  guestManualSendDisabled,
  onDone,
}: {
  reservationId: string;
  taskId: string;
  taskType: string;
  /** true si séquence a un bloc Assignation significatif (staff / Auto). */
  hasAssignation?: boolean;
  /** Staff déjà trouvé / en attente acceptation — active « Rappeler ». */
  staffAssigned?: boolean;
  actionCompleted?: boolean;
  clientChosenTime?: string;
  checkInIso?: string;
  /** Listing : bloque Relancer client (y compris WA/OTA). */
  guestManualSendDisabled?: boolean;
  onDone?: (planDoc?: FulltaskPlanDoc) => void;
}) {
  const [busy, setBusy] = useState<'wa' | 'ota' | 'staff' | null>(null);
  const [slotOpen, setSlotOpen] = useState(false);

  const showManualRelance =
    !guestManualSendDisabled &&
    !actionCompleted &&
    GUEST_RELANCE_TYPES.has(taskType);
  const showForceSlot = GUEST_SLOT_TYPES.has(taskType);
  // Assigner dans Actions admin tant que pas déjà un bloc Assignation (évite doublon).
  const showManualAssign = isStaffAssignableType(taskType) && !hasAssignation;
  // Rappeler staff : visible pour ops staff, actif seulement si staff assigné.
  const showManualStaffRappel = isStaffAssignableType(taskType);
  const canRappeler = Boolean(staffAssigned);
  const isModify = Boolean(actionCompleted && clientChosenTime);

  if (!showManualRelance && !showForceSlot && !showManualAssign && !showManualStaffRappel) {
    return null;
  }

  const sendExtra = async (channel: 'whatsapp' | 'OTA') => {
    if (busy) return;
    setBusy(channel === 'whatsapp' ? 'wa' : 'ota');
    try {
      const res = await fulltaskApi.sendExtraPlanRelance(reservationId, taskId, channel);
      if (res?.success === false) throw new Error(res?.error || 'Échec');
      toast.success(
        channel === 'whatsapp'
          ? 'Relance manuelle WhatsApp envoyée'
          : 'Relance manuelle OTA envoyée',
      );
      onDone?.(res?.data as FulltaskPlanDoc | undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec relance manuelle');
    } finally {
      setBusy(null);
    }
  };

  const sendStaffReminder = async () => {
    if (busy || !canRappeler) return;
    setBusy('staff');
    try {
      const res = await fulltaskApi.sendExtraPlanStaffReminder(reservationId, taskId);
      if (res?.success === false) throw new Error(res?.error || 'Échec');
      toast.success('Rappel staff envoyé');
      onDone?.(res?.data as FulltaskPlanDoc | undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec rappel staff');
    } finally {
      setBusy(null);
    }
  };

  const cockpitDate = checkInIso?.slice(0, 10);
  const slotBtnLabel = isModify
    ? `Modifier · ${clientChosenTime}`
    : actionCompleted
      ? 'Modifier l’heure'
      : 'Choisir l’heure';

  return (
    <>
      <div className="seq-guest-ops" onClick={(e) => e.stopPropagation()}>
        <span className="seq-guest-ops-lbl">Actions admin</span>
        {showManualAssign ? (
          <span className="seq-guest-ops-assign" title="Assignation manuelle (sans créneau auto)">
            <PlanAssignButtons
              reservationId={reservationId}
              taskId={taskId}
              wasAssigned={false}
              disabled={false}
              onDone={onDone}
            />
          </span>
        ) : null}
        {showManualStaffRappel ? (
          <button
            type="button"
            className={`seq-guest-ops-btn${canRappeler ? '' : ' seq-guest-ops-btn--muted'}`}
            disabled={Boolean(busy) || !canRappeler}
            onClick={() => void sendStaffReminder()}
            title={
              canRappeler
                ? 'Rappel staff hors planning'
                : 'Assignez un staff (Auto / Manuel) avant de rappeler'
            }
          >
            {busy === 'staff' ? '…' : 'Rappeler'}
          </button>
        ) : null}
        {showManualRelance ? (
          <>
            <button
              type="button"
              className="seq-guest-ops-btn"
              disabled={Boolean(busy)}
              onClick={() => void sendExtra('whatsapp')}
              title="Relance hors planning (WhatsApp)"
            >
              {busy === 'wa' ? '…' : 'Relancer WA'}
            </button>
            <button
              type="button"
              className="seq-guest-ops-btn"
              disabled={Boolean(busy)}
              onClick={() => void sendExtra('OTA')}
              title="Relance hors planning (OTA)"
            >
              {busy === 'ota' ? '…' : 'Relancer OTA'}
            </button>
          </>
        ) : null}
        {showForceSlot ? (
          <button
            type="button"
            className="seq-guest-ops-btn seq-guest-ops-btn--accent"
            onClick={() => setSlotOpen(true)}
            title={
              isModify
                ? 'Modifier l’heure — statut reste Terminé · met à jour Accueil (si actif)'
                : 'Choisir l’heure — termine le workflow · crée/maj Accueil'
            }
          >
            {slotBtnLabel}
          </button>
        ) : null}
        <Link
          className="seq-guest-ops-link"
          to={
            cockpitDate
              ? `/orchestration/cockpit?date=${encodeURIComponent(cockpitDate)}&reservationId=${encodeURIComponent(reservationId)}`
              : `/orchestration/cockpit?reservationId=${encodeURIComponent(reservationId)}`
          }
        >
          Cockpit chaînes →
        </Link>
      </div>
      {slotOpen ? (
        <EscaladeForceSlotModal
          open={slotOpen}
          reservationId={reservationId}
          taskId={taskId}
          taskType={taskType}
          mode={isModify || actionCompleted ? 'modify' : 'choose'}
          initialTime={clientChosenTime}
          onClose={() => setSlotOpen(false)}
          onSubmitted={(doc) => {
            onDone?.(doc);
            setSlotOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
