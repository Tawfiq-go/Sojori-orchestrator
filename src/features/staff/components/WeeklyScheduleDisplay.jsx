import React from 'react';
import { Tooltip, Chip } from '@mui/material';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F6B',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  gray: {
    100: '#F5F5F5',
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161',
  }
};

/**
 * Modern visual component to display staff weekly schedule in table
 */
const WeeklyScheduleDisplay = ({ schedule }) => {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <AlertCircle className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">Pas de planning</span>
      </div>
    );
  }

  // Calculate total weekly hours
  const totalHours = schedule.reduce((total, day) => {
    if (day.present && day.timings) {
      return total + day.timings.reduce((sum, timing) => sum + (timing.end - timing.start), 0);
    }
    return total;
  }, 0);

  // Count active days
  const activeDays = schedule.filter(day => day.present && day.timings && day.timings.length > 0).length;

  return (
    <div className="flex flex-col gap-2 py-1">
      {/* Quick Stats */}
      <div className="flex items-center gap-2">
        <Tooltip title={`${totalHours} heures / semaine sur ${activeDays} jours`} arrow>
          <Chip
            icon={<Clock className="w-3 h-3" />}
            label={`${totalHours}h`}
            size="small"
            sx={{
              height: '22px',
              fontSize: '11px',
              fontWeight: 600,
              background: totalHours > 35
                ? 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)'
                : totalHours > 20
                ? 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)'
                : 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
              color: 'white',
              '& .MuiChip-icon': {
                color: 'white',
              }
            }}
          />
        </Tooltip>

        <Tooltip title={`${activeDays} jours actifs`} arrow>
          <Chip
            icon={<Calendar className="w-3 h-3" />}
            label={`${activeDays}j`}
            size="small"
            sx={{
              height: '22px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: SOJORI_COLORS.gray[100],
              color: SOJORI_COLORS.gray[700],
              border: `1px solid ${SOJORI_COLORS.gray[300]}`,
              '& .MuiChip-icon': {
                color: SOJORI_COLORS.gray[700],
              }
            }}
          />
        </Tooltip>
      </div>

      {/* Visual Week Bar */}
      <div className="flex items-center gap-1">
        {schedule.map((day, index) => {
          const dayHours = day.present && day.timings
            ? day.timings.reduce((sum, timing) => sum + (timing.end - timing.start), 0)
            : 0;

          const dayAbbrev = day.day.substring(0, 2).toUpperCase();

          return (
            <Tooltip
              key={index}
              title={
                dayHours > 0
                  ? `${dayAbbrev}: ${day.timings.map(t => `${t.start}h-${t.end}h`).join(', ')} (${dayHours}h)`
                  : `${dayAbbrev}: Libre`
              }
              arrow
            >
              <div
                className="flex-1 rounded transition-all cursor-pointer hover:scale-110"
                style={{
                  height: dayHours > 0 ? `${Math.max(24, dayHours * 4)}px` : '20px',
                  minWidth: '28px',
                  background: dayHours > 0
                    ? `linear-gradient(135deg, rgba(255, 107, 53, ${0.5 + (dayHours / 20)}) 0%, rgba(229, 90, 43, ${0.5 + (dayHours / 20)}) 100%)`
                    : SOJORI_COLORS.gray[100],
                  border: `1px solid ${dayHours > 0 ? SOJORI_COLORS.primaryLight : SOJORI_COLORS.gray[300]}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <span
                  className="text-xs font-bold"
                  style={{
                    color: dayHours > 0 ? 'white' : SOJORI_COLORS.gray[500],
                    fontSize: '9px',
                  }}
                >
                  {dayAbbrev}
                </span>
                {dayHours > 0 && (
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: 'white',
                      fontSize: '8px',
                      marginTop: '2px',
                    }}
                  >
                    {dayHours}h
                  </span>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyScheduleDisplay;
