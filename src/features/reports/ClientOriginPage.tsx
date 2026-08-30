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

/**
 * Navigation par mois calendaires, pas par fenêtre glissante.
 *
 * « 30 derniers jours » ne veut rien dire pour un hôtelier : sa saison se
 * lit en mois. Le futur est accessible — les réservations à venir sont
 * connues, même si leur nationalité ne l'est pas encore.
 */
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

function monthRange(offset: number): { from: string; to: string; label: string; future: boolean } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const label = MONTH_FMT.format(start);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: label.charAt(0).toUpperCase() + label.slice(1),
    future: offset > 0,
  };
}

/** Les colonnes triables — chacune raconte une histoire différente. */
const METRICS = [
  { id: 'reservations', label: 'Réservations', unit: 'séjours' },
  { id: 'nights', label: 'Nuits', unit: 'nuits' },
  { id: 'total', label: 'Dépense totale', unit: 'MAD' },
  { id: 'extras', label: 'Hors hébergement', unit: 'MAD' },
] as const;

type MetricId = (typeof METRICS)[number]['id'];

const NF = new Intl.NumberFormat('fr-FR');

export function ClientOriginPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [metric, setMetric] = useState<MetricId>('reservations');
  const [report, setReport] = useState<ClientOriginReport | null>(null);
  const [loading, setLoading] = useState(true);

  const current = useMemo(() => monthRange(monthOffset), [monthOffset]);
  const range = useMemo(
    () => ({ from: current.from, to: current.to }),
    [current.from, current.to],
  );

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

  // Un mois a venir n'a pas encore de pays — les sejours ne sont pas
  // consommes — mais ses canaux existent. On n'affiche « aucune donnee »
  // que si les deux manquent.
  if (!report || (!rows.length && !report.channels.length)) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Origine des clients']}>
        <Paper variant="outlined" sx={{ p: 4, border: `1px solid ${T.border}`, borderRadius: 1.5 }}>
          <Typography sx={{ fontSize: 14, color: T.text2 }}>
            Aucune réservation sur ce mois.
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

      {/* Navigation mensuelle — le futur est accessible */}
      <Stack direction="row" sx={{ gap: 0.75, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip
          label="◀"
          onClick={() => setMonthOffset((o) => o - 1)}
          sx={{ height: 28, fontSize: 12, bgcolor: T.bg2, border: `1px solid ${T.border}` }}
        />
        {[-2, -1, 0, 1, 2].map((delta) => {
          const m = monthRange(monthOffset + delta);
          const isCurrent = delta === 0;
          const short = MONTH_SHORT.format(new Date(`${m.from}T00:00:00Z`));
          return (
            <Chip
              key={m.from}
              label={isCurrent ? m.label : short}
              onClick={() => setMonthOffset((o) => o + delta)}
              sx={{
                height: 28,
                fontSize: 12.5,
                fontWeight: isCurrent ? 700 : 500,
                bgcolor: isCurrent ? `${T.gold}22` : T.bg2,
                color: isCurrent ? T.primaryDeep : m.future ? T.text3 : T.text2,
                border: `1px solid ${isCurrent ? T.gold : T.border}`,
                fontStyle: m.future ? 'italic' : 'normal',
              }}
            />
          );
        })}
        <Chip
          label="▶"
          onClick={() => setMonthOffset((o) => o + 1)}
          sx={{ height: 28, fontSize: 12, bgcolor: T.bg2, border: `1px solid ${T.border}` }}
        />
        {current.future ? (
          <Typography sx={{ fontSize: 11.5, color: T.text3, ml: 1, fontStyle: 'italic' }}>
            Mois à venir — nationalité non encore saisie, l'origine se lit par canal
          </Typography>
        ) : null}
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

      {/* Canal de distribution et concentration — deux lectures que la carte
          ne donne pas : par où arrivent les réservations, et à quel point le
          chiffre dépend de quelques clients. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Paper variant="outlined" sx={{ p: 2.25, border: `1px solid ${T.border}`, borderRadius: 1.75 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text }}>
              Canal de réservation
            </Typography>
            {report.directPct != null ? (
              <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
                {report.directPct} % en direct
              </Typography>
            ) : null}
          </Stack>
          {report.channels.length ? (
            <Stack sx={{ gap: 1 }}>
              {report.channels.map((c) => {
                const maxCh = Math.max(...report.channels.map((x) => x.reservations), 1);
                const w = Math.round((c.reservations / maxCh) * 100);
                return (
                  <Box key={c.channel}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>
                        {c.channel}
                        {c.direct ? (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.75,
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: '.06em',
                              px: 0.6,
                              py: '1px',
                              borderRadius: '2px',
                              bgcolor: `${T.gold}26`,
                              color: T.primaryDeep,
                            }}
                          >
                            DIRECT
                          </Box>
                        ) : null}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>
                        {NF.format(c.reservations)}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 5, bgcolor: T.bg2, borderRadius: 3, mt: 0.4 }}>
                      <Box
                        sx={{
                          width: `${w}%`,
                          height: '100%',
                          borderRadius: 3,
                          bgcolor: c.direct ? T.gold : T.text3,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 12, color: T.text3 }}>
              Aucune réservation sur ce mois.
            </Typography>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.25, border: `1px solid ${T.border}`, borderRadius: 1.75 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text, mb: 1.5 }}>
            Concentration du chiffre d'affaires
          </Typography>
          <Stack sx={{ gap: 1 }}>
            {[
              { l: 'Les 10 % premiers', v: report.concentration.top10Pct },
              { l: 'Les 20 % premiers', v: report.concentration.top20Pct },
              { l: 'Les 50 % premiers', v: report.concentration.top50Pct },
            ].map((r) => (
              <Box key={r.l}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ fontSize: 12.5, color: T.text2 }}>{r.l}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                    {r.v} % du CA
                  </Typography>
                </Stack>
                <Box sx={{ height: 5, bgcolor: T.bg2, borderRadius: 3, mt: 0.4 }}>
                  <Box sx={{ width: `${r.v}%`, height: '100%', bgcolor: T.gold, borderRadius: 3 }} />
                </Box>
              </Box>
            ))}
          </Stack>
          {report.concentration.customers > 0 ? (
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 1.5, lineHeight: 1.6 }}>
              <b>
                {report.concentration.customersFor80Share} % de vos clients font 80 % du chiffre
              </b>{' '}
              ({report.concentration.customersFor80Pct} sur {report.concentration.customers}).
              {report.concentration.customersFor80Share > 35
                ? ' Clientèle homogène : vous ne dépendez pas de quelques gros comptes.'
                : ' Clientèle concentrée : quelques clients pèsent lourd.'}
            </Typography>
          ) : null}
        </Paper>
      </Box>

      {/* Carte + classement — absents tant que les séjours ne sont pas
          consommés : la nationalité n'est saisie qu'à l'enregistrement. */}
      {rows.length ? (
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
      ) : (
        <Paper
          variant="outlined"
          sx={{ p: 2.5, mb: 2.5, border: `1px dashed ${T.border}`, borderRadius: 1.75 }}
        >
          <Typography sx={{ fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
            <b>Pas encore de répartition par pays sur ce mois.</b> La nationalité est saisie à
            l'enregistrement du séjour : pour les arrivées à venir, l'origine se lit au canal de
            réservation ci-dessus.
          </Typography>
        </Paper>
      )}

      {/* Tableau complet */}
      {rows.length ? (
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
      ) : null}
    </DashboardWrapper>
  );
}
