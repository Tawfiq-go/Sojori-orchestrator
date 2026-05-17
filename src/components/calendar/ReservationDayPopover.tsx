// ════════════════════════════════════════════════════════════════════
// Sojori — Reservation Day Popover
// Popover affichant toutes les réservations d'un jour (rotations)
// EXACT copy from sojori-dashboard/InventoryGrid.jsx:10-102
// ════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface Reservation {
  reservationId?: string;
  id?: string;
  reservationNumber?: string;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  arrivalDate?: string;
  departureDate?: string;
  numberOfGuests?: number;
}

interface ReservationDayPopoverProps {
  reservations: Reservation[];
  dayStr: string; // YYYY-MM-DD
  anchorRect: DOMRect | null;
  onClose: () => void;
  onResaClick?: (reservation: Reservation) => void;
}

const RES_PALETTE = [
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  { bg: '#f3e8ff', border: '#d8b4fe', text: '#581c87' },
  { bg: '#dcfce7', border: '#86efac', text: '#14532d' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },
  { bg: '#FFF3E0', border: '#b8851a', text: '#c2410c' }, // Gold pour Atelier 2026
  { bg: '#cffafe', border: '#67e8f9', text: '#164e63' },
];

export function ReservationDayPopover({
  reservations,
  dayStr,
  anchorRect,
  onClose,
  onResaClick,
}: ReservationDayPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    top: (anchorRect?.bottom || 0) + 4,
    left: Math.max(4, (anchorRect?.left || 0) - 40),
    minWidth: 240,
    maxWidth: 300,
    background: '#fff',
    border: '1px solid rgba(20,17,10,0.14)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
    padding: 10,
  };

  return (
    <div ref={ref} style={style}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 1,
        pb: 0.75,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <Box sx={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>
          {reservations.length} réservation{reservations.length > 1 ? 's' : ''} · {dayStr}
        </Box>
        <Box
          component="button"
          onClick={onClose}
          sx={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            fontSize: 16,
            p: '0 4px',
          }}
        >
          ×
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {reservations.map((res, i) => {
          const c = RES_PALETTE[i % RES_PALETTE.length];
          const arrDay = res.arrivalDate ? new Date(res.arrivalDate).toISOString().slice(0, 10) : null;
          const depDay = res.departureDate ? new Date(res.departureDate).toISOString().slice(0, 10) : null;
          const isArrival = arrDay === dayStr;
          const isDeparture = depDay === dayStr;
          const nights = arrDay && depDay
            ? Math.round((new Date(depDay).getTime() - new Date(arrDay).getTime()) / 86400000)
            : '?';

          const guestName = res.guestName ||
            [res.guestFirstName, res.guestLastName].filter(Boolean).join(' ') ||
            '—';

          return (
            <Box
              key={res.reservationId || res.id || i}
              onClick={() => {
                if (onResaClick) onResaClick(res);
                onClose();
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1,
                cursor: 'pointer',
                background: c.bg,
                border: `1.5px solid ${c.border}`,
              }}
            >
              {/* Status badge */}
              <Box sx={{ fontSize: 14, flexShrink: 0 }}>
                {isArrival && !isDeparture ? '🏠' : isDeparture && !isArrival ? '🚪' : '↔️'}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: c.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {guestName}
                </Box>
                <Box sx={{ fontSize: 10, color: '#9ca3af' }}>
                  {res.reservationNumber} · {nights}n
                </Box>
              </Box>

              <Box sx={{
                fontSize: 9,
                fontWeight: 700,
                p: '2px 5px',
                borderRadius: 0.5,
                background: isArrival ? '#dcfce7' : isDeparture ? '#fee2e2' : '#f0f9ff',
                color: isArrival ? '#166534' : isDeparture ? '#991b1b' : '#1e40af',
                flexShrink: 0,
              }}>
                {isArrival && !isDeparture ? 'Arrivée' : isDeparture && !isArrival ? 'Départ' : 'Rotation'}
              </Box>
            </Box>
          );
        })}
      </Box>
    </div>
  );
}

export default ReservationDayPopover;
