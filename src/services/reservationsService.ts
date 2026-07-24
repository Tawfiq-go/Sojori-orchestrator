// ════════════════════════════════════════════════════════════════════
// Sojori — Reservations Service
// Service pour interagir avec srv-reservations (port 4007)
// Basé sur srv-reservations : GET /api/v1/reservations?… (query params)
// ════════════════════════════════════════════════════════════════════

import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type {
  Reservation,
  ReservationFilter,
  ReservationDetail,
  ReservationDetailResponse,
} from '../types/reservations.types';
import {
  getCachedReservationDetail,
  setCachedReservationDetail,
} from '../utils/reservationDetailCache';
import { appendFilterOwnerIdsToSearchParams } from '../utils/adminOwnerFilter.utils';

const RESERVATIONS_API = MICROSERVICE_BASE_URL.SRV_RESERVATION;

type ReservationsListPayload = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>[];
  unmappedReservation?: Record<string, unknown>[];
  total?: number;
  totalUnmapped?: number;
};

/** srv-reservations legacy : 404 + `{ message: "No data found", data: [] }` quand aucun résultat. */
function parseReservationsListPayload(
  status: number,
  body: ReservationsListPayload | undefined,
): { data: Reservation[]; total: number } {
  const legacyEmpty404 =
    status === 404 &&
    body &&
    (body.message === 'No data found' ||
      (body.success === false && Array.isArray(body.data)));

  if (legacyEmpty404) {
    return { data: [], total: typeof body.total === 'number' ? body.total : 0 };
  }

  const mapRow = (r: Record<string, unknown>) =>
    ({
      ...r,
      id: (r.id as string) || (r._id as string),
    }) as Reservation;

  const regular = (body?.data ?? []).map(mapRow);
  const unmapped = (body?.unmappedReservation ?? []).map((r) =>
    mapRow({ ...r, isUnmapped: true }),
  );
  const data = [...unmapped, ...regular];
  const total =
    typeof body?.total === 'number'
      ? body.total + (body.totalUnmapped ?? 0)
      : data.length;

  return { data, total };
}

/** ObjectId MongoDB 24 hex — sinon on traite le param route comme SJ-XX / numéro résa */
export function isMongoObjectId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id.trim());
}

class ReservationsService {
  private mapReservationToDetail(r: Reservation): ReservationDetail {
    const fmt = (d: Date | string | undefined | null): string => {
      if (!d) return 'N/A';
      try {
        const date = typeof d === 'string' ? new Date(d) : d;
        return date.toLocaleDateString('fr-FR');
      } catch (error) {
        return 'N/A';
      }
    };
    const adults = r.adults ?? 0;
    const children = r.children ?? 0;
    const infants = r.infants ?? 0;
    const reg = r.guestRegistration ?? r.police_registration;
    return {
      id: r.id,
      listing_name: String(r.sojoriId ?? r.listingMapId ?? 'Listing'),
      guest_name: r.guestName,
      guest_email: r.guestEmail ?? '',
      guest_phone: r.phone ?? '',
      guest_phone_whatsapp: r.phone ?? '',
      guest_language: r.guestLanguage ?? null,
      guest_country: r.guestCountry ?? null,
      ota: r.channelName ?? r.otaCode ?? 'Direct',
      arrival_date: fmt(r.arrivalDate),
      departure_date: fmt(r.departureDate),
      arrival_date_raw: r.arrivalDate,
      departure_date_raw: r.departureDate,
      nights: r.nights,
      guests: `${adults} adulte(s)${children ? `, ${children} enfant(s)` : ''}${infants ? `, ${infants} bébé(s)` : ''}`,
      adults,
      children: children || undefined,
      infants: infants || undefined,
      arrival_declared: r.actualArrivalTime ? 'Déclaré' : 'Pas déclaré',
      departure_declared: r.actualDepartureTime ? 'Déclaré' : 'Pas déclaré',
      total_price:
        r.totalPrice != null ? `${r.totalPrice} ${r.currency ?? 'EUR'}` : '—',
      already_paid: r.alreadyPaid,
      payment_status: r.paymentStatus ?? '',
      door_code: r.doorCode ?? '—',
      status: r.status,
      police_members: reg?.members?.length ?? 0,
      reservation_number: r.reservationNumber ?? r.id,
      channel_name: r.channelName ?? '',
    };
  }

