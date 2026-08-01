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

/** Habitudes clients sur période — actions calendrier + messages + résas. */
export interface OwnerMonitorHabitItem {
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  actorType?: string;
  calendarUpdates: number;
  daysModified: number;
  auditsLaunched: number;
  importsActivated: number;
  importsFinished: number;
  activeDaysCount: number;
  listingsTouched: number;
  lastActivityAt?: string;
  messagesReceived: number;
  manualRepliesDashboard: number;
  manualRepliesWhatsapp: number;
  reservationsCreated: number;
}

export interface OwnerMonitorHabitsResponse {
  success: boolean;
  data?: {
    days: number;
    habitsAvailable: boolean;
    kpisAvailable: boolean;
    generatedAt: string;
    items: OwnerMonitorHabitItem[];
  };
  error?: string;
}

export function fetchOwnerMonitorHabits(days: number) {
  return apiClient.get<OwnerMonitorHabitsResponse>(`${OWNER_MONITOR}/habits`, {
    ...channelsDashboardAxiosConfig(),
    params: { days },
    timeout: 60000,
  });
}
