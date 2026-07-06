import React, { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { T } from '../_tokens';
import type { PricingEvent, PricingEventKind } from './PricingControls';

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
  const [kind, setKind] = useState<PricingEventKind>('fixed');
  const [fixedPrice, setFixedPrice] = useState(1500);
  const [marketPercent, setMarketPercent] = useState(115);
  const [minNights, setMinNights] = useState(2);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setEmoji(initial.emoji || '📅');
      setName(initial.name);
      const parts = initial.dateRange.split('→').map((s) => s.trim());
      setStartDate(parts[0]?.slice(0, 10) ?? '');
      setEndDate(parts[1]?.slice(0, 10) ?? parts[0]?.slice(0, 10) ?? '');
      setKind(initial.kind ?? 'fixed');
      setFixedPrice(initial.fixedPrice);
      setMarketPercent(initial.marketPercent ?? 115);
      setMinNights(initial.minNights);
    } else {
      setEmoji('📅');
      setName('');
      setStartDate('');
      setEndDate('');
      setKind('fixed');
      setFixedPrice(1500);
      setMarketPercent(115);
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
      kind,
      fixedPrice: Math.max(0, Math.round(fixedPrice)),
      marketPercent: Math.max(50, Math.min(300, Math.round(marketPercent))),
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
          Ordre : <b>marché estimate</b> (courbe bleue §04) → <b>bornes min/max</b> →{' '}
          <b>× occupation</b> → <b>event</b> (fixe ou % marché×occupation). Le <b>min. nuits</b> event est
          poussé au calendrier si « Sync min stay » est ON (scope Sojori AI).
        </Typography>
        <Stack sx={{ gap: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text2, mb: 0.75 }}>
              Type de prix event *
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={kind}
              onChange={(_, v) => v && setKind(v as PricingEventKind)}
              size="small"
              sx={{ '& .Mui-selected': { bgcolor: `${T.goldTint} !important`, color: T.text } }}
            >
              <ToggleButton value="fixed" sx={{ textTransform: 'none', fontSize: 12 }}>
                Prix fixe (MAD)
              </ToggleButton>
              <ToggleButton value="market_percent" sx={{ textTransform: 'none', fontSize: 12 }}>
                % marché × occupation
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
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
          {kind === 'fixed' ? (
            <TextField
              label="Prix fixe (MAD/nuit)"
              type="number"
              size="small"
              fullWidth
              value={fixedPrice}
              onChange={(e) => setFixedPrice(Number(e.target.value))}
              helperText="Remplace le prix après bornes + occupation"
            />
          ) : (
            <TextField
              label="% du marché × occupation"
              type="number"
              size="small"
              fullWidth
              value={marketPercent}
              onChange={(e) => setMarketPercent(Number(e.target.value))}
              helperText="Ex. 115 = 115 % du (marché estimate × coefficient occupation)"
              slotProps={{ htmlInput: { min: 50, max: 300 } }}
            />
          )}
          <TextField label="Min. nuits" type="number" size="small" sx={{ maxWidth: 160 }} value={minNights}
            onChange={(e) => setMinNights(Number(e.target.value))} />
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
