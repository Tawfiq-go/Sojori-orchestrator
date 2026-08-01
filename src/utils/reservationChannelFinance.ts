/**
 * Finance canal (Airbnb / Booking via RU) — montants affichés côté PM / rapports.
 *
 * Airbnb (preuve host app) :
 * - Montants : Comments RU (stay, ménage, fee, original price) — pas inventés
 * - % affiché : toujours 15,5 % (host service fee Airbnb) — ne pas recalculer 18,6 %
 * - Ménage = CLEANING_FEE / fees Comments — pas une « taxe Sojori »
 *
 * Booking :
 * - Commission toujours recalculée (jamais le montant Comments/RU — non fiable)
 * - Base = guest OTA (ChannelTotal / AlreadyPaid) × BOOKING_COMMISSION_PCT
 */

export type ChannelFinanceSource =
  | 'airbnb-comments'
  | 'booking-comments'
  | 'booking-calculated'
  | 'channel-breakdown'
  | 'otaCommission'
  | 'fallback';

/** Host service fee Airbnb (label officiel) — ne pas dériver du ratio MAD. */
export const AIRBNB_HOST_FEE_PCT = 15.5;

/**
 * TVA Maroc sur host fee Airbnb (preuve host app : « 15.5% + VAT »).
 * 15,5 % × 1,20 = 18,6 % effectif sur le total guest.
 */
export const AIRBNB_HOST_FEE_VAT_PCT = 20;

/** Commission Booking toujours recalculée (pas le montant canal). */
export const BOOKING_COMMISSION_PCT = 15;

export interface ChannelStayFinance {
  guestPaidMad: number;
  commissionMad: number;
  netHostMad: number;
  /** % affiché (Airbnb = 15.5 fixe) */
  commissionPct: number;
  stayMad: number;
  /** Ménage / cleaning inclus (0 si Comments disent 0 fees) */
  feesMad: number;
  /** Taxe de séjour / Tourist Tax — ne jamais afficher comme ménage */
  touristTaxMad: number;
  /** Airbnb : part host fee 15,5 % (hors TVA) — déductible selon clients */
  hostFeeMad?: number;
  /** Airbnb Maroc : TVA 20 % sur host fee (« Moroccan Airbnb TVA ») */
  hostFeeVatMad?: number;
  source: ChannelFinanceSource;
  note?: string;
  /** Libellé court sous le KPI commission */
  commissionHint?: string;
}

