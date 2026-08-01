import { useCallback, useEffect, useState } from 'react';

export type PageFullscreenControls = {
  fullscreen: boolean;
  enter: () => void;
  exit: () => void;
  setFullscreen: (next: boolean) => void;
};

/**
 * État plein écran page — Escape + verrouillage scroll body.
 * Partagé calendrier, listes, planning, inbox.
 */
export function usePageFullscreen(): PageFullscreenControls {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [fullscreen]);

  const enter = useCallback(() => setFullscreen(true), []);
  const exit = useCallback(() => setFullscreen(false), []);
  return { fullscreen, enter, exit, setFullscreen };
}
