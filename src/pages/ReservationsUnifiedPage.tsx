// ════════════════════════════════════════════════════════════════════
// Sojori — Reservations Unified Page · édition « Atelier 2026 »
// Route: /reservations?tab=list ou /reservations?tab=sejour&id=xxx
//
// Page unifiée avec 2 onglets : Liste des réservations et Détail séjour
// ════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ReservationsPage as ReservationsList } from './ReservationsPage';
import { ReservationSejourPage } from './ReservationSejourPage';

const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
};

export function ReservationsUnifiedPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Déterminer l'onglet actif depuis l'URL
  const currentTab = searchParams.get('tab') || 'list';
  const reservationId = searchParams.get('id');

  const handleTabChange = (_: any, newTab: string) => {
    if (newTab === 'list') {
      setSearchParams({ tab: 'list' });
    } else if (newTab === 'sejour') {
      // Si on bascule vers séjour sans ID, rediriger vers liste
      if (!reservationId) {
        setSearchParams({ tab: 'list' });
      } else {
        setSearchParams({ tab: 'sejour', id: reservationId });
      }
    }
  };

  // Si tab=sejour mais pas d'ID, rediriger vers list
  useEffect(() => {
    if (currentTab === 'sejour' && !reservationId) {
      setSearchParams({ tab: 'list' });
    }
  }, [currentTab, reservationId, setSearchParams]);

  return (
    <DashboardWrapper breadcrumb={['Activité', 'Réservations']}>
      {/* Tabs navigation */}
      <Box sx={{ bgcolor: T.bg1, borderBottom: `1px solid ${T.border}`, px: { xs: 2, md: 3 } }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none', fontWeight: 600, fontSize: 14,
              minHeight: 48, letterSpacing: '0.005em',
              color: T.text2,
              '&.Mui-selected': { color: T.text },
            },
            '& .MuiTabs-indicator': { backgroundColor: T.primary, height: 3, borderRadius: 1 },
          }}
        >
          <Tab label="Liste" value="list" />
          <Tab label="Séjour" value="sejour" disabled={!reservationId} />
        </Tabs>
      </Box>

      {/* Contenu des onglets */}
      <Box>
        {currentTab === 'list' && <ReservationsList />}
        {currentTab === 'sejour' && reservationId && <ReservationSejourPage reservationId={reservationId} />}
      </Box>
    </DashboardWrapper>
  );
}

export default ReservationsUnifiedPage;
