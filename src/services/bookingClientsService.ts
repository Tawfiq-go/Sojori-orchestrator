import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type { BookingClientRecord, BookingClientsListResponse } from '../types/bookingClients.types';

const BASE = MICROSERVICE_BASE_URL.SRV_RESERVATION;

export function bookingClientDisplayName(row: BookingClientRecord): string {
  const full = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (row.username) return row.username;
  return bookingClientEmail(row) || row.clerkId || '—';
}

export function bookingClientEmail(row: BookingClientRecord): string {
  return row.email_addresses?.[0]?.email_address?.trim() || '';
}

export function bookingClientPhone(row: BookingClientRecord): string {
  return row.phone_numbers?.[0]?.phone_number?.trim() || '';
}

class BookingClientsService {
  async getList(params: {
    page?: number;
    limit?: number;
    username?: string;
    deleted?: boolean;
    banned?: boolean;
  }): Promise<BookingClientsListResponse> {
    const query = new URLSearchParams({
      page: String(params.page ?? 0),
      limit: String(params.limit ?? 25),
      paged: 'true',
      username: params.username ?? '',
      deleted: String(params.deleted ?? false),
      banned: String(params.banned ?? false),
    });

    const url = `${BASE}/client/get-clients?${query.toString()}`;

    try {
      const response = await apiClient.get<BookingClientsListResponse>(url);
      const payload = response.data;
      return {
        success: payload?.success ?? true,
        total: payload?.total ?? payload?.data?.length ?? 0,
        data: Array.isArray(payload?.data) ? payload.data : [],
      };
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return { success: true, total: 0, data: [] };
      }
      throw error;
    }
  }
}

const bookingClientsService = new BookingClientsService();
export default bookingClientsService;
