import React from 'react';
import { Box, TextField, Typography, Switch, FormControlLabel, MenuItem } from '@mui/material';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const TimeInputGroup = ({ 
  section, 
  timing, 
  values, 
  onChange, 
  enabled = true, 
  onToggle, 
  dayMin = 0,
  dayMax = 365,
  hoursMin = 0,
  hoursMax = 23,
  minutesMin = 0,
  minutesMax = 59,
  hideMinutes = false,
  hourOptions = [],
}) => {
  const { t } = useTranslation('common');

  const handleFieldChange = (field, value) => {
    if (!enabled) return;
    
    if (value !== '') {  
      const numValue = parseInt(value);
      const maxValues = {
        day: 365,
        hours: 23,
        minutes: 59
      };

      if (numValue < 0) {
        toast.error(t(`${field}CannotBeNegative`));
        return;
      }
      
      if (numValue > maxValues[field]) {
        toast.error(t(`${field}CannotExceed`, { max: maxValues[field] }));
        return;
      }
    }
    
    onChange(section, timing, field, value);
  };
  

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(e) => onToggle?.(section, timing, e.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#00b4b4',
                '&:hover': {
                  backgroundColor: 'rgba(0, 180, 180, 0.08)',
                },
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#00b4b4',
              },
            }}
          />
        }
        label={<Typography className="!text-base">{t(timing)}</Typography>}
        sx={{ minWidth: 150 }}
      />
      <TextField
        type="number"
        size="small"
        label={t('Day')}
        value={values?.day || ''} 
        onChange={(e) => handleFieldChange('day', e.target.value)}
        inputProps={{ min: dayMin, max: dayMax }}
        sx={{ width: 100 }}
        disabled={!enabled}
      />
      {hourOptions.length > 0 ? (
        <TextField
            select
            size="small"
            label={t('At')}                        // relabel “Hours” → “At”
            value={values?.hours || ''}
            onChange={e => handleFieldChange('hours', e.target.value)}
            sx={{ width: 100 }}
            disabled={!enabled}
          >
            {hourOptions.map(h => (
              <MenuItem key={h} value={String(h)}>
                {h}:00
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            type="number"
            size="small"
            label={t('Hours')}
            value={values?.hours || ''}
            onChange={e => handleFieldChange('hours', e.target.value)}
            inputProps={{ min: hoursMin, max: hoursMax }}
            sx={{ width: 100 }}
            disabled={!enabled}
          />
        )}
        {!hideMinutes && (
          <TextField
            type="number"
            size="small"
            label={t('Minutes')}
            value={values?.minutes || ''}
            onChange={e => handleFieldChange('minutes', e.target.value)}
            inputProps={{ min: minutesMin, max: minutesMax }}
            sx={{ width: 100 }}
            disabled={!enabled}
          />
        )}
      </Box>
  );
};

export default TimeInputGroup;