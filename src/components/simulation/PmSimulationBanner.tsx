import { Box, Button, Typography } from '@mui/material';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import { useNavigate } from 'react-router-dom';
import { usePmSimulation } from '../../context/PmSimulationContext';

export function PmSimulationBanner() {
  const { isActive, snapshot, stopSimulation } = usePmSimulation();
  const navigate = useNavigate();

  if (!isActive || !snapshot) return null;

  const subtitle = snapshot.ownerEmail
    ? `${snapshot.ownerLabel} · ${snapshot.ownerEmail}`
    : snapshot.ownerLabel;

  return (
    <Box
      className="sojori-pm-simulation-banner"
      role="status"
      aria-live="polite"
      sx={{
        gridColumn: '1 / -1',
        gridRow: '1',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        px: { xs: 2, md: 3 },
        py: 1,
        bgcolor: '#B45309',
        color: '#FFFBEB',
        borderBottom: '3px solid #F59E0B',
        boxShadow: '0 2px 12px rgba(180,83,9,0.35)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
        <WarningAmberRounded sx={{ color: '#FDE68A', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="div"
            sx={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Mode simulation PM
          </Typography>
          <Typography component="div" sx={{ fontSize: 12, opacity: 0.95 }} noWrap title={subtitle}>
            Vous voyez les données de : <strong>{subtitle}</strong>
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AdminPanelSettingsOutlined />}
          onClick={() => navigate('/admin/equipe/owners')}
          sx={{
            color: '#FFFBEB',
            borderColor: 'rgba(255,251,235,0.55)',
            '&:hover': { borderColor: '#FFFBEB', bgcolor: 'rgba(255,251,235,0.12)' },
          }}
        >
          Admin plateforme
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={stopSimulation}
          sx={{
            bgcolor: '#FFFBEB',
            color: '#92400E',
            fontWeight: 700,
            '&:hover': { bgcolor: '#FEF3C7' },
          }}
        >
          Quitter simulation · Mode admin
        </Button>
      </Box>
    </Box>
  );
}

export default PmSimulationBanner;
