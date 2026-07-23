import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as fulltaskApi from '../../services/fulltaskApi';
import {
  buildProgressSegments,
  isLegacyPlanOnlyRef,
  planCodeDisplay,
  reservationRefDisplay,
} from './buildPlanViewModel';
import DispatchLastSendLine from './DispatchLastSendLine';
import DispatchPreviewChips from './DispatchPreviewChips';
import MessageBodyPreview from './MessageBodyPreview';
import { dispatchPreviewShort, formatReservationSourceLabel } from './planDispatchPreview';
import { formatDispatchHistoryError, formatDispatchWhen } from './planDispatchDisplay';
import PlanDispatchButton from './PlanDispatchButton';
import {
  relanceExecutionEventStatus,
  relanceExecutionLabel,
  showRelanceConfigHint,
} from './planGroupStatus';
import SequencePlanCard from './SequencePlanCard';
import AuditLogView from '../../components/plan/AuditLogView';
import type { FulltaskPlanDoc } from './buildPlanViewModel';
import type {
  Channel,
  EventStatus,
  PlanEvent,
  RelanceExecutionStatus,
  Reservation,
  ReservationPlan,
} from './types';

type TlFilter = 'all' | 'sequences' | 'messages';

interface Props {
  reservation: Reservation;
  plan: ReservationPlan;
  /** Admin / staff plateforme : afficher si le plan utilise le template global. */
  showAdminConfigSource?: boolean;
  /** Nom affiché du propriétaire (listing), pas l’id Mongo. */
  ownerDisplayName?: string;
  onPlanUpdated?: (planDoc?: FulltaskPlanDoc) => void;
  onPlanRefetch?: () => void;
}

type CronTickStats = {
  remindersSent: number;
  staffRemindersSent: number;
  assignmentsDone: number;
  escalations: number;
  messagesSent: number;
};

