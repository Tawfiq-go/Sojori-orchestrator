import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { inboxShellFillSx, inboxShellFullscreenSx, inboxShellSx } from './inboxV4Ui';

interface InboxLayoutProps {
  children: ReactNode;
  fillViewport?: boolean;
  fullscreen?: boolean;
}

/**
 * Inbox V4 — grille 3 colonnes (Claude Design Sojori 30)
 */
export default function InboxLayout({ children, fillViewport = false, fullscreen = false }: InboxLayoutProps) {
  const shellSx = fullscreen ? inboxShellFullscreenSx : fillViewport ? inboxShellFillSx : inboxShellSx;

  return (
    <Box
      sx={{
        ...shellSx,
        display: { xs: 'flex', lg: 'grid' },
        flexDirection: { xs: 'column', lg: 'unset' },
      }}
    >
      {children}
    </Box>
  );
}
