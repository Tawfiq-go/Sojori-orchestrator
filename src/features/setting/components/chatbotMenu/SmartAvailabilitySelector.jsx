import React, { useMemo } from 'react'
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

const defaultFrom = { unit: 'days', value: 7, moment: 'before', event: 'checkin' }
const defaultTo = { unit: 'days', value: 1, moment: 'before', event: 'checkin' }

const momentOptions = [
  { value: 'before', label: 'Avant', units: ['days', 'hours'], order: 0 },
  { value: 'after', label: 'Après', units: ['days', 'hours'], order: 1 },
  { value: 'on_day', label: 'Jour de', units: ['days'], order: 2 },
]

const eventOptions = [
  { value: 'checkin', label: 'Check-in', order: 0 },
  { value: 'checkout', label: 'Check-out', order: 1 },
]

const unitOptions = [
  { value: 'days', label: 'Jour(s)' },
  { value: 'hours', label: 'Heure(s)' },
]

// Convertit l'ancien format (reference) vers le nouveau (moment + event)
const parseReference = (reference) => {
  if (!reference) return { moment: 'before', event: 'checkin' }

  if (reference.includes('before')) return { moment: 'before', event: reference.includes('checkout') ? 'checkout' : 'checkin' }
  if (reference.includes('after')) return { moment: 'after', event: reference.includes('checkout') ? 'checkout' : 'checkin' }
  if (reference.includes('on_')) return { moment: 'on_day', event: reference.includes('checkout') ? 'checkout' : 'checkin' }

  return { moment: 'before', event: 'checkin' }
}

// Convertit le nouveau format (moment + event) vers l'ancien (reference) pour compatibilité
const buildReference = (moment, event) => {
  if (moment === 'on_day') return `on_${event}_day`
  return `${moment}_${event}`
}

// Calcule l'ordre global d'une combinaison moment + event
const getGlobalOrder = (moment, event) => {
  const momentOrder = momentOptions.find((m) => m.value === moment)?.order ?? 0
  const eventOrder = eventOptions.find((e) => e.value === event)?.order ?? 0
  return eventOrder * 10 + momentOrder
}

const filterMoments = (unit) =>
  momentOptions.filter((m) => m.units.includes(unit))

const ensureBoundary = (boundary, fallback) => {
  // Si l'ancienne structure avec "reference" existe, la convertir
  if (boundary?.reference && !boundary?.moment) {
    const parsed = parseReference(boundary.reference)
    return {
      unit: boundary.unit || fallback.unit,
      value:
        typeof boundary.value === 'number' && !Number.isNaN(boundary.value)
          ? boundary.value
          : fallback.value,
      moment: parsed.moment,
      event: parsed.event,
    }
  }

  return {
    unit: boundary?.unit || fallback.unit,
    value:
      typeof boundary?.value === 'number' && !Number.isNaN(boundary.value)
        ? boundary.value
        : fallback.value,
    moment: boundary?.moment || fallback.moment,
    event: boundary?.event || fallback.event,
  }
}

