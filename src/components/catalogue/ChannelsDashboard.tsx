import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  type ChannelRuFieldMapping,
  type ChannelsData,
  type OwnerOption,
} from '../../data/catalogueMock';
import {
  Badge,
  DataTable,
  FilterBar,
  FilterChip,
  Panel,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  btnSmSx,
  tokens as t,
} from '../dashboard/DashboardV2.components';

type MainTab = 'summary' | 'business' | 'debug' | 'cron' | 'mapping';
type BusinessTab = 'messages' | 'reservations' | 'calendar' | 'listing';

interface ChannelsDashboardProps {
  data: ChannelsData;
  owners: OwnerOption[];
  onChange: (data: ChannelsData) => void;
  onToast: (message: string, severity?: 'success' | 'info' | 'warning' | 'error') => void;
}

const mainTabs: Array<{ key: MainTab; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'business', label: 'Business' },
  { key: 'debug', label: 'Debug' },
  { key: 'cron', label: 'Cron' },
  { key: 'mapping', label: 'Mapping RU' },
];

const businessTabs: Array<{ key: BusinessTab; label: string }> = [
  { key: 'messages', label: 'Messages' },
  { key: 'reservations', label: 'Réservations' },
  { key: 'calendar', label: 'Calendrier' },
  { key: 'listing', label: 'Listing' },
];

