import apiClient from '../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';

/**
 * Lecture des reservations pour la performance LCD.
 *
 * Un seul appel couvre toute la plage (passe + carnet a venir) : le decoupage
 * par mois se fait ici, en memoire. Appeler la generation de rapport P&L mois
 * par mois aurait persiste autant de rapports fantomes dans Finances.
 *
 * Contrairement a `fetchProfitReportReservations`, un echec n'est pas avale :
 * il remonte. Un ecran qui affiche 0 quand le calcul a echoue ne se distingue
 * pas d'un vrai zero — c'est le defaut qui rend les pages existantes
 * indignes de confiance.
 */

/** Une reservation, telle que la renvoie le service reservations. */
export type PerfReservation = {
  reservationNumber?: string;
  guestName?: string;
  listingId?: string;
  listingName?: string;
  arrivalDate?: string;
  departureDate?: string;
  nights?: number;
  channelName?: string;
  status?: string;
  grossRevenue?: number;
  accommodationAmount?: number;
  cleaningFee?: number;
  otaCommission?: number;
  netAfterOta?: number;
  currency?: string;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Un bien du parc, meme sans reservation sur la periode. */
export type PerfListing = { listingId: string; listingName: string };

export type PerfPayload = { reservations: PerfReservation[]; listings: PerfListing[] };

export async function fetchPerformanceReservations(params: {
  ownerId: string;
  from: string;
  to: string;
  listingIds?: string[];
}): Promise<PerfPayload> {
  const qs = new URLSearchParams({
    ownerId: params.ownerId,
    from: params.from.slice(0, 10),
    to: params.to.slice(0, 10),
  });
  if (params.listingIds?.length) qs.set('listingIds', params.listingIds.join(','));

  // Via srv-admin : `/api/v1/internal/*` de srv-reservations n'est pas expose
  // par l'ingress (404). srv-fulltask relaie, et est deja proxifie ici — c'est
  // le chemin qu'emprunte deja le rack de reception.
  const url = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/fulltask/performance/reservations?${qs}`;
  const { data } = await apiClient.get<{
    success?: boolean;
    error?: string;
    data?: Array<Record<string, unknown>>;
    listings?: Array<{ listingId?: unknown; listingName?: unknown }>;
  }>(url);

  // Volontairement bruyant : sans cela, une panne se lit « aucune activite ».
  if (!data?.success) throw new Error(data?.error || 'Reservations indisponibles');

  const listings = (data.listings ?? []).map((l) => ({
    listingId: String(l.listingId || ''),
    listingName: String(l.listingName || l.listingId || ''),
  }));

  const reservations = (data.data ?? []).map((r) => ({
    reservationNumber: r.reservationNumber ? String(r.reservationNumber) : undefined,
    guestName: r.guestName ? String(r.guestName) : undefined,
    listingId: r.listingId ? String(r.listingId) : undefined,
    listingName: r.listingName ? String(r.listingName) : undefined,
    arrivalDate: r.arrivalDate ? String(r.arrivalDate) : undefined,
    departureDate: r.departureDate ? String(r.departureDate) : undefined,
    nights: n(r.nights),
    channelName: r.channelName ? String(r.channelName) : undefined,
    status: r.status ? String(r.status) : undefined,
    grossRevenue: n(r.grossRevenue),
    accommodationAmount: n(r.accommodationAmount),
    cleaningFee: n(r.cleaningFee),
    otaCommission: n(r.otaCommission),
    netAfterOta: n(r.netAfterOta),
    currency: r.currency ? String(r.currency) : 'MAD',
  }));

  return { reservations, listings };
}
