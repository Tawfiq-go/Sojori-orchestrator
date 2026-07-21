import apiClient from './apiClient';
import { LISTING_API_BASE_URL } from '../config/listingApiBase';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import {
  countEffectiveActiveServices,
  displayActivationsFromServices,
  loadListingServiceActivation,
  type ServiceActivationStatusEntry,
} from '../features/orchestrationListingV3/listingCapabilityActivation';

export interface ListingImportOnboardingState {
  active: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  ruPropertyId?: number | null;
}

export interface PendingImportReservation {
  id: string;
  reservationNumber: string;
  guestName?: string;
  arrivalDate?: string;
  departureDate?: string;
  status?: string;
  channelName?: string;
}

export interface ServiceActivationStatusEntry {
  serviceId: string;
  label?: string;
  ownerEnabled?: boolean;
  listingOverride?: boolean | null;
  listingEnabled?: boolean | null;
  effectiveEnabled?: boolean;
  source?: 'owner' | 'listing';
  disabledReason?: 'owner' | 'listing' | null;
}

export interface ImportOrchestrationDraft {
  reservationId: string;
  reservationNumber: string;
  listingId: string;
  status: string | null;
  listingCategoryEnabled: Record<string, boolean>;
  categoryOverrides: Record<string, boolean>;
  categoryEnabledResolved: Record<string, boolean>;
  orchestrationEnabled: boolean;
  serviceActivationStatus?: ServiceActivationStatusEntry[];
  activeCount?: number;
}

const RESERVATIONS_BASE = `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations`;

const CATEGORY_TO_LISTING_FLAG: Record<string, string> = {
  cleaning_free: 'orchestration_cleaning_free',
  cleaning_paid: 'orchestration_cleaning_paid',
  cleaning_sojori: 'orchestration_cleaning_sojori',
  arrival_choose: 'orchestration_choose_arrival',
  departure_choose: 'orchestration_choose_departure',
  arrival_declare: 'orchestration_declare_arrival',
  departure_declare: 'orchestration_declare_departure',
  registration: 'orchestration_registration',
  support: 'orchestration_support',
  service_client: 'orchestration_service_client',
  transport: 'orchestration_transport',
  groceries: 'orchestration_grocery',
  concierge: 'orchestration_custom',
};

export function categoryEnabledToListingFlags(
  categoryEnabled: Record<string, boolean>,
): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(categoryEnabled)) {
    const flag = CATEGORY_TO_LISTING_FLAG[key];
    if (flag) flags[flag] = enabled;
  }
  return flags;
}

export const CAPABILITY_LABELS: Record<string, string> = {
  menu_navigation: 'Menu WhatsApp',
  cleaning_free: 'Ménage gratuit',
  cleaning_paid: 'Ménage payant',
  cleaning_sojori: 'Ménage Sojori',
  arrival_choose: 'Choisir arrivée',
  departure_choose: 'Choisir départ',
  arrival_declare: 'Déclarer arrivée',
  departure_declare: 'Déclarer départ',
  registration: 'Enregistrement',
  support: 'Support',
  service_client: 'Service client',
  transport: 'Transport',
  groceries: 'Courses',
  concierge: 'Conciergerie',
};

export async function getListingImportOnboarding(
  listingId: string,
): Promise<ListingImportOnboardingState> {
  const res = await apiClient.get(`${LISTING_API_BASE_URL}/listings/${listingId}/import-onboarding`);
  return res.data?.data ?? { active: false };
}

/** Admin only — active le mode import (pas de retag auto des résas). */
export async function activateListingImportOnboarding(
  listingId: string,
  opts?: { ruPropertyId?: number; correlationId?: string },
): Promise<ListingImportOnboardingState> {
  const res = await apiClient.post(
    `${LISTING_API_BASE_URL}/listings/${listingId}/import-onboarding/activate`,
    opts ?? {},
  );
  return res.data?.data ?? { active: true };
}

export async function finishListingImportOnboarding(listingId: string): Promise<ListingImportOnboardingState> {
  const res = await apiClient.post(
    `${LISTING_API_BASE_URL}/listings/${listingId}/import-onboarding/finish`,
  );
  return res.data?.data ?? { active: false };
}

/** Résumé ON/OFF pour console DevTools (filtre [import-onboarding] dans la console). */
export function summarizeToggleMap(
  map: Record<string, boolean> | undefined | null,
  labelKeys: Record<string, string> = CAPABILITY_LABELS,
): { on: string[]; off: string[]; onCount: number; offCount: number } {
  const on: string[] = [];
  const off: string[] = [];
  for (const [key, enabled] of Object.entries(map ?? {})) {
    const label = labelKeys[key] ?? key;
    if (enabled === true) on.push(`${key} (${label})`);
    else off.push(`${key} (${label})`);
  }
  return { on, off, onCount: on.length, offCount: off.length };
}

export function logImportOnboarding(section: string, payload: Record<string, unknown>): void {
  console.log(`[import-onboarding] ${section}`, payload);
}

