import type { ReactNode } from 'react';
import { PageFullscreenLayer } from '../page-fullscreen/PageFullscreenLayer';
import InboxLayout from './InboxLayout';

/**
 * Couche plein écran inbox — portal body, partagée par tous les onglets
 * (WhatsApp, OTA, Staff, Booking, Leads, Avis). État : useInboxFullscreen / usePageFullscreen.
 *
 * ⚠️ z-index 1200 : au-dessus du chrome dashboard (sticky ~30) mais SOUS les
 * MUI Dialog/Popover (1300).
 */
export function InboxFullscreenLayer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <PageFullscreenLayer open={open} onClose={onClose} label={label} zIndex={1200}>
      <InboxLayout fillViewport fullscreen>
        {children}
      </InboxLayout>
    </PageFullscreenLayer>
  );
}
