import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Chip, Stack } from '@mui/material';
import './orchDesign.css';
import { orchDragEndListOrder, orchDragEndIndices, useOrchSortableSensors } from './useOrchSortableList';
import MessageBodyModal from './MessageBodyModal';
import MessageCatalogPicker from './MessageCatalogPicker';
import OrchConfigListCard from './OrchConfigListCard';
import { SCHEDULED_MESSAGE_EMOJI } from './orchestrationJourneyOrder';
import type { OrchListKey } from './orchestrationListOrder';
import OrchConfirmDialog from './OrchConfirmDialog';
import OrchestrationWhatsAppTab from './OrchestrationWhatsAppTab';
import { STAFF_REMINDER_TEMPLATE_OPTIONS } from './staffReminderTemplates';

export type OrchestrationSubTab = 'workflows' | 'messages' | 'config';
import { OrchestrationTimelineSimulation } from '../taskConfig/OrchestrationTimelineSimulation';
import {
  FULLTASK_TASK_TYPES,
  FULLTASK_TASK_TYPE_EMOJI,
  FULLTASK_TASK_TYPE_LABELS,
  labelForTaskTypeId,
  defaultWorkflowAssignment,
  type FulltaskTaskTypeId,
} from './fulltaskTaskTypes';
import { WELCOME_MESSAGE_TEMPLATE_FR } from './orchestrationMessageVars';
import type {
  CatalogMessage,
  MessageDeliveryChannel,
  ReferencePoint,
  ScheduledOrchestrationMessage,
  Workflow,
  WorkflowRelance,
  WorkflowStaffReminder,
} from './types';

const REF_OPTIONS: { value: ReferencePoint; label: string }[] = [
  { value: 'reservation_date', label: 'booking_created' },
  { value: 'check_in', label: 'checkin' },
  { value: 'check_out', label: 'checkout' },
  { value: 'task_created', label: 'task_created' },
  { value: 'previous_step_done', label: 'scheduledDate' },
];

const MSG_EMOJI = ['👋', '☺', '⭐', '💌', '📨'];

/** Créneaux horaires entiers (00:00 … 23:00) — pas de minutes. */
/** Applique le signe +/− sur un délai (si − et valeur 0 → −1 pour que le signe reste visible). */
function applyDelaySign(currentValue: number, signChar: string): number {
  const sign = signChar === '+' || signChar === 'plus' ? 1 : -1;
  let absValue = Math.abs(currentValue);
  if (sign < 0 && absValue === 0) absValue = 1;
  return sign * absValue;
}

function delaySignChar(value: number): string {
  return value < 0 ? 'minus' : 'plus';
}

function normalizeHourSlot(time?: string, fallback = '09:00'): string {
  if (!time?.trim()) return fallback;
  const m = /^(\d{1,2})/.exec(time.trim());
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  if (!Number.isFinite(h)) return fallback;
  return `${String(h).padStart(2, '0')}:00`;
}

function HourSlotSelect({
  value,
  fallback,
  onChange,
}: {
  value?: string;
  fallback: string;
  onChange: (time: string) => void;
}) {
  const slot = normalizeHourSlot(value, fallback);
  return (
    <select value={slot} onChange={(e) => onChange(e.target.value)}>
      {Array.from({ length: 24 }, (_, h) => {
        const hour = h.toString().padStart(2, '0');
        return (
          <option key={hour} value={`${hour}:00`}>
            {hour}:00
          </option>
        );
      })}
    </select>
  );
}

function refLabelForPoint(ref: ReferencePoint | string): string {
  return REF_OPTIONS.find((o) => o.value === ref)?.label || String(ref);
}

/** Sous-titre lisible : « 4 jours avant checkin à 09:00 » */
function formatDelayHuman(
  delay: { value: number; unit: string },
  ref: string,
  time?: string,
): string {
  const abs = Math.abs(delay.value);
  const moment = delay.value < 0 ? 'avant' : 'après';
  if (delay.unit === 'hours') {
    const h = abs > 1 ? 'heures' : 'heure';
    return `${abs} ${h} ${moment} ${ref}`;
  }
  const j = abs > 1 ? 'jours' : 'jour';
  const timePart = time ? ` à ${time}` : '';
  return `${abs} ${j} ${moment} ${ref}${timePart}`;
}

function formatScheduledSubtitle(rule: ScheduledOrchestrationMessage, catalogLabel?: string): string {
  const msgLabel = catalogLabel || '—';
  const ref = refLabelForPoint(rule.trigger.reference);
  const when = formatDelayHuman(rule.trigger.delay, ref, rule.trigger.time);
  return `${msgLabel} · ${when} · ${sendModeLabel(rule.deliveryChannel)}`;
}

function formatDayLabel(day: number): string {
  if (day === 0) return 'J0';
  return day > 0 ? `J+${day}` : `J${day}`;
}

/** Résumé carte workflow — compteurs seulement (le détail est dans le panneau déplié). */
function formatWorkflowSubtitle(w: Workflow): string {
  const rel = w.relances.filter((r) => r.enabled).length;
  const staffRel = (w.staffReminders ?? []).filter((r) => r.enabled).length;
  const parts: string[] = [];
  parts.push(`${rel} relance${rel !== 1 ? 's' : ''}`);
  if (staffRel > 0) parts.push(`${staffRel} rappel staff`);
  if (w.escalationEnabled === false) {
    parts.push('escalade off');
  } else if (w.deadline) {
    parts.push(`escalade ${formatDayLabel(w.deadline.delay.value)}`);
  }
  return parts.join(' · ');
}

/** Affichage config : OTA/email = un seul mode « Message » (canal réel selon source résa à l’envoi). */
function toUiSendMode(ch: MessageDeliveryChannel): 'message' | 'whatsapp' {
  return ch === 'whatsapp' ? 'whatsapp' : 'message';
}

function fromUiSendMode(mode: 'message' | 'whatsapp'): MessageDeliveryChannel {
  return mode === 'whatsapp' ? 'whatsapp' : 'ota';
}

function sendModeLabel(ch: MessageDeliveryChannel): string {
  return ch === 'whatsapp' ? 'WhatsApp' : 'Message';
}

