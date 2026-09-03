import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { fetchAnnualTrend, type AnnualTrend, type TrendMonth } from '../../services/revenueApi';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';

/**
 * Tendance annuelle — la matrice mois × indicateur.
 *
 * La saisonnalité d'abord, en courbes ; le détail chiffré ensuite. Le bloc
 * sur le coût des blocages ferme le rapport parce qu'il demande une lecture
 * posée : c'est une estimation, pas une perte constatée.
 */

const T = {
  accent: '#2d4a6b',
  gold: '#b8851a',
  goldSoft: '#E6B022',
  ink: '#191b18',
  ink2: '#4d5049',
  ink3: '#82867d',
  sheet: '#ffffff',
  sheetAlt: '#f4f4f0',
  rule: '#dcdcd4',
  ruleSoft: '#ebebe4',
  pos: '#2f6b4a',
  neg: '#9a3b2c',
};

const NF = new Intl.NumberFormat('fr-FR');
const n = (v: number | null | undefined) => (v == null ? '—' : NF.format(Math.round(v)));
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const fmtMonth = (ym: string) =>
  MONTH_FMT.format(new Date(`${ym}-01T00:00:00Z`)).replace('.', '');
const fmtMonthLong = (ym: string) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(`${ym}-01T00:00:00Z`),
  );

