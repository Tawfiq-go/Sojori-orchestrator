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
  const res = await apiClient.post(
    `${LISTING_API_BASE_URL}/listings/${listingId}/calendar-import-review/finish`,
  );
  return res.data?.data ?? { active: false };
}
