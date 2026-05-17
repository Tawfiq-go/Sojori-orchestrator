// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Atelier 2026
// WorkflowEventCard.jsx — carte workflow expandable avec sub-steps
// indépendants (relances / config / audit à 2 niveaux).
//
// Props :
//   workflow : WorkflowEvent (voir types ci-dessous)
//   onAction : (subStepId, actionId, payload?) => void
//   defaultOpenSubSteps : string[]  // ids ouverts par défaut
//
// Style : tokens Atelier 2026 + classes utilitaires `so-*` (cf index.css livré).
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';

/* ─── Types (TypeScript ou JSDoc selon le repo) ───────────────────
 * type SubStepStatus = 'completed' | 'pending' | 'failed' | 'info' | 'skipped' | 'late';
 *
 * interface Reminder {
 *   when: string;            // 'Jeu 07/05 11:00'
 *   firedAt?: string;        // '17:00' si effectivement envoyé
 *   status: 'sent' | 'missed' | 'failed' | 'pending';
 *   channel?: 'whatsapp' | 'email' | 'sms';
 *   lastMinute?: boolean;
 *   crossed?: boolean;       // créneau devenu inutile (ex : staff déjà assigné)
 * }
 *
 * interface Assignment {
 *   slot: string;            // 'J1#1 08/05 08:00'
 *   status: 'assigned' | 'tried' | 'unused';
 *   staffName?: string;
 *   strategy?: 'PRIORITY' | 'ROUND_ROBIN' | …;
 *   manual?: boolean;
 * }
 *
 * interface AuditEntry {
 *   at: string;              // '08/05 16:00'
 *   icon: '✅' | '❌' | '⚙️' | '⚠' | '⏸';
 *   label: string;
 *   source: 'cron' | 'manual' | 'srv-task' | 'client';
 *   channel?: 'whatsapp' | 'email' | 'sms' | 'system';
 *   reference?: string;      // MS-XXXX / SM-XXXX (lien interne)
 * }
 *
 * interface SubStep {
 *   id: string;              // unique dans le workflow
 *   icon: string;
 *   label: string;
 *   status: SubStepStatus;
 *   primaryMetric?: string;  // '0V / 0D / 0N' · 'N/A · échue'
 *   sideBadge?: { tone: 'success'|'warning'|'error'|'info'|'neutral'; label: string };
 *   reminders?: Reminder[];
 *   assignments?: Assignment[];
 *   deadlineInfo?: { dueAt: string; missed: boolean; onMiss?: string };
 *   recipients?: { kind: 'admin' | 'client'; label: string }[];
 *   config: { rule?: string; condition?: string; channel?: string; template?: string; [k: string]: string | undefined };
 *   audit: AuditEntry[];
 *   actions?: { id: string; label: string; intent?: 'primary' | 'ai' | 'ghost' }[];
 * }
 *
 * interface WorkflowEvent {
 *   id: string;              // WF-XXXX
 *   type: 'notification' | 'registration' | 'arrival_choice' | …;
 *   title: string;           // 'Choisir arrivée'
 *   icon: string;            // '🎫'
 *   reservationNumber: string;        // SJ-XXXX
 *   timeslotId?: string;     // SM-XXXX
 *   createdAt: string;
 *   globalStatus: { tone: 'success'|'warning'|'error'|'info'|'neutral'; label: string };
 *   strip?: { icon: string; label: string }[];
 *   subSteps: SubStep[];
 *   workflowConfig: { [k: string]: string };
 *   workflowAudit: AuditEntry[];
 * }
 * ─────────────────────────────────────────────────────────────── */

const TONE_TO_CLASS = {
  success: 'so-chip-success',
  warning: 'so-chip-warning',
  error:   'so-chip-error',
  info:    'so-chip-info',
  neutral: 'so-chip-neutral',
  ai:      'so-chip-ai',
};
const STATUS_TO_LEFT = {
  completed: 'var(--success)',
  pending:   'var(--warning)',
  failed:    'var(--error)',
  info:      'var(--info)',
  skipped:   'var(--bg-deep)',
  late:      'var(--error)',
};
const STATUS_TO_ICON_TONE = {
  completed: 'so-chip-success',
  pending:   'so-chip-warning',
  failed:    'so-chip-error',
  info:      'so-chip-info',
  skipped:   'so-chip-neutral',
  late:      'so-chip-error',
};

function StatusDot({ tone, animate = true }) {
  const map = { success: 'so-dot-success', warning: 'so-dot-warning', error: 'so-dot-error', info: 'so-dot-info', neutral: 'so-dot-neutral' };
  return <span className={`so-dot ${map[tone] || 'so-dot-neutral'} ${animate ? '' : 'so-dot-static'}`} />;
}

