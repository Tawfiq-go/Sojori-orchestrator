import apiClient from './apiClient';
import { LISTING_API_BASE_URL } from '../config/listingApiBase';

/** Revue calendrier post-import RU — distinct de l’orchestration (`importOnboarding`). */
export interface ListingCalendarImportReviewState {
  active: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  ruPropertyId?: number | null;
  correlationId?: string | null;
}

export function isCalendarImportReviewActive(
  listing: { calendarImportReview?: { active?: boolean } | null } | null | undefined,
): boolean {
  return listing?.calendarImportReview?.active === true;
}

export async function getListingCalendarImportReview(
  listingId: string,
): Promise<ListingCalendarImportReviewState> {
  const res = await apiClient.get(
    `${LISTING_API_BASE_URL}/listings/${listingId}/calendar-import-review`,
  );
  return res.data?.data ?? { active: false };
}

export async function activateListingCalendarImportReview(
  listingId: string,
  body?: { ruPropertyId?: number; correlationId?: string },
): Promise<ListingCalendarImportReviewState> {
  const res = await apiClient.post(
    `${LISTING_API_BASE_URL}/listings/${listingId}/calendar-import-review/activate`,
    body || {},
  );
  return res.data?.data ?? { active: true };
}

export async function finishListingCalendarImportReview(
  listingId: string,
): Promise<ListingCalendarImportReviewState> {
  const url = `${LISTING_API_BASE_URL}/listings/${listingId}/calendar-import-review/finish`;
  const t0 = Date.now();
  console.log('[calendarImportReview] finish → POST', url);
  try {
    const res = await apiClient.post(url);
    console.log('[calendarImportReview] finish ← réponse', {
      ms: Date.now() - t0,
      status: res.status,
      data: res.data,
    });
    return res.data?.data ?? { active: false };
  } catch (err) {
    console.error('[calendarImportReview] finish ✗ échec', {
      ms: Date.now() - t0,
      status: (err as { response?: { status?: number } })?.response?.status,
      message: (err as Error)?.message,
      data: (err as { response?: { data?: unknown } })?.response?.data,
    });
    throw err;
  }
}