interface Props {
  workflows: Workflow[];
  catalog: CatalogMessage[];
  scheduledRules: ScheduledOrchestrationMessage[];
  saving?: boolean;
  onSave: () => void;
  onUpdateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  onUpdateCatalogEntry: (id: string, patch: Partial<CatalogMessage>) => void;
  onUpdateScheduledRule: (id: string, patch: Partial<ScheduledOrchestrationMessage>) => void;
  onAddRelance: (workflowId: string) => void;
  onDeleteRelance: (workflowId: string, relanceId: string) => void;
  onAddStaffReminder: (workflowId: string) => void;
  onDeleteStaffReminder: (workflowId: string, reminderId: string) => void;
  onAddCatalogEntry: () => string;
  onDeleteCatalogEntry: (id: string) => void;
  onAddScheduledRule: (newId: string) => void;
  onDeleteScheduledRule: (id: string) => void;
  onAddWorkflow: (taskTypeId: FulltaskTaskTypeId) => string;
  onDeleteWorkflow: (workflowId: string) => void;
  listOrder: OrchListKey[];
  onReorderList: (oldIndex: number, newIndex: number) => void;
  onReorderCatalog: (oldIndex: number, newIndex: number) => void;
  initialSubTab?: OrchestrationSubTab;
  onSubTabChange?: (tab: OrchestrationSubTab) => void;
  onSeedDefaults?: () => void;
  onSeedDefaultsVisible?: boolean;
  seedingDefaults?: boolean;
  /** ok = données chargées · empty = Mongo vide · error géré par la page parent */
  loadState?: 'ok' | 'empty' | 'error';
  /** Nom du propriétaire / scope config (workflows, messages, WhatsApp). */
  ownerDisplayName?: string;
  ownerKeyDetail?: string;
  /** Sélecteur admin (optionnel, rendu sous le hero). */
  ownerScopeExtra?: ReactNode;
}

function OrchPlanSaveRow({
  saving,
  onSave,
  label = 'Enregistrer ce plan',
}: {
  saving?: boolean;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="orch-plan-save-row">
      <button
        type="button"
        className="btn-prim orch-plan-save-btn"
        disabled={saving}
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
      >
        {saving ? 'Enregistrement…' : label}
      </button>
    </div>
  );
}

