import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { T, sxInput } from './menuTheme';
import { resolveAvailabilityType } from './menuAvailabilityNormalize';

const defaultFrom = { unit: 'days', value: 7, moment: 'before', event: 'checkin' };
const defaultTo = { unit: 'days', value: 1, moment: 'before', event: 'checkin' };

const momentOptions = [
  { value: 'before', label: 'Avant', units: ['days', 'hours'] },
  { value: 'after', label: 'Après', units: ['days', 'hours'] },
  { value: 'on_day', label: 'Jour de', units: ['days'] },
];

const eventOptions = [
  { value: 'checkin', label: 'Check-in' },
  { value: 'checkout', label: 'Check-out' },
];

const unitOptions = [
  { value: 'days', label: 'Jour(s)' },
  { value: 'hours', label: 'Heure(s)' },
];

const parseReference = (reference) => {
  if (!reference) return { moment: 'before', event: 'checkin' };
  if (reference.includes('before')) return { moment: 'before', event: reference.includes('checkout') ? 'checkout' : 'checkin' };
  if (reference.includes('after')) return { moment: 'after', event: reference.includes('checkout') ? 'checkout' : 'checkin' };
  if (reference.includes('on_')) return { moment: 'on_day', event: reference.includes('checkout') ? 'checkout' : 'checkin' };
  return { moment: 'before', event: 'checkin' };
};

const buildReference = (moment, event) => {
  if (moment === 'on_day') return `on_${event}_day`;
  return `${moment}_${event}`;
};

const filterMoments = (unit) => momentOptions.filter((m) => m.units.includes(unit));

const ensureBoundary = (boundary, fallback) => {
  if (boundary?.reference && !boundary?.moment) {
    const parsed = parseReference(boundary.reference);
    return {
      unit: boundary.unit || fallback.unit,
      value: typeof boundary.value === 'number' && !Number.isNaN(boundary.value) ? boundary.value : fallback.value,
      moment: parsed.moment,
      event: parsed.event,
    };
  }
  return {
    unit: boundary?.unit || fallback.unit,
    value: typeof boundary?.value === 'number' && !Number.isNaN(boundary.value) ? boundary.value : fallback.value,
    moment: boundary?.moment || fallback.moment,
    event: boundary?.event || fallback.event,
  };
};

function NumericStepper({ value, onChange, min = 0, max = 365 }) {
  const clamp = (n) => Math.min(max, Math.max(min, n));
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        border: `1px solid ${T.border}`,
        borderRadius: 1,
        bgcolor: T.bg1,
        width: { xs: '100%', sm: 88 },
        flexShrink: 0,
      }}
    >
      <IconButton
        size="small"
        aria-label="Diminuer"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        sx={{ width: 32, height: 32, color: T.text2 }}
      >
        −
      </IconButton>
      <Box
        sx={{
          flex: 1,
          textAlign: 'center',
          fontFamily: '"Geist Mono", monospace',
          fontWeight: 700,
          fontSize: 14,
          color: T.text,
        }}
      >
        {value}
      </Box>
      <IconButton
        size="small"
        aria-label="Augmenter"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        sx={{ width: 32, height: 32, color: T.text2 }}
      >
        +
      </IconButton>
    </Stack>
  );
}

