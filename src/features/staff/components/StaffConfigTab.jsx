import React from 'react';
import { Box, Typography, Chip, Grid, Paper, Divider } from '@mui/material';
import {
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  TrendingUp,
  Award,
  Target,
  Zap
} from 'lucide-react';

const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: {
    100: '#F3F4F6',
    200: '#E5E7EB',
    600: '#4B5563',
  },
};

const TASK_CATEGORIES = [
  { id: 'ARRIVAL', label: 'Arrivée', icon: '🚪', color: '#3B82F6' },
  { id: 'DEPARTURE', label: 'Départ', icon: '🚪', color: '#8B5CF6' },
  { id: 'CLEANING', label: 'Ménage', icon: '🧹', color: '#10B981' },
  { id: 'TRANSPORT', label: 'Transport', icon: '🚗', color: '#F59E0B' },
  { id: 'GROCERIES', label: 'Courses', icon: '🛒', color: '#EC4899' },
  { id: 'SUPPORT', label: 'Assistance', icon: '🆘', color: '#EF4444' },
  { id: 'MAINTENANCE', label: 'Maintenance', icon: '🔧', color: '#6B7280' },
  { id: 'CUSTOM', label: 'Personnalisé', icon: '✨', color: '#14B8A6' },
];

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: SOJORI_COLORS.gray[100], height: '100%' }}>
    <Icon size={24} color={color || SOJORI_COLORS.primary} style={{ marginBottom: 8 }} />
    <Typography variant="h4" fontWeight="bold" color={color || SOJORI_COLORS.primary}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Paper>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
    <Icon size={16} color={SOJORI_COLORS.gray[600]} />
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: '80px' }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight="500">
      {value}
    </Typography>
  </Box>
);

const StaffConfigTab = ({ staff }) => {
  // Safety check
  if (!staff) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>Aucun staff sélectionné</Typography>
      </Box>
    );
  }

  const renderPriorityStars = (priority) => {
    return (
      <Box sx={{ display: 'flex', gap: 0.3 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={14}
            fill={i <= priority ? SOJORI_COLORS.warning : 'none'}
            color={i <= priority ? SOJORI_COLORS.warning : SOJORI_COLORS.gray[600]}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* KPIs principaux - 4 colonnes */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={Award}
            label="Note"
            value={staff.rating?.toFixed(1) || '0.0'}
            color={SOJORI_COLORS.warning}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={CheckCircle}
            label="Complétées"
            value={staff.totalTasksCompleted || 0}
            color={SOJORI_COLORS.success}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={Target}
            label="Taux de succès"
            value={`${staff.completionRate || 0}%`}
            color={SOJORI_COLORS.primary}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={Clock}
            label="Temps réponse (min)"
            value={staff.averageResponseTime || '-'}
            color={SOJORI_COLORS.gray[600]}
          />
        </Grid>
      </Grid>

      {/* Deux colonnes pour le reste */}
      <Grid container spacing={2}>
        {/* Colonne gauche */}
        <Grid item xs={12} md={6}>
          {/* Catégories */}
          <Paper sx={{ p: 2, mb: 2, height: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Zap size={18} color={SOJORI_COLORS.primary} />
              <Typography variant="subtitle2" fontWeight="bold">
                Catégories
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {staff.categories.map((catId) => {
                const cat = TASK_CATEGORIES.find((c) => c.id === catId);
                return cat ? (
                  <Chip
                    key={catId}
                    label={`${cat.icon} ${cat.label}`}
                    size="small"
                    sx={{ bgcolor: cat.color, color: 'white', fontWeight: 500 }}
                  />
                ) : null;
              })}
            </Box>
          </Paper>

          {/* Contact */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <MessageSquare size={18} color={SOJORI_COLORS.primary} />
              <Typography variant="subtitle2" fontWeight="bold">
                Contact
              </Typography>
            </Box>
            <InfoRow icon={Mail} label="Email" value={staff.email} />
            <InfoRow icon={Phone} label="Téléphone" value={staff.callPhone} />
            <InfoRow icon={MessageSquare} label="WhatsApp" value={staff.whatsappPhone} />
          </Paper>
        </Grid>

        {/* Colonne droite */}
        <Grid item xs={12} md={6}>
          {/* Orchestration */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TrendingUp size={18} color={SOJORI_COLORS.primary} />
              <Typography variant="subtitle2" fontWeight="bold">
                Orchestration
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Priorité
              </Typography>
              {renderPriorityStars(staff.priority)}
            </Box>
            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Max tâches/jour
              </Typography>
              <Chip label={staff.maxTasksPerDay} size="small" />
            </Box>
            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Max heures/semaine
              </Typography>
              <Chip label={`${staff.maxHoursPerWeek}h`} size="small" />
            </Box>
            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Statut
              </Typography>
              {staff.isActive ? (
                <Chip
                  icon={<CheckCircle size={14} />}
                  label="Actif"
                  size="small"
                  sx={{ bgcolor: SOJORI_COLORS.success, color: 'white' }}
                />
              ) : (
                <Chip
                  icon={<XCircle size={14} />}
                  label="Inactif"
                  size="small"
                  sx={{ bgcolor: SOJORI_COLORS.error, color: 'white' }}
                />
              )}
            </Box>
          </Paper>

          {/* Type */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Calendar size={18} color={SOJORI_COLORS.primary} />
              <Typography variant="subtitle2" fontWeight="bold">
                Type de contrat
              </Typography>
            </Box>
            <Chip
              label={staff.staffType}
              sx={{ bgcolor: SOJORI_COLORS.gray[100], fontWeight: 500 }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffConfigTab;