export function AnnualTrendPage() {
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<AnnualTrend | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) {
      setReport(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchAnnualTrend({ ownerId, year })
      .then((d) => {
        if (!cancelled) setReport(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, year]);

  const months = useMemo(() => report?.months ?? [], [report]);

  /** Courbes superposées : occupation en aire, ADR et RevPAR en lignes. */
  const chart = useMemo(() => {
    if (!months.length) return null;
    const W = 940;
    const H = 260;
    const pl = 40;
    const pr = 46;
    const pt = 20;
    const pb = 30;
    const maxMoney = Math.max(...months.map((m) => Math.max(m.adr ?? 0, m.revpar ?? 0)), 1);
    const slot = (W - pl - pr) / Math.max(1, months.length - 1);
    const h = H - pt - pb;
    const yOcc = (v: number) => pt + h * (1 - v / 100);
    const yMoney = (v: number) => pt + h * (1 - v / maxMoney);
    const x = (i: number) => pl + slot * i;
    return { W, H, pl, pr, pt, pb, h, maxMoney, slot, yOcc, yMoney, x };
  }, [months]);

  if (needsOwnerPick) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Tendance annuelle']}>
        <Alert severity="info">Choisissez un gestionnaire dans le filtre en haut de page.</Alert>
      </DashboardWrapper>
    );
  }

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Tendance annuelle']}>
        <Stack sx={{ alignItems: 'center', py: 10 }}>
          <CircularProgress size={26} sx={{ color: T.gold }} />
        </Stack>
      </DashboardWrapper>
    );
  }

  if (!report || !months.length) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Tendance annuelle']}>
        <Paper variant="outlined" sx={{ p: 4, border: `1px solid ${T.rule}`, borderRadius: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: T.ink2 }}>
            Aucune donnée pour {year}. Les photographies quotidiennes du parc alimentent ce
            rapport.
          </Typography>
        </Paper>
      </DashboardWrapper>
    );
  }

  const { totals } = report;
  const byReason = totals.blockedValueByReason;
  const maxReason = Math.max(byReason.houseGuest, byReason.outOfService, byReason.unclassified, 1);

  return (
    <DashboardWrapper breadcrumb={['Rapports', 'Tendance annuelle']}>
      {/* En-tête */}
      <Stack
        direction="row"
        sx={{
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          pb: 1.5,
          mb: 2.5,
          borderBottom: `2px solid ${T.ink}`,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: T.ink, lineHeight: 1.15 }}>
            Tendance annuelle
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.ink3, mt: 0.4 }}>
            {months.length} mois mesurés · occupation, prix et rendement
          </Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 0.75 }}>
          {[year - 1, year, year + 1].map((y) => (
            <Chip
              key={y}
              label={y}
              onClick={() => setYear(y)}
              sx={{
                height: 28,
                fontSize: 12.5,
                fontWeight: y === year ? 700 : 500,
                bgcolor: y === year ? `${T.goldSoft}22` : T.sheetAlt,
                color: y === year ? T.gold : T.ink2,
                border: `1px solid ${y === year ? T.goldSoft : T.rule}`,
              }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Les quatre indicateurs de l'année */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: '1px',
          bgcolor: T.rule,
          border: `1px solid ${T.rule}`,
          borderRadius: 0.5,
          overflow: 'hidden',
          mb: 3,
        }}
      >
        {[
          { l: 'Occupation', v: totals.occupancyPct == null ? '—' : `${totals.occupancyPct} %`, s: `${n(totals.soldUnits)} nuits vendues` },
          { l: 'Prix moyen', v: n(totals.adr), s: 'MAD par nuit vendue' },
          { l: 'RevPAR', v: n(totals.revpar), s: 'MAD par villa disponible' },
          { l: 'TRevPAR', v: n(totals.trevpar), s: 'extras compris' },
        ].map((k) => (
          <Box key={k.l} sx={{ bgcolor: T.sheet, p: 2 }}>
            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: T.ink3,
                mb: 0.75,
              }}
            >
              {k.l}
            </Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: T.ink, lineHeight: 1 }}>
              {k.v}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 0.5 }}>{k.s}</Typography>
          </Box>
        ))}
      </Box>

      {/* La saisonnalité */}
      <Box sx={{ mb: 4 }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 1.5,
            mb: 1.5,
            pb: 0.75,
            borderBottom: `1px solid ${T.rule}`,
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.ink }}>
            La saison
          </Typography>
          {report.best && report.worst ? (
            <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>
              Meilleur mois : {fmtMonthLong(report.best.month)} ({n(report.best.revpar)} de RevPAR)
            </Typography>
          ) : null}
        </Stack>
        <Paper variant="outlined" sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, p: 2 }}>
          {chart ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="svg"
                viewBox={`0 0 ${chart.W} ${chart.H}`}
                role="img"
                aria-label="Occupation, prix moyen et RevPAR mois par mois"
                sx={{ display: 'block', width: '100%', minWidth: 660, height: 'auto' }}
              >
                {/* Repères d'occupation, à gauche */}
                {[0, 50, 100].map((v) => (
                  <g key={v}>
                    <line
                      x1={chart.pl}
                      x2={chart.W - chart.pr}
                      y1={chart.yOcc(v)}
                      y2={chart.yOcc(v)}
                      stroke={T.ruleSoft}
                      strokeWidth="1"
                    />
                    <text
                      x={chart.pl - 8}
                      y={chart.yOcc(v) + 4}
                      textAnchor="end"
                      fill={T.ink3}
                      fontSize="10"
                    >
                      {v} %
                    </text>
                  </g>
                ))}

                {/* Occupation en aire : le fond de la saison */}
                <path
                  d={`M ${chart.x(0)},${chart.yOcc(0)} ${months
                    .map((m, i) => `L ${chart.x(i)},${chart.yOcc(m.occupancyPct ?? 0)}`)
                    .join(' ')} L ${chart.x(months.length - 1)},${chart.yOcc(0)} Z`}
                  fill={T.accent}
                  opacity="0.13"
                />
                <polyline
                  fill="none"
                  stroke={T.accent}
                  strokeWidth="2"
                  points={months
                    .map((m, i) => `${chart.x(i)},${chart.yOcc(m.occupancyPct ?? 0)}`)
                    .join(' ')}
                />

                {/* Prix moyen et RevPAR, échelle monétaire à droite */}
                <polyline
                  fill="none"
                  stroke={T.gold}
                  strokeWidth="1.75"
                  points={months
                    .map((m, i) => `${chart.x(i)},${chart.yMoney(m.adr ?? 0)}`)
                    .join(' ')}
                />
                <polyline
                  fill="none"
                  stroke={T.pos}
                  strokeWidth="1.75"
                  strokeDasharray="4 3"
                  points={months
                    .map((m, i) => `${chart.x(i)},${chart.yMoney(m.revpar ?? 0)}`)
                    .join(' ')}
                />

                {months.map((m, i) => (
                  <g key={m.month}>
                    <circle
                      cx={chart.x(i)}
                      cy={chart.yOcc(m.occupancyPct ?? 0)}
                      r="3.5"
                      fill={T.accent}
                    />
                    <text
                      x={chart.x(i)}
                      y={chart.yOcc(m.occupancyPct ?? 0) - 9}
                      textAnchor="middle"
                      fill={T.accent}
                      fontSize="10.5"
                      fontWeight="700"
                    >
                      {m.occupancyPct} %
                    </text>
                    <text
                      x={chart.x(i)}
                      y={chart.H - 10}
                      textAnchor="middle"
                      fill={T.ink3}
                      fontSize="10.5"
                    >
                      {fmtMonth(m.month)}
                    </text>
                    <title>
                      {`${fmtMonthLong(m.month)} · ${m.occupancyPct} % · ADR ${n(m.adr)} · RevPAR ${n(m.revpar)}`}
                    </title>
                  </g>
                ))}

                {/* Échelle monétaire */}
                <text
                  x={chart.W - chart.pr + 8}
                  y={chart.yMoney(chart.maxMoney) + 4}
                  fill={T.ink3}
                  fontSize="10"
                >
                  {n(chart.maxMoney)}
                </text>
                <text x={chart.W - chart.pr + 8} y={chart.yMoney(0) + 4} fill={T.ink3} fontSize="10">
                  0
                </text>
              </Box>
            </Box>
          ) : null}
          <Stack
            direction="row"
            sx={{
              gap: 2.5,
              mt: 1.5,
              pt: 1.25,
              borderTop: `1px solid ${T.ruleSoft}`,
              fontSize: 11.5,
              color: T.ink2,
              flexWrap: 'wrap',
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 13, height: 8, bgcolor: T.accent, opacity: 0.5, borderRadius: '1px' }} />
              Occupation (échelle gauche)
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 13, height: 2, bgcolor: T.gold }} />
              Prix moyen (échelle droite)
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 13,
                  height: 2,
                  backgroundImage: `repeating-linear-gradient(90deg, ${T.pos}, ${T.pos} 4px, transparent 4px, transparent 7px)`,
                }}
              />
              RevPAR
            </Stack>
          </Stack>
        </Paper>
      </Box>

      {/* La matrice chiffrée */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: T.ink,
            mb: 1.5,
            pb: 0.75,
            borderBottom: `1px solid ${T.rule}`,
          }}
        >
          Mois par mois
        </Typography>
        <Paper
          variant="outlined"
          sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, overflowX: 'auto' }}
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
              <Box component="tr" sx={{ bgcolor: T.sheetAlt }}>
                {['Mois', 'Disponible', 'Vendu', 'Occupation', 'Prix moyen', 'RevPAR', 'TRevPAR', 'Hébergement', 'Extras'].map(
                  (h, i) => (
                    <Box
                      component="th"
                      key={h}
                      sx={{
                        p: '10px 13px',
                        textAlign: i === 0 ? 'left' : 'right',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        color: T.ink3,
                        borderBottom: `1px solid ${T.rule}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </Box>
                  ),
                )}
              </Box>
            </thead>
            <tbody>
              {months.map((m: TrendMonth) => {
                const isBest = report.best?.month === m.month;
                return (
                  <Box
                    component="tr"
                    key={m.month}
                    sx={{ '&:hover td': { bgcolor: T.sheetAlt } }}
                  >
                    {[
                      fmtMonthLong(m.month).replace(/ \d{4}$/, ''),
                      n(m.availableUnits),
                      n(m.soldUnits),
                      m.occupancyPct == null ? '—' : `${m.occupancyPct} %`,
                      n(m.adr),
                      n(m.revpar),
                      n(m.trevpar),
                      n(m.roomRevenue),
                      n(m.extrasRevenue),
                    ].map((v, i) => (
                      <Box
                        component="td"
                        key={`${m.month}-${String(i)}`}
                        sx={{
                          p: '9px 13px',
                          textAlign: i === 0 ? 'left' : 'right',
                          borderBottom: `1px solid ${T.ruleSoft}`,
                          whiteSpace: 'nowrap',
                          fontWeight: i === 0 || (i === 5 && isBest) ? 600 : 400,
                          color: i === 5 && isBest ? T.gold : i === 0 ? T.ink : T.ink2,
                        }}
                      >
                        {v}
                      </Box>
                    ))}
                  </Box>
                );
              })}
              <Box component="tr" sx={{ bgcolor: T.sheetAlt }}>
                {[
                  'Année',
                  n(totals.availableUnits),
                  n(totals.soldUnits),
                  totals.occupancyPct == null ? '—' : `${totals.occupancyPct} %`,
                  n(totals.adr),
                  n(totals.revpar),
                  n(totals.trevpar),
                  n(totals.roomRevenue),
                  n(totals.extrasRevenue),
                ].map((v, i) => (
                  <Box
                    component="td"
                    key={`tot-${String(i)}`}
                    sx={{
                      p: '10px 13px',
                      textAlign: i === 0 ? 'left' : 'right',
                      borderTop: `1px solid ${T.rule}`,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      color: T.ink,
                    }}
                  >
                    {v}
                  </Box>
                ))}
              </Box>
            </tbody>
          </Box>
        </Paper>
      </Box>

      {/* Le coût des blocages — ce qu'aucun PMS ne calcule */}
      <Box>
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: T.ink,
            mb: 1.5,
            pb: 0.75,
            borderBottom: `1px solid ${T.rule}`,
          }}
        >
          Ce que les villas retirées de la vente représentent
        </Typography>
        <Paper variant="outlined" sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, p: 2.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr' },
              gap: 3,
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 34, fontWeight: 800, color: T.ink, lineHeight: 1 }}>
                {n(totals.blockedValue)}
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.ink3, mt: 0.5 }}>
                MAD · {n(totals.blockedUnits)} nuitées retirées
              </Typography>
              {totals.blockedValuePctOfRoom != null ? (
                <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 1, lineHeight: 1.6 }}>
                  Soit <b>{totals.blockedValuePctOfRoom} %</b> du chiffre hébergement réalisé.
                </Typography>
              ) : null}
            </Box>

            <Stack sx={{ gap: 1.25 }}>
              {[
                { l: 'Invités de la maison', v: byReason.houseGuest, u: totals.blockedByReason.houseGuest, c: T.gold },
                { l: 'Hors service', v: byReason.outOfService, u: totals.blockedByReason.outOfService, c: T.accent },
                { l: 'Motif non saisi', v: byReason.unclassified, u: totals.blockedByReason.unclassified, c: T.ink3 },
              ].map((r) => (
                <Box key={r.l}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                    <Typography sx={{ fontSize: 13, color: T.ink2 }}>
                      {r.l}{' '}
                      <Box component="span" sx={{ color: T.ink3, fontSize: 11 }}>
                        · {r.u} nuits
                      </Box>
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
                      {n(r.v)}
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 6, bgcolor: T.sheetAlt, borderRadius: 3, mt: 0.5 }}>
                    <Box
                      sx={{
                        width: `${Math.round((r.v / maxReason) * 100)}%`,
                        height: '100%',
                        bgcolor: r.c,
                        borderRadius: 3,
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

          <Typography
            sx={{
              fontSize: 11.5,
              color: T.ink3,
              mt: 2.5,
              pt: 1.5,
              borderTop: `1px solid ${T.ruleSoft}`,
              lineHeight: 1.65,
              maxWidth: '84ch',
            }}
          >
            Chaque nuitée retirée est valorisée au <b>prix moyen de son mois</b>. C'est une
            estimation, pas une perte constatée : rien ne dit que ces nuits se seraient vendues,
            ni à ce prix. Le chiffre mesure ce que l'hospitalité et la maintenance occupent dans
            le parc — une décision de gestion, pas un manque.
          </Typography>
        </Paper>
      </Box>
    </DashboardWrapper>
  );
}
