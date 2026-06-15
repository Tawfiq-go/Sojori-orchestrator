import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Chip, Switch, FormControlLabel, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Divider } from '@mui/material';
import { Calendar, Clock, Plus, Trash2, Save, Copy, X } from 'lucide-react';
import { updateStaffSimplified } from '../services/serverApi.staffSimplified';
import { toast } from 'react-toastify';
const DAYS_OF_WEEK = [{
  en: 'Monday',
  fr: 'Lundi'
}, {
  en: 'Tuesday',
  fr: 'Mardi'
}, {
  en: 'Wednesday',
  fr: 'Mercredi'
}, {
  en: 'Thursday',
  fr: 'Jeudi'
}, {
  en: 'Friday',
  fr: 'Vendredi'
}, {
  en: 'Saturday',
  fr: 'Samedi'
}, {
  en: 'Sunday',
  fr: 'Dimanche'
}];
const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#10B981',
  gray: {
    100: '#F3F4F6',
    200: '#E5E7EB'
  }
};

// Templates (alignés avec StaffDashboard) - slots simples + combo avec pause
const TEMPLATES = [{
  label: '24h / 24-24',
  slots: [{
    start: 0,
    end: 24
  }],
  icon: '🕛'
}, {
  label: 'Matin',
  slots: [{
    start: 8,
    end: 12
  }],
  icon: '🌅'
}, {
  label: 'Après-midi',
  slots: [{
    start: 14,
    end: 20
  }],
  icon: '☀️'
}, {
  label: 'Journée',
  slots: [{
    start: 9,
    end: 17
  }],
  icon: '📅'
}, {
  label: 'Soirée',
  slots: [{
    start: 18,
    end: 22
  }],
  icon: '🌙'
}, {
  label: '8h-12h + 14h-20h',
  slots: [{
    start: 8,
    end: 12
  }, {
    start: 14,
    end: 20
  }],
  icon: '⏸️'
}, {
  label: '8h-12h + 14h-18h',
  slots: [{
    start: 8,
    end: 12
  }, {
    start: 14,
    end: 18
  }],
  icon: '⏸️'
}];

