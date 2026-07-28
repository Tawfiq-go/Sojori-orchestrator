import apiClient from './apiClient';
import { LISTING_API_BASE_URL } from '../config/listingApiBase';

const BASE = `${LISTING_API_BASE_URL}/partners`;

export type CommissionType = 'percent' | 'fixed';

export type Partner = {
  id: string;
  _id?: string;
  ownerId: string | null;
  scope?: 'owner' | 'platform';
  name: string;
  email?: string;
  whatsapp?: string;
  cityIds?: 'all' | string[];
  commissionType: CommissionType;
  commissionPercent?: number;
  commissionFixedMad?: number;
  notes?: string;
  active: boolean;
};

export type PartnerServiceFormule = { label: string; priceMad: number };

export type PartnerServiceSlot = { time: string; label?: string };

export type PartnerServiceSchedule = {
  dateMode: 'from' | 'sure';
  weekdays: number[];
  /** window = plage libre · slots = créneaux · fixed = heure imposée */
  timeMode: 'window' | 'slots' | 'fixed';
  windowStart?: string;
  windowEnd?: string;
  lastDeparture?: string;
  slots?: PartnerServiceSlot[];
  fixedTime?: string;
  minLeadDays?: number;
  availableFrom?: string;
  note?: string;
};

export const DEFAULT_SCHEDULE: PartnerServiceSchedule = {
  dateMode: 'from',
  weekdays: [],
  timeMode: 'window',
  windowStart: '09:00',
  windowEnd: '18:00',
  lastDeparture: '',
  slots: [],
  fixedTime: '05:30',
  minLeadDays: 1,
  availableFrom: '',
  note: '',
};

export type PartnerService = {
  id: string;
  _id?: string;
  ownerId: string | null;
  partnerId: string | null;
  category: string;
  subCategory?: string;
  title: string;
  description: string;
  /** WhatsApp pour cette activité (E.164). Vide = WA du partenaire. */
  whatsapp?: string;
  /** Villes de l’activité — filtre listing.cityId */
  cityIds?: 'all' | string[];
  photos: string[];
  formules: PartnerServiceFormule[];
  schedule?: PartnerServiceSchedule;
  commissionType?: CommissionType | null;
  commissionPercent?: number | null;
  commissionFixedMad?: number | null;
  keywords: string[];
  active: boolean;
  sortOrder: number;
};

function unwrap<T>(res: { data?: { success?: boolean; data?: T; error?: string } }): T {
  const body = res.data;
  if (body && typeof body === 'object' && 'success' in body && body.success === false) {
    throw new Error(body.error || 'Request failed');
  }
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

export const partnersApi = {
  async list(params?: { ownerId?: string | 'platform'; active?: boolean }): Promise<Partner[]> {
    const q = new URLSearchParams();
    if (params?.ownerId) q.set('ownerId', params.ownerId);
    if (params?.active) q.set('active', 'true');
    const url = q.toString() ? `${BASE}?${q}` : BASE;
    const res = await apiClient.get(url);
    return unwrap<Partner[]>(res) || [];
  },

  async get(partnerId: string): Promise<Partner> {
    const res = await apiClient.get(`${BASE}/${partnerId}`);
    return unwrap<Partner>(res);
  },

  async create(body: Partial<Partner> & { name: string }): Promise<Partner> {
    const res = await apiClient.post(BASE, body);
    return unwrap<Partner>(res);
  },

  async update(partnerId: string, body: Partial<Partner>): Promise<Partner> {
    const res = await apiClient.put(`${BASE}/${partnerId}`, body);
    return unwrap<Partner>(res);
  },

  async remove(partnerId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${partnerId}`);
  },

  async listServices(partnerId: string, activeOnly = false): Promise<PartnerService[]> {
    const q = activeOnly ? '?active=true' : '';
    const res = await apiClient.get(`${BASE}/${partnerId}/services${q}`);
    return unwrap<PartnerService[]>(res) || [];
  },

  async createService(
    partnerId: string,
    body: Omit<Partial<PartnerService>, 'id'> & {
      category: string;
      title: string;
      formules: PartnerServiceFormule[];
    },
  ): Promise<PartnerService> {
    const res = await apiClient.post(`${BASE}/${partnerId}/services`, body);
    return unwrap<PartnerService>(res);
  },

  async updateService(
    partnerId: string,
    serviceId: string,
    body: Partial<PartnerService>,
  ): Promise<PartnerService> {
    const res = await apiClient.put(`${BASE}/${partnerId}/services/${serviceId}`, body);
    return unwrap<PartnerService>(res);
  },

  async removeService(partnerId: string, serviceId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${partnerId}/services/${serviceId}`);
  },
};