  /**
   * GET /api/v1/reservations?dateType=arrival&startDate=...&endDate=...&limit=...&status=...
   * Récupère la liste des réservations avec filtres (authenticated with JWT)
   *
   * Chemin canonique : GET /api/v1/reservations?dateType=… (aligné sojori-dashboard).
   */
  async getList(params: {
    filter?: ReservationFilter;
    page?: number;
    limit?: number;
    status?: string; // Ex: 'Confirmed,Pending' ou 'CancelledByAdmin,cancelled'
    /** Fenêtre calendrier explicite (prioritaire sur filter) */
    dateType?: 'arrival' | 'departure' | 'arrival_or_departure' | 'creation';
    startDate?: string;
    endDate?: string;
    reservationNumber?: string;
    sortField?: 'createdAt' | 'checkin' | 'checkout';
    sortOrder?: 'asc' | 'desc';
    /** Admin : filtre par PM (backend: filterOwnerId répété). */
    filterOwnerId?: string | string[];
    ownerId?: string | null;
    /**
     * Analytics Hostaway : ne pas élargir la fenêtre aux cancellationDate
     * (sinon check-in octobre + annulé en juillet pollue juillet).
     */
    strictArrivalWindow?: boolean;
  }): Promise<{ success: boolean; data: Reservation[]; count: number; total: number }> {
    try {
      const queryParams = new URLSearchParams();

      if (params.dateType && params.startDate && params.endDate) {
        queryParams.append('dateType', params.dateType);
        queryParams.append('startDate', params.startDate);
        queryParams.append('endDate', params.endDate);
      } else if (params.filter) {
        const { dateType, startDate, endDate } = this.filterToDateRange(params.filter);
        queryParams.append('dateType', dateType);
        queryParams.append('startDate', startDate);
        queryParams.append('endDate', endDate);
      }

      if (params.strictArrivalWindow) {
        queryParams.append('strictArrivalWindow', 'true');
      }

      if (params.page != null) {
        queryParams.append('page', String(params.page));
      }

      // Backend cap à 100 — défaut liste = 100
      const limit = Math.min(params.limit ?? 100, 100);
      queryParams.append('limit', String(limit));

      // Ajouter status (filtrage backend comme legacy)
      if (params.status) {
        queryParams.append('status', params.status);
      }

      if (params.reservationNumber?.trim()) {
        queryParams.append('reservationNumber', params.reservationNumber.trim());
      }

      queryParams.append('sortField', params.sortField || 'createdAt');
      queryParams.append('sortOrder', params.sortOrder || 'desc');

      const ownerFilter = params.filterOwnerId
        ? Array.isArray(params.filterOwnerId)
          ? params.filterOwnerId
          : [params.filterOwnerId]
        : params.ownerId
          ? [params.ownerId]
          : [];
      appendFilterOwnerIdsToSearchParams(queryParams, ownerFilter);

      // Chemin canonique aligné dashboard : /api/v1/reservations/?…
      const url = `${RESERVATIONS_API}/?${queryParams.toString()}`;

      const headers: Record<string, string> = {};

      if (typeof window !== 'undefined') {
        const isLocalhost =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname === '0.0.0.0';

        if (isLocalhost && import.meta.env.VITE_DEV_TOKEN) {
          headers['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
          // Logs désactivés pour nettoyer la console
          // console.log('🔑 X-Dev-Token added to reservations request (fix 404)');
        }
      }

      // Legacy prod : 404 « No data found » jusqu’au déploiement getReservations → 200.
      const response = await apiClient.get(url, {
        headers,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      });

      const { data: reservations, total } = parseReservationsListPayload(
        response.status,
        response.data as ReservationsListPayload,
      );

      return {
        success: true,
        data: reservations,
        count: reservations.length,
        total,
      };
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  }


  /**
   * Helper: Convertit un ReservationFilter en dateType + dateRange
   */
  private filterToDateRange(filter: ReservationFilter): {
    dateType: 'arrival' | 'departure';
    startDate: string;
    endDate: string;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (filter) {
      case 'CHECKIN_TODAY':
        return {
          dateType: 'arrival',
          startDate: formatDate(today),
          endDate: formatDate(tomorrow),
        };
      case 'CHECKIN_TOMORROW':
        return {
          dateType: 'arrival',
          startDate: formatDate(tomorrow),
          endDate: formatDate(new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)),
        };
      case 'CHECKIN_7DAYS':
        return {
          dateType: 'arrival',
          startDate: formatDate(today),
          endDate: formatDate(in7Days),
        };
      case 'CHECKOUT_TODAY':
        return {
          dateType: 'departure',
          startDate: formatDate(today),
          endDate: formatDate(tomorrow),
        };
      case 'CHECKOUT_TOMORROW':
        return {
          dateType: 'departure',
          startDate: formatDate(tomorrow),
          endDate: formatDate(new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)),
        };
      case 'CHECKOUT_7DAYS':
        return {
          dateType: 'departure',
          startDate: formatDate(today),
          endDate: formatDate(in7Days),
        };
      default:
        return {
          dateType: 'arrival',
          startDate: formatDate(today),
          endDate: formatDate(tomorrow),
        };
    }
  }

