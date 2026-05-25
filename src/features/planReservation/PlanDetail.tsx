import React, { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ArchivePlanModal from './ArchivePlanModal';
import ForcePlanSchedulerModal from './ForcePlanSchedulerModal';
import {
  buildProgressSegments,
  formatDayLabel,
  isLegacyPlanOnlyRef,
  planCodeDisplay,
  reservationRefDisplay,
} from './buildPlanViewModel';
import SequencePlanCard from './SequencePlanCard';
import type { Channel, EventStatus, PlanEvent, Reservation, ReservationPlan } from './types';

type TlFilter = 'all' | 'sequences' | 'messages';

interface Props {
  reservation: Reservation;
  plan: ReservationPlan;
  onPlanRefetch?: () => void;
  onPlanArchived?: (reservationId: string) => void;
}

export default function PlanDetail({ reservation: r, plan, onPlanRefetch, onPlanArchived }: Props) {
  const [tlFilter, setTlFilter] = useState<TlFilter>('all');
  const [forceModalOpen, setForceModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

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

  const timelineNodes = useMemo(() => {
    const sorted = [...filteredEvents].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
    const nodes: React.ReactNode[] = [];
    let lastDay = '';
    let daySepIndex = 0;
    for (const ev of sorted) {
      const dayKey = ev.at.slice(0, 10);
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        const { label, rel, today } = formatDayLabel(ev.at);
        nodes.push(
          <div key={`day-sep-${dayKey}-${daySepIndex++}`} className="day-sep">
            <span className={`lbl${today ? ' today' : ''}`}>{label}</span>
            <span className="rel">{rel}</span>
          </div>,
        );
      }
      if (ev.kind === 'message') {
        nodes.push(<MessagePlanCard key={ev.id} event={ev} />);
      } else {
        const seq = sequenceByEventId.get(ev.id);
        if (seq) nodes.push(<SequencePlanCard key={ev.id} seq={seq} />);
      }
    }
    return nodes;
  }, [filteredEvents, sequenceByEventId]);

  return (
    <div className="wrap">
      <ForcePlanSchedulerModal
        open={forceModalOpen}
        reservationId={r.id}
        guestName={r.guest.name}
        onClose={() => setForceModalOpen(false)}
        onDone={() => onPlanRefetch?.()}
      />
      <ArchivePlanModal
        open={archiveModalOpen}
        reservationId={r.id}
        guestName={r.guest.name}
        planCode={planCodeDisplay(r.planCode)}
        reservationRef={reservationRefDisplay(r.reference)}
        onClose={() => setArchiveModalOpen(false)}
        onDone={() => onPlanArchived?.(r.id)}
      />
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
                  <b>{r.listing.name}</b> · {r.guestsCount} voyageurs · {r.source}
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
                className="force-plan-trigger"
                onClick={() => setForceModalOpen(true)}
                title="Cron désactivé — exécution manuelle pour tests"
              >
                ▶ Exécuter plan
              </button>
              <button
                type="button"
                className="plan-archive-trigger"
                onClick={() => setArchiveModalOpen(true)}
                title="Masquer ce plan (corrompu) — nouvelle résa ou replay AMQP ensuite"
              >
                Archiver le plan
              </button>
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

      <div className="tl-head">
        <div className="tl-head-titles">
          <h2>Plan d&apos;orchestration</h2>
          <span className="count">
            · {sequences.length} séq. · {(plan.messages ?? []).length} msg.
          </span>
          <p className="tl-stay-hint">
            Dates calées sur le séjour ({formatStayRange(r.checkIn, r.checkOut)}). Les relances
            passées affichent leur état réel (sautée, échec…) — pas seulement la config prévue.
          </p>
        </div>
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

      <div className="timeline">{timelineNodes}</div>

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
        🛡 Vue lecture seule · <b>Séquence</b> = relances + assign + rappels staff (config planifiée
        ou statuts après <b>Exécuter plan</b>). Les relances workflow ne sont pas dupliquées en
        message catalogue. <b>Messages</b> = Bienvenu, feedback, etc. uniquement.{' '}
        <Link to="/tasks/orchestration-config" style={{ color: 'var(--pd)', fontWeight: 700 }}>
          workflows tâches
        </Link>{' '}
        et{' '}
        <Link to="/tasks/orchestration-config" style={{ color: 'var(--pd)', fontWeight: 700 }}>
          messages planifiés
        </Link>
        . <b style={{ color: 'var(--t2)' }}>Exécuter plan</b> relance le scheduler (test).
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

function MessagePlanCard({ event: ev }: { event: PlanEvent }) {
  const [open, setOpen] = useState(ev.status === 'now' || ev.status === 'done');
  const expandable = Boolean(ev.messagePreviewFr);

  return (
    <div className={`ev msg-l1 ${ev.status}${open ? ' open' : ''}`}>
      <div
        className="ev-h"
        onClick={() => expandable && setOpen((o) => !o)}
        onKeyDown={() => {}}
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
      >
        <div className="em">{ev.icon}</div>
        <div className="info">
          <div className="top-line">
            {ev.planStep != null && <span className="plan-step-num">#{ev.planStep}</span>}
            <span className="nm">{ev.title}</span>
            {ev.messageCategory === 'simple' && (
              <span className="kind-badge message-simple">Message simple</span>
            )}
            {ev.messageCategory === 'relance' && (
              <span className="kind-badge message-relance">Relance</span>
            )}
            <StatusBadge status={ev.status} kind="message" />
            {ev.channel && <ChannelChip channel={ev.channel} />}
            {ev.channels?.map((c) => (
              <ChannelChip key={c} channel={c} />
            ))}
          </div>
          {ev.description && <div className="ds">{ev.description}</div>}
          <span className="when">{ev.atDisplay || ev.at}</span>
        </div>
        {expandable && <span className="arr">▶</span>}
      </div>

      {open && ev.messagePreviewFr ? (
        <div className="ev-body">
          <CollapseBlock
            icon="📨"
            title="Envoi message"
            groupStatus={ev.status}
            countLabel={ev.channelMeta || ev.template || '—'}
            defaultOpen
          >
            <div className="msg-preview">
              <div className="meta">
                <span>
                  Canal · <b>{(ev.channel || 'wa').toUpperCase()}</b>
                </span>
                {ev.template ? <span>Template · {ev.template}</span> : null}
                {ev.channelMeta ? <span>{ev.channelMeta}</span> : null}
              </div>
              {ev.messagePreviewFr}
            </div>
          </CollapseBlock>
        </div>
      ) : null}
    </div>
  );
}

/** Bloc niveau 2 pour message simple (même chrome que séquence). */
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
  const [open, setOpen] = useState(defaultOpen ?? true);
  const labels: Record<EventStatus, string> = {
    done: 'Terminé',
    now: 'En cours',
    pending: 'En attente',
    blocked: 'Bloqué',
    future: 'À venir',
  };
  return (
    <div className={`l2-block${open ? ' open' : ''}`}>
      <button type="button" className="l2-block-h" onClick={() => setOpen((o) => !o)}>
        <span className="l2-em">{icon}</span>
        <span className="l2-title">{title}</span>
        <span className={`st-badge group-st ${groupStatus}`}>{labels[groupStatus]}</span>
        <span className="l2-ct">{countLabel}</span>
        <span className="l2-arr">▶</span>
      </button>
      {open ? <div className="l2-block-body">{children}</div> : null}
    </div>
  );
}

function StatusBadge({ status, kind }: { status: EventStatus; kind: PlanEvent['kind'] }) {
  const labels: Record<EventStatus, string> = {
    done: kind === 'sequence' ? '✓ COMPLÉTÉE' : '✓ ENVOYÉ',
    now: '⚡ EN COURS',
    pending: '⏸ EN ATTENTE',
    blocked: '🚨 BLOQUÉE',
    future: '📅 PRÉVU',
  };
  return <span className={`st-badge ${status}`}>{labels[status]}</span>;
}

function ChannelChip({ channel }: { channel: Channel }) {
  return <span className={`ch-chip ${channel === 'wa' ? 'wa' : channel}`}>{channel === 'wa' ? 'WA' : channel.toUpperCase()}</span>;
}

function nightsBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
