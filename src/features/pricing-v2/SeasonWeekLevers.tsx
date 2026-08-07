// ════════════════════════════════════════════════════════════════════════════
// LEVIERS SAISONNALITÉ + SEMAINE (mode Expert) — maquette « Vos 5 leviers »
// ────────────────────────────────────────────────────────────────────────────
// • Saisonnalité : 12 barres. La courbe = le MARCHÉ (dérivée d'AirROI). Le PM
//   tire un mois vers le haut/bas ; son ajustement s'ajoute au marché.
//   La ligne pointillée = l'équilibre annuel (moyenne 1) : au-dessus il monte,
//   en dessous il descend, et la moyenne reste 1 → pas de dérive du prix annuel.
// • Semaine : 7 curseurs (défaut Marrakech mesuré à ±4 %, pas ±20 % US).
//
// ⚠️ CONTRAT MOTEUR : `seasonalCoefs` (12, moyenne 1) et `dowMult` (7) sont
// envoyés tels quels. Le moteur RENORMALISE le dow à moyenne 1 (§6.10bis) pour
// que le jour de semaine ne dérive pas la base annuelle — ne duplique pas cette
// normalisation ici, tu la compterais deux fois.
// ════════════════════════════════════════════════════════════════════════════
import { Box, Slider, Stack, Typography } from '@mui/material';
import { T, kickerSx } from './tokens';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTHS_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const DOW = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

export default function SeasonWeekLevers({
  /** 12 coefficients (moyenne 1). Ceux du marché si le PM n'a rien édité. */
  seasonalCoefs,
  /** 7 multiplicateurs, index 0 = dimanche. */
  dowMult,
  onSeasonalChange,
  onDowChange,
  onResetSeasonal,
  onResetDow,
  busy,
}: {
  seasonalCoefs: number[];
  dowMult: number[];
  onSeasonalChange: (next: number[]) => void;
  onDowChange: (next: number[]) => void;
  onResetSeasonal: () => void;
  onResetDow: () => void;
  busy?: boolean;
}) {
  const W = 620;
  const H = 110;
  const maxC = Math.max(...seasonalCoefs, 1.2);
  const minC = Math.min(...seasonalCoefs, 0.8);
  const span = Math.max(0.01, maxC - minC);
  const barW = W / 12 - 6;
  const yOf = (c: number) => H - ((c - minC) / span) * (H - 18) - 6;

  /** Tirer un mois : molette/flèches via un slider caché sous la barre. */
  const setMonth = (i: number, v: number) => {
    const next = [...seasonalCoefs];
    next[i] = v;
    onSeasonalChange(next);
  };

  return (
    <Box>
      {/* ── Saisonnalité ── */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
          Saisonnalité du marché — réglez un mois
        </Typography>
        <Box
          component="button"
          type="button"
          disabled={busy}
          onClick={onResetSeasonal}
          sx={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: T.gold, fontWeight: 700 }}
        >
          revenir au marché
        </Box>
      </Stack>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 110, display: 'block' }}>
        {/* Ligne d'équilibre annuel (coef = 1) */}
        <line
          x1={0}
          y1={yOf(1)}
          x2={W}
          y2={yOf(1)}
          stroke={T.ink2}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {seasonalCoefs.map((c, i) => {
          const x = (i * W) / 12 + 3;
          const y = yOf(c);
          const above = c >= 1;
          return (
            <g key={i}>
              <rect
                x={x}
                y={Math.min(y, yOf(1))}
                width={barW}
                height={Math.abs(yOf(1) - y) || 1.5}
                rx={2}
                fill={above ? T.goldPure : T.line}
                fillOpacity={above ? 0.75 : 1}
              >
                <title>{`${MONTHS_FULL[i]} : ${Math.round((c - 1) * 100) > 0 ? '+' : ''}${Math.round((c - 1) * 100)} % vs votre année`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={H - 1}
                textAnchor="middle"
                style={{ fontSize: 8.5, fontFamily: T.mono, fill: T.mut }}
              >
                {MONTHS[i]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Curseurs par mois — 12 lignes compactes */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75, mt: 1 }}>
        {seasonalCoefs.map((c, i) => (
          <Stack key={i} direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ ...kickerSx, fontSize: 8.5, minWidth: 26 }}>
              {MONTHS_FULL[i].slice(0, 3).toUpperCase()}
            </Typography>
            <Slider
              size="small"
              min={0.7}
              max={1.4}
              step={0.01}
              value={c}
              disabled={busy}
              onChange={(_, v) => setMonth(i, v as number)}
              sx={{ color: c >= 1 ? T.goldPure : T.ink2, py: 0.5 }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 10.5, minWidth: 34, color: T.ink }}>
              {Math.round((c - 1) * 100) > 0 ? '+' : ''}
              {Math.round((c - 1) * 100)} %
            </Typography>
          </Stack>
        ))}
      </Box>

      {/* ── Semaine ── */}
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 2.5, mb: 1 }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
          Semaine — défaut Marrakech ±4 %
        </Typography>
        <Box
          component="button"
          type="button"
          disabled={busy}
          onClick={onResetDow}
          sx={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: T.gold, fontWeight: 700 }}
        >
          revenir au marché
        </Box>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {dowMult.map((m, i) => (
          <Box key={i} sx={{ textAlign: 'center' }}>
            <Typography sx={{ ...kickerSx, fontSize: 8.5 }}>{DOW[i]}</Typography>
            <Slider
              size="small"
              orientation="vertical"
              min={0.8}
              max={1.3}
              step={0.01}
              value={m}
              disabled={busy}
              onChange={(_, v) => {
                const next = [...dowMult];
                next[i] = v as number;
                onDowChange(next);
              }}
              sx={{ height: 64, color: m >= 1 ? T.goldPure : T.ink2, my: 0.5 }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 9.5, color: T.ink }}>
              {Math.round((m - 1) * 100) > 0 ? '+' : ''}
              {Math.round((m - 1) * 100)}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 11.5, color: T.ink2, mt: 1, lineHeight: 1.5 }}>
        La moyenne des 7 jours est ramenée à 1 par le moteur : régler un week-end ne gonfle pas
        votre prix annuel, ça le redistribue.
      </Typography>
    </Box>
  );
}
