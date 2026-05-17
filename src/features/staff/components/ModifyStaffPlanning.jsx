import React from 'react';
import {
  IconButton,
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import * as Yup from 'yup';
import { updateStaffPlannig } from '../services/serverApi.task';
import { Calendar, X, Plus, Trash } from 'lucide-react';
import { Formik, Form, Field, FieldArray } from 'formik';
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
  primaryPale: '#FFF3E0',
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

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 2px 4px rgba(255, 107, 53, 0.2)',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
    transform: 'translateY(-1px)',
  },
}));

const ResetButton = styled(Button)(({ theme }) => ({
  backgroundColor: 'white',
  color: SOJORI_COLORS.gray[600],
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'none',
  border: `1px solid ${SOJORI_COLORS.gray[300]}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.gray[50],
    borderColor: SOJORI_COLORS.gray[400],
    transform: 'translateY(-1px)',
  },
}));

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

const ModifyStaffPlanning = ({ open, handleClose, staff, onStaffUpdate }) => {
  const { t } = useTranslation('common');

  const daysOfWeek = ENGLISH_DAYS;

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

  if (!open) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1300,
          overflow: 'hidden',
        }}
        onClick={handleClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '600px',
          backgroundColor: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: `1px solid ${SOJORI_COLORS.gray[200]}`,
          backgroundColor: 'white'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: SOJORI_COLORS.gray[900],
            margin: 0
          }}>
            {t('Update Staff Planning')}
          </h2>
          <IconButton 
            onClick={handleClose}
            sx={{ 
              color: SOJORI_COLORS.gray[600],
              '&:hover': { 
                backgroundColor: SOJORI_COLORS.gray[100],
                color: SOJORI_COLORS.primary,
              } 
            }}
          >
            <X sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        </div>

        <Formik
          initialValues={{
            schedule: staff?.staffPlanning?.schedule
              ? daysOfWeek.map(
                  (day) => {
                    // Find existing schedule for this day (handle both English and French)
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
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '16px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: `${SOJORI_COLORS.primary} ${SOJORI_COLORS.gray[100]}`,
                }}
              >
                <Form id="staff-planning-form" className="space-y-4">
                  <FieldArray name="schedule">
                    {() => (
                      <Box className="space-y-4">
                        {values.schedule.map((day, index) => (
                          <Box
                            key={index}
                            sx={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              padding: '16px',
                              backgroundColor: '#f9fafb',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s ease-in-out',
                              marginBottom: '10px',
                              '&:hover': {
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                backgroundColor: '#ffffff',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: day.present ? '16px' : '0',
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 600,
                                  color: '#374151',
                                  fontSize: '16px',
                                }}
                              >
                                {t(day.day.charAt(0).toUpperCase() + day.day.slice(1))}
                              </Typography>
                              <Checkbox
                                checked={day.present}
                                onChange={(e) =>
                                  setFieldValue(
                                    `schedule.${index}.present`,
                                    e.target.checked,
                                  )
                                }
                                name={`schedule.${index}.present`}
                                sx={{
                                  color: SOJORI_COLORS.primary,
                                  '&.Mui-checked': {
                                    color: SOJORI_COLORS.primary,
                                  },
                                }}
                              />
                            </Box>

                            {day.present && (
                              <FieldArray name={`schedule.${index}.timings`}>
                                {({ push, remove }) => (
                                  <Box>
                                    {day.timings.map((time, timeIndex) => (
                                      <Box
                                        key={timeIndex}
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '12px',
                                          marginBottom: '12px',
                                          padding: '8px',
                                          backgroundColor: '#ffffff',
                                          borderRadius: '8px',
                                          border: '1px solid #e5e7eb',
                                        }}
                                      >
                                        <Field
                                          as={TextField}
                                          type="number"
                                          name={`schedule.${index}.timings.${timeIndex}.start`}
                                          label={t('Start')}
                                          variant="outlined"
                                          size="small"
                                          sx={{
                                            width: '80px',
                                            '& .MuiOutlinedInput-root': {
                                              borderRadius: '6px',
                                            },
                                          }}
                                        />
                                        <Field
                                          as={TextField}
                                          type="number"
                                          name={`schedule.${index}.timings.${timeIndex}.end`}
                                          label={t('End')}
                                          variant="outlined"
                                          size="small"
                                          sx={{
                                            width: '80px',
                                            '& .MuiOutlinedInput-root': {
                                              borderRadius: '6px',
                                            },
                                          }}
                                        />
                                        <IconButton
                                          onClick={() => remove(timeIndex)}
                                          color="error"
                                          size="small"
                                          sx={{
                                            '&:hover': {
                                              backgroundColor: '#fee2e2',
                                            },
                                          }}
                                        >
                                          <Trash className="w-4 h-4" />
                                        </IconButton>
                                      </Box>
                                    ))}
                                    <Button
                                      onClick={() => push({ start: '', end: '' })}
                                      startIcon={<Plus className="w-4 h-4" />}
                                      variant="outlined"
                                      size="small"
                                      sx={{
                                        marginTop: '8px',
                                        borderColor: SOJORI_COLORS.primary,
                                        color: SOJORI_COLORS.primary,
                                        '&:hover': {
                                          backgroundColor: SOJORI_COLORS.primary,
                                          color: '#ffffff',
                                        },
                                      }}
                                    >
                                      {t('Add Timing')}
                                    </Button>
                                  </Box>
                                )}
                              </FieldArray>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </FieldArray>
                </Form>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '16px',
                borderTop: `1px solid ${SOJORI_COLORS.gray[200]}`,
                backgroundColor: 'white'
              }}>
                <ResetButton
                  onClick={handleClose}
                  disabled={isSubmitting}
                  sx={{ flex: 1 }}
                >
                  {t('Cancel')}
                </ResetButton>
                <StyledButton
                  type="submit"
                  form="staff-planning-form"
                  disabled={isSubmitting}
                  sx={{ flex: 1 }}
                >
                  {isSubmitting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CircularProgress size={16} color="inherit" />
                      {t('Updating...')}
                    </div>
                  ) : (
                    t('Update Planning')
                  )}
                </StyledButton>
              </div>
            </>
          )}
        </Formik>
      </div>
    </>
  );
};

export default ModifyStaffPlanning;