export default function PlanDetail({
  reservation: r,
  plan,
  showAdminConfigSource = false,
  ownerDisplayName,
  onPlanUpdated,
  onPlanRefetch,
}: Props) {
  const [tlFilter, setTlFilter] = useState<TlFilter>('all');
  const [cronLoading, setCronLoading] = useState(false);
  const [cronError, setCronError] = useState<string | null>(null);
  const [cronStats, setCronStats] = useState<CronTickStats | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    const timeline = plan.events.filter(
      (e) => e.kind === 'sequence' || (e.kind === 'message' && e.messageCategory !== 'relance'),
    );
    if (tlFilter === 'sequences') return timeline.filter((e) => e.kind === 'sequence');
    if (tlFilter === 'messages') return timeline.filter((e) => e.kind === 'message');
    return timeline;
  }, [plan.events, tlFilter]);

  const sequences = plan.sequences ?? [];

  const sequenceByEventId = useMemo(() => {
    const m = new Map<string, (typeof sequences)[0]>();
    for (const s of sequences) {
      m.set(`seq-${s.id}`, s);
    }
    return m;
  }, [sequences]);

  const segments = buildProgressSegments(plan.events);
  const totalSteps = r.done + r.inProgress + r.upcoming + r.blocked;

  const planMessageCount = useMemo(
    () =>
      plan.events.filter(
        (e) => e.kind === 'message' && e.messageCategory !== 'relance',
      ).length,
    [plan.events],
  );
  const planWorkflowCount = useMemo(
    () => plan.events.filter((e) => e.kind === 'sequence').length,
    [plan.events],
  );

  /** Même ordre que orchestration-config (`uiPlanListOrder`), pas le tri chronologique. */
  const orderedTimelineEvents = useMemo(() => {
    const rank = new Map(plan.events.map((e, i) => [e.id, i]));
    return [...filteredEvents].sort(
      (a, b) =>
        (a.planStep ?? rank.get(a.id) ?? 9999) - (b.planStep ?? rank.get(b.id) ?? 9999),
    );
  }, [filteredEvents, plan.events]);

  const timelineNodes = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    for (const ev of orderedTimelineEvents) {
      if (ev.kind === 'message') {
        nodes.push(
          <MessagePlanCard
            key={ev.id}
            event={ev}
            reservationId={r.id}
            onDispatched={onPlanUpdated}
          />,
        );
      } else {
        const seq = sequenceByEventId.get(ev.id);
        if (seq) {
          nodes.push(
            <SequencePlanCard
              key={ev.id}
              seq={seq}
              reservationId={r.id}
              guestPhone={plan.guestPhone}
              guestName={plan.guestName ?? r.guest.name}
              reservationRef={r.reference}
              checkInIso={r.checkIn}
              onDispatched={onPlanUpdated}
            />,
          );
        }
      }
    }
    return nodes;
  }, [orderedTimelineEvents, sequenceByEventId, r.id, r.guest.name, r.reference, r.checkIn, plan.guestPhone, plan.guestName, onPlanUpdated]);

  const runCronNow = async () => {
    setCronLoading(true);
    setCronError(null);
    setCronStats(null);
    try {
      const res = await fulltaskApi.runPlanScheduler(r.id);
      if (!res?.success) {
        setCronError(res?.error || 'Échec exécution cron');
        return;
      }
      setCronStats(res.scheduler as CronTickStats);
      if (res.data) onPlanUpdated?.(res.data as FulltaskPlanDoc);
      onPlanRefetch?.();
    } catch (e) {
      setCronError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setCronLoading(false);
    }
  };

  const cronSummary = cronStats
    ? [
        cronStats.remindersSent ? `${cronStats.remindersSent} relance(s)` : null,
        cronStats.messagesSent ? `${cronStats.messagesSent} message(s)` : null,
        cronStats.staffRemindersSent ? `${cronStats.staffRemindersSent} rappel(s) staff` : null,
        cronStats.assignmentsDone ? `${cronStats.assignmentsDone} assignation(s)` : null,
        cronStats.escalations ? `${cronStats.escalations} escalade(s)` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Aucune action due à ce tick'
    : null;

  return (
    <div className="wrap">
      <div className="hero hero--dense">
        <div className="hero-main hero-main--dense">
          <div className="hero-identity">
            <div className="hero-guest">
              <div className="hero-av">{r.guest.initials}</div>
              <div className="hero-name">
                <div className="hero-title-row">
                  <h1>
                    <span className="hero-plan-code" title="Code plan orchestration">
                      {planCodeDisplay(r.planCode)}
                    </span>
                    <span
                      className={`hero-resa-ref${isLegacyPlanOnlyRef(r.reference) ? ' legacy' : ''}`}
                      title={
                        isLegacyPlanOnlyRef(r.reference)
                          ? 'Réf. résa suspecte (ancien fallback chiffres)'
                          : 'Numéro réservation'
                      }
                    >
                      {reservationRefDisplay(r.reference)}
                    </span>
                    {r.guest.name}{' '}
                    {r.guest.countryFlag && <span className="em-flag">{r.guest.countryFlag}</span>}
                  </h1>
                  <StatePill status={r.status} />
                </div>
                <div className="meta">
                  <b>{r.listing.name}</b> · {r.guestsCount} voyageurs ·{' '}
                  {formatReservationSourceLabel(plan.dispatchContext) || r.source}
                  <span className="meta-id" title="ID Mongo réservation">
                    {' '}
                    · id {r.id.slice(-8)}
                  </span>
                </div>
                <div className="hero-sub-state">
                  {r.done} / {totalSteps} étapes complétées · {r.inProgress} active
                </div>
              </div>
            </div>
            <div className="hero-plan-actions">
              <button
                type="button"
                className="cron-now-trigger"
                onClick={runCronNow}
                disabled={cronLoading}
                title="Même logique que le cron horaire (0 * * * *), filtré sur cette réservation"
              >
                {cronLoading ? 'Exécution…' : '⏱ Exécuter maintenant'}
              </button>
              {cronError ? <span className="cron-now-error">{cronError}</span> : null}
              {cronSummary ? <span className="cron-now-summary">{cronSummary}</span> : null}
            </div>
          </div>

          <div className="stay-ribbon stay-ribbon--inline stay-ribbon--dense">
            <DateBlock label="ARRIVÉE" iso={r.checkIn} />
            <div className="stay-arrow">
              <div className="line" />
              <span className="pill">{nightsBetween(r.checkIn, r.checkOut)} NUITS</span>
              <div className="line" />
            </div>
            <DateBlock label="DÉPART" iso={r.checkOut} right />
          </div>
        </div>

        <div className="synth synth--compact synth--dense">
          <div className="synth-cell">
            <span className="em">✓</span>
            <div className="v green">{r.done}</div>
            <div className="l">Terminées</div>
          </div>
          <div className="synth-cell">
            <span className="em">⏳</span>
            <div className="v amber">{r.inProgress}</div>
            <div className="l">En cours</div>
          </div>
          <div className="synth-cell">
            <span className="em">📅</span>
            <div className="v muted">{r.upcoming}</div>
            <div className="l">À venir</div>
          </div>
          <div className="synth-cell">
            <span className="em">🚨</span>
            <div className="v red">{r.blocked}</div>
            <div className="l">Bloquées</div>
          </div>
        </div>
      </div>

      <div className="prog-card prog-card--dense">
        <div className="prog-h">
          <h3>Progression globale du plan</h3>
          <span className="pct">{Math.round(r.progress * 100)}%</span>
        </div>
        <div className="prog-bar">
          {segments.map((seg, i) => (
            <div key={i} className={`seg ${seg.kind}`} style={{ flex: seg.flex }} />
          ))}
        </div>
        <div className="prog-meta">
          <span>
            <i className="d done" />
            Terminé
          </span>
          <span>
            <i className="d now" />
            En cours
          </span>
          <span>
            <i className="d todo" />
            À venir
          </span>
          <span>
            <i className="d blocked" />
            Bloqué
          </span>
        </div>
      </div>

      {showAdminConfigSource && plan.orchestrationConfigSource === 'global_template' ? (
        <div className="plan-config-source-banner plan-config-source-banner--template" role="status">
          <strong>Template Admin (global)</strong> —{' '}
          <b>{ownerDisplayName || 'ce propriétaire'}</b> n&apos;a pas encore de config
          orchestration dédiée. Le plan utilise la config <code>ownerId: null</code> (template par
          défaut). Pensez à synchroniser depuis Admin sur{' '}
          <Link to="/orchestration/config">orchestration-config</Link>.
        </div>
      ) : null}

      <div className="plan-orch-toolbar">
        <p className="plan-orch-hint">
          {planMessageCount} message(s) plan · {planWorkflowCount} workflow(s)
          {showAdminConfigSource ? (
            <>
              {' '}
              · glisser ⠿ pour réordonner sur{' '}
              <Link to="/orchestration/config">orchestration-config</Link> · simulation à droite
            </>
          ) : null}
        </p>
        <div className="filters">
          <button
            type="button"
            className={`tl-filter${tlFilter === 'all' ? ' on' : ''}`}
            onClick={() => setTlFilter('all')}
          >
            TOUT
          </button>
          <button
            type="button"
            className={`tl-filter${tlFilter === 'sequences' ? ' on' : ''}`}
            onClick={() => setTlFilter('sequences')}
          >
            SÉQUENCES
          </button>
          <button
            type="button"
            className={`tl-filter${tlFilter === 'messages' ? ' on' : ''}`}
            onClick={() => setTlFilter('messages')}
          >
            MESSAGES
          </button>
        </div>
      </div>

      <p className="tl-stay-hint tl-stay-hint--below-toolbar">
        Dates calées sur le séjour ({formatStayRange(r.checkIn, r.checkOut)}). Ordre = config
        orchestration
        {plan.orchestrationConfigSource === 'owner' ? (
          <> du propriétaire</>
        ) : plan.orchestrationConfigSource === 'global_template' && showAdminConfigSource ? (
          <> (repli template Admin)</>
        ) : null}
        {ownerDisplayName ? (
          <>
            {' '}
            · <b>{ownerDisplayName}</b>
          </>
        ) : null}
        . Relances passées = état réel (sautée, échec…).
      </p>

      <div className="timeline timeline--config-order">{timelineNodes}      </div>

      {(plan.auditLog?.length ?? 0) > 0 ? (
        <div className="plan-audit-panel">
          <button
            type="button"
            className="plan-audit-toggle"
            onClick={() => setAuditOpen((o) => !o)}
            aria-expanded={auditOpen}
          >
            <span>📋 Journal audit ({plan.auditLog?.length ?? 0})</span>
            <span aria-hidden>{auditOpen ? '▾' : '▸'}</span>
          </button>
          {auditOpen ? <AuditLogView auditLog={plan.auditLog ?? []} className="plan-audit-body" /> : null}
        </div>
      ) : null}

      <div
        className="read-only-note"
        style={{
          marginTop: 30,
          padding: '14px 16px',
          background: 'var(--bg2)',
          border: '1px solid var(--b)',
          borderRadius: 11,
          fontSize: 11.5,
          color: 'var(--t3)',
          lineHeight: 1.55,
        }}
      >
        🛡 Vue lecture seule · <b>Séquence</b> = relances + assign + rappels staff. Les relances
        workflow ne sont pas dupliquées en message catalogue. <b>Messages</b> = Bienvenu, feedback,
        etc.
        {showAdminConfigSource ? (
          <>
            {' '}
            <Link to="/orchestration/config" style={{ color: 'var(--pd)', fontWeight: 700 }}>
              Config orchestration
            </Link>
            .
          </>
        ) : null}{' '}
        <b style={{ color: 'var(--t2)' }}>Exécuter maintenant</b> = tick cron horaire sur cette
        réservation uniquement (échéances passées, une fois par point).
      </div>
    </div>
  );
}

