import React, { useMemo } from 'react';
import { Paper, Box, Typography, Checkbox, Select, MenuItem, FormControl } from '@mui/material';

const ACCESS_OPTIONS = ['none', 'read', 'write'];

const normalize = (taskTypes, value) => {
  const map = new Map((value || []).map(p => [p.type, p]));
  return taskTypes.map(tt => {
    const t = map.get(tt.task);
    if (t) {
      const access = t.access && ACCESS_OPTIONS.includes(t.access) ? t.access : (t.write ? 'write' : t.read ? 'read' : 'none');
      return { type: tt.task, access };
    }
    return { type: tt.task, access: 'write' };
  });
};

const PERMISSION_LABELS = {
  'Reservation': 'Réservation',
  'Task': 'Tâche',
  'Message': 'Message',
  'Reviews': 'Avis',
  'ArrivalDeparture': 'Arrivée/Départ',
};

export default function PermissionsMatrix({ taskTypes, value = [], onChange, t = (x) => x , allowedTypes}) {

  const allowedSet = useMemo(
    () => (Array.isArray(allowedTypes) ? new Set(allowedTypes) : null),
    [allowedTypes]
  );

  const displayTypes = useMemo(() => {
    const list = allowedSet
      ? taskTypes.filter(tt => allowedSet.has(tt.task))
      : taskTypes;
    return allowedTypes
      ? list.slice().sort((a, b) =>
          allowedTypes.indexOf(a.task) - allowedTypes.indexOf(b.task)
        )
      : list;
  }, [taskTypes, allowedSet, allowedTypes]);

  const rows = useMemo(() => normalize(displayTypes, value), [displayTypes, value]);

  const setAccess = (type, access) => {
    const next = rows.map(r => (r.type === type ? { type: r.type, access } : r));
    onChange(next);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{t('Permission :')}</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1.5, alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Accès</Typography>

        {rows.map(r => (
          <React.Fragment key={r.type}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{PERMISSION_LABELS[r.type] || r.type}</Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={r.access || 'none'}
                onChange={(e) => setAccess(r.type, e.target.value)}
                sx={{ height: 36, fontSize: 13 }}
              >
                <MenuItem value="none">Aucun accès</MenuItem>
                <MenuItem value="read">Lecture</MenuItem>
                <MenuItem value="write">Écriture</MenuItem>
              </Select>
            </FormControl>
          </React.Fragment>
        ))}
      </Box>
    </Paper>
  );
}
