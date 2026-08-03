import { useEffect, type RefObject } from 'react';

/**
 * Sync scrollLeft entre un header fixe (hors scroll vertical) et le body —
 * pattern calendrier multi (`MultiView`).
 */
export function useSyncedHorizontalScroll(
  headerRef: RefObject<HTMLElement | null>,
  bodyRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const header = headerRef.current;
    const body = bodyRef.current;
    if (!header || !body) return undefined;

    let syncing = false;
    const onBody = () => {
      if (syncing) return;
      syncing = true;
      header.scrollLeft = body.scrollLeft;
      requestAnimationFrame(() => {
        syncing = false;
      });
    };
    const onHead = () => {
      if (syncing) return;
      // Header souvent overflow:hidden : sans overflow réel, scrollLeft reste 0
      // et réécraserait le body.
      if (header.scrollWidth - header.clientWidth <= 1) return;
      syncing = true;
      body.scrollLeft = header.scrollLeft;
      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    body.addEventListener('scroll', onBody, { passive: true });
    header.addEventListener('scroll', onHead, { passive: true });
    return () => {
      body.removeEventListener('scroll', onBody);
      header.removeEventListener('scroll', onHead);
    };
  }, [headerRef, bodyRef]);
}
