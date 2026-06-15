import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, Alert, Grid, Card, CardContent, Divider } from '@mui/material';
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { getStaffAssignments } from '../services/serverApi.staffSimplified';
const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray: {
    100: '#F3F4F6',
    200: '#E5E7EB',
    600: '#4B5563'
  }
};
const STATUS_CONFIG = {
  assigned: {
    label: 'Assigné',
    color: SOJORI_COLORS.info,
    icon: AlertCircle
  },
  accepted: {
    label: 'Accepté',
    color: SOJORI_COLORS.primary,
    icon: CheckCircle
  },
  in_progress: {
    label: 'En cours',
    color: SOJORI_COLORS.warning,
    icon: Clock
  },
  completed: {
    label: 'Terminé',
    color: SOJORI_COLORS.success,
    icon: CheckCircle
  },
  cancelled: {
    label: 'Annulé',
    color: SOJORI_COLORS.gray[600],
    icon: XCircle
  },
  rejected: {
    label: 'Refusé',
    color: SOJORI_COLORS.error,
    icon: XCircle
  }
};
const TASK_CATEGORIES = {
  ARRIVAL: {
    label: 'Arrivée',
    icon: '🚪',
    color: '#3B82F6'
  },
  DEPARTURE: {
    label: 'Départ',
    icon: '🚪',
    color: '#8B5CF6'
  },
  CLEANING: {
    label: 'Ménage',
    icon: '🧹',
    color: '#10B981'
  },
  TRANSPORT: {
    label: 'Transport',
    icon: '🚗',
    color: '#F59E0B'
  },
  GROCERIES: {
    label: 'Courses',
    icon: '🛒',
    color: '#EC4899'
  },
  SUPPORT: {
    label: 'Assistance',
    icon: '🆘',
    color: '#EF4444'
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon: '🔧',
    color: '#6B7280'
  },
  CUSTOM: {
    label: 'Personnalisé',
    icon: '✨',
    color: '#14B8A6'
  }
};

/**
 * Tab to display staff assignments (tasks assigned to the staff member)
 */
