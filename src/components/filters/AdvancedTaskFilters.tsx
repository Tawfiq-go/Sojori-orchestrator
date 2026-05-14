// ════════════════════════════════════════════════════════════════════
// Sojori — AdvancedTaskFilters
// Accordion replié par défaut · 15+ filtres · count actifs · reset
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import {
  Box, Stack, Accordion, AccordionSummary, AccordionDetails, Typography, Button,
  TextField, Select, MenuItem, Chip, FormControl, RadioGroup,
  FormControlLabel, Radio,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e', primaryTint: 'rgba(230,176,34,0.08)',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

export interface TaskFilters {
  search?: string;
  origin?: string;
  subtypes?: string[];
  statuses?: string[];
  listingIds?: string[];
  staffCodes?: string[];
  paymentStatus?: string;
  hasAssociation?: 'yes' | 'no' | 'any';
  emergency?: string;
  dateType?: 'startDate' | 'createdAt';
  dateFrom?: string;
  dateTo?: string;
  period?: 'today' | 'tomorrow' | 'week' | 'all';
  zones?: string[];
  statusCards?: string[];
}

const ORIGINS = ['Auto-orchestrator', 'Manuel', 'Demande client', 'API externe'];
const SUBTYPES = ['Ménage', 'Check-in', 'Check-out', 'Mid-stay', 'Inspection', 'Réparation', 'Photos', 'Livraison'];
const STATUSES = [
  { id: 'pending', label: 'À faire', color: T.info },
  { id: 'in_progress', label: 'En cours', color: T.warning },
  { id: 'review', label: 'Review', color: '#8b5cf6' },
  { id: 'done', label: 'Complété', color: T.success },
  { id: 'cancelled', label: 'Annulé', color: T.text3 },
  { id: 'overdue', label: 'Retard', color: T.error },
  { id: 'blocked', label: 'Bloqué', color: T.error },
  { id: 'archived', label: 'Archivé', color: T.text3 },
];
const LISTINGS = ['Villa Belvédère', 'Dar Sojori', 'Villa Atlas', 'Atlas Loft', 'Médina House'];
const STAFF = ['YK · Yasmine', 'HM · Hassan', 'MR · Mehdi', 'FM · Fatima', 'KE · Karim'];
const ZONES = ['Nice', 'Marrakech Médina', 'Marrakech Guéliz', 'Marrakech Palmeraie', 'Calvi'];
const STATUS_CARDS = ['Vacant', 'Occupied', 'Dirty', 'Clean', 'Maintenance', 'Blocked'];

interface Props {
  filters?: TaskFilters;
  onChange?: (filters: TaskFilters) => void;
}

export default function AdvancedTaskFilters({ filters: initial = {}, onChange }: Props) {
  const [filters, setFilters] = useState<TaskFilters>(initial);
  const [open, setOpen] = useState(false);

  const update = <K extends keyof TaskFilters>(k: K, v: TaskFilters[K]) => {
    const next = { ...filters, [k]: v };
    setFilters(next); onChange?.(next);
  };
  const toggleMulti = (k: 'subtypes' | 'statuses' | 'listingIds' | 'staffCodes' | 'zones' | 'statusCards', v: string) => {
    const arr = (filters[k] as string[]) || [];
    update(k, arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };
  const reset = () => { setFilters({}); onChange?.({}); };

  const activeCount = useMemo(() => {
    let n = 0;
    Object.entries(filters).forEach(([_, v]) => {
      if (v === undefined || v === '' || v === 'any' || v === 'all') return;
      if (Array.isArray(v) && v.length === 0) return;
      n++;
    });
    return n;
  }, [filters]);

  return (
    <Accordion expanded={open} onChange={() => setOpen(!open)} disableGutters elevation={0}
      sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<Box>▾</Box>} sx={{ minHeight: 52, px: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>🔍 Filtres avancés</Typography>
          {activeCount > 0 && (
            <Chip size="small" label={`${activeCount} actif${activeCount > 1 ? 's' : ''}`}
              sx={{ bgcolor: T.primary, color: T.text, fontWeight: 600 }} />
          )}
          {activeCount > 0 && (
            <Button size="small" onClick={(e) => { e.stopPropagation(); reset(); }}
              sx={{ ml: 'auto', textTransform: 'none', color: T.error }}>
              Reset
            </Button>
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: T.bg2, p: 2.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {/* Search */}
          <Box sx={{ gridColumn: { md: 'span 3' } }}>
            <TextField fullWidth size="small" placeholder="🔍 Rechercher (titre, listing, staff...)"
              value={filters.search || ''} onChange={(e) => update('search', e.target.value)} />
          </Box>

          {/* Period chips */}
          <Box sx={{ gridColumn: { md: 'span 3' } }}>
            <FilterLabel>Période</FilterLabel>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {[
                { v: 'today', l: 'Aujourd\'hui' },
                { v: 'tomorrow', l: 'Demain' },
                { v: 'week', l: 'Cette semaine' },
                { v: 'all', l: 'Tout' },
              ].map(o => (
                <Chip key={o.v} label={o.l} clickable
                  color={filters.period === o.v ? 'primary' : 'default'}
                  variant={filters.period === o.v ? 'filled' : 'outlined'}
                  onClick={() => update('period', o.v as any)} />
              ))}
            </Stack>
          </Box>

          {/* Origin */}
          <FilterBox label="Origine">
            <Select size="small" displayEmpty value={filters.origin || ''} onChange={(e) => update('origin', e.target.value)}>
              <MenuItem value=""><em>Toutes</em></MenuItem>
              {ORIGINS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
          </FilterBox>

          {/* Emergency */}
          <FilterBox label="Urgence">
            <Select size="small" displayEmpty value={filters.emergency || ''} onChange={(e) => update('emergency', e.target.value)}>
              <MenuItem value=""><em>Toutes</em></MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="critical">🚨 Critical</MenuItem>
            </Select>
          </FilterBox>

          {/* Payment */}
          <FilterBox label="Paiement">
            <Select size="small" displayEmpty value={filters.paymentStatus || ''} onChange={(e) => update('paymentStatus', e.target.value)}>
              <MenuItem value=""><em>Tous</em></MenuItem>
              <MenuItem value="paid">Payé</MenuItem>
              <MenuItem value="unpaid">Non payé</MenuItem>
              <MenuItem value="partial">Partiel</MenuItem>
            </Select>
          </FilterBox>

          {/* Has association */}
          <FilterBox label="Associé à une réservation">
            <RadioGroup row value={filters.hasAssociation || 'any'} onChange={(e) => update('hasAssociation', e.target.value as any)}>
              <FormControlLabel value="any" control={<Radio size="small" />} label="Tous" />
              <FormControlLabel value="yes" control={<Radio size="small" />} label="Oui" />
              <FormControlLabel value="no" control={<Radio size="small" />} label="Non" />
            </RadioGroup>
          </FilterBox>

          {/* Date Type */}
          <FilterBox label="Date">
            <RadioGroup row value={filters.dateType || 'startDate'} onChange={(e) => update('dateType', e.target.value as any)}>
              <FormControlLabel value="startDate" control={<Radio size="small" />} label="Échéance" />
              <FormControlLabel value="createdAt" control={<Radio size="small" />} label="Création" />
            </RadioGroup>
          </FilterBox>

          {/* Date range */}
          <FilterBox label="De">
            <TextField size="small" type="date" slotProps={{ inputLabel: { shrink: true } }}
              value={filters.dateFrom || ''} onChange={(e) => update('dateFrom', e.target.value)} />
          </FilterBox>
          <FilterBox label="À">
            <TextField size="small" type="date" slotProps={{ inputLabel: { shrink: true } }}
              value={filters.dateTo || ''} onChange={(e) => update('dateTo', e.target.value)} />
          </FilterBox>

          {/* Sub-types (multi-chip) */}
          <Box sx={{ gridColumn: { md: 'span 3' } }}>
            <FilterLabel>Sous-types ({filters.subtypes?.length || 0})</FilterLabel>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {SUBTYPES.map(s => (
                <Chip key={s} label={s} clickable size="small"
                  color={filters.subtypes?.includes(s) ? 'primary' : 'default'}
                  variant={filters.subtypes?.includes(s) ? 'filled' : 'outlined'}
                  onClick={() => toggleMulti('subtypes', s)} />
              ))}
            </Stack>
          </Box>

          {/* Statuses */}
          <Box sx={{ gridColumn: { md: 'span 3' } }}>
            <FilterLabel>Statuts ({filters.statuses?.length || 0})</FilterLabel>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {STATUSES.map(s => {
                const on = filters.statuses?.includes(s.id);
                return (
                  <Chip key={s.id} label={s.label} clickable size="small"
                    onClick={() => toggleMulti('statuses', s.id)}
                    sx={{
                      bgcolor: on ? `${s.color}25` : T.bg1,
                      color: on ? s.color : T.text2,
                      fontWeight: on ? 700 : 500,
                      borderColor: s.color,
                    }}
                    variant={on ? 'filled' : 'outlined'} />
                );
              })}
            </Stack>
          </Box>

          {/* Listings */}
          <Box sx={{ gridColumn: { md: 'span 3' } }}>
            <FilterLabel>Listings ({filters.listingIds?.length || 0})</FilterLabel>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {LISTINGS.map(l => (
                <Chip key={l} label={l} clickable size="small"
                  color={filters.listingIds?.includes(l) ? 'primary' : 'default'}
                  variant={filters.listingIds?.includes(l) ? 'filled' : 'outlined'}
                  onClick={() => toggleMulti('listingIds', l)} />
              ))}
            </Stack>
          </Box>

          {/* Staff */}
          <Box sx={{ gridColumn: { md: 'span 3' } }}>
            <FilterLabel>Staff ({filters.staffCodes?.length || 0})</FilterLabel>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {STAFF.map(s => (
                <Chip key={s} label={s} clickable size="small"
                  color={filters.staffCodes?.includes(s) ? 'primary' : 'default'}
                  variant={filters.staffCodes?.includes(s) ? 'filled' : 'outlined'}
                  onClick={() => toggleMulti('staffCodes', s)} />
              ))}
            </Stack>
          </Box>

          {/* Zones + Status Cards */}
          <Box sx={{ gridColumn: { md: 'span 3' }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <FilterLabel>Zones ({filters.zones?.length || 0})</FilterLabel>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                {ZONES.map(z => (
                  <Chip key={z} label={z} clickable size="small"
                    color={filters.zones?.includes(z) ? 'primary' : 'default'}
                    variant={filters.zones?.includes(z) ? 'filled' : 'outlined'}
                    onClick={() => toggleMulti('zones', z)} />
                ))}
              </Stack>
            </Box>
            <Box>
              <FilterLabel>État logement ({filters.statusCards?.length || 0})</FilterLabel>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                {STATUS_CARDS.map(s => (
                  <Chip key={s} label={s} clickable size="small"
                    color={filters.statusCards?.includes(s) ? 'primary' : 'default'}
                    variant={filters.statusCards?.includes(s) ? 'filled' : 'outlined'}
                    onClick={() => toggleMulti('statusCards', s)} />
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function FilterBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <FilterLabel>{label}</FilterLabel>
      <FormControl fullWidth>{children}</FormControl>
    </Box>
  );
}
function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.75 }}>
      {children}
    </Typography>
  );
}
