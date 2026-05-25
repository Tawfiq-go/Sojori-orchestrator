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
import {
  aggregateAssignGroupStatus,
  aggregateRelancesGroupStatus,
  aggregateStaffRemindersGroupStatus,
  groupStatusLabel,
  relanceExecutionEventStatus,
  relanceExecutionLabel,
  showRelanceConfigHint,
} from './planGroupStatus';

function defaultOpenForStatus(status: EventStatus): boolean {
  return status === 'now' || status === 'pending' || status === 'blocked';
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
  const [open, setOpen] = useState(defaultOpen ?? defaultOpenForStatus(groupStatus));
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

function RelanceRows({ items, showWa }: { items: PlanGuestRelanceItem[]; showWa?: boolean }) {
  return (
    <div className="l3-list">
      {items.map((r) => (
        <div key={r.id} className={`rel-row rel-row--${r.executionStatus}`}>
          <span
            className={`dot ${r.status === 'sent' ? 'sent' : r.status === 'skipped' ? 'skipped' : 'scheduled'}`}
          />
          <div className="rel-row-main">
            <div className="rel-row-top">
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
          </div>
        </div>
      ))}
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
}: {
  assign: StaffAssignmentPlan;
  attempts?: AssignAttempt[];
}) {
  const showConfig = !assign.windowPast || assign.status === 'searching';
  return (
    <>
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

function StaffReminderRows({ items }: { items: PlanStaffReminderItem[] }) {
  return (
    <div className="l3-list">
      {items.map((r) => (
        <div key={r.id} className={`rel-row rel-row--${r.executionStatus}`}>
          <span
            className={`dot ${r.status === 'sent' ? 'sent' : r.status === 'skipped' ? 'skipped' : 'scheduled'}`}
          />
          <div className="rel-row-main">
            <div className="rel-row-top">
              <span className="when">{r.dueAt}</span>
              <span className="nm">{r.label}</span>
              <RelanceStatusBadge status={r.executionStatus} />
            </div>
            {showRelanceConfigHint(r.executionStatus) && r.whatsappTemplateId ? (
              <div className="rel-row-config">Config WA · {r.whatsappTemplateId}</div>
            ) : r.executionStatus === 'envoyee' && r.whatsappTemplateId ? (
              <div className="rel-row-config muted">Template · {r.whatsappTemplateId}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function resultLabel(r: AssignAttempt['result']): string {
  if (r === 'accepted') return 'SUCCÈS';
  if (r === 'declined') return 'ÉCHEC';
  if (r === 'timeout') return 'TIMEOUT';
  return 'PRÉVU';
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

export default function SequencePlanCard({ seq }: { seq: PlanSequenceView }) {
  const [open, setOpen] = useState(defaultOpenForStatus(seq.status));

  const relGroup = aggregateRelancesGroupStatus(seq.relances);
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
              <RelanceRows items={seq.relances} />
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
              <AssignBlockBody assign={seq.staffAssignment} attempts={seq.attempts} />
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
              <StaffReminderRows items={seq.staffReminders} />
            </CollapseBlock>
          ) : null}

          {seq.hasEscalade && seq.escalade ? (
            <div className="l2-block open l2-block--static">
              <div className="l2-block-h">
                <span className="l2-em">🛡</span>
                <span className="l2-title">Escalade PM</span>
                <GroupStatusBadge status={seq.escalade.scheduled ? 'future' : 'done'} />
              </div>
              <div className="l2-block-body">
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
              </div>
            </div>
          ) : null}

          {!seq.hasRelances && !seq.hasAssignation && !seq.hasStaffReminders && !seq.hasEscalade ? (
            <div className="l3-empty">Aucun bloc configuré pour cette séquence.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