/** Découpe commission Airbnb = host fee 15,5 % + TVA 20 % (somme = commission). */
export function splitAirbnbHostFeeVat(commissionMad: number): {
  hostFeeMad: number;
  hostFeeVatMad: number;
} {
  if (!(commissionMad > 0)) return { hostFeeMad: 0, hostFeeVatMad: 0 };
  // fee HT = total / 1.20 ; TVA = reste (centimes stables)
  const hostFeeMad = round2(commissionMad / (1 + AIRBNB_HOST_FEE_VAT_PCT / 100));
  const hostFeeVatMad = round2(commissionMad - hostFeeMad);
  return { hostFeeMad, hostFeeVatMad };
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

function isAirbnbChannel(r: Record<string, unknown>): boolean {
  return /airbnb/i.test(String(r.channelName || r.source || ''));
}

function isBookingChannel(r: Record<string, unknown>): boolean {
  return /booking/i.test(String(r.channelName || r.source || ''));
}

/** Montants MAD exacts dans les Comments RU (Airbnb). */
export function parseAirbnbFinanceFromComments(comments: unknown): {
  paidMad?: number;
  roomRemarksMad?: number;
  commissionMad?: number;
  hostPayoutMad?: number;
  stayMad?: number;
  /** Cleaning / fees canal — peut être 0 explicitement */
  feesMad?: number;
  /** Taxe de séjour / Tourist Tax (≠ ménage) */
  touristTaxMad?: number;
  /** true si « X MAD fees » était présent dans Price breakdown (même si 0) */
  feesExplicit?: boolean;
} {
  const text = String(comments || '')
    .replace(/&#xD;/gi, '\n')
    .replace(/&amp;/g, '&');

  const n = (m: RegExpMatchArray | null, idx = 1) => {
    if (!m) return undefined;
    const v = Number(m[idx]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  /** Accepte 0 (ménage explicitement nul). */
  const n0 = (m: RegExpMatchArray | null, idx = 1) => {
    if (!m) return undefined;
    const v = Number(m[idx]);
    return Number.isFinite(v) && v >= 0 ? v : undefined;
  };

  const breakdown = text.match(
    /Price breakdown:\s*([\d]+(?:\.\d+)?)\s*MAD\s*stay\s*\+\s*([\d]+(?:\.\d+)?)\s*MAD\s*fees\s*-\s*([\d]+(?:\.\d+)?)\s*MAD\s*Airbnb fee/i,
  );
  const stayMad = n(breakdown, 1);
  const feesFromBreakdown = n0(breakdown, 2);
  const feeFromBreakdown = n(breakdown, 3);
  const cleaningFee = n0(text.match(/CLEANING_FEE:\s*([\d]+(?:\.\d+)?)/i));
  const touristTaxMad =
    n(text.match(/Tourist Tax[^0-9]*([\d]+(?:\.\d+)?)\s*MAD/i)) ||
    n(text.match(/Tax remitted by host:[^\d]*([\d]+(?:\.\d+)?)\s*MAD/i)) ||
    n(text.match(/taxe de séjour[^0-9]*([\d]+(?:\.\d+)?)\s*MAD/i));

  const paid = text.match(/Paid\s*([\d]+(?:\.\d+)?)\s*MAD/i);
  const room = text.match(/Room remarks:\s*([\d]+(?:\.\d+)?)\s*MAD/i);
  const commission =
    text.match(/Commission:\s*([\d]+(?:\.\d+)?)\s*MAD/i) ||
    text.match(/-\s*([\d]+(?:\.\d+)?)\s*MAD\s*Airbnb fee/i) ||
    text.match(/([\d]+(?:\.\d+)?)\s*MAD\s*Airbnb fee/i);
  const host =
    text.match(/original price is\s*([\d]+(?:\.\d+)?)\s*MAD/i) ||
    text.match(/You earn[:\s]*([\d]+(?:\.\d+)?)\s*MAD/i);

  const feesMad = feesFromBreakdown ?? cleaningFee;
  const feesExplicit = feesFromBreakdown != null || cleaningFee != null;
  // Stay + cleaning seulement — la tourist tax est à part (souvent « remitted by host »)
  const paidMad =
    n(paid) ?? (stayMad != null && feesMad != null ? round2(stayMad + feesMad) : undefined);

  return {
    paidMad,
    roomRemarksMad: n(room),
    commissionMad: n(commission) ?? feeFromBreakdown,
    hostPayoutMad: n(host),
    stayMad,
    feesMad,
    touristTaxMad,
    feesExplicit,
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
      touristTaxMad: 0,
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

  const sumChannelFeesBy = (predicate: (name: string) => boolean) => {
    const raw =
      channelBreakdown.ChannelTotalFeesTaxes?.ChannelTotalFeeTax ??
      channelBreakdown.ChannelTotalFeesTaxes;
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return arr.reduce((s: number, item: any) => {
      const a = num(item?.['@_Amount'] ?? item?.Amount ?? item?.amount);
      const cur = String(item?.['@_Currency'] ?? item?.Currency ?? item?.currency ?? 'MAD').toUpperCase();
      const name = String(item?.['@_Name'] ?? item?.Name ?? '');
      if (cur !== 'MAD' || a <= 0) return s;
      return predicate(name) ? s + a : s;
    }, 0);
  };
  const channelCleaningMad = sumChannelFeesBy((name) => /clean|ménage|entretien/i.test(name));
  const channelTouristTaxMad = sumChannelFeesBy((name) =>
    /tourist\s*tax|taxe de séjour|city tax|séjour/i.test(name),
  );

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

  // ── Airbnb ──────────────────────────────────────────────────
  // Montant fee = Comments / guest−net ; % affiché = 15,5 % fixe (pas le ratio effectif).
  if (
    isAirbnbChannel(r) ||
    airbnb.commissionMad != null ||
    airbnb.hostPayoutMad != null ||
    airbnb.stayMad != null
  ) {
    const stayMad = airbnb.stayMad ?? (channelRent > 0 && channelTotalCur === 'MAD' ? channelRent : 0);
    // Ménage : Comments explicites (y compris 0) > CLEANING channel — JAMAIS le résidu guest−stay
    const feesMad =
      airbnb.feesExplicit && airbnb.feesMad != null
        ? airbnb.feesMad
        : airbnb.feesMad != null && airbnb.feesMad > 0
          ? airbnb.feesMad
          : channelCleaningMad;
    const touristTaxMad = airbnb.touristTaxMad ?? channelTouristTaxMad;

    let guestPaidMad = 0;
    if (channelTotalRaw > 0 && channelTotalCur === 'MAD') guestPaidMad = channelTotalRaw;
    else if (airbnb.paidMad != null && touristTaxMad > 0) {
      guestPaidMad = round2(airbnb.paidMad + touristTaxMad);
    } else if (airbnb.paidMad) guestPaidMad = airbnb.paidMad;
    else if (alreadyPaid > 0) guestPaidMad = alreadyPaid;
    else if (totalPrice > 0) guestPaidMad = totalPrice;

    const commissionMad =
      airbnb.commissionMad != null
        ? airbnb.commissionMad
        : airbnb.hostPayoutMad != null && guestPaidMad > 0
          ? round2(guestPaidMad - airbnb.hostPayoutMad)
          : storedCommission > 0
            ? storedCommission
            : 0;
    // Net hôte = original price Comments (pas guest−commission si guest inclut tourist tax)
    const netHostMad =
      airbnb.hostPayoutMad != null
        ? airbnb.hostPayoutMad
        : stayMad > 0 && feesMad >= 0 && commissionMad > 0
          ? round2(stayMad + feesMad - commissionMad)
          : totalPrice;

    const { hostFeeMad, hostFeeVatMad } = splitAirbnbHostFeeVat(commissionMad);
    return {
      guestPaidMad: guestPaidMad || round2(stayMad + feesMad + touristTaxMad),
      commissionMad,
      netHostMad,
      commissionPct: AIRBNB_HOST_FEE_PCT,
      stayMad,
      feesMad,
      touristTaxMad,
      hostFeeMad,
      hostFeeVatMad,
      source: airbnb.commissionMad != null || airbnb.hostPayoutMad != null ? 'airbnb-comments' : 'otaCommission',
      note: 'Montants Airbnb (Comments) — host fee 15,5 % + Moroccan Airbnb TVA 20 %',
      commissionHint: 'Host fee 15,5 % + Moroccan Airbnb TVA 20 %',
    };
  }

  // ── Booking.com : guest/stay depuis canal, commission TOUJOURS recalculée ──
  const bookingChannel = isBookingChannel(r);
  if (bookingChannel && (booking.roomPriceEur != null || channelTotalRaw > 0 || alreadyPaid > 0)) {
    const guestEur =
      booking.paidEur ??
      (channelTotalRaw > 0 && channelTotalCur === 'EUR' ? channelTotalRaw : 0);
    let rate = 0;
    if (guestEur > 0 && alreadyPaid > 0) rate = alreadyPaid / guestEur;
    else if (booking.roomPriceEur && totalPrice > 0) {
      const rr = totalPrice / booking.roomPriceEur;
      if (rr >= 8 && rr <= 13) rate = rr;
    }
    if (!(rate > 0)) rate = 10;

    const guestPaidMad =
      guestEur > 0 ? round2(guestEur * rate) : alreadyPaid > 0 ? alreadyPaid : 0;
    const stayMad = booking.roomPriceEur ? round2(booking.roomPriceEur * rate) : 0;
    const cleaningEur =
      booking.cleaningEur ?? sumIncludedCleaningEur(channelBreakdown);
    const feesMad = cleaningEur > 0 ? round2(cleaningEur * rate) : 0;

    // Jamais le montant Comments/RU — toujours recalcul %
    const commissionMad =
      guestPaidMad > 0
        ? round2((guestPaidMad * BOOKING_COMMISSION_PCT) / 100)
        : 0;
    const netHostMad =
      guestPaidMad > 0 && commissionMad > 0
        ? round2(guestPaidMad - commissionMad)
        : stayMad;

    return {
      guestPaidMad,
      commissionMad,
      netHostMad,
      commissionPct: BOOKING_COMMISSION_PCT,
      stayMad,
      feesMad,
      touristTaxMad: 0,
      source: 'booking-calculated',
      note: `Commission Booking toujours recalculée (${BOOKING_COMMISSION_PCT} %)`,
      commissionHint: `Calculée ${BOOKING_COMMISSION_PCT} % du guest OTA`,
    };
  }

  // Guest fallback (hors Booking)
  let guestPaidMad = 0;
  if (channelTotalRaw > 0 && channelTotalCur === 'MAD') guestPaidMad = channelTotalRaw;
  else if (alreadyPaid > 0) guestPaidMad = alreadyPaid;
  else if (totalPrice > 0) guestPaidMad = totalPrice;

  let stayMad = channelRent > 0 && channelTotalCur === 'MAD' ? channelRent : 0;
  let feesMad = channelCleaningMad;
  const touristTaxMad = channelTouristTaxMad;

  if (guestPaidMad > 0 && storedCommission > 0) {
    const netHostMad =
      totalPrice > 0 && totalPrice < guestPaidMad
        ? totalPrice
        : round2(guestPaidMad - storedCommission);
    if (!stayMad && feesMad && guestPaidMad > feesMad) stayMad = round2(guestPaidMad - feesMad);
    // Ne pas inventer ménage = guest − stay (peut être une taxe)
    return {
      guestPaidMad,
      commissionMad: storedCommission,
      netHostMad,
      commissionPct: Math.round((storedCommission / guestPaidMad) * 1000) / 10,
      stayMad,
      feesMad,
      touristTaxMad,
      source: channelTotalRaw > 0 ? 'channel-breakdown' : 'otaCommission',
      note: 'Guest payé − net hôte',
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
    touristTaxMad,
    source: 'fallback',
  };
}
