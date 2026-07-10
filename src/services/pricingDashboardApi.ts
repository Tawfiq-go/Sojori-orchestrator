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
