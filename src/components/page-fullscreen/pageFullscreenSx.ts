import type { SxProps, Theme } from '@mui/material';

/** Shell flex column pour l’arbre page quand fullscreen est actif. */
export function pageTreeFullscreenSx(fullscreen: boolean): SxProps<Theme> {
  if (!fullscreen) return {};
  return {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  };
}

/** Zone contenu scrollable en fullscreen. */
export function pageContentFullscreenSx(fullscreen: boolean): SxProps<Theme> {
  if (!fullscreen) return {};
  return {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
  };
}
