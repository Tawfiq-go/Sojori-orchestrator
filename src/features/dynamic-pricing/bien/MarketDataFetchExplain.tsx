import { Box, Typography } from '@mui/material';
import { T, DP_LAYOUT_SX } from '../_tokens';

/** Explique les flux marché — visible admin uniquement. */
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
          Données utiles PM · estimation + concurrence
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
            <strong>Estimation marché</strong> (~0,20 $) — profil Sojori · potentiel §02 & calendrier pricing.
            Vos ADR/calendrier ops restent dans Sojori (pas besoin de relire Airbnb).
          </li>
          <li>
            <strong>Concurrence</strong> (~0,10 $) — jusqu’à ~25 annonces similaires · carte §06 & tableau détaillé §07.
          </li>
          {isPlatformAdmin ? (
            <li>
              <strong>Admin</strong> — refresh complet Airbnb (fiche + metrics + tarifs/jour) disponible dans le bandeau
              pour étude rentabilité.
            </li>
          ) : null}
        </Box>
        <Typography sx={{ fontSize: 11, color: T.text3, mt: 1 }}>
          Prix marché ville (Marrakech, Casablanca) : refresh portefeuille « Actualisation des données » (admin).
        </Typography>
      </Box>
    </Box>
  );
}
