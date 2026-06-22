import React, { useState } from 'react';
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import { CleanlinessBadge, T, type Cleanliness } from './_shared';
import type { DisplayCleanliness } from '../../utils/cleanlinessDisplay';

const OPTIONS: { value: DisplayCleanliness; icon: string; label: string }[] = [
  { value: 'clean', icon: '✨', label: 'Propre (CLEAN)' },
  { value: 'dirty', icon: '🚫', label: 'Sale (DIRTY)' },
  { value: 'in_progress', icon: '🧹', label: 'Ménage en cours' },
  { value: 'occupied', icon: '🏠', label: 'Occupé' },
];

export interface CleanlinessBadgeInteractiveProps {
  status: Cleanliness;
  displayStatus?: DisplayCleanliness;
  emergency?: boolean;
  disabled?: boolean;
  onChange?: (next: DisplayCleanliness) => void | Promise<void>;
}

export function CleanlinessBadgeInteractive({
  status,
  displayStatus,
  emergency,
  disabled,
  onChange,
}: CleanlinessBadgeInteractiveProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [saving, setSaving] = useState(false);
  const open = Boolean(anchor);
  const current = displayStatus || (status as DisplayCleanliness);

  const handlePick = async (next: DisplayCleanliness) => {
    setAnchor(null);
    if (!onChange || next === current) return;
    setSaving(true);
    try {
      await onChange(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Box
        component="span"
        onClick={(e) => {
          if (disabled || !onChange) return;
          e.stopPropagation();
          setAnchor(e.currentTarget as HTMLElement);
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: onChange && !disabled ? 'pointer' : 'default',
          opacity: saving ? 0.6 : 1,
          '&:hover': onChange && !disabled ? { opacity: 0.85 } : {},
        }}
      >
        <CleanlinessBadge status={status} />
        {emergency && (
          <Box
            component="span"
            sx={{
              fontSize: 8,
              fontWeight: 800,
              px: 0.5,
              py: '1px',
              borderRadius: 999,
              bgcolor: T.errorTint,
              color: T.error,
              letterSpacing: '0.04em',
            }}
          >
            URGENT
          </Box>
        )}
        {onChange && !disabled && (
          <Box component="span" sx={{ fontSize: 9, color: T.text4, lineHeight: 1 }}>
            ▾
          </Box>
        )}
        {saving && <CircularProgress size={10} sx={{ color: T.primary }} />}
      </Box>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 200, borderRadius: 1.5 } } }}
      >
        {OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={current === opt.value}
            onClick={() => handlePick(opt.value)}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>{opt.icon}</ListItemIcon>
            <ListItemText slotProps={{ primary: { sx: { fontSize: 13 } } }}>{opt.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
