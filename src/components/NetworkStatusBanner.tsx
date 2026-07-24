import { Box, Button, Typography } from '@mui/material';
import WifiOffRounded from '@mui/icons-material/WifiOffRounded';
import SignalWifiStatusbarConnectedNoInternet4Rounded from '@mui/icons-material/SignalWifiStatusbarConnectedNoInternet4Rounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import { useEffect } from 'react';
import { useConnectivity } from '../contexts/ConnectivityContext';

/**
 * Bandeau connexion type produit pro (Cursor-like) :
 * hors ligne / instable / rétabli — sans spam toast.
 */
export function NetworkStatusBanner() {
  const { status } = useConnectivity();

  useEffect(() => {
    const root = document.documentElement;
    if (status === 'online') {
      root.style.removeProperty('--sojori-net-banner-h');
    } else {
      root.style.setProperty('--sojori-net-banner-h', '52px');
    }
    return () => root.style.removeProperty('--sojori-net-banner-h');
  }, [status]);

  if (status === 'online') return null;

  const cfg =
    status === 'offline'
      ? {
          icon: <WifiOffRounded sx={{ fontSize: 18 }} />,
          title: 'Hors ligne',
          body: 'Connexion coupée. Les données affichées peuvent être obsolètes — on se reconnecte dès que le réseau revient.',
          bgcolor: '#1e293b',
          color: '#f8fafc',
          accent: '#94a3b8',
        }
      : status === 'degraded'
        ? {
            icon: <SignalWifiStatusbarConnectedNoInternet4Rounded sx={{ fontSize: 18 }} />,
            title: 'Connexion instable',
            body: 'Réseau faible ou coupure 4G. Nouvelle tentative automatique — évitez les actions critiques un instant.',
            bgcolor: '#422006',
            color: '#ffedd5',
            accent: '#fdba74',
          }
        : {
            icon: <CheckCircleOutlineRounded sx={{ fontSize: 18 }} />,
            title: 'Connexion rétablie',
            body: 'Le réseau est de nouveau disponible.',
            bgcolor: '#14532d',
            color: '#ecfdf5',
            accent: '#86efac',
          };

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        px: 2,
        py: 1,
        bgcolor: cfg.bgcolor,
        color: cfg.color,
        borderBottom: `1px solid ${cfg.accent}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 720 }}>
        <Box sx={{ color: cfg.accent, display: 'flex', flexShrink: 0 }}>{cfg.icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 12.5, letterSpacing: '0.04em' }}>
            {cfg.title}
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.92, lineHeight: 1.35 }}>{cfg.body}</Typography>
        </Box>
      </Box>
      {status !== 'recovered' ? (
        <Button
          size="small"
          variant="outlined"
          onClick={() => window.location.reload()}
          sx={{
            color: cfg.color,
            borderColor: 'rgba(255,255,255,0.35)',
            fontSize: 12,
            py: 0.25,
            '&:hover': { borderColor: cfg.color, bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          Actualiser
        </Button>
      ) : null}
    </Box>
  );
}

export default NetworkStatusBanner;
