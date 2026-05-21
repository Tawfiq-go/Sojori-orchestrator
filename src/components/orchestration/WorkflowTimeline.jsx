// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Atelier 2026
// WorkflowTimeline.jsx — timeline 3 niveaux indépendants
//   L1 : workflows (timeline verticale principale)
//   L2 : sub-steps (timeline imbriquée, click pour déplier)
//   L3 : détails (relances / config / audit / actions)
//
// Stylage : tokens et classes utilitaires `so-*` de l'`index.css` Orchestration V2.
// Animations clignotantes héritées : `sojori-blink-warning`,
// `sojori-pulse-success`, `sojori-pulse-error`, `sojori-shake`, `sojori-fade-up`.
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import OrchestrationConfigCards from './OrchestrationConfigCards';

/* ─── Mappings status ──────────────────────────────────────────── */
const DOT_CLASS = {
  completed: 'so-dot-success',
  pending:   'so-dot-warning',
  failed:    'so-dot-error',
  late:      'so-dot-error',
  info:      'so-dot-info',
  skipped:   'so-dot-neutral',
};
const CHIP_TONE = {
  completed: 'success',
  pending:   'warning',
  failed:    'error',
  late:      'error',
  info:      'info',
  skipped:   'neutral',
};
const LEFT_BORDER = {
  completed: 'var(--success)',
  pending:   'var(--warning)',
  failed:    'var(--error)',
  late:      'var(--error)',
  info:      'var(--info)',
  skipped:   'var(--bg-deep)',
};
const TONE_TO_CHIP_CLASS = {
  success: 'so-chip-success',
  warning: 'so-chip-warning',
  error:   'so-chip-error',
  info:    'so-chip-info',
  neutral: 'so-chip-neutral',
  ai:      'so-chip-ai',
};

/* ─── Primitives ────────────────────────────────────────────────── */
function StatusChip({ tone, label, animate = true }) {
  const map = { success: 'so-dot-success', warning: 'so-dot-warning', error: 'so-dot-error', info: 'so-dot-info', neutral: 'so-dot-neutral' };
  return (
    <span className={`so-chip ${TONE_TO_CHIP_CLASS[tone] || 'so-chip-neutral'}`}>
      <span className={`so-dot ${map[tone] || 'so-dot-neutral'}`} style={!animate ? { animation: 'none' } : undefined} />
      {label}
    </span>
  );
}

function SectionH({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 9.5, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace',
      textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
      margin: '8px 0 5px',
    }}>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function KV({ k, v }) {
  // Handle complex values (objects, arrays)
  let displayValue = v;
  if (typeof v === 'object' && v !== null) {
    displayValue = JSON.stringify(v);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, padding: '3px 0' }}>
      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
      <span style={{ color: 'var(--text-h)', fontFamily: '"Geist Mono", monospace', fontSize: 10.5, fontWeight: 500, textAlign: 'right' }}>{displayValue}</span>
    </div>
  );
}

