// ════════════════════════════════════════════════════════════════════
// OrchestrationEditor.tsx — Workflows + Messages simples
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Stack, Typography, Switch, TextField, MenuItem, IconButton, Button } from '@mui/material';
import { Workflow, SimpleMessage, WorkflowRelance, ChannelKind, ReferencePoint, WindowUnit, T } from './types';

export interface OrchestrationEditorProps {
  workflows: Workflow[];
  messages: SimpleMessage[];
  onUpdateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  onUpdateMessage: (id: string, patch: Partial<SimpleMessage>) => void;
  onAddRelance: (workflowId: string) => void;
  onDeleteRelance: (workflowId: string, relanceId: string) => void;
  onAddMessage: () => void;
  onDeleteMessage: (id: string) => void;
}

const REFERENCE_LABELS: Record<ReferencePoint, string> = {
  reservation_date:    '📅 Date réservation',
  check_in:            '🛬 Check-in',
  check_out:           '🛫 Check-out',
  task_created:        '✨ Création de la tâche',
  previous_step_done:  '✓ Étape précédente terminée',
};

const UNIT_LABELS: Record<WindowUnit, string> = {
  minutes: 'minutes', hours: 'heures', days: 'jours',
};

const CHANNEL_META: Record<ChannelKind, { icon: string; color: string; bg: string }> = {
  whatsapp: { icon: '📱', color: '#0a8f5e', bg: 'rgba(37,211,102,0.10)' },
  email:    { icon: '📧', color: T.info,    bg: T.infoTint },
  sms:      { icon: '💬', color: T.primary, bg: T.primaryTint },
};

export default function OrchestrationEditor({
  workflows, messages,
  onUpdateWorkflow, onUpdateMessage,
  onAddRelance, onDeleteRelance, onAddMessage, onDeleteMessage,
}: OrchestrationEditorProps) {
  const [tab, setTab] = useState<'workflows' | 'messages'>('workflows');

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" gap={1.75} sx={{ mb: 3 }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 1.625,
          background: `linear-gradient(135deg, ${T.primarySoft}, ${T.primaryDeep})`,
          color: '#1a1408', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0, boxShadow: '0 6px 16px rgba(184,133,26,0.25)',
        }}>⚙️</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>Orchestration</Typography>
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.625, lineHeight: 1.55 }}>
            Workflows complets · relances · assignations · deadlines. Messages simples = trigger + canal + template.
          </Typography>
        </Box>
      </Stack>

      {/* Lexique pliable */}
      <Box sx={{
        mb: 2, p: '11px 13px', bgcolor: T.primaryTint, border: `1px solid ${T.primaryTint2}`,
        borderRadius: 1.25, fontSize: 11.5, color: T.text2, lineHeight: 1.5,
      }}>
        <b style={{ color: T.text }}>📖 Lexique</b> ·
        {' '}<b>Référence</b> = point dans le temps (réservation · check-in · check-out · création tâche · étape précédente).
        {' '}<b>Délai</b> = compté en jours OU heures (jamais les deux).
        {' '}<b>Fenêtre</b> = bornes ouverture/fermeture autour de la référence.
      </Box>

      {/* Subtabs */}
      <Stack direction="row" sx={{
        display: 'inline-flex', bgcolor: T.bg1, border: `1px solid ${T.border}`,
        borderRadius: 1.25, p: 0.375, mb: 2.5,
      }}>
        <SubTab on={tab === 'workflows'} onClick={() => setTab('workflows')}>
          🔀 Workflows · {workflows.length}
        </SubTab>
        <SubTab on={tab === 'messages'} onClick={() => setTab('messages')}>
          💬 Messages simples · {messages.length}
        </SubTab>
      </Stack>

      {/* Workflows */}
      {tab === 'workflows' && (
        <Stack gap={1.5}>
          {workflows.map(wf => (
            <WorkflowCard key={wf._id} wf={wf}
              onUpdate={(p) => onUpdateWorkflow(wf._id, p)}
              onAddRelance={() => onAddRelance(wf._id)}
              onDeleteRelance={(rid) => onDeleteRelance(wf._id, rid)} />
          ))}
        </Stack>
      )}

      {/* Messages */}
      {tab === 'messages' && (
        <Box>
          <Stack gap={1}>
            {messages.map(m => (
              <MessageRow key={m._id} msg={m}
                onUpdate={(p) => onUpdateMessage(m._id, p)}
                onDelete={() => onDeleteMessage(m._id)} />
            ))}
          </Stack>
          <Button onClick={onAddMessage} sx={{
            mt: 1.5, textTransform: 'none', fontSize: 12.5, fontWeight: 700,
            color: T.primaryDeep, bgcolor: T.primaryTint, border: `1.5px dashed ${T.primary}`,
            borderRadius: 1.125, px: 2, py: 1.125, width: '100%',
            '&:hover': { bgcolor: T.primaryTint2 },
          }}>+ Nouveau message simple</Button>
        </Box>
      )}
    </Box>
  );
}