  /**
   * Calcule les counts pour chaque filtre (appels séparés)
   * Note: Il n'y a pas d'endpoint unique pour les counts dans l'API publique, donc on fait 6 appels
   */
  async getCounts(): Promise<{
    CHECKIN_TODAY: number;
    CHECKIN_TOMORROW: number;
    CHECKIN_7DAYS: number;
    CHECKOUT_TODAY: number;
    CHECKOUT_TOMORROW: number;
    CHECKOUT_7DAYS: number;
  }> {
    try {
      const filters: ReservationFilter[] = [
        'CHECKIN_TODAY',
        'CHECKIN_TOMORROW',
        'CHECKIN_7DAYS',
        'CHECKOUT_TODAY',
        'CHECKOUT_TOMORROW',
        'CHECKOUT_7DAYS',
      ];

      const counts = await Promise.all(
        filters.map(async (filter) => {
          try {
            const result = await this.getList({ filter, limit: 1000 });
            return { filter, count: result.count };
          } catch (err) {
            console.error(`Error fetching count for ${filter}:`, err);
            return { filter, count: 0 };
          }
        })
      );

      return counts.reduce((acc, { filter, count }) => {
        acc[filter] = count;
        return acc;
      }, {} as any);
    } catch (error) {
      console.error('Error fetching counts:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/reservations/by-id/:id
   * Récupère le détail complet d'une réservation
   */
  /**
   * Résout une réservation depuis le paramètre de route `/reservations/:id`
   * — SJ-XXXXX via by-reservation-number, ObjectId via by-id
   */
  async getByRouteParam(
    routeId: string,
    opts?: { includeThreads?: boolean; skipCache?: boolean },
  ): Promise<Reservation> {
    const param = decodeURIComponent(routeId.trim());
    if (!param) {
      throw new Error('Identifiant de réservation manquant');
    }
    if (isMongoObjectId(param)) {
      return this.getById(param, opts);
    }
    const byNumber = await this.getByReservationNumber(param);
    if (byNumber) {
      return byNumber;
    }
    throw new Error(`Réservation introuvable : ${param}`);
  }

  async getById(
    reservationId: string,
    opts?: { includeThreads?: boolean; skipCache?: boolean; silent?: boolean },
  ): Promise<Reservation> {
    const startTime = performance.now();
    const cacheKey = reservationId.trim();

    if (!opts?.skipCache) {
      const cached = getCachedReservationDetail(cacheKey);
      if (cached) return cached;
    }

    try {
      const params = new URLSearchParams();
      if (opts?.includeThreads) {
        params.set('includeThreads', 'true');
        params.set('messagesLimit', '20');
      } else {
        params.set('includeThreads', 'false');
      }
      const qs = params.toString();
      const url = `${RESERVATIONS_API}/by-id/${reservationId}${qs ? `?${qs}` : ''}`;

      const response = await apiClient.get(url);

      const duration = performance.now() - startTime;
      if (import.meta.env.DEV && !opts?.silent) {
        console.log(`[ReservationsService] getById ${reservationId} in ${duration.toFixed(0)}ms`);
      }

      const reservation = response.data.reservation as Reservation;
      setCachedReservationDetail(cacheKey, reservation);
      return reservation;
    } catch (error) {
      if (!opts?.silent) {
        const duration = performance.now() - startTime;
        console.error(
          `[ReservationsService] ❌ Error fetching reservation ${reservationId} (${duration.toFixed(0)}ms):`,
          error,
        );
      }
      throw error;
    }
  }

  /**
   * GET /api/v1/reservations/batch?ids=id1,id2,id3
   * Récupère plusieurs réservations en 1 seul appel (optimisation performance)
   * @param ids Array of reservation IDs to fetch
   * @returns { success: boolean, data: Reservation[], notFound?: string[] }
   */
  async getBatch(
    ids: string[],
    opts?: { silent?: boolean },
  ): Promise<{ success: boolean; data: Reservation[]; notFound?: string[] }> {
    if (ids.length === 0) {
      return { success: true, data: [] };
    }

    const startTime = performance.now();
    if (!opts?.silent) {
      console.log(`[ReservationsService] 🚀 Batch fetching ${ids.length} reservations...`);
    }

    try {
      const url = `${RESERVATIONS_API}/batch?ids=${ids.join(',')}`;
      const response = await apiClient.get(url);

      const duration = performance.now() - startTime;
      const found = response.data.data?.length || 0;
      if (!opts?.silent) {
        console.log(
          `[ReservationsService] ✅ Batch fetched ${found}/${ids.length} reservations in ${duration.toFixed(0)}ms`,
        );
      }

      return {
        success: response.data.success ?? true,
        data: response.data.data || [],
        notFound: response.data.notFound,
      };
    } catch (error) {
      if (!opts?.silent) {
        const duration = performance.now() - startTime;
        console.error(`[ReservationsService] ❌ Error after ${duration.toFixed(0)}ms:`, error);
      }
      throw error;
    }
  }

  /**
   * Détail réservation pour pages séjour (mappe la réponse `getById`).
   */
  async getDetail(reservationId: string): Promise<ReservationDetailResponse> {
    const r = await this.getByRouteParam(reservationId);
    return { success: true, reservation: this.mapReservationToDetail(r) };
  }

  /**
   * POST /api/v1/reservations/create
   * Crée une nouvelle réservation
   *
   * Basé sur l'API du dashboard legacy (sojori-dashboard)
   * Gère automatiquement le lien de paiement selon paymentType et paymentStatus
   */
  async create(data: any): Promise<{ success: boolean; message?: string; error?: string; data?: Reservation }> {
    try {
      const paymentStatus = data?.paymentStatus || data?.initialPaymentStatus || 'UnPaid';
      const paymentType = data?.paymentType; // 'cash' | 'bank_card' | undefined

      // Par défaut : lien paiement en ligne seulement si carte + non payé
      let skipPaymentNaps = data?.skipPaymentNaps ?? data?.skipPaymentLink;
      if (skipPaymentNaps === undefined || skipPaymentNaps === null) {
        skipPaymentNaps = !(paymentType === 'bank_card' && paymentStatus === 'UnPaid');
      }

      const paymentMethod = data?.paymentMethod ||
        (paymentType === 'cash' ? 'cash' : paymentType === 'bank_card' ? 'card_online' : undefined);

      const payload = {
        ...data,
        skipPaymentNaps,
        initialPaymentStatus: data?.initialPaymentStatus ?? data?.paymentStatus,
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(paymentType ? { paymentType } : {}),
      };

      // Nettoyage
      delete payload.skipPaymentLink;

      const url = `${RESERVATIONS_API}/create`;

      // Logs désactivés pour nettoyer la console
      // console.log('[ReservationsService] 📤 Creating reservation:', payload);

      const response = await apiClient.post(url, payload, {
        timeout: 90_000,
      });

      // Logs désactivés pour nettoyer la console
      // console.log('[ReservationsService] 📥 Response:', response.data);

      if (response.data.success) {
        return response.data;
      } else {
        return {
          success: false,
          error: response.data.message || response.data.error || 'Erreur lors de la création de la réservation',
        };
      }
    } catch (error: any) {
      console.error('[ReservationsService] ❌ Error creating reservation:', error);
      return {
        success: false,
        error: error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Erreur lors de la création',
      };
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // NOTE: Les méthodes ci-dessous ne sont pas disponibles dans l'API interne
  // Elles seront implémentées quand les endpoints publics seront ajoutés
  // ════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/reservations/by-reservation-number/:reservationNumber
   */
  async getByReservationNumber(reservationNumber: string): Promise<Reservation | null> {
    try {
      const url = `${RESERVATIONS_API}/by-reservation-number/${encodeURIComponent(reservationNumber.trim())}`;
      const response = await apiClient.get(url);
      if (response.data?.success && response.data?.reservation) {
        return response.data.reservation as Reservation;
      }
      return null;
    } catch (error) {
      console.warn(`[ReservationsService] getByReservationNumber(${reservationNumber}):`, error);
      return null;
    }
  }

  /**
   * TODO: Recherche une réservation par téléphone
   * Endpoint non disponible dans l'API interne actuelle
   */
  // async searchByPhone(phone: string): Promise<Reservation[]> { ... }

  /**
   * PUT /api/v1/reservations/update/:id
   * Met à jour une réservation existante
   */
  async update(reservationId: string, data: any): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const url = `${RESERVATIONS_API}/update/${reservationId}`;

      const response = await apiClient.put(url, data);

      if (response.data.success) {
        return { success: true, data: response.data.data || response.data };
      }

      return { success: false, message: response.data.message || 'Erreur lors de la mise à jour' };
    } catch (error: any) {
      console.error('[ReservationsService] Update error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erreur lors de la mise à jour',
      };
    }
  }

  /**
   * PUT /api/v1/reservations/cancel/:id
   * Annule une réservation (status = CancelledByAdmin).
   * :id = ObjectId Mongo ou reservationNumber (SJ-…)
   */
  async cancel(
    reservationId: string,
    data: Record<string, unknown> = {},
  ): Promise<{ success: boolean; data?: unknown; message?: string }> {
    try {
      const payload = {
        status: 'CancelledByAdmin',
        ...data,
      };

      const url = `${RESERVATIONS_API}/cancel/${encodeURIComponent(reservationId)}`;

      const response = await apiClient.put(url, payload);

      if (response.data.success) {
        return { success: true, data: response.data.data || response.data };
      }

      return { success: false, message: response.data.message || 'Erreur lors de l\'annulation' };
    } catch (error: any) {
      console.error('[ReservationsService] Cancel error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erreur lors de l\'annulation',
      };
    }
  }

  /**
   * PUT /api/v1/reservations/guest-registration
   * Remplace guestRegistration (membres + compteurs) — onglet Enregistrement.
   */
  async updateGuestRegistration(
    reservationId: string,
    guestRegistration: Record<string, unknown>,
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const url = `${RESERVATIONS_API}/guest-registration`;
      const response = await apiClient.put(url, { reservationId, guestRegistration });
      if (response.data?.success) {
        return { success: true, data: response.data.reservation || response.data };
      }
      return {
        success: false,
        message: response.data?.error || response.data?.message || 'Erreur enregistrement voyageurs',
      };
    } catch (error: any) {
      console.error('[ReservationsService] updateGuestRegistration error:', error);
      return {
        success: false,
        message:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Erreur enregistrement voyageurs',
      };
    }
  }

  /**
   * PUT /api/v1/reservations/update-fields/:id
   * Met à jour des champs spécifiques (actualArrivalTime, actualDepartureTime, cancellationAcknowledged, etc.)
   */
  async updateReservationFields(reservationId: string, fields: Record<string, any>): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const url = `${RESERVATIONS_API}/update-fields/${reservationId}`;

      const response = await apiClient.put(url, fields);

      if (response.data.success) {
        return { success: true, data: response.data.data || response.data };
      }

      return { success: false, message: response.data.message || 'Erreur lors de la mise à jour' };
    } catch (error: any) {
      console.error('[ReservationsService] UpdateFields error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Erreur lors de la mise à jour',
      };
    }
  }
}

