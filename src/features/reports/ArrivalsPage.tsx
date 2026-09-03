import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { fetchArrivalsReport, type ArrivalsReport, type MovementEntry } from '../../services/revenueApi';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';

/**
 * Arrivées et départs — la liste que la réception prépare le matin.
 *
 * Les rapports d'occupation donnent des volumes ; celui-ci donne des noms et
 * ce qui reste à faire. Les deux alertes — fiche de police non signée,
 * séjour non soldé — sont remontées en tête de journée pour être traitées
 * avant l'arrivée du voyageur.
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
  warn: '#9a6a24',
  neg: '#9a3b2c',
};

const NF = new Intl.NumberFormat('fr-FR');
const DAY_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const fmtDay = (iso: string) => {
  const s = DAY_FMT.format(new Date(`${iso}T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Une ligne voyageur, avec ses alertes. */
function Entry({ e }: { e: MovementEntry }) {
  const alerts: string[] = [];
  if (e.kind === 'arrival' && !e.registrationDone) alerts.push('Fiche de police à signer');
  if (!e.paid) alerts.push('Séjour non soldé');

  return (
    <Box
      sx={{
        p: '11px 14px',
        borderBottom: `1px solid ${T.ruleSoft}`,
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: T.ink }} noWrap>
            {e.guestName}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 0.15 }}>
            {e.unit ?? 'Villa non assignée'} · {e.channel} · {e.guests} pers.
            {e.nights > 0 ? ` · ${e.nights} n.` : ''}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          {e.time ? (
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.ink2 }}>
              {e.time}
            </Typography>
          ) : null}
          {e.amount > 0 ? (
            <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>
              {NF.format(e.amount)} MAD
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {alerts.length ? (
        <Stack direction="row" sx={{ gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
          {alerts.map((a) => (
            <Box
              key={a}
              sx={{
                fontSize: 10.5,
                fontWeight: 600,
                px: 0.85,
                py: '2px',
                borderRadius: '2px',
                bgcolor: `${T.warn}1a`,
                color: T.warn,
              }}
            >
              {a}
            </Box>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}

export function ArrivalsPage() {
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [report, setReport] = useState<ArrivalsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(3);
  const [offset, setOffset] = useState(0);

  const asOf = useMemo(
    () => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10),
    [offset],
  );

  useEffect(() => {
    if (!ownerId) {
      setReport(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchArrivalsReport({ ownerId, asOf, days })
      .then((d) => {
        if (!cancelled) setReport(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, asOf, days]);

  if (needsOwnerPick) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Arrivées et départs']}>
        <Alert severity="info">Choisissez un gestionnaire dans le filtre en haut de page.</Alert>
      </DashboardWrapper>
    );
  }

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Arrivées et départs']}>
        <Stack sx={{ alignItems: 'center', py: 10 }}>
          <CircularProgress size={26} sx={{ color: T.gold }} />
        </Stack>
      </DashboardWrapper>
    );
  }

  if (!report || !report.days.length) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Arrivées et départs']}>
        <Paper variant="outlined" sx={{ p: 4, border: `1px solid ${T.rule}`, borderRadius: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: T.ink2 }}>
            Aucun mouvement sur la période.
          </Typography>
        </Paper>
      </DashboardWrapper>
    );
  }

  const { totals } = report;
  const hasWork = totals.pendingRegistration > 0 || totals.unpaid > 0;

  return (
    <DashboardWrapper breadcrumb={['Rapports', 'Arrivées et départs']}>
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
            Arrivées et départs
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.ink3, mt: 0.4 }}>
            À partir du {fmtDay(report.asOf).toLowerCase()}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
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
          <Box sx={{ width: 10 }} />
          {[3, 7, 14].map((d) => (
            <Chip
              key={d}
              label={`${d} j`}
              onClick={() => setDays(d)}
              sx={{
                height: 28,
                fontSize: 12.5,
                fontWeight: days === d ? 700 : 500,
                bgcolor: days === d ? `${T.goldSoft}22` : T.sheetAlt,
                color: days === d ? T.gold : T.ink2,
                border: `1px solid ${days === d ? T.goldSoft : T.rule}`,
              }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Ce qui reste à faire, avant tout le reste */}
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
          { l: 'Arrivées', v: totals.arrivals, alert: false },
          { l: 'Départs', v: totals.departures, alert: false },
          { l: 'Fiches à signer', v: totals.pendingRegistration, alert: totals.pendingRegistration > 0 },
          { l: 'Séjours non soldés', v: totals.unpaid, alert: totals.unpaid > 0 },
        ].map((k) => (
          <Box key={k.l} sx={{ bgcolor: T.sheet, p: 2 }}>
            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: k.alert ? T.warn : T.ink3,
                mb: 0.75,
              }}
            >
              {k.l}
            </Typography>
            <Typography
              sx={{
                fontSize: 26,
                fontWeight: 800,
                color: k.alert ? T.warn : T.ink,
                lineHeight: 1,
              }}
            >
              {k.v}
            </Typography>
          </Box>
        ))}
      </Box>

      {!hasWork ? (
        <Typography sx={{ fontSize: 12.5, color: T.ink3, mb: 2.5, fontStyle: 'italic' }}>
          Aucun dossier en attente sur la période.
        </Typography>
      ) : null}

      {/* Jour par jour */}
      <Stack sx={{ gap: 2.5 }}>
        {report.days.map((d) => {
          const empty = !d.arrivals.length && !d.departures.length;
          return (
            <Box key={d.day}>
              <Stack
                direction="row"
                sx={{
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  mb: 1,
                  pb: 0.5,
                  borderBottom: `1px solid ${T.rule}`,
                }}
              >
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.ink }}>
                  {fmtDay(d.day)}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>
                  {d.arrivals.length} arrivée{d.arrivals.length > 1 ? 's' : ''} ·{' '}
                  {d.departures.length} départ{d.departures.length > 1 ? 's' : ''}
                  {d.guestsIn > 0 ? ` · ${d.guestsIn} pers. attendues` : ''}
                </Typography>
              </Stack>

              {empty ? (
                <Typography sx={{ fontSize: 12.5, color: T.ink3, pl: 0.5 }}>
                  Aucun mouvement.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, overflow: 'hidden' }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '.09em',
                        textTransform: 'uppercase',
                        color: T.ink3,
                        p: '9px 14px',
                        bgcolor: T.sheetAlt,
                        borderBottom: `1px solid ${T.rule}`,
                      }}
                    >
                      Arrivées
                    </Typography>
                    {d.arrivals.length ? (
                      d.arrivals.map((e) => <Entry key={`a-${e.guestName}-${e.unit ?? ''}`} e={e} />)
                    ) : (
                      <Typography sx={{ fontSize: 12.5, color: T.ink3, p: '11px 14px' }}>
                        Aucune arrivée.
                      </Typography>
                    )}
                  </Paper>

                  <Paper
                    variant="outlined"
                    sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, overflow: 'hidden' }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '.09em',
                        textTransform: 'uppercase',
                        color: T.ink3,
                        p: '9px 14px',
                        bgcolor: T.sheetAlt,
                        borderBottom: `1px solid ${T.rule}`,
                      }}
                    >
                      Départs
                    </Typography>
                    {d.departures.length ? (
                      d.departures.map((e) => <Entry key={`d-${e.guestName}-${e.unit ?? ''}`} e={e} />)
                    ) : (
                      <Typography sx={{ fontSize: 12.5, color: T.ink3, p: '11px 14px' }}>
                        Aucun départ.
                      </Typography>
                    )}
                  </Paper>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </DashboardWrapper>
  );
}
