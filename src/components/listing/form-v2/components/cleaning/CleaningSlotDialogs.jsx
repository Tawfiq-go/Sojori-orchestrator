import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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

export function AddTimeslotDialog({ open, onClose, onAdd, title = 'Ajouter un créneau' }) {
  const [form, setForm] = useState(defaultTimeslot);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1}>
            <TextField label="Heure début" type="number" size="small" fullWidth value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: Number(e.target.value) }))} sx={sxInput} slotProps={{ htmlInput: { min: 0, max: 23 } }} />
            <TextField label="Heure fin" type="number" size="small" fullWidth value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: Number(e.target.value) }))} sx={sxInput} slotProps={{ htmlInput: { min: 1, max: 24 } }} />
          </Stack>
          <FormControl size="small" fullWidth>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} sx={sxInput}>
              <MenuItem value="Normal">Normal</MenuItem>
              <MenuItem value="Early">Early</MenuItem>
              <MenuItem value="Late">Late</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Supplément (MAD)" type="number" size="small" value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))} sx={sxInput} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button variant="contained" onClick={() => { onAdd({ ...form }); onClose(); setForm(defaultTimeslot); }}
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
      {slot.price > 0 ? ` · +${slot.price} MAD` : ''}
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
