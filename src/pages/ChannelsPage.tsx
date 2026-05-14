import { useState } from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  StatsRow,
  StatCard,
  DataTable,
  Badge,
  SourcePill,
  FilterBar,
  FilterChip,
  Panel,
  Pagination,
  btnPrimarySx,
  btnGhostSx,
  btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

// ─── Mock Data ─────────────────────────────────────────────────────────
// Structure matches: GET /api/v1/admin/channels-dashboard/*
const CHANNELS_DATA = {
  // OTA connections (Channel integrations)
  otas: [
    {
      id: 'airbnb',
      name: 'Airbnb',
      logo: '🏠',
      status: 'connected',
      lastSync: '2026-05-14T08:30:00Z',
      listingsMapped: 38,
      totalListings: 42,
      syncSuccess: 156,
      syncErrors: 3,
      uptime: 99.2,
    },
    {
      id: 'booking',
      name: 'Booking.com',
      logo: '🅱️',
      status: 'connected',
      lastSync: '2026-05-14T08:15:00Z',
      listingsMapped: 35,
      totalListings: 42,
      syncSuccess: 142,
      syncErrors: 1,
      uptime: 99.8,
    },
    {
      id: 'vrbo',
      name: 'VRBO',
      logo: '🏡',
      status: 'connected',
      lastSync: '2026-05-14T07:45:00Z',
      listingsMapped: 28,
      totalListings: 42,
      syncSuccess: 98,
      syncErrors: 8,
      uptime: 97.5,
    },
    {
      id: 'expedia',
      name: 'Expedia',
      logo: '✈️',
      status: 'error',
      lastSync: '2026-05-13T18:20:00Z',
      listingsMapped: 22,
      totalListings: 42,
      syncSuccess: 45,
      syncErrors: 15,
      uptime: 85.2,
    },
    {
      id: 'tripadvisor',
      name: 'TripAdvisor',
      logo: '🦉',
      status: 'disconnected',
      lastSync: '2026-05-10T12:00:00Z',
      listingsMapped: 0,
      totalListings: 42,
      syncSuccess: 0,
      syncErrors: 0,
      uptime: 0,
    },
    {
      id: 'homeaway',
      name: 'HomeAway',
      logo: '🏘️',
      status: 'connected',
      lastSync: '2026-05-14T08:00:00Z',
      listingsMapped: 18,
      totalListings: 42,
      syncSuccess: 67,
      syncErrors: 2,
      uptime: 98.5,
    },
    {
      id: 'direct',
      name: 'Direct Booking',
      logo: '🌐',
      status: 'connected',
      lastSync: '2026-05-14T08:35:00Z',
      listingsMapped: 42,
      totalListings: 42,
      syncSuccess: 215,
      syncErrors: 0,
      uptime: 100,
    },
  ],

  // Mapping: Listings ↔ OTA IDs (ChannelRuFieldMapping)
  mappings: [
    {
      id: 'm1',
      listingName: 'Villa Belvédère',
      listingId: 'L-001',
      airbnbId: '45678912',
      bookingId: 'B-92837465',
      vrboId: 'V-8372645',
      expediaId: null,
      directId: 'D-BELV-001',
    },
    {
      id: 'm2',
      listingName: 'Dar Sojori',
      listingId: 'L-002',
      airbnbId: '87654321',
      bookingId: 'B-38475629',
      vrboId: null,
      expediaId: null,
      directId: 'D-SOJORI-001',
    },
    {
      id: 'm3',
      listingName: 'Villa Atlas',
      listingId: 'L-003',
      airbnbId: '12345678',
      bookingId: 'B-67483920',
      vrboId: 'V-2938475',
      expediaId: 'E-8374629',
      directId: 'D-ATLAS-001',
    },
    {
      id: 'm4',
      listingName: 'Atlas Loft',
      listingId: 'L-004',
      airbnbId: '98765432',
      bookingId: null,
      vrboId: null,
      expediaId: null,
      directId: 'D-LOFT-001',
    },
    {
      id: 'm5',
      listingName: 'Médina House',
      listingId: 'L-005',
      airbnbId: '56473829',
      bookingId: 'B-74829364',
      vrboId: 'V-3847562',
      expediaId: null,
      directId: 'D-MEDINA-001',
    },
  ],

  // Sync logs (ChannelBookingIngress / ChannelRuApiCall)
  syncLogs: [
    {
      id: 'log1',
      timestamp: '2026-05-14T08:35:22Z',
      ota: 'Direct Booking',
      action: 'Push_Calendar_Update',
      status: 'success',
      message: 'Calendar sync for 5 listings completed',
      duration: 1.2,
    },
    {
      id: 'log2',
      timestamp: '2026-05-14T08:30:15Z',
      ota: 'Airbnb',
      action: 'Pull_Reservations',
      status: 'success',
      message: 'Fetched 3 new reservations',
      duration: 2.8,
    },
    {
      id: 'log3',
      timestamp: '2026-05-14T08:25:44Z',
      ota: 'Expedia',
      action: 'Push_Pricing_Update',
      status: 'error',
      message: 'Authentication failed: Invalid API key',
      duration: 0.5,
    },
    {
      id: 'log4',
      timestamp: '2026-05-14T08:15:30Z',
      ota: 'Booking.com',
      action: 'Pull_Reviews',
      status: 'success',
      message: 'Fetched 2 new reviews',
      duration: 1.9,
    },
    {
      id: 'log5',
      timestamp: '2026-05-14T08:10:12Z',
      ota: 'VRBO',
      action: 'Push_Listing_Details',
      status: 'warning',
      message: 'Partial sync: 2 listings failed validation',
      duration: 3.5,
    },
    {
      id: 'log6',
      timestamp: '2026-05-14T08:00:05Z',
      ota: 'HomeAway',
      action: 'Pull_Calendar_Blocks',
      status: 'success',
      message: 'Synced availability for 18 listings',
      duration: 4.2,
    },
    {
      id: 'log7',
      timestamp: '2026-05-14T07:55:33Z',
      ota: 'Airbnb',
      action: 'Push_Availability',
      status: 'success',
      message: 'Updated availability for 38 listings',
      duration: 5.1,
    },
    {
      id: 'log8',
      timestamp: '2026-05-14T07:50:18Z',
      ota: 'Booking.com',
      action: 'Pull_Messages',
      status: 'success',
      message: 'Fetched 5 guest messages',
      duration: 1.3,
    },
    {
      id: 'log9',
      timestamp: '2026-05-14T07:45:50Z',
      ota: 'VRBO',
      action: 'Pull_Reservations',
      status: 'success',
      message: 'Fetched 1 new reservation',
      duration: 2.1,
    },
    {
      id: 'log10',
      timestamp: '2026-05-14T07:40:25Z',
      ota: 'Direct Booking',
      action: 'Webhook_New_Reservation',
      status: 'success',
      message: 'Processed webhook for reservation R-12345',
      duration: 0.8,
    },
  ],

  // Stats
  stats: {
    totalSyncs: 847,
    todaySyncs: 42,
    successRate: 96.5,
    errors: 12,
    connectedChannels: 5,
    totalChannels: 7,
    avgResponseTime: 2.3,
  },
};

