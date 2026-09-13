// ════════════════════════════════════════════════════════════════════════════
// MARKETING INTELLIGENCE — dépense publicitaire face au business réel
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ RÈGLE DE LANGAGE (agent futur) : tant que le niveau d'attribution est 0,
// cette page dit « signal observé », jamais « la campagne a généré ». Le lien
// entre un clic et une réservation n'existe pas encore — pas d'UTM, et la
// majorité des réservations arrive par une OTA où la publicité est invisible.
// Le bandeau qui l'explique n'est pas décoratif : il empêche de lire un ratio
// comme un retour sur investissement.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StableChart } from '../../components/dashboard/DashboardV2.components';
import {
  fetchMarketingConnections,
  fetchMarketingOverview,
  type MarketingConnection,
  type MarketingOverview,
} from './api';
import { T, cardSx, kickerSx } from './tokens';

const FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  GB: '🇬🇧',
  MA: '🇲🇦',
  US: '🇺🇸',
  ES: '🇪🇸',
  DE: '🇩🇪',
  BE: '🇧🇪',
  NL: '🇳🇱',
};

const COUNTRY_LABEL: Record<string, string> = {
  FR: 'France',
  GB: 'Royaume-Uni',
  MA: 'Maroc',
  US: 'États-Unis',
  ES: 'Espagne',
  DE: 'Allemagne',
  BE: 'Belgique',
  NL: 'Pays-Bas',
};

function fmt(n: number | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Bandeau permanent : ce que les chiffres disent, et ce qu'ils ne disent pas. */
function AttributionNotice({ level }: { level: number }) {
  if (level >= 1) return null;
  return (
    <Box
      sx={{
        ...cardSx,
        borderLeft: `3px solid ${T.warn}`,
        bgcolor: T.warnBg,
        mb: 2.5,
        p: 2,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: T.ink, mb: 0.5 }}>
        Signal observé, pas attribution démontrée
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6 }}>
        Les réservations affichées sont celles créées pendant la période — rien ne prouve
        qu'elles viennent de la publicité. Les campagnes n'ont pas de lien de suivi, et la
        majorité des réservations arrive par une plateforme externe où la publicité est
        invisible. Ces chiffres se lisent comme une coïncidence mesurée.
      </Typography>
    </Box>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Box sx={{ ...cardSx, p: 2 }}>
      <Typography sx={kickerSx}>{label}</Typography>
      <Typography
        sx={{
          fontSize: 26,
          fontWeight: 650,
          letterSpacing: '-0.02em',
          color: accent ?? T.ink,
          fontFamily: T.mono,
          mt: 0.5,
        }}
      >
        {value}
      </Typography>
      {sub && <Typography sx={{ fontSize: 12, color: T.mut, mt: 0.25 }}>{sub}</Typography>}
    </Box>
  );
}

function Panel({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ ...cardSx, mb: 2.5 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 650, color: T.ink }}>{title}</Typography>
      {desc && (
        <Typography sx={{ fontSize: 12.5, color: T.mut, mt: 0.25, mb: 1.5 }}>{desc}</Typography>
      )}
      {children}
    </Box>
  );
}

