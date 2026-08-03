/**
 * API Pricing/Consommation admin — proxy srv-admin vers les services propriétaires des
 * métriques (listings RU dans srv-listing, WhatsApp/IA à venir).
 */
import apiClient from './apiClient';
import { channelsDashboardAxiosConfig } from '../utils/channelsAxiosConfig';

const PRICING_DASHBOARD = '/api/v1/admin/pricing-dashboard';

export interface RuListingsByOwnerItem {
  ownerId: string;
  ruListingCount: number;
  activeCount: number;
}

export interface RuListingsByOwnerResponse {
  success: boolean;
  data: {
    items: RuListingsByOwnerItem[];
    totalRuListings: number;
  };
}

export function fetchRuListingsByOwner() {
  return apiClient.get<RuListingsByOwnerResponse>(`${PRICING_DASHBOARD}/ru-listings-by-owner`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 30000,
  });
}

export interface AirroiCostByOwnerItem {
  ownerId: string;
  totalCalls: number;
  successCount: number;
  totalCostUsd: number;
  lastCallAt: string | null;
}

export interface AirroiCostByOwnerResponse {
  success: boolean;
  data: {
    items: AirroiCostByOwnerItem[];
    byMonth: { ownerId: string; month: string; calls: number; costUsd: number }[];
    byDay: { ownerId: string; day: string; calls: number; costUsd: number }[];
    totalCostUsd: number;
  };
}

/** period='all' | hours=N (défaut 72h côté backend) — même convention que channels-dashboard. */
export function fetchAirroiCostByOwner(query: { period?: 'all'; hours?: number } = {}) {
  const params = new URLSearchParams();
  if (query.period === 'all') params.set('period', 'all');
  else params.set('hours', String(query.hours ?? 720)); // 30 jours par défaut pour une vue coût mensuel
  return apiClient.get<AirroiCostByOwnerResponse>(`${PRICING_DASHBOARD}/airroi-cost-by-owner?${params.toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 30000,
  });
}

export interface AiUsageByOwnerDayItem {
  ownerId: string;
  day: string;
  calls: number;
  successCount: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

export interface AiUsageByOwnerDayResponse {
  success: boolean;
  data: {
    byOwnerDay: AiUsageByOwnerDayItem[];
    totalCostUsd: number;
    totalCalls: number;
    serviceErrors?: Record<string, string>;
  };
}

/** Fusion srv-fullchatbot (chatbot, OCR passeport) + srv-reservations (traduction, météo). */
export function fetchAiUsageByOwnerDay(query: { period?: 'all'; hours?: number } = {}) {
  const params = new URLSearchParams();
  if (query.period === 'all') params.set('period', 'all');
  else params.set('hours', String(query.hours ?? 720));
  return apiClient.get<AiUsageByOwnerDayResponse>(`${PRICING_DASHBOARD}/ai-usage-by-owner-day?${params.toString()}`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 30000,
  });
}

export interface WhatsappUsageByOwnerDayItem {
  ownerId: string;
  day: string;
  received: number;
  sent: number;
  total: number;
  freeSent: number;
  billableSent: number;
  costUsd: number;
  /** true when some messages on this row still use rate-card backfill (no webhook pricing yet). */
  costEstimated?: boolean;
}

export interface WhatsappUsageByOwnerDayResponse {
  success: boolean;
  data: {
    byOwnerDay: WhatsappUsageByOwnerDayItem[];
    totalReceived: number;
    totalSent: number;
    totalFreeSent: number;
    totalBillableSent: number;
    totalCostUsd: number;
    /** true if any owner-day row still uses rate-card backfill for messages without webhook pricing. */
    costEstimated: boolean;
    serviceErrors?: Record<string, string>;
  };
}

/** Fusion volet guest (srv-fullchatbot) + staff (srv-fulltask). */
export function fetchWhatsappUsageByOwnerDay(query: { period?: 'all'; hours?: number } = {}) {
  const params = new URLSearchParams();
  if (query.period === 'all') params.set('period', 'all');
  else params.set('hours', String(query.hours ?? 720));
  return apiClient.get<WhatsappUsageByOwnerDayResponse>(
    `${PRICING_DASHBOARD}/whatsapp-usage-by-owner-day?${params.toString()}`,
    { ...channelsDashboardAxiosConfig(), timeout: 30000 },
  );
}

export interface WhatsappMetaPricingDay {
  day: string;
  freeVolume: number;
  billableVolume: number;
  volume: number;
  cost: number;
  costFromMeta: boolean;
}

export interface WhatsappMetaPricingCategory {
  category: string;
  freeVolume: number;
  billableVolume: number;
  volume: number;
  cost: number;
}

export interface WhatsappMetaPricingResponse {
  success: boolean;
  data: {
    byDay: WhatsappMetaPricingDay[];
    byCategory: WhatsappMetaPricingCategory[];
    freeVolume: number;
    billableVolume: number;
    totalVolume: number;
    totalCostUsd: number;
    costAvailable: boolean;
    costSource: 'meta' | 'rate_card' | 'mixed';
    currency: string;
    accounts: Array<{
      account?: string;
      wabaId?: string;
      totalCost?: number;
      freeVolume?: number;
      billableVolume?: number;
      costSource?: string;
      costAvailable?: boolean;
    }>;
    serviceErrors?: Record<string, string>;
  };
}

/** Meta pricing_analytics (guest + staff WABAs) — source of truth for platform spend. */
export function fetchWhatsappMetaPricing(query: { period?: 'all'; hours?: number } = {}) {
  const params = new URLSearchParams();
  if (query.period === 'all') params.set('period', 'all');
  else params.set('hours', String(query.hours ?? 720));
  return apiClient.get<WhatsappMetaPricingResponse>(
    `${PRICING_DASHBOARD}/whatsapp-meta-pricing?${params.toString()}`,
    { ...channelsDashboardAxiosConfig(), timeout: 60000 },
  );
}
