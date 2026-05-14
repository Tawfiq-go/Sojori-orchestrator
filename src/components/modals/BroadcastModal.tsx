// ════════════════════════════════════════════════════════════════════
// Sojori — BroadcastModal (envoi WhatsApp à plusieurs staff)
// 2 colonnes : sélection staff (gauche) + composition message (droite)
// Material-UI v9 · TypeScript · Aurora Soft Light · MOCK data
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Button,
  Box, Stack, TextField, Checkbox, Avatar, Chip, Typography, Divider,
  useTheme, useMediaQuery, Tooltip,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e', primaryDeep: '#b8881a',
  whatsapp: '#25D366',
  ai: '#8b5cf6', success: '#10b981',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170', text4: '#b8b09b',
  bg1: '#fff', bg2: '#f5f3ec', bg3: '#ebe7da', border: 'rgba(26,20,8,0.08)',
};

const AVA = (initials: string) => {
  const colors: Record<string, string> = {
    Y: '#ec4899', H: '#06b6d4', M: '#d97706', F: '#16a34a', K: '#8b5cf6',
    A: '#f59e0b', S: '#ef4444', L: '#10b981',
  };
  return colors[initials[0]] || '#8a8170';
};

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  online?: boolean;
}

const MOCK_STAFF: StaffMember[] = [
  { id: '1', name: 'Yasmine K.', initials: 'YK', role: 'Chef ménage', online: true },
  { id: '2', name: 'Hassan M.',  initials: 'HM', role: 'Concierge',   online: true },
  { id: '3', name: 'Mehdi R.',   initials: 'MR', role: 'Maintenance', online: true },
  { id: '4', name: 'Fatima M.',  initials: 'FM', role: 'Ménage senior', online: true },
  { id: '5', name: 'Karim E.',   initials: 'KE', role: 'Concierge night', online: false },
  { id: '6', name: 'Sofia C.',   initials: 'SC', role: 'Operations',  online: true },
  { id: '7', name: 'Linda B.',   initials: 'LB', role: 'Ménage',      online: false },
  { id: '8', name: 'Ahmed K.',   initials: 'AK', role: 'Maintenance', online: true },
];

