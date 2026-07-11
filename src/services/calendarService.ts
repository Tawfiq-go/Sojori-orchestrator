// ════════════════════════════════════════════════════════════════════
// Sojori — Calendar Service
// Service pour interagir avec srv-calendar (port 4006)
// ════════════════════════════════════════════════════════════════════

import type {
  CalendarDay,
  CalendarMonthRequest,
  CalendarUpdateRequest,
  CalendarMonthResponse,
  CalendarUpdateResponse,
} from '../types/calendar.types';
import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

const CALENDAR_BASE = MICROSERVICE_BASE_URL.SRV_CALENDAR;

class CalendarService {
  /**
   * GET /api/v1/calendar/:listingId/calendar?startDate=...&endDate=...
   * Récupère les jours du calendrier pour un listing et une période
   */
  async getMonthCalendar(params: CalendarMonthRequest): Promise<CalendarDay[]> {
    try {
      const { listingId, startDate, endDate } = params;
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      // Route Express : app.use('/api/v1/calendar') + router.use('/calendar') + '/:listingId/calendar'
      const response = await apiClient.get<CalendarMonthResponse>(
        `${CALENDAR_BASE}/calendar/${listingId}/calendar`,
        { params: { startDate: start, endDate: end } },
      );

      const result = response.data;
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch calendar');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching calendar:', error);
      throw error;
    }
  }

  /**
   * PUT /api/v1/calendar/inventory/update-inventory
   * Met à jour l'inventaire (prix, disponibilité, min/max nights, etc.)
   * Supporte bulk update (plusieurs jours à la fois)
   * Format moderne avec type/roomTypeId/date_from/date_to
   * IMPORTANT: L'API attend un ARRAY même pour un seul élément
   */
  async updateCalendar(params: CalendarUpdateRequest | CalendarUpdateRequest[]): Promise<CalendarDay[]> {
    try {
      const url = `${CALENDAR_BASE}/inventory/update-inventory`;

      // Toujours envoyer un array
      const payload = Array.isArray(params) ? params : [params];

      // Logs désactivés pour nettoyer la console
      // console.log('[CalendarService] updateCalendar payload:', JSON.stringify(payload, null, 2));

      const response = await apiClient.put<CalendarUpdateResponse>(url, payload);

      const result = response.data;

      if (!result.success) {
        const msg =
          (result as { error?: string; message?: string }).error ||
          result.message ||
          'Échec mise à jour inventaire';
        throw new Error(msg);
      }

      return result.postUpdateDocs ?? [];
    } catch (error) {
      const axiosErr = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
      const body = axiosErr.response?.data;
      const msg = body?.error ?? body?.message ?? axiosErr.message ?? 'Échec mise à jour inventaire';
      console.error('Error updating calendar:', msg);
      throw new Error(msg);
    }
  }

  /**
   * GET /api/v1/calendar/availability?listingIds=...&startDate=...&endDate=...
   * Récupère la disponibilité multi-propriétés (pour vue globale)
   */
  async getMultiPropertyAvailability(params: {
    listingIds: string[];
    startDate: string;
    endDate: string;
  }): Promise<Record<string, CalendarDay[]>> {
    try {
      const { listingIds, startDate, endDate } = params;

      // Convert dates
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      const url = `${CALENDAR_BASE}/availability?listingIds=${listingIds.join(',')}&startDate=${start}&endDate=${end}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch availability');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching multi-property availability:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/calendar/occupancy-rate?listingId=...&startDate=...&endDate=...
   * Calcule le taux d'occupation pour une période donnée
   */
  async getOccupancyRate(params: {
    listingId: string;
    startDate: string;
    endDate: string;
  }): Promise<{ rate: number; bookedDays: number; totalDays: number }> {
    try {
      const { listingId, startDate, endDate } = params;

      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      const url = `${CALENDAR_BASE}/calendar/occupancy-rate?listingId=${listingId}&startDate=${start}&endDate=${end}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch occupancy rate');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching occupancy rate:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/calendar/average-daily-rate?listingId=...&startDate=...&endDate=...
   * Calcule le prix moyen journalier (ADR)
   */
  async getAverageDailyRate(params: {
    listingId: string;
    startDate: string;
    endDate: string;
  }): Promise<{ adr: number; totalRevenue: number; bookedDays: number }> {
    try {
      const { listingId, startDate, endDate } = params;

      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];

      const url = `${CALENDAR_BASE}/calendar/average-daily-rate?listingId=${listingId}&startDate=${start}&endDate=${end}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch ADR');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching ADR:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/calendar/inventory/get-inventory (BATCH)
   * Récupère inventaire pour plusieurs listings en UNE requête
   * Source: sojori-dashboard/serverApi.calendar.js getInventoryForListings()
   */
  async getInventoryForListings(
    listingIds: string[],
    startDate: string,
    endDate: string,
    includeReservations: boolean = true,
    /** true = fusion Inventory + InventoryArchive (historique lecture seule) */
    includeArchive: boolean = true,
  ): Promise<any[]> {
    try {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      const inc = includeReservations ? 'true' : 'false';
      const arch = includeArchive ? 'true' : 'false';

      const listingIdsParams = listingIds.map(id => `listingIds[]=${encodeURIComponent(id)}`).join('&');
      const url =
        `${CALENDAR_BASE}/inventory/get-inventory?${listingIdsParams}` +
        `&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}` +
        `&includeReservations=${inc}&includeArchive=${arch}`;

      const response = await apiClient.get<{ success: boolean; data: any[]; message?: string }>(url);

      const result = response.data;
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch inventory');
      }

      if (Array.isArray(result.data)) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/calendar/inventory/performance-by-listing
   * KPI mensuels par bien (réalisé + déjà réservé) — onglet Dashboard Performance.
   */
  async getPerformanceByListing(params: {
    from: string; // YYYY-MM
    to: string;
    ownerId?: string;
    listingId?: string;
  }): Promise<PerformanceByListingResponse> {
    const response = await apiClient.get<PerformanceByListingResponse>(
      `${CALENDAR_BASE}/inventory/performance-by-listing`,
      { params },
    );
    return response.data;
  }

  /**
   * GET /api/v1/calendar/inventory/performance-by-listing/reservations
   * Détail des résas d'un bien × mois (justification des KPI).
   */
  async getPerformanceReservations(listingId: string, month: string): Promise<PerformanceReservationsResponse> {
    const response = await apiClient.get<PerformanceReservationsResponse>(
      `${CALENDAR_BASE}/inventory/performance-by-listing/reservations`,
      { params: { listingId, month } },
    );
    return response.data;
  }

  /**
   * GET /api/v1/calendar/inventory/audit-blocked-days
   * Audit à la demande :
   * - jours bloqués (Dispo=0) sans réservation confirmée/pending
   * - jours encore disponibles alors qu'une réservation Confirmé/Pending les couvre
   */
  async auditBlockedDays(
    listingId: string,
    roomTypeId?: string,
    from?: string,
    to?: string,
  ): Promise<{
    listingId: string;
    from: string;
    to: string;
    roomTypes: Array<{
      roomTypeId: string;
      roomTypeName: string;
      ranges: Array<{
        from: string;
        to: string;
        classification: 'cancelled_reservation' | 'ota_stop_sell' | 'unknown' | 'missing_reservation_block';
        dayCount: number;
        reservationNumbers?: string[];
      }>;
    }>;
  }> {
    try {
      const params: Record<string, string> = { listingId };
      if (roomTypeId) params.roomTypeId = roomTypeId;
      if (from) params.from = from;
      if (to) params.to = to;

      const response = await apiClient.get<{
        success: boolean;
        message?: string;
        listingId: string;
        from: string;
        to: string;
        roomTypes: any[];
      }>(`${CALENDAR_BASE}/inventory/audit-blocked-days`, { params });

      const result = response.data;
      if (!result.success) {
        throw new Error(result.message || 'Failed to audit blocked days');
      }
      return {
        listingId: result.listingId,
        from: result.from,
        to: result.to,
        roomTypes: result.roomTypes || [],
      };
    } catch (error) {
      console.error('Error auditing blocked days:', error);
      throw error;
    }
  }

  /** GET /api/v1/calendar/dynamic-price/get?listingId= */
  async getDynamicPricingRule(listingId: string): Promise<Record<string, unknown> | null> {
    const response = await apiClient.get<{ success: boolean; rule?: Record<string, unknown> }>(
      `${CALENDAR_BASE}/dynamic-price/get`,
      { params: { listingId } },
    );
    if (!response.data?.success) return null;
    return response.data.rule ?? null;
  }

  /** Met à jour uniquement long stay / last minute (merge sur règle existante). */
  async updatePricingDiscounts(
    listingId: string,
    discounts: {
      longStayDiscounts: unknown[];
      lastMinuteDiscount: unknown[];
    },
  ): Promise<void> {
    const rule = (await this.getDynamicPricingRule(listingId)) || {};
    const payload = {
      listingId,
      monthRules: rule.monthRules ?? {},
      weekdayRules: rule.weekdayRules ?? {},
      eventRules: rule.eventRules ?? [],
      occupancyRules: rule.occupancyRules ?? [],
      monthActive: rule.monthActive ?? false,
      weekdayActive: rule.weekdayActive ?? false,
      eventActive: rule.eventActive ?? false,
      occupancyActive: rule.occupancyActive ?? false,
      longStayDiscounts: discounts.longStayDiscounts,
      lastMinuteDiscount: discounts.lastMinuteDiscount,
    };
    const response = await apiClient.put<{ success: boolean; message?: string }>(
      `${CALENDAR_BASE}/dynamic-price/update`,
      payload,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to update pricing discounts');
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
export default calendarService;


/* ─── Performance par bien (Dashboard) ─────────────────────────── */
export interface ListingPerformanceMonth {
  month: string; // YYYY-MM
  isFuture: boolean;
  isCurrent: boolean;
  hasInventory: boolean;
  openNights: number;
  blockedNights: number;
  nightsSold: number;
  revenue: number;
  otaCommission: number;
  netRevenue: number;
  pickup7Nights: number;
  pickup30Nights: number;
  pickup7Revenue: number;
  pickup30Revenue: number;
  occupancy: number | null;
  adr: number | null;
  revpar: number | null;
  bookings: number;
  cancellations: number;
  leadTimeMedianDays: number | null;
  avgStayNights: number | null;
  channels: Record<string, number>;
}

export interface ListingPerformanceRow {
  listingId: string;
  name: string;
  city: string | null;
  months: ListingPerformanceMonth[];
}

export interface PerformanceByListingResponse {
  success: boolean;
  from: string;
  to: string;
  currency: 'MAD';
  listings: ListingPerformanceRow[];
}


export interface PerformanceReservationDetail {
  reservationNumber: string;
  status: string;
  countsInKpis: boolean;
  guestName: string | null;
  channelName: string | null;
  numberOfGuests: number | null;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  nightsInMonth: number;
  totalPrice: number;
  revenueInMonth: number;
  bookedAt: string | null;
}

export interface PerformanceReservationsResponse {
  success: boolean;
  listingId: string;
  month: string;
  currency: 'MAD';
  reservations: PerformanceReservationDetail[];
}
