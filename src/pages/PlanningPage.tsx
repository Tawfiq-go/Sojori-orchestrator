import { useState, useMemo } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  StatCard,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Avatar,
} from '@mui/material';

// MOCK DATA - Tasks for planning
type PlanningMockTask = {
  id: string;
  staffId: string;
  staffName: string;
  type: string;
  icon: string;
  listing: string;
  date: string;
  time: string;
  duration: number;
  status: string;
};

const MOCK_TASKS: PlanningMockTask[] = [];
for (let i = 0; i < 180; i++) {
  const dayOffset = Math.floor(i / 6);
  const date = new Date();
  date.setDate(date.getDate() + dayOffset - 5);

  const staffList = [
    { id: 'STAFF001', name: 'Fatima El Amrani', role: 'Femme de menage' },
    { id: 'STAFF003', name: 'Khadija Moussaoui', role: 'Femme de menage' },
    { id: 'STAFF007', name: 'Sanaa Idrissi', role: 'Femme de menage' },
    { id: 'STAFF011', name: 'Leila Fassi', role: 'Femme de menage' },
    { id: 'STAFF015', name: 'Zineb Alami', role: 'Femme de menage' },
    { id: 'STAFF002', name: 'Youssef Bennani', role: 'Maintenance' },
    { id: 'STAFF006', name: 'Rachid Tazi', role: 'Maintenance' },
    { id: 'STAFF010', name: 'Omar Benali', role: 'Maintenance' },
    { id: 'STAFF014', name: 'Mehdi Lahlou', role: 'Maintenance' },
    { id: 'STAFF004', name: 'Mohamed Alaoui', role: 'Chauffeur' },
    { id: 'STAFF008', name: 'Hassan Berrada', role: 'Chauffeur' },
    { id: 'STAFF012', name: 'Khalid Rami', role: 'Chauffeur' },
    { id: 'STAFF005', name: 'Amina Chakir', role: 'Conciergerie' },
    { id: 'STAFF009', name: 'Nadia Azzouzi', role: 'Conciergerie' },
    { id: 'STAFF013', name: 'Samira Kettani', role: 'Conciergerie' },
  ];

  const staff = staffList[i % staffList.length];
  const taskTypes = [
    { type: 'menage', icon: '🧹', listing: 'Appt Marrakech Centre' },
    { type: 'maintenance', icon: '🔧', listing: 'Villa Atlas' },
    { type: 'transport', icon: '🚗', listing: 'Riad Medina' },
    { type: 'checkin', icon: '🚪', listing: 'Appt Gueliz' },
    { type: 'checkout', icon: '🔑', listing: 'Studio Hivernage' },
    { type: 'courses', icon: '🛒', listing: 'Appt Palmeraie' },
  ];

  const task = taskTypes[Math.floor(Math.random() * taskTypes.length)];
  const hour = 8 + Math.floor(Math.random() * 10);
  const statuses = ['pending', 'in_progress', 'completed'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];

  MOCK_TASKS.push({
    id: `TASK${String(i + 1).padStart(3, '0')}`,
    staffId: staff.id,
    staffName: staff.name,
    type: task.type,
    icon: task.icon,
    listing: task.listing,
    date: date.toISOString().split('T')[0],
    time: `${hour}:00`,
    duration: 2,
    status,
  });
}

