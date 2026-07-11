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
  costUsd: number;
}

export interface WhatsappUsageByOwnerDayResponse {
  success: boolean;
  data: {
    byOwnerDay: WhatsappUsageByOwnerDayItem[];
    totalReceived: number;
    totalSent: number;
    totalCostUsd: number;
    /** true : coût estimé (1 conversation "service"/jour actif), pas la facturation Meta exacte. */
    costEstimated: boolean;
    serviceErrors?: Record<string, string>;
  };
}

/** Fusion volet guest (srv-fullchatbot) + staff (srv-fulltask). Coût estimé (voir costEstimated). */
export function fetchWhatsappUsageByOwnerDay(query: { period?: 'all'; hours?: number } = {}) {
  const params = new URLSearchParams();
  if (query.period === 'all') params.set('period', 'all');
  else params.set('hours', String(query.hours ?? 720));
  return apiClient.get<WhatsappUsageByOwnerDayResponse>(
    `${PRICING_DASHBOARD}/whatsapp-usage-by-owner-day?${params.toString()}`,
    { ...channelsDashboardAxiosConfig(), timeout: 30000 },
  );
}
