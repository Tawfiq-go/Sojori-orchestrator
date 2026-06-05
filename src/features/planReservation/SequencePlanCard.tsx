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
import {
  aggregateAssignGroupStatus,
  aggregateRelancesGroupStatus,
  aggregateStaffRemindersGroupStatus,
  groupStatusLabel,
  relanceExecutionEventStatus,
  relanceExecutionLabel,
  showRelanceConfigHint,
} from './planGroupStatus';

function defaultOpenForStatus(_status: EventStatus): boolean {
  return false;
}

function GroupStatusBadge({ status }: { status: EventStatus }) {
  return <span className={`st-badge group-st ${status}`}>{groupStatusLabel(status)}</span>;
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
  countLabel,
  defaultOpen,
  children,
}: {
  icon: string;
  title: string;
  groupStatus: EventStatus;
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
        <GroupStatusBadge status={groupStatus} />
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
  const wasSent = r.rawStatus === 'envoyee';

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
  if (assign.status === 'failed') return 'Exécution · échec assignation';
  if (assign.windowPast) return 'Exécution · fenêtre passée sans assignation confirmée';
  return 'Prévu · fenêtre à venir';
}

function AssignBlockBody({
  assign,
  attempts,
  reservationId,
  taskId,
  onDispatched,
}: {
  assign: StaffAssignmentPlan;
  attempts?: AssignAttempt[];
  reservationId: string;
  taskId: string;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  const [rowLoading, setRowLoading] = useState(false);
  const wasAssigned = assign.status === 'found' && Boolean(assign.staffName);
  const showConfig = !assign.windowPast || assign.status === 'searching';
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
      <div className={`assign-exec-line${assign.windowPast ? ' past' : ''}`}>
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
      {showConfig ? <div className="assign-next">{assign.nextAssignmentLabel}</div> : null}
      {assign.staffName && assign.status === 'found' ? (
        <div className="assign-winner">
          ✓ Staff retenu · <b>{assign.staffName}</b>
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
              <span className={`res ${a.result}`}>{resultLabel(a.result)}</span>
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
  const wasSent = r.rawStatus === 'envoyee';

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
  if (!seq.hasEscalade) parts.push('escalade off');
  else if (seq.escalade?.scheduleOffsetLabel) {
    parts.push(`escalade ${seq.escalade.scheduleOffsetLabel}`);
  } else parts.push('escalade');
  return parts.join(' · ');
}

function relanceCountSummary(
  items: { executionStatus: PlanGuestRelanceItem['executionStatus'] }[],
): string {
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
  onDispatched,
}: {
  seq: PlanSequenceView;
  reservationId: string;
  onDispatched?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
}) {
  const taskId = seq.taskId || seq.id;
  const [open, setOpen] = useState(defaultOpenForStatus(seq.status));

  const relGroup = aggregateRelancesGroupStatus(seq.relances, seq.clientActionCompleted);
  const staffGroup = aggregateStaffRemindersGroupStatus(seq.staffReminders);
  const assignGroup = aggregateAssignGroupStatus(seq.staffAssignment, seq.attempts);

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
            <GroupStatusBadge status={seq.status} />
          </div>
          <div className="ds">{sequenceConfigSubtitle(seq)}</div>
          <span className="when">{seq.range || seq.atDisplay}</span>
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
              countLabel={relanceCountSummary(seq.relances)}
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
                seq.attempts?.length
                  ? `${seq.attempts.length} tentative(s)`
                  : seq.staffAssignment.modeLabel
              }
              defaultOpen={defaultOpenForStatus(assignGroup)}
            >
              <AssignBlockBody
                assign={seq.staffAssignment}
                attempts={seq.attempts}
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
              icon="🛡"
              title="Escalade PM"
              groupStatus={seq.escalade.scheduled ? 'future' : 'done'}
              countLabel={
                seq.escalade.scheduleOffsetLabel ||
                (seq.escalade.scheduled ? 'Prévue si non confirmé' : 'Déclenchée')
              }
              defaultOpen={defaultOpenForStatus(seq.escalade.scheduled ? 'future' : 'done')}
            >
              <div className={`escalade-row${seq.escalade.scheduled ? ' scheduled' : ''}`}>
                <div className="em">{seq.escalade.scheduled ? '🛡' : '🚨'}</div>
                <div className="info">
                  <b>
                    {seq.escalade.scheduled
                      ? 'Escalade prévue si non confirmé'
                      : 'Escalade déclenchée'}
                  </b>
                  <div className="ds">{seq.escalade.description}</div>
                </div>
                <div className="when">{seq.escalade.dueAt}</div>
              </div>
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
