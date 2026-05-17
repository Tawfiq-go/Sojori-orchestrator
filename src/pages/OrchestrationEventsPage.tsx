import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, DataTable, Badge,
  btnGhostSx, btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Button, Stack, Typography, Tabs, Tab } from '@mui/material';

export function OrchestrationEventsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(2); // Tab 2 = Événement

  const handleTabChange = (_: any, newValue: number) => {
    setTab(newValue);
    if (newValue === 0) navigate('/admin/orchestrator'); // Plans
    if (newValue === 1) navigate('/orchestration'); // Chronologie
    if (newValue === 4) navigate('/orchestration/config'); // Configuration
  };

  const columns = [
    { key: 'timestamp', label: 'Timestamp', width: '180px' },
    { key: 'event', label: 'Événement', width: 'auto' },
    { key: 'reservation', label: 'Réservation', width: '200px' },
    { key: 'status', label: 'Statut', width: '120px' },
    { key: 'type', label: 'Type', width: '120px' },
  ];

  const rows = [
    {
      id: '1',
      timestamp: '15 mai · 18:00',
      event: 'Déclaration police envoyée',
      reservation: 'RÉSA #1234 · Sarah J.',
      status: <Badge variant="success">Complété</Badge>,
      type: <Badge variant="info">API</Badge>,
    },
    {
      id: '2',
      timestamp: '15 mai · 16:14',
      event: 'Check-in effectué',
      reservation: 'RÉSA #1234 · Sarah J.',
      status: <Badge variant="success">Complété</Badge>,
      type: <Badge variant="success">Auto</Badge>,
    },
    {
      id: '3',
      timestamp: '15 mai · 14:00',
      event: 'Code d\'accès envoyé',
      reservation: 'RÉSA #1234 · Sarah J.',
      status: <Badge variant="success">Complété</Badge>,
      type: <Badge variant="info">WhatsApp</Badge>,
    },
    {
      id: '4',
      timestamp: '14 mai · 15:30',
      event: 'Ménage pré-arrivée complété',
      reservation: 'RÉSA #1234 · Sarah J.',
      status: <Badge variant="success">Complété</Badge>,
      type: <Badge variant="success">Staff</Badge>,
    },
    {
      id: '5',
      timestamp: '14 mai · 10:00',
      event: 'Déclaration police programmée',
      reservation: 'RÉSA #1234 · Sarah J.',
      status: <Badge variant="warning">En attente</Badge>,
      type: <Badge variant="warning">Planifié</Badge>,
    },
    {
      id: '6',
      timestamp: '14 mai · 09:00',
      event: 'Code d\'accès généré',
      reservation: 'RÉSA #1234 · Sarah J.',
      status: <Badge variant="success">Complété</Badge>,
      type: <Badge variant="success">Auto</Badge>,
    },
    {
      id: '7',
      timestamp: '13 mai · 19:45',
      event: 'Enregistrement voyageur complété',
      reservation: 'RÉSA #1234 · Sarah J.',
      status: <Badge variant="success">Complété</Badge>,
      type: <Badge variant="success">Form</Badge>,
    },
    {
      id: '8',
      timestamp: '13 mai · 14:30',
      event: 'Enregistrement voyageur envoyé',
      reservation: 'RÉSA #1234 · Sarah J.',
      status: <Badge variant="success">Complété</Badge>,
      type: <Badge variant="info">WhatsApp</Badge>,
    },
  ];

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Événements']}>
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
      <PageHeader title="✨ Orchestration · Événements" count="247 événements">
        <Button sx={btnGhostSx}>📥 Exporter CSV</Button>
        <Button sx={btnPrimarySx}>🔍 Filtrer</Button>
      </PageHeader>

      <Stack spacing={2.25}>
        {/* Filtres rapides */}
        <Box sx={{
          display: 'flex',
          gap: 1,
          p: 2,
          bgcolor: t.bg1,
          border: `1px solid ${t.border}`,
          borderRadius: '12px',
        }}>
          <Button sx={{ ...btnGhostSx, fontSize: 12 }}>Tous (247)</Button>
          <Button sx={{ ...btnGhostSx, fontSize: 12 }}>Aujourd'hui (8)</Button>
          <Button sx={{ ...btnGhostSx, fontSize: 12 }}>Cette semaine (42)</Button>
          <Button sx={{ ...btnGhostSx, fontSize: 12 }}>Erreurs (0)</Button>
          <Button sx={{ ...btnGhostSx, fontSize: 12 }}>En attente (3)</Button>
        </Box>

        {/* Table des événements */}
        <Panel title="Log des événements">
          <DataTable columns={columns} rows={rows} />

          <Box sx={{
            mt: 2,
            pt: 2,
            borderTop: `1px solid ${t.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              Affichage de 8 sur 247 événements
            </Typography>
            <Button sx={btnGhostSx}>Voir plus</Button>
          </Box>
        </Panel>
      </Stack>
      </Box>
    </DashboardWrapper>
  );
}
