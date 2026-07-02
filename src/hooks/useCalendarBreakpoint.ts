import { useMediaQuery, useTheme } from '@mui/material';

export function useCalendarBreakpoint() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const showLandscapeHint = isMobile && isPortrait;

  return { isMobile, isPortrait, showLandscapeHint };
}
