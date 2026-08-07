// ════════════════════════════════════════════════════════════════════════════
// COMPSET OUVERT (mode Expert) — « quels biens composent mon marché, et pourquoi eux »
// ⚠️ VOCABULAIRE : on dit « marché », JAMAIS « concurrents ». Le PM raisonne en
// marché ; « concurrent » suggère qu'on épie des voisins nommément. Décision
// produit — ne pas réintroduire le mot.
// ────────────────────────────────────────────────────────────────────────────
// Exigence du brief §4.2, absente de la maquette : le PM doit voir les biens
// réels qui font son prix, et l'écart d'équipement (« eux ont un jacuzzi »).
//
// Colonnes : ADR réel · ADR ajusté à VOTRE qualité · similarité · avantages.
// L'ajusté est la valeur qui entre dans le calcul — c'est elle qui explique
// pourquoi un comp cher mais mal noté ne tire pas le prix vers le haut.
// ════════════════════════════════════════════════════════════════════════════
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { PricingV2Comp } from './api';

import { T, cardSx, kickerSx } from './tokens';

const AMENITY_FR: Record<string, string> = {
  hot_tub: 'jacuzzi',
  pool: 'piscine',
  patio: 'terrasse/balcon',
};

export default function CompsTable({ comps }: { comps: PricingV2Comp[] }) {
  return (
    <Box sx={cardSx}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink }}>Votre marché</Typography>
        <Typography sx={{ fontSize: 11.5, color: T.mut }}>
          triés par ressemblance avec votre bien
        </Typography>
      </Stack>

      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', minWidth: 620, borderCollapse: 'collapse' }}>
          <Box component="thead">
            <Box component="tr" sx={{ '& th': { textAlign: 'left', ...kickerSx, pb: 1, borderBottom: `1px solid ${T.line}` } }}>
              <th>RESSEMBLANCE</th>
              <th>QUARTIER</th>
              <th>NOTE</th>
              <th style={{ textAlign: 'right' }}>IL ENCAISSE</th>
              <th style={{ textAlign: 'right' }}>À VOTRE NIVEAU</th>
              <th>ÉQUIPEMENT</th>
            </Box>
          </Box>
          <Box component="tbody">
            {comps.map((c) => (
              <Box
                component="tr"
                key={c.listingId}
                sx={{ '& td': { py: 1, fontSize: 12.5, borderBottom: `1px solid ${T.line2}`, verticalAlign: 'top' } }}
              >
                <td>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 42, height: 5, bgcolor: T.line2, borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ width: `${Math.round(c.similarity * 100)}%`, height: '100%', bgcolor: T.gold }} />
                    </Box>
                    <Typography sx={{ fontSize: 10.5, fontFamily: T.mono, color: T.ink2 }}>
                      {Math.round(c.similarity * 100)}
                    </Typography>
                  </Box>
                </td>
                <td>
                  <Typography sx={{ fontSize: 12, color: T.ink }}>{c.locality || '—'}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: T.mut }}>
                    {c.bedrooms} ch · {c.guests} pers
                    {c.minNights ? ` · min ${c.minNights} nuit${c.minNights > 1 ? 's' : ''}` : ''}
                  </Typography>
                </td>
                <td>
                  <Typography sx={{ fontSize: 12, fontFamily: T.mono, color: T.ink }}>{c.rating ?? '—'}</Typography>
                  {c.superhost ? (
                    <Typography sx={{ ...kickerSx, fontSize: 9, color: T.ok }}>SUPERHOST</Typography>
                  ) : null}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 12.5, fontFamily: T.mono, color: T.mut }}>{c.adrMad}</Typography>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 13, fontFamily: T.mono, fontWeight: 750, color: T.ink }}>{c.adjustedMad}</Typography>
                </td>
                <td>
                  <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                    {c.advantages.map((a) => (
                      <Chip
                        key={a}
                        size="small"
                        label={`+ ${AMENITY_FR[a] ?? a}`}
                        title={`Ce bien du marché a ${AMENITY_FR[a] ?? a}, pas le vôtre`}
                        sx={{ height: 20, fontSize: 10, bgcolor: T.warnBg, color: T.warn }}
                      />
                    ))}
                    {c.missing.map((a) => (
                      <Chip
                        key={a}
                        size="small"
                        label={`− ${AMENITY_FR[a] ?? a}`}
                        title={`Votre bien a ${AMENITY_FR[a] ?? a}, pas celui-ci`}
                        sx={{ height: 20, fontSize: 10, bgcolor: T.okBg, color: T.ok }}
                      />
                    ))}
                  </Stack>
                </td>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Typography sx={{ fontSize: 11.5, color: T.mut, mt: 1.5, lineHeight: 1.5 }}>
        « À votre niveau » = ce que ce bien encaisserait avec la qualité du vôtre. C'est
        cette valeur qui entre dans votre prix, pas son tarif brut.
      </Typography>
    </Box>
  );
}
