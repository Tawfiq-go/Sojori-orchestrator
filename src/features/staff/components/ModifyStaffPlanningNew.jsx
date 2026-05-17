import React, { useState } from 'react';
import {
  IconButton,
  Box,
  Typography,
  Button,
  CircularProgress,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import * as Yup from 'yup';
import { updateStaffPlannig } from '../services/serverApi.task';
import { X, Plus, Copy, Trash2, Clock, Calendar as CalendarIcon, Save } from 'lucide-react';
import { Formik, Form } from 'formik';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  ENGLISH_DAYS,
  createDefaultEnglishSchedule,
  normalizeScheduleToEnglish,
  toEnglishDay
} from '../../../utils/dayNameUtils';

const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F6B',
  primaryPale: '#FFF3E0',
  success: '#4CAF50',
  info: '#2196F3',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
};

// Hours for the timeline (7am to 11pm)
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7 to 23

const validationSchema = (t) => Yup.object().shape({
  schedule: Yup.array().of(
    Yup.object().shape({
      present: Yup.boolean(),
      timings: Yup.array().of(
        Yup.object().shape({
          start: Yup.number().min(0).max(24).required(t('Start time is required')),
          end: Yup.number().min(0).max(24).required(t('End time is required')),
        }),
      ),
    }),
  ),
});

