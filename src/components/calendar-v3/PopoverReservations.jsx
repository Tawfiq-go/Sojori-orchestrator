// ════════════════════════════════════════════════════════════════════
// PopoverReservations.jsx — popover rotations multi-réservations
// ════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef } from 'react';
import { T, reservationDayType, RESERVATION_BADGE, RESERVATION_PALETTE } from './_shared';

export default function PopoverReservations({
  open, anchorRect, dayStr, reservations = [], onClose, onResaClick,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !anchorRect) return null;

  const top = anchorRect.bottom + 4;
  const left = Math.max(4, anchorRect.left - 40);

  return (
    <div ref={ref} role="dialog" aria-label="Réservations du jour"
      style={{
        position: 'fixed', top, left, zIndex: 9999,
        minWidth: 260, maxWidth: 320,
        background: T.bg1, border: `1px solid ${T.borderStrong}`,
        borderRadius: 14, boxShadow: '0 12px 40px rgba(20,17,10,0.18)',
        padding: 12, animation: 'fadeIn 0.2s both',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {reservations.length} réservations · {dayStr}
        </span>
        <button onClick={onClose} aria-label="Fermer"
          style={{ background: 'none', border: 0, color: T.text4, fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reservations.map((res, i) => {
          const type = reservationDayType(res, dayStr);
          const badge = RESERVATION_BADGE[type];
          const palette = RESERVATION_PALETTE[i % RESERVATION_PALETTE.length];
          const nights = Math.round(
            Math.abs(new Date(res.departureDate) - new Date(res.arrivalDate)) / 86400000
          );
          const name = res.guestName || `${res.guestFirstName || ''} ${res.guestLastName || ''}`.trim() || '—';

          return (
            <div key={res.reservationId || i}
              onClick={() => { onResaClick?.(res); onClose?.(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 8,
                background: palette.bg, border: `1.5px solid ${palette.border}`,
                cursor: 'pointer', transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{badge.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 12.5, color: palette.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{name}</div>
                <div style={{
                  fontSize: 10, color: T.text3, marginTop: 2,
                  fontFamily: '"Geist Mono", monospace',
                }}>
                  {res.reservationNumber || `RES-${i + 1}`} · {nights}n
                </div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                background: badge.bg, color: badge.color,
                letterSpacing: '0.04em', flexShrink: 0,
                fontFamily: '"Geist Mono", monospace',
              }}>{badge.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
