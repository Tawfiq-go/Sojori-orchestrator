import { Box } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';

interface InboxLayoutProps {
  children: React.ReactNode;
}

/**
 * InboxLayout - Container 2 colonnes pour inbox
 * Design: Claude Design - Unified Inbox
 * Structure: ThreadsList (320px) + ChatThread (flex)
 * Sans le rail de canaux (utilisé pour pages dédiées)
 *
 * Avec fix scroll intégré: maxHeight, overflow: hidden
 */
export default function InboxLayout({ children }: InboxLayoutProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        height: 660,
        maxHeight: 660,           // ← Fix cascade scroll
        overflow: 'hidden',       // ← Chaque composant enfant gère son scroll
        bgcolor: t.bg1,
        border: `1px solid ${t.border}`,
        borderRadius: '16px',
        boxShadow: '0 1px 2px rgba(26,20,8,0.03)',
      }}
    >
      {children}
    </Box>
  );
}
