import { useState, type ReactNode } from 'react';
import type {
  AssignAttempt,
  Channel,
  EventStatus,
  PlanGuestRelanceItem,
  PlanSequenceView,
  PlanStaffReminderItem,
  RelanceStatus,
  StaffAssignmentPlan,
} from './types';
import DispatchLastSendLine from './DispatchLastSendLine';
import DispatchPreviewChips from './DispatchPreviewChips';
import MessageBodyPreview from './MessageBodyPreview';
import PlanAssignButtons from './PlanAssignButtons';
import PlanDispatchButton from './PlanDispatchButton';
import EscaladeActionsPanel from './EscaladeActionsPanel';
import SequenceGuestOpsBar from './SequenceGuestOpsBar';
import { assignationCollapseCountLabel } from './buildPlanViewModel';
import {
  groupStatusLabel,
  relancesGroupStatusLabel,
  staffRemindersGroupStatusLabel,
  relanceExecutionEventStatus,
  relanceExecutionLabel,
  sequenceStatusLabel,
  showRelanceConfigHint,
} from './planGroupStatus';
import { formatSkipReason, formatSkipReasonShort } from '../../utils/planStatusMappers';

function defaultOpenForStatus(_status: EventStatus): boolean {
  return false;
}

function GroupStatusBadge({ status, label }: { status: EventStatus; label?: string }) {
  return (
    <span className={`st-badge group-st ${status}`}>{label ?? groupStatusLabel(status)}</span>
  );
}

function ChannelChip({ channel }: { channel: Channel }) {
  return (
    <span className={`ch-chip ${channel === 'wa' ? 'wa' : channel}`}>
      {channel === 'wa' ? 'WA' : channel.toUpperCase()}
    </span>
  );
}

function CollapseBlock({
  icon,
  title,
  groupStatus,
  groupStatusLabel: statusLabel,
  countLabel,
  defaultOpen,
  children,
}: {
  icon: string;
  title: string;
  groupStatus: EventStatus;
  groupStatusLabel?: string;
  countLabel: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className={`l2-block${open ? ' open' : ''}`}>
      <button type="button" className="l2-block-h" onClick={() => setOpen((o) => !o)}>
        <span className="l2-em">{icon}</span>
        <span className="l2-title">{title}</span>
        <GroupStatusBadge status={groupStatus} label={statusLabel} />
        <span className="l2-ct">{countLabel}</span>
        <span className="l2-arr">▶</span>
      </button>
      {open ? <div className="l2-block-body">{children}</div> : null}
    </div>
  );
}

function RelanceStatusBadge({
  status,
  skipReason,
}: {
  status: PlanGuestRelanceItem['executionStatus'];
  skipReason?: string;
}) {
  const ev = relanceExecutionEventStatus(status);
  const short = skipReason ? formatSkipReasonShort(skipReason) : '';
  const label =
    status === 'sautee' && short
      ? `Sautée · ${short}`
      : relanceExecutionLabel(status);
  return (
    <span className={`st-badge sm rel-exec ${ev}${status === 'sautee' && short ? ' intentional' : ''}`} title={formatSkipReason(skipReason) || undefined}>
      {label}
    </span>
  );
}

