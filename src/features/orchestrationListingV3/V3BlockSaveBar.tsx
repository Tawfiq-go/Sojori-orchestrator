import { Box, Button, Typography } from '@mui/material';
import { V3 } from './theme';

type Props = {
  /** Ex. « Menu WhatsApp », « Créneaux départ », « Relances & staff » */
  label: string;
  dirty?: boolean;
  saving?: boolean;
  disabled?: boolean;
  onSave: () => void | Promise<void>;
  savedHint?: string;
};

/** Barre Enregistrer sticky — un bloc = un save explicite (pas d’auto-save). */
export function V3BlockSaveBar({
  label,
  dirty = false,
  saving = false,
  disabled = false,
  onSave,
  savedHint = 'À jour',
}: Props) {
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 15,
        mt: 2.5,
        mx: { xs: -1, sm: -2.5 },
        px: { xs: 1, sm: 2.5 },
        py: 1.25,
        bgcolor: 'rgba(255,255,255,0.98)',
        borderTop: `1px solid ${dirty ? V3.p : V3.b}`,
        boxShadow: dirty ? '0 -4px 20px rgba(184,133,26,0.08)' : '0 -2px 12px rgba(20,17,10,0.04)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: V3.t2, lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: dirty ? V3.pd : V3.t4, lineHeight: 1.35 }}>
          {saving ? 'Enregistrement en cours…' : dirty ? 'Modifications non enregistrées' : savedHint}
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="small"
        disabled={disabled || saving || !dirty}
        onClick={() => void onSave()}
        sx={{
          fontWeight: 800,
          borderRadius: '8px',
          bgcolor: V3.pd,
          px: 2.25,
          flexShrink: 0,
          '&:disabled': { bgcolor: V3.bg3, color: V3.t4 },
        }}
      >
        {saving ? '…' : 'Enregistrer'}
      </Button>
    </Box>
  );
}