const TEMPLATES: { key: string; label: string; body: string }[] = [
  { key: 'urgent', label: '🚨 Urgence',
    body: 'Bonjour, urgence à signaler. Merci de me contacter immédiatement par WhatsApp.\n— Sojori Ops' },
  { key: 'meeting', label: '👥 Réunion',
    body: 'Bonjour, réunion équipe demain à 09h00 au bureau. Présence souhaitée.\nMerci de confirmer.' },
  { key: 'rappel', label: '⏰ Rappel tâche',
    body: 'Bonjour, petit rappel pour la tâche prévue aujourd\'hui. N\'oubliez pas de marquer la complétion sur WhatsApp.' },
  { key: 'meteo', label: '⛅ Info météo',
    body: 'Bonjour, alerte météo demain (pluie/orage). Pensez à équiper les logements en conséquence.' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  staff?: StaffMember[];
  onSend?: (recipients: string[], message: string) => void;
}

export default function BroadcastModal({ open, onClose, staff = MOCK_STAFF, onSend }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return staff;
    return staff.filter(s => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  }, [search, staff]);

  const toggleAll = () => {
    setSelected(selected.length === staff.length ? [] : staff.map(s => s.id));
  };
  const toggleOne = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const send = () => {
    if (selected.length && message.trim()) {
      onSend?.(selected, message.trim());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2.5, minHeight: 560 } }}
    >
      <DialogTitle sx={{ p: 0, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 1.5,
                bgcolor: T.whatsapp, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>💬</Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.3px' }}>Broadcast WhatsApp</Typography>
                <Typography variant="body2" sx={{ color: T.text3 }}>
                  {selected.length > 0 ? `${selected.length} destinataire(s) sélectionné(s)` : 'Sélectionnez les destinataires'}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: { md: 520 } }}>
        {/* ── Sélection staff (gauche) ── */}
        <Box sx={{ flex: 1, borderRight: { md: `1px solid ${T.border}` }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
            <TextField fullWidth size="small" placeholder="🔍 Rechercher staff…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
              <Button size="small" onClick={toggleAll} sx={{ textTransform: 'none', fontWeight: 600 }}>
                {selected.length === staff.length ? 'Tout désélectionner' : 'Sélectionner tout'}
              </Button>
              <Stack direction="row" spacing={1}>
                <Chip size="small" label="🟢 Online uniquement" clickable
                  onClick={() => setSelected(staff.filter(s => s.online).map(s => s.id))} />
              </Stack>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(s => {
              const isOn = selected.includes(s.id);
              return (
                <Stack key={s.id} direction="row" alignItems="center" spacing={1.5}
                  onClick={() => toggleOne(s.id)}
                  sx={{
                    px: 2, py: 1.5, cursor: 'pointer',
                    borderBottom: `1px solid ${T.border}`,
                    bgcolor: isOn ? 'rgba(230,176,34,0.06)' : 'transparent',
                    '&:hover': { bgcolor: isOn ? 'rgba(230,176,34,0.10)' : T.bg2 },
                  }}>
                  <Checkbox size="small" checked={isOn} sx={{ p: 0 }} />
                  <Box sx={{ position: 'relative' }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: AVA(s.initials), color: '#fff', fontSize: 13, fontWeight: 700 }}>
                      {s.initials}
                    </Avatar>
                    {s.online && (
                      <Box sx={{
                        position: 'absolute', bottom: -1, right: -1, width: 11, height: 11,
                        borderRadius: '50%', bgcolor: T.success, border: `2px solid ${T.bg1}`,
                      }} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.2 }}>{s.name}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: T.text3 }}>{s.role}</Typography>
                  </Box>
                </Stack>
              );
            })}
          </Box>
        </Box>

        {/* ── Composition message (droite) ── */}
        <Box sx={{ flex: 1.2, display: 'flex', flexDirection: 'column', bgcolor: T.bg2 }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
              Templates rapides
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {TEMPLATES.map(t => (
                <Chip key={t.key} label={t.label} size="small" clickable onClick={() => setMessage(t.body)} />
              ))}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
              Message ({message.length} caractères)
            </Typography>
            <TextField
              multiline rows={10} fullWidth
              placeholder="Écrivez votre message ici… (markdown WhatsApp supporté: *gras*, _italique_)"
              value={message} onChange={(e) => setMessage(e.target.value)}
              sx={{ flex: 1, bgcolor: T.bg1, '& .MuiOutlinedInput-root': { alignItems: 'flex-start' } }}
            />

            {/* Preview */}
            {message && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
                  Aperçu WhatsApp
                </Typography>
                <Box sx={{
                  bgcolor: '#DCF8C6', color: T.text,
                  p: 1.5, borderRadius: 1.5, maxWidth: 320,
                  border: `1px solid ${T.border}`,
                  fontSize: 13, whiteSpace: 'pre-wrap',
                  position: 'relative',
                }}>
                  {message}
                  <Box sx={{ fontSize: 10, color: T.text3, mt: 0.5, textAlign: 'right' }}>
                    Maintenant ✓✓
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          {selected.length > 0 && message.trim() && (
            <Typography variant="caption" sx={{ color: T.text3 }}>
              💸 Coût estimé : {selected.length} × 0.05 € = <strong>{(selected.length * 0.05).toFixed(2)} €</strong>
            </Typography>
          )}
        </Box>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: T.text2 }}>Annuler</Button>
        <Button
          onClick={send}
          disabled={selected.length === 0 || !message.trim()}
          variant="contained"
          startIcon={<span>📤</span>}
          sx={{
            textTransform: 'none', fontWeight: 600,
            background: T.whatsapp, color: '#fff',
            '&:hover': { background: '#1ea854' },
            '&.Mui-disabled': { background: T.bg3, color: T.text4 },
          }}
        >
          Envoyer {selected.length > 0 && `(${selected.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
