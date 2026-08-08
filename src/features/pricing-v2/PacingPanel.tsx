// ════════════════════════════════════════════════════════════════════════════
// PACING — MÉTHODE (3 états) + 4 CURSEURS (mode Expert)
// ────────────────────────────────────────────────────────────────────────────
// « Le prix respire avec le remplissage » — deux décisions symétriques :
//   • Remplissage ÉLEVÉ  → le prix monte   (vert)  : seuil + hausse max
//   • Remplissage FAIBLE → le prix descend (terracotta) : seuil + baisse max
//   • ENTRE les deux seuils : le prix suit le marché, sans correction.
//
// ⚠️ CONTRAT MOTEUR (décidé avec Tawfiq le 08/08/2026) : `pacingMethod` est un
// choix EXPLICITE à 3 états, plus de bascule silencieuse sur simple présence
// de valeurs :
//   'threshold' (DÉFAUT) → les seuils ci-dessous sont TOUJOURS actifs, même à
//                          leurs valeurs par défaut (85 % / 70 % / ±15 %).
//   'dynamic'             → formule progressive v2.7, seuils ignorés/masqués.
//   'off'                 → aucun ajustement, seuils masqués.
// Avant cette date, la présence de valeurs dans la config décidait seule —
// ça rendait les seuils affichés à l'écran trompeurs (visibles mais pas
// forcément actifs). Voir apps/srv-pricing-v2/src/engine/engine.ts → pacingMult().
// ════════════════════════════════════════════════════════════════════════════
import { Box, Slider, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { T, kickerSx } from './tokens';

export type PacingMethod = 'threshold' | 'dynamic' | 'off';

export type PacingSettings = {
  highThreshold: number; // 0–1
  highMax: number; // 0.15 = +15 %
  lowThreshold: number;
  lowMax: number;
};

/** Défauts affichés tant que le PM n'a rien réglé (= ceux de la maquette). */
export const PACING_DEFAULTS: PacingSettings = {
  highThreshold: 0.85,
  highMax: 0.15,
  lowThreshold: 0.7,
  lowMax: 0.15,
};

const METHOD_OPTIONS: Array<{ key: PacingMethod; label: string; sub: string }> = [
  { key: 'threshold', label: 'Seuils simples', sub: 'vous réglez deux paliers' },
  { key: 'dynamic', label: 'Dynamique', sub: 'formule automatique du marché' },
  { key: 'off', label: 'Désactivé', sub: 'le remplissage ne change rien' },
];

const pctLabel = (v: number) => `${Math.round(v * 100)} %`;

export default function PacingPanel({
  method,
  onMethodChange,
  value,
  onChange,
  /** Occupation réelle par date (fenêtre glissante) pour le graphe 90 j. */
  occupancy,
  busy,
}: {
  method: PacingMethod;
  onMethodChange: (next: PacingMethod) => void;
  value: PacingSettings;
  onChange: (next: PacingSettings) => void;
  occupancy?: Array<{ date: string; occ: number }>;
  busy?: boolean;
}) {
  // Même principe que les leviers saison/semaine : pendant le geste on ne touche
  // qu'un état local (`draft`), sinon chaque pixel déclenche un aller-retour
  // serveur et les curseurs sautent en recevant les réponses en retard.
  const [draft, setDraft] = useState<Partial<PacingSettings> | null>(null);
  const v = { ...value, ...(draft ?? {}) };
  /** Aperçu local, pendant le glissement. */
  const preview = (patch: Partial<PacingSettings>) => setDraft({ ...(draft ?? {}), ...patch });
  /** Relâchement : un seul appel réseau. */
  const commit = (patch: Partial<PacingSettings>) => {
    const next = { ...value, ...(draft ?? {}), ...patch };
    setDraft(null);
    onChange(next);
  };

  // ── Graphe 90 jours : courbe de remplissage + les deux seuils en pointillés,
  //    zones teintées (verte au-dessus du seuil haut, terracotta sous le bas).
  const W = 620;
  const H = 96;
  const pts = (occupancy ?? []).slice(0, 90);
  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W;
  const y = (occ: number) => H - Math.max(0, Math.min(1, occ)) * H;
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.occ).toFixed(1)}`).join(' ');

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
          Pacing — le prix respire avec le remplissage
        </Typography>
        {method === 'threshold' ? (
          <Box
            component="button"
            type="button"
            disabled={busy}
            onClick={() => onChange(PACING_DEFAULTS)}
            sx={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: T.gold, fontWeight: 700 }}
          >
            revenir au marché
          </Box>
        ) : null}
      </Stack>

      {/* ── Méthode : choix explicite, 3 états — plus de bascule silencieuse. ── */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        {METHOD_OPTIONS.map((o) => {
          const isActive = o.key === method;
          return (
            <Box
              key={o.key}
              component="button"
              type="button"
              disabled={busy}
              onClick={() => onMethodChange(o.key)}
              sx={{
                all: 'unset',
                flex: 1,
                cursor: busy ? 'default' : 'pointer',
                textAlign: 'center',
                border: isActive ? `1.5px solid ${T.goldPure}` : `1.5px solid ${T.line}`,
                bgcolor: isActive ? T.goldBg : T.card,
                borderRadius: `${T.radius}px`,
                py: 0.75,
                px: 0.5,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 12, color: T.ink }}>{o.label}</Typography>
              <Typography sx={{ fontSize: 10.5, color: T.mut, mt: 0.1 }}>{o.sub}</Typography>
            </Box>
          );
        })}
      </Stack>

      {method === 'off' ? (
        <Typography sx={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>
          Le prix ne bouge jamais selon votre remplissage. Seuls la saison, le jour de la semaine et
          vos autres réglages s'appliquent.
        </Typography>
      ) : method === 'dynamic' ? (
        <Typography sx={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>
          Le moteur ajuste le prix en continu selon l'écart entre votre remplissage réel et
          l'objectif attendu à cette date — pas de seuils fixes, une courbe automatique.
        </Typography>
      ) : null}

      {/* ── Graphe 90 j — seuils, uniquement pertinent en méthode "Seuils". ── */}
      {method === 'threshold' && pts.length > 1 ? (
        <Box sx={{ mb: 1.5 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 96, display: 'block' }}>
            {/* Zone « prix monte » : au-dessus du seuil haut */}
            <rect x={0} y={0} width={W} height={y(v.highThreshold)} fill={T.ok} fillOpacity={0.07} />
            {/* Zone « prix descend » : sous le seuil bas */}
            <rect
              x={0}
              y={y(v.lowThreshold)}
              width={W}
              height={H - y(v.lowThreshold)}
              fill={T.crit}
              fillOpacity={0.07}
            />
            {/* Seuils */}
            <line x1={0} y1={y(v.highThreshold)} x2={W} y2={y(v.highThreshold)}
              stroke={T.ok} strokeWidth={1} strokeDasharray="4 3" />
            <line x1={0} y1={y(v.lowThreshold)} x2={W} y2={y(v.lowThreshold)}
              stroke={T.crit} strokeWidth={1} strokeDasharray="4 3" />
            {/* Courbe de remplissage projeté */}
            <polyline points={line} fill="none" stroke={T.ink} strokeWidth={1.75} />
          </svg>
          <Typography sx={{ ...kickerSx, fontSize: 8.5, mt: 0.25 }}>
            REMPLISSAGE PROJETÉ · 90 PROCHAINS JOURS
          </Typography>
        </Box>
      ) : null}

      {/* ── Les 2 groupes de curseurs — méthode "Seuils" uniquement ── */}
      {method === 'threshold' ? (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        {/* Groupe HAUT — vert */}
        <Box sx={{ border: `1px solid ${T.line}`, borderRadius: `${T.radius}px`, p: 1.5, bgcolor: T.okBg }}>
          <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: T.ok, mb: 1 }}>
            Remplissage élevé → le prix monte
          </Typography>
          <Typography sx={{ ...kickerSx, fontSize: 9 }}>DÈS</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Slider
              size="small"
              min={0.5}
              max={0.95}
              step={0.05}
              value={v.highThreshold}
              disabled={busy}
              onChange={(_, nv) => preview({ highThreshold: nv as number })}
              onChangeCommitted={(_, nv) => commit({ highThreshold: nv as number })}
              sx={{ color: T.ok }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 750, minWidth: 44, color: T.ink }}>
              {pctLabel(v.highThreshold)}
            </Typography>
          </Stack>
          <Typography sx={{ ...kickerSx, fontSize: 9, mt: 0.5 }}>HAUSSE MAX</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Slider
              size="small"
              min={0}
              max={0.3}
              step={0.01}
              value={v.highMax}
              disabled={busy}
              onChange={(_, nv) => preview({ highMax: nv as number })}
              onChangeCommitted={(_, nv) => commit({ highMax: nv as number })}
              sx={{ color: T.ok }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 750, minWidth: 44, color: T.ink }}>
              +{Math.round(v.highMax * 100)} %
            </Typography>
          </Stack>
        </Box>

        {/* Groupe BAS — terracotta */}
        <Box sx={{ border: `1px solid ${T.line}`, borderRadius: `${T.radius}px`, p: 1.5, bgcolor: T.critBg }}>
          <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: T.crit, mb: 1 }}>
            Remplissage faible → le prix descend
          </Typography>
          <Typography sx={{ ...kickerSx, fontSize: 9 }}>EN DESSOUS DE</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Slider
              size="small"
              min={0.2}
              max={0.9}
              step={0.05}
              value={v.lowThreshold}
              disabled={busy}
              onChange={(_, nv) => preview({ lowThreshold: nv as number })}
              onChangeCommitted={(_, nv) => commit({ lowThreshold: nv as number })}
              sx={{ color: T.crit }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 750, minWidth: 44, color: T.ink }}>
              {pctLabel(v.lowThreshold)}
            </Typography>
          </Stack>
          <Typography sx={{ ...kickerSx, fontSize: 9, mt: 0.5 }}>BAISSE MAX</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Slider
              size="small"
              min={0}
              max={0.3}
              step={0.01}
              value={v.lowMax}
              disabled={busy}
              onChange={(_, nv) => preview({ lowMax: nv as number })}
              onChangeCommitted={(_, nv) => commit({ lowMax: nv as number })}
              sx={{ color: T.crit }}
            />
            <Typography sx={{ fontFamily: T.mono, fontSize: 13, fontWeight: 750, minWidth: 44, color: T.ink }}>
              −{Math.round(v.lowMax * 100)} %
            </Typography>
          </Stack>
        </Box>
      </Box>
      ) : null}

      {method === 'threshold' ? (
        <Typography sx={{ fontSize: 11.5, color: T.ink2, mt: 1.25, lineHeight: 1.5 }}>
          Entre {pctLabel(v.lowThreshold)} et {pctLabel(v.highThreshold)} de remplissage, le
          prix suit le marché sans correction. Vos bornes restent prioritaires.
        </Typography>
      ) : null}
    </Box>
  );
}
