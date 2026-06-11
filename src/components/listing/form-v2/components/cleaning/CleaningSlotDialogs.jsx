import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { T, sxInput } from '../../tabs/_shared';

const defaultFrequency = { startDay: 1, endDay: 7, numberOfCleaning: 1 };
const defaultTimeslot = { start: 10, end: 12, type: 'Normal', price: 0, default: false };
const EMPTY_SLOTS = [];

/** Dev ou localStorage timeslot_debug=1 */
function logTimeslotDialog(event, data) {
  try {
    const on =
      import.meta.env.DEV || (typeof localStorage !== 'undefined' && localStorage.getItem('timeslot_debug') === '1');
    if (!on) return;
    if (data !== undefined) console.log(`[TimeslotDialog] ${event}`, data);
    else console.log(`[TimeslotDialog] ${event}`);
  } catch {
    /* ignore */
  }
}

function NumericStepper({ label, value, onChange, min = 0, max = 9999, suffix = '', format }) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : min;
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const display = format ? format(safe) : String(safe);
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {label ? (
        <Typography
          component="label"
          sx={{
            display: 'block',
            fontSize: 10.5,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 0.5,
          }}
        >
          {label}
        </Typography>
      ) : null}
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          border: `1px solid ${T.border}`,
          borderRadius: 1,
          bgcolor: T.bg1,
          width: '100%',
        }}
      >
        <IconButton
          type="button"
          size="small"
          aria-label={`Diminuer ${label || 'valeur'}`}
          onClick={(e) => {
            e.stopPropagation();
            const next = clamp(safe - 1);
            logTimeslotDialog('stepper.dec', { label, from: safe, to: next });
            onChange(next);
          }}
          disabled={safe <= min}
          sx={{ width: 36, height: 36, color: T.text2, borderRadius: '8px 0 0 8px' }}
        >
          −
        </IconButton>
        <Box
          sx={{
            flex: 1,
            textAlign: 'center',
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
            fontSize: 15,
            color: T.text,
            py: 0.75,
          }}
        >
          {display}
          {suffix}
        </Box>
        <IconButton
          type="button"
          size="small"
          aria-label={`Augmenter ${label || 'valeur'}`}
          onClick={(e) => {
            e.stopPropagation();
            const next = clamp(safe + 1);
            logTimeslotDialog('stepper.inc', { label, from: safe, to: next });
            onChange(next);
          }}
          disabled={safe >= max}
          sx={{ width: 36, height: 36, color: T.text2, borderRadius: '0 8px 8px 0' }}
        >
          +
        </IconButton>
      </Stack>
    </Box>
  );
}

function MadPriceInput({ label, value, onChange }) {
  const committed = Number(value);
  const safe = Number.isFinite(committed) && committed >= 0 ? committed : 0;
  const [draft, setDraft] = React.useState(String(safe));
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) setDraft(String(safe));
  }, [safe]);

  const commit = (raw) => {
    const trimmed = String(raw).trim();
    const next = trimmed === '' ? 0 : Math.max(0, Math.min(999999, Math.round(Number(trimmed) || 0)));
    logTimeslotDialog('price.change', { raw: trimmed, price: next });
    onChange(next);
    setDraft(String(next));
  };

  return (
    <Box>
      <Typography
        component="label"
        sx={{
          display: 'block',
          fontSize: 10.5,
          color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <TextField
        type="text"
        inputMode="numeric"
        size="small"
        fullWidth
        value={draft}
        placeholder="0"
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          commit(draft);
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d]/g, '');
          setDraft(next);
          if (next === '') return;
          const num = Math.round(Number(next));
          if (Number.isFinite(num)) {
            onChange(Math.max(0, Math.min(999999, num)));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
          }
        }}
        sx={sxInput}
      />
      <Typography sx={{ fontSize: 10.5, color: T.text4, mt: 0.5 }}>
        Saisie libre · ex. 200 MAD
      </Typography>
    </Box>
  );
}

function HourStepper({ label, value, onChange, min, max }) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : min;
  return (
    <NumericStepper
      label={label}
      value={safe}
      min={min}
      max={max}
      suffix=":00"
      format={(h) => String(h).padStart(2, '0')}
      onChange={(h) => {
        logTimeslotDialog('hour.change', { label, hour: h });
        onChange(h);
      }}
    />
  );
}

function proposeIncludedSlot(existing = []) {
  if (!existing.length) return { start: 9, end: 11, price: 0, default: true };
  const last = existing[existing.length - 1];
  const start = last.end >= 24 ? 9 : last.end;
  const end = Math.min(24, start + 2);
  const hasDefault = existing.some((s) => s.default);
  return {
    start,
    end: end > start ? end : Math.min(24, start + 2),
    price: 0,
    default: !hasDefault,
  };
}

