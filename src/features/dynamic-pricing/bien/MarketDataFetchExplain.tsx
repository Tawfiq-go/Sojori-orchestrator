import { Box, Typography } from '@mui/material';
import { T, DP_LAYOUT_SX } from '../_tokens';

/** Explique le flux concurrence — visible admin uniquement (onglet Concurrence). */
export default function MarketDataFetchExplain({ isPlatformAdmin = false }: { isPlatformAdmin?: boolean }) {
  if (!isPlatformAdmin) return null;

  return (
    <Box sx={{ ...DP_LAYOUT_SX, mb: 2 }}>
      <Box
        sx={{
          p: 1.75,
          borderRadius: 1.5,
          border: `1px solid ${T.border}`,
          bgcolor: T.bg1,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>
          Concurrence · comparables AirROI
        </Typography>
        <Box
          component="ul"
          sx={{
            m: 0,
            pl: 2.25,
            fontSize: 12,
            color: T.text2,
            lineHeight: 1.55,
            '& li': { mb: 0.75 },
          }}
        >
          <li>
            <strong>Concurrence</strong> (~0,10 $) — jusqu’à ~25 annonces similaires autour du GPS du
            listing · médianes §01, carte §02, tableau §03.
          </li>
          <li>
            GPS + chambres / SDB / capacité pris sur la fiche Sojori — pas besoin de l’URL Airbnb RU
            pour lancer les comps.
          </li>
          <li>
            <strong>Estimation & aperçu prix</strong> — onglet « Réglages pricing » (potentiel §02,
            aperçu §05). Refresh complet Airbnb (perf annonce) : bandeau admin.
          </li>
        </Box>
      </Box>
    </Box>
  );
}
