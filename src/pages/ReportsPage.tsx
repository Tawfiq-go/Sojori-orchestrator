import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  Badge,
  DataTable,
  FilterBar,
  FilterChip,
  PageHeader,
  Panel,
  btnGhostSx,
  btnPrimarySx,
} from '../components/dashboard/DashboardV2.components';
import {
  mockGeneratedReports,
  mockReportPreview,
  mockReportTemplates,
} from '../data/mockAnalytics';
import { dashboardProperties } from '../data/mockDashboard';

export function ReportsPage() {
  const [reportType, setReportType] = useState(mockReportTemplates[0].id);
  const [period, setPeriod] = useState('Mai 2026');
  const [format, setFormat] = useState('PDF');
  const [sendByEmail, setSendByEmail] = useState(true);
  const [schedule, setSchedule] = useState('monthly');
  const [selectedProperties, setSelectedProperties] = useState<string[]>(
    dashboardProperties.slice(0, 2)
  );

  const selectedTemplate = useMemo(
    () =>
      mockReportTemplates.find((template) => template.id === reportType) ||
      mockReportTemplates[0],
    [reportType]
  );

  const historyColumns = [
    { key: 'name', label: 'Report', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'format', label: 'Format', sortable: true },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: (typeof mockGeneratedReports)[number]) => (
        <Badge variant={row.status === 'Envoye' ? 'success' : row.status === 'Brouillon' ? 'warning' : 'info'}>
          {row.status}
        </Badge>
      ),
    },
    { key: 'createdAt', label: 'Created', sortable: true },
    { key: 'owner', label: 'Owner', sortable: true },
  ];

  const previewKey = selectedTemplate.id === 'report-occupancy' ? 'occupancy' : 'financial';
  const scheduleLabel =
    schedule === 'once'
      ? 'Ponctuel'
      : schedule === 'weekly'
        ? 'Hebdomadaire'
        : 'Mensuel';

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Reports']}>
      <PageHeader title="Reports" count="MOCK generator">
        <Button sx={btnGhostSx}>Download latest</Button>
        <Button sx={btnPrimarySx}>Generate report</Button>
      </PageHeader>

      <FilterBar>
        {mockReportTemplates.map((template) => (
          <FilterChip
            key={template.id}
            label={template.name}
            active={reportType === template.id}
            onClick={() => {
              setReportType(template.id);
              setFormat(template.formats[0]);
            }}
          />
        ))}
      </FilterBar>

      <FilterBar>
        <FilterChip
          label={`Periode: ${period}`}
          active
          onClick={() => setPeriod(period === 'Mai 2026' ? 'Q2 2026' : 'Mai 2026')}
        />
        {selectedTemplate.formats.map((item) => (
          <FilterChip
            key={item}
            label={item}
            active={format === item}
            onClick={() => setFormat(item)}
          />
        ))}
        <FilterChip
          label={`Email: ${sendByEmail ? 'Oui' : 'Non'}`}
          active={sendByEmail}
          onClick={() => setSendByEmail((prev) => !prev)}
        />
        <FilterChip
          label={`Planning: ${scheduleLabel}`}
          active
          onClick={() =>
            setSchedule((prev) =>
              prev === 'once' ? 'weekly' : prev === 'weekly' ? 'monthly' : 'once'
            )
          }
        />
      </FilterBar>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '0.95fr 1.05fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <Panel title="Generation" desc="Selection type, periode, properties, format">
          <Stack spacing={2}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(230,176,34,0.08)',
                border: '1px dashed rgba(230,176,34,0.35)',
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                {selectedTemplate.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedTemplate.description}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Periode active: <strong>{period}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Format choisi: <strong>{format}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Envoi email: <strong>{sendByEmail ? 'Oui' : 'Non'}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Planification: <strong>{scheduleLabel}</strong>
            </Typography>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Properties selectionnees
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {dashboardProperties.map((property) => (
                  <FilterChip
                    key={property}
                    label={property}
                    active={selectedProperties.includes(property)}
                    onClick={() =>
                      setSelectedProperties((prev) =>
                        prev.includes(property)
                          ? prev.filter((value) => value !== property)
                          : [...prev, property]
                      )
                    }
                  />
                ))}
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button variant="contained" sx={btnPrimarySx}>
                Generate preview
              </Button>
              <Button variant="outlined" sx={btnGhostSx}>
                Mock send email
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {selectedTemplate.description}
            </Typography>
          </Stack>
        </Panel>

        <Panel title="Preview rapport" desc={`${selectedTemplate.name} · ${format}`}>
          <Stack spacing={1.5}>
            {mockReportPreview[previewKey].map((item) => (
              <Box
                key={item.label}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'rgba(26,20,8,0.08)',
                  borderRadius: 2,
                }}
              >
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.value}
                  </Typography>
                </Stack>
              </Box>
            ))}

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(230,176,34,0.08)',
                border: '1px dashed rgba(230,176,34,0.35)',
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Delivery options
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Format: {format} · Email: {sendByEmail ? 'Oui' : 'Non'} · Schedule:{' '}
                {schedule === 'once' ? 'Ponctuel' : schedule === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Historique et boutons de download ci-dessous en mode mock.
            </Typography>
          </Stack>
        </Panel>
      </Box>

      <Panel title="Historique des rapports generes" desc="Download buttons + latest runs">
        <DataTable columns={historyColumns} rows={mockGeneratedReports} />
      </Panel>
    </DashboardWrapper>
  );
}
