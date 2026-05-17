// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Configuration Messages View
// Version simplifiée adaptée du legacy (~1420 lignes → ~500 lignes)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  Switch,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Email as EmailIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import {
  getOrchestratorMailTemplates,
  updateOrchestratorMailTemplate,
  type MailTemplate,
} from '../../services/orchestratorConfigService';

const ConfigMessagesView = () => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'whatsapp' | 'both'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [error, setError] = useState<string | null>(null);

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOrchestratorMailTemplates();
      if (response.success) {
        setTemplates(response.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  };

  // Toggle enabled status
  const handleToggleEnabled = async (templateId: string, currentEnabled: boolean) => {
    try {
      const currentTemplate = templates.find((t) => t._id === templateId);
      if (!currentTemplate) return;

      await updateOrchestratorMailTemplate(templateId, {
        enabled: !currentEnabled,
      });

      setTemplates((prev) =>
        prev.map((t) => (t._id === templateId ? { ...t, enabled: !t.enabled } : t))
      );
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Calculate stats
  const stats = {
    total: templates.length,
    active: templates.filter((t) => t.enabled).length,
    email: templates.filter((t) => t.messageEnabled && !t.whatsappEnabled).length,
    whatsapp: templates.filter((t) => t.whatsappEnabled && !t.messageEnabled).length,
    both: templates.filter((t) => t.messageEnabled && t.whatsappEnabled).length,
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      template.messageName?.toLowerCase().includes(searchLower) ||
      template.displayLabel?.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && template.enabled) ||
      (statusFilter === 'inactive' && !template.enabled);

    // Channel filter
    let matchesChannel = true;
    if (channelFilter === 'email') {
      matchesChannel = template.messageEnabled === true && !template.whatsappEnabled;
    } else if (channelFilter === 'whatsapp') {
      matchesChannel = template.whatsappEnabled === true && !template.messageEnabled;
    } else if (channelFilter === 'both') {
      matchesChannel = template.messageEnabled === true && template.whatsappEnabled === true;
    }

    return matchesSearch && matchesStatus && matchesChannel;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
        <StatCard label="Total" value={stats.total} emoji="📊" color="#2196F3" />
        <StatCard label="Actifs" value={stats.active} emoji="✅" color="#4CAF50" />
        <StatCard label="Email" value={stats.email} emoji="📧" color="#FF9800" />
        <StatCard label="WhatsApp" value={stats.whatsapp} emoji="💬" color="#25D366" />
        <StatCard label="Les 2" value={stats.both} emoji="🔄" color="#9C27B0" />
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <TextField
          size="small"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'var(--text-muted)' }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />

        {/* Status Filter */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FilterButton
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            label="Tous"
          />
          <FilterButton
            active={statusFilter === 'active'}
            onClick={() => setStatusFilter('active')}
            label="Actifs"
          />
          <FilterButton
            active={statusFilter === 'inactive'}
            onClick={() => setStatusFilter('inactive')}
            label="Inactifs"
          />
        </Box>

        {/* Channel Filter */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FilterButton
            active={channelFilter === 'all'}
            onClick={() => setChannelFilter('all')}
            label="Tous canaux"
          />
          <FilterButton
            active={channelFilter === 'email'}
            onClick={() => setChannelFilter('email')}
            label="📧 Email"
          />
          <FilterButton
            active={channelFilter === 'whatsapp'}
            onClick={() => setChannelFilter('whatsapp')}
            label="💬 WhatsApp"
          />
          <FilterButton
            active={channelFilter === 'both'}
            onClick={() => setChannelFilter('both')}
            label="🔄 Les 2"
          />
        </Box>
      </Box>

      {/* Table */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <TableContainer
          component={Paper}
          sx={{
            border: '1px solid var(--border)',
            borderRadius: 2,
            boxShadow: 'none',
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'var(--bg-subtle)' }}>Template</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'var(--bg-subtle)' }}>
                  Description
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'var(--bg-subtle)', width: 100 }} align="center">
                  Statut
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'var(--bg-subtle)', width: 150 }} align="center">
                  Canal
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'var(--bg-subtle)', width: 120 }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Typography sx={{ color: 'var(--text-muted)', fontSize: 14 }}>
                      Aucun template trouvé
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template._id} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {template.displayLabel || template.messageName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {template.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={template.enabled || false}
                        onChange={() =>
                          handleToggleEnabled(template._id!, template.enabled || false)
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {template.messageEnabled && (
                          <Chip label="Email" size="small" sx={{ fontSize: 11, height: 20 }} />
                        )}
                        {template.whatsappEnabled && (
                          <Chip
                            label="WhatsApp"
                            size="small"
                            sx={{ fontSize: 11, height: 20, bgcolor: '#E8F5E9' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Voir">
                          <IconButton size="small">
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Éditer">
                          <IconButton size="small">
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Results count */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filteredTemplates.length} template{filteredTemplates.length > 1 ? 's' : ''} affiché
          {filteredTemplates.length > 1 ? 's' : ''}
        </Typography>
      </Box>
    </Box>
  );
};

// ════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: number;
  emoji: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, emoji, color }) => (
  <Box
    sx={{
      p: 2,
      border: '1px solid var(--border)',
      borderRadius: 2,
      bgcolor: 'var(--bg-paper)',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
        }}
      >
        {emoji}
      </Box>
      <Typography sx={{ fontSize: 24, fontWeight: 700, color }}>{value}</Typography>
    </Box>
    <Typography sx={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
      {label}
    </Typography>
  </Box>
);

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({ active, onClick, label }) => (
  <Button
    size="small"
    variant={active ? 'contained' : 'outlined'}
    onClick={onClick}
    sx={{
      textTransform: 'none',
      fontWeight: 600,
      fontSize: 12,
      ...(active && {
        bgcolor: 'var(--accent)',
        '&:hover': {
          bgcolor: 'var(--accent-hover)',
        },
      }),
    }}
  >
    {label}
  </Button>
);

export default ConfigMessagesView;
