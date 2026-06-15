import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Chip, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStaffSimplified } from './services/serverApi.staffSimplified';
import { useSelector } from 'react-redux';
import { useAdminOwnerFilter } from 'context/AdminOwnerFilterContext';
import { toast } from 'react-toastify';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  gray: {
    50: '#FAFAFA',
    100: '#F3F4F6',
    200: '#E5E7EB',
    600: '#4B5563',
    700: '#374151'
  }
};
const DAYS_OF_WEEK = [{
  en: 'Monday',
  fr: 'Lun'
}, {
  en: 'Tuesday',
  fr: 'Mar'
}, {
  en: 'Wednesday',
  fr: 'Mer'
}, {
  en: 'Thursday',
  fr: 'Jeu'
}, {
  en: 'Friday',
  fr: 'Ven'
}, {
  en: 'Saturday',
  fr: 'Sam'
}, {
  en: 'Sunday',
  fr: 'Dim'
}];
const TeamPlanningPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const user = useSelector(state => state.auth.user);
  const { requestOwnerId } = useAdminOwnerFilter();
  useEffect(() => {
    loadStaff();
  }, [requestOwnerId]);
  const loadStaff = async () => {
    try {
      setLoading(true);
      const params = {
        page: 0,
        limit: 100,
        search_text: ''
      };
      if (requestOwnerId) {
        params.ownerId = requestOwnerId;
      }
      const response = await getStaffSimplified(params);
      setStaff(response.staff || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des staff membres');
    } finally {
      setLoading(false);
    }
  };
  const formatHour = hour => {
    return `${hour}:00`;
  };
  const calculateDayHours = timings => {
    if (!Array.isArray(timings)) return 0;
    return timings.reduce((total, timing) => total + (timing.end - timing.start), 0);
  };
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // Monday = 1
    const monday = new Date(today.setDate(today.getDate() + diff + currentWeekOffset * 7));
    return DAYS_OF_WEEK.map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        ...day,
        date: date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short'
        })
      };
    });
  };
  const weekDates = getWeekDates();
  const navigateWeek = direction => {
    setCurrentWeekOffset(prev => prev + direction);
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const activeStaff = staff.filter(s => s.isActive).length;
    const totalStaff = staff.length;
    const withSchedule = staff.filter(s => s.schedule && Object.keys(s.schedule).length > 0).length;

    // Total heures planifiées cette semaine
    let totalWeeklyHours = 0;
    staff.forEach(staffMember => {
      DAYS_OF_WEEK.forEach(day => {
        const daySchedule = staffMember.schedule?.[day.en];
        if (daySchedule?.present && Array.isArray(daySchedule?.timings)) {
          totalWeeklyHours += calculateDayHours(daySchedule.timings);
        }
      });
    });

    // Moyenne d'heures par staff
    const avgHoursPerStaff = activeStaff > 0 ? (totalWeeklyHours / activeStaff).toFixed(1) : 0;
    return {
      activeStaff,
      totalStaff,
      withSchedule,
      totalWeeklyHours,
      avgHoursPerStaff
    };
  };
  const kpis = calculateKPIs();
  if (loading) {
    return <DashboardLayout>
        <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
          <CircularProgress sx={{
          color: SOJORI_COLORS.primary
        }} />
        </Box>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <Box sx={{
      p: 3
    }}>
        {/* Header */}
        <Box sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
          <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
            <Calendar size={28} color={SOJORI_COLORS.primary} />
            <Typography variant="h4" fontWeight="bold">
              Planning d&apos;équipe
            </Typography>
            <Chip icon={<Users size={16} />} label={`${staff.length} membres`} sx={{
            bgcolor: SOJORI_COLORS.primary,
            color: 'white'
          }} />
          </Box>

          {/* Week Navigation */}
          <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
            <Tooltip title="Semaine précédente">
              <IconButton onClick={() => navigateWeek(-1)} sx={{
              bgcolor: SOJORI_COLORS.gray[100]
            }}>
                <ChevronLeft />
              </IconButton>
            </Tooltip>
            <Chip label={currentWeekOffset === 0 ? 'Cette semaine' : `Semaine ${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset}`} sx={{
            minWidth: '150px',
            fontWeight: 'bold'
          }} />
            <Tooltip title="Semaine suivante">
              <IconButton onClick={() => navigateWeek(1)} sx={{
              bgcolor: SOJORI_COLORS.gray[100]
            }}>
                <ChevronRight />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* KPIs Row */}
        <Box sx={{
        mb: 3,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 2
      }}>
          <Paper sx={{
          p: 2,
          bgcolor: 'white',
          border: `2px solid ${SOJORI_COLORS.success}`
        }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              STAFF ACTIFS
            </Typography>
            <Box sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            mt: 0.5
          }}>
              <Typography variant="h3" fontWeight="bold" color={SOJORI_COLORS.success}>
                {kpis.activeStaff}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                / {kpis.totalStaff} total
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{
          p: 2,
          bgcolor: 'white',
          border: `2px solid ${SOJORI_COLORS.primary}`
        }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              HEURES PLANIFIÉES (SEMAINE)
            </Typography>
            <Box sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            mt: 0.5
          }}>
              <Typography variant="h3" fontWeight="bold" color={SOJORI_COLORS.primary}>
                {kpis.totalWeeklyHours}h
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{
          p: 2,
          bgcolor: 'white',
          border: `2px solid ${SOJORI_COLORS.info}`
        }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              MOYENNE HEURES / STAFF
            </Typography>
            <Box sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            mt: 0.5
          }}>
              <Typography variant="h3" fontWeight="bold" color={SOJORI_COLORS.info}>
                {kpis.avgHoursPerStaff}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                / semaine
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{
          p: 2,
          bgcolor: 'white',
          border: `2px solid ${SOJORI_COLORS.warning}`
        }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              AVEC PLANNING
            </Typography>
            <Box sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            mt: 0.5
          }}>
              <Typography variant="h3" fontWeight="bold" color={SOJORI_COLORS.warning}>
                {kpis.withSchedule}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                / {kpis.totalStaff}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Planning Grid */}
        <Paper sx={{
        overflow: 'auto'
      }}>
          <Box sx={{
          minWidth: '800px'
        }}>
            {/* Header Row - Days */}
            <Box sx={{
            display: 'grid',
            gridTemplateColumns: '200px repeat(7, 1fr)',
            borderBottom: `2px solid ${SOJORI_COLORS.gray[200]}`,
            bgcolor: SOJORI_COLORS.gray[50]
          }}>
              <Box sx={{
              p: 2,
              borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`
            }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Staff membre
                </Typography>
              </Box>
              {weekDates.map(day => <Box key={day.en} sx={{
              p: 2,
              textAlign: 'center',
              borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`
            }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {day.fr}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {day.date}
                  </Typography>
                </Box>)}
            </Box>

            {/* Staff Rows */}
            {staff.length === 0 ? <Box sx={{
            p: 4,
            textAlign: 'center'
          }}>
                <Typography color="text.secondary">Aucun staff membre trouvé</Typography>
              </Box> : staff.map((staffMember, index) => <Box key={staffMember.staffCode} sx={{
            display: 'grid',
            gridTemplateColumns: '200px repeat(7, 1fr)',
            borderBottom: `1px solid ${SOJORI_COLORS.gray[200]}`,
            '&:hover': {
              bgcolor: SOJORI_COLORS.gray[50]
            }
          }}>
                  {/* Staff Name */}
                  <Box sx={{
              p: 2,
              borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5
            }}>
                    <Typography variant="body2" fontWeight="bold">
                      {staffMember.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {staffMember.staffCode}
                    </Typography>
                    <Box sx={{
                display: 'flex',
                gap: 0.5,
                flexWrap: 'wrap'
              }}>
                      {staffMember.isActive ? <Chip label="Actif" size="small" sx={{
                  bgcolor: SOJORI_COLORS.success,
                  color: 'white',
                  fontSize: '0.65rem'
                }} /> : <Chip label="Inactif" size="small" sx={{
                  bgcolor: SOJORI_COLORS.gray[600],
                  color: 'white',
                  fontSize: '0.65rem'
                }} />}
                    </Box>
                  </Box>

                  {/* Days */}
                  {DAYS_OF_WEEK.map(day => {
              const daySchedule = staffMember.schedule?.[day.en];
              const isAvailable = daySchedule?.present || false;
              const timings = daySchedule?.timings || [];
              const totalHours = calculateDayHours(timings);
              return <Box key={day.en} sx={{
                p: 1,
                borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`,
                bgcolor: isAvailable ? 'white' : SOJORI_COLORS.gray[50],
                minHeight: '80px'
              }}>
                        {isAvailable ? <>
                            {timings.length === 0 ? <Typography variant="caption" sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: SOJORI_COLORS.success,
                    fontWeight: 'bold',
                    py: 2
                  }}>
                                Toute la journée
                              </Typography> : <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5
                  }}>
                                {timings.map((timing, idx) => <Box key={idx} sx={{
                      p: 0.5,
                      bgcolor: SOJORI_COLORS.info + '20',
                      borderRadius: 1,
                      border: `1px solid ${SOJORI_COLORS.info}`
                    }}>
                                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}>
                                      <Clock size={10} color={SOJORI_COLORS.info} />
                                      <Typography variant="caption" sx={{
                          fontSize: '0.7rem'
                        }}>
                                        {formatHour(timing.start)} - {formatHour(timing.end)}
                                      </Typography>
                                    </Box>
                                  </Box>)}
                                {totalHours > 0 && <Chip label={`${totalHours}h`} size="small" sx={{
                      bgcolor: SOJORI_COLORS.primary,
                      color: 'white',
                      fontSize: '0.65rem',
                      height: '18px',
                      mt: 0.5
                    }} />}
                              </Box>}
                          </> : <Typography variant="caption" sx={{
                  display: 'block',
                  textAlign: 'center',
                  color: SOJORI_COLORS.gray[600],
                  py: 2
                }}>
                            -
                          </Typography>}
                      </Box>;
            })}
                </Box>)}
          </Box>
        </Paper>
      </Box>
    </DashboardLayout>;
};
export default TeamPlanningPage;
