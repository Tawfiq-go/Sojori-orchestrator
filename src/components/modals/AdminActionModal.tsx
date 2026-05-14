// ════════════════════════════════════════════════════════════════════
// Sojori — AdminActionModal 🔴 CRITIQUE
// Modal d'action admin sur timeline orchestration
// Types: Email · Task · Note · SMS · Call
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, TextField, Button, IconButton,
  ToggleButton, ToggleButtonGroup, MenuItem, FormControl,
  InputLabel, Select, Chip, Divider, Alert,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4c430', primaryTint: 'rgba(230,176,34,0.10)',
  ai: '#8b5cf6', success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', bg3: '#ebe7da', border: 'rgba(26,20,8,0.08)',
};

export type AdminActionType = 'email' | 'task' | 'note' | 'sms' | 'call';

export interface AdminActionResult {
  id: string;
  type: AdminActionType;
  reservationId: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface AdminActionModalProps {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  guestName?: string;
  defaultType?: AdminActionType;
  onSubmit?: (result: AdminActionResult) => Promise<void> | void;
}

const ACTION_TYPES: { value: AdminActionType; label: string; icon: string; color: string; desc: string }[] = [
  { value: 'email', label: 'Email',  icon: '📧', color: '#06b6d4', desc: 'Envoyer un email au voyageur' },
  { value: 'task',  label: 'Tâche',  icon: '✅', color: '#10b981', desc: 'Créer une tâche staff' },
  { value: 'note',  label: 'Note',   icon: '📝', color: '#f59e0b', desc: 'Ajouter une note interne' },
  { value: 'sms',   label: 'SMS',    icon: '💬', color: '#8b5cf6', desc: 'Envoyer un SMS' },
  { value: 'call',  label: 'Appel',  icon: '📞', color: '#e6b022', desc: 'Programmer un appel' },
];

export const AdminActionModal: React.FC<AdminActionModalProps> = ({
  open, onClose, reservationId, guestName, defaultType = 'email', onSubmit,
}) => {
  const [type, setType] = useState<AdminActionType>(defaultType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailPriority, setEmailPriority] = useState<'normal' | 'high'>('normal');

  // Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Note
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'general' | 'guest' | 'maintenance' | 'pricing'>('general');

  // SMS
  const [smsBody, setSmsBody] = useState('');

  // Call
  const [callAt, setCallAt] = useState('');
  const [callNotes, setCallNotes] = useState('');

  const reset = () => {
    setEmailSubject(''); setEmailBody(''); setEmailPriority('normal');
    setTaskTitle(''); setTaskAssignee(''); setTaskDueAt(''); setTaskPriority('medium');
    setNoteContent(''); setNoteCategory('general');
    setSmsBody('');
    setCallAt(''); setCallNotes('');
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const validate = (): string | null => {
    switch (type) {
      case 'email':
        if (!emailSubject.trim()) return 'Sujet requis';
        if (!emailBody.trim() || emailBody.length < 10) return 'Corps email trop court (min 10 caractères)';
        return null;
      case 'task':
        if (!taskTitle.trim()) return 'Titre tâche requis';
        if (!taskAssignee) return 'Assigné à requis';
        if (!taskDueAt) return 'Date échéance requise';
        return null;
      case 'note':
        if (!noteContent.trim() || noteContent.length < 5) return 'Note trop courte';
        return null;
      case 'sms':
        if (!smsBody.trim()) return 'Message SMS requis';
        if (smsBody.length > 160) return 'SMS trop long (max 160 caractères)';
        return null;
      case 'call':
        if (!callAt) return 'Date/heure appel requise';
        return null;
    }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> =
      type === 'email' ? { subject: emailSubject, body: emailBody, priority: emailPriority } :
      type === 'task'  ? { title: taskTitle, assignee: taskAssignee, dueAt: taskDueAt, priority: taskPriority } :
      type === 'note'  ? { content: noteContent, category: noteCategory } :
      type === 'sms'   ? { body: smsBody } :
      /* call */         { callAt, notes: callNotes };

    const result: AdminActionResult = {
      id: `act_${Date.now()}`,
      type, reservationId,
      createdAt: new Date().toISOString(),
      payload,
    };

    // MOCK save in localStorage
    await new Promise(r => setTimeout(r, 400));
    try {
      const stored = JSON.parse(localStorage.getItem('sojori.adminActions') || '[]');
      stored.push(result);
      localStorage.setItem('sojori.adminActions', JSON.stringify(stored));
      await onSubmit?.(result);
      reset();
      onClose();
    } catch (e) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const activeTypeMeta = ACTION_TYPES.find(t => t.value === type)!;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, bgcolor: T.bg1 } } }}>
      <DialogTitle sx={{ pb: 1.5, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: T.text }}>
              Action admin · {activeTypeMeta.label}
            </Typography>
            {guestName && (
              <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.5 }}>
                Réservation {reservationId} · {guestName}
              </Typography>
            )}
          </Stack>
          <IconButton size="small" onClick={handleClose}>✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Stack spacing={2.5}>
          {/* Type selector */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Type d'action
            </Typography>
            <ToggleButtonGroup
              value={type} exclusive size="small" fullWidth
              onChange={(_, v) => v && setType(v as AdminActionType)}
              sx={{
                '& .MuiToggleButton-root': {
                  py: 1.25, textTransform: 'none', fontWeight: 600,
                  borderColor: T.border, color: T.text2,
                  '&.Mui-selected': {
                    bgcolor: T.primaryTint, color: T.text,
                    borderColor: T.primary,
                    '&:hover': { bgcolor: T.primaryTint },
                  },
                },
              }}
            >
              {ACTION_TYPES.map(t => (
                <ToggleButton key={t.value} value={t.value}>
                  <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ fontSize: 18 }}>{t.icon}</Box>
                    <Box sx={{ fontSize: 11 }}>{t.label}</Box>
                  </Stack>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 1 }}>{activeTypeMeta.desc}</Typography>
          </Box>

          <Divider />

          {/* Dynamic fields */}
          {type === 'email' && (
            <Stack spacing={2}>
              <TextField label="Sujet" fullWidth size="small" value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)} />
              <TextField label="Corps du message" multiline minRows={6} fullWidth size="small"
                value={emailBody} onChange={e => setEmailBody(e.target.value)}
                helperText={`${emailBody.length} caractères`} />
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Priorité</InputLabel>
                <Select value={emailPriority} label="Priorité" onChange={e => setEmailPriority(e.target.value as 'normal' | 'high')}>
                  <MenuItem value="normal">Normale</MenuItem>
                  <MenuItem value="high">Haute ⚡</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          {type === 'task' && (
            <Stack spacing={2}>
              <TextField label="Titre de la tâche" fullWidth size="small"
                value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Assigné à</InputLabel>
                  <Select value={taskAssignee} label="Assigné à" onChange={e => setTaskAssignee(e.target.value)}>
                    <MenuItem value="cleaning-team">Équipe ménage</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="guest-relations">Relations voyageurs</MenuItem>
                    <MenuItem value="management">Direction</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Échéance" type="datetime-local" size="small" fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={taskDueAt} onChange={e => setTaskDueAt(e.target.value)} />
              </Stack>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Priorité</InputLabel>
                <Select value={taskPriority} label="Priorité" onChange={e => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}>
                  <MenuItem value="low">Basse</MenuItem>
                  <MenuItem value="medium">Moyenne</MenuItem>
                  <MenuItem value="high">Haute</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          {type === 'note' && (
            <Stack spacing={2}>
              <FormControl size="small" sx={{ width: 240 }}>
                <InputLabel>Catégorie</InputLabel>
                <Select value={noteCategory} label="Catégorie" onChange={e => setNoteCategory(e.target.value as typeof noteCategory)}>
                  <MenuItem value="general">Général</MenuItem>
                  <MenuItem value="guest">Voyageur</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="pricing">Tarification</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Note interne" multiline minRows={5} fullWidth size="small"
                value={noteContent} onChange={e => setNoteContent(e.target.value)} />
              <Alert severity="info" sx={{ fontSize: 12 }}>
                Visible uniquement par l'équipe Sojori, jamais partagée avec le voyageur.
              </Alert>
            </Stack>
          )}

          {type === 'sms' && (
            <Stack spacing={2}>
              <TextField label="Message SMS" multiline minRows={4} fullWidth size="small"
                value={smsBody} onChange={e => setSmsBody(e.target.value)}
                helperText={`${smsBody.length} / 160 caractères`}
                error={smsBody.length > 160} />
              <Stack direction="row" spacing={1}>
                <Chip size="small" label="Insérer {nom}" onClick={() => setSmsBody(s => s + '{guestName}')} sx={{ bgcolor: T.bg2 }} />
                <Chip size="small" label="Insérer {date}" onClick={() => setSmsBody(s => s + '{checkInDate}')} sx={{ bgcolor: T.bg2 }} />
                <Chip size="small" label="Insérer {code}" onClick={() => setSmsBody(s => s + '{accessCode}')} sx={{ bgcolor: T.bg2 }} />
              </Stack>
            </Stack>
          )}

          {type === 'call' && (
            <Stack spacing={2}>
              <TextField label="Date et heure" type="datetime-local" size="small" fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={callAt} onChange={e => setCallAt(e.target.value)} />
              <TextField label="Notes d'appel (optionnel)" multiline minRows={3} fullWidth size="small"
                value={callNotes} onChange={e => setCallNotes(e.target.value)} />
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ color: T.text2, textTransform: 'none' }}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={loading} variant="contained"
          sx={{
            textTransform: 'none', fontWeight: 700, px: 3,
            background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primarySoft} 100%)`,
            color: T.text,
            '&:hover': { background: `linear-gradient(135deg, ${T.primarySoft} 0%, ${T.primary} 100%)` },
          }}>
          {loading ? 'En cours…' : `Créer l'action ${activeTypeMeta.label}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminActionModal;
