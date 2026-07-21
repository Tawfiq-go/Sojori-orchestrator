import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { T } from '../_tokens';
import { calendarService } from '../../../services/calendarService';
import { processInventoryResponse } from '../../../components/calendar-v3/processInventoryResponse';

const MONO = '"Geist Mono", monospace';

function splitContiguousIsoRanges(sortedIsos: string[]) {
  if (!sortedIsos.length) return [];
  const ranges: { from: string; to: string }[] = [];
  let start = sortedIsos[0];
  let prev = sortedIsos[0];
  for (let i = 1; i < sortedIsos.length; i += 1) {
    const d = sortedIsos[i];
    const next = new Date(`${prev}T12:00:00`);
    next.setDate(next.getDate() + 1);
    const expected = next.toISOString().slice(0, 10);
    if (d !== expected) {
      ranges.push({ from: start, to: prev });
      start = d;
    }
    prev = d;
  }
  ranges.push({ from: start, to: prev });
  return ranges;
}

function fmtDayFr(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export interface PreviewDaysSimpleModalProps {
  open: boolean;
  onClose: () => void;
  listingId: string;
  selectedDates: string[];
  /** Reco min stay Sojori par date (gap, etc.) */
  sojoriMinStayByDate?: Record<string, number>;
  onSaved?: () => void;
}

export default function PreviewDaysSimpleModal({
  open,
  onClose,
  listingId,
  selectedDates,
  sojoriMinStayByDate = {},
  onSaved,
}: PreviewDaysSimpleModalProps) {
  const sortedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);
  const [manualPrice, setManualPrice] = useState('');
  const [minStay, setMinStay] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPriceHint, setCurrentPriceHint] = useState<string | null>(null);
  const [currentMinStayHint, setCurrentMinStayHint] = useState<string | null>(null);

  const sojoriMinStayReco = useMemo(() => {
    const vals = sortedDates
      .map((d) => sojoriMinStayByDate[d])
      .filter((v) => typeof v === 'number' && v > 0);
    if (!vals.length) return null;
    const first = vals[0];
    return vals.every((v) => v === first) ? first : null;
  }, [sortedDates, sojoriMinStayByDate]);

  useEffect(() => {
    if (!open) {
      setManualPrice('');
      setMinStay('');
      setError(null);
      setCurrentPriceHint(null);
      setCurrentMinStayHint(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!sortedDates.length) return;
      try {
        const raw = await calendarService.getInventoryForListings(
          [listingId],
          sortedDates[0],
          sortedDates[sortedDates.length - 1],
          false,
          false,
        );
        if (cancelled) return;
        const processed = processInventoryResponse(raw);
        const rtKeys = Object.keys(processed[listingId] ?? {});
        const rtId = rtKeys[0];
        if (!rtId) return;
        const prices: number[] = [];
        const stays: number[] = [];
        for (const iso of sortedDates) {
          const inv = processed[listingId]?.[rtId]?.availability?.[iso] as
            | { manualPrice?: number; minStay?: number }
            | undefined;
          if (inv?.manualPrice != null) prices.push(Number(inv.manualPrice));
          if (inv?.minStay != null) stays.push(Number(inv.minStay));
        }
        const samePrice = prices.length && prices.every((p) => p === prices[0]) ? prices[0] : null;
        const sameStay = stays.length && stays.every((s) => s === stays[0]) ? stays[0] : null;
        setCurrentPriceHint(
          samePrice != null
            ? `Actuel : ${Math.round(samePrice)} MAD`
            : prices.length
              ? `Mix ${Math.min(...prices)}–${Math.max(...prices)} MAD`
              : null,
        );
        setCurrentMinStayHint(
          sameStay != null
            ? `Actuel : ${sameStay} nuit(s)`
            : stays.length
              ? `Mix ${Math.min(...stays)}–${Math.max(...stays)} n`
              : null,
        );
      } catch {
        /* hints optionnels */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, listingId, sortedDates]);

  const handleSave = async () => {
    const priceVal = manualPrice.trim() === '' ? null : Number(manualPrice);
    const minVal = minStay.trim() === '' ? null : Number(minStay);
    if (priceVal == null && minVal == null) {
      setError('Saisissez un prix manuel et/ou un min stay');
      return;
    }
    if (priceVal != null && (!Number.isFinite(priceVal) || priceVal <= 0)) {
      setError('Prix invalide');
      return;
    }
    if (minVal != null && (!Number.isFinite(minVal) || minVal < 1)) {
      setError('Min stay invalide (≥ 1)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = await calendarService.getInventoryForListings(
        [listingId],
        sortedDates[0],
        sortedDates[sortedDates.length - 1],
        false,
        false,
      );
      const processed = processInventoryResponse(raw);
      const rtId = Object.keys(processed[listingId] ?? {})[0];
      if (!rtId) throw new Error('Room type introuvable pour ce bien');

      const ranges = splitContiguousIsoRanges(sortedDates);
      const payloads: Record<string, unknown>[] = [];
      for (const { from, to } of ranges) {
        const base = { roomTypeId: rtId, date_from: from, date_to: to };
        if (priceVal != null) {
          payloads.push({ type: 'manualPrice', ...base, price: Math.round(priceVal) });
        }
        if (minVal != null) {
          payloads.push({ type: 'min_stay_arrival', ...base, min_stay_arrival: Math.round(minVal) });
        }
      }
      if (!payloads.length) throw new Error('Aucune modification à envoyer');
      await calendarService.updateCalendar(payloads as never);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 17, pb: 0.5 }}>
        Modifier les jours sélectionnés
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 12, color: T.text2, mb: 1.5 }}>
          {sortedDates.length} jour{sortedDates.length > 1 ? 's' : ''} · prix manuel (mode M) · min stay optionnel
        </Typography>
        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
          {sortedDates.map((iso) => (
            <Chip
              key={iso}
              size="small"
              label={fmtDayFr(iso)}
              sx={{ fontFamily: MONO, fontSize: 11, fontWeight: 700 }}
            />
          ))}
        </Stack>

        <TextField
          fullWidth
          size="small"
          type="number"
          label="Prix manuel (MAD)"
          placeholder={currentPriceHint ?? 'Ex. 1850'}
          helperText={currentPriceHint ?? 'Appliqué uniquement aux jours cochés'}
          value={manualPrice}
          onChange={(e) => setManualPrice(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{ sx: { fontFamily: MONO, fontWeight: 700 } }}
        />

        <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Min stay (nuits)"
            placeholder={currentMinStayHint ?? 'Laisser vide = inchangé'}
            helperText={currentMinStayHint ?? 'Optionnel'}
            value={minStay}
            onChange={(e) => setMinStay(e.target.value)}
            InputProps={{ sx: { fontFamily: MONO, fontWeight: 700 } }}
          />
          {sojoriMinStayReco != null ? (
            <Button
              size="small"
              onClick={() => setMinStay(String(sojoriMinStayReco))}
              sx={{ mt: 0.5, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Reco {sojoriMinStayReco}n
            </Button>
          ) : null}
        </Stack>

        {error ? (
          <Typography sx={{ mt: 1.5, fontSize: 12, color: T.error, fontWeight: 600 }}>{error}</Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={loading}
          onClick={() => void handleSave()}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            bgcolor: T.goldDeep,
            '&:hover': { bgcolor: T.gold, color: T.text },
          }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
