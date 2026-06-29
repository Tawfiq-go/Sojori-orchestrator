import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import { tokens as T } from '../components/dashboard/DashboardV2.components';

type ForbiddenState = {
  from?: string;
  reason?: string;
  navId?: string;
  zone?: string;
};

export function ForbiddenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as ForbiddenState;

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Box
        sx={{
          maxWidth: 480,
          textAlign: 'center',
          p: 4,
          borderRadius: 3,
          border: `1px solid ${T.border}`,
          bgcolor: T.bg1,
        }}
      >
        <ShieldOutlined sx={{ fontSize: 48, color: T.error, mb: 2 }} />
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Accès refusé
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Votre rôle ne permet pas d&apos;ouvrir cette page.
          {state.from ? (
            <>
              <br />
              <code style={{ fontSize: 12 }}>{state.from}</code>
            </>
          ) : null}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard', { replace: true })}>
          Retour au tableau de bord
        </Button>
      </Box>
    </Box>
  );
}

export default ForbiddenPage;
