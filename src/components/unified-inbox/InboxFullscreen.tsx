import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { useCommsHubChrome } from '../communications/CommsHubChromeContext';
import { PageFullscreenLayer } from '../page-fullscreen/PageFullscreenLayer';
import InboxLayout from './InboxLayout';

/**
 * Couche plein écran inbox — portal body, partagée par tous les onglets
 * (WhatsApp, OTA, Staff, Booking, Leads, Avis). État : useInboxFullscreen / usePageFullscreen.
 *
 * ⚠️ z-index 1200 : au-dessus du chrome dashboard (sticky ~30) mais SOUS les
 * MUI Dialog/Popover (1300).
 *
 * Règle d’or : si des filtres vivent dans le hub (`CommsHubChrome` leading/subBar),
 * ils sont re-montés ICI en fullscreen (pas seulement la grille 3 colonnes).
 * `useInboxFullscreen().enter` active `fullscreenActive` pour un seul mount.
 */
export function InboxFullscreenLayer({
  open,
  onClose,
  label,
  children,
  /** Chrome filtres explicite (ex. pills Avis). Sinon = leading/subBar hub. */
  chrome,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  chrome?: ReactNode;
}) {
  const hub = useCommsHubChrome();

  const hubChrome =
    hub.leading || hub.subBar ? (
      <Box sx={{ flexShrink: 0, minWidth: 0 }}>
        {hub.leading}
        {hub.subBar ? <Box sx={{ mt: 0.4, minWidth: 0 }}>{hub.subBar}</Box> : null}
      </Box>
    ) : null;

  const topChrome = chrome ?? hubChrome;

  return (
    <PageFullscreenLayer open={open} onClose={onClose} label={label} zIndex={1200}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          overflow: 'hidden',
        }}
      >
        {topChrome}
        <InboxLayout fillViewport fullscreen>
          {children}
        </InboxLayout>
      </Box>
    </PageFullscreenLayer>
  );
}
