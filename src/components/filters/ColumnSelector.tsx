// ════════════════════════════════════════════════════════════════════
// Sojori — ColumnSelector (Popover réorder/masquer colonnes de table)
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Box, Stack, Popover, Button, Typography, Checkbox, IconButton,
  Divider, Tooltip,
} from '@mui/material';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170', text4: '#b8b09b',
  bg1: '#fff', bg2: '#f5f3ec', bg3: '#ebe7da', border: 'rgba(26,20,8,0.08)',
};

export interface ColumnDef {
  id: string;
  label: string;
  required?: boolean;
}

interface Props {
  columns: ColumnDef[];
  visible: string[];
  order?: string[];
  onChange: (visible: string[], order: string[]) => void;
}

export default function ColumnSelector({ columns, visible, order: orderProp, onChange }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [order, setOrder] = useState<string[]>(orderProp || columns.map(c => c.id));
  const [dragId, setDragId] = useState<string | null>(null);

  const toggle = (id: string) => {
    const col = columns.find(c => c.id === id);
    if (col?.required) return;
    const next = visible.includes(id) ? visible.filter(x => x !== id) : [...visible, id];
    onChange(next, order);
  };
  const showAll = () => onChange(columns.map(c => c.id), order);
  const hideAll = () => onChange(columns.filter(c => c.required).map(c => c.id), order);

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!dragId || dragId === id) return;
    const next = order.filter(x => x !== dragId);
    const idx = next.indexOf(id);
    next.splice(idx, 0, dragId);
    setOrder(next);
    onChange(visible, next);
  };

  return (
    <>
      <Button
        size="small" variant="outlined"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          textTransform: 'none', fontWeight: 600,
          borderColor: T.border, color: T.text2,
          '&:hover': { borderColor: T.primary, bgcolor: T.bg2 },
        }}
      >
        ⚙️ Colonnes ({visible.length}/{columns.length})
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 280, mt: 0.5, border: `1px solid ${T.border}`, borderRadius: 2 } }}
      >
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Colonnes affichées</Typography>
            <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: 'Geist Mono' }}>{visible.length}/{columns.length}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={showAll} sx={{ textTransform: 'none', fontSize: 11 }}>Tout afficher</Button>
            <Button size="small" onClick={hideAll} sx={{ textTransform: 'none', fontSize: 11 }}>Masquer tout</Button>
          </Stack>
        </Box>
        <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
          {order.map(id => {
            const col = columns.find(c => c.id === id);
            if (!col) return null;
            const isOn = visible.includes(id);
            return (
              <Stack
                key={id} direction="row" alignItems="center" spacing={1}
                draggable
                onDragStart={() => onDragStart(id)}
                onDragOver={(e) => onDragOver(e, id)}
                onDragEnd={() => setDragId(null)}
                sx={{
                  px: 1.5, py: 1, cursor: 'grab',
                  '&:hover': { bgcolor: T.bg2 },
                  borderBottom: `1px solid ${T.border}`,
                  '&:last-child': { borderBottom: 0 },
                  opacity: dragId === id ? 0.4 : 1,
                }}
              >
                <Box sx={{ color: T.text4, fontSize: 12, cursor: 'grab' }}>⋮⋮</Box>
                <Checkbox size="small" checked={isOn} onChange={() => toggle(id)} disabled={col.required} sx={{ p: 0 }} />
                <Typography sx={{ flex: 1, fontSize: 13, fontWeight: isOn ? 600 : 400, color: isOn ? T.text : T.text3 }}>
                  {col.label}
                </Typography>
                {col.required && (
                  <Tooltip title="Colonne obligatoire">
                    <Box sx={{ fontSize: 10, color: T.text3, fontFamily: 'Geist Mono' }}>obligatoire</Box>
                  </Tooltip>
                )}
              </Stack>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}
