import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import type { CapabilityExecutionState } from './types';
import { defaultWorkflowAssignment } from '../taskHub/staff-design/fulltaskTaskTypes';
import { STAFF_REMINDER_TEMPLATE_OPTIONS, defaultStaffReminderMessageId } from '../taskHub/staff-design/staffReminderTemplates';
import type {
  CatalogMessage,
  MessageDeliveryChannel,
  ReferencePoint,
  Workflow,
  WorkflowAssignment,
  WorkflowDeadline,
  WorkflowRelance,
  WorkflowStaffReminder,
} from '../taskHub/staff-design/types';
import * as fulltaskApi from '../../services/fulltaskApi';
import { apiOrchestrationToDesign, designOrchestrationToApi } from '../../utils/fulltaskMappers';
import { unwrapFulltaskData } from '../../utils/unwrapFulltaskResponse';
import type { CapabilityDefinition } from './capabilityRegistry';
import { SOJORI_TOKENS as T } from '../listing/components/ConfigOrchestration/types';
import {
  saveListingExecutionWorkflow,
  workflowFromCapabilityExecution,
  type ListingOrchestrationDoc,
} from '../orchestrationListingV3/listingOrchestrationApi';

const REF_OPTIONS: { value: ReferencePoint; label: string }[] = [
  { value: 'reservation_date', label: 'Date réservation' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'check_out', label: 'Check-out' },
  { value: 'task_created', label: 'Création tâche' },
  { value: 'previous_step_done', label: 'Étape précédente' },
];

const HOUR_SLOTS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

function toUiSendMode(ch: MessageDeliveryChannel): 'message' | 'whatsapp' {
  return ch === 'whatsapp' ? 'whatsapp' : 'message';
}

function fromUiSendMode(mode: 'message' | 'whatsapp'): MessageDeliveryChannel {
  return mode === 'whatsapp' ? 'whatsapp' : 'ota';
}

function newRelance(catalog: CatalogMessage[]): WorkflowRelance {
  const defaultMsg =
    catalog.find(c => c.id.startsWith('msg_relance_'))?.id || catalog[0]?.id || '';
  return {
    id: `rel-${Date.now()}`,
    channel: 'whatsapp',
    deliveryChannel: 'whatsapp',
    reference: 'check_in',
    delay: { value: -1, unit: 'days' },
    time: '09:00',
    catalogMessageId: defaultMsg,
    enabled: true,
  };
}

function newStaffReminder(taskTypeId: string, count: number): WorkflowStaffReminder {
  return {
    id: `staff-${Date.now()}`,
    label: `Rappel ${count + 1}`,
    reference: 'check_in',
    delay: { value: -1, unit: 'days' },
    time: '11:00',
    enabled: true,
    staffTemplateId: defaultStaffReminderMessageId(taskTypeId),
  };
}

type ExecSection = 'relances' | 'staff' | 'escalade' | 'all';

type Props = {
  def: CapabilityDefinition;
  ownerKey: string;
  listingId?: string;
  orchestrationDoc?: ListingOrchestrationDoc;
  readOnly?: boolean;
  section?: ExecSection;
  executionFlags?: CapabilityExecutionState;
  onSaved?: () => void;
};