function BoundaryRow({ title, boundary, onUnit, onMoment, onEvent, onValue, momentOpts }) {
  return (
    <Box sx={{ p: 1.25, border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg1 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text3, fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
        {title}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <Box sx={{ width: { xs: '100%', sm: 88 } }}>
          <Typography sx={{ fontSize: 10, color: T.text4, mb: 0.35, fontWeight: 700 }}>Valeur</Typography>
          <NumericStepper value={boundary.value} onChange={onValue} />
        </Box>
        <FormControl size="small" sx={{ minWidth: 110, flex: 1 }}>
          <InputLabel>Unité</InputLabel>
          <Select label="Unité" value={boundary.unit} onChange={(e) => onUnit(e.target.value)} sx={sxInput}>
            {unitOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 110, flex: 1 }}>
          <InputLabel>Moment</InputLabel>
          <Select label="Moment" value={boundary.moment} onChange={(e) => onMoment(e.target.value)} sx={sxInput}>
            {momentOpts.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
          <InputLabel>Événement</InputLabel>
          <Select label="Événement" value={boundary.event} onChange={(e) => onEvent(e.target.value)} sx={sxInput}>
            {eventOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Box>
  );
}

const SmartAvailabilitySelector = ({ value = { type: 'always' }, onChange }) => {
  const type = resolveAvailabilityType(value);
  const requiresWindow = type === 'time_window' || type === 'conditional_and_time';
  /** Fenêtre sans borne de début = disponible dès la réservation (le moteur n'applique que `to`). */
  const hasFrom = Boolean(value.from);
  const fromBoundary = useMemo(() => ensureBoundary(value.from, defaultFrom), [value.from]);
  const toBoundary = useMemo(() => ensureBoundary(value.to, defaultTo), [value.to]);
  const fromMomentOptions = filterMoments(fromBoundary.unit);
  const toMomentOptions = filterMoments(toBoundary.unit);

  const updateBoundary = (boundaryKey, updates) => {
    const current = boundaryKey === 'from' ? fromBoundary : toBoundary;
    const nextBoundary = { ...current, ...updates };
    const reference = buildReference(nextBoundary.moment, nextBoundary.event);
    onChange(boundaryKey === 'from' ? { ...value, from: { ...nextBoundary, reference } } : { ...value, to: { ...nextBoundary, reference } });
  };

  const handleUnitChange = (boundaryKey, unit) => {
    const target = boundaryKey === 'from' ? fromBoundary : toBoundary;
    const allowed = filterMoments(unit);
    const nextMoment = allowed.find((m) => m.value === target.moment)?.value || allowed[0]?.value || 'before';
    updateBoundary(boundaryKey, { unit, moment: nextMoment });
  };

  const handleTypeChange = (event) => {
    const nextType = event.target.value;
    if (nextType === 'always') onChange({ type: 'always' });
    else if (nextType === 'after_booking_confirmed') onChange({ type: 'after_booking_confirmed' });
    else if (nextType === 'time_window') {
      onChange({
        type: 'time_window',
        from: { ...fromBoundary, reference: buildReference(fromBoundary.moment, fromBoundary.event) },
        to: { ...toBoundary, reference: buildReference(toBoundary.moment, toBoundary.event) },
      });
    } else if (nextType === 'conditional_and_time') {
      onChange({
        type: 'conditional_and_time',
        requires: value.requires || 'E_completed,D1_completed',
        from: { ...fromBoundary, reference: buildReference(fromBoundary.moment, fromBoundary.event) },
        to: { ...toBoundary, reference: buildReference(toBoundary.moment, toBoundary.event) },
      });
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2, mb: 0.75 }}>
        Fenêtre de disponibilité
      </Typography>
      <RadioGroup row value={type} onChange={handleTypeChange} sx={{ gap: 0.5 }}>
        <FormControlLabel
          value="always"
          control={<Radio size="small" sx={{ color: T.text4, '&.Mui-checked': { color: T.primary } }} />}
          label={<Typography sx={{ fontSize: 12.5 }}>Toujours</Typography>}
        />
        <FormControlLabel
          value="time_window"
          control={<Radio size="small" sx={{ color: T.text4, '&.Mui-checked': { color: T.primary } }} />}
          label={<Typography sx={{ fontSize: 12.5 }}>Fenêtre temporelle</Typography>}
        />
        <FormControlLabel
          value="after_booking_confirmed"
          control={<Radio size="small" sx={{ color: T.text4, '&.Mui-checked': { color: T.primary } }} />}
          label={<Typography sx={{ fontSize: 12.5 }}>Après confirmation</Typography>}
        />
        <FormControlLabel
          value="conditional_and_time"
          control={<Radio size="small" sx={{ color: T.text4, '&.Mui-checked': { color: T.primary } }} />}
          label={<Typography sx={{ fontSize: 12.5 }}>Conditionnelle + temps</Typography>}
        />
      </RadioGroup>

      {requiresWindow && (
        <Stack spacing={1.25} sx={{ mt: 1.25 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={!hasFrom}
                onChange={(e) => {
                  if (e.target.checked) {
                    const next = { ...value };
                    delete next.from;
                    onChange(next);
                  } else {
                    updateBoundary('from', {});
                  }
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: 12.5 }}>
                Dès la réservation (pas de borne de début)
              </Typography>
            }
          />
          {hasFrom && (
            <BoundaryRow
              title="Début"
              boundary={fromBoundary}
              momentOpts={fromMomentOptions}
              onValue={(v) => updateBoundary('from', { value: Math.max(0, Number(v) || 0) })}
              onUnit={(u) => handleUnitChange('from', u)}
              onMoment={(m) => updateBoundary('from', { moment: m })}
              onEvent={(ev) => updateBoundary('from', { event: ev })}
            />
          )}
          <BoundaryRow
            title="Fin"
            boundary={toBoundary}
            momentOpts={toMomentOptions}
            onValue={(v) => updateBoundary('to', { value: Math.max(0, Number(v) || 0) })}
            onUnit={(u) => handleUnitChange('to', u)}
            onMoment={(m) => updateBoundary('to', { moment: m })}
            onEvent={(ev) => updateBoundary('to', { event: ev })}
          />
        </Stack>
      )}
    </Box>
  );
};

export default SmartAvailabilitySelector;
