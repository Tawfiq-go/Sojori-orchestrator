// ════════════════════════════════════════════════════════════════════
// Sojori — TeamFilters · Filtres équipe (v20260514-2010)
// ════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Stack,
  Chip,
  Autocomplete,
  Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { tokens as t, btnGhostSx } from '../dashboard/DashboardV2.components';
import type { TeamMember } from './AddTeamMemberModal';

// P2.3: 5 filtres à implémenter
export interface TeamFilterState {
  searchText: string;
  roles: string[];
  statuses: ('active' | 'inactive' | 'on_leave')[];
  availabilityDay: 'all' | 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';
  zones: string[];
  skills: string[];
  hasCompleteSchedule: 'all' | 'yes' | 'no';
}

export const defaultTeamFilters: TeamFilterState = {
  searchText: '',
  roles: [],
  statuses: [],
  availabilityDay: 'all',
  zones: [],
  skills: [],
  hasCompleteSchedule: 'all',
};

const ROLES = ['Femme de menage', 'Maintenance', 'Conciergerie', 'Chauffeur', 'Manager', 'Admin'];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const ZONES = ['Marrakech Centre', 'Gueliz', 'Hivernage', 'Palmeraie', 'Route Ouarzazate', 'Targa', 'Autre'];
const SKILLS = ['Ménage', 'Plomberie', 'Électricité', 'Jardinage', 'Conduite', 'Communication', 'Organisation', 'Bricolage', 'Informatique'];

interface TeamFiltersProps {
  filters: TeamFilterState;
  onChange: (filters: TeamFilterState) => void;
  onReset: () => void;
  teamCount: number;
  filteredCount: number;
}

