// ════════════════════════════════════════════════════════════════════════════
// « TICKET DE CAISSE » — l'explication complète d'un prix, en MAD à chaque étape
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ CORRECTION ACTÉE lors de l'audit de la maquette : la cascade DOIT suivre
// l'ordre RÉEL du moteur, pas une narration :
//     base ANNUELLE (inclut gamme+tendance+FX) × saison × jour × remplissage
//     × override → bornes
// La maquette partait d'un « marché du jour » qui contenait déjà saison et jour,
// puis les réappliquait — double comptage visuel. Ici chaque ligne est un
// multiplicateur du `breakdown` renvoyé par le moteur, dans l'ordre.
// ════════════════════════════════════════════════════════════════════════════
import { Box, Chip, Dialog, DialogContent, Stack, Typography } from '@mui/material';
import type { PricingV2Day } from './api';

import { T, kickerSx } from './tokens';

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function pct(mult: number): string {
  const p = Math.round((mult - 1) * 1000) / 10;
  return `${p > 0 ? '+' : ''}${p} %`;
}

export default function PriceTicket({
  day,
  floor,
  ceil,
  onClose,
}: {
  day: PricingV2Day | null;
  floor: number;
  ceil: number;
  onClose: () => void;
}) {
  if (!day) return null;
  const d = new Date(`${day.date}T12:00:00Z`);
  const b = day.breakdown;

  // Reconstruction pas à pas — les mêmes multiplications que le moteur.
  const afterSeason = b.base * b.seasonal;
  const afterDow = afterSeason * b.dow;
  const afterPacing = afterDow * b.pacing;
  const afterOverride = afterPacing * b.override;

  const rows: Array<{ label: string; sub: string; value: number; delta?: string }> = [
    {
      label: 'Prix de base de votre bien',
      // Dit CE QUI est mesuré, pas seulement les ingrédients : c'est la ligne
      // que le PM lit pour comprendre d'où sort le chiffre. Vocabulaire
      // « marché », jamais « concurrents » (décision produit).
      sub: 'ce que pratique le marché pour un bien comme le vôtre · votre positionnement · tendance',
      value: b.base,
    },
    {
      label: `Saison — ${MONTHS[d.getUTCMonth()]}`,
      sub: 'la demande de ce mois vs votre année',
      value: afterSeason,
      delta: pct(b.seasonal),
    },
    {
      label: `Jour — ${DAYS[d.getUTCDay()]}`,
      sub: 'écart mesuré sur votre marché',
      value: afterDow,
      delta: pct(b.dow),
    },
    {
      label: 'Remplissage',
      sub:
        b.pacing === 1
          ? 'trop loin pour un signal fiable — neutre'
          : b.pacing > 1
            ? 'vos semaines se remplissent : le prix monte'
            : 'peu de réservations autour : le prix respire',
      value: afterPacing,
      delta: pct(b.pacing),
    },
  ];
  if (b.override !== 1) {
    rows.push({
      label: 'Votre ajustement manuel',
      sub: 'règle que vous avez posée sur cette date',
      value: afterOverride,
      delta: pct(b.override),
    });
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        <Typography sx={{ ...kickerSx, fontSize: 10 }}>
          POURQUOI CE PRIX ?
        </Typography>
        <Typography sx={{ fontWeight: 750, fontSize: 18, mb: 2, color: T.ink }}>
          {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
        </Typography>

        <Stack spacing={1.25}>
          {rows.map((r) => (
            <Stack key={r.label} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{r.label}</Typography>
                <Typography sx={{ fontSize: 11, color: T.mut }}>{r.sub}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                {r.delta ? (
                  <Typography sx={{ fontSize: 11, fontFamily: T.mono, color: T.gold }}>{r.delta}</Typography>
                ) : null}
                <Typography sx={{ fontSize: 13.5, fontFamily: T.mono, fontWeight: 750, color: T.ink }}>
                  {Math.round(r.value)} MAD
                </Typography>
              </Box>
            </Stack>
          ))}

          {/* La ligne bornes — absente de la maquette, exigée par le brief */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: `1px dashed ${T.line}` }}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Vos bornes</Typography>
              <Typography sx={{ fontSize: 11, color: T.mut }}>
                {floor} – {ceil} MAD
              </Typography>
            </Box>
            {b.clamped ? (
              <Chip
                size="small"
                color="warning"
                label={b.clamped === 'floor' ? 'Retenu par le plancher' : 'Retenu par le plafond'}
              />
            ) : (
              <Typography sx={{ fontSize: 11.5, color: T.mut }}>non atteintes</Typography>
            )}
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: `2px solid ${T.ink}` }}>
            <Typography sx={{ fontWeight: 750, color: T.ink }}>Prix publié</Typography>
            <Typography sx={{ fontFamily: T.mono, fontWeight: 750, fontSize: 20, color: T.ink }}>
              {day.price} MAD
            </Typography>
          </Stack>

          <Typography sx={{ fontSize: 11.5, color: T.mut, textAlign: 'center', mt: 0.5 }}>
            Marché du jour pour un bien comme le vôtre : <b>{Math.round(day.comp)} MAD</b>
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
