/**
 * Admin Monitor — activité owners (résas, messages, réponses manuelles).
 * Accès: SuperAdmin / Admin uniquement (route /admin/owner-monitor + AdminRoute).
 */
import apiClient from './apiClient';
import { channelsDashboardAxiosConfig } from '../utils/channelsAxiosConfig';

const OWNER_MONITOR = '/api/v1/admin/owner-monitor';

export interface OwnerMonitorActivityItem {
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  reservationsCurrent: number;
  reservationsCreatedToday: number;
  messagesReceivedToday: number;
  manualRepliesDashboardToday: number;
  manualRepliesWhatsappToday: number;
}

export interface OwnerMonitorActivityResponse {
  success: boolean;
  data?: {
    day: string;
    generatedAt: string;
    items: OwnerMonitorActivityItem[];
  };
  error?: string;
}

export function fetchOwnerMonitorActivity() {
  return apiClient.get<OwnerMonitorActivityResponse>(`${OWNER_MONITOR}/activity`, {
    ...channelsDashboardAxiosConfig(),
    timeout: 60000,
  });
}
