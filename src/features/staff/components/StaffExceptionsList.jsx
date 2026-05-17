import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Chip, IconButton, Alert, CircularProgress, Stack } from '@mui/material';
import { Calendar, Trash2, AlertCircle } from 'lucide-react';
import { getStaffExceptions } from '../services/serverApi.staffSimplified';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
const EXCEPTION_TYPE_LABELS = {
  vacation: {
    label: 'Congés payés',
    color: 'primary'
  },
  sick_leave: {
    label: 'Arrêt maladie',
    color: 'error'
  },
  special_leave: {
    label: 'Congé exceptionnel',
    color: 'secondary'
  },
  custom_hours: {
    label: 'Horaires personnalisés',
    color: 'info'
  },
  public_holiday: {
    label: 'Jour férié',
    color: 'warning'
  }
};

/**
 * List of staff exceptions (vacations, sick leave, etc.)
 */
const StaffExceptionsList = ({
  staffCode,
  refreshTrigger
}) => {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    loadExceptions();
  }, [staffCode, refreshTrigger]);
  const loadExceptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get exceptions for next 3 months
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      const response = await getStaffExceptions(staffCode, today.toISOString().split('T')[0], threeMonthsLater.toISOString().split('T')[0]);
      setExceptions(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des exceptions');
    } finally {
      setLoading(false);
    }
  };
  const formatDate = dateString => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', {
        locale: fr
      });
    } catch {
      return dateString;
    }
  };
  if (loading) {
    return <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      p: 3
    }}>
        <CircularProgress size={24} />
      </Box>;
  }
  if (error) {
    return <Alert severity="error" sx={{
      m: 2
    }}>
        {error}
      </Alert>;
  }
  if (exceptions.length === 0) {
    return <Box sx={{
      p: 3,
      textAlign: 'center'
    }}>
        <AlertCircle size={48} style={{
        opacity: 0.3
      }} />
        <Typography variant="body2" color="text.secondary" sx={{
        mt: 1
      }}>
          Aucune exception planifiée pour les 3 prochains mois
        </Typography>
      </Box>;
  }
  return <Box sx={{
    p: 2
  }}>
      <Stack spacing={2}>
        {exceptions.map(exception => {
        const typeConfig = EXCEPTION_TYPE_LABELS[exception.type] || {
          label: exception.type,
          color: 'default'
        };
        return <Card key={exception._id} variant="outlined">
              <CardContent>
                <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
                  <Box sx={{
                flex: 1
              }}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1
                }}>
                      <Chip label={typeConfig.label} color={typeConfig.color} size="small" />
                      {exception.isAvailable && <Chip label="Disponible" color="success" size="small" variant="outlined" />}
                    </Box>

                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1
                }}>
                      <Calendar size={16} />
                      <Typography variant="body2">
                        {formatDate(exception.startDate)} - {formatDate(exception.endDate)}
                      </Typography>
                    </Box>

                    {exception.reason && <Typography variant="body2" color="text.secondary" sx={{
                  fontStyle: 'italic'
                }}>
                        {exception.reason}
                      </Typography>}

                    {exception.createdBy && <Typography variant="caption" color="text.secondary" sx={{
                  display: 'block',
                  mt: 1
                }}>
                        Créé par: {exception.createdBy}
                      </Typography>}
                  </Box>

                  <IconButton size="small" color="error">
                    <Trash2 size={18} />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>;
      })}
      </Stack>
    </Box>;
};
export default StaffExceptionsList;