function AssignmentsList({ items, onAssignAuto, onAssignManual }) {
  const iconMap = {
    assigned: { c: 'var(--success)', s: '✓' },
    unused:   { c: 'var(--text-faint)', s: '⊘' },
    pending:  { c: 'var(--warning)', s: '⧗' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((assignment, i) => {
        const status = assignment.status === 'assigned' ? 'assigned' : assignment.status === 'unused' ? 'unused' : 'pending';
        const ic = iconMap[status] || iconMap.pending;
        const crossed = assignment.status === 'unused';

        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 10.5, color: 'var(--text)', fontFamily: '"Geist Mono", monospace',
            padding: '4px 6px',
            background: 'var(--bg-paper)',
            borderRadius: 4,
            border: '1px solid var(--border)',
            textDecoration: crossed ? 'line-through' : 'none',
            textDecorationColor: 'var(--text-faint)',
            opacity: crossed ? 0.6 : 1,
          }}>
            <span style={{ width: 14, textAlign: 'center', fontSize: 11, color: ic.c }}>{ic.s}</span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 500 }}>
                {assignment.dayLabel || assignment.slot}
              </span>
              {assignment.staffName && (
                <span style={{ fontSize: 10, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>👤</span>
                  <b>{assignment.staffName}</b>
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {assignment.manual ? '✋' : '🤖'}
            </span>
            {(onAssignAuto || onAssignManual) && status !== 'assigned' && !crossed && (
              <div style={{ display: 'flex', gap: 4 }}>
                {onAssignAuto && (
                  <button
                    onClick={() => onAssignAuto(assignment, i)}
                    style={{
                      background: 'var(--success)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                    title="Assigner automatiquement"
                  >
                    🤖
                  </button>
                )}
                {onAssignManual && (
                  <button
                    onClick={() => onAssignManual(assignment, i)}
                    style={{
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                    title="Assigner manuellement"
                  >
                    👤
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RemindersList({ items, onSendReminder }) {
  const iconMap = {
    sent:    { c: 'var(--success)',    s: '✓' },
    missed:  { c: 'var(--text-faint)', s: '⊘' },
    failed:  { c: 'var(--error)',      s: '✕' },
    pending: { c: 'var(--warning)',    s: '⧗' },
  };
  const statusBadge = (r) => {
    if (r.statusLabel) return r.statusLabel;
    if (r.status === 'sent') return 'Exécuté';
    if (r.status === 'missed') return 'Ignoré';
    if (r.status === 'failed') return 'Échec';
    return 'Planifié';
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((r, i) => {
        const ic = iconMap[r.status] || iconMap.pending;
        const isExecuted = r.status === 'sent';
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 10.5, color: 'var(--text)', fontFamily: '"Geist Mono", monospace',
            padding: '4px 6px',
            background: 'var(--bg-paper)',
            borderRadius: 4,
            border: '1px solid var(--border)',
            textDecoration: r.crossed ? 'line-through' : 'none',
            textDecorationColor: 'var(--text-faint)',
            opacity: r.crossed ? 0.6 : 1,
          }}>
            <span style={{ width: 14, textAlign: 'center', fontSize: 11, color: ic.c }}>{ic.s}</span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {r.executionType && (
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>{r.executionType}</span>
                )}
                {r.when}
              </span>
              <span style={{ fontSize: 9.5, color: r.status === 'missed' ? 'var(--text-faint)' : r.status === 'sent' ? 'var(--success)' : 'var(--warning)' }}>
                {statusBadge(r)}
              </span>
              {r.skipReasonLabel && (
                <span style={{ fontSize: 9.5, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                  {r.skipReasonLabel}
                </span>
              )}
              {r.firedAt && (
                <span style={{ fontSize: 10, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✓</span>
                  <b>{r.firedAt}</b>
                </span>
              )}
              {r.error && (
                <span style={{ fontSize: 9.5, color: 'var(--error)' }}>{r.error}</span>
              )}
            </span>
            {r.lastMinute && (
              <span style={{ background: 'var(--ai-tint)', color: 'var(--ai)', fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3, letterSpacing: '0.04em' }} title="Dernier créneau — rattrapage last minute">Dernier</span>
            )}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {r.channel === 'whatsapp' ? '📱' : r.channel === 'email' ? '📧' : r.channel === 'sms' ? '✉' : r.channelLabel || ''}
            </span>
            {onSendReminder && r.status !== 'missed' && (
              <button
                onClick={() => onSendReminder(r, i)}
                style={{
                  background: isExecuted ? 'var(--warning)' : 'var(--success)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                title={isExecuted ? 'Renvoyer' : 'Envoyer'}
              >
                {isExecuted ? '⚡' : '📱'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuditList({ items }) {
  if (!items?.length) return null;
  return items.map((a, i) => (
    <div key={i} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      fontSize: 10.5, padding: '4px 0',
      borderBottom: i < items.length - 1 ? '1px dashed var(--border)' : 'none',
    }}>
      <span style={{ width: 18, textAlign: 'center' }}>{a.icon}</span>
      <span style={{ fontFamily: '"Geist Mono", monospace', color: 'var(--text-muted)', minWidth: 78 }}>{a.at}</span>
      <span style={{ flex: 1, color: 'var(--text)' }}>{a.label}</span>
      <span style={{ fontSize: 9.5, color: 'var(--text-muted)', background: 'var(--bg-paper)', padding: '1px 5px', borderRadius: 3, fontFamily: '"Geist Mono", monospace' }}>
        {a.source === 'cron' ? '🤖 Cron' : a.source === 'manual' ? '✋ Manuel' : a.source === 'srv-task' ? '⚙ srv-task' : a.source || ''}
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
          onClick={(e) => { e.stopPropagation(); onAction?.(a); }}
          className={`so-btn-act ${a.intent === 'ai' ? 'so-btn-act-ai' : a.intent === 'ghost' ? 'so-btn-act-ghost' : ''}`}
          style={{ height: 24, padding: '0 10px', fontSize: 10.5 }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}


function DetailPanelToggle({ label, open, onToggle, variant = 'default' }) {
  const active = open;
  const styles =
    variant === 'audit'
      ? {
          bg: active ? 'var(--info)' : 'var(--bg-paper)',
          color: active ? '#fff' : 'var(--info)',
          border: active ? 'var(--info)' : 'rgba(6, 115, 179, 0.35)',
        }
      : {
          bg: active ? 'var(--accent)' : 'var(--bg-paper)',
          color: active ? '#fff' : 'var(--accent-deep)',
          border: active ? 'var(--accent)' : 'var(--accent-border)',
        };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        fontSize: 10.5,
        fontWeight: 700,
        borderRadius: 6,
        border: `1px solid ${styles.border}`,
        background: styles.bg,
        color: styles.color,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 9 }}>{open ? '▼' : '▶'}</span>
      <span>{label}</span>
    </button>
  );
}

/* ─── Level 3 : SubStep details (relances + config + audit) ─── */
function SubStepDetails({ sub, onAction, reservationNumber, isPlaceholder }) {
  const [showConfig, setShowConfig] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const hasConfig =
    (sub.configCards?.length > 0) || (sub.config && Object.keys(sub.config).length > 0);
  const hasAudit = sub.audit?.length > 0;

  const handleSendReminder = (reminder, index) => {
    if (sub.actionId && reservationNumber) {
      onAction?.({
        id: reminder.status === 'sent' ? 'resend' : 'force-send',
        actionId: sub.actionId,
        reservationNumber,
        reminderIndex: index,
        executionId: reminder.executionId || null,
        lastMinute: reminder.lastMinute === true,
      });
    }
  };

  return (
    <div
      className="so-fade-in"
      onClick={(e) => e.stopPropagation()}
      style={{
        marginTop: 6, padding: '10px 14px',
        background: 'var(--bg-sub)', border: '1px solid var(--border)', borderRadius: 8,
      }}
    >
      {sub.reminders?.length > 0 && (
        <>
          <SectionH>
            Relances ({sub.reminders.length})
            {(() => {
              const sentCount = sub.reminders.filter(r => r.status === 'sent').length;
              const totalCount = sub.reminders.length;
              if (sentCount > 0 && sentCount === totalCount) {
                return <span style={{ marginLeft: 6, color: 'var(--success)', fontSize: 10 }}>✅ Exécution réussie</span>;
              } else if (sentCount > 0) {
                return <span style={{ marginLeft: 6, color: 'var(--warning)', fontSize: 10 }}>⚠️ {sentCount}/{totalCount} envoyés</span>;
              } else {
                return <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: 10 }}>En attente</span>;
              }
            })()}
          </SectionH>
          <RemindersList items={sub.reminders} onSendReminder={sub.actionId ? handleSendReminder : null} />
        </>
      )}

      {sub.assignments?.length > 0 && (
        <>
          <SectionH>
            Tentatives assignation ({sub.assignments.length})
            {(() => {
              const assignedCount = sub.assignments.filter(a => a.status === 'assigned').length;
              const totalCount = sub.assignments.length;
              if (assignedCount > 0) {
                return <span style={{ marginLeft: 6, color: 'var(--success)', fontSize: 10 }}>✅ Assigné</span>;
              } else {
                return <span style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: 10 }}>En attente</span>;
              }
            })()}
          </SectionH>
          <AssignmentsList
            items={sub.assignments}
            onAssignAuto={sub.actionId && reservationNumber ? (item, idx) => {
              onAction?.({
                id: 'reassign-auto',
                actionId: sub.actionId,
                reservationNumber,
                assignmentIndex: idx,
              });
            } : null}
            onAssignManual={sub.actionId && reservationNumber ? (item, idx) => {
              onAction?.({
                id: 'reassign-manual',
                actionId: sub.actionId,
                reservationNumber,
                assignmentIndex: idx,
              });
            } : null}
          />
        </>
      )}

      {(hasConfig || hasAudit) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, marginBottom: 6 }}>
          {hasConfig && (
            <DetailPanelToggle
              label="Config"
              open={showConfig}
              onToggle={() => setShowConfig((v) => !v)}
            />
          )}
          {hasAudit && (
            <DetailPanelToggle
              label={`Audit · ${sub.audit.length}`}
              open={showAudit}
              onToggle={() => setShowAudit((v) => !v)}
              variant="audit"
            />
          )}
        </div>
      )}

      {showConfig && hasConfig && (
        <div style={{ marginBottom: 8 }}>
          <OrchestrationConfigCards cards={sub.configCards} />
        </div>
      )}

      {showAudit && hasAudit && (
        <div style={{ marginBottom: 8 }}>
          <AuditList items={sub.audit} />
        </div>
      )}

      {isPlaceholder ? (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            fontSize: 10.5,
            lineHeight: 1.45,
            color: 'var(--warning)',
            background: 'var(--warning-tint)',
            border: '1px solid rgba(196, 101, 6, 0.25)',
            borderRadius: 6,
          }}
        >
          Envoi manuel indisponible — workflow placeholder (pas de plan réel). Configurez le modèle
          propriétaire et activez la catégorie sur le listing, puis recalculez le plan.
        </div>
      ) : (
        <ActionButtons actions={sub.actions} onAction={onAction} subStepId={sub.id} />
      )}
    </div>
  );
}

/* ─── Level 2 : SubStep row + dot + nested expand ───────────── */
function SubStepRow({ sub, open, onToggle, onAction, reservationNumber }) {
  const status = sub.status || 'info';
  const tone = CHIP_TONE[status] || 'neutral';
  const dotCls = DOT_CLASS[status] || 'so-dot-neutral';
  const leftBorder = LEFT_BORDER[status] || 'var(--border-strong)';

  return (
    <div style={{ position: 'relative', marginBottom: 6 }}>
      {/* Dot */}
      <span style={{
        position: 'absolute', left: -19, top: 11,
        width: 14, height: 14, borderRadius: '50%',
        background: status === 'completed' ? 'var(--success)' : status === 'failed' || status === 'late' ? 'var(--error)' : status === 'info' ? 'var(--info)' : 'var(--bg-paper)',
        border: `2px solid ${status === 'completed' ? 'var(--success)' : status === 'failed' || status === 'late' ? 'var(--error)' : status === 'info' ? 'var(--info)' : 'var(--border-strong)'}`,
        color: status === 'pending' ? 'var(--warning)' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, zIndex: 2,
      }}>
        <span className={`so-dot ${dotCls}`} />
      </span>

      {/* Row */}
      <div
        onClick={onToggle}
        style={{
          background: open ? 'var(--bg-sub)' : 'var(--bg-paper)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${leftBorder}`,
          borderRadius: 8,
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 9,
          transition: 'all 0.2s',
          animation: status === 'failed' ? 'sojori-shake 0.5s 1' : undefined,
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>{sub.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h)' }}>{sub.label}</span>
        {sub.primaryMetric && (
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace' }}>
            {sub.primaryMetric}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {sub.sideBadge && (
          <StatusChip tone={sub.sideBadge.tone} label={sub.sideBadge.label} animate={false} />
        )}
        <span style={{
          fontSize: 8, color: 'var(--text-faint)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▼</span>
      </div>

      {/* Level 3 */}
      {open && (
        <SubStepDetails
          sub={sub}
          onAction={onAction}
          reservationNumber={reservationNumber}
          isPlaceholder={sub.isPlaceholder}
        />
      )}
    </div>
  );
}

/* ─── Level 1 : Workflow row + dot + nested L2/L3 ──────────────── */
function WorkflowNode({ workflow, open, onToggle, onAction, defaultOpenSubSteps = [] }) {
  const [openSubs, setOpenSubs] = useState(new Set(defaultOpenSubSteps));
  const toggleSub = (id) => setOpenSubs(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const globalTone = workflow.globalStatus?.tone || 'neutral';
  const wfDotBg = globalTone === 'success' ? 'var(--success)' :
                  globalTone === 'error' || globalTone === 'warning' ? 'var(--error)' :
                  globalTone === 'info' ? 'var(--info)' : 'var(--bg-paper)';

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      {/* Dot L1 */}
      <span style={{
        position: 'absolute', left: -21, top: 14,
        width: 16, height: 16, borderRadius: '50%',
        background: wfDotBg,
        border: `2px solid ${wfDotBg}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 9, fontWeight: 700, zIndex: 2,
      }}>
        <span className={`so-dot ${DOT_CLASS[globalTone === 'error' ? 'failed' : globalTone === 'warning' ? 'pending' : globalTone === 'success' ? 'completed' : 'info']}`} />
      </span>

      {/* Row L1 */}
      <div
        onClick={onToggle}
        style={{
          background: open ? 'linear-gradient(180deg, var(--accent-bg), var(--bg-paper) 70%)' : 'var(--bg-paper)',
          border: '1px solid',
          borderColor: open ? 'var(--accent)' : 'var(--border)',
          borderRadius: 10, padding: '11px 14px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>{workflow.icon}</span>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.01em' }}>
            {workflow.title}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 2, fontSize: 10, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace' }}>
            <span>WF·<b style={{ color: 'var(--text-h)', fontWeight: 700 }}>{workflow.id}</b></span>
            <span>{workflow.createdAt}</span>
            {workflow.timeslotId && <span>SM·<b style={{ color: 'var(--text-h)', fontWeight: 700 }}>{workflow.timeslotId}</b></span>}
            <span>{workflow.subSteps.length} sub-step{workflow.subSteps.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(workflow.statusChips || [workflow.globalStatus]).filter(Boolean).map((s, i) => (
            <StatusChip key={i} tone={s.tone} label={s.label} animate={s.animate !== false} />
          ))}
        </div>
        <span style={{
          fontSize: 9, color: open ? 'var(--accent-deep)' : 'var(--text-faint)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s', marginLeft: 6,
        }}>▼</span>
      </div>

      {/* Level 2 — sub-steps timeline */}
      {open && workflow.subSteps && workflow.subSteps.length > 0 && (
        <div className="so-fade-in" style={{ marginTop: 8, marginLeft: 18 }}>
          <div style={{ position: 'relative', paddingLeft: 22 }}>
            <span style={{
              position: 'absolute', left: 9, top: 6, bottom: 6,
              width: 2, background: 'linear-gradient(180deg, var(--border-strong), var(--bg-deep))',
            }} />
            {workflow.subSteps.map(sub => (
              <SubStepRow
                key={sub.id}
                sub={sub}
                open={openSubs.has(sub.id)}
                onToggle={() => toggleSub(sub.id)}
                onAction={onAction}
                reservationNumber={workflow.reservationNumber}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────── */
export default function WorkflowTimeline({
  workflows,
  daySeparators = [], // [{ afterId, label }]
  defaultOpenWorkflows = [],
  defaultOpenSubSteps = {}, // { [workflowId]: ['subId1', 'subId2'] }
  onAction,
}) {
  const [openWf, setOpenWf] = useState(new Set(defaultOpenWorkflows));
  const toggle = (id) => setOpenWf(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="so-fade-in" style={{ position: 'relative', paddingLeft: 24 }}>
      <span style={{
        position: 'absolute', left: 9, top: 6, bottom: 6,
        width: 2, background: 'linear-gradient(180deg, var(--border-strong), var(--bg-deep))',
      }} />
      {workflows.map((wf, idx) => {
        const sep = daySeparators.find(d => d.afterId === workflows[idx - 1]?.id || (idx === 0 && d.beforeId === wf.id));
        return (
          <React.Fragment key={wf.id}>
            {sep && (
              <div style={{
                fontSize: 9.5, color: 'var(--text-faint)',
                fontFamily: '"Geist Mono", monospace',
                letterSpacing: '0.1px', textTransform: 'uppercase',
                padding: '14px 0 8px',
              }}>━━ {sep.label} ━━</div>
            )}
            <WorkflowNode
              workflow={wf}
              open={openWf.has(wf.id)}
              onToggle={() => toggle(wf.id)}
              onAction={onAction}
              defaultOpenSubSteps={defaultOpenSubSteps[wf.id] || []}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