export function TeamFilters({ filters, onChange, onReset, teamCount, filteredCount }: TeamFiltersProps) {
  const [expanded, setExpanded] = useState<string | false>('search');

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const updateFilter = (key: keyof TeamFilterState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const activeFiltersCount =
    (filters.searchText ? 1 : 0) +
    filters.roles.length +
    filters.statuses.length +
    (filters.availabilityDay !== 'all' ? 1 : 0) +
    filters.zones.length +
    filters.skills.length +
    (filters.hasCompleteSchedule !== 'all' ? 1 : 0);

  return (
    <Box sx={{ bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.text }}>
            Filtres
            {activeFiltersCount > 0 && (
              <Chip
                label={activeFiltersCount}
                size="small"
                sx={{ ml: 1, height: 20, fontSize: 11, bgcolor: t.primaryTint, color: t.primary }}
              />
            )}
          </Typography>
          <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.5 }}>
            {filteredCount} membre{filteredCount > 1 ? 's' : ''} sur {teamCount}
          </Typography>
        </Box>
        {activeFiltersCount > 0 && (
          <Button onClick={onReset} sx={{ ...btnGhostSx, fontSize: 12 }}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* Accordion 1: Recherche & Statut */}
      <Accordion expanded={expanded === 'search'} onChange={handleAccordionChange('search')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>🔍 Recherche & Statut</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField
              size="small"
              placeholder="Rechercher par nom, email, code..."
              value={filters.searchText}
              onChange={(e) => updateFilter('searchText', e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
                },
              }}
              fullWidth
            />
            <Autocomplete
              multiple
              options={['active', 'inactive', 'on_leave']}
              getOptionLabel={(option) => {
                const labels = { active: 'Actif', inactive: 'Inactif', on_leave: 'En congé' };
                return labels[option as keyof typeof labels];
              }}
              value={filters.statuses}
              onChange={(_, newValue) => updateFilter('statuses', newValue)}
              renderInput={(params) => <TextField {...params} label="Statuts" size="small" />}
              size="small"
              renderValue={(value, getItemProps) =>
                value.map((option, index) => {
                  const labels = { active: 'Actif', inactive: 'Inactif', on_leave: 'En congé' };
                  return (
                    <Chip
                      label={labels[option as keyof typeof labels]}
                      size="small"
                      {...getItemProps({ index })}
                    />
                  );
                })
              }
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Accordion 2: Rôles & Compétences */}
      <Accordion expanded={expanded === 'roles'} onChange={handleAccordionChange('roles')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            👔 Rôles & Compétences
            {(filters.roles.length + filters.skills.length) > 0 && (
              <Chip label={filters.roles.length + filters.skills.length} size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Autocomplete
              multiple
              options={ROLES}
              value={filters.roles}
              onChange={(_, newValue) => updateFilter('roles', newValue)}
              renderInput={(params) => <TextField {...params} label="Rôles" size="small" />}
              size="small"
              renderValue={(value, getItemProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" color="primary" {...getItemProps({ index })} />
                ))
              }
            />
            <Autocomplete
              multiple
              options={SKILLS}
              value={filters.skills}
              onChange={(_, newValue) => updateFilter('skills', newValue)}
              renderInput={(params) => <TextField {...params} label="Compétences" size="small" />}
              size="small"
              renderValue={(value, getItemProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" color="secondary" {...getItemProps({ index })} />
                ))
              }
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Accordion 3: Disponibilité */}
      <Accordion expanded={expanded === 'availability'} onChange={handleAccordionChange('availability')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            📅 Disponibilité
            {(filters.availabilityDay !== 'all' || filters.hasCompleteSchedule !== 'all') && (
              <Chip label="●" size="small" sx={{ ml: 1, height: 18, fontSize: 10, bgcolor: t.primary, color: '#fff' }} />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 2 }}>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Disponible le</InputLabel>
              <Select
                value={filters.availabilityDay}
                onChange={(e) => updateFilter('availabilityDay', e.target.value)}
                label="Disponible le"
              >
                <MenuItem value="all">Tous les jours</MenuItem>
                {DAYS.map((day) => (
                  <MenuItem key={day} value={day}>{day}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Planning complet</InputLabel>
              <Select
                value={filters.hasCompleteSchedule}
                onChange={(e) => updateFilter('hasCompleteSchedule', e.target.value)}
                label="Planning complet"
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="yes">Avec planning complet (7/7)</MenuItem>
                <MenuItem value="no">Planning incomplet (&lt; 7/7)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Accordion 4: Zone */}
      <Accordion expanded={expanded === 'zone'} onChange={handleAccordionChange('zone')} sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: t.bg2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            📍 Zone d'intervention
            {filters.zones.length > 0 && (
              <Chip label={filters.zones.length} size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 2 }}>
          <Autocomplete
            multiple
            options={ZONES}
            value={filters.zones}
            onChange={(_, newValue) => updateFilter('zones', newValue)}
            renderInput={(params) => <TextField {...params} label="Zones" size="small" />}
            size="small"
            renderValue={(value, getItemProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getItemProps({ index })} />
              ))
            }
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

// P2.3: Fonction pour appliquer les filtres
export function applyTeamFilters(members: TeamMember[], filters: TeamFilterState): TeamMember[] {
  return members.filter((member) => {
    // 1. Recherche texte
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.staffCode.toLowerCase().includes(searchLower) ||
        member.phone.includes(searchLower);
      if (!matchesSearch) return false;
    }

    // 2. Rôles
    if (filters.roles.length > 0 && !filters.roles.includes(member.role)) {
      return false;
    }

    // 3. Statuts
    if (filters.statuses.length > 0 && !filters.statuses.includes(member.status)) {
      return false;
    }

    // 4. Disponibilité jour spécifique
    if (filters.availabilityDay !== 'all') {
      const dayAvailability = member.availability[filters.availabilityDay];
      if (!dayAvailability || !dayAvailability.present) {
        return false;
      }
    }

    // 5. Zones
    if (filters.zones.length > 0 && !filters.zones.includes(member.zone)) {
      return false;
    }

    // 6. Compétences (au moins une compétence matchée)
    if (filters.skills.length > 0) {
      const hasSkill = filters.skills.some((skill) => member.skills.includes(skill));
      if (!hasSkill) return false;
    }

    // 7. Planning complet
    if (filters.hasCompleteSchedule !== 'all') {
      const presentDays = Object.values(member.availability).filter((d) => d.present).length;
      const isComplete = presentDays === 7;
      if (filters.hasCompleteSchedule === 'yes' && !isComplete) return false;
      if (filters.hasCompleteSchedule === 'no' && isComplete) return false;
    }

    return true;
  });
}
