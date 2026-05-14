// ════════════════════════════════════════════════════════════════════
// Sojori — EditPlanningModal
// Édition planning horaires d'UN jour précis (multi-timings + copie vers autres jours)
// Material-UI v9 · TypeScript · Aurora Soft Light · MOCK data
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Button,
  Box, Stack, TextField, Chip, FormControlLabel, Switch, Checkbox,
  Typography, useTheme, useMediaQuery, Alert,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
  error: '#ef4444', success: '#10b981',
};

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export interface Timing { id: string; start: string; end: string; }
export interface DayPlanning {
  day: string;
  present: boolean;
  timings: Timing[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialDay?: DayPlanning;
  onSave?: (day: DayPlanning, applyTo: { days: string[]; allWeeks: boolean }) => void;
}

const DEFAULT_DAY: DayPlanning = {
  day: 'Lundi', present: true,
  timings: [{ id: '1', start: '09:00', end: '13:00' }, { id: '2', start: '14:00', end: '18:00' }],
};

export default function EditPlanningModal({ open, onClose, initialDay = DEFAULT_DAY, onSave }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [day, setDay] = useState<DayPlanning>(initialDay);
  const [copyTo, setCopyTo] = useState<string[]>([]);
  const [allWeeks, setAllWeeks] = useState(false);

  // Validation : pas de chevauchement & end > start
  const errors = useMemo(() => {
    const errs: string[] = [];
    day.timings.forEach((t, i) => {
      if (t.end <= t.start) errs.push(`Timing #${i + 1} : fin doit être après début`);
      day.timings.forEach((other, j) => {
        if (i < j && t.start < other.end && other.start < t.end) {
          errs.push(`Chevauchement entre timing #${i + 1} et #${j + 1}`);
        }
      });
    });
    return errs;
  }, [day.timings]);

  const addTiming = () => {
    const last = day.timings[day.timings.length - 1];
    const start = last ? last.end : '09:00';
    setDay({ ...day, timings: [...day.timings, { id: String(Date.now()), start, end: '18:00' }] });
  };
  const updateTiming = (id: string, patch: Partial<Timing>) => {
    setDay({ ...day, timings: day.timings.map(t => t.id === id ? { ...t, ...patch } : t) });
  };
  const removeTiming = (id: string) => {
    setDay({ ...day, timings: day.timings.filter(t => t.id !== id) });
  };
  const totalHours = day.timings.reduce((sum, t) => {
    const [sh, sm] = t.start.split(':').map(Number);
    const [eh, em] = t.end.split(':').map(Number);
    return sum + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
  }, 0);

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2.5 } }}
    >
      <DialogTitle sx={{ p: 0, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Modifier le planning</Typography>
            <Typography variant="body2" sx={{ color: T.text3, mt: 0.5 }}>{day.day}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: T.bg2 }}>
        <Stack spacing={2.5}>
          {/* Présence */}
          <Box sx={{ p: 2, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <FormControlLabel
              control={<Switch checked={day.present} onChange={(_, c) => setDay({ ...day, present: c })} />}
              label={
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{day.present ? 'Présent ce jour' : 'Absent ce jour'}</Typography>
                  <Typography variant="caption" sx={{ color: T.text3 }}>
                    Désactivez pour marquer ce jour comme jour off (le staff n'apparaîtra pas dans les assignations).
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* Timings */}
          {day.present && (
            <Box sx={{ p: 2.5, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700 }}>Créneaux horaires</Typography>
                <Chip size="small" label={`${totalHours.toFixed(1)}h total`} color="default" />
              </Stack>
              <Stack spacing={1.5}>
                {day.timings.map((t, idx) => (
                  <Stack key={t.id} direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 28, height: 28, borderRadius: '50%', bgcolor: T.bg2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: T.text2,
                    }}>{idx + 1}</Box>
                    <TextField size="small" type="time" label="Début" InputLabelProps={{ shrink: true }}
                      value={t.start} onChange={(e) => updateTiming(t.id, { start: e.target.value })} />
                    <Typography sx={{ color: T.text3 }}>→</Typography>
                    <TextField size="small" type="time" label="Fin" InputLabelProps={{ shrink: true }}
                      value={t.end} onChange={(e) => updateTiming(t.id, { end: e.target.value })} />
                    <IconButton size="small" onClick={() => removeTiming(t.id)}
                      disabled={day.timings.length === 1} sx={{ color: T.error }}>🗑️</IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button onClick={addTiming} variant="outlined" sx={{ mt: 2, textTransform: 'none' }}>
                + Ajouter un créneau
              </Button>
              {errors.length > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errors.map((e, i) => <Typography key={i} variant="caption" display="block">{e}</Typography>)}
                </Alert>
              )}
            </Box>
          )}

          {/* Copier vers autres jours */}
          <Box sx={{ p: 2.5, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Copier ce planning vers d'autres jours</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {DAYS.filter(d => d !== day.day).map(d => (
                <Chip key={d} label={d} clickable
                  onClick={() => setCopyTo(copyTo.includes(d) ? copyTo.filter(x => x !== d) : [...copyTo, d])}
                  color={copyTo.includes(d) ? 'primary' : 'default'}
                  variant={copyTo.includes(d) ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setCopyTo(['Mardi', 'Mercredi', 'Jeudi', 'Vendredi'])}>
                Semaine (Lun-Ven)
              </Button>
              <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setCopyTo(['Samedi', 'Dimanche'])}>
                Week-end
              </Button>
              <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setCopyTo([])}>
                Effacer
              </Button>
            </Stack>
            <FormControlLabel sx={{ mt: 1.5 }}
              control={<Checkbox checked={allWeeks} onChange={(_, c) => setAllWeeks(c)} />}
              label={<Typography variant="body2">Appliquer à toutes les semaines (planning récurrent)</Typography>}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: T.text2 }}>Annuler</Button>
        <Button
          onClick={() => onSave?.(day, { days: copyTo, allWeeks })}
          disabled={errors.length > 0}
          variant="contained"
          sx={{
            textTransform: 'none', fontWeight: 600,
            background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)`,
            color: T.text, boxShadow: `0 4px 12px rgba(230,176,34,0.30)`,
            '&:hover': { background: `linear-gradient(180deg, ${T.primarySoft} 0%, ${T.primary} 100%)` },
          }}
        >
          {copyTo.length > 0 ? `Appliquer (${copyTo.length + 1} jours)` : 'Sauvegarder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