// Export singleton instance
export const reservationsService = new ReservationsService();
export default reservationsService;


/* ─── Avis par bien (onglet Performance · vue Avis) ─────────────── */
export interface ListingReviewItem {
  id: string;
  overallScore: number | null; // sur /10
  content: string;
  guestName: string | null;
  ota: string;
  receivedAt: string;
  isReplied: boolean;
  reply: string | null;
  tags: string[];
  isExpired: boolean;
  otaReservationId: string | null;
}

export interface ListingReviewsRow {
  listingId: string;
  name: string;
  city: string | null;
  count: number;
  avgOverall: number | null; // sur /10
  replied: number;
  unreplied: number;
  trendDelta: number | null; // Δ /10 : 90 derniers jours vs avant
  categories: Record<string, number>; // moyennes /10 par catégorie
  reviews: ListingReviewItem[];
}

export interface ReviewsByListingResponse {
  success: boolean;
  scale: 10;
  listings: ListingReviewsRow[];
}

export async function fetchReviewsByListing(params: {
  ownerId?: string;
  listingId?: string;
}): Promise<ReviewsByListingResponse> {
  const response = await apiClient.get<ReviewsByListingResponse>(
    `${RESERVATIONS_API}/reviews/by-listing`,
    { params },
  );
  return response.data;
}


/* ─── Engagement par bien (vue Mois · leads + 1re réponse) ──────── */
export interface ListingEngagementMonth {
  month: string;
  leadsCount: number;
  firstResponseMedianMinutes: number | null;
  conversationsMeasured: number;
}

export interface EngagementByListingResponse {
  success: boolean;
  listings: Array<{ listingId: string; months: ListingEngagementMonth[] }>;
}

export async function fetchEngagementByListing(params: {
  ownerId?: string;
  from?: string;
  to?: string;
}): Promise<EngagementByListingResponse> {
  const response = await apiClient.get<EngagementByListingResponse>(
    `${RESERVATIONS_API}/engagement/by-listing`,
    { params },
  );
  return response.data;
}
