import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { NationalityMap } from './NationalityMap';
import { countryFlag, countryName } from './countryCodes';
import { fetchClientOrigin, type ClientOriginReport, type OriginCountry } from '../../services/revenueApi';

/**
 * Origine des clients — pilotée par les réservations.
 *
 * La carte se colore selon le critère choisi : le classement par volume de
 * séjours et le classement par chiffre d'affaires ne donnent pas le même
 * podium. Basculer entre les deux est la question à laquelle cette page
 * répond.
 */

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  gold: '#E6B022',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
};

const PERIODS = [
  { id: 'm1', label: '30 jours', days: 30 },
  { id: 'm3', label: '3 mois', days: 92 },
  { id: 'm6', label: '6 mois', days: 183 },
  { id: 'all', label: 'Tout', days: 3650 },
];

/** Les colonnes triables — chacune raconte une histoire différente. */
const METRICS = [
  { id: 'reservations', label: 'Réservations', unit: 'séjours' },
  { id: 'nights', label: 'Nuits', unit: 'nuits' },
  { id: 'total', label: 'Dépense totale', unit: 'MAD' },
  { id: 'extras', label: 'Hors hébergement', unit: 'MAD' },
] as const;

type MetricId = (typeof METRICS)[number]['id'];

const NF = new Intl.NumberFormat('fr-FR');
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function ClientOriginPage() {
  const [periodId, setPeriodId] = useState('all');
  const [metric, setMetric] = useState<MetricId>('reservations');
  const [report, setReport] = useState<ClientOriginReport | null>(null);
  const [loading, setLoading] = useState(true);

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[3];
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - period.days * 24 * 3600e3);
    return { from: ymd(from), to: ymd(new Date(to.getTime() + 24 * 3600e3)) };
  }, [period.days]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchClientOrigin(range)
      .then((d) => {
        if (!cancelled) setReport(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const active = METRICS.find((m) => m.id === metric) ?? METRICS[0];

  /** Pays triés selon le critère actif — c'est lui qui pilote tout l'écran. */
  const rows = useMemo(() => {
    const list = [...(report?.countries ?? [])];
    return list.sort((a, b) => (b[metric] as number) - (a[metric] as number));
  }, [report, metric]);

  /** La carte se colore sur le même critère que le classement. */
  const mapData = useMemo(
    () =>
      rows.map((c) => ({
        code: c.code,
        customers: c.customers,
        gross: c[metric] as number,
        unit: active.unit,
        secondary:
          metric === 'reservations' || metric === 'nights'
            ? `${NF.format(c.total)} MAD · ${c.perReservation ? NF.format(c.perReservation) : '—'} par séjour`
            : `${c.reservations} séjour${c.reservations > 1 ? 's' : ''}`,
      })),
    [rows, metric, active.unit],
  );

  const totals = report?.totals;
  const maxVal = rows.length ? (rows[0][metric] as number) : 0;

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Origine des clients']}>
        <Stack sx={{ alignItems: 'center', py: 10 }}>
          <CircularProgress size={26} sx={{ color: T.primary }} />
        </Stack>
      </DashboardWrapper>
    );
  }

  if (!report || !rows.length) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Origine des clients']}>
        <Paper variant="outlined" sx={{ p: 4, border: `1px solid ${T.border}`, borderRadius: 1.5 }}>
          <Typography sx={{ fontSize: 14, color: T.text2 }}>
            Aucune donnée sur la période. L'origine est reconstituée depuis les nationalités
            saisies à la réception.
          </Typography>
        </Paper>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Rapports', 'Origine des clients']}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
        D'où viennent les clients qui réservent, et ce qu'ils dépensent une fois sur place.
      </Typography>

      {/* Période */}
      <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {PERIODS.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            onClick={() => setPeriodId(p.id)}
            sx={{
              height: 28,
              fontSize: 12.5,
              fontWeight: periodId === p.id ? 700 : 500,
              bgcolor: periodId === p.id ? `${T.gold}22` : T.bg2,
              color: periodId === p.id ? T.primaryDeep : T.text2,
              border: `1px solid ${periodId === p.id ? T.gold : T.border}`,
            }}
          />
        ))}
      </Stack>

      {/* Indicateurs */}
      {totals ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: '1px',
            bgcolor: T.border,
            border: `1px solid ${T.border}`,
            borderRadius: 1.5,
            overflow: 'hidden',
            mb: 2.5,
          }}
        >
          {[
            { l: 'Réservations', v: NF.format(totals.reservations), s: `${totals.customers} clients` },
            { l: 'Nuits vendues', v: NF.format(totals.nights), s: `${rows.length} pays` },
            {
              l: 'Dépense totale',
              v: `${NF.format(totals.total)}`,
              s: 'MAD, hébergement et extras',
            },
            {
              l: 'Par réservation',
              v: totals.reservations
                ? NF.format(Math.round(totals.total / totals.reservations))
                : '—',
              s: 'MAD en moyenne',
            },
          ].map((k) => (
            <Box key={k.l} sx={{ bgcolor: T.bg1, p: 2 }}>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: T.text3,
                  mb: 0.75,
                }}
              >
                {k.l}
              </Typography>
              <Typography sx={{ fontSize: 25, fontWeight: 800, color: T.text, lineHeight: 1 }}>
                {k.v}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.5 }}>{k.s}</Typography>
            </Box>
          ))}
        </Box>
      ) : null}

      {/* Sélecteur de critère — le cœur de la page */}
      <Stack
        direction="row"
        sx={{ gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Typography sx={{ fontSize: 12, color: T.text3, mr: 0.5 }}>Classer par</Typography>
        {METRICS.map((m) => (
          <Chip
            key={m.id}
            label={m.label}
            onClick={() => setMetric(m.id)}
            sx={{
              height: 28,
              fontSize: 12.5,
              fontWeight: metric === m.id ? 700 : 500,
              bgcolor: metric === m.id ? `${T.gold}22` : T.bg2,
              color: metric === m.id ? T.primaryDeep : T.text2,
              border: `1px solid ${metric === m.id ? T.gold : T.border}`,
            }}
          />
        ))}
      </Stack>

      {/* Carte + classement */}
      <Paper
        variant="outlined"
        sx={{ p: 2.5, mb: 2.5, border: `1px solid ${T.border}`, borderRadius: 1.75 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.8fr 1fr' },
            gap: 2.5,
            alignItems: 'start',
          }}
        >
          <NationalityMap
            countries={mapData}
            unknownCustomers={report.unplaced.customers}
            metricLabel={`Moins de ${active.label.toLowerCase()}`}
          />

          <Stack sx={{ gap: 0.75 }}>
            {rows.slice(0, 8).map((c) => {
              const v = c[metric] as number;
              const w = maxVal > 0 ? Math.round((v / maxVal) * 100) : 0;
              return (
                <Box key={c.code}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}
                  >
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text }} noWrap>
                      {countryFlag(c.code)} {countryName(c.code)}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2 }}>
                      {NF.format(v)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                    <Box sx={{ flex: 1, height: 5, bgcolor: T.bg2, borderRadius: 3 }}>
                      <Box
                        sx={{ width: `${w}%`, height: '100%', bgcolor: T.gold, borderRadius: 3 }}
                      />
                    </Box>
                    <Typography
                      sx={{ fontSize: 10.5, color: T.text3, minWidth: 62, textAlign: 'right' }}
                    >
                      {c.reservations} séj. · {c.customers} cl.
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Paper>

      {/* Tableau complet */}
      <Paper
        variant="outlined"
        sx={{ border: `1px solid ${T.border}`, borderRadius: 1.75, overflowX: 'auto' }}
      >
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <thead>
            <Box component="tr" sx={{ bgcolor: T.bg2 }}>
              {[
                { l: 'Pays', a: 'left' as const, k: null },
                { l: 'Clients', a: 'right' as const, k: null },
                { l: 'Réservations', a: 'right' as const, k: 'reservations' },
                { l: 'Nuits', a: 'right' as const, k: 'nights' },
                { l: 'Hébergement', a: 'right' as const, k: null },
                { l: 'Hors hébergement', a: 'right' as const, k: 'extras' },
                { l: 'Total', a: 'right' as const, k: 'total' },
                { l: 'Par séjour', a: 'right' as const, k: null },
              ].map((h) => (
                <Box
                  component="th"
                  key={h.l}
                  onClick={h.k ? () => setMetric(h.k as MetricId) : undefined}
                  sx={{
                    p: '10px 14px',
                    textAlign: h.a,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: h.k === metric ? T.primaryDeep : T.text3,
                    borderBottom: `1px solid ${T.border}`,
                    whiteSpace: 'nowrap',
                    cursor: h.k ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  {h.l}
                  {h.k === metric ? ' ↓' : ''}
                </Box>
              ))}
            </Box>
          </thead>
          <tbody>
            {rows.map((c: OriginCountry) => (
              <Box
                component="tr"
                key={c.code}
                sx={{ '&:hover td': { bgcolor: T.bg2 } }}
              >
                <Box
                  component="td"
                  sx={{ p: '9px 14px', borderBottom: `1px solid ${T.border}`, fontWeight: 600 }}
                >
                  {countryFlag(c.code)} {countryName(c.code)}
                </Box>
                {[
                  c.customers,
                  c.reservations,
                  c.nights,
                  c.accommodation,
                  c.extras,
                  c.total,
                  c.perReservation,
                ].map((v, i) => (
                  <Box
                    component="td"
                    key={`${c.code}-${String(i)}`}
                    sx={{
                      p: '9px 14px',
                      textAlign: 'right',
                      borderBottom: `1px solid ${T.border}`,
                      whiteSpace: 'nowrap',
                      fontWeight: i === 5 ? 700 : 400,
                      color: i === 5 ? T.text : T.text2,
                    }}
                  >
                    {v == null ? '—' : NF.format(v)}
                  </Box>
                ))}
              </Box>
            ))}

            {/* Les clients sans pays : comptés, jamais masqués. */}
            {report.unplaced.customers > 0 ? (
              <Box component="tr">
                <Box
                  component="td"
                  colSpan={8}
                  sx={{
                    p: '11px 14px',
                    borderTop: `1px dashed ${T.border}`,
                    fontSize: 11.5,
                    color: T.text3,
                  }}
                >
                  <b>{report.unplaced.customers} clients sans nationalité saisie</b> —{' '}
                  {report.unplaced.reservations} réservations,{' '}
                  {NF.format(report.unplaced.total)} MAD. Réservations directes dont la réception
                  n'a pas renseigné le pays : hors carte, mais comptés dans les totaux.
                </Box>
              </Box>
            ) : null}
          </tbody>
        </Box>
      </Paper>
    </DashboardWrapper>
  );
}
