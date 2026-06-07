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
import PlanAssignButtons from './PlanAssignButtons';
import PlanDispatchButton from './PlanDispatchButton';
import EscaladeActionsPanel from './EscaladeActionsPanel';
import {
  aggregateAssignGroupStatus,
  aggregateRelancesGroupStatus,
  aggregateStaffRemindersGroupStatus,
  groupStatusLabel,
  relancesGroupStatusLabel,
  staffRemindersGroupStatusLabel,
  relanceExecutionEventStatus,
  relanceExecutionLabel,
  sequenceStatusLabel,
  showRelanceConfigHint,
} from './planGroupStatus';

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

function RelanceStatusBadge({ status }: { status: PlanGuestRelanceItem['executionStatus'] }) {
  const ev = relanceExecutionEventStatus(status);
  return <span className={`st-badge sm rel-exec ${ev}`}>{relanceExecutionLabel(status)}</span>;
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
              <RelanceStatusBadge status={r.executionStatus} />
              {showWa !== false && r.channel ? <ChannelChip channel={r.channel} /> : null}
            </div>
            {showRelanceConfigHint(r.executionStatus) && (r.catalogTemplate || r.channel) ? (
              <div className="rel-row-config">
                Config · {r.catalogTemplate || '—'}
                {r.channel ? ` · ${r.channel.toUpperCase()}` : ''}
              </div>
            ) : null}
            <DispatchLastSendLine last={r.lastDispatch} attempt={r.lastDispatchAttempt} />
          </div>
        </div>
  );
}

