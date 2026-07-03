import { Box, Typography } from '@mui/material';
import { T, DP_LAYOUT_SX } from './_tokens';

interface Crumb {
  label: string;
  onClick?: () => void;
}

interface Props {
  crumbs: Crumb[];
  /** Sans marges page (dans une barre parent) */
  embedded?: boolean;
}

export default function DynamicPricingBreadcrumb({ crumbs, embedded }: Props) {
  return (
    <Box
      sx={{
        ...(embedded
          ? { pt: 0.5, pb: 0 }
          : {
              ...DP_LAYOUT_SX,
              pt: 1,
              pb: 0.5,
            }),
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexWrap: 'wrap',
      }}
    >
      {crumbs.map((c, i) => (
        <Box key={`${c.label}-${i}`} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          {i > 0 ? (
            <Typography sx={{ fontSize: 11, color: T.text4, fontWeight: 600 }}>/</Typography>
          ) : null}
          {c.onClick ? (
            <Box
              component="button"
              type="button"
              onClick={c.onClick}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: i === crumbs.length - 1 ? 800 : 700,
                color: i === crumbs.length - 1 ? T.text : T.text2,
                borderRadius: 1,
                px: 0.75,
                py: 0.25,
                '&:hover': { bgcolor: T.bg2, color: T.goldDeep },
              }}
            >
              {c.label}
            </Box>
          ) : (
            <Typography sx={{
              fontSize: 12.5,
              fontWeight: 800,
              color: T.text,
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {c.label}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export function portfolioHref(cityScope: string | null): string {
  if (!cityScope) return '/dynamic-pricing/portefeuille';
  return `/dynamic-pricing/portefeuille?city=${encodeURIComponent(cityScope)}`;
}

export function bienHref(listingId: string, cityScope: string | null): string {
  const base = `/dynamic-pricing/bien/${listingId}`;
  if (!cityScope) return base;
  return `${base}?city=${encodeURIComponent(cityScope)}`;
}
