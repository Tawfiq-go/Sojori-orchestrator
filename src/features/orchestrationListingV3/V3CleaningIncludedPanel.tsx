import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { FrequencyTier, TimeSlot } from '../listing/components/ConfigOrchestration/cleaningConfigTypes';
import { V3 } from './theme';
import { V3BlockSaveBar } from './V3BlockSaveBar';
import {
  cleaningsForNights,
  formatHour,
  parseCleaningIncludedGestion,
  cleaningIncludedToGestion,
  proposeNextIncludedCleaningSlot,
  type CleaningIncludedGestion,
} from './cleaningGestionHelpers';

type Props = {
  gestion: Record<string, unknown>;
  listingValues?: Record<string, unknown>;
  onSave: (gestion: Record<string, unknown>) => Promise<void>;
};

const PREVIEW_NIGHTS = [5, 10, 21];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    fontSize: 13,
    bgcolor: '#fff',
    '& fieldset': { borderColor: V3.b },
    '&:hover fieldset': { borderColor: V3.bs },
    '&.Mui-focused fieldset': { borderColor: V3.p },
  },
  '& .MuiInputLabel-root': { fontSize: 12 },
};

const sectionSx = {
  border: `1px solid ${V3.b}`,
  borderRadius: '12px',
  bgcolor: V3.card,
  overflow: 'hidden',
};

const TIER_COLS = 'minmax(88px, 120px) minmax(88px, 120px) minmax(88px, 120px) 36px';
const SLOT_COLS = 'minmax(100px, 130px) minmax(100px, 130px) 64px 36px';

