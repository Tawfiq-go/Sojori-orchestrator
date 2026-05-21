import React, { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { T } from '../_tokens';
import type { PricingEvent } from './PricingControls';

export interface EventEditorModalProps {
  open: boolean;
  initial?: PricingEvent | null;
  onClose: () => void;
  onSave: (event: PricingEvent) => void;
}

export default function EventEditorModal({ open, initial, onClose, onSave }: EventEditorModalProps) {
  const [emoji, setEmoji] = useState('📅');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fixedPrice, setFixedPrice] = useState(1500);
  const [minNights, setMinNights] = useState(2);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setEmoji(initial.emoji || '📅');
      setName(initial.name);
      const parts = initial.dateRange.split('→').map((s) => s.trim());
      setStartDate(parts[0]?.slice(0, 10) ?? '');
      setEndDate(parts[1]?.slice(0, 10) ?? parts[0]?.slice(0, 10) ?? '');
      setFixedPrice(initial.fixedPrice);
      setMinNights(initial.minNights);
    } else {
      setEmoji('📅');
      setName('');
      setStartDate('');
      setEndDate('');
      setFixedPrice(1500);
      setMinNights(2);
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!name.trim() || !startDate || !endDate) return;
    const id = initial?.id ?? `ev-${Date.now()}`;
    onSave({
      id,
      emoji,
      name: name.trim(),
      dateRange: `${startDate} → ${endDate}`,
      fixedPrice: Math.max(0, Math.round(fixedPrice)),
      minNights: Math.max(0, Math.round(minNights)),
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <Stack direction="row" sx={{ alignItems: 'center',  p: 2, borderBottom: `1px solid ${T.border}` }}>
        <Typography sx={{ fontWeight: 800, flex: 1 }}>
          {initial ? 'Modifier l’événement' : 'Ajouter un événement'}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Stack>
      <Box sx={{ p: 2.5 }}>
        <Typography sx={{ fontSize: 12, color: T.text2, mb: 2, lineHeight: 1.5 }}>
          Pendant la période, le prix envoyé au calendrier sera au moins le <b>prix fixe</b> (source{' '}
          <b>Event {name || '…'}</b> dans la justification). Le marché reste la base en dehors des dates.
        </Typography>
        <Stack sx={{ gap: 2 }}>
          <Stack direction="row" sx={{ gap: 1 }}>
            <TextField label="Emoji" size="small" value={emoji} onChange={(e) => setEmoji(e.target.value)} sx={{ width: 72 }} />
            <TextField label="Nom (ex. GITEX)" size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} required />
          </Stack>
          <Stack direction="row" sx={{ gap: 1 }}>
            <TextField label="Début" type="date" size="small" fullWidth value={startDate}
              onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
            <TextField label="Fin" type="date" size="small" fullWidth value={endDate}
              onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
          </Stack>
          <Stack direction="row" sx={{ gap: 1 }}>
            <TextField label="Prix fixe (MAD/nuit)" type="number" size="small" fullWidth value={fixedPrice}
              onChange={(e) => setFixedPrice(Number(e.target.value))} />
            <TextField label="Min. nuits" type="number" size="small" sx={{ width: 120 }} value={minNights}
              onChange={(e) => setMinNights(Number(e.target.value))} />
          </Stack>
        </Stack>
      </Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1,  p: 2, borderTop: `1px solid ${T.border}` }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
        <Button variant="contained" onClick={handleSubmit} sx={{
          textTransform: 'none',
          fontWeight: 800,
          bgcolor: T.gold,
          color: T.text,
          '&:hover': { bgcolor: T.goldDeep },
        }}>
          Enregistrer
        </Button>
      </Stack>
    </Dialog>
  );
}