const STAFF_MEMBERS = [
  { id: 'STAFF001', name: 'Fatima El Amrani', role: 'Femme de menage', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: 'STAFF002', name: 'Youssef Bennani', role: 'Maintenance', avatar: 'https://i.pravatar.cc/150?img=11' },
  { id: 'STAFF003', name: 'Khadija Moussaoui', role: 'Femme de menage', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: 'STAFF004', name: 'Mohamed Alaoui', role: 'Chauffeur', avatar: 'https://i.pravatar.cc/150?img=12' },
  { id: 'STAFF005', name: 'Amina Chakir', role: 'Conciergerie', avatar: 'https://i.pravatar.cc/150?img=9' },
  { id: 'STAFF006', name: 'Rachid Tazi', role: 'Maintenance', avatar: 'https://i.pravatar.cc/150?img=13' },
  { id: 'STAFF007', name: 'Sanaa Idrissi', role: 'Femme de menage', avatar: 'https://i.pravatar.cc/150?img=20' },
  { id: 'STAFF008', name: 'Hassan Berrada', role: 'Chauffeur', avatar: 'https://i.pravatar.cc/150?img=15' },
  { id: 'STAFF009', name: 'Nadia Azzouzi', role: 'Conciergerie', avatar: 'https://i.pravatar.cc/150?img=23' },
  { id: 'STAFF010', name: 'Omar Benali', role: 'Maintenance', avatar: 'https://i.pravatar.cc/150?img=14' },
  { id: 'STAFF011', name: 'Leila Fassi', role: 'Femme de menage', avatar: 'https://i.pravatar.cc/150?img=24' },
  { id: 'STAFF012', name: 'Khalid Rami', role: 'Chauffeur', avatar: 'https://i.pravatar.cc/150?img=16' },
  { id: 'STAFF013', name: 'Samira Kettani', role: 'Conciergerie', avatar: 'https://i.pravatar.cc/150?img=26' },
  { id: 'STAFF014', name: 'Mehdi Lahlou', role: 'Maintenance', avatar: 'https://i.pravatar.cc/150?img=17' },
  { id: 'STAFF015', name: 'Zineb Alami', role: 'Femme de menage', avatar: 'https://i.pravatar.cc/150?img=27' },
];

