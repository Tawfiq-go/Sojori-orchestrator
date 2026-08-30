import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Drawer,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import {
  fetchCustomerDetail,
  fetchCustomersReport,
  type CustomerDetail,
  type CustomerReportRow,
  type CustomersReport,
} from '../../services/revenueApi';

/**
 * Client 360 — ce que le PMS ne sait pas produire.
 *
 * Il connaît des séjours et des lignes comptables ; il ne dit jamais *qui* a
 * consommé *quoi*. Le rapprochement fait côté Sojori permet de classer les
 * clients par valeur et d'ouvrir leur profil de consommation.
 */

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  gold: '#E6B022',
  green: '#93C47D',
  blue: '#0673b3',
  red: '#C81E1E',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
};

/** Une couleur par département, cohérente entre le tableau et les graphes. */
const DEPT = [
  { id: 'fnb', label: 'Restauration', color: T.green },
  { id: 'other_operated', label: 'Prestations', color: T.blue },
  { id: 'misc', label: 'Divers', color: T.text3 },
];

const PERIODS = [
  { id: 'm1', label: '30 jours', days: 30 },
  { id: 'm3', label: '3 mois', days: 90 },
  { id: 'm6', label: '6 mois', days: 180 },
  { id: 'all', label: 'Tout', days: 400 },
];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function money(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} MAD`;
}

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/** Vignette chiffrée, même forme que celles du suivi mini-bar. */
function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Paper
      sx={{
        px: 2,
        py: 1.25,
        minWidth: 130,
        flex: 1,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 1.5,
        bgcolor: T.bg1,
      }}
    >
      <Typography
        sx={{
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: T.text3,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1.2, mt: 0.25 }}>
        {value}
      </Typography>
    </Paper>
  );
}

export function ClientReportPage() {
  const [periodId, setPeriodId] = useState('m3');
  const [report, setReport] = useState<CustomersReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1];
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - period.days * 24 * 3600e3);
    return { from: ymd(from), to: ymd(new Date(to.getTime() + 24 * 3600e3)) };
  }, [periodId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCustomersReport({ ...range, limit: 100 })
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

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetchCustomerDetail(openId, range)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openId, range]);

  const rows = report?.data ?? [];

  /** Les dix premiers suffisent : au-delà les barres deviennent illisibles. */
  const chartData = useMemo(
    () =>
      rows.slice(0, 10).map((r, i) => ({
        name: `#${i + 1}`,
        customerId: r.customerId,
        Restauration: r.byDepartment.fnb,
        Prestations: r.byDepartment.other_operated,
        Divers: r.byDepartment.misc,
      })),
    [rows],
  );

  /** Concentration : ce que pèsent les 10 premiers face au reste. */
  const concentration = useMemo(() => {
    const total = report?.totalGross ?? 0;
    if (!total) return null;
    const top = rows.slice(0, 10).reduce((s, r) => s + r.gross, 0);
    return { top, rest: Math.max(0, total - top), share: Math.round((top / total) * 100) };
  }, [rows, report]);

  return (
    <DashboardWrapper breadcrumb={['Rapports', 'Client 360']}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, lineHeight: 1.6 }}>
          Ce que chaque client consomme en dehors de l’hébergement, sur l’ensemble de ses
          séjours.
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={periodId}
          onChange={(_e, v: string | null) => v && setPeriodId(v)}
        >
          {PERIODS.map((p) => (
            <ToggleButton key={p.id} value={p.id} sx={{ px: 1.75, fontSize: 12 }}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" sx={{ gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Kpi label="Clients" value={String(report?.customers ?? 0)} accent={T.primary} />
        <Kpi label="Total extras" value={money(report?.totalGross ?? 0)} accent={T.gold} />
        <Kpi label="Panier moyen" value={money(report?.averageGross ?? 0)} accent={T.blue} />
        {concentration ? (
          <Kpi label="Top 10 = " value={`${concentration.share} %`} accent={T.green} />
        ) : null}
      </Stack>

      {loading ? (
        <Typography variant="body2">Chargement…</Typography>
      ) : rows.length === 0 ? (
        <Paper sx={{ p: 3, border: `1px solid ${T.border}`, borderRadius: 1.75 }}>
          <Typography variant="body2" color="text.secondary">
            Aucune consommation sur cette période.
          </Typography>
        </Paper>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
              gap: 2,
              mb: 2,
            }}
          >
            <Paper
              sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 1.75, bgcolor: T.bg1 }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: T.text2,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                Top 10 · répartition par type
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.text3 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: T.text3 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(v) => money(Number(v) || 0)}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                    }}
                  />
                  {DEPT.map((d) => (
                    <Bar key={d.id} dataKey={d.label} stackId="a" fill={d.color} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper
              sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 1.75, bgcolor: T.bg1 }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: T.text2,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                Concentration
              </Typography>
              {concentration ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Top 10', value: concentration.top },
                          { name: 'Autres', value: concentration.rest },
                        ]}
                        dataKey="value"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        <Cell fill={T.primary} />
                        <Cell fill={T.bg3} />
                      </Pie>
                      <Tooltip formatter={(v) => money(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Typography sx={{ fontSize: 12, color: T.text3, textAlign: 'center' }}>
                    Les 10 premiers pèsent <strong>{concentration.share} %</strong> des extras
                  </Typography>
                </>
              ) : null}
            </Paper>
          </Box>

          <Paper sx={{ border: `1px solid ${T.border}`, borderRadius: 1.75, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: T.bg2 }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Répartition</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
                      Articles
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
                      Notes
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Période</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r: CustomerReportRow, i: number) => (
                    <TableRow
                      key={r.customerId}
                      hover
                      onClick={() => setOpenId(r.customerId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: T.text3 }}>
                        {i + 1}
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {/* Barre de répartition : lisible d'un coup d'œil, sans chiffre. */}
                        <Stack direction="row" sx={{ height: 8, borderRadius: 99, overflow: 'hidden', width: 160 }}>
                          {DEPT.map((d) => {
                            const v = r.byDepartment[d.id as keyof typeof r.byDepartment] || 0;
                            const pct = r.gross ? (v / r.gross) * 100 : 0;
                            return pct > 0 ? (
                              <Box key={d.id} sx={{ width: `${pct}%`, bgcolor: d.color }} />
                            ) : null;
                          })}
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12.5 }}>
                        {r.items}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12.5, color: T.text3 }}>
                        {r.bills}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5, color: T.text3, whiteSpace: 'nowrap' }}>
                        {shortDate(r.firstAt)} → {shortDate(r.lastAt)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 13, fontWeight: 800, color: T.primaryDeep }}>
                        {money(r.gross)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </>
      )}

      <Drawer anchor="right" open={!!openId} onClose={() => setOpenId(null)}>
        <Box sx={{ width: { xs: 340, sm: 480 }, p: 2.5 }}>
          {detailLoading ? (
            <Typography variant="body2">Chargement…</Typography>
          ) : !detail ? (
            <Typography variant="body2" color="text.secondary">
              Aucune donnée.
            </Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: T.text }}>
                Profil de consommation
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25 }}>
                {shortDate(detail.firstAt)} → {shortDate(detail.lastAt)} · {detail.reservations}{' '}
                séjour{detail.reservations > 1 ? 's' : ''} · {detail.bills} note
                {detail.bills > 1 ? 's' : ''}
              </Typography>

              <Stack direction="row" sx={{ gap: 1, my: 2 }}>
                <Kpi label="Total" value={money(detail.gross)} accent={T.primary} />
                <Kpi label="Articles" value={String(detail.items)} accent={T.blue} />
              </Stack>

              <Divider sx={{ mb: 1.5 }} />

              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: T.text3,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                Ses produits favoris
              </Typography>
              {detail.favourites.map((f) => (
                <Stack
                  key={f.name}
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.6,
                    gap: 1,
                    borderBottom: `1px solid ${T.border}`,
                    '&:last-of-type': { borderBottom: 0 },
                  }}
                >
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                    <Chip
                      size="small"
                      label={`${f.times}×`}
                      sx={{
                        height: 18,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: `${T.primary}18`,
                        color: T.primaryDeep,
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        color: T.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={f.name}
                    >
                      {f.name}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {money(f.gross)}
                  </Typography>
                </Stack>
              ))}

              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: T.text3,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mt: 2.5,
                  mb: 1,
                }}
              >
                Répartition
              </Typography>
              {detail.byDepartment.map((d) => {
                const color = DEPT.find((x) => x.id === d.department)?.color ?? T.text3;
                const pct = detail.gross ? Math.round((d.gross / detail.gross) * 100) : 0;
                return (
                  <Box key={d.department} sx={{ mb: 1 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
                      <Typography sx={{ fontSize: 12, color: T.text2 }}>{d.label}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                        {money(d.gross)} · {pct} %
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 6, bgcolor: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
                      <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color }} />
                    </Box>
                  </Box>
                );
              })}
            </>
          )}
        </Box>
      </Drawer>
    </DashboardWrapper>
  );
}
