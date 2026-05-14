// ════════════════════════════════════════════════════════════════════
// Sojori — MessageComposeModal 🔴 CRITIQUE
// Composer WhatsApp / OTA / Email avec templates, variables, scheduling
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, TextField, Button, IconButton,
  ToggleButton, ToggleButtonGroup, MenuItem, FormControl,
  InputLabel, Select, Chip, Divider, Alert, Switch, FormControlLabel,
  List, ListItemButton, ListItemText, Paper,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4c430', primaryTint: 'rgba(230,176,34,0.10)',
  ai: '#8b5cf6', whatsapp: '#25D366', airbnb: '#FF5A5F', booking: '#003580',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', bg3: '#ebe7da', border: 'rgba(26,20,8,0.08)',
};

export type MessageChannel = 'whatsapp' | 'ota' | 'email';
export type OtaProvider = 'airbnb' | 'booking' | 'vrbo';

export interface MessageTemplate {
  id: string; name: string; channel: MessageChannel[]; subject?: string; body: string;
}

export interface MessageComposeResult {
  id: string;
  channel: MessageChannel;
  otaProvider?: OtaProvider;
  to: string;
  subject?: string;
  body: string;
  attachments: string[];
  scheduledAt: string | null;
  createdAt: string;
}

export interface MessageComposeModalProps {
  open: boolean;
  onClose: () => void;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  defaultChannel?: MessageChannel;
  templates?: MessageTemplate[];
  onSubmit?: (result: MessageComposeResult) => Promise<void> | void;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  { id: 'welcome', name: 'Bienvenue', channel: ['whatsapp', 'email'],
    subject: 'Bienvenue chez Sojori 🌟',
    body: 'Bonjour {guestName},\n\nMerci d\'avoir choisi Sojori pour votre séjour ! Votre arrivée est prévue le {checkInDate}.\n\nVotre code d\'accès : {accessCode}\n\nÀ très bientôt !' },
  { id: 'checkin-info', name: 'Infos check-in', channel: ['whatsapp', 'ota'],
    body: 'Bonjour {guestName}, voici les infos pour votre arrivée :\n\n📍 Adresse : {propertyAddress}\n🔑 Code : {accessCode}\n📞 Contact 24/7 : +33 6 12 34 56 78' },
  { id: 'review-request', name: 'Demande d\'avis', channel: ['whatsapp', 'email'],
    subject: 'Merci pour votre séjour ! 🙏',
    body: 'Bonjour {guestName},\n\nNous espérons que vous avez passé un excellent séjour ! Auriez-vous quelques minutes pour laisser un avis ?\n\nMerci infiniment.' },
  { id: 'invoice', name: 'Facture', channel: ['email'],
    subject: 'Votre facture Sojori — {reservationId}',
    body: 'Bonjour {guestName},\n\nVeuillez trouver ci-joint votre facture pour la réservation {reservationId}.\n\nMontant : {totalAmount}\n\nMerci de votre confiance.' },
];

const VARIABLES = [
  '{guestName}', '{checkInDate}', '{checkOutDate}', '{propertyAddress}',
  '{accessCode}', '{reservationId}', '{totalAmount}', '{wifiPassword}',
];