const StaffAssignmentsTab = ({
  staff
}) => {
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('week'); // 'week' | 'month'

  useEffect(() => {
    if (!staff) return;
    loadAssignments();
  }, [staff?.staffCode, dateRange]);
  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      let endDate;
      if (dateRange === 'week') {
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);
        endDate = weekLater.toISOString().split('T')[0];
      } else {
        const monthLater = new Date(today);
        monthLater.setMonth(monthLater.getMonth() + 1);
        endDate = monthLater.toISOString().split('T')[0];
      }
      const response = await getStaffAssignments(staff.staffCode, startDate, endDate);
      setAssignments(response.data || []);
      setStats(response.stats || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des assignments');
    } finally {
      setLoading(false);
    }
  };
  const formatDate = dateString => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };
  const groupAssignmentsByDate = () => {
    const grouped = {};
    assignments.forEach(assignment => {
      const dateKey = assignment.date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(assignment);
    });
    return grouped;
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
  if (loading) {
    return <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      p: 4
    }}>
        <CircularProgress />
      </Box>;
  }
  if (error) {
    return <Alert severity="error" sx={{
      m: 2
    }}>
        {error}
      </Alert>;
  }
  const groupedAssignments = groupAssignmentsByDate();
  const dateKeys = Object.keys(groupedAssignments).sort();
  return <Box sx={{
    p: 2
  }}>
      {/* Header with stats */}
      <Box sx={{
      mb: 3
    }}>
        <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
      }}>
          <Typography variant="h6" fontWeight="bold">
            Assignments ({dateRange === 'week' ? '7 prochains jours' : '30 prochains jours'})
          </Typography>
          <Box sx={{
          display: 'flex',
          gap: 1
        }}>
            <Chip label="7 jours" onClick={() => setDateRange('week')} color={dateRange === 'week' ? 'primary' : 'default'} sx={{
            bgcolor: dateRange === 'week' ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[100],
            color: dateRange === 'week' ? 'white' : 'inherit'
          }} />
            <Chip label="30 jours" onClick={() => setDateRange('month')} color={dateRange === 'month' ? 'primary' : 'default'} sx={{
            bgcolor: dateRange === 'month' ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[100],
            color: dateRange === 'month' ? 'white' : 'inherit'
          }} />
          </Box>
        </Box>

        {/* Stats Cards */}
        {stats && <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Paper sx={{
            p: 2,
            textAlign: 'center',
            bgcolor: SOJORI_COLORS.gray[100]
          }}>
                <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.primary}>
                  {stats.totalTasks || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total tâches
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{
            p: 2,
            textAlign: 'center',
            bgcolor: SOJORI_COLORS.gray[100]
          }}>
                <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.info}>
                  {Object.keys(stats.tasksByDay || {}).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Jours avec tâches
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{
            p: 2,
            textAlign: 'center',
            bgcolor: SOJORI_COLORS.gray[100]
          }}>
                <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.warning}>
                  {Math.round((stats.totalTasks || 0) / Math.max(Object.keys(stats.tasksByDay || {}).length, 1) * 10) / 10}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Moy. tâches/jour
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{
            p: 2,
            textAlign: 'center',
            bgcolor: SOJORI_COLORS.gray[100]
          }}>
                <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.success}>
                  {Math.max(...Object.values(stats.tasksByDay || {
                0: 0
              }))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Max tâches/jour
                </Typography>
              </Paper>
            </Grid>
          </Grid>}
      </Box>

      {/* Assignments grouped by date */}
      {dateKeys.length === 0 ? <Box sx={{
      textAlign: 'center',
      py: 4
    }}>
          <Calendar size={48} style={{
        opacity: 0.3
      }} />
          <Typography variant="body2" color="text.secondary" sx={{
        mt: 2
      }}>
            Aucun assignment pour les {dateRange === 'week' ? '7' : '30'} prochains jours
          </Typography>
        </Box> : <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }}>
          {dateKeys.map(dateKey => {
        const dayAssignments = groupedAssignments[dateKey];
        return <Box key={dateKey}>
                {/* Date Header */}
                <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
            pb: 1,
            borderBottom: `2px solid ${SOJORI_COLORS.primary}`
          }}>
                  <Calendar size={20} color={SOJORI_COLORS.primary} />
                  <Typography variant="subtitle1" fontWeight="bold" color={SOJORI_COLORS.primary}>
                    {formatDate(dateKey)}
                  </Typography>
                  <Chip label={`${dayAssignments.length} tâche${dayAssignments.length > 1 ? 's' : ''}`} size="small" sx={{
              bgcolor: SOJORI_COLORS.primary,
              color: 'white'
            }} />
                </Box>

                {/* Assignments for this day */}
                <Grid container spacing={2}>
                  {dayAssignments.map(assignment => {
              const statusConfig = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.assigned;
              const StatusIcon = statusConfig.icon;
              const categoryConfig = TASK_CATEGORIES[assignment.category] || TASK_CATEGORIES.CUSTOM;
              return <Grid item xs={12} md={6} key={assignment._id}>
                        <Card variant="outlined" sx={{
                  '&:hover': {
                    boxShadow: 2
                  }
                }}>
                          <CardContent>
                            {/* Task Header */}
                            <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1.5
                    }}>
                              <Box>
                                <Chip label={categoryConfig.label} icon={<span>{categoryConfig.icon}</span>} size="small" sx={{
                          bgcolor: categoryConfig.color,
                          color: 'white',
                          mb: 1
                        }} />
                                <Typography variant="body2" fontWeight="bold">
                                  {assignment.taskId || 'Tâche'}
                                </Typography>
                              </Box>
                              <Chip icon={<StatusIcon size={14} />} label={statusConfig.label} size="small" sx={{
                        bgcolor: statusConfig.color + '20',
                        color: statusConfig.color,
                        fontWeight: 'bold',
                        border: `1px solid ${statusConfig.color}`
                      }} />
                            </Box>

                            <Divider sx={{
                      my: 1
                    }} />

                            {/* Task Details */}
                            <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}>
                              <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                                <Clock size={16} color={SOJORI_COLORS.gray[600]} />
                                <Typography variant="caption">
                                  {assignment.startTime} - {assignment.endTime}
                                </Typography>
                              </Box>

                              {assignment.listingId && <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                                  <MapPin size={16} color={SOJORI_COLORS.gray[600]} />
                                  <Typography variant="caption">
                                    {assignment.listingId}
                                  </Typography>
                                </Box>}

                              {assignment.notes && <Typography variant="caption" color="text.secondary" sx={{
                        fontStyle: 'italic',
                        mt: 0.5
                      }}>
                                  {assignment.notes}
                                </Typography>}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>;
            })}
                </Grid>
              </Box>;
      })}
        </Box>}
    </Box>;
};
export default StaffAssignmentsTab;
