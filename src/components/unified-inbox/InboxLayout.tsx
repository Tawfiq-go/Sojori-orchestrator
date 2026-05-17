import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { inboxShellSx } from './inboxV4Ui';

interface InboxLayoutProps {
  children: ReactNode;
}

/**
 * Inbox V4 — grille 3 colonnes (Claude Design Sojori 30)
 */
export default function InboxLayout({ children }: InboxLayoutProps) {
  return (
    <Box
      sx={{
        ...inboxShellSx,
        display: { xs: 'flex', lg: 'grid' },
        flexDirection: { xs: 'column', lg: 'unset' },
      }}
    >
      {children}
    </Box>
  );
}