export default function OrchestrationPageView({
  workflows,
  catalog,
  scheduledRules,
  saving,
  onSave,
  onUpdateWorkflow,
  onUpdateCatalogEntry,
  onUpdateScheduledRule,
  onAddRelance,
  onDeleteRelance,
  onAddStaffReminder,
  onDeleteStaffReminder,
  onAddCatalogEntry,
  onDeleteCatalogEntry,
  onAddScheduledRule,
  onDeleteScheduledRule,
  onAddWorkflow,
  onDeleteWorkflow,
  listOrder,
  onReorderList,
  onReorderCatalog,
  initialSubTab = 'workflows',
  onSubTabChange,
  onSeedDefaults,
  onSeedDefaultsVisible = false,
  seedingDefaults,
  loadState = 'ok',
  ownerDisplayName,
  ownerKeyDetail,
  ownerScopeExtra,
}: Props) {
  const sortableSensors = useOrchSortableSensors();
  const [subTab, setSubTab] = useState<OrchestrationSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const selectSubTab = (tab: OrchestrationSubTab) => {
    setSubTab(tab);
    onSubTabChange?.(tab);
  };
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const schedById = useMemo(() => {
    const m = new Map<string, ScheduledOrchestrationMessage>();
    for (const r of scheduledRules) {
      m.set(r._id, r);
      if (r.catalogMessageId) m.set(r.catalogMessageId, r);
    }
    return m;
  }, [scheduledRules]);
  const wfById = useMemo(() => {
    const m = new Map<string, Workflow>();
    for (const w of workflows) {
      m.set(w._id, w);
      if (w.taskTypeId) m.set(w.taskTypeId, w);
    }
    return m;
  }, [workflows]);
  const [expandedCatalogId, setExpandedCatalogId] = useState<string | null>(null);
  const [previewCatalogId, setPreviewCatalogId] = useState<string | null>(null);
  const [previewField, setPreviewField] = useState<'ota' | 'email'>('ota');
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'workflow' | 'catalog' | 'scheduled';
    id: string;
    label: string;
  } | null>(null);

  const previewCatalog = catalog.find((c) => c.id === previewCatalogId);


  const toggleItem = (key: string) => {
    setOpenItemKey((prev) => (prev === key ? null : key));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'workflow') {
      if (openItemKey === `wf:${deleteTarget.id}`) setOpenItemKey(null);
      onDeleteWorkflow(deleteTarget.id);
    } else if (deleteTarget.kind === 'catalog') {
      if (expandedCatalogId === deleteTarget.id) setExpandedCatalogId(null);
      if (previewCatalogId === deleteTarget.id) setPreviewCatalogId(null);
      onDeleteCatalogEntry(deleteTarget.id);
    } else {
      if (openItemKey === `sched:${deleteTarget.id}`) setOpenItemKey(null);
      onDeleteScheduledRule(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const patchRelance = (wf: Workflow, relId: string, patch: Partial<WorkflowRelance>) => {
    onUpdateWorkflow(wf._id, {
      relances: wf.relances.map((r) => (r.id === relId ? { ...r, ...patch } : r)),
    });
  };

  const patchAttemptWindow = (wf: Workflow, index: number, time: string) => {
    if (!wf.assignment) return;
    const attemptWindows = [...(wf.assignment.attemptWindows || [])];
    attemptWindows[index] = time;
    onUpdateWorkflow(wf._id, {
      assignment: { ...wf.assignment, attemptWindows },
    });
  };

  const addAttemptWindow = (wf: Workflow) => {
    if (!wf.assignment) return;
    const attemptWindows = [...(wf.assignment.attemptWindows || []), '09:00'];
    onUpdateWorkflow(wf._id, {
      assignment: { ...wf.assignment, attemptWindows },
    });
  };

  const removeAttemptWindow = (wf: Workflow, index: number) => {
    if (!wf.assignment) return;
    const attemptWindows = (wf.assignment.attemptWindows || []).filter((_, i) => i !== index);
    onUpdateWorkflow(wf._id, {
      assignment: { ...wf.assignment, attemptWindows },
    });
  };

  const patchStaffReminder = (
    wf: Workflow,
    reminderId: string,
    patch: Partial<WorkflowStaffReminder>,
  ) => {
    const list = wf.staffReminders ?? [];
    onUpdateWorkflow(wf._id, {
      staffReminders: list.map((r) => (r.id === reminderId ? { ...r, ...patch } : r)),
    });
  };

  const renderCatalogForm = (entry: CatalogMessage) => (
    <div className="msg-form msg-form--catalog" onClick={(e) => e.stopPropagation()}>
      <div className="row">
        <div className="lbl">
          Nom<span style={{ color: 'var(--er)' }}>*</span>
        </div>
        <input
          className="input"
          value={entry.label}
          onChange={(e) => onUpdateCatalogEntry(entry.id, { label: e.target.value })}
          placeholder="ex: Bienvenu"
        />
      </div>
      <div className="row">
        <div className="lbl">
          Template WhatsApp (ID Meta)<span style={{ color: 'var(--er)' }}>*</span>
        </div>
        <input
          className="input"
          value={entry.whatsappTemplateId}
          onChange={(e) =>
            onUpdateCatalogEntry(entry.id, { whatsappTemplateId: e.target.value })
          }
          placeholder="ex: welcome_sojori_v2"
        />
      </div>
      <div className="row full">
        <div className="lbl">Message OTA (texte FR)</div>
        <textarea
          className="input"
          rows={5}
          value={entry.messageFrOta}
          onChange={(e) => onUpdateCatalogEntry(entry.id, { messageFrOta: e.target.value })}
          placeholder="{firstName}, {listingName}…"
        />
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: 11, marginTop: 6 }}
          onClick={() =>
            onUpdateCatalogEntry(entry.id, {
              messageFrOta: entry.messageFrOta.trim() ? entry.messageFrOta : WELCOME_MESSAGE_TEMPLATE_FR,
            })
          }
        >
          Charger modèle Bienvenue (OTA)
        </button>
      </div>
      <div className="row full">
        <div className="lbl">Message Email (texte FR)</div>
        <textarea
          className="input"
          rows={5}
          value={entry.messageFrEmail}
          onChange={(e) => onUpdateCatalogEntry(entry.id, { messageFrEmail: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <div className="so-orch-root">
      <div className="section-hero">
        <div className="em">⚙️</div>
        <div style={{ flex: 1 }}>
          <h1>
            Orchestration <span className="badge">OPS · cœur du système</span>
          </h1>
          <div className="sub">
            <b>Messages</b> (textes) · <b>Workflows</b> (réservation + relances avec cases message).
          </div>
          {ownerDisplayName ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mt: 1.25 }}
            >
              <span className="sub" style={{ margin: 0, fontWeight: 700, color: 'var(--t2)' }}>
                Propriétaire :
              </span>
              <Chip
                label={ownerDisplayName}
                size="small"
                sx={{
                  fontWeight: 700,
                  height: 24,
                  bgcolor: 'var(--pd, #0673b3)',
                  color: '#fff',
                }}
              />
              {ownerKeyDetail ? (
                <span
                  className="sub"
                  style={{
                    margin: 0,
                    fontFamily: 'Geist Mono, ui-monospace, monospace',
                    fontSize: 11,
                  }}
                >
                  {ownerKeyDetail}
                </span>
              ) : null}
            </Stack>
          ) : null}
        </div>
      </div>

      {ownerScopeExtra ? <Box sx={{ mb: 1.5 }}>{ownerScopeExtra}</Box> : null}

      <div className="sub-tabs">
        <button
          type="button"
          className={`sub-tab${subTab === 'workflows' ? ' on' : ''}`}
          onClick={() => selectSubTab('workflows')}
        >
          <span>🔀</span> Workflows tâches <span className="ct">{workflows.length}</span>
        </button>
        <button
          type="button"
          className={`sub-tab${subTab === 'messages' ? ' on' : ''}`}
          onClick={() => selectSubTab('messages')}
        >
          <span>💬</span> Messages <span className="ct">{catalog.length}</span>
        </button>
        <button
          type="button"
          className={`sub-tab${subTab === 'config' ? ' on' : ''}`}
          onClick={() => selectSubTab('config')}
        >
          <span>📲</span> Config <span className="ct">WA</span>
        </button>
      </div>

      {subTab === 'workflows' && (
        <div>
          <div className="orch-plan-toolbar">
            <p className="orch-plan-hint">
              {scheduledRules.length} message(s) plan · {workflows.length} workflow(s) · glisser ⠿ pour
              réordonner · simulation à droite
            </p>
            <button
              type="button"
              className="btn-prim"
              style={{ fontSize: 12, padding: '7px 14px' }}
              onClick={() => setShowAddPlan((v) => !v)}
            >
              {showAddPlan ? 'Annuler' : '+ Ajouter un workflow'}
            </button>
          </div>

          {showAddPlan && (
            <div className="orch-add-plan-panel">
              <div className="orch-add-plan-h">
                Choisir le type de tâche (workflow) · <span className="req">taskTypeId</span>
              </div>
              <div className="orch-type-picker">
                {FULLTASK_TASK_TYPES.map((taskTypeId) => (
                  <button
                    key={taskTypeId}
                    type="button"
                    className="orch-type-pick"
                    onClick={() => {
                      const newId = onAddWorkflow(taskTypeId);
                      setShowAddPlan(false);
                      setOpenItemKey(`wf:${newId}`);
                    }}
                  >
                    <span className="em">{FULLTASK_TASK_TYPE_EMOJI[taskTypeId] || '📋'}</span>
                    <span className="lbl">{FULLTASK_TASK_TYPE_LABELS[taskTypeId]}</span>
                    <code className="tid">{taskTypeId}</code>
                  </button>
                ))}
              </div>
            </div>
          )}

          {onSeedDefaultsVisible && onSeedDefaults && !showAddPlan && loadState === 'empty' ? (
            <div style={{ margin: '12px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 10px' }}>
                Aucune config en base (<code>orchestration_configs</code> global vide). Chargez le
                seed une seule fois — pas « Enregistrer » sur un écran vide (risque d’écraser MongoDB).
              </p>
              <button
                type="button"
                className="btn-prim"
                style={{ fontSize: 12, padding: '8px 16px' }}
                disabled={seedingDefaults}
                onClick={onSeedDefaults}
              >
                {seedingDefaults
                  ? 'Chargement…'
                  : 'Charger le seed complet (one-shot)'}
              </button>
            </div>
          ) : null}

          <DndContext
            sensors={sortableSensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
              const ix = orchDragEndListOrder(listOrder, e);
              if (ix) onReorderList(ix.oldIndex, ix.newIndex);
            }}
          >
            <SortableContext items={listOrder} strategy={verticalListSortingStrategy}>
              <Stack className="orch-config-list" sx={{ gap: 1 }}>
          {listOrder.map((listKey) => {
            if (listKey.startsWith('sched:')) {
              const ruleId = listKey.slice(6);
              const rule = schedById.get(ruleId);
              if (!rule) return null;
              const itemKey = `sched:${rule._id}`;
              const open = openItemKey === itemKey;
              const emoji =
                SCHEDULED_MESSAGE_EMOJI[rule.catalogMessageId] ||
                MSG_EMOJI[0];
              const catEntry = catalog.find((c) => c.id === rule.catalogMessageId);
              return (
                <OrchConfigListCard
                  key={listKey}
                  sortableId={listKey}
                  sortable
                  emoji={emoji}
                  title={rule.label || catEntry?.label || 'Message plan'}
                  subtitle={formatScheduledSubtitle(rule, catEntry?.label)}
                  expanded={open}
                  onToggleExpand={() => toggleItem(itemKey)}
                  onDelete={() =>
                    setDeleteTarget({
                      kind: 'scheduled',
                      id: rule._id,
                      label: rule.label || 'Sans nom',
                    })
                  }
                >
                  <div className="wf-card-main">
                    <div className="wf-block">
                      <div className="wf-block-h">
                        <span className="wf-block-h-ic">💬</span>
                        <span className="wf-block-h-txt">MESSAGE</span>
                      </div>
                      <div className="rel-msg-chips-row">
                        <span className="rel-msg-chips-lbl">Template</span>
                        <MessageCatalogPicker
                          catalog={catalog}
                          selectedId={rule.catalogMessageId || ''}
                          onChange={(id) =>
                            onUpdateScheduledRule(rule._id, { catalogMessageId: id })
                          }
                          scope="all"
                          variant="select"
                        />
                      </div>
                    </div>

                    <div className="wf-block">
                      <div className="wf-block-h">
                        <span className="wf-block-h-ic">⏰</span>
                        <span className="wf-block-h-txt">TIMING ENVOI</span>
                      </div>
                      <div className="rel-table">
                        <div className={`rel-table-h rel-table-h--timing${rule.trigger.delay.unit === 'hours' ? ' compact' : ''}`}>
                          <span>RÉF</span>
                          <span>J/H</span>
                          <span>+/−</span>
                          <span>{rule.trigger.delay.unit === 'days' ? 'JOURS' : 'HEURES'}</span>
                          {rule.trigger.delay.unit === 'days' && <span>HEURE</span>}
                          <span>CANAL</span>
                        </div>
                        <div className={`rel-row rel-row--timing${rule.trigger.delay.unit === 'hours' ? ' compact' : ''}`}>
                          <select
                            value={rule.trigger.reference}
                            onChange={(e) =>
                              onUpdateScheduledRule(rule._id, {
                                trigger: {
                                  ...rule.trigger,
                                  reference: e.target.value as ReferencePoint,
                                },
                              })
                            }
                          >
                            {REF_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={rule.trigger.delay.unit}
                            title="H (heures) ou J (jours)"
                            onChange={(e) =>
                              onUpdateScheduledRule(rule._id, {
                                trigger: {
                                  ...rule.trigger,
                                  delay: {
                                    ...rule.trigger.delay,
                                    unit: e.target.value as 'hours' | 'days',
                                  },
                                },
                              })
                            }
                          >
                            <option value="hours">H</option>
                            <option value="days">J</option>
                          </select>
                          <select
                            value={rule.trigger.delay.value >= 0 ? '+' : '-'}
                            title="Avant (−) ou Après (+)"
                            onChange={(e) => {
                              const sign = e.target.value === '+' ? 1 : -1;
                              const absValue = Math.abs(rule.trigger.delay.value);
                              onUpdateScheduledRule(rule._id, {
                                trigger: {
                                  ...rule.trigger,
                                  delay: {
                                    ...rule.trigger.delay,
                                    value: sign * absValue,
                                  },
                                },
                              });
                            }}
                          >
                            <option value="+">+</option>
                            <option value="-">−</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={Math.abs(rule.trigger.delay.value)}
                            onChange={(e) => {
                              const sign = rule.trigger.delay.value >= 0 ? 1 : -1;
                              onUpdateScheduledRule(rule._id, {
                                trigger: {
                                  ...rule.trigger,
                                  delay: {
                                    ...rule.trigger.delay,
                                    value: sign * Number(e.target.value),
                                  },
                                },
                              });
                            }}
                          />
                          {rule.trigger.delay.unit === 'days' && (
                            <select
                              value={rule.trigger.time || '09:00'}
                              onChange={(e) =>
                                onUpdateScheduledRule(rule._id, {
                                  trigger: { ...rule.trigger, time: e.target.value },
                                })
                              }
                            >
                              {Array.from({ length: 24 }, (_, h) => {
                                const hour = h.toString().padStart(2, '0');
                                return (
                                  <option key={hour} value={`${hour}:00`}>
                                    {hour}:00
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          <select
                            value={toUiSendMode(rule.deliveryChannel)}
                            title="Message : OTA ou email selon la source de la réservation. WhatsApp : template Meta."
                            onChange={(e) =>
                              onUpdateScheduledRule(rule._id, {
                                deliveryChannel: fromUiSendMode(
                                  e.target.value as 'message' | 'whatsapp',
                                ),
                              })
                            }
                          >
                            <option value="message">Message</option>
                            <option value="whatsapp">WhatsApp</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <OrchPlanSaveRow saving={saving} onSave={onSave} />
                </OrchConfigListCard>
              );
            }

            const wfId = listKey.slice(3);
            const w = wfById.get(wfId);
            if (!w) return null;
            const open = openItemKey === `wf:${w._id}`;
            const taskTypeId = w.taskTypeId || w.triggerTaskType || String(w.kind);
            const emoji = FULLTASK_TASK_TYPE_EMOJI[taskTypeId as FulltaskTaskTypeId] || '⚙️';
            const title = w.label || labelForTaskTypeId(taskTypeId);
            const subtitle = formatWorkflowSubtitle(w);
            return (
              <OrchConfigListCard
                key={listKey}
                sortableId={listKey}
                sortable
                emoji={emoji}
                title={title}
                subtitle={subtitle}
                expanded={open}
                onToggleExpand={() => toggleItem(`wf:${w._id}`)}
                onDelete={() =>
                  setDeleteTarget({ kind: 'workflow', id: w._id, label: title })
                }
              >
                <div className="wf-card-layout">
                  <div className="wf-card-main">
                    <div className="wf-block">
                      <div className="wf-block-h">
                        <span>📨</span> RELANCES VOYAGEUR
                        <span className="ct" style={{ marginLeft: 'auto' }}>
                          {w.relances.length} actives
                        </span>
                      </div>
                      <div className="rel-table">
                        <div className="rel-table-h rel-table-h--timing rel-table-h--with-msg">
                          <span>RÉF</span>
                          <span>J/H</span>
                          <span>+/−</span>
                          <span>DÉLAI</span>
                          <span>HEURE</span>
                          <span>CANAL</span>
                          <span>MESSAGE</span>
                          <span />
                        </div>
                        {w.relances.map((r) => (
                          <div key={r.id} className="rel-relance-block">
                            <div
                              className={`rel-row rel-row--timing rel-row--with-msg${r.delay.unit === 'hours' ? ' compact' : ''}`}
                            >
                              <select
                                value={r.reference}
                                onChange={(e) =>
                                  patchRelance(w, r.id, {
                                    reference: e.target.value as ReferencePoint,
                                  })
                                }
                              >
                                {REF_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={r.delay.unit}
                                title="H (heures) ou J (jours)"
                                onChange={(e) =>
                                  patchRelance(w, r.id, {
                                    delay: {
                                      ...r.delay,
                                      unit: e.target.value as 'hours' | 'days',
                                    },
                                  })
                                }
                              >
                                <option value="hours">H</option>
                                <option value="days">J</option>
                              </select>
                              <select
                                value={r.delay.value >= 0 ? '+' : '-'}
                                title="Avant (−) ou Après (+)"
                                onChange={(e) => {
                                  const sign = e.target.value === '+' ? 1 : -1;
                                  const absValue = Math.abs(r.delay.value);
                                  patchRelance(w, r.id, {
                                    delay: {
                                      ...r.delay,
                                      value: sign * absValue,
                                    },
                                  });
                                }}
                              >
                                <option value="+">+</option>
                                <option value="-">−</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                value={Math.abs(r.delay.value)}
                                onChange={(e) => {
                                  const sign = r.delay.value >= 0 ? 1 : -1;
                                  patchRelance(w, r.id, {
                                    delay: {
                                      ...r.delay,
                                      value: sign * Number(e.target.value),
                                    },
                                  });
                                }}
                              />
                              {r.delay.unit === 'days' && (
                                <select
                                  value={r.time || '09:00'}
                                  onChange={(e) => patchRelance(w, r.id, { time: e.target.value })}
                                >
                                  {Array.from({ length: 24 }, (_, h) => {
                                    const hour = h.toString().padStart(2, '0');
                                    return (
                                      <option key={hour} value={`${hour}:00`}>
                                        {hour}:00
                                      </option>
                                    );
                                  })}
                                </select>
                              )}
                              <select
                                value={toUiSendMode(
                                  r.deliveryChannel ??
                                    (r.channel === 'whatsapp' ? 'whatsapp' : 'ota'),
                                )}
                                title="Message : OTA ou email selon la source de la réservation. WhatsApp : template Meta."
                                onChange={(e) => {
                                  const deliveryChannel = fromUiSendMode(
                                    e.target.value as 'message' | 'whatsapp',
                                  );
                                  patchRelance(w, r.id, {
                                    deliveryChannel,
                                    channel:
                                      deliveryChannel === 'whatsapp' ? 'whatsapp' : 'email',
                                  });
                                }}
                              >
                                <option value="message">Message</option>
                                <option value="whatsapp">WhatsApp</option>
                              </select>
                              <div className="rel-row-msg-cell">
                                <MessageCatalogPicker
                                  catalog={catalog}
                                  selectedId={r.catalogMessageId || r.template || ''}
                                  onChange={(id) =>
                                    patchRelance(w, r.id, { catalogMessageId: id })
                                  }
                                  scope="relance"
                                  variant="select"
                                />
                              </div>
                              <button
                                type="button"
                                className="rel-row-x"
                                aria-label="Supprimer la relance"
                                onClick={() => onDeleteRelance(w._id, r.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="add-btn" onClick={() => onAddRelance(w._id)}>
                        + Ajouter une relance
                      </button>
                    </div>

                    <div className="wf-block">
                      <div className="wf-block-h">
                        <span className="wf-block-h-ic">🎯</span>
                        <span className="wf-block-h-txt">ASSIGNATION STAFF</span>
                        {w.assignment ? (
                          <button
                            type="button"
                            className="add-btn"
                            style={{ marginLeft: 'auto', fontSize: 11 }}
                            onClick={() => onUpdateWorkflow(w._id, { assignment: null })}
                          >
                            Désactiver
                          </button>
                        ) : null}
                      </div>
                      {!w.assignment ? (
                        <button
                          type="button"
                          className="add-btn"
                          onClick={() =>
                            onUpdateWorkflow(w._id, {
                              assignment: defaultWorkflowAssignment(),
                            })
                          }
                        >
                          + Activer l&apos;assignation staff
                        </button>
                      ) : (
                      <>
                      <p className="wf-block-hint">
                        Fenêtre de tentatives d&apos;assignation (référence · jour · heure début / fin).
                      </p>
                      <div className="rel-table rel-table--assign">
                        <div
                          className={`rel-table-h rel-table-h--assign-window${
                            w.assignment.windowStart.unit !== 'hours' ||
                            w.assignment.windowEnd.unit !== 'hours'
                              ? ''
                              : ' compact'
                          }`}
                        >
                          <span />
                          <span>RÉF</span>
                          <span>J/H</span>
                          <span>+/−</span>
                          <span>DÉLAI</span>
                          {(w.assignment.windowStart.unit !== 'hours' ||
                            w.assignment.windowEnd.unit !== 'hours') && <span>HEURE</span>}
                        </div>
                        {(
                          [
                            {
                              key: 'start',
                              lbl: 'Début',
                              hint: '1ère tentative',
                              win: w.assignment.windowStart,
                              winKey: 'windowStart' as const,
                              timePlaceholder: '09:00',
                            },
                            {
                              key: 'end',
                              lbl: 'Fin',
                              hint: 'dernière tentative',
                              win: w.assignment.windowEnd,
                              winKey: 'windowEnd' as const,
                              timePlaceholder: '23:00',
                            },
                          ] as const
                        ).map((row) => (
                          <div
                            key={row.key}
                            className={`rel-row rel-row--assign-window${row.win.unit === 'hours' ? ' compact' : ''}`}
                          >
                            <span className="assign-row-lbl">
                              {row.lbl}
                              <span className="assign-hint">{row.hint}</span>
                            </span>
                            <select
                              value={w.assignment.reference}
                              disabled={row.key === 'end'}
                              title={
                                row.key === 'end'
                                  ? 'Même référence que le début'
                                  : undefined
                              }
                              onChange={(e) =>
                                onUpdateWorkflow(w._id, {
                                  assignment: {
                                    ...w.assignment,
                                    reference: e.target.value as ReferencePoint,
                                  },
                                })
                              }
                            >
                              {REF_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={row.win.unit || 'days'}
                              title="H (heures) ou J (jours)"
                              onChange={(e) =>
                                onUpdateWorkflow(w._id, {
                                  assignment: {
                                    ...w.assignment,
                                    [row.winKey]: {
                                      ...row.win,
                                      unit: e.target.value as 'hours' | 'days',
                                    },
                                  },
                                })
                              }
                            >
                              <option value="hours">H</option>
                              <option value="days">J</option>
                            </select>
                            <select
                              value={row.win.value >= 0 ? '+' : '-'}
                              title="Avant (−) ou Après (+)"
                              onChange={(e) => {
                                const sign = e.target.value === '+' ? 1 : -1;
                                const absValue = Math.abs(row.win.value);
                                onUpdateWorkflow(w._id, {
                                  assignment: {
                                    ...w.assignment,
                                    [row.winKey]: {
                                      ...row.win,
                                      value: sign * absValue,
                                    },
                                  },
                                });
                              }}
                            >
                              <option value="+">+</option>
                              <option value="-">−</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              value={Math.abs(row.win.value)}
                              onChange={(e) => {
                                const sign = row.win.value >= 0 ? 1 : -1;
                                onUpdateWorkflow(w._id, {
                                  assignment: {
                                    ...w.assignment,
                                    [row.winKey]: {
                                      ...row.win,
                                      value: sign * Number(e.target.value),
                                    },
                                  },
                                });
                              }}
                            />
                            {row.win.unit !== 'hours' && (
                              <HourSlotSelect
                                value={row.win.time}
                                fallback={row.timePlaceholder}
                                onChange={(time) =>
                                  onUpdateWorkflow(w._id, {
                                    assignment: {
                                      ...w.assignment,
                                      [row.winKey]: {
                                        ...row.win,
                                        time,
                                      },
                                    },
                                  })
                                }
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="orch-assign-options">
                        <p className="wf-block-hint" style={{ marginTop: 12 }}>
                          Cron horaire : assignation à chaque heure dans la fenêtre start/end.
                          Planning = respecte les horaires staff · Always = ignore le planning.
                        </p>
                        <div className="orch-assign-options-grid">
                          <label className="orch-assign-opt">
                            <span>Auto-assign (forcer acceptation)</span>
                            <select
                              value={w.assignment.autoAssign ? 'yes' : 'no'}
                              onChange={(e) => {
                                const autoAssign = e.target.value === 'yes';
                                onUpdateWorkflow(w._id, {
                                  assignment: {
                                    ...w.assignment!,
                                    autoAssign,
                                    ...(autoAssign ? { findAnotherStaff: false } : {}),
                                  },
                                });
                              }}
                            >
                              <option value="yes">Oui</option>
                              <option value="no">Non</option>
                            </select>
                          </label>
                          <label className="orch-assign-opt">
                            <span>Heure assignation</span>
                            <select
                              value={w.assignment.assignmentHoursMode}
                              onChange={(e) =>
                                onUpdateWorkflow(w._id, {
                                  assignment: {
                                    ...w.assignment!,
                                    assignmentHoursMode: e.target.value as 'planning' | 'always',
                                  },
                                })
                              }
                            >
                              <option value="planning">Planning staff (horaires)</option>
                              <option value="always">Always (bypass planning)</option>
                            </select>
                          </label>
                          <label
                            className={`orch-assign-opt${w.assignment.autoAssign ? ' orch-assign-opt--disabled' : ''}`}
                          >
                            <span>Find another staff</span>
                            <select
                              disabled={w.assignment.autoAssign}
                              title={
                                w.assignment.autoAssign
                                  ? 'Désactivé : acceptation forcée (auto-assign)'
                                  : undefined
                              }
                              value={w.assignment.findAnotherStaff ? 'yes' : 'no'}
                              onChange={(e) =>
                                onUpdateWorkflow(w._id, {
                                  assignment: {
                                    ...w.assignment!,
                                    findAnotherStaff: e.target.value === 'yes',
                                  },
                                })
                              }
                            >
                              <option value="yes">Oui</option>
                              <option value="no">Non</option>
                            </select>
                          </label>
                          <label className="orch-assign-opt">
                            <span>Tolérance acceptation (h)</span>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={w.assignment.acceptToleranceHours}
                              onChange={(e) =>
                                onUpdateWorkflow(w._id, {
                                  assignment: {
                                    ...w.assignment!,
                                    acceptToleranceHours: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="orch-cron-windows">
                          <div className="rel-msg-chips-row orch-cron-windows-row">
                            <span className="rel-msg-chips-lbl">Find another</span>
                            <div className="orch-cron-chips-group">
                              {(w.assignment.attemptWindows || []).map((time, idx) => (
                                <div key={`${w._id}-cron-${idx}`} className="orch-cron-win-chip">
                                  <input
                                    value={time}
                                    placeholder="09:00"
                                    aria-label={`Heure ${idx + 1}`}
                                    onChange={(e) => patchAttemptWindow(w, idx, e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className="orch-cron-win-chip-x"
                                    aria-label="Supprimer l'heure"
                                    onClick={() => removeAttemptWindow(w, idx)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="orch-cron-win-add"
                                aria-label="Ajouter une heure"
                                onClick={() => addAttemptWindow(w)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <p className="orch-cron-windows-hint">
                            Si staff assigné mais non accepté (pending) : relâcher et chercher un
                            autre à ces heures (+ tolérance h)
                          </p>
                        </div>
                      </div>
                      </>
                      )}
                    </div>

                    <div className="wf-block">
                      <div className="wf-block-h">
                        <span className="wf-block-h-ic">🔔</span>
                        <span className="wf-block-h-txt">RAPPELS STAFF</span>
                        <span className="wf-block-h-ct">
                          {(w.staffReminders ?? []).filter((r) => r.enabled).length} actifs
                        </span>
                      </div>
                      <p className="wf-block-hint">
                        Rappel WhatsApp staff (compte staff / Meta). Template par type — ex. transport
                        2h avant, ménage J-1. Onglet Config → templates{' '}
                        <code>staff_reminder_*</code>.
                      </p>
                      <div className="rel-table">
                        <div className="rel-table-h rel-table-h--timing rel-table-h--staff rel-table-h--with-msg">
                          <span>RÉF</span>
                          <span>J/H</span>
                          <span>+/−</span>
                          <span>DÉLAI</span>
                          <span>HEURE</span>
                          <span>MESSAGE</span>
                          <span />
                        </div>
                        {(w.staffReminders ?? []).map((r) => (
                          <div
                            key={r.id}
                            className={`rel-row rel-row--timing rel-row--staff rel-row--with-msg${r.delay.unit === 'hours' ? ' compact' : ''}`}
                          >
                            <select
                              value={r.reference}
                              onChange={(e) =>
                                patchStaffReminder(w, r.id, {
                                  reference: e.target.value as ReferencePoint,
                                })
                              }
                            >
                              {REF_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={r.delay.unit}
                              title="H (heures) ou J (jours)"
                              onChange={(e) =>
                                patchStaffReminder(w, r.id, {
                                  delay: {
                                    ...r.delay,
                                    unit: e.target.value as 'days' | 'hours',
                                  },
                                })
                              }
                            >
                              <option value="hours">H</option>
                              <option value="days">J</option>
                            </select>
                            <select
                              value={r.delay.value >= 0 ? '+' : '-'}
                              title="Avant (−) ou Après (+)"
                              onChange={(e) => {
                                const sign = e.target.value === '+' ? 1 : -1;
                                const absValue = Math.abs(r.delay.value);
                                patchStaffReminder(w, r.id, {
                                  delay: {
                                    ...r.delay,
                                    value: sign * absValue,
                                  },
                                });
                              }}
                            >
                              <option value="+">+</option>
                              <option value="-">−</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              value={Math.abs(r.delay.value)}
                              onChange={(e) => {
                                const sign = r.delay.value >= 0 ? 1 : -1;
                                patchStaffReminder(w, r.id, {
                                  delay: {
                                    ...r.delay,
                                    value: sign * Number(e.target.value),
                                  },
                                });
                              }}
                            />
                            {r.delay.unit === 'days' && (
                              <select
                                value={r.time || '09:00'}
                                onChange={(e) =>
                                  patchStaffReminder(w, r.id, { time: e.target.value })
                                }
                              >
                                {Array.from({ length: 24 }, (_, h) => {
                                  const hour = h.toString().padStart(2, '0');
                                  return (
                                    <option key={hour} value={`${hour}:00`}>
                                      {hour}:00
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                            <div className="rel-row-msg-cell">
                              <select
                                className="input orch-msg-select"
                                value={r.staffTemplateId || ''}
                                title="Template WhatsApp staff"
                                onChange={(e) =>
                                  patchStaffReminder(w, r.id, {
                                    staffTemplateId: e.target.value,
                                  })
                                }
                              >
                                {STAFF_REMINDER_TEMPLATE_OPTIONS.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              className="rel-row-x"
                              aria-label="Supprimer le rappel"
                              onClick={() => onDeleteStaffReminder(w._id, r.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="add-btn"
                        onClick={() => onAddStaffReminder(w._id)}
                      >
                        + Ajouter un rappel
                      </button>
                    </div>

                    <div className="wf-block">
                      <div className="wf-block-h">
                        <span>⏰</span> ESCALADE ADMIN
                        <label className="wf-toggle-esc" style={{ marginLeft: 'auto' }}>
                          <input
                            type="checkbox"
                            checked={w.escalationEnabled !== false}
                            onChange={(e) =>
                              onUpdateWorkflow(w._id, { escalationEnabled: e.target.checked })
                            }
                          />
                          <span>Activée</span>
                        </label>
                      </div>
                      {w.escalationEnabled === false ? (
                        <p className="wf-block-hint">
                          Escalade désactivée — aucun bloc escalade dans le plan exécuté.
                        </p>
                      ) : (
                      <div className="deadline-block">
                        <span style={{ fontSize: 18 }}>🚨</span>
                        <div className="deadline-block-body">
                          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                            Si non traité → escalade auto admin
                          </div>
                          <div className="rel-table rel-table--deadline">
                            <div
                              className={`rel-table-h rel-table-h--deadline${w.deadline.delay.unit === 'hours' ? ' compact' : ''}`}
                            >
                              <span>RÉF</span>
                              <span>J/H</span>
                              <span>+/−</span>
                              <span>DÉLAI</span>
                              {w.deadline.delay.unit === 'days' && <span>HEURE</span>}
                            </div>
                            <div
                              className={`rel-row rel-row--deadline${w.deadline.delay.unit === 'hours' ? ' compact' : ''}`}
                            >
                              <select
                                value={w.deadline.reference}
                                onChange={(e) =>
                                  onUpdateWorkflow(w._id, {
                                    deadline: {
                                      ...w.deadline,
                                      reference: e.target.value as ReferencePoint,
                                    },
                                  })
                                }
                              >
                                {REF_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={w.deadline.delay.unit}
                                title="H (heures) ou J (jours)"
                                onChange={(e) =>
                                  onUpdateWorkflow(w._id, {
                                    deadline: {
                                      ...w.deadline,
                                      delay: {
                                        ...w.deadline.delay,
                                        unit: e.target.value as 'hours' | 'days',
                                      },
                                    },
                                  })
                                }
                              >
                                <option value="hours">H</option>
                                <option value="days">J</option>
                              </select>
                              <select
                                value={delaySignChar(w.deadline.delay.value)}
                                title="Avant (−) ou Après (+)"
                                onChange={(e) =>
                                  onUpdateWorkflow(w._id, {
                                    deadline: {
                                      ...w.deadline,
                                      delay: {
                                        ...w.deadline.delay,
                                        value: applyDelaySign(
                                          w.deadline.delay.value,
                                          e.target.value,
                                        ),
                                      },
                                    },
                                  })
                                }
                              >
                                <option value="plus">+</option>
                                <option value="minus">−</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                value={Math.abs(w.deadline.delay.value)}
                                onChange={(e) => {
                                  const sign = w.deadline.delay.value < 0 ? -1 : 1;
                                  onUpdateWorkflow(w._id, {
                                    deadline: {
                                      ...w.deadline,
                                      delay: {
                                        ...w.deadline.delay,
                                        value: sign * Number(e.target.value || 0),
                                      },
                                    },
                                  });
                                }}
                              />
                              {w.deadline.delay.unit === 'days' && (
                                <HourSlotSelect
                                  value={w.deadline.time}
                                  fallback="14:00"
                                  onChange={(time) =>
                                    onUpdateWorkflow(w._id, {
                                      deadline: { ...w.deadline, time },
                                    })
                                  }
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>

                  <aside className="wf-card-sim" aria-label="Simulation timeline">
                    <OrchestrationTimelineSimulation
                      title={`${title.toUpperCase()} · SIMULATION`}
                      subtitle="Vue voyageur + staff · temps réel"
                      designWorkflow={w}
                      taskTypeId={taskTypeId}
                    />
                  </aside>
                </div>
                <OrchPlanSaveRow saving={saving} onSave={onSave} />
              </OrchConfigListCard>
            );
          })}
              </Stack>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            className="add-btn"
            style={{ marginTop: 10 }}
            onClick={() => onAddScheduledRule(`sched-${Date.now()}`)}
          >
            + Message plan réservation
          </button>
        </div>
      )}

      {subTab === 'config' && <OrchestrationWhatsAppTab />}

      {subTab === 'messages' && (
        <div>
          <div className="orch-plan-toolbar">
            <p className="orch-plan-hint">
              {catalog.length} message(s) · textes OTA / email (onglet Config = templates WhatsApp Meta)
            </p>
            <button
              type="button"
              className="btn-prim"
              style={{ fontSize: 12, padding: '7px 14px' }}
              onClick={() => {
                const id = onAddCatalogEntry();
                setExpandedCatalogId(id);
              }}
            >
              + Ajouter
            </button>
          </div>
          <DndContext
            sensors={sortableSensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
              const ix = orchDragEndIndices(catalog, e);
              if (ix) onReorderCatalog(ix.oldIndex, ix.newIndex);
            }}
          >
            <SortableContext
              items={catalog.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack className="orch-config-list" sx={{ gap: 1 }}>
                {catalog.map((entry, idx) => (
                  <OrchConfigListCard
                    key={entry.id}
                    sortableId={entry.id}
                    emoji={MSG_EMOJI[idx % MSG_EMOJI.length]}
                    title={entry.label || entry.id}
                    subtitle={`WA ${entry.whatsappTemplateId || entry.id || '—'}`}
                    expanded={expandedCatalogId === entry.id}
                    onToggleExpand={() =>
                      setExpandedCatalogId((prev) => (prev === entry.id ? null : entry.id))
                    }
                    onDelete={() =>
                      setDeleteTarget({ kind: 'catalog', id: entry.id, label: entry.label })
                    }
                  >
                    {renderCatalogForm(entry)}
                    <OrchPlanSaveRow
                      saving={saving}
                      onSave={onSave}
                      label="Enregistrer ce message"
                    />
                  </OrchConfigListCard>
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {subTab !== 'config' ? (
        <div className="orch-foot">
          <p className="orch-foot-hint">Enregistre toute la config (workflows, ordre, messages catalogue).</p>
          <button type="button" className="btn-prim" disabled={saving} onClick={onSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer tout ⚡'}
          </button>
        </div>
      ) : null}

      {previewCatalog && (
        <MessageBodyModal
          open={Boolean(previewCatalogId)}
          title={`${previewCatalog.label} · ${previewField === 'ota' ? 'OTA' : 'Email'}`}
          messageFr={previewField === 'ota' ? previewCatalog.messageFrOta : previewCatalog.messageFrEmail}
          channelLabel={previewField === 'ota' ? 'OTA' : 'Email'}
          onClose={() => setPreviewCatalogId(null)}
          onChange={(text) =>
            onUpdateCatalogEntry(previewCatalog.id, {
              ...(previewField === 'ota' ? { messageFrOta: text } : { messageFrEmail: text }),
            })
          }
        />
      )}

      <OrchConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === 'workflow'
            ? 'Supprimer le workflow'
            : deleteTarget?.kind === 'catalog'
              ? 'Supprimer du catalogue'
              : 'Supprimer la règle d\'envoi'
        }
        message={
          deleteTarget
            ? `Supprimer « ${deleteTarget.label} » ? Pensez à cliquer sur Enregistrer pour valider en base.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
