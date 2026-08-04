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
  /** Fiche vue marché (for sale) — lecture seule */
  marketplace?: boolean;
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

export type PaymentMethod = 'card' | 'cash' | 'transfer';
export type PaymentCollection = 'full' | 'deposit';
/** instant = accepté d'office · on_confirmation = le provider confirme sous SLA */
export type PaymentTiming = 'instant' | 'on_confirmation';

export type PartnerServicePayment = {
  methods: PaymentMethod[];
  collection: PaymentCollection;
  depositPercent?: number | null;
  timing?: PaymentTiming;
};

export const DEFAULT_PAYMENT: PartnerServicePayment = {
  methods: ['cash'],
  collection: 'full',
  depositPercent: null,
  timing: 'instant',
};

export type PartnerServiceContact = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type PartnerServiceConfirmation = {
  slaHours: number;
  remindBeforeHours: number;
  remindAfterHours: number;
};

export const DEFAULT_CONFIRMATION: PartnerServiceConfirmation = {
  slaHours: 12,
  remindBeforeHours: 3,
  remindAfterHours: 3,
};

export type PartnerServiceProviderReminder = {
  /** 0 = J0 · 1 = J-1 · 2 = J-2 · 3 = J-3 */
  offsetDays: number;
  time: string;
};

export const DEFAULT_PROVIDER_REMINDER: PartnerServiceProviderReminder = {
  offsetDays: 1,
  time: '18:00',
};

export type ShareGuestContactWhen = 'immediate' | 'J-3' | 'J-2' | 'J-1' | 'J0';

export type PartnerServiceShareGuestContact = {
  enabled: boolean;
  when: ShareGuestContactWhen;
  time?: string;
};

export const DEFAULT_SHARE_GUEST_CONTACT: PartnerServiceShareGuestContact = {
  enabled: false,
  when: 'immediate',
  time: '',
};

export type PartnerService = {
  id: string;
  _id?: string;
  ownerId: string | null;
  partnerId: string | null;
  /** Label provider pour le picker listing (fiche Dreams / NOMMOS…). */
  providerId?: string | null;
  providerName?: string | null;
  providerKind?: 'owner' | 'partner' | null;
  category: string;
  subCategory?: string;
  title: string;
  description: string;
  /** WhatsApp provider (E.164) — notifs commande. Obligatoire. */
  whatsapp?: string;
  /** Villes de l’activité — filtre listing.cityId */
  cityIds?: 'all' | string[];
  photos: string[];
  formules: PartnerServiceFormule[];
  schedule?: PartnerServiceSchedule;
  payment?: PartnerServicePayment;
  contact?: PartnerServiceContact;
  confirmation?: PartnerServiceConfirmation;
  providerReminder?: PartnerServiceProviderReminder;
  shareGuestContact?: PartnerServiceShareGuestContact;
  commissionType?: CommissionType | null;
  commissionPercent?: number | null;
  commissionFixedMad?: number | null;
  keywords: string[];
  active: boolean;
  sortOrder: number;
  forSale?: boolean;
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
  async list(params?: {
    ownerId?: string | 'platform';
    active?: boolean;
    includePlatform?: boolean;
    /** Fiches d’autres owners avec activités forSale */
    scope?: 'marketplace' | 'forsale';
  }): Promise<Partner[]> {
    const q = new URLSearchParams();
    if (params?.ownerId) q.set('ownerId', params.ownerId);
    if (params?.active) q.set('active', 'true');
    if (params?.includePlatform === false) q.set('includePlatform', 'false');
    if (params?.scope) q.set('scope', params.scope);
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

  /** Expériences PM (partnerId null) — même structure PartnerService */
  async listExperiences(params?: { ownerId?: string; active?: boolean }): Promise<PartnerService[]> {
    const q = new URLSearchParams();
    if (params?.ownerId) q.set('ownerId', params.ownerId);
    if (params?.active) q.set('active', 'true');
    const url = q.toString() ? `${BASE}/experiences?${q}` : `${BASE}/experiences`;
    const res = await apiClient.get(url);
    return unwrap<PartnerService[]>(res) || [];
  },

  /** Catalogue pour picker listing (all = own actives + marché adopté). */
  async listExperienceCatalog(params: {
    scope?: 'own' | 'sojori' | 'all';
    cityId?: string | null;
    ownerId?: string;
    /** browse = tout le marché · adopted = seulement Activées par moi */
    marketMode?: 'browse' | 'adopted';
  }): Promise<PartnerService[]> {
    const q = new URLSearchParams();
    q.set('scope', params.scope || 'all');
    if (params.cityId) q.set('cityId', params.cityId);
    if (params.ownerId) q.set('ownerId', params.ownerId);
    if (params.marketMode) q.set('marketMode', params.marketMode);
    const res = await apiClient.get(`${BASE}/experiences/catalog?${q}`);
    return unwrap<PartnerService[]>(res) || [];
  },

  async listMarketAdoptions(params?: { ownerId?: string }): Promise<string[]> {
    const q = new URLSearchParams();
    if (params?.ownerId) q.set('ownerId', params.ownerId);
    const url = q.toString()
      ? `${BASE}/experiences/market-adoptions?${q}`
      : `${BASE}/experiences/market-adoptions`;
    const res = await apiClient.get(url);
    const data = unwrap<{ experienceIds?: string[] }>(res);
    return Array.isArray(data?.experienceIds) ? data.experienceIds.map(String) : [];
  },

  async setMarketAdoption(body: {
    experienceId?: string;
    experienceIds?: string[];
    adopted: boolean;
    ownerId?: string;
  }): Promise<string[]> {
    const res = await apiClient.put(`${BASE}/experiences/market-adoptions`, body);
    const data = unwrap<{ experienceIds?: string[] }>(res);
    return Array.isArray(data?.experienceIds) ? data.experienceIds.map(String) : [];
  },

  async createExperience(
    body: Omit<Partial<PartnerService>, 'id'> & {
      category: string;
      title: string;
      formules: PartnerServiceFormule[];
    },
  ): Promise<PartnerService> {
    const res = await apiClient.post(`${BASE}/experiences`, body);
    return unwrap<PartnerService>(res);
  },

  async updateExperience(serviceId: string, body: Partial<PartnerService>): Promise<PartnerService> {
    const res = await apiClient.put(`${BASE}/experiences/${serviceId}`, body);
    return unwrap<PartnerService>(res);
  },

  async removeExperience(serviceId: string): Promise<void> {
    await apiClient.delete(`${BASE}/experiences/${serviceId}`);
  },
};