const SmartAvailabilitySelector = ({ value = { type: 'always' }, onChange }) => {
  const type = value?.type || 'always'
  const requiresWindow = type === 'time_window' || type === 'conditional_and_time'

  const fromBoundary = useMemo(
    () => ensureBoundary(value.from, defaultFrom),
    [value.from],
  )
  const toBoundary = useMemo(() => ensureBoundary(value.to, defaultTo), [value.to])

  const fromMomentOptions = filterMoments(fromBoundary.unit)
  const toMomentOptions = filterMoments(toBoundary.unit)

  const validationMessage = useMemo(() => {
    if (!requiresWindow) return null
    const fromOrder = getGlobalOrder(fromBoundary.moment, fromBoundary.event)
    const toOrder = getGlobalOrder(toBoundary.moment, toBoundary.event)

    if (toOrder < fromOrder) {
      return {
        severity: 'error',
        text: 'La référence de fin doit être postérieure à la référence de début.',
      }
    }

    const sameRef = fromBoundary.moment === toBoundary.moment && fromBoundary.event === toBoundary.event
    if (sameRef && fromBoundary.value < toBoundary.value) {
      return {
        severity: 'error',
        text: 'La valeur de début doit être supérieure ou égale à la valeur de fin.',
      }
    }

    return {
      severity: 'success',
      text: 'Fenêtre temporelle valide.',
    }
  }, [requiresWindow, fromBoundary, toBoundary])

  const handleTypeChange = (event) => {
    const nextType = event.target.value
    switch (nextType) {
      case 'always':
        onChange({ type: 'always' })
        break
      case 'after_booking_confirmed':
        onChange({ type: 'after_booking_confirmed' })
        break
      case 'time_window':
        onChange({
          type: 'time_window',
          from: { ...fromBoundary, reference: buildReference(fromBoundary.moment, fromBoundary.event) },
          to: { ...toBoundary, reference: buildReference(toBoundary.moment, toBoundary.event) },
        })
        break
      case 'conditional_and_time':
        onChange({
          type: 'conditional_and_time',
          requires: value.requires || 'E_completed',
          from: { ...fromBoundary, reference: buildReference(fromBoundary.moment, fromBoundary.event) },
          to: { ...toBoundary, reference: buildReference(toBoundary.moment, toBoundary.event) },
        })
        break
      default:
        break
    }
  }

  const updateBoundary = (boundaryKey, updates) => {
    const current = boundaryKey === 'from' ? fromBoundary : toBoundary
    const nextBoundary = { ...current, ...updates }
    const reference = buildReference(nextBoundary.moment, nextBoundary.event)
    const nextAvailability =
      boundaryKey === 'from'
        ? { ...value, from: { ...nextBoundary, reference } }
        : { ...value, to: { ...nextBoundary, reference } }
    onChange(nextAvailability)
  }

  const handleUnitChange = (boundaryKey, unit) => {
    const target = boundaryKey === 'from' ? fromBoundary : toBoundary
    const allowedMoments = filterMoments(unit)

    // Si le moment actuel n'est plus compatible avec la nouvelle unité, prendre le premier disponible
    const nextMoment = allowedMoments.find((m) => m.value === target.moment)
      ? target.moment
      : allowedMoments[0]?.value || 'before'

    updateBoundary(boundaryKey, { unit, moment: nextMoment })
  }

  const handleMomentChange = (boundaryKey, moment) => {
    updateBoundary(boundaryKey, { moment })
  }

  const handleEventChange = (boundaryKey, event) => {
    updateBoundary(boundaryKey, { event })
  }

  const handleValueChange = (boundaryKey, rawValue) => {
    const numericValue = Math.max(0, Number(rawValue) || 0)
    updateBoundary(boundaryKey, { value: numericValue })
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
        Fenêtre de disponibilité
      </Typography>
      <RadioGroup row value={type} onChange={handleTypeChange}>
        <FormControlLabel value="always" control={<Radio />} label="Toujours" />
        <FormControlLabel
          value="time_window"
          control={<Radio />}
          label="Fenêtre temporelle"
        />
        <FormControlLabel
          value="after_booking_confirmed"
          control={<Radio />}
          label="Après confirmation"
        />
        <FormControlLabel
          value="conditional_and_time"
          control={<Radio />}
          label="Conditionnelle + temps"
        />
      </RadioGroup>

      {requiresWindow && (
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Box
            sx={{
              p: 2,
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              backgroundColor: '#f8fafc',
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Début
            </Typography>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <TextField
                label="Valeur"
                type="number"
                size="small"
                value={fromBoundary.value}
                onChange={(event) => handleValueChange('from', event.target.value)}
                sx={{ maxWidth: '120px' }}
              />
              <FormControl size="small" sx={{ minWidth: '120px' }}>
                <InputLabel>Unité</InputLabel>
                <Select
                  label="Unité"
                  value={fromBoundary.unit}
                  onChange={(event) => handleUnitChange('from', event.target.value)}
                >
                  {unitOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: '120px' }}>
                <InputLabel>Moment</InputLabel>
                <Select
                  label="Moment"
                  value={fromBoundary.moment}
                  onChange={(event) => handleMomentChange('from', event.target.value)}
                >
                  {fromMomentOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: '140px' }}>
                <InputLabel>Événement</InputLabel>
                <Select
                  label="Événement"
                  value={fromBoundary.event}
                  onChange={(event) => handleEventChange('from', event.target.value)}
                >
                  {eventOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          <Box
            sx={{
              p: 2,
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              backgroundColor: '#fff',
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Fin
            </Typography>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <TextField
                label="Valeur"
                type="number"
                size="small"
                value={toBoundary.value}
                onChange={(event) => handleValueChange('to', event.target.value)}
                sx={{ maxWidth: '120px' }}
              />
              <FormControl size="small" sx={{ minWidth: '120px' }}>
                <InputLabel>Unité</InputLabel>
                <Select
                  label="Unité"
                  value={toBoundary.unit}
                  onChange={(event) => handleUnitChange('to', event.target.value)}
                >
                  {unitOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: '120px' }}>
                <InputLabel>Moment</InputLabel>
                <Select
                  label="Moment"
                  value={toBoundary.moment}
                  onChange={(event) => handleMomentChange('to', event.target.value)}
                >
                  {toMomentOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: '140px' }}>
                <InputLabel>Événement</InputLabel>
                <Select
                  label="Événement"
                  value={toBoundary.event}
                  onChange={(event) => handleEventChange('to', event.target.value)}
                >
                  {eventOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>
        </Stack>
      )}

      {validationMessage && (
        <Alert severity={validationMessage.severity} sx={{ mt: 2 }}>
          {validationMessage.text}
        </Alert>
      )}
    </Box>
  )
}

export default SmartAvailabilitySelector
