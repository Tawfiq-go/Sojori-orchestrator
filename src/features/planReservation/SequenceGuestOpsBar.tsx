import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import EscaladeForceSlotModal from './EscaladeForceSlotModal';
import type { FulltaskPlanDoc } from './buildPlanViewModel';

const GUEST_SLOT_TYPES = new Set([
  'arrival_choose',
  'departure_choose',
  'arrival_declare',
  'departure_declare',
]);

export default function SequenceGuestOpsBar({
  reservationId,
  taskId,
  taskType,
  hasRelances,
  actionCompleted,
  clientChosenTime,
  checkInIso,
  onDone,
}: {
  reservationId: string;
  taskId: string;
  taskType: string;
  hasRelances: boolean;
  actionCompleted?: boolean;
  /** Heure déjà choisie (HH:mm) — workflow terminé mais toujours modifiable. */
  clientChosenTime?: string;
  checkInIso?: string;
  onDone?: (planDoc?: FulltaskPlanDoc) => void;
}) {
  const [busy, setBusy] = useState<'wa' | 'ota' | null>(null);
  const [slotOpen, setSlotOpen] = useState(false);

  const showManualRelance = hasRelances && !actionCompleted;
  const showForceSlot = GUEST_SLOT_TYPES.has(taskType);
  const isModify = Boolean(actionCompleted && clientChosenTime);

  if (!showManualRelance && !showForceSlot) return null;

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
        {showManualRelance ? (
          <>
            <button
              type="button"
              className="seq-guest-ops-btn"
              disabled={Boolean(busy)}
              onClick={() => void sendExtra('whatsapp')}
              title="Relance hors planning (WhatsApp) — distincte des ▶ programmées"
            >
              {busy === 'wa' ? '…' : 'Relance manuelle WA'}
            </button>
            <button
              type="button"
              className="seq-guest-ops-btn"
              disabled={Boolean(busy)}
              onClick={() => void sendExtra('OTA')}
              title="Relance hors planning (OTA)"
            >
              {busy === 'ota' ? '…' : 'Relance manuelle OTA'}
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
