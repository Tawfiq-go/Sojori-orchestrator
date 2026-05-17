import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, Badge,
  btnGhostSx, btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Button, Stack, Typography, Tabs, Tab } from '@mui/material';

export function OrchestrationConfigPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(4); // Tab 4 = Configuration

  const handleTabChange = (_: any, newValue: number) => {
    setTab(newValue);
    if (newValue === 0) navigate('/admin/orchestrator'); // Plans
    if (newValue === 1) navigate('/orchestration'); // Chronologie
    if (newValue === 2) navigate('/orchestration/events'); // Événements
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Configuration']}>
      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: t.border, mb: 0 }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ px: 3 }}>
          <Tab label="Plans" />
          <Tab label="Chronologie" />
          <Tab label="Événement" />
          <Tab label="Daily Ops" />
          <Tab label="Configuration" />
        </Tabs>
      </Box>

      <Box sx={{ px: 3 }}>
      <PageHeader title="✨ Orchestration · Configuration" count="5 workflows actifs">
        <Button sx={btnGhostSx}>📋 Importer workflow</Button>
        <Button sx={btnPrimarySx}>+ Nouveau workflow</Button>
      </PageHeader>

      <Stack spacing={2.25}>
        {/* Workflow 1 */}
        <Panel sx={{ p: 0 }}>
          <Box sx={{ p: 2.25, borderBottom: `1px solid ${t.border}` }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                Villa · Long séjour (7+ nuits)
              </Typography>
              <Badge variant="success" dot>Actif</Badge>
            </Stack>
            <Typography sx={{ fontSize: 13, color: t.text3, mb: 2 }}>
              Workflow complet pour villas avec 23 étapes automatisées
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button sx={btnGhostSx}>✏️ Modifier</Button>
              <Button sx={btnGhostSx}>📋 Dupliquer</Button>
              <Button sx={btnGhostSx}>📊 Statistiques</Button>
            </Stack>
          </Box>
          <Box sx={{ p: 2, bgcolor: t.bg2 }}>
            <Stack direction="row" spacing={3} sx={{ fontSize: 12 }}>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Étapes</Typography>
                <Typography sx={{ fontWeight: 700 }}>23 tâches</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Réservations</Typography>
                <Typography sx={{ fontWeight: 700 }}>142 actives</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Taux succès</Typography>
                <Typography sx={{ fontWeight: 700, color: t.success }}>98.4%</Typography>
              </Box>
            </Stack>
          </Box>
        </Panel>

        {/* Workflow 2 */}
        <Panel sx={{ p: 0 }}>
          <Box sx={{ p: 2.25, borderBottom: `1px solid ${t.border}` }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                Studio · Court séjour (1-3 nuits)
              </Typography>
              <Badge variant="success" dot>Actif</Badge>
            </Stack>
            <Typography sx={{ fontSize: 13, color: t.text3, mb: 2 }}>
              Workflow simplifié pour courts séjours avec 15 étapes
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button sx={btnGhostSx}>✏️ Modifier</Button>
              <Button sx={btnGhostSx}>📋 Dupliquer</Button>
              <Button sx={btnGhostSx}>📊 Statistiques</Button>
            </Stack>
          </Box>
          <Box sx={{ p: 2, bgcolor: t.bg2 }}>
            <Stack direction="row" spacing={3} sx={{ fontSize: 12 }}>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Étapes</Typography>
                <Typography sx={{ fontWeight: 700 }}>15 tâches</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Réservations</Typography>
                <Typography sx={{ fontWeight: 700 }}>78 actives</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Taux succès</Typography>
                <Typography sx={{ fontWeight: 700, color: t.success }}>97.8%</Typography>
              </Box>
            </Stack>
          </Box>
        </Panel>

        {/* Workflow 3 */}
        <Panel sx={{ p: 0 }}>
          <Box sx={{ p: 2.25, borderBottom: `1px solid ${t.border}` }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between',  mb: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                Appartement · Moyen séjour (4-6 nuits)
              </Typography>
              <Badge variant="success" dot>Actif</Badge>
            </Stack>
            <Typography sx={{ fontSize: 13, color: t.text3, mb: 2 }}>
              Workflow équilibré pour séjours moyens avec 19 étapes
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button sx={btnGhostSx}>✏️ Modifier</Button>
              <Button sx={btnGhostSx}>📋 Dupliquer</Button>
              <Button sx={btnGhostSx}>📊 Statistiques</Button>
            </Stack>
          </Box>
          <Box sx={{ p: 2, bgcolor: t.bg2 }}>
            <Stack direction="row" spacing={3} sx={{ fontSize: 12 }}>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Étapes</Typography>
                <Typography sx={{ fontWeight: 700 }}>19 tâches</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Réservations</Typography>
                <Typography sx={{ fontWeight: 700 }}>64 actives</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: t.text3, mb: 0.5 }}>Taux succès</Typography>
                <Typography sx={{ fontWeight: 700, color: t.success }}>96.2%</Typography>
              </Box>
            </Stack>
          </Box>
        </Panel>

        {/* Templates de messages */}
        <Panel title="Templates de messages">
          <Typography sx={{ fontSize: 13, color: t.text3, mb: 2 }}>
            27 templates WhatsApp configurés
          </Typography>
          <Button sx={btnPrimarySx}>Gérer les templates</Button>
        </Panel>
      </Stack>
      </Box>
    </DashboardWrapper>
  );
}
