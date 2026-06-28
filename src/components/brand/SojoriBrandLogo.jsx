import { Box, Stack, Typography } from '@mui/material';

/** Brand-kit — svg + png/favicon */
export const SOJORI_BRAND_ASSETS = {
  favicon512: '/brand/png/favicon/sojori-favicon-512.png',
  favicon128: '/brand/png/favicon/sojori-favicon-128.png',
  favicon64: '/brand/png/favicon/sojori-favicon-64.png',
  lockupOnLight: '/brand/svg/sojori-lockup-horizontal-onlight.svg',
  wordmarkBlack: '/brand/svg/sojori-wordmark-black.svg',
  faviconSvg: '/brand/svg/sojori-favicon.svg',
};

/**
 * Icône app Sojori (carré or + symbole) — brand-kit favicon PNG.
 * @param {number} [size] côté en px (src 512, affichage redimensionné)
 */
export function SojoriBrandLogo({ size = 34, sx = {}, alt = 'Sojori' }) {
  return (
    <Box
      component="img"
      src={SOJORI_BRAND_ASSETS.favicon512}
      alt={alt}
      draggable={false}
      sx={{
        display: 'block',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '10px',
        userSelect: 'none',
        ...sx,
      }}
    />
  );
}

/** En-tête sidebar : favicon PNG + wordmark + sous-titre rôle. */
export function SojoriBrandLockup({ roleLabel, subtitleColor = '#6e6e73', iconSize = 34 }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <SojoriBrandLogo size={iconSize} />
      <Box sx={{ lineHeight: 1.15, minWidth: 0 }}>
        <Box
          component="img"
          src={SOJORI_BRAND_ASSETS.wordmarkBlack}
          alt="sojori"
          draggable={false}
          sx={{
            display: 'block',
            height: 18,
            width: 'auto',
            maxWidth: 120,
            userSelect: 'none',
          }}
        />
        {roleLabel ? (
          <Typography
            sx={{
              color: subtitleColor,
              fontWeight: 600,
              fontSize: 10,
              mt: 0.35,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {roleLabel}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
