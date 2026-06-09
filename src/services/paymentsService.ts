import apiClient from './apiClient';
import reservationsService from './reservationsService';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4007';

export type NapsPaymentEvent = {
  at: string;
  phase: string;
  source: string;
  outcome: string;
  repauto?: string;
  repautoMessage?: string;
  repautoUserMessage?: string;
  montant?: string;
  typecarte?: string;
  carte?: string;
  numTrans?: string;
  numAuto?: string;
  idDemande?: string;
  note?: string;
};

export type PaymentAuditRow = {
  _id: string;
  reservationNumber: string;
  guestName: string;
  guestEmail?: string;
  phone?: string;
  channelName?: string;
  status: string;
  atSojori?: boolean;
  listing: { _id: string; name: string; city?: string } | null;
  dates: {
    createdAt: string;
    arrival: string;
    departure: string;
  };
  pricing: {
    total: number;
    paid: number;
    currency: string;
  };
  payment: {
    status: string;
    method?: string | null;
    type?: string | null;
    link?: string | null;
    returnBase?: string | null;
    redirectSuccess: boolean;
    redirectFail: boolean;
  };
  naps: {
    idDemande: string | null;
    lastError: Record<string, unknown> | null;
    payload: Record<string, unknown> | null;
    events: NapsPaymentEvent[];
    eventsCount?: number;
    hasPayload?: boolean;
    token: string | null;
    signature: string | null;
    idcommande: string | null;
    numTrans: string | null;
    numAuto: string | null;
    repauto: string | null;
    repautoMessage: string | null;
    carte: string | null;
    typecarte: string | null;
    montant: string | null;
  };
  paymentStatusTimes: unknown[];
};

function normalizePaymentRow(raw: Record<string, unknown>): PaymentAuditRow {
  const listingRaw = raw.listing as PaymentAuditRow['listing'];
  const dates = (raw.dates || {}) as PaymentAuditRow['dates'];
  const pricing = (raw.pricing || {}) as PaymentAuditRow['pricing'];
  const payment = (raw.payment || {}) as PaymentAuditRow['payment'];
  const naps = (raw.naps || {}) as PaymentAuditRow['naps'];

  return {
    _id: String(raw._id || ''),
    reservationNumber: String(raw.reservationNumber || ''),
    guestName: String(raw.guestName || ''),
    guestEmail: raw.guestEmail as string | undefined,
    phone: raw.phone as string | undefined,
    channelName: raw.channelName as string | undefined,
    status: String(raw.status || ''),
    atSojori: raw.atSojori as boolean | undefined,
    listing: listingRaw
      ? {
          _id: String(listingRaw._id || ''),
          name: String(listingRaw.name || ''),
          city: listingRaw.city,
        }
      : null,
    dates: {
      createdAt: String(dates.createdAt || ''),
      arrival: String(dates.arrival || ''),
      departure: String(dates.departure || ''),
    },
    pricing: {
      total: Number(pricing.total || 0),
      paid: Number(pricing.paid || 0),
      currency: String(pricing.currency || 'MAD'),
    },
    payment: {
      status: String(payment.status || ''),
      method: (payment.method as string | null) ?? null,
      type: (payment.type as string | null) ?? null,
      link: (payment.link as string | null) ?? null,
      returnBase: (payment.returnBase as string | null) ?? null,
      redirectSuccess: Boolean(payment.redirectSuccess),
      redirectFail: Boolean(payment.redirectFail),
    },
    naps: {
      idDemande: (naps.idDemande as string | null) ?? null,
      lastError: (naps.lastError as Record<string, unknown> | null) ?? null,
      payload: (naps.payload as Record<string, unknown> | null) ?? null,
      events: Array.isArray(naps.events) ? (naps.events as NapsPaymentEvent[]) : [],
      eventsCount: typeof naps.eventsCount === 'number' ? naps.eventsCount : undefined,
      hasPayload: naps.hasPayload === true,
      token: (naps.token as string | null) ?? null,
      signature: (naps.signature as string | null) ?? null,
      idcommande: (naps.idcommande as string | null) ?? null,
      numTrans: (naps.numTrans as string | null) ?? null,
      numAuto: (naps.numAuto as string | null) ?? null,
      repauto: (naps.repauto as string | null) ?? null,
      repautoMessage: (naps.repautoMessage as string | null) ?? null,
      carte: (naps.carte as string | null) ?? null,
      typecarte: (naps.typecarte as string | null) ?? null,
      montant: (naps.montant as string | null) ?? null,
    },
    paymentStatusTimes: Array.isArray(raw.paymentStatusTimes) ? raw.paymentStatusTimes : [],
  };
}

