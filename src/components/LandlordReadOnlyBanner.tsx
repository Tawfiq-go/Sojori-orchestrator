import { Box, Typography } from '@mui/material';
import { useWriteAccess } from '../hooks/useWriteAccess';

/** Bandeau global quand le compte est propriétaire immobilier (lecture seule). */
export function LandlordReadOnlyBanner() {
  const { isLandlord } = useWriteAccess();
  if (!isLandlord) return null;
  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        mx: { xs: 1.5, sm: 2 },
        mt: 1.25,
        mb: 0.5,
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        border: '1px solid rgba(6,115,179,0.22)',
        bgcolor: 'rgba(6,115,179,0.08)',
        color: '#0a4f7a',
        fontSize: 12.5,
        lineHeight: 1.4,
      }}
    >
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: 1,
          bgcolor: '#0673b3',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
        }}
        aria-hidden
      >
        👁
      </Box>
      <Typography component="span" sx={{ fontSize: 12.5, color: 'inherit' }}>
        Compte <strong>propriétaire</strong> — accès en lecture seule. Aucune modification,
        annulation ou envoi n’est possible.
      </Typography>
    </Box>
  );
}
