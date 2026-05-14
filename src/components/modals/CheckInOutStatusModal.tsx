// ════════════════════════════════════════════════════════════════════
// Sojori — CheckInOutStatusModal 🟠 IMPORTANT
// Déclarer arrivée OU départ avec statut, notes, création tâche auto
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, TextField, Button, IconButton,
  FormControl, InputLabel, Select, MenuItem, Alert,
  Chip, Switch, FormControlLabel, Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4c430', primaryTint: 'rgba(230,176,34,0.10)',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

export type CheckMode = 'checkin' | 'checkout';
export type CheckStatus =
  | 'arrived' | 'no-show' | 'late-arrival' | 'early-arrival'
  | 'departed' | 'early-departure' | 'late-departure';

export interface CheckInOutResult {
  id: string; reservationId: string; mode: CheckMode;
  status: CheckStatus; effectiveAt: string; notes: string;
  createdTaskId: string | null; createdAt: string;
}

export interface CheckInOutStatusModalProps {
  open: boolean; onClose: () => void;
  reservationId: string; guestName?: string;
  scheduledAt?: string; mode: CheckMode;
  onSubmit?: (result: CheckInOutResult) => Promise<void> | void;
}

const STATUSES: Record<CheckMode, { value: CheckStatus; label: string; color: string; icon: string }[]> = {
  checkin: [
    { value: 'arrived',       label: 'Arrivé(e) à l\'heure', color: T.success, icon: '✅' },
    { value: 'early-arrival', label: 'Arrivée anticipée',     color: T.info,    icon: '⏪' },
    { value: 'late-arrival',  label: 'Arrivée en retard',     color: T.warning, icon: '⏰' },
    { value: 'no-show',       label: 'No-show',               color: T.error,   icon: '❌' },
  ],
  checkout: [
    { value: 'departed',         label: 'Départ à l\'heure', color: T.success, icon: '✅' },
    { value: 'early-departure',  label: 'Départ anticipé',    color: T.info,    icon: '⏪' },
    { value: 'late-departure',   label: 'Départ tardif',      color: T.warning, icon: '⏰' },
  ],
};

export const CheckInOutStatusModal: React.FC<CheckInOutStatusModalProps> = ({
  open, onClose, reservationId, guestName, scheduledAt, mode, onSubmit,
}) => {
  const [status, setStatus] = useState<CheckStatus>(STATUSES[mode][0].value);
  const [effectiveAt, setEffectiveAt] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [createTask, setCreateTask] = useState(true);
  const [taskType, setTaskType] = useState<'cleaning' | 'inspection' | 'maintenance'>(
    mode === 'checkout' ? 'cleaning' : 'inspection'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => { if (loading) return; setError(null); onClose(); };

  const handleSubmit = async () => {
    if (!effectiveAt) { setError('Date/heure effective requise'); return; }
    setError(null); setLoading(true);

    const result: CheckInOutResult = {
      id: `chk_${Date.now()}`, reservationId, mode, status, effectiveAt, notes,
      createdTaskId: createTask ? `task_${Date.now() + 1}` : null,
      createdAt: new Date().toISOString(),
    };

    await new Promise(r => setTimeout(r, 400));
    try {
      const stored = JSON.parse(localStorage.getItem('sojori.checkInOut') || '[]');
      stored.push(result);
      localStorage.setItem('sojori.checkInOut', JSON.stringify(stored));
      if (createTask) {
        const tasks = JSON.parse(localStorage.getItem('sojori.tasks') || '[]');
        tasks.push({
          id: result.createdTaskId, reservationId, type: taskType,
          title: `${taskType === 'cleaning' ? '🧹 Ménage' : taskType === 'inspection' ? '🔍 Inspection' : '🔧 Maintenance'} · ${guestName || reservationId}`,
          status: 'pending', createdAt: result.createdAt,
        });
        localStorage.setItem('sojori.tasks', JSON.stringify(tasks));
      }
      await onSubmit?.(result);
      onClose();
    } catch { setError('Erreur d\'enregistrement'); }
    finally { setLoading(false); }
  };

  const statusMeta = STATUSES[mode].find(s => s.value === status)!;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: T.bg1 } }}>
      <DialogTitle sx={{ pb: 1.5, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: T.text }}>
              {mode === 'checkin' ? '🛬 Déclarer l\'arrivée' : '🛫 Déclarer le départ'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.5 }}>
              {reservationId} {guestName && `· ${guestName}`}
              {scheduledAt && ` · prévu ${new Date(scheduledAt).toLocaleString('fr-FR')}`}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={handleClose}>✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Statut
            </Typography>
            <ToggleButtonGroup value={status} exclusive size="small" fullWidth
              onChange={(_, v) => v && setStatus(v as CheckStatus)}
              sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { py: 1, textTransform: 'none', fontWeight: 600, borderColor: T.border, color: T.text2, '&.Mui-selected': { bgcolor: T.primaryTint, color: T.text, borderColor: T.primary } } }}>
              {STATUSES[mode].map(s => (
                <ToggleButton key={s.value} value={s.value}>
                  <Box sx={{ fontSize: 16, mr: 0.75 }}>{s.icon}</Box>{s.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <TextField label={`Date / heure ${mode === 'checkin' ? "d'arrivée" : "de départ"}`}
            type="datetime-local" size="small" fullWidth InputLabelProps={{ shrink: true }}
            value={effectiveAt} onChange={e => setEffectiveAt(e.target.value)} />

          <TextField label="Notes (optionnel)" multiline minRows={3} fullWidth size="small"
            placeholder="Ex: remise de clés effectuée, état du logement OK…"
            value={notes} onChange={e => setNotes(e.target.value)} />

          <Divider />

          <Box>
            <FormControlLabel
              control={<Switch size="small" checked={createTask} onChange={(_, c) => setCreateTask(c)} />}
              label={<Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                Créer automatiquement une tâche {mode === 'checkout' ? 'de ménage' : 'd\'inspection'}
              </Typography>} />
            {createTask && (
              <FormControl size="small" sx={{ mt: 1.5, width: 240 }}>
                <InputLabel>Type de tâche</InputLabel>
                <Select value={taskType} label="Type de tâche" onChange={e => setTaskType(e.target.value as typeof taskType)}>
                  <MenuItem value="cleaning">🧹 Ménage</MenuItem>
                  <MenuItem value="inspection">🔍 Inspection</MenuItem>
                  <MenuItem value="maintenance">🔧 Maintenance</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, gap: 1 }}>
        <Chip size="small" sx={{ flex: 1, justifyContent: 'flex-start', bgcolor: `${statusMeta.color}20`, color: statusMeta.color, fontWeight: 700, fontSize: 11 }}
          label={`${statusMeta.icon} ${statusMeta.label}`} />
        <Button onClick={handleClose} disabled={loading} sx={{ color: T.text2, textTransform: 'none' }}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={loading} variant="contained"
          sx={{ textTransform: 'none', fontWeight: 700, px: 3,
            background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primarySoft} 100%)`, color: T.text,
            '&:hover': { background: `linear-gradient(135deg, ${T.primarySoft} 0%, ${T.primary} 100%)` } }}>
          {loading ? 'Enregistrement…' : 'Confirmer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CheckInOutStatusModal;
