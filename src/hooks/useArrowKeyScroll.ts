import { useEffect, type RefObject } from 'react';

/** Modales MUI / dialogs réels — exclut le plein écran page (`data-page-fullscreen`). */
export function isBlockingAriaModalOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return [...document.querySelectorAll('[aria-modal="true"]')].some((el) => {
    if (el.getAttribute('data-page-fullscreen') === 'true') return false;
    return el.getClientRects().length > 0;
  });
}

function isTypingTarget(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

export type UseArrowKeyScrollOptions = {
  /** ← → (défaut true) */
  horizontal?: boolean;
  /** ↑ ↓ (défaut true) */
  vertical?: boolean;
  hStep?: number;
  vStep?: number;
  /** Sync scrollLeft (ex. header dates multi) */
  syncHorizontalRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
};

/**
 * Flèches clavier → scroll d’un conteneur (calendriers multi/simple, StayView…).
 * Actif sans clic préalable. Ignore inputs + vraies modales ; passe le plein écran page.
 */
export function useArrowKeyScroll(
  scrollRef: RefObject<HTMLElement | null>,
  options: UseArrowKeyScrollOptions = {},
): void {
  const {
    horizontal = true,
    vertical = true,
    hStep = 80,
    vStep = 48,
    syncHorizontalRef,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return undefined;
    const body = scrollRef.current;
    if (!body) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      const isH = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
      const isV = e.key === 'ArrowUp' || e.key === 'ArrowDown';
      if ((!isH || !horizontal) && (!isV || !vertical)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(document.activeElement)) return;
      if (isBlockingAriaModalOpen()) return;

      const maxX = body.scrollWidth - body.clientWidth;
      const maxY = body.scrollHeight - body.clientHeight;

      if (isH && horizontal) {
        if (maxX <= 1) return;
        const step = hStep * (e.shiftKey ? 7 : 1);
        const next = Math.max(
          0,
          Math.min(maxX, body.scrollLeft + (e.key === 'ArrowRight' ? step : -step)),
        );
        e.preventDefault();
        if (next === body.scrollLeft) return;
        body.scrollLeft = next;
        const sync = syncHorizontalRef?.current;
        if (sync) sync.scrollLeft = next;
        return;
      }

      if (isV && vertical) {
        if (maxY <= 1) return;
        const step = vStep * (e.shiftKey ? 5 : 1);
        const next = Math.max(
          0,
          Math.min(maxY, body.scrollTop + (e.key === 'ArrowDown' ? step : -step)),
        );
        e.preventDefault();
        if (next === body.scrollTop) return;
        body.scrollTop = next;
      }
    };

    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, [
    scrollRef,
    horizontal,
    vertical,
    hStep,
    vStep,
    syncHorizontalRef,
    enabled,
  ]);
}