const ModifyStaffPlanningNew = ({ open, handleClose, staff, onStaffUpdate }) => {
  const { t } = useTranslation('common');
  const daysOfWeek = ENGLISH_DAYS;
  const [selectedDay, setSelectedDay] = useState(null);
  const [copyMenuAnchor, setCopyMenuAnchor] = useState(null);
  const [dayToCopy, setDayToCopy] = useState(null);

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    const normalizedSchedule = normalizeScheduleToEnglish(values.schedule);

    updateStaffPlannig({
      staffId: staff._id,
      schedule: normalizedSchedule,
    })
      .then(({ data }) => {
        onStaffUpdate(staff._id, data.planning);
        toast.success(t('Staff planning updated successfully'));
        handleClose();
      })
      .catch((error) => {
        if (error.response?.data?.errors) {
          const serverErrors = {};
          error.response.data.errors.forEach((err) => {
            serverErrors[err.path[0]] = err.message;
          });
          setErrors(serverErrors);
          toast.error(serverErrors[Object.keys(serverErrors)[0]]);
        } else {
          toast.error(t('Error updating planning'));
        }
      })
      .finally(() => setSubmitting(false));
  };

  const defaultSchedule = createDefaultEnglishSchedule();

  // Calculate total hours for a day
  const calculateDayHours = (timings) => {
    return timings.reduce((total, timing) => {
      return total + (timing.end - timing.start);
    }, 0);
  };

  // Check if time block overlaps with existing timings
  const hasOverlap = (timings, start, end) => {
    return timings.some(timing =>
      (start >= timing.start && start < timing.end) ||
      (end > timing.start && end <= timing.end) ||
      (start <= timing.start && end >= timing.end)
    );
  };

  // Add time block to a day
  const addTimeBlock = (values, setFieldValue, dayIndex, start, end) => {
    const day = values.schedule[dayIndex];

    if (!day.present) {
      setFieldValue(`schedule.${dayIndex}.present`, true);
    }

    if (hasOverlap(day.timings, start, end)) {
      toast.warning(t('Time slot overlaps with existing schedule'));
      return;
    }

    const newTimings = [...day.timings, { start, end }].sort((a, b) => a.start - b.start);
    setFieldValue(`schedule.${dayIndex}.timings`, newTimings);
  };

  // Copy day schedule to other days
  const copyDaySchedule = (values, setFieldValue, fromDayIndex, toDayIndices) => {
    const sourceDay = values.schedule[fromDayIndex];

    toDayIndices.forEach(toDayIndex => {
      setFieldValue(`schedule.${toDayIndex}.present`, sourceDay.present);
      setFieldValue(`schedule.${toDayIndex}.timings`, [...sourceDay.timings]);
    });

    toast.success(t('Schedule copied successfully'));
  };

  // Clear day schedule
  const clearDaySchedule = (values, setFieldValue, dayIndex) => {
    setFieldValue(`schedule.${dayIndex}.present`, false);
    setFieldValue(`schedule.${dayIndex}.timings`, []);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1300,
          overflow: 'hidden',
        }}
        onClick={handleClose}
      />

      {/* Sidebar Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '90vw',
          maxWidth: '1200px',
          backgroundColor: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
          boxShadow: '0 4px 6px rgba(255, 107, 53, 0.1)',
        }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'white',
                margin: 0,
                marginBottom: '4px'
              }}>
                {t('Weekly Planning')}
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: 0
              }}>
                {staff?.name || t('Staff Member')}
              </p>
            </div>
          </div>
          <IconButton
            onClick={handleClose}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              }
            }}
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        <Formik
          initialValues={{
            schedule: staff?.staffPlanning?.schedule
              ? daysOfWeek.map(
                  (day) => {
                    const existingSchedule = staff.staffPlanning.schedule.find((s) =>
                      toEnglishDay(s.day) === day
                    );
                    return existingSchedule || {
                      day,
                      present: false,
                      timings: [],
                    };
                  },
                )
              : defaultSchedule,
          }}
          validationSchema={validationSchema(t)}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <>
              {/* Main Content */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <Form id="staff-planning-form">
                  <div className="p-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900">
                              {values.schedule.reduce((total, day) => total + calculateDayHours(day.timings), 0)}h
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Total hebdomadaire</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900">
                              {values.schedule.filter(day => day.present).length}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Jours actifs</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900">
                              {values.schedule.filter(day => day.present).length > 0
                                ? Math.round(values.schedule.reduce((total, day) => total + calculateDayHours(day.timings), 0) /
                                    values.schedule.filter(day => day.present).length * 10) / 10
                                : 0}h
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Moyenne par jour</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Weekly Calendar Grid */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                      {/* Days Header */}
                      <div className="grid grid-cols-8 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                        <div className="p-4 border-r border-slate-200">
                          <span className="text-xs font-semibold text-slate-500">TIME</span>
                        </div>
                        {values.schedule.map((day, dayIndex) => (
                          <div
                            key={dayIndex}
                            className="p-4 border-r border-slate-200 last:border-r-0"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">
                                {t(day.day.charAt(0).toUpperCase() + day.day.slice(1))}
                              </span>
                              {day.present && (
                                <Chip
                                  label={`${calculateDayHours(day.timings)}h`}
                                  size="small"
                                  sx={{
                                    height: '20px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
                                    color: 'white',
                                  }}
                                />
                              )}

                              {/* Day Actions */}
                              <div className="flex gap-1">
                                <Tooltip title={t('Add 9-17 shift')}>
                                  <IconButton
                                    size="small"
                                    onClick={() => addTimeBlock(values, setFieldValue, dayIndex, 9, 17)}
                                    sx={{
                                      width: '24px',
                                      height: '24px',
                                      color: SOJORI_COLORS.primary,
                                      '&:hover': { backgroundColor: SOJORI_COLORS.primaryPale }
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('Copy to...')}>
                                  <IconButton
                                    size="small"
                                    disabled={!day.present}
                                    onClick={(e) => {
                                      setDayToCopy(dayIndex);
                                      setCopyMenuAnchor(e.currentTarget);
                                    }}
                                    sx={{
                                      width: '24px',
                                      height: '24px',
                                      color: SOJORI_COLORS.info,
                                      '&:hover': { backgroundColor: '#e3f2fd' }
                                    }}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('Clear')}>
                                  <IconButton
                                    size="small"
                                    disabled={!day.present}
                                    onClick={() => clearDaySchedule(values, setFieldValue, dayIndex)}
                                    sx={{
                                      width: '24px',
                                      height: '24px',
                                      color: '#f44336',
                                      '&:hover': { backgroundColor: '#ffebee' }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </IconButton>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Time Grid */}
                      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 450px)' }}>
                        {HOURS.map((hour) => (
                          <div key={hour} className="grid grid-cols-8 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            {/* Hour Label */}
                            <div className="p-3 border-r border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                              <span className="text-xs font-medium text-slate-600">
                                {hour}:00
                              </span>
                            </div>

                            {/* Day Cells */}
                            {values.schedule.map((day, dayIndex) => {
                              const blockInThisHour = day.timings.find(
                                timing => hour >= timing.start && hour < timing.end
                              );
                              const isBlockStart = day.timings.find(
                                timing => hour === timing.start
                              );

                              return (
                                <div
                                  key={dayIndex}
                                  className="relative border-r border-slate-200 last:border-r-0 min-h-[60px] cursor-pointer group"
                                  onClick={() => {
                                    if (!blockInThisHour && day.present) {
                                      addTimeBlock(values, setFieldValue, dayIndex, hour, hour + 1);
                                    }
                                  }}
                                  style={{
                                    backgroundColor: blockInThisHour
                                      ? 'rgba(255, 107, 53, 0.1)'
                                      : 'transparent',
                                  }}
                                >
                                  {/* Time Block */}
                                  {isBlockStart && (
                                    <div
                                      className="absolute inset-0 rounded-lg m-1 p-2 shadow-sm border-l-4 group-hover:shadow-md transition-all"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.9) 0%, rgba(229, 90, 43, 0.9) 100%)',
                                        borderLeftColor: SOJORI_COLORS.primaryDark,
                                        height: `${(isBlockStart.end - isBlockStart.start) * 60}px`,
                                        zIndex: 10,
                                      }}
                                    >
                                      <div className="flex items-start justify-between h-full">
                                        <div className="text-white">
                                          <div className="text-xs font-bold mb-1">
                                            {isBlockStart.start}:00 - {isBlockStart.end}:00
                                          </div>
                                          <div className="text-xs opacity-90">
                                            {isBlockStart.end - isBlockStart.start}h
                                          </div>
                                        </div>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newTimings = day.timings.filter(t => t !== isBlockStart);
                                            setFieldValue(`schedule.${dayIndex}.timings`, newTimings);
                                            if (newTimings.length === 0) {
                                              setFieldValue(`schedule.${dayIndex}.present`, false);
                                            }
                                          }}
                                          sx={{
                                            color: 'white',
                                            padding: '2px',
                                            '&:hover': {
                                              backgroundColor: 'rgba(255, 255, 255, 0.2)'
                                            }
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </IconButton>
                                      </div>
                                    </div>
                                  )}

                                  {/* Hover indicator for empty cells */}
                                  {!blockInThisHour && day.present && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Plus className="w-4 h-4 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Templates */}
                    <div className="mt-6 bg-white rounded-xl p-4 border border-slate-200">
                      <div className="text-sm font-semibold text-gray-700 mb-3">⚡ Templates rapides</div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            values.schedule.forEach((_, dayIndex) => {
                              if (dayIndex < 5) { // Monday to Friday
                                setFieldValue(`schedule.${dayIndex}.present`, true);
                                setFieldValue(`schedule.${dayIndex}.timings`, [{ start: 9, end: 17 }]);
                              }
                            });
                            toast.success('Template 9-17 (Lun-Ven) appliqué');
                          }}
                          sx={{
                            borderColor: SOJORI_COLORS.primary,
                            color: SOJORI_COLORS.primary,
                            '&:hover': {
                              backgroundColor: SOJORI_COLORS.primaryPale,
                              borderColor: SOJORI_COLORS.primaryDark,
                            }
                          }}
                        >
                          9-17 (Lun-Ven)
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            values.schedule.forEach((_, dayIndex) => {
                              if (dayIndex < 5) {
                                setFieldValue(`schedule.${dayIndex}.present`, true);
                                setFieldValue(`schedule.${dayIndex}.timings`, [{ start: 8, end: 16 }]);
                              }
                            });
                            toast.success('Template 8-16 (Lun-Ven) appliqué');
                          }}
                          sx={{
                            borderColor: SOJORI_COLORS.info,
                            color: SOJORI_COLORS.info,
                            '&:hover': {
                              backgroundColor: '#e3f2fd',
                              borderColor: SOJORI_COLORS.info,
                            }
                          }}
                        >
                          8-16 (Lun-Ven)
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            values.schedule.forEach((_, dayIndex) => {
                              setFieldValue(`schedule.${dayIndex}.present`, true);
                              setFieldValue(`schedule.${dayIndex}.timings`, [{ start: 10, end: 18 }]);
                            });
                            toast.success('Template 10-18 (Tous les jours) appliqué');
                          }}
                          sx={{
                            borderColor: SOJORI_COLORS.success,
                            color: SOJORI_COLORS.success,
                            '&:hover': {
                              backgroundColor: '#e8f5e9',
                              borderColor: SOJORI_COLORS.success,
                            }
                          }}
                        >
                          10-18 (7j/7)
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => {
                            values.schedule.forEach((_, dayIndex) => {
                              setFieldValue(`schedule.${dayIndex}.present`, false);
                              setFieldValue(`schedule.${dayIndex}.timings`, []);
                            });
                            toast.info('Planning réinitialisé');
                          }}
                        >
                          Tout effacer
                        </Button>
                      </div>
                    </div>
                  </div>
                </Form>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '20px 24px',
                borderTop: `2px solid ${SOJORI_COLORS.gray[200]}`,
                backgroundColor: 'white',
                boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.05)',
              }}>
                <Button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderColor: SOJORI_COLORS.gray[300],
                    color: SOJORI_COLORS.gray[700],
                    '&:hover': {
                      borderColor: SOJORI_COLORS.gray[400],
                      backgroundColor: SOJORI_COLORS.gray[50],
                    }
                  }}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  type="submit"
                  form="staff-planning-form"
                  disabled={isSubmitting}
                  variant="contained"
                  startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Save className="w-4 h-4" />}
                  sx={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
                    color: 'white',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #E55A2B 0%, #D14520 100%)',
                      boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
                    }
                  }}
                >
                  {isSubmitting ? t('Updating...') : t('Save Planning')}
                </Button>
              </div>

              {/* Copy Menu */}
              <Menu
                anchorEl={copyMenuAnchor}
                open={Boolean(copyMenuAnchor)}
                onClose={() => setCopyMenuAnchor(null)}
              >
                <MenuItem disabled sx={{ fontSize: '12px', fontWeight: 600, color: SOJORI_COLORS.gray[600] }}>
                  Copier vers:
                </MenuItem>
                {values.schedule.map((day, dayIndex) => (
                  dayIndex !== dayToCopy && (
                    <MenuItem
                      key={dayIndex}
                      onClick={() => {
                        copyDaySchedule(values, setFieldValue, dayToCopy, [dayIndex]);
                        setCopyMenuAnchor(null);
                      }}
                      sx={{ fontSize: '14px' }}
                    >
                      {t(day.day.charAt(0).toUpperCase() + day.day.slice(1))}
                    </MenuItem>
                  )
                ))}
                <MenuItem
                  onClick={() => {
                    const allOtherDays = values.schedule
                      .map((_, idx) => idx)
                      .filter(idx => idx !== dayToCopy);
                    copyDaySchedule(values, setFieldValue, dayToCopy, allOtherDays);
                    setCopyMenuAnchor(null);
                  }}
                  sx={{ fontSize: '14px', fontWeight: 600, color: SOJORI_COLORS.primary }}
                >
                  Tous les autres jours
                </MenuItem>
              </Menu>
            </>
          )}
        </Formik>
      </div>
    </>
  );
};

export default ModifyStaffPlanningNew;
