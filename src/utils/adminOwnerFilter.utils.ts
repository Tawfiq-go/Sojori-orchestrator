/** Admin PM scope → query string (`filterOwnerId` repeated), aligned with srv-listing / srv-reservations. */
export function appendFilterOwnerIdsToSearchParams(
  params: URLSearchParams,
  ownerIds: string[],
): void {
  ownerIds
    .map((id) => String(id).trim())
    .filter(Boolean)
    .forEach((id) => params.append('filterOwnerId', id));
}