class PaymentsService {
  /** GET /api/v1/reservations/reservations/payments — filtre + pagination côté Mongo */
  async getList(params: {
    page?: number;
    limit?: number;
    paymentStatus?: string;
    reservationNumber?: string;
    cardOnly?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: PaymentAuditRow[]; total: number; count: number }> {
    const end = params.endDate || new Date().toISOString().slice(0, 10);
    const start =
      params.startDate ||
      new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const query = new URLSearchParams({
      page: String(params.page ?? 0),
      limit: String(params.limit ?? 50),
      startDate: start,
      endDate: end,
      cardOnly: params.cardOnly === false ? 'false' : 'true',
      compact: 'true',
    });
    if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
    if (params.reservationNumber?.trim()) {
      query.set('reservationNumber', params.reservationNumber.trim());
    }

    const url = `${BASE_URL}/api/v1/reservations/reservations/payments?${query.toString()}`;
    const headers: Record<string, string> = {};
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]');
    const devToken = import.meta.env.VITE_DEV_TOKEN;
    if (isLocalhost && devToken) headers['X-Dev-Token'] = String(devToken);

    const response = await apiClient.get(url, { headers });
    const payload = response.data as {
      success?: boolean;
      data?: Record<string, unknown>[];
      total?: number;
      count?: number;
    };

    const rows = Array.isArray(payload.data)
      ? payload.data.map((r) => normalizePaymentRow(r))
      : [];

    return {
      success: payload.success !== false,
      data: rows,
      total: Number(payload.total ?? rows.length),
      count: Number(payload.count ?? rows.length),
    };
  }

  /** Détail complet si ligne liste incomplète */
  async getDetail(reservationId: string): Promise<PaymentAuditRow | null> {
    const reservation = await reservationsService.getByRouteParam(reservationId);
    if (!reservation) return null;
    const r = reservation as unknown as Record<string, unknown>;
    return normalizePaymentRow({
      _id: r._id || r.id,
      reservationNumber: r.reservationNumber,
      guestName: r.guestName,
      guestEmail: r.guestEmail,
      phone: r.phone,
      channelName: r.channelName,
      status: r.status,
      atSojori: r.atSojori,
      listing: r.listing || r.sojoriId,
      dates: {
        createdAt: r.createdAt,
        arrival: r.arrivalDate,
        departure: r.departureDate,
      },
      pricing: {
        total: r.totalPrice,
        paid: r.alreadyPaid,
        currency: r.currency,
      },
      payment: {
        status: r.paymentStatus,
        method: r.paymentMethod,
        type: r.paymentType,
        link: r.paymentLink,
        returnBase: r.guestPaymentReturnBase,
        redirectSuccess: r.paymentRedirectToSuccess,
        redirectFail: r.paymentRedirectToFail,
      },
      naps: {
        idDemande: null,
        lastError: r.lastNapsError,
        payload: r.napsPayload,
        events: r.napsPaymentEvents,
        token: (r.napsPayload as Record<string, unknown> | null)?.token,
        signature: (r.napsPayload as Record<string, unknown> | null)?.signature,
        idcommande: (r.napsPayload as Record<string, unknown> | null)?.idcommande,
        numTrans: (r.napsPayload as Record<string, unknown> | null)?.numTrans,
        numAuto: (r.napsPayload as Record<string, unknown> | null)?.numAuto,
        repauto: (r.napsPayload as Record<string, unknown> | null)?.repauto,
        repautoMessage: (r.napsPayload as Record<string, unknown> | null)?.repautoMessage,
        carte: (r.napsPayload as Record<string, unknown> | null)?.carte,
        typecarte: (r.napsPayload as Record<string, unknown> | null)?.typecarte,
        montant: (r.napsPayload as Record<string, unknown> | null)?.montant,
      },
      paymentStatusTimes: r.paymentStatusTimes,
    });
  }
}

const paymentsService = new PaymentsService();
export default paymentsService;