function StatePill({ status }: { status: EventStatus }) {
  const map = {
    now: { cls: 'progress', label: 'EN COURS' },
    pending: { cls: 'progress', label: 'EN COURS' },
    done: { cls: 'progress', label: 'TERMINÉE' },
    blocked: { cls: 'progress', label: 'BLOQUÉE' },
    future: { cls: 'progress', label: 'À VENIR' },
  };
  const cfg = map[status];
  return (
    <span className={`state-pill ${cfg.cls}`}>
      <span className="dot" />
      {cfg.label}
    </span>
  );
}

function formatStayRange(checkIn: string, checkOut: string): string {
  const months = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'jun.', 'jul.', 'aoû', 'sep.', 'oct.', 'nov.', 'déc.'];
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };
  return `${fmt(checkIn)} → ${fmt(checkOut)}`;
}

function DateBlock({ label, iso, right }: { label: string; iso: string; right?: boolean }) {
  const d = new Date(iso);
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return (
    <div className={`stay-date${right ? ' right' : ''}`}>
      <span className="lbl">{label}</span>
      <span className="d">
        {d.getDate()} {months[d.getMonth()]} <span className="day">{days[d.getDay()].toUpperCase()}</span>
      </span>
      <span className="h">
        {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
      </span>
    </div>
  );
}

function messageExecutionStatus(ev: PlanEvent): RelanceExecutionStatus {
  const raw = ev.messageSendStatus;
  if (raw === 'envoye' || raw === 'fait') return 'envoyee';
  if (raw === 'saute') return 'sautee';
  if (raw === 'echec') return 'echec';
  if (ev.status === 'done' && raw !== 'echec') return 'envoyee';
  if (ev.lastDispatch && !ev.lastDispatch.ok && raw !== 'envoye' && raw !== 'fait') return 'echec';
  if (ev.status === 'future') return 'prevision';
  return 'en_attente';
}

function formatDispatchHistWhen(iso: string): string {
  return formatDispatchWhen(iso);
}

function MessageExecBadge({ status }: { status: RelanceExecutionStatus }) {
  const ev = relanceExecutionEventStatus(status);
  return <span className={`st-badge sm rel-exec ${ev}`}>{relanceExecutionLabel(status)}</span>;
}

function MessagePlanCard({
  event: ev,
  reservationId,
  onDispatched,
}: {
  event: PlanEvent;
  reservationId: string;
  onDispatched?: (planDoc?: FulltaskPlanDoc) => void;
}) {
  const exec = messageExecutionStatus(ev);
  const wasSent = ev.messageSendStatus === 'envoye' || ev.messageSendStatus === 'fait';
  const [open, setOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [rowLoading, setRowLoading] = useState(false);
  const canManualSend = ev.messageIndex != null && ev.messageCategory === 'simple';
  const channel = ev.channel || 'ota';
  const histCount = ev.dispatchLog?.length ?? 0;
  const histNewestFirst = histCount
    ? [...(ev.dispatchLog ?? [])].reverse()
    : [];

  const sentSummary = ev.lastDispatch?.ok
    ? ev.lastDispatch.label
    : ev.lastDispatchAttempt && !ev.lastDispatch?.ok
      ? ev.lastDispatchAttempt.label
      : wasSent
        ? 'Envoyé'
        : 'Pas encore envoyé';

  const sentSummaryClass =
    ev.lastDispatch?.ok || wasSent
      ? 'ok'
      : ev.lastDispatchAttempt && !ev.lastDispatch?.ok
        ? 'fail'
        : 'pending';

  return (
    <div
      className={`ev msg-l1 ${ev.status}${open ? ' open' : ''}${histOpen ? ' hist-open' : ''}${rowLoading ? ' msg-l1--dispatching' : ''}`}
    >
      <div
        className="ev-h msg-l1-h"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <div className="em">{ev.icon}</div>
        <div className="info">
          <div className="top-line">
            {ev.planStep != null && <span className="plan-step-num">#{ev.planStep}</span>}
            <span className="nm">{ev.title}</span>
            {open && ev.messageCategory === 'simple' ? (
              <span className="kind-badge message-simple">Message simple</span>
            ) : null}
            {open && ev.messageCategory === 'relance' ? (
              <span className="kind-badge message-relance">Relance</span>
            ) : null}
            <MessageExecBadge status={exec} />
            {ev.dispatchPreview ? (
              <DispatchPreviewChips preview={ev.dispatchPreview} />
            ) : ev.channel ? (
              <ChannelChip channel={ev.channel} />
            ) : null}
          </div>
          {open ? (
            <span className="when msg-when-open">Prévu · {ev.atDisplay || '—'}</span>
          ) : (
            <div className="msg-summary">
              <span className="msg-summary-pre">Prévu · {ev.atDisplay || '—'}</span>
              {dispatchPreviewShort(ev.dispatchPreview) ? (
                <>
                  <span className="msg-summary-sep"> · </span>
                  <span className="msg-summary-channel">{dispatchPreviewShort(ev.dispatchPreview)}</span>
                </>
              ) : null}
              <span className="msg-summary-sep"> · </span>
              <span className={`msg-summary-sent ${sentSummaryClass}`}>{sentSummary}</span>
            </div>
          )}
        </div>
        <span className="arr" aria-hidden>
          ▶
        </span>
      </div>

      {open ? (
        <div className="ev-body msg-l1-body">
          <div className="msg-last-send-row">
            <div className="msg-last-send-main">
              {ev.lastDispatch || ev.lastDispatchAttempt ? (
                <DispatchLastSendLine
                  last={ev.lastDispatch}
                  attempt={ev.lastDispatchAttempt}
                  inline
                />
              ) : (
                <span className="msg-last-send-pending">Pas encore envoyé</span>
              )}
            </div>
            {canManualSend ? (
              <PlanDispatchButton
                reservationId={reservationId}
                kind="message"
                messageIndex={ev.messageIndex}
                wasSent={wasSent}
                itemLabel={ev.title}
                disabled={false}
                onLoadingChange={setRowLoading}
                onDone={onDispatched}
              />
            ) : null}
          </div>

          {histCount > 0 ? (
            <button
              type="button"
              className="msg-hist-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setHistOpen((o) => !o);
              }}
              aria-expanded={histOpen}
            >
              <span className="msg-hist-toggle-label">Historique envois ({histCount})</span>
              <span className="msg-hist-toggle-arr" aria-hidden>
                {histOpen ? '▾' : '▸'}
              </span>
            </button>
          ) : null}

          {histOpen && histCount > 0 ? (
            <div className="msg-dispatch-history">
              {histNewestFirst.map((entry, i) => (
                <div
                  key={`${entry.at}-${i}`}
                  className={`msg-dispatch-hist-row ${entry.ok ? 'ok' : 'fail'}`}
                >
                  <span>{entry.ok ? '✓' : '✗'}</span>
                  <span>{formatDispatchHistWhen(entry.at)}</span>
                  {entry.channel ? <span>{entry.channel.toUpperCase()}</span> : null}
                  {entry.source ? (
                    <span className="msg-dispatch-hist-src">
                      {entry.source === 'manual' ? 'Manuel' : 'Auto'}
                    </span>
                  ) : null}
                  {!entry.ok && entry.error ? (
                    <span className="msg-dispatch-hist-err">
                      {formatDispatchHistoryError(entry.error, wasSent)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {ev.messageCategory === 'simple' && (ev.template || ev.dispatchPreview || channel) ? (
            <div className="rel-row-config msg-l1-config">
              Config · {ev.template || '—'}
              {ev.dispatchPreview ? (
                <> · Envoi prévu · {ev.dispatchPreview.label}</>
              ) : channel ? (
                ` · ${channel.toUpperCase()}`
              ) : (
                ''
              )}
            </div>
          ) : null}

          {typeof ev.messageIndex === 'number' ? (
            <MessageBodyPreview
              reservationId={reservationId}
              kind="message"
              messageIndex={ev.messageIndex}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status, kind }: { status: EventStatus; kind: PlanEvent['kind'] }) {
  const labels: Record<EventStatus, string> = {
    done: kind === 'sequence' ? '✓ TERMINÉ' : '✓ ENVOYÉ',
    now: '⚡ EN COURS',
    pending: '⏸ EN ATTENTE',
    blocked: '🚨 BLOQUÉ',
    future: '📅 À VENIR',
  };
  return <span className={`st-badge ${status}`}>{labels[status]}</span>;
}

function ChannelChip({ channel }: { channel: Channel }) {
  return <span className={`ch-chip ${channel === 'wa' ? 'wa' : channel}`}>{channel === 'wa' ? 'WA' : channel.toUpperCase()}</span>;
}

function nightsBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
