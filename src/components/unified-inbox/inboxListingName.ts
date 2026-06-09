/** Extrait le nom du logement depuis les formes API srv-reservations (get-thread, by-reservation-number). */
export function resolveListingName(
  reservation?: Record<string, unknown> | null,
  threadData?: Record<string, unknown> | null,
): string | undefined {
  const res = reservation ?? {};
  const thread = threadData ?? {};

  const listing = res.listing as { name?: string; title?: string } | undefined;
  const sojoriListing = Array.isArray(res.sojoriListing)
    ? (res.sojoriListing[0] as { name?: string; title?: string } | undefined)
    : undefined;
  const sojoriId = res.sojoriId;

  const fromSojoriId =
    typeof sojoriId === 'object' && sojoriId != null && !Array.isArray(sojoriId)
      ? (sojoriId as { name?: string; title?: string }).name ||
        (sojoriId as { name?: string; title?: string }).title
      : undefined;

  const name =
    (typeof res.listingName === 'string' && res.listingName) ||
    (typeof res.listing_name === 'string' && res.listing_name) ||
    listing?.name ||
    listing?.title ||
    sojoriListing?.name ||
    sojoriListing?.title ||
    fromSojoriId ||
    (typeof thread.listingName === 'string' && thread.listingName) ||
    undefined;

  const trimmed = name?.trim();
  return trimmed || undefined;
}
