// ════════════════════════════════════════════════════════════════════
// Sojori — TaskFilters · Filtres avancés tâches (v20260514-2010)
// ════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Button,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import { taskTypes, mockListings, mockStaff, type Task } from '../../data/mockTasks';

// Exported interface for task filter state
export interface TaskFilterState {
  searchText: string;
  origin: 'all' | 'task' | 'client';
  types: string[];
  subTypes: string[];
  statuses: Task['status'][];
  listingIds: string[];
  staffIds: string[];
  paymentStatus: 'all' | 'paid' | 'unpaid' | 'pending';
  emergency: 'all' | 'Normal' | 'Urgent' | 'Critical';
  hasReservation: 'all' | 'yes' | 'no';
  dateType: 'startDate' | 'createdAt';
  dateFrom: string;
  dateTo: string;
  period: 'all' | 'today' | 'tomorrow' | 'week';
}

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  onReset: () => void;
  taskCount: number;
  filteredCount: number;
}

const ALL_STATUSES: Task['status'][] = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_ADMIN',
  'CANCELLED_CUSTOMER',
  'ARCHIVED',
];

const STATUS_LABELS: Record<Task['status'], string> = {
  CREATED: 'Créée',
  ASSIGNED: 'Assignée',
  ACCEPTED: 'Acceptée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Complétée',
  CANCELLED_ADMIN: 'Annulée admin',
  CANCELLED_CUSTOMER: 'Annulée client',
  ARCHIVED: 'Archivée',
};

