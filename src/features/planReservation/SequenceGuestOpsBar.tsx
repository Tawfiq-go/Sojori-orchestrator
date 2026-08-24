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

  type FlightPanel = {
    error?: string;
    flightNumber?: string;
    statusLine?: string;
    provider?: { name: string; whatsapp: string } | null;
    checks?: Array<{ kind: string; plannedAt: string; ranAt?: string; status?: string; delayMinutes?: number | null }>;
    nextCheckAt?: string | null;
  };
  const [flight, setFlight] = useState<FlightPanel | null>(null);
  const [flightBusy, setFlightBusy] = useState(false);

  const checkFlight = async () => {
    setFlightBusy(true);
    try {
      const d = await fulltaskApi.getTaskFlightStatus(taskId);
      if (!d.hasFlight) {
        setFlight({ error: 'Aucun numéro de vol sur cette course.' });
        return;
      }
      const snap = (d.live?.snapshot ?? {}) as {
        status?: string;
        arrivalDelayMinutes?: number | null;
        estimatedInUtc?: string | null;
        actualInUtc?: string | null;
      };
      const delay = Number(snap.arrivalDelayMinutes ?? 0);
      const when = snap.actualInUtc || snap.estimatedInUtc || '';
      const hhmm = when
        ? new Date(when).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Africa/Casablanca',
          })
        : '';
      const statusLine = d.live?.found
        ? `${snap.status || '?'}${delay ? ` · retard ${delay} min` : ' · à l’heure'}${hhmm ? ` · arrivée ${hhmm}` : ''}`
        : `introuvable (${d.live?.reason || '?'})`;
      setFlight({
        flightNumber: d.flightNumber,
        statusLine,
        provider: d.provider ?? null,
        checks: d.tracking?.checks ?? [],
        nextCheckAt: d.nextCheck?.plannedAt ?? null,
      });
    } catch {
      setFlight({ error: 'Statut vol indisponible.' });
    } finally {
      setFlightBusy(false);
    }
  };

  const CHECK_LABELS: Record<string, string> = {
    j1: 'J-1 (la veille, 18h)',
    takeoff: 'Décollage',
    landing: 'Atterrissage',
  };
  const fmtCheckDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Casablanca',
    });

  return (
    <>
      <div className="seq-guest-ops" onClick={(e) => e.stopPropagation()}>
        <span className="seq-guest-ops-lbl">Actions admin</span>
        {taskType === 'transport' ? (
          <button
            type="button"
            className="seq-guest-ops-btn"
            disabled={flightBusy}
            title="Interroger FlightAware en direct — n'altère pas les passes du cron"
            onClick={checkFlight}
          >
            {flightBusy ? '✈️ …' : '✈️ Vol'}
          </button>
        ) : null}
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
      {flight ? (
        <div className="seq-guest-ops-flight" onClick={(e) => e.stopPropagation()}>
          {flight.error ? (
            <div className="seq-guest-ops-flight-line">✈️ {flight.error}</div>
          ) : (
            <>
              <div className="seq-guest-ops-flight-line">
                <strong>✈️ {flight.flightNumber}</strong> · {flight.statusLine}
              </div>
              {flight.provider?.whatsapp ? (
                <div className="seq-guest-ops-flight-line">
                  🚗 Chauffeur : {flight.provider.name || 'provider'} · {flight.provider.whatsapp}
                </div>
              ) : null}
              {(flight.checks ?? []).length ? (
                <div className="seq-guest-ops-flight-checks">
                  {(flight.checks ?? []).map((c) => (
                    <div key={`${c.kind}-${c.plannedAt}`} className="seq-guest-ops-flight-line">
                      {c.ranAt ? '✓' : '•'} {CHECK_LABELS[c.kind] || c.kind} — appel API{' '}
                      {c.ranAt ? `fait le ${fmtCheckDate(c.ranAt)}` : `prévu le ${fmtCheckDate(c.plannedAt)}`}
                      {c.status ? ` → ${c.status}` : ''}
                      {typeof c.delayMinutes === 'number' && c.delayMinutes ? ` (retard ${c.delayMinutes} min)` : ''}
                    </div>
                  ))}
                  <div className="seq-guest-ops-flight-line seq-guest-ops-flight-note">
                    Les passes se recalent sur les horaires réels du vol après chaque appel.
                  </div>
                </div>
              ) : (
                <div className="seq-guest-ops-flight-line">
                  Suivi non planifié (activez « Suivi du vol » dans la config Transport — le cron pose les passes
                  sous 10 min).
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
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