export function logImportOnboardingDiff(
  section: string,
  listing: Record<string, boolean>,
  resa: Record<string, boolean>,
): void {
  const overrides: Array<{ key: string; listing: boolean; resa: boolean }> = [];
  const keys = new Set([...Object.keys(listing), ...Object.keys(resa)]);
  for (const key of keys) {
    const l = listing[key] === true;
    const r = resa[key] === true;
    if (l !== r) overrides.push({ key, listing: l, resa: r });
  }
  console.log(`[import-onboarding] ${section}`, {
    listingSummary: summarizeToggleMap(listing),
    resaSummary: summarizeToggleMap(resa),
    overridesVsListing: overrides,
    overrideCount: overrides.length,
  });
}

export async function listPendingImportOrchestrationReservations(
  listingId: string,
  syncCalendar = false,
): Promise<PendingImportReservation[]> {
  const url = `${RESERVATIONS_BASE}/import-orchestration/pending`;
  logImportOnboarding('GET pending →', { url, listingId, syncCalendar });
  const res = await apiClient.get(url, {
    params: { listingId, ...(syncCalendar ? { sync: '1' } : {}) },
  });
  const data = res.data?.data ?? [];
  logImportOnboarding('GET pending ←', {
    listingId,
    syncCalendar,
    httpStatus: res.status,
    success: res.data?.success,
    count: data.length,
    rows: data.map((r: PendingImportReservation) => ({
      id: r.id,
      reservationNumber: r.reservationNumber,
      guestName: r.guestName,
      status: r.status,
      orchestrationLaunch: (r as { orchestrationLaunch?: unknown }).orchestrationLaunch,
    })),
  });
  return data;
}

/** Même source que l'onglet listing Orchestration → Par service. */
export async function loadListingOrchestrationActivation(listingId: string): Promise<{
  ownerId: string;
  listingId: string;
  services: ServiceActivationStatusEntry[];
}> {
  const data = await loadListingServiceActivation(listingId);
  const activations = displayActivationsFromServices(data.services);
  logImportOnboarding('config listing (activation effective)', {
    listingId,
    ownerId: data.ownerId,
    serviceCount: data.services?.length ?? 0,
    activeCount: countEffectiveActiveServices(data.services),
    activationsSummary: summarizeToggleMap(activations),
    services: (data.services ?? []).map((s) => ({
      id: s.serviceId,
      effective: s.effectiveEnabled,
      owner: s.ownerEnabled,
      listingOverride: s.listingOverride,
      source: s.source,
      disabledReason: s.disabledReason,
    })),
  });
  return data;
}

export async function launchImportOrchestration(
  reservationId: string,
  payload?: {
    categoryEnabledResolved?: Record<string, boolean>;
    scheduledMessagesEnabledResolved?: Record<string, boolean>;
  },
): Promise<{
  success: boolean;
  reservationNumber?: string;
  categoryEnabledResolved?: Record<string, boolean>;
  scheduledMessagesEnabledResolved?: Record<string, boolean>;
}> {
  const services = payload?.categoryEnabledResolved;
  const messages = payload?.scheduledMessagesEnabledResolved;
  logImportOnboarding('launch POST →', {
    reservationId,
    url: `${RESERVATIONS_BASE}/${reservationId}/import-orchestration/launch`,
    servicesSummary: summarizeToggleMap(services),
    messagesSummary: summarizeToggleMap(messages ?? {}, {}),
    listingOrchestrationFlags: categoryEnabledToListingFlags(services ?? {}),
    rawPayload: payload,
  });
  const res = await apiClient.post(
    `${RESERVATIONS_BASE}/${reservationId}/import-orchestration/launch`,
    payload ?? {},
  );
  logImportOnboarding('launch POST ←', {
    reservationId,
    httpStatus: res.status,
    success: res.data?.success,
    reservationNumber: res.data?.reservationNumber,
    categoryEnabledResolved: res.data?.categoryEnabledResolved,
    scheduledMessagesEnabledResolved: res.data?.scheduledMessagesEnabledResolved,
    fullBody: res.data,
  });
  return res.data ?? { success: false };
}

/**
 * Annule l’orchestration pour une résa pending :
 * import conservé, pas de plan créé (status skipped).
 */
export async function skipImportOrchestration(reservationId: string): Promise<{
  success: boolean;
  reservationNumber?: string;
  status?: string;
  alreadySkipped?: boolean;
}> {
  logImportOnboarding('skip POST →', {
    reservationId,
    url: `${RESERVATIONS_BASE}/${reservationId}/import-orchestration/skip`,
  });
  const res = await apiClient.post(
    `${RESERVATIONS_BASE}/${reservationId}/import-orchestration/skip`,
    {},
  );
  logImportOnboarding('skip POST ←', {
    reservationId,
    httpStatus: res.status,
    success: res.data?.success,
    reservationNumber: res.data?.reservationNumber,
    status: res.data?.status,
    fullBody: res.data,
  });
  return res.data ?? { success: false };
}
