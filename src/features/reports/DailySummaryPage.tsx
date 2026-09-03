import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { fetchDailySummary, type DailyStats, type DailySummary } from '../../services/revenueApi';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';

/**
 * Résumé quotidien — ce que l'équipe lit chaque matin.
 *
 * L'ordre suit la journée réelle : d'abord ce qui bouge aujourd'hui
 * (arrivées, départs, villas immobilisées), ensuite ce qui vient (semaine,
 * rythme de prise), enfin le recul mensuel.
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

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
/** Jour + mois, sans le jour de semaine : suffisant sous une barre. */
const DAY_SHORT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' });

const fmtDay = (iso: string) => DAY_FMT.format(new Date(`${iso}T00:00:00Z`));
const fmtDayShort = (iso: string) =>
  DAY_SHORT.format(new Date(`${iso}T00:00:00Z`)).replace('.', '');
const fmtMonth = (ym: string) => MONTH_FMT.format(new Date(`${ym}-01T00:00:00Z`));

/** Motif de blocage, en mots que l'équipe emploie. */
const CATEGORY_LABEL: Record<string, string> = {
  out_of_service: 'Hors service',
  house_guest: 'Invité maison',
  unclassified: 'Motif non saisi',
};

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
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
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{title}</Typography>
        {aside ? <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>{aside}</Typography> : null}
      </Stack>
      {children}
    </Box>
  );
}

/** La colonne d'un des trois jours pivots. */
function DayCard({ label, d, highlight }: { label: string; d: DailyStats; highlight?: boolean }) {
  // La recette vient du prix négocié tant que le séjour n'est pas clôturé.
  const forecast = Boolean(d.isForecast);
  // Reste vide seulement si même la projection manque.
  const pending = d.soldUnits > 0 && d.roomRevenue === 0;
  return (
    <Box
      sx={{
        bgcolor: T.sheet,
        p: 2,
        borderTop: `2px solid ${highlight ? T.gold : 'transparent'}`,
      }}
    >
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: highlight ? T.gold : T.ink3,
          mb: 1,
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 0.75 }}>
        <Typography sx={{ fontSize: 27, fontWeight: 800, color: T.ink, lineHeight: 1 }}>
          {d.occupancyPct == null ? '—' : `${d.occupancyPct} %`}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>
          {d.soldUnits}/{d.availableUnits} villas
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ gap: 2, mt: 1.25, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: 10, color: T.ink3, letterSpacing: '.06em' }}>ADR</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: pending ? T.ink3 : T.ink2 }}>
            {pending ? '—' : n(d.adr)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 10, color: T.ink3, letterSpacing: '.06em' }}>
            REVPAR
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: pending ? T.ink3 : T.ink2 }}>
            {pending ? '—' : n(d.revpar)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 10, color: T.ink3, letterSpacing: '.06em' }}>
            HÉBERGEMENT
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: pending ? T.ink3 : T.ink2 }}>
            {pending ? '—' : n(d.roomRevenue)}
          </Typography>
        </Box>
      </Stack>
      {forecast ? (
        <Typography sx={{ fontSize: 10.5, color: T.gold, mt: 0.75, fontWeight: 600 }}>
          Prévisionnel · prix négocié
        </Typography>
      ) : pending ? (
        <Typography sx={{ fontSize: 10.5, color: T.ink3, mt: 0.75, fontStyle: 'italic' }}>
          Aucun prix enregistré
        </Typography>
      ) : null}
    </Box>
  );
}

