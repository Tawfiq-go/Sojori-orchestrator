// ════════════════════════════════════════════════════════════════════════════
// PAGE D'ATTERRISSAGE — « Prix dynamiques · tous vos biens »
// ────────────────────────────────────────────────────────────────────────────
// Le cockpit avant d'entrer dans un bien : 5 KPI, filtres, une ligne par bien,
// clic = ouvre son pricing. Calquée sur la maquette « Sojori Pricing Home ».
//
// ⚠️ RÈGLES (agent futur) :
// - Les données viennent de /portfolio, servi depuis les résultats shadow DÉJÀ
//   stockés. Ne déclenche JAMAIS un preview par ligne : 49 biens = 49 calculs.
// - Les biens jamais calculés s'affichent quand même (badge « Jamais calculé ») :
//   la page doit montrer le VRAI portefeuille, pas seulement les biens opt-in.
// - Zéro import de features/dynamic-pricing (module greenfield).
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import {
  fetchPricingV2Portfolio,
  type PricingV2Portfolio,
  type PricingV2PortfolioRow,
} from './api';
import { T, cardSx, kickerSx } from './tokens';

const GAMME_LABEL: Record<string, string> = {
  economique: 'Économique',
  normal: 'Normal',
  premium: 'Premium',
  luxe: 'Luxe',
};

/** Badge d'état — le vocabulaire de la maquette, jamais de jargon technique. */
function StatusBadge({ row }: { row: PricingV2PortfolioRow }) {
  const map: Record<string, { label: string; fg: string; bg: string }> = {
    ok: { label: 'OK', fg: T.ok, bg: T.okBg },
    stale: { label: `Calcul en retard (${row.staleHours} h)`, fg: T.crit, bg: T.critBg },
    never_computed: { label: 'Jamais calculé', fg: T.crit, bg: T.critBg },
    paused: { label: 'En pause', fg: T.mut, bg: T.line2 },
  };
  const s = map[row.status] ?? map.paused;
  return (
    <Box
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.35,
        borderRadius: 1,
        fontSize: 11,
        fontWeight: 700,
        color: s.fg,
        bgcolor: s.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </Box>
  );
}

/** Courbe miniature des 30 prochains jours (SVG pur, pas de dépendance). */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <Box sx={{ width: 140, height: 22, borderBottom: `1px solid ${T.line}`, opacity: 0.5 }} />
    );
  }
  const W = 140;
  const H = 22;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(1, hi - lo);
  const pts = values
    .map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - ((v - lo) / span) * H).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={T.goldPure} strokeWidth={1.5} />
    </svg>
  );
}

