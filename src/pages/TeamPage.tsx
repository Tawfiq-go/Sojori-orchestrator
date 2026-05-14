import React, { useState, useMemo } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  btnPrimarySx,
  btnGhostSx,
  StatCard,
  DataTable,
  Badge,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  Stack,
  IconButton,
  Typography,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Menu,
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { AddTeamMemberModal } from '../components/team/AddTeamMemberModal';
import type { TeamMember } from '../components/team/AddTeamMemberModal';
import { TeamFilters, applyTeamFilters, defaultTeamFilters } from '../components/team/TeamFilters';
import type { TeamFilterState } from '../components/team/TeamFilters';
import { mockTeamMembers, mockStaffStats } from '../data/mockTeam';

export function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [filters, setFilters] = useState<TeamFilterState>(defaultTeamFilters);

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMemberForMenu, setSelectedMemberForMenu] = useState<TeamMember | null>(null);

  // Apply advanced filters
  const filteredStaff = useMemo(() => {
    return applyTeamFilters(teamMembers, filters);
  }, [teamMembers, filters]);

  const stats = useMemo(() => {
    const active = teamMembers.filter(s => s.status === 'active');
    const allStats = teamMembers.map(s => mockStaffStats[s.id]).filter(Boolean);
    const total = allStats.reduce((sum, s) => sum + s.tasksTotal, 0);
    const completed = allStats.reduce((sum, s) => sum + s.tasksCompleted, 0);
    const avgQuality = allStats.reduce((sum, s) => sum + s.qualityRating, 0) / allStats.length;

    return {
      total: teamMembers.length,
      active: active.length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgQuality: avgQuality.toFixed(1),
    };
  }, [teamMembers]);

  const getRoleBadge = (role: string) => {
    const config: Record<string, { color: string; icon: string }> = {
      'Femme de menage': { color: t.info, icon: '🧹' },
      'Maintenance': { color: t.warning, icon: '🔧' },
      'Conciergerie': { color: t.ai, icon: '🎯' },
      'Chauffeur': { color: t.success, icon: '🚗' },
      'Manager': { color: t.primary, icon: '👔' },
      'Admin': { color: t.error, icon: '⚙️' },
    };
    const c = config[role] || { color: t.text3, icon: '👤' };
    return { color: c.color, label: `${c.icon} ${role}` };
  };

  const handleOpenModal = (member?: TeamMember) => {
    setSelectedMember(member || null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedMember(null);
  };

  const handleSaveMember = (member: TeamMember) => {
    if (selectedMember) {
      // Update existing
      setTeamMembers(prev => prev.map(m => m.id === member.id ? member : m));
    } else {
      // Add new
      setTeamMembers(prev => [...prev, member]);
    }
    handleCloseModal();
  };

  const handleDeleteMember = (memberId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Membre supprimé avec succès');
    }
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: TeamMember) => {
    setAnchorEl(event.currentTarget);
    setSelectedMemberForMenu(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMemberForMenu(null);
  };

  const handleEditClick = () => {
    if (selectedMemberForMenu) {
      handleOpenModal(selectedMemberForMenu);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedMemberForMenu) {
      handleDeleteMember(selectedMemberForMenu.id);
    }
    handleMenuClose();
  };

  const handleViewPlanningClick = () => {
    if (selectedMemberForMenu) {
      toast.info(`Affichage planning de ${selectedMemberForMenu.firstName} ${selectedMemberForMenu.lastName} (MOCK)`);
    }
    handleMenuClose();
  };

  const handleWhatsAppClick = () => {
    if (selectedMemberForMenu) {
      const phone = selectedMemberForMenu.phone.replace(/\s/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
    handleMenuClose();
  };

  // P2.4: 8 actions supplémentaires
  const handleExportClick = () => {
    const csvContent = teamMembers
      .map((m) => `${m.staffCode},${m.firstName},${m.lastName},${m.role},${m.email},${m.phone},${m.status}`)
      .join('\n');
    const header = 'Code,Prénom,Nom,Rôle,Email,Téléphone,Statut\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `team_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Export CSV réussi');
  };

  const handleImportClick = () => {
    toast.info('Import CSV (MOCK) - Fonctionnalité à implémenter');
  };

  const handleBulkMessageClick = () => {
    const activeMembers = filteredStaff.filter((m) => m.status === 'active');
    toast.info(`Message groupé à ${activeMembers.length} membre(s) actif(s) (MOCK)`);
  };

  const handleViewProfileClick = () => {
    if (selectedMemberForMenu) {
      toast.info(`Profil complet de ${selectedMemberForMenu.firstName} ${selectedMemberForMenu.lastName} (MOCK)`);
    }
    handleMenuClose();
  };

  const handleAssignTaskClick = () => {
    if (selectedMemberForMenu) {
      toast.info(`Assigner tâche à ${selectedMemberForMenu.firstName} ${selectedMemberForMenu.lastName} (MOCK)`);
    }
    handleMenuClose();
  };

  const handleDeactivateClick = () => {
    if (selectedMemberForMenu && window.confirm(`Désactiver ${selectedMemberForMenu.firstName} ${selectedMemberForMenu.lastName} ?`)) {
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === selectedMemberForMenu.id ? { ...m, status: 'inactive' as const } : m))
      );
      toast.success('Membre désactivé avec succès');
    }
    handleMenuClose();
  };

  const handleResetFilters = () => {
    setFilters(defaultTeamFilters);
    toast.info('Filtres réinitialisés');
  };

  // Helper: Calculate schedule summary (X/7 jours)
  const getScheduleSummary = (availability: TeamMember['availability']) => {
    const days = Object.values(availability);
    const presentDays = days.filter(d => d.present).length;
    return `${presentDays}/7 jours`;
  };

  const columns = [
    // 1. Membre (avatar + nom + staffCode)
    {
      key: 'member',
      label: 'Membre',
      render: (row: TeamMember) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={row.photo} sx={{ width: 40, height: 40 }} />
          <Box>
            <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
              {row.firstName} {row.lastName}
            </Typography>
            <Typography sx={{ fontSize: '11px', color: t.text3, fontFamily: 'Geist Mono' }}>
              {row.staffCode}
            </Typography>
          </Box>
        </Box>
      ),
    },
    // 2. Rôle
    {
      key: 'role',
      label: 'Rôle',
      render: (row: TeamMember) => {
        const badge = getRoleBadge(row.role);
        return (
          <Chip
            label={badge.label}
            size="small"
            sx={{ bgcolor: badge.color + '20', color: badge.color, fontWeight: 600, fontSize: 11 }}
          />
        );
      },
    },
    // 3. Sous-types (NEW P2.2)
    {
      key: 'subTypes',
      label: 'Sous-types',
      render: (row: TeamMember) => (
        <Stack direction="row" spacing={0.5} sx={{ maxWidth: 200, flexWrap: 'wrap' }}>
          {row.subTypes.slice(0, 2).map((sub, idx) => (
            <Chip
              key={idx}
              label={sub}
              size="small"
              sx={{ fontSize: 10, height: 20, bgcolor: t.bg2, color: t.text2 }}
            />
          ))}
          {row.subTypes.length > 2 && (
            <Chip
              label={`+${row.subTypes.length - 2}`}
              size="small"
              sx={{ fontSize: 10, height: 20, bgcolor: t.bg3, color: t.text3 }}
            />
          )}
        </Stack>
      ),
    },
    // 4. Schedule (NEW P2.2)
    {
      key: 'schedule',
      label: 'Planning',
      render: (row: TeamMember) => (
        <Typography sx={{ fontSize: 12, color: t.text2, fontFamily: 'Geist Mono' }}>
          {getScheduleSummary(row.availability)}
        </Typography>
      ),
    },
    // 5. Langues (NEW P2.2)
    {
      key: 'languages',
      label: 'Langues',
      render: (row: TeamMember) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          {row.languages.slice(0, 2).map((lang, idx) => (
            <Chip
              key={idx}
              label={lang}
              size="small"
              sx={{ fontSize: 10, height: 18, bgcolor: t.primaryTint, color: t.primary }}
            />
          ))}
          {row.languages.length > 2 && (
            <Chip
              label={`+${row.languages.length - 2}`}
              size="small"
              sx={{ fontSize: 10, height: 18, bgcolor: t.bg3, color: t.text3 }}
            />
          )}
        </Stack>
      ),
    },
    // 6. Compétences (NEW P2.2)
    {
      key: 'skills',
      label: 'Compétences',
      render: (row: TeamMember) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          {row.skills.slice(0, 2).map((skill, idx) => (
            <Chip
              key={idx}
              label={skill}
              size="small"
              sx={{ fontSize: 10, height: 18, bgcolor: t.aiTint, color: t.ai }}
            />
          ))}
          {row.skills.length > 2 && (
            <Chip
              label={`+${row.skills.length - 2}`}
              size="small"
              sx={{ fontSize: 10, height: 18, bgcolor: t.bg3, color: t.text3 }}
            />
          )}
        </Stack>
      ),
    },
    // 7. Zone (NEW P2.2)
    {
      key: 'zone',
      label: 'Zone',
      render: (row: TeamMember) => (
        <Typography sx={{ fontSize: 12, color: t.text2 }}>
          📍 {row.zone || 'Non défini'}
        </Typography>
      ),
    },
    // 8. Date embauche (NEW P2.2)
    {
      key: 'hireDate',
      label: 'Embauche',
      render: (row: TeamMember) => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'Geist Mono' }}>
          {new Date(row.hireDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Typography>
      ),
    },
    // 9. Type contrat (NEW P2.2)
    {
      key: 'contractType',
      label: 'Contrat',
      render: (row: TeamMember) => {
        const colors: Record<string, string> = {
          CDI: t.success,
          CDD: t.warning,
          Freelance: t.ai,
          Stage: t.info,
        };
        const color = colors[row.contractType] || t.text3;
        return (
          <Chip
            label={row.contractType}
            size="small"
            sx={{ bgcolor: color + '20', color, fontWeight: 600, fontSize: 11 }}
          />
        );
      },
    },
    // 10. Documents (NEW P2.2)
    {
      key: 'documents',
      label: 'Documents',
      render: (row: TeamMember) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>
          📎 {row.documents.length} doc{row.documents.length > 1 ? 's' : ''}
        </Typography>
      ),
    },
    // 11. Contact
    {
      key: 'contact',
      label: 'Contact',
      render: (row: TeamMember) => (
        <Box>
          <Typography sx={{ fontSize: '11px', color: t.text2 }}>📱 {row.phone}</Typography>
          <Typography sx={{ fontSize: '11px', color: t.text3 }}>✉️ {row.email}</Typography>
        </Box>
      ),
    },
    // 12. Tâches (stats)
    {
      key: 'stats',
      label: 'Tâches',
      render: (row: TeamMember) => {
        const stats = mockStaffStats[row.id];
        if (!stats) return <Typography sx={{ fontSize: 11, color: t.text4 }}>-</Typography>;
        return (
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: t.success }}>{stats.tasksCompleted}</span> / {stats.tasksTotal}
            </Typography>
            <Box sx={{ width: 80, height: 4, bgcolor: t.bg2, borderRadius: 1, mt: 0.5 }}>
              <Box
                sx={{
                  width: `${(stats.tasksCompleted / stats.tasksTotal) * 100}%`,
                  height: 4,
                  bgcolor: t.success,
                  borderRadius: 1,
                }}
              />
            </Box>
          </Box>
        );
      },
    },
    // 13. Qualité
    {
      key: 'quality',
      label: 'Qualité',
      render: (row: TeamMember) => {
        const stats = mockStaffStats[row.id];
        if (!stats) return <Typography sx={{ fontSize: 11, color: t.text4 }}>-</Typography>;
        return (
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>⭐ {stats.qualityRating}</Typography>
            <Typography sx={{ fontSize: '11px', color: t.text3 }}>⏱️ {stats.avgDelay}h délai</Typography>
          </Box>
        );
      },
    },
    // 14. Statut
    {
      key: 'status',
      label: 'Statut',
      render: (row: TeamMember) => {
        const statusMap = {
          active: { label: 'Actif', color: t.success },
          inactive: { label: 'Inactif', color: t.error },
          on_leave: { label: 'En congé', color: t.warning },
        };
        const s = statusMap[row.status];
        return (
          <Chip label={s.label} size="small" sx={{ bgcolor: s.color + '20', color: s.color, fontWeight: 600 }} />
        );
      },
    },
    // 15. Actions
    {
      key: 'actions',
      label: '',
      render: (row: TeamMember) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Équipe']}>
      <PageHeader title="Équipe" count={`${filteredStaff.length}`}>
        <Button sx={btnGhostSx} onClick={handleImportClick}>
          📥 Import
        </Button>
        <Button sx={btnGhostSx} onClick={handleExportClick}>
          📤 Export
        </Button>
        <Button sx={btnGhostSx} onClick={handleBulkMessageClick}>
          💬 Message groupé
        </Button>
        <Button sx={btnPrimarySx} onClick={() => handleOpenModal()}>
          + Ajouter membre
        </Button>
      </PageHeader>

      <Box sx={{ px: { xs: 2, md: 3 }, pb: 4 }}>
        <Stack spacing={3}>
          {/* Stats */}
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <StatCard title="Total Staff" value={`${stats.total}`} icon="👥" color={t.primary} />
            <StatCard title="Actifs" value={`${stats.active}`} icon="✅" color={t.success} />
            <StatCard title="Taux completion" value={`${stats.completionRate}%`} icon="📊" color={t.ai} />
            <StatCard title="Qualité moyenne" value={stats.avgQuality} icon="⭐" color={t.warning} />
          </Stack>

          {/* Advanced Filters (P2.3) */}
          <TeamFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
            teamCount={teamMembers.length}
            filteredCount={filteredStaff.length}
          />

          {/* Table */}
          <DataTable columns={columns} rows={filteredStaff} />
        </Stack>
      </Box>

      {/* Add/Edit Modal */}
      <AddTeamMemberModal
        open={showAddModal}
        onClose={handleCloseModal}
        onSave={handleSaveMember}
        existingMember={selectedMember}
      />

      {/* Actions Menu (P2.4: 8 actions) */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEditClick}>✏️ Modifier</MenuItem>
        <MenuItem onClick={handleViewProfileClick}>👤 Profil complet</MenuItem>
        <MenuItem onClick={handleViewPlanningClick}>📆 Voir planning</MenuItem>
        <MenuItem onClick={handleWhatsAppClick}>📱 Message WhatsApp</MenuItem>
        <MenuItem onClick={handleAssignTaskClick}>📋 Assigner tâche</MenuItem>
        <MenuItem onClick={handleDeactivateClick} sx={{ color: t.warning }}>
          🚫 Désactiver
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: t.error }}>
          🗑️ Supprimer
        </MenuItem>
      </Menu>
    </DashboardWrapper>
  );
}
