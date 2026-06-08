import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type {
  BookingClientEnvironmentFilter,
  BookingClientRecord,
  BookingClientsListResponse,
} from '../types/bookingClients.types';

const BASE = MICROSERVICE_BASE_URL.SRV_USER;

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
  const fromProfile = row.primaryPhone?.trim();
  if (fromProfile) return fromProfile;
  return row.phone_numbers?.[0]?.phone_number?.trim() || '';
}

const AUTH_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  email: { label: 'Email', bg: 'rgba(20,17,10,0.06)', color: '#374151' },
  google: { label: 'Google', bg: 'rgba(234,67,53,0.10)', color: '#C5221F' },
  apple: { label: 'Apple', bg: 'rgba(20,17,10,0.08)', color: '#111827' },
  facebook: { label: 'Facebook', bg: 'rgba(24,119,242,0.10)', color: '#1877F2' },
  other: { label: 'Autre', bg: 'rgba(20,17,10,0.06)', color: '#6B7280' },
};

export function bookingClientAuthMeta(row: BookingClientRecord) {
  const key = String(row.authProvider ?? 'email').toLowerCase();
  return AUTH_LABELS[key] ?? AUTH_LABELS.other;
}

const ENV_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  production: { label: 'Prod', bg: 'rgba(255,106,0,0.12)', color: '#C2410C' },
  development: { label: 'Dev', bg: 'rgba(59,130,246,0.12)', color: '#1D4ED8' },
};

export function bookingClientEnvMeta(row: BookingClientRecord) {
  const key = row.clerkEnvironment === 'development' ? 'development' : 'production';
  return ENV_LABELS[key];
}

class BookingClientsService {
  async getList(params: {
    page?: number;
    limit?: number;
    username?: string;
    deleted?: boolean;
    banned?: boolean;
    clerkEnvironment?: BookingClientEnvironmentFilter;
  }): Promise<BookingClientsListResponse> {
    const query = new URLSearchParams({
      page: String(params.page ?? 0),
      limit: String(params.limit ?? 25),
      paged: 'true',
      username: params.username ?? '',
      deleted: String(params.deleted ?? false),
      banned: String(params.banned ?? false),
      clerkEnvironment: params.clerkEnvironment ?? 'all',
    });

    const url = `${BASE}/user/booking-clients/get-clients?${query.toString()}`;

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