export function PlanningPage() {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Get dates for current week
  const weekDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setDate(today.getDate() + currentWeekOffset * 7);
    const monday = new Date(today);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [currentWeekOffset]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return MOCK_TASKS.filter(task => {
      const matchesStaff = selectedStaff === 'all' || task.staffId === selectedStaff;
      const matchesType = selectedType === 'all' || task.type === selectedType;
      const matchesDate = weekDates.includes(task.date);
      return matchesStaff && matchesType && matchesDate;
    });
  }, [selectedStaff, selectedType, weekDates]);

  // Group tasks by staff and date
  const groupedTasks = useMemo(() => {
    const grouped: Record<string, Record<string, any[]>> = {};
    STAFF_MEMBERS.forEach(staff => {
      grouped[staff.id] = {};
      weekDates.forEach(date => {
        grouped[staff.id][date] = filteredTasks.filter(t => t.staffId === staff.id && t.date === date);
      });
    });
    return grouped;
  }, [filteredTasks, weekDates]);

  // Calculate stats
  const stats = useMemo(() => {
    const pending = filteredTasks.filter(t => t.status === 'pending').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const total = filteredTasks.length;

    const staffWorkload = STAFF_MEMBERS.map(staff => ({
      ...staff,
      taskCount: filteredTasks.filter(t => t.staffId === staff.id).length,
    })).sort((a, b) => b.taskCount - a.taskCount);

    return { pending, inProgress, completed, total, staffWorkload };
  }, [filteredTasks]);

  const getStatusColor = (status: string) => {
    if (status === 'completed') return t.success;
    if (status === 'in_progress') return t.warning;
    return t.text3;
  };

  const getDayLabel = (date: string) => {
    const d = new Date(date);
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Planning']}>
      <PageHeader title="Planning Staff" count={`${filteredTasks.length} taches`}>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}>
            <span style={{ fontSize: '20px' }}>⬅️</span>
          </IconButton>
          <Chip
            label={currentWeekOffset === 0 ? 'Cette semaine' : `Semaine ${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset}`}
            sx={{ bgcolor: t.primary, color: 'white', fontWeight: 600, minWidth: 140 }}
          />
          <IconButton onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}>
            <span style={{ fontSize: '20px' }}>➡️</span>
          </IconButton>
        </Stack>
      </PageHeader>

      <Box sx={{ px: { xs: 2, md: 3 }, pb: 4 }}>
        <Stack spacing={3}>
          {/* Stats */}
          <Stack direction="row" spacing={2}>
            <StatCard title="Total taches" value={`${stats.total}`} icon="📋" color={t.primary} />
            <StatCard title="En attente" value={`${stats.pending}`} icon="⏳" color={t.text3} />
            <StatCard title="En cours" value={`${stats.inProgress}`} icon="🔄" color={t.warning} />
            <StatCard title="Terminees" value={`${stats.completed}`} icon="✅" color={t.success} />
          </Stack>

          {/* Filters */}
          <Box sx={{ bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '12px', p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Staff membre</InputLabel>
                <Select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} label="Staff membre">
                  <MenuItem value="all">Tous les staff</MenuItem>
                  {STAFF_MEMBERS.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Type tache</InputLabel>
                <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} label="Type tache">
                  <MenuItem value="all">Tous types</MenuItem>
                  <MenuItem value="menage">🧹 Menage</MenuItem>
                  <MenuItem value="maintenance">🔧 Maintenance</MenuItem>
                  <MenuItem value="transport">🚗 Transport</MenuItem>
                  <MenuItem value="checkin">🚪 Check-in</MenuItem>
                  <MenuItem value="checkout">🔑 Check-out</MenuItem>
                  <MenuItem value="courses">🛒 Courses</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: '12px', color: t.text3 }}>
                Charge max: {stats.staffWorkload[0]?.name} ({stats.staffWorkload[0]?.taskCount} taches)
              </Typography>
            </Stack>
          </Box>

          {/* Planning Grid */}
          <Box sx={{ bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header Row */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '200px repeat(7, 1fr)',
              bgcolor: t.bg2,
              borderBottom: `2px solid ${t.border}`,
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}>
              <Box sx={{ p: 2, borderRight: `1px solid ${t.border}` }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: t.text }}>Staff membre</Typography>
              </Box>
              {weekDates.map(date => (
                <Box key={date} sx={{ p: 2, borderRight: `1px solid ${t.border}`, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>{getDayLabel(date)}</Typography>
                </Box>
              ))}
            </Box>

            {/* Staff Rows */}
            {STAFF_MEMBERS.map((staff, idx) => (
              <Box
                key={staff.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '200px repeat(7, 1fr)',
                  borderBottom: idx < STAFF_MEMBERS.length - 1 ? `1px solid ${t.border}` : 'none',
                  '&:hover': { bgcolor: t.bg0 },
                }}
              >
                {/* Staff Name */}
                <Box sx={{ p: 2, borderRight: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={staff.avatar} sx={{ width: 32, height: 32 }} />
                  <Box>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>{staff.name}</Typography>
                    <Typography sx={{ fontSize: '11px', color: t.text3 }}>{staff.role}</Typography>
                  </Box>
                </Box>

                {/* Days */}
                {weekDates.map(date => {
                  const tasks = groupedTasks[staff.id]?.[date] || [];
                  return (
                    <Box
                      key={date}
                      sx={{
                        p: 1,
                        borderRight: `1px solid ${t.border}`,
                        minHeight: 80,
                        bgcolor: tasks.length > 0 ? t.bg0 : 'transparent',
                      }}
                    >
                      <Stack spacing={0.5}>
                        {tasks.map(task => (
                          <Tooltip key={task.id} title={`${task.listing} - ${task.time}`}>
                            <Box
                              sx={{
                                p: 0.5,
                                bgcolor: getStatusColor(task.status) + '20',
                                border: `1px solid ${getStatusColor(task.status)}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: getStatusColor(task.status) + '30' },
                              }}
                            >
                              <Typography sx={{ fontSize: '10px', fontWeight: 600 }}>
                                {task.icon} {task.time}
                              </Typography>
                              <Typography sx={{ fontSize: '9px', color: t.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {task.listing}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ))}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>

          {/* Legend */}
          <Box sx={{ bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '12px', p: 2 }}>
            <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>Legende:</Typography>
              <Stack direction="row" spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ w: 12, h: 12, bgcolor: t.text3 + '20', border: `1px solid ${t.text3}`, borderRadius: '4px' }} />
                  <Typography sx={{ fontSize: '11px' }}>En attente</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ w: 12, h: 12, bgcolor: t.warning + '20', border: `1px solid ${t.warning}`, borderRadius: '4px' }} />
                  <Typography sx={{ fontSize: '11px' }}>En cours</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ w: 12, h: 12, bgcolor: t.success + '20', border: `1px solid ${t.success}`, borderRadius: '4px' }} />
                  <Typography sx={{ fontSize: '11px' }}>Terminee</Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </DashboardWrapper>
  );
}
