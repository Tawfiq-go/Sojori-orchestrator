import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Chip, LinearProgress, CircularProgress, List, ListItem, ListItemText } from '@mui/material';
import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getStaffWorkload } from '../services/serverApi.staffSimplified';
const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray: {
    100: '#F3F4F6',
    600: '#4B5563'
  }
};
const STATUS_COLORS = {
  COMPLETED: SOJORI_COLORS.success,
  IN_PROGRESS: SOJORI_COLORS.info,
  ASSIGNED: SOJORI_COLORS.warning,
  ACCEPTED: SOJORI_COLORS.primary
};
const STATUS_LABELS = {
  COMPLETED: 'Complété',
  IN_PROGRESS: 'En cours',
  ASSIGNED: 'Assigné',
  ACCEPTED: 'Accepté',
  CREATED: 'Créé'
};
const StaffWorkloadTab = ({
  staff
}) => {
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!staff) return;
    loadWorkload();
  }, [staff?.staffCode]);
  const loadWorkload = async () => {
    try {
      const data = await getStaffWorkload(staff.staffCode);
      setWorkload(data);
    } catch (error) {} finally {
      setLoading(false);
    }
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
  if (!workload) {
    return <Box sx={{
      p: 2
    }}>
        <Typography color="text.secondary">Aucune donnée disponible</Typography>
      </Box>;
  }
  const {
    thisWeek,
    today,
    performance
  } = workload;
  return <Box sx={{
    p: 2
  }}>
      {/* This Week Summary */}
      <Box sx={{
      mb: 3
    }}>
        <Typography variant="h6" gutterBottom>
          Cette semaine
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{
            p: 2
          }}>
              <Typography variant="caption" color="text.secondary">
                Tâches
              </Typography>
              <Box sx={{
              mt: 1
            }}>
                <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.primary}>
                  {thisWeek.tasks} / {thisWeek.maxTasks}
                </Typography>
                <LinearProgress variant="determinate" value={thisWeek.taskPercentage} sx={{
                mt: 1,
                height: 8,
                borderRadius: 4,
                bgcolor: SOJORI_COLORS.gray[100],
                '& .MuiLinearProgress-bar': {
                  bgcolor: thisWeek.taskPercentage >= 80 ? SOJORI_COLORS.error : thisWeek.taskPercentage >= 60 ? SOJORI_COLORS.warning : SOJORI_COLORS.success
                }
              }} />
                <Typography variant="caption" color="text.secondary" sx={{
                mt: 0.5
              }}>
                  {thisWeek.taskPercentage}% de la capacité
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{
            p: 2
          }}>
              <Typography variant="caption" color="text.secondary">
                Heures
              </Typography>
              <Box sx={{
              mt: 1
            }}>
                <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.primary}>
                  {thisWeek.hours}h / {thisWeek.maxHours}h
                </Typography>
                <LinearProgress variant="determinate" value={thisWeek.hourPercentage} sx={{
                mt: 1,
                height: 8,
                borderRadius: 4,
                bgcolor: SOJORI_COLORS.gray[100],
                '& .MuiLinearProgress-bar': {
                  bgcolor: thisWeek.hourPercentage >= 80 ? SOJORI_COLORS.error : thisWeek.hourPercentage >= 60 ? SOJORI_COLORS.warning : SOJORI_COLORS.success
                }
              }} />
                <Typography variant="caption" color="text.secondary" sx={{
                mt: 0.5
              }}>
                  {thisWeek.hourPercentage}% de la capacité
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Today's Tasks */}
      <Box sx={{
      mb: 3
    }}>
        <Typography variant="h6" gutterBottom>
          Tâches d&apos;aujourd&apos;hui ({today.tasks} / {today.maxTasks})
        </Typography>
        {today.taskList && today.taskList.length > 0 ? <Paper>
            <List>
              {today.taskList.map((task, index) => <ListItem key={task.taskCode} divider={index < today.taskList.length - 1} sx={{
            borderLeft: `4px solid ${STATUS_COLORS[task.status] || SOJORI_COLORS.gray[600]}`
          }}>
                  <ListItemText primary={<Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
                        <Typography variant="body2" fontWeight="bold">
                          {task.name}
                        </Typography>
                        <Chip label={task.taskCode} size="small" sx={{
                bgcolor: SOJORI_COLORS.gray[100],
                fontSize: '0.7rem'
              }} />
                        <Chip label={STATUS_LABELS[task.status] || task.status} size="small" sx={{
                bgcolor: STATUS_COLORS[task.status] || SOJORI_COLORS.gray[600],
                color: 'white',
                fontSize: '0.7rem'
              }} />
                      </Box>} secondary={<Box sx={{
              mt: 0.5
            }}>
                        <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                          <Clock size={14} />
                          <Typography variant="caption">
                            {new Date(task.startDate).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{' '}
                            -{' '}
                            {new Date(task.endDate).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {task.listingName} • {task.reservationNumber}
                        </Typography>
                      </Box>} />
                  {task.status === 'COMPLETED' && <CheckCircle size={20} color={SOJORI_COLORS.success} />}
                  {task.status === 'IN_PROGRESS' && <AlertCircle size={20} color={SOJORI_COLORS.info} />}
                </ListItem>)}
            </List>
          </Paper> : <Paper sx={{
        p: 3,
        textAlign: 'center'
      }}>
            <Typography color="text.secondary">Aucune tâche aujourd&apos;hui</Typography>
          </Paper>}
      </Box>

      {/* Performance Summary */}
      <Box>
        <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 2
      }}>
          <TrendingUp size={20} color={SOJORI_COLORS.primary} />
          <Typography variant="h6">Performance globale</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Paper sx={{
            p: 2,
            textAlign: 'center',
            bgcolor: SOJORI_COLORS.gray[100]
          }}>
              <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.success}>
                {performance.totalCompleted}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Complétées
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{
            p: 2,
            textAlign: 'center',
            bgcolor: SOJORI_COLORS.gray[100]
          }}>
              <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.error}>
                {performance.totalRefused}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Refusées
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{
            p: 2,
            textAlign: 'center',
            bgcolor: SOJORI_COLORS.gray[100]
          }}>
              <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.primary}>
                {performance.completionRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Taux de succès
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
                {performance.rating.toFixed(1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Note moyenne
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>;
};
export default StaffWorkloadTab;
