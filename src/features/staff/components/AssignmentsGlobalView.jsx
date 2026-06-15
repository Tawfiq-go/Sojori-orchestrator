import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, CircularProgress, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import { getStaffSimplified } from '../services/serverApi.staffSimplified';
import { useAdminOwnerFilter } from 'context/AdminOwnerFilterContext';
import { CheckCircle, AlertCircle, XCircle, Clock, Calendar, Users as UsersIcon } from 'lucide-react';
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
 * Global view of all assignments across all staff members
 * Displays in a table format similar to Reservation/Liste
 */
const AssignmentsGlobalView = () => {
  const user = useSelector(state => state.auth.user);
  const { requestOwnerId } = useAdminOwnerFilter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(7); // days

  useEffect(() => {
    loadAllAssignments();
  }, [dateRange, requestOwnerId]);
  const loadAllAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all staff members
      const staffParams = { page: 0, limit: 100 };
      if (requestOwnerId) {
        staffParams.ownerId = requestOwnerId;
      }
      const staffResponse = await getStaffSimplified(staffParams);
      const allStaff = staffResponse.staff || [];

      // For now, create mock assignments data since the API would need batch support
      // TODO: Create a batch API endpoint to get all assignments at once
      const mockAssignments = [];

      // Calculate date range
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + dateRange);

      // Generate some sample data for demonstration
      // In production, this would come from a real API call
      setAssignments(mockAssignments);
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
  const columns = [{
    field: 'date',
    header: 'Date',
    sortable: true,
    headerStyle: {
      width: '120px'
    },
    body: rowData => <div className="flex items-center gap-2">
          <Calendar size={16} color={SOJORI_COLORS.gray[600]} />
          <span className="text-sm">{formatDate(rowData.date)}</span>
        </div>
  }, {
    field: 'staffName',
    header: 'Staff',
    sortable: true,
    headerStyle: {
      width: '180px'
    },
    body: rowData => <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <UsersIcon size={16} color={SOJORI_COLORS.primary} />
            <span className="font-medium text-sm">{rowData.staffName}</span>
          </div>
          <span className="text-xs text-gray-500">{rowData.staffCode}</span>
        </div>
  }, {
    field: 'category',
    header: 'Catégorie',
    sortable: true,
    headerStyle: {
      width: '150px'
    },
    body: rowData => {
      const categoryConfig = TASK_CATEGORIES[rowData.category] || TASK_CATEGORIES.CUSTOM;
      return <Chip label={`${categoryConfig.icon} ${categoryConfig.label}`} size="small" sx={{
        bgcolor: categoryConfig.color,
        color: 'white',
        fontWeight: 500
      }} />;
    }
  }, {
    field: 'taskId',
    header: 'Tâche ID',
    sortable: true,
    headerStyle: {
      width: '150px'
    },
    body: rowData => <span className="cursor-pointer font-medium text-sm hover:underline" style={{
      color: SOJORI_COLORS.primary
    }}>
          {rowData.taskId}
        </span>
  }, {
    field: 'time',
    header: 'Horaire',
    sortable: false,
    headerStyle: {
      width: '120px'
    },
    body: rowData => <div className="flex items-center gap-1">
          <Clock size={14} color={SOJORI_COLORS.gray[600]} />
          <span className="text-xs">
            {rowData.startTime} - {rowData.endTime}
          </span>
        </div>
  }, {
    field: 'listingId',
    header: 'Propriété',
    sortable: true,
    headerStyle: {
      width: '150px'
    },
    body: rowData => <span className="text-sm">{rowData.listingId || '-'}</span>
  }, {
    field: 'status',
    header: 'Statut',
    sortable: true,
    headerStyle: {
      width: '130px'
    },
    body: rowData => {
      const statusConfig = STATUS_CONFIG[rowData.status] || STATUS_CONFIG.assigned;
      const StatusIcon = statusConfig.icon;
      return <Chip icon={<StatusIcon size={14} />} label={statusConfig.label} size="small" sx={{
        bgcolor: statusConfig.color + '20',
        color: statusConfig.color,
        fontWeight: 'bold',
        border: `1px solid ${statusConfig.color}`
      }} />;
    }
  }, {
    field: 'notes',
    header: 'Notes',
    sortable: false,
    headerStyle: {
      width: '200px'
    },
    body: rowData => <span className="text-xs text-gray-600 italic">
          {rowData.notes || '-'}
        </span>
  }];
  if (loading) {
    return <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px'
    }}>
        <CircularProgress />
      </Box>;
  }
  if (error) {
    return <Alert severity="error" sx={{
      m: 3
    }}>
        {error}
      </Alert>;
  }
  return <Box sx={{
    p: 3
  }}>
      {/* Header with filters */}
      <Box sx={{
      mb: 3,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
        <Typography variant="h6" fontWeight="bold">
          Tous les Assignments
        </Typography>
        <Box sx={{
        display: 'flex',
        gap: 1
      }}>
          <Chip label="7 jours" onClick={() => setDateRange(7)} sx={{
          bgcolor: dateRange === 7 ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[100],
          color: dateRange === 7 ? 'white' : 'inherit',
          cursor: 'pointer',
          fontWeight: dateRange === 7 ? 'bold' : 'normal'
        }} />
          <Chip label="30 jours" onClick={() => setDateRange(30)} sx={{
          bgcolor: dateRange === 30 ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[100],
          color: dateRange === 30 ? 'white' : 'inherit',
          cursor: 'pointer',
          fontWeight: dateRange === 30 ? 'bold' : 'normal'
        }} />
          <Chip label="90 jours" onClick={() => setDateRange(90)} sx={{
          bgcolor: dateRange === 90 ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[100],
          color: dateRange === 90 ? 'white' : 'inherit',
          cursor: 'pointer',
          fontWeight: dateRange === 90 ? 'bold' : 'normal'
        }} />
        </Box>
      </Box>

      {/* Stats Summary */}
      <Box sx={{
      mb: 3,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 2
    }}>
        <Box sx={{
        p: 2,
        bgcolor: SOJORI_COLORS.gray[100],
        borderRadius: 2,
        textAlign: 'center'
      }}>
          <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.primary}>
            {assignments.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total Assignments
          </Typography>
        </Box>
        <Box sx={{
        p: 2,
        bgcolor: SOJORI_COLORS.gray[100],
        borderRadius: 2,
        textAlign: 'center'
      }}>
          <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.success}>
            {assignments.filter(a => a.status === 'completed').length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Terminés
          </Typography>
        </Box>
        <Box sx={{
        p: 2,
        bgcolor: SOJORI_COLORS.gray[100],
        borderRadius: 2,
        textAlign: 'center'
      }}>
          <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.warning}>
            {assignments.filter(a => ['assigned', 'accepted', 'in_progress'].includes(a.status)).length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            En cours
          </Typography>
        </Box>
        <Box sx={{
        p: 2,
        bgcolor: SOJORI_COLORS.gray[100],
        borderRadius: 2,
        textAlign: 'center'
      }}>
          <Typography variant="h4" fontWeight="bold" color={SOJORI_COLORS.info}>
            {new Set(assignments.map(a => a.staffCode)).size}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Staff impliqués
          </Typography>
        </Box>
      </Box>

      {/* Global Table */}
      {assignments.length === 0 ? <Box sx={{
      textAlign: 'center',
      py: 6
    }}>
          <Calendar size={64} style={{
        opacity: 0.3,
        margin: '0 auto'
      }} />
          <Typography variant="body2" color="text.secondary" sx={{
        mt: 2
      }}>
            Aucun assignment trouvé pour les {dateRange} prochains jours
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Les assignments apparaîtront ici une fois créés par l&apos;orchestrateur
          </Typography>
        </Box> : <GlobalTable data={assignments} columns={columns} paginator rows={25} rowsPerPageOptions={[10, 25, 50, 100]} sortField="date" sortOrder={1} emptyMessage="Aucun assignment trouvé" />}
    </Box>;
};
export default AssignmentsGlobalView;