/* ─── Workflow card ─── */
function WorkflowCard({ wf, onUpdate, onAddRelance, onDeleteRelance }: {
  wf: Workflow; onUpdate: (p: Partial<Workflow>) => void;
  onAddRelance: () => void; onDeleteRelance: (rid: string) => void;
}) {
  const [expanded, setExpanded] = useState(wf.kind === 'choose_arrival');

  return (
    <Box sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.625,
      overflow: 'hidden', opacity: wf.enabled ? 1 : 0.6,
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Stack direction="row" alignItems="center" gap={1.25} sx={{
        p: '14px 16px', bgcolor: T.bg2, cursor: 'pointer',
        borderBottom: expanded ? `1px solid ${T.border}` : 0,
      }} onClick={() => setExpanded(e => !e)}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1, bgcolor: T.primaryTint,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>🔀</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.005em' }}>{wf.label}</Typography>
          <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25 }}>
            {wf.relances.length} relance{wf.relances.length > 1 ? 's' : ''} · assignation · deadline
          </Typography>
        </Box>
        <Switch checked={wf.enabled} onChange={e => { e.stopPropagation(); onUpdate({ enabled: e.target.checked }); }} />
        <Box sx={{ color: T.text3, fontSize: 12, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</Box>
      </Stack>

      {expanded && (
        <Box sx={{ p: 2 }}>
          {/* Relances */}
          <SectionTitle>📣 Relances</SectionTitle>
          <Stack gap={0.75}>
            {wf.relances.map((r, idx) => (
              <RelanceRow key={r.id} relance={r} index={idx}
                onChange={(patch) => {
                  const next = wf.relances.map(x => x.id === r.id ? { ...x, ...patch } : x);
                  onUpdate({ relances: next });
                }}
                onDelete={() => onDeleteRelance(r.id)} />
            ))}
          </Stack>
          <Button onClick={onAddRelance} sx={{
            mt: 1, textTransform: 'none', fontSize: 11.5, fontWeight: 700,
            color: T.primaryDeep, bgcolor: T.primaryTint, border: `1px dashed ${T.primary}`,
            borderRadius: 1, px: 1.5, py: 0.75,
          }}>+ Ajouter une relance</Button>

          {/* Assignation */}
          <SectionTitle sx={{ mt: 2.5 }}>👤 Assignation</SectionTitle>
          <Box sx={{ p: 1.5, bgcolor: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1.125 }}>
            <Stack direction="row" gap={1.25} sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box sx={{ fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>Référence</Box>
              <TextField select size="small" value={wf.assignment.reference}
                onChange={e => onUpdate({ assignment: { ...wf.assignment, reference: e.target.value as ReferencePoint } })}
                sx={{ ...inputSxSm, minWidth: 200 }}>
                {Object.entries(REFERENCE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" gap={1.25} flexWrap="wrap" alignItems="center">
              <Box sx={{ fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>Fenêtre</Box>
              <DelayInput value={wf.assignment.windowStart}
                onChange={v => onUpdate({ assignment: { ...wf.assignment, windowStart: v } })} />
              <Box sx={{ color: T.text3 }}>→</Box>
              <DelayInput value={wf.assignment.windowEnd}
                onChange={v => onUpdate({ assignment: { ...wf.assignment, windowEnd: v } })} />
              <Box component="label" sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                <Switch size="small" checked={wf.assignment.autoAssign}
                  onChange={e => onUpdate({ assignment: { ...wf.assignment, autoAssign: e.target.checked } })} />
                Auto-assignation
              </Box>
            </Stack>
          </Box>

          {/* Deadline */}
          <SectionTitle sx={{ mt: 2.5 }}>⏰ Deadline</SectionTitle>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(200,30,30,0.04)', border: `1px solid ${T.errorTint}`, borderRadius: 1.125 }}>
            <Stack direction="row" gap={1.25} flexWrap="wrap" alignItems="center">
              <TextField select size="small" value={wf.deadline.reference}
                onChange={e => onUpdate({ deadline: { ...wf.deadline, reference: e.target.value as ReferencePoint } })}
                sx={{ ...inputSxSm, minWidth: 200 }}>
                {Object.entries(REFERENCE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <Box sx={{ color: T.text3 }}>+</Box>
              <DelayInput value={wf.deadline.delay}
                onChange={v => onUpdate({ deadline: { ...wf.deadline, delay: v } })} />
              <Stack direction="row" gap={1.5} sx={{ ml: 'auto' }}>
                <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                  <Switch size="small" checked={wf.deadline.hardLockAfter}
                    onChange={e => onUpdate({ deadline: { ...wf.deadline, hardLockAfter: e.target.checked } })} />
                  Lock après
                </Box>
                <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                  <Switch size="small" checked={wf.deadline.notifyPM}
                    onChange={e => onUpdate({ deadline: { ...wf.deadline, notifyPM: e.target.checked } })} />
                  Notifier PM
                </Box>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/* ─── Relance row ─── */
function RelanceRow({ relance, index, onChange, onDelete }: {
  relance: WorkflowRelance; index: number;
  onChange: (p: Partial<WorkflowRelance>) => void;
  onDelete: () => void;
}) {
  const ch = CHANNEL_META[relance.channel];
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{
      p: '8px 11px', bgcolor: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1,
    }}>
      <Box sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 10, fontWeight: 800, color: T.text3,
        width: 24, textAlign: 'center',
      }}>#{index + 1}</Box>
      <TextField select size="small" value={relance.channel}
        onChange={e => onChange({ channel: e.target.value as ChannelKind })}
        sx={{ ...inputSxSm, minWidth: 130, '& .MuiSelect-select': { color: ch.color } }}>
        {(Object.keys(CHANNEL_META) as ChannelKind[]).map(c => (
          <MenuItem key={c} value={c}>{CHANNEL_META[c].icon} {c.toUpperCase()}</MenuItem>
        ))}
      </TextField>
      <Box sx={{ color: T.text3, fontSize: 11, fontFamily: '"Geist Mono", monospace' }}>après</Box>
      <DelayInput value={relance.delay} onChange={v => onChange({ delay: v })} />
      <TextField size="small" value={relance.template}
        onChange={e => onChange({ template: e.target.value })}
        placeholder="template_id"
        sx={{ ...inputSxSm, flex: 1, minWidth: 140 }} />
      <Switch size="small" checked={relance.enabled} onChange={e => onChange({ enabled: e.target.checked })} />
      <IconButton size="small" onClick={onDelete} sx={{ color: T.text3, '&:hover': { color: T.error } }}>✕</IconButton>
    </Stack>
  );
}

/* ─── Message simple ─── */
function MessageRow({ msg, onUpdate, onDelete }: {
  msg: SimpleMessage; onUpdate: (p: Partial<SimpleMessage>) => void; onDelete: () => void;
}) {
  const ch = CHANNEL_META[msg.channel];
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{
      p: '10px 12px', bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.125,
      opacity: msg.enabled ? 1 : 0.55,
    }}>
      <Box sx={{ width: 26, height: 26, borderRadius: 0.75, bgcolor: ch.bg, color: ch.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{ch.icon}</Box>
      <TextField size="small" value={msg.label} onChange={e => onUpdate({ label: e.target.value })}
        sx={{ ...inputSxSm, minWidth: 180 }} />
      <TextField select size="small" value={msg.trigger.reference}
        onChange={e => onUpdate({ trigger: { ...msg.trigger, reference: e.target.value as ReferencePoint } })}
        sx={{ ...inputSxSm, minWidth: 160 }}>
        {Object.entries(REFERENCE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
      </TextField>
      <DelayInput value={msg.trigger.delay} onChange={v => onUpdate({ trigger: { ...msg.trigger, delay: v } })} />
      <TextField select size="small" value={msg.channel}
        onChange={e => onUpdate({ channel: e.target.value as ChannelKind })}
        sx={{ ...inputSxSm, width: 110 }}>
        {(Object.keys(CHANNEL_META) as ChannelKind[]).map(c => (
          <MenuItem key={c} value={c}>{CHANNEL_META[c].icon} {c.toUpperCase()}</MenuItem>
        ))}
      </TextField>
      <TextField size="small" value={msg.templateId} onChange={e => onUpdate({ templateId: e.target.value })}
        placeholder="template_id" sx={{ ...inputSxSm, flex: 1, minWidth: 140 }} />
      <Switch size="small" checked={msg.enabled} onChange={e => onUpdate({ enabled: e.target.checked })} />
      <IconButton size="small" onClick={onDelete} sx={{ color: T.text3, '&:hover': { color: T.error } }}>✕</IconButton>
    </Stack>
  );
}

/* ─── Inputs ─── */
function DelayInput({ value, onChange }: { value: { value: number; unit: WindowUnit }; onChange: (v: { value: number; unit: WindowUnit }) => void }) {
  return (
    <Stack direction="row" gap={0.375}>
      <TextField size="small" type="number" value={value.value}
        onChange={e => onChange({ ...value, value: Number(e.target.value) })}
        sx={{ ...inputSxSm, width: 80 }} />
      <TextField select size="small" value={value.unit}
        onChange={e => onChange({ ...value, unit: e.target.value as WindowUnit })}
        sx={{ ...inputSxSm, width: 100 }}>
        {(Object.keys(UNIT_LABELS) as WindowUnit[]).map(u => <MenuItem key={u} value={u}>{UNIT_LABELS[u]}</MenuItem>)}
      </TextField>
    </Stack>
  );
}

const inputSxSm = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1, bgcolor: T.bg1, fontSize: 12.5,
    fontFamily: '"Geist Mono", monospace',
    '& fieldset': { borderColor: T.border },
    '&.Mui-focused fieldset': { borderColor: T.primary, boxShadow: `0 0 0 3px ${T.primaryTint}` },
  },
};

function SubTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Box component="button" onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer', px: 1.75, py: 0.875, borderRadius: 1,
      fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.005em',
      ...(on
        ? { background: 'linear-gradient(135deg, #1a1408, #332b1c)', color: T.primary,
            boxShadow: '0 1px 2px rgba(0,0,0,0.20)' }
        : { color: T.text3 }),
    }}>{children}</Box>
  );
}

function SectionTitle({ children, sx }: { children: React.ReactNode; sx?: any }) {
  return (
    <Typography sx={{
      fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
      color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.875, ...sx,
    }}>{children}</Typography>
  );
}
