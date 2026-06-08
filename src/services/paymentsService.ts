import reservationsService from './reservationsService';

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

function extractIdDemande(events: NapsPaymentEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]?.idDemande) return String(events[i].idDemande);
  }
  return null;
}

function isCardPayment(r: Record<string, unknown>): boolean {
  const link = r.paymentLink as string | undefined;
  const events = r.napsPaymentEvents as unknown[] | undefined;
  const payload = r.napsPayload;
  const method = String(r.paymentMethod || '');
  const type = String(r.paymentType || '');
  return (
    Boolean(link) ||
    (Array.isArray(events) && events.length > 0) ||
    Boolean(payload) ||
    type === 'bank_card' ||
    /card|naps|cb|bank/i.test(method)
  );
}

export function mapReservationToPaymentRow(r: Record<string, unknown>): PaymentAuditRow {
  const events = (r.napsPaymentEvents || []) as NapsPaymentEvent[];
  const payload = (r.napsPayload || null) as Record<string, unknown> | null;
  const lastError = (r.lastNapsError || null) as Record<string, unknown> | null;
  const listingRaw = r.listing as { _id?: string; name?: string; city?: string } | undefined;
  const sojori = r.sojoriId as { _id?: string; name?: string; city?: string } | string | undefined;
  const listing =
    listingRaw?.name != null
      ? { _id: String(listingRaw._id || ''), name: listingRaw.name, city: listingRaw.city }
      : typeof sojori === 'object' && sojori?.name
        ? { _id: String(sojori._id || ''), name: sojori.name, city: sojori.city }
        : null;

  return {
    _id: String(r._id || r.id || ''),
    reservationNumber: String(r.reservationNumber || ''),
    guestName: String(r.guestName || ''),
    guestEmail: r.guestEmail as string | undefined,
    phone: r.phone as string | undefined,
    channelName: r.channelName as string | undefined,
    status: String(r.status || ''),
    atSojori: r.atSojori as boolean | undefined,
    listing,
    dates: {
      createdAt: String(r.createdAt || ''),
      arrival: String(r.arrivalDate || ''),
      departure: String(r.departureDate || ''),
    },
    pricing: {
      total: Number(r.totalPrice || 0),
      paid: Number(r.alreadyPaid || 0),
      currency: String(r.currency || 'MAD'),
    },
    payment: {
      status: String(r.paymentStatus || ''),
      method: (r.paymentMethod as string | null) ?? null,
      type: (r.paymentType as string | null) ?? null,
      link: (r.paymentLink as string | null) ?? null,
      returnBase: (r.guestPaymentReturnBase as string | null) ?? null,
      redirectSuccess: Boolean(r.paymentRedirectToSuccess),
      redirectFail: Boolean(r.paymentRedirectToFail),
    },
    naps: {
      idDemande: extractIdDemande(events),
      lastError,
      payload,
      events,
      token: (payload?.token as string | undefined) ?? null,
      signature: (payload?.signature as string | undefined) ?? null,
      idcommande: (payload?.idcommande as string | undefined) ?? String(r.reservationNumber || '') ?? null,
      numTrans: (payload?.numTrans as string | undefined) ?? null,
      numAuto: (payload?.numAuto as string | undefined) ?? null,
      repauto: (payload?.repauto as string | undefined) ?? (lastError?.repauto as string | undefined) ?? null,
      repautoMessage:
        (payload?.repautoMessage as string | undefined) ??
        (lastError?.message as string | undefined) ??
        null,
      carte: (payload?.carte as string | undefined) ?? null,
      typecarte: (payload?.typecarte as string | undefined) ?? null,
      montant: (payload?.montant as string | undefined) ?? null,
    },
    paymentStatusTimes: (r.paymentStatusTimes as unknown[]) || [],
  };
}

class PaymentsService {
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

    const res = await reservationsService.getList({
      page: params.page ?? 0,
      limit: params.limit ?? 100,
      dateType: 'creation',
      startDate: start,
      endDate: end,
      status: 'Pending,Confirmed,Inside,Completed,CancelledByAdmin,cancelled',
    });

    let rows = (res.data || []).map((r) =>
      mapReservationToPaymentRow(r as unknown as Record<string, unknown>),
    );

    if (params.paymentStatus) {
      const allowed = new Set(
        params.paymentStatus.split(',').map((s) => s.trim().toLowerCase()),
      );
      rows = rows.filter((r) => allowed.has(r.payment.status.toLowerCase()));
    }

    if (params.reservationNumber?.trim()) {
      const q = params.reservationNumber.trim().toLowerCase();
      rows = rows.filter((r) => r.reservationNumber.toLowerCase().includes(q));
    }

    if (params.cardOnly) {
      rows = rows.filter(
        (r) =>
          isCardPayment({
            paymentLink: r.payment.link,
            napsPaymentEvents: r.naps.events,
            napsPayload: r.naps.payload,
            paymentMethod: r.payment.method,
            paymentType: r.payment.type,
          }) ||
          (r.atSojori && r.payment.status.toLowerCase() === 'unpaid'),
      );
    }

    return {
      success: true,
      data: rows,
      total: rows.length,
      count: rows.length,
    };
  }

  /** Détail complet NAPS (napsPayload + events) via GET by-id */
  async getDetail(reservationId: string): Promise<PaymentAuditRow | null> {
    const reservation = await reservationsService.getByRouteParam(reservationId);
    if (!reservation) return null;
    return mapReservationToPaymentRow(reservation as unknown as Record<string, unknown>);
  }
}

const paymentsService = new PaymentsService();
export default paymentsService;