function Chip({ tone, children, animate }) {
  return (
    <span className={`so-chip ${TONE_TO_CLASS[tone] || 'so-chip-neutral'}`}>
      <StatusDot tone={tone} animate={animate} />
      {children}
    </span>
  );
}

function SectionH({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 10, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace',
      textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
      margin: '10px 0 6px',
    }}>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, fontSize: 11, padding: '3px 0' }}>
      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
      <span style={{ color: 'var(--text-h)', fontFamily: '"Geist Mono", monospace', fontSize: 10.5, fontWeight: 500, textAlign: 'right' }}>
        {v}
      </span>
    </div>
  );
}

function RemindersList({ reminders }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
      {reminders.map((r, i) => {
        const iconMap = { sent: { c: 'var(--success)', s: '✓' }, missed: { c: 'var(--text-faint)', s: '⊘' }, failed: { c: 'var(--error)', s: '✕' }, pending: { c: 'var(--warning)', s: '⧗' } };
        const ic = iconMap[r.status] || iconMap.pending;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 10.5, color: 'var(--text)', fontFamily: '"Geist Mono", monospace',
            textDecoration: r.crossed ? 'line-through' : 'none',
            textDecorationColor: 'var(--text-faint)',
            opacity: r.crossed ? 0.6 : 1, padding: '4px 0',
          }}>
            <span style={{ width: 14, textAlign: 'center', color: ic.c }}>{ic.s}</span>
            <span>{r.when}{r.firedAt && <> → <b style={{ color: 'var(--success)' }}>{r.firedAt}</b></>}</span>
            {r.lastMinute && (
              <span style={{ background: 'var(--ai-tint)', color: 'var(--ai)', fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3, letterSpacing: '0.04em' }}>LM</span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
              {r.channel === 'whatsapp' ? '📱 WhatsApp' : r.channel === 'email' ? '📧 Email' : r.channel === 'sms' ? '✉ SMS' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AuditList({ audit }) {
  if (!audit?.length) return <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '6px 0' }}>Aucun événement.</div>;
  return audit.map((a, i) => (
    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, padding: '4px 0', borderBottom: i < audit.length - 1 ? '1px dashed var(--border)' : 'none' }}>
      <span style={{ width: 18, textAlign: 'center' }}>{a.icon}</span>
      <span style={{ fontFamily: '"Geist Mono", monospace', color: 'var(--text-muted)', minWidth: 78 }}>{a.at}</span>
      <span style={{ flex: 1, color: 'var(--text)' }}>{a.label}</span>
      <span style={{ fontSize: 9.5, color: 'var(--text-muted)', background: 'var(--bg-sub)', padding: '1px 5px', borderRadius: 3, fontFamily: '"Geist Mono", monospace' }}>
        {a.source === 'cron' ? '🤖 Cron' : a.source === 'manual' ? '✋ Manuel' : a.source === 'srv-task' ? '⚙ srv-task' : a.source}
      </span>
    </div>
  ));
}

function ActionButtons({ actions, onAction, subStepId }) {
  if (!actions?.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
      {actions.map(a => (
        <button
          key={a.id}
          onClick={(e) => { e.stopPropagation(); onAction?.(subStepId, a.id); }}
          className={`so-btn-act ${a.intent === 'ai' ? 'so-btn-act-ai' : a.intent === 'ghost' ? 'so-btn-act-ghost' : ''}`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

function SubStepCard({ sub, open, onToggle, onAction }) {
  return (
    <div
      onClick={onToggle}
      className="so-fade-in"
      style={{
        background: 'var(--bg-paper)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        borderLeft: `3px solid ${STATUS_TO_LEFT[sub.status] || 'var(--border-strong)'}`,
        animation: sub.status === 'failed' ? 'sojori-shake 0.5s 1' : undefined,
      }}
    >
      {/* Head */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className={`so-chip ${STATUS_TO_ICON_TONE[sub.status] || 'so-chip-neutral'}`} style={{ width: 24, height: 24, padding: 0, justifyContent: 'center', fontSize: 12 }}>
          {sub.icon}
        </div>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub.label}
        </div>
        <span style={{ fontSize: 9, color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {/* Metric line */}
      <div style={{ padding: '0 12px 8px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {sub.sideBadge && <Chip tone={sub.sideBadge.tone} animate={false}>{sub.sideBadge.label}</Chip>}
        {sub.primaryMetric && <span style={{ fontFamily: '"Geist Mono", monospace', color: 'var(--text-muted)', fontSize: 10.5 }}>{sub.primaryMetric}</span>}
      </div>

      {/* Body — expandable */}
      {open && (
        <div className="so-fade-in" style={{ padding: '0 12px 12px', borderTop: '1px dashed var(--border)', marginTop: 4, paddingTop: 10 }}
             onClick={(e) => e.stopPropagation()}>

          {sub.reminders?.length > 0 && (
            <>
              <SectionH>Relances · {sub.reminders.length}</SectionH>
              <RemindersList reminders={sub.reminders} />
            </>
          )}

          {sub.assignments?.length > 0 && (
            <>
              <SectionH>Tentatives staff · {sub.assignments.length}</SectionH>
              <RemindersList reminders={sub.assignments.map(a => ({
                when: a.slot, firedAt: a.staffName, status: a.status === 'assigned' ? 'sent' : a.status === 'unused' ? 'missed' : 'pending',
                channel: a.manual ? undefined : undefined, crossed: a.status === 'unused',
              }))} />
            </>
          )}

          {sub.recipients?.length > 0 && (
            <>
              <SectionH>Destinataires</SectionH>
              {sub.recipients.map((r, i) => <KV key={i} k={r.kind === 'admin' ? 'Admin' : 'Client'} v={r.label} />)}
            </>
          )}

          {sub.config && Object.keys(sub.config).length > 0 && (
            <>
              <SectionH>Config</SectionH>
              {Object.entries(sub.config).map(([k, v]) => v && <KV key={k} k={k} v={v} />)}
            </>
          )}

          {sub.audit?.length > 0 && (
            <>
              <SectionH>Audit · {sub.audit.length}</SectionH>
              <AuditList audit={sub.audit} />
            </>
          )}

          <ActionButtons actions={sub.actions} onAction={onAction} subStepId={sub.id} />
        </div>
      )}
    </div>
  );
}

function WorkflowAccordion({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '10px 18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: 'var(--bg-sub)',
        }}
      >
        {title}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </div>
      {open && <div className="so-fade-in" style={{ padding: '0 18px 12px', background: 'var(--bg-sub)' }}>{children}</div>}
    </div>
  );
}

/* ─── Composant principal ─────────────────────────────────────── */

export default function WorkflowEventCard({ workflow, onAction, defaultOpenSubSteps = [] }) {
  const [openSubs, setOpenSubs] = useState(new Set(defaultOpenSubSteps));
  const toggle = (id) => setOpenSubs(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div
      className="so-fade-in"
      style={{
        background: 'var(--bg-paper)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        marginBottom: 18,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        background: 'linear-gradient(180deg, var(--bg-sub), var(--bg-paper))',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          background: 'var(--accent-bg)', color: 'var(--accent-deep)',
        }}>{workflow.icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.015em' }}>
            {workflow.title}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10.5, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace', flexWrap: 'wrap' }}>
            <span>WF·<b style={{ color: 'var(--text)', fontWeight: 700 }}>{workflow.id}</b></span>
            <span>SJ·<b style={{ color: 'var(--text)', fontWeight: 700 }}>{workflow.reservationNumber}</b></span>
            {workflow.timeslotId && <span>SM·<b style={{ color: 'var(--text)', fontWeight: 700 }}>{workflow.timeslotId}</b></span>}
            <span>🕐 {workflow.createdAt}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <Chip tone={workflow.globalStatus.tone} animate={workflow.globalStatus.tone !== 'neutral'}>
            {workflow.globalStatus.label}
          </Chip>
        </div>
      </div>

      {/* Status strip */}
      {workflow.strip?.length > 0 && (
        <div style={{
          padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
          flexWrap: 'wrap', background: 'var(--bg-sub)', borderBottom: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text)',
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>État</span>
          {workflow.strip.map((s, i) => <span key={i}>{s.icon} {s.label}</span>)}
        </div>
      )}

      {/* Sub-steps grid */}
      <div style={{
        padding: '14px 18px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10,
      }}>
        {workflow.subSteps.map(sub => (
          <SubStepCard
            key={sub.id}
            sub={sub}
            open={openSubs.has(sub.id)}
            onToggle={() => toggle(sub.id)}
            onAction={onAction}
          />
        ))}
      </div>

      {/* Workflow-level accordions */}
      <WorkflowAccordion title="⚙️ Config workflow">
        {Object.entries(workflow.workflowConfig || {}).map(([k, v]) => <KV key={k} k={k} v={v} />)}
      </WorkflowAccordion>
      <WorkflowAccordion title="📋 Audit global">
        <AuditList audit={workflow.workflowAudit} />
      </WorkflowAccordion>
    </div>
  );
}
