/**
 * TaskDetailDrawer — style aligné calendrier v3 (UpdateInventoryModal)
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  Drawer,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { T } from '../../../components/calendar-v3/_shared';
import tasksService from '../../../services/fulltaskTasksService';
import type { TaskListItem, TaskStatus } from '../../../types/tasks.types';
import { TASK_STATUS_LABELS, normalizeTaskStatus } from '../../../types/tasks.types';
import {
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
} from '../../taskHub/staff-design/fulltaskTaskTypes';

/** 1040px − 25 % */
const DRAWER_WIDTH = 780;

const STATUS_OPTIONS: TaskStatus[] = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_ADMIN',
  'CANCELLED_CUSTOMER',
];

function toDateInput(iso?: string): string {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function toTimeInput(value?: string | null): string {
  if (!value) return '';
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
  const m = s.match(/T(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0 && n < 24) {
    return `${String(Math.floor(n)).padStart(2, '0')}:00`;
  }
  return s.slice(0, 5);
}

function fmtDateFr(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'EEEE d MMMM yyyy', { locale: fr });
  } catch {
    return '—';
  }
}

function fmtDateShort(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return '—';
  }
}

function fmtDateTimeFr(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), "d MMM yyyy · HH:mm", { locale: fr });
  } catch {
    return '—';
  }
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 10.5,
        fontWeight: 700,
        bgcolor: T.primaryTint,
        color: T.primaryDeep,
        px: 1.1,
        py: 0.25,
        borderRadius: 99,
        letterSpacing: '0.04em',
        fontFamily: '"Geist Mono", monospace',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="label"
      sx={{
        fontSize: 10.5,
        fontWeight: 700,
        color: T.text3,
        display: 'block',
        mb: 0.65,
        fontFamily: '"Geist Mono", monospace',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  );
}

function FieldBox({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.1,
        px: 1.5,
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: '9px',
        minHeight: 42,
      }}
    >
      {children}
    </Box>
  );
}

function CollapseBlock({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      component="details"
      open={defaultOpen || undefined}
      sx={{
        mt: 1.25,
        pt: 1.25,
        borderTop: `1px dashed ${T.border}`,
        '& summary': {
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          color: T.text2,
          fontFamily: '"Geist Mono", monospace',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          py: 0.5,
          listStyle: 'none',
          '&::-webkit-details-marker': { display: 'none' },
        },
      }}
    >
      <Box component="summary">▶ {title}</Box>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Box>
  );
}