export default function V3CleaningIncludedPanel({ gestion, listingValues = {}, onSave }: Props) {
  const [state, setState] = useState<CleaningIncludedGestion>(() =>
    parseCleaningIncludedGestion(gestion, listingValues),
  );
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    const next = parseCleaningIncludedGestion(gestion, listingValues);
    setState(next);
    stateRef.current = next;
    dirtyRef.current = false;
    setDirty(false);
  }, [gestion, listingValues]);

  const patch = useCallback((fn: (s: CleaningIncludedGestion) => CleaningIncludedGestion) => {
    dirtyRef.current = true;
    setDirty(true);
    setState(prev => {
      const next = fn(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  const persist = useCallback(async () => {
    setSaving('saving');
    try {
      await onSave(cleaningIncludedToGestion(stateRef.current));
      setSaving('saved');
      dirtyRef.current = false;
      setDirty(false);
    } catch {
      setSaving('idle');
    }
  }, [onSave]);

  const updateTier = (index: number, patchTier: Partial<FrequencyTier>) => {
    patch(s => ({
      ...s,
      frequency: s.frequency.map((t, i) => (i === index ? { ...t, ...patchTier } : t)),
    }));
  };

  const updateSlot = (index: number, patchSlot: Partial<TimeSlot>) => {
    patch(s => ({
      ...s,
      timeSlots: s.timeSlots.map((t, i) => (i === index ? { ...t, ...patchSlot } : t)),
    }));
  };

  const setDefaultSlot = (index: number) => {
    patch(s => ({
      ...s,
      timeSlots: s.timeSlots.map((t, i) => ({ ...t, default: i === index })),
    }));
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 'none' }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.t, mb: 0.75 }}>Message voyageur</Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          value={state.descriptionFr}
          onChange={e => patch(s => ({ ...s, descriptionFr: e.target.value }))}
          placeholder="Ex. : Ménages inclus selon la durée de votre séjour. Vous choisirez vos créneaux sur WhatsApp."
          sx={fieldSx}
        />
        <Typography sx={{ fontSize: 10.5, color: V3.t4, mt: 0.75 }}>
          Affiché au client dans le menu ménage inclus · descriptionFr
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2.5,
          width: '100%',
          alignItems: 'start',
        }}
      >
        {/* Paliers */}
        <Box sx={sectionSx}>
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${V3.b}`,
              bgcolor: V3.alt,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: V3.t }}>Paliers durée</Typography>
              <Typography sx={{ fontSize: 11, color: V3.t3 }}>Ménages offerts selon les nuits</Typography>
            </Box>
            <Button
              size="small"
              onClick={() =>
                patch(s => ({
                  ...s,
                  frequency: [...s.frequency, { startDay: 1, endDay: 7, numberOfCleaning: 1 }],
                }))
              }
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
                borderRadius: '8px',
                color: V3.pd,
                border: `1px dashed ${V3.pt2}`,
              }}
            >
              + Palier
            </Button>
          </Box>

          <Box
            sx={{
              px: 2,
              py: 1,
              display: 'grid',
              gridTemplateColumns: TIER_COLS,
              gap: 1,
              bgcolor: V3.alt,
            }}
          >
            {['Nuit min', 'Nuit max', 'Ménages', ''].map(h => (
              <Typography
                key={h || 'x'}
                sx={{ fontSize: 10, fontWeight: 800, color: V3.t4, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                {h}
              </Typography>
            ))}
          </Box>

          <Stack sx={{ px: 2, py: 1, gap: 0.75 }}>
            {state.frequency.map((tier, i) => (
              <Box
                key={`tier-${i}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: TIER_COLS,
                  gap: 1,
                  alignItems: 'center',
                  p: 1,
                  borderRadius: '10px',
                  border: `1px solid ${V3.b}`,
                  bgcolor: i % 2 === 0 ? '#fff' : V3.alt,
                }}
              >
                <NumField value={tier.startDay} min={1} max={365} suffix="J" onChange={v => updateTier(i, { startDay: v })} />
                <NumField value={tier.endDay} min={tier.startDay} max={365} suffix="J" onChange={v => updateTier(i, { endDay: v })} />
                <NumField
                  value={tier.numberOfCleaning}
                  min={0}
                  max={30}
                  suffix="×"
                  highlight
                  onChange={v => updateTier(i, { numberOfCleaning: v })}
                />
                <Typography
                  component="button"
                  type="button"
                  onClick={() => patch(s => ({ ...s, frequency: s.frequency.filter((_, j) => j !== i) }))}
                  sx={{
                    all: 'unset',
                    cursor: state.frequency.length <= 1 ? 'not-allowed' : 'pointer',
                    color: V3.er,
                    fontSize: 18,
                    lineHeight: 1,
                    opacity: state.frequency.length <= 1 ? 0.35 : 1,
                  }}
                >
                  ×
                </Typography>
              </Box>
            ))}
          </Stack>

          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ px: 2, pb: 2, pt: 0.5 }}>
            {PREVIEW_NIGHTS.map(n => (
              <Box
                key={n}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '99px',
                  bgcolor: V3.pt,
                  border: `1px solid ${V3.pt2}`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: V3.t2,
                }}
              >
                {n} n →{' '}
                <Box component="span" sx={{ color: V3.pd, fontWeight: 800 }}>
                  {cleaningsForNights(n, state.frequency)} ménage{cleaningsForNights(n, state.frequency) > 1 ? 's' : ''}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Créneaux */}
        <Box sx={sectionSx}>
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${V3.b}`,
              bgcolor: V3.alt,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: V3.t }}>Créneaux horaires</Typography>
              <Typography sx={{ fontSize: 11, color: V3.t3 }}>TS_CLEAN · plages proposées au client</Typography>
            </Box>
            <Button
              size="small"
              onClick={() =>
                patch(s => ({
                  ...s,
                  timeSlots: [...s.timeSlots, proposeNextIncludedCleaningSlot(s.timeSlots)],
                }))
              }
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
                borderRadius: '8px',
                color: V3.pd,
                border: `1px dashed ${V3.pt2}`,
              }}
            >
              + Créneau
            </Button>
          </Box>

          <Box
            sx={{
              px: 2,
              py: 1,
              display: 'grid',
              gridTemplateColumns: SLOT_COLS,
              gap: 1,
              bgcolor: V3.alt,
            }}
          >
            {['Début', 'Fin', 'Déf.', ''].map(h => (
              <Typography
                key={h || 'x'}
                sx={{ fontSize: 10, fontWeight: 800, color: V3.t4, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                {h}
              </Typography>
            ))}
          </Box>

          <Stack sx={{ px: 2, py: 1, gap: 0.75 }}>
            {state.timeSlots.length === 0 && (
              <Typography sx={{ fontSize: 12, color: V3.t3, py: 1.5, textAlign: 'center' }}>
                Aucun créneau — ajoutez une plage horaire ou laissez vide si le client ne choisit pas d&apos;horaire.
              </Typography>
            )}
            {state.timeSlots.map((slot, i) => (
              <Box
                key={`slot-${i}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: SLOT_COLS,
                  gap: 1,
                  alignItems: 'center',
                  p: 1,
                  borderRadius: '10px',
                  border: `1px solid ${slot.default ? V3.pt2 : V3.b}`,
                  bgcolor: slot.default ? V3.pt : '#fff',
                }}
              >
                <HourSelect
                  value={slot.start}
                  min={0}
                  max={Math.min(23, slot.end - 1)}
                  onChange={v => {
                    const end = v + 2 <= slot.end ? slot.end : Math.min(24, v + 2);
                    updateSlot(i, { start: v, end: end > v ? end : Math.min(24, v + 2) });
                  }}
                />
                <HourSelect
                  value={slot.end}
                  min={Math.max(1, slot.start + 1)}
                  max={24}
                  onChange={v => updateSlot(i, { end: v })}
                />
                <Button
                  size="small"
                  variant={slot.default ? 'contained' : 'outlined'}
                  onClick={() => setDefaultSlot(i)}
                  sx={{
                    textTransform: 'none',
                    fontSize: 10.5,
                    fontWeight: 800,
                    minWidth: 0,
                    px: 1,
                    borderRadius: '8px',
                    ...(slot.default
                      ? { bgcolor: V3.p, '&:hover': { bgcolor: V3.pd } }
                      : { borderColor: V3.b, color: V3.t3 }),
                  }}
                >
                  {slot.default ? '★' : '—'}
                </Button>
                <Typography
                  component="button"
                  type="button"
                  onClick={() => patch(s => ({ ...s, timeSlots: s.timeSlots.filter((_, j) => j !== i) }))}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    color: V3.er,
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  ×
                </Typography>
              </Box>
            ))}
          </Stack>

          {state.timeSlots.length > 0 && (
            <Typography sx={{ fontSize: 11, color: V3.t4, px: 2, pb: 2 }}>
              {state.timeSlots.map(s => formatHour(s.start) + '–' + formatHour(s.end)).join(' · ')}
            </Typography>
          )}
        </Box>
      </Box>

      <V3BlockSaveBar
        label="Ménage inclus · gestion owner_orchestrations"
        dirty={dirty}
        saving={saving === 'saving'}
        onSave={() => void persist()}
      />
    </Box>
  );
}

function NumField({
  value,
  min,
  max,
  suffix,
  highlight,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  highlight?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <TextField
      type="number"
      size="small"
      value={value}
      onChange={e => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n)) return;
        onChange(Math.min(max, Math.max(min, n)));
      }}
      inputProps={{ min, max }}
      InputProps={
        suffix
          ? {
              endAdornment: (
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: V3.t4, pr: 0.5 }}>{suffix}</Typography>
              ),
            }
          : undefined
      }
      sx={{
        ...fieldSx,
        '& .MuiOutlinedInput-input': {
          fontWeight: highlight ? 800 : 600,
          color: highlight ? V3.pd : V3.t,
          fontFamily: highlight ? 'monospace' : 'inherit',
        },
      }}
    />
  );
}

function HourSelect({
  value,
  min = 0,
  max = 24,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const options = Array.from({ length: 25 }, (_, i) => i).filter(h => h >= min && h <= max);
  return (
    <FormControl size="small" sx={fieldSx}>
      <Select value={value} onChange={e => onChange(Number(e.target.value))}>
        {options.map(h => (
          <MenuItem key={h} value={h}>
            {formatHour(h)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