export const MessageComposeModal: React.FC<MessageComposeModalProps> = ({
  open, onClose, guestName, guestPhone, guestEmail,
  defaultChannel = 'whatsapp', templates = DEFAULT_TEMPLATES, onSubmit,
}) => {
  const [channel, setChannel] = useState<MessageChannel>(defaultChannel);
  const [otaProvider, setOtaProvider] = useState<OtaProvider>('airbnb');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelTemplates = useMemo(
    () => templates.filter(t => t.channel.includes(channel)),
    [templates, channel]
  );

  const recipient = channel === 'email' ? (guestEmail || 'guest@example.com')
                  : channel === 'whatsapp' ? (guestPhone || '+33...')
                  : `${otaProvider} · ${guestName || 'voyageur'}`;

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;
    setSelectedTemplate(tplId);
    if (tpl.subject) setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const insertVariable = (v: string) => setBody(b => b + ' ' + v);

  const renderPreview = (raw: string): string => {
    return raw
      .replace(/{guestName}/g, guestName || 'Sarah Johnson')
      .replace(/{checkInDate}/g, '15 juin 2026')
      .replace(/{checkOutDate}/g, '22 juin 2026')
      .replace(/{propertyAddress}/g, 'Riad El Fenn, 2 Derb Moulay Abdullah, Marrakech')
      .replace(/{accessCode}/g, '4729#')
      .replace(/{reservationId}/g, 'SOJ-2026-08A1')
      .replace(/{totalAmount}/g, '1 840 €')
      .replace(/{wifiPassword}/g, 'RiadElFenn2026');
  };

  const reset = () => {
    setSubject(''); setBody(''); setAttachments([]);
    setScheduled(false); setScheduledAt('');
    setSelectedTemplate(''); setShowPreview(false); setError(null);
  };

  const handleClose = () => { if (loading) return; reset(); onClose(); };

  const handleSubmit = async () => {
    if (channel === 'email' && !subject.trim()) { setError('Sujet requis pour l\'email'); return; }
    if (!body.trim() || body.length < 5) { setError('Message trop court'); return; }
    if (scheduled && !scheduledAt) { setError('Date d\'envoi programmée requise'); return; }
    setError(null); setLoading(true);

    const result: MessageComposeResult = {
      id: `msg_${Date.now()}`,
      channel,
      otaProvider: channel === 'ota' ? otaProvider : undefined,
      to: recipient,
      subject: channel === 'email' ? subject : undefined,
      body,
      attachments,
      scheduledAt: scheduled ? scheduledAt : null,
      createdAt: new Date().toISOString(),
    };

    await new Promise(r => setTimeout(r, 500));
    try {
      const stored = JSON.parse(localStorage.getItem('sojori.messages') || '[]');
      stored.push(result);
      localStorage.setItem('sojori.messages', JSON.stringify(stored));
      await onSubmit?.(result);
      reset(); onClose();
    } catch { setError('Erreur d\'envoi'); }
    finally { setLoading(false); }
  };

  const channelMeta = {
    whatsapp: { icon: '💬', label: 'WhatsApp', color: T.whatsapp },
    ota:      { icon: '🏨', label: 'OTA',      color: T.airbnb },
    email:    { icon: '📧', label: 'Email',    color: T.info },
  }[channel];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: T.bg1, minHeight: 600 } }}>
      <DialogTitle sx={{ pb: 1.5, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: T.text }}>
              Composer un message
            </Typography>
            <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.5 }}>
              Destinataire : {recipient}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={handleClose}>✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Stack spacing={2.5}>
          {/* Channel */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Canal d'envoi
            </Typography>
            <ToggleButtonGroup
              value={channel} exclusive size="small" fullWidth
              onChange={(_, v) => v && setChannel(v as MessageChannel)}
              sx={{
                '& .MuiToggleButton-root': {
                  py: 1.25, textTransform: 'none', fontWeight: 600,
                  borderColor: T.border, color: T.text2,
                  '&.Mui-selected': { bgcolor: T.primaryTint, color: T.text, borderColor: T.primary },
                },
              }}
            >
              <ToggleButton value="whatsapp">💬 WhatsApp</ToggleButton>
              <ToggleButton value="ota">🏨 OTA (Airbnb/Booking)</ToggleButton>
              <ToggleButton value="email">📧 Email</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {channel === 'ota' && (
            <FormControl size="small" sx={{ width: 240 }}>
              <InputLabel>Provider OTA</InputLabel>
              <Select value={otaProvider} label="Provider OTA" onChange={e => setOtaProvider(e.target.value as OtaProvider)}>
                <MenuItem value="airbnb">Airbnb</MenuItem>
                <MenuItem value="booking">Booking.com</MenuItem>
                <MenuItem value="vrbo">Vrbo</MenuItem>
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, gap: 2 }}>
            {/* Templates */}
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Templates
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 280, overflowY: 'auto' }}>
                <List dense disablePadding>
                  {channelTemplates.length === 0 && (
                    <Box sx={{ p: 2, fontSize: 12, color: T.text3, textAlign: 'center' }}>
                      Aucun template pour ce canal
                    </Box>
                  )}
                  {channelTemplates.map(t => (
                    <ListItemButton key={t.id}
                      selected={selectedTemplate === t.id}
                      onClick={() => applyTemplate(t.id)}
                      sx={{
                        borderBottom: `1px solid ${T.border}`,
                        '&.Mui-selected': { bgcolor: T.primaryTint, '&:hover': { bgcolor: T.primaryTint } },
                      }}>
                      <ListItemText
                        primary={<Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t.name}</Typography>}
                        secondary={<Typography sx={{ fontSize: 11, color: T.text3, mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.body.slice(0, 40)}…</Typography>}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            </Box>

            {/* Editor */}
            <Stack spacing={2}>
              {channel === 'email' && (
                <TextField label="Sujet" fullWidth size="small" value={subject}
                  onChange={e => setSubject(e.target.value)} />
              )}

              <Box>
                <TextField label="Message" multiline minRows={8} fullWidth size="small"
                  value={body} onChange={e => setBody(e.target.value)} />
                <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
                  {VARIABLES.map(v => (
                    <Chip key={v} size="small" label={v} onClick={() => insertVariable(v)}
                      sx={{ bgcolor: T.bg2, fontFamily: 'Geist Mono', fontSize: 11, '&:hover': { bgcolor: T.bg3 } }} />
                  ))}
                </Stack>
              </Box>

              {/* Attachments (mock) */}
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => setAttachments(a => [...a, `fichier-${a.length + 1}.pdf`])}
                  sx={{ textTransform: 'none', borderColor: T.border, color: T.text2 }}>
                  📎 Ajouter pièce jointe
                </Button>
                {attachments.map((a, i) => (
                  <Chip key={i} size="small" label={a} onDelete={() => setAttachments(arr => arr.filter((_, idx) => idx !== i))}
                    sx={{ bgcolor: T.bg2 }} />
                ))}
              </Stack>

              {/* Schedule */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <FormControlLabel
                  control={<Switch size="small" checked={scheduled} onChange={(_, c) => setScheduled(c)} />}
                  label={<Typography sx={{ fontSize: 13 }}>Programmer l'envoi</Typography>}
                />
                {scheduled && (
                  <TextField type="datetime-local" size="small" InputLabelProps={{ shrink: true }}
                    value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                )}
              </Stack>

              {/* Preview toggle */}
              <Button size="small" onClick={() => setShowPreview(p => !p)}
                sx={{ alignSelf: 'flex-start', textTransform: 'none', color: T.ai }}>
                {showPreview ? '↑ Masquer aperçu' : '↓ Afficher aperçu avec variables résolues'}
              </Button>

              {showPreview && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: T.bg2, borderColor: T.border }}>
                  {channel === 'email' && (
                    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Sujet : {renderPreview(subject || '(vide)')}</Typography>
                  )}
                  <Typography sx={{ fontSize: 13, color: T.text2, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {renderPreview(body) || '(message vide)'}
                  </Typography>
                </Paper>
              )}
            </Stack>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, gap: 1 }}>
        <Stack direction="row" sx={{ flex: 1 }} alignItems="center" spacing={1}>
          <Chip size="small" sx={{ bgcolor: channelMeta.color, color: '#fff', fontWeight: 700, fontSize: 11 }}
            label={`${channelMeta.icon} ${channelMeta.label}`} />
          {scheduled && scheduledAt && (
            <Typography sx={{ fontSize: 11, color: T.text3 }}>
              ⏰ Programmé : {new Date(scheduledAt).toLocaleString('fr-FR')}
            </Typography>
          )}
        </Stack>
        <Button onClick={handleClose} disabled={loading} sx={{ color: T.text2, textTransform: 'none' }}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={loading} variant="contained"
          sx={{
            textTransform: 'none', fontWeight: 700, px: 3,
            background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primarySoft} 100%)`,
            color: T.text,
            '&:hover': { background: `linear-gradient(135deg, ${T.primarySoft} 0%, ${T.primary} 100%)` },
          }}>
          {loading ? 'Envoi…' : scheduled ? 'Programmer' : 'Envoyer maintenant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageComposeModal;