export default function CapabilityExecutionPanel({
  def,
  ownerKey,
  listingId,
  orchestrationDoc,
  readOnly,
  section = 'all',
  executionFlags,
  onSaved,
}: Props) {
  const ownerId = ownerKey === 'global' ? 'global' : ownerKey;
  const listingMode = Boolean(listingId && orchestrationDoc);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [catalog, setCatalog] = useState<CatalogMessage[]>([]);
  const [rawDoc, setRawDoc] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const wfRef = useRef<Workflow | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!def.taskType) {
      setWorkflow(null);
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      if (listingMode && listingId && orchestrationDoc) {
        const cap = orchestrationDoc.capabilities?.[def.key];
        const wf =
          workflowFromCapabilityExecution(def.taskType, cap?.execution) ??
          null;
        setRawDoc({ workflows: cap?.execution ? [{ type: def.taskType, ...cap.execution }] : [] });
        setWorkflow(wf);
        wfRef.current = wf;
        const raw = await fulltaskApi.getOrchestrationConfig(ownerId);
        const ownerDoc = unwrapFulltaskData<Record<string, unknown>>(raw);
        const mapped = ownerDoc ? apiOrchestrationToDesign(ownerDoc) : null;
        setCatalog((mapped?.catalog ?? []) as CatalogMessage[]);
      } else {
        const raw = await fulltaskApi.getOrchestrationConfig(ownerId);
        const doc = unwrapFulltaskData<Record<string, unknown>>(raw);
        setRawDoc(doc);
        const mapped = doc ? apiOrchestrationToDesign(doc) : null;
        const wfs = (mapped?.workflows ?? []) as Workflow[];
        const wf =
          wfs.find(w => w.taskTypeId === def.taskType) ??
          wfs.find(w => w._id === def.workflowKey?.replace('wf:', 'wf-'));
        setWorkflow(wf ?? null);
        wfRef.current = wf ?? null;
        setCatalog((mapped?.catalog ?? []) as CatalogMessage[]);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Chargement orchestration impossible');
      setWorkflow(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ownerId, def.taskType, def.workflowKey, def.key, listingMode, listingId, orchestrationDoc]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchWorkflow = (patch: Partial<Workflow>) => {
    setWorkflow(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      wfRef.current = next;
      return next;
    });
  };

  const patchRelance = (id: string, patch: Partial<WorkflowRelance>) => {
    setWorkflow(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        relances: prev.relances.map(r => (r.id === id ? { ...r, ...patch } : r)),
      };
      wfRef.current = next;
      return next;
    });
  };

  const patchStaffReminder = (id: string, patch: Partial<WorkflowStaffReminder>) => {
    setWorkflow(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        staffReminders: prev.staffReminders.map(r => (r.id === id ? { ...r, ...patch } : r)),
      };
      wfRef.current = next;
      return next;
    });
  };

  const addRelance = () => {
    setWorkflow(prev => {
      if (!prev) return prev;
      const next = { ...prev, relances: [...prev.relances, newRelance(catalog)] };
      wfRef.current = next;
      return next;
    });
  };

  const deleteRelance = (id: string) => {
    setWorkflow(prev => {
      if (!prev) return prev;
      const next = { ...prev, relances: prev.relances.filter(r => r.id !== id) };
      wfRef.current = next;
      return next;
    });
  };

  const addStaffReminder = () => {
    setWorkflow(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        staffReminders: [
          ...prev.staffReminders,
          newStaffReminder(def.taskType ?? prev.taskTypeId, prev.staffReminders.length),
        ],
      };
      wfRef.current = next;
      return next;
    });
  };

  const deleteStaffReminder = (id: string) => {
    setWorkflow(prev => {
      if (!prev) return prev;
      const next = { ...prev, staffReminders: prev.staffReminders.filter(r => r.id !== id) };
      wfRef.current = next;
      return next;
    });
  };

  const patchDeadline = (patch: Partial<WorkflowDeadline>) => {
    setWorkflow(prev => {
      if (!prev) return prev;
      const next = { ...prev, deadline: { ...prev.deadline, ...patch } };
      wfRef.current = next;
      return next;
    });
  };


  const save = async () => {
    const wf = wfRef.current;
    if (!wf) return;
    setSaving(true);
    try {
      if (listingMode && listingId && orchestrationDoc && def.taskType) {
        await saveListingExecutionWorkflow({
          listingId,
          capabilityKey: def.key,
          taskType: def.taskType,
          workflow: wf,
          doc: orchestrationDoc,
        });
        toast.success('Exécution enregistrée (listing)');
      } else {
        if (!rawDoc) return;
        const mapped = apiOrchestrationToDesign(rawDoc);
        const workflows = ((mapped.workflows ?? []) as Workflow[]).map(w =>
          w.taskTypeId === wf.taskTypeId || w._id === wf._id ? wf : w,
        );
        const body = designOrchestrationToApi({ ...mapped, workflows });
        await fulltaskApi.upsertOrchestrationConfig(ownerId, body as Record<string, unknown>);
        toast.success('Exécution enregistrée (fulltask)');
      }
      await load({ silent: true });
      onSaved?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (!def.taskType || def.columns.execution === 'na') {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3 }}>
        Pas de workflow tâche pour ce service.
      </Typography>
    );
  }

  if (loading) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
      </Box>
    );
  }

  if (!workflow) {
    return (
      <Alert severity="warning" sx={{ fontSize: 12.5 }}>
        Workflow <code>{def.taskType}</code> introuvable pour ce PM. Seed via{' '}
        <strong>/tasks/orchestration-config</strong>.
      </Alert>
    );
  }

  const assignment = workflow.assignment ?? null;
  const showRelances = section === 'all' || section === 'relances';
  const showStaff = section === 'all' || section === 'staff';
  const showEscalade = section === 'all' || section === 'escalade';
  const relancesActive = executionFlags?.clientReminders !== false;
  const staffAssignActive = executionFlags?.staffAssignment !== false;
  const staffRemindersActive = executionFlags?.staffReminders !== false;
  const escaladeActive = executionFlags?.pmEscalation !== false;

  return (
    <Stack spacing={2}>
      {section === 'all' && (
        <Box sx={{ p: 1.5, bgcolor: T.bg2, borderRadius: 1.25, border: `1px solid ${T.border}` }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Workflow · {workflow.label}</Typography>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <Typography sx={{ fontSize: 12, color: T.text3 }}>Actif</Typography>
              <Switch
                checked={workflow.enabled !== false}
                disabled={readOnly}
                onChange={e => patchWorkflow({ enabled: e.target.checked })}
              />
            </Stack>
          </Stack>
        </Box>
      )}

      {showRelances &&
        (relancesActive ? (
        <ClientRelancesPanel
          relances={workflow.relances}
          catalog={catalog}
          readOnly={readOnly}
          onPatch={patchRelance}
          onAdd={addRelance}
          onDelete={deleteRelance}
        />
        ) : (
          <Alert severity="info" sx={{ fontSize: 12 }}>
            Relances voyageur désactivées — activez « Activer relances » puis Enregistrer.
          </Alert>
        ))}

      {showStaff && (
        <Stack spacing={2.5} sx={{ width: '100%' }}>
          {staffAssignActive ? (
          <StaffAssignmentPanel
            assignment={assignment}
            readOnly={readOnly}
            onPatch={next => patchWorkflow({ assignment: next })}
            onEnable={() => patchWorkflow({ assignment: defaultWorkflowAssignment() })}
            onDisable={() => patchWorkflow({ assignment: null })}
          />
          ) : (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              Assignation staff désactivée dans le plan — activez « Activer staff » puis Enregistrer.
            </Alert>
          )}
          {staffRemindersActive ? (
          <StaffRemindersPanel
            reminders={workflow.staffReminders}
            readOnly={readOnly}
            onPatch={patchStaffReminder}
            onAdd={addStaffReminder}
            onDelete={deleteStaffReminder}
          />
          ) : (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              Rappels staff désactivés — activez « Rappels staff » puis Enregistrer.
            </Alert>
          )}
        </Stack>
      )}

      {showEscalade &&
        (escaladeActive ? (
        <EscaladeDeadlinePanel
          enabled={workflow.escalationEnabled !== false}
          deadline={workflow.deadline}
          readOnly={readOnly}
          onEnabledChange={v => patchWorkflow({ escalationEnabled: v })}
          onPatchDeadline={patchDeadline}
        />
        ) : (
          <Alert severity="info" sx={{ fontSize: 12 }}>
            Escalade désactivée — activez « Activer escalade » puis Enregistrer.
          </Alert>
        ))}

      {!readOnly && (
        <Button
          variant="contained"
          disabled={saving}
          onClick={() => void save()}
          sx={{ fontWeight: 800, borderRadius: '10px', bgcolor: T.primaryDeep }}
        >
          {saving ? 'Enregistrement…' : listingMode ? 'Enregistrer exécution' : 'Enregistrer exécution (fulltask)'}
        </Button>
      )}
    </Stack>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 10.5,
        fontWeight: 800,
        color: T.text3,
        letterSpacing: '0.06em',
        fontFamily: '"Geist Mono", ui-monospace, monospace',
        mt: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

const panelSx = {
  border: `1px solid ${T.border}`,
  borderRadius: 1.25,
  bgcolor: T.bg1,
  overflow: 'hidden',
};

const compactField = { '& .MuiInputBase-root': { fontSize: 12 } };

const WINDOW_COLS = '64px minmax(100px,1fr) 52px 44px 64px minmax(72px,88px)';

const RELANCE_COLS =
  'minmax(56px, 0.65fr) 74px 56px 82px 98px 118px minmax(170px, 2.4fr) 32px';

const relanceGridGap = 1.5;

const messageSelectSx = {
  ...compactField,
  minWidth: 0,
  '& .MuiSelect-select': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  },
};

function formatRelanceTiming(r: WorkflowRelance): string {
  const sign = r.delay.value > 0 ? '+' : r.delay.value < 0 ? '−' : '';
  const n = Math.abs(r.delay.value);
  if (r.delay.unit === 'hours') return `J${sign}${n}h`;
  return `J${sign}${n} · ${r.time || '09:00'}`;
}

function RelancesApercu({
  relances,
  catalog,
}: {
  relances: WorkflowRelance[];
  catalog: CatalogMessage[];
}) {
  const rows = relances
    .filter(r => r.enabled !== false)
    .slice()
    .sort((a, b) => a.delay.value - b.delay.value);

  if (rows.length === 0) return null;

  return (
    <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px dashed ${T.border}` }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text3, letterSpacing: '0.06em', mb: 1 }}>
        APERÇU RELANCES
      </Typography>
      <Stack spacing={1}>
        {rows.map((r, i) => {
          const msg = catalog.find(c => c.id === (r.catalogMessageId || r.template))?.label || '—';
          const ref = REF_OPTIONS.find(o => o.value === r.reference)?.label ?? r.reference;
          return (
            <Stack key={r.id} direction="row" spacing={2} alignItems="baseline" sx={{ fontSize: 12 }}>
              <Typography sx={{ fontWeight: 800, color: T.primaryDeep, minWidth: 28 }}>#{i + 1}</Typography>
              <Typography sx={{ fontFamily: '"Geist Mono", monospace', color: T.text2, minWidth: 108 }}>
                {formatRelanceTiming(r)}
              </Typography>
              <Typography sx={{ color: T.text3, minWidth: 72 }}>{ref}</Typography>
              <Typography sx={{ color: T.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {msg}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

const REMINDER_COLS =
  'minmax(88px,1fr) 48px 40px 52px minmax(64px,72px) minmax(120px,1.2fr) 32px';

const DEADLINE_COLS = 'minmax(120px,1fr) 48px 40px 52px minmax(64px,72px)';

type WindowKey = 'windowStart' | 'windowEnd';

function ClientRelancesPanel({
  relances,
  catalog,
  readOnly,
  onPatch,
  onAdd,
  onDelete,
}: {
  relances: WorkflowRelance[];
  catalog: CatalogMessage[];
  readOnly?: boolean;
  onPatch: (id: string, patch: Partial<WorkflowRelance>) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const activeCount = relances.filter(r => r.enabled !== false).length;

  return (
    <Box sx={panelSx}>
      <Box sx={{ px: 1.5, py: 1, bgcolor: T.bg2, borderBottom: `1px solid ${T.border}` }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>📨 Relances voyageur</Typography>
        <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.25 }}>{activeCount} active(s)</Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        {relances.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: RELANCE_COLS,
              gap: relanceGridGap,
              px: 0.5,
              pb: 1,
              mb: 0.5,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            {['Réf', 'J/H', '±', 'Délai', 'Heure', 'Canal', 'Message', ''].map(h => (
              <Typography key={h || 'x'} sx={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>
                {h}
              </Typography>
            ))}
          </Box>
        )}
        <Stack spacing={1.25}>
          {relances.map(r => (
            <Box
              key={r.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: RELANCE_COLS,
                gap: relanceGridGap,
                alignItems: 'center',
                px: 1,
                py: 1.25,
                borderRadius: 1.25,
                border: `1px solid ${T.border}`,
                bgcolor: r.enabled !== false ? T.bg1 : T.bg2,
                opacity: r.enabled !== false ? 1 : 0.75,
              }}
            >
              <FormControl size="small" sx={{ ...compactField, minWidth: 0 }}>
                <Select
                  value={r.reference}
                  disabled={readOnly}
                  onChange={e => onPatch(r.id, { reference: e.target.value as ReferencePoint })}
                >
                  {REF_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ ...compactField, minWidth: 0 }}>
                <Select
                  value={r.delay.unit}
                  disabled={readOnly}
                  onChange={e =>
                    onPatch(r.id, {
                      delay: { ...r.delay, unit: e.target.value as 'days' | 'hours' },
                    })
                  }
                >
                  <MenuItem value="hours">H</MenuItem>
                  <MenuItem value="days">J</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ ...compactField, minWidth: 0 }}>
                <Select
                  value={r.delay.value >= 0 ? '+' : '-'}
                  disabled={readOnly}
                  onChange={e => {
                    const sign = e.target.value === '+' ? 1 : -1;
                    onPatch(r.id, { delay: { ...r.delay, value: sign * Math.abs(r.delay.value) } });
                  }}
                >
                  <MenuItem value="+">+</MenuItem>
                  <MenuItem value="-">−</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                type="number"
                disabled={readOnly}
                value={Math.abs(r.delay.value)}
                onChange={e => {
                  const sign = r.delay.value >= 0 ? 1 : -1;
                  onPatch(r.id, { delay: { ...r.delay, value: sign * Number(e.target.value) } });
                }}
                sx={{ ...compactField, minWidth: 0 }}
              />
              {r.delay.unit === 'days' ? (
                <FormControl size="small" sx={{ ...compactField, minWidth: 0 }}>
                  <Select
                    value={r.time || '09:00'}
                    disabled={readOnly}
                    onChange={e => onPatch(r.id, { time: e.target.value })}
                  >
                    {HOUR_SLOTS.map(h => (
                      <MenuItem key={h} value={h}>
                        {h}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <span />
              )}
              <FormControl size="small" sx={{ ...compactField, minWidth: 0 }}>
                <Select
                  value={toUiSendMode(r.deliveryChannel ?? (r.channel === 'whatsapp' ? 'whatsapp' : 'ota'))}
                  disabled={readOnly}
                  onChange={e => {
                    const deliveryChannel = fromUiSendMode(e.target.value as 'message' | 'whatsapp');
                    onPatch(r.id, {
                      deliveryChannel,
                      channel: deliveryChannel === 'whatsapp' ? 'whatsapp' : 'email',
                    });
                  }}
                >
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="message">Message</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={messageSelectSx}>
                <Select
                  value={r.catalogMessageId || r.template || ''}
                  disabled={readOnly}
                  displayEmpty
                  renderValue={id => {
                    const label = catalog.find(c => c.id === id)?.label || id || '—';
                    return label.length > 32 ? `${label.slice(0, 32)}…` : label;
                  }}
                  onChange={e => onPatch(r.id, { catalogMessageId: e.target.value })}
                >
                  {catalog.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                disabled={readOnly}
                onClick={() => onDelete(r.id)}
                sx={{ minWidth: 28, px: 0.5, color: T.error }}
              >
                ×
              </Button>
            </Box>
          ))}
        </Stack>
        {!readOnly && (
          <Button size="small" onClick={onAdd} sx={{ mt: 1.5, textTransform: 'none', fontSize: 11, fontWeight: 700 }}>
            + Ajouter une relance
          </Button>
        )}
        <RelancesApercu relances={relances} catalog={catalog} />
      </Box>
    </Box>
  );
}

function EscaladeDeadlinePanel({
  enabled,
  deadline,
  readOnly,
  onEnabledChange,
  onPatchDeadline,
}: {
  enabled: boolean;
  deadline: WorkflowDeadline;
  readOnly?: boolean;
  onEnabledChange: (v: boolean) => void;
  onPatchDeadline: (patch: Partial<WorkflowDeadline>) => void;
}) {
  return (
    <Box sx={panelSx}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: T.bg2,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>⏰ Escalade admin</Typography>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Typography sx={{ fontSize: 11, color: T.text3 }}>{enabled ? 'Activée' : 'Désactivée'}</Typography>
          <Switch size="small" checked={enabled} disabled={readOnly} onChange={e => onEnabledChange(e.target.checked)} />
        </Stack>
      </Box>
      <Box sx={{ p: 1.5 }}>
        {!enabled ? (
          <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
            Escalade désactivée — aucun bloc escalade dans le plan exécuté.
          </Typography>
        ) : (
          <Stack spacing={1}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>🚨 Si non traité → escalade auto admin</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: DEADLINE_COLS, gap: 0.75, px: 0.25 }}>
              {['Réf', 'J/H', '±', 'Délai', 'Heure'].map(h => (
                <Typography key={h} sx={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>
                  {h}
                </Typography>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: DEADLINE_COLS, gap: 0.75, alignItems: 'center' }}>
              <FormControl size="small" sx={compactField}>
                <Select
                  value={deadline.reference}
                  disabled={readOnly}
                  onChange={e => onPatchDeadline({ reference: e.target.value as ReferencePoint })}
                >
                  {REF_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={compactField}>
                <Select
                  value={deadline.delay.unit}
                  disabled={readOnly}
                  onChange={e =>
                    onPatchDeadline({
                      delay: { ...deadline.delay, unit: e.target.value as 'days' | 'hours' },
                    })
                  }
                >
                  <MenuItem value="hours">H</MenuItem>
                  <MenuItem value="days">J</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={compactField}>
                <Select
                  value={deadline.delay.value >= 0 ? '+' : '-'}
                  disabled={readOnly}
                  onChange={e => {
                    const sign = e.target.value === '+' ? 1 : -1;
                    onPatchDeadline({
                      delay: { ...deadline.delay, value: sign * Math.abs(deadline.delay.value) },
                    });
                  }}
                >
                  <MenuItem value="+">+</MenuItem>
                  <MenuItem value="-">−</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                type="number"
                disabled={readOnly}
                value={Math.abs(deadline.delay.value)}
                onChange={e => {
                  const sign = deadline.delay.value >= 0 ? 1 : -1;
                  onPatchDeadline({
                    delay: { ...deadline.delay, value: sign * Number(e.target.value) },
                  });
                }}
                sx={compactField}
              />
              {deadline.delay.unit === 'days' ? (
                <FormControl size="small" sx={compactField}>
                  <Select
                    value={deadline.time || '14:00'}
                    disabled={readOnly}
                    onChange={e => onPatchDeadline({ time: e.target.value })}
                  >
                    {HOUR_SLOTS.map(h => (
                      <MenuItem key={h} value={h}>
                        {h}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function StaffAssignmentPanel({
  assignment,
  readOnly,
  onPatch,
  onEnable,
  onDisable,
}: {
  assignment: WorkflowAssignment | null;
  readOnly?: boolean;
  onPatch: (next: WorkflowAssignment) => void;
  onEnable: () => void;
  onDisable: () => void;
}) {
  const patch = (partial: Partial<WorkflowAssignment>) => {
    onPatch({ ...(assignment ?? defaultWorkflowAssignment()), ...partial });
  };

  const patchWindow = (winKey: WindowKey, partial: Partial<WorkflowAssignment['windowStart']>) => {
    const base = assignment ?? defaultWorkflowAssignment();
    onPatch({
      ...base,
      [winKey]: { ...base[winKey], ...partial },
    });
  };

  const patchAttemptWindow = (index: number, time: string) => {
    const base = assignment ?? defaultWorkflowAssignment();
    const attemptWindows = [...(base.attemptWindows || [])];
    attemptWindows[index] = time;
    onPatch({ ...base, attemptWindows });
  };

  const addAttemptWindow = () => {
    const base = assignment ?? defaultWorkflowAssignment();
    onPatch({ ...base, attemptWindows: [...(base.attemptWindows || []), '09:00'] });
  };

  const removeAttemptWindow = (index: number) => {
    const base = assignment ?? defaultWorkflowAssignment();
    onPatch({
      ...base,
      attemptWindows: (base.attemptWindows || []).filter((_, i) => i !== index),
    });
  };

  return (
    <Box sx={panelSx}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: T.bg2,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>👤 Assignation staff</Typography>
        {assignment ? (
          <Button size="small" disabled={readOnly} onClick={onDisable} sx={{ textTransform: 'none', fontSize: 11 }}>
            Désactiver
          </Button>
        ) : null}
      </Box>

      <Box sx={{ p: 1.5 }}>
        {!assignment ? (
          <Button size="small" variant="outlined" disabled={readOnly} onClick={onEnable} sx={{ textTransform: 'none' }}>
            + Activer assignation
          </Button>
        ) : (
          <Stack spacing={1.25}>
            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
              Fenêtre de tentatives · référence · début / fin
            </Typography>
            <Typography sx={{ fontSize: 10, color: T.text3 }}>
              Cron horaire : assignation à chaque heure dans la fenêtre. Planning = horaires staff · Always = bypass.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: WINDOW_COLS,
                gap: 0.75,
                px: 0.5,
                pb: 0.5,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              {['', 'Réf', 'J/H', '±', 'Délai', 'Heure'].map(h => (
                <Typography key={h || 'lbl'} sx={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {(
              [
                { key: 'windowStart' as const, label: 'Début', refEditable: true, timeFallback: '09:00' },
                { key: 'windowEnd' as const, label: 'Fin', refEditable: false, timeFallback: '23:00' },
              ] as const
            ).map(row => {
              const win = assignment[row.key];
              return (
                <Box key={row.key} sx={{ display: 'grid', gridTemplateColumns: WINDOW_COLS, gap: 0.75, alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: 9, color: T.text3 }}>
                      {row.key === 'windowStart' ? '1ère tentative' : 'dernière tentative'}
                    </Typography>
                  </Box>
                  <FormControl size="small" sx={compactField}>
                    <Select
                      value={assignment.reference}
                      disabled={readOnly || !row.refEditable}
                      onChange={e => patch({ reference: e.target.value as ReferencePoint })}
                    >
                      {REF_OPTIONS.map(o => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={compactField}>
                    <Select
                      value={win.unit || 'days'}
                      disabled={readOnly}
                      onChange={e => patchWindow(row.key, { unit: e.target.value as 'days' | 'hours' })}
                    >
                      <MenuItem value="hours">H</MenuItem>
                      <MenuItem value="days">J</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={compactField}>
                    <Select
                      value={win.value >= 0 ? '+' : '-'}
                      disabled={readOnly}
                      onChange={e => {
                        const sign = e.target.value === '+' ? 1 : -1;
                        patchWindow(row.key, { value: sign * Math.abs(win.value) });
                      }}
                    >
                      <MenuItem value="+">+</MenuItem>
                      <MenuItem value="-">−</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    type="number"
                    disabled={readOnly}
                    value={Math.abs(win.value)}
                    onChange={e => {
                      const sign = win.value >= 0 ? 1 : -1;
                      patchWindow(row.key, { value: sign * Number(e.target.value) });
                    }}
                    sx={compactField}
                  />
                  {win.unit !== 'hours' ? (
                    <TextField
                      size="small"
                      disabled={readOnly}
                      value={win.time || row.timeFallback}
                      onChange={e => patchWindow(row.key, { time: e.target.value })}
                      sx={compactField}
                    />
                  ) : (
                    <span />
                  )}
                </Box>
              );
            })}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1,
                pt: 0.5,
              }}
            >
              <FormControl size="small" sx={compactField}>
                <InputLabel>Auto-assign</InputLabel>
                <Select
                  label="Auto-assign"
                  value={assignment.autoAssign ? 'yes' : 'no'}
                  disabled={readOnly}
                  onChange={e => {
                    const autoAssign = e.target.value === 'yes';
                    patch({
                      autoAssign,
                      ...(autoAssign ? { findAnotherStaff: false } : {}),
                    });
                  }}
                >
                  <MenuItem value="yes">Oui (forcer acceptation)</MenuItem>
                  <MenuItem value="no">Non</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={compactField}>
                <InputLabel>Heure assignation</InputLabel>
                <Select
                  label="Heure assignation"
                  value={assignment.assignmentHoursMode}
                  disabled={readOnly}
                  onChange={e =>
                    patch({ assignmentHoursMode: e.target.value as 'planning' | 'always' })
                  }
                >
                  <MenuItem value="planning">Planning staff</MenuItem>
                  <MenuItem value="always">Always (bypass)</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={compactField}>
                <InputLabel>Find another</InputLabel>
                <Select
                  label="Find another"
                  value={assignment.findAnotherStaff ? 'yes' : 'no'}
                  disabled={readOnly || assignment.autoAssign}
                  onChange={e => patch({ findAnotherStaff: e.target.value === 'yes' })}
                >
                  <MenuItem value="yes">Oui</MenuItem>
                  <MenuItem value="no">Non</MenuItem>
                </Select>
              </FormControl>
              {!assignment.autoAssign && assignment.findAnotherStaff ? (
                <FormControl size="small" sx={compactField}>
                  <InputLabel>Release mode</InputLabel>
                  <Select
                    label="Release mode"
                    value={assignment.releaseMode ?? 'tolerance'}
                    disabled={readOnly}
                    onChange={e =>
                      patch({ releaseMode: e.target.value as 'tolerance' | 'windows' })
                    }
                  >
                    <MenuItem value="tolerance">Tolérance (heures)</MenuItem>
                    <MenuItem value="windows">Créneaux horaires</MenuItem>
                  </Select>
                </FormControl>
              ) : null}
              {!assignment.autoAssign &&
            assignment.findAnotherStaff &&
            (assignment.releaseMode ?? 'tolerance') === 'tolerance' ? (
                <>
                <TextField
                  size="small"
                  type="number"
                  label="Tolérance (h)"
                  disabled={readOnly}
                  value={assignment.acceptToleranceHours}
                  onChange={e => patch({ acceptToleranceHours: Number(e.target.value) })}
                  sx={compactField}
                />
                <Typography sx={{ fontSize: 10, color: T.text3, gridColumn: { sm: '1 / -1' } }}>
                  Relâcher le staff non accepté après ce délai (cron horaire).
                </Typography>
                </>
              ) : null}
            </Box>

            {!assignment.autoAssign &&
            assignment.findAnotherStaff &&
            (assignment.releaseMode ?? 'tolerance') === 'windows' ? (
              <Box>
                <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text3, mb: 0.75 }}>
                  Créneaux find-another
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {(assignment.attemptWindows || []).map((time, idx) => (
                    <Stack key={`${idx}-${time}`} direction="row" alignItems="center" spacing={0.25}>
                      <TextField
                        size="small"
                        disabled={readOnly}
                        value={time}
                        placeholder="09:00"
                        onChange={e => patchAttemptWindow(idx, e.target.value)}
                        sx={{ ...compactField, width: 88 }}
                      />
                      <Button
                        size="small"
                        disabled={readOnly}
                        onClick={() => removeAttemptWindow(idx)}
                        sx={{ minWidth: 28, px: 0.5, color: T.error }}
                      >
                        ×
                      </Button>
                    </Stack>
                  ))}
                  <Button size="small" disabled={readOnly} onClick={addAttemptWindow} sx={{ textTransform: 'none', fontSize: 11 }}>
                    + Heure
                  </Button>
                </Stack>
              </Box>
            ) : null}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function StaffRemindersPanel({
  reminders,
  readOnly,
  onPatch,
  onAdd,
  onDelete,
}: {
  reminders: WorkflowStaffReminder[];
  readOnly?: boolean;
  onPatch: (id: string, patch: Partial<WorkflowStaffReminder>) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Box sx={panelSx}>
      <Box sx={{ px: 1.5, py: 1, bgcolor: T.bg2, borderBottom: `1px solid ${T.border}` }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>🔔 Rappels staff</Typography>
        <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.25 }}>
          WhatsApp staff · {reminders.filter(r => r.enabled !== false).length} actif(s) · templates{' '}
          <code>staff_reminder_*</code>
        </Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        {reminders.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: REMINDER_COLS, gap: 0.75, px: 0.25, mb: 0.75 }}>
            {['Réf', 'J/H', '±', 'Délai', 'Heure', 'Message', ''].map(h => (
              <Typography key={h || 'on'} sx={{ fontSize: 9, fontWeight: 800, color: T.text3, textTransform: 'uppercase' }}>
                {h}
              </Typography>
            ))}
          </Box>
        )}
        {reminders.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: T.text3, mb: 1 }}>Aucun rappel staff.</Typography>
        ) : (
          <Stack spacing={0.75}>
            {reminders.map(r => (
              <Box
                key={r.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: REMINDER_COLS,
                  gap: 0.75,
                  alignItems: 'center',
                  p: 0.75,
                  borderRadius: 1,
                  border: `1px solid ${T.border}`,
                  bgcolor: r.enabled !== false ? T.bg1 : T.bg2,
                }}
              >
                <FormControl size="small" sx={compactField}>
                  <Select
                    value={r.reference}
                    disabled={readOnly}
                    onChange={e => onPatch(r.id, { reference: e.target.value as ReferencePoint })}
                  >
                    {REF_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={compactField}>
                  <Select
                    value={r.delay.unit}
                    disabled={readOnly}
                    onChange={e =>
                      onPatch(r.id, {
                        delay: { ...r.delay, unit: e.target.value as 'days' | 'hours' },
                      })
                    }
                  >
                    <MenuItem value="hours">H</MenuItem>
                    <MenuItem value="days">J</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={compactField}>
                  <Select
                    value={r.delay.value >= 0 ? '+' : '-'}
                    disabled={readOnly}
                    onChange={e => {
                      const sign = e.target.value === '+' ? 1 : -1;
                      onPatch(r.id, { delay: { ...r.delay, value: sign * Math.abs(r.delay.value) } });
                    }}
                  >
                    <MenuItem value="+">+</MenuItem>
                    <MenuItem value="-">−</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  type="number"
                  disabled={readOnly}
                  value={Math.abs(r.delay.value)}
                  onChange={e => {
                    const sign = r.delay.value >= 0 ? 1 : -1;
                    onPatch(r.id, { delay: { ...r.delay, value: sign * Number(e.target.value) } });
                  }}
                  sx={compactField}
                />
                {r.delay.unit === 'days' ? (
                  <FormControl size="small" sx={compactField}>
                    <Select
                      value={r.time || '09:00'}
                      disabled={readOnly}
                      onChange={e => onPatch(r.id, { time: e.target.value })}
                    >
                      {HOUR_SLOTS.map(h => (
                        <MenuItem key={h} value={h}>
                          {h}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <span />
                )}
                <FormControl size="small" sx={compactField}>
                  <Select
                    value={r.staffTemplateId || ''}
                    disabled={readOnly}
                    onChange={e => onPatch(r.id, { staffTemplateId: e.target.value })}
                  >
                    {STAFF_REMINDER_TEMPLATE_OPTIONS.map(opt => (
                      <MenuItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  disabled={readOnly}
                  onClick={() => onDelete(r.id)}
                  sx={{ minWidth: 28, px: 0.5, color: T.error }}
                >
                  ×
                </Button>
              </Box>
            ))}
          </Stack>
        )}
        {!readOnly && (
          <Button size="small" onClick={onAdd} sx={{ mt: 1, textTransform: 'none', fontSize: 11, fontWeight: 700 }}>
            + Ajouter un rappel
          </Button>
        )}
      </Box>
    </Box>
  );
}
