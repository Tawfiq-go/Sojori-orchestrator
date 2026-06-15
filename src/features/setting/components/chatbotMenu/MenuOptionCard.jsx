import React, { useState } from 'react'
import {
  Box,
  Card,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import SmartAvailabilitySelector from './SmartAvailabilitySelector'
import RequiresConditionsSelector from './RequiresConditionsSelector'

const MenuOptionCard = ({ option, onChange }) => {
  const [expanded, setExpanded] = useState(false)

  if (!option) {
    return null
  }

  const handleToggle = (event) => {
    onChange({ ...option, enabled: event.target.checked })
  }

  const handleLabelChange = (event) => {
    onChange({ ...option, label: event.target.value })
  }

  const handleAvailabilityChange = (availability) => {
    onChange({ ...option, availability })
  }

  const isDeclarationOption = option.code === 'D3' || option.code === 'D4'
  const isArrivalDepartureGroup = ['D1', 'D2', 'D3', 'D4'].includes(option.code)

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: option.enabled
          ? isDeclarationOption ? '1px solid #3b82f6' : '1px solid #d97706'
          : '1px solid #e5e7eb',
        boxShadow: 'none',
        backgroundColor: isDeclarationOption && option.enabled ? '#eff6ff' : 'white',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Chip
            label={option.code}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              height: '22px',
              minWidth: '32px',
              backgroundColor: option.enabled ? '#E6B022' : '#e5e7eb',
              color: option.enabled ? 'white' : '#6b7280',
            }}
          />

          <TextField
            size="small"
            value={option.label ?? ''}
            onChange={handleLabelChange}
            placeholder="Libellé affiché dans le menu"
            sx={{
              flex: 1,
              '& .MuiInputBase-input': {
                fontWeight: 600,
                fontSize: '0.9rem',
                py: 0.5,
              },
            }}
            variant="outlined"
            fullWidth
          />

          {isDeclarationOption && (
            <Chip
              label="📍"
              size="small"
              sx={{
                height: '20px',
                minWidth: '24px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontSize: '0.7rem',
              }}
            />
          )}

          <Switch
            checked={option.enabled}
            onChange={handleToggle}
            color="warning"
            size="small"
          />

          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Collapse in={expanded} timeout="auto">
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e5e7eb' }}>
            <Stack spacing={2}>
              <SmartAvailabilitySelector
                value={option.availability}
                onChange={handleAvailabilityChange}
              />
              {option.availability?.type === 'conditional_and_time' && (
                <RequiresConditionsSelector
                  value={option.availability?.requires || ''}
                  onChange={(requires) =>
                    onChange({
                      ...option,
                      availability: { ...(option.availability || {}), requires },
                    })
                  }
                />
              )}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {option.createsTask && (
                  <Chip
                    size="small"
                    label={`Tâche: ${option.taskType || '—'}`}
                    variant="outlined"
                    sx={{ height: '20px', fontSize: '0.7rem' }}
                  />
                )}
                {option.dataSource && (
                  <Chip
                    size="small"
                    label={`Source: ${option.dataSource}`}
                    variant="outlined"
                    sx={{ height: '20px', fontSize: '0.7rem' }}
                  />
                )}
                <Chip
                  size="small"
                  label={option.action}
                  sx={{
                    height: '20px',
                    fontSize: '0.7rem',
                    backgroundColor: '#f3f4f6',
                  }}
                />
              </Stack>
            </Stack>
          </Box>
        </Collapse>
      </Box>
    </Card>
  )
}

export default MenuOptionCard