// Timeline 0h → 24h (sélection fin = 24 = fin de journée)
const HOURS = Array.from({
  length: 25
}, (_, i) => i);
const StaffPlanningTab = ({
  staff,
  onScheduleSaved
}) => {
  const [schedule, setSchedule] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);
  useEffect(() => {
    if (!staff) return;
    const initialSchedule = {};
    DAYS_OF_WEEK.forEach(day => {
      const daySchedule = staff.schedule?.[day.en] || staff.schedule?.[day.fr];
      initialSchedule[day.en] = {
        available: daySchedule?.present || false,
        timings: daySchedule?.timings || []
      };
    });
    setSchedule(initialSchedule);
  }, [staff]);
  const toggleDayAvailability = dayEn => {
    setSchedule(prev => ({
      ...prev,
      [dayEn]: {
        ...prev[dayEn],
        available: !prev[dayEn]?.available,
        timings: !prev[dayEn]?.available ? [] : prev[dayEn]?.timings || []
      }
    }));
    setHasChanges(true);
  };
  const openPlanDialog = dayEn => {
    setSelectedDay(dayEn);
    setCustomStart(null);
    setCustomEnd(null);
    setDialogOpen(true);
  };
  const addTimingFromTemplate = template => {
    if (!selectedDay) return;
    const newTimings = template.slots.map(s => ({
      start: s.start,
      end: s.end
    }));
    const merged = [...(schedule[selectedDay]?.timings || []), ...newTimings].sort((a, b) => a.start - b.start);
    setSchedule(prev => ({
      ...prev,
      [selectedDay]: {
        available: true,
        timings: merged
      }
    }));
    setHasChanges(true);
    setDialogOpen(false);
  };
  const addCustomTiming = () => {
    if (!selectedDay || customStart === null || customEnd === null) return;
    if (customStart >= customEnd) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }
    const newTiming = {
      start: customStart,
      end: customEnd
    };
    setSchedule(prev => ({
      ...prev,
      [selectedDay]: {
        available: true,
        timings: [...(prev[selectedDay]?.timings || []), newTiming].sort((a, b) => a.start - b.start)
      }
    }));
    setHasChanges(true);
    setDialogOpen(false);
    setCustomStart(null);
    setCustomEnd(null);
  };
  const removeTiming = (dayEn, index) => {
    setSchedule(prev => ({
      ...prev,
      [dayEn]: {
        ...prev[dayEn],
        timings: prev[dayEn].timings.filter((_, i) => i !== index)
      }
    }));
    setHasChanges(true);
  };
  const copyDaySchedule = fromDay => {
    const sourceDaySchedule = schedule[fromDay];
    const otherDays = DAYS_OF_WEEK.filter(d => d.en !== fromDay).map(d => d.en);
    const newSchedule = {
      ...schedule
    };
    otherDays.forEach(day => {
      newSchedule[day] = {
        available: sourceDaySchedule.available,
        timings: [...sourceDaySchedule.timings]
      };
    });
    setSchedule(newSchedule);
    setHasChanges(true);
    toast.success('Planning copié sur tous les autres jours');
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      const formattedSchedule = {};
      DAYS_OF_WEEK.forEach(day => {
        formattedSchedule[day.en] = {
          present: schedule[day.en]?.available || false,
          timings: schedule[day.en]?.timings || []
        };
      });
      await updateStaffSimplified(staff.staffCode, {
        schedule: formattedSchedule
      });
      toast.success('Planning mis à jour avec succès');
      setHasChanges(false);
      onScheduleSaved?.();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde du planning');
    } finally {
      setSaving(false);
    }
  };
  const formatHour = val => {
    if (val === 24 || val === 24.0) return '24:00';
    const h = Math.floor(val);
    const m = val % 1 === 0.5 ? 30 : 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const calculateDayHours = timings => {
    return timings.reduce((total, timing) => total + (timing.end - timing.start), 0);
  };

  // Safety check - after all hooks
  if (!staff) {
    return <Box sx={{
      p: 2,
      textAlign: 'center',
      color: 'text.secondary'
    }}>
        <Typography>Aucun staff sélectionné</Typography>
      </Box>;
  }
  return <Box sx={{
    p: 2
  }}>
      {/* Header */}
      <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 3
    }}>
        <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
          <Calendar size={20} color={SOJORI_COLORS.primary} />
          <Typography variant="h6">Planning hebdomadaire</Typography>
        </Box>
        {hasChanges && <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSave} disabled={saving} sx={{
        bgcolor: SOJORI_COLORS.primary
      }}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>}
      </Box>

      {/* Grid 2 colonnes */}
      <Grid container spacing={2}>
        {DAYS_OF_WEEK.map(day => {
        const daySchedule = schedule[day.en] || {
          available: false,
          timings: []
        };
        const isAvailable = daySchedule.available;
        const totalHours = calculateDayHours(daySchedule.timings);
        return <Grid item xs={12} md={6} key={day.en}>
              <Paper sx={{
            p: 2,
            bgcolor: isAvailable ? 'white' : SOJORI_COLORS.gray[100],
            border: `1px solid ${isAvailable ? SOJORI_COLORS.success : SOJORI_COLORS.gray[200]}`
          }}>
                {/* Header du jour */}
                <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1
            }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {day.fr}
                  </Typography>
                  <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                    {isAvailable && totalHours > 0 && <Chip label={`${totalHours}h`} size="small" sx={{
                  bgcolor: SOJORI_COLORS.primary,
                  color: 'white'
                }} />}
                    <FormControlLabel control={<Switch checked={isAvailable} onChange={() => toggleDayAvailability(day.en)} sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: SOJORI_COLORS.success
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: SOJORI_COLORS.success
                  }
                }} />} label="" sx={{
                  m: 0
                }} />
                  </Box>
                </Box>

                {/* Créneaux horaires */}
                {isAvailable && <Box sx={{
              mt: 2
            }}>
                    {daySchedule.timings.length === 0 ? <Typography variant="caption" color="text.secondary" sx={{
                display: 'block',
                mb: 1
              }}>
                        Toute la journée (aucun créneau défini)
                      </Typography> : <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                mb: 1
              }}>
                        {daySchedule.timings.map((timing, idx) => <Box key={idx} sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  bgcolor: SOJORI_COLORS.gray[100],
                  borderRadius: 1
                }}>
                            <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                              <Clock size={14} color={SOJORI_COLORS.primary} />
                              <Typography variant="body2">
                                {formatHour(timing.start)} - {formatHour(timing.end)}
                              </Typography>
                              <Chip label={`${timing.end - timing.start}h`} size="small" />
                            </Box>
                            <IconButton size="small" onClick={() => removeTiming(day.en, idx)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Box>)}
                      </Box>}

                    {/* Boutons actions */}
                    <Box sx={{
                display: 'flex',
                gap: 1
              }}>
                      <Button size="small" startIcon={<Plus size={14} />} onClick={() => openPlanDialog(day.en)} sx={{
                  color: SOJORI_COLORS.primary
                }}>
                        Planifier un créneau
                      </Button>
                      {daySchedule.timings.length > 0 && <IconButton size="small" onClick={() => copyDaySchedule(day.en)} title="Copier sur tous les jours">
                          <Copy size={14} />
                        </IconButton>}
                    </Box>
                  </Box>}
              </Paper>
            </Grid>;
      })}
      </Grid>

      {/* Dialog "Planifier un créneau" */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
            <Typography variant="h6">
              Planifier un créneau - {DAYS_OF_WEEK.find(d => d.en === selectedDay)?.fr}
            </Typography>
            <IconButton onClick={() => setDialogOpen(false)}>
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Templates */}
          <Typography variant="subtitle2" sx={{
          mb: 2
        }}>
            Templates
          </Typography>
          <Grid container spacing={1} sx={{
          mb: 3
        }}>
            {TEMPLATES.map(template => <Grid item xs={6} key={template.label}>
                <Button fullWidth variant="outlined" onClick={() => addTimingFromTemplate(template)} sx={{
              py: 1.5,
              borderColor: SOJORI_COLORS.gray[200]
            }}>
                  <Box sx={{
                textAlign: 'center'
              }}>
                    <Typography sx={{
                  fontSize: '24px'
                }}>{template.icon}</Typography>
                    <Typography variant="caption">{template.label}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {template.slots.map(s => `${formatHour(s.start)}-${formatHour(s.end)}`).join(' / ')}
                    </Typography>
                  </Box>
                </Button>
              </Grid>)}
          </Grid>

          <Divider sx={{
          my: 2
        }} />

          {/* Horaire personnalisé avec timeline */}
          <Typography variant="subtitle2" sx={{
          mb: 2
        }}>
            Horaire personnalisé
          </Typography>

          {/* Timeline cliquable */}
          <Box sx={{
          mb: 2
        }}>
            <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5
          }}>
              {HOURS.map(hour => {
              const isStart = customStart === hour;
              const isEnd = customEnd === hour;
              const isInRange = customStart !== null && customEnd !== null && hour > customStart && hour < customEnd;
              return <Box key={hour} onClick={() => {
                if (customStart === null) {
                  setCustomStart(hour);
                } else if (customEnd === null && hour > customStart) {
                  setCustomEnd(hour);
                } else {
                  setCustomStart(hour);
                  setCustomEnd(null);
                }
              }} sx={{
                px: 1.5,
                py: 1,
                bgcolor: isStart || isEnd ? SOJORI_COLORS.primary : isInRange ? SOJORI_COLORS.gray[200] : 'white',
                color: isStart || isEnd ? 'white' : 'text.primary',
                border: `1px solid ${SOJORI_COLORS.gray[200]}`,
                borderRadius: 1,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: isStart || isEnd ? 'bold' : 'normal',
                '&:hover': {
                  bgcolor: isStart || isEnd ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[100]
                }
              }}>
                    {formatHour(hour)}
                  </Box>;
            })}
            </Box>
            {customStart !== null && <Typography variant="caption" sx={{
            mt: 1,
            display: 'block'
          }}>
                {customEnd === null ? `Début: ${formatHour(customStart)} - Cliquez sur l'heure de fin` : `${formatHour(customStart)} - ${formatHour(customEnd)} (${customEnd - customStart}h)`}
              </Typography>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button onClick={addCustomTiming} disabled={customStart === null || customEnd === null} variant="contained" sx={{
          bgcolor: SOJORI_COLORS.primary
        }}>
            Ajouter ce créneau
          </Button>
        </DialogActions>
      </Dialog>
    </Box>;
};
export default StaffPlanningTab;
