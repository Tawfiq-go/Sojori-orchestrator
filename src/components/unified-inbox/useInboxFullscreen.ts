/**
 * Inbox fullscreen — wraps `usePageFullscreen` and marks hub chrome as FS-active
 * so leading/subBar mount once inside `InboxFullscreenLayer` (not under the overlay).
 */
import { useCallback, useEffect } from 'react';
import { useCommsHubChrome } from '../communications/CommsHubChromeContext';
import { usePageFullscreen } from '../page-fullscreen/usePageFullscreen';

export function useInboxFullscreen() {
  const page = usePageFullscreen();
  const { setFullscreenActive } = useCommsHubChrome();

  // Sync aussi sur Escape (hook bascule `fullscreen` sans passer par `exit`).
  useEffect(() => {
    setFullscreenActive(page.fullscreen);
  }, [page.fullscreen, setFullscreenActive]);

  const enter = useCallback(() => {
    setFullscreenActive(true);
    page.enter();
  }, [page, setFullscreenActive]);

  const exit = useCallback(() => {
    setFullscreenActive(false);
    page.exit();
  }, [page, setFullscreenActive]);

  return {
    fullscreen: page.fullscreen,
    enter,
    exit,
    setFullscreen: page.setFullscreen,
  };
}
