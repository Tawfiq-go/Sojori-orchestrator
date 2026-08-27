/**
 * Drawer résa calendrier — Smart detail Mews Timeline :
 * séjour · À payer · Tarif · Items (extras seulement s’il y en a).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from './_shared';
import { reservationPaidDisplay } from '../../utils/reservationPaidDisplay';
import { listLedgerEntries } from '../../features/finances/financesApi';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import {
  collectReservationExtraItems,
  mapLedgerExtrasToItems,
  mergeExtraItems,
  moneyMad,
  rateLinesFromReservation,
  stayTotalsFromReservation,
  guestFacingNotes,
} from './reservationCalendarSmartDetail';

function channelMeta(reservation) {
  const c = String(reservation?.channelName || reservation?.source || '').toLowerCase();
  const src = String(reservation?.source || reservation?.notes || '').toLowerCase();
  if (c.includes('booking')) return { icon: '💼', label: 'Booking.com', color: '#003580' };
  if (c.includes('airbnb')) return { icon: '🏠', label: 'Airbnb', color: '#FF5A5F' };
  if (c.includes('vrbo')) return { icon: '🏡', label: 'Vrbo', color: '#0E64A4' };
  if (c.includes('mews') || src.includes('source:mews')) {
    return { icon: '🏨', label: reservation?.channelName || 'Mews', color: '#0D9488' };
  }
  return { icon: '📱', label: reservation?.channelName || 'Sojori', color: T.primaryDeep };
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
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

export default function ReservationCalendarDrawer({ reservation, onClose }) {
  const navigate = useNavigate();
  const { requestOwnerId } = useAdminOwnerApiScope();
  const [ledgerExtras, setLedgerExtras] = useState([]);

  const reservationKey = /^[a-f0-9]{24}$/i.test(String(reservation?._id || ''))
    ? String(reservation._id)
    : '';

  useEffect(() => {
    if (!reservationKey) {
      setLedgerExtras([]);
      return undefined;
    }
    let cancelled = false;
    listLedgerEntries(
      { reservationId: reservationKey, type: 'extra', limit: 80 },
      { ownerId: requestOwnerId || undefined },
    )
      .then((rows) => {
        if (!cancelled) setLedgerExtras(mapLedgerExtrasToItems(rows));
      })
      .catch(() => {
        if (!cancelled) setLedgerExtras([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reservationKey, requestOwnerId]);

  const paidDisplay = useMemo(() => reservationPaidDisplay(reservation || {}), [reservation]);
  const smart = useMemo(
    () => stayTotalsFromReservation(reservation, paidDisplay.amount),
    [reservation, paidDisplay.amount],
  );
  const rateLines = useMemo(() => {
    const lines = rateLinesFromReservation(reservation);
    if (lines.length) return lines;
    if (smart.stayTotal > 0) return [{ name: 'Séjour', amount: smart.stayTotal }];
    return [];
  }, [reservation, smart.stayTotal]);
  const extras = useMemo(
    () =>
      mergeExtraItems(collectReservationExtraItems(reservation), ledgerExtras),
    [reservation, ledgerExtras],
  );
  const extrasTotal = extras.reduce((n, x) => n + Number(x.amount || 0) * Number(x.qty || 1), 0);

  if (!reservation) return null;

  const code =
    reservation.reservationNumber ||
    reservation.reservationId ||
    reservation._id ||
    reservation.id ||
    '—';
  const routeId =
    reservation.reservationNumber ||
    reservation._id ||
    reservation.id ||
    reservation.reservationId;
  const channel = channelMeta(reservation);
  const notes = guestFacingNotes(reservation.notes);
  const guest =
    reservation.guestName ||
    `${reservation.guestFirstName || ''} ${reservation.guestLastName || ''}`.trim() ||
    '—';
  const nights =
    reservation.nights ?? nightsBetween(reservation.arrivalDate, reservation.departureDate);
  const listingName = reservation.listingName || reservation.sojoriName || reservation.listing?.name;
  const roomLabel = [reservation.roomName, reservation.roomTypeName, reservation.roomTypes?.roomTypeName]
    .filter(Boolean)
    .join(' · ');
  const phone = reservation.guestPhone || reservation.phone;
  const status = reservation.status || '—';

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
          width: 'min(525px, 100vw)',
          zIndex: 9001,
          background: T.bg1,
          boxShadow: '-8px 0 32px rgba(20,17,10,0.14)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInDrawer 0.22s ease-out',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18 }}>{channel.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: channel.color }}>{channel.label}</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    color: T.text3,
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  {code}
                </span>
              </div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1.15 }}>
                {guest}
              </div>
              {listingName ? (
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 650, color: T.text2 }}>
                  {listingName}
                  {roomLabel ? ` · ${roomLabel}` : ''}
                </div>
              ) : null}
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 14,
            }}
          >
            <DateCell label="Arrivée" value={fmtDate(reservation.arrivalDate)} time={reservation.checkInTime} />
            <DateCell label="Départ" value={fmtDate(reservation.departureDate)} time={reservation.checkOutTime} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {nights != null ? <Chip>{nights} nuit{nights > 1 ? 's' : ''}</Chip> : null}
            {reservation.numberOfGuests != null ? <Chip>{reservation.numberOfGuests} voyageur{Number(reservation.numberOfGuests) > 1 ? 's' : ''}</Chip> : null}
            <Chip tone="primary">{status}</Chip>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 18px' }}>
          <PayBox
            due={smart.stayDue}
            paid={smart.paid}
            stayTotal={smart.stayTotal}
            otaLabel={smart.otaChannelLabel}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <MiniStat label="Payé" value={moneyMad(smart.alreadyPaid)} />
            <MiniStat label="Total" value={moneyMad(smart.stayTotal)} />
          </div>

          {rateLines.length > 0 ? (
            <Section title="Tarif">
              {rateLines.map((line) => (
                <Line key={line.name} name={line.name} value={moneyMad(line.amount)} />
              ))}
            </Section>
          ) : null}

          {extras.length > 0 ? (
            <Section title="Extras">
              {extras.map((item, i) => (
                <Line
                  key={`${item.name}-${i}`}
                  name={item.qty > 1 ? `${item.name} ×${item.qty}` : item.name}
                  value={moneyMad(Number(item.amount) * Number(item.qty || 1))}
                />
              ))}
              <Line name="Total extras" value={moneyMad(extrasTotal)} strong />
            </Section>
          ) : null}

          {(phone || reservation.guestEmail) && (
            <Section title="Contact">
              {phone ? <Line name="Téléphone" value={phone} /> : null}
              {reservation.guestEmail ? <Line name="Email" value={reservation.guestEmail} /> : null}
            </Section>
          )}

          {notes ? (
            <Section title="Notes">
              <div style={{ fontSize: 12.5, color: T.text2, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                {notes.slice(0, 600)}
              </div>
            </Section>
          ) : null}
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderTop: `1px solid ${T.border}`,
            flexShrink: 0,
            display: 'flex',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={openFullPage}
            disabled={!routeId}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 10,
              border: 0,
              cursor: routeId ? 'pointer' : 'not-allowed',
              background: T.primary,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              opacity: routeId ? 1 : 0.5,
            }}
          >
            Gérer
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '11px 16px',
              borderRadius: 10,
              cursor: 'pointer',
              background: T.bg2,
              color: T.text2,
              fontWeight: 700,
              fontSize: 13,
              border: `1px solid ${T.border}`,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideInDrawer { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  );
}

function Chip({ children, tone }) {
  const bg = tone === 'primary' ? T.primaryTint : T.bg2;
  const color = tone === 'primary' ? T.primaryDeep : T.text2;
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 7,
        background: bg,
        color,
      }}
    >
      {children}
    </span>
  );
}

function DateCell({ label, value, time }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        borderRadius: 10,
        background: T.bg2,
        border: `1px solid ${T.border}`,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 13, fontWeight: 750, color: T.text }}>{value}</div>
      {time ? (
        <div style={{ marginTop: 2, fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>{time}</div>
      ) : null}
    </div>
  );
}

function PayBox({ due, paid, stayTotal, otaLabel }) {
  const ota = Boolean(otaLabel);
  const zero = Number(due) <= 0;
  const ok = ota || zero;
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: ok ? T.successTint : T.warningTint,
        border: `1px solid ${ok ? 'rgba(10,143,94,0.22)' : 'rgba(196,101,6,0.28)'}`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: ok ? T.success : T.warning, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {ota ? `Payé via ${otaLabel}` : zero ? 'Soldé' : 'À payer'}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 22,
          fontWeight: 800,
          color: ok ? T.success : T.warning,
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        {moneyMad(ota ? stayTotal : due)}
      </div>
      <div style={{ marginTop: 2, fontSize: 11, color: T.text3 }}>
        {ota
          ? 'Rien à encaisser à la villa (hors extras)'
          : paid || zero
            ? 'Aucune somme due pour le séjour'
            : 'Reste à encaisser (hors extras non payés)'}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: T.bg2,
        border: `1px solid ${T.border}`,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 750, color: T.text, fontFamily: '"Geist Mono", monospace' }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: T.text3,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.bg2,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Line({ name, value, strong }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '9px 12px',
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: strong ? 750 : 600, color: strong ? T.text : T.text2 }}>{name}</span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 750,
          color: T.text,
          fontFamily: '"Geist Mono", monospace',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}