function assignExecutionLine(assign: StaffAssignmentPlan): string {
  if (assign.status === 'found' && assign.staffName) {
    return `Exécution · staff retenu · ${assign.staffName}`;
  }
  if (assign.assignationExhausted) {
    return assign.lmFailureLabel
      ? `Exécution · LM échoué · ${assign.lmFailureLabel} · plus de relance`
      : 'Exécution · échec assignation · plus de relance';
  }
  if (assign.status === 'failed') return 'Exécution · échec assignation';
  if (assign.hasPendingLmAssign) {
    return assign.nextAssignmentLabel.startsWith('Prochaine assignation LM ·')
      ? `Exécution · ${assign.nextAssignmentLabel}`
      : 'Exécution · assignation LM prévue';
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
  const wasAssigned = assign.status === 'found' && Boolean(assign.staffName);
  const showConfig =
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
          wasAssigned={wasAssigned}
          disabled={false}
          onLoadingChange={setRowLoading}
          onDone={onDispatched}
        />
        <div className="rel-row-main">
          <div className="rel-row-top">
            <span className="nm">Assignation staff</span>
            <span className="when" style={{ minWidth: 'auto', fontWeight: 600 }}>
              {wasAssigned ? 'Staff déjà retenu — relancer possible' : 'Auto ou choix manuel'}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`assign-exec-line${assign.windowPast && !assign.hasPendingLmAssign ? ' past' : ''}`}
      >
        {assignExecutionLine(assign)}
      </div>
      {showConfig ? (
      <div className="assign-config-grid">
        <div className="cfg-cell">
          <span className="cfg-lbl">Fenêtre</span>
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
        <div className="assign-winner">
          ✓ Staff retenu · <b>{assign.staffName}</b>
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
                  <RelanceStatusBadge status={r.executionStatus} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {attempts && attempts.length > 0 ? (
        <div className="assign-track">
          <div className="l3-sub-h">Historique tentatives</div>
          {attempts.map((a) => (
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
          ))}
        </div>
      ) : (
        <div className="l3-empty">Aucune tentative enregistrée pour l&apos;instant.</div>
      )}
    </>
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
              <RelanceStatusBadge status={r.executionStatus} />
            </div>
            {showRelanceConfigHint(r.executionStatus) && r.whatsappTemplateId ? (
              <div className="rel-row-config">Config WA · {r.whatsappTemplateId}</div>
            ) : r.executionStatus === 'envoyee' && r.whatsappTemplateId ? (
              <div className="rel-row-config muted">Template · {r.whatsappTemplateId}</div>
            ) : null}
            <DispatchLastSendLine last={r.lastDispatch} attempt={r.lastDispatchAttempt} />
          </div>
        </div>
  );
}

function resultLabel(r: AssignAttempt['result']): string {
  if (r === 'accepted') return 'SUCCÈS';
  if (r === 'declined') return 'ÉCHEC';
  if (r === 'timeout') return 'TIMEOUT';
  return 'PRÉVU';
}

/** Résumé ligne (comme cartes orchestration-config). */
function sequenceConfigSubtitle(seq: PlanSequenceView): string {
  const rel = seq.relances?.length ?? 0;
  const staffRel = seq.staffReminders?.length ?? 0;
  const parts: string[] = [];
  parts.push(`${rel} relance${rel !== 1 ? 's' : ''}`);
  if (staffRel > 0) parts.push(`${staffRel} rappel staff`);
  if (seq.clientActionCompleted && seq.clientChosenTime && seq.taskType !== 'registration') {
    parts.push(
      seq.taskType === 'departure_choose' || seq.taskType === 'departure_declare'
        ? `départ · ${seq.clientChosenTime}`
        : `arrivée · ${seq.clientChosenTime}`,
    );
  } else if (!seq.hasEscalade) parts.push('escalade off');
  else if (seq.escalade?.scheduleOffsetLabel) {
    parts.push(`escalade ${seq.escalade.scheduleOffsetLabel}`);
  } else parts.push('escalade');
  return parts.join(' · ');
}

function relanceCountSummary(
  items: { executionStatus: PlanGuestRelanceItem['executionStatus'] }[],
  actionCompleted = false,
): string {
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
  onDispatched,
}: {
  seq: PlanSequenceView;
  reservationId: string;
  guestPhone?: string;
  guestName?: string;
  reservationRef?: string;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  const taskId = seq.taskId || seq.id;
  const [open, setOpen] = useState(defaultOpenForStatus(seq.status));

  const relGroup = aggregateRelancesGroupStatus(seq.relances, seq.clientActionCompleted);
  const staffGroup = aggregateStaffRemindersGroupStatus(seq.staffReminders);
  const assignGroup = aggregateAssignGroupStatus(
    seq.staffAssignment,
    seq.attempts,
    seq.lmAssignSlots,
  );

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
            {sequenceConfigSubtitle(seq)
              .split(' · ')
              .map((part, i, arr) => {
                const chosen =
                  seq.clientActionCompleted &&
                  seq.clientChosenTime &&
                  (part === `arrivée · ${seq.clientChosenTime}` ||
                    part === `départ · ${seq.clientChosenTime}` ||
                    part === `enregistré · ${seq.clientChosenTime}`);
                return (
                  <span key={part}>
                    {chosen ? <span className="client-chosen-time">{part}</span> : part}
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
          {seq.hasRelances ? (
            <CollapseBlock
              icon="📨"
              title="Relances voyageur"
              groupStatus={relGroup}
              groupStatusLabel={relancesGroupStatusLabel(
                relGroup,
                seq.relances,
                Boolean(seq.clientActionCompleted),
              )}
              countLabel={relanceCountSummary(seq.relances, seq.clientActionCompleted)}
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
              countLabel={
                seq.lmAssignSlots?.some((s) => s.executionStatus === 'prevision')
                  ? seq.staffAssignment?.nextAssignmentLabel || 'Assignation LM'
                  : seq.attempts?.length
                    ? `${seq.attempts.length} tentative(s)`
                    : seq.staffAssignment.modeLabel
              }
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
                seq.escalade.status === 'active'
                  ? 'now'
                  : seq.escalade.status === 'saute' || seq.escalade.status === 'fait'
                    ? 'done'
                    : seq.escalade.scheduled
                      ? 'future'
                      : 'now'
              }
              countLabel={
                seq.escalade.scheduleOffsetLabel ||
                (seq.escalade.status === 'active'
                  ? 'Active · intervention'
                  : seq.escalade.status === 'saute'
                    ? 'Non nécessaire'
                    : seq.escalade.scheduled
                      ? 'Prévue si non confirmé'
                      : 'Active · intervention')
              }
              defaultOpen={defaultOpenForStatus(
                seq.escalade.status === 'active'
                  ? 'now'
                  : seq.escalade.status === 'saute' || seq.escalade.status === 'fait'
                    ? 'done'
                    : seq.escalade.scheduled
                      ? 'future'
                      : 'now',
              )}
            >
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
                  <div className="ds">{seq.escalade.dueAt}</div>
                </div>
                <div className="when">{seq.escalade.dueAt}</div>
              </div>
              <EscaladeActionsPanel
                reservationId={reservationId}
                taskId={taskId}
                taskType={seq.taskType}
                escalade={seq.escalade}
                guestPhone={guestPhone}
                guestName={guestName}
                reservationRef={reservationRef}
                staffAssignment={seq.staffAssignment}
                onDispatched={onDispatched}
              />
            </CollapseBlock>
          ) : null}

          {!seq.hasRelances && !seq.hasAssignation && !seq.hasStaffReminders && !seq.hasEscalade ? (
            <div className="l3-empty">Aucun bloc configuré pour cette séquence.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