export function TaskFilters({ filters, onChange, onReset, taskCount, filteredCount }: TaskFiltersProps) {
  const [expanded, setExpanded] = useState<string | false>('quick');

  const handleChange = <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (filters.searchText) count++;
    if (filters.origin !== 'all') count++;
    if (filters.types.length > 0) count++;
    if (filters.subTypes.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.listingIds.length > 0) count++;
    if (filters.staffIds.length > 0) count++;
    if (filters.paymentStatus !== 'all') count++;
    if (filters.emergency !== 'all') count++;
    if (filters.hasReservation !== 'all') count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.period !== 'all') count++;
    return count;
  };

  const activeCount = activeFiltersCount();

  return (
    <Box sx={{ mb: 2 }}>
      {/* Quick filters bar */}
      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <FilterListIcon sx={{ color: t.text3, fontSize: 18 }} />
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3 }}>FILTRES</Typography>
        {activeCount > 0 && (
          <>
            <Chip
              label={`${activeCount} actif${activeCount > 1 ? 's' : ''}`}
              size="small"
              sx={{ bgcolor: t.primaryTint, color: t.primary, fontWeight: 600, height: 22 }}
            />
            <Button
              size="small"
              onClick={onReset}
              sx={{ fontSize: 11, textTransform: 'none', color: t.text3, minWidth: 'auto', p: '2px 8px' }}
            >
              Réinitialiser
            </Button>
          </>
        )}
        <Box sx={{ ml: 'auto', fontSize: 12, color: t.text3 }}>
          {filteredCount} / {taskCount} tâche{taskCount > 1 ? 's' : ''}
        </Box>
      </Box>

      {/* Accordion filters */}
      <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {/* Section 1: Quick Search & Period */}
        <Accordion expanded={expanded === 'quick'} onChange={() => setExpanded(expanded === 'quick' ? false : 'quick')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2, minHeight: 48 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>🔍 Recherche & Période</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 2 }}>
            <Stack spacing={2}>
              <TextField
                size="small"
                placeholder="Rechercher par nom, numéro réservation, guest..."
                value={filters.searchText}
                onChange={(e) => handleChange('searchText', e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                fullWidth
              />
              <Stack direction="row" spacing={1.5}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Période</InputLabel>
                  <Select
                    value={filters.period}
                    label="Période"
                    onChange={(e) => handleChange('period', e.target.value as TaskFilterState['period'])}
                  >
                    <MenuItem value="all">Toutes</MenuItem>
                    <MenuItem value="today">Aujourd'hui</MenuItem>
                    <MenuItem value="tomorrow">Demain</MenuItem>
                    <MenuItem value="week">Cette semaine</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Urgence</InputLabel>
                  <Select
                    value={filters.emergency}
                    label="Urgence"
                    onChange={(e) => handleChange('emergency', e.target.value as TaskFilterState['emergency'])}
                  >
                    <MenuItem value="all">Toutes</MenuItem>
                    <MenuItem value="Normal">Normal</MenuItem>
                    <MenuItem value="Urgent">Urgent</MenuItem>
                    <MenuItem value="Critical">Critique</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Section 2: Type & Status */}
        <Accordion expanded={expanded === 'type'} onChange={() => setExpanded(expanded === 'type' ? false : 'type')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2, minHeight: 48, borderTop: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>📋 Type & Statut</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Autocomplete
                multiple
                size="small"
                options={taskTypes.map((t) => t.value)}
                value={filters.types}
                onChange={(_, newValue) => handleChange('types', newValue)}
                renderInput={(params) => <TextField {...params} label="Types de tâche" placeholder="Sélectionner..." />}
                renderValue={(value, getItemProps) =>
                  value.map((option, index) => {
                    const type = taskTypes.find((t) => t.value === option);
                    return <Chip {...getItemProps({ index })} key={option} label={type?.label || option} size="small" />;
                  })
                }
              />
              <Autocomplete
                multiple
                size="small"
                options={ALL_STATUSES}
                value={filters.statuses}
                onChange={(_, newValue) => handleChange('statuses', newValue)}
                getOptionLabel={(option) => STATUS_LABELS[option]}
                renderInput={(params) => <TextField {...params} label="Statuts" placeholder="Sélectionner..." />}
                renderValue={(value, getItemProps) =>
                  value.map((option, index) => (
                    <Chip {...getItemProps({ index })} key={option} label={STATUS_LABELS[option]} size="small" />
                  ))
                }
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Origine</InputLabel>
                <Select
                  value={filters.origin}
                  label="Origine"
                  onChange={(e) => handleChange('origin', e.target.value as TaskFilterState['origin'])}
                >
                  <MenuItem value="all">Toutes</MenuItem>
                  <MenuItem value="task">Tâche</MenuItem>
                  <MenuItem value="client">Client</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Section 3: Assignment & Listing */}
        <Accordion expanded={expanded === 'assign'} onChange={() => setExpanded(expanded === 'assign' ? false : 'assign')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2, minHeight: 48, borderTop: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>👤 Assignation & Listing</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Autocomplete
                multiple
                size="small"
                options={mockStaff.map((s) => s.id)}
                value={filters.staffIds}
                onChange={(_, newValue) => handleChange('staffIds', newValue)}
                getOptionLabel={(option) => {
                  const staff = mockStaff.find((s) => s.id === option);
                  return staff ? `${staff.name} (${staff.code})` : option;
                }}
                renderInput={(params) => <TextField {...params} label="Staff membres" placeholder="Sélectionner..." />}
                renderValue={(value, getItemProps) =>
                  value.map((option, index) => {
                    const staff = mockStaff.find((s) => s.id === option);
                    return <Chip {...getItemProps({ index })} key={option} label={staff?.name || option} size="small" />;
                  })
                }
              />
              <Autocomplete
                multiple
                size="small"
                options={mockListings.map((l) => l.id)}
                value={filters.listingIds}
                onChange={(_, newValue) => handleChange('listingIds', newValue)}
                getOptionLabel={(option) => {
                  const listing = mockListings.find((l) => l.id === option);
                  return listing?.name || option;
                }}
                renderInput={(params) => <TextField {...params} label="Listings" placeholder="Sélectionner..." />}
                renderValue={(value, getItemProps) =>
                  value.map((option, index) => {
                    const listing = mockListings.find((l) => l.id === option);
                    return <Chip {...getItemProps({ index })} key={option} label={listing?.name || option} size="small" />;
                  })
                }
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Section 4: Payment & Reservation */}
        <Accordion expanded={expanded === 'payment'} onChange={() => setExpanded(expanded === 'payment' ? false : 'payment')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2, minHeight: 48, borderTop: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>💰 Paiement & Réservation</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 2 }}>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Statut paiement</InputLabel>
                <Select
                  value={filters.paymentStatus}
                  label="Statut paiement"
                  onChange={(e) => handleChange('paymentStatus', e.target.value as TaskFilterState['paymentStatus'])}
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="paid">Payé</MenuItem>
                  <MenuItem value="unpaid">Non payé</MenuItem>
                  <MenuItem value="pending">En attente</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Réservation liée</InputLabel>
                <Select
                  value={filters.hasReservation}
                  label="Réservation liée"
                  onChange={(e) => handleChange('hasReservation', e.target.value as TaskFilterState['hasReservation'])}
                >
                  <MenuItem value="all">Toutes</MenuItem>
                  <MenuItem value="yes">Avec réservation</MenuItem>
                  <MenuItem value="no">Sans réservation</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Section 5: Dates */}
        <Accordion expanded={expanded === 'dates'} onChange={() => setExpanded(expanded === 'dates' ? false : 'dates')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2, minHeight: 48, borderTop: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>📅 Dates personnalisées</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 2 }}>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Type de date</InputLabel>
                <Select
                  value={filters.dateType}
                  label="Type de date"
                  onChange={(e) => handleChange('dateType', e.target.value as TaskFilterState['dateType'])}
                >
                  <MenuItem value="startDate">Date d'exécution</MenuItem>
                  <MenuItem value="createdAt">Date de création</MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  size="small"
                  type="date"
                  label="Du"
                  value={filters.dateFrom}
                  onChange={(e) => handleChange('dateFrom', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
                <TextField
                  size="small"
                  type="date"
                  label="Au"
                  value={filters.dateTo}
                  onChange={(e) => handleChange('dateTo', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}

// Helper function to apply filters
export function applyTaskFilters(tasks: Task[], filters: TaskFilterState): Task[] {
  return tasks.filter((task) => {
    // Search text
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      const matchName = task.name.toLowerCase().includes(search);
      const matchItemNumber = task.itemNumber.toLowerCase().includes(search);
      const matchReservation = task.reservationNumber?.toLowerCase().includes(search);
      const matchGuest = task.guestName?.toLowerCase().includes(search);
      if (!matchName && !matchItemNumber && !matchReservation && !matchGuest) return false;
    }

    // Origin
    if (filters.origin !== 'all' && task.origin !== filters.origin) return false;

    // Types
    if (filters.types.length > 0 && !filters.types.includes(task.type)) return false;

    // Statuses
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;

    // Listings
    if (filters.listingIds.length > 0 && !filters.listingIds.includes(task.listingId)) return false;

    // Staff
    if (filters.staffIds.length > 0) {
      if (!task.staffId || !filters.staffIds.includes(task.staffId)) return false;
    }

    // Payment status
    if (filters.paymentStatus !== 'all') {
      if (filters.paymentStatus === 'paid' && !task.paid) return false;
      if (filters.paymentStatus === 'unpaid' && task.paid) return false;
    }

    // Emergency
    if (filters.emergency !== 'all' && task.priority !== filters.emergency) return false;

    // Has reservation
    if (filters.hasReservation !== 'all') {
      const hasRes = !!task.reservationId;
      if (filters.hasReservation === 'yes' && !hasRes) return false;
      if (filters.hasReservation === 'no' && hasRes) return false;
    }

    // Period
    if (filters.period !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const taskDate = new Date(task.startDate);
      taskDate.setHours(0, 0, 0, 0);

      if (filters.period === 'today' && taskDate.getTime() !== today.getTime()) return false;
      if (filters.period === 'tomorrow' && taskDate.getTime() !== tomorrow.getTime()) return false;
      if (filters.period === 'week' && (taskDate < today || taskDate > nextWeek)) return false;
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      const dateToCheck = filters.dateType === 'createdAt' ? new Date(task.createdAt) : new Date(task.startDate);
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (dateToCheck < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59);
        if (dateToCheck > to) return false;
      }
    }

    return true;
  });
}

// Default filters
export const defaultTaskFilters: TaskFilterState = {
  searchText: '',
  origin: 'all',
  types: [],
  subTypes: [],
  statuses: [],
  listingIds: [],
  staffIds: [],
  paymentStatus: 'all',
  emergency: 'all',
  hasReservation: 'all',
  dateType: 'startDate',
  dateFrom: '',
  dateTo: '',
  period: 'all',
};
