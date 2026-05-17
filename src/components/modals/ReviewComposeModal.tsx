// ════════════════════════════════════════════════════════════════════
// Sojori — ReviewComposeModal 🟡 UTILE
// Écrire avis pour guest : rating global + 4 categories + commentaires
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, TextField, Button, IconButton, Rating,
  ToggleButton, ToggleButtonGroup, Alert, Chip, Divider,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4c430', primaryTint: 'rgba(230,176,34,0.10)',
  success: '#10b981', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

export interface ReviewComposeResult {
  id: string; reservationId: string; guestId: string;
  overallRating: number;
  ratings: { communication: number; cleanliness: number; respect: number; recommendation: number };
  publicComment: string;
  privateNotes: string;
  recommend: boolean | null;
  createdAt: string;
}

export interface ReviewComposeModalProps {
  open: boolean; onClose: () => void;
  reservationId: string; guestId: string; guestName?: string;
  onSubmit?: (result: ReviewComposeResult) => Promise<void> | void;
}

const TEMPLATES = [
  { label: '⭐ Excellent voyageur', text: '{guest} a été un voyageur exemplaire ! Communication parfaite, logement laissé impeccable et respect des règles. Recommandé sans hésitation.' },
  { label: '👍 Bon voyageur',       text: 'Séjour sans problème. {guest} a respecté les règles et communiqué clairement. À recommander.' },
  { label: '⚠️ Mitigé',             text: 'Séjour correct mais quelques points d\'attention : ...' },
];

const CATEGORIES: { key: 'communication' | 'cleanliness' | 'respect' | 'recommendation'; label: string; icon: string }[] = [
  { key: 'communication',  label: 'Communication',     icon: '💬' },
  { key: 'cleanliness',    label: 'Propreté',          icon: '✨' },
  { key: 'respect',        label: 'Respect des règles', icon: '🤝' },
  { key: 'recommendation', label: 'Je recommande',     icon: '⭐' },
];

export const ReviewComposeModal: React.FC<ReviewComposeModalProps> = ({
  open, onClose, reservationId, guestId, guestName, onSubmit,
}) => {
  const [overall, setOverall] = useState<number | null>(5);
  const [ratings, setRatings] = useState({ communication: 5, cleanliness: 5, respect: 5, recommendation: 5 });
  const [comment, setComment] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [recommend, setRecommend] = useState<boolean | null>(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (loading) return;
    setOverall(5); setRatings({ communication: 5, cleanliness: 5, respect: 5, recommendation: 5 });
    setComment(''); setPrivateNotes(''); setRecommend(true); setError(null);
    onClose();
  };

  const applyTemplate = (text: string) => {
    setComment(text.replace(/\{guest\}/g, guestName || 'Le voyageur'));
  };

  const handleSubmit = async () => {
    if (!overall || overall < 1) { setError('Note globale requise'); return; }
    if (comment.trim().length < 50) { setError('Commentaire public trop court (min 50 caractères)'); return; }
    if (recommend === null) { setError('Indiquer si vous recommandez le voyageur'); return; }
    setError(null); setLoading(true);

    const result: ReviewComposeResult = {
      id: `rev_${Date.now()}`, reservationId, guestId,
      overallRating: overall, ratings, publicComment: comment.trim(),
      privateNotes: privateNotes.trim(), recommend,
      createdAt: new Date().toISOString(),
    };

    await new Promise(r => setTimeout(r, 500));
    try {
      const stored = JSON.parse(localStorage.getItem('sojori.reviews') || '[]');
      stored.push(result);
      localStorage.setItem('sojori.reviews', JSON.stringify(stored));
      await onSubmit?.(result);
      handleClose();
    } catch { setError('Erreur d\'enregistrement'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, bgcolor: T.bg1 } } }}>
      <DialogTitle sx={{ pb: 1.5, borderBottom: `1px solid ${T.border}` }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: T.text }}>
              ⭐ Écrire un avis
            </Typography>
            <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.5 }}>
              {reservationId} {guestName && `· pour ${guestName}`}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={handleClose}>✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>
          {/* Global rating */}
          <Box sx={{ textAlign: 'center', py: 1.5, bgcolor: T.bg2, borderRadius: 1, border: `1px solid ${T.border}` }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
              Note globale
            </Typography>
            <Rating value={overall} onChange={(_, v) => setOverall(v)} size="large"
              sx={{ fontSize: 38, '& .MuiRating-iconFilled': { color: T.primary } }} />
            <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>
              {overall === 5 ? 'Excellent' : overall === 4 ? 'Très bien' : overall === 3 ? 'Correct' : overall === 2 ? 'Médiocre' : overall === 1 ? 'Mauvais' : '—'}
            </Typography>
          </Box>

          {/* Category ratings */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Notes détaillées
            </Typography>
            <Stack spacing={1.5}>
              {CATEGORIES.map(c => (
                <Stack key={c.key} direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
                    <Box sx={{ fontSize: 18 }}>{c.icon}</Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{c.label}</Typography>
                  </Stack>
                  <Rating value={ratings[c.key]} onChange={(_, v) => v && setRatings(r => ({ ...r, [c.key]: v }))}
                    sx={{ '& .MuiRating-iconFilled': { color: T.primary } }} />
                </Stack>
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Templates */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Templates
            </Typography>
            <Stack direction="row" spacing={1} sx={{ gap: 1, flexWrap: 'wrap' }}>
              {TEMPLATES.map(t => (
                <Chip key={t.label} size="small" label={t.label} onClick={() => applyTemplate(t.text)}
                  sx={{ bgcolor: T.bg2, '&:hover': { bgcolor: T.primaryTint } }} />
              ))}
            </Stack>
          </Box>

          {/* Public comment */}
          <TextField label="Commentaire public (visible par les autres hôtes)" multiline minRows={5} fullWidth size="small"
            value={comment} onChange={e => setComment(e.target.value)}
            helperText={`${comment.length} caractères · minimum 50`}
            error={comment.length > 0 && comment.length < 50} />

          {/* Private notes */}
          <TextField label="Notes privées (visible uniquement par votre équipe)" multiline minRows={2} fullWidth size="small"
            value={privateNotes} onChange={e => setPrivateNotes(e.target.value)} />

          <Divider />

          {/* Recommend */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Recommanderiez-vous ce voyageur ?
            </Typography>
            <ToggleButtonGroup value={recommend} exclusive size="small"
              onChange={(_, v) => v !== null && setRecommend(v)}
              sx={{ '& .MuiToggleButton-root': { px: 3, py: 1, textTransform: 'none', fontWeight: 600, borderColor: T.border, color: T.text2, '&.Mui-selected': { bgcolor: T.primaryTint, color: T.text, borderColor: T.primary } } }}>
              <ToggleButton value={true}>👍 Oui</ToggleButton>
              <ToggleButton value={false}>👎 Non</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${T.border}`, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ color: T.text2, textTransform: 'none' }}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={loading} variant="contained"
          sx={{ textTransform: 'none', fontWeight: 700, px: 3,
            background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primarySoft} 100%)`, color: T.text,
            '&:hover': { background: `linear-gradient(135deg, ${T.primarySoft} 0%, ${T.primary} 100%)` } }}>
          {loading ? 'Publication…' : 'Publier l\'avis'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReviewComposeModal;
