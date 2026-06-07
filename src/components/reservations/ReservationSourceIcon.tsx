import sojoriLogo from '../../assets/images/sojori-logo.png';
import airbnbLogo from '../../assets/images/airbnb.png';
import bookingLogo from '../../assets/images/booking.png';

const SOJORI_ORANGE = '#b8851a';

export type ReservationSourceKind =
  | 'admin'
  | 'whatsapp'
  | 'vente'
  | 'airbnb'
  | 'booking'
  | 'vrbo'
  | 'channex'
  | 'rentals';

export interface ReservationSourceInput {
  source?: string | null;
  channelName?: string | null;
  byRentals?: boolean;
}

/**
 * Résout le canal d'origine à partir de source + channelName (backend).
 * - Dashboard / admin → badge « A »
 * - sojori-vente → logo Sojori
 * - whatsapp-booking → logo WhatsApp
 * - OTA → logos existants
 */
export function resolveReservationSourceKind(
  reservation: ReservationSourceInput,
): ReservationSourceKind {
  const source = String(reservation?.source || '').toLowerCase().trim();
  const channel = String(reservation?.channelName || '').toLowerCase().trim();

  if (source === 'dashboard') return 'admin';
  if (source === 'whatsapp-booking' || channel.includes('whatsapp')) return 'whatsapp';
  if (source === 'sojori-vente' || channel.includes('marketplace')) return 'vente';

  if (channel.includes('airbnb')) return 'airbnb';
  if (channel.includes('booking')) return 'booking';
  if (channel.includes('vrbo')) return 'vrbo';
  if (channel.includes('channex')) return 'channex';
  if (channel.includes('rentals') || reservation?.byRentals) return 'rentals';

  if (channel === 'sojori' || channel === 'direct' || channel === '') return 'vente';

  return 'vente';
}

function getReservationSourceTitle(kind: ReservationSourceKind): string {
  switch (kind) {
    case 'admin':
      return 'Admin (dashboard)';
    case 'whatsapp':
      return 'WhatsApp Booking';
    case 'vente':
      return 'Sojori (site / direct)';
    case 'airbnb':
      return 'Airbnb';
    case 'booking':
      return 'Booking.com';
    case 'vrbo':
      return 'Vrbo';
    case 'channex':
      return 'Channex';
    case 'rentals':
      return 'Rentals United';
    default:
      return 'Sojori';
  }
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function AdminBadge({ size = 22 }: { size?: number }) {
  return (
    <div
      title="Admin"
      style={{
        width: size,
        height: size,
        border: `2px solid ${SOJORI_ORANGE}`,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: Math.round(size * 0.5),
        color: SOJORI_ORANGE,
        lineHeight: 1,
        backgroundColor: '#fff',
      }}
    >
      A
    </div>
  );
}

function RentalsBadge({ size = 22 }: { size?: number }) {
  return (
    <div
      title="Rentals United"
      style={{
        width: size,
        height: size,
        border: '2px solid #0673b3',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: Math.round(size * 0.38),
        color: '#0673b3',
        lineHeight: 1,
        backgroundColor: '#fff',
        letterSpacing: '-0.02em',
      }}
    >
      RU
    </div>
  );
}

export function ReservationSourceIcon({
  reservation,
  size = 22,
}: {
  reservation: ReservationSourceInput;
  size?: number;
}) {
  const kind = resolveReservationSourceKind(reservation);
  const title = getReservationSourceTitle(kind);

  if (kind === 'admin') {
    return <AdminBadge size={size} />;
  }
  if (kind === 'whatsapp') {
    return (
      <span title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <WhatsAppIcon size={size - 2} />
      </span>
    );
  }
  if (kind === 'rentals') {
    return <RentalsBadge size={size} />;
  }
  if (kind === 'airbnb') {
    return (
      <img
        src={airbnbLogo}
        alt={title}
        title={title}
        style={{ height: size - 4, width: 'auto', objectFit: 'contain' }}
      />
    );
  }
  if (kind === 'booking') {
    return (
      <img
        src={bookingLogo}
        alt={title}
        title={title}
        style={{ height: size - 4, width: 'auto', objectFit: 'contain' }}
      />
    );
  }

  return (
    <img
      src={sojoriLogo}
      alt={title}
      title={title}
      style={{ height: size - 4, width: 'auto', objectFit: 'contain' }}
    />
  );
}