export function AddFrequencyDialog({ open, onClose, onAdd }) {
  const [form, setForm] = useState(defaultFrequency);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Ajouter un palier de fréquence</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField label="Jour début" type="number" size="small" value={form.startDay}
            onChange={(e) => setForm((f) => ({ ...f, startDay: Number(e.target.value) || 1 }))} sx={sxInput} />
          <TextField label="Jour fin" type="number" size="small" value={form.endDay}
            onChange={(e) => setForm((f) => ({ ...f, endDay: Number(e.target.value) || 1 }))} sx={sxInput} />
          <TextField label="Nombre de ménages" type="number" size="small" value={form.numberOfCleaning}
            onChange={(e) => setForm((f) => ({ ...f, numberOfCleaning: Number(e.target.value) || 0 }))} sx={sxInput} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button variant="contained" onClick={() => { onAdd(form); onClose(); setForm(defaultFrequency); }}
          sx={{ textTransform: 'none', bgcolor: T.primary, '&:hover': { bgcolor: T.primaryDeep } }}>
          Ajouter
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AddTimeslotDialog({
  open,
  onClose,
  onAdd,
  title = 'Ajouter un créneau',
  includedMode = false,
  existingSlots = EMPTY_SLOTS,
}) {
  const initial = includedMode ? proposeIncludedSlot(existingSlots) : defaultTimeslot;
  const [form, setForm] = useState(initial);
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      const next = includedMode ? proposeIncludedSlot(existingSlots) : { ...defaultTimeslot };
      logTimeslotDialog('open', { title, includedMode, form: next });
      setForm(next);
    }
    if (!open && wasOpenRef.current) {
      logTimeslotDialog('close', { title });
    }
    wasOpenRef.current = open;
  }, [open, includedMode, existingSlots, title]);

  const setFormLogged = (updater, reason) => {
    setForm((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      logTimeslotDialog('form.update', { reason, prev, next });
      return next;
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1}>
            <HourStepper
              label="Heure début"
              value={form.start}
              min={0}
              max={23}
              onChange={(start) =>
                setFormLogged(
                  (f) => ({ ...f, start, end: Math.max(start + 1, f.end) }),
                  'start',
                )
              }
            />
            <HourStepper
              label="Heure fin"
              value={form.end}
              min={1}
              max={24}
              onChange={(end) =>
                setFormLogged(
                  (f) => ({ ...f, end: Math.max(end, f.start + 1) }),
                  'end',
                )
              }
            />
          </Stack>
          {!includedMode && (
            <>
              <FormControl size="small" fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={form.type}
                  onChange={(e) => {
                    logTimeslotDialog('type.change', { type: e.target.value });
                    setFormLogged((f) => ({ ...f, type: e.target.value }), 'type');
                  }}
                  sx={sxInput}
                >
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Early">Early</MenuItem>
                  <MenuItem value="Late">Late</MenuItem>
                </Select>
              </FormControl>
              <MadPriceInput
                label="Supplément (MAD)"
                value={form.price}
                onChange={(price) => setFormLogged((f) => ({ ...f, price }), 'price')}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button
          variant="contained"
          onClick={() => {
            const payload = includedMode
              ? { start: form.start, end: form.end, price: 0, default: form.default === true }
              : { ...form };
            logTimeslotDialog('submit', { title, payload });
            onAdd(payload);
            onClose();
            setForm(includedMode ? proposeIncludedSlot(existingSlots) : { ...defaultTimeslot });
          }}
          sx={{ textTransform: 'none', bgcolor: T.primary, '&:hover': { bgcolor: T.primaryDeep } }}>
          Ajouter
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function TimeslotChip({ slot, onRemove }) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1.375, py: 0.75, border: `1px solid ${slot.default ? T.primary : T.border}`,
      bgcolor: slot.default ? T.primaryTint : T.bg1, color: slot.default ? T.primaryDeep : T.text2,
      borderRadius: 1, fontSize: 11.5, fontWeight: 600, fontFamily: '"Geist Mono", monospace',
    }}>
      {pad(slot.start)}:00 → {pad(slot.end)}:00
      {slot.type && slot.type !== 'Normal' ? ` · ${slot.type}` : ''}
      {Number(slot.price) > 0 ? ` · +${slot.price} MAD` : ''}
      {slot.default ? ' · défaut' : ''}
      {onRemove && (
        <Typography component="button" onClick={onRemove} sx={{ all: 'unset', cursor: 'pointer', ml: 0.5, fontSize: 14, color: T.text4, lineHeight: 1 }}>
          ×
        </Typography>
      )}
    </Box>
  );
}

export function DashedAddButton({ label, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        px: 1.375,
        py: 0.75,
        border: `1.5px dashed ${T.borderStrong}`,
        borderRadius: 1.125,
        color: T.text3,
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: '-0.005em',
        fontFamily: 'inherit',
        '&:hover': { borderColor: T.primary, color: T.primaryDeep, bgcolor: T.primaryTint },
      }}
    >
      {label}
    </Box>
  );
}