export function DailySummaryPage() {
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [report, setReport] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const asOf = useMemo(() => {
    const d = new Date(Date.now() + offset * 86_400_000);
    return d.toISOString().slice(0, 10);
  }, [offset]);

  useEffect(() => {
    if (!ownerId) {
      setReport(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDailySummary({ ownerId, asOf })
      .then((d) => {
        if (!cancelled) setReport(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, asOf]);

  /** Graphe de la semaine : occupation et ADR, comme le rapport de référence. */
  const chart = useMemo(() => {
    const w = report?.week ?? [];
    if (!w.length) return null;
    const W = 900;
    const H = 210;
    const pl = 34;
    const pr = 34;
    const pt = 26;
    const pb = 28;
    const maxAdr = Math.max(...w.map((d) => d.adr ?? 0), 1);
    const slot = (W - pl - pr) / w.length;
    return { w, W, H, pl, pr, pt, pb, maxAdr, slot };
  }, [report]);

  if (needsOwnerPick) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Résumé quotidien']}>
        <Alert severity="info">Choisissez un gestionnaire dans le filtre en haut de page.</Alert>
      </DashboardWrapper>
    );
  }

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Résumé quotidien']}>
        <Stack sx={{ alignItems: 'center', py: 10 }}>
          <CircularProgress size={26} sx={{ color: T.gold }} />
        </Stack>
      </DashboardWrapper>
    );
  }

  if (!report) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Résumé quotidien']}>
        <Paper variant="outlined" sx={{ p: 4, border: `1px solid ${T.rule}`, borderRadius: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: T.ink2 }}>
            Résumé indisponible. Les photographies quotidiennes du parc alimentent ce rapport ;
            elles sont écrites chaque nuit à 3 h.
          </Typography>
        </Paper>
      </DashboardWrapper>
    );
  }

  const { days } = report;
  const blocksToday = days.today.blocks;

  return (
    <DashboardWrapper breadcrumb={['Rapports', 'Résumé quotidien']}>
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
            Résumé quotidien
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.ink3, mt: 0.4 }}>
            {fmtDay(report.asOf)} · parc de {report.parcUnits} villas
          </Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 0.75 }}>
          <Chip
            label="◀"
            onClick={() => setOffset((o) => o - 1)}
            sx={{ height: 28, fontSize: 12, bgcolor: T.sheetAlt, border: `1px solid ${T.rule}` }}
          />
          <Chip
            label="Aujourd’hui"
            onClick={() => setOffset(0)}
            sx={{
              height: 28,
              fontSize: 12.5,
              fontWeight: offset === 0 ? 700 : 500,
              bgcolor: offset === 0 ? `${T.goldSoft}22` : T.sheetAlt,
              color: offset === 0 ? T.gold : T.ink2,
              border: `1px solid ${offset === 0 ? T.goldSoft : T.rule}`,
            }}
          />
          <Chip
            label="▶"
            onClick={() => setOffset((o) => o + 1)}
            sx={{ height: 28, fontSize: 12, bgcolor: T.sheetAlt, border: `1px solid ${T.rule}` }}
          />
        </Stack>
      </Stack>

      {/* Trois jours pivots */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: '1px',
          bgcolor: T.rule,
          border: `1px solid ${T.rule}`,
          borderRadius: 0.5,
          overflow: 'hidden',
          mb: 3,
        }}
      >
        <DayCard label="Hier" d={days.yesterday} />
        <DayCard label="Aujourd’hui" d={days.today} highlight />
        <DayCard label="Demain" d={days.tomorrow} />
      </Box>

      {/* Arrivées et départs sur trois jours — six cases, comme le rapport
          de référence : c'est le premier coup d'œil du matin. */}
      {report.movement.length ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
            gap: '1px',
            bgcolor: T.rule,
            border: `1px solid ${T.rule}`,
            borderRadius: 0.5,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          {(() => {
            const idx = report.movement.findIndex((m) => m.day === report.asOf);
            const pick = [idx - 1, idx, idx + 1].filter((i) => i >= 0 && i < report.movement.length);
            const labels = ['Hier', 'Aujourd’hui', 'Demain'];
            const cells: Array<{ label: string; value: number; strong: boolean }> = [];
            pick.forEach((i, k) => {
              const m = report.movement[i];
              const lab = labels[k + (3 - pick.length)] ?? fmtDay(m.day);
              cells.push({ label: `Arrivées ${lab.toLowerCase()}`, value: m.arrivals, strong: lab === 'Aujourd’hui' });
              cells.push({ label: `Départs ${lab.toLowerCase()}`, value: m.departures, strong: lab === 'Aujourd’hui' });
            });
            return cells.map((c) => (
              <Box key={c.label} sx={{ bgcolor: T.sheet, p: 1.75, textAlign: 'center' }}>
                <Typography
                  sx={{ fontSize: 10, color: c.strong ? T.gold : T.ink3, lineHeight: 1.3, mb: 0.5 }}
                >
                  {c.label}
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: T.ink, lineHeight: 1 }}>
                  {c.value}
                </Typography>
              </Box>
            ));
          })()}
        </Box>
      ) : null}

      {/* Le mouvement du jour — ce que l'équipe regarde en premier */}
      <Section
        title="Le mouvement"
        aside={`${report.arrivals.length} arrivée${report.arrivals.length > 1 ? 's' : ''} aujourd’hui`}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          {/* Arrivées nommées, avec leur canal */}
          <Paper variant="outlined" sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, p: 2 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.ink, mb: 1.25 }}>
              Arrivées du jour
            </Typography>
            {report.arrivals.length ? (
              <Stack sx={{ gap: 1 }}>
                {report.arrivals.map((a) => (
                  <Stack
                    key={`${a.guestName}-${a.unit ?? ''}`}
                    direction="row"
                    sx={{ justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink }} noWrap>
                        {a.guestName}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: T.ink3 }}>
                        {a.unit ?? 'Villa non assignée'} · {a.channel}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: T.ink2, whiteSpace: 'nowrap' }}>
                      {a.nights} n. · {a.guests} pers.
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: T.ink3 }}>
                Aucune arrivée aujourd’hui.
              </Typography>
            )}
          </Paper>

          {/* Villas immobilisées, nommées — ce que le PMS ne montre pas */}
          <Paper variant="outlined" sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1.25 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>
                Villas retirées de la vente
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>
                {blocksToday.length}/{report.parcUnits}
              </Typography>
            </Stack>
            {blocksToday.length ? (
              <Stack sx={{ gap: 1 }}>
                {blocksToday.map((b) => (
                  <Stack
                    key={b.name}
                    direction="row"
                    sx={{ justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink }} noWrap>
                      {b.name}
                    </Typography>
                    <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                      <Typography sx={{ fontSize: 11.5, color: T.ink2 }} noWrap>
                        {b.reason || CATEGORY_LABEL[b.category] || b.category}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: T.ink3 }}>
                        {CATEGORY_LABEL[b.category] ?? b.category}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: T.ink3 }}>
                Tout le parc est vendable aujourd’hui.
              </Typography>
            )}
          </Paper>
        </Box>
      </Section>

      {/* La semaine à venir */}
      <Section title="Les sept prochains jours" aside="Occupation et prix moyen">
        <Paper variant="outlined" sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, p: 2 }}>
          {chart ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="svg"
                viewBox={`0 0 ${chart.W} ${chart.H}`}
                role="img"
                aria-label="Occupation et prix moyen sur les sept prochains jours"
                sx={{ display: 'block', width: '100%', minWidth: 620, height: 'auto' }}
              >
                {[0, 50, 100].map((v) => {
                  const y = chart.pt + (chart.H - chart.pt - chart.pb) * (1 - v / 100);
                  return (
                    <g key={v}>
                      <line
                        x1={chart.pl}
                        x2={chart.W - chart.pr}
                        y1={y}
                        y2={y}
                        stroke={T.ruleSoft}
                        strokeWidth="1"
                      />
                      <text x={chart.pl - 7} y={y + 4} textAnchor="end" fill={T.ink3} fontSize="10">
                        {v} %
                      </text>
                    </g>
                  );
                })}
                {chart.w.map((d, i) => {
                  const cx = chart.pl + chart.slot * i + chart.slot / 2;
                  const h = chart.H - chart.pt - chart.pb;
                  const occ = d.occupancyPct ?? 0;
                  const yOcc = chart.pt + h * (1 - occ / 100);
                  const bw = Math.min(30, chart.slot * 0.5);
                  return (
                    <g key={d.day}>
                      <rect
                        x={cx - bw / 2}
                        y={yOcc}
                        width={bw}
                        height={chart.pt + h - yOcc}
                        fill={T.accent}
                        rx="1"
                      />
                      <text x={cx} y={chart.H - 10} textAnchor="middle" fill={T.ink3} fontSize="10">
                        {fmtDay(d.day).replace('.', '')}
                      </text>
                      <text
                        x={cx}
                        y={yOcc - 5}
                        textAnchor="middle"
                        fill={T.ink2}
                        fontSize="10"
                        fontWeight="700"
                      >
                        {occ} %
                      </text>
                      <title>
                        {`${fmtDay(d.day)} · ${d.soldUnits}/${d.availableUnits} villas · ADR ${n(d.adr)} MAD`}
                      </title>
                    </g>
                  );
                })}
                {/* Prix moyen : ligne superposée, échelle propre à droite */}
                <polyline
                  fill="none"
                  stroke={T.gold}
                  strokeWidth="1.75"
                  points={chart.w
                    .map((d, i) => ({ d, i }))
                    .filter(({ d }) => d.adr != null)
                    .map(({ d, i }) => {
                      const cx = chart.pl + chart.slot * i + chart.slot / 2;
                      const h = chart.H - chart.pt - chart.pb;
                      const y = chart.pt + h * (1 - (d.adr ?? 0) / chart.maxAdr);
                      return `${cx},${y}`;
                    })
                    .join(' ')}
                />
                {chart.w.map((d, i) => {
                  const cx = chart.pl + chart.slot * i + chart.slot / 2;
                  const h = chart.H - chart.pt - chart.pb;
                  const y = chart.pt + h * (1 - (d.adr ?? 0) / chart.maxAdr);
                  if (d.adr == null) return null;
                  // L'étiquette passe sous le point quand celui-ci frôle le
                  // haut du cadre, pour ne pas être coupée.
                  const above = y > chart.pt + 16;
                  return (
                    <g key={d.day}>
                      <circle cx={cx} cy={y} r="3.5" fill={T.gold} />
                      <text
                        x={cx}
                        y={above ? y - 8 : y + 15}
                        textAnchor="middle"
                        fill={T.gold}
                        fontSize="10.5"
                        fontWeight="700"
                      >
                        {NF.format(d.adr)}
                      </text>
                    </g>
                  );
                })}
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
              <Box sx={{ width: 13, height: 8, bgcolor: T.accent, borderRadius: '1px' }} />
              Occupation
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 13, height: 2, bgcolor: T.gold }} />
              Prix moyen en MAD
            </Stack>
          </Stack>
        </Paper>
      </Section>

      {/* Rythme de prise */}
      <Section
        title="Le rythme de prise"
        aside={
          report.pace.length
            ? `Du ${fmtDayShort(report.pace[0].day)} au ${fmtDayShort(
                report.pace[report.pace.length - 1].day,
              )} · ${report.paceTotal} réservations · ${report.paceNights} nuitées`
            : `${report.paceTotal} réservations · ${report.paceNights} nuitées`
        }
      >
        <Paper variant="outlined" sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, p: 2 }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-end', minHeight: 70 }}>
            {report.pace.map((p) => {
              const maxP = Math.max(...report.pace.map((x) => x.reservations), 1);
              const h = Math.round((p.reservations / maxP) * 52) + 4;
              return (
                <Stack key={p.day} sx={{ flex: 1, alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.ink2 }}>
                    {p.reservations}
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: 34,
                      height: h,
                      bgcolor: T.accent,
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                  <Typography sx={{ fontSize: 10, color: T.ink3, whiteSpace: 'nowrap' }}>
                    {fmtDayShort(p.day)}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 1.5, lineHeight: 1.6 }}>
            Réservations <b>enregistrées</b> chaque jour, quelle que soit la date d'arrivée. C'est
            le premier signal d'un carnet qui se remplit ou s'essouffle — il bouge avant
            l'occupation.
          </Typography>
        </Paper>

        {/* Pour quand on a vendu : le rythme dit combien, ceci dit quand. */}
        {report.pickup.length ? (
          <Paper
            variant="outlined"
            sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, mt: 2, overflowX: 'auto' }}
          >
            {(() => {
              const months = [...new Set(report.pickup.map((p) => p.stayMonth))].sort();
              const days = [...new Set(report.pickup.map((p) => p.takenOn))].sort();
              const cell = new Map(
                report.pickup.map((p) => [`${p.takenOn}|${p.stayMonth}`, p]),
              );
              const colTotal = (mo: string) =>
                report.pickup.filter((p) => p.stayMonth === mo).reduce((s, p) => s + p.revenue, 0);
              return (
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12.5,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <thead>
                    <Box component="tr" sx={{ bgcolor: T.sheetAlt }}>
                      <Box
                        component="th"
                        sx={{
                          p: '9px 12px',
                          textAlign: 'left',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: T.ink3,
                          borderBottom: `1px solid ${T.rule}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Pris le
                      </Box>
                      {months.map((mo) => (
                        <Box
                          component="th"
                          key={mo}
                          sx={{
                            p: '9px 12px',
                            textAlign: 'right',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.08em',
                            textTransform: 'uppercase',
                            color: T.ink3,
                            borderBottom: `1px solid ${T.rule}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {fmtMonth(mo)}
                        </Box>
                      ))}
                    </Box>
                  </thead>
                  <tbody>
                    {days.map((d) => (
                      <Box component="tr" key={d} sx={{ '&:hover td': { bgcolor: T.sheetAlt } }}>
                        <Box
                          component="td"
                          sx={{
                            p: '8px 12px',
                            borderBottom: `1px solid ${T.ruleSoft}`,
                            color: T.ink2,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {fmtDay(d)}
                        </Box>
                        {months.map((mo) => {
                          const c = cell.get(`${d}|${mo}`);
                          return (
                            <Box
                              component="td"
                              key={`${d}-${mo}`}
                              sx={{
                                p: '8px 12px',
                                textAlign: 'right',
                                borderBottom: `1px solid ${T.ruleSoft}`,
                                color: c ? T.ink2 : T.ink3,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {c ? (
                                <>
                                  {n(c.revenue)}
                                  <Box component="span" sx={{ color: T.ink3, ml: 0.6, fontSize: 10.5 }}>
                                    {c.reservations}r
                                  </Box>
                                </>
                              ) : (
                                '—'
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    ))}
                    <Box component="tr" sx={{ bgcolor: T.sheetAlt }}>
                      <Box
                        component="td"
                        sx={{ p: '9px 12px', fontWeight: 700, borderTop: `1px solid ${T.rule}` }}
                      >
                        Cumul
                      </Box>
                      {months.map((mo) => (
                        <Box
                          component="td"
                          key={`t-${mo}`}
                          sx={{
                            p: '9px 12px',
                            textAlign: 'right',
                            fontWeight: 700,
                            borderTop: `1px solid ${T.rule}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {n(colTotal(mo))}
                        </Box>
                      ))}
                    </Box>
                  </tbody>
                </Box>
              );
            })()}
          </Paper>
        ) : null}
        <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 1, lineHeight: 1.6 }}>
          Ce qui a été vendu ces sept jours, <b>ventilé par mois de séjour</b>. Le rythme dit
          combien ; ce tableau dit pour quand.
        </Typography>
      </Section>

      {/* Extras du jour */}
      {report.extras.today.length ? (
        <Section
          title="Les extras du jour"
          aside={`Hier : ${n(report.extras.yesterdayTotal)} MAD`}
        >
          <Paper variant="outlined" sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, p: 2 }}>
            <Stack sx={{ gap: 1 }}>
              {report.extras.today.map((e) => (
                <Stack
                  key={e.category}
                  direction="row"
                  sx={{ justifyContent: 'space-between', gap: 1 }}
                >
                  <Typography sx={{ fontSize: 13, color: T.ink2 }}>
                    {e.category}
                    <Box component="span" sx={{ color: T.ink3, ml: 0.75, fontSize: 11 }}>
                      {e.items} art.
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
                    {n(e.gross)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Section>
      ) : null}

      {/* Revenu par mois : réalisé, puis carnet pour le mois à venir */}
      <Section title="Le revenu" aside="Toutes prestations confondues">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: '1px',
            bgcolor: T.rule,
            border: `1px solid ${T.rule}`,
            borderRadius: 0.5,
            overflow: 'hidden',
          }}
        >
          {[
            { k: report.revenuePerformance.previous, l: 'Mois précédent', hi: false },
            { k: report.revenuePerformance.current, l: 'Mois en cours', hi: true },
            { k: report.revenuePerformance.next, l: 'Mois prochain', hi: false },
          ].map((c) => (
            <Box key={c.l} sx={{ bgcolor: T.sheet, p: 2 }}>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: c.hi ? T.gold : T.ink3,
                  mb: 0.75,
                }}
              >
                {c.l} · {fmtMonth(c.k.month)}
              </Typography>
              <Typography sx={{ fontSize: 25, fontWeight: 800, color: T.ink, lineHeight: 1 }}>
                {n(c.k.total)}
              </Typography>
              <Stack direction="row" sx={{ gap: 1, mt: 0.75, alignItems: 'baseline' }}>
                <Typography sx={{ fontSize: 11, color: T.ink3 }}>MAD</Typography>
                {c.k.booked ? (
                  <Typography sx={{ fontSize: 10.5, color: T.gold, fontWeight: 600 }}>
                    carnet à ce jour
                  </Typography>
                ) : null}
                {c.hi && report.revenuePerformance.variationPct != null ? (
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: report.revenuePerformance.variationPct >= 0 ? T.pos : T.neg,
                    }}
                  >
                    {report.revenuePerformance.variationPct >= 0 ? '↗' : '↘'}{' '}
                    {Math.abs(report.revenuePerformance.variationPct)} %
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 1, lineHeight: 1.6 }}>
          Le mois prochain n'a aucune ligne facturée : sa valeur est le <b>carnet à ce jour</b>,
          au prix négocié. Il montera d'ici la fin du mois.
        </Typography>
      </Section>

      {/* Performance mensuelle */}
      <Section title="Mois par mois" aside="Depuis le début de l’exercice">
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
                {['Mois', 'Disponible', 'Vendu', 'Occupation', 'Prix moyen', 'RevPAR', 'Hébergement', 'Cumul nuitées'].map(
                  (h, i) => (
                    <Box
                      component="th"
                      key={h}
                      sx={{
                        p: '10px 14px',
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
              {report.months.map((m, idx) => {
                const cum = report.cumulative[idx]?.cumulative ?? 0;
                const prev = idx > 0 ? report.months[idx - 1] : null;
                const up = prev?.revpar != null && m.revpar != null && m.revpar > prev.revpar;
                return (
                  <Box component="tr" key={m.month} sx={{ '&:hover td': { bgcolor: T.sheetAlt } }}>
                    {[
                      fmtMonth(m.month),
                      n(m.availableUnits),
                      n(m.soldUnits),
                      m.occupancyPct == null ? '—' : `${m.occupancyPct} %`,
                      n(m.adr),
                      n(m.revpar),
                      n(m.roomRevenue),
                      n(cum),
                    ].map((v, i) => (
                      <Box
                        component="td"
                        key={`${m.month}-${String(i)}`}
                        sx={{
                          p: '9px 14px',
                          textAlign: i === 0 ? 'left' : 'right',
                          borderBottom: `1px solid ${T.ruleSoft}`,
                          whiteSpace: 'nowrap',
                          fontWeight: i === 0 ? 600 : 400,
                          color: i === 5 && prev ? (up ? T.pos : T.neg) : T.ink2,
                        }}
                      >
                        {v}
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </tbody>
          </Box>
        </Paper>
        <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 1, lineHeight: 1.6 }}>
          Le RevPAR est coloré par rapport au mois précédent. La comparaison à l'an dernier n'est
          pas disponible : l'historique commence en janvier 2026.
        </Typography>
      </Section>
    </DashboardWrapper>
  );
}
