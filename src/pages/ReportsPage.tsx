import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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
  const [period, setPeriod] = useState('May 2026');
  const [format, setFormat] = useState('PDF');
  const [sendByEmail, setSendByEmail] = useState(true);
  const [schedule, setSchedule] = useState('monthly');
  const [selectedProperties, setSelectedProperties] = useState<string[]>(
    dashboardProperties.slice(0, 2)
  );

  const selectedTemplate = useMemo(
    () => mockReportTemplates.find((template) => template.id === reportType) || mockReportTemplates[0],
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
            <TextField
              select
              label="Type de rapport"
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
            >
              {mockReportTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Periode"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              helperText="Ex: May 2026, Q2 2026, 01/05 - 31/05"
            />

            <TextField
              select
              label="Format"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
            >
              {selectedTemplate.formats.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Planification"
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
            >
              <MenuItem value="once">Ponctuel</MenuItem>
              <MenuItem value="weekly">Hebdomadaire</MenuItem>
              <MenuItem value="monthly">Mensuel</MenuItem>
            </TextField>

            <FormControlLabel
              control={
                <Checkbox
                  checked={sendByEmail}
                  onChange={(event) => setSendByEmail(event.target.checked)}
                />
              }
              label="Envoyer le rapport par email apres generation"
            />

            <Typography variant="body2" color="text.secondary">
              {selectedTemplate.description}
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
