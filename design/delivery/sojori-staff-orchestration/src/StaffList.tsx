// ════════════════════════════════════════════════════════════════════
// StaffList.tsx — Liste des staff (grille de cartes)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { Box, Stack, Typography, Button, TextField, MenuItem, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { Staff, TaskType, T, TASK_TYPE_META } from './types';

export interface StaffListProps {
  staff: Staff[];
  loading?: boolean;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
}

const GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #fde68a, #d97706)',
  2: 'linear-gradient(135deg, #a5f3fc, #0e7490)',
  3: 'linear-gradient(135deg, #86efac, #16a34a)',
  4: 'linear-gradient(135deg, #ddd6fe, #7c3aed)',
  5: 'linear-gradient(135deg, #fda4af, #ec4899)',
  6: 'linear-gradient(135deg, #fcd34d, #d97706)',
};

const STATUS_META = {
  active: { dot: T.success, label: 'Actif' },
  off:    { dot: T.text4,   label: 'Hors service' },
  leave:  { dot: T.warning, label: 'Congé' },
};

export default function StaffList({ staff, loading, onCreate, onEdit, onDelete }: StaffListProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Staff['status']>('all');
  const [filterType, setFilterType] = useState<'all' | TaskType>('all');

  const filtered = useMemo(() => staff.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterType !== 'all' && !s.allowedTaskTypes.includes(filterType)) return false;
    if (search && !s.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [staff, search, filterStatus, filterType]);

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" gap={1.75} sx={{ mb: 3 }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 1.625,
          background: `linear-gradient(135deg, ${T.primarySoft}, ${T.primaryDeep})`,
          color: '#1a1408', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0, boxShadow: '0 6px 16px rgba(184,133,26,0.25)',
        }}>👷</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>Staff actif</Typography>
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.625, lineHeight: 1.55 }}>
            {staff.length} membres · {staff.filter(s => s.status === 'active').length} actifs ·
            {' '}{staff.filter(s => s.isAdmin).length} admin
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} sx={{
          background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`, color: '#1a1408',
          textTransform: 'none', fontWeight: 700, fontSize: 13, px: 2.25, py: 1,
          borderRadius: 1.25, boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
          '&:hover': { transform: 'translateY(-1px)' },
        }}>Nouveau membre</Button>
      </Stack>

      {/* Filters */}
      <Stack direction="row" gap={1.25} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
        <TextField size="small" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un membre…"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: T.text3 }} /></InputAdornment> }}
          sx={{
            minWidth: 240,
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.125, bgcolor: T.bg1,
              '& fieldset': { borderColor: T.border },
              '&.Mui-focused fieldset': { borderColor: T.primary, boxShadow: `0 0 0 3px ${T.primaryTint}` },
            },
          }} />
        <TextField select size="small" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 1.125, bgcolor: T.bg1 } }}>
          <MenuItem value="all">Tous statuts</MenuItem>
          <MenuItem value="active">Actif</MenuItem>
          <MenuItem value="off">Hors service</MenuItem>
          <MenuItem value="leave">Congé</MenuItem>
        </TextField>
        <TextField select size="small" value={filterType} onChange={e => setFilterType(e.target.value as any)}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 1.125, bgcolor: T.bg1 } }}>
          <MenuItem value="all">Tous types tâches</MenuItem>
          {Object.entries(TASK_TYPE_META).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.emoji} {v.label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* Grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
        gap: 1.5,
      }}>
        {filtered.map(s => <StaffCard key={s._id} staff={s} onClick={() => onEdit(s._id)} />)}
      </Box>

      {!loading && filtered.length === 0 && (
        <Box sx={{
          p: 5, mt: 2, textAlign: 'center', bgcolor: T.bg2,
          border: `1.5px dashed ${T.borderStrong}`, borderRadius: 2,
        }}>
          <Box sx={{ fontSize: 40, mb: 1, opacity: 0.5 }}>👥</Box>
          <Typography sx={{ fontSize: 13, color: T.text3 }}>Aucun membre ne correspond à ces filtres.</Typography>
        </Box>
      )}
    </Box>
  );
}

function StaffCard({ staff, onClick }: { staff: Staff; onClick: () => void }) {
  const initials = staff.fullName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const status = STATUS_META[staff.status];
  const off = staff.status !== 'active';

  return (
    <Box onClick={onClick} sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
      p: 2, cursor: 'pointer', transition: 'all 0.15s',
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      opacity: off ? 0.65 : 1,
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px -8px rgba(20,17,10,0.12)',
        borderColor: T.primary,
      },
    }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '50%',
          background: GRADIENTS[staff.avatarColor || 1],
          color: '#fff', fontWeight: 800, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
          '&::after': {
            content: '""', position: 'absolute', bottom: 0, right: 0,
            width: 12, height: 12, borderRadius: '50%', bgcolor: status.dot,
            border: '2px solid #fff',
          },
        }}>{initials}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em' }}>
              {staff.fullName}
            </Typography>
            {staff.isAdmin && (
              <Box sx={{
                fontSize: 9, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
                bgcolor: T.primaryTint, color: T.primaryDeep, px: 0.625, borderRadius: 0.5,
                letterSpacing: '0.04em',
              }}>ADMIN</Box>
            )}
          </Stack>
          <Typography sx={{
            fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace',
            mt: 0.25, letterSpacing: '0.02em',
          }}>{staff.contractType === 'employee' ? 'Salarié' : 'Freelance'} · {status.label}</Typography>
        </Box>
      </Stack>

      {/* Task pills */}
      <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
        {staff.allowedTaskTypes.slice(0, 4).map(t => (
          <Box key={t} sx={{
            fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700,
            bgcolor: T.bg2, border: `1px solid ${T.border}`, color: T.text2,
            px: 0.875, py: 0.25, borderRadius: 0.625,
          }}>{TASK_TYPE_META[t].emoji} {TASK_TYPE_META[t].label}</Box>
        ))}
        {staff.allowedTaskTypes.length > 4 && (
          <Box sx={{
            fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700,
            color: T.text3, px: 0.625, py: 0.25,
          }}>+{staff.allowedTaskTypes.length - 4}</Box>
        )}
      </Stack>

      <Stack direction="row" alignItems="center" gap={1.5} sx={{
        pt: 1.25, borderTop: `1px dashed ${T.border}`,
        fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace',
      }}>
        <span>📱 {staff.whatsappE164}</span>
        {staff.maxTasksPerDay && <span>· max {staff.maxTasksPerDay}/j</span>}
      </Stack>
    </Box>
  );
}