function RelanceRows({
  items,
  showWa,
  reservationId,
  taskId,
  onDispatched,
}: {
  items: PlanGuestRelanceItem[];
  showWa?: boolean;
  reservationId: string;
  taskId: string;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  return (
    <div className="l3-list">
      {items.map((r) => (
        <RelanceDispatchRow
          key={r.id}
          r={r}
          showWa={showWa}
          reservationId={reservationId}
          taskId={taskId}
          onDispatched={onDispatched}
        />
      ))}
    </div>
  );
}

function RelanceDispatchRow({
  r,
  showWa,
  reservationId,
  taskId,
  onDispatched,
}: {
  r: PlanGuestRelanceItem;
  showWa?: boolean;
  reservationId: string;
  taskId: string;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  const [rowLoading, setRowLoading] = useState(false);
  const wasSent = r.rawStatus === 'envoyee' || r.rawStatus === 'fait';

  return (
        <div
          className={`rel-row rel-row--${r.executionStatus}${rowLoading ? ' rel-row--dispatching' : ''}`}
        >
          <PlanDispatchButton
            reservationId={reservationId}
            kind="relance"
            taskId={taskId}
            itemIndex={r.relanceIndex}
            wasSent={wasSent}
            itemLabel={r.label}
            disabled={false}
            onLoadingChange={setRowLoading}
            onDone={onDispatched}
          />
          <span
            className={`dot ${r.status === 'sent' ? 'sent' : r.status === 'skipped' ? 'skipped' : 'scheduled'}`}
          />
          <div className="rel-row-main">
            <div className="rel-row-top">
              {r.scheduleOffsetLabel ? (
                <span className="rel-offset">{r.scheduleOffsetLabel}</span>
              ) : null}
              <span className="when">{r.dueAt}</span>
              <span className="nm">
                #{r.step} · {r.label}
              </span>
              <RelanceStatusBadge status={r.executionStatus} skipReason={r.skipReason} />
              {r.dispatchPreview ? (
                <DispatchPreviewChips preview={r.dispatchPreview} />
              ) : showWa !== false && r.channel ? (
                <ChannelChip channel={r.channel} />
              ) : null}
            </div>
            {showRelanceConfigHint(r.executionStatus) && (r.catalogTemplate || r.dispatchPreview || r.channel) ? (
              <div className="rel-row-config">
                Config · {r.catalogTemplate || '—'}
                {r.dispatchPreview ? (
                  <> · Envoi prévu · {r.dispatchPreview.label}</>
                ) : r.channel ? (
                  ` · ${r.channel.toUpperCase()}`
                ) : (
                  ''
                )}
              </div>
            ) : null}
            <DispatchLastSendLine last={r.lastDispatch} attempt={r.lastDispatchAttempt} />
            {r.skipReason &&
            (r.executionStatus === 'sautee' ||
              r.skipReason === 'reporte_avant_arrivee' ||
              r.skipReason === 'decale_collision_arrivee') ? (
              <div className={`rel-row-config rel-row-motif${r.executionStatus === 'sautee' ? ' sautee' : ''}`}>
                Motif · {formatSkipReasonShort(r.skipReason)}
              </div>
            ) : null}
            <MessageBodyPreview
              reservationId={reservationId}
              kind="relance"
              taskId={taskId}
              relanceIndex={r.relanceIndex}
            />
          </div>
        </div>
  );
}

function assignExecutionLine(assign: StaffAssignmentPlan): string {
  if (assign.status === 'found' && assign.staffName) {
    return `Exécution · staff accepté · ${assign.staffName}`;
  }
  if (assign.status === 'pending_accept' && assign.staffName) {
    return `Exécution · staff assigné · en attente acceptation · ${assign.staffName}`;
  }
  if (assign.assignationExhausted) {
    return assign.lmFailureLabel
      ? `Exécution · LM échoué · ${assign.lmFailureLabel} · plus de relance`
      : 'Exécution · échec assignation · plus de relance';
  }
  if (assign.status === 'failed') {
    if (assign.staffName) {
      return `Exécution · ${assign.staffName} proposé — non accepté (échu)`;
    }
    return 'Exécution · échec assignation';
  }
  if (assign.hasPendingLmAssign) {
    return `Exécution · ${assign.nextAssignmentLabel || 'Assignation LM · immédiat (1 tentative)'}`;
  }
  if (assign.windowPast) return 'Exécution · fenêtre passée sans assignation confirmée';
  if (assign.windowOpen) return 'Exécution · fenêtre ouverte';
  if (assign.windowFuture) return 'Prévu · fenêtre à venir';
  return 'Exécution · assignation en cours';
}

function AssignBlockBody({
  assign,
  attempts,
  lmAssignSlots,
  reservationId,
  taskId,
  onDispatched,
}: {
  assign: StaffAssignmentPlan;
  attempts?: AssignAttempt[];
  lmAssignSlots?: import('./types').PlanAssignLmItem[];
  reservationId: string;
  taskId: string;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  const [rowLoading, setRowLoading] = useState(false);
  const hasStaffAssigned =
    (assign.status === 'found' || assign.status === 'pending_accept') &&
    Boolean(assign.staffName);
  const staffAccepted = assign.status === 'found' && Boolean(assign.staffName);
  const showConfig =
    assign.triggerMode === 'auto' ||
    Boolean(assign.assignDaysLabel) ||
    !assign.windowPast ||
    assign.status === 'searching' ||
    assign.hasPendingLmAssign ||
    assign.assignationExhausted;
  return (
    <>
      <div
        className={`rel-row rel-row--assign${rowLoading ? ' rel-row--dispatching' : ''}`}
        style={{ borderBottom: '1px dashed var(--b)', paddingBottom: 8, marginBottom: 8 }}
      >
        <PlanAssignButtons
          reservationId={reservationId}
          taskId={taskId}
          wasAssigned={hasStaffAssigned}
          disabled={false}
          onLoadingChange={setRowLoading}
          onDone={onDispatched}
        />
        <div className="rel-row-main">
          <div className="rel-row-top">
            <span className="nm">Assignation staff</span>
            <span className="when" style={{ minWidth: 'auto', fontWeight: 600 }}>
              {staffAccepted ? (
                <span className="assign-staff-accepted">
                  Staff accepté · {assign.staffName}
                </span>
              ) : hasStaffAssigned ? (
                <span className="assign-staff-pending">
                  Staff assigné · {assign.staffName}
                </span>
              ) : (
                'Auto ou choix manuel'
              )}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`assign-exec-line${assign.windowPast && !assign.hasPendingLmAssign ? ' past' : ''}${staffAccepted ? ' assign-exec-line--accepted' : ''}${hasStaffAssigned && !staffAccepted ? ' assign-exec-line--pending' : ''}`}
      >
        {staffAccepted ? (
          <>
            Exécution ·{' '}
            <span className="assign-staff-accepted">
              Staff accepté · {assign.staffName}
            </span>
          </>
        ) : hasStaffAssigned ? (
          <>
            Exécution ·{' '}
            <span className="assign-staff-pending">
              Staff assigné · {assign.staffName}
            </span>
          </>
        ) : (
          assignExecutionLine(assign)
        )}
      </div>
      {showConfig ? (
      <div className="assign-config-grid">
        <div className="cfg-cell">
          <span className="cfg-lbl">{assign.assignDaysLabel ? 'Jours' : 'Fenêtre'}</span>
          <span className="cfg-val">{assign.windowRange}</span>
        </div>
        <div className="cfg-cell">
          <span className="cfg-lbl">Mode</span>
          <span className="cfg-val">{assign.modeLabel}</span>
        </div>
        {assign.toleranceLabel ? (
          <div className="cfg-cell">
            <span className="cfg-lbl">Tolérance</span>
            <span className="cfg-val">{assign.toleranceLabel}</span>
          </div>
        ) : null}
        <div className="cfg-cell">
          <span className="cfg-lbl">Créneaux</span>
          <span className="cfg-val">{assign.slotsLabel}</span>
        </div>
        <div className="cfg-cell">
          <span className="cfg-lbl">Planning staff</span>
          <span className="cfg-val">
            {assign.assignmentHoursMode === 'always' ? 'Toujours' : 'Heures planning'}
          </span>
        </div>
        {assign.findAnotherStaff && !assign.autoAssign ? (
          <div className="cfg-cell">
            <span className="cfg-lbl">Relâche</span>
            <span className="cfg-val">Autre staff si refus</span>
          </div>
        ) : null}
      </div>
      ) : null}
      {showConfig ? (
        <>
          <div className="assign-next">{assign.nextAssignmentLabel}</div>
          <div className="assign-next assign-next--last">{assign.lastAssignmentLabel}</div>
        </>
      ) : null}
      {assign.staffName && assign.status === 'found' ? (
        <div className="assign-winner assign-winner--accepted">
          ✓{' '}
          <span className="assign-staff-accepted">
            Staff accepté · {assign.staffName}
          </span>
        </div>
      ) : null}
      {assign.staffName && assign.status === 'pending_accept' ? (
        <div className="assign-winner assign-winner--pending">
          ⏳{' '}
          <span className="assign-staff-pending">
            Staff assigné · {assign.staffName}
          </span>
        </div>
      ) : null}
      {lmAssignSlots && lmAssignSlots.length > 0 ? (
        <div className="assign-track" style={{ marginTop: 10 }}>
          <div className="l3-sub-h">Créneau assignation LM</div>
          {lmAssignSlots.map((r) => (
            <div key={r.id} className={`rel-row rel-row--${r.executionStatus}`}>
              <span
                className={`dot ${r.status === 'sent' ? 'sent' : r.status === 'skipped' ? 'skipped' : 'scheduled'}`}
              />
              <div className="rel-row-main">
                <div className="rel-row-top">
                  {r.scheduleOffsetLabel ? (
                    <span className="rel-offset">{r.scheduleOffsetLabel}</span>
                  ) : null}
                  <span className="when">{r.dueAt}</span>
                  <span className="nm">
                    #{r.step} · {r.label}
                  </span>
                  <RelanceStatusBadge status={r.executionStatus} skipReason={r.skipReason} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {attempts && attempts.length > 0 ? (
        <AttemptsHistoryCollapse attempts={attempts} />
      ) : (
        <div className="l3-empty">Aucune tentative enregistrée pour l&apos;instant.</div>
      )}
    </>
  );
}

function AttemptsHistoryCollapse({ attempts }: { attempts: AssignAttempt[] }) {
  const [open, setOpen] = useState(true);
  const last = attempts[attempts.length - 1];
  const headHint = last
    ? last.result === 'accepted'
      ? ` · dernier ✓ ${last.staffName}`
      : last.result === 'declined' || last.result === 'timeout'
        ? ` · dernier échec · ${last.failureLabel || last.staffName}`
        : last.result === 'pending'
          ? ` · dernier ⏳ ${last.staffName}`
          : ''
    : '';
  return (
    <div className={`assign-track assign-attempts${open ? ' open' : ''}`}>
      <button
        type="button"
        className="l3-sub-h l3-sub-h--toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>
          Historique tentatives · {attempts.length}
          {!open ? headHint : ''}
        </span>
        <span className="l2-arr" aria-hidden>
          ▶
        </span>
      </button>
      {open
        ? attempts.map((a) => (
            <div key={a.id} className="attempt">
              <span className="step">#{a.step}</span>
              <span className="when">{a.triedAt}</span>
              <span className="who">
                {a.staffName}
                {a.staffRole ? <small>{a.staffRole}</small> : null}
              </span>
              <span className={`res ${a.result}`} title={a.failureLabel}>
                {resultLabel(a.result)}
              </span>
            </div>
          ))
        : null}
    </div>
  );
}

function StaffReminderRows({
  items,
  reservationId,
  taskId,
  onDispatched,
}: {
  items: PlanStaffReminderItem[];
  reservationId: string;
  taskId: string;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  return (
    <div className="l3-list">
      {items.map((r) => (
        <StaffReminderDispatchRow
          key={r.id}
          r={r}
          reservationId={reservationId}
          taskId={taskId}
          onDispatched={onDispatched}
        />
      ))}
    </div>
  );
}

function StaffReminderDispatchRow({
  r,
  reservationId,
  taskId,
  onDispatched,
}: {
  r: PlanStaffReminderItem;
  reservationId: string;
  taskId: string;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  const [rowLoading, setRowLoading] = useState(false);
  const wasSent = r.rawStatus === 'envoyee' || r.rawStatus === 'fait';

  return (
        <div
          key={r.id}
          className={`rel-row rel-row--${r.executionStatus}${rowLoading ? ' rel-row--dispatching' : ''}`}
        >
          <PlanDispatchButton
            reservationId={reservationId}
            kind="staff_reminder"
            taskId={taskId}
            itemIndex={r.reminderIndex}
            wasSent={wasSent}
            disabled={false}
            onLoadingChange={setRowLoading}
            onDone={onDispatched}
          />
          <span
            className={`dot ${r.status === 'sent' ? 'sent' : r.status === 'skipped' ? 'skipped' : 'scheduled'}`}
          />
          <div className="rel-row-main">
            <div className="rel-row-top">
              {r.scheduleOffsetLabel ? (
                <span className="rel-offset">{r.scheduleOffsetLabel}</span>
              ) : null}
              <span className="when">{r.dueAt}</span>
              <span className="nm">{r.label}</span>
              <RelanceStatusBadge status={r.executionStatus} skipReason={r.skipReason} />
            </div>
            {showRelanceConfigHint(r.executionStatus) && r.whatsappTemplateId ? (
              <div className="rel-row-config">Config WA · {r.whatsappTemplateId}</div>
            ) : r.executionStatus === 'envoyee' && r.whatsappTemplateId ? (
              <div className="rel-row-config muted">Template · {r.whatsappTemplateId}</div>
            ) : null}
            <DispatchLastSendLine last={r.lastDispatch} attempt={r.lastDispatchAttempt} />
            {r.executionStatus === 'sautee' && r.skipReason ? (
              <div className="rel-row-config rel-row-motif sautee">
                Motif · {formatSkipReasonShort(r.skipReason)}
              </div>
            ) : null}
          </div>
        </div>
  );
}

function resultLabel(r: AssignAttempt['result']): string {
  if (r === 'accepted') return 'SUCCÈS';
  if (r === 'declined') return 'ÉCHEC';
  if (r === 'timeout') return 'NON ACCEPTÉ';
  return 'TROUVÉ';
}

/** Résumé ligne fermée — uniquement infos utiles (pas de « 0 relances » / « escalade off »). */
type SubtitlePart = {
  text: string;
  tone?: 'chosen' | 'accepted' | 'assigned';
};

function sequenceConfigSubtitleParts(seq: PlanSequenceView): SubtitlePart[] {
  const parts: SubtitlePart[] = [];

  const rel = seq.relances?.length ?? 0;
  if (rel > 0) {
    parts.push({ text: `${rel} relance${rel !== 1 ? 's' : ''}` });
  }

  const staffRel = seq.staffReminders?.length ?? 0;
  if (staffRel > 0) {
    parts.push({ text: `${staffRel} rappel staff` });
  }

  const assign = seq.staffAssignment;
  if (seq.hasAssignation && assign) {
    const name = assign.staffName?.trim();
    const withName = (label: string) => (name ? `${label} · ${name}` : label);
    const taskSt = String(seq.taskStatus || '').trim();

    if (taskSt === 'doing' && (assign.status === 'found' || assign.status === 'pending_accept')) {
      parts.push({ text: withName('Staff commencé'), tone: 'accepted' });
    } else if (assign.status === 'found') {
      parts.push({
        text: withName(taskSt === 'done' ? 'Staff terminé' : 'Staff accepté'),
        tone: 'accepted',
      });
    } else if (assign.status === 'pending_accept') {
      parts.push({ text: withName('Staff assigné'), tone: 'assigned' });
    } else if (assign.status === 'failed') {
      parts.push({ text: 'Assignation échouée' });
    } else if (assign.status === 'searching') {
      const lastFail = seq.attempts?.length
        ? seq.attempts[seq.attempts.length - 1]
        : undefined;
      if (
        lastFail &&
        (lastFail.result === 'declined' || lastFail.result === 'timeout') &&
        (lastFail.failureLabel || lastFail.staffName)
      ) {
        parts.push({ text: `Assignation · ${lastFail.failureLabel || lastFail.staffName}` });
      } else {
        parts.push({ text: 'Assignation en cours' });
      }
    }
  }

  if (seq.clientActionCompleted && seq.clientChosenTime && seq.taskType !== 'registration') {
    parts.push({
      text:
        seq.taskType === 'departure_choose' || seq.taskType === 'departure_declare'
          ? `départ · ${seq.clientChosenTime}`
          : `arrivée · ${seq.clientChosenTime}`,
      tone: 'chosen',
    });
  }

  if (seq.hasEscalade && seq.escalade) {
    if (seq.escalade.triggerMode === 'manual' && seq.escalade.status === 'en_attente') {
      parts.push({ text: 'escalade manuel' });
    } else if (seq.escalade.scheduleOffsetLabel) {
      parts.push({ text: `escalade ${seq.escalade.scheduleOffsetLabel}` });
    } else if (seq.escalade.status === 'active') {
      parts.push({ text: 'escalade active' });
    } else {
      parts.push({ text: 'escalade' });
    }
  }

  return parts;
}

function relanceCountSummary(
  items: { executionStatus: PlanGuestRelanceItem['executionStatus'] }[],
  actionCompleted = false,
  registrationProgress?: { registered: number; total: number },
): string {
  if (actionCompleted && registrationProgress && registrationProgress.total > 0) {
    return `${registrationProgress.registered}/${registrationProgress.total} enregistrés`;
  }
  if (actionCompleted) return 'action client complétée';
  const envoyee = items.filter((r) => r.executionStatus === 'envoyee').length;
  const sautee = items.filter((r) => r.executionStatus === 'sautee').length;
  const echec = items.filter((r) => r.executionStatus === 'echec').length;
  const prevu = items.filter((r) => r.executionStatus === 'prevision').length;
  const attente = items.filter((r) => r.executionStatus === 'en_attente').length;
  const parts: string[] = [];
  if (envoyee) parts.push(`${envoyee} envoyée(s)`);
  if (sautee) parts.push(`${sautee} sautée(s)`);
  if (echec) parts.push(`${echec} échec(s)`);
  if (prevu) parts.push(`${prevu} prévu(s)`);
  if (attente) parts.push(`${attente} en attente`);
  if (parts.length === 0) parts.push(`${items.length} relance(s)`);
  return parts.join(' · ');
}

export default function SequencePlanCard({
  seq,
  reservationId,
  guestPhone,
  guestName,
  reservationRef,
  checkInIso,
  guestManualSendDisabled,
  onDispatched,
}: {
  seq: PlanSequenceView;
  reservationId: string;
  guestPhone?: string;
  guestName?: string;
  reservationRef?: string;
  checkInIso?: string;
  guestManualSendDisabled?: boolean;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  const taskId = seq.taskId || seq.id;
  const [open, setOpen] = useState(defaultOpenForStatus(seq.status));

  const relancesResolved =
    seq.taskStatus === 'done' ||
    Boolean(seq.clientActionCompleted) ||
    (seq.taskType === 'registration' &&
      seq.registrationProgress != null &&
      seq.registrationProgress.total > 0 &&
      seq.registrationProgress.registered >= seq.registrationProgress.total);
  const { relances: relGroup, assignation: assignGroup, staffReminders: staffGroup, escalade: escaladeGroup } =
    seq.blockStatuses;

  return (
    <div className={`ev seq-l1 ${seq.status}${open ? ' open' : ''}`}>
      <div
        className="ev-h"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={() => {}}
        role="button"
        tabIndex={0}
      >
        <div className="em">{seq.icon}</div>
        <div className="info">
          <div className="top-line">
            {seq.planStep != null && <span className="plan-step-num">#{seq.planStep}</span>}
            <span className="nm">{seq.title}</span>
            <span className="kind-badge sequence-kind">Séquence</span>
            <GroupStatusBadge
              status={seq.status}
              label={sequenceStatusLabel(seq.status, seq.taskStatus)}
            />
          </div>
          <div className="ds">
            {sequenceConfigSubtitleParts(seq).map((part, i, arr) => {
              const cls =
                part.tone === 'chosen'
                  ? 'client-chosen-time'
                  : part.tone === 'accepted'
                    ? 'assign-staff-accepted'
                    : part.tone === 'assigned'
                      ? 'assign-staff-pending'
                      : undefined;
              return (
                <span key={`${part.text}-${i}`}>
                  {cls ? <span className={cls}>{part.text}</span> : part.text}
                  {i < arr.length - 1 ? ' · ' : null}
                </span>
              );
            })}
          </div>
          <span className="when">
            {seq.taskType === 'registration' && seq.registrationProgress ? (
              <>
                <span className="registration-progress">
                  {seq.registrationProgress.registered}/{seq.registrationProgress.total}
                </span>
                <span className="registration-progress-label"> enregistrés</span>
                {seq.deferredToArrival ? (
                  <span className="registration-at-arrival"> · à l’arrivée</span>
                ) : null}
              </>
            ) : (
              seq.range || seq.atDisplay
            )}
          </span>
        </div>
        <span className="arr">▶</span>
      </div>

      {open ? (
        <div className="ev-body seq-l1-body">
          <SequenceGuestOpsBar
            reservationId={reservationId}
            taskId={taskId}
            taskType={seq.taskType}
            hasAssignation={Boolean(seq.hasAssignation)}
            staffAssigned={Boolean(
              seq.staffAssignment &&
                (seq.staffAssignment.status === 'found' ||
                  seq.staffAssignment.status === 'pending_accept') &&
                seq.staffAssignment.staffName,
            )}
            actionCompleted={relancesResolved}
            clientChosenTime={seq.clientChosenTime}
            checkInIso={checkInIso}
            guestManualSendDisabled={guestManualSendDisabled}
            onDone={onDispatched}
          />
          {seq.taskType === 'registration' && seq.deferredToArrival && !relancesResolved ? (
            <div className="seq-reg-actions" style={{ marginBottom: 8 }}>
              <span className="registration-at-arrival-banner">
                Mode à l’arrivée — plus de relances · accès WhatsApp OK · enregistrement encore possible
              </span>
            </div>
          ) : null}
          {seq.hasRelances ? (
            <CollapseBlock
              icon="📨"
              title="Relances voyageur"
              groupStatus={relGroup}
              groupStatusLabel={relancesGroupStatusLabel(
                relGroup,
                seq.relances,
                relancesResolved,
                seq.backendBlockStatuses?.relances,
              )}
              countLabel={relanceCountSummary(
                seq.relances,
                relancesResolved,
                seq.registrationProgress,
              )}
              defaultOpen={defaultOpenForStatus(relGroup)}
            >
              <RelanceRows
                items={seq.relances}
                reservationId={reservationId}
                taskId={taskId}
                onDispatched={onDispatched}
              />
            </CollapseBlock>
          ) : null}

          {seq.hasAssignation && seq.staffAssignment ? (
            <CollapseBlock
              icon="🎯"
              title="Assignation staff"
              groupStatus={assignGroup}
              countLabel={assignationCollapseCountLabel(
                seq.staffAssignment,
                seq.attempts,
                seq.lmAssignSlots,
              )}
              defaultOpen={defaultOpenForStatus(assignGroup)}
            >
              <AssignBlockBody
                assign={seq.staffAssignment}
                attempts={seq.attempts}
                lmAssignSlots={seq.lmAssignSlots}
                reservationId={reservationId}
                taskId={taskId}
                onDispatched={onDispatched}
              />
            </CollapseBlock>
          ) : null}

          {seq.hasStaffReminders ? (
            <CollapseBlock
              icon="🔔"
              title="Rappels staff"
              groupStatus={staffGroup}
              groupStatusLabel={staffRemindersGroupStatusLabel(staffGroup, seq.staffReminders)}
              countLabel={relanceCountSummary(seq.staffReminders)}
              defaultOpen={defaultOpenForStatus(staffGroup)}
            >
              <StaffReminderRows
                items={seq.staffReminders}
                reservationId={reservationId}
                taskId={taskId}
                onDispatched={onDispatched}
              />
            </CollapseBlock>
          ) : null}

          {seq.hasEscalade && seq.escalade ? (
            <CollapseBlock
              icon={seq.escalade.status === 'active' ? '🚨' : '🛡'}
              title="Escalade PM"
              groupStatus={
                seq.escalade.triggerMode === 'manual' && seq.escalade.status === 'en_attente'
                  ? 'future'
                  : escaladeGroup
              }
              countLabel={
                seq.escalade.triggerMode === 'manual' && seq.escalade.status === 'en_attente'
                  ? 'Manuel · actions admin'
                  : seq.escalade.scheduleOffsetLabel ||
                    (seq.escalade.status === 'active'
                      ? 'Active · intervention'
                      : seq.escalade.status === 'saute'
                        ? 'Non nécessaire'
                        : seq.escalade.scheduled
                          ? 'Prévue si non confirmé'
                          : escaladeGroup === 'done'
                            ? 'Non nécessaire'
                            : 'Prévue si non confirmé')
              }
              defaultOpen={defaultOpenForStatus(
                seq.escalade.triggerMode === 'manual' && seq.escalade.status === 'en_attente'
                  ? 'future'
                  : escaladeGroup,
              )}
            >
              {seq.escalade.triggerMode === 'manual' && seq.escalade.status === 'en_attente' ? null : (
              <div
                className={`escalade-row${
                  seq.escalade.status === 'active'
                    ? ' active'
                    : seq.escalade.status === 'saute' || seq.escalade.status === 'fait'
                      ? ' skipped'
                      : seq.escalade.scheduled
                        ? ' scheduled'
                        : ' active'
                }`}
              >
                <div className="em">
                  {seq.escalade.status === 'active'
                    ? '🚨'
                    : seq.escalade.status === 'saute' || seq.escalade.status === 'fait'
                      ? '✓'
                      : seq.escalade.scheduled
                        ? '🛡'
                        : '🚨'}
                </div>
                <div className="info">
                  <b>{seq.escalade.description}</b>
                  {seq.escalade.dueAt ? <div className="ds">{seq.escalade.dueAt}</div> : null}
                </div>
                {seq.escalade.dueAt ? <div className="when">{seq.escalade.dueAt}</div> : null}
              </div>
              )}
              <EscaladeActionsPanel
                reservationId={reservationId}
                taskId={taskId}
                taskType={seq.taskType}
                escalade={seq.escalade}
                guestPhone={guestPhone}
                guestName={guestName}
                reservationRef={reservationRef}
                staffAssignment={seq.staffAssignment}
                clientChosenTime={seq.clientChosenTime}
                checkInIso={checkInIso}
                onDispatched={onDispatched}
              />
            </CollapseBlock>
          ) : null}

        </div>
      ) : null}
    </div>
  );
}
