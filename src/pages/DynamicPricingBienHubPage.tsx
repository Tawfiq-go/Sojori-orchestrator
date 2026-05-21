import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { T } from '../features/dynamic-pricing';
import { usePortfolio } from '../features/dynamic-pricing/hooks/usePortfolio';

/**
 * Hub « Par bien » — choix du listing avant la vue détail.
 */
export function DynamicPricingBienHubPage() {
  const navigate = useNavigate();
  const portfolio = usePortfolio();

  return (
    <DashboardWrapper breadcrumb={['Dynamic Pricing', 'Par bien']} compactMain>
      <Box sx={{ bgcolor: T.bg0, minHeight: 'calc(100vh - 64px)', py: 3, px: { xs: 2, md: 3 } }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
          Par bien
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.text2, mb: 2.5, maxWidth: 560 }}>
          Choisissez un bien pour ouvrir le dashboard (potentiel, pricing IA, calendrier, marché, comps).
          Les données marché viennent du snapshot en base — pas d’appel API au chargement.
        </Typography>

        {portfolio.loading ? (
          <Typography sx={{ color: T.text3 }}>Chargement…</Typography>
        ) : portfolio.rows.length === 0 ? (
          <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
            <Typography sx={{ color: T.text2, mb: 1 }}>
              Aucun bien Sojori chargé.
            </Typography>
            <Button
              size="small"
              onClick={() => navigate('/dynamic-pricing/portefeuille')}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Voir le portefeuille
            </Button>
          </Box>
        ) : (
          <Stack spacing={1}>
            {portfolio.rows.map((row) => (
              <Box
                key={row.listing._id}
                component="button"
                onClick={() => navigate(`/dynamic-pricing/bien/${row.listing._id}`)}
                sx={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 1.5,
                  border: `1px solid ${T.border}`,
                  bgcolor: T.bg1,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  '&:hover': { bgcolor: T.bg2, borderColor: T.borderStrong },
                }}
              >
                <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
                    {row.listing.name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: T.text3 }}>
                    {row.listing.district} · {row.listing.city}
                    {row.aiEnabled ? ' · IA active' : ''}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.text2,
                    flexShrink: 0,
                  }}
                >
                  {row.airroiRaw?.ttm_avg_rate != null
                    ? `${Math.round(row.airroiRaw.ttm_avg_rate * 10)} MAD/j`
                    : '—'}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </DashboardWrapper>
  );
}
