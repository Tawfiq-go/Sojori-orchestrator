import React, { useState, useMemo } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  btnPrimarySx,
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

// MOCK DATA - 15 staff membres
const MOCK_STAFF = [
  {
    id: 'STAFF001',
    name: 'Fatima El Amrani',
    photo: 'https://i.pravatar.cc/150?img=1',
    role: 'Femme de menage',
    phone: '+33 6 12 34 56 78',
    email: 'fatima.elamrani@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
    stats: { tasksCompleted: 47, tasksTotal: 52, qualityRating: 4.8, avgDelay: 0.5 },
    status: 'active'
  },
  {
    id: 'STAFF002',
    name: 'Youssef Bennani',
    photo: 'https://i.pravatar.cc/150?img=11',
    role: 'Maintenance',
    phone: '+33 6 23 45 67 89',
    email: 'youssef.bennani@sojori.com',
    availability: { Mon: true, Tue: true, Wed: false, Thu: true, Fri: true, Sat: true, Sun: false },
    stats: { tasksCompleted: 31, tasksTotal: 35, qualityRating: 4.6, avgDelay: 1.2 },
    status: 'active'
  },
  {
    id: 'STAFF003',
    name: 'Khadija Moussaoui',
    photo: 'https://i.pravatar.cc/150?img=5',
    role: 'Femme de menage',
    phone: '+33 6 34 56 78 90',
    email: 'khadija.moussaoui@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true },
    stats: { tasksCompleted: 62, tasksTotal: 65, qualityRating: 4.9, avgDelay: 0.3 },
    status: 'active'
  },
  {
    id: 'STAFF004',
    name: 'Mohamed Alaoui',
    photo: 'https://i.pravatar.cc/150?img=12',
    role: 'Chauffeur',
    phone: '+33 6 45 67 89 01',
    email: 'mohamed.alaoui@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true },
    stats: { tasksCompleted: 88, tasksTotal: 92, qualityRating: 4.7, avgDelay: 0.8 },
    status: 'active'
  },
  {
    id: 'STAFF005',
    name: 'Amina Chakir',
    photo: 'https://i.pravatar.cc/150?img=9',
    role: 'Conciergerie',
    phone: '+33 6 56 78 90 12',
    email: 'amina.chakir@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
    stats: { tasksCompleted: 104, tasksTotal: 110, qualityRating: 4.95, avgDelay: 0.2 },
    status: 'active'
  },
  {
    id: 'STAFF006',
    name: 'Rachid Tazi',
    photo: 'https://i.pravatar.cc/150?img=13',
    role: 'Maintenance',
    phone: '+33 6 67 89 01 23',
    email: 'rachid.tazi@sojori.com',
    availability: { Mon: true, Tue: false, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
    stats: { tasksCompleted: 25, tasksTotal: 30, qualityRating: 4.4, avgDelay: 1.5 },
    status: 'active'
  },
  {
    id: 'STAFF007',
    name: 'Sanaa Idrissi',
    photo: 'https://i.pravatar.cc/150?img=20',
    role: 'Femme de menage',
    phone: '+33 6 78 90 12 34',
    email: 'sanaa.idrissi@sojori.com',
    availability: { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false },
    stats: { tasksCompleted: 38, tasksTotal: 42, qualityRating: 4.6, avgDelay: 0.9 },
    status: 'en_conge'
  },
  {
    id: 'STAFF008',
    name: 'Hassan Berrada',
    photo: 'https://i.pravatar.cc/150?img=15',
    role: 'Chauffeur',
    phone: '+33 6 89 01 23 45',
    email: 'hassan.berrada@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
    stats: { tasksCompleted: 71, tasksTotal: 76, qualityRating: 4.5, avgDelay: 1.1 },
    status: 'active'
  },
  {
    id: 'STAFF009',
    name: 'Nadia Azzouzi',
    photo: 'https://i.pravatar.cc/150?img=23',
    role: 'Conciergerie',
    phone: '+33 6 90 12 34 56',
    email: 'nadia.azzouzi@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true },
    stats: { tasksCompleted: 95, tasksTotal: 98, qualityRating: 4.85, avgDelay: 0.4 },
    status: 'active'
  },
  {
    id: 'STAFF010',
    name: 'Omar Benali',
    photo: 'https://i.pravatar.cc/150?img=14',
    role: 'Maintenance',
    phone: '+33 6 01 23 45 67',
    email: 'omar.benali@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
    stats: { tasksCompleted: 12, tasksTotal: 45, qualityRating: 3.2, avgDelay: 3.5 },
    status: 'inactive'
  },
  {
    id: 'STAFF011',
    name: 'Leila Fassi',
    photo: 'https://i.pravatar.cc/150?img=24',
    role: 'Femme de menage',
    phone: '+33 6 12 34 56 89',
    email: 'leila.fassi@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: false, Sat: false, Sun: false },
    stats: { tasksCompleted: 53, tasksTotal: 58, qualityRating: 4.7, avgDelay: 0.6 },
    status: 'active'
  },
  {
    id: 'STAFF012',
    name: 'Khalid Rami',
    photo: 'https://i.pravatar.cc/150?img=16',
    role: 'Chauffeur',
    phone: '+33 6 23 45 67 90',
    email: 'khalid.rami@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: false, Fri: true, Sat: true, Sun: true },
    stats: { tasksCompleted: 66, tasksTotal: 70, qualityRating: 4.6, avgDelay: 0.7 },
    status: 'active'
  },
  {
    id: 'STAFF013',
    name: 'Samira Kettani',
    photo: 'https://i.pravatar.cc/150?img=26',
    role: 'Conciergerie',
    phone: '+33 6 34 56 78 01',
    email: 'samira.kettani@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
    stats: { tasksCompleted: 81, tasksTotal: 85, qualityRating: 4.75, avgDelay: 0.5 },
    status: 'active'
  },
  {
    id: 'STAFF014',
    name: 'Mehdi Lahlou',
    photo: 'https://i.pravatar.cc/150?img=17',
    role: 'Maintenance',
    phone: '+33 6 45 67 89 12',
    email: 'mehdi.lahlou@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
    stats: { tasksCompleted: 42, tasksTotal: 48, qualityRating: 4.55, avgDelay: 1.0 },
    status: 'active'
  },
  {
    id: 'STAFF015',
    name: 'Zineb Alami',
    photo: 'https://i.pravatar.cc/150?img=27',
    role: 'Femme de menage',
    phone: '+33 6 56 78 90 23',
    email: 'zineb.alami@sojori.com',
    availability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
    stats: { tasksCompleted: 58, tasksTotal: 62, qualityRating: 4.8, avgDelay: 0.4 },
    status: 'active'
  }
];

const ROLES = ['Tous', 'Femme de menage', 'Maintenance', 'Conciergerie', 'Chauffeur'];

export function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('Tous');
  const [selectedStatus, setSelectedStatus] = useState('Tous');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredStaff = useMemo(() => {
    return MOCK_STAFF.filter(staff => {
      const matchesSearch =
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = selectedRole === 'Tous' || staff.role === selectedRole;
      let matchesStatus = true;
      if (selectedStatus === 'Actif') matchesStatus = staff.status === 'active';
      else if (selectedStatus === 'Inactif') matchesStatus = staff.status === 'inactive';
      else if (selectedStatus === 'En conge') matchesStatus = staff.status === 'en_conge';
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [searchQuery, selectedRole, selectedStatus]);

  const stats = useMemo(() => {
    const active = MOCK_STAFF.filter(s => s.status === 'active');
    const total = MOCK_STAFF.reduce((sum, s) => sum + s.stats.tasksTotal, 0);
    const completed = MOCK_STAFF.reduce((sum, s) => sum + s.stats.tasksCompleted, 0);
    const avgQuality = MOCK_STAFF.reduce((sum, s) => sum + s.stats.qualityRating, 0) / MOCK_STAFF.length;

    return {
      total: MOCK_STAFF.length,
      active: active.length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgQuality: avgQuality.toFixed(1),
    };
  }, []);

  const getRoleBadge = (role: string) => {
    const config = {
      'Femme de menage': { color: t.info, icon: '🧹' },
      'Maintenance': { color: t.warning, icon: '🔧' },
      'Conciergerie': { color: t.ai, icon: '🎯' },
      'Chauffeur': { color: t.success, icon: '🚗' },
    };
    const c = config[role as keyof typeof config] || { color: t.text3, icon: '👤' };
    return { color: c.color, label: `${c.icon} ${role}` };
  };

  const columns = [
    {
      key: 'member',
      label: 'Membre',
      render: (row: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={row.photo} sx={{ width: 40, height: 40 }} />
          <Box>
            <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{row.name}</Typography>
            <Typography sx={{ fontSize: '12px', color: t.text3 }}>{row.id}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row: any) => {
        const badge = getRoleBadge(row.role);
        return <Chip label={badge.label} size="small" sx={{ bgcolor: badge.color + '20', color: badge.color, fontWeight: 600 }} />;
      },
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row: any) => (
        <Box>
          <Typography sx={{ fontSize: '12px', color: t.text2 }}>📱 {row.phone}</Typography>
          <Typography sx={{ fontSize: '12px', color: t.text3 }}>✉️ {row.email}</Typography>
        </Box>
      ),
    },
    {
      key: 'availability',
      label: 'Disponibilites',
      render: (row: any) => (
        <Stack direction="row" spacing={0.5}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
            const avail = row.availability[day];
            return (
              <Box
                key={day}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '4px',
                  bgcolor: avail ? t.success + '20' : t.bg2,
                  color: avail ? t.success : t.text4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                }}
              >
                {day[0]}
              </Box>
            );
          })}
        </Stack>
      ),
    },
    {
      key: 'stats',
      label: 'Taches',
      render: (row: any) => (
        <Box>
          <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
            <span style={{ color: t.success }}>{row.stats.tasksCompleted}</span> / {row.stats.tasksTotal}
          </Typography>
          <Box sx={{ width: 80, height: 4, bgcolor: t.bg2, borderRadius: 1, mt: 0.5 }}>
            <Box
              sx={{
                width: `${(row.stats.tasksCompleted / row.stats.tasksTotal) * 100}%`,
                height: 4,
                bgcolor: t.success,
                borderRadius: 1,
              }}
            />
          </Box>
        </Box>
      ),
    },
    {
      key: 'quality',
      label: 'Qualite',
      render: (row: any) => (
        <Box>
          <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>⭐ {row.stats.qualityRating}</Typography>
          <Typography sx={{ fontSize: '11px', color: t.text3 }}>⏱️ {row.stats.avgDelay}h delai</Typography>
        </Box>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row: any) => {
        const statusMap = {
          active: { label: 'Actif', color: t.success },
          inactive: { label: 'Inactif', color: t.error },
          en_conge: { label: 'En conge', color: t.warning },
        };
        const s = statusMap[row.status as keyof typeof statusMap];
        return <Chip label={s.label} size="small" sx={{ bgcolor: s.color + '20', color: s.color, fontWeight: 600 }} />;
      },
    },
    {
      key: 'actions',
      label: '',
      render: () => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Modifier">
            <IconButton size="small"><span style={{ fontSize: '16px' }}>✏️</span></IconButton>
          </Tooltip>
          <Tooltip title="Voir planning">
            <IconButton size="small"><span style={{ fontSize: '16px' }}>📆</span></IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Équipe']}>
      <PageHeader title="Équipe" count={`${filteredStaff.length}`}>
        <Button sx={btnPrimarySx} onClick={() => setShowAddModal(true)}>+ Ajouter membre</Button>
      </PageHeader>

      <Box sx={{ px: { xs: 2, md: 3 }, pb: 4 }}>
        <Stack spacing={3}>
          {/* Stats */}
          <Stack direction="row" spacing={2}>
            <StatCard title="Total Staff" value={`${stats.total}`} icon="👥" color={t.primary} />
            <StatCard title="Actifs" value={`${stats.active}`} icon="✅" color={t.success} />
            <StatCard title="Taux completion" value={`${stats.completionRate}%`} icon="📊" color={t.ai} />
            <StatCard title="Qualite moyenne" value={stats.avgQuality} icon="⭐" color={t.warning} />
          </Stack>

          {/* Filters */}
          <Box sx={{ bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '12px', p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                size="small"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
                }}
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Role</InputLabel>
                <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} label="Role">
                  {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Statut</InputLabel>
                <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} label="Statut">
                  <MenuItem value="Tous">Tous</MenuItem>
                  <MenuItem value="Actif">Actif</MenuItem>
                  <MenuItem value="Inactif">Inactif</MenuItem>
                  <MenuItem value="En conge">En conge</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Table */}
          <DataTable columns={columns} data={filteredStaff} emptyMessage="Aucun membre trouve" />
        </Stack>
      </Box>

      {/* Add Modal (placeholder) */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un membre</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: t.text3, py: 4, textAlign: 'center' }}>
            Formulaire d'ajout a implementer
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddModal(false)}>Annuler</Button>
          <Button variant="contained" sx={btnPrimarySx}>Creer</Button>
        </DialogActions>
      </Dialog>
    </DashboardWrapper>
  );
}
