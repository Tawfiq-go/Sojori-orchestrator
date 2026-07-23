// ════════════════════════════════════════════════════════════════════
// ReservationCalendarDrawer — résumé résa depuis le calendrier inventaire
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from './_shared';
import { reservationPaidDisplay } from '../../utils/reservationPaidDisplay';

function channelMeta(channelName) {
  const c = String(channelName || '').toLowerCase();
  if (c.includes('booking')) return { icon: '💼', label: 'Booking.com', color: '#003580' };
  if (c.includes('airbnb')) return { icon: '🏠', label: 'Airbnb', color: '#FF5A5F' };
  if (c.includes('vrbo')) return { icon: '🏡', label: 'Vrbo', color: '#0E64A4' };
  return { icon: '📱', label: channelName || 'Sojori', color: T.primaryDeep };
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function nightsBetween(arrival, departure) {
  if (!arrival || !departure) return null;
  const a = new Date(arrival).getTime();
  const d = new Date(departure).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(d)) return null;
  return Math.max(0, Math.round((d - a) / 86400000));
}

export default function ReservationCalendarDrawer({ reservation, loading = false, onClose }) {
  const navigate = useNavigate();
  if (!reservation) return null;

  const code = reservation.reservationNumber || reservation.reservationId || reservation._id || reservation.id || '—';
  const routeId = reservation.reservationNumber || reservation._id || reservation.id || reservation.reservationId;
  const channel = channelMeta(reservation.channelName);
  const guest =
    reservation.guestName ||
    `${reservation.guestFirstName || ''} ${reservation.guestLastName || ''}`.trim() ||
    '—';
  const nights = reservation.nights ?? nightsBetween(reservation.arrivalDate, reservation.departureDate);
  const paidDisplay = reservationPaidDisplay({
    alreadyPaid: reservation.alreadyPaid,
    totalPrice:
      reservation.totalPrice ||
      reservation.sojoriTotal ||
      reservation.costs?.RUPrice ||
      null,
    currency: reservation.currency || 'MAD',
  });
  const total = paidDisplay.amount ?? 0;
  const currency = paidDisplay.currency;
  const paid =
    reservation.paymentStatus === 'Paid' ||
    (Number(reservation.alreadyPaid) > 0 && total > 0 && Number(reservation.alreadyPaid) >= total * 0.95);
  const status = reservation.status || '—';
  const listingName = reservation.listingName || reservation.sojoriName || reservation.propertyName;

  const openFullPage = () => {
    if (routeId) {
      onClose?.();
      navigate(`/reservations/${encodeURIComponent(String(routeId))}`);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(20,17,10,0.32)' }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 100vw)',
          zIndex: 9001,
          background: T.bg1,
          boxShadow: '-8px 0 32px rgba(20,17,10,0.14)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInDrawer 0.22s ease-out',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22 }}>{channel.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: channel.color }}>{channel.label}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: T.text, fontFamily: '"Geist Mono", monospace' }}>{code}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>{guest}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.bg1,
                cursor: 'pointer',
                fontSize: 18,
                color: T.text2,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {total > 0 && (
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                background: T.bg2, color: T.text, fontFamily: '"Geist Mono", monospace',
              }}>
                {currency} {total.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            )}
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
              background: paid ? T.successTint : T.warningTint,
              color: paid ? T.success : T.warning,
            }}>
              {paid ? '✓ Payé' : 'Non payé'}
            </span>
            {nights != null && (
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                background: T.infoTint, color: T.info,
              }}>
                {nights} nuit{nights > 1 ? 's' : ''}
              </span>
            )}
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
              background: T.primaryTint, color: T.primaryDeep,
            }}>
              {status}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px', position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2, background: 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 32, height: 32, border: `3px solid ${T.border}`,
                borderTopColor: T.primary, borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {listingName && (
              <InfoRow label="Logement" value={listingName} />
            )}
            <InfoRow label="Arrivée" value={fmtDate(reservation.arrivalDate)} />
            <InfoRow label="Départ" value={fmtDate(reservation.departureDate)} />
            {reservation.numberOfGuests != null && (
              <InfoRow label="Voyageurs" value={String(reservation.numberOfGuests)} />
            )}
            {reservation.guestPhone && (
              <InfoRow label="Téléphone" value={reservation.guestPhone} />
            )}
            {reservation.guestEmail && (
              <InfoRow label="Email" value={reservation.guestEmail} />
            )}
          </div>
        </div>

        <div style={{
          padding: '14px 18px', borderTop: `1px solid ${T.border}`, flexShrink: 0,
          display: 'flex', gap: 10,
        }}>
          <button
            type="button"
            onClick={openFullPage}
            disabled={!routeId}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 10, border: 0, cursor: routeId ? 'pointer' : 'not-allowed',
              background: T.primary, color: '#fff', fontWeight: 700, fontSize: 13,
              opacity: routeId ? 1 : 0.5,
            }}
          >
            Ouvrir la réservation
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '11px 16px', borderRadius: 10, cursor: 'pointer',
              background: T.bg2, color: T.text2, fontWeight: 700, fontSize: 13,
              border: `1px solid ${T.border}`,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideInDrawer { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12,
      padding: '10px 12px', borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.text3 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
