/**
 * Finance canal (Airbnb / Booking via RU) — montants affichés côté PM / rapports.
 *
 * Priorité facturation :
 * 1. Airbnb Comments MAD (« Commission: X MAD », stay+fees, original price)
 * 2. Booking Comments EUR (« Booking.com commission », Room price, ChannelTotal×taux)
 * 3. ChannelBreakdown / otaCommission stocké
 *
 * ⚠️ Ne jamais inventer 10 % (inbox legacy Airbnb).
 * ⚠️ Booking : ne pas faire guest−RoomPrice = « commission » (ménage inclus dans l’écart).
 */

export type ChannelFinanceSource =
  | 'airbnb-comments'
  | 'booking-comments'
  | 'channel-breakdown'
  | 'otaCommission'
  | 'fallback';

export interface ChannelStayFinance {
  guestPaidMad: number;
  commissionMad: number;
  netHostMad: number;
  commissionPct: number;
  stayMad: number;
  feesMad: number;
  source: ChannelFinanceSource;
  note?: string;
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function commentsBlob(r: Record<string, unknown>): string {
  return [r.comments, r.notes]
    .map((p) => String(p || ''))
    .filter(Boolean)
    .join('\n')
    .replace(/&#xD;/gi, '\n')
    .replace(/&amp;/g, '&');
}

/** Montants MAD exacts dans les Comments RU (Airbnb). */
export function parseAirbnbFinanceFromComments(comments: unknown): {
  paidMad?: number;
  roomRemarksMad?: number;
  commissionMad?: number;
  hostPayoutMad?: number;
  stayMad?: number;
  feesMad?: number;
} {
  const text = String(comments || '')
    .replace(/&#xD;/gi, '\n')
    .replace(/&amp;/g, '&');

  const n = (m: RegExpMatchArray | null, idx = 1) => {
    if (!m) return undefined;
    const v = Number(m[idx]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };

  const breakdown = text.match(
    /Price breakdown:\s*([\d]+(?:\.\d+)?)\s*MAD\s*stay\s*\+\s*([\d]+(?:\.\d+)?)\s*MAD\s*fees\s*-\s*([\d]+(?:\.\d+)?)\s*MAD\s*Airbnb fee/i,
  );
  const stayMad = n(breakdown, 1);
  const feesMad = n(breakdown, 2);
  const feeFromBreakdown = n(breakdown, 3);

  const paid = text.match(/Paid\s*([\d]+(?:\.\d+)?)\s*MAD/i);
  const room = text.match(/Room remarks:\s*([\d]+(?:\.\d+)?)\s*MAD/i);
  const commission =
    text.match(/Commission:\s*([\d]+(?:\.\d+)?)\s*MAD/i) ||
    text.match(/-\s*([\d]+(?:\.\d+)?)\s*MAD\s*Airbnb fee/i) ||
    text.match(/([\d]+(?:\.\d+)?)\s*MAD\s*Airbnb fee/i);
  const host =
    text.match(/original price is\s*([\d]+(?:\.\d+)?)\s*MAD/i) ||
    text.match(/You earn[:\s]*([\d]+(?:\.\d+)?)\s*MAD/i);

  const paidMad =
    n(paid) ?? (stayMad != null && feesMad != null ? round2(stayMad + feesMad) : undefined);

  return {
    paidMad,
    roomRemarksMad: n(room),
    commissionMad: n(commission) ?? feeFromBreakdown,
    hostPayoutMad: n(host),
    stayMad,
    feesMad,
  };
}

/** Montants EUR Booking.com (BOOKING NOTE dans comments). */
export function parseBookingFinanceFromComments(comments: unknown): {
  roomPriceEur?: number;
  guestTotalEur?: number;
  commissionEur?: number;
  paidEur?: number;
  cleaningEur?: number;
} {
  const text = String(comments || '')
    .replace(/&#xD;/gi, '\n')
    .replace(/&amp;/g, '&');

  const n = (m: RegExpMatchArray | null, idx = 1) => {
    if (!m) return undefined;
    const v = Number(m[idx]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };

  return {
    roomPriceEur: n(text.match(/Room price:\s*([\d]+(?:\.\d+)?)\s*EUR/i)),
    guestTotalEur: n(text.match(/Total cost for guest:\s*([\d]+(?:\.\d+)?)\s*EUR/i)),
    commissionEur: n(
      text.match(/Booking\.com commission\s*\([^)]*\)\s*:\s*([\d]+(?:\.\d+)?)\s*EUR/i),
    ),
    paidEur: n(
      text.match(/Paid\s*([\d]+(?:\.\d+)?)\s*EUR/i) ||
        text.match(/([\d]+(?:\.\d+)?)\s*EUR\s*payment_on_Booking\.com/i),
    ),
    cleaningEur: n(
      text.match(/Cleaning fee[:\s]+([\d]+(?:\.\d+)?)\s*EUR/i) ||
        text.match(/frais\s*(?:de\s*)?(?:ménage|entretien ménager)[:\s]+([\d]+(?:\.\d+)?)\s*EUR/i),
    ),
  };
}

function sumIncludedCleaningEur(channelBreakdown: Record<string, any>): number {
  const raw =
    channelBreakdown.ChannelTotalFeesTaxes?.ChannelTotalFeeTax ??
    channelBreakdown.ChannelTotalFeesTaxes;
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.reduce((s: number, item: any) => {
    const name = String(item?.['@_Name'] ?? item?.Name ?? item?.name ?? '');
    const a = num(item?.['@_Amount'] ?? item?.Amount ?? item?.amount);
    const cur = String(item?.['@_Currency'] ?? item?.Currency ?? item?.currency ?? 'EUR').toUpperCase();
    const included =
      String(
        item?.['@_IncludedInChannelTotal'] ?? item?.IncludedInChannelTotal ?? 'false',
      ).toLowerCase() === 'true';
    if (!included || cur !== 'EUR' || a <= 0) return s;
    if (/clean|ménage|entretien/i.test(name)) return s + a;
    return s;
  }, 0);
}

/**
 * Résout guest / commission / net / stay / fees pour une réservation.
 */
export function resolveChannelStayFinance(r: Record<string, unknown> | null | undefined): ChannelStayFinance {
  if (!r) {
    return {
      guestPaidMad: 0,
      commissionMad: 0,
      netHostMad: 0,
      commissionPct: 0,
      stayMad: 0,
      feesMad: 0,
      source: 'fallback',
    };
  }

  const blob = commentsBlob(r);
  const airbnb = parseAirbnbFinanceFromComments(blob);
  const booking = parseBookingFinanceFromComments(blob);
  const rb = (r.reservationBreakdown || {}) as Record<string, any>;
  const nb = rb.normalizedBreakdown || {};
  const channelBreakdown = rb.ChannelBreakdown || {};

  const channelTotalRaw = num(
    nb.totalPaidByCustomer?.amount ?? channelBreakdown.ChannelTotal,
  );
  const channelRent = num(channelBreakdown.ChannelRent ?? nb.accommodation?.amount);
  const channelFeeItemsMad = (() => {
    const raw =
      channelBreakdown.ChannelTotalFeesTaxes?.ChannelTotalFeeTax ??
      channelBreakdown.ChannelTotalFeesTaxes;
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return arr.reduce((s: number, item: any) => {
      const a = num(item?.['@_Amount'] ?? item?.Amount ?? item?.amount);
      const cur = String(item?.['@_Currency'] ?? item?.Currency ?? item?.currency ?? 'MAD').toUpperCase();
      return cur === 'MAD' ? s + a : s;
    }, 0);
  })();

  const channelTotalCur = String(
    nb.totalPaidByCustomer?.currency ||
      (typeof channelBreakdown.ChannelTotal === 'number' && channelBreakdown.ChannelTotal > 100
        ? 'MAD'
        : 'EUR'),
  ).toUpperCase();

  const alreadyPaid = num(r.alreadyPaid);
  const totalPrice = num(r.totalPrice);
  const storedCommission = num(r.otaCommission ?? nb.otaCommission?.amount);
  const channelCommissionEur = num(
    nb.otaCommission?.channelAmount ?? rb.ChannelCommission ?? channelBreakdown.ChannelCommission,
  );

  // ── Airbnb MAD ──────────────────────────────────────────────
  if (airbnb.commissionMad != null || airbnb.hostPayoutMad != null) {
    let guestPaidMad = 0;
    if (airbnb.paidMad) guestPaidMad = airbnb.paidMad;
    else if (channelTotalRaw > 0 && channelTotalCur === 'MAD') guestPaidMad = channelTotalRaw;
    else if (alreadyPaid > 0) guestPaidMad = alreadyPaid;
    else if (totalPrice > 0) guestPaidMad = totalPrice;

    const commissionMad =
      airbnb.commissionMad != null
        ? airbnb.commissionMad
        : airbnb.hostPayoutMad != null && guestPaidMad > 0
          ? round2(guestPaidMad - airbnb.hostPayoutMad)
          : 0;
    const netHostMad =
      airbnb.hostPayoutMad != null
        ? airbnb.hostPayoutMad
        : guestPaidMad > 0 && commissionMad > 0
          ? round2(guestPaidMad - commissionMad)
          : totalPrice;
    const base = guestPaidMad > 0 ? guestPaidMad : netHostMad + commissionMad;
    let stayMad = airbnb.stayMad ?? 0;
    let feesMad = airbnb.feesMad ?? channelFeeItemsMad;
    if (!stayMad && feesMad && guestPaidMad > feesMad) stayMad = round2(guestPaidMad - feesMad);
    if (!feesMad && stayMad && guestPaidMad > stayMad) feesMad = round2(guestPaidMad - stayMad);
    return {
      guestPaidMad: guestPaidMad || round2(netHostMad + commissionMad),
      commissionMad,
      netHostMad,
      commissionPct: base > 0 && commissionMad > 0 ? Math.round((commissionMad / base) * 1000) / 10 : 0,
      stayMad,
      feesMad,
      source: 'airbnb-comments',
      note: 'Montants Airbnb (Comments RU)',
    };
  }

  // ── Booking.com EUR → MAD ───────────────────────────────────
  const hasBooking =
    booking.commissionEur != null ||
    booking.roomPriceEur != null ||
    /booking/i.test(String(r.channelName || r.source || ''));

  if (hasBooking && (booking.commissionEur != null || booking.roomPriceEur != null)) {
    const guestEur =
      booking.paidEur ??
      (channelTotalRaw > 0 && channelTotalCur === 'EUR' ? channelTotalRaw : 0);
    // Taux implicite tops MAD / EUR canal (plus fidèle que défaut 10)
    let rate = 0;
    if (guestEur > 0 && alreadyPaid > 0) rate = alreadyPaid / guestEur;
    else if (booking.roomPriceEur && totalPrice > 0) rate = totalPrice / booking.roomPriceEur;
    else if (channelCommissionEur > 0 && storedCommission > 0) {
      rate = storedCommission / channelCommissionEur;
    } else rate = 10;

    const commissionEur = booking.commissionEur ?? channelCommissionEur;
    const commissionMad =
      commissionEur > 0
        ? round2(commissionEur * rate)
        : storedCommission;
    const guestPaidMad =
      guestEur > 0 ? round2(guestEur * rate) : alreadyPaid > 0 ? alreadyPaid : 0;
    const stayMad = booking.roomPriceEur ? round2(booking.roomPriceEur * rate) : 0;
    const cleaningEur =
      booking.cleaningEur ?? sumIncludedCleaningEur(channelBreakdown);
    const feesMad = cleaningEur > 0 ? round2(cleaningEur * rate) : 0;
    // Net OTA = guest payé canal − commission (base facturation client)
    const netHostMad =
      guestPaidMad > 0 && commissionMad > 0
        ? round2(guestPaidMad - commissionMad)
        : stayMad;
    const base = guestPaidMad > 0 ? guestPaidMad : netHostMad + commissionMad;
    return {
      guestPaidMad,
      commissionMad,
      netHostMad,
      commissionPct:
        base > 0 && commissionMad > 0 ? Math.round((commissionMad / base) * 1000) / 10 : 0,
      stayMad,
      feesMad,
      source: 'booking-comments',
      note: 'Montants Booking.com (Comments RU × taux)',
    };
  }

  // Guest fallback
  let guestPaidMad = 0;
  if (channelTotalRaw > 0 && channelTotalCur === 'MAD') guestPaidMad = channelTotalRaw;
  else if (alreadyPaid > 0) guestPaidMad = alreadyPaid;
  else if (totalPrice > 0) guestPaidMad = totalPrice;

  let stayMad = channelRent > 0 && channelTotalCur === 'MAD' ? channelRent : 0;
  let feesMad = channelFeeItemsMad;

  // Ne pas inférer commission = guest − totalPrice si canal Booking (RoomPrice ≠ net)
  const isBookingChannel = /booking/i.test(String(r.channelName || r.source || ''));
  if (
    guestPaidMad > 0 &&
    storedCommission > 0 &&
    (!isBookingChannel || !(totalPrice > 0 && totalPrice < guestPaidMad && Math.abs(guestPaidMad - totalPrice - storedCommission) > 1))
  ) {
    const netHostMad =
      !isBookingChannel && totalPrice > 0 && totalPrice < guestPaidMad
        ? totalPrice
        : round2(guestPaidMad - storedCommission);
    const commissionMad = storedCommission;
    if (!stayMad && feesMad && guestPaidMad > feesMad) stayMad = round2(guestPaidMad - feesMad);
    if (!feesMad && stayMad && guestPaidMad > stayMad) feesMad = round2(guestPaidMad - stayMad);
    return {
      guestPaidMad,
      commissionMad,
      netHostMad,
      commissionPct: Math.round((commissionMad / guestPaidMad) * 1000) / 10,
      stayMad,
      feesMad,
      source: channelTotalRaw > 0 ? 'channel-breakdown' : 'otaCommission',
      note: isBookingChannel ? 'Guest OTA − commission stockée' : 'Guest payé − net hôte',
    };
  }

  if (guestPaidMad > 0 && storedCommission > 0) {
    return {
      guestPaidMad,
      commissionMad: storedCommission,
      netHostMad: round2(guestPaidMad - storedCommission),
      commissionPct: Math.round((storedCommission / guestPaidMad) * 1000) / 10,
      stayMad,
      feesMad,
      source: 'otaCommission',
      note: 'Commission stockée',
    };
  }

  return {
    guestPaidMad: guestPaidMad || totalPrice,
    commissionMad: storedCommission,
    netHostMad: Math.max(0, (guestPaidMad || totalPrice) - storedCommission),
    commissionPct:
      guestPaidMad > 0 && storedCommission > 0
        ? Math.round((storedCommission / guestPaidMad) * 1000) / 10
        : 0,
    stayMad,
    feesMad,
    source: 'fallback',
  };
}