// ─── Helper Functions ──────────────────────────────────────────────────
function formatTimeAgo(isoDate: string): string {
  const now = new Date('2026-05-14T08:40:00Z'); // Mock current time
  const date = new Date(isoDate);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── Main Component ────────────────────────────────────────────────────
export function ChannelsPage() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'mapping' | 'logs'>('overview');
  const [selectedOta, setSelectedOta] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [logsPage, setLogsPage] = useState(1);
  const logsPerPage = 10;

  // Filter OTAs
  const filteredOtas = CHANNELS_DATA.otas.filter(ota => {
    if (selectedStatus === 'all') return true;
    return ota.status === selectedStatus;
  });

  // Filter logs
  const filteredLogs = CHANNELS_DATA.syncLogs.filter(log => {
    if (selectedOta === 'all') return true;
    return log.ota === selectedOta;
  });
  const paginatedLogs = filteredLogs.slice((logsPage - 1) * logsPerPage, logsPage * logsPerPage);
  const totalLogsPages = Math.ceil(filteredLogs.length / logsPerPage);

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Canaux']}>
      <PageHeader title="Channel Manager" count={`${CHANNELS_DATA.stats.connectedChannels}/${CHANNELS_DATA.stats.totalChannels} connectés`}>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>📊 Rapport</Button>
        <Button sx={btnPrimarySx}>🔗 Connecter canal</Button>
      </PageHeader>

      {/* Stats */}
      <StatsRow>
        <StatCard
          icon="📊"
          iconBg={t.primaryTint}
          iconColor={t.primary}
          value={CHANNELS_DATA.stats.todaySyncs.toString()}
          label="Syncs aujourd'hui"
          trend="+12%"
          trendUp
        />
        <StatCard
          icon="✅"
          iconBg={t.successTint}
          iconColor={t.success}
          value={`${CHANNELS_DATA.stats.successRate}%`}
          label="Taux de réussite"
          trend="+2.3%"
          trendUp
        />
        <StatCard
          icon="⚠️"
          iconBg={t.errorTint}
          iconColor={t.error}
          value={CHANNELS_DATA.stats.errors.toString()}
          label="Erreurs 24h"
        />
        <StatCard
          icon="⚡"
          iconBg={t.infoTint}
          iconColor={t.info}
          value={`${CHANNELS_DATA.stats.avgResponseTime}s`}
          label="Temps moyen"
          trend="-0.5s"
          trendUp
        />
      </StatsRow>

      {/* Tabs */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          onClick={() => setSelectedTab('overview')}
          sx={{
            px: 2,
            py: 1,
            borderRadius: '8px',
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'none',
            bgcolor: selectedTab === 'overview' ? t.primaryTint : t.bg1,
            border: '1px solid',
            borderColor: selectedTab === 'overview' ? 'rgba(230,176,34,0.35)' : t.border,
            color: selectedTab === 'overview' ? t.text : t.text2,
            '&:hover': { bgcolor: selectedTab === 'overview' ? t.primaryTint : t.bg2 },
          }}
        >
          📊 Aperçu connexions
        </Button>
        <Button
          onClick={() => setSelectedTab('mapping')}
          sx={{
            px: 2,
            py: 1,
            borderRadius: '8px',
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'none',
            bgcolor: selectedTab === 'mapping' ? t.primaryTint : t.bg1,
            border: '1px solid',
            borderColor: selectedTab === 'mapping' ? 'rgba(230,176,34,0.35)' : t.border,
            color: selectedTab === 'mapping' ? t.text : t.text2,
            '&:hover': { bgcolor: selectedTab === 'mapping' ? t.primaryTint : t.bg2 },
          }}
        >
          🗺️ Mapping annonces
        </Button>
        <Button
          onClick={() => setSelectedTab('logs')}
          sx={{
            px: 2,
            py: 1,
            borderRadius: '8px',
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'none',
            bgcolor: selectedTab === 'logs' ? t.primaryTint : t.bg1,
            border: '1px solid',
            borderColor: selectedTab === 'logs' ? 'rgba(230,176,34,0.35)' : t.border,
            color: selectedTab === 'logs' ? t.text : t.text2,
            '&:hover': { bgcolor: selectedTab === 'logs' ? t.primaryTint : t.bg2 },
          }}
        >
          📋 Logs de sync
        </Button>
      </Stack>

      {/* OVERVIEW TAB */}
      {selectedTab === 'overview' && (
        <>
          <FilterBar>
            <FilterChip
              label="Tous"
              active={selectedStatus === 'all'}
              onClick={() => setSelectedStatus('all')}
            />
            <FilterChip
              label="Connectés"
              active={selectedStatus === 'connected'}
              onClick={() => setSelectedStatus('connected')}
            />
            <FilterChip
              label="Erreurs"
              active={selectedStatus === 'error'}
              onClick={() => setSelectedStatus('error')}
            />
            <FilterChip
              label="Déconnectés"
              active={selectedStatus === 'disconnected'}
              onClick={() => setSelectedStatus('disconnected')}
            />
          </FilterBar>

          <DataTable
            columns={[
              {
                key: 'ota',
                label: 'Canal OTA',
                render: (row) => (
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ fontSize: 20 }}>{row.logo}</Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.name}</Typography>
                  </Stack>
                ),
              },
              {
                key: 'status',
                label: 'Statut',
                render: (row) => (
                  <Badge
                    variant={
                      row.status === 'connected'
                        ? 'success'
                        : row.status === 'error'
                        ? 'error'
                        : 'neutral'
                    }
                    dot
                  >
                    {row.status === 'connected' ? 'Connecté' : row.status === 'error' ? 'Erreur' : 'Déconnecté'}
                  </Badge>
                ),
              },
              {
                key: 'lastSync',
                label: 'Dernière sync',
                render: (row) => (
                  <Typography sx={{ fontSize: 12.5, color: t.text3 }}>
                    {formatTimeAgo(row.lastSync)}
                  </Typography>
                ),
              },
              {
                key: 'mapped',
                label: 'Annonces mappées',
                align: 'center',
                render: (row) => (
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                    {row.listingsMapped} / {row.totalListings}
                  </Typography>
                ),
              },
              {
                key: 'success',
                label: 'Syncs réussies',
                align: 'right',
                render: (row) => (
                  <Typography sx={{ fontSize: 12.5, color: t.success, fontWeight: 600 }}>
                    {row.syncSuccess}
                  </Typography>
                ),
              },
              {
                key: 'errors',
                label: 'Erreurs',
                align: 'right',
                render: (row) => (
                  <Typography sx={{ fontSize: 12.5, color: t.error, fontWeight: 600 }}>
                    {row.syncErrors}
                  </Typography>
                ),
              },
              {
                key: 'uptime',
                label: 'Uptime',
                align: 'right',
                render: (row) => (
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: row.uptime >= 98 ? t.success : row.uptime >= 90 ? t.warning : t.error,
                    }}
                  >
                    {row.uptime.toFixed(1)}%
                  </Typography>
                ),
              },
            ]}
            rows={filteredOtas}
          />
        </>
      )}

      {/* MAPPING TAB */}
      {selectedTab === 'mapping' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, color: t.text3, mb: 1 }}>
              Gérez les correspondances entre vos annonces Sojori et les IDs OTA
            </Typography>
          </Box>

          <DataTable
            columns={[
              {
                key: 'listing',
                label: 'Annonce Sojori',
                render: (row) => (
                  <Stack>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.listingName}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: t.text3 }}>{row.listingId}</Typography>
                  </Stack>
                ),
              },
              {
                key: 'airbnb',
                label: 'Airbnb ID',
                render: (row) => (
                  <Box>
                    {row.airbnbId ? (
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <SourcePill source="airbnb" />
                        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.airbnbId}</Typography>
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: t.text4, fontStyle: 'italic' }}>—</Typography>
                    )}
                  </Box>
                ),
              },
              {
                key: 'booking',
                label: 'Booking.com ID',
                render: (row) => (
                  <Box>
                    {row.bookingId ? (
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <SourcePill source="booking" />
                        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.bookingId}</Typography>
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: t.text4, fontStyle: 'italic' }}>—</Typography>
                    )}
                  </Box>
                ),
              },
              {
                key: 'vrbo',
                label: 'VRBO ID',
                render: (row) => (
                  <Box>
                    {row.vrboId ? (
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <SourcePill source="vrbo" />
                        <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.vrboId}</Typography>
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: t.text4, fontStyle: 'italic' }}>—</Typography>
                    )}
                  </Box>
                ),
              },
              {
                key: 'actions',
                label: 'Actions',
                align: 'right',
                render: (row) => (
                  <Button sx={{ ...btnGhostSx, ...btnSmSx, fontSize: 11 }}>✏️ Modifier</Button>
                ),
              },
            ]}
            rows={CHANNELS_DATA.mappings}
          />
        </>
      )}

      {/* LOGS TAB */}
      {selectedTab === 'logs' && (
        <>
          <FilterBar>
            <FilterChip
              label="Tous les canaux"
              active={selectedOta === 'all'}
              onClick={() => setSelectedOta('all')}
              dropdown
            />
            {['Airbnb', 'Booking.com', 'VRBO', 'Direct Booking'].map((ota) => (
              <FilterChip
                key={ota}
                label={ota}
                active={selectedOta === ota}
                onClick={() => setSelectedOta(ota)}
              />
            ))}
          </FilterBar>

          <DataTable
            columns={[
              {
                key: 'timestamp',
                label: 'Heure',
                render: (row) => (
                  <Typography sx={{ fontSize: 12.5, color: t.text3 }}>
                    {formatTimeAgo(row.timestamp)}
                  </Typography>
                ),
              },
              {
                key: 'ota',
                label: 'Canal',
                render: (row) => (
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{row.ota}</Typography>
                ),
              },
              {
                key: 'action',
                label: 'Action',
                render: (row) => (
                  <Typography sx={{ fontSize: 12.5, fontFamily: 'Geist Mono', color: t.text3 }}>
                    {row.action}
                  </Typography>
                ),
              },
              {
                key: 'status',
                label: 'Statut',
                render: (row) => (
                  <Badge
                    variant={
                      row.status === 'success'
                        ? 'success'
                        : row.status === 'error'
                        ? 'error'
                        : 'warning'
                    }
                    dot
                  >
                    {row.status === 'success' ? 'Succès' : row.status === 'error' ? 'Erreur' : 'Avertissement'}
                  </Badge>
                ),
              },
              {
                key: 'message',
                label: 'Message',
                render: (row) => (
                  <Typography sx={{ fontSize: 12, color: t.text3 }}>{row.message}</Typography>
                ),
              },
              {
                key: 'duration',
                label: 'Durée',
                align: 'right',
                render: (row) => (
                  <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'Geist Mono' }}>
                    {row.duration.toFixed(1)}s
                  </Typography>
                ),
              },
            ]}
            rows={paginatedLogs}
            footer={
              <>
                <Typography sx={{ fontSize: 12 }}>
                  {filteredLogs.length} logs · Page {logsPage} / {totalLogsPages}
                </Typography>
                <Pagination
                  page={logsPage}
                  totalPages={totalLogsPages}
                  onChange={setLogsPage}
                />
              </>
            }
          />
        </>
      )}
    </DashboardWrapper>
  );
}