function FooterBtn({
  primary,
  ghost,
  disabled,
  onClick,
  children,
}: {
  primary?: boolean;
  ghost?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      sx={{
        px: 1.75,
        py: 0.9,
        borderRadius: '9px',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 0,
        fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
        ...(primary
          ? {
              background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`,
              color: T.text,
              boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
            }
          : {
              bgcolor: T.bg1,
              color: T.text,
              border: `1px solid ${T.border}`,
            }),
        ...(ghost && !primary
          ? { bgcolor: T.bg1, color: T.text, border: `1px solid ${T.border}` }
          : {}),
      }}
    >
      {children}
    </Box>
  );
}

export interface TaskDetailDrawerProps {
  task: TaskListItem | null;
  onClose: () => void;
  onSuccess?: () => void;
  onAssignStaff?: (task: TaskListItem) => void;
}

export default function TaskDetailDrawer({
  task,
  onClose,
  onSuccess,
  onAssignStaff,
}: TaskDetailDrawerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    scheduledDate: '',
    requestedAt: '',
    scheduledAt: '',
    status: 'CREATED' as TaskStatus,
    requestNote: '',
    executionNote: '',
  });

  const taskKey = task?._id || '';

  useEffect(() => {
    if (!task) {
      setIsEditing(false);
      return;
    }
    const clientTime =
      task.requestedAt ||
      (task.hourSource === 'client' ? task.plannedTime : null) ||
      (task.guestHourChosen ? task.plannedTime : null);
    const planTime = task.scheduledAt || task.plannedTime;
    setForm({
      scheduledDate: toDateInput(task.startDate),
      requestedAt: toTimeInput(clientTime),
      scheduledAt: toTimeInput(planTime),
      status: normalizeTaskStatus(task.taskStatus || task.status) as TaskStatus,
      requestNote:
        task.descriptions?.[0] && typeof task.descriptions[0] === 'object'
          ? (task.descriptions[0] as { description?: string }).description || ''
          : typeof task.descriptions?.[0] === 'string'
            ? task.descriptions[0]
            : '',
      executionNote: task.comment || '',
    });
    setIsEditing(false);
  }, [taskKey]);

  const typeLabel = useMemo(
    () => (task?.subType ? labelForTaskTypeId(String(task.subType)) : '—'),
    [task?.subType],
  );

  const typeEmoji = useMemo(() => {
    const id = task?.subType || task?.type;
    return id && FULLTASK_TASK_TYPE_EMOJI[id as keyof typeof FULLTASK_TASK_TYPE_EMOJI]
      ? FULLTASK_TASK_TYPE_EMOJI[id as keyof typeof FULLTASK_TASK_TYPE_EMOJI]
      : '📋';
  }, [task?.subType, task?.type]);

  const legacyStatus = task
    ? (normalizeTaskStatus(task.taskStatus) as TaskStatus)
    : 'CREATED';

  const handleSave = useCallback(async () => {
    if (!task?._id) return;
    setSaving(true);
    try {
      await tasksService.updateTask(task._id, {
        status: form.status,
        requestedAt: form.requestedAt.trim() || null,
        scheduledAt: form.scheduledAt.trim() || null,
        scheduledDate: form.scheduledDate
          ? new Date(`${form.scheduledDate}T12:00:00.000Z`).toISOString()
          : null,
        requestNote: form.requestNote.trim() || null,
        executionNote: form.executionNote.trim() || null,
      });
      toast.success('Tâche mise à jour');
      setIsEditing(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  }, [task, form, onSuccess]);

  if (!task) return null;

  const clientDisplayTime =
    task.requestedAt ||
    (task.hourSource === 'client' ? task.plannedTime : null) ||
    (task.guestHourChosen ? task.plannedTime : null);
  const sojoriTime =
    task.scheduledAt || (task.hourSource !== 'client' ? task.plannedTime : null);
  const clientTimeStr = clientDisplayTime ? toTimeInput(clientDisplayTime) : '';
  const sojoriTimeStr = sojoriTime ? toTimeInput(sojoriTime) : '';
  const hoursDiffer = Boolean(clientTimeStr && sojoriTimeStr && clientTimeStr !== sojoriTimeStr);

  return (
    <Drawer
      anchor="right"
      open={Boolean(task)}
      onClose={onClose}
      slotProps={{
        backdrop: { sx: { bgcolor: 'rgba(20,17,10,0.45)', backdropFilter: 'blur(4px)' } },
      }}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : `min(${DRAWER_WIDTH}px, 92vw)`,
          maxWidth: '100vw',
          bgcolor: T.bg1,
          borderLeft: `1px solid ${T.border}`,
          boxShadow: '0 24px 64px rgba(20,17,10,0.18)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* En-tête — comme calendrier inventaire */}
      <Box
        sx={{
          flexShrink: 0,
          px: 2.75,
          py: 2.25,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Stack direction="row" gap={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                m: 0,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                color: T.text,
                lineHeight: 1.3,
              }}
            >
              {isEditing ? 'Modifier la tâche' : 'Détail tâche'}
            </Typography>
            <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap',  mt: 0.75 }}>
              <MetaChip>
                {typeEmoji} {task.itemNumber}
              </MetaChip>
              <MetaChip>{typeLabel}</MetaChip>
              <MetaChip>{TASK_STATUS_LABELS[legacyStatus]}</MetaChip>
            </Stack>
            <Typography
              sx={{
                fontSize: 12,
                color: T.text3,
                mt: 0.75,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {[task.listingName, task.reservationNumber].filter(Boolean).join(' · ')}
            </Typography>
            {task.createdAt ? (
              <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.5, fontFamily: '"Geist Mono", monospace' }}>
                Créée le {fmtDateTimeFr(task.createdAt)}
              </Typography>
            ) : null}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            sx={{
              background: 'none',
              border: 0,
              fontSize: 20,
              color: T.text3,
              cursor: 'pointer',
              p: 0,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </Box>
        </Stack>
      </Box>

      {/* Corps */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2.75, py: 2.25 }}>
        {hoursDiffer && !isEditing ? (
          <Box
            sx={{
              mb: 1.75,
              py: 1,
              px: 1.25,
              bgcolor: T.warningTint,
              border: `1px solid rgba(196,101,6,0.25)`,
              borderRadius: '8px',
              fontSize: 12,
              color: T.warning,
              fontWeight: 600,
            }}
          >
            Écart client / planning : {clientTimeStr} → {sojoriTimeStr}
          </Box>
        ) : null}

        <SectionLabel>Date prévue</SectionLabel>
        {isEditing ? (
          <TextField
            type="date"
            size="small"
            fullWidth
            value={form.scheduledDate}
            onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{
              mb: 1.75,
              '& .MuiOutlinedInput-root': {
                fontSize: 12.5,
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 600,
                borderRadius: '9px',
                bgcolor: T.bg1,
              },
            }}
          />
        ) : (
          <>
            <FieldBox>
              <Typography
                sx={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: '"Geist Mono", monospace',
                  color: T.text,
                }}
              >
                {fmtDateFr(task.startDate)}
              </Typography>
            </FieldBox>
            <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.5, mb: 1.75 }}>
              Créée {fmtDateTimeFr(task.createdAt)}
            </Typography>
          </>
        )}

        <SectionLabel>Heure demandée client (WhatsApp)</SectionLabel>
        {clientTimeStr && !isEditing ? (
          <Typography sx={{ fontSize: 11, color: T.text3, mb: 0.5, fontFamily: '"Geist Mono", monospace' }}>
            Actuel: <Box component="b">{clientTimeStr || '—'}</Box>
          </Typography>
        ) : null}
        {isEditing ? (
          <TextField
            type="time"
            size="small"
            fullWidth
            value={form.requestedAt}
            onChange={(e) => setForm((f) => ({ ...f, requestedAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 1.75, '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
          />
        ) : (
          <Box sx={{ mb: 1.75 }}>
            <FieldBox>
              <Typography
                sx={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: '"Geist Mono", monospace',
                  color: clientTimeStr ? T.text : T.text4,
                }}
              >
                {clientTimeStr || '—'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: T.text3, fontWeight: 600 }}>WhatsApp</Typography>
            </FieldBox>
          </Box>
        )}

        <SectionLabel>Heure planifiée Sojori</SectionLabel>
        {sojoriTimeStr && !isEditing ? (
          <Typography sx={{ fontSize: 11, color: T.text3, mb: 0.5, fontFamily: '"Geist Mono", monospace' }}>
            Actuel: <Box component="b">{sojoriTimeStr || '—'}</Box>
          </Typography>
        ) : null}
        {isEditing ? (
          <TextField
            type="time"
            size="small"
            fullWidth
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 1.75, '& .MuiOutlinedInput-root': { borderRadius: '9px' } }}
          />
        ) : (
          <Box sx={{ mb: 0.5 }}>
            <FieldBox>
              <Typography
                sx={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: '"Geist Mono", monospace',
                  color: sojoriTimeStr ? T.text : T.text4,
                }}
              >
                {sojoriTimeStr || '—'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: T.text3, fontWeight: 600 }}>Planning</Typography>
            </FieldBox>
          </Box>
        )}

        {isEditing ? (
          <Box sx={{ mt: 1.75 }}>
            <SectionLabel>Statut</SectionLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
              {STATUS_OPTIONS.map((s) => {
                const active = form.status === s;
                return (
                  <Box
                    key={s}
                    component="button"
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      borderRadius: '8px',
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 600,
                      bgcolor: active ? T.primaryTint : T.bg1,
                      color: active ? T.primaryDeep : T.text2,
                      border: `1px solid ${active ? T.primary : T.border}`,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {TASK_STATUS_LABELS[s]}
                  </Box>
                );
              })}
            </Box>
            <SectionLabel>Note demande</SectionLabel>
            <Box
              component="textarea"
              value={form.requestNote}
              onChange={(e) => setForm((f) => ({ ...f, requestNote: e.target.value }))}
              rows={2}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: T.bg2,
                border: `1px solid ${T.border}`,
                borderRadius: 9,
                fontSize: 13,
                fontFamily: 'inherit',
                color: T.text,
                resize: 'vertical',
                marginBottom: 14,
              }}
            />
            <SectionLabel>Note exécution</SectionLabel>
            <Box
              component="textarea"
              value={form.executionNote}
              onChange={(e) => setForm((f) => ({ ...f, executionNote: e.target.value }))}
              rows={2}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: T.bg2,
                border: `1px solid ${T.border}`,
                borderRadius: 9,
                fontSize: 13,
                fontFamily: 'inherit',
                color: T.text,
                resize: 'vertical',
              }}
            />
          </Box>
        ) : null}

        <CollapseBlock title="Exécution" defaultOpen={true}>
          <SectionLabel>Staff</SectionLabel>
          <FieldBox>
            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.text }}>
              {task.staffName || 'Aucun staff assigné'}
            </Typography>
            {onAssignStaff ? (
              <Box
                component="button"
                type="button"
                onClick={() => onAssignStaff(task)}
                sx={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: T.primaryDeep,
                  bgcolor: T.primaryTint,
                  border: `1px solid ${T.primary}`,
                  borderRadius: '8px',
                  px: 1.25,
                  py: 0.5,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Assigner
              </Box>
            ) : null}
          </FieldBox>
          {task.staffPhone ? (
            <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.5, mb: 1, fontFamily: '"Geist Mono", monospace' }}>
              {task.staffPhone}
            </Typography>
          ) : null}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mt: 1.25 }}>
            <Box>
              <SectionLabel>Priorité</SectionLabel>
              <FieldBox>
                <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
                  {task.emergency || 'Normal'}
                </Typography>
              </FieldBox>
            </Box>
            <Box>
              <SectionLabel>Source</SectionLabel>
              <FieldBox>
                <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
                  {task.source === 'orchestrator' ? 'Orchestration' : 'Manuel'}
                </Typography>
              </FieldBox>
            </Box>
          </Box>
        </CollapseBlock>

        <CollapseBlock title="Séjour & voyageur">
          <SectionLabel>Voyageur</SectionLabel>
          <FieldBox>
            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{task.guestName || '—'}</Typography>
          </FieldBox>
          <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.5, mb: 1, fontFamily: '"Geist Mono", monospace' }}>
            {task.guestPhone || '—'}
          </Typography>

          <SectionLabel>Logement & réservation</SectionLabel>
          <FieldBox>
            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{task.listingName || '—'}</Typography>
          </FieldBox>
          <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.5, mb: 1, fontFamily: '"Geist Mono", monospace' }}>
            {task.reservationNumber || '—'}
            {task.channelName ? ` · ${task.channelName}` : ''}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
            <Box>
              <SectionLabel>Check-in</SectionLabel>
              <FieldBox>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
                  {fmtDateShort(task.reservationCheckIn)}
                </Typography>
              </FieldBox>
            </Box>
            <Box>
              <SectionLabel>Check-out</SectionLabel>
              <FieldBox>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
                  {fmtDateShort(task.reservationCheckOut)}
                </Typography>
              </FieldBox>
            </Box>
          </Box>
        </CollapseBlock>

        {(form.requestNote || task.comment) && !isEditing ? (
          <CollapseBlock title="Notes">
            {form.requestNote ? (
              <Box sx={{ mb: task.comment ? 1.25 : 0 }}>
                <SectionLabel>Demande</SectionLabel>
                <Typography sx={{ fontSize: 13, color: T.text2, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {form.requestNote}
                </Typography>
              </Box>
            ) : null}
            {task.comment ? (
              <Box>
                <SectionLabel>Exécution</SectionLabel>
                <Typography sx={{ fontSize: 13, color: T.text2, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {task.comment}
                </Typography>
              </Box>
            ) : null}
          </CollapseBlock>
        ) : null}
      </Box>

      {/* Pied — comme calendrier */}
      <Box
        sx={{
          flexShrink: 0,
          px: 2.75,
          py: 1.75,
          borderTop: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.1,
        }}
      >
        {isEditing ? (
          <>
            <FooterBtn ghost onClick={() => setIsEditing(false)} disabled={saving}>
              Annuler
            </FooterBtn>
            <FooterBtn primary disabled={saving} onClick={() => void handleSave()}>
              {saving ? <CircularProgress size={18} color="inherit" /> : '💾 Enregistrer'}
            </FooterBtn>
          </>
        ) : (
          <>
            <FooterBtn ghost onClick={onClose}>
              Annuler
            </FooterBtn>
            <FooterBtn primary onClick={() => setIsEditing(true)}>
              ✏️ Modifier
            </FooterBtn>
          </>
        )}
      </Box>
    </Drawer>
  );
}
