import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  Popover,
  Select,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import moment from 'moment';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import { blurActiveElement } from '../../utils/domFocus';
import type { TaskListItem } from '../../types/tasks.types';

const T = {
  primaryDeep: '#876119',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.10)',
};

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6);

const DATE_EDITABLE_TYPES = new Set([
  'cleaning_free',
  'cleaning_paid',
  'concierge',
  'transport',
  'groceries',
  'support',
]);

function taskTypeKey(task: TaskListItem): string {
  return String(task.subType || task.type || '').toLowerCase();
}

function hourFromTask(task: TaskListItem): number {
  const raw = task.plannedTime || task.scheduledAt || task.startDate;
  if (!raw) return 10;
  if (typeof raw === 'string' && raw.includes('T')) {
    const m = raw.match(/T(\d{2}):/);
    if (m) return Number(m[1]);
  }
  const hm = String(raw).match(/^(\d{1,2}):/);
  if (hm) return Number(hm[1]);
  const d = new Date(String(raw));
  if (!Number.isNaN(d.getTime())) return d.getUTCHours();
  return 10;
}

function dayFromTask(task: TaskListItem): string {
  const iso = task.startDate || task.reservationCheckIn;
  if (!iso) return moment().format('YYYY-MM-DD');
  return moment(iso).format('YYYY-MM-DD');
}

type Props = {
  task: TaskListItem;
  dateLabel: string;
  timeLabel?: string;
  onUpdated?: (task: TaskListItem) => void;
};

/** Créneau éditable (ménage, conciergerie, etc.) — force-slot admin = même chaîne que WhatsApp. */
export function TaskGenericSlotEditor({ task, dateLabel, timeLabel, onUpdated }: Props) {
  const reservationId = task.reservationId ? String(task.reservationId) : '';
  const taskId = String(task._id || '');
  const typ = taskTypeKey(task);
  const canEditDate = DATE_EDITABLE_TYPES.has(typ);

  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pickHour, setPickHour] = useState(hourFromTask(task));
  const [pickDate, setPickDate] = useState(dayFromTask(task));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPickHour(hourFromTask(task));
    setPickDate(dayFromTask(task));
  }, [task._id, task.plannedTime, task.scheduledAt, task.startDate]);

  const close = () => {
    blurActiveElement();
    setAnchor(null);
  };

  const runSave = async () => {
    if (!reservationId || !taskId) return;
    setBusy(true);
    try {
      const time = `${String(pickHour).padStart(2, '0')}:00`;
      const res = await fulltaskApi.forcePlanGuestSlot(reservationId, taskId, time, {
        date: canEditDate ? pickDate : undefined,
      });
      if (res?.success === false) throw new Error(res?.error || 'Échec');
      toast.success('Créneau mis à jour');
      close();
      onUpdated?.({
        ...task,
        plannedTime: time,
        scheduledAt: time,
        startDate: canEditDate ? `${pickDate}T${time}:00.000Z` : task.startDate,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const linkSx = {
    fontFamily: '"Geist Mono", monospace',
    fontSize: 11,
    fontWeight: 600,
    cursor: reservationId && taskId ? 'pointer' : 'default',
    borderRadius: 0.25,
    px: 0.15,
    lineHeight: 1.3,
    color: T.primaryDeep,
    textDecoration: 'underline',
    textDecorationStyle: 'dotted' as const,
    '&:hover': reservationId && taskId ? { bgcolor: 'rgba(184,133,26,0.08)' } : {},
  };

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, mb: 0.25 }}>{dateLabel}</Typography>
      <Box
        component="span"
        title="Modifier le créneau"
        onClick={(e) => {
          if (!reservationId || !taskId) return;
          setAnchor(e.currentTarget);
        }}
        sx={linkSx}
      >
        {timeLabel || `${pickHour}h`}
      </Box>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 1.25, minWidth: 180, border: `1px solid ${T.border}` } } }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, mb: 0.75, textTransform: 'uppercase' }}>
          Modifier créneau
        </Typography>
        <Stack spacing={1}>
          {canEditDate ? (
            <TextField
              type="date"
              size="small"
              label="Date"
              value={pickDate}
              onChange={(e) => setPickDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& input': { fontSize: 12 } }}
            />
          ) : null}
          <FormControl size="small" fullWidth>
            <Select
              value={pickHour}
              onChange={(e) => setPickHour(Number(e.target.value))}
              sx={{ fontSize: 12, fontFamily: '"Geist Mono", monospace' }}
            >
              {HOUR_OPTIONS.map((h) => (
                <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>
                  {h}h
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            fullWidth
            disabled={busy}
            onClick={() => void runSave()}
            sx={{ fontSize: 11, textTransform: 'none', fontWeight: 700 }}
          >
            {busy ? '…' : 'Enregistrer'}
          </Button>
        </Stack>
      </Popover>
    </Box>
  );
}
