import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

/**
 * Colonne scrollable pour modales — même pattern que CreateReservationModal.
 * Listener wheel non-passif (obligatoire Mac / React 19).
 */
export function ModalScrollColumn({
  active,
  className,
  wrapperSx,
  innerSx,
  children,
}: {
  active: boolean;
  className?: string;
  wrapperSx?: Record<string, unknown>;
  innerSx?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollHeight <= el.clientHeight + 1) return;

      let delta = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= el.clientHeight;

      const maxScroll = el.scrollHeight - el.clientHeight;
      const next = Math.min(maxScroll, Math.max(0, el.scrollTop + delta));
      const canScrollDown = el.scrollTop < maxScroll - 1 && delta > 0;
      const canScrollUp = el.scrollTop > 0 && delta < 0;

      if (canScrollDown || canScrollUp) {
        el.scrollTop = next;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', onWheel, { capture: true });
  }, [active]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        ...wrapperSx,
      }}
    >
      <Box
        ref={scrollRef}
        className={className}
        tabIndex={-1}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'scroll',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          outline: 'none',
          ...innerSx,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
