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
      console.error('Error updating calendar:', error);
      throw error;
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
}

// Export singleton instance
export const calendarService = new CalendarService();
export default calendarService;
