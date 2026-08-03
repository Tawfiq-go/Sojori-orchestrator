/**
 * Finance canal (Airbnb / Booking via RU) — montants affichés côté PM / rapports.
 *
 * Airbnb — 3 régimes observés (audit Moncef + Amine Aitlagdif, 2026-07/08) :
 * - host_15_5 : ~15,5 % sur stay+ménage, SANS TVA marocaine (avant bascule juillet)
 * - host_15_5_plus_tva : ~18,6 % = 15,5 % × 1,20 (host-only + TVA sur fee)
 * - split_3 / split_3_plus_tva : ~3 % ou ~3,6 % (Guest Fee présent — co-hôte / split)
 *
 * Montants : Comments RU (stay, ménage, fee, original price) — pas inventés.
 * Ne plus hardcoder « 15,5 % » ni forcer commission÷1,2 sur toutes les résas.
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

/** Host service fee Airbnb (host-only, hors TVA). */
export const AIRBNB_HOST_FEE_PCT = 15.5;

/** Host fee split (co-host / split fee). */
export const AIRBNB_SPLIT_HOST_FEE_PCT = 3;

/**
 * TVA Maroc sur host fee Airbnb (quand incluse dans la commission Comments).
 * 15,5 % × 1,20 = 18,6 % effectif sur stay+ménage.
 */
export const AIRBNB_HOST_FEE_VAT_PCT = 20;

/** Commission Booking toujours recalculée (pas le montant canal). */
export const BOOKING_COMMISSION_PCT = 15;

export type AirbnbFeeModel =
  | 'host_15_5'
  | 'host_15_5_plus_tva'
  | 'split_3'
  | 'split_3_plus_tva'
  | 'unknown';

export interface ChannelStayFinance {
  guestPaidMad: number;
  commissionMad: number;
  netHostMad: number;
  /** % host fee HT affiché (15.5 ou 3) */
  commissionPct: number;
  stayMad: number;
  /** Ménage / cleaning inclus (0 si Comments disent 0 fees) */
  feesMad: number;
  /** Taxe de séjour / Tourist Tax — ne jamais afficher comme ménage */
  touristTaxMad: number;
  /** Airbnb : part host fee HT */
  hostFeeMad?: number;
  /** Airbnb Maroc : TVA 20 % sur host fee — seulement si régime + TVA */
  hostFeeVatMad?: number;
  /** Airbnb : Guest service fee (payé client, pas déduit hôte) */
  guestServiceFeeMad?: number;
  /** Airbnb : TVA voyageur (pays) — ≠ Moroccan TVA */
  guestVatMad?: number;
  /** Régime détecté */
  feeModel?: AirbnbFeeModel;
  /** Libellé ligne host fee (ex. « Host fee 3 % ») */
  hostFeeLabel?: string;
  /** Libellé ligne TVA marocaine — absent si pas de TVA */
  hostFeeVatLabel?: string;
  source: ChannelFinanceSource;
  note?: string;
  /** Libellé court sous le KPI commission */
  commissionHint?: string;
}

/** Découpe commission Airbnb = host fee HT + TVA 20 % (somme = commission). */
export function splitAirbnbHostFeeVat(commissionMad: number): {
  hostFeeMad: number;
  hostFeeVatMad: number;
} {
  if (!(commissionMad > 0)) return { hostFeeMad: 0, hostFeeVatMad: 0 };
  const hostFeeMad = round2(commissionMad / (1 + AIRBNB_HOST_FEE_VAT_PCT / 100));
  const hostFeeVatMad = round2(commissionMad - hostFeeMad);
  return { hostFeeMad, hostFeeVatMad };
}

/**
 * Détecte le régime Airbnb à partir du % effectif sur stay+ménage
 * et de la présence d'un Guest Fee (split).
 */
export function detectAirbnbFeeModel(opts: {
  stayMad: number;
  feesMad: number;
  commissionMad: number;
  hasGuestFee: boolean;
}): AirbnbFeeModel {
  const base = (opts.stayMad || 0) + (opts.feesMad || 0);
  const fee = opts.commissionMad || 0;
  if (!(base > 0) || !(fee > 0)) return 'unknown';
  const pctTtc = (fee / base) * 100;

  if (opts.hasGuestFee || (pctTtc >= 2.4 && pctTtc <= 4.5)) {
    return pctTtc <= 3.25 ? 'split_3' : 'split_3_plus_tva';
  }
  if (pctTtc >= 14.5 && pctTtc <= 16.3) return 'host_15_5';
  if (pctTtc >= 17.5 && pctTtc <= 19.8) return 'host_15_5_plus_tva';
  return 'unknown';
}

