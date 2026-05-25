import { Box, Typography } from '@mui/material';
import type { ScheduledOrchestrationMessage, Workflow } from '../staff-design/types';
import {
  buildTimelineFromApiWorkflow,
  buildTimelineFromDesignWorkflow,
  buildTimelineFromScheduledRule,
  type TimelineEvent,
  type TimelineEventKind,
} from './buildOrchestrationTimeline';

import '../staff-design/orchDesign.css';

const KIND_CLASS: Record<TimelineEventKind, string> = {
  anchor: 'anchor',
  assignment: 'assignment',
  assignment_end: 'assignment',
  reminder: 'reminder',
  planned_message: 'planned_message',
  deadline: 'deadline',
  completion: 'completion',
};

export interface OrchestrationTimelineSimulationProps {
  title?: string;
  subtitle?: string;
  /** Plan API srv-fulltask */
  workflow?: Record<string, unknown> | null;
  /** Plan UI orchestration config */
  designWorkflow?: Workflow | null;
  /** Message plan résa (envoi seul) */
  designScheduledRule?: ScheduledOrchestrationMessage | null;
  scheduledCatalogLabel?: string;
  taskTypeId?: string;
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  return (
    <div className={`so-orch-tl-item so-orch-tl-item--${KIND_CLASS[event.kind]}`}>
      <div className={`so-orch-tl-dot so-orch-tl-dot--${KIND_CLASS[event.kind]}`} aria-hidden />
      <div className="so-orch-tl-body">
        <div className="so-orch-tl-meta">{event.refLine}</div>
        <div className="so-orch-tl-title">{event.title}</div>
        {event.description ? (
          <div className="so-orch-tl-desc">{event.description}</div>
        ) : null}
        {event.windows?.length ? (
          <div className="so-orch-tl-windows">
            {event.windows.map((w) => (
              <span key={w} className="so-orch-tl-win">
                {w}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OrchestrationTimelineSimulation({
  title = 'Simulation timeline',
  subtitle,
  workflow,
  designWorkflow,
  designScheduledRule,
  scheduledCatalogLabel,
  taskTypeId,
}: OrchestrationTimelineSimulationProps) {
  const isMessagePlan = Boolean(designScheduledRule);
  const events = designScheduledRule
    ? buildTimelineFromScheduledRule(designScheduledRule, {
        catalogLabel: scheduledCatalogLabel,
      })
    : designWorkflow
      ? buildTimelineFromDesignWorkflow(designWorkflow, taskTypeId)
      : buildTimelineFromApiWorkflow(workflow, taskTypeId);

  return (
    <Box className="so-orch-timeline-wrap">
      <div className="so-orch-timeline-head">
        <Typography component="h3" className="so-orch-timeline-title">
          {title}
        </Typography>
        {subtitle ? (
          <Typography component="p" className="so-orch-timeline-sub">
            {subtitle}
          </Typography>
        ) : null}
      </div>

      {events.length === 0 ? (
        <p className="so-orch-timeline-empty">
          {isMessagePlan
            ? 'Configurez le déclencheur (référence + délai + canal) pour voir la simulation.'
            : 'Aucun événement à afficher — ajoutez relances, assignation staff ou deadline dans le plan.'}
        </p>
      ) : (
        <div className="so-orch-timeline">
          {events.map((ev, i) => (
            <TimelineItem key={`${ev.kind}-${ev.sortKey}-${i}`} event={ev} />
          ))}
        </div>
      )}

      <div className="so-orch-timeline-legend">
        <span className="so-orch-timeline-legend-ic">💡</span>
        <span>
          <strong>Lecture</strong> ·{' '}
          {isMessagePlan
            ? 'ancrage réservation puis envoi du message au délai configuré.'
            : 'les points colorés représentent les événements du workflow.'}
        </span>
        <div className="so-orch-timeline-legend-keys">
          <span>
            <i className="k anchor" /> Ancrage
          </span>
          {isMessagePlan ? (
            <span>
              <i className="k planned_message" /> Envoi message
            </span>
          ) : (
            <>
              <span>
                <i className="k assignment" /> Assignation (début → fin)
              </span>
              <span>
                <i className="k reminder" /> Relance
              </span>
              <span>
                <i className="k deadline" /> Deadline
              </span>
              <span>
                <i className="k completion" /> Complétion
              </span>
            </>
          )}
        </div>
      </div>
    </Box>
  );
}
