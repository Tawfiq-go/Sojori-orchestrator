import { Box, Button } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ActionToast, useActionToast } from '../components/ActionToast';
import ChannelsDashboard from '../components/channels/ChannelsDashboard';
import { getStoredChannelsData } from '../data/catalogueMock';
import { PageHeader, btnGhostSx, btnPrimarySx, btnSmSx } from '../components/dashboard/DashboardV2.components';

export function ChannelsPage() {
  const { toast, showToast, hideToast } = useActionToast();
  const data = getStoredChannelsData();

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Canaux']}>
      <Box sx={{ p: { xs: 2, md: 0 } }}>
        <PageHeader title="Channels Dashboard" count={`${data.overview.filter((item) => item.status === 'connected').length}/${data.overview.length} connectés`}>
          <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => showToast('Rapport mock généré', 'info')}>
            📊 Rapport
          </Button>
          <Button sx={btnPrimarySx} onClick={() => showToast('Connexion canal mock lancée', 'info')}>
            🔗 Connecter canal
          </Button>
        </PageHeader>

        <ChannelsDashboard />

        <ActionToast
          open={toast.open}
          message={toast.message}
          severity={toast.severity}
          onClose={hideToast}
        />
      </Box>
    </DashboardWrapper>
  );
}