/** Jauge de remplissage — rouge sous 40 %, or ensuite, vert au-dessus de 80 %. */
function OccBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? T.ok : pct < 40 ? T.crit : T.goldPure;
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 64, height: 5, bgcolor: T.line2, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color }} />
      </Box>
      <Typography
        sx={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap' }}
      >
        {pct}&nbsp;%
      </Typography>
    </Stack>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${Math.round(h)} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export default function PricingV2Portfolio({
  /** Données pré-chargées — sert aux tests de rendu hors réseau. */
  initialData,
}: { initialData?: PricingV2Portfolio } = {}) {
  const navigate = useNavigate();
  const [data, setData] = useState<PricingV2Portfolio | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'on' | 'paused' | 'alerts'>('all');

  useEffect(() => {
    if (initialData) return; // données déjà fournies : pas d'appel réseau
    let alive = true;
    void (async () => {
      try {
        const r = await fetchPricingV2Portfolio();
        if (!alive) return;
        if (!r.data.success) throw new Error(r.data.error || 'portefeuille indisponible');
        setData(r.data);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [initialData]);

  // ⚠️ Les villes en base contiennent du bruit réel : « N/A », et « Marrakesh »
  // en doublon de « Marrakech ». On nettoie à l'affichage sans toucher la donnée.
  const cities = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of data?.rows ?? []) {
      const raw = (r.city ?? '').trim();
      if (!raw || raw === '—' || /^n\/?a$/i.test(raw)) continue;
      const key = raw.toLowerCase().replace('marrakesh', 'marrakech');
      if (!seen.has(key)) seen.set(key, raw);
    }
    return [...seen.values()].sort();
  }, [data]);

  const rows = useMemo(() => {
    let out = data?.rows ?? [];
    const norm = (c: string) => (c ?? '').trim().toLowerCase().replace('marrakesh', 'marrakech');
    if (city) out = out.filter((r) => norm(r.city) === norm(city));
    if (tab === 'on') out = out.filter((r) => r.dynamicEnabled);
    if (tab === 'paused') out = out.filter((r) => !r.dynamicEnabled);
    if (tab === 'alerts')
      out = out.filter((r) => r.status === 'stale' || r.status === 'never_computed');
    const needle = q.trim().toLowerCase();
    if (needle) {
      out = out.filter((r) =>
        `${r.name} ${r.city} ${r.district ?? ''}`.toLowerCase().includes(needle),
      );
    }
    return out;
  }, [data, city, tab, q]);

  if (loading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', bgcolor: T.bg, minHeight: '100%' }}>
        <CircularProgress size={28} sx={{ color: T.goldPure }} />
      </Box>
    );
  }
  if (error || !data) {
    return (
      <Box sx={{ p: 4, maxWidth: 720, mx: 'auto', bgcolor: T.bg, minHeight: '100%' }}>
        <Alert severity="warning">Portefeuille indisponible : {error ?? 'aucune donnée'}</Alert>
      </Box>
    );
  }

  const k = data.kpis;
  const KPIS = [
    { v: String(k.listings), label: 'Biens', sub: `${k.cities} ville${k.cities > 1 ? 's' : ''}`, color: T.ink },
    { v: String(k.dynamicEnabled), label: 'Prix dynamiques activés', sub: `${k.listings - k.dynamicEnabled} en pause`, color: T.ok },
    { v: String(k.alerts), label: 'Alertes', sub: 'à traiter', color: T.crit },
    { v: k.avgTonightMad != null ? String(k.avgTonightMad) : '—', label: 'Prix moyen ce soir (MAD)', sub: 'biens activés', color: T.gold },
    { v: k.avgOccupancy30 != null ? `${k.avgOccupancy30} %` : '—', label: 'Remplissage 30 j', sub: 'moyenne portefeuille', color: T.ink },
  ];

  const chipSx = (on: boolean) => ({
    all: 'unset' as const,
    cursor: 'pointer',
    px: 1.75,
    py: 0.75,
    borderRadius: `${T.radius}px`,
    fontSize: 13,
    fontWeight: 700,
    color: on ? T.card : T.ink2,
    bgcolor: on ? T.ink : T.card,
    border: `1px solid ${on ? T.ink : T.line}`,
    whiteSpace: 'nowrap' as const,
  });

  return (
    <Box sx={{ bgcolor: T.bg, color: T.ink, fontFamily: T.sans, minHeight: '100%', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
        {/* En-tête */}
        <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 750, fontSize: 20, color: T.ink }}>
            Prix dynamiques
            <Box component="span" sx={{ ml: 1, ...kickerSx, color: T.gold }}>v2 · bêta</Box>
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.mut }}>
            {data.scope
              ? '· vos biens — cliquez une ligne pour ouvrir son pricing'
              : '· cliquez une ligne pour ouvrir son pricing'}
          </Typography>
          {/* Vue admin = parc de TOUS les propriétaires. On l'affiche : sans ça,
              on présenterait les biens d'autrui comme « vos biens ». */}
          {!data.scope && (
            <Box
              component="span"
              sx={{
                ...kickerSx,
                color: T.manual,
                border: `${T.borderW}px solid ${T.manual}`,
                borderRadius: `${T.radius}px`,
                px: 1,
                py: 0.25,
              }}
            >
              vue admin · tous propriétaires
            </Box>
          )}
        </Stack>

        {/* KPI */}
        <Box
          sx={{
            ...cardSx,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
            gap: 0,
            p: 0,
            mb: 2,
            overflow: 'hidden',
          }}
        >
          {KPIS.map((kpi, i) => (
            <Box
              key={kpi.label}
              sx={{
                p: 2,
                borderLeft: i === 0 ? 'none' : { md: `1px solid ${T.line}` },
                borderTop: { xs: i > 1 ? `1px solid ${T.line}` : 'none', md: 'none' },
              }}
            >
              <Typography sx={{ fontSize: 28, fontWeight: 750, lineHeight: 1.1, color: kpi.color }}>
                {kpi.v}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.ink, mt: 0.25 }}>
                {kpi.label}
              </Typography>
              <Typography sx={{ fontSize: 11, color: T.mut }}>{kpi.sub}</Typography>
            </Box>
          ))}
        </Box>

        {/* Filtres */}
        <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Bien, quartier…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{
              width: 240,
              '& .MuiOutlinedInput-root': { bgcolor: T.card, borderRadius: `${T.radius}px` },
            }}
          />
          <Box component="button" type="button" onClick={() => setCity(null)} sx={chipSx(city === null)}>
            Toutes les villes
          </Box>
          {cities.map((c) => (
            <Box key={c} component="button" type="button" onClick={() => setCity(c)} sx={chipSx(city === c)}>
              {c}
            </Box>
          ))}
          <Box sx={{ width: 12 }} />
          {([
            { id: 'all', label: 'Tous' },
            { id: 'on', label: 'Activés' },
            { id: 'paused', label: 'En pause' },
            { id: 'alerts', label: 'Alertes' },
          ] as const).map((t) => (
            <Box key={t.id} component="button" type="button" onClick={() => setTab(t.id)} sx={chipSx(tab === t.id)}>
              {t.label}
            </Box>
          ))}
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ ...kickerSx }}>
            {rows.length} / {data.rows.length} BIENS
          </Typography>
        </Stack>

        {/* Tableau */}
        <Box sx={{ ...cardSx, p: 0, overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box
                component="tr"
                sx={{
                  '& th': {
                    textAlign: 'left',
                    ...kickerSx,
                    p: 1.5,
                    borderBottom: `1px solid ${T.line}`,
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                <th>BIEN</th>
                <th>DYNAMIQUE</th>
                <th>CE SOIR</th>
                <th>30 PROCHAINS JOURS</th>
                <th>FOURCHETTE</th>
                <th>POSITIONNEMENT</th>
                <th>REMPLISSAGE</th>
                <th>DERNIER CALCUL</th>
                <th>ÉTAT</th>
              </Box>
            </Box>
            <Box component="tbody">
              {rows.map((r) => (
                <Box
                  component="tr"
                  key={r.listingId}
                  onClick={() => navigate(`/pricing-v2/bien/${r.listingId}`)}
                  sx={{
                    cursor: 'pointer',
                    '& td': { p: 1.5, borderBottom: `1px solid ${T.line2}`, verticalAlign: 'middle' },
                    '&:hover': { bgcolor: T.goldBg },
                  }}
                >
                  <td>
                    <Typography
                      title={r.name}
                      sx={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: T.ink,
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: T.mut }}>
                      {[r.district, r.city, r.propertyType, r.bedrooms ? `${r.bedrooms} ch` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  </td>
                  <td>
                    {/* Indicateur seulement : l'activation se fait sur la fiche du bien. */}
                    <Box
                      sx={{
                        width: 34,
                        height: 19,
                        borderRadius: 999,
                        bgcolor: r.dynamicEnabled ? T.ok : T.line,
                        position: 'relative',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 2,
                          left: r.dynamicEnabled ? 17 : 2,
                          width: 15,
                          height: 15,
                          borderRadius: '50%',
                          bgcolor: T.card,
                        }}
                      />
                    </Box>
                  </td>
                  <td>
                    {r.tonightMad != null ? (
                      <Typography sx={{ fontFamily: T.mono, fontSize: 15, fontWeight: 750, color: T.ink }}>
                        {r.tonightMad}
                        <Box component="span" sx={{ fontSize: 10.5, color: T.mut, ml: 0.5 }}>MAD</Box>
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: 13, color: T.mut }}>—</Typography>
                    )}
                  </td>
                  <td><Spark values={r.spark} /></td>
                  <td>
                    <Typography sx={{ fontFamily: T.mono, fontSize: 12.5, color: T.ink2 }}>
                      {r.floor != null && r.ceil != null ? `${r.floor} – ${r.ceil}` : '—'}
                    </Typography>
                  </td>
                  <td>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.35,
                        borderRadius: 1,
                        fontSize: 11.5,
                        fontWeight: 700,
                        bgcolor: T.goldBg,
                        color: T.gold,
                      }}
                    >
                      {GAMME_LABEL[r.gamme] ?? r.gamme}
                    </Box>
                  </td>
                  <td><OccBar value={r.occupancy30 ?? 0} /></td>
                  <td>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: r.status === 'stale' ? T.crit : T.mut,
                        fontWeight: r.status === 'stale' ? 700 : 400,
                      }}
                    >
                      {timeAgo(r.lastComputedAt)}
                    </Typography>
                  </td>
                  <td><StatusBadge row={r} /></td>
                </Box>
              ))}
            </Box>
          </Box>
          {rows.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center', color: T.mut, fontSize: 13 }}>
              Aucun bien ne correspond à ce filtre.
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
