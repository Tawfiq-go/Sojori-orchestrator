/**
 * Montant à afficher comme « prix / payé » d’une réservation — toujours en MAD.
 *
 * Booking : EUR Comments/RU × taux admin (currencies.madRate), puis affichage MAD.
 * Airbnb : Comments MAD / alreadyPaid MAD.
 */
import { resolveChannelStayFinance } from './reservationChannelFinance';
import { getCachedEurMadAdminRate } from './eurMadAdminRate';

export function reservationPaidDisplay(r: {
  alreadyPaid?: number | null;
  totalPrice?: number | null;
  currency?: string | null;
  channelName?: string | null;
  source?: string | null;
  comments?: unknown;
  notes?: unknown;
  roomRemarks?: unknown;
  otaCommission?: unknown;
  reservationBreakdown?: unknown;
  [k: string]: unknown;
}): { amount: number | null; currency: string; source: string | null } {
  const finance = resolveChannelStayFinance(r as Record<string, unknown>, {
    eurMadRate: getCachedEurMadAdminRate(),
  });
  if (finance.guestPaidMad > 0) {
    return {
      amount: finance.guestPaidMad,
      currency: 'MAD',
      source: finance.source,
    };
  }
  const paid = Number(r.alreadyPaid);
  if (Number.isFinite(paid) && paid > 0) {
    return { amount: paid, currency: 'MAD', source: 'alreadyPaid' };
  }
  const total = Number(r.totalPrice);
  if (Number.isFinite(total) && total > 0) {
    // Booking mal labellé EUR sous currency MAD → ne pas afficher brut
    if (/booking/i.test(String(r.channelName || r.source || ''))) {
      return { amount: null, currency: 'MAD', source: null };
    }
    return { amount: total, currency: 'MAD', source: 'totalPrice' };
  }
  return { amount: null, currency: 'MAD', source: null };
}

export function formatReservationPaid(r: {
  alreadyPaid?: number | null;
  totalPrice?: number | null;
  currency?: string | null;
  channelName?: string | null;
  source?: string | null;
  comments?: unknown;
  notes?: unknown;
  roomRemarks?: unknown;
  otaCommission?: unknown;
  reservationBreakdown?: unknown;
  [k: string]: unknown;
}): string | null {
  const { amount } = reservationPaidDisplay(r);
  if (amount == null) return null;
  return `${Math.round(amount).toLocaleString('fr-FR')} MAD`;
}
