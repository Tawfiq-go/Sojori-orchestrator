import React, { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Chip,
  FormHelperText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import {
  REQUIRES_CONDITION_OPTIONS,
  joinRequiresCsv,
  parseRequiresCsv,
} from './requiresConditionOptions';
import { T } from './menuTheme';

function labelFor(value) {
  return REQUIRES_CONDITION_OPTIONS.find((o) => o.value === value)?.label || value;
}

/**
 * Conditions option F (et autres conditional_and_time) — chips + menu « Ajouter ».
 * Persisté : availability.requires = "E_completed,D1_completed"
 */
export default function RequiresConditionsSelector({ value = '', onChange }) {
  const selected = parseRequiresCsv(value);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const availableToAdd = REQUIRES_CONDITION_OPTIONS.filter((o) => !selected.includes(o.value));

  const toggle = (code, add) => {
    if (add) {
      onChange(joinRequiresCsv([...selected, code]));
    } else {
      onChange(joinRequiresCsv(selected.filter((c) => c !== code)));
    }
  };

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.25,
        borderRadius: 1,
        border: `1px solid ${T.border}`,
        bgcolor: T.bg1,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: 1 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2 }}>
          Conditions requises (toutes — ET)
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          disabled={availableToAdd.length === 0}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            fontSize: 11,
            py: 0.25,
            px: 1,
            minHeight: 28,
            borderColor: T.borderStrong,
            color: T.primary,
          }}
        >
          Ajouter une condition
        </Button>
      </Stack>

      {selected.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: T.text3, mb: 0.5 }}>
          Aucune condition — cliquez sur « Ajouter une condition » (ex. E puis D1).
        </Typography>
      ) : (
        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap',  mb: 0.75 }}>
          {selected.map((code) => (
            <Chip
              key={code}
              label={labelFor(code)}
              size="small"
              onDelete={() => toggle(code, false)}
              sx={{
                height: 26,
                fontSize: 11,
                bgcolor: T.primaryTint,
                color: T.text,
                '& .MuiChip-deleteIcon': { fontSize: 16 },
              }}
            />
          ))}
        </Stack>
      )}

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {availableToAdd.length === 0 ? (
          <MenuItem disabled>Toutes les conditions sont déjà ajoutées</MenuItem>
        ) : (
          availableToAdd.map((opt) => (
            <MenuItem
              key={opt.value}
              onClick={() => {
                toggle(opt.value, true);
                setAnchorEl(null);
              }}
              sx={{ fontSize: 13 }}
            >
              {opt.label}
            </MenuItem>
          ))
        )}
      </Menu>

      <FormHelperText sx={{ fontSize: 11, color: T.text3, m: 0 }}>
        Le voyageur doit remplir <strong>toutes</strong> les conditions avant d&apos;accéder à l&apos;option
        (ex. enregistrement E + heure arrivée D1). Propagé Admin → listing → fullchatbot via{' '}
        <code>requires=…</code>.
      </FormHelperText>
      {selected.length > 0 && (
        <Typography
          sx={{
            mt: 0.75,
            fontSize: 10,
            fontFamily: '"Geist Mono", monospace',
            color: T.text3,
          }}
        >
          requires={joinRequiresCsv(selected)}
        </Typography>
      )}
    </Box>
  );
}