export function ChannelsDashboard({
  data,
  owners,
  onChange,
  onToast,
}: ChannelsDashboardProps) {
  const [tab, setTab] = useState<MainTab>('summary');
  const [businessTab, setBusinessTab] = useState<BusinessTab>('messages');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingDraft, setMappingDraft] = useState<ChannelRuFieldMapping | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardOwnerId, setWizardOwnerId] = useState(owners[0]?.id || '');
  const [wizardCity, setWizardCity] = useState('Marrakech');
  const [wizardSelection, setWizardSelection] = useState<string[]>(['Prop-001', 'Prop-002']);

  const stats = useMemo(() => {
    const totalCalls = data.overview.reduce((sum, item) => sum + item.today, 0);
    const totalErrors = data.overview.reduce((sum, item) => sum + item.err, 0);
    const connected = data.overview.filter((item) => item.status === 'connected').length;
    const successRate = totalCalls > 0 ? Math.round(((totalCalls - totalErrors) / totalCalls) * 100) : 0;
    return { totalCalls, totalErrors, connected, successRate };
  }, [data.overview]);

  const filteredLogs =
    levelFilter === 'all'
      ? data.debugLogs
      : data.debugLogs.filter((item) => item.level === levelFilter);

  const openMappingEditor = (mapping?: ChannelRuFieldMapping) => {
    setMappingDraft(
      mapping || {
        id: `mapping-${Date.now()}`,
        ruCode: '',
        sojoriName: '',
        category: 'Listing',
        priority: data.ruMappings.length + 1,
        active: true,
        outboundPush: true,
        notes: '',
      },
    );
    setMappingDialogOpen(true);
  };

  const saveMapping = () => {
    if (!mappingDraft) {
      return;
    }

    const exists = data.ruMappings.some((item) => item.id === mappingDraft.id);
    onChange({
      ...data,
      ruMappings: exists
        ? data.ruMappings.map((item) => (item.id === mappingDraft.id ? mappingDraft : item))
        : [mappingDraft, ...data.ruMappings],
    });
    setMappingDialogOpen(false);
    onToast(exists ? 'Mapping mis à jour' : 'Mapping créé');
  };

  const deleteMapping = (id: string) => {
    onChange({
      ...data,
      ruMappings: data.ruMappings.filter((item) => item.id !== id),
    });
    onToast('Mapping supprimé', 'warning');
  };

  const toggleChannel = (id: string) => {
    onChange({
      ...data,
      overview: data.overview.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === 'connected' ? 'disconnected' : 'connected',
            }
          : item,
      ),
    });
    onToast('Statut canal mis à jour');
  };

  const toggleCron = (id: string) => {
    onChange({
      ...data,
      cronJobs: data.cronJobs.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    });
    onToast('Job cron mis à jour');
  };

  const finishWizard = () => {
    const owner = owners.find((item) => item.id === wizardOwnerId) || owners[0];
    onChange({
      ...data,
      importHistory: [
        {
          id: `imp-${Date.now()}`,
          ownerId: owner.id,
          ownerName: owner.name,
          cityId: wizardCity.toLowerCase(),
          cityName: wizardCity,
          propertiesImported: wizardSelection.length,
          status: 'completed',
          createdAt: new Date().toLocaleString('fr-FR'),
        },
        ...data.importHistory,
      ],
    });
    setWizardOpen(false);
    setWizardStep(0);
    onToast(`${wizardSelection.length} propriétés importées depuis RU`);
  };

  return (
    <>
      <StatsRow>
        <StatCard icon="🔗" iconBg={t.primaryTint} iconColor={t.primary} value={String(stats.connected)} label="Canaux connectés" />
        <StatCard icon="📡" iconBg={t.infoTint} iconColor={t.info} value={String(stats.totalCalls)} label="API calls today" />
        <StatCard icon="✅" iconBg={t.successTint} iconColor={t.success} value={`${stats.successRate}%`} label="Success rate" />
        <StatCard icon="⚠️" iconBg={t.errorTint} iconColor={t.error} value={String(stats.totalErrors)} label="Errors 24h" />
      </StatsRow>

      <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 2 }}>
        {mainTabs.map((item) => (
          <Button
            key={item.key}
            onClick={() => setTab(item.key)}
            sx={{
              ...btnGhostSx,
              ...(tab === item.key ? { bgcolor: t.primaryTint, borderColor: t.primary } : {}),
            }}
          >
            {item.label}
          </Button>
        ))}
      </Stack>

      {tab === 'summary' && (
        <>
          <FilterBar>
            <FilterChip label="Refresh" active={false} onClick={() => onToast('Refresh mock terminé', 'info')} />
            <FilterChip label="Sync RU Countries/Languages" active={false} onClick={() => onToast('Sync RU countries/languages lancée', 'info')} />
          </FilterBar>

          <Panel title="Overview canaux" desc="Webhooks, API calls et mapping" sx={{ mt: 2 }}>
            <DataTable
              columns={[
                { key: 'name', label: 'Canal', render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.logo} {row.name}</Typography> },
                { key: 'status', label: 'Statut', render: (row) => <Badge variant={row.status === 'connected' ? 'success' : row.status === 'error' ? 'error' : 'neutral'}>{row.status}</Badge> },
                { key: 'lastSync', label: 'Dernière sync' },
                { key: 'today', label: 'Calls today', align: 'right' },
                { key: 'err', label: 'Errors', align: 'right' },
                { key: 'mappedListings', label: 'Listings mappées', align: 'right' },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <Stack direction="row" spacing={0.75}>
                      <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => toggleChannel(row.id)}>
                        {row.status === 'connected' ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => onToast(`Retry sync pour ${row.name}`, 'info')}>
                        Retry failed sync
                      </Button>
                    </Stack>
                  ),
                },
              ]}
              rows={data.overview}
            />
          </Panel>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mt: 2 }}>
            <Panel title="API Calls directes" desc="Actions initiées par l’utilisateur">
              <DataTable columns={[{ key: 'action', label: 'Action' }, { key: 'total', label: 'Total', align: 'right' }, { key: 'ok', label: 'OK', align: 'right' }, { key: 'err', label: 'Err', align: 'right' }, { key: 'dataVolume', label: 'Volume' }]} rows={data.directApiCalls} />
            </Panel>
            <Panel title="API Calls cron" desc="Jobs automatiques">
              <DataTable columns={[{ key: 'action', label: 'Action' }, { key: 'total', label: 'Total', align: 'right' }, { key: 'ok', label: 'OK', align: 'right' }, { key: 'err', label: 'Err', align: 'right' }, { key: 'dataVolume', label: 'Volume' }]} rows={data.cronApiCalls} />
            </Panel>
          </Box>
        </>
      )}

      {tab === 'business' && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {businessTabs.map((item) => (
              <Button
                key={item.key}
                onClick={() => setBusinessTab(item.key)}
                sx={{
                  ...btnGhostSx,
                  ...(businessTab === item.key ? { bgcolor: t.primaryTint, borderColor: t.primary } : {}),
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          {businessTab === 'messages' && (
            <DataTable
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'event', label: 'Événement' },
                { key: 'guest', label: 'Guest' },
                { key: 'preview', label: 'Preview' },
                { key: 'correlation', label: 'Correlation' },
              ]}
              rows={data.businessMessages}
            />
          )}

          {businessTab === 'reservations' && (
            <DataTable
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'client', label: 'Client' },
                { key: 'checkIn', label: 'Check-in' },
                { key: 'checkOut', label: 'Check-out' },
                { key: 'amount', label: 'Montant', align: 'right', render: (row) => `€${row.amount}` },
                { key: 'ota', label: 'OTA' },
                { key: 'mapped', label: 'Mapped' },
              ]}
              rows={data.businessReservations}
            />
          )}

          {businessTab === 'calendar' && (
            <DataTable
              columns={[
                { key: 'when', label: 'Quand' },
                { key: 'action', label: 'Action' },
                { key: 'listing', label: 'Listing' },
                { key: 'owner', label: 'Owner' },
                { key: 'changes', label: 'Changes' },
                { key: 'response', label: 'Réponse' },
              ]}
              rows={data.businessCalendar}
            />
          )}

          {businessTab === 'listing' && (
            <DataTable
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'listing', label: 'Listing' },
                { key: 'action', label: 'Action' },
                { key: 'owner', label: 'Owner' },
                { key: 'code', label: 'Code' },
                { key: 'details', label: 'Détails' },
              ]}
              rows={data.businessListing}
            />
          )}
        </>
      )}

      {tab === 'debug' && (
        <>
          <FilterBar>
            <FilterChip label="Tous" active={levelFilter === 'all'} onClick={() => setLevelFilter('all')} />
            <FilterChip label="Info" active={levelFilter === 'info'} onClick={() => setLevelFilter('info')} />
            <FilterChip label="Warning" active={levelFilter === 'warning'} onClick={() => setLevelFilter('warning')} />
            <FilterChip label="Error" active={levelFilter === 'error'} onClick={() => setLevelFilter('error')} />
          </FilterBar>
          <DataTable
            columns={[
              { key: 'timestamp', label: 'Timestamp' },
              { key: 'service', label: 'Service' },
              { key: 'level', label: 'Niveau', render: (row) => <Badge variant={row.level === 'error' ? 'error' : row.level === 'warning' ? 'warning' : 'info'}>{row.level}</Badge> },
              { key: 'endpoint', label: 'Endpoint' },
              { key: 'statusCode', label: 'HTTP', align: 'right' },
              { key: 'durationMs', label: 'ms', align: 'right' },
              { key: 'message', label: 'Message' },
            ]}
            rows={filteredLogs}
          />
        </>
      )}

      {tab === 'cron' && (
        <DataTable
          columns={[
            { key: 'name', label: 'Job' },
            { key: 'schedule', label: 'Schedule' },
            { key: 'lastRun', label: 'Last run' },
            { key: 'duration', label: 'Duration' },
            { key: 'owners', label: 'Owners', align: 'right' },
            { key: 'failures', label: 'Failures', align: 'right' },
            {
              key: 'enabled',
              label: 'Actif',
              render: (row) => <Switch size="small" checked={row.enabled} onChange={() => toggleCron(row.id)} />,
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <Stack direction="row" spacing={0.75}>
                  <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => onToast(`Retry job ${row.name}`, 'info')}>
                    Retry
                  </Button>
                  <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => onToast(`Correlation ${row.correlationId}`, 'info')}>
                    Correlation
                  </Button>
                </Stack>
              ),
            },
          ]}
          rows={data.cronJobs}
        />
      )}

      {tab === 'mapping' && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button sx={btnPrimarySx} onClick={() => openMappingEditor()}>
              + Nouveau mapping
            </Button>
            <Button sx={btnGhostSx} onClick={() => setWizardOpen(true)}>
              📥 Import RU Wizard
            </Button>
          </Stack>

          <DataTable
            columns={[
              { key: 'ruCode', label: 'RU field' },
              { key: 'sojoriName', label: 'Sojori field' },
              { key: 'category', label: 'Catégorie' },
              { key: 'priority', label: 'Priorité', align: 'right' },
              { key: 'active', label: 'Actif', render: (row) => <Switch size="small" checked={row.active} onChange={() => openMappingEditor({ ...row, active: !row.active })} /> },
              { key: 'outboundPush', label: 'Push', render: (row) => <Badge variant={row.outboundPush ? 'success' : 'neutral'}>{row.outboundPush ? 'Oui' : 'Non'}</Badge> },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <Stack direction="row" spacing={0.75}>
                    <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => openMappingEditor(row)}>
                      Éditer
                    </Button>
                    <Button sx={{ ...btnGhostSx, ...btnSmSx }} color="error" onClick={() => deleteMapping(row.id)}>
                      Supprimer
                    </Button>
                  </Stack>
                ),
              },
            ]}
            rows={data.ruMappings}
          />

          <Panel title="Historique imports RU" desc="Derniers imports mock" sx={{ mt: 2 }}>
            <DataTable
              columns={[
                { key: 'createdAt', label: 'Date' },
                { key: 'ownerName', label: 'Owner' },
                { key: 'cityName', label: 'Ville' },
                { key: 'propertiesImported', label: 'Properties', align: 'right' },
                { key: 'status', label: 'Statut' },
              ]}
              rows={data.importHistory}
            />
          </Panel>
        </>
      )}

      <Dialog open={mappingDialogOpen} onClose={() => setMappingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mappingDraft && data.ruMappings.some((item) => item.id === mappingDraft.id) ? 'Éditer mapping' : 'Créer mapping'}</DialogTitle>
        <DialogContent>
          {mappingDraft && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="RU field" value={mappingDraft.ruCode} onChange={(event) => setMappingDraft({ ...mappingDraft, ruCode: event.target.value })} />
              <TextField label="Sojori field" value={mappingDraft.sojoriName} onChange={(event) => setMappingDraft({ ...mappingDraft, sojoriName: event.target.value })} />
              <TextField label="Catégorie" value={mappingDraft.category} onChange={(event) => setMappingDraft({ ...mappingDraft, category: event.target.value })} />
              <TextField label="Priorité" type="number" value={mappingDraft.priority} onChange={(event) => setMappingDraft({ ...mappingDraft, priority: Number(event.target.value || 0) })} />
              <TextField label="Notes" multiline rows={3} value={mappingDraft.notes} onChange={(event) => setMappingDraft({ ...mappingDraft, notes: event.target.value })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button sx={btnGhostSx} onClick={() => setMappingDialogOpen(false)}>
            Annuler
          </Button>
          <Button sx={btnPrimarySx} onClick={saveMapping}>
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import RU Wizard</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12, color: t.text3, mb: 2 }}>Étape {wizardStep + 1} / 6</Typography>

          {wizardStep === 0 && (
            <Stack spacing={2}>
              <TextField
                label="Owner"
                select
                value={wizardOwnerId}
                onChange={(event) => setWizardOwnerId(event.target.value)}
              >
                {owners.map((owner) => (
                  <MenuItem key={owner.id} value={owner.id}>
                    {owner.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
          {wizardStep === 1 && (
            <Panel sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Fetch properties (mock)</Typography>
              <Typography sx={{ fontSize: 12, color: t.text3, mt: 1 }}>
                4 propriétés RU détectées pour cet owner.
              </Typography>
            </Panel>
          )}
          {wizardStep === 2 && (
            <Stack spacing={1.25}>
              {['Prop-001', 'Prop-002', 'Prop-003', 'Prop-004'].map((property) => (
                <Button
                  key={property}
                  sx={{
                    ...btnGhostSx,
                    ...(wizardSelection.includes(property) ? { bgcolor: t.primaryTint } : {}),
                  }}
                  onClick={() =>
                    setWizardSelection((prev) =>
                      prev.includes(property)
                        ? prev.filter((item) => item !== property)
                        : [...prev, property],
                    )
                  }
                >
                  {property}
                </Button>
              ))}
            </Stack>
          )}
          {wizardStep === 3 && (
            <TextField label="Ville Sojori" select value={wizardCity} onChange={(event) => setWizardCity(event.target.value)}>
              {['Marrakech', 'Nice', 'Calvi'].map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </TextField>
          )}
          {wizardStep === 4 && (
            <Panel sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Confirmation</Typography>
              <Typography sx={{ fontSize: 12, color: t.text3, mt: 1 }}>
                Owner: {owners.find((item) => item.id === wizardOwnerId)?.name} · Ville: {wizardCity} · Propriétés sélectionnées: {wizardSelection.length}
              </Typography>
            </Panel>
          )}
          {wizardStep === 5 && (
            <Panel sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.success }}>
                Import prêt
              </Typography>
              <Typography sx={{ fontSize: 12, color: t.text3, mt: 1 }}>
                Cliquez sur "Terminer" pour créer l’historique d’import mock.
              </Typography>
            </Panel>
          )}
        </DialogContent>
        <DialogActions>
          <Button sx={btnGhostSx} onClick={() => (wizardStep === 0 ? setWizardOpen(false) : setWizardStep((prev) => prev - 1))}>
            {wizardStep === 0 ? 'Fermer' : 'Précédent'}
          </Button>
          {wizardStep < 5 ? (
            <Button sx={btnPrimarySx} onClick={() => setWizardStep((prev) => prev + 1)}>
              Suivant
            </Button>
          ) : (
            <Button sx={btnPrimarySx} onClick={finishWizard}>
              Terminer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