/** Ventile commission + libellés selon le régime (pas de TVA fantôme). */
export function resolveAirbnbHostFeeParts(
  commissionMad: number,
  feeModel: AirbnbFeeModel,
): {
  hostFeeMad: number;
  hostFeeVatMad: number;
  commissionPct: number;
  hostFeeLabel: string;
  hostFeeVatLabel?: string;
  commissionHint: string;
} {
  const hasVat =
    feeModel === 'host_15_5_plus_tva' || feeModel === 'split_3_plus_tva';
  const isSplit = feeModel === 'split_3' || feeModel === 'split_3_plus_tva';
  const commissionPct = isSplit ? AIRBNB_SPLIT_HOST_FEE_PCT : AIRBNB_HOST_FEE_PCT;
  const pctLabel = String(commissionPct).replace('.', ',');

  if (!(commissionMad > 0)) {
    return {
      hostFeeMad: 0,
      hostFeeVatMad: 0,
      commissionPct,
      hostFeeLabel: `Host fee ${pctLabel} %`,
      commissionHint: isSplit ? `Split ~${pctLabel} %` : `Host fee ${pctLabel} %`,
    };
  }

  if (hasVat) {
    const { hostFeeMad, hostFeeVatMad } = splitAirbnbHostFeeVat(commissionMad);
    return {
      hostFeeMad,
      hostFeeVatMad,
      commissionPct,
      hostFeeLabel: `Host fee ${pctLabel} %`,
      hostFeeVatLabel: 'Moroccan Airbnb TVA 20 %',
      commissionHint: `Host fee ${pctLabel} % + Moroccan Airbnb TVA 20 %`,
    };
  }

  // Régime sans TVA : toute la commission = host fee HT (pas de split ÷1.2)
  return {
    hostFeeMad: round2(commissionMad),
    hostFeeVatMad: 0,
    commissionPct,
    hostFeeLabel: `Host fee ${pctLabel} %`,
    commissionHint: isSplit
      ? `Split fee ~${pctLabel} % (sans TVA marocaine)`
      : `Host fee ${pctLabel} % (sans TVA marocaine)`,
  };
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function commentsBlob(r: Record<string, unknown>): string {
  return [r.comments, r.notes, r.roomRemarks]
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

/** Guest Fee + TVA voyageur depuis ChannelBreakdown (≠ host fee / Moroccan TVA). */
export function sumAirbnbGuestExtrasFromBreakdown(channelBreakdown: Record<string, any>): {
  guestServiceFeeMad: number;
  guestVatMad: number;
  hasGuestFee: boolean;
} {
  const raw =
    channelBreakdown?.ChannelTotalFeesTaxes?.ChannelTotalFeeTax ||
    channelBreakdown?.ChannelTotalFeesTaxes;
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  let guestServiceFeeMad = 0;
  let guestVatMad = 0;
  for (const item of arr) {
    const a = num(item?.['@_Amount'] ?? item?.Amount ?? item?.amount);
    const cur = String(item?.['@_Currency'] ?? item?.Currency ?? item?.currency ?? 'MAD').toUpperCase();
    const name = String(item?.['@_Name'] ?? item?.Name ?? '');
    if (cur !== 'MAD' || a <= 0) continue;
    if (/guest\s*fee/i.test(name)) guestServiceFeeMad += a;
    else if (/^VAT\b|\bTVA\b/i.test(name) && !/clean|ménage|tourist|séjour/i.test(name)) {
      guestVatMad += a;
    }
  }
  return {
    guestServiceFeeMad: round2(guestServiceFeeMad),
    guestVatMad: round2(guestVatMad),
    hasGuestFee: guestServiceFeeMad > 0,
  };
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

/** Montants EUR Booking.com (BOOKING NOTE / original price / remarks). */
export function parseBookingFinanceFromComments(comments: unknown): {
  roomPriceEur?: number;
  guestTotalEur?: number;
  commissionEur?: number;
  paidEur?: number;
  cleaningEur?: number;
  /** « The original price is 1283.25 EUR » — courant RU sans BOOKING NOTE */
  originalPriceEur?: number;
} {
  const text = String(comments || '')
    .replace(/&#xD;/gi, '\n')
    .replace(/&amp;/g, '&');

  const n = (m: RegExpMatchArray | null, idx = 1) => {
    if (!m) return undefined;
    const v = Number(m[idx]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };

  const originalPriceEur = n(
    text.match(/original price is\s*([\d]+(?:\.\d+)?)\s*EUR/i) ||
      text.match(/([\d]+(?:\.\d+)?)\s*EUR\s*OVERBOOKING/i) ||
      text.match(/Room remarks:\s*([\d]+(?:\.\d+)?)\s*EUR/i),
  );

  return {
    roomPriceEur: n(text.match(/Room price:\s*([\d]+(?:\.\d+)?)\s*EUR/i)) ?? originalPriceEur,
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
    originalPriceEur,
  };
}

export type ResolveChannelFinanceOptions = {
  /** Taux admin EUR→MAD (currencies.madRate). Obligatoire pour Booking EUR→MAD. */
  eurMadRate?: number;
};

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
 * Booking : toujours affiché en MAD via `opts.eurMadRate` (admin currencies.madRate).
 */
export function resolveChannelStayFinance(
  r: Record<string, unknown> | null | undefined,
  opts?: ResolveChannelFinanceOptions,
): ChannelStayFinance {
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

  const adminEurMadRate = (() => {
    const n = Number(opts?.eurMadRate);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();

  const blob = commentsBlob(r);
  const airbnb = parseAirbnbFinanceFromComments(blob);
  const booking = parseBookingFinanceFromComments(blob);
  const rb = (r.reservationBreakdown || {}) as Record<string, any>;
  const nb = rb.normalizedBreakdown || {};
  const channelBreakdown = rb.ChannelBreakdown || {};
  const ruBreakdown = rb.RUBreakdown || {};

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

  // ── Airbnb ──────────────────────────────────────────────────
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
    const extras = sumAirbnbGuestExtrasFromBreakdown(channelBreakdown);

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

    // Base fee = stay+ménage ; si Comments incomplets, host+commission
    const feeBaseStay = stayMad > 0 ? stayMad : 0;
    const feeBaseFees = feesMad >= 0 && stayMad > 0 ? feesMad : 0;
    let detectStay = feeBaseStay;
    let detectFees = feeBaseFees;
    if (!(detectStay > 0) && airbnb.hostPayoutMad != null && commissionMad > 0) {
      detectStay = round2(airbnb.hostPayoutMad + commissionMad);
      detectFees = 0;
    }

    const feeModel = detectAirbnbFeeModel({
      stayMad: detectStay,
      feesMad: detectFees,
      commissionMad,
      hasGuestFee: extras.hasGuestFee,
    });
    const parts = resolveAirbnbHostFeeParts(commissionMad, feeModel);

    return {
      guestPaidMad: guestPaidMad || round2(stayMad + feesMad + touristTaxMad),
      commissionMad,
      netHostMad,
      commissionPct: parts.commissionPct,
      stayMad,
      feesMad,
      touristTaxMad,
      hostFeeMad: parts.hostFeeMad > 0 ? parts.hostFeeMad : undefined,
      hostFeeVatMad: parts.hostFeeVatMad > 0 ? parts.hostFeeVatMad : undefined,
      guestServiceFeeMad: extras.guestServiceFeeMad > 0 ? extras.guestServiceFeeMad : undefined,
      guestVatMad: extras.guestVatMad > 0 ? extras.guestVatMad : undefined,
      feeModel,
      hostFeeLabel: parts.hostFeeLabel,
      hostFeeVatLabel: parts.hostFeeVatLabel,
      source: airbnb.commissionMad != null || airbnb.hostPayoutMad != null ? 'airbnb-comments' : 'otaCommission',
      note: parts.commissionHint,
      commissionHint: parts.commissionHint,
    };
  }

  // ── Booking.com : EUR canal → MAD (taux admin) ; commission TOUJOURS recalculée ──
  const bookingChannel = isBookingChannel(r);
  const ruTotalRaw = num(ruBreakdown.Total);
  const hasBookingEurSignal =
    booking.roomPriceEur != null ||
    booking.guestTotalEur != null ||
    booking.paidEur != null ||
    booking.originalPriceEur != null ||
    (bookingChannel && (channelTotalRaw > 0 || ruTotalRaw > 0 || alreadyPaid > 0 || totalPrice > 0));

  if (bookingChannel && hasBookingEurSignal) {
    // Priorité montant EUR réel (Comments / Channel / RU) — jamais sojoriPriceTotal
    let guestEur =
      booking.paidEur ??
      booking.guestTotalEur ??
      booking.originalPriceEur ??
      booking.roomPriceEur ??
      0;
    if (!(guestEur > 0) && channelTotalRaw > 0 && channelTotalCur === 'EUR') {
      guestEur = channelTotalRaw;
    }
    if (!(guestEur > 0) && totalPrice > 0 && /original price is\s*[\d.]+\s*EUR/i.test(blob)) {
      guestEur = totalPrice;
    }
    if (!(guestEur > 0) && ruTotalRaw > 0 && /EUR/i.test(blob)) {
      guestEur = ruTotalRaw;
    }
    if (!(guestEur > 0) && channelTotalRaw > 0) {
      guestEur = channelTotalRaw;
    }

    const roomEur = booking.roomPriceEur ?? booking.originalPriceEur ?? guestEur;

    // Taux : TOUJOURS admin currencies.madRate (jamais inventé depuis sojoriPriceTotal)
    const rate =
      adminEurMadRate > 0
        ? adminEurMadRate
        : alreadyPaid > 0 && guestEur > 0 && alreadyPaid / guestEur >= 8 && alreadyPaid / guestEur <= 18
          ? alreadyPaid / guestEur
          : 10.67;

    // alreadyPaid déjà en MAD seulement si nettement > EUR × ~2 (sinon c’est encore de l’EUR)
    const alreadyPaidLooksMad = alreadyPaid > 0 && guestEur > 0 && alreadyPaid > guestEur * 2;

    const guestPaidMad =
      guestEur > 0
        ? round2(guestEur * rate)
        : alreadyPaidLooksMad
          ? alreadyPaid
          : alreadyPaid > 0
            ? round2(alreadyPaid * rate)
            : 0;

    const stayTotalMad = roomEur > 0 ? round2(roomEur * rate) : guestPaidMad;
    const ruCleaning = (() => {
      const fee = ruBreakdown?.TotalFeesTaxes?.TotalFeeTax;
      const arr = Array.isArray(fee) ? fee : fee ? [fee] : [];
      return arr.reduce((s: number, item: any) => {
        const name = String(item?.['@_Name'] ?? item?.Name ?? '');
        const a = num(item?.['@_Amount'] ?? item?.Amount);
        if (a > 0 && /clean/i.test(name)) return s + a;
        return s;
      }, 0);
    })();
    const cleaningEur =
      booking.cleaningEur ??
      (sumIncludedCleaningEur(channelBreakdown) || 0) ||
      ruCleaning ||
      0;
    const feesMad = cleaningEur > 0 ? round2(cleaningEur * rate) : 0;
    // Hébergement = total room − ménage (si ménage inclus dans original price)
    const stayMad =
      feesMad > 0 && stayTotalMad > feesMad ? round2(stayTotalMad - feesMad) : stayTotalMad;

    const commissionMad =
      guestPaidMad > 0 ? round2((guestPaidMad * BOOKING_COMMISSION_PCT) / 100) : 0;
    const netHostMad =
      guestPaidMad > 0 && commissionMad > 0
        ? round2(guestPaidMad - commissionMad)
        : stayMad > 0
          ? stayMad
          : 0;

    const rateLabel = String(rate).replace('.', ',');
    return {
      guestPaidMad,
      commissionMad,
      netHostMad,
      commissionPct: BOOKING_COMMISSION_PCT,
      stayMad,
      feesMad,
      touristTaxMad: 0,
      source: 'booking-calculated',
      note: `EUR→MAD × ${rateLabel} (admin) · commission ${BOOKING_COMMISSION_PCT} %`,
      commissionHint: `${BOOKING_COMMISSION_PCT} % × guest OTA (taux admin ${rateLabel})`,
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