export default function MarketingDashboard() {
  const [connections, setConnections] = useState<MarketingConnection[] | null>(null);
  const [overview, setOverview] = useState<MarketingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 29 * 86_400_000);
    return { from: ymd(from), to: ymd(to) };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const conns = await fetchMarketingConnections();
        if (!alive) return;
        setConnections(conns);

        const active = conns.find((c) => c.status === 'active');
        if (!active) {
          setLoading(false);
          return;
        }
        const data = await fetchMarketingOverview({
          tenantId: active.tenantId,
          from: range.from,
          to: range.to,
        });
        if (!alive) return;
        setOverview(data);
      } catch (err) {
        if (!alive) return;
        // Le service n'est pas encore branché derrière srv-admin : on le dit,
        // plutôt que d'afficher des chiffres inventés.
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [range.from, range.to]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: T.gold }} />
      </Box>
    );
  }

  const noConnection = !connections || connections.length === 0;

  return (
    <Box sx={{ bgcolor: T.bg, minHeight: '100%', p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={kickerSx}>Acquisition</Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 680, letterSpacing: '-0.02em', color: T.ink }}>
          Marketing Intelligence
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: T.mut, mt: 0.5 }}>
          Dépense publicitaire face aux réservations réelles · {range.from} → {range.to}
        </Typography>
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          Les données ne sont pas encore disponibles : le service de collecte n'est pas branché
          derrière l'API d'administration. ({error})
        </Alert>
      )}

      {noConnection && !error && (
        <Box sx={{ ...cardSx, textAlign: 'center', py: 5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 650, color: T.ink, mb: 1 }}>
            Aucun compte publicitaire connecté
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: T.ink2, maxWidth: 520, mx: 'auto', lineHeight: 1.6 }}>
            Un compte devient suivi une fois que son propriétaire a accordé un accès en lecture
            et que la connexion a été enregistrée. Un partage seul ne déclenche aucune collecte —
            c'est volontaire : un accès accordé par erreur ne doit rien lire.
          </Typography>
        </Box>
      )}

      {overview && (
        <>
          <AttributionNotice level={overview.attributionLevel} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
              gap: 1.75,
              mb: 2.5,
            }}
          >
            <Kpi label="Dépense" value={`${fmt(overview.totals.spendMad)} MAD`} />
            <Kpi label="Clics" value={fmt(overview.totals.clicks)} />
            <Kpi label="Impressions" value={fmt(overview.totals.impressions)} />
            <Kpi
              label="Réservations"
              value={fmt(overview.totals.reservations)}
              sub="créées sur la période"
            />
            <Kpi
              label="Chiffre d'affaires"
              value={`${fmt(overview.totals.revenueMad)} MAD`}
              accent={T.ok}
            />
          </Box>

          {(overview.totals.directReservations != null ||
            overview.totals.otaReservations != null) && (
            <Panel
              title="Canal de réservation"
              desc="La publicité influence le direct de façon mesurable ; sur les plateformes externes, elle reste invisible."
            >
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1, p: 1.5, bgcolor: T.directBg, borderRadius: '8px' }}>
                  <Typography sx={{ ...kickerSx, color: T.direct }}>Direct</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 650, color: T.direct, fontFamily: T.mono }}>
                    {fmt(overview.totals.directReservations)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, p: 1.5, bgcolor: T.otaBg, borderRadius: '8px' }}>
                  <Typography sx={{ ...kickerSx, color: T.ota }}>Plateformes externes</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 650, color: T.ota, fontFamily: T.mono }}>
                    {fmt(overview.totals.otaReservations)}
                  </Typography>
                </Box>
              </Stack>
            </Panel>
          )}

          <Panel
            title="Jour par jour"
            desc="Dépense et réservations sur la même échelle de temps — deux courbes, aucune causalité affirmée."
          >
            <StableChart height={300}>
              {({ width, height }: { width: number; height: number }) => (
                <LineChart
                  width={width}
                  height={height}
                  data={overview.daily}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <CartesianGrid stroke={T.line2} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: T.mut }}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: T.mut }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: T.mut }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="spendMad"
                    name="Dépense (MAD)"
                    stroke={T.gold}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="reservations"
                    name="Réservations"
                    stroke={T.ok}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
            </StableChart>
          </Panel>

          {overview.byCountry && overview.byCountry.length > 0 && (
            <Panel
              title="Par pays"
              desc="Chaque campagne ne diffuse que dans son pays : la comparaison à budget égal est le signal le plus exploitable."
            >
              <StableChart height={260}>
                {({ width, height }: { width: number; height: number }) => (
                  <BarChart
                    width={width}
                    height={height}
                    data={overview.byCountry}
                    margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid stroke={T.line2} vertical={false} />
                    <XAxis
                      dataKey="country"
                      tick={{ fontSize: 11, fill: T.mut }}
                      tickFormatter={(c: string) => `${FLAGS[c] ?? ''} ${c}`}
                    />
                    <YAxis tick={{ fontSize: 11, fill: T.mut }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="spendMad" name="Dépense (MAD)" fill={T.goldSoft} />
                    <Bar dataKey="reservations" name="Réservations" fill={T.ok} />
                  </BarChart>
                )}
              </StableChart>

              <Box sx={{ mt: 2, overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <Box component="thead">
                    <Box component="tr">
                      {['Pays', 'Dépense', 'Clics', 'CTR', 'Réservations'].map((h, i) => (
                        <Box
                          key={h}
                          component="th"
                          sx={{
                            ...kickerSx,
                            textAlign: i === 0 ? 'left' : 'right',
                            p: '8px 10px',
                            borderBottom: `1.5px solid ${T.line}`,
                          }}
                        >
                          {h}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {overview.byCountry.map((r) => (
                      <Box component="tr" key={r.country}>
                        <Box component="td" sx={{ p: '9px 10px', borderBottom: `1px solid ${T.line2}` }}>
                          {FLAGS[r.country] ?? ''} {COUNTRY_LABEL[r.country] ?? r.country}
                        </Box>
                        {[
                          `${fmt(r.spendMad)} MAD`,
                          fmt(r.clicks),
                          r.ctr != null ? `${r.ctr.toFixed(2)} %` : '—',
                          fmt(r.reservations),
                        ].map((v, i) => (
                          <Box
                            key={i}
                            component="td"
                            sx={{
                              p: '9px 10px',
                              textAlign: 'right',
                              fontFamily: T.mono,
                              borderBottom: `1px solid ${T.line2}`,
                            }}
                          >
                            {v}
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Panel>
          )}

          <Panel title="Campagnes" desc="Sur la période sélectionnée.">
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <Box component="thead">
                  <Box component="tr">
                    {['Campagne', 'Dépense', 'Clics', 'CTR', 'CPC', 'Répétition'].map((h, i) => (
                      <Box
                        key={h}
                        component="th"
                        sx={{
                          ...kickerSx,
                          textAlign: i === 0 ? 'left' : 'right',
                          p: '8px 10px',
                          borderBottom: `1.5px solid ${T.line}`,
                        }}
                      >
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {overview.campaigns.map((c) => (
                    <Box component="tr" key={`${c.campaignId}-${c.country ?? ''}`}>
                      <Box
                        component="td"
                        sx={{ p: '9px 10px', borderBottom: `1px solid ${T.line2}`, maxWidth: 320 }}
                      >
                        {c.campaignName}
                      </Box>
                      {[
                        `${fmt(c.spendMad)} MAD`,
                        fmt(c.clicks),
                        c.ctr != null ? `${c.ctr.toFixed(2)} %` : '—',
                        c.cpc != null ? c.cpc.toFixed(3) : '—',
                        // Au-delà de 3,5 expositions, la même audience revoit les
                        // mêmes visuels : usure créative.
                        c.frequency != null ? c.frequency.toFixed(1) : '—',
                      ].map((v, i) => (
                        <Box
                          key={i}
                          component="td"
                          sx={{
                            p: '9px 10px',
                            textAlign: 'right',
                            fontFamily: T.mono,
                            borderBottom: `1px solid ${T.line2}`,
                            color: i === 4 && c.frequency != null && c.frequency > 3.5 ? T.crit : T.ink,
                          }}
                        >
                          {v}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Panel>
        </>
      )}
    </Box>
  );
}
